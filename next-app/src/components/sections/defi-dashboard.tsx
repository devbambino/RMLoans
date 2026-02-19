"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Phase = "idle" | "loading" | "success" | "error";

type ActionStep = {
  label: string;
  done: boolean;
};

type Balances = {
  usdc: string;
  mUsdc: string;
  wmUsdc: string;
  mxnb: string;
  morphoCollateral: string;
  morphoBorrow: string;
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
  steps: ActionStep[];
  currentStep: number;
  phase: Phase;
  hashes: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1923] border border-white/10 rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl">
        <div className="text-center mb-6">
          {phase === "loading" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border-2 border-[#00e5ff]/20 border-t-[#00e5ff] animate-spin" />
          )}
          {phase === "success" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#00e5ff]/10 flex items-center justify-center text-2xl">
              ✓
            </div>
          )}
          {phase === "error" && (
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
              ✕
            </div>
          )}
          <p className="text-white font-semibold text-lg">
            {phase === "loading" && "Processing..."}
            {phase === "success" && "Done!"}
            {phase === "error" && "Something went wrong"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500 ${
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

        {hashes.length > 0 && (
          <div className="mb-4 space-y-1">
            {hashes.map((h, i) => (
              <a
                key={i}
                href={EXPLORER + h}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#00e5ff]/60 hover:text-[#00e5ff] truncate"
              >
                ↗ {h.slice(0, 20)}...
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
// ACTION CARD
// ─────────────────────────────────────────────
function ActionCard({
  emoji,
  title,
  description,
  inputLabel,
  inputValue,
  onInputChange,
  buttonLabel,
  onAction,
  disabled,
  highlight,
}: {
  emoji: string;
  title: string;
  description: string;
  inputLabel?: string;
  inputValue?: string;
  onInputChange?: (v: string) => void;
  buttonLabel: string;
  onAction: () => void;
  disabled: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-6 border transition-all duration-300 ${
        highlight
          ? "bg-[#00e5ff]/5 border-[#00e5ff]/30"
          : "bg-[#0f1923] border-white/8"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">{emoji}</span>
        <div>
          <h3 className="text-white font-semibold text-base">{title}</h3>
          <p className="text-white/40 text-xs mt-0.5">{description}</p>
        </div>
      </div>

      {inputLabel && onInputChange !== undefined && (
        <div className="mb-4">
          <label className="block text-xs text-white/40 mb-1">
            {inputLabel}
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={disabled}
            placeholder="0.00"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 disabled:opacity-40 transition-all"
          />
        </div>
      )}

      <button
        onClick={onAction}
        disabled={disabled}
        className={`w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
          highlight
            ? "bg-[#00e5ff] text-black hover:bg-[#00e5ff]/90 active:scale-[0.98]"
            : "bg-white/8 text-white border border-white/10 hover:bg-white/15 active:scale-[0.98]"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// BALANCE PILL
// ─────────────────────────────────────────────
function BalancePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-center">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="text-white font-mono font-semibold text-sm">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#080f18] flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00e5ff]/8 rounded-full blur-3xl pointer-events-none" />

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
          onClick={onLogin}
          className="w-full py-4 rounded-2xl bg-[#00e5ff] text-black font-bold text-base hover:bg-[#00e5ff]/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#00e5ff]/20"
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

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function DefiDashboard() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const [supplyAmount, setSupplyAmount] = useState("5");
  const [borrowAmount, setBorrowAmount] = useState("500");
  const [balances, setBalances] = useState<Balances>({
    usdc: "—",
    mUsdc: "—",
    wmUsdc: "—",
    mxnb: "—",
    morphoCollateral: "—",
    morphoBorrow: "—",
  });

  // Progress overlay state
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<ActionStep[]>([]);
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
      if (res.ok) setBalances(await res.json());
    } catch {}
  }, [userAddress]);

  useEffect(() => {
    if (authenticated && userAddress) fetchBalances();
  }, [authenticated, userAddress, fetchBalances]);

  // ── Generic 1-click runner ──────────────────
  const run = useCallback(
    async (
      steps: string[],
      apiPath: string,
      body: object,
      onHashes: (data: any) => string[],
    ) => {
      if (!walletId || !userAddress) return;

      const stepObjs: ActionStep[] = steps.map((l) => ({
        label: l,
        done: false,
      }));
      setOverlaySteps(stepObjs);
      setOverlayCurrentStep(0);
      setOverlayPhase("loading");
      setOverlayHashes([]);
      setOverlayOpen(true);
      setAnyLoading(true);

      // Animate steps sequentially while waiting
      let stepInterval: ReturnType<typeof setInterval> | null = null;
      let fakeStep = 0;
      if (steps.length > 1) {
        // Advance a fake step every 3s for UX
        stepInterval = setInterval(() => {
          fakeStep = Math.min(fakeStep + 1, steps.length - 1);
          setOverlayCurrentStep(fakeStep);
        }, 3000);
      }

      try {
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, walletId, userAddress }),
        });
        const data = await res.json();

        if (stepInterval) clearInterval(stepInterval);

        if (!res.ok || data.error) throw new Error(data.error || "Error");

        const hashes = onHashes(data);
        setOverlayHashes(hashes);
        setOverlaySteps(steps.map((l) => ({ label: l, done: true })));
        setOverlayCurrentStep(steps.length - 1);
        setOverlayPhase("success");
        setTimeout(fetchBalances, 2000);
      } catch (err: any) {
        if (stepInterval) clearInterval(stepInterval);
        setOverlayPhase("error");
        setOverlaySteps((prev) =>
          prev.map((s, i) => ({ ...s, done: i < fakeStep })),
        );
      } finally {
        setAnyLoading(false);
      }
    },
    [walletId, userAddress, fetchBalances],
  );

  // ── Actions ─────────────────────────────────
  const handleSupply = () =>
    run(
      [
        "Authorizing USDC",
        "Depositing to Morpho Vault",
        "Confirming yield position",
      ],
      "/api/lend",
      { amount: supplyAmount },
      (d) => [d.approveHash, d.depositHash].filter(Boolean),
    );

  const handleWithdraw = () =>
    run(
      ["Calculating your shares", "Withdrawing USDC"],
      "/api/withdraw-vault",
      {},
      (d) => [d.hash].filter(Boolean),
    );

  const handleWrap = () =>
    run(["Authorizing mUSDC", "Wrapping to WmUSDC"], "/api/wrap", {}, (d) =>
      [d.approveHash, d.wrapHash].filter(Boolean),
    );

  const handleUnwrap = () =>
    run(["Unwrapping WmUSDC to mUSDC"], "/api/unwrap", {}, (d) =>
      [d.hash].filter(Boolean),
    );

  const handleCollateral = () =>
    run(
      ["Authorizing WmUSDC", "Supplying collateral to Morpho Blue"],
      "/api/supply-collateral",
      {},
      (d) => [d.approveHash, d.collateralHash].filter(Boolean),
    );

  const handleWithdrawCollateral = () =>
    run(
      ["Releasing collateral from Morpho Blue"],
      "/api/withdraw-collateral",
      {},
      (d) => [d.hash].filter(Boolean),
    );

  const handleBorrow = () =>
    run(
      ["Checking collateral ratio", "Borrowing MXNB to your wallet"],
      "/api/borrow",
      { amount: borrowAmount },
      (d) => [d.hash].filter(Boolean),
    );

  const handleRepay = () =>
    run(
      ["Authorizing MXNB", "Repaying your loan", "Clearing debt position"],
      "/api/repay",
      {},
      (d) => [d.approveHash, d.repayHash].filter(Boolean),
    );

  // ── Loading / not ready ──────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080f18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={login} />;
  }

  // ── Dashboard ────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080f18] text-white">
      {/* Ambient glow top */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-150 h-64 bg-[#00e5ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Progress overlay */}
      {overlayOpen && (
        <ProgressOverlay
          steps={overlaySteps}
          currentStep={overlayCurrentStep}
          phase={overlayPhase}
          hashes={overlayHashes}
          onClose={() => setOverlayOpen(false)}
        />
      )}

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <span
              className="text-lg font-black tracking-tight"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              MXNB Loans
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 font-mono">
              {userAddress ? shortAddr(userAddress) : ""}
            </span>
            <button
              onClick={logout}
              className="text-xs text-white/30 hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5 rounded-xl"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ── Balance Bar ── */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <BalancePill label="USDC" value={balances.usdc} />
          <BalancePill label="mUSDC" value={balances.mUsdc} />
          <BalancePill label="WmUSDC" value={balances.wmUsdc} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-8">
          <BalancePill label="MXNB" value={balances.mxnb} />
          <BalancePill label="Collateral" value={balances.morphoCollateral} />
          <BalancePill label="Debt" value={balances.morphoBorrow} />
        </div>

        {/* ── Section: Earn ── */}
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 ml-1">
          Step 1 · Earn Yield
        </p>
        <div className="grid grid-cols-1 gap-3 mb-6">
          <ActionCard
            emoji="🏦"
            title="Supply USDC"
            description="Deposit USDC into Morpho Vault and start earning yield"
            inputLabel="Amount (USDC)"
            inputValue={supplyAmount}
            onInputChange={setSupplyAmount}
            buttonLabel="Supply & Earn →"
            onAction={handleSupply}
            disabled={anyLoading}
            highlight
          />
          <ActionCard
            emoji="↩️"
            title="Withdraw USDC"
            description="Redeem your mUSDC shares back to USDC"
            buttonLabel="Withdraw All"
            onAction={handleWithdraw}
            disabled={anyLoading}
          />
        </div>

        {/* ── Section: Wrap ── */}
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 ml-1">
          Step 2 · Prepare Collateral
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <ActionCard
            emoji="📦"
            title="Wrap mUSDC"
            description="Convert mUSDC → WmUSDC to use as collateral"
            buttonLabel="Wrap →"
            onAction={handleWrap}
            disabled={anyLoading}
            highlight
          />
          <ActionCard
            emoji="📤"
            title="Unwrap"
            description="Convert WmUSDC back to mUSDC"
            buttonLabel="Unwrap"
            onAction={handleUnwrap}
            disabled={anyLoading}
          />
        </div>

        {/* ── Section: Borrow ── */}
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 ml-1">
          Step 3 · Borrow MXNB
        </p>
        <div className="grid grid-cols-1 gap-3 mb-6">
          <ActionCard
            emoji="💎"
            title="Supply Collateral"
            description="Lock WmUSDC as collateral in Morpho Blue"
            buttonLabel="Supply Collateral →"
            onAction={handleCollateral}
            disabled={anyLoading}
            highlight
          />
          <ActionCard
            emoji="💰"
            title="Borrow MXNB"
            description="Borrow MXNB against your WmUSDC collateral (77% LTV)"
            inputLabel="Amount (MXNB)"
            inputValue={borrowAmount}
            onInputChange={setBorrowAmount}
            buttonLabel="Borrow MXNB →"
            onAction={handleBorrow}
            disabled={anyLoading}
            highlight
          />
        </div>

        {/* ── Section: Repay ── */}
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 ml-1">
          Step 4 · Close Position
        </p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <ActionCard
            emoji="✅"
            title="Repay Loan"
            description="Repay your MXNB debt in full"
            buttonLabel="Repay All"
            onAction={handleRepay}
            disabled={anyLoading}
            highlight
          />
          <ActionCard
            emoji="🔓"
            title="Free Collateral"
            description="Withdraw WmUSDC collateral after repaying"
            buttonLabel="Withdraw"
            onAction={handleWithdrawCollateral}
            disabled={anyLoading}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-between items-center">
          <span className="text-white/20 text-xs">
            Base Sepolia · Morpho Blue
          </span>
          <button
            onClick={fetchBalances}
            disabled={anyLoading}
            className="text-xs text-white/30 hover:text-[#00e5ff] transition-colors disabled:opacity-30"
          >
            ↺ Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
