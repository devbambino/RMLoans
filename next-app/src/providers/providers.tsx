"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          showWalletUIs: false,
        },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
        loginMethods: ["email"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
