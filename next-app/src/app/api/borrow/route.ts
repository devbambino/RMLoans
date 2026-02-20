// /api/borrow/route.ts
import { NextResponse } from "next/server";
import { encodeFunctionData, parseUnits, parseEther, getAddress } from "viem";
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
  // En las versiones más nuevas, para llaves 'wallet-auth', se usa esta propiedad:
  walletApi: {
    authorizationPrivateKey: process.env.PRIVY_SIGNING_KEY!,
    authorizationKeyId: process.env.PRIVY_SIGNING_KEY_ID!,
  },
} as any);

const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MOCK_MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";

const MARKET_PARAMS = {
  loanToken: MOCK_MXNB as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: parseEther("0.77"),
};

const morphoAbi = [
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
] as const;

export async function POST(req: Request) {
  try {
    // 1. Extraer los datos (SOLO UNA VEZ)
    const { walletId, userAddress, amount } = await req.json();

    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    // 2. Limpiamos la dirección ANTES de usarla
    // .toLowerCase() asegura que getAddress no se queje por el checksum
    const cleanAddress = getAddress(userAddress.toLowerCase());

    // LOGS DE CONTROL
    console.log("--- DEBUG PRIVY EN BORROW ---");
    console.log("WalletID:", walletId);
    console.log("Clean Address:", cleanAddress);
    console.log("----------------------------");
    console.log("APP ID:", process.env.NEXT_PUBLIC_PRIVY_APP_ID);
    console.log("SECRET:", process.env.PRIVY_APP_SECRET);
    console.log("SIGNING KEY:", process.env.PRIVY_SIGNING_KEY);
    console.log("SIGNING KEY ID:", process.env.PRIVY_SIGNING_KEY_ID);

    const parsedAmount = parseUnits(amount, 6);

    // 3. USAR cleanAddress aquí (Esto quita el error de "nunca usado")
    const data = encodeFunctionData({
      abi: morphoAbi,
      functionName: "borrow",
      args: [
        MARKET_PARAMS,
        parsedAmount,
        0n,
        cleanAddress as `0x${string}`, // Cambiado
        cleanAddress as `0x${string}`, // Cambiado
      ],
    });

    const tx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: { transaction: { to: MORPHO_BLUE, data, chain_id: 84532 } },
      });

    return NextResponse.json({ success: true, hash: tx.hash });
  } catch (error: any) {
    console.error("Error en la API:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 },
    );
  }
}
