"use client";
import { useState } from "react";

export default function StrategyDashboard() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    setLoading(true);

    const res = await fetch("/api/strategy/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const data = await res.json();
    console.log(data);

    setLoading(false);
  };

  return (
    <div className="p-6 rounded-xl bg-zinc-900 text-white max-w-md">
      <h2 className="text-xl font-bold mb-4">Earn with Morpho Strategy</h2>

      <input
        type="text"
        placeholder="USDC amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-2 rounded bg-zinc-800 mb-4"
      />

      <button
        onClick={handleDeposit}
        disabled={loading}
        className="w-full bg-blue-600 p-2 rounded hover:bg-blue-500"
      >
        {loading ? "Processing..." : "Deposit & Activate"}
      </button>
    </div>
  );
}
