import { NextResponse } from "next/server";
import { encodeFunctionData, getAddress } from "viem";
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

const MORPHO_USDC_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";
const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";

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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const wmUsdcAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  try {
    // 1. Extraer los datos (SOLO UNA VEZ)
    const { walletId, userAddress } = await req.json();

    if (!walletId || !userAddress) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    // 2. Limpiamos la dirección ANTES de usarla
    // .toLowerCase() asegura que getAddress no se queje por el checksum
    const cleanAddress = getAddress(userAddress.toLowerCase());

    // Get mUSDC balance
    const balance = await publicClient.readContract({
      address: MORPHO_USDC_VAULT,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [cleanAddress as `0x${string}`],
    });

    if (balance === 0n) {
      return NextResponse.json(
        { error: "No mUSDC balance to wrap" },
        { status: 400 },
      );
    }

    // 1. Approve mUSDC for wmUSDC
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [WM_USDC as `0x${string}`, balance],
    });

    const approveTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: {
            to: MORPHO_USDC_VAULT,
            data: approveData,
            chain_id: 84532,
          },
        },
      });

    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // 2. Wrap mUSDC -> WmUSDC
    const wrapData = encodeFunctionData({
      abi: wmUsdcAbi,
      functionName: "deposit",
      args: [balance, cleanAddress as `0x${string}`],
    });

    const wrapTx = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: "eip155:84532",
        params: {
          transaction: { to: WM_USDC, data: wrapData, chain_id: 84532 },
        },
      });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      wrapHash: wrapTx.hash,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
