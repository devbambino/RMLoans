"use client";

import React from "react";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
// Replace this with any of the networks listed at https://github.com/wevm/viem/blob/main/src/chains/index.ts
import { base, arbitrum, baseSepolia, arbitrumSepolia } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          /*solana: {
            createOnLogin: "users-without-wallets",
          },*/
        },
        appearance: { walletChainType: "ethereum-and-solana" },
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
        defaultChain: baseSepolia,
        // Replace this with a list of your desired supported chains
        supportedChains: [baseSepolia, arbitrumSepolia, base, arbitrum],
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
                  "https://api.mainnet-beta.solana.com",
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL?.replace(
                  "http",
                  "ws",
                ) || "wss://api.mainnet-beta.solana.com",
              ),
            },
            "solana:devnet": {
              rpc: createSolanaRpc("https://api.devnet.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                "wss://api.devnet.solana.com",
              ),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
