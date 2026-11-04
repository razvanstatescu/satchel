# chainsig.js and MPC key derivation (client side)

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: chains · Checked: 2026-10-21 · Confidence: high (all P0 items verified live; transfers wait on faucet funding)
> Primary sources: npm `chainsig.js@1.1.16` (published 2026-05-12) = GitHub [NearDeFi/chainsig.js@17aec4f](https://github.com/NearDeFi/chainsig.js/tree/17aec4f932ec5ca49a4a52a167dbb31a2b77710e); near/mpc [@13f42bf](https://github.com/near/mpc/tree/13f42bf4b250c8d4d812185ed7b6e4724b24a411) (`crates/contract/src/api/{sign,keys}.rs`, `crates/near-mpc-crypto-types/src/{kdf,primitives,sign}.rs`); live `v1.signer-prod.testnet` (contract `version()` = 3.17.0); [near-examples/near-multichain@7e1c9f1](https://github.com/near-examples/near-multichain/tree/7e1c9f1a8f8cf641685076810a155f5fdfe05d92). Spike: `research/spikes/chains/` (`RESULTS.md`).

## TL;DR — what an implementer must know
- **Package:** `chainsig.js` **1.1.16** (npm `latest`, 2026-05-12, one maintainer `gprout009`, 11 GitHub stars, 8 open issues, not archived). Low cadence: 1.1.14 (2025-10-10), then 1.1.15 (2026-05-06), then 1.1.16. **Pin `1.1.16` exactly.** 1.1.14 and older break Solana derivation, fail ESM import in Node 22, and ship a Sig-Network KDF helper (Gotcha 0). [VERIFIED `npm view chainsig.js`, scratch install of 1.1.14]
- **Derivation is offline and deterministic.** Since 1.1.15 (commit `feef0a5`, "align with near/mpc and enable local key derivation"; the 1.1.15 tarball contains the NEAR KDF prefix, 1.1.14's doesn't), chainsig.js derives keys locally from hard-coded MPC root keys when `contractId` is exactly `v1.signer-prod.testnet` or `v1.signer`. Those root keys match the live contracts. 8/8 (predecessor, path) pairs matched across chainsig.js, the live `derived_public_key` view and an independent @noble implementation. Cost is about 1 ms per token for all three chains. [VERIFIED]
- **Contract mode works.** Derive with `predecessor = "satchel.<team>.testnet"`, take `hashesToSign` from `prepareTransactionForSigning`, send each one to *our* `sign_for` through the wallet, then feed the MPC response from the tx outcome into `finalizeTransactionSigning`. None of `derive`, `prepare` or `finalize` calls the MPC; only `ChainSignatureContract.sign()` does, and Satchel must not use it. [VERIFIED source + real MPC signatures]
- **MPC response → EVM signature:** `r = big_r.affine_point.slice(2)` (drop the 02/03 prefix), `s = s.scalar`, **`yParity = recovery_id`**. Never derive yParity from the big_r prefix: the MPC normalizes s to low-S, which flips R. In 3 of 4 live samples the prefix parity was wrong. chainsig's `utils.cryptography.toRSV()` does it right (`v = recovery_id + 27`). [VERIFIED]
- **EdDSA payload = the full message bytes** (Solana message, ≤ 1232 bytes), hex in `payload_v2.Eddsa`. ECDSA payload = exactly 32 bytes (the hash). Request JSON: `{"request":{"payload_v2":{"Ecdsa":"<64 hex>"},"path":"satchel/1/evm","domain_id":0}}`, 1 yoctoNEAR, ≥ 15 Tgas (contract config). [VERIFIED live]
- **Bundle weight is the main cost.** chainsig.js statically imports every chain SDK (cosmjs, chain-registry, aptos, sui, xrpl), so a client bundle is **8.1 MB minified / 1.9–2.0 MB gzip** and cannot be tree-shaken. [VERIFIED esbuild + Next build]
- **Next.js 16.4.2 (Turbopack) compiles and runs it in a client component with zero config**, since Next supplies Buffer and crypto polyfills. Plain esbuild/Vite without polyfills fails (`Could not resolve "crypto"`, then `ReferenceError: Buffer is not defined` in Chrome). `await import('chainsig.js')` moves the 7.5 MB chunk off the initial load. [VERIFIED headless Chrome]
- **Recommended split:** use a ~60-line isomorphic derivation module (@noble/curves + @scure/base + viem; 29 KB gzip; no polyfills; verified identical) for every address the UI and indexer show. Use chainsig.js only lazily on the Send flow, or replace it with viem / bitcoinjs-lib / @solana/web3.js directly (EVM checked byte-identical).
- **Dependency traps:** chainsig pins `@solana/web3.js ^1.98` (npm `latest` is now **3.1.1**, a kit-compat rewrite) and `bitcoinjs-lib ^6.1.5` (npm latest 7.0.4). Pin the app to the same majors if you pass objects into chainsig adapters.
- **`ChainSignatureContract` constructor is `{ networkId, contractId?, fallbackRpcUrls? }`.** The README's Quick Example (`accountId`, `keypair`, `key_version`) is stale.
- `evm.broadcastTx()` swallows the node error ("Failed to broadcast transaction."). Call viem `sendRawTransaction` yourself to show "insufficient funds" or "nonce too low".

## Verified facts & measurements

### Package facts [VERIFIED `npm view`, `git clone`, GitHub API, 2026-10-21]
| item | value |
|---|---|
| npm | `chainsig.js@1.1.16`, `type: module`, exports: `browser.import → ./browser/index.browser.js`, `node.import → ./node/index.node.js`, CJS variants too; `types → ./node/index.d.ts`; **no `sideEffects` field**; no `repository` field |
| size | 13 files, 712 KB unpacked; each build is about 27 KB minified, with all deps external |
| license | npm says MIT, repo LICENSE says Apache-2.0 |
| runtime deps (declared) | viem ^2.22.14 (resolved 2.57.7), bitcoinjs-lib ^6.1.5 (6.1.9), coinselect ^3.1.13, @solana/web3.js ^1.98.0 (1.99.0), @near-js/{accounts,crypto,keystores,providers,signers,transactions,types,utils} ^2.2.4 (2.5.1; *not* near-api-js 7.x), elliptic ^6.6.1, js-sha3, @noble/curves ^1.9, @noble/hashes ^1.8, @scure/base, bs58 ^6, bn.js, plus cosmjs 0.38, chain-registry, @aptos-labs/ts-sdk 2, @mysten/sui 1.x, xrpl 4, ripple-* codecs, `got` 11 |
| chains | EVM, Bitcoin (P2WPKH only), Cosmos, Solana, Aptos, SUI, **XRP** |
| test vectors | `__tests__/contracts/derivation.test.ts` pins local KDF output to vectors captured from `v1.signer-prod.testnet` on 2026-04-30 |

Latest related packages (2026-10-21): viem 2.57.7, bitcoinjs-lib 7.0.4, @solana/web3.js 3.1.1 (`latest`; v1 line ends at 1.99.0), @solana/kit 8.5.0, near-api-js 7.3.1, @near-js/* 2.5.1, @hot-labs/near-connect 0.11.4. `signet.js` 0.4.2 is for Sig Network's own MPC, not NEAR's `v1.signer`; don't mix them up.

### Live MPC contract facts [VERIFIED RPC views on `rpc.testnet.fastnear.com` / `rpc.mainnet.fastnear.com`]
- `v1.signer-prod.testnet` and `v1.signer` both report `version()` = `"3.17.0"`, state `Running`.
- Domains (both networks): `0` CaitSith **Sign** (secp256k1), `1` Frost **Sign** (ed25519), `2` ConfidentialKeyDerivation (BLS12-381), `3` CaitSith **ForeignTx**. Domain 3 rejects `sign` ("this method requires Sign"), so use only 0 and 1.
- `config()`: `sign_call_gas_attachment_requirement_tera_gas: 15`, `return_signature_and_clean_state_on_success_call_tera_gas: 7`, `fail_on_timeout_tera_gas: 2`.
- Root keys (`public_key {domain_id}`): testnet `secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3`, `ed25519:6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2`; mainnet `secp256k1:3tFRbMqmoa6AAALMrEFAYCEoHcqKxeW38YptwowBVBtXK1vo36HDbUWuR6EZmoK4JcH6HDkNMGGqP1ouV7VZUWya`, `ed25519:G9hwngxWNKdmqMCmU1Yt6LPhFpayJeKFxyAV1HqMNLtF`. Identical to chainsig.js `constants.ROOT_PUBLIC_KEYS`.

### Derivation cross-check [VERIFIED `derive.ts`, 2026-10-21]
Methods: (a) chainsig.js `deriveAddressAndPublicKey`, (b) live view `derived_public_key {path, predecessor, domain_id}` + viem `publicKeyToAddress` / bitcoinjs-lib `p2wpkh(testnet)` / base58, (c) independent @noble implementation. All 8 agree:

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

Use these as unit-test vectors (the `satchel.example.testnet` rows match what the real contract id will do). The view works for predecessors that don't exist. Timing: RPC view 50–140 ms per call; local derivation 0.35–0.62 ms per key (chainsig) or 1.08 ms for an EVM+BTC+SOL triple (@noble), N=200.

### KDF (what all three implementations compute) [SOURCED near/mpc@13f42bf `crates/near-mpc-crypto-types/src/kdf.rs`, `crates/contract/src/crypto_shared/kdf.rs`]
- `tweak = sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path)`. Quote: `let derivation_path = format!("{derivation_prefix}{},{}", predecessor_id, path);`
- secp256k1: `child = root + G·Scalar::from_repr(tweak)` (big-endian; the contract errors if tweak ≥ n, probability ~2⁻¹²⁸).
- ed25519: `child = root + B·Scalar::from_bytes_mod_order(tweak)` (**little-endian**, reduced mod L).
- EVM = keccak(child x‖y)[12..]; BTC = P2WPKH(hash160(compressed child)), hrp `tb` for testnet/testnet4/signet; SOL address = base58(32-byte child) = the same string as the `ed25519:` NAJ key minus its prefix.
- The predecessor that matters is whoever calls the MPC `sign`. Satchel calls it from `sign_for`, so the predecessor is the **Satchel contract account**, not the user. Paths `satchel/{id}/{btc|evm|sol}` don't include the owner, so addresses are stable across transfers (as the plan says).

### Real MPC signatures [VERIFIED; NEAR testnet txs, see RESULTS §2]
6/6 direct `sign` calls (50 Tgas, 1 yocto) succeeded, with submit→final of **4.5–5.6 s** and **8.3–8.7 Tgas burnt** (≈ 0.00082–0.00085 NEAR). Receipts: `sign` 4.3 Tgas plus `return_signature_and_clean_state_on_success` 3.5 Tgas. Samples: `Dcc3gktAJ96hPDQ3Lp3FxfnYo4zXtujqt2SGWYUFuWWa` (ECDSA), `H6xHyS25cUAoiGZKoaq5K5jXw8Hq1PPURgLbBo7TdaNw` (EdDSA, Solana message). Gas through the Satchel contract and the timeout go/no-go are owned by `mpc` (kb/10).

### Browser / bundler [VERIFIED RESULTS §5]
| setup | result |
|---|---|
| esbuild `--platform=browser`, no polyfills | ✘ `Could not resolve "crypto"` (chainsig.js browser build: `import {createHash} from 'crypto'`, used by XRP) |
| esbuild with `crypto` stubbed | builds 8.09 MB min / 1.93 MB gzip; Chrome throws **`ReferenceError: Buffer is not defined`** at load |
| plus `globalThis.Buffer` from `buffer@6` (inject) | Chrome OK, EVM+BTC derivation in 8 ms |
| `sideEffects:false` patched in | still 8.49 MB (single-module `export * as` namespaces, no tree-shaking) |
| **Next.js 16.4.2 Turbopack, static import in `'use client'`** | builds with no config, Chrome OK; client JS 8.33 MB raw / 2.05 MB gzip (7.6 MB chunk) |
| Next.js, `await import('chainsig.js')` | 7.47 MB chunk lazy; initial load 852 KB / 264 KB gzip; Chrome OK |
| @noble + @scure/base + viem/accounts only | **78.7 KB min / 29.5 KB gzip**, no polyfills, Chrome OK (same addresses) |

Bundle composition (top): chain-registry 4.10 MB, cosmjs-types 0.91 MB, poseidon-lite 0.59 MB, @noble/curves 0.40 MB, @noble/hashes 0.25 MB, hash-wasm 0.21 MB, aptos 0.20 MB, viem 0.20 MB, xrpl 0.19 MB, ripple-binary-codec 0.12 MB, bitcoinjs-lib 0.09 MB, @solana/web3.js 0.05 MB. The official example app (near-multichain) uses `vite-plugin-node-polyfills`.

## Reference — exact APIs, types, commands, tested snippets

### chainsig.js 1.1.16 surface (from `node/index.d.ts` and `src/` at 17aec4f)
```ts
import { chainAdapters, contracts, utils, constants } from 'chainsig.js'
// constants: CONTRACT_ADDRESSES {TESTNET:'v1.signer-prod.testnet', MAINNET:'v1.signer'}, ROOT_PUBLIC_KEYS, ENVS
// utils.cryptography: toRSV, compressPubKey, deriveChildPublicKey, deriveChildPublicKeyEd25519, najToUncompressedPubKeySEC1, uint8ArrayToHex
// contracts.utils.transaction.responseToMpcSignature

new contracts.ChainSignatureContract({ networkId: 'testnet' | 'mainnet', contractId?: string, fallbackRpcUrls?: string[] })
  .getDerivedPublicKey({ path, predecessor, IsEd25519?: boolean }): Promise<`04${string}` | `ed25519:${string}`>
      // local fast path iff contractId === 'v1.signer-prod.testnet' | 'v1.signer'; else RPC view derived_public_key
  .getPublicKey(): Promise<`04${string}`>                 // RPC view public_key (domain 0)
  .getCurrentSignatureDeposit(): number                   // 1 (yocto)
  .sign({ payloads, path, keyType: 'Ecdsa'|'Eddsa', signerAccount: { accountId, signAndSendTransactions } }): Promise<RSVSignature[]>
      // DO NOT USE in Satchel: sends one tx per payload straight to the MPC, 300 Tgas each, 1 yocto

new chainAdapters.evm.EVM({ publicClient /* viem PublicClient */, contract })
  .deriveAddressAndPublicKey(predecessor, path): Promise<{ address /* checksummed */, publicKey /* 04… */ }>
  .getBalance(address): Promise<{ balance: bigint, decimals: 18 }>
  .prepareTransactionForSigning({ from, to, value?, data?, gas?, nonce?, maxFeePerGas?, maxPriorityFeePerGas? })
      : Promise<{ transaction /* {…, nonce, chainId, type:'eip1559'} */, hashesToSign: [number[] /* 32 bytes */] }>
      // gas missing → eth_estimateGas (FAILS for an unfunded `from`); fees missing → estimateFeesPerGas (10 gwei fallback);
      // nonce missing → getTransactionCount(from) at 'latest' (pending txs NOT counted)
  .finalizeTransactionSigning({ transaction, rsvSignatures: [{ r, s, v }] }): `0x02${string}`   // r,s hex without 0x, v=27|28
  .broadcastTx(hex): Promise<{ hash }>      // swallows the error text; prefer publicClient.sendRawTransaction
  // also: prepareMessageForSigning, prepareTypedDataForSigning, prepareUserOpForSigning, prepareAuthorizationForSigning (EIP-7702!), *Legacy variants

