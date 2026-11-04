# Bitcoin testnet4 end-to-end (P2WPKH via NEAR Chain Signatures)

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: btc · Checked: 2026-10-21 · Confidence: high for MPC, contract and tx building (run live today); medium for testnet4 confirmation timing and faucets (they change day to day)
> Primary sources: near/mpc tag `3.17.0` (`d0fc87b`; deployed `v1.signer-prod.testnet` reports `version() = "3.17.0"`): `crates/contract/src/api/sign.rs`, `crates/near-mpc-signature-verifier/src/lib.rs`, `crates/node/src/indexer/handler.rs`. near/mpc `main` @ `13f42bf` (2026-10-21). chainsig.js v1.1.16 (`17aec4f`): `src/chain-adapters/Bitcoin/*`. bitcoinjs-lib 7.0.4 (npm, 2026-10-13). BIP143 / BIP125 / BIP94. Live mempool.space testnet4 API. Spike log: `research/spikes/btc/RESULTS.md` (every tx hash and raw output referenced below).

## TL;DR: what an implementer must know
1. **Address = P2WPKH `tb1q…` from the compressed domain-0 derived key.** Live `derived_public_key` + bitcoinjs-lib 7, chainsig.js `deriveAddressAndPublicKey`, and chainsig.js local derivation all give the same address [VERIFIED]. Testnet4 shares testnet3's address params, so use `bitcoin.networks.testnet` / chainsig.js `network: 'testnet'`. P2TR is impossible: the MPC has no secp256k1-Schnorr domain [VERIFIED live `state`].
2. **The MPC already returns low-S signatures.** The contract's `respond` verifies with `ecrecover(…, malleability_flag=true)`, which rejects s > n/2 [SOURCED 3.17.0]. All 18 signatures obtained today were low-S [VERIFIED]. bitcoinjs-lib and chainsig.js do **not** normalize, so keep a defensive `s <= n/2` assert. No ECC library is needed to sign.
3. **Never put two `sign` actions in one receipt.** The MPC node indexer ignores receipts with `actions.len() != 1` (`handler.rs:292` @3.17.0). A 2-action tx was accepted by the contract and then **timed out after 201 blocks (~119 s) for both actions**, wasting 22 Tgas [VERIFIED].
4. **For N inputs, use one contract call that fans out N `sign` promises joined with `.and()`.** Verified for 2 and 4 inputs: all N signs land in the same block, all results return in one callback, and wall time is ~9.2 s regardless of N. Cost: ~9 Tgas burnt per input plus ~4.5 Tgas, about 0.001 NEAR per input [VERIFIED]. Attach ≥ ~5 + 15·N + 10 Tgas: 2 inputs at 40 Tgas → `Exceeded the prepaid gas.`, at 45 Tgas → OK [VERIFIED].
5. **Recommended `sign_for` shape for BTC:** the caller passes **BIP143 preimages** (182 bytes per P2WPKH input). The contract enforces `SIGHASH_ALL`, a P2WPKH scriptCode, one tx for all inputs and `sha256d(outpoints) == hashPrevouts` (all inputs present), then signs `sha256(sha256(preimage))` computed on-chain with `env::sha256`. That on-chain hash equals bitcoinjs `hashForWitnessV0` [VERIFIED], and the logged outpoints (txid:vout) are what BTC "clean history" checks.
6. **mempool.space is the only public testnet4 API with an address index.** It sends `Access-Control-Allow-Origin: *`, but preflight `OPTIONS` returns 404. Browsers can therefore only make *simple* requests: plain GETs, and `POST /tx` with the raw hex as text/plain (fetch's default for a string body). Anything with `Content-Type: application/json` or custom headers fails [VERIFIED in Chrome]. `mempool.emzy.de/testnet4/api` is a testnet4 mirror: tip, fees, outspends, `POST /tx` and `/txs/test` work, but every `/address/*` returns 404. **`testnet4.mempool.space` is mainnet, and Blockstream has no testnet4 API** [VERIFIED].
7. **Testnet4 confirmations are erratic.** Of the last 450 blocks, 424 are difficulty-1 blocks every ~20 min, mostly empty. Real-difficulty blocks (which carry 85% of txs) arrived with a median gap of 2 h and a max of 21 h [VERIFIED].
   A live 5 h watch (11:24Z–16:23Z) saw blocks 157200–157215, all coinbase-only. So there was no tx-carrying block for **10.7 h+** after 05:42Z, and the mempool grew from 336 to 513 txs.
   Mempool acceptance is instant, so the UI should treat "accepted by the network" as *Sent* and never wait for a confirmation on camera.
8. **Funding needs a human.** The mempool.space faucet needs a GitHub-linked account; coinfaucet.eu and faucet.testnet4.dev use hCaptcha; Crypto Chief needs an account. CypherFaucet has a keyless API but failed on all 23 attempts between 11:31Z and 15:10Z (`send_failed` or Cloudflare 522) [VERIFIED]. Fund early and fund several UTXOs per demo token.
9. **Two bitcoinjs-lib versions.** chainsig.js 1.1.16 nests bitcoinjs-lib **6.1.9** (Buffer + `number` values) while the latest is **7.0.4** (Uint8Array + `bigint`) [VERIFIED `npm ls`]. Don't pass PSBTs or objects between them. Recommendation: build BTC txs with bitcoinjs-lib 7 directly, not chainsig.js's BTC adapter. The adapter sets no RBF, uses P2PKH-sized fee estimates (1.6–3× overpay), and can't expose preimages.
10. **Fees and dust:** P2WPKH vsize = 10.5 + 68·in + 31·out (1-in/2-out = 141 vB, 2-in/2-out = 209 vB) [VERIFIED]. Dust: P2WPKH 294, P2TR 330, P2SH 540, P2PKH 546 sats. Change below 294 must go to the fee: coinselect with P2WPKH size hints produced a 197-sat change output at 1 sat/vB [VERIFIED]. Use ≥ 2 sat/vB on testnet4, and set nSequence `0xfffffffd` (BIP125).
11. **Paying a `tb1p…` (taproot) recipient requires `bitcoin.initEccLib(ecc)`**, or bitcoinjs-lib 7 throws "No ECC Library provided". `@bitcoinerlab/secp256k1` (pure JS) works, so no wasm config is needed [VERIFIED]. Use `@noble/curves` for signature verification.
12. **Esplora traps:** for a txid that doesn't exist, `/tx/:id/outspend/:v` returns `{"spent":false}` and `/tx/:id/status` returns `{"confirmed":false}`, both HTTP 200. Only `/tx/:id` and `/tx/:id/outspends` return 404 [VERIFIED]. Check existence first.

## Verified facts & measurements

### MPC signing (direct calls from the spike account; RPC `near-testnet.drpc.org`)
| Mode | NEAR tx | Wall time send→FINAL | Gas burnt | Outcome |
|---|---|---|---|---|
| 1 sign (seq #1) | `8Du9bBU9znLouRRETMwMf4CCvkodwYDeFVyRxQXkJ4vo` | 9.25 s | 8.604 Tgas = `sign` 4.33 + resume callback 3.51 + 2×0.22 refunds | ok, low-S |
| 1 sign (seq #2) | `AhP1NbUUYBPiX7dDhf4ZhLtJFkDgwUHHfcuKKPYW3XuX` | 9.23 s | 8.605 Tgas | ok, low-S |
| 2 txs in parallel (nonces n+1, n+2) | `AP8YdW7Q…Zbsmn`, `13GEyKUv…i9UgV` | 7.07 s for both (seq total 18.6 s) | 8.56 each | ok, ok |
| **1 tx, 2 `sign` actions** | `9afVH1GCZibSeJwPNEofmj1R5rQPxbDPfCN7ge6Z2yC6` | 118.8 s | 22.37 Tgas | **both "Request has timed out."** |

- Latency in blocks, from the `sign` receipt to the yield-resume callback: 8, 6, 6, 6 (direct) and 6–8 (contract fan-out). The timeout fired at +201 blocks [VERIFIED `11-latency-blocks.mjs`].
- Burnt per direct sign: about 0.000816 NEAR, plus the 1 yocto deposit. Each call returns a different (r, s) for the same payload (randomized threshold ECDSA) [VERIFIED].
- Deployed config: `sign_call_gas_attachment_requirement_tera_gas: 15` (prepaid gas on the `sign` receipt must be ≥ 15 Tgas) and `return_signature_and_clean_state_on_success_call_tera_gas: 7` [VERIFIED `near contract call-function as-read-only v1.signer-prod.testnet config …`].

### Contract fan-out spike (`fanout.satchel-spk-btc-e9ea1a.testnet`, near-sdk 5.29.1)
| Call | NEAR tx | Wall | Gas burnt / NEAR | Result |
|---|---|---|---|---|
| 2 inputs, 100 Tgas | `Ay74ew1ehz91Yu3aradtqadrAURsjLFXWxkCrzsepCgJ` | 9.22 s | 21.88 Tgas / 0.00205 | 2/2 sigs valid. Entry receipt 3.11 Tgas (all preimage checks + 2× sha256d + event); callback 1.47 |
| 4 inputs, 100 Tgas | `Ugim2Ja66xFffCwnG1ehCv1uMijZb75Z4WZmaQkcADf` | 9.23 s | 39.88 Tgas / 0.00376 | 4/4 valid. 4 `sign` receipts in one block, 4 callbacks in one block |
| 4 inputs, **80 Tgas** | `DwQmE3AWmLzo4Uw6XUXTXR8WAgc4VUShKWS3uhDC2H9N` | 10.2 s | 39.87 | 4/4 |
| 2 inputs, **45 Tgas** | `5NijqqmonfBY9WBKEmdvYRZ2dLTHbWmFda9jYK7mbdaH` | 9.4 s | 21.91 | 2/2 |
| 2 inputs, **40 Tgas** | `AeJoyYgx9zzj8NRo5gtUrsbAEjQDVRtXrJcnU2Ce59pT` | — | 3.92 | `Exceeded the prepaid gas.` (entry receipt, no MPC call) |
| preimage with sighash NONE | `3gM2JEbWdfN1xvbMogA1Xia36p73mqs23xaoEkbJFRuZ` | — | 2.06 | `ERR_SIGHASH_NOT_ALL` |
| 1 of 2 preimages | `6eCzQrPR4iqTAaiHy8sRCJFZ8U1rLsemJgFvgV9Tzv5B` | — | 2.02 | `ERR_PREVOUTS_INCOMPLETE` |

- The on-chain payload logged by the contract matched bitcoinjs `hashForWitnessV0` for every input, and the returned signatures verify strictly against the contract-derived key `023e36ee…1df6` (`tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a`) [VERIFIED].
- The tx's top-level result (`getTransactionLastResult`) is the callback's `Vec<Option<SignatureResponse>>`, so the frontend gets every signature from one outcome [VERIFIED].
- `with_static_gas(14 Tgas)` still worked (`BTp7dHAN…`) because near-sdk splits unused prepaid gas by weight (default 1), which lifts each `sign` above 15. Keep it at ≥ 15 anyway.

### Offline tx over fabricated outpoints (P0 #5, address unfunded)
2-input tx: `37ea6fce…42a0:0` (30,000 sat) and `092c7db5…5072:1` (25,000 sat) → 40,000 to `tb1qlj64…5p7q`, 14,582 change to self, fee 418 sat.
- txid `5cbd4ff872dc16c1d1f5fcf2c9ea8e9047c9b20bec1cf4674532272e14a199a1`, vsize 208 (estimate 209), 2.01 sat/vB.
- Real MPC sigs: strict validation `true`; `finalizeAllInputs` and `extractTransaction` OK.
- `POST /txs/test` → `"reject-reason":"missing-inputs"`; `POST /tx` → `400 sendrawtransaction RPC error: {"code":-25,"message":"bad-txns-inputs-missingorspent"}` [VERIFIED].
- High-S variant (s′ = n − s): bitcoinjs `validateSignaturesOfInput` with a loose verifier returns **true**, a strict verifier returns false. Same txid, different wtxid.

### mempool.space testnet4 (2026-10-21)
- Backend: `mempool-electrs 3.4.0-dev`, `x-bitcoin-version: /Satoshi:30.0.0/`. Tip ~157,200.
- Genesis `00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043`.
- No rate-limit headers. 25 concurrent GETs all returned 200. Limits are unpublished (reported soft limit ~10 req/s; repeat abusers get banned) [SOURCED](https://github.com/mempool/mempool/issues/4106).
- Fees: `{"fastestFee":1,"halfHourFee":1,"hourFee":1,"economyFee":1,"minimumFee":1}`. Difficulty-1 blocks included txs as low as 0.1 sat/vB [VERIFIED block `feeRange`].

## Reference: exact APIs, types, commands, tested snippets

### 1. Data API (base `https://mempool.space/testnet4/api`; fallback, no address endpoints: `https://mempool.emzy.de/testnet4/api`)
| Purpose | Request | Response (tested) | Browser |
|---|---|---|---|
| Tip height | `GET /blocks/tip/height` | `157200` (text/plain) | ✓ |
| Network guard | `GET /block-height/0` | must equal `00000000da84…f043` (mainnet would give `000000000019d6…`) | ✓ |
| Fees | `GET /v1/fees/recommended` | `{"fastestFee":1,…,"minimumFee":1}` (sat/vB) | ✓ (full CORS) |
| Balance | `GET /address/:a` | `{"chain_stats":{funded_txo_sum,spent_txo_sum,tx_count,…},"mempool_stats":{…}}`. Balance = (funded − spent) of chain + mempool | ✓ |
| UTXOs | `GET /address/:a/utxo` | `[{"txid","vout","value","status":{"confirmed",block_height,…}}]`, includes unconfirmed | ✓ |
| History | `GET /address/:a/txs` (newest first; returned 50 when the mempool part was empty), `/txs/mempool`, then `/txs/chain/:last_seen_txid` (pages of 25) | esplora tx objects (`txid, vin[].prevout, vout[], fee, weight, status`) | ✓ |
| Tx | `GET /tx/:txid`, `/tx/:txid/hex`, `/tx/:txid/status` | 404 `Transaction not found` if unknown (but `/status` returns `{"confirmed":false}`!) | ✓ |
| Outpoint spent? | `GET /tx/:txid/outspend/:vout` | `{"spent":false}` or `{"spent":true,"txid":…,"vin":0,"status":{"confirmed":true,"block_height":…}}` | ✓ |
| All outpoints | `GET /tx/:txid/outspends` | array of the above; 404 if tx unknown | ✓ |
| Dry run | `POST /txs/test` body `["<hex>"]` | `[{"txid","wtxid","allowed":false,"reject-reason":"missing-inputs"}]` | ✓ **only as text/plain** |
| Broadcast | `POST /tx` body = raw hex | 200 txid; 400 `sendrawtransaction RPC error: {"code":-25,…}` | ✓ **only as text/plain** |

Push instead of polling: `wss://mempool.space/testnet4/api/v1/ws` works from Node 22 and from real Chrome on a `localhost` origin [VERIFIED `15-websocket.mjs`; got `open` + `blocks`].
Send `{"action":"want","data":["blocks"]}` and `{"track-address":"<tb1q…>"}`. Responses carry `address-transactions` (new mempool txs) and `block-transactions` (newly confirmed) [SOURCED](https://mempool.space/docs/api/websocket). This drives the "Sent → Confirmed" flip without hammering REST.

Explorer links: `https://mempool.space/testnet4/tx/<txid>`, `…/testnet4/address/<addr>`, `…/testnet4/block/<hash|height>`.

```js
// Browser-safe broadcast: no headers => text/plain => no preflight (preflight would 404 and fail)
const r = await fetch('https://mempool.space/testnet4/api/tx', { method: 'POST', body: rawHex })
if (!r.ok) throw new Error(await r.text()) // e.g. 'sendrawtransaction RPC error: {"code":-26,"message":"…"}'
const txid = await r.text()
```

### 2. Address derivation (bitcoinjs-lib 7.0.4, tested in `01-derive.mjs`)
```js
import * as bitcoin from 'bitcoinjs-lib'
import bs58 from 'bs58'
const NET = bitcoin.networks.testnet // bech32 'tb'; identical for testnet3/testnet4/signet
// view: v1.signer-prod.testnet.derived_public_key({ path, predecessor, domain_id: 0 }) -> "secp256k1:<base58 64B x||y>"
const naj = await view('v1.signer-prod.testnet', 'derived_public_key',
  { path: `satchel/${tokenId}/btc`, predecessor: 'satchel.<team>.testnet', domain_id: 0 })
const xy = bs58.decode(naj.split(':')[1])                 // 64 bytes
const pubkey = Uint8Array.from([xy[63] & 1 ? 0x03 : 0x02, ...xy.slice(0, 32)]) // compressed SEC1
const self = bitcoin.payments.p2wpkh({ pubkey, network: NET }) // self.address, self.output (0014{20}), self.hash
```
Live vectors [VERIFIED]: predecessor `satchel-spk-btc-e9ea1a.testnet` + `satchel/1/btc` → `021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d` → `tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7`. `satchel/2/btc` → `tb1qakdsc8u04sr8ujluyjfczud9mvx8ulx06ddkl7`. Root `secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3` is the same live and in chainsig.js `ROOT_PUBLIC_KEYS.TESTNET`.

chainsig.js equivalent (local derivation via its hardcoded root; ~15 ms vs ~170 ms for the view):
```js
import { chainAdapters, contracts } from 'chainsig.js' // 1.1.16
const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
const btc = new chainAdapters.btc.Bitcoin({ network: 'testnet', contract,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })
const { address, publicKey } = await btc.deriveAddressAndPublicKey('satchel.<team>.testnet', 'satchel/1/btc')
```

### 3. Build the tx and per-input preimages (tested in `02-build-offline.mjs`, `lib.mjs`)
```js
const psbt = new bitcoin.Psbt({ network: NET })
psbt.setVersion(2); psbt.setLocktime(0)
for (const u of chosen) psbt.addInput({ hash: u.txid /* display hex; bitcoinjs reverses it */, index: u.vout,
  sequence: 0xfffffffd /* BIP125 */, witnessUtxo: { script: self.output, value: BigInt(u.value) } })
psbt.addOutput({ address: to, value: amount })                   // bigint in v7
if (change >= 294n) psbt.addOutput({ address: self.address, value: change }) // change back to the same Satchel address

const tx = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
const scriptCode = bitcoin.payments.p2pkh({ hash: self.hash }).output // 76a914{pkh}88ac
const sighashes = chosen.map((u, i) => tx.hashForWitnessV0(i, scriptCode, BigInt(u.value), bitcoin.Transaction.SIGHASH_ALL))
const preimages = chosen.map((u, i) => bip143PreimageP2WPKH(tx, i, self.hash, BigInt(u.value))) // sha256d(p) == sighash
```
```js
// Browser-safe (no Buffer); byte-identical to the Node version on all 8 spike inputs [VERIFIED 14-preimage-browser.mjs]
import { sha256 } from '@noble/hashes/sha2.js'
const sha256d = (b) => sha256(sha256(b))
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length } return o }
const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b }
const u64 = (n) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b }
// BIP143 preimage, P2WPKH, SIGHASH_ALL only -> always 182 bytes. tx = bitcoinjs Transaction (v7), value = bigint sats
export function bip143PreimageP2WPKH(tx, i, pkh20, value) {
  const prevouts = cat(...tx.ins.flatMap((x) => [x.hash, u32(x.index)]))
  const seqs = cat(...tx.ins.map((x) => u32(x.sequence)))
  const outs = cat(...tx.outs.flatMap((o) => [u64(o.value), Uint8Array.of(o.script.length), o.script]))
  const inp = tx.ins[i]
  return cat(u32(tx.version), sha256d(prevouts), sha256d(seqs), inp.hash, u32(inp.index), // outpoint: txid little-endian
    Uint8Array.of(0x19, 0x76, 0xa9, 0x14), pkh20, Uint8Array.of(0x88, 0xac),              // scriptCode
    u64(value), u32(inp.sequence), sha256d(outs), u32(tx.locktime), u32(1 /* SIGHASH_ALL */))
}
```
(`outs` uses a 1-byte varint for the script length, which holds for all standard output scripts up to 252 bytes.)

**Preimage layout (P2WPKH, 182 bytes), used by the contract and the indexer:**
| Offset | Len | Field |
|---|---|---|
| 0 | 4 | nVersion (LE) |
| 4 | 32 | hashPrevouts = sha256d(all outpoints) |
| 36 | 32 | hashSequence |
| 68 | 32 | outpoint txid, **little-endian** (reverse for explorer display) |
| 100 | 4 | outpoint vout (LE) |
| 104 | 26 | scriptCode `19 76 a9 14 <pkh20> 88 ac` |
| 130 | 8 | amount in sats (LE) |
| 138 | 4 | nSequence |
| 142 | 32 | hashOutputs |
| 174 | 4 | nLockTime |
| 178 | 4 | sighash type (LE) → must be `01 00 00 00` |

### 4. Contract side (Rust, near-sdk 5.29.1; tested in `contract-fanout/src/lib.rs`)
```rust
#[derive(Serialize, Deserialize, Clone)] #[serde(crate = "near_sdk::serde")]
pub enum PayloadV2 { Ecdsa(String) }
#[derive(Serialize, Deserialize, Clone)] #[serde(crate = "near_sdk::serde")]
pub struct SignRequest { pub payload_v2: PayloadV2, pub path: String, pub domain_id: u32 }
#[ext_contract(ext_mpc)] trait Mpc { fn sign(&mut self, request: SignRequest); }
fn sha256d(b: &[u8]) -> Vec<u8> { env::sha256(&env::sha256(b)) }

#[payable]
pub fn sign_btc(&mut self, token_id: String, preimages_hex: Vec<String>) -> Promise {
    // (product: owner/delegate/freeze checks + pending_signs += n go here)
    let n = preimages_hex.len();
    require!(n >= 1 && n <= 13, "ERR_INPUTS");
    require!(env::attached_deposit() >= NearToken::from_yoctonear(n as u128), "ERR_DEPOSIT"); // forces a full-access-key signature
    let pre: Vec<Vec<u8>> = preimages_hex.iter().map(|h| hex::decode(h).unwrap_or_else(|_| env::panic_str("ERR_HEX"))).collect();
    for p in &pre {
        require!(p.len() == 182, "ERR_PREIMAGE_LEN");
        require!(p[178..182] == [1, 0, 0, 0], "ERR_SIGHASH_NOT_ALL");
        require!(p[104..108] == [0x19, 0x76, 0xa9, 0x14] && p[128..130] == [0x88, 0xac], "ERR_SCRIPTCODE");
    }
    let f = &pre[0];
    for p in &pre[1..] {
        require!(p[0..68] == f[0..68] && p[104..130] == f[104..130] && p[142..182] == f[142..182], "ERR_MIXED_TX");
    }
    let outpoints: Vec<u8> = pre.iter().flat_map(|p| p[68..104].to_vec()).collect();
    require!(sha256d(&outpoints) == f[4..36].to_vec(), "ERR_PREVOUTS_INCOMPLETE"); // all inputs, in order
    let path = format!("satchel/{}/btc", token_id);
    let mut fan: Option<Promise> = None;
    for p in &pre {
        let call = ext_mpc::ext(self.mpc.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(Gas::from_tgas(15))           // MPC requires prepaid >= 15 Tgas
            .sign(SignRequest { payload_v2: PayloadV2::Ecdsa(hex::encode(sha256d(p))), path: path.clone(), domain_id: 0 });
        fan = Some(match fan { None => call, Some(acc) => acc.and(call) }); // separate 1-action receipts
    }
    // emit NEP-297 event with per-input {payload, txid (reverse p[68..100]), vout, amount, hash_outputs}
    fan.unwrap().then(Self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(10)).on_signed_batch(n as u64))
}

#[private]
pub fn on_signed_batch(&mut self, n: u64) -> Vec<Option<serde_json::Value>> {
    (0..n).map(|i| match env::promise_result(i) { // 5.29: deprecated -> use promise_result_checked
        PromiseResult::Successful(v) => serde_json::from_slice(&v).ok(), _ => None }).collect()
    // product: pending_signs -= n; log which inputs failed so the UI can retry
}
```
Build note [VERIFIED]: `near-sdk-env 0.1.7` (published 2026-10-19, MSRV 1.95) satisfies near-sdk 5.29.1's `near-sdk-env = "~0.1.6"`. A fresh lockfile with **edition 2021** resolves 0.1.7 even with `rust-version = "1.93"`, and the 1.93.0 build then fails (`near-sdk-env@0.1.7 requires rustc 1.95`). **Edition 2024** (resolver 3, MSRV-aware) resolves 0.1.6 automatically. Otherwise run `cargo update near-sdk-env --precise 0.1.6`. The wasm is 142 KB.

### 5. MPC response → Bitcoin signature → broadcast (tested in `04-assemble.mjs`)
```js
import { secp256k1 } from '@noble/curves/secp256k1.js' // 2.4.0
const N = secp256k1.Point.CURVE().n, HALF_N = N >> 1n
// resp = {"scheme":"Secp256k1","big_r":{"affine_point":"03…(33B)"},"s":{"scalar":"…(32B)"},"recovery_id":0|1}
function toSig64(resp) {
  const r = BigInt('0x' + resp.big_r.affine_point.slice(2)) % N // x(R) mod n
  let s = BigInt('0x' + resp.s.scalar)
  if (s > HALF_N) s = N - s // never happened on 18 samples (the MPC enforces low-S), but costs nothing
  return hexToBytes(r.toString(16).padStart(64, '0') + s.toString(16).padStart(64, '0')) // from '@noble/hashes/utils.js'
}
const results = getTransactionLastResult(outcome) // near-api-js: Array<resp | null> from on_signed_batch
if (results.some((x) => !x)) throw new Error('some inputs were not signed (timeout) - retry')
const sigs = results.map(toSig64)
for (let i = 0; i < psbt.inputCount; i++) psbt.signInput(i, { publicKey: self.pubkey, sign: () => sigs[i] }) // DER + 0x01 added by bitcoinjs
if (!psbt.validateSignaturesOfAllInputs((pk, msg, sig) => secp256k1.verify(sig, msg, pk, { prehash: false, lowS: true })))
  throw new Error('bad signature')
psbt.finalizeAllInputs()
const rawHex = psbt.extractTransaction().toHex() // then POST /tx as text/plain (section 1)
```
Note the noble v2 defaults: `prehash` defaults to true. Always pass `{ prehash: false }` for 32-byte sighashes.

### 6. Fees, dust and coin selection (tested in `08-coinselect.mjs`)
- vsize(P2WPKH, nIn, nOut P2WPKH) = ceil((4·(10 + 41·nIn + 31·nOut) + 2 + 108·nIn) / 4). This matches bitcoinjs `virtualSize()` with 72-byte signatures for 1/1 = 110, 1/2 = 141, 2/2 = 209, 4/2 = 345, 10/2 = 753 [VERIFIED]. Other outputs: P2TR and P2WSH +43, P2PKH +34, P2SH +32 vbytes.
- Dust (Core `GetDustThreshold` at 3 sat/vB): P2WPKH 294, P2WSH/P2TR 330, P2SH 540, P2PKH 546. Validate the **send amount** against the recipient type, and fold **change** below 294 into the fee.
- Selection: largest-first is best here, because fewer inputs means fewer MPC signatures and less gas. "Max" = sweep all UTXOs with no change output. Spike results:

| Scenario | coinselect default (chainsig.js) | coinselect + P2WPKH hints | largest-first exact |
|---|---|---|---|
| 2 UTXOs → 40k @2 sat/vB | fee 748 (3.58 sat/vB effective) | 422 (2.02) | 418 (2.00) |
| 1 UTXO, ~200 left @1 | no change, fee 340 | **change 197 = dust** | no change, fee 340 |

coinselect hints for P2WPKH: pass `script: new Uint8Array(27)` on UTXOs and `script: new Uint8Array(22)` on outputs, then guard dust yourself.
- Fee rate: `max(2, halfHourFee)` sat/vB on testnet4. chainsig.js uses `ceil(fee + 1)`.

### 7. Clean history for BTC (handoff to `sec`)
Why the preimage design is needed:
- A 32-byte sighash reveals nothing. The contract can't tell which UTXO a raw-hash signature can spend, and can't stop a non-ALL sighash.
- With preimages, the contract validates and **logs the outpoints and amounts**. The hash it signs is computed on-chain from those same bytes, so the log provably matches the signature [VERIFIED payload equality].

Sighash types (local-key demo, `10-sighash-reuse.mjs`):
| Type | Redirect all outputs | Add input + output | Change output 1 only |
|---|---|---|---|
| ALL | invalid | invalid | invalid |
| NONE | **valid → full theft** | invalid | **valid** |
| SINGLE | invalid | invalid | **valid → change can be stolen** |
| NONE\|ANYONECANPAY | **valid** | **valid** | **valid** |

Enforcing SIGHASH_ALL also rules out a signature over the legacy SIGHASH_SINGLE "hash = 1" value. That would let anyone spend P2PKH funds sent to the same key. A raw-hash `sign_for` can't exclude it; hashing on-chain can.

Checker (off-chain; tested against live testnet4 in `12-clean-history.mjs`). `K` = required confirmations: **2** on testnet4 (see the tip-flapping gotcha), ≥ 3–6 on mainnet.
```js
const B = 'https://mempool.space/testnet4/api'
const get = async (p) => { const r = await fetch(B + p); return { status: r.status, body: r.status === 200 ? await r.json().catch(() => null) : await r.text() } }
async function outpointVerdict(txid, vout, tip, K = 2) { // the spike ran with K=1
  const tx = await get(`/tx/${txid}`)
  if (tx.status === 404) return { verdict: 'NOT_CREATED' }           // do NOT trust /outspend for unknown txids
  if (vout >= tx.body.vout.length) return { verdict: 'BAD_VOUT' }
  const os = (await get(`/tx/${txid}/outspend/${vout}`)).body
  if (!os.spent) return { verdict: 'LIVE', value: tx.body.vout[vout].value }
  if (!os.status?.confirmed) return { verdict: 'REPLACEABLE', spender: os.txid } // seller could RBF it with the pre-signed tx
  const conf = tip - os.status.block_height + 1
  return { verdict: conf >= K ? 'DEAD' : 'REPLACEABLE', spender: os.txid, confirmations: conf }
}
// One sign_btc request is harmless iff ANY input is DEAD (SIGHASH_ALL commits to all prevouts), or all are NOT_CREATED
const requestVerdict = (vs) => vs.some((v) => v.verdict === 'DEAD') ? 'HARMLESS'
  : vs.every((v) => v.verdict === 'NOT_CREATED') ? 'PENDING_NOT_CREATED' : 'BLOCKS_SALE'
```
Live results [VERIFIED]:
- `efc545…:429` (spent by `515f4966…`) → DEAD, 26 confirmations.
- `e300a99d…:0` → LIVE.
- Fabricated `37ea6fce…:0` → NOT_CREATED.
- Out-of-range vout → BAD_VOUT.
- Requests: {spent, unspent} → HARMLESS; {unspent} → BLOCKS_SALE.

Also require that the Satchel's current UTXO set contains no logged outpoint. That check is redundant with the above, but cheap.
- With SIGHASH_ALL each signature also commits to every other input via hashPrevouts. So a request dies as soon as **any** of its inputs is spent elsewhere. The contract checks that all inputs are present, so the logged set is complete and the checker may apply "any input spent ⇒ the whole request is dead".
- The signatures themselves are public: every MPC response sits in the NEAR receipt outcomes. Secrecy is no defence; only spent outpoints are.
- RBF "speed up" means a new `sign_btc` over the same outpoints. Both requests get logged, and once one confirms, both are dead.
- Cleaning recipe for a seller: self-send all UTXOs to the same address (one tx, all inputs) and wait for K confirmations. On testnet4 that can take hours, so do it before listing.
- Difference from `kb/70` (sec): sec treats a not-yet-created outpoint (`/tx/:txid` 404) as **live**; I classify it NOT_CREATED / pending.
  Such a signature can only move coins that don't exist yet. If the parent tx later appears, the outpoint becomes LIVE and the UTXO-set check catches it.
  Blocking forever on a never-created outpoint (a mistaken or fabricated preimage) would freeze sales permanently. The planner should pick one rule; mine needs the buyer UI to count only UTXOs whose outpoints are not logged.
- Mainnet / Phase 3 option: the MPC offers `verify_foreign_transaction` with `{"Bitcoin":{"tx_id","confirmations","extractors":["BlockHash"]}}` on domain 3 (ForeignTx), and `get_available_foreign_chains` on testnet includes `"Bitcoin"` [VERIFIED live]. The Bitcoin inspector source defines genesis constants only for mainnet and testnet3, with no testnet4 anywhere in `crates/` [SOURCED main @13f42bf]. On testnet the configured provider (`allowed_foreign_chain_providers`) is `https://bitcoin-testnet-rpc.publicnode.com` (quorum 1). Its `getblockhash 0` = `000000000933ea01…4943`, i.e. **testnet3**, at height 5,195,953 [VERIFIED]. It cannot attest testnet4 txs.

## Gotchas & failure modes
- **Multi-action receipts are never signed** (TL;DR 3). The same applies to any cross-contract `Promise::new(mpc).function_call(..).function_call(..)`: use `.and()` of separate promises. The limit is on receipts *received by the MPC*. A user tx with several `sign_for` actions to the Satchel contract should still work, because each action's promise to the MPC is its own one-action receipt [ASSUMED, untested]. The verified path is one call with a `Vec` and `.and()`.
- **Gas:** each `sign` promise needs prepaid ≥ 15 Tgas. Attached gas must also cover the entry receipt (~3–5 Tgas) and the callback reservation. 300 Tgas caps one call at ~19 inputs in theory (15 Tgas each); cap at 13 with the recommended `40 + 20·n` attachment. Use `promise_result_checked` (near-sdk 5.29 deprecates `promise_result`).
- **Partial failure:** with `.and()`, one sign can time out while others succeed. The callback returns `None` at that index. Retry by re-sending all preimages (the completeness check needs them), optionally with an index mask.
- **RPC:** `rpc.testnet.near.org` now returns `-429 "WARNING! THIS ENDPOINT IS DEPRECATED!…"`. `rpc.testnet.fastnear.com` returned `-429 Rate limits exceeded` under team load. `near-testnet.drpc.org` worked, but its free plan returns `code 30 "Request timeout on the free plan"` on blocking `send_tx … FINAL`. Send with `wait_until: "NONE"`, then poll `tx` [VERIFIED].
- **CORS:** never set `Content-Type: application/json` or custom headers on esplora calls from the browser. Server-side, cache addresses and UTXOs (unpublished rate limits, IP bans).
- **Esplora existence trap** (TL;DR 12). Also `outspend` with an out-of-range vout returns `{"spent":false}`.
- **chainsig.js BTC adapter:**
  - inputs get the default sequence `0xffffffff` (no BIP125);
  - coinselect uses P2PKH sizes;
  - `getBalance` counts confirmed coins only while `selectUTXOs` uses unconfirmed ones too (on testnet4 the balance can lag for hours);
  - when inputs lack `scriptPubKey`, `createPSBT` adds them inside `Promise.all`, so input order depends on fetch timing;
  - no low-S normalization and no preimage access;
  - `contract.sign()` sends one 300-Tgas tx per payload straight to the MPC, so it doesn't apply when signing goes through the Satchel contract.
- **bitcoinjs-lib 7:** values are `bigint` and buffers are `Uint8Array`. `Transaction.fromHex(u8.toString('hex'))` on a Uint8Array throws a confusing `Offset is outside the bounds of Uint8Array` [VERIFIED]; use `Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())`. Taproot recipients need `initEccLib`.
- **Testnet4 tip flaps:** while polling every 60 s, the API reported different hashes at the same height four times in 3.75 h, sometimes flipping back. Examples: 157204 `0000000081ce…` → `000000000016fad5…`; 157206 `b61b9f…` → `283b8f…` → `b61b9f…`; 157208 two hashes [VERIFIED `monitor/blockwatch.log`].
  The cause is competing difficulty-1 blocks and/or mempool.space serving from several backend nodes [ASSUMED]. A depth-1 confirmation can therefore vanish.
  Use K ≥ 2 for clean history on testnet4, and require two consecutive polls before flipping a UI state to Confirmed.
- **Testnet4 headers lie:** difficulty-1 blocks carry timestamps ~2 h in the future, so show "time since broadcast", not block timestamps. A difficulty-1 tip doesn't mean your tx will be included (85% of txs waited for a real block).
- **Unconfirmed chains:** after several sends without a confirmation, change is spent unconfirmed. Mempool chain limits apply (historically 25 ancestors/descendants [ASSUMED for Core 30]), and long chains also stall faucets.
- **Path canonicalisation:** the BTC key is `derive(contract, "satchel/{token_id}/btc")` byte for byte. Token ids `"1"` and `"01"` give different addresses, so mint only canonical decimal ids and build the path in one place (contract and frontend).
- **Payload range:** the MPC panics (`Ecdsa payload cannot be converted to Scalar`) if the hash ≥ n. The probability is ~2⁻¹²⁸, but surface it as a retry with a different nSequence or locktime.

## Recommendations for Satchel
- **P0:** `sign_btc(token_id, preimages_hex: Vec<String>)`, or `sign_for(token_id, Chain::Btc, payload)` with `payload = preimages` for BTC. Owner/delegate/freeze checks; `attached_deposit ≥ n yocto` (so function-call keys can't sign); all checks from §4; `.and()` fan-out with 15 Tgas per sign; one callback that decrements `pending_signs` by n; an event per input `{token_id, payload, txid, vout, amount, hash_outputs, block}`. Frontend attaches `40 + 20·n` Tgas (cap 300).
- **P0:** BTC lib in the web app = bitcoinjs-lib 7.0.4 + @noble/curves 2.x + @noble/hashes 2.x (+ `@bitcoinerlab/secp256k1` only for `initEccLib`), about 200 lines (spike `lib.mjs` shows the shape). Skip chainsig.js's BTC adapter; derive via the `derived_public_key` view, or chainsig.js derivation if the team uses it elsewhere.
- **P0:** Data access through our API routes (server-side cache, 10–30 s TTL) to mempool.space testnet4, with `mempool.emzy.de` as fallback for tx/outspend/broadcast. Broadcast may go straight from the browser (text/plain). Check the genesis hash at boot.
- **P0 (human, now):** fund the demo Satchel addresses once the contract account name is fixed. Addresses depend on `satchel.<team>.testnet` + token id, so derive them as soon as the account is created. Keep 2–3 UTXOs per demo token and a reserve wallet.
- **P1:** UX copy for testnet4: "Sent. Waiting for a Bitcoin block (testnet blocks are irregular)". Poll `/tx/:txid/status` every 30–60 s. Never block the flow on confirmation; RBF "speed up" is optional.
- **P1:** Clean-history worker per §7, plus "clean before listing" guidance. Sale demo: list a Satchel whose last BTC spend confirmed hours earlier.
- **P1:** Optionally accept `outputs_hex` (the serialized outputs) and require `sha256d(outputs) == hashOutputs`, then log the decoded recipients and amounts. Clean history can then show *what* an unbroadcast signature would do ("0.0004 BTC to tb1q…"), not just which coins it can move. Built from verified pieces (sha256d on-chain == BIP143 hashing), but the combined check itself is untested [ASSUMED].
- **P1 (S-10 delegates):** a BTC daily cap needs outflow, and a preimage only carries the *input* amounts. So accept `outputs_hex`, check it against hashOutputs, and compute outflow = Σ outputs not paying `0014{pkh}` + fee (Σ inputs − Σ outputs).
  Using the pkh from the preimage's scriptCode as "self" is safe: if a caller forges it, the resulting signature commits to the wrong scriptCode and Bitcoin rejects it [ASSUMED, follows from BIP143].
  Without outputs, the only safe cap is "Σ input value", which counts change as spent.
- **P2:** Log preimages and parse them in the indexer rather than storing outpoints on-chain (storage cost). Store only `(token_id, request_id, outpoints)` if the contract itself must refuse `list` while unspent signatures exist; off-chain is fine for the hackathon.
- **P2 / Phase 3:** on-chain clean-history proof on mainnet via MPC `verify_foreign_transaction` (Bitcoin, confirmations) plus a raw spending tx parsed on-chain.

## Deltas vs plan (near_hackathon.md)
| Plan says | Finding | Change |
|---|---|---|
| L22 "Bitcoin needs one MPC sign call per UTXO" | Confirmed: one signature per input. But the calls must be **separate receipts**; batching actions in one tx times out | Add a "no multi-action `sign`" rule; use `.and()` fan-out |
| L21 "~7 Tgas (with 10 Tgas attached)" | Burnt 7.84 Tgas inside the MPC (4.33 + 3.51), but deployed v3.17.0 **requires ≥ 15 Tgas prepaid** | 10 Tgas would fail; the plan's 15 Tgas static is the minimum |
| L189 sign args `payload_v2: Ecdsa(hex) \| Eddsa(hex)`, `path`, `domain_id` | Confirmed exact JSON `{"request":{"payload_v2":{"Ecdsa":"<64 hex>"},"path":"…","domain_id":0}}`; response `{"scheme":"Secp256k1","big_r":{"affine_point"},"s":{"scalar"},"recovery_id"}` | none |
| L177 `sign_for(token_id, chain, payload_hex) -> Promise` + L178 `on_signed(...) -> Option<SignatureResponse>` | BTC needs N payloads per tx and a provable outpoint log | BTC variant takes `Vec` of BIP143 preimages, fans out, and returns `Vec<Option<SignatureResponse>>`; attach `40 + 20·n` Tgas instead of a flat 50 |
| L194 "about 0.005 NEAR per sign" | Measured 0.0008 NEAR direct; 0.00205 NEAR for 2 inputs and 0.00376 for 4 via contract | ~0.001 NEAR per input (5× lower) |
| L160 `sig_log: chain, payload_hash, block` / S-9 | A payload hash alone can't be checked against Bitcoin | Log txid:vout + amount per input (from the preimage); checker per §7 |
| L191 "every BTC outpoint in a signed tx spent" | Must be spent by a **confirmed** tx (K deep); unconfirmed spends are RBF-replaceable. Esplora reports nonexistent txids as unspent/unconfirmed | Add the confirmed + existence checks |
| L128 "Multi-UTXO BTC shows 'Signing 2 of 3 inputs'" | Fan-out signs all inputs in the same block, so progress per input isn't observable | Show "Signing 3 inputs" with a single timer (ux) |
| L236 "Single-UTXO funding in the demo; day-3 gate" | Multi-input verified (2 and 4); de-risked. **New risk not in the plan: testnet4 confirmation gaps (median 2 h, max 21 h)** | Keep few UTXOs; pre-stage confirmations hours ahead; never wait for a confirmation in the video |
| L60 "bitcoinjs-lib" (unpinned) | Latest 7.0.4; chainsig.js 1.1.16 nests 6.1.9 | Pin 7.0.4; don't mix with chainsig.js BTC objects |
| L81 "BTC testnet4 from faucets" | All working faucets need GitHub, captcha or an account; keyless CypherFaucet API failing today | Human action list below |
| L85 go/no-go "more than 1 of 10 contract signs time out" | 0 timeouts in 18 single-action MPC signs today (4 direct, 14 via contract), 6–8 blocks each | On track; the only timeouts were the deliberate batch test |
| S-2 "matching chainsig.js deriveAddressAndPublicKey" | Confirmed (view == chainsig.js) | none |
| (missing) | `sign_for` with no deposit can be called by a function-call access key without a wallet prompt | Require ≥ 1 yocto per signature (cross-ref `sec`) |
| (missing) | Low-S: the MPC enforces it; libraries don't | Defensive assert only |
| L60 "near-sdk 5.x" (cross-ref `sdk`) | With Rust 1.93 and a **fresh** lockfile, edition 2021 resolves `near-sdk-env 0.1.7` (MSRV 1.95, published 2026-10-19) and the build fails | Use edition 2024 (MSRV-aware resolver), or `cargo update near-sdk-env --precise 0.1.6`; commit `Cargo.lock` |

## Open questions / human actions
- **Human (by Nov 1–3): get testnet4 coins.**
  1. Log in at https://mempool.space/testnet4/faucet with GitHub, verify the email, and request 500,000 sats (max per request; min 5,000).
  2. Or solve the hCaptcha at https://coinfaucet.eu/en/btc-testnet4/ or https://faucet.testnet4.dev/.
  3. Or create a Crypto Chief account (https://crypto-chief.com/faucet/, 1 claim/day).
  4. Or retry the keyless API: `curl -X POST https://cypherfaucet.com/api/v1/claim -H 'Content-Type: application/json' -d '{"network":"btc-testnet","address":"<tb1q…>"}'` (0.01 tBTC, 1/address/h + 1/IP/h; failed on all 23 attempts between 11:31Z and 15:10Z: 21× `503 send_failed`, 2× Cloudflare `522`; log in `research/spikes/btc/monitor/faucet-retry.log`).

  Send the coins to a team "reserve" address first, then fan out to the demo Satchels (once `satchel.<team>.testnet` exists, its addresses are deterministic).
- **Human:** decide on an RPC provider with headroom (FastNEAR subscription or another provider). Coordinate with the `web` agent.
- **Open:** a real broadcast from an MPC-controlled address is still pending funding. Everything up to `POST /tx` is verified, and the rejection was the expected `missing-inputs`.
  To finish it, send ≥ 0.005 tBTC to `tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a` (the spike contract's key for token 1), then run, in `research/spikes/btc/js`:
  - `node 13-real-spend.mjs tx1`: 1-input split via the contract, plus `/txs/test` probes for high-S, a 200-sat dust output and 0.05 sat/vB;
  - `node 13-real-spend.mjs tx2`: a 2-input chained spend.
- **Open:** Bitcoin Core 30's default min relay fee on mempool.space (0.1 vs 1 sat/vB) is unverified. 0.1 sat/vB txs were mined in difficulty-1 blocks; use ≥ 2 sat/vB regardless.
- **Open (sec):** should the contract refuse `list` while any logged BTC outpoint is unspent? That needs an oracle; for the hackathon, keep it off-chain and disclose it.
