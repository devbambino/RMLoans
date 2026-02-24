// src/app/api/unwrap/route.ts
import { NextResponse } from "next/server";
import { encodeFunctionData, createPublicClient, getAddress, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});
const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";

const wmUsdcAbi = [
  {
    name: "redeemWithInterestSubsidy",
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
    const { walletId, userAddress, wmusdcAmount } = await req.json();
    if (!walletId || !userAddress || !wmusdcAmount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const amount = BigInt(wmusdcAmount);
    console.log("--- UNWRAP ---", {
      walletId,
      addr,
      amount: amount.toString(),
    });

    const unwrapData = encodeFunctionData({
      abi: wmUsdcAbi,
      functionName: "redeemWithInterestSubsidy",
      args: [amount, addr, addr],
    });
    const unwrapTx = await privyRpc(walletId, "eip155:84532", {
      to: WM_USDC,
      data: unwrapData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: unwrapTx.hash as `0x${string}`,
    });

    return NextResponse.json({ success: true, unwrapHash: unwrapTx.hash });
  } catch (e: any) {
    console.error("UNWRAP ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
