import { NextResponse } from "next/server";
import {
  parseUnits,
  encodeFunctionData,
  createPublicClient,
  getAddress,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { PrivyClient } from "@privy-io/node";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const USDC_ADDRESS = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f";
const MORPHO_VAULT_ADDRESS = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";

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

// Helper para construir el PEM correcto desde la env var
function buildPemKey(): string {
  const raw = process.env.PRIVY_SIGNING_KEY ?? "";
  // Si ya tiene headers PEM, extraer solo el body base64
  const body = raw
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();
  // Reconstruir con líneas de 64 chars (formato PEM estándar)
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

export async function POST(req: Request) {
  // Inicializar cliente dentro del handler
  const privy = new PrivyClient({
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!,
  });

  try {
    const { walletId, userAddress, amount, userJwt } = await req.json();
    console.log(
      "userJwt en backend:",
      userJwt ? userJwt.substring(0, 20) : "NULL",
    );

    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    if (!userJwt)
      return NextResponse.json({ error: "Falta userJwt" }, { status: 400 });

    const cleanAddress = getAddress(userAddress.toLowerCase());
    const pemKey = buildPemKey();

    console.log("--- LEND ---", { walletId, cleanAddress, amount });
    console.log("PEM preview:", pemKey.substring(0, 50));

    const parsedAmount = parseUnits(amount, 6);

    // 1️⃣ APPROVE
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_VAULT_ADDRESS as `0x${string}`, parsedAmount],
    });

    const approveTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: {
            to: USDC_ADDRESS,
            data: approveData,
            chain_id: 84532,
          },
        },
        authorization_context: {
          authorization_private_keys: [pemKey],
          user_jwts: [userJwt],
        },
      });

    console.log("Approve hash:", approveTx.hash);

    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2️⃣ DEPOSIT
    const depositData = encodeFunctionData({
      abi: vaultAbi,
      functionName: "deposit",
      args: [parsedAmount, cleanAddress as `0x${string}`],
    });

    const depositTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: {
            to: MORPHO_VAULT_ADDRESS,
            data: depositData,
            chain_id: 84532,
          },
        },
        authorization_context: {
          authorization_private_keys: [pemKey],
          user_jwts: [userJwt],
        },
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
      { error: error?.message || "Error en la transacción" },
      { status: 500 },
    );
  }
}
