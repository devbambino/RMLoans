// src/hooks/useMorphoLend.ts
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import { useWalletId } from "./useWalletId";
import {
  BASE_SEPOLIA_CONFIG,
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  VAULT_ABI,
  MORPHO_ABI,
  IRM_ABI,
  MXNE_MARKET_PARAMS,
  MARKET_IDS,
} from "../constants/contracts";

const MXNE_DECIMALS = 6;

const EXTENDED_VAULT_ABI = [
  ...VAULT_ABI,
  "function totalAssets() external view returns (uint256)",
  "function previewRedeem(uint256 shares) external view returns (uint256 assets)",
];

export const useMorphoLend = () => {
  const { wallets } = useWallets();
  const { walletId } = useWalletId(); // Server-side signing: dynamic walletId
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState<string | null>(null);
  const [yieldEarned, setYieldEarned] = useState<string | null>(null);
  const [mxneBalance, setMxneBalance] = useState<string>("0.000");
  const [vaultSharesBalance, setVaultSharesBalance] = useState<string>("0.000");
  const [vaultAssetsBalance, setVaultAssetsBalance] = useState<string>("0.000");
  const [tvl, setTvl] = useState<string>("0.000");
  const [apy, setApy] = useState<number>(0);
  const [totalSupplied, setTotalSupplied] = useState<number>(0);
  const [totalBorrowed, setTotalBorrowed] = useState<number>(0);

  const formatBalance = (val: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(val, decimals);
    const [integer, fraction] = formatted.split(".");
    if (!fraction) return integer;
    return `${integer}.${fraction.substring(0, 1)}`;
  };

  // Read-only provider — no wallet signing needed for reads
  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
  }, []);

  const fetchMarketData = useCallback(async () => {
    try {
      if (!wallets.length) return;
      const provider = getProvider();
      const morphoContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoBlue,
        MORPHO_ABI,
        provider,
      );
      const marketDetails = await morphoContract.market(MARKET_IDS.mxne);
      const totalSupplyAssets = Number(
        ethers.formatUnits(marketDetails.totalSupplyAssets, 6),
      );
      const totalBorrowAssets = Number(
        ethers.formatUnits(marketDetails.totalBorrowAssets, 6),
      );

      setTotalSupplied(totalSupplyAssets);
      setTotalBorrowed(totalBorrowAssets);

      const irmContract = new ethers.Contract(
        MXNE_MARKET_PARAMS.irm,
        IRM_ABI,
        provider,
      );
      const marketTuple = [
        marketDetails[0],
        marketDetails[1],
        marketDetails[2],
        marketDetails[3],
        marketDetails[4],
        marketDetails[5],
      ];
      const borrowRate = await irmContract.borrowRateView(
        [
          MXNE_MARKET_PARAMS.loanToken,
          MXNE_MARKET_PARAMS.collateralToken,
          MXNE_MARKET_PARAMS.oracle,
          MXNE_MARKET_PARAMS.irm,
          MXNE_MARKET_PARAMS.lltv,
        ],
        marketTuple,
      );
      const borrowRateDecimal = Number(borrowRate) / 1e18;
      const secondsPerYear = 60 * 60 * 24 * 365;
      const utilization = totalBorrowAssets / totalSupplyAssets;
      const borrowApy = Math.exp(borrowRateDecimal * secondsPerYear) - 1;
      const supplyApy = borrowApy * utilization;
      setApy(supplyApy);
    } catch (err) {
      console.error("Error fetching market data:", err);
    }
  }, [wallets, getProvider]);

  const refreshData = useCallback(async () => {
    try {
      if (!wallets.length) return;
      const userAddress = wallets[0]?.address;
      if (!userAddress) return;

      const provider = getProvider();
      const mxneContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockMXNE,
        ERC20_ABI,
        provider,
      );
      const vaultContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoMXNEVault,
        EXTENDED_VAULT_ABI,
        provider,
      );

      const [mxneBal, sharesBal, totalAssetsVal] = await Promise.all([
        mxneContract.balanceOf(userAddress),
        vaultContract.balanceOf(userAddress),
        vaultContract.totalAssets(),
      ]);

      let assetsBal = 0n;
      if (sharesBal > 0n) {
        assetsBal = await vaultContract.convertToAssets(sharesBal);
      }

      setMxneBalance(formatBalance(mxneBal, MXNE_DECIMALS));
      setVaultSharesBalance(formatBalance(sharesBal, MXNE_DECIMALS));
      setVaultAssetsBalance(formatBalance(assetsBal, MXNE_DECIMALS));
      setTvl(formatBalance(totalAssetsVal, MXNE_DECIMALS));

      await fetchMarketData();
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  }, [wallets, getProvider, fetchMarketData]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

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

  // ─── Helper: Wait for balance to increase (polling) ───────────────────────
  const waitForBalanceIncrease = async (
    tokenContract: ethers.Contract,
    userAddress: string,
    initialBalance: bigint,
  ): Promise<bigint> => {
    let retries = 0;
    while (retries < 20) {
      const currentBalance = await tokenContract.balanceOf(userAddress);
      if (currentBalance > initialBalance) return currentBalance;
      console.log(`Waiting for balance update... Attempt ${retries + 1}/20`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      retries++;
    }
    throw new Error(
      "RPC timeout: The network is slow indexing your new balance. Please wait a moment and try again.",
    );
  };

  // ─── SERVER-SIDE SIGNING ──────────────────────────────────────────────────

  const executeDeposit = async (amountMXNE: string) => {
    setLoading(true);
    setError(null);
    setStep(1);

    try {
      const userAddress = wallets[0]?.address;
      if (!walletId || !userAddress) {
        setError("Wallet not ready. Please try again in a moment.");
        setLoading(false);
        return;
      }

      const provider = getProvider();
      const vaultContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoMXNEVault,
        EXTENDED_VAULT_ABI,
        provider,
      );

      // Read initial shares balance for polling
      const initialShares = await vaultContract.balanceOf(userAddress);

      // Step 1+2: Approve + Deposit via backend
      setStep(2);
      const res = await fetch("/api/lend-mxne", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, userAddress, amount: amountMXNE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deposit failed");
      setTxHash(data.depositHash);
      console.log("Deposit done:", data);

      // Wait for shares balance to increase (polling)
      setStep(3);
      await waitForBalanceIncrease(vaultContract, userAddress, initialShares);

      setStep(4); // Success
      await refreshData();
      setLoading(false);
    } catch (err: any) {
      console.error("Deposit Error:", err);
      let msg = err.message ?? "Deposit failed";
      if (msg.includes("rejected")) msg = "You rejected the transaction";
      else msg = "The transaction failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  };

  const executeWithdraw = async (
    sharesAmount: string | bigint,
    withdrawAll: boolean = false,
  ) => {
    setLoading(true);
    setError(null);
    setStep(11);
    setWithdrawnAmount(null);
    setYieldEarned(null);

    try {
      const userAddress = wallets[0]?.address;
      if (!walletId || !userAddress) {
        setError("Wallet not ready. Please try again in a moment.");
        setLoading(false);
        return;
      }

      const provider = getProvider();
      const vaultContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoMXNEVault,
        EXTENDED_VAULT_ABI,
        provider,
      );

      let sharesToRedeem: bigint;
      if (withdrawAll) {
        sharesToRedeem = await vaultContract.balanceOf(userAddress);
      } else {
        sharesToRedeem =
          typeof sharesAmount === "string"
            ? ethers.parseUnits(sharesAmount, 6)
            : sharesAmount;
      }

      if (sharesToRedeem === 0n) throw new Error("No shares to withdraw.");

      // Preview redeem amount
      const expectedAssets = await vaultContract.previewRedeem(sharesToRedeem);
      setWithdrawnAmount(ethers.formatUnits(expectedAssets, MXNE_DECIMALS));

      console.log("Withdrawing shares:", sharesToRedeem.toString());

      const res = await fetch("/api/withdraw-mxne", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          musdcShares: sharesToRedeem.toString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdraw failed");
      setTxHash(data.redeemHash);
      console.log("Withdraw done:", data);

      setStep(12); // Success
      await refreshData();
      setLoading(false);
    } catch (err: any) {
      console.error("Withdraw Error:", err);
      let msg = err.message ?? "Withdraw failed";
      if (msg.includes("rejected")) msg = "You rejected the transaction";
      else msg = "The transaction failed. Please try again.";
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
    mxneBalance,
    vaultSharesBalance,
    vaultAssetsBalance,
    tvl,
    apy: (apy * 100).toFixed(2),
    withdrawnAmount,
    yieldEarned,
    executeDeposit,
    executeWithdraw,
    refreshData,
    resetState,
  };
};