new chainAdapters.btc.Bitcoin({ network: 'mainnet'|'testnet'|'regtest', contract, btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })
  .deriveAddressAndPublicKey(predecessor, path): Promise<{ address /* tb1q… */, publicKey /* compressed hex */ }>
  .prepareTransactionForSigning({ publicKey, from, to, value } | { publicKey, inputs, outputs })
      : Promise<{ transaction: { psbt, publicKey }, hashesToSign: number[][] /* ONE PER INPUT */ }>
  .finalizeTransactionSigning({ transaction, rsvSignatures: RSVSignature[] /* same order as inputs */ }): string /* raw tx hex */
  // owned by `btc` (kb/30); 'testnet' network params give tb1q… addresses valid on testnet4

new chainAdapters.solana.Solana({ solanaConnection /* @solana/web3.js v1 Connection */, contract })
  .deriveAddressAndPublicKey(predecessor, path): Promise<{ address, publicKey }>   // IsEd25519 internally (domain 1)
  .prepareTransactionForSigning({ from, to, amount: bigint|BN, instructions?, feePayer? })
      : Promise<{ transaction: { transaction /* legacy Transaction */, feePayer, recentBlockhash }, hashesToSign: [number[] /* FULL message bytes */] }>
      // does NOT return lastValidBlockHeight
  .finalizeTransactionSigning({ transaction /* the inner Transaction */, rsvSignatures: { signature: number[] }, senderAddress }): string /* base64 */
      // tx.serialize() verifies the signature locally (throws if invalid)
  .broadcastTx(base64): Promise<{ hash }>   // sendRawTransaction with preflight; does not wait for confirmation
