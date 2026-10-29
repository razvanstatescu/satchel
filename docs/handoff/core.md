# Handoff: `core` (packages/core, tools/vectors, vectors/)

Status: **vectors generated** (`vectors/evm.json` 43 = 8 ok + 35 refused, `vectors/btc.json` 39 = 10 + 29, `vectors/sol.json` 28 = 6 + 22, `vectors/derive.json` 49). The schema below is fixed. Every error code of spec §5.15 for EVM/BTC/SOL (plus `ERR_HEX`) has at least one vector.

## 1. Shared vectors: `vectors/{evm,btc,sol}.json` (for the `contract` agent)

Regenerate with `pnpm --filter @satchel/tools vectors`. The output is deterministic. Commit the JSON and never hand-edit it.

### File shape
```jsonc
{
  "schema": "satchel-vectors/1",
  "set": "evm",                       // "evm" | "btc" | "sol"
  "generator": "tools/vectors/gen.ts",
  "vectors": [ Vector, … ]
}
```

### Vector
```jsonc
{
  "name": "eth_transfer_nonce0",      // unique within the file, snake_case
  "kind": "evm",                      // the chain: "evm" | "btc" | "sol" (= set)
  "hex": "02ee83…80c0",               // EVM: the unsigned_tx string AS SENT; SOL: the message string AS SENT; BTC: null
  "request": {"evm":{"unsigned_tx":"02ee83…80c0"}},   // EXACT JSON of the `request` arg of sign_for (spec §5.3 SignRequest)
  "expect": {
    "ok": true,
    "error": "ERR_EVM_TYPE",          // present only when ok == false: the exact code before ":" (spec §5.15)
    "hash": "<64 hex>",               // ok only: record payload of request 0 (EVM keccak256(tx), BTC sha256d(preimage_0), SOL sha256(message))
    "hashes": ["<64 hex>", …],        // ok only: one per record (n = 1 for EVM/SOL, n = #preimages for BTC)
    "mpc": [ {"path_chain":"evm","domain_id":0,"payload_v2":{"Ecdsa":"<64 hex>"}} , … ],   // ok only: one per MPC sign call, in order
    "fields": { … }                   // ok only: what the classifier must extract (per chain, below)
  },
  "note": "free text (optional)"
}
```

- Rust: deserialize `request` into `SignRequest` with serde, run the classifier, and compare. `hex` is only a convenience for EVM/SOL; for BTC use `request.btc.preimages` / `request.btc.outputs`.
- Every hex output in `expect` is lowercase with no `0x`. Inputs in `request` are mostly lowercase with no prefix, but some vectors deliberately use `0x` and/or uppercase (spec §5.3: inputs accept an optional `0x` and either case).
- In `fields`, **every integer is a decimal string** (`chain_id`, `nonce`, `gas_limit`, fees, `value`, `amount_sats`, `sequence`, `lamports`, output `value`), because the max-width vectors exceed 2^53. The only exceptions are `vout` and `num_keys`, which are JSON numbers.
- `mpc[i].payload_v2` is the exact MPC argument (EVM/BTC `{"Ecdsa": hex32}`; SOL `{"Eddsa": hex(message)}`). `domain_id` is 0 for EVM/BTC and 1 for SOL. The path is `satchel/{token_id}/{path_chain}`.

### `fields` per chain (accepted vectors)
| chain | fields | SigDetail it maps to |
|---|---|---|
| evm | `{chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, to (0x + 40 lowercase hex), value, unsigned_tx (normalized hex)}` | `Evm{chain_id, nonce, unsigned_tx}` (unsigned_tx = the decoded bytes) |
| btc | `{inputs: [{txid (display order), vout, amount_sats, sequence}], pkh, hash_prevouts, hash_sequence, hash_outputs, outputs: [{value, script}], txid (unsigned tx id, display order)}` | `Btc{txid, vout, amount_sats}` per input |
| sol | `{recent_blockhash (hex32), lamports, from (hex32), to (hex32), num_keys}` | `Sol{recent_blockhash, lamports}` |

### Check order the vectors assume (normative mirror of spec §5.9; the TS reference classifier in `@satchel/core/policy` implements exactly this)
Each refusal vector is built so that **one** rule fails wherever possible. Where two rules could fire, this order decides:

