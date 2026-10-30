# Parser fuzzing: the §5.9 classifiers

Target: `contracts/satchel/src/parse/{hex,rlp,evm,btc,sol}.rs`, the code that decides what the MPC signs. The rules are
spec `kb/90-technical-spec.md` §5.9 and the error codes are §5.15. Reference: the TS mirror in `packages/core/src/policy/`.
Run date: 2026-10-23. The contract logic was not changed.

**Result:** across about 7 million generated inputs there were no panics, no wrong accepts and no wrong refusals.
Every accepted request was checked against the independent oracle and the §5.9 invariants, and it passed. There is one
Rust/TS disagreement class (F-01, low), and it only changes an error code: both sides still refuse. There are two
informational notes (F-02 and F-03). With the fuzzing changes alone the wasm is unchanged (`bec41e44…a584`); see W-01
for why the hash in the shared tree moved.

## 0. Fix pass (2026-10-23)

| ID | Status | What changed |
|---|---|---|
| F-01 | **Fixed (option a)** | The contract keeps its RLP depth limit (the safer choice). Spec §5.9 now states it: the outer list is depth 0, any item deeper than 16 is `ERR_EVM_RLP`, and this is found while decoding the structure, so before every policy rule. The TS mirror applies the same limit (`policy/rlp.ts` `RLP_MAX_DEPTH`). `f01_deep_access_list_error_code_matches_spec` now asserts the spec (un-ignored, with a depth-16 boundary case). `known_disagreement` maps nothing. Three new shared vectors: `rlp_nested_deeper_than_16`, `rlp_nested_exactly_16_access_list`, `rlp_nested_deeper_than_16_chain_1` |
| F-02 | **Fixed (spec)** | §5.9 SOL rule 3 now lists `1 + num_readonly_unsigned ≤ num_keys` → `ERR_SOL_MALFORMED`. No code change |
| F-03 | **Accepted (Info)** | Pinned as before; none of these shapes can move funds |
| W-01 | **Fixed** | `#[cfg(test)] mod tests;` and `mod security_tests;` now sit at the **end** of `lib.rs`, with a comment saying why. Test-only code no longer shifts the wasm's panic locations |

**Re-runs after the fix pass** (same machine; the wasm changed for the security fixes, see `docs/security/contract-review.md`):

| Run | Cases | Result |
|---|---|---|
| Differential, seed 20261023 (`target/fuzz-corpus`) | 100,000 per chain (300 k) | **0 disagreements** (EVM 19,045 ok + 80,955 refused). The F-01 class is gone |
| Differential, seed 2 (`target/fuzz-corpus-2`) | EVM **1,000,000** + BTC 1,000 + SOL 1,000 | **0 disagreements** (EVM 189,755 ok + 810,245 refused). The earlier run of this seed had 629 F-01 cases |
| Rust properties, `PROPTEST_CASES=200000 FUZZ_STATS_CASES=200000`, release | 21 tests in `parse::fuzz_tests` | all pass, 42.9 s wall |
| Fast CI defaults (`cargo test -p satchel --lib`) | proptest 256/property plus the regenerated seed corpus (3,600 cases) | pass |

The nonce-gap rule (S-04, D-43) depends on token state, so it is **not** part of the stateless classifier that this fuzzing compares. `parse::classify` and `classifySignRequest(req)` with no context both still exclude it. It is covered by the shared vectors (`state.evm_max_nonce`), the unit tests and the sandbox tests. The seed corpus (`tools/fuzz/corpus`) was regenerated because the vectors that seed it changed.

## 0b. C2 / C3 / C7 extension (2026-10-29, branch `feat/contract-sign`; docs/specs/C1-C2-C3-C7.md)

The new classifier branches (USDC `transfer` calldata, four chain ids, the 160-byte limit, `evm_message`,
`sol_message`) are covered by the same three layers. C1 (`history_digest`) is a view with no parser, so it is pinned by
the shared vector `vectors/history.json` instead (three implementations agree: Rust view, TS `historyDigest`, and an
independent encoder in the sandbox and unit tests).