```

### MPC `sign` request / response [VERIFIED live + SOURCED `crates/near-mpc-crypto-types/src/{sign,primitives}.rs`]
```jsonc
// args of v1.signer-prod.testnet.sign (attach 1 yoctoNEAR, >= 15 Tgas)
{ "request": { "payload_v2": { "Ecdsa": "<32 bytes as 64 hex chars, no 0x>" }, "path": "satchel/1/evm", "domain_id": 0 } }
{ "request": { "payload_v2": { "Eddsa": "<message hex, 1..1232 bytes>" },      "path": "satchel/1/sol", "domain_id": 1 } }
// legacy fields `payload` ([u8;32], ECDSA only) and `key_version` (= domain_id) are still accepted; don't use them.
// response (= tx SuccessValue, JSON); SignatureResponse is #[serde(tag = "scheme")]
{ "scheme": "Secp256k1", "big_r": { "affine_point": "02|03 + 64 hex" }, "s": { "scalar": "64 hex" }, "recovery_id": 0 }
{ "scheme": "Ed25519", "signature": [ /* 64 numbers */ ] }
```
The ECDSA payload must be a valid scalar (< n); the contract panics "Ecdsa payload cannot be converted to Scalar" otherwise (keccak/sha256 outputs are fine). near/mpc PR #4385 also rejects all-zero hashes.

### Satchel contract-mode flow (who calls what)
```
UI (browser)                                   satchel.<team>.testnet              v1.signer-prod.testnet
1 derive address (offline, predecessor = satchel contract id, path satchel/N/chain)
2 build unsigned tx (chain RPC: nonce/fees | UTXOs | blockhash) -> payload(s)
3 wallet.signAndSendTransaction(sign_for{token_id, chain, payload})  ──► owner check ──► sign{request} (1 yocto) ─ yield ─┐
4 wait for FINAL outcome (5 s typical, up to ~200 blocks)            ◄── on_signed returns MPC JSON ◄──── resume ◄──────┘
5 parse status.SuccessValue -> signature -> attach to tx -> verify locally -> broadcast via chain RPC
```

### Tested snippet A — offline derivation module (no chainsig.js, no polyfills, works in browser + Node) [VERIFIED `bundle/entry-minimal.ts` in Chrome; `derive.ts` vs RPC]
```ts
// derive.ts (isomorphic). Deps: @noble/curves@2, @noble/hashes@2, @scure/base, viem
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha3_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { base58, bech32 } from '@scure/base'
import { publicKeyToAddress } from 'viem/accounts'