- **Common:** hex decode first (`ERR_HEX`: optional `0x`/`0X`, even length, `[0-9a-fA-F]`; an empty string is valid hex = 0 bytes).
- **EVM:** `ERR_EVM_TOO_LONG` (len > 128) → `ERR_EVM_TYPE` (`p[0] != 0x02`, incl. empty input) → `ERR_EVM_RLP` (one canonical list consuming all bytes, exactly 9 items; canonical = shortest length prefix, no `0x81 xx` with `xx < 0x80`, no leading zero byte in integers, integer zero is `0x80`; items 0–6 must be byte strings, items 7–8: data a byte string, access list a list) → `ERR_EVM_CHAIN_ID` (> 8 bytes or ≠ 11155111) → `ERR_EVM_INT_WIDTH` (nonce, gas > 8 bytes; nonce == 2^64−1; fees, value > 16 bytes) → `ERR_EVM_TO` (≠ 20 bytes) → `ERR_EVM_DATA` (non-empty) → `ERR_EVM_ACCESS_LIST` (non-empty).
- **BTC:** `ERR_BTC_INPUT_COUNT` (0 or > 10; checked before hex) → `ERR_HEX` (each preimage, then outputs) → `ERR_BTC_PREIMAGE_LEN` → per preimage in order, field by field: `ERR_BTC_VERSION` → `ERR_BTC_SCRIPTCODE` (format `19 76 a9 14 <20> 88 ac`) → `ERR_BTC_SEQUENCE` → `ERR_BTC_LOCKTIME` → `ERR_BTC_SIGHASH` → cross-preimage equality of hashPrevouts, hashSequence, pkh, hashOutputs (`ERR_BTC_MIXED_TX`) → `ERR_BTC_DUPLICATE_INPUT` → `ERR_BTC_PREVOUTS_INCOMPLETE` → `ERR_BTC_SEQUENCES_MISMATCH` → `ERR_BTC_OUTPUTS_MALFORMED` (≤ 1024 B, 1–16 outputs, script ≤ 520 B, canonical varints, exact end) → `ERR_BTC_OUTPUTS_MISMATCH`.
- **SOL:** `ERR_SOL_TOO_LONG` → `ERR_SOL_VERSION` (`p[0] & 0x80`, incl. `0xff`; an empty message → `ERR_SOL_MALFORMED`) → full parse (`ERR_SOL_HEADER`: num_required_signatures ≠ 1 or num_readonly_signed ≠ 0, checked right after the 3 header bytes; `ERR_SOL_MALFORMED`: non-canonical compact-u16, num_keys ∉ [2,16], num_required_signatures + num_readonly_unsigned > num_keys (added at the contract's request), truncation, out-of-range program/account index, trailing bytes) → `ERR_SOL_DURABLE_NONCE` (any instruction with program = System and data starting `04000000`) → `ERR_SOL_INSTRUCTION` (≠ exactly one instruction; program ≠ System; data ≠ 12 bytes starting `02000000`; accounts ≠ `[0, k]` with `k < num_keys`).

If the contract's order differs, tell me in `docs/handoff/contract.md` and I will regenerate. Otherwise change only the contract.

## 2. Public API of `@satchel/core` (for the `web` agent)

The package ships TypeScript source (`exports` → `src/**/*.ts`, ESM, `sideEffects: false`); keep `transpilePackages: ["@satchel/core"]`.
**Import by subpath** so the chain libraries stay lazy: `await import('@satchel/core/chains/btc')` in the Send flow. All modules are
isomorphic (checked: `pnpm --filter @satchel/core check:browser` bundles every subpath with `platform=browser`, no Node built-ins).
gzip sizes: derive 27.6 KB · near 23.7 · policy 7.9 · clean-history 35.1 · card 1.1 · format 1.3 · chains/btc 71.6 · chains/evm 112.9 · chains/sol 118.7.
Amounts are `bigint` base units everywhere; hex outputs are lowercase without `0x` unless the name says `0x`.

### `@satchel/core/derive` (no chainsig.js; @noble + @scure)
- `deriveSatchelAddresses(network: 'testnet'|'mainnet', contractId, tokenId) → { tokenId, paths{btc,evm,sol}, evm (EIP-55), btc (tb1q…), sol, btcPubkey (33 B hex), solPubkey (32 B hex) }`
- `evmAddress | btcP2wpkhAddress | solAddress (network, predecessor, path)`; `tokenPath(tokenId, chain)` throws on non-canonical ids ("01").
- `deriveSecp256k1(...) → {compressed, uncompressed}`, `deriveEd25519(...) → Uint8Array(32)`, `nearKeyString(curve, key)` = the string the MPC view `derived_public_key` returns (compare with it, kb/70 F19).
- `buildAddressIndex(network, contractId, maxTokenId)` + `lookupAddress(index, addr) → {tokenId, chain} | undefined` (pass `nft_total_supply`; used for the BTC recipient collision rule).
- `MPC_ROOT_KEYS`, `MPC_CONTRACT`, `DOMAIN_ID`, `toChecksumAddress`, `hash160`.

### `@satchel/core/near` (pure; RPC/wallet/tracker stay in apps/web)
- `evmSignRequest(unsignedTx)`, `btcSignRequest(preimages, outputs)`, `solSignRequest(message)` → `SignRequest` (spec §5.3 JSON).
- `signForCall(tokenId, request, mpcDeposit?) → { methodName: 'sign_for', args, gas: string, deposit: string }`: drop straight into near-connect `FunctionCall` params.
- Formulas (§5.5): `signAttachGas(n)`, `minSignPrepaidGas(n)`, `onSignedGas(n)`, `signAttachDeposit(n, mpcDeposit?)`, `ATTACH.{mint,transfer,list,delist,withdraw,buyNear,buyUsdc}`, `COOLDOWN_BLOCKS`, `listableAt(lastSignHeight)`, `TGAS`.
- `diffConfig(config()) → string[]`: empty when the live `config()` matches these constants (put this in your constants test).
- MPC decoding: `decodeOnSignedResult(successValueBase64 | json) → { signatures: (MpcSignature|null)[], invalid: number[] }` (the tx SuccessValue = `on_signed`'s array); `parseMpcSignature(json)`; `toEvmSignature(sig) → {r, s, yParity = recovery_id}`; `toSecpCompact64` (asserts low-S, never fixes it); `toBtcDerSignature`; `toEd25519Signature`; `verifySecp256k1(sig, payload32, pubkey)`; `recoverSecp256k1`; `signatureFromRecordView(view.signature)` (the `sig_records` view shape); `matchSignaturesToPayloads(candidates, payloads, pubkey)` (receipts-scan fallback for lib/near/outcome.ts); `mpcSignArgs(tokenId, chain, payload_v2)` (display/tests).

### `@satchel/core/policy` (TS mirror of the contract's §5.9 classifier)
- `classifySignRequest(req) → { chain, ok: true, recordPayloads, mpcPayloads, fields } | { chain, ok: false, error: 'ERR_…' }`. Run it on Review **before** opening the wallet: a refusal here is a refusal on-chain (same vectors). `classifyEvm/Btc/Sol` for one chain.

### `@satchel/core/chains/evm` (viem 2.57.7)
- `createSepoliaClient(urls = SEPOLIA_RPCS, {timeoutMs: 4000, rank: true})`: fallback publicnode → drpc → ethpandaops → 0xrpc, rank on.
- `prepareEvmSend(client, {from, to, value: bigint|'max', nonce?}) → {tx, unsigned (0x02…), payload, balance, feeMax}`: pending nonce; pass `nonce` to reuse it on retry (§8.7).
- `buildUnsignedEvmTx(params)`, `serializeUnsignedEvmTx(tx)` (refuses data/access lists), `evmPayloadHash`, `parseUnsignedEvmTx(recordUnsignedTx, expectedPayload?)` (rebuild from a record; checks keccak == payload).
- `finalizeEvmTx(tx, mpcSig, expectedFrom) → {signed, hash, from}`: throws unless `recoverTransactionAddress == expectedFrom` (verify-before-broadcast).
- `broadcastEvm(client, signed) → {hash, alreadyKnown}` (treats "already known"/"nonce too low" after a fallback retry as sent once the hash is found), `waitEvmReceipt`, `blockscoutHistory(address, {pageParams})`, `sepoliaTxUrl`.

### `@satchel/core/chains/btc` (bitcoinjs-lib 7.0.4, @bitcoinerlab/secp256k1 2.0.0 for tb1p only)
- `MempoolClient({fetch?})`: mempool.space/testnet4 + emzy fallback; `utxos/address` primary only; `outspends(txid) → null on 404`; `broadcast(hex)` = POST text/plain (no headers, no preflight); genesis-guarded; refuses `testnet4.mempool.space` (mainnet). `testnet4FeeRate(fees) = max(2, halfHourFee)`.
- `buildBtcSend({from: {address, pubkey}, to, amount: bigint|'max', utxos, feeRate, forbiddenTxids, rng?, inputs?}) → BuiltBtcSend` with `tx, txid, preimages, outputs, signRequest, payloads, fee, change, recipientIndex, changeIndex, perturbations, inputOutpoints`. **R-05 / INV-32:** pass `forbiddenTxids = referencedTxids(senderRecords ∪ recipientRecords if lookupAddress(to) is a Satchel)`; output order is random by default; on a collision it bumps the fee +1 sat (×3), then flips nSequence; throws `UnsafeBtcTxError` ("Can't build a safe transaction. Try a different amount."). `inputs` = retry with the same input set.
- `attachBtcSignatures(tx, signatures, pubkey) → {hex, txid, wtxid, vsize}`: strict low-S verify of each input, throws on a missing (`null`) or wrong signature.
- `btcTxFromPreimages(preimages, outputs)`: rebuild the tx from a `sign_requested` event ("Broadcast now" from any device). Also `selectLargestFirst/selectSweep/selectExact`, `estimateVsize`, `DUST`, `bip143Preimage(s)`, `serializeOutputs`, `computeTxid`, `btcTxUrl`.

### `@satchel/core/chains/sol` (@solana/web3.js 1.99.0, P2)
- `prepareSolSend(connection, {from, to, lamports|'max'})` (rent rules, fresh blockhash), `buildSolTransfer(...)`, `checkSolSend(...)`, `isSolExpired(height, lastValid)`, `isBlockhashFresh(fetchedAt, now)`, `attachSolSignature(built, mpcSig, from) → {raw, signature}` (ed25519-verified), `solTransferFromMessage(bytes, lastValid)`, `broadcastSol`.
- Added by `web` (2026-10-22, small read/validation helpers for the SOL send flow; tests in `test/sol.test.ts`):
  `parseSolAddress(input) → {ok:true, address, onCurve} | {ok:false}` (base58 → exactly 32 bytes; `onCurve:false` = PDA,
  kb/80 `val.sol.pda`), `toBase58` / `fromBase58`, `getSolBalance(conn, addr) → bigint`, `solAccountExists(conn, addr)`,
  `isSolConfirmed(conn, signature)` (confirmed/finalized, no error). No existing export changed.

### `@satchel/core/clean-history` (spec §7; pure, injectable fetchers)
```ts
const report = await checkCleanHistory(
  { network: 'testnet', contractId, tokenId, role: CONTRACT_ROLE, expectedCodeHash, displayedAddresses?,
    near: [await collectNearSnapshot('fastnear', viewsA, contractId, tokenId, { mpcContract: 'v1.signer-prod.testnet' }),
           await collectNearSnapshot('drpc', viewsB, contractId, tokenId, { mpcContract: 'v1.signer-prod.testnet' })],
    now: Date.now() },
  { evm: SEPOLIA_RPCS.slice(0, 2).map((u) => jsonRpcEvmSource(u)),
    btc: [esploraBtcSource(MEMPOOL_TESTNET4), esploraBtcSource(EMZY_TESTNET4)],
    sol: [solRpcSource(SOL_DEVNET_RPC)],
    cache /* VerdictCache: wrap localStorage; only final verdicts are written */ })
report.aggregate      // 'empty' | 'unsafe' | 'unknown' | 'blocked' | 'settling' | 'clean'
report.buy_enabled    // true only for clean / empty
report.expected_sig_count // pass to buy(token_id, listing_id, expected_sig_count)
report.sources_note   // "1 of 2 sources" | null
report.items[]        // {seq, chain, status: spent|expired|unfunded|settling|unused|unknown, reason, evidence, evidence_url, …}
report.accounts[], report.contract, report.warnings (e.g. 'dev_contract_checks_skipped'), report.encumbered_outpoints
```
- `NearViews` = `{ viewFunction(contractId, method, args), viewAccount(id) → {code_hash} | null (null = UNKNOWN_ACCOUNT, throw on transport errors), viewAccessKeyList(id) → {keys} }`: implement over your FailoverRpcProvider, finality `final`.
- The report is plain JSON: the `/api/clean-history/[id]` route can return it as is. `gate(...)` and `roleBanner(role)` are exported for the banner/badge. `verifiedBtcBalance(utxos, report.encumbered_outpoints, tip, K)`.

### `@satchel/core/card` and `@satchel/core/format`
- `tokenLeather(tokenId) → { offset, hue, body, swatch, style: {'--satchel-body', '--satchel-swatch'} }`: matches all kb/81 R3 vectors (ids 1–8, 42).
- `formatBtc/Eth/Sol/Near/Usdc(base, {direction?})`, `formatAmountParts` (sign/int/frac for tabular layouts), `formatSats(n, {approx})`, `formatUsd`, `parseAmount(str, decimals)`, `formatBlocks(n, avgMs)`, `formatDuration`, `formatAgo`, `formatClock`, `truncateMiddle`, `NETWORK_LABEL`. NBSP before tickers, U+2212 for outgoing, balances round down.

## 3. Decisions and deviations (safer option chosen)
1. **Card hue L/C come from the brand hexes**, not the rounded numbers in kb/81: body L = OKLCH L of Night `surface #221812` (≈ 0.220), swatch L/C = `leather-light #6a4730` (≈ 0.431 / 0.0597). With the rounded 0.220/0.431 four of nine kb/81 vectors are off by one in a channel; with the hexes all nine match.
2. **Provider agreement is per item status**, and EVM counts are read at one common block (`min(head) − 3`) on both providers, so honest providers can't disagree because of head skew. A provider on the wrong chain / wrong genesis counts as down (its answers are never used).
3. **BTC request precedence** adds `unknown`: spent > unused > unknown > settling > unfunded (the spec lists only four). One spent input still kills the request.
4. **MPC key mismatch and UI-address mismatch are `unsafe` in every role**, including dev (only the lock and code-hash checks are relaxed on dev).
5. **rc/final without `expectedCodeHash` ⇒ `unsafe`** (fail closed on misconfiguration).
6. **NEAR snapshots must agree on safety fields** (seq, request_id, input_index, chain, height, timestamp, requester, payload, detail, sig_count, keys, code hash); `status`/`signature` may lag and are ignored. One NEAR source ⇒ "1 of 2 sources" (same H-25 policy).
7. **EVM records are self-checked**: keccak(unsigned_tx) must equal the payload and the parsed nonce/chain must equal `detail`, else `unknown`.
8. **SOL**: `expired` items report `sources` = the providers that said "invalid"; SOL never triggers "1 of 2 sources" (one provider suffices by design, R-19). If no SOL source is configured the SOL account check is `unknown`, which blocks Buy: configure `solRpcSource(SOL_DEVNET_RPC)`.
9. **BTC coin selection uses confirmed UTXOs only** unless `allowUnconfirmed: true`.
10. **`pnpm-workspace.yaml` (root, minimal change):** added `allowBuilds` entries `esbuild: true`, `bufferutil: false`, `utf-8-validate: false` (pnpm 11 refused to run with unapproved build scripts).

## 4. Tests
- `pnpm --filter @satchel/core test`: vitest (offline, recorded fixtures) + the browser-bundle check.
- `pnpm --filter @satchel/core test:network`: `@network` live checks (MPC `derived_public_key` on drpc and FastNEAR; live testnet4/Sepolia/devnet checker run). Read-only.
- `pnpm --filter @satchel/tools test` (= `vectors:check`): fails if `vectors/*.json` are stale.
- Fixtures in `packages/core/test/fixtures/`: `kb30-btc-fanout.json` (real MPC fan-out signatures + preimages, research/spikes/btc §8, data only), `testnet4-esplora.json`, `sepolia-rpc.json`, `solana-devnet.json` (read-only answers recorded 2026-10-21T21:32Z).
