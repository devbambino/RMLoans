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
    IRM_ABI,
    MXNB_MARKET_PARAMS,
    MARKET_IDS,
} from '../constants/contracts';

const TARGET_LTV = 0.50; // Conservative LTV target for calculation
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
    const [marketAPR, setMarketAPR] = useState<number>(0);
    const [totalRepaidAmount, setTotalRepaidAmount] = useState<string | null>(null);
    const [oraclePrice, setOraclePrice] = useState<bigint>(0n);
    const [userPaidSubsidyInUSDC, setUserPaidSubsidyInUSDC] = useState<string>("0");
    const [userInterestInMxnb, setUserInterestInMxnb] = useState<string>("0");
    const [userInterestInUSDC, setUserInterestInUSDC] = useState<string>("0");

    // Market data states for APR calculation
    const [totalSupplied, setTotalSupplied] = useState<number>(0);
    const [totalBorrowed, setTotalBorrowed] = useState<number>(0);

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

        // Using Privy's direct provider which already handles the connection
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        return ethersProvider.getSigner();
    }, [wallets]);

    // Fetch market APR by reading borrow rate from IRM
    const fetchMarketAPR = useCallback(async () => {
        try {
            if (!wallets.length) return;
            const signer = await getSigner();

            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);

            // Read market details
            const marketDetails = await morpho.market(MARKET_IDS.mxnb);
            const totalSupplyAssets = Number(ethers.formatUnits(marketDetails.totalSupplyAssets, MXNB_DECIMALS));
            const totalBorrowAssets = Number(ethers.formatUnits(marketDetails.totalBorrowAssets, MXNB_DECIMALS));

            setTotalSupplied(totalSupplyAssets);
            setTotalBorrowed(totalBorrowAssets);

            // Read borrow rate from IRM
            const irmContract = new ethers.Contract(
                MXNB_MARKET_PARAMS.irm,
                IRM_ABI,
                signer
            );

            // Reconstruct market tuple as plain array to avoid read-only errors
            const marketTuple = [
                marketDetails[0],   // totalSupplyAssets
                marketDetails[1],   // totalSupplyShares
                marketDetails[2],   // totalBorrowAssets
                marketDetails[3],   // totalBorrowShares
                marketDetails[4],   // lastUpdate
                marketDetails[5],   // fee
            ];

            const borrowRate = await irmContract.borrowRateView(
                [
                    MXNB_MARKET_PARAMS.loanToken,
                    MXNB_MARKET_PARAMS.collateralToken,
                    MXNB_MARKET_PARAMS.oracle,
                    MXNB_MARKET_PARAMS.irm,
                    MXNB_MARKET_PARAMS.lltv,
                ],
                marketTuple
            );

            console.log("Market Details:", { totalSupplyAssets, totalBorrowAssets });
            console.log("Borrow Rate (per second):", borrowRate.toString());

            // Calculate APR (borrowing rate)
            const borrowRateDecimal = Number(borrowRate) / 1e18;
            const secondsPerYear = 60 * 60 * 24 * 365;
            const borrowApr = Math.exp(borrowRateDecimal * secondsPerYear) - 1;

            setMarketAPR(borrowApr);
            console.log("APR Calculation:", {
                borrowRate: borrowRateDecimal,
                borrowApr,
                borrowAprPercent: borrowApr * 100,
            });
        } catch (err) {
            console.error("Error fetching market APR:", err);
        }
    }, [wallets, getSigner]);

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

            // Fetch market APR
            await fetchMarketAPR();

        } catch (err) {
            console.error("Error refreshing data:", err);
        }
    }, [wallets, getSigner, fetchMarketAPR]);

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
            const safePrice = 17; // MXNB per unit of collateral
            const requiredWmUSDC = amount / (TARGET_LTV * safePrice);
            // Convert WmUSDC to USDC approx (1 WmUSDC ≈ 4 USDC)
            const requiredUSDCApprox = requiredWmUSDC;// * 4.0;
            // 20% buffer
            return (requiredUSDCApprox).toFixed(2);
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
            //const withBuffer = requiredUSDC * 120n / 100n;
            const withBuffer = requiredUSDC;

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

    const waitForSubsidyIncrease = async (
        tokenContract: ethers.Contract,
        userAddress: string,
        initialBalance: bigint
    ) => {
        let retries = 0;
        while (retries < 15) {
            const currentBalance = await tokenContract.userInterestSubsidyInWmUSDC(userAddress);
            if (currentBalance > initialBalance) return currentBalance;

            console.log(`Waiting for subsidy update... Attempt ${retries + 1}/15`);
            await new Promise(resolve => setTimeout(resolve, 2500)); // Wait 2.5s
            retries++;
        }
        throw new Error("RPC timeout: The network is slow indexing your new subsidy. Please wait a moment and try again.");
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
            const TARGET_LTV_WAD = ethers.parseEther("0.50"); // 50% LTV Target

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
            const depositAmountBN = exactRequiredUSDC;// * 120n / 100n;

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
            if (msg.includes("rejected")) msg = "You rejected the transaction";
            if (msg.includes("estimateGas")) msg = "Gas estimation error. Possible network congestion or insufficient connection.";
            if (msg.includes("allowance")) msg = "Permission verification failed. Please try again.";
            if (msg.includes("insufficient collateral")) msg = "Insufficient collateral. The transaction was reverted by the protocol.";
            else msg = "The transaction failed. Please try again.";
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

            const initialRawSubsidyUSDC = await wmUSDC.userInterestSubsidyInWmUSDC(userAddress);
            console.log(`Calculating subsidy in MXNB (${borrowShares.toString()} shares) with INitial Subsidy: ${initialRawSubsidyUSDC} WmUSDC...`);
            const userInterestSubsidyInWmUSDC = await wmUSDC.getInterestSubsidy(userAddress);
            //await interestTx.wait();
            console.log('✓ Interest confirmed:', userInterestSubsidyInWmUSDC);

            await waitForSubsidyIncrease(wmUSDC, userAddress, initialRawSubsidyUSDC);
            const rawEstimatedSubsidyUSDC = await wmUSDC.userInterestSubsidyInWmUSDC(userAddress);
            const estimatedSubsidyUSDC = ethers.formatUnits(rawEstimatedSubsidyUSDC, 18);
            const rawEstimatedSubsidyMXNB = await wmUSDC.userInterestInMxnb(userAddress);
            const estimatedSubsidyMXNB = ethers.formatUnits(rawEstimatedSubsidyMXNB, 6);
            console.log(`User Subsidy: ${estimatedSubsidyUSDC} USDC (${estimatedSubsidyMXNB} MXNB)`);

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
                const tx4 = await wmUSDC.redeemWithInterestSubsidy(wmusdcBalance, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
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
            const rawPaidSubsidyUSDC = await wmUSDC.userPaidSubsidyInUSDC(userAddress);
            const paidSubsidyUSDC = ethers.formatUnits(rawPaidSubsidyUSDC, 6);
            console.log(`Paid Subsidy: ${paidSubsidyUSDC} USDC (${estimatedSubsidyMXNB} MXNB, ${estimatedSubsidyUSDC})`);
            
            setUserPaidSubsidyInUSDC(paidSubsidyUSDC);
            setUserInterestInMxnb(estimatedSubsidyMXNB);
            setUserInterestInUSDC(estimatedSubsidyUSDC);

            await refreshData();
            setLoading(false);

        } catch (err: any) {
            console.error("Repay Error:", err);
            let msg = err.reason || err.message || "Repay transaction failed";
            if (msg.includes("rejected")) msg = "You rejected the transaction";
            if (msg.includes("reverted")) msg = "The transaction was reverted by the protocol. Check your ETH and market liquidity.";
            if (msg.includes("allowance")) msg = "Permission verification failed. Please try again.";
            if (msg.includes("insufficient collateral")) msg = "Insufficient collateral. The transaction was reverted by the protocol.";
            else msg = "The transaction failed. Please try again.";
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
        setUserPaidSubsidyInUSDC("0");
        setUserInterestInMxnb("0");
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
        marketAPR: (marketAPR * 100).toFixed(2), // Return as percentage string for display
        totalRepaidAmount,
        userPaidSubsidyInUSDC,
        userInterestInMxnb,
        userInterestInUSDC,
        getSimulatedDeposit,
        executeZale,
        executeRepayAndWithdraw,
        refreshData,
        resetState
    };
};