| Layer | What changed |
|---|---|
| Rust oracles (`fuzz_tests.rs`) | The EVM oracle takes the chain/token table from the spec as hex strings and decodes the calldata as two ABI words; a new message oracle rebuilds the EIP-191 and Solana off-chain bytes with `format!` and `is_ascii_graphic`, and checks that the signed bytes never classify as a transaction on either key |
| Rust properties | new: `erc20_valid_always_accepted`, `erc20_one_rule_broken` (token of another chain, value, selector, padding, length, amount width), `msg_arbitrary_bytes`, `msg_valid_always_accepted`, `msg_mutated_seeds`; `evm_valid_always_accepted` now runs every chain; `evm_structured_fields` mixes in tokens and calldata variants; `classify_arbitrary_requests` covers the two message kinds |
| TS generator (`test/fuzz/gen.ts`) | EVM valid builds on all four chains, a third of them USDC transfers; structured cases break one calldata rule at a time; a new `msg` kind (seeds, random UTF-8 in several scripts, raw bytes, the 0/1/1023/1024/1025 boundaries) |
| Corpus | `tools/fuzz/corpus/msg.jsonl` added; all four files regenerated (`--n 1500 --n-btc 600`, 5,100 cases) |

| Run (release) | Cases | Result |
|---|---|---|
| Rust properties, `PROPTEST_CASES=200000 FUZZ_STATS_CASES=200000` | 20 properties × 200,000 = **4.0 M**, plus 4 × 200,000 coverage cases | all 26 tests pass, 50.7 s. Coverage reaches `ok` and every code, incl. `ERR_EVM_TOKEN` 1,662, `ERR_EVM_VALUE` 435, `ERR_MSG_EMPTY` 12,386, `ERR_MSG_TOO_LONG` 17,171, `ERR_MSG_ENCODING` 88,277 |
| Differential, seed 20261029 (`target/fuzz-corpus`) | **100,000 per kind** (evm, btc, sol, msg = 400 k) | **0 disagreements**, 14.3 s replay (EVM 17,478 ok, msg 49,373 ok) |
| TS self-check, `FUZZ_CASES=100000` | 100,000 per kind (400 k) | pass (no throw, every code reached, invariants hold) |

One test-side bug was found and fixed: the TS invariant decided "native transfer" from a trailing `80c0`, which a USDC
amount ending in `0x80` also produces. The classifiers agreed; only the checker of the checker was wrong.
No new contract finding.

## 1. Method

Everything uses stable Rust 1.93. The dev-dependencies are `proptest 1.12` (no default features), `sha2 0.10` and
`sha3 0.10`, all resolved offline from the local registry. Cargo.lock only gained `proptest`, `rand_xorshift`, `unarray`
and `core_detect`.

### 1.1 Independent oracles (Rust, `src/parse/fuzz_tests.rs`)
The oracles re-implement each rule set from the spec text, written in a different style from the contract:
- **RLP:** a *lenient* decoder (it accepts every header form, with no depth limit). Canonicality is decided by
  **re-encoding**: the input is canonical iff `canonical_encode(decode(x)) == x`. This catches wrapped single bytes, long
  forms for short payloads, leading-zero lengths and trailing bytes, without copying the contract's header checks.
- **EVM:** §5.9 on top of the RLP oracle: 9 items, minimal integers, chain id 11155111 in ≤ 8 bytes, the int widths,
  nonce ≠ 2^64−1, a 20-byte `to`, empty `data` and an empty access list, len ≤ 128. Hashes use `sha3::Keccak256`, not
  near-sdk.
- **BTC:** every offset rule in the §5.9 table, a generic CompactSize decoder (canonical iff it re-encodes the same way),
  the outputs grammar, distinct outpoints, and `sha256d` via the `sha2` crate for hashPrevouts, hashSequence,
  hashOutputs and the per-input sighash.
