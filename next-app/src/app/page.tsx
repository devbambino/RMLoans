"use client";

import { usePrivy } from "@privy-io/react-auth";
import StrategyDashboard from "@/components/sections/strategy-dashboard";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) return null;

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={login}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl"
        >
          Login
        </button>
      </div>
    );
  }

  return <StrategyDashboard />;
}
