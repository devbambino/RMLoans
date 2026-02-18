import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createWalletClient, http, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

// ⚠️ REEMPLAZA con la dirección real de la Vault en Base Sepolia
const MORPHO_VAULT_ADDRESS = "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9";

// ABI mínima para deposit
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
];

export async function POST() {
  try {
    const amount = parseUnits("0.01", 18); // prueba pequeña

    // 1️⃣ Obtener wallet server-side
    const wallets = await privy.walletApi.getWallets();
    const wallet = wallets[0];

    if (!wallet) {
      return NextResponse.json(
        { error: "No Privy wallet found" },
        { status: 400 },
      );
    }

    // 2️⃣ Crear wallet client
    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC),
    });

    // 3️⃣ Enviar transacción
    const hash = await walletClient.writeContract({
      address: MORPHO_VAULT_ADDRESS as `0x${string}`,
      abi: vaultAbi,
      functionName: "deposit",
      args: [amount, wallet.address as `0x${string}`],
      account: wallet.address as `0x${string}`,
    });

    return NextResponse.json({ success: true, hash });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
