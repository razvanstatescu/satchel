# MPC signer (Chain Signatures): interface, derivation, contract-initiated signing
> Owner: mpc · Checked: 2026-10-21 · Confidence: **high** (interface read from the pinned source; deployed code byte-matched to the release; everything below ran live on testnet unless tagged otherwise)
> Primary sources: near/mpc tag **3.17.0** = commit `d0fc87b19e2643299e7becdd7d9611afcd5d5a78` (deployed on testnet **and** mainnet), cross-checked against `main` @ `13f42bf4b250c8d4d812185ed7b6e4724b24a411` (2026-10-21). Files: `crates/contract/src/api/{sign,common,keys}.rs`, `crates/contract/src/{config,errors,pending_requests}.rs`, `crates/contract/src/crypto_shared/kdf.rs`, `crates/near-mpc-crypto-types/src/{sign,primitives,kdf}.rs`, `crates/near-mpc-contract-interface/src/{deposits,method_names}.rs`, `crates/node/src/requests/queue.rs`. Release wasm: https://github.com/near/mpc/releases/download/3.17.0/mpc-contract-v3.17.0.tar.gz. Docs: https://docs.near.org/smart-contracts/anatomy/yield-resume. Raw data, tx hashes and spike code: `research/spikes/mpc/RESULTS.md`.

## TL;DR: what an implementer must know

1. **Go/no-go: GO.** In the formal test, 10 of 10 contract-initiated signs succeeded with 0 timeouts. Over all spike runs, a contract issued 44 MPC requests: 44 were signed, 0 timed out. Latency was 5.2–12.8 s (p50 6.7 s, p90 7.4 s). Every signature was verified locally against `derived_public_key(predecessor = the contract, path)`. **BTC stays in Phase 1.** [VERIFIED]
2. **Deployed version:** `v1.signer-prod.testnet` and `v1.signer` both run **3.17.0** with the **same code hash** `DAE5ng4ZFR2ctMx9SizQBqmGkVbKUutgZ4ZECD4R8Sm9`, which equals sha256 of the GitHub release wasm. The sign path is unchanged on `main` as of 2026-10-21. [VERIFIED]
3. **Call:** `sign({"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"<64 hex>"},"domain_id":0}})`. Rules: Ecdsa = exactly 32 bytes, value < secp256k1 order **n**; Eddsa = raw message, **0–1232 bytes**, not hashed. Hex is case-insensitive, with **no `0x`**. Domains: **0 = secp256k1 (BTC + EVM), 1 = ed25519 (SOL)**. [VERIFIED]
4. **Deposit ≥ 1 yoctoNEAR.** Any excess is refunded **to the predecessor**, which for Satchel is the Satchel contract, not the user. There is no fee formula. [VERIFIED]
5. **Prepaid gas ≥ 15 Tgas, exactly.** This is the live `config.sign_call_gas_attachment_requirement_tera_gas`, which governance can change; 14.999999999999 Tgas fails. The `sign` receipt burns ~4.3 Tgas (7.3 Tgas for a 1232-byte Eddsa message) and reserves 7 Tgas for its yield callback. The plan's "7 Tgas (10 attached)" is stale README text. [VERIFIED]
6. **Contract-initiated cost:** ~12.4 Tgas burnt in total, about **0.0012 NEAR**, across 4 receipts. The minimum attached gas is static allocations + ~3 Tgas (28 Tgas for a 15 + 10 split). **Recommended:** attach **50 Tgas**. Give the MPC call 15 Tgas static plus **all leftover gas** (`unused_gas_weight(1)`); give `on_signed` **10 Tgas static, weight 0**. [VERIFIED]
7. **Timeout:** the yield lasts 200 blocks (protocol `yield_timeout_length_in_blocks = 200`), measured at **115–119 s** on testnet. On timeout the MPC fails the promise with `Smart contract panicked: Request has timed out.` **The caller's callback still runs** with `Err(PromiseError::Failed)`, about 203 blocks after `sign`. Every MPC-side failure (bad payload, deposit, gas, domain) reaches the callback the same way within ~3 blocks. [VERIFIED with a mock signer that mirrors the MPC code for the timeout; real MPC for all other failures]
8. **`pending` can get stuck in exactly two ways:** (a) the callback runs out of gas; (b) a typed `#[callback_result] Result<SignatureResponse, _>` fails to deserialize, because near-sdk panics inside generated code. Both reproduced. **Read the result as raw bytes (`env::promise_result_checked`) and decrement first.** For a locked contract, don't gate `list` on a counter alone (see Recommendations). [VERIFIED]
9. **Signatures become public whether or not Satchel's callback succeeds.** They appear in the MPC callback receipt's `SuccessValue` and in the node's `respond` tx args. One run's callback ran out of gas, yet a valid signature was readable on-chain. **Log the request (payload hash) in `sign_for`, not in `on_signed`.** Re-signing the same payload yields a **new, different** valid signature. [VERIFIED]
10. **Response:** `{"scheme":"Secp256k1","big_r":{"affine_point":"02|03…(33 B hex)"},"s":{"scalar":"…(32 B hex)"},"recovery_id":0|1}` or `{"scheme":"Ed25519","signature":[64 numbers]}`. `s` is always low-S. **Use `recovery_id` for EVM `v`/yParity, never the `big_r` prefix byte**: they disagreed in 26 of 50 signatures. `r` = `affine_point` minus its first byte. [VERIFIED]
11. **Derivation:** `tweak = sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path)`. secp256k1: `PK + tweak_be·G`. ed25519: `PK + (tweak_le mod ℓ)·B`. A JS re-implementation matched the live view **80/80**. Snippet and test vectors below. [VERIFIED]
12. **Traps:** `latest_key_version()` returns **3**, which is the *ForeignTx* domain: signing with it fails, and deriving with it gives wrong addresses. `derived_public_key` **must** be given `predecessor` in view calls. The README's limits are stale. A function-call access key **cannot** attach the 1 yocto (`DepositWithFunctionCall`), which forces wallet approval; keep that property in `sign_for`. [VERIFIED]

