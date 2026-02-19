// /api/withdraw-vault/route.ts
// Withdraw USDC from Morpho USDC Vault (redeem all mUSDC shares)
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

const MORPHO_USDC_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";

const vaultAbi = [
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
      address: MORPHO_USDC_VAULT,
      abi: vaultAbi,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    });

    if (balance === 0n)
      return NextResponse.json(
        { error: "No mUSDC balance to withdraw" },
        { status: 400 },
      );

    const data = encodeFunctionData({
      abi: vaultAbi,
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
        params: {
          transaction: { to: MORPHO_USDC_VAULT, data, chain_id: 84532 },
        },
      });

    return NextResponse.json({ success: true, hash: tx.hash });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
