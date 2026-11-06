# Satchel sprint features: adversarial security review

> **Status (2026-11-04): no open finding needs a code change.** The review below is as written on 2026-10-29; the
> status of each finding today:
>
> | ID | Severity | Status now | Where |
> |---|---|---|---|
> | M-01 | Medium | **Fixed** 2026-10-29 | `ensure_solvent` (`contracts/satchel/src/market.rs`), called at the end of `nft_transfer` (`lib.rs`), `execute_sale` (`sale.rs`) and `accept_offer` (`offers.rs`); `tools/monitor.sh` check 4 subtracts `market_totals` escrow; the proof `tests/tests/review.rs::m01_…` is un-ignored and passes. Merged as `778172a` (`plan/progress/feature-sprint.md`, 21:40Z) |
> | L-01 | Low | Accepted, documented | `docs/specs/C5.md` §3 |
> | L-02 | Low | **Fixed** (app) 2026-10-29 | escaped text, hex and a digest flag: `apps/web/src/lib/message.ts`, `components/Clean.tsx`; merged with the C2/C3/C7 UI (`2f2cda8`) |
> | L-03 | Low | Accepted; docs corrected | spec `docs/specs/C1-C2-C3-C7.md`, kb/90 §14 A-22 |
> | L-04 | Low | **Fixed** (core) | `evmConfirmationsByChain`, `packages/core/src/clean-history/evm.ts` |
> | L-05 | Low | **Fixed** (app) 2026-10-29 | `cleanSources` passes `evmByChain` and `mapCoreReport` maps `chain_id`, `erc20` and messages (`apps/web/src/lib/data/clean-live.ts`); merged in `2f2cda8` |
> | I-01–I-09 | Info | Measured or accepted | as in the table below. I-03 is the same issue as the test audit's AUDIT-03 (documented, no change) |
>
> Later contract changes (AUDIT-01/-02/-04 on 2026-10-30, Q-03/Q-04 on 2026-10-31) came from the test audit, not this
> review: [`docs/testing/contract.md`](../testing/contract.md). The v1 review is [`contract-review.md`](contract-review.md).
> Shorthand: [docs/GLOSSARY.md](../GLOSSARY.md).

Reviewed on 2026-10-29. Scope: the whole diff `5c522f9..2094200` (the audited baseline of `contract-review.md`, wasm
`aea0b2e9…`, to `main` with every sprint feature merged) over `contracts/`, `tests/`, `packages/core/src/{policy,
clean-history,near}`, `vectors/` and `tools/vectors/`:

- C1 `history_digest`; C2 USDC (ERC-20 `transfer`) on EVM; C3 four EVM testnets with per-chain nonce state; C7 EIP-191
  and Solana off-chain message signing (`docs/specs/C1-C2-C3-C7.md`);
- C5 delegated spending allowance (`docs/specs/C5.md`);
- C4 offers and C6 NEAR/FT assets held inside a token (`docs/specs/C4-C6.md`).

The code was checked against kb/90 (the INV-xx invariants, clean history), the kb/70 threat model and the three specs.
Sandbox runs used `cargo near build non-reproducible-wasm` of `2094200`: **422,562 B, sha256
`bd5d8e0164aea488896a7a45f0f69ec0849d3c1049bf0013a3599283d0d4a1a5`**, INV-22 OK (27 imports; promise actions
FunctionCall and Transfer only). No contract source was changed by this review. The changes are: one new sandbox file
(`tests/tests/review.rs`), the L-04 fix in the checker (`packages/core`), and documentation corrections (L-01, L-03).

## Summary verdict

**There are no Critical or High findings. There is one Medium finding (M-01). Its fix is in progress on
`fix/m01-solvency`; C4/C6 should ship only with it.** *(It shipped with it: M-01 was fixed and merged on 2026-10-29.)*

The properties behind the product promise hold for every new path:
- **No coin moves without a record.** Every new request kind (USDC transfer, three more EVM chains, two message
  kinds, delegated signing) still goes through `sign_for`, which classifies the exact bytes, writes the record and
  charges its storage in the same receipt that creates the MPC promise. Only `sign_for` addresses the MPC.