## Verified facts & measurements

### Deployment (2026-10-21)

| | testnet `v1.signer-prod.testnet` | mainnet `v1.signer` |
|---|---|---|
| `version()` | `"3.17.0"` | `"3.17.0"` |
| code hash | `DAE5ng4ZFR2ctMx9SizQBqmGkVbKUutgZ4ZECD4R8Sm9` | same |
| NEP-330 `contract_source_metadata` | `git+https://github.com/near/mpc?rev=d0fc87b19e2643299e7becdd7d9611afcd5d5a78`, built with `sourcescan/cargo-near:0.22.0-rust-1.97.1` | same |
| protocol state | Running, epoch 25, threshold 11 of 17 participants | Running, epoch 13, threshold 11 of 17 |
| domains (`state().Running.domains`) | 0 CaitSith/Sign · 1 Frost/Sign · 2 ConfidentialKeyDerivation/CKD · 3 CaitSith/**ForeignTx** | same |
| root key domain 0 | `secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3` | `secp256k1:3tFRbMqmoa6AAALMrEFAYCEoHcqKxeW38YptwowBVBtXK1vo36HDbUWuR6EZmoK4JcH6HDkNMGGqP1ouV7VZUWya` |
| root key domain 1 | `ed25519:6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2` | `ed25519:G9hwngxWNKdmqMCmU1Yt6LPhFpayJeKFxyAV1HqMNLtF` |
| `latest_key_version()` | `3` (ForeignTx!) | `3` |

The release tags after 3.17.0 (3.17.1 on 10-15, 3.17.2 on 10-21) are node-only. A contract upgrade needs participant votes plus `submit_contract_update`. [VERIFIED; CHANGELOG at tag 3.17.2]

Live `config()` (testnet; mainnet identical except `launcher_hash_unused_ttl_seconds`) [VERIFIED]:
```json
{"sign_call_gas_attachment_requirement_tera_gas":15,"return_signature_and_clean_state_on_success_call_tera_gas":7,
 "fail_on_timeout_tera_gas":2,"ckd_call_gas_attachment_requirement_tera_gas":15,"return_ck_and_clean_state_on_success_call_tera_gas":7,
 "key_event_timeout_blocks":30,"apply_contract_update_tera_gas":50,"verifier_tera_gas":200, "...": "TEE/maintenance values omitted"}
```

Protocol (both networks) [VERIFIED `EXPERIMENTAL_protocol_config`]: `yield_timeout_length_in_blocks 200`, `max_yield_payload_size 1024`, `max_total_prepaid_gas 1e15` (1 PGas), `min_gas_purchase_price 1e9` yocto/gas, current `gas_price` 1e8. Block time: testnet 0.555–0.569 s, so 200 blocks ≈ 111–114 s; mainnet 0.60–0.67 s, so ≈ 119–135 s.

### Latency and gas (testnet, 2026-10-21)

Latency is measured from `send_tx(wait_until=NONE)` to the `EXPERIMENTAL_tx_status(EXECUTED_OPTIMISTIC)` poll that returns the final value. "Blocks" counts from the tx block to the last receipt. [VERIFIED]

| path | n (all successful) | latency min / p50 / p90 / max (s) | blocks min / p50 / max | total gas burnt |
|---|---|---|---|---|
| direct, ECDSA (domain 0) | 12 | 4.9 / 5.6 / 6.7 / 14.3 | 7 / 8 / 18 | 8.33–9.10 Tgas |
| direct, EdDSA (domain 1) | 8 | 4.5 / 5.0 / 5.8 / 6.2 | 7 / 7 / 7 | 8.31 (32 B) – 11.83 (1232 B) |
| **contract → MPC, ECDSA** | 38 | **5.4 / 6.7 / 7.4 / 12.8** | 8 / 9 / 19 | 12.17–13.09 Tgas (~0.00117 NEAR) |
| contract → MPC, EdDSA | 5 | 5.2 / 5.5 / 5.9 / 6.2 | 8 / 9 / 9 | 12.46 (32 B) – 17.07 (1232 B) |
| timeout (yield never resumed; mock) | 3 | 115.1 / 116.0 / — / 119.3 | 202 (direct) – 205 (contract) | ~9.1 Tgas (contract path) |

Per-receipt gas for a contract-initiated ECDSA sign (mean of the 10 go/no-go runs; burnt / prepaid). `sign_for` 2.100 / 50 → MPC `sign` 4.337 / 15.000 → MPC `return_signature_and_clean_state_on_success` 3.524 / 7.000 → `on_signed` 1.418 / (leftover). There are also 3 gas-refund receipts at 0.223 each. The spike's `on_signed` needs **< 0.6 Tgas** of execution (0.3 Tgas fails, 0.6 works); the reported "burnt" includes ~1 Tgas of receipt fees prepaid by `sign_for`. Typical timing: `sign` executes 1 block after `sign_for`, the MPC responds about 6 blocks later, and our callback runs 1 block after that.

Concurrency [VERIFIED]: 3 concurrent and 10 concurrent requests from one contract all succeeded (5.4–7.9 s). Duplicate identical requests (same predecessor + path + payload + domain, in flight together) were answered in the same block with **identical** signatures (fan-out). A sequential repeat gets a **new** signature.

## Reference: exact APIs, types, commands, tested snippets

### `sign` (payable): the only signing entry point (there is no `sign_v2`)
Source: `crates/contract/src/api/sign.rs` @3.17.0 `pub fn sign(&mut self, request: dtos::SignRequestArgs)`.

```jsonc
// ECDSA, domain 0 (BTC, EVM). Payload = the 32-byte digest to sign (BTC sighash, EVM keccak tx hash). Signed as-is.
{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"521da91dc9bddb625bd0679d9e735def558761a34653624f5954f44bce6443a9"},"domain_id":0}}
// EdDSA, domain 1 (Solana). Payload = the FULL message bytes (Solana serialized message), 0..=1232 bytes. Not hashed.
{"request":{"path":"satchel/1/sol","payload_v2":{"Eddsa":"<hex of message bytes>"},"domain_id":1}}
// Legacy (still accepted, ECDSA only): raw byte array + key_version
{"request":{"path":"…","payload":[82,29,…32 numbers…],"key_version":0}}
```
Validation, in source order (`check_request_preconditions` then the payload check). [SOURCED `api/common.rs`, `api/sign.rs`; each error string VERIFIED on chain]

| check | error (`Smart contract panicked: …`) |
|---|---|
| args parse (field names, hex, bounds) | ``Failed to deserialize input from JSON. Error: `missing field `request` …` `` · `` `Invalid character 'x' at position 1 …` `` · `` `Lower bound violation: got 31 (expected >= 32) …` `` · `` `Upper bound violation: got 1233 (expected <= 1232) …` `` · `payload_v2 and payload are mutually exclusive` · `domain_id and key_version are mutually exclusive` |
| domain exists | `The provided domain ID, 99, was not found.` |
| domain purpose = Sign | `Domain 3 has purpose ForeignTx, but this method requires Sign.` (also `Domain 2 has purpose CKD, …`) |
| `env::prepaid_gas() >= 15 Tgas` | `Provided gas is lower than required. Provided: 14999999999999, required: 15000000000000` |
| deposit ≥ 1 yocto (excess is refunded to **predecessor**, log `refund <amount> to <predecessor>`) | `Attached deposit is lower than required. Attached: 0, required: 1` |
| network accepting requests | `Due to previously failed TEE validation, the network is not accepting new requests at this point in time. Try again later.` [SOURCED] |
| payload ↔ scheme | `panicked at crates/contract/src/api/sign.rs:48:56:\nPayload is not Ecdsa` / `…:54:44:\nPayload is not EdDSA` |
| ECDSA payload < n | `panicked at crates/contract/src/api/sign.rs:51:22:\nEcdsa payload cannot be converted to Scalar` (rejected for exactly n, and for p−1) |
| fan-out queue (>128 identical requests in flight) | `Pending-request queue is full for this request key (limit: 128). Try again once an in-flight response or timeout has cleared room.` [SOURCED `pending_requests.rs`] |
| yield timeout (200 blocks) | `Request has timed out.` (raised by `fail_on_timeout`) |

Accepted inputs [VERIFIED]: uppercase hex, the all-zero ECDSA payload (it gets signed; PR #4385 was **closed unmerged**), empty and 1-byte EdDSA messages, 1232-byte EdDSA messages, a 1000-char path, and an empty path. The path is free text; there is no BIP-32 semantics.

### Response (the value returned by `sign`, i.e. the yield callback's `SuccessValue`)
```json
{"scheme":"Secp256k1","big_r":{"affine_point":"022b452c18cfc5e5c2e7b8731812ffbed4ac45281c138259d1357b2f7504c82806"},"s":{"scalar":"3cb81aa23f2a5edab2ded2ec430bc61b52c6e067fa80f5c3c8a1bce2b5737977"},"recovery_id":1}
{"scheme":"Ed25519","signature":[171,150,115,129,…64 numbers total…,57,3]}
```
- **ECDSA:** `r = affine_point[2..]` (drop the `02`/`03` prefix), `s = s.scalar` (always ≤ n/2), `recovery_id ∈ {0,1}` computed by trial recovery against (r, s) [SOURCED `node/src/indexer/types.rs`, `threshold-signatures/src/ecdsa/signature.rs`]. EVM: EIP-1559/2930 `yParity = recovery_id`; legacy EIP-155 `v = recovery_id + chainId*2 + 35`. chainsig.js 1.1.16 does `{r: affine_point.substring(2), s: scalar, v: recovery_id + 27}` [VERIFIED npm tarball]. BTC: DER-encode (r, s), already BIP-62/146 low-S. **Do not** derive parity from the `big_r` prefix.
- **Ed25519:** 64 raw bytes (R‖S) as a JSON number array. This is the Solana signature as-is. It verifies with strict (non-ZIP-215) rules too. [VERIFIED 13/13]
- The MPC contract **verifies every signature on-chain before resuming the yield** (`respond` → `verify_ecdsa_signature` via `ecrecover(malleability_flag=true)`, or `ed25519_verify`), so a successful callback never receives an invalid signature. [SOURCED `api/sign.rs::respond`]

### View methods [VERIFIED; full ABI of 78 functions in `research/spikes/mpc/data/raw/raw_mpc_abi_testnet.json`]
```bash
near contract call-function as-read-only v1.signer-prod.testnet version json-args '{}' network-config testnet now          # "3.17.0"
near contract call-function as-read-only v1.signer-prod.testnet public_key json-args '{"domain_id":0}' network-config testnet now
near contract call-function as-read-only v1.signer-prod.testnet derived_public_key \
  json-args '{"path":"satchel/1/evm","predecessor":"satchel.example.testnet","domain_id":0}' network-config testnet now
# -> "secp256k1:amydARHfgNa4viJzVnexf4dkK39zV6Zb58Lwpy4RvLCkYCo2Bat4fVGWeiNmPdtm51CpjS9KjP7ixenSztKGDoZ"
near contract call-function as-read-only v1.signer-prod.testnet config json-args '{}' network-config testnet now
near contract call-function as-read-only v1.signer-prod.testnet state json-args '{}' network-config testnet now          # domains, keyset, participants
near contract call-function as-read-only v1.signer-prod.testnet contract_source_metadata json-args '{}' network-config testnet now
near contract inspect v1.signer-prod.testnet network-config testnet now                                                 # version, code hash, source link
```
- `public_key(domain_id?: u64)` returns NEAR-format `secp256k1:<base58 of 64-byte x‖y>` or `ed25519:<base58 32 B>`. Default is domain 0.
- `derived_public_key(path: String, predecessor?: AccountId, domain_id?: u64)`. Without `predecessor`, a view call fails with `HostError(ProhibitedInView { method_name: "predecessor_account_id" })`, so always pass it. Domain 2 (BLS) returns the root unchanged. Domain 3 returns a key from a **different** root.
- `latest_key_version(signature_scheme?: "Secp256k1"|…) -> u32` returns the most recent domain *for that curve*, which is currently 3 (ForeignTx). **Don't use it**: hardcode 0 and 1.
- `get_pending_request(request: SignatureRequest{tweak, payload, domain_id}) -> Option<YieldIndex>` reports presence only. `get_available_foreign_chains()` lists chains for `verify_foreign_transaction`.
- Other user methods: `request_app_private_key` (CKD/BLS, domain 2, 1 yocto, ≥ 15 Tgas) and `verify_foreign_transaction` (domain 3; MPC nodes attest a foreign tx's block hash/logs after N confirmations). The latter is enabled for Solana, Bitcoin, Base, Bnb, Arbitrum, Abstract, Starknet, Polygon, HyperEvm, Aptos, Sui, Avalanche, Fogo, but **not Ethereum**. Testnet's Bitcoin provider is `bitcoin-testnet-rpc.publicnode.com` with quorum 1; which network that is was not verified. Neither method is needed for the MVP. [VERIFIED views; semantics SOURCED]

### Key derivation (exact)
[SOURCED `near-mpc-crypto-types/src/kdf.rs`, `contract/src/crypto_shared/kdf.rs`; VERIFIED 80/80 against the live view]
```
tweak  = SHA3-256( utf8("near-mpc-recovery v0.1.0 epsilon derivation:" ‖ predecessor_account_id ‖ "," ‖ path) )   // 32 bytes
secp256k1 (domain 0):  t = big-endian(tweak), must satisfy t < n (else "TweakNotOnCurve", probability ~2^-128)
                       derived = root + t·G
ed25519   (domain 1):  t = little-endian(tweak) mod ℓ        (curve25519_dalek::Scalar::from_bytes_mod_order)
                       derived = root + t·B
```
The predecessor is the account that calls `sign`. For Satchel that is the **Satchel contract account**, so addresses depend only on (`satchel.<team>.testnet`, `satchel/{id}/{chain}`) and survive NFT transfers. Testnet and mainnet roots differ, so the same path yields different addresses on each network.

```js
// node >= 20, "@noble/curves": "2.4.0", "@noble/hashes": "2.4.0", "bs58": "6.0.0"   (tested: research/spikes/mpc/js/derive.mjs)
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha3_256, keccak_256 } from '@noble/hashes/sha3.js';
import bs58 from 'bs58';
const hex = (u8) => Buffer.from(u8).toString('hex');
export const deriveTweak = (pred, path) =>
  sha3_256(new TextEncoder().encode(`near-mpc-recovery v0.1.0 epsilon derivation:${pred},${path}`));
export function deriveSecp256k1(rootNearPk /* "secp256k1:…" from public_key(0) */, pred, path) {
  const t = BigInt('0x' + hex(deriveTweak(pred, path)));
  const root = secp256k1.Point.fromBytes(Uint8Array.from([0x04, ...bs58.decode(rootNearPk.slice(10))]));
  const P = secp256k1.Point.BASE.multiply(t).add(root);
  return { near: 'secp256k1:' + bs58.encode(P.toBytes(false).slice(1)), compressed: hex(P.toBytes(true)),
           evm: '0x' + hex(keccak_256(P.toBytes(false).slice(1)).slice(-20)) };
}
export function deriveEd25519(rootNearPk /* "ed25519:…" from public_key(1) */, pred, path) {
  const t = BigInt('0x' + hex(Uint8Array.from(deriveTweak(pred, path)).reverse())) % ed25519.Point.CURVE().n;
  const P = ed25519.Point.fromBytes(bs58.decode(rootNearPk.slice(8))).add(ed25519.Point.BASE.multiply(t));
  return { near: 'ed25519:' + bs58.encode(P.toBytes()), solana: bs58.encode(P.toBytes()) };
}
```
Test vectors (testnet roots above). The BTC address is P2WPKH testnet = bech32(`tb`, v0, hash160(compressed)), computed independently; the btc/chains agents should cross-check it against chainsig.js. [VERIFIED keys; addresses computed]

| predecessor | path | tweak (hex) | compressed secp256k1 | EVM | BTC P2WPKH (testnet) | SOL (ed25519) |
|---|---|---|---|---|---|---|
| satchel.example.testnet | satchel/1/evm | `fe2f7150…dd384938` | `021d206d588827f6e9e2950336ff5c33c0b81141083a43b9e403e1dccd53c2ead5` | `0x53f9e93e9cb431122872c3ee96848e97bff51c2a` | — | — |
| satchel.example.testnet | satchel/1/btc | `08494c3a…392ab695` | `037ab0d767a8b45ab43b55ca0cf5a4c09b47a9ecc8b4c581b60b0ab56b83e66076` | — | `tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd` | — |
| satchel.example.testnet | satchel/1/sol | `766b6cb6…99ffb527` | — | — | — | `DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB` |
| spike.satchel-spk-mpc-e9ea1a.testnet | satchel/1/evm | `057276f4…8c8bfcf2` | `03d9fa4c35def6143692cced1d6737866592f6152b07c1aeef5fb5b341f45cec6c` | `0x6fafd4339ab28eb793b01c52a0f4d69123586e00` | — | — |

More vectors are in `research/spikes/mpc/data/test_vectors.json`. chainsig.js 1.1.16 implements the same prefix and math, and calls `derived_public_key` with an explicit `predecessor` and `domain_id: IsEd25519 ? 1 : 0`. [VERIFIED npm tarball]

### Local verification of a response (JS, tested in `js/verify.mjs`)
```js
const r = BigInt('0x' + resp.big_r.affine_point.slice(2)), s = BigInt('0x' + resp.s.scalar);
const sig = new secp256k1.Signature(r, s);
secp256k1.verify(sig.toBytes('compact'), payload32, derivedCompressed, { prehash: false, lowS: true }); // true
sig.addRecoveryBit(resp.recovery_id).recoverPublicKey(payload32).equals(derivedPoint);              // true
ed25519.verify(Uint8Array.from(resp.signature), messageBytes, derivedEd25519Bytes);                    // true
```
**noble v2 default is `prehash: true` (sha256 of the message).** You must pass `prehash: false` for MPC ECDSA payloads.

### Rust: minimal wire types and call pattern (near-sdk 5.29.1, tested live in Spike B)
These are your own types. No near/mpc crate is needed (see "Crate or own types?" below). They serialize to exactly the shapes above. They are identical to `research/spikes/mpc/contract/src/lib.rs` except for the names (the spike calls them `Payload`, `SignRequest`, `SignatureResponse`). The commented `sign_for`/`on_signed` body combines two patterns the spike exercised: the gas split (MPC weight 1, callback 10 Tgas with weight 0) in runs `R-recommended`, and the raw-bytes callback (`on_signed_raw`) in runs `G-garbage-raw` and `T-timeout-raw`.
```rust
use near_sdk::{env, ext_contract, near, Gas, NearToken, Promise};

