import { estimateVsize, outputType, recipientType, type Utxo } from "@satchel/core/chains/btc";
import { MAX_BTC_INPUTS } from "@satchel/core/policy";

/**
 * Empty the Satchel (A3, plan/feature-ideas.md A3; kb/90 §5.11, §8.9): planning only. `prepareSend({amount:"max"})`
 * already sweeps the 10 largest confirmed UTXOs in one `sign_for` (core's `selectSweep`); a balance that needs more
 * than 10 inputs needs more than one BTC send, confirmed one at a time (an unconfirmed input can't be spent again
 * until the mempool/UTXO index drops it). This module only plans the batches for the review screen: it never builds
 * a transaction (that stays in `lib/chains/send.ts`, re-run per batch).
 */

export interface SweepBatch {
  /** The UTXOs this batch would spend, largest-first (the same order `selectSweep` picks). */
  inputs: Utxo[];
  /** Sum of the batch's UTXOs, before the network fee. */
  sats: bigint;
}

/** Group confirmed UTXOs into batches of at most `maxInputs` (default the contract's limit), largest-first. */
export function planBtcSweep(utxos: Utxo[], opts: { maxInputs?: number; allowUnconfirmed?: boolean } = {}): SweepBatch[] {
  const max = Math.min(opts.maxInputs ?? MAX_BTC_INPUTS, MAX_BTC_INPUTS);
  const pool = utxos
    .filter((u) => opts.allowUnconfirmed || u.confirmed)
    .slice()
    .sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1));
  const batches: SweepBatch[] = [];
  for (let i = 0; i < pool.length; i += max) {
    const inputs = pool.slice(i, i + max);
    batches.push({ inputs, sats: inputs.reduce((s, u) => s + u.value, 0n) });
  }
  return batches;
}

/** A rough fee estimate for a batch (for the review screen only; the real send recomputes it from live fee rates). */
export function estimateBatchFee(batch: SweepBatch, to: string, feeRate: number, network: "testnet" | "mainnet" = "testnet"): bigint {
  const type = recipientType(to, network);
  const vsize = estimateVsize(batch.inputs.length, [type]);
  return BigInt(Math.ceil(vsize * feeRate));
}

/** Net sats a batch would deliver after its fee (never below zero; a batch too small to clear dust is 0). */
export function estimateBatchNet(batch: SweepBatch, to: string, feeRate: number, network: "testnet" | "mainnet" = "testnet"): bigint {
  const fee = estimateBatchFee(batch, to, feeRate, network);
  const net = batch.sats - fee;
  return net > 0n ? net : 0n;
}

export { outputType };
