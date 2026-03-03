// src/app/api/unwrap/route.ts
import { NextResponse } from "next/server";
import { encodeFunctionData, createPublicClient, getAddress, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privyRpc } from "@/lib/privy-signer";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});
const WM_USDC = "0xBDc7fCDAC92DEe5220215aB6a0f5E1B20A665CD4";

const wmUsdcAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "userDepositedShares",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getInterestSubsidy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "redeemWithInterestSubsidy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "previewRedeem",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  try {
    const { walletId, userAddress } = await req.json();
    if (!walletId || !userAddress)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const addr = getAddress(userAddress.toLowerCase()) as `0x${string}`;

    // Poll for WmUSDC balance
    let wmusdcBalance = 0n;
    let retries = 0;
    while (retries < 15) {
      wmusdcBalance = await publicClient.readContract({
        address: WM_USDC as `0x${string}`,
        abi: wmUsdcAbi,
        functionName: "balanceOf",
        args: [addr],
      });
      console.log(
        `WmUSDC balance attempt ${retries + 1}:`,
        wmusdcBalance.toString(),
      );
      if (wmusdcBalance > 0n) break;
      await new Promise((r) => setTimeout(r, 3000));
      retries++;
    }

    if (wmusdcBalance === 0n)
      return NextResponse.json(
        { error: "WmUSDC balance is 0 after polling" },
        { status: 400 },
      );

    // Check if redeemWithInterestSubsidy is safe to call:
    // standardReturn = previewRedeem(shares) must be <= userDepositedShares
    // Otherwise the subtraction underflows
    const [depositedShares, standardReturn] = await Promise.all([
      publicClient.readContract({
        address: WM_USDC as `0x${string}`,
        abi: wmUsdcAbi,
        functionName: "userDepositedShares",
        args: [addr],
      }),
      publicClient.readContract({
        address: WM_USDC as `0x${string}`,
        abi: wmUsdcAbi,
        functionName: "previewRedeem",
        args: [wmusdcBalance],
      }),
    ]);

    console.log("--- UNWRAP ---", {
      walletId,
      addr,
      wmusdcBalance: wmusdcBalance.toString(),
      depositedShares: depositedShares.toString(),
      standardReturn: standardReturn.toString(),
    });

    let unwrapHash: string;
    const canUseSubsidy =
      depositedShares > 0n && depositedShares >= standardReturn;

    if (canUseSubsidy) {
      console.log("Using redeemWithInterestSubsidy");

      // Call getInterestSubsidy first — required to set userInterestSubsidyInWmUSDC on chain
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

      const redeemData = encodeFunctionData({
        abi: wmUsdcAbi,
        functionName: "redeemWithInterestSubsidy",
        args: [wmusdcBalance, addr, addr],
      });
      const redeemTx = await privyRpc(walletId, "eip155:84532", {
        to: WM_USDC,
        data: redeemData,
        chain_id: 84532,
      });
      await publicClient.waitForTransactionReceipt({
        hash: redeemTx.hash as `0x${string}`,
      });
      console.log("redeemWithInterestSubsidy hash:", redeemTx.hash);
      unwrapHash = redeemTx.hash;
    } else {
      // depositedShares < standardReturn → underflow would occur
      // Use plain redeem which doesn't do the subtraction
      console.log("Using plain redeem (depositedShares < standardReturn or 0)");

      const redeemData = encodeFunctionData({
        abi: wmUsdcAbi,
        functionName: "redeem",
        args: [wmusdcBalance, addr, addr],
      });
      const redeemTx = await privyRpc(walletId, "eip155:84532", {
        to: WM_USDC,
        data: redeemData,
        chain_id: 84532,
      });
      await publicClient.waitForTransactionReceipt({
        hash: redeemTx.hash as `0x${string}`,
      });
      console.log("redeem hash:", redeemTx.hash);
      unwrapHash = redeemTx.hash;
    }

    return NextResponse.json({ success: true, unwrapHash });
  } catch (e: any) {
    console.error("UNWRAP ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
