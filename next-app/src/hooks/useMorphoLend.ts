import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import {
    CONTRACT_ADDRESSES,
    ERC20_ABI,
    WMEMORY_ABI,
    MORPHO_ABI,
    IRM_ABI,
    AAVE_ABI,
    MXNB_MARKET_PARAMS,
    MARKET_IDS,
    VAULT_ABI,
} from '../constants/contracts';

const USDC_DECIMALS = 6;
const MANUAL_GAS_LIMIT = 5000000n; // Increased gas limit to be safe for multiple txs

// Extend WMEMORY_ABI to include totalAssets if possible
const EXTENDED_WMEMORY_ABI = [
    ...WMEMORY_ABI,
    "function totalAssets() external view returns (uint256)",
    "function previewRedeem(uint256 shares) external view returns (uint256 assets)",
    "function convertToAssets(uint256 shares) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

export const useMorphoLend = () => {
    const { wallets } = useWallets();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: Idle, 1...
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    // New states for success screen
    const [withdrawnAmount, setWithdrawnAmount] = useState<string | null>(null);
    const [yieldEarned, setYieldEarned] = useState<string | null>(null);

    // Data States
    const [usdcBalance, setUsdcBalance] = useState<string>("0.000");
    const [wrapperSharesBalance, setWrapperSharesBalance] = useState<string>("0.000");
    const [wrapperAssetsBalance, setWrapperAssetsBalance] = useState<string>("0.000");
    const [tvl, setTvl] = useState<string>("0.000");
    const [apy, setApy] = useState<number>(0);

    // Market data states for APY calculation
    const [totalSupplied, setTotalSupplied] = useState<number>(0);
    const [totalBorrowed, setTotalBorrowed] = useState<number>(0);

    // Helper: Format with max 3 decimals
    const formatBalance = (val: bigint, decimals: number) => {
        const formatted = ethers.formatUnits(val, decimals);
        const [integer, fraction] = formatted.split(".");
        if (!fraction) return integer;
        return `${integer}.${fraction.substring(0, 3)}`;
    };

    // Helper to get signer
    const getSigner = useCallback(async () => {
        const wallet = wallets[0];
        if (!wallet) throw new Error("Wallet not connected");

        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        return ethersProvider.getSigner();
    }, [wallets]);

    // Fetch market details and borrow rate for APY calculation
    const fetchMarketData = useCallback(async () => {
        try {
            if (!wallets.length) return;
            const signer = await getSigner();

            const morphoContract = new ethers.Contract(
                CONTRACT_ADDRESSES.morphoBlue,
                MORPHO_ABI,
                signer
            );

            // Read market details - fallback to mxnb if usdc fails just to have some rate to show
            let marketDetailsToUse;
            try {
                marketDetailsToUse = await morphoContract.market(MARKET_IDS.usdc);
            } catch (e) {
                marketDetailsToUse = await morphoContract.market(MARKET_IDS.mxnb);
            }

            const totalSupplyAssets = Number(ethers.formatUnits(marketDetailsToUse.totalSupplyAssets, 6));
            const totalBorrowAssets = Number(ethers.formatUnits(marketDetailsToUse.totalBorrowAssets, 6));

            setTotalSupplied(totalSupplyAssets);
            setTotalBorrowed(totalBorrowAssets);

            // Read borrow rate from IRM
            const irmContract = new ethers.Contract(
                MXNB_MARKET_PARAMS.irm,
                IRM_ABI,
                signer
            );

            const marketTuple = [
                marketDetailsToUse[0],
                marketDetailsToUse[1],
                marketDetailsToUse[2],
                marketDetailsToUse[3],
                marketDetailsToUse[4],
                marketDetailsToUse[5],
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

            const feeRate = 0; // Fee rate in decimals
            const borrowRateDecimal = Number(borrowRate) / 1e18;
            const secondsPerYear = 60 * 60 * 24 * 365;
            const utilization = totalSupplyAssets > 0 ? (totalBorrowAssets / totalSupplyAssets) : 0;
            const borrowApy = Math.exp(borrowRateDecimal * secondsPerYear) - 1;
            const supplyApy = borrowApy * utilization * (1 - feeRate);

            setApy(supplyApy);
        } catch (err) {
            console.error("Error fetching market data:", err);
        }
    }, [wallets, getSigner]);

    const refreshData = useCallback(async () => {
        try {
            if (!wallets.length) return;
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const wrapperContract = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, EXTENDED_WMEMORY_ABI, signer);

            const usdcBal = await usdcContract.balanceOf(userAddress);
            const sharesBal = await wrapperContract.balanceOf(userAddress);

            let totalAssetsVal = 0n;
            try {
                totalAssetsVal = await wrapperContract.totalAssets();
            } catch (e) {
                // Ignore if wrapper doesn't have totalAssets
            }

            let assetsBal = sharesBal; // default 1:1 if not found
            try {
                if (sharesBal > 0n) {
                    assetsBal = await wrapperContract.convertToAssets(sharesBal);
                }
            } catch (e) {
                // Ignore if missing convertToAssets
            }

            setUsdcBalance(formatBalance(usdcBal, USDC_DECIMALS));

            let wmUSDCDecimals = 18;
            try {
                const dec = await wrapperContract.decimals();
                wmUSDCDecimals = Number(dec);
            } catch (e) { }

            setWrapperSharesBalance(formatBalance(sharesBal, wmUSDCDecimals));

            let displayAssets = assetsBal;
            if (wmUSDCDecimals === 18 && displayAssets > 0n) {
                displayAssets = displayAssets / (10n ** 12n);
            }

            setWrapperAssetsBalance(formatBalance(displayAssets, USDC_DECIMALS));

            let displayTvl = totalAssetsVal;
            if (wmUSDCDecimals === 18 && displayTvl > 0n) {
                displayTvl = displayTvl / (10n ** 12n);
            }
            setTvl(formatBalance(displayTvl, USDC_DECIMALS));

            await fetchMarketData();
        } catch (err) {
            console.error("Error refreshing data:", err);
        }
    }, [wallets, getSigner, fetchMarketData]);

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

            console.log(`Waiting for allowance...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            retries++;
        }
        throw new Error("Allowance failed to propagate.");
    };

    const waitForBalanceIncrease = async (
        tokenContract: ethers.Contract,
        userAddress: string,
        initialBalance: bigint
    ) => {
        let retries = 0;
        while (retries < 15) {
            const currentBalance = await tokenContract.balanceOf(userAddress);
            if (currentBalance > initialBalance) return currentBalance;
            await new Promise(resolve => setTimeout(resolve, 5000));
            retries++;
        }
        throw new Error("RPC timeout: Balance didn't increase.");
    };

    const executeDeposit = async (amountUSDC: string) => {
        setLoading(true);
        setError(null);
        setStep(1);

        try {
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            const usdc = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const aavePool = new ethers.Contract(CONTRACT_ADDRESSES.aavePool, AAVE_ABI, signer);
            const aUSDC = new ethers.Contract(CONTRACT_ADDRESSES.aUSDC, ERC20_ABI, signer);
            const wrapperContract = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, EXTENDED_WMEMORY_ABI, signer);
            const morphoUSDCVault = new ethers.Contract(CONTRACT_ADDRESSES.morphoUSDCVault, VAULT_ABI, signer);

            const depositAmountBN = ethers.parseUnits(amountUSDC, USDC_DECIMALS);

            // 1. Approve USDC to Aave
            console.log("Step 1: Approve USDC to Aave");
            const currentAllowance = await usdc.allowance(userAddress, CONTRACT_ADDRESSES.aavePool);
            if (currentAllowance < depositAmountBN) {
                const txApprove = await usdc.approve(CONTRACT_ADDRESSES.aavePool, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(txApprove.hash);
                await txApprove.wait();
                await waitForAllowance(usdc, userAddress, CONTRACT_ADDRESSES.aavePool, depositAmountBN);
            }

            const initialAUsdc = await aUSDC.balanceOf(userAddress);

            // 2. Supply USDC to Aave -> get aUSDC
            setStep(2);
            console.log("Step 2: Supplying USDC to Aave");
            const txDeposit = await aavePool.supply(CONTRACT_ADDRESSES.usdc, depositAmountBN, userAddress, 0, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(txDeposit.hash);
            await txDeposit.wait();

            await waitForBalanceIncrease(aUSDC, userAddress, initialAUsdc);

            const aUsdcBalance = await aUSDC.balanceOf(userAddress);
            const mintedAUsdc = aUsdcBalance - initialAUsdc;

            // 3. Approve USDC to Morpho Vault
            setStep(3);
            console.log("Step 3: Approve USDC to Morpho Vault");
            const morphoVaultAllowance = await usdc.allowance(userAddress, CONTRACT_ADDRESSES.morphoUSDCVault);
            if (morphoVaultAllowance < depositAmountBN) {
                const txApproveM = await usdc.approve(CONTRACT_ADDRESSES.morphoUSDCVault, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(txApproveM.hash);
                await txApproveM.wait();
                await waitForAllowance(usdc, userAddress, CONTRACT_ADDRESSES.morphoUSDCVault, depositAmountBN);
            }

            const initialMUsdc = await morphoUSDCVault.balanceOf(userAddress);

            // 4. Deposit USDC to Morpho Vault -> get mUSDC
            setStep(4);
            console.log("Step 4: Deposit USDC to Morpho Vault");
            const txDepositM = await morphoUSDCVault.deposit(depositAmountBN, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(txDepositM.hash);
            await txDepositM.wait();

            await waitForBalanceIncrease(morphoUSDCVault, userAddress, initialMUsdc);

            const mUsdcBalance = await morphoUSDCVault.balanceOf(userAddress);

            // 5. Approve mUSDC to Wrapper
            setStep(5);
            console.log("Step 5: Approve mUSDC to Wrapper");
            const wrapperAllowance = await morphoUSDCVault.allowance(userAddress, CONTRACT_ADDRESSES.wmUSDC);
            if (wrapperAllowance < mUsdcBalance) {
                const txApproveW = await morphoUSDCVault.approve(CONTRACT_ADDRESSES.wmUSDC, ethers.MaxUint256, { gasLimit: MANUAL_GAS_LIMIT });
                setTxHash(txApproveW.hash);
                await txApproveW.wait();
                await waitForAllowance(morphoUSDCVault, userAddress, CONTRACT_ADDRESSES.wmUSDC, mUsdcBalance);
            }

            const initialWrapperBal = await wrapperContract.balanceOf(userAddress);

            // 6. Deposit mUSDC into Wrapper
            setStep(6);
            console.log("Step 6: Deposit mUSDC to Wrapper (wmUSDC)");
            const txWrap = await wrapperContract.deposit(mUsdcBalance, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(txWrap.hash);
            await txWrap.wait();

            await waitForBalanceIncrease(wrapperContract, userAddress, initialWrapperBal);

            // Success
            setStep(7);
            await refreshData();
            setLoading(false);

        } catch (err: any) {
            console.error("Deposit Error:", err);
            let msg = err.reason || err.message || "Deposit failed";
            if (msg.includes("rejected")) msg = "You rejected the transaction";
            setError(msg);
            setLoading(false);
        }
    };

    const executeWithdraw = async (sharesAmount: string | bigint, withdrawAll: boolean = false) => {
        setLoading(true);
        setError(null);
        setStep(11);
        setWithdrawnAmount(null);
        setYieldEarned(null);

        try {
            const signer = await getSigner();
            const userAddress = await signer.getAddress();
            const wrapperContract = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, EXTENDED_WMEMORY_ABI, signer);
            const aUSDC = new ethers.Contract(CONTRACT_ADDRESSES.aUSDC, ERC20_ABI, signer);
            const aavePool = new ethers.Contract(CONTRACT_ADDRESSES.aavePool, AAVE_ABI, signer);

            let wrapperDecimals = 18;
            try { wrapperDecimals = Number(await wrapperContract.decimals()); } catch (e) { }

            let sharesToRedeem: bigint;
            if (withdrawAll) {
                sharesToRedeem = await wrapperContract.balanceOf(userAddress);
            } else {
                if (typeof sharesAmount === 'string') {
                    sharesToRedeem = ethers.parseUnits(sharesAmount, wrapperDecimals);
                } else {
                    sharesToRedeem = sharesAmount;
                }
            }

            if (sharesToRedeem === 0n) throw new Error("No shares to withdraw.");

            console.log("Withdrawing shares:", sharesToRedeem.toString());

            // 1. Unwrap wmUSDC into aUSDC
            const initialAUsdc = await aUSDC.balanceOf(userAddress);
            const txRedeem = await wrapperContract.redeem(sharesToRedeem, userAddress, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(txRedeem.hash);
            await txRedeem.wait();

            await waitForBalanceIncrease(aUSDC, userAddress, initialAUsdc);

            const aUsdcBalanceNow = await aUSDC.balanceOf(userAddress);
            const aUsdcRedeemed = aUsdcBalanceNow - initialAUsdc;

            // 2. Withdraw aUSDC from Aave for USDC
            setStep(12);
            console.log("Step 12: Withdraw aUSDC from Aave");
            const usdc = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const initialUSDC = await usdc.balanceOf(userAddress);

            const txWithdraw = await aavePool.withdraw(CONTRACT_ADDRESSES.usdc, aUsdcRedeemed, userAddress, { gasLimit: MANUAL_GAS_LIMIT });
            setTxHash(txWithdraw.hash);
            await txWithdraw.wait();

            await waitForBalanceIncrease(usdc, userAddress, initialUSDC);

            const usdcBalanceNow = await usdc.balanceOf(userAddress);
            const withdrawnUSDC = usdcBalanceNow - initialUSDC;

            setWithdrawnAmount(ethers.formatUnits(withdrawnUSDC, USDC_DECIMALS));

            // Success
            setStep(13); // Withdrawal Success
            await refreshData();
            setLoading(false);

        } catch (err: any) {
            console.error("Withdraw Error:", err);
            let msg = err.reason || err.message || "Withdraw failed";
            if (msg.includes("user rejected")) msg = "User rejected transaction";
            setError(msg);
            setLoading(false);
        }
    };

    const resetState = () => {
        setStep(0);
        setError(null);
        setTxHash(null);
        setLoading(false);
        setWithdrawnAmount(null);
        setYieldEarned(null);
    };

    return {
        loading,
        step,
        error,
        txHash,
        usdcBalance, // Exporting as usdcBalance representing the deposit token
        mxnbBalance: usdcBalance, // Alias to avoid breaking strictly named UI
        vaultSharesBalance: wrapperSharesBalance,
        vaultAssetsBalance: wrapperAssetsBalance,
        tvl,
        apy: (apy * 100).toFixed(2),
        withdrawnAmount,
        yieldEarned,
        executeDeposit,
        executeWithdraw,
        refreshData,
        resetState
    };
};