#[near(serializers = [json])] #[derive(Clone, Debug)]
pub enum MpcPayload { Ecdsa(String), Eddsa(String) }               // {"Ecdsa":"<hex>"}: externally tagged (serde default)

#[near(serializers = [json])] #[derive(Clone, Debug)]
pub struct MpcSignRequest { pub path: String, pub payload_v2: MpcPayload, pub domain_id: u64 }

#[near(serializers = [json])] #[derive(Clone, Debug)]
pub struct K256AffinePoint { pub affine_point: String }            // 33-byte compressed point, hex
#[near(serializers = [json])] #[derive(Clone, Debug)]
pub struct K256Scalar { pub scalar: String }                       // 32 bytes, hex

#[near(serializers = [json])] #[derive(Clone, Debug)]
#[serde(tag = "scheme")]                                           // internally tagged: {"scheme":"Secp256k1",...}
pub enum MpcSignature {
    Secp256k1 { big_r: K256AffinePoint, s: K256Scalar, recovery_id: u8 },
    Ed25519 { signature: Vec<u8> },                                // JSON array of 64 numbers
}

#[ext_contract(ext_mpc)]
trait MpcSigner { fn sign(&mut self, request: MpcSignRequest); }   // -> args {"request":{...}}

// inside sign_for (after owner/frozen checks and after recording the request):
// ext_mpc::ext(self.mpc.clone())
//     .with_attached_deposit(env::attached_deposit())             // >= 1 yocto, enforced earlier
//     .with_static_gas(Gas::from_tgas(15))                        // floor = live MPC requirement
//     .with_unused_gas_weight(1)                                  // all leftover gas -> MPC (future-proof)
//     .sign(MpcSignRequest { path, payload_v2, domain_id })
//     .then(Self::ext(env::current_account_id())
//         .with_static_gas(Gas::from_tgas(10)).with_unused_gas_weight(0)
//         .on_signed(token_id, request_id))
//
// #[private] pub fn on_signed(&mut self, token_id: TokenId, request_id: u64) -> Option<MpcSignature> {
//     /* 1. decrement/clear the pending marker FIRST (cheap, cannot panic) */
//     match env::promise_result_checked(0, 2048) {                // raw bytes: a parse failure can never revert step 1
//         Ok(bytes) => near_sdk::serde_json::from_slice::<MpcSignature>(&bytes).ok(), // log raw on parse failure
//         Err(_) => None,                                         // Failed (MPC panic or timeout) or TooLong
//     }
// }
```
Gotchas tested: `domain_id` is a u64 JSON number; `#[near(serializers=[json])]` plus `#[serde(tag="scheme")]` compiles and works with cargo-near ABI generation. `PromiseError` in 5.29.1 has **two** variants, `Failed` and `TooLong(usize)`. `env::promise_result` is deprecated in favor of `promise_result_checked(idx, max_len)`. [VERIFIED build + live]

