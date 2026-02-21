"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Phase = "idle" | "loading" | "success" | "error";

type Step = {
  label: string;
  done: boolean;
};

type Balances = {
  usdc: string;
  mxnb: string;
  collateral: string;
  debt: string;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const EXPLORER = "https://sepolia.basescan.org/tx/";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─────────────────────────────────────────────
// PROGRESS OVERLAY
// ─────────────────────────────────────────────
function ProgressOverlay({
  steps,
  currentStep,
  phase,
  hashes,
  onClose,
}: {
  steps: Step[];
  currentStep: number;
  phase: Phase;
  hashes: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0f1923] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        {/* Icon */}
        <div className="text-center mb-6">
          {phase === "loading" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border-2 border-[#00e5ff]/20 border-t-[#00e5ff] animate-spin" />
          )}
          {phase === "success" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-2xl text-[#00e5ff]">
              ✓
            </div>
          )}
          {phase === "error" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl text-red-400">
              ✕
            </div>
          )}
          <p className="text-white font-semibold text-lg">
            {phase === "loading" && "Processing..."}
            {phase === "success" && "All done!"}
            {phase === "error" && "Something went wrong"}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  s.done
                    ? "bg-[#00e5ff] text-black"
                    : i === currentStep && phase === "loading"
                      ? "border-2 border-[#00e5ff]/40 border-t-[#00e5ff] animate-spin"
                      : "border border-white/20 text-white/30"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  s.done
                    ? "text-[#00e5ff]"
                    : i === currentStep && phase === "loading"
                      ? "text-white"
                      : "text-white/30"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Transaction links */}
        {hashes.length > 0 && (
          <div className="space-y-1 mb-4">
            {hashes.map((h, i) => (
              <a
                key={i}
                href={EXPLORER + h}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#00e5ff]/60 hover:text-[#00e5ff] truncate transition-colors"
              >
                ↗ View on BaseScan
              </a>
            ))}
          </div>
        )}

        {(phase === "success" || phase === "error") && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function DefiDashboard() {
  // ✅ usePrivy comes from @privy-io/react-auth — correct
  const { ready, authenticated, login, logout, user, getAccessToken } =
    usePrivy();

  const [amount, setAmount] = useState("5");
  const [borrowAmount, setBorrowAmount] = useState("100");
  const [balances, setBalances] = useState<Balances>({
    usdc: "—",
    mxnb: "—",
    collateral: "—",
    debt: "—",
  });

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<Step[]>([]);
  const [overlayCurrentStep, setOverlayCurrentStep] = useState(0);
  const [overlayPhase, setOverlayPhase] = useState<Phase>("idle");
  const [overlayHashes, setOverlayHashes] = useState<string[]>([]);
  const [anyLoading, setAnyLoading] = useState(false);

  const walletId = user?.wallet?.id ?? "";
  const userAddress = user?.wallet?.address ?? "";

  // ── Fetch balances ──────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!userAddress) return;
    try {
      const res = await fetch("/api/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress }),
      });
      if (res.ok) {
        const data = await res.json();
        // Map from full balances response to simplified view
        setBalances({
          usdc: data.usdc ?? "—",
          mxnb: data.mxnb ?? "—",
          collateral: data.morphoCollateral ?? "—",
          debt: data.morphoBorrow ?? "—",
        });
      }
    } catch {
      // silent fail
    }
  }, [userAddress]);

  useEffect(() => {
    if (authenticated && userAddress) fetchBalances();
  }, [authenticated, userAddress, fetchBalances]);

  // ── Generic multi-step runner ───────────────
  // Each call is a fetch — steps run sequentially
  const runSteps = useCallback(
    async (labels: string[], calls: (() => Promise<Response>)[]) => {
      if (!walletId || !userAddress) return;

      setOverlaySteps(labels.map((l) => ({ label: l, done: false })));
      setOverlayCurrentStep(0);
      setOverlayPhase("loading");
      setOverlayHashes([]);
      setOverlayOpen(true);
      setAnyLoading(true);

      const hashes: string[] = [];

      try {
        for (let i = 0; i < calls.length; i++) {
          setOverlayCurrentStep(i);
          const res = await calls[i]();
          const data = await res.json();

          if (!res.ok || data.error) throw new Error(data.error || "Error");

          // Collect any tx hashes returned
          if (data.hash) hashes.push(data.hash);
          if (data.approveHash) hashes.push(data.approveHash);
          if (data.depositHash) hashes.push(data.depositHash);
          if (data.wrapHash) hashes.push(data.wrapHash);
          if (data.collateralHash) hashes.push(data.collateralHash);
          if (data.repayHash) hashes.push(data.repayHash);

          // Mark step as done
          setOverlaySteps((prev) =>
            prev.map((s, idx) => (idx <= i ? { ...s, done: true } : s)),
          );
        }

        setOverlayHashes(hashes);
        setOverlayPhase("success");
        setTimeout(fetchBalances, 2000);
      } catch {
        setOverlayPhase("error");
      } finally {
        setAnyLoading(false);
      }
    },
    [walletId, userAddress, fetchBalances],
  );

  // ── Helper to build fetch calls ─────────────

  const api = (path: string, body: object) => async () => {
    const userJwt = await getAccessToken();
    console.log("JWT generado:", userJwt ? "OK" : "NULL"); // ← agrega esto
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, walletId, userAddress, userJwt }),
    });
  };

  // ── ACTIONS ─────────────────────────────────

  // 1-click: deposit + wrap + supply collateral
  const activateStrategy = () =>
    runSteps(
      [
        "Depositing USDC to Morpho",
        "Wrapping to WmUSDC",
        "Activating collateral",
      ],
      [
        api("/api/lend", { amount }),
        api("/api/wrap", {}),
        api("/api/supply-collateral", {}),
      ],
    );

  // Borrow MXNB
  const borrowMxnb = () =>
    runSteps(
      ["Checking collateral ratio", "Borrowing MXNB to your wallet"],
      [api("/api/borrow", { amount: borrowAmount })],
    );

  // Close full position
  const closePosition = () =>
    runSteps(
      [
        "Repaying MXNB loan",
        "Releasing collateral",
        "Unwrapping WmUSDC",
        "Withdrawing USDC",
      ],
      [
        api("/api/repay", {}),
        api("/api/withdraw-collateral", {}),
        api("/api/unwrap", {}),
        api("/api/withdraw-vault", {}),
      ],
    );

  // ── Loading state ────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080f18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Login screen ─────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#080f18] flex flex-col items-center justify-center px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00e5ff]/6 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center text-4xl">
            💎
          </div>
          <h1
            className="text-4xl font-black text-white mb-2 tracking-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            MXNB Loans
          </h1>
          <p className="text-white/40 text-sm mb-10 leading-relaxed">
            Earn yield & borrow against your USDC
            <br />
            on Base Sepolia · Powered by Morpho
          </p>
          <button
            onClick={login}
            className="w-full py-4 rounded-2xl bg-[#00e5ff] text-black font-bold text-base hover:bg-[#00e5ff]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#00e5ff]/20"
          >
            Get Started
          </button>
          <p className="text-white/20 text-xs mt-4">
            Sign in with email · No wallet needed
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080f18] text-white">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-125 h-48 bg-[#00e5ff]/4 rounded-full blur-3xl pointer-events-none" />

      {overlayOpen && (
        <ProgressOverlay
          steps={overlaySteps}
          currentStep={overlayCurrentStep}
          phase={overlayPhase}
          hashes={overlayHashes}
          onClose={() => setOverlayOpen(false)}
        />
      )}

      <div className="relative z-10 max-w-md mx-auto px-4 py-10 space-y-6">
        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="text-xl font-black tracking-tight"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              MXNB Loans
            </h1>
            <p className="text-xs text-white/30 mt-0.5 font-mono">
              {userAddress ? shortAddr(userAddress) : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBalances}
              disabled={anyLoading}
              className="text-xs text-white/30 hover:text-white/60 border border-white/10 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-30"
            >
              ↺
            </button>
            <button
              onClick={logout}
              className="text-xs text-white/30 hover:text-white/60 border border-white/10 px-3 py-1.5 rounded-xl transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ── Balances ── */}
        <div className="bg-[#0f1923] rounded-3xl border border-white/8 p-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            Your balances
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "USDC", value: balances.usdc },
              { label: "MXNB", value: balances.mxnb },
              { label: "Collateral (WmUSDC)", value: balances.collateral },
              { label: "Debt (MXNB)", value: balances.debt },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/4 rounded-2xl px-4 py-3">
                <p className="text-white/40 text-xs mb-1">{label}</p>
                <p className="text-white font-mono font-semibold text-sm">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Activate Strategy ── */}
        <div className="bg-[#0f1923] rounded-3xl border border-[#00e5ff]/25 p-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
            Step 1
          </p>
          <h2 className="text-white font-bold text-lg mb-1">
            Activate Strategy
          </h2>
          <p className="text-white/30 text-xs mb-5">
            Deposit USDC → earn yield → prepare collateral. All in one click.
          </p>
          <label className="block text-xs text-white/40 mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={anyLoading}
            placeholder="0.00"
            className="w-full mb-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 disabled:opacity-40 transition-all"
          />
          <button
            onClick={activateStrategy}
            disabled={anyLoading}
            className="w-full py-3.5 rounded-2xl bg-[#00e5ff] text-black font-bold text-sm hover:bg-[#00e5ff]/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#00e5ff]/10"
          >
            Deposit & Activate →
          </button>
        </div>

        {/* ── Borrow ── */}
        <div className="bg-[#0f1923] rounded-3xl border border-white/8 p-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
            Step 2
          </p>
          <h2 className="text-white font-bold text-lg mb-1">Borrow MXNB</h2>
          <p className="text-white/30 text-xs mb-5">
            Borrow Mexican Peso stablecoin against your WmUSDC collateral at 77%
            LTV.
          </p>
          <label className="block text-xs text-white/40 mb-2">
            Amount (MXNB)
          </label>
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            disabled={anyLoading}
            placeholder="0.00"
            className="w-full mb-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 disabled:opacity-40 transition-all"
          />
          <button
            onClick={borrowMxnb}
            disabled={anyLoading}
            className="w-full py-3.5 rounded-2xl bg-white/8 border border-white/10 text-white font-bold text-sm hover:bg-white/15 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Borrow MXNB →
          </button>
        </div>

        {/* ── Close Position ── */}
        <div className="bg-[#0f1923] rounded-3xl border border-red-500/15 p-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
            Step 3
          </p>
          <h2 className="text-white font-bold text-lg mb-1">Close Position</h2>
          <p className="text-white/30 text-xs mb-5">
            Repay loan → release collateral → withdraw all USDC. One click.
          </p>
          <button
            onClick={closePosition}
            disabled={anyLoading}
            className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Close & Withdraw All
          </button>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-white/15 text-xs pb-4">
          Base Sepolia · Morpho Blue · Powered by Privy
        </p>
      </div>
    </div>
  );
}
