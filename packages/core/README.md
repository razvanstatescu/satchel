# @satchel/core

The shared TypeScript library behind Satchel. It holds everything that must give the same answer in the browser, on
the server, in the release scripts and in the contract's tests:

- **derivation** of each token's Bitcoin, EVM and Solana addresses from the MPC root keys (our own code, no chainsig.js);
- **per-chain transaction builders** that produce the structured, unsigned payloads `sign_for` accepts, then attach
  and verify the MPC signatures;
- **the policy mirror**: a TS copy of the contract's payload classifiers (`contracts/satchel/src/parse/*.rs`), so the
  UI refuses a bad request before the wallet opens and the shared vectors can be cross-checked;
- **the clean-history checker** that the buyer's browser runs before Buy (also the server hint and `tools/e2e`);
- **NEAR call builders** for the Satchel contract and the MPC response decoders;
- formatting helpers, and the brand 1.0 card hue (kept, unused by the 2.0 app).

It is framework-free and isomorphic: `Uint8Array` only, no Node built-ins, no React. `pnpm --filter @satchel/core test`
bundles every export for the browser and fails on any Node built-in. The contract is always authoritative; this
package mirrors it.

The design is in `kb/90-technical-spec.md` (§5.9 classifiers, §7 clean history, §8.2 module layout) and the feature
specs in `docs/specs/` (C1–C7). In comments, "spec §N" means kb/90 §N; D-, H- and R-xx are entries in
`plan/decisions.md`; INV-xx are the invariants in kb/90 §6. `docs/GLOSSARY.md` explains the other IDs.

## Modules (`src/`)

| Path | What it does | Spec |
|---|---|---|
| `bytes.ts` | Hex, base64, UTF-8 and integer byte helpers; strict hex decoding with the contract's rule | kb/90 §5.9 |
| `derive/` | MPC key derivation (secp256k1 for BTC and EVM, ed25519 for SOL), token paths, addresses | kb/10, kb/11, kb/90 §8.2 |
| `policy/` | The TS mirror of `sign_for`'s classifiers (EVM, BTC, SOL, messages), strict RLP, the C5 allowance debits | kb/90 §5.9, C1–C3, C5, C7 |
| `chains/btc/` | Testnet4 P2WPKH: BIP143 preimages, coin selection, the txid collision check, the Esplora client, signature attach | kb/30, kb/90 §8.2 |
| `chains/evm/` | Type-2 transfers and USDC on four EVM testnets (viem), the network registry, gas estimation, broadcast | kb/31, C2, C3 |
| `chains/sol/` | Solana devnet legacy transfers (web3.js 1.99), blockhash expiry, ed25519 verify, broadcast | kb/32 |
| `clean-history/` | The checker: NEAR snapshots from two RPCs, per-record verdicts per chain, the gate by contract role, C1 history digest | kb/90 §7, kb/70 §P3, C1 |
| `near/` | `sign_for` JSON encoders, gas and deposit formulas (`diffConfig`), MPC response decoding, C4–C6 market and C5 allowance call builders | kb/90 §5.3–§5.8, C4–C6, C5 |
| `format/` | Amount and time formatting (round down, U+2212 minus, no-break space before tickers) | kb/80 §Formatting, kb/90 §8.9 |
| `card/` | Brand 1.0 per-token leather hue. Not used by the Satchel 2.0 app | `kb/archive/81-design-tokens-R3.md` |
| `index.ts` | Barrel of the light modules (`bytes`, `derive`, `near`, `policy`, `card`, `format`) | |

## Export map (`package.json`)

Import by subpath so the chain libraries load only where they are needed:

| Import | File |
|---|---|
| `@satchel/core` | `src/index.ts` |
| `@satchel/core/bytes` | `src/bytes.ts` |
| `@satchel/core/derive` | `src/derive/index.ts` |
| `@satchel/core/near` | `src/near/index.ts` |
| `@satchel/core/policy` | `src/policy/index.ts` |
| `@satchel/core/chains/evm` | `src/chains/evm/index.ts` |
| `@satchel/core/chains/btc` | `src/chains/btc/index.ts` |
| `@satchel/core/chains/sol` | `src/chains/sol/index.ts` |
| `@satchel/core/clean-history` | `src/clean-history/index.ts` |
| `@satchel/core/card` | `src/card/index.ts` |
| `@satchel/core/format` | `src/format/index.ts` |

The package ships TypeScript sources (no build step); `apps/web` and `tools` compile them.

## Tests

```bash
pnpm --filter @satchel/core test          # vitest, offline (recorded fixtures), then the browser-bundle check
pnpm --filter @satchel/core typecheck     # tsc on src/ and test/
pnpm --filter @satchel/core test:network  # read-only live checks (MPC derived keys, a live checker run); opt-in
```

- `test/*.test.ts`: one suite per module, plus `features-c1-c7.test.ts`, `review-sr01.test.ts` and `e2e-local.test.ts`.
- `test/fuzz/`: the property-based policy fuzzer; the Rust-vs-TS differential corpus is in `tools/fuzz`
  (`docs/security/fuzzing.md`).
- `test/fixtures/`: recorded read-only answers from testnet4, Sepolia and Solana devnet, and real MPC signatures.
- The shared vectors in `vectors/` (see `vectors/README.md`) are run by these tests and by the contract's Rust tests,
  so the mirror and the contract agree byte for byte.

## More

- `docs/handoff/core.md`: the public API per subpath, the vector file shape, and the decisions taken while building it.
- `docs/testing/core-api.md`: test inventory, edge cases explored, known gaps.