### Crate or own types?
`near-mpc-contract-interface` / `near-mpc-crypto-types` / `near-mpc-sdk` **0.0.1** are on crates.io (published 2026-03-12). They are **stale**: they still enforce the old EdDSA lower bound of 32 bytes (`EDDSA_PAYLOAD_SIZE_LOWER_BOUND_BYTES = 32`), they pull in `borsh`/`derive_more`/`serde_with`/`sha2` plus optional `k256`/`curve25519-dalek`, and the repo's current crates depend on the unpublished `mpc-primitives`. [VERIFIED crates.io API + tarballs] **Recommendation: define the ~30 lines of types above yourself.** The wire format is the stable public contract (the near/mpc README says "The serialized (JSON/borsh) wire format of these types *is* the public contract").

## Gotchas & failure modes

### What `on_signed` sees

All rows below come from the real MPC unless they say "mock". The mock reproduces the MPC 3.17.0 yield code: `promise_yield_create` with a 7 Tgas callback; on `Err` it returns a promise to a 2 Tgas `fail_on_timeout` that panics `Request has timed out.` [VERIFIED]

| failure | where it fails | callback receives | after | `pending` |
|---|---|---|---|---|
| bad hex / wrong length / missing field | MPC arg parse | `Err(PromiseError::Failed)` | ~3 blocks, 3 s | decremented |
| deposit 0 forwarded | MPC precondition | `Err(Failed)` | 3 s | decremented |
| MPC static gas < 15 Tgas | MPC precondition | `Err(Failed)` | 3.4 s | decremented |
| ECDSA payload ≥ n, wrong domain / purpose | MPC | `Err(Failed)` | 3 s | decremented |
| **yield timeout** (no MPC response in 200 blocks) | MPC `fail_on_timeout` | `Err(Failed)` | **~203 blocks, 115–116 s** | decremented |
| total attached gas < static allocations + ~3 Tgas | `sign_for` itself (`Exceeded the prepaid gas.`) | — (whole receipt reverts, no promises) | 2 blocks | unchanged |
| callback static gas 0 | `sign_for` (`FunctionCallZeroAttachedGas`) | — (reverts) | — | unchanged |
| **callback runs out of gas** (0.3 Tgas) | `on_signed` | callback fails, its state changes revert | — | **STUCK** (and the signature is still public) |
| **success value doesn't match the typed struct** (mock) | near-sdk glue: ``Failed to deserialize callback using JSON. Error: `invalid type: … expected struct K256AffinePoint` `` | panic before your code runs | — | **STUCK** with `#[callback_result] Result<MpcSignature,_>`; OK with raw read |

