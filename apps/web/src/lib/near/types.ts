/**
 * Contract JSON shapes, kb/90 §5.3 / §5.14 (align with docs/handoff/contract.md once it exists).
 * Rules: token amounts are U128 decimal strings; counters and heights are JSON numbers;
 * byte strings are lowercase hex without 0x; enum tags are snake_case.
 */

export type TokenId = string;
export type Chain = "btc" | "evm" | "sol";
export type Currency = "near" | "usdc";
export type SigStatus = "pending" | "signed" | "failed" | "unparsed";

export interface ConfigView {
  version: string;
  mpc_contract_id: string;
  usdc_contract_id: string | null;
  cooldown_blocks: number;
  evm_chain_ids: number[];
  /** C2 (docs/specs/C1-C2-C3-C7.md §5.3) */
  erc20_tokens?: { chain_id: number; token: string }[];
  /** C7 */
  max_message_bytes?: number;
  max_btc_inputs: number;
  mpc_sign_gas_tgas: number;
  on_signed_gas_tgas: { base: number; per_request: number };
  min_sign_prepaid_tgas: { base: number; per_request: number };
  max_mpc_deposit: string;
  storage_byte_cost: string;
  base_uri: string;
  next_token_id: number;
  next_listing_id: number;
}

export interface Listing {
  id: number;
  seller: string;
  price: string;
  currency: Currency;
  listed_at: number;
  sig_count: number;
}

export interface SatchelView {
  token_id: TokenId;
  owner_id: string;
  sig_count: number;
  last_sign_height: number;
  listable_at: number;
  listing: Listing | null;
  paths: Record<Chain, string>;
}

export type SignatureView =
  | { r: string; s: string; recovery_id: number }
  | { signature: string };

export type SigDetailView =
  | { evm: { chain_id: number; nonce: number; unsigned_tx: string } }
  | { btc: { txid: string; vout: number; amount_sats: string } }
  | { sol: { recent_blockhash: string; lamports: string } };

export interface SigRecordView {
  seq: number;
  request_id: number;
  input_index: number;
  chain: Chain;
  height: number;
  timestamp_ms: number;
  requester: string;
  payload: string;
  status: SigStatus;
  signature: SignatureView | null;
  detail: SigDetailView;
}

export interface ListingView {
  token_id: TokenId;
  listing: Listing;
}

export interface ProceedsView {
  currency: Currency;
  amount: string;
}

/** NEP-171 / NEP-177 token. */
export interface NftToken {
  token_id: TokenId;
  owner_id: string;
  metadata?: {
    title?: string | null;
    media?: string | null;
    issued_at?: string | number | null;
    [k: string]: unknown;
  } | null;
  approved_account_ids?: Record<string, number> | null;
}

/** SignRequest (externally tagged JSON, kb/90 §5.3). */
export type SignRequest =
  | { evm: { unsigned_tx: string } }
  | { btc: { preimages: string[]; outputs: string } }
  | { sol: { message: string } };

export const CHAINS: readonly Chain[] = ["btc", "evm", "sol"] as const;

export function detailChain(d: SigDetailView): Chain {
  if ("evm" in d) return "evm";
  if ("btc" in d) return "btc";
  return "sol";
}

/** C5 spending allowance (docs/specs/C5.md): the TS mirror's JSON shapes, re-exported so the app imports one place. */
export type { Asset, AllowanceStatus, AllowanceView, CapInput } from "@satchel/core/policy";

/**
 * FIXTURE MODE ONLY: the static demo shape of one delegate's allowance on a token (fixtures.ts), merged with
 * `sim.ts`'s in-browser mutations into the same `AllowanceView` the real `allowance`/`allowances_of` views return.
 */
export interface AllowanceRecord {
  delegate: string;
  /** The owner who granted it (the backstop rule, spec §1.2 "Allowances of a previous owner never show"). */
  owner: string;
  set_at_ms: number;
  expires_at_ms: number | null;
  caps: { asset: import("@satchel/core/policy").Asset; limit: string; spends: { at_ms: number; amount: string }[] }[];
}
