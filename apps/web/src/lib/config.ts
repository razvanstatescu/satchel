import { z } from "zod";

/**
 * Environment parsing (kb/90 §8.3, §8.4). One file; the server and the browser use the same lists.
 * NEXT_PUBLIC_* values must be read with literal `process.env.NEXT_PUBLIC_X` accesses so Next inlines them
 * into client bundles. FASTNEAR_API_KEY is server-only and is read through `serverConfig()`.
 */

/** The deprecated, throttled near.org testnet RPC (kb/41) is refused everywhere. A regex, so the literal host never
 * appears in the source or in the built bundles (the CI grep must find nothing). */
const FORBIDDEN_RPC_RE = /rpc\.testnet\.near\.org/i;
export const isForbiddenRpc = (url: string) => FORBIDDEN_RPC_RE.test(url);

export const DEFAULTS = {
  network: "testnet",
  contract: "satchel.satchelhq.testnet",
  role: "dev",
  mpc: "v1.signer-prod.testnet",
  usdc: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
  appUrl: "http://localhost:3000",
  dataMode: "fixture",
  nearRpcs: ["https://rpc.testnet.fastnear.com", "https://near-testnet.drpc.org"],
  nearTxApi: "https://tx.test.fastnear.com",
  sepoliaRpcs: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.ethpandaops.io",
    "https://0xrpc.io/sep",
    "https://sepolia.gateway.tenderly.co",
  ],
  btcApis: ["https://mempool.space/testnet4/api", "https://mempool.emzy.de/testnet4/api"],
  solRpcs: ["https://api.devnet.solana.com"],
} as const;

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

const env = parsePublicEnv({
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

export const NETWORK = env.NEXT_PUBLIC_NETWORK;
/** Testnet-only wording (the "at mainnet prices" label, the testnet-value note) shows only here. */
export const IS_TESTNET = NETWORK === "testnet";
export const SATCHEL_CONTRACT = env.NEXT_PUBLIC_SATCHEL_CONTRACT;
export const CONTRACT_ROLE = env.NEXT_PUBLIC_CONTRACT_ROLE;
export const MPC_CONTRACT = env.NEXT_PUBLIC_MPC_CONTRACT;
export const USDC_CONTRACT = env.NEXT_PUBLIC_USDC_CONTRACT;
export const EXPECTED_CODE_HASH = env.NEXT_PUBLIC_EXPECTED_CODE_HASH ?? null;
export const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
export const DATA_MODE = env.NEXT_PUBLIC_DATA_MODE;
export const IS_FIXTURE = DATA_MODE === "fixture";
export const NEAR_RPCS = env.NEXT_PUBLIC_NEAR_RPCS;
export const NEAR_TX_API = env.NEXT_PUBLIC_NEAR_TX_API.replace(/\/$/, "");
export const SEPOLIA_RPCS = env.NEXT_PUBLIC_SEPOLIA_RPCS;
export const BTC_APIS = env.NEXT_PUBLIC_BTC_APIS;
export const SOL_RPCS = env.NEXT_PUBLIC_SOL_RPCS;

/** Bitcoin, Ethereum and Solana (D-46). `NEXT_PUBLIC_SOL_UI=off` cuts the Solana UI (kb/80 cut order). */
export const SOL_UI_ENABLED = env.NEXT_PUBLIC_SOL_UI === "on";
/** The SOL send flow (Review → SigningProgress → receipt, D-09 blockhash rules). */
export const SOL_SEND_ENABLED = SOL_UI_ENABLED || env.NEXT_PUBLIC_SOL_SEND === "on";

/** Server-only values. Never import into a client component (FASTNEAR_API_KEY must never be NEXT_PUBLIC). */
export function serverConfig() {
  if (typeof window !== "undefined") throw new Error("serverConfig() is server-only");
  const key = process.env.FASTNEAR_API_KEY;
  return { fastnearApiKey: key && key.trim() ? key.trim() : null };
}

export const EXPLORERS = {
  nearTx: (h: string) => `https://testnet.nearblocks.io/txns/${h}`,
  nearAccount: (a: string) => `https://testnet.nearblocks.io/address/${a}`,
  btcTx: (t: string) => `https://mempool.space/testnet4/tx/${t}`,
  btcAddress: (a: string) => `https://mempool.space/testnet4/address/${a}`,
  evmTx: (h: string) => `https://sepolia.etherscan.io/tx/${h}`,
  evmAddress: (a: string) => `https://sepolia.etherscan.io/address/${a}`,
  solTx: (s: string) => `https://explorer.solana.com/tx/${s}?cluster=devnet`,
  solAddress: (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
} as const;

export const FAUCETS = {
  btc: "https://mempool.space/testnet4/faucet",
  evm: "https://sepoliafaucet.com",
  sol: "https://faucet.solana.com",
  near: "https://near-faucet.io",
  usdc: "https://faucet.circle.com",
} as const;

export const REPO_URL = "https://github.com/razvanstatescu/satchel";
