// /api/supply-collateral/route.ts
import { NextResponse } from "next/server";
import { encodeFunctionData, parseEther, getAddress } from "viem";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { PrivyClient } from "@privy-io/server-auth";

// ✅ Sintaxis correcta para @privy-io/server-auth
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_SIGNING_KEY!,
    },
  },
);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MOCK_MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";

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
    name: "supplyCollateral",
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
      { name: "amount", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const MARKET_PARAMS = {
  loanToken: MOCK_MXNB as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: parseEther("0.77"),
};

export async function POST(req: Request) {
  try {
    // 1. Extraer los datos (SOLO UNA VEZ)
    const { walletId, userAddress } = await req.json();

    if (!walletId || !userAddress)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    // 2. Limpiamos la dirección ANTES de usarla
    // .toLowerCase() asegura que getAddress no se queje por el checksum
    const cleanAddress = getAddress(userAddress.toLowerCase());
    console.log("--- SUPPLY COLLATERAL ---", { walletId, cleanAddress });

    // 3. Leemos el balance de WmUSDC del usuario

    const balance = await publicClient.readContract({
      address: WM_USDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [cleanAddress as `0x${string}`],
    });

    if (balance === 0n)
      return NextResponse.json({ error: "No WmUSDC balance" }, { status: 400 });

    // 1. Approve WmUSDC for Morpho
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_BLUE as `0x${string}`, balance],
    });

    // ✅ Nueva sintaxis para @privy-io/server-auth
    const approveTx = await privy.walletApi.ethereum.sendTransaction({
      walletId,
      caip2: "eip155:84532",
      transaction: {
        to: WM_USDC,
        data: approveData,
        chainId: 84532,
      },
    });

    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2. Supply collateral
    const collateralData = encodeFunctionData({
      abi: morphoAbi,
      functionName: "supplyCollateral",
      args: [MARKET_PARAMS, balance, cleanAddress as `0x${string}`, "0x"],
    });

    const collateralTx = await privy.walletApi.ethereum.sendTransaction({
      walletId,
      caip2: "eip155:84532",
      transaction: {
        to: MORPHO_BLUE,
        data: collateralData,
        chainId: 84532,
      },
    });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      collateralHash: collateralTx.hash,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
