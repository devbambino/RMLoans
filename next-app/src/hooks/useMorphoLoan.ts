// src/hooks/useMorphoLoan.ts
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallets } from "@privy-io/react-auth";
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
} from "../constants/contracts";

const TARGET_LTV = 0.5;
const USDC_DECIMALS = 6;
const MXNB_DECIMALS = 6;

export const useMorphoLoan = () => {
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [mxnbBalance, setMxnbBalance] = useState<string>("0.00");
  const [collateralBalance, setCollateralBalance] = useState<string>("0.00");
  const [borrowBalance, setBorrowBalance] = useState<string>("0.00");
  const [marketLiquidity, setMarketLiquidity] = useState<string>("0");
  const [marketAPR, setMarketAPR] = useState<number>(0);
  const [totalRepaidAmount, setTotalRepaidAmount] = useState<string | null>(
    null,
  );
  const [oraclePrice, setOraclePrice] = useState<bigint>(0n);
  const [userPaidSubsidyInUSDC, setUserPaidSubsidyInUSDC] =
    useState<string>("0");
  const [userInterestInMxnb, setUserInterestInMxnb] = useState<string>("0");
  const [userInterestInUSDC, setUserInterestInUSDC] = useState<string>("0");

  const formatBalance = (val: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(val, decimals);
    const [integer, fraction] = formatted.split(".");
    if (!fraction) return integer;
    return `${integer}.${fraction.substring(0, 3)}`;
  };

  // Read-only provider (no signing needed)
  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
  }, []);

  const fetchMarketAPR = useCallback(async () => {
    try {
      const provider = getProvider();
      const morpho = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoBlue,
        MORPHO_ABI,
        provider,
      );
      const marketDetails = await morpho.market(MARKET_IDS.mxnb);
      const totalSupplyAssets = Number(
        ethers.formatUnits(marketDetails.totalSupplyAssets, MXNB_DECIMALS),
      );
      const totalBorrowAssets = Number(
        ethers.formatUnits(marketDetails.totalBorrowAssets, MXNB_DECIMALS),
      );

      const irmContract = new ethers.Contract(
        MXNB_MARKET_PARAMS.irm,
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
          MXNB_MARKET_PARAMS.loanToken,
          MXNB_MARKET_PARAMS.collateralToken,
          MXNB_MARKET_PARAMS.oracle,
          MXNB_MARKET_PARAMS.irm,
          MXNB_MARKET_PARAMS.lltv,
        ],
        marketTuple,
      );

      const borrowRateDecimal = Number(borrowRate) / 1e18;
      const secondsPerYear = 60 * 60 * 24 * 365;
      const borrowApr = Math.exp(borrowRateDecimal * secondsPerYear) - 1;
      setMarketAPR(borrowApr);
    } catch (err) {
      console.error("Error fetching market APR:", err);
    }
  }, [getProvider]);

  const refreshData = useCallback(async () => {
    try {
      if (!wallets.length) return;
      const userAddress = wallets[0]?.address;
      if (!userAddress) return;

      const provider = getProvider();

      const usdcContract = new ethers.Contract(
        CONTRACT_ADDRESSES.usdc,
        ERC20_ABI,
        provider,
      );
      const mxnbContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockMXNB,
        ERC20_ABI,
        provider,
      );
      const morpho = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoBlue,
        MORPHO_ABI,
        provider,
      );
      const wmUSDC = new ethers.Contract(
        CONTRACT_ADDRESSES.wmUSDC,
        WMEMORY_ABI,
        provider,
      );

      const [usdcBal, mxnbBal] = await Promise.all([
        usdcContract.balanceOf(userAddress),
        mxnbContract.balanceOf(userAddress),
      ]);

      setUsdcBalance(formatBalance(usdcBal, USDC_DECIMALS));
      setMxnbBalance(formatBalance(mxnbBal, MXNB_DECIMALS));

      const marketId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "address", "address", "uint256"],
          [
            MXNB_MARKET_PARAMS.loanToken,
            MXNB_MARKET_PARAMS.collateralToken,
            MXNB_MARKET_PARAMS.oracle,
            MXNB_MARKET_PARAMS.irm,
            MXNB_MARKET_PARAMS.lltv,
          ],
        ),
      );

      const [position, marketData] = await Promise.all([
        morpho.position(marketId, userAddress),
        morpho.market(marketId),
      ]);

      const totalSupplyAssets = BigInt(marketData[0]);
      const totalBorrowAssets = BigInt(marketData[2]);
      const liquidityAssets =
        totalSupplyAssets > totalBorrowAssets
          ? totalSupplyAssets - totalBorrowAssets
          : 0n;

      setBorrowBalance(formatBalance(position[1], 12));
      setCollateralBalance(formatBalance(position[2], 18));
      setMarketLiquidity(formatBalance(liquidityAssets, MXNB_DECIMALS));

      const oracle = new ethers.Contract(
        MXNB_MARKET_PARAMS.oracle,
        ["function price() external view returns (uint256)"],
        provider,
      );
      const price = await oracle.price();
      setOraclePrice(price);

      await fetchMarketAPR();
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  }, [wallets, getProvider, fetchMarketAPR]);

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

  const getSimulatedDeposit = (borrowAmountMXNB: string): string => {
    if (!borrowAmountMXNB || parseFloat(borrowAmountMXNB) <= 0) return "0";
    if (oraclePrice === 0n) {
      const amount = parseFloat(borrowAmountMXNB);
      const safePrice = 17;
      const requiredWmUSDC = amount / (TARGET_LTV * safePrice);
      return requiredWmUSDC.toFixed(2);
    }
    try {
      const borrowAssets = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
      const TARGET_LTV_WAD = ethers.parseEther(TARGET_LTV.toString());
      const numerator = borrowAssets * 10n ** 54n;
      const denominator = oraclePrice * TARGET_LTV_WAD;
      const requiredCollateralWmUSDC = numerator / denominator;
      const requiredUSDC = requiredCollateralWmUSDC / 10n ** 12n;
      return ethers.formatUnits(requiredUSDC, USDC_DECIMALS);
    } catch (e) {
      console.error("Error calculating deposit:", e);
      return "0";
    }
  };

  // ─── SERVER-SIDE SIGNING ──────────────────────────────────────────────────

  const executeZale = async (borrowAmountMXNB: string) => {
    setLoading(true);
    setError(null);
    setStep(1);

    try {
      const walletId = "xelbwy2mru3a8w0ye7zvkng6"; // TODO: fetch dynamically
      const userAddress = wallets[0]?.address;
      if (!walletId || !userAddress) throw new Error("Wallet not connected");

      // Calculate required USDC deposit
      const provider = getProvider();
      const oracle = new ethers.Contract(
        MXNB_MARKET_PARAMS.oracle,
        ["function price() external view returns (uint256)"],
        provider,
      );
      const currentPrice = await oracle.price();
      const borrowAmountBN = ethers.parseUnits(borrowAmountMXNB, MXNB_DECIMALS);
      const TARGET_LTV_WAD = ethers.parseEther("0.50");
      const numerator = borrowAmountBN * 10n ** 54n;
      const denominator = currentPrice * TARGET_LTV_WAD;
      const requiredCollateralWmUSDC = numerator / denominator;
      const exactRequiredUSDC = requiredCollateralWmUSDC / 10n ** 12n;
      const depositAmountUSDC = exactRequiredUSDC.toString();

      console.log(
        "Calculated USDC deposit:",
        ethers.formatUnits(exactRequiredUSDC, USDC_DECIMALS),
      );

      // Step 1: Lend USDC → mUSDC
      setStep(1);
      const lendRes = await fetch("/api/lend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          amount: ethers.formatUnits(exactRequiredUSDC, USDC_DECIMALS),
        }),
      });
      const lendData = await lendRes.json();
      if (!lendRes.ok) throw new Error(lendData.error ?? "Lend failed");
      setTxHash(lendData.depositHash);
      console.log("Lend done:", lendData);

      // Wait for balance to index on Base Sepolia
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Read mUSDC balance
      const mUSDCContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoUSDCVault,
        ERC20_ABI,
        provider,
      );
      const musdcBalance = await mUSDCContract.balanceOf(userAddress);
      console.log("mUSDC balance:", musdcBalance.toString());

      // Step 2: Wrap mUSDC → WmUSDC
      setStep(2);
      const wrapRes = await fetch("/api/wrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          musdcAmount: musdcBalance.toString(),
        }),
      });
      const wrapData = await wrapRes.json();
      if (!wrapRes.ok) throw new Error(wrapData.error ?? "Wrap failed");
      setTxHash(wrapData.wrapHash);
      console.log("Wrap done:", wrapData);

      // Wait for WmUSDC balance to index
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Read WmUSDC balance
      const wmUSDCContract = new ethers.Contract(
        CONTRACT_ADDRESSES.wmUSDC,
        ERC20_ABI,
        provider,
      );
      const wmusdcBalance = await wmUSDCContract.balanceOf(userAddress);
      console.log("WmUSDC balance:", wmusdcBalance.toString());

      // Step 3: Supply collateral
      setStep(3);
      const supplyRes = await fetch("/api/supply-collateral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          wmusdcAmount: wmusdcBalance.toString(),
        }),
      });
      const supplyData = await supplyRes.json();
      if (!supplyRes.ok)
        throw new Error(supplyData.error ?? "Supply collateral failed");
      setTxHash(supplyData.supplyHash);
      console.log("Supply collateral done:", supplyData);

      // Wait for collateral to index
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Step 4: Borrow MXNB
      setStep(4);
      const borrowRes = await fetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          borrowAmount: borrowAmountMXNB,
        }),
      });
      const borrowData = await borrowRes.json();
      if (!borrowRes.ok) throw new Error(borrowData.error ?? "Borrow failed");
      setTxHash(borrowData.borrowHash);
      console.log("Borrow done:", borrowData);

      setStep(8); // Success
      await refreshData();
      setLoading(false);
    } catch (err: any) {
      console.error("Zale Error:", err);
      let msg = err.message ?? "Transaction failed";
      if (msg.includes("rejected")) msg = "You rejected the transaction";
      else msg = "The transaction failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  };

  const executeRepayAndWithdraw = async () => {
    setLoading(true);
    setError(null);
    setTotalRepaidAmount(null);
    setStep(11);

    try {
      const walletId = "xelbwy2mru3a8w0ye7zvkng6"; // TODO: fetch dynamically
      const userAddress = wallets[0]?.address;
      if (!walletId || !userAddress) throw new Error("Wallet not connected");

      const provider = getProvider();
      const morpho = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoBlue,
        MORPHO_ABI,
        provider,
      );
      const wmUSDCContract = new ethers.Contract(
        CONTRACT_ADDRESSES.wmUSDC,
        WMEMORY_ABI,
        provider,
      );
      const mUSDCContract = new ethers.Contract(
        CONTRACT_ADDRESSES.morphoUSDCVault,
        ERC20_ABI,
        provider,
      );
      const mxnbContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockMXNB,
        ERC20_ABI,
        provider,
      );

      const marketId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "address", "address", "uint256"],
          [
            MXNB_MARKET_PARAMS.loanToken,
            MXNB_MARKET_PARAMS.collateralToken,
            MXNB_MARKET_PARAMS.oracle,
            MXNB_MARKET_PARAMS.irm,
            MXNB_MARKET_PARAMS.lltv,
          ],
        ),
      );

      const position = await morpho.position(marketId, userAddress);
      const borrowShares = position[1];
      const collateral = position[2];

      if (borrowShares <= 0n) throw new Error("No debt to repay.");

      const mxnbBal = await mxnbContract.balanceOf(userAddress);
      setTotalRepaidAmount(ethers.formatUnits(mxnbBal, MXNB_DECIMALS));

      // Step 1: Repay (using assets = mxnb balance)
      setStep(12);
      const repayAssets = mxnbBal.toString();
      const repayRes = await fetch("/api/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          borrowShares: "0",
          borrowAssets: repayAssets,
        }),
      });
      const repayData = await repayRes.json();
      if (!repayRes.ok) throw new Error(repayData.error ?? "Repay failed");
      setTxHash(repayData.repayHash);
      console.log("Repay done:", repayData);

      // Step 2: Withdraw collateral (leave small buffer for dust debt)
      setStep(13);
      const collateralToWithdraw = ((collateral * 95n) / 100n).toString(); // 95% to avoid dust issues
      const withdrawRes = await fetch("/api/withdraw-collateral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          collateralAmount: collateralToWithdraw,
        }),
      });
      const withdrawData = await withdrawRes.json();
      if (!withdrawRes.ok)
        throw new Error(withdrawData.error ?? "Withdraw collateral failed");
      setTxHash(withdrawData.withdrawHash);
      console.log("Withdraw collateral done:", withdrawData);

      // Step 3: Unwrap WmUSDC → mUSDC
      setStep(14);
      const wmusdcBal = await wmUSDCContract.balanceOf(userAddress);
      if (wmusdcBal > 0n) {
        const unwrapRes = await fetch("/api/unwrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId,
            userAddress,
            wmusdcAmount: wmusdcBal.toString(),
          }),
        });
        const unwrapData = await unwrapRes.json();
        if (!unwrapRes.ok) throw new Error(unwrapData.error ?? "Unwrap failed");
        setTxHash(unwrapData.unwrapHash);
        console.log("Unwrap done:", unwrapData);
      }

      // Step 4: Redeem mUSDC → USDC
      setStep(15);
      const musdcBal = await mUSDCContract.balanceOf(userAddress);
      if (musdcBal > 0n) {
        const redeemRes = await fetch("/api/withdraw-vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId,
            userAddress,
            musdcShares: musdcBal.toString(),
          }),
        });
        const redeemData = await redeemRes.json();
        if (!redeemRes.ok)
          throw new Error(redeemData.error ?? "Withdraw vault failed");
        setTxHash(redeemData.redeemHash);
        console.log("Redeem done:", redeemData);
      }

      setStep(16); // Success
      await refreshData();
      setLoading(false);
    } catch (err: any) {
      console.error("Repay Error:", err);
      let msg = err.message ?? "Repay transaction failed";
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
    setUserPaidSubsidyInUSDC("0");
    setUserInterestInMxnb("0");
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
    marketAPR: (marketAPR * 100).toFixed(2),
    totalRepaidAmount,
    userPaidSubsidyInUSDC,
    userInterestInMxnb,
    userInterestInUSDC,
    getSimulatedDeposit,
    executeZale,
    executeRepayAndWithdraw,
    refreshData,
    resetState,
  };
};
