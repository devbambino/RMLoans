import { NextResponse } from "next/server";
import {
  parseUnits,
  encodeFunctionData,
  createPublicClient,
  getAddress,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { PrivyClient } from "@privy-io/server-auth";

const signingKey = (process.env.PRIVY_SIGNING_KEY ?? "")
  .split("\\n")
  .join("\n");

// ✅ Sintaxis correcta para @privy-io/server-auth
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: signingKey,
    },
  },
);

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
    const { walletId, userAddress, amount } = await req.json();

    if (!walletId || !userAddress || !amount)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const cleanAddress = getAddress(userAddress.toLowerCase());
    console.log("--- LEND ---", { walletId, cleanAddress, amount });

    const parsedAmount = parseUnits(amount, 6);

    // 1️⃣ APPROVE
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [MORPHO_VAULT_ADDRESS as `0x${string}`, parsedAmount],
    });

    // ✅ walletApi.ethereum.sendTransaction — ethereum es PROPIEDAD, no función
    const approveTx = await privy.walletApi.ethereum.sendTransaction({
      walletId,
      caip2: "eip155:84532",
      transaction: {
        to: USDC_ADDRESS,
        data: approveData,
        chainId: 84532,
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

    const depositTx = await privy.walletApi.ethereum.sendTransaction({
      walletId,
      caip2: "eip155:84532",
      transaction: {
        to: MORPHO_VAULT_ADDRESS,
        data: depositData,
        chainId: 84532,
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
