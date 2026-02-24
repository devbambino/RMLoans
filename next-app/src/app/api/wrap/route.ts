// src/app/api/wrap/route.ts
import { NextResponse } from "next/server";
import {
  encodeFunctionData,
  parseUnits,
  createPublicClient,
  getAddress,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const MORPHO_USDC_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";
const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";

const vaultAbi = [
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
] as const;

const wmUsdcAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, musdcAmount } = await req.json();
    if (!walletId || !userAddress || !musdcAmount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const amount = BigInt(musdcAmount); // raw bigint string from frontend
    console.log("--- WRAP ---", { walletId, addr, amount: amount.toString() });

    // 1. Approve mUSDC → WmUSDC
    const approveData = encodeFunctionData({
      abi: vaultAbi,
      functionName: "approve",
      args: [WM_USDC as `0x${string}`, amount],
    });
    const approveTx = await privyRpc(walletId, "eip155:84532", {
      to: MORPHO_USDC_VAULT,
      data: approveData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2. Wrap mUSDC → WmUSDC
    const wrapData = encodeFunctionData({
      abi: wmUsdcAbi,
      functionName: "deposit",
      args: [amount, addr],
    });
    const wrapTx = await privyRpc(walletId, "eip155:84532", {
      to: WM_USDC,
      data: wrapData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: wrapTx.hash as `0x${string}`,
    });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      wrapHash: wrapTx.hash,
    });
  } catch (e: any) {
    console.error("WRAP ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
