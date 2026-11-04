# vectors/: shared test vectors

These JSON files are the test cases that the Rust contract and the TypeScript mirror in `@satchel/core` both run, so
the two implementations of each rule agree byte for byte. The contract is authoritative; the TS mirror lets the app
refuse a bad request before the wallet opens and lets the buyer's browser recompute what the contract stores. When a
vector fails on one side only, the two sides have drifted.

Every expected outcome is declared by hand from the spec rule, then cross-checked against the TS mirror and, where
one exists, an independent encoder (viem, bitcoinjs-lib, @solana/web3.js). Generation is deterministic: no clock,
no randomness, no network. Design: kb/90 §12.2; file shape: `docs/handoff/core.md` §1.

## Files

| File | What it covers | Generator | Run by |
|---|---|---|---|
| `evm.json` | EVM `sign_for` payloads: type-2 native transfers on the four EVM testnets (C3), USDC transfers (C2), and every refusal class of kb/90 §5.9 and `docs/specs/C1-C2-C3-C7.md` §3.1, including the nonce-gap rule | `tools/vectors/evm.ts` | `contracts/satchel/src/parse/tests.rs`; `packages/core/test/policy.test.ts`, `evm.test.ts` |
| `btc.json` | BTC payloads: accepted 1-, 2-, 4- and 10-input P2WPKH sets (one with a `tb1p` recipient) and every refusal class; preimages cross-checked against bitcoinjs-lib `hashForWitnessV0` | `tools/vectors/btc.ts` | `parse/tests.rs`; `policy.test.ts`, `btc.test.ts` |
| `sol.json` | SOL payloads: a legacy single System Transfer accepted, and every refusal class in the R-24 check order | `tools/vectors/sol.ts` | `parse/tests.rs`; `policy.test.ts`, `sol.test.ts` |
| `msg.json` | C7 message signing: `evm_message` (EIP-191) and `sol_message` (Solana off-chain message v0); EVM hashes cross-checked against viem `hashMessage` | `tools/vectors/msg.ts` | `contracts/satchel/src/parse/fuzz_tests.rs`; `policy.test.ts` |
| `history.json` | C1 history digest: `sig_records` rows → `{sig_count, digest_hex}`, plus the header and per-entry bytes | `tools/vectors/history.ts` | `contracts/satchel/src/feature_tests.rs`; `packages/core/test/features-c1-c7.test.ts` |
| `allowance.json` | C5 spending allowance: what a request debits, raw EVM debits, and the 24 h window | `tools/vectors/allowance.ts` | `contracts/satchel/src/allowance_tests.rs`; `packages/core/test/allowance.test.ts` |
| `derive.json` | MPC key derivation: each token path's addresses, asserted at generation against recorded oracles (kb/10, kb/11, kb/30, kb/32, `research/final-addresses.md`) | `tools/vectors/derive.ts` | the generator's own asserts; no test reads the file |

`evm`, `btc`, `sol`, `msg` and `history` use the schema `satchel-vectors/1`; `derive.json` and `allowance.json`
have their own (`satchel-derive-vectors/1`, `satchel-allowance-vectors/1`). The differential fuzz corpus in
`tools/fuzz/corpus/` is a separate, larger set seeded from these files (`docs/security/fuzzing.md`).

## Regenerating

Never hand-edit these files. Change the generator in `tools/vectors/` (or the rule in `@satchel/core`), then:

```bash
pnpm --filter @satchel/tools vectors          # rewrite vectors/*.json
pnpm --filter @satchel/tools vectors:check    # fail if a committed file differs from what the generator produces
```

`pnpm --filter @satchel/tools test` ends with `vectors:check`, and CI runs it, so a stale file fails the build. After
regenerating, run the contract's unit tests (`cargo test -p satchel --lib`) and `pnpm --filter @satchel/core test`.
