import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import {
    CONTRACT_ADDRESSES,
    ERC20_ABI,
    VAULT_ABI,
    WMEMORY_ABI,
    MORPHO_ABI,
    ORACLE_ABI,
    MXNB_MARKET_PARAMS,
} from '../constants/contracts';

const TARGET_LTV = 0.75; // Slightly lower than 0.77 for safety
const USDC_DECIMALS = 6;
const MXNB_DECIMALS = 6;

export const useMorphoLoan = () => {
    const { wallets } = useWallets();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: Idle, 1: Approve USDC, 2: Supply Vault, 3: Approve mUSDC, 4: Wrap, 5: Approve WmUSDC, 6: Supply Collateral, 7: Borrow
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
    const [exchangeRate, setExchangeRate] = useState<number>(20.0); // Default estimate 1 USDC = 20 MXNB (approx)

    // Helper to get signer
    const getSigner = useCallback(async () => {
        const wallet = wallets[0];
        if (!wallet) throw new Error("Wallet not connected");
        // Get EIP-1193 provider
        const provider = await wallet.getEthereumProvider();
        // Wrap in ethers BrowserProvider
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        return signer;
    }, [wallets]);

    // Fetch balances and exchange rate
    const refreshData = useCallback(async () => {
        try {
            if (!wallets.length) return;
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            // USDC Balance
            const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const bal = await usdcContract.balanceOf(userAddress);
            setUsdcBalance(ethers.formatUnits(bal, USDC_DECIMALS));

            // Oracle Price
            // TODO: Implement actual oracle fetch if possible. For now using hardcoded safety estimate or try to fetch.
            // const oracle = new ethers.Contract(CONTRACT_ADDRESSES.wmusdcMxnbOracle, ORACLE_ABI, signer);
            // const price = await oracle.price();
            // console.log("Oracle Price:", price.toString());
            // For PoC: assume 1 USDC ~= 20 MXNB. 
            // Logic: Collateral (WmUSDC) Price in MXNB terms.

        } catch (err) {
            console.error("Error refreshing data:", err);
        }
    }, [wallets, getSigner]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [refreshData]);

    // Calculate required USDC for a given MXNB borrow amount
    const getSimulatedDeposit = (borrowAmountMXNB: string): string => {
        if (!borrowAmountMXNB || parseFloat(borrowAmountMXNB) <= 0) return "0";

        // Formula: Required Collateral Value (MXNB) = Borrow Amount / LTV
        // Required Collateral Amount (WmUSDC) = Required Collateral Value / Price (MXNB per WmUSDC)
        // Here we simplify: 1 USDC = X MXNB.
        // LTV = 0.77.
        // Borrow 100 MXNB. Max Borrow = Collateral * Price * 0.77.
        // Collateral = Borrow / (Price * 0.77).

        const amount = parseFloat(borrowAmountMXNB);
        // Assuming Price ~ 19.5 MXNB/USDC (conservative estimate for calculation)
        const priceEstimate = 19.5;

        // Required USDC = amount / (0.75 * 19.5)
        // This is an ESTIMATE for the UI. The specific on-chain LTV check is what matters.
        const required = amount / (TARGET_LTV * priceEstimate);
        return (required * 1.05).toFixed(2); // Add 5% buffer
    };

    const executeZale = async (borrowAmountMXNB: string) => {
        setLoading(true);
        setError(null);
        setStep(1);

        try {
            const signer = await getSigner();
            const userAddress = await signer.getAddress();

            const borrowAmountBN = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
            const calculatedDeposit = getSimulatedDeposit(borrowAmountMXNB);
            const depositAmountBN = ethers.parseUnits(calculatedDeposit, USDC_DECIMALS);

            console.log(`Starting Zale: Borrow ${borrowAmountMXNB} MXNB, Deposit ${calculatedDeposit} USDC`);

            // Contracts
            const usdc = new ethers.Contract(CONTRACT_ADDRESSES.usdc, ERC20_ABI, signer);
            const morphoUSDCVault = new ethers.Contract(CONTRACT_ADDRESSES.morphoUSDCVault, VAULT_ABI, signer);
            const wmUSDC = new ethers.Contract(CONTRACT_ADDRESSES.wmUSDC, WMEMORY_ABI, signer);
            const morpho = new ethers.Contract(CONTRACT_ADDRESSES.morphoBlue, MORPHO_ABI, signer);

            // --- STEP 1: Approve USDC for Morpho Vault ---
            const usdcAllowance = await usdc.allowance(userAddress, CONTRACT_ADDRESSES.morphoUSDCVault);
            if (usdcAllowance < depositAmountBN) {
                setStep(1);
                const tx = await usdc.approve(CONTRACT_ADDRESSES.morphoUSDCVault, depositAmountBN);
                setTxHash(tx.hash);
                await tx.wait();
            }

            // --- STEP 2: Deposit USDC into Morpho Vault (get mUSDC) ---
            setStep(2);
            // Check if we need to deposit? Always deposit for new loan.
            const tx2 = await morphoUSDCVault.deposit(depositAmountBN, userAddress);
            setTxHash(tx2.hash);
            const receipt2 = await tx2.wait();
            // Get actual mUSDC received (it might be slightly different due to shares, but for PoC 1:1)
            const musdcBalance = await morphoUSDCVault.balanceOf(userAddress); // Use full balance for simplicity of the zap

            // --- STEP 3: Approve mUSDC for Wrapper ---
            setStep(3);
            const musdcAllowance = await morphoUSDCVault.approve(CONTRACT_ADDRESSES.wmUSDC, musdcBalance);
            // Morpho Vault usually returns bool, doesn't throw. Wait for tx.
            setTxHash(musdcAllowance.hash);
            await musdcAllowance.wait();

            // --- STEP 4: Wrap mUSDC -> WmUSDC ---
            setStep(4);
            const tx4 = await wmUSDC.deposit(musdcBalance, userAddress);
            setTxHash(tx4.hash);
            await tx4.wait();
            const wmusdcBalance = await wmUSDC.balanceOf(userAddress);

            // --- STEP 5: Approve WmUSDC for Morpho Blue ---
            setStep(5);
            const wmusdcAllowance = await wmUSDC.allowance(userAddress, CONTRACT_ADDRESSES.morphoBlue);
            if (wmusdcAllowance < wmusdcBalance) {
                const tx5 = await wmUSDC.approve(CONTRACT_ADDRESSES.morphoBlue, wmusdcBalance);
                setTxHash(tx5.hash);
                await tx5.wait();
            }

            // --- STEP 6: Supply Collateral ---
            setStep(6);
            const tx6 = await morpho.supplyCollateral(MXNB_MARKET_PARAMS, wmusdcBalance, userAddress, "0x");
            setTxHash(tx6.hash);
            await tx6.wait();

            // --- STEP 7: Borrow MXNB ---
            setStep(7);
            const tx7 = await morpho.borrow(MXNB_MARKET_PARAMS, borrowAmountBN, 0, userAddress, userAddress);
            setTxHash(tx7.hash);
            await tx7.wait();

            setStep(8); // Complete
            await refreshData();
        } catch (err: any) {
            console.error("Zale Error:", err);
            // Parse error message
            let msg = err.reason || err.message || "Transaction failed";
            if (msg.includes("user rejected")) msg = "User rejected transaction";
            setError(msg);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        step,
        error,
        txHash,
        usdcBalance,
        getSimulatedDeposit,
        executeZale,
        refreshData
    };
};
