# Solana devnet (send SOL from a Satchel)

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: chains · Checked: 2026-10-21 · Confidence: high for signing/timing/rent/nonce rules (verified live); a confirmed devnet transfer is still pending a human faucet step
> Primary sources: live `api.devnet.solana.com` / `api.testnet.solana.com` / `api.mainnet-beta.solana.com` (read-only); `@solana/web3.js@1.99.0` (`lib/index.cjs.js`); chainsig.js@1.1.16 `src/chain-adapters/Solana/Solana.ts` (git 17aec4f); near/mpc@13f42bf `crates/near-mpc-crypto-types/src/primitives.rs` (`EDDSA_PAYLOAD_SIZE_UPPER_BOUND_BYTES = 1232`); [Solana durable nonces](https://solana.com/docs/core/transactions/durable-nonces); [Solana clusters](https://solana.com/docs/references/clusters); [solana-labs/solana PR #25035](https://github.com/solana-labs/solana/pull/25035); [faucet.solana.com](https://faucet.solana.com/). Spike: `research/spikes/chains/` (`sol_sign.ts`, `sol_facts.mjs`, `sol_rent_sim.mjs`, `sol_nonce_detect.ts`).

## TL;DR — what an implementer must know
- **The MPC Ed25519 path works.** `sign` with `{"request":{"payload_v2":{"Eddsa":"<hex of the FULL serialized message>"},"path":"satchel/1/sol","domain_id":1}}` returned `{"scheme":"Ed25519","signature":[64 bytes]}` in 5.4 s (NEAR tx `H6xHyS25cUAoiGZKoaq5K5jXw8Hq1PPURgLbBo7TdaNw`, 8.7 Tgas burnt). The signature verifies against the derived key. The tx passed devnet sigverify and failed only with "Attempt to debit an account but found no record of a prior credit"; a tampered control failed sigverify. [VERIFIED]
- **The payload is the whole message (≤ 1232 bytes), not a hash.** A legacy single-transfer message is 150 B. The chainsig.js Solana adapter (web3.js v1 legacy `Transaction`) returns exactly `transaction.serializeMessage()` as `hashesToSign[0]`. [VERIFIED]
- **Blockhash lifetime is ~36 s today, not 60–90 s.** `lastValidBlockHeight = blockHeight + 150` and devnet produces a block every 0.237 s (85 blocks in 20.2 s wall clock). Mainnet runs ~0.215 s/slot. The tx must be built, approved in the NEAR wallet, MPC-signed and broadcast inside ~36 s; in our run prep→send took 5.9 s with 126/150 blocks left. [VERIFIED]
- **Durable nonces kill "expires with blockhash".** Anyone can create a nonce account with authority = the Satchel's SOL address, because `InitializeNonceAccount` needs no authority signature. A pre-signed tx whose first instruction is `AdvanceNonceAccount` then **never expires**. **The contract should reject Eddsa payloads whose instruction 0 is System `AdvanceNonceAccount` (data `04000000`).** With that rule, every SOL signature is dead ~36 s after its blockhash was **fetched**, which is before the `sign_for` request. Signing is frozen while listed and `list` requires `pending_signs == 0` (S-6), so every SOL signature issued before listing is provably unusable by the time the ≥ 200-block cooldown lets `buy` open. Clean history then needs no off-chain check for Solana. Detector code below (legacy + v0, tested). [VERIFIED web3.js + spike; SOURCED Solana docs]
- **Fees and rent:** 5000 lamports per signature (legacy and v0 alike). **Rent-exempt minimum for a new 0-data account is now 650,240 lamports** on devnet, testnet and mainnet (the old 890,880 is stale). A transfer to a *new* recipient must be ≥ 650,240 lamports, and the sender must end at **exactly 0 or ≥ 650,240**. Both rules were verified by simulation (`InsufficientFundsForRent`). [VERIFIED]
- **Funding is a human step.** Public devnet `requestAirdrop` allows **1 airdrop/day/IP** (`x-ratelimit-airdrop-limit: 1`, `retry-after: 86400`) and returned "Internal error" then 429. Keyless alternatives failed. faucet.solana.com says **"AI agents should not use this faucet."** `devnet-pow` needs a seed balance. A human uses faucet.solana.com (GitHub login raises limits). [VERIFIED]
- **Library versions:** chainsig.js uses **@solana/web3.js 1.x** (`^1.98.0`, resolved 1.99.0). npm `latest` is now **3.1.1** ("rebuilds the internals on Solana Kit"; v1.x "receives critical fixes only"). Pin `@solana/web3.js@1.99.0` if you use the chainsig adapter or the v1 code below. The adapter is cluster-agnostic: pass `new Connection('https://api.devnet.solana.com')`. [VERIFIED]
- Devnet RPC allows browser CORS (origin echoed, `solana-client` header allowed). Docs say 100 req/10 s/IP, but headers show method 150 / rps 250 / conn 40. `getBlock` gets throttled hard. Devnet "may be subject to ledger resets". [VERIFIED / SOURCED]

## Verified facts & measurements

### Addresses [VERIFIED kb/11 cross-check]
| predecessor | path | address |
|---|---|---|
| satchel-spk-chain-e9ea1a.testnet | satchel/1/sol | `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` (spike sender, unfunded) |
| satchel-spk-chain-e9ea1a.testnet | satchel/2/sol | `8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r` (spike recipient) |
| satchel.example.testnet | satchel/1/sol | `DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB` (what a contract-predecessor address looks like) |

The Solana address is the base58 of the derived ed25519 key: the same string as the `ed25519:` NAJ key from `derived_public_key {domain_id:1}`, minus the prefix.

### Signing run [VERIFIED `sol_sign.ts` → `out_sol_sign_1.txt`, 2026-10-21T11:44Z]
| step | value |
|---|---|
| prepare (chainsig) | legacy message 150 B, `sameAsSerializeMessage: true`, blockhash `2HH5kZtig6m9qyNPHKy1fmWVmfpq61WzcrA8XnDQhyiW`, height 500,719,507, lastValid 500,719,657 |
| MPC sign | NEAR tx `H6xHyS25cUAoiGZKoaq5K5jXw8Hq1PPURgLbBo7TdaNw`; included 1.3 s, final 5.4 s; 8.73 Tgas burnt (50 attached); 0.00085 NEAR |
| signature | `3HeVZAwBwvAGAbjnVtEZ88wQQn7j2bsfrvJhvtAVzWdkD8ie2hiMapApoYG3QaBUGRhP8bTBXTcZpEiW72AMMCYt`; `ed25519.verify(sig, message, derivedPubkey) = true` |
| negative control (1 byte flipped) | `Transaction did not pass signature verification` |
| real broadcast (unfunded) | `Attempt to debit an account but found no record of a prior credit.` at height 500,719,531 (126 blocks left), prep→send 5.9 s |
| arbitrary bytes | the Ed25519 domain also signed a 59-byte non-Solana message (`6Xnb1PEEzqojJMS2PUysPyLVVkhQcQupsTTG3r4MHEDj`): the MPC enforces no message format |

### Timing [VERIFIED `sol_facts.mjs` + wall clock]
| cluster | sec/slot (getRecentPerformanceSamples, 15 × 60 s) | 150-block window |
|---|---|---|
| devnet (`solana-core 4.4.0-beta.1`) | 0.238 (wall clock 0.237 s/block) | **≈ 35.6 s** |
| testnet (`4.4.0-beta.1`) | 0.218 | ≈ 33 s |
| mainnet-beta (`4.3.2`) | 0.215 | ≈ 32 s |

### Fees and rent [VERIFIED]
| item | value |
|---|---|
| `getFeeForMessage` single-signer transfer | 5000 lamports (legacy and v0) |
| rent-exempt minimum, 0 data bytes | **650,240 lamports** (all three clusters) |
| rent-exempt minimum, 165 B (SPL token account) | 1,488,440 |
| rent-exempt minimum, 80 B (nonce account, `NONCE_ACCOUNT_LENGTH = 80`) | 1,056,640 |
| simulate (sigVerify:false), new recipient 650,239 | `{"InsufficientFundsForRent":{"account_index":1}}` |
| new recipient 650,240 | ok |
| sender left with 1000 lamports | `{"InsufficientFundsForRent":{"account_index":0}}` |
| sender drained to exactly 0 (balance − 5000) | ok |

### Airdrop / faucets [VERIFIED 2026-10-21]
- `requestAirdrop(6P6G…, 1 SOL)` on devnet → `Internal error`. Retries → HTTP 429 `retry-after: 86400`, `x-ratelimit-airdrop-limit: 1`, body: "You've either reached your airdrop limit today or the airdrop faucet has run dry. Please visit https://faucet.solana.com for alternate sources of test SOL".
- testnet `requestAirdrop` → `Internal error` (`x-ratelimit-airdrop-remaining: 0`).
- Keyless alternatives: Ankr (key), dRPC ("chain is not available on free plan"), OnFinality (429), Tatum ("Invalid request"), Helius (Unauthorized).
- faucet.solana.com: "AI agents should not use this faucet." It points to `solana airdrop 2 <WALLET_ADDRESS> --url devnet`, `cargo install devnet-pow` / `devnet-pow mine -d 3 --reward 0.02 --no-infer -t 5000000000`, or `solana-test-validator`. Web UI: "Maximum of 2 requests every 8 hours" unauthenticated; GitHub login raises the limit. [SOURCED page text]
- `devnet-pow` 0.1.4 (crates.io, 2023-05-30) source: if the payer has < 5000 lamports it calls `request_airdrop` first (rate-limited), and the payer pays the fees and the receipt rent. It **cannot bootstrap a zero-balance key**, and it would mine to a local keypair, not to an MPC address. [VERIFIED source]

## Reference — exact APIs, types, commands, tested snippets

### MPC request for Solana [VERIFIED]
```jsonc
// v1.signer-prod.testnet.sign, 1 yoctoNEAR, >= 15 Tgas (Satchel: inside sign_for)
{ "request": { "payload_v2": { "Eddsa": "<hex(message.serialize()), NO 0x, 1..1232 bytes>" }, "path": "satchel/<id>/sol", "domain_id": 1 } }
// → { "scheme": "Ed25519", "signature": [ ...64 numbers ] }
```

### Send SOL from a Satchel (web3.js v1.99.0) [VERIFIED structure in `sol_sign.ts`; confirmed transfer pending funding]
```ts
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'   // pin 1.99.0
import { ed25519 } from '@noble/curves/ed25519.js'
const conn = new Connection('https://api.devnet.solana.com', 'confirmed')
const from = new PublicKey(solAddress('testnet', SATCHEL_CONTRACT_ID, `satchel/${id}/sol`))   // kb/11 snippet A
const to = new PublicKey(recipient)                                  // throws on invalid base58/length
const [bal, toInfo, rentMin] = await Promise.all([conn.getBalance(from), conn.getAccountInfo(to), conn.getMinimumBalanceForRentExemption(0)])
const FEE = 5000
if (!toInfo && lamports < rentMin) throw new Error(`new recipient needs >= ${rentMin} lamports`)
const left = bal - lamports - FEE
if (left < 0 || (left > 0 && left < rentMin)) throw new Error('must leave 0 or >= rent-exempt minimum')   // "Max" = bal - FEE

// Build as LATE as possible: the clock starts at getLatestBlockhash (~36 s budget)
const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')
const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash })
  .add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }))
const message = tx.serializeMessage()                                 // Buffer, ~150 B
const payloadHex = Buffer.from(message).toString('hex')               // → sign_for(token_id, 'Sol', payloadHex)
// ... wallet approval + MPC yield/resume; resp = lastResult(finalOutcome)  (kb/11 snippet B)
const sig = Uint8Array.from(resp.signature)
if (!ed25519.verify(sig, message, from.toBytes())) throw new Error('bad MPC signature')
tx.addSignature(from, Buffer.from(sig))
if ((await conn.getBlockHeight('confirmed')) > lastValidBlockHeight) throw new Error('blockhash expired — rebuild & re-sign')
const signature = await conn.sendRawTransaction(tx.serialize())        // preflight on; throws SendTransactionError with logs
const { value } = await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
if (value.err) throw new Error(JSON.stringify(value.err))
// explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet   (or https://solscan.io/tx/${signature}?cluster=devnet)
```
With chainsig.js the equivalent is `sol.prepareTransactionForSigning({from, to, amount})`, then `sol.finalizeTransactionSigning({ transaction: transaction.transaction, rsvSignatures: resp, senderAddress })`, then `sol.broadcastTx(b64)`. Its prepare does **not** return `lastValidBlockHeight`, so call `getLatestBlockhash` yourself or use `isBlockhashValid`.

### Durable-nonce detector (client check and spec for the contract) [VERIFIED `sol_nonce_detect.ts`: normal=false, durable legacy=true, durable v0=true, nonce-as-2nd-ix=false]
```ts
import { PublicKey } from '@solana/web3.js'
function readCompactU16(b: Uint8Array, o: number): [number, number] {
  let v = 0, s = 0, i = 0
  for (;;) { const x = b[o + i]; v |= (x & 0x7f) << s; i++; if ((x & 0x80) === 0) break; s += 7 }
  return [v, i]
}
export function parseMessage(b: Uint8Array) {
  let o = 0; let version: 'legacy' | number = 'legacy'
  if (b[0] & 0x80) { version = b[0] & 0x7f; o = 1 }                 // v0 prefix 0x80
  const header = { numRequiredSignatures: b[o], numReadonlySigned: b[o + 1], numReadonlyUnsigned: b[o + 2] }; o += 3
  let [n, l] = readCompactU16(b, o); o += l
  const keys: string[] = []; for (let i = 0; i < n; i++) { keys.push(new PublicKey(b.slice(o, o + 32)).toBase58()); o += 32 }
  const recentBlockhash = new PublicKey(b.slice(o, o + 32)).toBase58(); o += 32
  ;[n, l] = readCompactU16(b, o); o += l
  const ixs: { programIndex: number; accounts: number[]; data: Uint8Array }[] = []
  for (let i = 0; i < n; i++) {
    const programIndex = b[o]; o += 1
    const [na, la] = readCompactU16(b, o); o += la; const accounts = Array.from(b.slice(o, o + na)); o += na
    const [nd, ld] = readCompactU16(b, o); o += ld; ixs.push({ programIndex, accounts, data: b.slice(o, o + nd) }); o += nd
  }
  return { version, header, keys, recentBlockhash, ixs }             // v0: address-table lookups follow (not needed here)
}
/** ix0 == System::AdvanceNonceAccount (u32 LE 4) ⇒ the tx never expires */
export function isDurableNonce(msg: Uint8Array): boolean {
  const m = parseMessage(msg); const ix = m.ixs[0]
  return !!ix && m.keys[ix.programIndex] === '11111111111111111111111111111111'
    && ix.data.length >= 4 && ix.data[0] === 4 && ix.data[1] === 0 && ix.data[2] === 0 && ix.data[3] === 0
}
```
Why it's sound: (1) the runtime treats a tx as durable-nonce **only** if instruction 0 is `AdvanceNonceAccount` ("Build the transaction with `AdvanceNonceAccount` as the **first instruction**"). (2) Program ids can't come from address lookup tables ("Fail tx sanitization when ix program id uses lookup table", PR #25035), so instruction 0's program is always a static key. (3) In web3.js, `nonceInitialize` has the nonce account as its only writable key and no signer (the authority is data), while `nonceAdvance` lists `authorizedPubkey` with `isSigner: true`. An attacker can create the nonce account alone; using it needs the Satchel's signature, which is exactly what the contract gates. [SOURCED]

### Contract-side Eddsa policy (spec for `sdk`/`mpc`/`sec`; Rust to be written after Nov 1)
On `sign_for(token_id, Sol, payload_hex)` the contract has the full message, so it can:
1. decode hex and require `len ≤ 1232`;
2. parse as legacy, or as v0 when the first byte is `0x80` (reject other versions and trailing garbage);
3. require that the token's SOL pubkey (the derived key, computed off-chain and stored at mint, or recomputed with ed25519 point math) is one of the first `numRequiredSignatures` static keys;
4. **reject if ix0 is System `AdvanceNonceAccount`** (`04000000`);
5. *(delegates / caps)* allow only System `Transfer` (data `02000000` + u64 LE lamports) and, optionally, ComputeBudget instructions, and sum `lamports` for cap checks;
6. log `recent_blockhash` + NEAR block in `sig_log` (informational).

Rule 3 also blocks the Ed25519 domain from signing non-Solana bytes, such as a NEAR implicit-account tx hash (the derived ed25519 key *is* also a NEAR implicit account `hex(pubkey)`) or an off-chain "sign message" login.

### Commands
```bash
cd research/spikes/chains
node sol_airdrop.mjs 6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA 1     # programmatic airdrop attempt (rate-limited)
npx tsx sol_sign.ts [to] [lamports] [gasTgas]                             # derive → prepare → REAL MPC sign → verify → broadcast → confirm
node sol_facts.mjs ; node sol_rent_sim.mjs ; npx tsx sol_nonce_detect.ts
curl -s https://api.devnet.solana.com -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getMinimumBalanceForRentExemption","params":[0]}'
```

## Gotchas & failure modes
1. **36-second budget.** Latency = wallet popup approval (user-dependent) + NEAR inclusion (~1 s) + MPC (~4–5 s measured, up to ~200 NEAR blocks worst case) + broadcast. If the user idles in the wallet popup, the blockhash dies. Detect it (`getBlockHeight() > lastValidBlockHeight`, or error "Blockhash not found" / `TransactionExpiredBlockheightExceededError`) and offer "Re-sign" (a new NEAR tx and a new MPC request).
2. **Don't "fix" expiry with durable nonces** without sec sign-off: they're precisely the never-expiring pre-signed tx that breaks clean history.
3. **Rent:** the old 890,880-lamport figure is wrong today. Always call `getMinimumBalanceForRentExemption(0)`. Sending < 650,240 to a fresh address fails, and so does leaving a dust balance in the Satchel.
4. **web3.js version split:** `npm i @solana/web3.js` now installs 3.1.1. chainsig.js keeps its own nested 1.99.0. Mixing a v3 `Transaction`/`PublicKey` with chainsig's adapter can break `instanceof`, so pin 1.99.0 or skip the adapter.
5. **Preflight errors** come as `SendTransactionError`. Call `e.getLogs(conn)` or read `e.logs`; the human-readable reason is in `e.message` ("Attempt to debit an account but found no record of a prior credit." = unfunded sender).
6. **Public devnet RPC:** airdrops 1/day/IP; `getBlock` throttled (dozens of 429s); ledger may be reset. For the demo, consider a free Helius/QuickNode devnet key (human signup) as a fallback RPC (`pay` decides, kb/50).
7. chainsig's Solana `finalizeTransactionSigning` calls `transaction.serialize()`, which **verifies signatures** and throws on a bad MPC signature (good). Its `broadcastTx` re-deserializes and sends, but doesn't confirm.
8. Legacy vs v0: chainsig builds **legacy** messages. v0 (`TransactionMessage.compileToV0Message()`, first byte `0x80`, +2 B here) costs the same 5000 lamports. Use v0 only if you need lookup tables (not for transfers).

## Recommendations for Satchel
- **P1 (Phase 2 feature, decide in the contract on Day 1)** Contract Eddsa policy rules 1–4 above, at minimum **reject AdvanceNonceAccount at ix0**. Cheap in Rust, and it makes Solana clean history automatic.
- **P1** Send flow = the snippet above. Fetch the blockhash only after the user confirms Satchel's own review card, immediately before opening the wallet popup (it must be inside the `sign_for` payload, so it can't be fetched later). Show a ~30 s countdown in `SigningProgress` and auto-rebuild + re-sign on expiry.
- **P1** Send validation: new-recipient minimum 650,240 lamports; "Max" = balance − 5000; never leave 0 < remainder < rent minimum.
- **P1 (human, now)** Fund the spike address and a team devnet wallet (≥ 2 SOL) via faucet.solana.com with GitHub login, so Day 10 isn't blocked by the 1-per-day CLI faucet.
- **P2** Activity feed: `getSignaturesForAddress(addr, {limit: 20})` + `getTransaction` (rate-limited; `pay` owns caching). Explorer links to explorer.solana.com with `?cluster=devnet`.

## Deltas vs plan (near_hackathon.md)
| plan location | plan says | finding | recommended change |
|---|---|---|---|
| B5 "SOL signatures expire with their blockhash" | clean-history assumption | true only for **non-durable-nonce** txs. A durable-nonce tx never expires, and its nonce account can be created by anyone (authority = Satchel address, no signature needed) | Contract rejects `AdvanceNonceAccount` at ix0; then the claim holds |
| brief / common lore "~150 slots ≈ 60–90 s" (also in kb/70 §check table "about 60–90 s" and kb/80 L15 / `expired` state, both SOURCED from older docs) | expiry window | **≈ 36 s** on devnet today (0.237 s/block measured by wall clock), ≈ 32 s on mainnet | Size the signing UX and timeouts for ~30 s. ux/sec should update their copy and timings |
| B2 Phase 2 "Solana devnet (domain_id 1)" | — | ✔ domain 1 = Frost/Ed25519 Sign; payload = **full message** (≤ 1232 B), not a hash | Contract passes the message hex through and gets the parsing benefits above |
| B3 S-11 | "Devnet transfer from satchel/N/sol confirms" | signature proven valid by the node; confirmation blocked only by faucet limits | Human funds the address; re-run `sol_sign.ts` |
| L60 Versions | "@solana/web3.js" | npm latest = 3.1.1 (kit-based rewrite); chainsig needs 1.x | Pin `@solana/web3.js@1.99.0` |
| B2 Phase 0 | faucets listed for Sepolia/testnet4 only | devnet airdrop is 1/day/IP and the official faucet forbids AI agents | Add "devnet SOL (human, faucet.solana.com + GitHub)" to Phase 0 |
| — | rent not in plan | new recipient ≥ 650,240 lamports; sender must end at 0 or ≥ rent minimum | Add to Send validation and copy |

## Open questions / human actions
- **Human (now):** go to https://faucet.solana.com, sign in with GitHub, pick devnet, airdrop to `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` (spike) and to a team devnet wallet. Or from a home network: `solana airdrop 1 6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA --url devnet`. Then run `cd research/spikes/chains && npx tsx sol_sign.ts`. Expect `{"step":"broadcast","ok":true,…,"explorer":"https://explorer.solana.com/tx/…?cluster=devnet"}`. Please paste the tx signature into RESULTS.md.
- **Decision (sec + sdk):** adopt the Eddsa policy (at least the durable-nonce rejection) in the locked contract.
- **Open (mpc):** what is the p95 MPC latency for EdDSA through `sign_for`? If p95 is over ~25 s, Solana sends need the auto re-sign path by default.
- **Open (web):** how long do users spend in the near-connect wallet popup? Pre-building the tx before the popup risks expiry; building after it isn't possible because the payload must go into the NEAR tx. Measure on Day 10.
