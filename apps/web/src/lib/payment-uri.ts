import { DECIMALS, formatUnits, parseUnits } from "@/lib/format";
import type { UiChain } from "@/lib/view";

/**
 * A4: Request coins — payment URIs a wallet can open pre-filled (Add coins' optional amount field). Pure and
 * vector-tested (test/unit/payment-uri.test.ts has the exact strings): BIP-21 for Bitcoin, EIP-681 for Ethereum
 * Sepolia (chain id 11155111, kb/90), Solana Pay for Solana devnet.
 *
 * Decimals per chain follow the wallet's own native-unit precision (src/lib/format.ts DECIMALS): BTC 8, ETH 18 (the
 * URI's `value` is the integer wei form, never decimal ETH — EIP-681), SOL 9.
 */

export const CHAIN_DECIMALS: Record<UiChain, number> = { btc: DECIMALS.BTC, evm: DECIMALS.ETH, sol: DECIMALS.SOL };

/** Sepolia (kb/90 §1; CLAUDE.md "Chain Signatures"). */
export const EVM_CHAIN_ID = 11155111;

export type AmountValidation = { ok: true; base: bigint; decimal: string } | { ok: false };

/** Parses a user-typed amount for `chain`: no negatives (parseUnits' format already excludes "-"), at most the
 * chain's decimals, and > 0 (a zero-amount request has nothing to ask for). */
export function validateChainAmount(input: string, chain: UiChain): AmountValidation {
  const decimals = CHAIN_DECIMALS[chain];
  const base = parseUnits(input, decimals);
  if (base === null || base <= 0n) return { ok: false };
  return { ok: true, base, decimal: formatUnits(base, decimals, decimals, 0) };
}

/** BIP-21: `bitcoin:<address>?amount=<BTC decimal>`. */
export function buildBip21(address: string, amountBase: bigint): string {
  const decimal = formatUnits(amountBase, DECIMALS.BTC, DECIMALS.BTC, 0);
  return `bitcoin:${address}?amount=${decimal}`;
}

/** EIP-681: `ethereum:<address>@<chainId>?value=<wei integer>` (never decimal ETH). */
export function buildEip681(address: string, amountBase: bigint): string {
  return `ethereum:${address}@${EVM_CHAIN_ID}?value=${amountBase.toString()}`;
}

/** Solana Pay (transfer request): `solana:<address>?amount=<SOL decimal>`. */
export function buildSolanaPay(address: string, amountBase: bigint): string {
  const decimal = formatUnits(amountBase, DECIMALS.SOL, DECIMALS.SOL, 0);
  return `solana:${address}?amount=${decimal}`;
}

const BUILDERS: Record<UiChain, (address: string, amountBase: bigint) => string> = { btc: buildBip21, evm: buildEip681, sol: buildSolanaPay };

/** The payment URI a wallet opens pre-filled, for the given chain, address and validated base-unit amount. */
export function buildPaymentUri(chain: UiChain, address: string, amountBase: bigint): string {
  return BUILDERS[chain](address, amountBase);
}
