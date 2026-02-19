"use client";

import { usePrivy } from "@privy-io/react-auth";
import DefiDashboard from "@/components/sections/defi-dashboard";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) return null;

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            💎 MXNB DeFi Loans
          </h1>
          <p className="text-gray-400 mb-8 text-sm">
            Morpho Vaults · Base Sepolia
          </p>
          <button
            onClick={login}
            className="px-8 py-3 bg-[#00ff9d]/10 border border-[#00ff9d]/40 text-[#00ff9d] rounded-xl font-mono font-bold hover:bg-[#00ff9d]/20 transition-all"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return <DefiDashboard />;
}