- **No message can be a transaction** on any chain the buyer checks (§ "C7" below). A message can't move ETH, USDC,
  BTC or SOL.
- **C3 nonce state is per chain, and EIP-155 binds each signature to its chain.** There is no cross-chain replay.
- **C5 debits are worst-case amounts** computed from the classified bytes, fees included, with checked u128
  arithmetic. Every ownership path clears allowances. Listing pauses delegates. Delegates can't sign messages and
  have no owner or market powers.
- **C4/C6 escrow is exactly-once and debit-first.** Every re-credit overwrites a slot that already exists (the S-01
  pattern), every callback is `#[private]`, can't panic and acts only on exactly one promise result (S-13).
  `accept_offer` binds `sig_count`, `inside_epoch`, the quiet period and the expiry.
- **The TS mirrors agree with Rust**: 400,000 fresh differential cases, 0 disagreements (§ "Test runs").
- **The buyer's checker fails closed** on every new shape: message records are non-blocking only when their payload
  matches; an L2 record without providers, on a wrong-chain provider or with disagreeing providers is `unknown`; code
  at the address on any judged chain is `unsafe`.

**The main weakness is money accounting under contract-paid storage (M-01).** Since C4/C6 the contract's balance also
holds user escrow, but the S-02 class of storage the contract pays for (a new holder's per-owner set on
`nft_transfer` and `buy`) is still taken from that same balance without a check. Once the contract's own surplus is
gone, those transfers silently spend escrowed NEAR, I-M1 breaks, and the last withdrawal fails. The sandbox proof
reproduces it.

The other findings are a checker depth that was too shallow on L2s (fixed), a web wiring gap that blocks Buy for any
Satchel that ever signed on an L2 (fails closed), documentation of two bounded gaps, and a corrected gas figure.

## Findings

Severity combines impact and likelihood for the **locked testnet contract** (and, for checker or app items, the
hosted app). IDs M-01, L-01, L-02 and L-03 are the ones recorded provisionally in `plan/progress/feature-sprint.md`
(18:20Z); the review's working IDs are in brackets.

