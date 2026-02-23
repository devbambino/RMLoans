// src/lib/privy-signer.ts
// Firma requests a la API REST de Privy usando P-256 ECDSA
// Sin dependencias externas — solo crypto nativo de Node.js

import { createPrivateKey, createSign } from "crypto";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET!;
const PRIVY_BASE_URL = "https://api.privy.io";

// Construye el PEM desde la env var (base64 sin headers)
function buildPemKey(): string {
  const raw = process.env.PRIVY_SIGNING_KEY ?? "";
  // Si ya tiene headers PEM, extraer solo el body
  const body = raw
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

// Genera el header privy-authorization-signature
// Spec: sign SHA-256 of (method + path + body) with P-256 private key
function generateAuthSignature(
  method: string,
  path: string,
  body: string,
): string {
  const pemKey = buildPemKey();
  const privateKey = createPrivateKey({ key: pemKey, format: "pem" });

  // El payload a firmar es: method + path + body (concatenados)
  const payload = `${method}${path}${body}`;

  const sign = createSign("SHA256");
  sign.update(payload);
  sign.end();

  // Privy espera la firma en base64
  return sign.sign(privateKey, "base64");
}

// Llama a la API REST de Privy para ejecutar una transacción
export async function privyRpc(
  walletId: string,
  caip2: string,
  transaction: {
    to: string;
    data?: string;
    value?: string;
    chain_id: number;
  },
): Promise<{ hash: string }> {
  const path = `/v1/wallets/${walletId}/rpc`;
  const bodyObj = {
    caip2,
    method: "eth_sendTransaction",
    params: { transaction },
  };
  const bodyStr = JSON.stringify(bodyObj);

  const signature = generateAuthSignature("POST", path, bodyStr);

  const response = await fetch(`${PRIVY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "privy-app-id": PRIVY_APP_ID,
      "privy-authorization-signature": signature,
      Authorization:
        "Basic " +
        Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString("base64"),
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Privy RPC error ${response.status}: ${err}`);
  }

  const data = await response.json();
  // Privy devuelve { data: { hash: "0x..." } }
  return { hash: data?.data?.hash ?? data?.hash };
}