const ROOTS = {
  testnet: { secp: '4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3', ed: '6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2' },
  mainnet: { secp: '3tFRbMqmoa6AAALMrEFAYCEoHcqKxeW38YptwowBVBtXK1vo36HDbUWuR6EZmoK4JcH6HDkNMGGqP1ouV7VZUWya', ed: 'G9hwngxWNKdmqMCmU1Yt6LPhFpayJeKFxyAV1HqMNLtF' },
} as const
type Net = keyof typeof ROOTS
const tweak = (pred: string, path: string) =>
  sha3_256(new TextEncoder().encode(`near-mpc-recovery v0.1.0 epsilon derivation:${pred},${path}`))

function secpChild(net: Net, pred: string, path: string) {
  const root = secp256k1.Point.fromHex('04' + bytesToHex(base58.decode(ROOTS[net].secp)))
  return root.add(secp256k1.Point.BASE.multiply(BigInt('0x' + bytesToHex(tweak(pred, path)))))
}
export const evmAddress = (net: Net, pred: string, path: string) =>
  publicKeyToAddress(`0x${bytesToHex(secpChild(net, pred, path).toBytes(false))}`)
export const btcP2wpkhAddress = (net: Net, pred: string, path: string, hrp = net === 'mainnet' ? 'bc' : 'tb') =>
  bech32.encode(hrp, [0, ...bech32.toWords(ripemd160(sha256(secpChild(net, pred, path).toBytes(true))))])
