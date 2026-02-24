// src/app/api/repay/route.ts
import { NextResponse } from "next/server";
import {
  encodeFunctionData,
  parseEther,
  createPublicClient,
  getAddress,
  http,
  maxUint256,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";
const LLTV = parseEther("0.77");

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

const morphoAbi = [
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

const MARKET = {
  loanToken: MXNB as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: LLTV,
};

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, borrowShares, borrowAssets } =
      await req.json();
    if (!walletId || !userAddress || !borrowShares)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const shares = BigInt(borrowShares);
    const assets = BigInt(borrowAssets ?? "0");
    console.log("--- REPAY ---", {
      walletId,
      addr,
      shares: shares.toString(),
      assets: assets.toString(),
    });

    // 1. Approve MXNB → Morpho Blue (max)
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_BLUE as `0x${string}`, maxUint256],
    });
    const approveTx = await privyRpc(walletId, "eip155:84532", {
      to: MXNB,
      data: approveData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });

    // Wait for allowance to propagate on Base Sepolia
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // 2. Repay using shares (assets=0 means use shares exactly)
    // Pass shares from position, assets=0
    const repayData = encodeFunctionData({
      abi: morphoAbi,
      functionName: "repay",
      args: [MARKET, assets, shares, addr, "0x"],
    });
    const repayTx = await privyRpc(walletId, "eip155:84532", {
      to: MORPHO_BLUE,
      data: repayData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: repayTx.hash as `0x${string}`,
    });

    return NextResponse.json({
      success: true,
      approveHash: approveTx.hash,
      repayHash: repayTx.hash,
    });
  } catch (e: any) {
    console.error("REPAY ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
