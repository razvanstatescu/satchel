/**
 * Clean-history types (spec §7; kb/70 §P3). Everything in a report is JSON-serializable (no bigint), so the
 * server route `/api/clean-history/[id]` can return the same object the browser computes.
 */
import type { RecordSignatureView } from '../near/mpc'

export type ContractRole = 'dev' | 'rc' | 'final'

/**
 * Per-record verdict (spec §7.2/§7.3). `foreign` (BTC, review S-07): the prevout exists but its scriptPubKey is not one
 * this Satchel's key can satisfy, so the signature can never move the coins being bought. Non-blocking, like `unfunded`.
 * `message` (C7): an EIP-191 or Solana off-chain message signature; it can't move coins, so it never blocks Buy, but
 * the Buy tab lists it with its text (docs/specs/C1-C2-C3-C7.md §7.2).
 */
export type ItemStatus = 'spent' | 'expired' | 'unfunded' | 'foreign' | 'message' | 'settling' | 'unused' | 'unknown'

/** Aggregate verdict (spec §7.3). Buy is enabled only for `clean` and `empty`. */
export type Aggregate = 'empty' | 'unsafe' | 'unknown' | 'blocked' | 'settling' | 'clean'

export type AccountStatus = 'ok' | 'unsafe' | 'unknown'

/** `sig_records` view row (spec §5.14). Numbers may arrive as strings from some serializers; both are accepted. */
export interface SigRecordView {
  seq: number
  request_id: number
  input_index: number
  chain: 'btc' | 'evm' | 'sol'
  height: number
  timestamp_ms: number
  requester: string
  payload: string
  status: 'pending' | 'signed' | 'failed' | 'unparsed'
  signature: RecordSignatureView | null
  detail:
    | {
        evm: {
          chain_id: number | string
          nonce: number | string
          unsigned_tx: string
          /** C2: present only on USDC transfers (derived by the contract from `unsigned_tx`) */
          erc20?: { token: string; to: string; amount: string }
        }
      }
    | { btc: { txid: string; vout: number; amount_sats: string | number } }
    | { sol: { recent_blockhash: string; lamports: string | number } }
    /** C7: hex of the UTF-8 body; `chain` is "evm" / "sol" (the key that signed) */
    | { evm_message: { message: string } }
    | { sol_message: { message: string } }
}

/** What one NEAR RPC returned for the token and the contract. */
export interface NearSnapshot {
  source: string
  /** `satchel(id).sig_count` */
  sigCount: number
  /** `sig_records(id, 0..sig_count)` (all pages) */
  records: SigRecordView[]
  contract: {
    /** `view_account` succeeded (an empty key list alone also means "no such account", kb/00 §Gotchas 10) */
    exists: boolean
    accessKeyCount: number
    /** `view_account.code_hash` (base58, as NEAR returns it) or hex */
    codeHash: string | null
  }
  /** MPC `derived_public_key` answers for the token's three paths (NEAR key strings), if read */
  mpcKeys?: { btc?: string; evm?: string; sol?: string }
}

export type NearSnapshotResult = NearSnapshot | { source: string; error: string }

export interface Policy {
  /** EVM: a nonce is spent once the count at `latest − evmConfirmations` exceeds it (spec §7.4: 3) */
  evmConfirmations: number
  /** BTC: confirmations K for a spend to count (testnet4 K = 1, disclosed weakness T11) */
  btcK: number
  /** SOL: minimum record age before a blockhash can be judged expired (120 s) */
  solMinAgeMs: number
  /** H-25: allow a verdict from one of two providers on testnet, labelled "1 of 2 sources" */
  allowSingleSource: boolean
  /** R-20 soft cap on distinct BTC txids per run */
  maxBtcTxids: number
}

export const TESTNET_POLICY: Policy = {
  evmConfirmations: 3,
  btcK: 1,
  solMinAgeMs: 120_000,
  allowSingleSource: true,
  maxBtcTxids: 100,
}

export interface EvmSource {
  name: string
  chainId(): Promise<number>
  blockNumber(): Promise<bigint>
  getTransactionCount(address: string, block: bigint | 'latest'): Promise<bigint>
  getCode(address: string): Promise<string>
}

export interface BtcOutspend {
  spent: boolean
  txid?: string
  vin?: number
  status?: { confirmed: boolean; block_height?: number }
}

export interface BtcSource {
  name: string
  /** throws unless the provider serves testnet4 (genesis guard) */
  assertTestnet4(): Promise<void>
  tipHeight(): Promise<number>
  /** null = tx unknown (HTTP 404). Never use `/outspend/:v` alone (it says spent:false for unknown txids). */
  outspends(txid: string): Promise<BtcOutspend[] | null>
  /**
   * Optional `GET /tx/:txid` (Esplora JSON, `vout[i].scriptpubkey` is read). Used only to recognise `foreign` prevouts
   * (S-07). A source without it, or a failed call, leaves the verdict as it was (fail closed: still blocking).
   */
  tx?(txid: string): Promise<unknown | null>
}