export const btcCompressedPubkeyHex = (net: Net, pred: string, path: string) => bytesToHex(secpChild(net, pred, path).toBytes(true))
export function solAddress(net: Net, pred: string, path: string) {
  const t = tweak(pred, path); let le = 0n
  for (let i = t.length - 1; i >= 0; i--) le = (le << 8n) + BigInt(t[i])          // little-endian
  const p = ed25519.Point.fromBytes(base58.decode(ROOTS[net].ed)).add(ed25519.Point.BASE.multiply(le % ed25519.Point.Fn.ORDER))
  return base58.encode(p.toBytes())
}
// evmAddress('testnet','satchel.example.testnet','satchel/1/evm') === '0x53f9e93e9cb431122872c3Ee96848e97BFf51C2A'
// btcP2wpkhAddress('testnet','satchel.example.testnet','satchel/1/btc') === 'tb1qaanveslhw9mdcke8a3l0aqv5t9glfapwjfy8sd'
// solAddress('testnet','satchel.example.testnet','satchel/1/sol') === 'DvZuiQhGH32dTN5v8zRZRJJ4e5H4okwq6NjpfvoYbqGB'
```
Keep a CI test against the live `derived_public_key` view (one call per chain) so any root-key or domain change on the MPC side surfaces. chainsig's `constants.ts` says the root keys "should never change for a given deployment". MPC resharing changes participants, not the public key, and a new domain (`vote_add_domains`) gets a new id while leaving domains 0 and 1 alone. [SOURCED chainsig `src/constants.ts`; ASSUMED for reshare semantics]

### Tested snippet B — outcome → per-chain signature [VERIFIED `convert.ts` against real outcomes `Dcc3gk…` and `6Xnb1P…`]
```ts
import { hexToBytes } from '@noble/hashes/utils.js'
type MpcSecp256k1 = { scheme?: 'Secp256k1'; big_r: { affine_point: string }; s: { scalar: string }; recovery_id: number }
type MpcEd25519 = { scheme: 'Ed25519'; signature: number[] }
type MpcResponse = MpcSecp256k1 | MpcEd25519

