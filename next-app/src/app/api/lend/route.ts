// src/app/api/lend/route.ts
import { NextResponse } from "next/server";
import {
  parseUnits,
  encodeFunctionData,
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

const USDC_ADDRESS = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f";
const MORPHO_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";

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
    outputs: [],
  },
] as const;

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, amount } = await req.json();
    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const cleanAddress = getAddress(userAddress.toLowerCase());
    const parsedAmount = parseUnits(amount, 6);
    console.log("--- LEND ---", { walletId, cleanAddress, amount });

    // 1️⃣ APPROVE
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_VAULT as `0x${string}`, parsedAmount],
    });

    const approveTx = await privyRpc(walletId, "eip155:84532", {
      to: USDC_ADDRESS,
      data: approveData,
      chain_id: 84532,
    });
    console.log("Approve hash:", approveTx.hash);

    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2️⃣ DEPOSIT
    const depositData = encodeFunctionData({
      abi: vaultAbi,
      functionName: "deposit",
      args: [parsedAmount, cleanAddress],
    });

    const depositTx = await privyRpc(walletId, "eip155:84532", {
      to: MORPHO_VAULT,
      data: depositData,
      chain_id: 84532,
    });
    console.log("Deposit hash:", depositTx.hash);

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      depositHash: depositTx.hash,
    });
  } catch (error: any) {
    console.error("LEND ERROR:", error);
    return NextResponse.json(
      { error: error?.message ?? "Error" },
      { status: 500 },
    );
  }
}
