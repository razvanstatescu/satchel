# tools/: release, testnet and verification scripts

The `@satchel/tools` package: the scripts that exercise the contract on NEAR testnet end to end, perform the keyless
birth of the contract account, generate the shared test vectors, and check a deployment read-only. Design: kb/90
§12.2–§12.4 and §5.16; runbook: `docs/handoff/release.md`.

## Safety model

**Every script that can sign is a dry run by default.** Without `--send` it prints exactly what it would sign (the
signer, the receiver, every action with its gas and deposit, the MPC path and payloads) and stops. With `--send` it
fetches the nonce and block hash, prints the transaction hash, and signs only after a typed `yes`
(`lib/confirm.ts`, `lib/run.ts`). The e2e scripts also accept `--yes`, which skips the prompt under the standing
testnet approval (H-20 (b) in `plan/decisions.md`); the keyless-birth tool refuses `--yes` and piped stdin.

Everything here is testnet only. Keys are read from `~/.near-credentials/` (`lib/credentials.ts`) and never printed.
`--offline` runs the dry run without any RPC. Accounts, endpoints and the contract role come from env vars or flags
(`lib/config.ts`; the full list is in the root `.env.example`). Run a script with `--help` for its options.

```bash
pnpm --filter @satchel/tools e2e:evm                          # dry run
pnpm --filter @satchel/tools e2e:evm --token 1 --to final#2 --value 0.001 --send
```

## Scripts

### `e2e/`: testnet end-to-end (kb/90 §12.4)

| Script (`pnpm --filter @satchel/tools …`) | What it does |
|---|---|
| `e2e/mint.ts` (`e2e:mint`) | `nft_mint` with 0.02 NEAR, then checks the new token's owner and that its three addresses derive |
| `e2e/transfer.ts` (`e2e:transfer`) | `nft_transfer` (1 yocto); checks the new owner, that `sig_count` and the records are unchanged, and that the addresses stay the same |
| `e2e/evm.ts` (`e2e:evm`) | A Sepolia type-2 transfer from a Satchel: `sign_for`, verify the MPC signature recovers to the Satchel address, broadcast, wait for the receipt. `--sign-only` signs and verifies without funds; `--fanout` splits a balance across Satchel addresses |
| `e2e/btc.ts` (`e2e:btc`) | A 2-input testnet4 P2WPKH send: one `sign_for` with both BIP143 preimages, the contract fans out one MPC call per input; attach, verify, check the txid, broadcast. `--sign-only`, `--fanout` |
| `e2e/sol.ts` (`e2e:sol`) | A Solana devnet System transfer, signed right after a fresh blockhash is fetched. `--sign-only` |
| `e2e/message.ts` (`e2e:message`) | C7: `sign_for` an `evm_message` or `sol_message`, then verify the signature from the fresh `sig_records` row |
| `e2e/sale-near.ts` (`e2e:sale-near`) | `list` in NEAR, the clean-history check, `buy` bound to `(listing_id, expected_sig_count)`; checks the new owner and the seller's payout or `proceeds_of` |
| `e2e/sale-usdc.ts` (`e2e:sale-usdc`) | The USDC sale: the two refund paths (wrong `listing_id`, a direct `ft_on_transfer`), then the happy path; `--refund-only`, `--register` |
| `e2e/clean-history.ts` (`e2e:clean-history`) | The scripted clean-history scenario: an unbroadcast EVM signature blocks Buy, broadcasting it unblocks Buy, a stale `expected_sig_count` is refused |
| `e2e/history.ts` (`e2e:history`) | C1, read-only: recompute `history_digest(token_id)` from every `sig_records` row and compare with the on-chain view |
| `e2e/market.ts` (`e2e:market`) | C4 and C6, by `--action`: deposit, withdraw and read NEAR inside a Satchel; make, accept and cancel offers; contract totals |
| `e2e/allowance.ts` (`e2e:allowance`) | C5: `set_allowance`, a delegate's `sign_for` within the cap (`--sign-only`), a refused over-cap request, `revoke_allowance` |

