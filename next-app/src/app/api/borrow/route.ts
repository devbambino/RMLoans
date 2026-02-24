// src/app/api/borrow/route.ts
import { NextResponse } from "next/server";
import {
  encodeFunctionData,
  parseUnits,
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

const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const ORACLE = "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4";
const IRM = "0x46415998764C29aB2a25CbeA6254146D50D22687";
const LLTV = parseEther("0.77");

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

const MARKET = {
  loanToken: MXNB as `0x${string}`,
  collateralToken: WM_USDC as `0x${string}`,
  oracle: ORACLE as `0x${string}`,
  irm: IRM as `0x${string}`,
  lltv: LLTV,
};

export async function POST(req: Request) {
  try {
    const { walletId, userAddress, borrowAmount } = await req.json();
    if (!walletId || !userAddress || !borrowAmount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;
    const amount = parseUnits(borrowAmount, 6);
    console.log("--- BORROW ---", { walletId, addr, borrowAmount });

    const borrowData = encodeFunctionData({
      abi: morphoAbi,
      functionName: "borrow",
      args: [MARKET, amount, BigInt(0), addr, addr],
    });
    const borrowTx = await privyRpc(walletId, "eip155:84532", {
      to: MORPHO_BLUE,
      data: borrowData,
      chain_id: 84532,
    });
    await publicClient.waitForTransactionReceipt({
      hash: borrowTx.hash as `0x${string}`,
    });

    return NextResponse.json({ success: true, borrowHash: borrowTx.hash });
  } catch (e: any) {
    console.error("BORROW ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