| ID | Severity | Status | Location | Description | Exploit scenario | Fix recommendation |
|---|---|---|---|---|---|---|
| **M-01** | **Medium** | **Fixed after the review** (in progress on `fix/m01-solvency` when written; merged 2026-10-29) | `lib.rs:248-255` (`nft_transfer`), `sale.rs:39-56` (`execute_sale`), `offers.rs:270-308` (`accept_offer`); `tools/monitor.sh` | **Contract-paid storage can consume user escrow.** NEP-171 transfers carry 1 yocto, so a first-time holder's per-owner set (≈ 250 B, S-02) is paid from the contract's balance. Before C4/C6 that balance was the contract's own (code stake + birth funding). Now it also holds `Σ inside.near + Σ open NEAR offers + Σ storage credit + Σ proceeds(near)`, and nothing checks I-M1 at the end of these paths. When the contract's surplus is exhausted, each such transfer spends escrow. The monitor's free-balance check also counts escrow as free, so it would not alert. | 1. A griefer drains the surplus with S-02 transfers (≈ 0.0049 NEAR spent per 0.0025 NEAR drained), or it runs low by neglect. 2. Someone deposits NEAR inside a Satchel or makes NEAR offers. 3. More transfers to new holders go through and eat the escrow. 4. The owner's `withdraw_near` of the full balance fails with `LackBalanceForState`, and so does the last offer refund, until someone donates NEAR to the contract. **Proof:** `review.rs::m01_contract_paid_storage_never_consumes_escrow` (ignored until the fix lands): `inside = 0.9993 NEAR`, free balance `1.00055 → 0.99347 NEAR` after 3 transfers (none refused), then `withdraw_near` fails `LackBalanceForState { amount: 0.00583 NEAR }`. | Keep a `proceeds_near` total next to `market_totals`, and assert `free ≥ inside_near + offers_near + storage_credit + proceeds_near` (`ensure_solvent`) at the end of every path that can grow contract-paid storage: `nft_transfer`, `execute_sale` (`buy`, USDC `buy`) and `accept_offer`. A refusal then turns the griefing into a recoverable DoS of transfers (anyone can top up) instead of a loss of escrow. `tools/monitor.sh` must subtract `market_totals` (and NEAR proceeds) from the free balance it alerts on. Un-ignore the proof once the fix lands. |
| L-01 [SR-03] | Low | **Documented** (`docs/specs/C5.md` §3) | `allowance.rs:364-395` (`evm_debits`) | **The C5 EVM debit leaves out the OP-stack L1 data fee.** On Base Sepolia and OP Sepolia the sender also pays an L1 data fee on top of `gas_limit × max_fee_per_gas`. The contract can't see it, so the "worst case" is not strictly worst on those two chains. | A delegate's sends on Base or OP cost the Satchel slightly more ETH than its cap shows. The delegate can't inflate the fee: it depends on the L1 gas price and the compressed tx size, which the classifier caps at 160 B (an estimated ≈ 3 × 10⁻⁷ ETH per tx at a 50 gwei L1 base fee), and there are at most 32 debits a day. Arbitrum's L1 component is inside `gas_limit`, so its debit is exact. | Accept and document (done). An owner who needs a strict bound sets the ETH cap slightly lower. If ever needed, a fixed per-request ETH surcharge on chains 84532 and 11155420 would close it. |
| L-02 [SR-04] | Low | **Proposed (UI hardening)**; built 2026-10-29 | `parse/msg.rs`; the Buy tab's message list | **What an EIP-191 message means off-chain.** C7 signs `personal_sign` of any valid UTF-8 body of 1–1,024 bytes. Off-chain verifiers can give that signature meaning the checker doesn't see: a log-in (SIWE), an account at a custodial dapp, a Safe owner signature (`eth_sign` type, which ecrecovers `personal_sign` of a 32-byte safeTxHash), or a 0x `EthSign` order. A 32-byte hash is rarely valid UTF-8, but it can be ground until it is (≈ 2³² work for all-ASCII, less with multi-byte sequences). None of this can move the ETH or USDC a buyer checks: those move only by a transaction (prefix `0x02`/RLP), a 7702 authorization (`0x05`), `transferFrom` under an allowance (the contract never signs `approve`), or an EIP-712 permit (`0x19 0x01`). | A seller signs a message that a third-party service treats as authority over assets *outside* the Satchel's checked balances (for example, the Satchel's address is an owner of a Safe), then sells. The buyer's checker lists the message as non-blocking. A display trick (bidi or control characters) could also disguise what was signed. | In the Buy tab, show every message with its hex next to the decoded text, escape control and bidi characters (U+202A–202E, U+2066–2069, C0/C1), and flag bodies that look like digests (exactly 32 bytes, or high entropy) with "this looks like a hash, not readable text". Keep listing every message. The contract needs no change. |
| L-03 [SR-05] | Low | **Measured; docs corrected** (spec §5.1, kb/90 §14 A-22) | `history.rs:33-44` | **`history_digest`'s ceiling is lower than documented for message-heavy histories.** The spec said "≈ 0.1 Tgas per record, up to roughly 2,500 records". Measured as a 300 Tgas call: **≈ 0.092 Tgas per small record** (3,000 fit at 276 Tgas, 4,000 don't) and **≈ 0.133 Tgas per 1,024-byte message record** (2,000 fit at 266 Tgas, 2,500 don't). A cross-contract caller gets less than 300 Tgas. | An owner with a long, message-heavy history (≈ 28 NEAR of record storage for 2,250 maximal messages) makes the digest uncomputable in one call, so a marketplace that binds orders to `(sig_count, digest)` can't use it for that token. The buyer's checker doesn't depend on the digest (it pages `sig_records`), so clean history is unaffected. Delegates can't sign messages and are capped at 32 debits a day. | Accept with the corrected numbers (done): budget ≈ 1,500 records cross-contract, and page `sig_records` and hash client-side with `historyDigest` beyond that. A contract-side fix (a running digest kept in `TokenState`) is not worth the risk before the freeze. |
| L-04 [SR-01] | Low | **Fixed** (`packages/core`) | `clean-history/evm.ts` (`checkEvm` tag), `types.ts` (`TESTNET_POLICY`) | **The checker used one EVM confirmation depth (3 blocks) on every chain.** That is ≈ 36 s on Sepolia, but ≈ 6 s on Base and OP Sepolia and < 1 s on Arbitrum Sepolia. `spent` verdicts are cached as final (`VerdictCache`), so an L2 reorg of the unsafe head (sequencer equivocation or a batch-posting failure) could revive a nonce after the record was judged dead. | A seller broadcasts a transaction on Base that the sequencer includes and then drops in a reorg. The buyer's check runs inside that window, sees the nonce as used at `latest − 3`, caches `spent`, and enables Buy. The seller's still-valid signature can then spend the Satchel's Base ETH or USDC after the sale. | **Done:** `Policy.evmConfirmationsByChain` with defaults Base 30, OP 30, Arbitrum Sepolia 240 blocks (≈ 60 s each; Sepolia keeps 3). The depth used is `evmDepth = max(evmConfirmations, perChain)`, so an override can deepen but never weaken the rule. The report carries `policy.evm_by_chain` when non-Sepolia records were judged. |
| L-05 [SR-02] | Low | **Proposed (web lane)**; fixed 2026-10-29 | `apps/web/src/lib/data/clean-live.ts:67-76` (`cleanSources`), `:134-185` (`mapCoreReport`) | **The app gives the checker no L2 providers, and its report mapping predates C2/C3/C7.** `cleanSources` passes only `evm` (Sepolia), never `evmByChain`, so every record on Base, Arbitrum or OP Sepolia is `unknown / providers_down`, and **any Satchel that ever signed on an L2 can never be bought in the app**. It fails closed, but C3 sends from the app make tokens unsellable. `mapCoreReport` also ignores `chain_id`, `erc20`, `message_kind` and `message_text` (a message item shows as "Ethereum · nonce ?"), and labels an unsafe L2 account as "keys". | A user sends USDC on Base from the app, later lists the Satchel, and no buyer can pass the gate. The Buy tab can't show what a message said, which defeats L-02's purpose. | Build `evmByChain` from `EVM_NETWORKS[id].rpcs` (two keyless, CORS-enabled RPCs per chain; spec §8.1). In `mapCoreReport`, show the chain name from `chain_id`, the USDC amount and recipient, and the message text (with L-02's escaping), and pick the unsafe account by its `chain_id`. Add a web test with one record per chain. |
| I-01 [SR-06] | Info | Measured | `offers.rs:270-308` | **`accept_offer` charges no storage, but it frees more than it grows.** Measured: an accept by a first-time named holder is **−143 B** net (the freed offer record and index entries outweigh the new per-owner set and the proceeds slot). The contract-paid growth that matters is `nft_transfer` and `buy` to first-time holders (+250 B for a 64-char id), which is M-01. | — | None beyond M-01's `ensure_solvent`, which should still cover `accept_offer` (a long implicit offerer id can make it net positive). Proof: `review.rs::sr06_accept_offer_storage_delta`. |
| I-02 | Info | Accepted | `offers.rs:132-145` | **Dust offers.** Offers have no per-token cap (on purpose, spec §3.5) and no minimum amount, so anyone can spread 1-yocto offers (20 per account, each ≈ 0.004 NEAR of storage they pay for) and clutter `offers_for`. Gas per accept or cancel stays O(1). | A UI that lists every offer pages through spam. | The UI should sort by amount, hide offers below a threshold, and re-read `offer(id)` before acting. |
| I-03 | Info | Accepted | `market.rs:133-145` | **`withdraw_storage_credit` has no callback.** If the plain transfer fails (the account was deleted after calling), the credit is gone and the NEAR stays in the contract. | Self-inflicted only. | Optional: add `on_payout`-style re-credit. Not worth a pre-freeze change. |
| I-04 | Info | Accepted | `market.rs:113-131` | **`prepay_storage(account_id)` can credit an account that can never withdraw** (the contract itself, the MPC, or an implicit id nobody holds). That credit is locked. | User error. | The UI should only prepay for the signed-in account. |
| I-05 | Info | Accepted | `inside.rs:162-190` | **A failed withdrawal is re-credited to the token, whoever owns it by then.** Withdrawals are refused while listed, but in the ≈ 2 blocks before `on_inside_withdraw` runs the owner can transfer, list or sell the token; the re-credit then lands in the new owner's Satchel. | Self-inflicted by the withdrawing owner; it never harms a buyer (balances only grow). | Document; the UI should wait for the withdrawal's result before transferring or listing. |
| I-06 | Info | Accepted | `market.rs:15-16`, `sale.rs:187-204` | **wrap.testnet is trusted only for its own token.** A malicious upgrade of wrap.testnet could fake deposits of wNEAR or fake failed transfers (double re-credits), but it can't buy, make offers (both require the predecessor to be USDC) or touch NEAR or USDC balances. | — | None. The Satchel contract must be storage-registered with wrap.testnet before FT deposits work (ops). |
| I-07 | Info | Accepted | `evm_nonces.rs` | **A plain ETH send to the OptimismPortal on Sepolia bumps the Satchel's L2 nonce.** OP-stack deposits from an EOA keep their `from`, and they increment its L2 nonce. Only a Satchel-signed Sepolia send (owner, or a delegate with a Sepolia ETH cap) can do this; the ETH arrives on the L2. The contract's per-chain maximum then lags the real nonce, so the next usable L2 tx needs one catch-up record per bumped nonce (the nonce-gap rule allows `max + 1`). The checker reads the bumped nonce correctly: those records are dead. | A delegate sends ETH to the portal a few times; the owner signs that many filler records on Base before the next real send. | Document. The UI can show "nonce on chain ahead of the Satchel's records" and offer the catch-up. |
| I-08 | Info | Accepted | `lib.rs:84-97` | **The new `market` field changes the root state layout.** dev1 can't be redeployed in place with this wasm (R-41); rc and the final contract are born fresh, so they are unaffected. | — | Use a fresh `devN` for the sprint wasm. |
| I-09 | Info | Accepted (ops) | wasm size | **The wasm grew from 290,504 B to 422,562 B**, ≈ 4.23 NEAR of code stake. The rc birth's 10 NEAR leaves ≈ 5.7 NEAR free, close to the monitor's 5 NEAR warning; with M-01 the free balance must also exclude escrow. | — | Keep the final birth at 20 NEAR (D-34); consider 15 NEAR for rc. |

## Proof tests

| ID | File · test | Run | Result (2026-10-29) |
|---|---|---|---|
| M-01 | `tests/tests/review.rs::m01_contract_paid_storage_never_consumes_escrow` (`#[ignore]` until `fix/m01-solvency` landed; un-ignored and passing since) | `cargo test -p satchel-tests --test review -- --include-ignored --nocapture` | **fails today**, as expected: `I-M1 broken: escrow 999300000000000000000000 > free 993466742680863700000003 after contract-paid transfers`; `withdraw_near` → `LackBalanceForState`. It passes once the transfers are refused or the escrow stays withdrawable |
| L-03 | `review.rs::sr05_history_digest_gas_ceiling` (pins ≥ 2,500 small records) | same | passes; prints the per-step gas below |
| I-01 | `review.rs::sr06_accept_offer_storage_delta` | same | passes: accept `−143 B`, transfer `+250 B` |
| — | `review.rs::sr_injected_history_reads_back` (the `patch_state` injection reads back like a real history) | same | passes |
| L-04 | `packages/core/test/review-sr01.test.ts` (6 tests: defaults; never shallower than global; a Base nonce used 10 blocks ago is `settling`, not `spent`, and nothing is cached, while the old depth-3 behaviour said `spent`; Arbitrum at 100 vs 300 blocks; Sepolia unchanged; end to end through `checkCleanHistory`, Buy blocked while settling, `policy.evm_by_chain` reported) | `pnpm --filter @satchel/core exec vitest run test/review-sr01.test.ts` | passes |

`history_digest` gas, measured with records injected by `patch_state` (300 Tgas function call; the sandbox's RPC view
accepted every size, so the call is the binding measurement):

| Records | 52-byte EVM tx | 1,024-byte message |
|---|---|---|
| 250 | — | 34.8 Tgas |
| 500 | 47.3 | 67.8 |
| 1,000 | 92.9 | 133.9 |
| 1,500 | — | 200.6 |
| 2,000 | 184.4 | 266.4 |
| 2,500 | 230.4 | **out of gas** |
| 3,000 | 276.2 | — |
| 4,000 | **out of gas** | — |

## What was checked and found sound

**C2 (USDC on EVM)**
- `data` is empty, or exactly 68 bytes: selector `a9059cbb`, 12 zero bytes, the 20-byte recipient, 16 zero bytes,
  and a 16-byte amount. So the encoding is canonical and the amount is below 2¹²⁸. No other selector, length or
  padding is accepted (`approve`, `transferFrom`, `permit`, multicalls).
- `to` must be the Circle testnet USDC **of this tx's `chain_id`**, and `value` must be the canonical empty string.
  All four addresses match the spec table.
- A USDC record is dead once its nonce is used, like any EVM tx (a reverted transfer still uses the nonce). The view
  and the event derive `erc20` from the exact recorded bytes; nothing is stored twice.

**C3 (four EVM testnets)**
- The chain id is checked for width (≤ 8 bytes) before the allowlist. Sepolia keeps `TokenState.max_evm_nonce`; the
  other chains use `LookupMap<(TokenId, u64), u64>` under `StorageKey::EvmNonces` (appended last). The first write
  per (token, chain) happens after the storage snapshot, so the requester pays for it.
- **No cross-chain replay:** the same key signs on all four chains, but EIP-155/1559 put `chain_id` inside the signed
  payload, so a signature is valid on exactly one chain. The nonce-gap rule is per chain (contract and TS
  `maxSignedEvmNonce(records, chainId)`), and message records never touch nonce state.
- The checker groups records by `detail.evm.chain_id`, re-derives the chain id from `unsigned_tx` (a mismatch is
  `record_inconsistent`), guards each provider with `eth_chainId`, reads both counts at the same tag on two
  providers, and runs `eth_getCode` on Sepolia always and on every other chain that has records. A chain without
  records needs no code check: code at an EOA address needs a 7702 authorization (prefix `0x05`), which the contract
  never signs.

**C7 (message signing): no message parses as a transaction**
- The caller sends only the body (1–1,024 bytes, strict hex, valid UTF-8); the contract builds the signed bytes
  itself. Raw hashes, EIP-712 and `eth_sign` are unreachable.
- **EVM:** the signed digest is `keccak(0x19 ‖ "Ethereum Signed Message:\n" ‖ len ‖ m)`. A type-2 tx hashes
  `0x02 ‖ …`, a legacy tx an RLP list (first byte ≥ `0xc0`), a 7702 authorization `0x05 ‖ …`, typed data
  `0x19 0x01 ‖ …`. A match needs a keccak collision. The EVM key is domain 0, path `satchel/{id}/evm`; the BTC key is a
  different path, so an EVM message signature never verifies under the BTC key.
- **Solana:** the signed bytes start with `0xff`. A legacy message starts with `num_required_signatures` < `0x80`,
  and a versioned one with `0x80 | version`. Version 127 (`0xff`) is rejected explicitly by Solana's deserializer as
  "off-chain messages are not accepted". The header matches solana-sdk `OffchainMessage` v0 (16-byte domain,
  version 0, format 0 for printable ASCII else 1, `u16le` length), and format 2 can't occur under 1,024 bytes.
- **NEAR:** the Solana key is also the Satchel's NEAR implicit account key. A NEAR transaction signs
  `sha256(borsh(tx))` and NEP-413 signs `sha256(tag ‖ …)`, while the off-chain message is signed raw by Ed25519. A
  match would need a sha256 preimage that starts with `0xff "solana offchain"`. And `sign_for` never signs NEAR
  transactions.
- The record stores the body; the checker recomputes `keccak256(eip191(m))` or `sha256(offchain(m))` and requires
  the record's chain to match the kind, else `unknown`. A pre-C7 checker sees an unknown detail and fails closed.

**C1 (history digest)**
- It covers only immutable fields (status and signature are excluded, so late callbacks don't change it). The header
  binds the contract account, the token id and the count; borsh makes the encoding unambiguous. A missing seq aborts
  instead of being skipped. Rust, TS and the sandbox's independent encoder agree (`vectors/history.json`).

**C5 (delegated allowance)**
- `authorize_signer` matches `SignRequest` exhaustively, and `request_debits` matches `SigDetail` exhaustively.
  Messages are refused for delegates (`ERR_ALLOWANCE_KIND`) before any debit; EVM calldata other than the 68-byte
  transfer is refused whatever the classifier accepts.
- **Debits are worst-case from the classified bytes:**
  - EVM: `value + gas_limit × max_fee` (the effective gas price can't exceed `max_fee`), plus the ERC-20 amount as a
    separate asset;
  - BTC: outputs not paying `0014‖pkh`, plus the fee `Σ inputs − Σ outputs`. BIP143 commits to each input's amount,
    so understating it yields an invalid signature;
  - SOL: `lamports + 5,000` (one signature; compute-budget instructions are refused).
  - All checked u128; an overflow is refused.
- **Change detection can't be abused.** A wrong scriptCode pkh, including the hash of the uncompressed form of the
  token key, only yields signatures that can't spend the Satchel's P2WPKH coins. The classifier requires all
  preimages to share one pkh.
- **The window is a true sliding window.** An entry counts iff `now < at + 24 h`, entries are pruned on every touch,
  and there are at most 32 entries per allowance. Re-setting an allowance keeps the in-window spends.
- **Every ownership path clears allowances in the same receipt:** `nft_transfer`, `execute_sale` (NEAR and USDC
  `buy`) and `accept_offer` all call `on_owner_change`. `grep internal_transfer|nft_transfer` finds no other path.
  The owner binding is a second, independent guard.
- Listing pauses delegates (`ERR_FROZEN` runs after `authorize_signer`, before any write). Delegates pay their
  records and spend entries (inside the measured storage), and get `ERR_NOT_OWNER` from every owner method.
- The TS mirror (`allowanceDebits`, `applyDebits`) agrees: `vectors/allowance.json` plus the randomized window oracle
  (20,000 TS runs and 5,000 proptest cases per property).

**C4/C6 (offers, inside assets)**
- **Withdrawals debit first**, bump `inside_epoch`, and are refused while listed, so a listed Satchel's inside
  balances can only grow. `on_inside_withdraw` re-credits only on `Failed`, on the same token, by exactly `amount`,
  into slots that already exist.
- **An offer's escrow leaves exactly once.** `take_offer` removes it in the same receipt as the payout (accept) or
  the refund (cancel), and a failed transfer is credited to the reserved `proceeds` slot. A concurrent accept and
  cancel can't both succeed.
- **`accept_offer` binding:** the offer must be unexpired; `sig_count` and `inside_epoch` must equal the bound
  values; the quiet period (`last_sign_height + 250`) must be over; the caller must be the current owner; and the
  offerer can't be the owner. A listed token is delisted in the same receipt. Expiry is disjoint
  (`accept: now < expires`, `cancel by anyone: now ≥ expires`).
- **A USDC buy with open offers or inside balances is safe.** The buy binds `(listing_id, sig_count)`, and inside
  balances only grow while listed. Other offers stay bound to the same state and may be accepted by the new owner.
- `ft_on_transfer` checks the allowlist first. `buy` and `offer` require USDC; any refusal panics, so the FT refunds
  in full. Storage inside `ft_on_transfer` is paid only from the actual FT sender's credit.
- **Storage credit:** `charge_credit` debits by the measured delta and lowers `totals.storage_credit`. The totals
  match the per-entry sums (I-M2, proptest against a model).
- `market_totals`, I-M1 and I-M3 hold in every existing sandbox scenario. M-01 is the case those scenarios don't
  cover: contract-paid storage after the surplus is gone.

**Access control, callbacks, ordering**
- **Access control on every new method:**
  - `set_allowance`, `revoke_allowance`, `withdraw_near`, `withdraw_ft` and `accept_offer` are owner-only;
  - `cancel_offer` is the offerer, or anyone after expiry;
  - `on_inside_withdraw` is `#[private]`;
  - the mutating methods need a deposit, so function-call keys can't call them;
  - `withdraw_*`, `accept_offer`, `cancel_offer`, `revoke_allowance` and `withdraw_storage_credit` need exactly 1
    yocto.
- **No new callback can panic.** They use saturating arithmetic, `promise_result_checked` with `max_len` 0 (only
  `Failed` re-credits), a log-only no-op unless there is exactly one result, and no new storage.
- **Detached promises:** state is final before every transfer is created (debit-first, remove-first, zero-first). A
  re-credit lands on the slot the debit came from.

## Test runs (2026-10-29, worktree `review/sprint`)

| Suite | Result |
|---|---|
| `cargo test -p satchel --lib` | **172 passed**, 0 failed, 0 ignored |
| `cargo test -p satchel-tests` (full sandbox, nearcore 2.13.4) | **115 passed, 0 failed, 1 ignored** (the M-01 proof). Per file: allowance 8 · features 5 · gas 4 · harness 7 · market 16 · mock_signer 9 · nft 2 · release 2 · review 3 (+1 ignored) · sale 10 · security 7 · sign 22 · storage 4 · transfer 7 · usdc 7 · views 2 |
| `pnpm --filter @satchel/core test` | **465 passed** (16 files; 459 before L-04's 6 tests); `typecheck` clean; the web app's typecheck is clean too |
| `pnpm --filter @satchel/tools test` | **72 passed** (5 files; every vector file regenerates byte-identical) |
| Differential fuzz (`docs/security/fuzzing.md` §5), fresh corpus `--n 100000 --seed 20261029` | **400,000 cases, 0 disagreements**: EVM 17,478 accepted + 82,522 refused; BTC 25,302 + 74,698; SOL 25,077 + 74,923; messages 49,373 + 50,627 |
| TS fuzz + allowance (`FUZZ_CASES=20000`) | 73 passed |
| `PROPTEST_CASES=5000 cargo test --release allowance_tests` | 30 passed |
| `PROPTEST_CASES=1000 cargo test --release market_tests::prop` | 3 passed |

## Per-feature verdict

*Every condition below was met on 2026-10-29 (M-01, L-02 and L-05 fixed; L-01 and L-03 documented), and all of C1–C7
are merged into `main` (`plan/progress/feature-sprint.md`).*

| Feature | Verdict | Condition |
|---|---|---|
| C1 `history_digest` | **Ship** | L-03: the documented ceiling is corrected; marketplaces budget ≈ 1,500 records cross-contract |
| C2 USDC transfers | **Ship** | — |
| C3 four EVM testnets | **Ship** (contract) · **ship-with-fixes** (app) | L-04 is fixed in core; L-05: the app must pass `evmByChain` before it offers L2 sends, or those Satchels become unsellable in the app |
| C5 spending allowance | **Ship** | L-01 documented |
| C7 message signing | **Ship** | L-02: the Buy tab shows hex next to escaped text and flags digest-like bodies (with L-05's mapping) |
| C4 offers, C6 inside assets | **Ship-with-fixes** | M-01's `ensure_solvent` and the monitor change must land before the freeze; re-run the M-01 proof un-ignored. M-01 is Medium, so the Nov 8 12:00 UTC cut rule doesn't force a cut, but C4/C6 should not ship without the fix |