- **SOL:** a generic shortvec decoder (canonical iff it re-encodes the same way), a full legacy-message parse, the
  durable-nonce scan over every instruction, and the single-Transfer rule. An accepted message must **re-serialize to
  the same bytes**.
- **Hex:** an optional `0x`/`0X`, even length, ASCII hex digits only.

Every check asserts `contract accepts ⇔ oracle accepts`. On accept it also asserts that every extracted field
(`chain_id`, `nonce`, `txid` (display order), `vout`, `amount_sats`, `recent_blockhash`, `lamports`), every record
payload (keccak, sha256d, sha256), every MPC payload (`Ecdsa(hex)` / `Eddsa(message hex)`), the event preimages and
`btc_outputs` equal the oracle's. On refuse it asserts that the code belongs to that chain's §5.15 set (or is
`ERR_HEX`). For full `SignRequest`s, the code must also equal the byte-level classifier's code, and the
`ERR_BTC_INPUT_COUNT`-before-hex order is checked.

### 1.2 Properties (proptest; a panic anywhere fails the case)
| Property | Input |
|---|---|
| `evm/btc/sol_arbitrary_bytes` | random bytes (EVM with a forced `0x02` half the time; BTC 0–11 preimages of 180–184 B; SOL with a plausible header, plus lengths 1228–1240) |
| `hex_arbitrary_strings`, `classify_arbitrary_requests` | regex-shaped and arbitrary Unicode strings, through `hex::decode` and the full `parse::classify` |
| `rlp_decode_agrees_with_canonical_oracle` | random bytes: accepted ⇒ equal to the oracle tree, depth ≤ 16, and re-encoding gives back the input |
| `rlp_round_trip` | random RLP trees (recursion depth up to 20) and pure nesting chains of 0–23: encode → `decode_exact` is the identity at depth ≤ 16 |
| `evm/btc/sol_valid_always_accepted` | independent builders with random fields: max-width ints, nonce 2^64−2, 1–10 inputs, every allowed nSequence, 1–16 outputs, script lengths 0–520 including the 252/253 varint boundary, 2–16 keys, any `num_readonly_unsigned`, any system-program index and destination. Each must be accepted with the right fields (no false refusals) |
| `evm_structured_fields` | 7–10-item lists built from canonical ints of every width (0–17 B), chain ids (1, 84532, a leading-zero Sepolia, u64::MAX), 18–22-byte strings, empty strings and lists, and nesting chains up to 19 |
| `evm/sol_mutated_seeds` | every vector in `vectors/{evm,sol}.json` (accepted and refused) plus builder seeds, with 1–8 edits: bit flip, set to an interesting byte (`00 01 02 03 04 0c 14 7f 80 81 82 b7 b8 b9 bf c0 c1 f7 f8 f9 fc fd fe ff`), set to random, insert, delete, truncate, append, a **length-field tweak** of ±1/2/3/0x80/0x38 applied preferentially at RLP header and long-length positions or compact-u16 positions, duplicated chunks, or a **non-canonical re-encoding** (a redundant continuation byte or a zero length prefix). Each result then also goes through the hex-string layer (`0x`, `0X`, mixed case, odd length, `g`, `é`, a space, `0x0x`) |
| `btc_mutated_seeds` | every BTC vector plus a 3-input builder seed. Structural edits: swap, duplicate, drop, keep only one, extend to 10–11, ±1 byte in length, or swap in another transaction's preimage. Then in-place edits at the 31 field-boundary offsets and output-varint edits. In half the cases it **recomputes hashPrevouts, hashSequence and hashOutputs (and optionally the pkh)**, so mutated sequences, outpoints and outputs reach the accept path |
| `sol_extra_instructions` | a valid message with 1–3 extra instructions spliced in, first or last: AdvanceNonce, a second Transfer, random data, random programs. Must always be refused |
| `mutation_coverage_stats` | not a property: the verdict histogram of the mutation generators, which must reach `ok` and every code (SOL `TOO_LONG` comes from the arbitrary-bytes property instead) |

