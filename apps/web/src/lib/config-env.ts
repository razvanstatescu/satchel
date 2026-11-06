import { z } from "zod";
import { DEFAULTS, isForbiddenRpc } from "@/lib/config";

/**
 * The strict (zod) validation of the public environment (kb/90 §8.3, §8.4). Server-only on purpose: `config.ts` is
 * imported by client code, and zod (about 33 KB compressed) must not ship to browsers. The root layout runs
 * `validatePublicEnv()` at build and on the server, so an invalid variable still fails the build; the browser reads the
 * same variables through `config.ts`'s plain resolver.
 */

const urlList = (fallback: readonly string[]) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v && v.trim()
        ? v.split(",").map((s) => s.trim()).filter(Boolean)
        : [...fallback],
    )
    .pipe(
      z
        .array(z.string().url())
        .min(1)
        .refine((urls) => urls.every((u) => !isForbiddenRpc(u)), {
          message: "the deprecated near.org testnet RPC is not allowed (kb/90 §8.3)",
        }),
    );

const accountId = z
  .string()
  .min(2)
  .max(64)
  .regex(/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/, "not a valid NEAR account id");

export const PublicEnvSchema = z.object({
  // the app runs on testnet only today; "mainnet" exists so testnet-only labels (D-50's "at mainnet prices") can be
  // switched off by one variable when a mainnet deployment happens
  NEXT_PUBLIC_NETWORK: z.enum(["testnet", "mainnet"]).default(DEFAULTS.network as "testnet"),
  NEXT_PUBLIC_SATCHEL_CONTRACT: accountId.default(DEFAULTS.contract),
  NEXT_PUBLIC_CONTRACT_ROLE: z.enum(["dev", "rc", "final"]).default(DEFAULTS.role),
  NEXT_PUBLIC_MPC_CONTRACT: accountId.default(DEFAULTS.mpc),
  NEXT_PUBLIC_USDC_CONTRACT: accountId.default(DEFAULTS.usdc),
  NEXT_PUBLIC_EXPECTED_CODE_HASH: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "SHA-256 hex (64 chars)")
    .transform((s) => s.toLowerCase())
    .optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default(DEFAULTS.appUrl),
  NEXT_PUBLIC_DATA_MODE: z.enum(["live", "fixture"]).default(DEFAULTS.dataMode),
  NEXT_PUBLIC_NEAR_RPCS: urlList(DEFAULTS.nearRpcs),
  NEXT_PUBLIC_NEAR_TX_API: z.string().url().default(DEFAULTS.nearTxApi),
  NEXT_PUBLIC_SEPOLIA_RPCS: urlList(DEFAULTS.sepoliaRpcs),
  NEXT_PUBLIC_BTC_APIS: urlList(DEFAULTS.btcApis),
  NEXT_PUBLIC_SOL_RPCS: urlList(DEFAULTS.solRpcs),
  /** The Solana UI: SOL in cards, wallet rows, Receive, Send and Mint. On by default since D-46 (Razvan, 2026-10-27);
   *  `off` is the cut switch (kb/80 cut-1), which also drops Solana from the app's copy. */
  NEXT_PUBLIC_SOL_UI: z.enum(["on", "off"]).default("on"),
  /** The Solana send flow alone (the ChainSelect's third segment, `/s/[id]/send?chain=sol`). Implied by SOL_UI. */
  NEXT_PUBLIC_SOL_SEND: z.enum(["on", "off"]).default("off"),
});

export type PublicEnv = z.output<typeof PublicEnvSchema>;

/** Treat empty strings as unset so `.default()` applies. */
function clean(raw: Record<string, string | undefined>) {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = v === "" ? undefined : v;
  return out;
}

export function parsePublicEnv(raw: Record<string, string | undefined>): PublicEnv {
  const r = PublicEnvSchema.safeParse(clean(raw));
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid Satchel environment: ${msg}`);
  }
  return r.data;
}


/** Fails (throws) on an invalid public environment. Called by the root layout, which only ever runs on the server. */
export function validatePublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_SATCHEL_CONTRACT: process.env.NEXT_PUBLIC_SATCHEL_CONTRACT,
    NEXT_PUBLIC_CONTRACT_ROLE: process.env.NEXT_PUBLIC_CONTRACT_ROLE,
    NEXT_PUBLIC_MPC_CONTRACT: process.env.NEXT_PUBLIC_MPC_CONTRACT,
    NEXT_PUBLIC_USDC_CONTRACT: process.env.NEXT_PUBLIC_USDC_CONTRACT,
    NEXT_PUBLIC_EXPECTED_CODE_HASH: process.env.NEXT_PUBLIC_EXPECTED_CODE_HASH,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE,
    NEXT_PUBLIC_NEAR_RPCS: process.env.NEXT_PUBLIC_NEAR_RPCS,
    NEXT_PUBLIC_NEAR_TX_API: process.env.NEXT_PUBLIC_NEAR_TX_API,
    NEXT_PUBLIC_SEPOLIA_RPCS: process.env.NEXT_PUBLIC_SEPOLIA_RPCS,
    NEXT_PUBLIC_BTC_APIS: process.env.NEXT_PUBLIC_BTC_APIS,
    NEXT_PUBLIC_SOL_RPCS: process.env.NEXT_PUBLIC_SOL_RPCS,
    NEXT_PUBLIC_SOL_UI: process.env.NEXT_PUBLIC_SOL_UI,
    NEXT_PUBLIC_SOL_SEND: process.env.NEXT_PUBLIC_SOL_SEND,
  });
}
