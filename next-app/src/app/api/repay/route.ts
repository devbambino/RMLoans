// src/app/api/repay/route.ts
import { NextResponse } from "next/server";
import {
  encodeFunctionData,
  parseEther,
  createPublicClient,
  getAddress,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MXNE = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";
const LLTV = parseEther("0.77");
const MARKET = {
  loanToken: MXNE as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: LLTV,
};

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

const wmUsdcAbi = [
  {
    name: "getInterestSubsidy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "userInterestSubsidyInWmUSDC",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, borrowShares } = await req.json();
    if (!walletId || !userAddress || !borrowShares)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const shares = BigInt(borrowShares);
    console.log("--- REPAY ---", { walletId, addr, shares: shares.toString() });

    // Step 0: Call getInterestSubsidy BEFORE repay — this is required for redeemWithInterestSubsidy to work
    // It sets userInterestSubsidyInWmUSDC[user] and userDepositedShares on chain
    const initialSubsidy = await publicClient.readContract({
      address: WM_USDC as `0x${string}`,
      abi: wmUsdcAbi,
      functionName: "userInterestSubsidyInWmUSDC",
      args: [addr],
    });
    console.log("Initial subsidy:", initialSubsidy.toString());

    const subsidyData = encodeFunctionData({
      abi: wmUsdcAbi,
      functionName: "getInterestSubsidy",
      args: [addr],
    });
    const subsidyTx = await privyRpc(walletId, "eip155:84532", {
      to: WM_USDC,
      data: subsidyData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: subsidyTx.hash as `0x${string}`,
    });
    console.log("getInterestSubsidy hash:", subsidyTx.hash);

    // Wait for subsidy to index on chain
    let retries = 0;
    while (retries < 10) {
      const currentSubsidy = await publicClient.readContract({
        address: WM_USDC as `0x${string}`,
        abi: wmUsdcAbi,
        functionName: "userInterestSubsidyInWmUSDC",
        args: [addr],
      });
      console.log(`Subsidy attempt ${retries + 1}:`, currentSubsidy.toString());
      if (currentSubsidy > initialSubsidy) break;
      await new Promise((r) => setTimeout(r, 2500));
      retries++;
    }

    // Step 1: Approve MXNE → Morpho Blue (maxUint256)
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [
        MORPHO_BLUE as `0x${string}`,
        BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        ),
      ],
    });
    const approveTx = await privyRpc(walletId, "eip155:84532", {
      to: MXNE,
      data: approveData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: approveTx.hash as `0x${string}`,
    });
    console.log("Repay approve hash:", approveTx.hash);

    await new Promise((r) => setTimeout(r, 3000));

    // Step 2: Repay with exact borrowShares (assets=0 closes position without dust)
    const repayData = encodeFunctionData({
      abi: morphoAbi,
      functionName: "repay",
      args: [MARKET, 0n, shares, addr, "0x"],
    });
    const repayTx = await privyRpc(walletId, "eip155:84532", {
      to: MORPHO_BLUE,
      data: repayData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: repayTx.hash as `0x${string}`,
    });
    console.log("Repay hash:", repayTx.hash);

    return NextResponse.json({
      success: true,
      repayHash: repayTx.hash,
      subsidyHash: subsidyTx.hash,
    });
  } catch (e: any) {
    console.error("REPAY ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
