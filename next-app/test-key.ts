import { config } from "dotenv";
import { createPrivateKey } from "crypto";

config({ path: ".env.local" });

const raw = process.env.PRIVY_SIGNING_KEY ?? "";
console.log("Raw length:", raw.length);
console.log("Raw value:", raw);

const pem = raw.split("\\n").join("\n");
console.log("\nPEM convertido:\n", pem);

try {
  const key = createPrivateKey(pem);
  console.log("\n✅ Key válida!");
  console.log("Tipo:", key.asymmetricKeyType);
} catch (e: any) {
  console.log("\n❌ Key inválida:", e.message);
}