### 1.3 Differential, Rust vs TS
- **Generator:** `packages/core/test/fuzz/gen.ts` (deterministic sfc32 PRNG). It mixes, per chain, 30 % mutated
  vectors, 25 % structured builders that break about one rule at a time (bad chain ids, over-wide or leading-zero
  ints, wrapped bytes, long-form headers, nested access lists, 8/10 items, non-02 types; BTC bad
  version/locktime/sighash/sequence, 11–12 inputs, 0/17 outputs, 521-byte scripts, `fd`/`fe` varints, truncated or
  trailing output bytes; SOL a bad header, 0/1/17 keys, out-of-range indices, nonce, compute-budget and second
  instructions, data of 600–1100 bytes, a v0 prefix, trailing or truncated bytes, non-canonical shortvecs), 20–25 %
  mutated valid builds, 10–12 % valid builds and 8–10 % raw random bytes, plus the hex-string layer.
- The verdict comes from `classifySignRequest` (TS). On `ok` the record hashes and key fields are stored too. A TS
  exception is recorded as `THROW:` and counts as a finding.
- **CLI:** `tools/fuzz/gen-corpus.ts` writes `<out>/{evm,btc,sol}.jsonl` and a `manifest.json` with the verdict
  histograms.
- **Rust:** `differential_vs_ts_reference` replays each line through `parse::classify`. It compares the verdict, the
  error code, the record hashes and the fields, and it runs the Rust oracles on every line as well. Disagreements are
  grouped by class. A class that `known_disagreement` does not map to a finding fails the test.
- **TS self-check** (`packages/core/test/fuzz/policy-fuzz.test.ts`): no throws, only stable codes, every code
  reached, and the minimal §5.9 invariants on every TS accept, checked with `@noble` hashes.

## 2. Case counts and run times (MacBook, 15 cores; release build for the Rust deep runs)

| Run | Cases | Wall time | Result |
|---|---|---|---|
| Rust properties, `PROPTEST_CASES=200000` | 15 properties × 200,000 = **3.0 M** | ≈ 45 s for the whole module (8 test threads; `btc_valid_always_accepted` alone takes 38 s, and 20k → 200k scales linearly, so the env var is honoured) | all pass |
| Rust coverage stats, `FUZZ_STATS_CASES=200000` | 3 × 200,000 = 0.6 M | inside the above | every code reached (below) |
| Differential, corpus seed 20261023 (`target/fuzz-corpus`) | **100,000 per chain** (300 k) | TS generation 9.6 s; Rust replay 9.9 s | F-01 ×67; no other disagreements |
| Differential, corpus seed 2 (`target/fuzz-corpus-2`) | EVM 1,000,000 · BTC 200,000 · SOL 300,000 (1.5 M) | TS generation 30 s; Rust replay 42 s | F-01 ×629; no other disagreements |
| TS fuzz test, `FUZZ_CASES=100000` | 100,000 per chain (300 k) | 10.4 s | pass (no TS throw, no invariant violation) |
| Fast CI defaults | proptest 256/property, `FUZZ_STATS_CASES` 3000, seed corpus 3,600, TS 2,000/chain | < 1 s Rust, < 1 s TS | pass |

Accepted share of the 100k differential corpus: EVM 18.5 %, BTC 25.4 %, SOL 24.9 %. This is the accept path the
invariants run on.

Rust mutation-generator histogram (200,000 per chain):
- **EVM:** ok 8,480 · RLP 127,989 · TYPE 45,595 · TOO_LONG 5,118 · INT_WIDTH 4,217 · CHAIN_ID 3,908 · DATA 2,247 ·
  TO 1,619 · ACCESS_LIST 827
