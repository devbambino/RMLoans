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

const TARGET_LTV = 0.70; // Conservative LTV target for calculation
const USDC_DECIMALS = 6;
const MXNB_DECIMALS = 6;
const MANUAL_GAS_LIMIT = 5000000n; // Fixed gas limit for testnet stability

export const useMorphoLoan = () => {
    const { wallets } = useWallets();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: Idle, 1...7
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
    const [mxnbBalance, setMxnbBalance] = useState<string>("0.00");
    const [collateralBalance, setCollateralBalance] = useState<string>("0.00");
    const [borrowBalance, setBorrowBalance] = useState<string>("0.00");
    const [marketLiquidity, setMarketLiquidity] = useState<string>("0");
    const [marketAPR, setMarketAPR] = useState<string>("0.00");
    const [totalRepaidAmount, setTotalRepaidAmount] = useState<string | null>(null);
    const [oraclePrice, setOraclePrice] = useState<bigint>(0n);

    // Helper: Format with max 3 decimals
    const formatBalance = (val: bigint, decimals: number) => {
        const formatted = ethers.formatUnits(val, decimals);
        // Truncate to 3 decimals without rounding up
        const [integer, fraction] = formatted.split(".");
        if (!fraction) return integer;
        return `${integer}.${fraction.substring(0, 3)}`;
    };

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
            setUsdcBalance(formatBalance(bal, USDC_DECIMALS));

            // MXNB Balance
            const mxnbContract = new ethers.Contract(CONTRACT_ADDRESSES.mockMXNB, ERC20_ABI, signer);
            const mxnbBal = await mxnbContract.balanceOf(userAddress);
            setMxnbBalance(formatBalance(mxnbBal, MXNB_DECIMALS));

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

            // Market Data
            const marketData = await morpho.market(marketId);

            // Available Liquidity = totalSupplyAssets - totalBorrowAssets
            const totalSupplyAssets = BigInt(marketData[0]);
            const totalBorrowAssets = BigInt(marketData[2]);

            const liquidityAssets = totalSupplyAssets - totalBorrowAssets;

            // Borrow Balance
            // Matching POC logic: Display borrow shares directly formatted with 12 decimals
            setBorrowBalance(formatBalance(position[1], 12));
            setCollateralBalance(formatBalance(position[2], 18)); // WmUSDC is 18 decimals

            // Format Liquidity: Logic check - ensure non-negative
            const safeLiquidity = liquidityAssets > 0n ? liquidityAssets : 0n;
            setMarketLiquidity(formatBalance(safeLiquidity, MXNB_DECIMALS));

            // Oracle Price
            const oracle = new ethers.Contract(MXNB_MARKET_PARAMS.oracle, ["function price() external view returns (uint256)"], signer);
            const price = await oracle.price();
            setOraclePrice(price);

            // Static APR as requested
            setMarketAPR("0.00");

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
        if (oraclePrice === 0n) {
            // Fallback if oracle not loaded: use conservative estimate
            // 8 MXNB is backed by 0.65 WmUSDC approx. => 1 WmUSDC = 12.307 MXNB
            const amount = parseFloat(borrowAmountMXNB);
            const safePrice = 12.307; // MXNB per unit of collateral
            const requiredWmUSDC = amount / (TARGET_LTV * safePrice);
            // Convert WmUSDC to USDC approx (1 WmUSDC ≈ 4 USDC)
            const requiredUSDCApprox = requiredWmUSDC * 4.0;
            // 20% buffer
            return (requiredUSDCApprox * 1.2).toFixed(2);
        }

        try {
            const borrowAssets = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
            const TARGET_LTV_WAD = ethers.parseEther(TARGET_LTV.toString());

            // The scale 10^54 is mathematically correct because the Oracle price accounts for 
            // the 18 vs 6 decimals difference within its 10^36 scale.
            const numerator = borrowAssets * (10n ** 54n); // 6 + 54 = 60
            const denominator = oraclePrice * TARGET_LTV_WAD;

            const requiredCollateralWmUSDC = numerator / denominator;

            // Convert 18 decimals WmUSDC to 6 decimals USDC (approx 1 WmUSDC = 4 USDC)
            //const requiredUSDC = (requiredCollateralWmUSDC * 4n) / (10n ** 12n);
            // Convert 18 decimals WmUSDC to 6 decimals USDC (approx 1 WmUSDC = 1 USDC)
            const requiredUSDC = (requiredCollateralWmUSDC) / (10n ** 12n);

            // 20% buffer for UI estimation to be safe against vault fluctuations
            const withBuffer = requiredUSDC * 120n / 100n;

            return ethers.formatUnits(withBuffer, USDC_DECIMALS); // 6 decimals
        } catch (e) {
            console.error("Error calculating deposit:", e);
            return "0";
        }
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

            console.log(`Starting Zale: Borrow ${borrowAmountMXNB} MXNB`);

            // Contracts
            const usdc = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const morphoUSDCVault = new ethers.Contract(CONTRACT_ADDRESSES.morphoUSDCVault, VAULT_ABI, signer);
            const wmUSDC = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, WMEMORY_ABI, signer);
            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);

            // Dynamic Calculation with Vault Conversion
            const oracle = new ethers.Contract(MXNB_MARKET_PARAMS.oracle, ["function price() external view returns (uint256)"], signer);
            const currentPrice = await oracle.price();

            const borrowAmountBN = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
            const TARGET_LTV_WAD = ethers.parseEther("0.70"); // 70% LTV Target

            // 1. Calculate required WmUSDC (18 decimals)
            // Scale 10^54 works correctly alongside Morpho's Oracle Price (scaled to 10^36 implicitly handling dec shift)
            const numerator = borrowAmountBN * (10n ** 54n);
            const denominator = currentPrice * TARGET_LTV_WAD;
            const requiredCollateralWmUSDC = numerator / denominator;

            // 2. Convert to mUSDC required (6 decimals) using the Wrapper's actual conversion rate.
            // Create a dynamic instance with convertToAssets to handle the ~1:4 exchange rate securely.
            /*const wmUSDCDynamic = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, [
                ...WMEMORY_ABI,
                "function convertToAssets(uint256) external view returns (uint256)"
            ], signer);

            const requiredMUSDC = await wmUSDCDynamic.convertToAssets(requiredCollateralWmUSDC);

            // 3. Query Vault for exact USDC cost for these mUSDC shares
            const exactRequiredUSDC = await morphoUSDCVault.convertToAssets(requiredMUSDC);*/

            //3. With new wmusdc contract 1 WmUSDC = 1 USDC, always
            const exactRequiredUSDC = requiredCollateralWmUSDC / (10n ** 12n);

            // 4. Apply 20% safety buffer on the REAL asset cost to absorb Vault fluctuations
            const depositAmountBN = exactRequiredUSDC * 120n / 100n;

            console.log(`Calculated Deposit (Vault-based): ${ethers.formatUnits(depositAmountBN, USDC_DECIMALS)} USDC`);

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

            // Fresh Balance Read - We supply EVERYTHING we have/wrapped to ensure max safety
            const currentWmUSDCBalance = await wmUSDC.balanceOf(userAddress);
            if (currentWmUSDCBalance <= 0n) {
                throw new Error("Cannot supply 0 collateral. WmUSDC balance is 0.");
            }

            // Construct Tuple Array explicitly
            const MXNB_MARKET_PARAMS_ARRAY = [
                MXNB_MARKET_PARAMS.loanToken,
                MXNB_MARKET_PARAMS.collateralToken,
                MXNB_MARKET_PARAMS.oracle,
                MXNB_MARKET_PARAMS.irm,
                MXNB_MARKET_PARAMS.lltv
            ];

            // Debug Logs requested by User
            console.log("--- DEBUG PRE-SUPPLY ---");
            console.log("Supply Amount (ALL):", currentWmUSDCBalance.toString());
            console.log("Market Params:", JSON.stringify(MXNB_MARKET_PARAMS_ARRAY, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            // Verify Allowance specifically for Morpho Blue
            const finalAllowance = await wmUSDC.allowance(userAddress, CONTRACT_ADDRESSES.morphoBlue);
            console.log("Final Allowance for Morpho:", finalAllowance.toString());

            if (finalAllowance < currentWmUSDCBalance) {
                console.warn("Allowance mismatch detected! Attempting emergency approval...");
                const txFix = await wmUSDC.approve(CONTRACT_ADDRESSES.morphoBlue, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                await txFix.wait();
            }

            console.log("Sending supplyCollateral transaction...");
            // CRITICAL FIX: Supply ALL available WmUSDC, not just a calculated fraction.
            // This aligns with the POC logic: "Supply whatever you have".
            const tx6 = await morpho.supplyCollateral(
                MXNB_MARKET_PARAMS_ARRAY,
                currentWmUSDCBalance,
                userAddress,
                "0x",
                { gasLimit: MANUAL_GAS_LIMIT }
            );

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
            if (msg.includes("rejected")) msg = "Rechazaste la transacción";
            if (msg.includes("estimateGas")) msg = "Error de estimación de gas. Posible congestión de red o conexión insuficiente.";
            if (msg.includes("allowance")) msg = "La verificación de permiso falló. Por favor, intenta de nuevo.";
            if (msg.includes("insufficient collateral")) msg = "Colateral insuficiente. La transacción fue revertida por el protocolo.";
            else msg = "La transacción falló. Por favor, intenta de nuevo.";
            setError(msg);
            // Auto-reset handled by useEffect
        } finally {
            // Safety check: if we are not at step 8 (success) and no error was caught (shouldn't happen due to catch),
            // or if we just want to ensure loading is off if something weird happened.
            // But we handled success case above.
            if (step !== 8 && step < 10) {
                setLoading(false);
            }
        }
    };

    const executeRepayAndWithdraw = async () => {
        setLoading(true);
        setError(null);
        setTotalRepaidAmount(null);
        setStep(11); // Start Repay Flow

        try {
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            // Contracts
            const mxnb = new ethers.Contract(CONTRACT_ADDRESSES.mockMXNB, ERC20_ABI, signer);
            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);
            const wmUSDC = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, WMEMORY_ABI, signer);
            const morphoUSDCVault = new ethers.Contract(CONTRACT_ADDRESSES.morphoUSDCVault, VAULT_ABI, signer);

            // Construct Tuple Array explicitly
            const MXNB_MARKET_PARAMS_ARRAY = [
                MXNB_MARKET_PARAMS.loanToken,
                MXNB_MARKET_PARAMS.collateralToken,
                MXNB_MARKET_PARAMS.oracle,
                MXNB_MARKET_PARAMS.irm,
                MXNB_MARKET_PARAMS.lltv
            ];

            // Get Position Data
            const marketId = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address", "address", "address", "address", "uint256"],
                    MXNB_MARKET_PARAMS_ARRAY
                )
            );
            const position = await morpho.position(marketId, userAddress);
            const borrowShares = position[1]; // borrowShares

            if (borrowShares <= 0n) {
                throw new Error("No debt to repay.");
            }

            // --- STEP 1: Approve MXNB for Morpho Blue ---
            console.log("Step 1 (Repay): Checking MXNB Allowance");
            // We need to approve enough MXNB. To be safe, we check balance.
            // Repay function takes shares, but allowance is in assets. 
            // We'll approve MaxUint256 to allow full repay + dust.
            const mxnbBalance = await mxnb.balanceOf(userAddress);
            if (mxnbBalance === 0n) throw new Error("No MXNB balance to repay.");

            // Track amount to be repaid for stats (approximate to balance if full repay)
            setTotalRepaidAmount(ethers.formatUnits(mxnbBalance, MXNB_DECIMALS));

            const mxnbAllowance = await mxnb.allowance(userAddress, CONTRACT_ADDRESSES.morphoBlue);
            if (mxnbAllowance < mxnbBalance) {
                const tx1 = await mxnb.approve(CONTRACT_ADDRESSES.morphoBlue, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx1.hash);
                await tx1.wait();
                await waitForAllowance(mxnb, userAddress, CONTRACT_ADDRESSES.morphoBlue, mxnbBalance);
            }

            /*console.log(`Calculating subsidy ${debtAssets} MXNB (${borrowShares.toString()} shares)...`);
            const interestTx = await wmUSDC.getInterestSubsidy(userAddress);
            await interestTx.wait();
            console.log(`✓ Interest tx confirmed (${interestTx.hash})`);*/

            // --- STEP 2: Repay Full Debt ---
            setStep(12);
            console.log("Step 2 (Repay): Repaying Debt");
            // Pass 0 for assets, and borrowShares for shares to repay all
            const tx2 = await morpho.repay(MXNB_MARKET_PARAMS_ARRAY, 0, borrowShares, userAddress, "0x", { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(tx2.hash);
            await tx2.wait();

            // --- STEP 3: Withdraw Collateral ---
            setStep(13);
            console.log("Step 3 (Repay): Withdrawing Collateral");
            const updatedPosition = await morpho.position(marketId, userAddress);
            const collateralShares = updatedPosition[2];

            // Capture initial balance before withdrawal to verify state change
            const initialWmUsdcBalance = await wmUSDC.balanceOf(userAddress);

            if (collateralShares > 0n) {
                const tx3 = await morpho.withdrawCollateral(MXNB_MARKET_PARAMS_ARRAY, collateralShares, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx3.hash);
                await tx3.wait();

                // Wait for Base Testnet indexer to sync the balance
                await waitForBalanceIncrease(wmUSDC, userAddress, initialWmUsdcBalance);
            }

            // --- STEP 4: Unwrap WmUSDC -> mUSDC ---
            setStep(14);
            console.log("Step 4 (Repay): Unwrap WmUSDC");

            // Re-read strictly updated balance
            const wmusdcBalance = await wmUSDC.balanceOf(userAddress);
            const initialMUsdcBalance = await morphoUSDCVault.balanceOf(userAddress);

            if (wmusdcBalance > 0n) {
                const tx4 = await wmUSDC.redeem(wmusdcBalance, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx4.hash);
                await tx4.wait();

                // Wait for balance to index
                await waitForBalanceIncrease(morphoUSDCVault, userAddress, initialMUsdcBalance);
            }

            // --- STEP 5: Redeem mUSDC -> USDC ---
            setStep(15);
            console.log("Step 5 (Repay): Redeem mUSDC");
            const musdcBalance = await morphoUSDCVault.balanceOf(userAddress);
            if (musdcBalance > 0n) {
                const tx5 = await morphoUSDCVault.redeem(musdcBalance, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(tx5.hash);
                await tx5.wait();
            }

            setStep(16); // Complete Repay Flow
            await refreshData();
            setLoading(false);

        } catch (err: any) {
            console.error("Repay Error:", err);
            let msg = err.reason || err.message || "Repay transaction failed";
            if (msg.includes("rejected")) msg = "Rechazaste la transacción";
            if (msg.includes("reverted")) msg = "La transacción fue revertida por el protocolo, revisa tu ETH y la liquidez en el mercado";
            if (msg.includes("allowance")) msg = "La verificación de permiso falló. Por favor, intenta de nuevo.";
            if (msg.includes("insufficient collateral")) msg = "Colateral insuficiente. La transacción fue revertida por el protocolo.";
            else msg = "La transacción falló. Por favor, intenta de nuevo.";
            setError(msg);

        } finally {
            if (step !== 16 && step >= 11) {
                setLoading(false);
            }
        }
    };

    const resetState = () => {
        setStep(0);
        setError(null);
        setTxHash(null);
        setLoading(false);
        // Balance reset not needed
    };

    return {
        loading,
        step,
        error,
        txHash,
        usdcBalance,
        mxnbBalance,
        collateralBalance,
        borrowBalance,
        marketLiquidity,
        marketAPR,
        totalRepaidAmount,
        getSimulatedDeposit,
        executeZale,
        executeRepayAndWithdraw,
        refreshData,
        resetState
    };
};
