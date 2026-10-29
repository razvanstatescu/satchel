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

/** C4/C6 view shapes (docs/specs/C4-C6.md §4), mirrored here so apps/web's `near/*` stays the one place the
 * contract's JSON is typed (@satchel/core's market.ts has the pure call builders and the same shapes). */
export interface FtBalanceView {
  token: string;
  amount: string;
}
/** `inside_of(token_id)`; null for a token that doesn't exist. `fts` lists only non-zero balances. */
export interface InsideView {
  near: string;
  fts: FtBalanceView[];
  inside_epoch: number;
}
/** `offer(id)`, `offers_for(token_id, from, limit)`, `offers_by(account_id, from, limit)` */
export interface OfferView {
  id: number;
  token_id: TokenId;
  offerer_id: string;
  amount: string;
  currency: Currency;
  expected_sig_count: number;
  expected_inside_epoch: number;
  expires_at_ms: number;
  created_at_ms: number;
}
export interface MarketConfigView {
  inside_fts: string[];
  max_offers_per_account: number;
  max_offer_ttl_ms: number;
  next_offer_id: number;
}
export interface MarketTotalsView {
  inside_near: string;
  offers_near: string;
  storage_credit: string;
}
