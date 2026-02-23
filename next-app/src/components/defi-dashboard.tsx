"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  parseUnits,
  formatUnits,
  parseEther,
  getAddress,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";

// ─── Contract Addresses ───────────────────────────────────────────────────────
const USDC_ADDRESS = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f" as const;
const MXNB_ADDRESS = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E" as const;
const MORPHO_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9" as const;
const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B" as const;
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const;
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4" as const;
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687" as const;
const EXPLORER = "https://sepolia.basescan.org/tx/";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const vaultAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const wmUsdcAbi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "wrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unwrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

const morphoAbi = [
  {
    name: "supplyCollateral",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "withdrawCollateral",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "borrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
  },
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
  },
  {
    name: "position",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint128" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
] as const;

const MARKET_PARAMS = {
  loanToken: MXNB_ADDRESS,
  collateralToken: WM_USDC,
  oracle: ORACLE,
  irm: IRM,
  lltv: parseEther("0.77"),
};

const MARKET_ID =
  "0xf912f62db71d01c572b28b6953c525851f9e0660df4e422cec986e620da726df" as `0x${string}`;

// Public client outside component — stable reference, no re-renders
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "loading" | "success" | "error";
type Step = { label: string; done: boolean };
type Balances = {
  usdc: string;
  mxnb: string;
  mUsdc: string;
  wmUsdc: string;
  collateral: string;
  debt: string;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Progress Overlay ─────────────────────────────────────────────────────────
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
        <div className="space-y-3 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all ${s.done ? "bg-[#00e5ff] text-black" : i === currentStep && phase === "loading" ? "border-2 border-[#00e5ff]/40 border-t-[#00e5ff] animate-spin" : "border border-white/20 text-white/30"}`}
              >
                {s.done ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm transition-colors ${s.done ? "text-[#00e5ff]" : i === currentStep && phase === "loading" ? "text-white" : "text-white/30"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {hashes.length > 0 && (
          <div className="space-y-1 mb-4">
            {hashes.map((h, i) => (
              <a
                key={i}
                href={EXPLORER + h}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#00e5ff]/60 hover:text-[#00e5ff] truncate"
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DefiDashboard() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const [amount, setAmount] = useState("5");
  const [borrowAmount, setBorrowAmount] = useState("100");
  const [balances, setBalances] = useState<Balances>({
    usdc: "—",
    mxnb: "—",
    mUsdc: "—",
    wmUsdc: "—",
    collateral: "—",
    debt: "—",
  });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<Step[]>([]);
  const [overlayCurrentStep, setOverlayCurrentStep] = useState(0);
  const [overlayPhase, setOverlayPhase] = useState<Phase>("idle");
  const [overlayHashes, setOverlayHashes] = useState<string[]>([]);
  const [anyLoading, setAnyLoading] = useState(false);

  const userAddress = user?.wallet?.address ?? "";

  // ── Get wallet client from Privy embedded wallet ─────────────────────────
  const getWalletClient = useCallback(async () => {
    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) throw new Error("No embedded wallet found");
    const provider = await embeddedWallet.getEthereumProvider();
    return createWalletClient({
      chain: baseSepolia,
      transport: custom(provider),
    });
  }, [wallets]);

  // ── Fetch balances ───────────────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!userAddress) return;
    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    try {
      const [usdc, mxnb, mUsdc, wmUsdc, position] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [addr],
        }),
        publicClient.readContract({
          address: MXNB_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [addr],
        }),
        publicClient.readContract({
          address: MORPHO_VAULT,
          abi: vaultAbi,
          functionName: "balanceOf",
          args: [addr],
        }),
        publicClient.readContract({
          address: WM_USDC,
          abi: wmUsdcAbi,
          functionName: "balanceOf",
          args: [addr],
        }),
        publicClient.readContract({
          address: MORPHO_BLUE,
          abi: morphoAbi,
          functionName: "position",
          args: [MARKET_ID, addr],
        }),
      ]);
      setBalances({
        usdc: formatUnits(usdc as bigint, 6),
        mxnb: formatUnits(mxnb as bigint, 6),
        mUsdc: formatUnits(mUsdc as bigint, 6),
        wmUsdc: formatUnits(wmUsdc as bigint, 6),
        collateral: formatUnits((position as any)[2] as bigint, 6),
        debt: formatUnits((position as any)[1] as bigint, 6),
      });
    } catch (e) {
      console.error("Balance fetch error:", e);
    }
  }, [userAddress]);

  useEffect(() => {
    if (authenticated && userAddress) fetchBalances();
  }, [authenticated, userAddress, fetchBalances]);

  // ── Generic tx runner ────────────────────────────────────────────────────
  const runTxs = useCallback(
    async (labels: string[], txBuilders: (() => Promise<`0x${string}`>)[]) => {
      setOverlaySteps(labels.map((l) => ({ label: l, done: false })));
      setOverlayCurrentStep(0);
      setOverlayPhase("loading");
      setOverlayHashes([]);
      setOverlayOpen(true);
      setAnyLoading(true);
      const hashes: string[] = [];
      try {
        for (let i = 0; i < txBuilders.length; i++) {
          setOverlayCurrentStep(i);
          console.log(`🔄 Ejecutando paso ${i + 1}: ${labels[i]}`);
          const hash = await txBuilders[i]();
          console.log(`✅ Hash obtenido paso ${i + 1}:`, hash);
          hashes.push(hash);
          console.log(`⏳ Esperando confirmación de:`, hash);
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`✔️ Confirmado paso ${i + 1}`);
          setOverlaySteps((prev) =>
            prev.map((s, idx) => (idx <= i ? { ...s, done: true } : s)),
          );
        }
        setOverlayHashes(hashes);
        setOverlayPhase("success");
        setTimeout(fetchBalances, 1500);
      } catch (e: any) {
        console.error(e);
        setOverlayPhase("error");
      } finally {
        setAnyLoading(false);
      }
    },
    [fetchBalances],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const activateStrategy = async () => {
    const wc = await getWalletClient();
    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const parsed = parseUnits(amount, 6);

    await runTxs(
      [
        "Approving USDC",
        "Depositing to Morpho Vault",
        "Approving mUSDC",
        "Wrapping to WmUSDC",
        "Approving WmUSDC",
        "Supplying collateral",
      ],
      [
        // 1. Approve USDC → Vault
        async () =>
          wc.writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [MORPHO_VAULT, parsed],
            account: addr,
          }),
        // 2. Deposit USDC → Vault (get mUSDC)
        async () =>
          wc.writeContract({
            address: MORPHO_VAULT,
            abi: vaultAbi,
            functionName: "deposit",
            args: [parsed, addr],
            account: addr,
          }),
        // 3. Approve mUSDC → WmUSDC contract
        async () =>
          wc.writeContract({
            address: MORPHO_VAULT,
            abi: erc20Abi,
            functionName: "approve",
            args: [WM_USDC, parsed],
            account: addr,
          }),
        // 4. Wrap mUSDC → WmUSDC
        async () =>
          wc.writeContract({
            address: WM_USDC,
            abi: wmUsdcAbi,
            functionName: "wrap",
            args: [parsed],
            account: addr,
          }),
        // 5. Approve WmUSDC → Morpho Blue
        async () =>
          wc.writeContract({
            address: WM_USDC,
            abi: wmUsdcAbi,
            functionName: "approve",
            args: [MORPHO_BLUE, parsed],
            account: addr,
          }),
        // 6. Supply WmUSDC as collateral
        async () =>
          wc.writeContract({
            address: MORPHO_BLUE,
            abi: morphoAbi,
            functionName: "supplyCollateral",
            args: [MARKET_PARAMS, parsed, addr, "0x"],
            account: addr,
          }),
      ],
    );
  };

  const borrowMxnb = async () => {
    const wc = await getWalletClient();
    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const parsed = parseUnits(borrowAmount, 6);

    await runTxs(
      ["Borrowing MXNB"],
      [
        async () =>
          wc.writeContract({
            address: MORPHO_BLUE,
            abi: morphoAbi,
            functionName: "borrow",
            args: [MARKET_PARAMS, parsed, BigInt(0), addr, addr],
            account: addr,
          }),
      ],
    );
  };

  const closePosition = async () => {
    const wc = await getWalletClient();
    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;

    // Read current debt shares
    const position = await publicClient.readContract({
      address: MORPHO_BLUE,
      abi: morphoAbi,
      functionName: "position",
      args: [MARKET_ID, addr],
    });
    const borrowShares = (position as any)[1] as bigint;
    const collateral = (position as any)[2] as bigint;
    const mUsdcShares = await publicClient.readContract({
      address: MORPHO_VAULT,
      abi: vaultAbi,
      functionName: "balanceOf",
      args: [addr],
    });

    await runTxs(
      [
        "Approving MXNB",
        "Repaying loan",
        "Withdrawing collateral",
        "Unwrapping WmUSDC",
        "Withdrawing USDC",
      ],
      [
        // 1. Approve MXNB → Morpho Blue (max)
        async () =>
          wc.writeContract({
            address: MXNB_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [
              MORPHO_BLUE,
              BigInt(
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
              ),
            ],
            account: addr,
          }),
        // 2. Repay using borrowShares to close fully
        async () =>
          wc.writeContract({
            address: MORPHO_BLUE,
            abi: morphoAbi,
            functionName: "repay",
            args: [MARKET_PARAMS, BigInt(0), borrowShares, addr, "0x"],
            account: addr,
          }),
        // 3. Withdraw all collateral
        async () =>
          wc.writeContract({
            address: MORPHO_BLUE,
            abi: morphoAbi,
            functionName: "withdrawCollateral",
            args: [MARKET_PARAMS, collateral, addr, addr],
            account: addr,
          }),
        // 4. Unwrap WmUSDC → mUSDC
        async () =>
          wc.writeContract({
            address: WM_USDC,
            abi: wmUsdcAbi,
            functionName: "unwrap",
            args: [collateral],
            account: addr,
          }),
        // 5. Redeem mUSDC shares → USDC
        async () =>
          wc.writeContract({
            address: MORPHO_VAULT,
            abi: vaultAbi,
            functionName: "redeem",
            args: [mUsdcShares as bigint, addr, addr],
            account: addr,
          }),
      ],
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!ready)
    return (
      <div className="min-h-screen bg-[#080f18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
      </div>
    );

  if (!authenticated)
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
        {/* Header */}
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

        {/* Balances */}
        <div className="bg-[#0f1923] rounded-3xl border border-white/8 p-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            Your balances
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "USDC", value: balances.usdc },
              { label: "MXNB", value: balances.mxnb },
              { label: "mUSDC (Vault)", value: balances.mUsdc },
              { label: "WmUSDC", value: balances.wmUsdc },
              { label: "Collateral", value: balances.collateral },
              { label: "Debt (shares)", value: balances.debt },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/4 rounded-2xl px-4 py-3">
                <p className="text-white/40 text-xs mb-1">{label}</p>
                <p className="text-white font-mono font-semibold text-sm truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Activate Strategy */}
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

        {/* Step 2 — Borrow */}
        <div className="bg-[#0f1923] rounded-3xl border border-white/8 p-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
            Step 2
          </p>
          <h2 className="text-white font-bold text-lg mb-1">Borrow MXNB</h2>
          <p className="text-white/30 text-xs mb-5">
            Borrow Mexican Peso stablecoin against your WmUSDC at 77% LTV.
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

        {/* Step 3 — Close */}
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

        <p className="text-center text-white/15 text-xs pb-4">
          Base Sepolia · Morpho Blue · Powered by Privy
        </p>
      </div>
    </div>
  );
}
