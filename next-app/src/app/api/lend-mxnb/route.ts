// src/app/api/lend-mxnb/route.ts
import { NextResponse } from "next/server";
import {
  encodeFunctionData,
  parseUnits,
  createPublicClient,
  getAddress,
  http,
  maxUint256,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const MXNB_VAULT = "0x3F8FAB03021738f227e3Ad76da51f57522540d30";

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
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, amount } = await req.json();
    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const depositAmount = parseUnits(amount, 6);
    console.log("--- LEND MXNB ---", { walletId, addr, amount });

    // 1. Approve MXNB → Vault
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MXNB_VAULT as `0x${string}`, maxUint256],
    });
    const approveTx = await privyRpc(walletId, "eip155:84532", {
      to: MXNB,
      data: approveData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });
    console.log("Approve hash:", approveTx.hash);

    // Wait for allowance to propagate
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. Deposit MXNB → Vault
    const depositData = encodeFunctionData({
      abi: vaultAbi,
      functionName: "deposit",
      args: [depositAmount, addr],
    });
    const depositTx = await privyRpc(walletId, "eip155:84532", {
      to: MXNB_VAULT,
      data: depositData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: depositTx.hash as `0x${string}`,
    });
    console.log("Deposit hash:", depositTx.hash);

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      depositHash: depositTx.hash,
    });
  } catch (e: any) {
    console.error("LEND MXNB ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
