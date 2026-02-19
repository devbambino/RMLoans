// ============================================================================
// /api/unwrap/route.ts
// Unwrap WmUSDC -> mUSDC
// ============================================================================
import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";

const wmUsdcAbi = [
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

export async function POST(req: Request) {
  try {
    const { walletId, userAddress } = await req.json();
    if (!walletId || !userAddress)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const balance = await publicClient.readContract({
      address: WM_USDC,
      abi: wmUsdcAbi,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });

    if (balance === 0n)
      return NextResponse.json(
        { error: "No WmUSDC balance to unwrap" },
        { status: 400 },
      );

    const data = encodeFunctionData({
      abi: wmUsdcAbi,
      functionName: "redeem",
      args: [
        balance,
        userAddress as `0x${string}`,
        userAddress as `0x${string}`,
      ],
    });

    const tx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: { transaction: { to: WM_USDC, data, chain_id: 84532 } },
      });

    return NextResponse.json({ success: true, hash: tx.hash });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