- **BTC:** ok 13,425 · PREIMAGE_LEN 41,795 · INPUT_COUNT 26,065 · SCRIPTCODE 22,268 · SIGHASH 19,128 ·
  OUTPUTS_MALFORMED 14,965 · VERSION 13,045 · MIXED_TX 12,844 · PREVOUTS_INCOMPLETE 10,756 · SEQUENCE 10,539 ·
  LOCKTIME 8,274 · DUPLICATE_INPUT 5,925 · OUTPUTS_MISMATCH 578 · SEQUENCES_MISMATCH 393
- **SOL:** ok 8,780 · MALFORMED 111,353 · HEADER 31,648 · VERSION 24,934 · INSTRUCTION 13,834 · TOO_LONG 5,742 ·
  DURABLE_NONCE 3,709

## 3. Findings

| ID | Severity | Side | Summary |
|---|---|---|---|
| F-01 | Low (error code only; both sides refuse) — **fixed in the spec and TS (§0)** | Rust deviates from the letter of §5.9 and from TS; the spec says nothing about depth | The RLP depth limit pre-empts the policy codes |
| F-02 | Info — **fixed in the spec (§0)** | Spec gap | A SOL header rule is implemented by both sides but is missing from §5.9 |
| F-03 | Info | Both, by design | Some accepted shapes are rejected by the target chain, so they cannot move funds |
| W-01 | Process (not a parser bug) — **fixed (§0)** | The parallel reviewer's edit | The `lib.rs` line insertion changes the wasm hash |

**No panics. No accept that breaks an invariant. No refusal of a valid builder.** No TS throws, and no field or hash
mismatch on any accepted case.

### F-01: the RLP depth limit turns the policy codes into `ERR_EVM_RLP` (Low)
- **Input** (52 B: a canonical 9-item Sepolia transfer whose access list is 17 nested empty lists, so the deepest item
  sits at depth 17):
  `02f283aa36a78001018252089411111111111111111111111111111111111111110180d0cfcecdcccbcac9c8c7c6c5c4c3c2c1c0`
  - Expected (§5.9, TS): `ERR_EVM_ACCESS_LIST`. Actual (contract): `ERR_EVM_RLP`.
- **Variant** with chain id 1:
  `02ef018001018252089411111111111111111111111111111111111111110180d0cfcecdcccbcac9c8c7c6c5c4c3c2c1c0`
  - Expected: `ERR_EVM_CHAIN_ID`. Actual: `ERR_EVM_RLP`.
  - The fuzzers found the same class for `ERR_EVM_INT_WIDTH`, `ERR_EVM_TO` and `ERR_EVM_DATA`: 67 of 300k and 629 of
    1.5M inputs.
- **Cause:** `rlp.rs` `MAX_DEPTH = 16` makes decoding fail inside the structure step, so it runs before every policy
  rule. §5.9 defines `ERR_EVM_RLP` as "canonical RLP list, 9 items, minimal ints" and states no depth limit. The TS
  mirror (`policy/rlp.ts`) has no depth limit either.
- **Impact:** none on safety; the transaction is refused either way. The UI shows the same sentence for every
  `ERR_EVM_*`. Shared vectors that combine deep nesting with a policy violation would disagree.
- **Fix options for the fix pass:**
  - (a) Keep the contract as is. Add `MAX_DEPTH = 16` to the §5.9 RLP row and mirror it in `policy/rlp.ts`. This is
    cheapest and leaves the wasm untouched.
  - (b) Drop or raise the limit in Rust. Inputs are ≤ 128 B, so recursion is bounded at 127 anyway.
- **Tests:**
  - `f01_deep_access_list_is_refused_either_way` passes: it pins the current behaviour.
  - `f01_deep_access_list_error_code_matches_spec` is `#[ignore = "F-01: …"]` and asserts the spec letter.
  - `known_disagreement` maps exactly this class to F-01.
  - If option (a) is chosen, delete the ignored test and the mapping instead.

