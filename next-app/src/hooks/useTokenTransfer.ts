// src/hooks/useTokenTransfer.ts
import { useState } from "react";
import { ethers } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import { useWalletId } from "./useWalletId";

export const useTokenTransfer = () => {
  const { wallets } = useWallets();
  const { walletId } = useWalletId();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const execute = async (
    currency: "USDC" | "MXNE",
    amount: string,
    recipientAddress: string,
  ) => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error(
          "Invalid recipient address. Please check the address and try again.",
        );
      }

      const userAddress = wallets[0]?.address;
      if (!walletId || !userAddress) {
        throw new Error("Wallet not ready. Please try again in a moment.");
      }

      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          userAddress,
          currency,
          amount,
          recipientAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transfer failed");

      setTxHash(data.txHash);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Transfer Error:", err);
      let msg = err.message || "Transaction failed";
      if (msg.includes("rejected"))
        msg = "You rejected the transaction in your wallet.";
      else if (
        msg.includes("insufficient balance") ||
        msg.toLowerCase().includes("exceeds balance")
      )
        msg = "Insufficient balance for transfer.";
      else msg = "The transaction failed. Please try again.";
      setError(msg);
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setTxHash(null);
  };

  return { execute, isLoading, error, txHash, resetState };
};