/** FinalExecutionOutcome → the value returned by the last receipt (Satchel's on_signed). null = Option::None */
export function lastResult(outcome: { status: any }): MpcResponse | null {
  const st = outcome.status
  if (!st || st.Failure) throw new Error('tx failed: ' + JSON.stringify(st?.Failure))
  if (typeof st.SuccessValue !== 'string' || st.SuccessValue === '') return null
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(st.SuccessValue), (c) => c.charCodeAt(0))))
}
function asSecp(m: MpcResponse): MpcSecp256k1 {
  if (!('big_r' in m)) throw new Error('expected Secp256k1')
  if (m.recovery_id !== 0 && m.recovery_id !== 1) throw new Error('recovery_id ' + m.recovery_id)
  return m
}
/** EVM / viem: yParity = recovery_id (NOT big_r's 02/03 prefix) */
export const toViemSignature = (m: MpcResponse) => {
  const x = asSecp(m)
  return { r: `0x${x.big_r.affine_point.slice(2)}` as const, s: `0x${x.s.scalar}` as const, yParity: x.recovery_id as 0 | 1 }
}
/** chainsig.js finalize* input: same thing as utils.cryptography.toRSV(m) → { r, s, v: 27|28 } */
/** Bitcoin: 64-byte compact r||s; bitcoinjs-lib Psbt signer returns this; bitcoinjs DER-encodes + adds sighash byte */
export const toBitcoinCompact64 = (m: MpcResponse) => hexToBytes(asSecp(m).big_r.affine_point.slice(2) + asSecp(m).s.scalar)
/** Solana: 64 bytes to pass to tx.addSignature(pubkey, sig) or chainsig finalize({ rsvSignatures: m, … }) */
export const toSolanaSignature = (m: MpcResponse) => {
  if (!('signature' in m) || m.signature.length !== 64) throw new Error('expected Ed25519'); return Uint8Array.from(m.signature)
}
```
Feed `lastResult()` the outcome from a `tx`/`EXPERIMENTAL_tx_status` poll by hash, **not** the wallet's resolved value, which can be partial (kb/40). Always verify before broadcasting: EVM `recoverTransactionAddress(signed) === derived`; SOL `ed25519.verify(sig, message, pubkey)` (chainsig's Solana finalize already throws on a bad signature); BTC: bitcoinjs `psbt.validateSignaturesOfAllInputs(validator)` (see kb/30).

### Tested snippet C — chainsig.js in contract mode (EVM shown) [VERIFIED `evm_sign.ts`; the MPC call there is direct, the Satchel version swaps step 3]
```ts
import { recoverTransactionAddress, bytesToHex } from 'viem'                    // + lastResult() from snippet B
const { chainAdapters, contracts, utils } = await import('chainsig.js')           // lazy: keeps 7.5 MB off first load
const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' })
const evm = new chainAdapters.evm.EVM({ publicClient, contract })                 // publicClient: viem, fallback transport (kb/31)
const SATCHEL = 'satchel.<team>.testnet'
const { address } = await evm.deriveAddressAndPublicKey(SATCHEL, `satchel/${tokenId}/evm`)   // offline
const nonce = await publicClient.getTransactionCount({ address, blockTag: 'pending' })
const { transaction, hashesToSign } = await evm.prepareTransactionForSigning({ from: address, to, value, gas: 21000n, nonce })
const payloadHex = bytesToHex(Uint8Array.from(hashesToSign[0])).slice(2)         // 64 hex chars, NO 0x (MPC uses hex::decode)
// 3) Satchel: wallet.signAndSendTransaction({ receiverId: SATCHEL, actions: [functionCall('sign_for',
//      { token_id: tokenId, chain: 'Evm', payload_hex: payloadHex }, <gas per kb/10>, <deposit per kb/20>)] })
//    and wait for the FINAL outcome (kb/40 owns long-running tx handling)
const resp = lastResult(outcome)!
const signed = evm.finalizeTransactionSigning({ transaction, rsvSignatures: [utils.cryptography.toRSV(resp as any)] })
if ((await recoverTransactionAddress({ serializedTransaction: signed })) !== address) throw new Error('bad signature')
const hash = await publicClient.sendRawTransaction({ serializedTransaction: signed })  // not evm.broadcastTx
```
The same flow without chainsig.js, using viem only, produced byte-identical hashes and signed tx (`evm_viem_only.ts`). Recipe in kb/31.

### Commands used
```bash
npm view chainsig.js --json                      # versions/time/deps
./rpc_view.sh https://rpc.testnet.fastnear.com v1.signer-prod.testnet public_key '{"domain_id":1}'
./rpc_view.sh https://rpc.testnet.fastnear.com v1.signer-prod.testnet derived_public_key \
  '{"path":"satchel/1/evm","predecessor":"satchel.example.testnet","domain_id":0}'
near contract call-function as-read-only v1.signer-prod.testnet derived_public_key \
  json-args '{"path":"satchel/1/sol","predecessor":"satchel.example.testnet","domain_id":1}' network-config testnet now
