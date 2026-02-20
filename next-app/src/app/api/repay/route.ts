// /api/repay/route.ts
import { NextResponse } from "next/server";
import { encodeFunctionData, parseEther, getAddress } from "viem";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
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

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MOCK_MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";
const MARKET_ID =
  "0xf912f62db71d01c572b28b6953c525851f9e0660df4e422cec986e620da726df";

const MARKET_PARAMS = {
  loanToken: MOCK_MXNB as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: parseEther("0.77"),
};

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
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

const morphoAbi = [
  {
    name: "position",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
  {
    name: "repay",
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
      { name: "data", type: "bytes" },
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
    const { walletId, userAddress } = await req.json();

    if (!walletId || !userAddress)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    // 2. Limpiamos la dirección ANTES de usarla
    // .toLowerCase() asegura que getAddress no se queje por el checksum

    const cleanAddress = getAddress(userAddress.toLowerCase());

    if (!walletId)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const position = await publicClient.readContract({
      address: MORPHO_BLUE,
      abi: morphoAbi,
      functionName: "position",
      args: [MARKET_ID as `0x${string}`, cleanAddress as `0x${string}`],
    });

    const borrowShares = position[1];
    if (borrowShares === 0n)
      return NextResponse.json(
        { error: "No outstanding debt" },
        { status: 400 },
      );

    const mxnbBalance = await publicClient.readContract({
      address: MOCK_MXNB,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [cleanAddress as `0x${string}`],
    });

    if (mxnbBalance === 0n)
      return NextResponse.json({ error: "No MXNB to repay" }, { status: 400 });

    // 1. Approve MXNB for Morpho
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_BLUE as `0x${string}`, mxnbBalance],
    });

    const approveTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: { to: MOCK_MXNB, data: approveData, chain_id: 84532 },
        },
      });

    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2. Repay using borrowShares to close position completely
    const repayData = encodeFunctionData({
      abi: morphoAbi,
      functionName: "repay",
      args: [
        MARKET_PARAMS,
        0n,
        borrowShares,
        cleanAddress as `0x${string}`,
        "0x",
      ],
    });

    const repayTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: { to: MORPHO_BLUE, data: repayData, chain_id: 84532 },
        },
      });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      repayHash: repayTx.hash,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
