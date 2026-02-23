"use client";

import { usePrivy } from "@privy-io/react-auth";
import DefiDashboard from "@/components/defi-dashboard";

export default function Home() {
  const { ready } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080f18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
      </div>
    );
  }

  return <DefiDashboard />;
}