### F-02: §5.9 SOL rule 3 omits the `num_readonly_unsigned` bound (Info, spec gap)
Both sides refuse `1 + num_readonly_unsigned > num_keys` with `ERR_SOL_MALFORMED`, for example the W3 transfer with
`m[2] = 3`. This rule is recorded only in `docs/handoff/core.md` ("added at the contract's request"). §5.9 rule 3 does
not list it. Suggested fix: add it to the spec row. No code change.

### F-03: accepted shapes that the target chain rejects (Info, pinned)
`f03_chain_invalid_but_accepted_shapes` pins these cases, which both classifiers and the oracle accept:
- **SOL:** duplicate account keys (the runtime refuses AccountLoadedTwice), and a transfer *to* the System program
  (`k` = the system index; it is executable, so the runtime makes it read-only).
- **EVM:** `max_priority_fee > max_fee`, and `gas_limit` 0 (both are invalid per EIP-1559 / intrinsic gas).
- **BTC:** an output value above the input total, and an empty scriptPubKey.

None of these can move funds. Each one only leaves an `unused` record in the owner's own history. §5.9 allows them
("accounts `[0, k]` with `k < num_keys`"; amounts are informational). A tightening pass is optional and would need a
spec change.

### W-01: the wasm hash moved because of a test-module line placed mid-file in `lib.rs` (process)
- After this work, `cargo near build` in the shared tree produced `d6cde1af…c693`. The size was the same, 289,125 B.
- **Root cause:** the parallel reviewer inserted `#[cfg(test)] mod security_tests;` at `lib.rs:26`. That shifts every
  following line, and with it the `file:line:col` panic locations embedded in the wasm data section.
- **Proof** (isolated copies under the scratchpad; the shared tree was untouched):
  - My changes plus `lib.rs` without that line give `bec41e44…a584`, which equals the baseline.
  - The same `#[cfg(test)] mod security_tests;` appended at the **end** of `lib.rs` also gives `bec41e44…a584`.
- **Fix:** move that line to the end of `lib.rs`, as `parse/mod.rs` does with `mod fuzz_tests;`.

## 4. Wasm unchanged by the fuzzing work
- Baseline before any change: `cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml` →
  sha256 `bec41e446df0944d07ea3029c3101b9e7507094d26401a4f396e0b36b68da584`.
- After this work: the same value, measured on an isolated copy with every fuzzing change applied (dev-deps,
  Cargo.lock, `fuzz_tests.rs`, the `mod` line). The shared tree's different hash is W-01.

## 5. Re-running

```bash
# fast (CI): proptest default 256 cases/property, seed corpus differential, TS 2,000/chain
cargo test -p satchel --lib parse::fuzz_tests
pnpm --filter @satchel/core exec vitest run test/fuzz

# deep Rust properties (≈ 45 s, release)
PROPTEST_CASES=200000 FUZZ_STATS_CASES=200000 cargo test -p satchel --lib --release parse::fuzz_tests -- --nocapture

# deep differential: generate ≥ 100k/chain into target/ (not committed), then replay
pnpm --filter @satchel/tools fuzz:corpus --n 100000 --seed 20261023 --out ../target/fuzz-corpus
SATCHEL_FUZZ_CORPUS=target/fuzz-corpus cargo test -p satchel --lib --release differential -- --nocapture

# deep TS self-check
FUZZ_CASES=100000 pnpm --filter @satchel/core exec vitest run test/fuzz

# regenerate the committed seed corpus (deterministic; ≈ 2.3 MB)
pnpm --filter @satchel/tools fuzz:corpus --n 1500 --n-btc 600   # evm, btc, sol and msg

# wasm hash check
cargo near build non-reproducible-wasm --manifest-path contracts/satchel/Cargo.toml   # after the fix pass: aea0b2e9…1bd6 (was bec41e44…a584)
```