npx tsx derive.ts ; npx tsx convert.ts ; npx esbuild bundle/entry-chainsig.ts --bundle --platform=browser --format=esm --minify --outfile=/tmp/x.js
```

## Gotchas & failure modes
0. **Never use chainsig.js ≤ 1.1.14.** [VERIFIED, installed 1.1.14 in a scratch dir] Its ESM build fails in Node 22 (`ERR_MODULE_NOT_FOUND …cosmjs-types/cosmos/tx/signing/v1beta1/signing`). Via CJS, EVM derivation is correct (it always did an RPC view), but **Solana derivation throws `Non-base58 character`**: the ed25519 key was mangled into `04…` hex. Its `utils.cryptography.deriveChildPublicKey(root, predecessor, path, chainId)` implements the **Sig Network** KDF (`"sig.network v1.0.0 epsilon derivation,<chain>,<predecessor>,<path>"`), which does *not* match NEAR's MPC. Old tutorials and lockfiles (near-multichain pins `^1.1.8`) can land you there. Pin `1.1.16`.
1. **yParity from big_r prefix is wrong about 50% of the time.** Use `recovery_id`. [VERIFIED 3 of 4 mismatches]
2. **`ChainSignatureContract.sign()` targets the MPC contract**: receiverId is hard-coded to `contractId`, the method is `sign`, gas 300 Tgas, one tx per payload. It can't route through `sign_for`. Bypass it: call `sign_for` with the wallet yourself, then use `utils.cryptography.toRSV` (ECDSA) or pass the raw Ed25519 response (it has `.signature`). [SOURCED `src/contracts/ChainSignatureContract.ts`]
3. **Local derivation only for exact ids** `v1.signer-prod.testnet` / `v1.signer`. Any other `contractId` (typo, whitespace is trimmed) silently falls back to an RPC view **on that contract**. Don't point `ChainSignatureContract` at the Satchel contract.
4. **README is stale**: its constructor takes `accountId, keypair` and `sign({payload, path, key_version})`. Real API: see Reference. The `examples/` folder is current.
5. **Buffer/crypto**: works in Next.js out of the box; Vite/esbuild need `vite-plugin-node-polyfills` or a `buffer` inject plus a `crypto` alias (only XRP uses it). The punycode `DeprecationWarning` in Node comes from a transitive dep and is harmless.
6. **Bundle size**: 2 MB gzip. Lazy-import it in Send only, or don't use it on the client.
7. **Mixed majors**: the app's `@solana/web3.js@latest` (3.x) or `bitcoinjs-lib@7` would be a different copy from chainsig's internal 1.x/6.x. Objects passed across (Transaction, Psbt, PublicKey) can fail `instanceof` checks. Pin `@solana/web3.js@1.99.0` and `bitcoinjs-lib@6.1.9` if you use the adapters.
8. **EVM prepare**: if `gas` is omitted it calls `eth_estimateGas`, which fails for an empty sender (pass `gas: 21000n` for native sends). The nonce uses `latest` (pass `nonce` from `blockTag:'pending'`). The fee fallback is a hard-coded 10 gwei when the node returns none.
9. **`evm.broadcastTx` hides errors**: it logs to console and throws `Failed to broadcast transaction.` [VERIFIED]
10. **Solana prepare** returns no `lastValidBlockHeight`, and the blockhash lasts only about 36 s today (kb/32). Fetch it as late as possible.
11. **Payload hex must have no `0x`**: the MPC deserializes `payload_v2` with `hex::decode(&hex_str)` (`crates/near-mpc-bounded-collections/src/bounded_vec.rs`), which rejects a `0x` prefix. viem's `bytesToHex`/`keccak256` return `0x…`, so `.slice(2)`. [SOURCED]
12. The **EdDSA domain signs arbitrary bytes** (verified with a 59-byte non-Solana string), and the ECDSA domain signs any 32-byte hash. The library adds no policy; anything Satchel wants enforced (chain id, no durable nonce, amount caps) has to happen in the contract (kb/31, kb/32, kb/70).

## Recommendations for Satchel
- **P0** Write one isomorphic `derive.ts` (snippet A) for UI cards, the Wallet tab, the indexer and tests. Hard-code the testnet and mainnet root keys, add a CI test against the live view, and use the `satchel.example.testnet` vectors above as fixtures.
- **P0** Contract returns the **MPC JSON unchanged** from `on_signed` (e.g. `Option<SignatureResponse>` with the same serde shape: `#[serde(tag="scheme")]`, `big_r.affine_point`, `s.scalar`, `recovery_id`). Then the client uses snippet B.
- **P0** One client module `chains/<chain>.ts` with `prepare()`, `attach()` and `broadcast()`. EVM uses viem directly (kb/31 recipe). If chainsig.js is used, load it via `await import('chainsig.js')` and pin `chainsig.js@1.1.16`, `@solana/web3.js@1.99.0`, `bitcoinjs-lib@6.1.9`, `viem@2.57.x`.
- **P0** Verify every signature locally (recover / verify) before broadcast, and surface the node's raw error.
- **P0** **Persist the pending unsigned tx before opening the wallet** (sessionStorage/IndexedDB, keyed by token id + client request id, later + NEAR tx hash). The 5–120 s wait can span a reload or a redirect-style wallet. Round-trips verified offline (`persist_roundtrip.ts`):
  - EVM: `evm.serializeTransaction(tx)` gives the 98-char unsigned hex (the same bytes as the structured payload in kb/31); after `deserializeTransaction` + finalize with the real MPC response, the signed tx is identical.
  - SOL: `sol.serializeTransaction(...)` gives 288-char base64, and the message is identical after restore.
  - BTC: PSBT-hex JSON.
  After a reload, fetch the NEAR outcome by tx hash (`tx` RPC, `wait_until: FINAL`), then finalize and broadcast. For Solana, check the blockhash first (kb/32).
