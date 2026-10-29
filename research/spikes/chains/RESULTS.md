# chains spike — RESULTS (Phase 0, THROWAWAY)

> Agent: `chains` · Date: 2026-10-21 (all times UTC) · Account: `satchel-spk-chain-e9ea1a.testnet` (public key `ed25519:7nb1QqCj5nRwWSAVtgrkSE6hMe337uJ5LahFxeSaA7nk`)
> Never import any of this into the product. Distilled knowledge: `kb/11-chainsig-js-and-derivation.md`, `kb/31-evm-sepolia.md`, `kb/32-solana-devnet.md`.

## Environment and versions (installed locally in this dir with `npm install`)

| package | resolved | note |
|---|---|---|
| chainsig.js | 1.1.16 (npm, published 2026-05-12, git `17aec4f`) | `latest` dist-tag |
| viem | 2.57.7 | |
| bitcoinjs-lib | 6.1.9 | chainsig.js requires `^6.1.5`; npm latest is 7.0.4 |
| @solana/web3.js | 1.99.0 | chainsig.js requires `^1.98.0`; npm `latest` is now **3.1.1** (compat layer over @solana/kit 8.5) |
| @near-js/{accounts,crypto,providers,signers,transactions,utils} | 2.5.1 | chainsig.js deps; near-api-js latest is 7.3.1 |
| @noble/curves / @noble/hashes | 2.4.0 (top level; chainsig uses nested 1.9.7) | |
| esbuild 0.28.2, tsx 4.23.15, next 16.4.2, react 19.3.1 | | |