**Notes**
- When proptest finds a failure it prints a shrunk input. Failure persistence is off, so no files are written under
  `src/`.
- The near-sdk mocked blockchain charges gas for every `env::sha256` / `keccak256` call. `env_tick()` starts a fresh
  mock every 200 classifications so that long runs don't hit `GasLimitExceeded`.
- `SATCHEL_FUZZ_CORPUS` takes a path that is absolute or relative to the repo root.

## 5b. C5 allowance: cap accounting (2026-10-29, `feat/contract-allowance`)

The spending allowance (docs/specs/C5.md) adds state-dependent accounting rather than a parser, so it is covered by
properties against an independent oracle instead of a byte corpus.

| Property (`contracts/satchel/src/allowance_tests.rs`) | Input | Oracle / invariant |
|---|---|---|
| `window_accounting_matches_oracle` | 1–80 steps; each advances time by 0–5 s, ≈ 24 h ± 3 s or up to 48 h, and debits 1–2 random assets (one never capped) for 0–50, 0–1,000 or u128::MAX; 1–4 capped assets with limits 1–2,000 | a full-history oracle: a debit at `t` passes iff Σ(accepted, stamped in `(t − 24 h, t]`) + pending + amount ≤ limit, then the 32-entry rate rule. At every step: same verdict and code, `spent` and `remaining` equal to the oracle's, `spent ≤ limit` at every instant, and ≤ 32 stored entries (storage stays bounded) |
| `evm_debit_is_worst_case` | random `value` (u128), `gas` (u64), `max_fee` (u128) and 0–80 bytes of calldata | native debit = `value + gas × max_fee` exactly when it fits u128, else `ERR_ALLOWANCE_EXCEEDED` (never wrapped); it is ≥ `value`; non-empty calldata other than a 68-byte `a9059cbb` is `ERR_ALLOWANCE_KIND` |
| `btc_debit_bounds` | 1–3 inputs with random amounts, 1–5 outputs, each paying either our `0014‖pkh` or another script | debit = Σ external + max(0, Σ in − Σ out), and ≥ every external output |
| `btc_delegate_debits_need_one_input` (AUDIT-01, 2026-10-30) | 1–5 inputs with random amounts (0–2 M sats), 1–3 outputs to our `0014‖pkh` or another script, through the real classifier | `request_debits` is `Ok` (and equals `btc_debit`) iff the tx has exactly one input; any other count is `ERR_ALLOWANCE_BTC_ONE_INPUT` |
| TS `allowance.test.ts` › randomized | seeded LCG, 300 runs × 60 steps (`FUZZ_CASES`) | the same brute-force window oracle against `applyDebits` |

The shared `vectors/allowance.json` (28 request → debit cases (23 before AUDIT-01) through the real classifiers, incl. the AUDIT-01
one-input refusals, 13 raw EVM cases including
ERC-20 calldata, 22 window cases) is replayed on both sides (`shared_allowance_vectors`, `allowance.test.ts`).

```bash
cargo test -p satchel --lib allowance_tests                                         # fast: 256 cases/property
PROPTEST_CASES=50000 cargo test -p satchel --lib --release allowance_tests          # deep
FUZZ_CASES=20000 pnpm --filter @satchel/core exec vitest run test/allowance.test.ts
```

## 6. Limits
- **Not coverage-guided:** cargo-fuzz and libFuzzer need nightly. Structure-aware mutation and the coverage histogram
  stand in for it.
- **Host is 64-bit, the contract is wasm32:** the `usize` arithmetic was reviewed by hand for 32-bit:
  - `read_len` takes at most 4 length bytes, so it can't overflow.
  - `checked_add` guards every slice end in RLP and SOL.
  - BTC adds at most 520 + 3 to a position bounded by 1024.
  - SOL multiplies by 32 only for `num_keys` ≤ 65535.
- **The TS mirror is not fully independent of the vectors,** since the same author wrote both. The Rust oracles are the
  independent third implementation, and they agree with the contract on every input.
