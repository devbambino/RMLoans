import { PrivyClient } from "@privy-io/server-auth";

export const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_I!,
  process.env.PRIVY_APP_SECRET!,
);
