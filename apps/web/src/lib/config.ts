/**
 * Environment parsing (kb/90 §8.3, §8.4). One file; the server and the browser use the same lists. Strict zod validation lives in `config-env.ts` (server only).
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

/** Plain resolver (no zod): empty means unset, a bad enum falls back to the default. `validatePublicEnv()` in
 * `config-env.ts` is the strict check and runs on the server. */
const str = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
const list = (v: string | undefined, fallback: readonly string[]): readonly string[] =>
  v && v.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;
const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

const env = {
  NEXT_PUBLIC_NETWORK: pick(process.env.NEXT_PUBLIC_NETWORK, ["testnet", "mainnet"], "testnet"),
  NEXT_PUBLIC_SATCHEL_CONTRACT: str(process.env.NEXT_PUBLIC_SATCHEL_CONTRACT, DEFAULTS.contract),
  NEXT_PUBLIC_CONTRACT_ROLE: pick(process.env.NEXT_PUBLIC_CONTRACT_ROLE, ["dev", "rc", "final"], "dev"),
  NEXT_PUBLIC_MPC_CONTRACT: str(process.env.NEXT_PUBLIC_MPC_CONTRACT, DEFAULTS.mpc),
  NEXT_PUBLIC_USDC_CONTRACT: str(process.env.NEXT_PUBLIC_USDC_CONTRACT, DEFAULTS.usdc),
  NEXT_PUBLIC_EXPECTED_CODE_HASH: /^[0-9a-f]{64}$/i.test(process.env.NEXT_PUBLIC_EXPECTED_CODE_HASH ?? "")
    ? (process.env.NEXT_PUBLIC_EXPECTED_CODE_HASH as string).toLowerCase()
    : undefined,
  NEXT_PUBLIC_APP_URL: str(process.env.NEXT_PUBLIC_APP_URL, DEFAULTS.appUrl),
  NEXT_PUBLIC_DATA_MODE: pick(process.env.NEXT_PUBLIC_DATA_MODE, ["live", "fixture"], "fixture"),
  NEXT_PUBLIC_NEAR_RPCS: list(process.env.NEXT_PUBLIC_NEAR_RPCS, DEFAULTS.nearRpcs),
  NEXT_PUBLIC_NEAR_TX_API: str(process.env.NEXT_PUBLIC_NEAR_TX_API, DEFAULTS.nearTxApi),
  NEXT_PUBLIC_SEPOLIA_RPCS: list(process.env.NEXT_PUBLIC_SEPOLIA_RPCS, DEFAULTS.sepoliaRpcs),
  NEXT_PUBLIC_BTC_APIS: list(process.env.NEXT_PUBLIC_BTC_APIS, DEFAULTS.btcApis),
  NEXT_PUBLIC_SOL_RPCS: list(process.env.NEXT_PUBLIC_SOL_RPCS, DEFAULTS.solRpcs),
  NEXT_PUBLIC_SOL_UI: pick(process.env.NEXT_PUBLIC_SOL_UI, ["on", "off"], "on"),
  NEXT_PUBLIC_SOL_SEND: pick(process.env.NEXT_PUBLIC_SOL_SEND, ["on", "off"], "off"),
};

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