- **Out of scope:** the JSON layer (serde of `SignRequest`) and `sign_for`'s gas and deposit checks were not fuzzed.

## 7. Files
- **Added:**
  - `contracts/satchel/src/parse/fuzz_tests.rs`
  - `packages/core/test/fuzz/gen.ts`
  - `packages/core/test/fuzz/policy-fuzz.test.ts`
  - `tools/fuzz/gen-corpus.ts`
  - `tools/fuzz/corpus/{evm,btc,sol}.jsonl` and `manifest.json` (the seed corpus, 3,600 cases, 2.3 MB)
  - this file
- **Edited (minimal):**
  - `contracts/satchel/Cargo.toml`: the dev-deps `proptest`, `sha2`, `sha3`
  - `Cargo.lock`: additions only
  - `contracts/satchel/src/parse/mod.rs`: `#[cfg(test)] mod fuzz_tests;` appended at the end
  - `tools/package.json`: the `fuzz:corpus` script

## 8. C4/C6 market accounting (property tests, 2026-10-29)

Target: `contracts/satchel/src/{market,inside,offers}.rs` (docs/specs/C4-C6.md). There is no parser here; the risk is
accounting, so the properties run random operation sequences against a reference model.

| Property (`market_tests::…`) | Input | Checks after every step |
|---|---|---|
| `prop_accounting_matches_model` | 1–40 random ops over 3 tokens and 4 accounts: NEAR and USDC deposits, withdrawals (delivered or failed, re-credited by the callback), NEAR and USDC offers, cancels (by the offerer or a stranger; refund delivered or failed), accepts (payout delivered or failed), transfers, signatures, block-time jumps, and (M-01) `withdraw_proceeds(near)` with the payout delivered or failed | per-token NEAR, USDC and `inside_epoch` equal the model; open offers per token and per offerer equal the model; `proceeds` equal the model; `market_totals()` equals the sums, incl. `proceeds_near` and `escrow_near` (I-M2); refused steps change nothing |
| `prop_ensure_solvent_refuses_exactly_when_escrow_would_pay` (M-01) | a random escrow mix (inside NEAR, a NEAR offer, a storage credit, each possibly 0), a receiver with a 10–64-char id that already holds a Satchel or not, `nft_transfer` or a NEAR `buy`, and a buffer within ±60 B ± 3 yocto of the exact bytes the call adds (measured on a twin run) | the guard refuses **iff** the call grew storage and the spare NEAR (plus a transfer's 1 yocto) can't pay it; every refusal is `ERR_INSOLVENT`; every accepted call leaves `free ≥ escrow_near` (I-M1) |
| `prop_id_index_is_a_swap_remove_vec` | 1–80 pushes/removes over 3 keys | the O(1) offer index behaves exactly like `Vec::swap_remove`, and reports the entry that moved |
| `prop_ft_msg_garbage_is_refused_cleanly` | arbitrary strings ≤ 120 chars as `ft_on_transfer` msg, any amount | only stable `ERR_*` panics (the FT then refunds) |

The NEAR solvency invariant (I-M1) needs real balances, so it runs in the sandbox (`tests/tests/market.rs`
`check_solvency`, after every step of most tests, including a contract drained to 0.05 NEAR of free balance, and the
`m01_*` tests drained to 0.5 mNEAR above escrow). The M-01 property above checks the guard's decision on the unit mock,
whose per-call balance is set exactly (`Ctx::bal`); note that `testing_env!` restarts the storage-usage counter on every
call, so deltas are measured inside one call.

```bash
cargo test -p satchel --lib market_tests                                     # fast: 64 / 48 / 256 cases
PROPTEST_CASES=1000 cargo test -p satchel --lib --release market_tests::prop # deeper
```
Failure persistence is off (no files under `src/`). Each case starts on empty mocked storage (`wipe()`), since
`testing_env!` carries storage over between cases.