- **P1** Prefer building BTC and SOL txs with bitcoinjs-lib / @solana/web3.js directly (the adapters are thin) so the client never loads cosmjs/aptos/sui/xrpl. Or run chainsig.js only in Next.js route handlers.
- **P1** For multi-input BTC, batch N `sign_for` txs in one wallet approval (`signAndSendTransactions`), or let the contract accept N payloads (mpc/sdk decision).
- **P2** If a mainnet build ever ships, switch roots by network (`ROOTS.mainnet`) and the hrp to `bc`.

## Deltas vs plan (near_hackathon.md)
| plan location | plan says | finding | recommended change |
|---|---|---|---|
| L22 Key Findings | chainsig.js supports EVM, BTC (P2WPKH), Solana, Cosmos, Aptos, SUI; one MPC call per UTXO | ✔ confirmed; also XRP. One hash per PSBT **input** [SOURCED `Bitcoin.ts`] | none |
| L60 Versions | "pin chainsig.js, viem 2.x, bitcoinjs-lib, @solana/web3.js" | `@solana/web3.js@latest` is now 3.1.1 (kit compat) and bitcoinjs-lib latest is 7.0.4, while chainsig needs 1.x/6.x. near-api-js is 7.3.1, but chainsig uses @near-js 2.5.1 | Pin `chainsig.js@1.1.16`, `@solana/web3.js@1.99.0`, `bitcoinjs-lib@6.1.9`, `viem@2.57.x` |
| B3 S-2 | addresses match chainsig `deriveAddressAndPublicKey` across reloads and devices | ✔ deterministic and offline; three implementations agree | Use our own `derive.ts` (same output, 29 KB) in UI and indexer |
| B5 diagram | browser does derive/prepare/finalize/broadcast with chainsig.js | works in Next 16 with zero config, but adds 2 MB gzip and `crypto`/`Buffer` polyfills | Lazy-import chainsig or use viem/bitcoinjs/web3.js directly; offline derivation module |
| B5 "Sign call" | `payload_v2: Ecdsa(hex) \| Eddsa(hex)`, `path`, `domain_id` | ✔ exact JSON `{"request":{payload_v2,path,domain_id}}`. **Eddsa = the full message (≤ 1232 B), not a hash.** `sign` needs ≥ 15 Tgas attached (config) | Note in the contract wrapper; domain 3 exists but is ForeignTx |
| B5 `on_signed -> Option<SignatureResponse>` | — | the client must map yParity from `recovery_id` | Return the MPC JSON shape unchanged; client snippet B |
| B6 Day 2 "Derive addresses" | — | done offline in about 1 ms per token; no RPC needed | Can be pulled to Day 1 |
| B5 Costs "≈ 0.005 NEAR per sign" | estimate | a direct MPC sign burns 8.3–8.7 Tgas ≈ 0.00085 NEAR; Satchel's wrapper adds its own gas (kb/10) | Lower estimate, pending mpc numbers |

## Open questions / human actions
- **Human:** fund `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` (Sepolia) and `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA` (Solana devnet) so `evm_sign.ts` / `sol_sign.ts` can complete real transfers (exact steps in kb/31 and kb/32).
- **Decision (web + chains, Nov 1):** client-side chainsig.js (lazy) vs. thin per-chain modules vs. server-side prepare/finalize. My recommendation: thin per-chain modules plus our own `derive.ts`.
- **Decision (sec + mpc + sdk):** should `sign_for` take *structured* payloads (full EVM unsigned tx, full Solana message) instead of opaque 32-byte hashes? That is the only way to enforce chain ids, delegate caps and the clean-history log. See kb/31 §Security and kb/32 §Durable nonces.
- **Answered by `web` (kb/40 §A, cross-read 2026-10-21):** at least one near-connect wallet resolved `signAndSendTransaction` with a **partial** outcome (`INCLUDED_FINAL`, no `SuccessValue`). So never feed the wallet's resolved value straight into `lastResult()` (snippet B). Poll `tx` by hash until `SuccessValue`/`Failure` (kb/40 `track-tx.mjs`), then convert. `near-connect-hooks`' `callFunction` (`getTransactionLastResult`) is unsafe here for the same reason.
