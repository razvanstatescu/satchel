import type { SigRecordView, SignatureView } from "@/lib/near/types";
import type { StoredSignature } from "@/lib/signing/types";

/**
 * The contract watcher (kb/90 §8.6): sig_records(token, s0, 20) every 2 s, matched by OUR payload hashes at seq ≥ s0.
 * Matching by payload (not by seq) means a reload, a lost hash or a wallet that never resolves still finds the record.
 */

export const WATCH_INTERVAL_MS = 2000;
export const WATCH_PAGE = 20;

export interface Matched {
  seqs: number[];
  statuses: SigRecordView["status"][];
  signatures: (StoredSignature | null)[];
}

const norm = (h: string) => h.toLowerCase().replace(/^0x/, "");

export function toStoredSignature(sig: SignatureView | null): StoredSignature | null {
  if (!sig) return null;
  if ("signature" in sig) return { ed25519: sig.signature };
  return { r: sig.r, s: sig.s, recoveryId: sig.recovery_id };
}

/**
 * Find the records for `payloadHashes` (in input order) at seq ≥ s0. BTC requests have one record per input;
 * all of them share the request_id. Returns null until every payload has a record.
 */
export function matchRecords(records: readonly SigRecordView[], s0: number, payloadHashes: readonly string[]): Matched | null {
  const want = payloadHashes.map(norm);
  const candidates = records.filter((r) => r.seq >= s0);
  const seqs: number[] = [];
  const statuses: SigRecordView["status"][] = [];
  const signatures: (StoredSignature | null)[] = [];
  const used = new Set<number>();
  for (const p of want) {
    const rec = candidates.find((r) => !used.has(r.seq) && norm(r.payload) === p);
    if (!rec) return null;
    used.add(rec.seq);
    seqs.push(rec.seq);
    statuses.push(rec.status);
    signatures.push(rec.status === "signed" ? toStoredSignature(rec.signature) : null);
  }
  return { seqs, statuses, signatures };
}

/** Any record of ours yet? (enough to leave awaiting_wallet; full match may take one more poll for BTC). */
export function anyOurRecord(records: readonly SigRecordView[], s0: number, payloadHashes: readonly string[]): number[] {
  const want = new Set(payloadHashes.map(norm));
  return records.filter((r) => r.seq >= s0 && want.has(norm(r.payload))).map((r) => r.seq);
}
