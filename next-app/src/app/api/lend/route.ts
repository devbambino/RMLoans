import { NextResponse } from "next/server";
import { parseUnits, encodeFunctionData } from "viem";
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const MORPHO_VAULT_ADDRESS = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";

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
    const body = await req.json();
    const { amount, walletId, userAddress } = body;

    if (!amount || !walletId || !userAddress) {
      return NextResponse.json(
        { error: "Faltan datos: amount, walletId o userAddress" },
        { status: 400 },
      );
    }

    const parsedAmount = parseUnits(amount, 6);
    const dataEncoded = encodeFunctionData({
      abi: vaultAbi,
      functionName: "deposit",
      args: [parsedAmount, userAddress as `0x${string}`],
    });

    // ✅ Sintaxis correcta descubierta para @privy-io/node v0.9
    const tx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: {
            to: MORPHO_VAULT_ADDRESS,
            data: dataEncoded,
            value: "0x0",
            chain_id: 84532,
          },
        },
      });

    return NextResponse.json({
      success: true,
      hash: tx.hash,
    });
  } catch (error: any) {
    console.error("Detailed Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error en la transacción" },
      { status: 500 },
    );
  }
}
