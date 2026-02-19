// /api/balances/route.ts
// Read all balances from the blockchain for the dashboard
import { NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const USDC = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f";
const MOCK_MXNB = "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E";
const WM_USDC = "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B";
const MORPHO_USDC_VAULT = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";
const MORPHO_BLUE = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MARKET_ID =
  "0xf912f62db71d01c572b28b6953c525851f9e0660df4e422cec986e620da726df";

const balanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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
] as const;

export async function POST(req: Request) {
  try {
    const { userAddress } = await req.json();
    if (!userAddress)
      return NextResponse.json({ error: "Falta userAddress" }, { status: 400 });

    const addr = userAddress as `0x${string}`;

    const [usdc, mUsdc, wmUsdc, mxnb, position] = await Promise.all([
      publicClient.readContract({
        address: USDC,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [addr],
      }),
      publicClient.readContract({
        address: MORPHO_USDC_VAULT,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [addr],
      }),
      publicClient.readContract({
        address: WM_USDC,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [addr],
      }),
      publicClient.readContract({
        address: MOCK_MXNB,
        abi: balanceAbi,
        functionName: "balanceOf",
        args: [addr],
      }),
      publicClient.readContract({
        address: MORPHO_BLUE,
        abi: morphoAbi,
        functionName: "position",
        args: [MARKET_ID as `0x${string}`, addr],
      }),
    ]);

    return NextResponse.json({
      usdc: parseFloat(formatUnits(usdc, 6)).toFixed(4),
      mUsdc: parseFloat(formatUnits(mUsdc, 18)).toFixed(4),
      wmUsdc: parseFloat(formatUnits(wmUsdc, 18)).toFixed(4),
      mxnb: parseFloat(formatUnits(mxnb, 6)).toFixed(4),
      morphoCollateral: parseFloat(formatUnits(position[2], 18)).toFixed(4),
      morphoBorrow: parseFloat(formatUnits(position[1], 12)).toFixed(4),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error" },
      { status: 500 },
    );
  }
}
