import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import {
    BASE_SEPOLIA_CONFIG,
    CONTRACT_ADDRESSES,
    ERC20_ABI,
    VAULT_ABI,
    WMEMORY_ABI,
    MORPHO_ABI,
    MXNB_MARKET_PARAMS,
} from '../constants/contracts';

const TARGET_LTV = 0.75;
const USDC_DECIMALS = 6;
const MXNB_DECIMALS = 6;
const MANUAL_GAS_LIMIT = 500000n; // Fixed gas limit for testnet stability

export const useMorphoLoan = () => {
    const { wallets } = useWallets();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: Idle, 1...7
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
    const [mxnbBalance, setMxnbBalance] = useState<string>("0.00");
    const [collateralBalance, setCollateralBalance] = useState<string>("0.00");

    // Helper to get signer
    const getSigner = useCallback(async () => {
        const wallet = wallets[0];
        if (!wallet) throw new Error("Wallet not connected");

        // Usamos el provider directo de Privy que ya maneja la conexión
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        return ethersProvider.getSigner();
    }, [wallets]);

    // Fetch balances
    const refreshData = useCallback(async () => {
        try {
            if (!wallets.length) return;
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const bal = await usdcContract.balanceOf(userAddress);
            setUsdcBalance(ethers.formatUnits(bal, USDC_DECIMALS));

            // MXNB Balance
            const mxnbContract = new ethers.Contract(CONTRACT_ADDRESSES.mockMXNB, ERC20_ABI, signer);
            const mxnbBal = await mxnbContract.balanceOf(userAddress);
            setMxnbBalance(ethers.formatUnits(mxnbBal, MXNB_DECIMALS));

            // Collateral Balance (Morpho Blue Position)
            // Calculate Market ID
            const marketId = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address", "address", "address", "address", "uint256"],
                    [
                        MXNB_MARKET_PARAMS.loanToken,
                        MXNB_MARKET_PARAMS.collateralToken,
                        MXNB_MARKET_PARAMS.oracle,
                        MXNB_MARKET_PARAMS.irm,
                        MXNB_MARKET_PARAMS.lltv
                    ]
                )
            );
            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);
            const position = await morpho.position(marketId, userAddress);
            // position: [supplyShares, borrowShares, collateral]
            setCollateralBalance(ethers.formatUnits(position[2], USDC_DECIMALS));

        } catch (err) {
            console.error("Error refreshing data:", err);
        }
    }, [wallets, getSigner]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 10000);
        return () => clearInterval(interval);
    }, [refreshData]);

    // Error Auto-Reset
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
                setStep(0);
                setLoading(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const getSimulatedDeposit = (borrowAmountMXNB: string): string => {
        if (!borrowAmountMXNB || parseFloat(borrowAmountMXNB) <= 0) return "0";
        const amount = parseFloat(borrowAmountMXNB);
        const priceEstimate = 19.5;
        const required = amount / (TARGET_LTV * priceEstimate);
        return (required * 1.25).toFixed(2);
    };

    // Helper: Wait for allowance to propagate
    const waitForAllowance = async (
        tokenContract: ethers.Contract,
        owner: string,
        spender: string,
        requiredAmount: bigint
    ) => {
        let retries = 0;
        while (retries < 10) {
            const currentAllowance = await tokenContract.allowance(owner, spender);
            if (currentAllowance >= requiredAmount) return;

            console.log(`Waiting for allowance propagation... Attempt ${retries + 1}/10`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
            retries++;
        }
        throw new Error("Allowance failed to propagate. Please try again.");
    }

    // Helper: Wait for balance to increase (Race Condition fix)
    const waitForBalanceIncrease = async (
        tokenContract: ethers.Contract,
        userAddress: string,
        initialBalance: bigint
    ) => {
        let retries = 0;
        while (retries < 15) {
            const currentBalance = await tokenContract.balanceOf(userAddress);
            if (currentBalance > initialBalance) return currentBalance;

            console.log(`Waiting for balance update... Attempt ${retries + 1}/15`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
            retries++;
        }
        throw new Error("RPC timeout: The network is slow indexing your new balance. Please wait a moment and try again.");
    };

    const executeZale = async (borrowAmountMXNB: string) => {
        setLoading(true);
        setError(null);
        setStep(1);

        try {
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            // Double check network before proceeding
            const provider = signer.provider;
            const network = await provider?.getNetwork();
            if (network?.chainId !== BigInt(BASE_SEPOLIA_CONFIG.chainId)) {
                throw new Error("Wrong network detected during execution.");
            }

            const borrowAmountBN = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
            const calculatedDeposit = getSimulatedDeposit(borrowAmountMXNB);
            const depositAmountBN = ethers.parseUnits(calculatedDeposit, USDC_DECIMALS);

            console.log(`Starting Zale: Borrow ${borrowAmountMXNB} MXNB`);

            // Contracts
            const usdc = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const morphoUSDCVault = new ethers.Contract(CONTRACT_ADDRESSES.morphoUSDCVault, VAULT_ABI, signer);
            const wmUSDC = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, WMEMORY_ABI, signer);
            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);

            // --- STEP 1: Approve USDC for Morpho Vault ---
            console.log("Step 1: Checking USDC Allowance");
            const usdcAllowance = await usdc.allowance(userAddress, CONTRACT_ADDRESSES.morphoUSDCVault);
            if (usdcAllowance < depositAmountBN) {
                const tx = await usdc.approve(CONTRACT_ADDRESSES.morphoUSDCVault, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx.hash);
                await tx.wait();
                // Double Check
                await waitForAllowance(usdc, userAddress, CONTRACT_ADDRESSES.morphoUSDCVault, depositAmountBN);
            }

            // Capture initial mUSDC balance before deposit
            const initialMUsdcBalance = await morphoUSDCVault.balanceOf(userAddress);

            // --- STEP 2: Deposit USDC into Morpho Vault (get mUSDC) ---
            setStep(2);
            console.log("Step 2: Depositing USDC");
            const tx2 = await morphoUSDCVault.deposit(depositAmountBN, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(tx2.hash);
            await tx2.wait();

            // Wait for mUSDC balance to increase
            await waitForBalanceIncrease(morphoUSDCVault, userAddress, initialMUsdcBalance);

            // Just-in-Time read
            const musdcBalance = await morphoUSDCVault.balanceOf(userAddress);

            // --- STEP 3: Approve mUSDC for Wrapper ---
            setStep(3);
            console.log("Step 3: Approving mUSDC");
            // NOTE: Some vaults might not follow strict ERC20 allowance return if valid, but we try standard flow.
            // If allowance check fails/is unpredictable, we just approve.
            const tx3 = await morphoUSDCVault.approve(CONTRACT_ADDRESSES.wmUSDC, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(tx3.hash);
            await tx3.wait();
            await waitForAllowance(morphoUSDCVault, userAddress, CONTRACT_ADDRESSES.wmUSDC, musdcBalance);

            // Capture initial WmUSDC balance before wrap
            const initialWmUsdcBalance = await wmUSDC.balanceOf(userAddress);

            // --- STEP 4: Wrap mUSDC -> WmUSDC ---
            setStep(4);
            console.log("Step 4: Wrapping mUSDC");
            const tx4 = await wmUSDC.deposit(musdcBalance, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(tx4.hash);
            await tx4.wait();

            // Wait for WmUSDC balance to increase
            await waitForBalanceIncrease(wmUSDC, userAddress, initialWmUsdcBalance);

            // Just-in-Time read
            const wmusdcBalance = await wmUSDC.balanceOf(userAddress);

            // --- STEP 5: Approve WmUSDC for Morpho Blue ---
            setStep(5);
            console.log("Step 5: Approving WmUSDC");
            const wmusdcAllowance = await wmUSDC.allowance(userAddress, CONTRACT_ADDRESSES.morphoBlue);
            if (wmusdcAllowance < wmusdcBalance) {
                const tx5 = await wmUSDC.approve(CONTRACT_ADDRESSES.morphoBlue, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx5.hash);
                await tx5.wait();
            }
            // Strict check before proceeding to supply
            await waitForAllowance(wmUSDC, userAddress, CONTRACT_ADDRESSES.morphoBlue, wmusdcBalance);

            // --- STEP 6: Supply Collateral ---
            setStep(6);
            console.log("Step 6: Supplying Collateral");

            // Fresh Balance Read
            const currentWmUSDCBalance = await wmUSDC.balanceOf(userAddress);

            // Construct Tuple Array explicitly to allow Ethers v6 to parse correctly if object fails
            const MXNB_MARKET_PARAMS_ARRAY = [
                MXNB_MARKET_PARAMS.loanToken,
                MXNB_MARKET_PARAMS.collateralToken,
                MXNB_MARKET_PARAMS.oracle,
                MXNB_MARKET_PARAMS.irm,
                MXNB_MARKET_PARAMS.lltv
            ];

            console.log("Supply Collateral Params:", MXNB_MARKET_PARAMS_ARRAY);
            console.log("Supply Amount:", currentWmUSDCBalance.toString());

            const tx6 = await morpho.supplyCollateral(MXNB_MARKET_PARAMS_ARRAY, currentWmUSDCBalance, userAddress, "0x", { gasLimit: MANUAL_GAS_LIMIT });


            setTxHash(tx6.hash);

            await tx6.wait();

            // --- STEP 7: Borrow MXNB ---
            setStep(7);
            console.log("Step 7: Borrowing MXNB");



            // Check max borrowable or assume calculated logic is mostly correct but handle potential revert from healthy factor
            const tx7 = await morpho.borrow(MXNB_MARKET_PARAMS_ARRAY, borrowAmountBN, 0, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(tx7.hash);
            await tx7.wait();

            setStep(8); // Complete
            await refreshData();
            setLoading(false); // Ensure loading is false on success

        } catch (err: any) {
            console.error("Zale Error:", err);
            let msg = err.reason || err.message || "Transaction failed";

            // Friendly error mapping
            if (msg.includes("user rejected")) msg = "User rejected transaction";
            if (msg.includes("estimateGas")) msg = "Gas estimation failed. Possible network congestion or insufficient connection.";
            if (msg.includes("allowance")) msg = "Approval verification failed. Please try again.";

            setError(msg);
            // Auto-reset handled by useEffect
        } finally {
            // Safety check: if we are not at step 8 (success) and no error was caught (shouldn't happen due to catch),
            // or if we just want to ensure loading is off if something weird happened.
            // But we handled success case above.
            if (step !== 8) {
                setLoading(false);
            }
        }
    };

    const resetState = () => {
        setStep(0);
        setError(null);
        setTxHash(null);
        setLoading(false);
        setUsdcBalance("0.00"); // Optional: Reset balances? No, keep them.
    };

    return {
        loading,
        step,
        error,
        txHash,
        usdcBalance,
        mxnbBalance,
        collateralBalance,
        getSimulatedDeposit,
        executeZale,
        refreshData,
        resetState
    };
};