export interface SolSource {
  name: string
  /** `isBlockhashValid(hash, {commitment: 'processed'})` */
  isBlockhashValid(blockhashBase58: string): Promise<boolean>
  /** null = account absent */
  getAccountInfo(address: string): Promise<{ owner: string; dataLength: number } | null>
}

export interface CachedVerdict {
  status: 'spent' | 'expired'
  evidence: Record<string, unknown>
  at: number
}

/** Permanent cache of FINAL verdicts only (EVM below latest−3, BTC at depth ≥ K, SOL expired; spec §7.5). */
export interface VerdictCache {
  get(key: string): CachedVerdict | undefined | Promise<CachedVerdict | undefined>
  set(key: string, v: CachedVerdict): void | Promise<void>
}

export interface CheckInput {
  network: 'testnet' | 'mainnet'
  contractId: string
  tokenId: string
  role: ContractRole
  /** NEXT_PUBLIC_EXPECTED_CODE_HASH (SHA-256 hex, or base58); required for rc/final */
  expectedCodeHash?: string
  /** addresses the UI shows; compared with our own derivation (any mismatch ⇒ unsafe) */
  displayedAddresses?: { btc?: string; evm?: string; sol?: string }
  near: NearSnapshotResult[]
  /** ms since epoch */
  now: number
  policy?: Partial<Policy>
}

export interface CheckDeps {
  /** Sepolia providers (two that must agree); also the fallback for `evmByChain[11155111]` */
  evm: EvmSource[]
  /**
   * C3: providers per EVM chain id (Base Sepolia 84532, Arbitrum Sepolia 421614, OP Sepolia 11155420; Sepolia may be
   * given here too). A chain that has records but no providers gives `unknown` items (fail closed).
   */
  evmByChain?: Partial<Record<number, EvmSource[]>>
  btc: BtcSource[]
  sol: SolSource[]
  cache?: VerdictCache
}

export interface ItemReport {
  seq: number
  request_id: number
  input_index: number
  chain: 'btc' | 'evm' | 'sol'
  status: ItemStatus
  /** why, in one machine-readable word (e.g. "nonce_used", "outpoint_unspent", "tx_conflict", "young", "providers_disagree") */
  reason: string
  chain_id?: number
  nonce?: string
  outpoint?: string
  /** the record's claimed amount for BTC (never verified: shown as "claimed", R-23) */
  claimed_amount_sats?: string
  /** C2: a USDC transfer record's token, recipient and amount (base units) */
  erc20?: { token: string; to: string; amount: string }
  /** C7: `evm_message` / `sol_message`, and the decoded text, for `message` items */
  message_kind?: 'evm_message' | 'sol_message'
  message_text?: string
  recent_blockhash?: string
  evidence: Record<string, unknown>
  evidence_url?: string
  /** how many providers' answers this verdict rests on (1 ⇒ "1 of 2 sources") */
  sources: number
  cached: boolean
}

export interface AccountReport {
  chain: 'evm' | 'sol'
  /** C3: the EVM chain this account check ran on (absent for SOL) */
  chain_id?: number
  address: string
  status: AccountStatus
  reason: string
  evidence: Record<string, unknown>
  sources: number
}

export interface ContractReport {
  account_id: string
  role: ContractRole
  exists: boolean | null
  access_keys: number | null
  locked: boolean | null
  code_hash: string | null
  expected_code_hash: string | null
  code_ok: boolean | null
  /** derived keys vs the MPC's `derived_public_key` (null = not checked) */
  mpc_keys_ok: boolean | null
  /** our derivation vs the addresses the UI shows (null = not provided) */
  addresses_ok: boolean | null
  near_sources: number
}

export interface CleanHistoryReport {
  token_id: string
  checked_at: string
  policy: { evm: string; btc_k: number; sol_min_age_s: number; allow_single_source: boolean }
  sig_count: number | null
  aggregate: Aggregate
  buy_enabled: boolean
  /** pass to `buy(token_id, listing_id, expected_sig_count)` */
  expected_sig_count: number | null
  /** "1 of 2 sources" when any verdict rests on one provider (H-25) */
  sources_note: string | null
  /** gate-mode warnings, e.g. "dev_contract_checks_skipped" */
  warnings: string[]
  /** why the aggregate is not clean/empty */
  reasons: string[]
  contract: ContractReport
  addresses: { btc: string; evm: string; sol: string }
  accounts: AccountReport[]
  items: ItemReport[]
  /** BTC outpoints referenced by a non-dead record: excluded from the verified balance */
  encumbered_outpoints: string[]
}
