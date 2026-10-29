import type { Chain } from "@/lib/near/types";

/** kb/90 §8.6 stages. */
export type SigningStage =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "signing"
  | "signed"
  | "broadcasting"
  | "sent"
  | "confirmed"
  | "cancelled"
  | "timed_out"
  | "signed_not_sent"
  | "expired"
  | "unknown"
  | "failed";

export const TERMINAL_STAGES: ReadonlySet<SigningStage> = new Set(["confirmed", "cancelled", "failed"]);

/** Persisted signature (hex, JSON-safe). secp: r ‖ s + recovery id; ed25519: 64-byte hex. */
export type StoredSignature = { r: string; s: string; recoveryId: number } | { ed25519: string };

/** localStorage["satchel:pending:v1"] holds PendingIntent[] (kb/90 §8.6, field names kept). */
export interface PendingIntent {
  id: string;
  tokenId: string;
  chain: Chain;
  createdAt: number;
  contract: string;
  signerId?: string;
  sigCountBefore: number; // s0
  heightBefore: number; // h0
  unsigned: {
    evmTx?: `0x${string}`;
    btc?: { psbtHex: string; preimages: string[]; outputs: string; inputs: string[] };
    sol?: { message: string; lastValidBlockHeight: number };
  };
  payloadHashes: string[];
  evmNonce?: number;
  /** C3: the EVM chain id of an EVM intent (absent = Sepolia, every intent written before C3) */
  evmChainId?: number;
  /** C2: the asset an EVM intent moves (absent = the native coin) */
  asset?: "usdc";
  /**
   * C7: a message-signing intent. It is never broadcast (the adapter verifies the signature and stops), never blocks
   * a send and never uses a nonce.
   */
  message?: { kind: "evm_message" | "sol_message"; text: string };
  nearTxHash?: string;
  seqs?: number[];
  signatures?: (StoredSignature | null)[];
  chainTxId?: string;
  stage: SigningStage;
  error?: string;
  /** UI extras (not in the spec type, all optional): what the review showed, for the tracker and receipts. */
  display?: { amount: string; to: string; toShort: string; network: string };
  /** When the wallet rejected (ms); cancelled only if no record appears within 10 s. */
  rejectedAt?: number;
  /** When the wallet call started (ms), for the 60 s "slow wallet" copy. */
  walletAt?: number;
  /** When signing (record seen / hash known) started (ms), for the ETA thresholds. */
  signingAt?: number;
  sentAt?: number;
  confirmedAt?: number;
  /** Last broadcast failure reason (signed_not_sent). */
  notSentReason?: string;
  /** Id of the intent this one replaces (retry with the same nonce / inputs). */
  replaces?: string;
}

export type SigningEvent =
  | { type: "SEND"; now: number }
  | { type: "PERSISTED"; now: number }
  | { type: "PREPARE_ERROR"; error: string }
  | { type: "TX_HASH"; hash: string; now: number }
  | { type: "RECORD_SEEN"; seqs: number[]; now: number }
  | { type: "WALLET_REJECTED"; message: string; now: number }
  | { type: "RECORDS"; statuses: ("pending" | "signed" | "failed" | "unparsed")[]; signatures: (StoredSignature | null)[]; now: number }
  | { type: "TX_SUCCESS"; signatures: (StoredSignature | null)[]; now: number }
  | { type: "TX_FAILURE"; code: string }
  | { type: "TICK"; now: number; height?: number | null }
  | { type: "VERIFIED" }
  | { type: "VERIFY_FAILED" }
  | { type: "BROADCAST_OK"; chainTxId: string; now: number }
  | { type: "BROADCAST_ERROR"; reason: string }
  | { type: "SOL_EXPIRED" }
  | { type: "CONFIRMED"; now: number }
  | { type: "BROADCAST_AGAIN" }
  | { type: "CHECK_AGAIN"; now: number }
  | { type: "RETRY"; now: number };