Shared modules (no script of their own): `e2e/common.ts` (views and helpers), `e2e/plans.ts` (pure tx plans for the
NFT and sale flows), `e2e/checker.ts` (runs `@satchel/core/clean-history` from Node as the buyer's browser does),
`e2e/funding.ts` (the per-address amounts for `--fanout`).

### `deploy/`: the keyless birth (kb/90 §5.16)

| File | What it is |
|---|---|
| `deploy/keyless-birth.ts` (`deploy:keyless-birth`) | One transaction from `<team>.testnet`: CreateAccount, Transfer, DeployContract, `new`, `nft_mint` ×7, and no AddKey, so the contract account never has a key. Dry run by default; `--send` needs a typed `yes` in an interactive terminal. The final `satchel.<team>.testnet` birth also needs the human's explicit "yes" (H-15) |
| `deploy/keyless-birth.md` | The runbook: preconditions, review checklist, send, proofs, after-birth steps, failure handling |

### `vectors/`: shared Rust/TS test vectors (kb/90 §12.2)

| File | What it is |
|---|---|
| `vectors/gen.ts` (`vectors`, `vectors:check`) | Writes `vectors/*.json`, or with `--check` fails if a committed file is stale |
| `vectors/evm.ts`, `btc.ts`, `sol.ts`, `msg.ts` | Accepted payloads and every refusal class, per chain and for C7 messages |
| `vectors/history.ts`, `allowance.ts`, `derive.ts` | C1 history digests, C5 allowance debits and windows, MPC derivation |
| `vectors/lib.ts` | Shared helpers for the generators |

See `vectors/README.md` for each output file and who runs it.

### `fuzz/`: differential corpus

| File | What it is |
|---|---|
| `fuzz/gen-corpus.ts` (`fuzz:corpus`) | Writes the Rust-vs-TS differential corpus (one JSONL per chain, with the TS verdicts) that `contracts/satchel/src/parse/fuzz_tests.rs` replays. Method and findings: `docs/security/fuzzing.md` |
| `fuzz/corpus/` | The committed seed corpus and its manifest |

### Read-only checks (no keys, no transactions)

| Script | What it does |
|---|---|
| `check-wasm-imports.sh` | INV-22: fails if the release wasm imports a host function that could add a key, deploy code or delete the account. Needs only bash and python3 |
| `judge-snippets.sh` | Every README "Verify on-chain" command with its expected output. `--print` (no network), `--offline` (plus local wasm hashes), default `--live` against testnet |
| `monitor.sh` | Daily keep-alive checks: the README commands, the no-JS judge pages, the JSON routes, the contract's spare NEAR, the MPC version, the wallet manifest, the endpoints. `--offline`, `--quick` |
| `onboarding-report.ts` (`onboarding:report`) | A read-out of the onboarding survey from Upstash Redis (same env vars as `POST /api/onboarding`) |

### `lib/`: shared by the scripts

| File | What it is |
|---|---|
| `lib/run.ts` | The one path every tool signs through: plan, dry-run stop, nonce and block hash, tx hash, typed `yes`, `send_tx`, long-poll |
| `lib/confirm.ts` | Dry run by default; `--send` plus a typed `yes` |
| `lib/tx.ts` | Transaction plans as plain data; AddKey and other key- or code-changing actions cannot be expressed |
| `lib/near-rpc.ts` | Minimal NEAR JSON-RPC client: FastNEAR then dRPC, views, `send_tx`, a long-poll tracker. Never the deprecated near.org RPC |
| `lib/config.ts` | Accounts, endpoints and contract roles (`dev`, `rc`, `final`), from env vars or flags |
| `lib/credentials.ts` | Loads a signing key from `~/.near-credentials/`; never prints it |
| `lib/outcome.ts` | Reads a NEAR execution outcome: the value, `ERR_*` failures, logs and NEP-297 events |
| `lib/units.ts` | Amount parsing and display in base units |
| `lib/free-balance.py` | The spare-balance verdict for `monitor.sh` (free NEAR minus user escrow) |
| `lib/visible-facts.py` | Checks that facts appear in a page's visible HTML text, as an AI judge's fetch sees it |

## Tests

```bash
pnpm --filter @satchel/tools test        # vitest (test/), then vectors:check
pnpm --filter @satchel/tools typecheck
```

`test/` covers the libraries, the plans and the dry runs of every script (offline, no keys), the keyless-birth plan,
and the shell scripts' offline modes.