Live MPC contract: `v1.signer-prod.testnet` `version()` = `"3.17.0"`, state `Running`; domains: 0 CaitSith/Sign (secp256k1), 1 Frost/Sign (ed25519), 2 CKD (BLS12-381), 3 CaitSith/**ForeignTx** (not usable for `sign`). `config().sign_call_gas_attachment_requirement_tera_gas = 15`, `return_signature_and_clean_state_on_success_call_tera_gas = 7`. Mainnet `v1.signer` is also `3.17.0` with the same domain layout.

## 1. Derivation cross-check — `npx tsx derive.ts` → `out_derive.txt`

Three independent methods: (a) chainsig.js `deriveAddressAndPublicKey` (its local fast path), (b) live RPC view `v1.signer-prod.testnet.derived_public_key {path, predecessor, domain_id}` + viem `publicKeyToAddress` / bitcoinjs-lib `payments.p2wpkh({network: testnet})` / base58, (c) my own @noble/curves implementation of near/mpc's KDF. **ALL MATCH: true** (8/8).

| predecessor | path | domain | address |
|---|---|---|---|
| satchel-spk-chain-e9ea1a.testnet | satchel/1/evm | 0 | `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` |
| satchel-spk-chain-e9ea1a.testnet | satchel/1/btc | 0 | `tb1q00qngh4vre45nwpaa9eljwuxy0zpljeg7jefsc` |
| satchel-spk-chain-e9ea1a.testnet | satchel/1/sol | 1 | `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` |
| satchel-spk-chain-e9ea1a.testnet | satchel/42/evm | 0 | `0x61739f33AdbB7F76c1b5B222E4119085257528BE` |
| satchel.example.testnet | satchel/1/evm | 0 | `0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A` |
| satchel.example.testnet | satchel/1/btc | 0 | `tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd` |
| satchel.example.testnet | satchel/1/sol | 1 | `DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB` |
| satchel.example.testnet | satchel/42/evm | 0 | `0x3C443ac72C2Ebe80b48AA6101ccF3c1E8b0aB6d1` |

Also derived: (spk-chain, `satchel/2/sol`) = `8C3CxUxgsZL6AU44dEmtJXLKvKf8rroNGvcP8H9wJN1r` (used as SOL recipient).
Timing: RPC view 50–140 ms per call; chainsig local derivation 0.5–20 ms (first call includes warm-up). `bench_derive.ts` (N=200): chainsig secp256k1 0.62 ms, chainsig ed25519 0.35 ms, noble EVM+BTC+SOL triple 1.08 ms → `out_bench_derive.txt`.
The `derived_public_key` view works for a predecessor that does not exist (`satchel.example.testnet`).
Root keys from `public_key {domain_id}` on testnet equal chainsig.js `ROOT_PUBLIC_KEYS.TESTNET` (`secp256k1:4NfTiv3U…Fwx3`, `ed25519:6vSEtQxr…3Un2`); mainnet `v1.signer` equals `ROOT_PUBLIC_KEYS.MAINNET` (`secp256k1:3tFRbMqm…UWya`, `ed25519:G9hwngxW…NLtF`).

### 1b. Old chainsig.js 1.1.14 (scratch install outside the repo, `npm install chainsig.js@1.1.14`)
- ESM `import('chainsig.js')` on Node 22 → `ERR_MODULE_NOT_FOUND …/cosmjs-types/cosmos/tx/signing/v1beta1/signing`.
- CJS `require`: EVM `deriveAddressAndPublicKey('satchel.example.testnet','satchel/1/evm')` → `0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A` ✔ (always an RPC view in ≤ 1.1.14); Solana → **`Non-base58 character`** ✘ (the ed25519 NAJ key is converted with `najToUncompressedPubKeySEC1`).
- 1.1.14 bundle contains `sig.network v1.0.0 epsilon derivation,${chainId},${predecessor},${path}` in `utils.cryptography.deriveChildPublicKey`, i.e. the Sig Network KDF, which doesn't match NEAR MPC. 1.1.15 and later contain `near-mpc-recovery v0.1.0 epsilon derivation:`.

## 2. Real MPC signatures (direct `sign` from my account; predecessor = my account)

Request: `sign({"request":{"payload_v2":{"Ecdsa"|"Eddsa":"<hex>"},"path":"satchel/1/<chain>","domain_id":0|1}})`, 50 Tgas attached, 1 yoctoNEAR deposit. Sent with `send_tx wait_until=INCLUDED`, then polled `EXPERIMENTAL_tx_status wait_until=EXECUTED_OPTIMISTIC` every 1 s (`near.ts`).

| NEAR tx (testnet.nearblocks.io/txns/…) | domain | payload | submit→included | submit→final | gas burnt | NEAR burnt |
|---|---|---|---|---|---|---|
| `Dcc3gktAJ96hPDQ3Lp3FxfnYo4zXtujqt2SGWYUFuWWa` | 0 | EIP-1559 hash `0xbc65…c377` | 1011 ms | 4605 ms | 8.382 Tgas | 0.000816 |
| `61E1KxkvBuAAGiUyWXDheB4xxQq3jXPjk8n8ZQRrFhFd` | 0 | EIP-1559 hash | 1177 ms | 5642 ms | 8.335 Tgas | ~0.00082 |
| `DXpWLSP2EsCbNsEzw3TvFJkTRpuMkZ8FRtzjjEBiXWd2` | 0 | EIP-1559 hash | 1428 ms | 4983 ms | 8.383 Tgas | ~0.00082 |
| `5h6ui9dUyRj7B3fCRFD9Q13o7H99kJTS2Sq74NUCe8xc` | 0 | EIP-1559 hash | 1162 ms | 4549 ms | 8.336 Tgas | ~0.00082 |
| `H6xHyS25cUAoiGZKoaq5K5jXw8Hq1PPURgLbBo7TdaNw` | 1 | 150-byte Solana message | 1317 ms | 5360 ms | 8.734 Tgas | 0.000851 |
| `6Xnb1PEEzqojJMS2PUysPyLVVkhQcQupsTTG3r4MHEDj` | 1 | arbitrary 59 bytes (not a Solana tx) | 1072 ms | 4589 ms | — | — |

Receipt breakdown of `Dcc3gk…` (`out_mpc_tx_evm1.json`): tx→receipt 0.315 Tgas; `v1.signer-prod.testnet.sign` 4.335 Tgas (log `sign: predecessor=AccountId("satchel-spk-chain-e9ea1a.testnet"), request=SignRequestArgs { path: "satchel/1/evm", …`); `return_signature_and_clean_state_on_success` (7 Tgas attached) 3.51 Tgas; two refund receipts. 6/6 sign calls succeeded, none timed out (n is tiny; go/no-go statistics belong to the `mpc` agent).

Secp256k1 response shape (verbatim, `Dcc3gk…`):
```json
{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1}
```
Ed25519 response shape: `{"scheme":"Ed25519","signature":[<64 numbers>]}`.

### recovery_id vs big_r prefix (4 live secp256k1 samples)

| NEAR tx | big_r prefix | recovery_id | yParity that recovers | s low? |
|---|---|---|---|---|
| Dcc3gk… | 02 | 1 | 1 | yes |
| 61E1Kx… | 03 | 1 | 1 | yes |
| DXpWLS… | 03 | 0 | 0 | yes |
| 5h6ui9… | 03 | 0 | 0 | yes |

The prefix disagreed with `recovery_id` in 3 of 4 samples, and `yParity = recovery_id` recovered the derived address in 4 of 4. That fits the MPC normalizing `s` to low-S after the presignature fixed R and then computing `recovery_id` by trial recovery (near/mpc `threshold-signatures/src/ecdsa/robust_ecdsa/sign.rs: s.conditional_assign(&(-s), s.is_high())`; `crates/node/src/indexer/types.rs` uses `RecoveryId::trial_recovery_from_prehash`).

## 3. EVM Sepolia — `npx tsx evm_sign.ts` → `out_evm_sign_1.txt` (+ `out_evm_sign_v*.txt`)

- From `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` (balance 0, nonce 0) to `0x61739f33AdbB7F76c1b5B222E4119085257528BE`, value 0.0001 ETH, gas 21000, chainId 11155111, type eip1559.
- `estimateFeesPerGas()` → maxFeePerGas 200028 wei, maxPriorityFeePerGas 200008 wei (latest block baseFeePerGas = **16 wei**, block 11962164 @ 2026-10-21T11:37:24Z).
- chainsig `prepareTransactionForSigning` hash `0xbc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377` == independent `keccak256(serializeTransaction(tx))` ✔.
- Finalized (chainsig `finalizeTransactionSigning` with `utils.cryptography.toRSV(response)`): `0x02f87183aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c001a0f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0ca0549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1` (would-be tx hash `0x2fc767520187c7206fca93ecec3838b96f01956ebe31051d90ae3035270fab76`).
- `recoverTransactionAddress` → `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` == derived ✔.
- Broadcast via viem `sendRawTransaction` (publicnode): `TransactionRejectedRpcError`, code -32003, details **`insufficient funds for gas * price + value: have 0 want 100004200588000`**. The node recovered the sender as our (empty) derived address, so the signature is valid; only funding is missing.
- Broadcast via chainsig `evm.broadcastTx`: throws a generic `Failed to broadcast transaction.` and `console.error`s the original error (the detail is lost to callers).
- `npx tsx evm_viem_only.ts` → `out_evm_viem_only.txt`: viem-only rebuild of the same tx + same MPC response: `hashMatchesChainsig: true, signedMatchesChainsigBytes: true, recovered == derived`.
- ⚠ The signed nonce-0 txs above (four variants, values 1e14 … 1e14+3 wei) stay valid **forever** until nonce 0 of `0x532b…832d` is used. If anyone funds that address, anyone who has these bytes can broadcast one. That is the clean-history risk in miniature (harmless here: the recipient is my own derived address).

- `npx tsx persist_roundtrip.ts` → `out_persist_roundtrip.txt`: EVM `serializeTransaction` → `0x02ee83aa36…80c0` (98 chars). After `deserializeTransaction` the hash is unchanged and finalize with the real MPC response gives a tx identical to the original. Solana `serializeTransaction` → 288-char base64; message identical after restore, blockhash kept.

## 4. Sepolia RPC probe — `SCRATCH=<dir> ./rpc_probe.sh` → `out_rpc_probe.txt`; `node rpc_methods.mjs` → `out_rpc_methods.txt`

| endpoint | chainId | latency (blockNumber) | CORS (preflight from https origin) | 20 sequential | 100 (10×10 parallel) | eth_maxPriorityFeePerGas / feeHistory / getTransactionCount(pending) / estimateGas |
|---|---|---|---|---|---|---|
| https://ethereum-sepolia-rpc.publicnode.com | 0xaa36a7 | 62 ms | `*` | 20/20 | 100/100 (0.6 s) | all ok |
| https://sepolia.drpc.org | ✔ | 79 ms | echoes origin | 20/20 | 100/100 | all ok |
| https://rpc.sepolia.ethpandaops.io | ✔ | 99 ms | echoes origin | 20/20 | 100/100 | all ok |
| https://0xrpc.io/sep | ✔ | 137 ms | `*` | 20/20 | 100/100 (2.3 s) | all ok |
| https://gateway.tenderly.co/public/sepolia | ✔ | 102 ms | `*` | 20/20 | **46/100 (54×429)** | all ok |
| https://sepolia.gateway.tenderly.co | ✔ | 127 ms | `*` | 20/20 | — | — |
| https://1rpc.io/sepolia | ✔ | 167 ms | `*` | 20/20 | 100/100 | `eth_maxPriorityFeePerGas` no result; `getTransactionCount` 429 "Rate limit exceeded on Nodies public endpoints" |
| https://11155111.rpc.thirdweb.com (**viem's default for `sepolia`**) | ✔ | 231 ms | `*` | 20/20 | **34/100 (66×429)** | all ok |
| https://api.zan.top/eth-sepolia | ✔ | 328 ms | echoes origin | 20/20 | — | — |
| https://eth-sepolia.api.onfinality.io/public | ✔ | — | `*` | 5/20 (429) | — | — |
| rpc.sepolia.org, rpc2.sepolia.org | timeout | | | 0/20 | | |
| endpoints.omniatech.io/v1/eth/sepolia/public | 521 | | | | | |
| eth-sepolia.public.blastapi.io | 403 "Blast API is no longer available" | | | | | |
| rpc.ankr.com/eth_sepolia | "must authenticate … API key" | | | | | |
| eth-sepolia.g.alchemy.com/v2/demo | 429 | | | | | |
| ethereum-sepolia.rpc.subquery.network/public, sepolia.rpc.grove.city | no response | | | | | |

viem fallback behaviour (`npx tsx evm_fallback_check.ts`, `npx tsx evm_fallback_tune.ts` → `out_evm_fallback_*.txt`): the recommended 4-endpoint fallback returned chainId/nonce/fees/balance in 194 ms. With a dead first transport (`rpc.sepolia.org`) it took 20,157 ms (10 s timeout, `Promise.all` of 4 reads); with a 4 s timeout, 4,079 ms per call; with `rank: {interval: 5000, sampleCount: 3, timeout: 2000}`, 4,068 ms on the first call and **44 ms** after 12 s (dead transport demoted).

Explorer APIs: Etherscan v2 `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist…` without key → `{"status":"0","message":"NOTOK","result":"Missing/Invalid API Key"}`; old `api-sepolia.etherscan.io/api` → "You are using a deprecated V1 endpoint…"; `https://api.etherscan.io/v2/chainlist` lists Sepolia 11155111 as **"Free-tier available"** (Base Sepolia and OP Sepolia: "Paid Plan required"). Blockscout `https://eth-sepolia.blockscout.com/api/v2/addresses/<addr>/transactions` keyless → 200, `access-control-allow-origin: *`, `x-ratelimit-limit: 180`, 50 items per page + `next_page_params`; the Etherscan-compatible `https://eth-sepolia.blockscout.com/api?module=account&action=txlist…` also works keyless.

Other Sepolia facts: 100-block average block time = 12.00 s. Scan of the last 60 blocks (to block 11,962,318): tx types 0x2 7274, 0x0 1039, 0x3 656, **0x4 (EIP-7702) 10**, e.g. `0xc90d64acf3adc82c89f2da164311147761ba653950023d5cfca475910a84d5e0`, so 7702 is live. publicnode returns HTTP 403 to Python's default `urllib` User-Agent (fine with a browser UA, Node fetch or curl). `npx tsx evm_rlp_layout.ts` → `out_evm_rlp_layout.txt`: unsigned EIP-1559 bytes = `0x02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0` (48 B), and its keccak equals the hash the MPC signed.

Sepolia faucets (checked 2026-10-21): `sepolia-faucet.pk910.de/api/getFaucetConfig` → `captcha.requiredForStart: true`, PoW `cryptonight` difficulty 12, `minClaim` 0.05 ETH, `maxClaim` 2.5 ETH. No programmatic faucet found, so funding needs a human (see kb/31).

## 5. Browser / Next.js readiness

- `npx esbuild bundle/entry-chainsig.ts --bundle --platform=browser --format=esm --minify` → **`✘ [ERROR] Could not resolve "crypto"`** (chainsig.js's own browser build does `import {createHash} from 'crypto'` for its XRP adapter).
- With `--external:crypto`: bundle **8.09 MB minified / 1.93 MB gzip**. Top contributors: chain-registry 4.10 MB, cosmjs-types 0.91 MB, poseidon-lite 0.59 MB, @noble/curves 0.40 MB, @noble/hashes 0.25 MB, hash-wasm 0.21 MB, @aptos-labs/ts-sdk 0.20 MB, viem 0.20 MB, xrpl 0.19 MB.
- Patched copy with `"sideEffects": false` → still 8.49 MB (everything sits in one module behind `export * as` namespaces, so it can't be tree-shaken).
- Headless Chrome 2026 (`--headless=new --dump-dom`) on the IIFE build, no Buffer polyfill, served over http → **`Uncaught ReferenceError: Buffer is not defined`** at load.
- Same bundle with `--inject` of `buffer@6` as `globalThis.Buffer` → `OK {evm:0x53f9…1C2A, btc:tb1qaanv…8sd}` (8.2 ms).
- Minimal noble-only derivation (`bundle/entry-minimal.ts`: @noble/curves + @noble/hashes + @scure/base + viem/accounts) → **78.7 KB min / 29.5 KB gzip**, no polyfills, Chrome `OK` for EVM/BTC/SOL (same addresses).
- Next.js 16.4.2 (Turbopack, `next build`), `'use client'` component with a static `import … from 'chainsig.js'`: compiled with no config, ran in headless Chrome → `OK` (EVM/BTC/SOL addresses correct). Client JS total 8.33 MB raw / 2.05 MB gzip; the largest chunk is 7.6 MB.
- Same with `await import('chainsig.js')` inside the effect: the 7.47 MB chunk is not referenced by the initial HTML; initial-load chunks are 852 KB raw / 264 KB gzip; still `OK`.

## 6. Solana devnet

- Address (spk-chain, `satchel/1/sol`) = `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA`, balance 0.
- `node sol_airdrop.mjs` → `requestAirdrop` 1 SOL: `airdrop … failed: Internal error`. Raw retries (0.5, 0.1 SOL): HTTP 429, `retry-after: 86400`, `x-ratelimit-airdrop-limit: 1`, `x-ratelimit-airdrop-remaining: -1`; body "You've either reached your airdrop limit today or the airdrop faucet has run dry. Please visit https://faucet.solana.com…". Testnet `requestAirdrop`: `Internal error`, `x-ratelimit-airdrop-remaining: 0`. Keyless alternatives: Ankr (key required), dRPC ("chain is not available on free plan"), OnFinality (429), Tatum (`Invalid request` for requestAirdrop), Helius (Unauthorized), publicnode/sonic (no response).
- faucet.solana.com text (2026-10-21): **"AI agents should not use this faucet."** It points to `solana airdrop`, `devnet-pow`, or a local validator. `devnet-pow` 0.1.4 (crates.io, 2023-05-30) source: its payer must already hold at least 5000 lamports, otherwise it calls `request_airdrop` (rate-limited), so it can't bootstrap from zero. I did not use the web faucet.
- `npx tsx sol_sign.ts` → `out_sol_sign_1.txt`: chainsig `prepareTransactionForSigning({from, to: 8C3C…JN1r, amount: 1_000_000n})` → legacy message, 150 bytes, `== transaction.serializeMessage()`; blockhash `2HH5kZti…yiW`, block height 500719507, lastValidBlockHeight 500719657 (+150).
  - MPC `H6xHyS…`: `payload_v2.Eddsa` = hex of the **full 150-byte message**, `domain_id` 1 → 64-byte signature `3HeVZAwBwvAGAbjnVtEZ88wQQn7j2bsfrvJhvtAVzWdkD8ie2hiMapApoYG3QaBUGRhP8bTBXTcZpEiW72AMMCYt`; `ed25519.verify(sig, message, derivedPubkey)` = **true**.
  - Negative control (one byte flipped) → `Transaction did not pass signature verification`.
  - Real signature, broadcast unfunded → `Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.` The tx passed sigverify and failed only on funding. Prep→send 5.9 s; 126 of 150 blocks remained.
- `node sol_facts.mjs` → `out_sol_facts.txt`: devnet 0.238 s/slot (getRecentPerformanceSamples); `getFeeForMessage` = 5000 lamports for both legacy and v0 single-signature transfers; legacy first byte 0x01 (num signatures), v0 first byte 0x80; v0 message 152 bytes vs legacy 150.
- Wall clock: block height advanced 85 blocks in 20.2 s (0.237 s/block), so **150 blocks ≈ 35.6 s**. Slot time from samples: mainnet-beta 0.215 s, testnet 0.218 s, devnet 0.238 s.
- `getMinimumBalanceForRentExemption(0)` = **650,240 lamports** on devnet, testnet and mainnet (165 bytes: 1,488,440; 80 bytes for a nonce account: 1,056,640). Solana versions: devnet/testnet `4.4.0-beta.1`, mainnet `4.3.2`.
- `node sol_rent_sim.mjs` → `out_sol_rent_sim.txt` (simulateTransaction with `sigVerify:false`, payer = devnet validator identity `2UWuPRCU…sVzL`): new recipient with 650,239 → `InsufficientFundsForRent {account_index:1}`; with 650,240 → ok; sender left with 1000 lamports → `InsufficientFundsForRent {account_index:0}`; sender drained to exactly 0 → ok.
- `npx tsx sol_nonce_detect.ts` → `out_sol_nonce_detect.txt`: byte-level detector `isDurableNonce(message)` gives normal = false, durable legacy = true, durable v0 = true, nonce instruction second = false. Instruction 0 = program `11111111111111111111111111111111`, data `04000000`. web3.js: `nonceInitialize` has no signer, `nonceAdvance` needs the authority as signer; `NONCE_ACCOUNT_LENGTH` = 80.
- `npx tsx convert.ts` → `out_convert.txt`: helpers that parse a real FinalExecutionOutcome `status.SuccessValue` into a viem signature (recovers the derived address), a Bitcoin 64-byte compact signature (verifies low-S; DER+sighash `3045022100f6ef…87e101`) and a Solana 64-byte signature (verifies). The MPC Ed25519 domain also signed an arbitrary 59-byte non-Solana message (`6Xnb1P…`).

## Human actions still open (to finish real transfers)

1. **Sepolia**: send ≥ 0.001 Sepolia ETH to `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d`, e.g. via https://sepolia-faucet.pk910.de/ (solve the captcha, mine about 20 min, claim ≥ 0.05) or https://cloud.google.com/application/web3/faucet/ethereum/sepolia (Google login). Then run `cd research/spikes/chains && npx tsx evm_sign.ts` (it fetches the live nonce and fees, signs through the MPC, and broadcasts; expect an Etherscan link). Note: once funded, one of the four pre-signed nonce-0 txs above could be broadcast by anyone holding them, which would move 0.0001 ETH to my other derived address.
2. **Solana devnet**: send ≥ 0.01 devnet SOL to `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` via https://faucet.solana.com (a human, ideally logged in with GitHub) or `solana airdrop 1 6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA --url devnet` from another IP. Then run `npx tsx sol_sign.ts` (send 1,000,000 lamports to `8C3C…JN1r`; expect an explorer link `https://explorer.solana.com/tx/<sig>?cluster=devnet`).

## Reproduce / regenerate
- Root deps: `npm install` in this dir (lockfile committed here). Every `*.ts` runs with `npx tsx <file>`; `*.mjs` with `node <file>`.
- Bundles (deleted to save space, about 25 MB): `npx esbuild bundle/entry-chainsig.ts --bundle --platform=browser --format=iife --minify --alias:crypto=./bundle/crypto-stub.js [--inject:./bundle/buffer-shim.js] --outfile=bundle/iife-chainsig-*.js`, then open `bundle/test-*.html` via `python3 -m http.server` and headless Chrome `--dump-dom`.
- Next.js check (node_modules deleted, about 600 MB): `cd nextcheck && npm install next@16.4.2 react@19.3.1 react-dom@19.3.1 chainsig.js@1.1.16 viem typescript @types/react @types/node && npx next build && npx next start -p 8766`. `app/derive.tsx` currently holds the dynamic-import variant.
