import type { SatchelStatus } from "@/lib/near/contract";
import type { AllowanceView, Chain, ConfigView, InsideView, Listing, SigRecordView } from "@/lib/near/types";

/** GET /api/satchels/[id] shape (kb/90 §9) — also feeds the blocking /s/[id] render. */
export interface SatchelSnapshot {
  token_id: string;
  contract: string;
  role: "dev" | "rc" | "final";
  data_mode: "live" | "fixture";
  owner: string;
  status: SatchelStatus;
  listing: Listing | null;
  sig_count: number;
  last_sign_height: number;
  listable_at: number;
  addresses: { btc: string; evm: string; sol: string };
  paths: Record<Chain, string>;
  balances: {
    btc: { confirmed_sats: string; unconfirmed_sats: string } | null;
    evm: { wei: string } | null;
    sol: { lamports: string } | null;
    /**
     * C2 + C3: ETH and USDC (base units) on each EVM testnet, Sepolia first (one address on all four). A null value
     * means that read failed. Optional so older snapshots still type-check.
     */
    evm_chains?: EvmChainBalance[];
  };
  as_of: number; // ms
  links: { nearblocks_token: string; btc: string; evm: string; sol: string; contract_facts: string };
  quiet_period_blocks: number;
  height: number | null;
  minted_at: number | null; // ms
  last_signature: { seq: number; chain: Chain; height: number; timestamp_ms: number; status: SigRecordView["status"]; url: string | null } | null;
  lock: LockFacts;
  /** C6: NEAR and allowlisted FTs held inside the contract for this token (docs/specs/C4-C6.md §4). */
  inside: InsideView;
  /** C5 (docs/specs/C5.md §1.2): the token's live delegates, a public fact (judge-visible; never gated on the viewer). */
  allowances: AllowanceView[];
  errors: string[];
}

export interface LockFacts {
  access_keys: number | null; // null = couldn't read
  account_exists: boolean | null;
  locked: boolean | null; // exists && keys == 0
  code_hash_hex: string | null;
  expected_code_hash: string | null;
  code_matches: boolean | null; // null when nothing to compare (dev without expected hash)
  birth_tx: string | null;
  birth_block: number | null;
}

/** GET /api/contract (kb/90 §9). */
export interface ContractFacts extends LockFacts {
  account_id: string;
  role: "dev" | "rc" | "final";
  data_mode: "live" | "fixture";
  birth_actions: string[];
  any_signer_tx_count: number | null;
  oldest_tx: string | null;
  mpc_version: string | null;
  config: ConfigView | null;
  as_of: number;
  errors: string[];
}

export interface EvmChainBalance {
  chain_id: number;
  wei: string | null;
  usdc: string | null;
}

/** `message` (C7): a signed message. It can't move coins and never blocks Buy (core clean-history gate.ts). */
export type ItemStatus = "spent" | "expired" | "unfunded" | "foreign" | "message" | "settling" | "unused" | "unknown";
export type Aggregate = "checking" | "empty" | "clean" | "settling" | "blocked" | "unknown" | "unsafe";

export interface CleanItem {
  seq: number;
  chain: Chain;
  key: string; // "nonce 3" | "coin 7d…e2:1" | "blockhash 9f…"
  wouldPay: string | null;
  amountSource: "chain" | "claimed";
  evidence: string;
  evidenceUrl: string | null;
  status: ItemStatus | "checking";
  signedAt: number;
  height: number;
  requester: string;
  /** C7: a message record's kind and decoded text (status `message`) */
  message?: { kind: "evm_message" | "sol_message"; text: string };
  /** C2: a USDC transfer record's token, recipient and amount (base units) */
  erc20?: { token: string; to: string; amount: string };
  /** C3: the EVM chain id of a transaction record */
  chainId?: number;
}

export interface CleanCheck {
  name: string;
  ok: boolean;
  warn?: boolean; // dev role: neutral warning row
}

export interface CleanReport {
  token_id: string;
  aggregate: Aggregate;
  checked_at: number;
  sig_count: number;
  listing_id: number | null;
  one_of_two: boolean;
  role: "dev" | "rc" | "final";
  checks: CleanCheck[];
  items: CleanItem[];
  sources: { chain: Chain; provider: string; ok: boolean }[];
  unsafe_reason: string | null;
  encumbered_utxos: string[];
  source: "server-hint" | "browser" | "fixture";
}

export interface MarketEntry {
  token_id: string;
  listing: Listing;
  snapshot: SatchelSnapshot;
  hint: Pick<CleanReport, "aggregate" | "checked_at" | "items"> | null;
}

export interface ActivityRow {
  kind: "sent" | "signed_not_sent" | "issued" | "message" | "transferred" | "received" | "minted" | "listed" | "delisted" | "sold" | "bought";
  tx: string;
  block: number;
  timestampMs: number | null;
  chain?: Chain;
  amount?: string; // base units
  to?: string;
  from?: string;
  fee?: string;
  chainTxId?: string;
  price?: string;
  currency?: "near" | "usdc";
  status?: "final" | "signing" | "mempool" | "unused" | "failed" | "message";
  /** C2: the token a row moved (absent = the chain's native coin) */
  token?: "USDC";
  /** C3: the EVM chain id (absent on EVM rows = Sepolia) */
  evmChainId?: number;
  /** C7: the exact text of a signed message (kind `message`) */
  messageText?: string;
  /** C5: who called `sign_for` ("issued"/"sent" rows only). Shown only when it differs from the owner (a delegate). */
  requester?: string;
}