The callback only receives `PromiseError::Failed`; the MPC's error text isn't passed to it. To show *why* a request failed, the frontend or indexer reads the MPC receipt's `Failure` from the tx status. A direct (non-contract) caller's tx ends as `Failure … "Smart contract panicked: Request has timed out."` after ~119 s. [VERIFIED]

### Other gotchas
- **`big_r` prefix ≠ recovery parity.** They matched in only 24 of 50 signatures, because `s` is normalized to low-S after signing. Use `recovery_id`. [VERIFIED]
- **README and docs are stale:** they say "at least 10 Tgas" (live is 15), "Eddsa between 32 and 1232 bytes" (live is 0–1232 since 3.14.0, PR #3876), and "payload must be < p" (the actual check is `Scalar::from_repr`, i.e. < **n**). docs.near.org still names the argument `payload`; that name is legacy-only, as a raw ECDSA byte array. [VERIFIED]
- **Signatures are public before and regardless of your callback.** The node's `respond` tx args carry the signature, as does the MPC callback receipt's `SuccessValue`. Nodes drop requests after `REQUEST_EXPIRATION_BLOCKS = 200`, and a `respond` arriving after the yield timed out fails (`This sign request has timed out, was completed, or never existed.`), but its args are still on-chain. So treat **every requested payload as possibly signed**, including timed-out ones. [VERIFIED for the callback-OOG case; the timeout case is SOURCED from `node/src/requests/queue.rs` and `contract/src/api/sign.rs`] (→ `sec`, kb/70)
- **No per-predecessor rate limit** in the contract. The only cap is 128 identical in-flight requests. Network throughput (presignature pools) is unmeasured beyond 10 concurrent. [SOURCED/VERIFIED]
- **RPC behaviour on long calls:** a blocking `send_tx(EXECUTED_OPTIMISTIC)` returns the signature in ~7 s (`FINAL` ~13 s). On the timeout path FastNEAR returns `HANDLER_ERROR` with `cause: "PENDING"` and a partial status after **~30 s**, so poll `tx`/`EXPERIMENTAL_tx_status`. `send_tx(wait_until=NONE)` **silently drops** invalid txs. `DepositWithFunctionCall` was verified; `InvalidNonce` is inferred from a concurrent tx that never landed. [VERIFIED] (→ `web`, kb/40)
- **Prepaid gas is held at `min_gas_purchase_price` = 1e9 yocto/gas**, which is 10× the 1e8 gas price. The user needs ~0.05 NEAR free per 50 Tgas attached; it's refunded a few blocks later, and only ~0.0012 NEAR is burnt. Attaching more gas costs nothing extra (21–100 Tgas all burnt 0.00117 NEAR). chainsig.js attaches **300 Tgas** (0.3 NEAR hold) to direct signs. [VERIFIED]
- **Toolchain:** near-sdk 5.29.1 resolves `near-sdk-env 0.1.7`, which needs rustc 1.95 (released 2026-10-19). With the 1.93.0 toolchain run `cargo update near-sdk-env --precise 0.1.6` and commit Cargo.lock. [VERIFIED] (→ `sdk`, kb/20)
- **RPC endpoints (2026-10-21):** `rpc.testnet.near.org` returns `-429 "THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!"`. FastNEAR rate-limits shared IPs (HTTP 429 or JSON-RPC `-429`). `https://near-testnet.drpc.org` works as a fallback. Right after a tx, `finality: final` views lag 1–3 s. [VERIFIED] (→ `web`, kb/41)

## Recommendations for Satchel (concrete)

**P0 (Nov 1–2):**
1. **Keep BTC in Phase 1.** Contract-initiated signing met the go/no-go bar with a wide margin.
2. **Constants for `sign_for`:**
   - MPC call: `with_static_gas(Gas::from_tgas(15))` plus `.with_unused_gas_weight(1)`.
   - `on_signed`: `with_static_gas(Gas::from_tgas(10))` plus `.with_unused_gas_weight(0)`.
   - Fail fast with `require!(env::prepaid_gas() >= Gas::from_tgas(40), "ERR_GAS")`. Do this before any state change, since 28 Tgas is the hard floor with a trivial body.
   - The frontend, CLI and e2e attach **50 Tgas**.
   - Re-measure `sign_for`'s own burn once ownership checks and the log write are in, and keep a margin of ≥ 10 Tgas.
3. **Deposit:** `require!(env::attached_deposit() >= 1 yocto)` and **forward `env::attached_deposit()`** to MPC. Frontends attach exactly 1 yocto. This keeps the MPC's "full-access key only" guarantee, which was verified against a function-call key. If MPC ever raises its deposit, users can attach more without redeploying a locked contract. Document that any excess is refunded by MPC to the Satchel account. Optionally cap it, e.g. ≤ 0.01 NEAR.
4. **Callback:** don't use typed `#[callback_result]`. Clear the pending marker first, then `env::promise_result_checked(0, 2048)`, then a lenient parse. Never panic in `on_signed`, and keep it bounded (no unbounded iteration).
5. **Record each request in `sign_for` (request time):** `{token_id, chain, payload_hash, block_height}` plus a NEP-297 event. `on_signed` only marks completion. Clean-history must assume every logged request produced a usable signature. (→ sec)
6. **Freeze logic that cannot be bricked:** in a locked contract, a stuck `pending_signs` would block `list` for that token forever. Store `last_sign_request_height` per token and gate `list` on `env::block_height() >= last_sign_request_height + 250`. The margin covers the 200-block yield, ~3 blocks of callbacks, and a late `respond`: nodes expire requests by their *own* indexer height (stale threshold 10 blocks) and retry a lost tx after 10 s, so a signature can surface ~215 blocks after the request. 250 blocks is ≈ 140 s on testnet. Keep `pending_signs` for UX only, and treat entries older than 250 blocks as resolved. The plan's 210-block post-listing cooldown is then a second, independent guarantee. [SOURCED `node/src/requests/queue.rs` constants; the margin is a judgement call]
7. **Payload mapping:** `Btc|Evm` → `{"Ecdsa": hex32}` + `domain_id 0`; `Sol` → `{"Eddsa": hex(message)}` + `domain_id 1`. Validate before calling MPC (Ecdsa: 64 hex chars; Eddsa: ≤ 2464 hex chars) so users don't burn gas on doomed requests. The paths `satchel/{id}/{btc|evm|sol}` are valid as-is.
8. **Use `recovery_id`** for EVM yParity/v. Never parse parity from `big_r`.

**P1:**
9. **UX timing** (→ ux): p50 ~7 s, p90 ~7.5 s, worst seen 14.3 s; the timeout fires at ~115 s (testnet) to ~135 s (mainnet). Suggested copy: "Usually about 10 seconds" at 0–15 s; "Taking longer than usual" at 20 s; "The network allows up to about 2 minutes" at 60 s. Show the timeout message when the tx resolves with `Err`, or at 150 s.
10. **Frontend RPC:** submit, then poll `EXPERIMENTAL_tx_status` with `wait_until: EXECUTED_OPTIMISTIC` until a terminal status, tolerating `PENDING`/`TIMEOUT`/`UNKNOWN_TRANSACTION` for up to ~150 s. Configure a fallback RPC (drpc). Backend/e2e workers must submit sequentially per key.
11. **Sandbox tests** (→ sdk, kb/21): copy the mock-signer idea (`research/spikes/mpc/mock/src/lib.rs`, ~70 lines). Add a `respond(data_id, response)` that calls `env::promise_yield_resume`, so tests can drive success, timeout (by not responding, or by sandbox fast-forward past 200 blocks; that yields time out in sandbox is [ASSUMED], so sdk should verify) and malformed responses.
12. **Store the MPC account id** at init (`v1.signer-prod.testnet`) and re-check `version()` and the code hash on Nov 1:
    `near contract call-function as-read-only v1.signer-prod.testnet version json-args '{}' network-config testnet now`
    Expect `3.17.0`. If it changed, diff `crates/contract/src/api/sign.rs` against the new tag.

**P2:**
13. `verify_foreign_transaction` could later make parts of clean-history on-chain verifiable (e.g. proving a BTC tx's inclusion). Ethereum is not enabled and the testnet Bitcoin network is unverified, so leave it out of scope for the hackathon.

## Deltas vs plan (near_hackathon.md)

| Plan says | Finding | Change |
|---|---|---|
| L20 "`sign` takes payload, path and `domain_id`" | The field is **`payload_v2`** (`{"Ecdsa"\|"Eddsa": hex}`) inside a `request` wrapper. `payload` is legacy (ECDSA byte array only). [VERIFIED] | Use `{"request":{"path","payload_v2","domain_id"}}`. |
| L20 "yields up to 200 blocks, around 2 minutes" | **Confirmed.** Protocol param 200; measured 115–119 s on testnet; ~119–135 s expected on mainnet. Typical success is **~7 s**. [VERIFIED] | Keep; fix UX copy (Rec 9). |
| L21 PR #4385: "1 yoctoNEAR deposit … about 7 Tgas (with 10 Tgas attached)" | PR #4385 was **closed unmerged** (2026-10-02); the quote repeats stale README text. Live: deposit ≥ 1 yocto (confirmed); **prepaid ≥ 15 Tgas** (config; 10 Tgas fails); the sign receipt burns 4.3 Tgas plus 7 Tgas reserved (3.5 burnt). [VERIFIED] | Use 15 Tgas as the floor. |
| L82 "check `big_r`, `s`, `recovery_id` and gas" | Done. Shapes, low-S, recovery mapping and gas are documented above. | — |
| L85 Go/no-go "if more than 1 of 10 contract signs time out…" | **0/10** (and 0/44 contract MPC requests overall). [VERIFIED] | **GO**: BTC stays in Phase 1. |
| L104 S-6 "`list` fails while `pending_signs > 0`" | The counter can get stuck (callback OOG; typed-callback parse panic), which would permanently block `list` in a locked contract. | Gate on `last_sign_request_height + 250` (Rec 6). |
| L147 "`on_signed` (logs SignatureIssued)" and L161 `sig_log` | Signatures are public even when `on_signed` fails or the request times out; re-signing gives new signatures. | Log at request time in `sign_for` (Rec 5). |
| L178–179 `on_signed(… #[callback_result] r: Result<SignatureResponse, PromiseError>)` | A deserialization failure panics in near-sdk glue and leaves the counter stuck. `PromiseError` also has `TooLong`. | Raw `promise_result_checked` (Rec 4). |
| L189 `.with_static_gas(Gas::from_tgas(15))` "Attach about 50 Tgas" | 15 Tgas is **exactly** the minimum (zero margin, and governance-changeable). 50 Tgas total is fine (minimum ≈ 28). | 15 floor + weight 1; callback 10 static, weight 0; require ≥ 40 (Rec 2). |
| L189 "confirm argument names against near/mpc `crates/contract` on Nov 1" | Confirmed today at 3.17.0 / `main` 13f42bf4. | Re-run the `version` + code-hash check on Nov 1 (Rec 12). |
| L189 `payload_v2: Ecdsa(hex) \| Eddsa(hex)` | Correct. Eddsa = full message (≤ 1232 B), not a hash; Ecdsa < n, no `0x`. | Validate before calling (Rec 7). |
| L194 "about 0.005 NEAR per sign (estimate)" | **~0.0012 NEAR** burnt per contract-initiated sign (12.4 Tgas × 1e8) + 1 yocto. A temporary 0.05 NEAR hold per 50 Tgas is refunded. [VERIFIED] | Update the cost line. |
| L128 SigningProgress "at 30 s 'Usually under a minute'" | p50 is ~7 s, so 30 s is already abnormal. | Rec 9. |
| L217 "sandbox has no MPC → mock-signer" | Agreed. A yield-based mock reproduces the real timeout and failure semantics. | Rec 11. |
| L235 "MPC interface drift (`payload_v2`, `domain_id`)" | The interface is stable and backward compatible (legacy fields still accepted). Drift risks for a locked contract: the **gas floor** (config), the **deposit** (code constant `SIGN_DEPOSIT_YOCTONEAR = 1`, changeable by upgrade), and the MPC **account id**. | Recs 2, 3 and 12 mitigate the first two; the account id is an accepted risk. |
| (missing) `latest_key_version` | It returns 3 = the ForeignTx domain. | Hardcode domains 0 and 1. |
| (missing) toolchain | near-sdk 5.29.1 + rustc 1.93 needs `near-sdk-env` pinned to 0.1.6. | → sdk / Nov 1 lockfile. |

## Open questions / human actions
- **No blockers.** Nothing in this area needs a human before Nov 1.
- Human (optional): a FastNEAR API key or a paid RPC for the team would avoid the shared-IP 429s seen during Phase 0 (→ web). On Nov 1 an engineer should re-run the version and code-hash check (Rec 12).
- Open: MPC behaviour under real load (more than 10 concurrent requests, or network-wide congestion) is unmeasured, and so is mainnet latency. Expect similar latency; plan the recorded 1Click clip with retries.
- Open: whether a late `respond` after a timeout actually lands on testnet. This was inferred from source and not observed (forcing it needs node cooperation). Clean-history should assume it can.
- Spike leftovers: `spike.` and `spike2.satchel-spk-mpc-e9ea1a.testnet` each hold `pending = 1` (deliberately stuck). `mock.` is a never-resolving signer. All are throwaway; delete them or leave them. The parent account has 3.39 NEAR left.
