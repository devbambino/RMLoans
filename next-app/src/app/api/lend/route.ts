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

//PON esto (sintaxis de @privy-io/node)
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Cliente público para esperar confirmaciones
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

export async function POST(req: Request) {
  try {
    // 1. Extraer los datos (SOLO UNA VEZ)
    const { walletId, userAddress, amount, userJwt } = await req.json();

    console.log("JWT completo:", userJwt);
    console.log("JWT tipo:", typeof userJwt);
    console.log("JWT length:", userJwt?.length);
    console.log("----------------------------");
    console.log(
      "UserJWT sub:",
      JSON.parse(Buffer.from(userJwt.split(".")[1], "base64").toString()).sub,
    );
    console.log("WalletId enviado:", walletId);
    console.log("----------------------------");

    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    // 2. Limpiar la dirección inmediatamente
    // .toLowerCase() asegura que getAddress no se queje por el checksum

    const cleanAddress = getAddress(userAddress.toLowerCase());

    // LOGS DE CONTROL
    console.log("--- DEBUG PRIVY EN LEND ---");
    console.log("WalletID:", walletId);
    console.log("Clean Address:", cleanAddress);
    console.log("APP ID:", process.env.NEXT_PUBLIC_PRIVY_APP_ID);
    console.log("SECRET:", process.env.PRIVY_APP_SECRET);
    console.log("SIGNING KEY:", process.env.PRIVY_SIGNING_KEY);
    console.log("------------********------------");
    console.log(
      "KEY primeros 50 chars:",
      process.env.PRIVY_SIGNING_KEY?.substring(0, 50),
    );
    console.log("------------********----------------");

    const parsedAmount = parseUnits(amount, 6);

    // 1️⃣ APPROVE
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_VAULT_ADDRESS as `0x${string}`, parsedAmount],
    });

    const rawKey = process.env.PRIVY_SIGNING_KEY!.split("\\n").join("\n");
    const body64 = rawKey
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "")
      .trim()
      .match(/.{1,64}/g)!
      .join("\n");
    const pemKey = `-----BEGIN PRIVATE KEY-----\n${body64}\n-----END PRIVATE KEY-----`;
    console.log("KEY tiene saltos AFTER:", pemKey.includes("\n"));
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
          user_jwts: [userJwt], // ← ambos juntos
        },
      });
    // ✅ Esperar que el approve se mine antes de hacer el deposit
    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2️⃣ DEPOSIT
    const depositData = encodeFunctionData({
      abi: vaultAbi,
      functionName: "deposit",
      args: [parsedAmount, userAddress as `0x${string}`],
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
      });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      depositHash: depositTx.hash,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Error en la transacción" },
      { status: 500 },
    );
  }
}
