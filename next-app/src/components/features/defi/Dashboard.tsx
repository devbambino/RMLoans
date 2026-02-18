"use client";

export default function Dashboard() {
  return (
    <div className="p-10 space-y-10">
      <h1 className="text-3xl font-bold">Workflow Progress</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow">
          <h2 className="text-xl font-semibold">Morpho USDC Vault</h2>

          <input
            placeholder="Amount to Supply (USDC)"
            className="border p-2 rounded w-full mt-4"
          />

          <button className="mt-4 w-full bg-purple-600 text-white py-2 rounded">
            Supply to Morpho
          </button>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow">
          <h2 className="text-xl font-semibold">WmUSDC Wrapper</h2>

          <button className="mt-4 w-full bg-purple-600 text-white py-2 rounded">
            Wrap mUSDC
          </button>
        </div>
      </div>
    </div>
  );
}
