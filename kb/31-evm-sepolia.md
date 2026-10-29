# EVM on Sepolia (send ETH from a Satchel)
> Owner: chains · Checked: 2026-10-21 · Confidence: high for signing/RPC/APIs (verified live); a funded end-to-end transfer is still pending a human faucet step
> Primary sources: live Sepolia RPCs (probe in `research/spikes/chains/RESULTS.md` §4); viem 2.57.7; go-ethereum [`core/txpool/legacypool/legacypool.go@5f62e55`](https://github.com/ethereum/go-ethereum/blob/5f62e55c950ce2f932821e0b14c504e234f3d236/core/txpool/legacypool/legacypool.go); [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) (Final); `https://api.etherscan.io/v2/chainlist`; Blockscout `eth-sepolia.blockscout.com/api/v2`; [Sepolia sunset thread (parithosh, 2026-05-27)](https://ethereum-magicians.org/t/sepolia-testnet-replacement-sunsetting/28647); [dallaspu/sepolia-faucets-2026 (2026-09-24)](https://github.com/dallaspu/sepolia-faucets-2026).

## TL;DR — what an implementer must know
- **The MPC signing path works end to end.** A chainsig.js-prepared EIP-1559 tx from the derived address `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` (predecessor `satchel-spk-chain-e9ea1a.testnet`, path `satchel/1/evm`) got a real MPC signature (NEAR tx `Dcc3gktAJ96hPDQ3Lp3FxfnYo4zXtujqt2SGWYUFuWWa`, 4.6 s) and recovers locally to the derived address. The node answered `insufficient funds for gas * price + value: have 0 want 100004200588000`, so the signature is valid and only funding is missing. [VERIFIED]
- **yParity = `recovery_id`** (0/1), `r = big_r.affine_point[2..]`, `s = s.scalar`. MPC signatures are always low-S. 4/4 live samples recovered; the big_r prefix parity was wrong in 3 of 4. [VERIFIED]
- **Sepolia is cheap and alive.** Base fee **16 wei**, 12.00 s blocks; a 21000-gas transfer costs at most ~4.2e9 wei (0.0000000042 ETH) at viem's suggested fees. Sepolia stays up through Nov 2026 (sunset proposed for Q2/Q3 2027). [VERIFIED / SOURCED]
- **RPC:** use viem `fallback([publicnode, drpc, ethpandaops, 0xrpc])`. All four allow CORS from an https origin and passed 100-request bursts. **Don't rely on viem's default Sepolia URL** (`11155111.rpc.thirdweb.com`: 66% of a burst returned 429), tenderly public (54% 429), or 1rpc (no `eth_maxPriorityFeePerGas`, 429s). [VERIFIED]
- **No programmatic faucet exists.** pk910 PoW needs a captcha to start, Google Cloud needs a Google login, Alchemy needs a mainnet balance. A human must fund once; at these fees 0.05 ETH covers the whole hackathon. [VERIFIED / SOURCED]
- **Address history:** Blockscout API v2 is keyless with CORS `*` (`x-ratelimit-limit: 180`). Etherscan API v2 needs a free key (`chainid=11155111`, Sepolia is "Free-tier available"; 3 req/s, 100k/day), so keep it server-side. The old `api-sepolia.etherscan.io` v1 is deprecated. [VERIFIED]
- **Nonces:** prepare with `getTransactionCount({blockTag:'pending'})` (chainsig defaults to `latest`). Replacement needs +10% on both fee caps (geth `PriceBump: 10`). Future-nonce txs queue (64 per account, dropped after 3 h). [VERIFIED / SOURCED]
- **⚠ Security (for sec/mpc/sdk):** with opaque 32-byte payloads the contract can't tell what it signs. That can be an **EIP-7702 authorization with `chain_id = 0`** (a takeover valid on every EVM chain, submittable by any sponsor), a permit, or a tx for another chain id. It also means the contract can't log the nonce that clean history needs, or enforce delegate caps. **Recommend `sign_for` take the unsigned EIP-1559 bytes, then keccak + parse them on-chain** (layout below). [SOURCED EIP-7702 + reasoning; ASSUMED severity until sec reviews]

## Verified facts & measurements

### Chain facts [VERIFIED 2026-10-21 via publicnode]
| item | value |
|---|---|
| chainId | 11155111 (`0xaa36a7`) |
| latest block at check | 11,962,164 @ 2026-10-21T11:37:24Z, `baseFeePerGas` = 16 wei |
| block time | 12.00 s (100-block average) |
| viem `estimateFeesPerGas()` | maxFeePerGas 200,028 wei; maxPriorityFeePerGas 200,008 wei (= baseFee×1.2 + priority) |
| 21000-gas transfer max fee | 4,200,588,000 wei ≈ 4.2 gwei-worth ≈ 0.0000000042 ETH |
| lifetime | proposal: successor reaches latest fork Q1 2027, "sunset it fully in Q2/Q3 2027" [SOURCED Magicians thread, 2026-05-27] |
| Pectra/EIP-7702 | **live**: 10 type-4 txs in the last 60 blocks, e.g. `0xc90d64acf3adc82c89f2da164311147761ba653950023d5cfca475910a84d5e0` (block 11,962,318) [VERIFIED]. Tx type mix in those blocks: 0x2 7274, 0x0 1039, 0x3 656, 0x4 10 |
| RPC quirk | publicnode returns **HTTP 403 to Python's default `urllib` User-Agent**; browsers, Node fetch and curl are fine [VERIFIED] |

### Real MPC-signed tx (the evidence) [VERIFIED `evm_sign.ts`, `out_evm_sign_1.txt`]
- Unsigned: `{type:'eip1559', chainId:11155111, nonce:0, to:0x61739f33…28BE, value:1e14, gas:21000, maxFeePerGas:200028, maxPriorityFeePerGas:200008}`
- Unsigned bytes (48 B): `0x02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0`
- Payload = `keccak256(unsigned)` = `0xbc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377` (chainsig's `hashesToSign[0]` matches an independent viem computation).
- MPC response: `{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9…0f0c"},"s":{"scalar":"549e7285…87e1"},"recovery_id":1}`
- Signed: `0x02f87183aa36a7…c001a0f6ef…0f0ca0549e…87e1`; `recoverTransactionAddress` = `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` ✔
- `eth_sendRawTransaction` (publicnode): code −32003 `insufficient funds for gas * price + value: have 0 want 100004200588000`.
- 3 more samples (`61E1Kx…`, `DXpWLS…`, `5h6ui9…`): same result. MPC latency 4.5–5.6 s; 8.3–8.4 Tgas burnt with 50 Tgas attached.
- viem-only rebuild (no chainsig.js) gives a byte-identical signed tx [VERIFIED `evm_viem_only.ts`].

### Low-S and recovery id [VERIFIED live; SOURCED near/mpc@13f42bf]
- The MPC flips s to low-S: `s.conditional_assign(&(-s), s.is_high())` in `crates/threshold-signatures/src/ecdsa/{robust_ecdsa,ot_based_ecdsa}/sign.rs`. Its own verifier rejects high-S (`if self.s.is_high().into() { return false; }`).
- `recovery_id` comes from `RecoveryId::trial_recovery_from_prehash` on the final (r, low-s) (`crates/node/src/indexer/types.rs`), so it always matches the published signature. `big_r` keeps the presignature's R prefix, which is the wrong parity whenever s was negated.
- Mapping: EIP-1559/2930/7702 `yParity = recovery_id`; legacy pre-155 `v = 27 + recovery_id`; EIP-155 legacy `v = chainId·2 + 35 + recovery_id`. `recovery_id ∈ {2,3}` (x ≥ n) has probability ~2⁻¹²⁷; reject it.

### RPC endpoints [VERIFIED `rpc_probe.sh`, `rpc_methods.mjs`, 2026-10-21 from one macOS host]
| endpoint | latency | CORS | 100-req burst (10×10) | notes |
|---|---|---|---|---|
| `https://ethereum-sepolia-rpc.publicnode.com` | 62 ms | `*` | 100/100 | all methods ok; **primary** |
| `https://sepolia.drpc.org` | 79 ms | origin echo | 100/100 | all ok (the near-multichain example uses it) |
| `https://rpc.sepolia.ethpandaops.io` | 99 ms | origin echo | 100/100 | all ok (EF devops) |
| `https://0xrpc.io/sep` | 137 ms | `*` | 100/100 (slower, 2.3 s) | all ok |
| `https://gateway.tenderly.co/public/sepolia` | 102 ms | `*` | 46/100 (429) | ok as last resort |
| `https://1rpc.io/sepolia` | 167 ms | `*` | 100/100 | `eth_maxPriorityFeePerGas` gives no result; `getTransactionCount` hit 429 "Nodies public endpoints" |
| `https://11155111.rpc.thirdweb.com` (viem default) | 231 ms | `*` | 34/100 (429) | avoid as primary |
| `https://api.zan.top/eth-sepolia` | 328 ms | origin echo | — | ok |
| onfinality public | — | `*` | 5/20 (429) | avoid |
| rpc.sepolia.org / rpc2.sepolia.org (timeout), omniatech (521), blastapi ("no longer available"), ankr (key), alchemy demo (429), subquery / grove (no answer) | | | | dead or keyed |

Documented free-tier rate limits for publicnode/drpc were not checked [ASSUMED "fair use"]. Our observed headroom is ≥ 100 req/s bursts. The `pay` agent (kb/50) owns polling and indexer budgets.

### Explorers and history APIs [VERIFIED curl 2026-10-21]
| | URL pattern | key | CORS | notes |
|---|---|---|---|---|
| Etherscan UI | `https://sepolia.etherscan.io/tx/{hash}`, `/address/{addr}` | — | — | link target for users |
| Blockscout UI | `https://eth-sepolia.blockscout.com/tx/{hash}`, `/address/{addr}` | — | — | |
| Otterscan UI | `https://sepolia.otterscan.io/tx/{hash}` | — | — | listed in eth-clients/sepolia README |
| Blockscout API v2 | `GET https://eth-sepolia.blockscout.com/api/v2/addresses/{addr}/transactions` | **none** | `*` | 50 items/page + `next_page_params`; fields `hash, nonce, status ("ok"), result ("success"), block_number, timestamp, value, fee.value, from.hash, to.hash`; headers `x-ratelimit-limit: 180`, `x-ratelimit-reset: <ms>` |
| Blockscout Etherscan-compatible | `GET https://eth-sepolia.blockscout.com/api?module=account&action=txlist&address=…&page=1&offset=…&sort=desc` | none | — | same shape as Etherscan v1 |
| Etherscan API v2 | `GET https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=…&apikey=KEY` | **required** | — | no key → `{"status":"0","message":"NOTOK","result":"Missing/Invalid API Key"}`; free tier "3 calls/second, up to 100,000 calls/day" on "selected chains"; `/v2/chainlist` lists Sepolia as "Free-tier available" |
| Etherscan v1 (`api-sepolia.etherscan.io/api`) | — | — | — | "You are using a deprecated V1 endpoint, switch to Etherscan API V2" |

### Faucets (2026-10-21) [VERIFIED where marked, else SOURCED from the 2026-09-24 survey]
| faucet | needs | gives | programmatic? |
|---|---|---|---|
| `https://sepolia-faucet.pk910.de/` (PoW) | **captcha to start** (`captcha.requiredForStart: true` [VERIFIED `/api/getFaucetConfig`]), then browser mining (cryptonight, difficulty 12), about 20 min to the minimum | 0.05–2.5 ETH per session | no (captcha) |
| Google Cloud Web3 faucet `cloud.google.com/application/web3/faucet/ethereum/sepolia` | Google account | small daily amount | no |
| QuickNode `faucet.quicknode.com/ethereum/sepolia` | wallet connect, every 12 h; survey says no mainnet balance needed | unpublished | no |
| Alchemy `alchemy.com/faucets/ethereum-sepolia` | ≥ 0.001 mainnet ETH + account | 0.1 ETH/24 h | no |
| Chainlink `faucets.chain.link/sepolia` | ≥ 1 LINK on mainnet for ETH | 0.5 ETH | no |
| GetBlock | signup + ≥ 0.005 mainnet ETH | 0.1 ETH/day | no |
| paid (drip.tools, gas.zip, …) | money | — | don't (rules: no real money) |

## Reference — exact APIs, types, commands, tested snippets

### viem client (browser + server) [VERIFIED `evm_fallback_check.ts`, `evm_fallback_tune.ts` against live endpoints]
```ts
import { createPublicClient, fallback, http } from 'viem'
import { sepolia } from 'viem/chains'
export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http('https://ethereum-sepolia-rpc.publicnode.com', { timeout: 4_000 }),
    http('https://sepolia.drpc.org', { timeout: 4_000 }),
    http('https://rpc.sepolia.ethpandaops.io', { timeout: 4_000 }),
    http('https://0xrpc.io/sep', { timeout: 4_000 }),
  ], { rank: { interval: 30_000, sampleCount: 5, timeout: 2_000 }, retryCount: 1 }),
})
```
Measured failover with a dead first transport (`rpc.sepolia.org`, which times out):
- `rank: false`: **every** call pays the full per-transport timeout (10 s timeout → 20 s for a `Promise.all` of 4 reads; 4 s timeout → about 4.1 s per call).
- `rank: {interval: 5 s}`: the first call paid 4.1 s; 12 s later viem had demoted the dead transport and calls took **44 ms**.

So keep timeouts short (≈ 4 s) and enable `rank`. Its background cost is one `eth_blockNumber` per transport per interval. The healthy config returned chainId 11155111, the pending nonce and fees in 194 ms.
viem's `fallback` does **not** fall through on deterministic RPC errors (`TransactionRejectedRpcError` −32003 "insufficient funds" was thrown straight from the first transport). It does fall through on timeouts and 5xx/429, so the same raw tx can reach two nodes. Treat "already known" / "nonce too low" after a timeout as "maybe sent": compute the hash locally (`keccak256(signedTx)`) and poll for it.

### Send ETH from a Satchel, viem only (no chainsig.js) [VERIFIED pieces: hash/sign/recover byte-identical to chainsig; broadcast reached the node]
```ts
import { keccak256, serializeTransaction, recoverTransactionAddress, parseEther, type TransactionSerializableEIP1559 } from 'viem'
// address = evmAddress('testnet', SATCHEL_CONTRACT_ID, `satchel/${id}/evm`)   (kb/11 snippet A)
const [nonce, fees, balance] = await Promise.all([
  sepoliaClient.getTransactionCount({ address, blockTag: 'pending' }),
  sepoliaClient.estimateFeesPerGas(),            // EIP-1559: { maxFeePerGas, maxPriorityFeePerGas }
  sepoliaClient.getBalance({ address }),
])
const gas = 21000n                               // native transfer to an EOA; estimateGas FAILS for an empty sender
const value = parseEther(amountStr)              // "Max": balance - gas * fees.maxFeePerGas
if (value + gas * fees.maxFeePerGas > balance) throw new Error('insufficient')
const unsigned: TransactionSerializableEIP1559 = { type: 'eip1559', chainId: 11155111, nonce, to, value, gas,
  maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas }
const unsignedHex = serializeTransaction(unsigned)        // 0x02 || rlp([...9 fields])
const payloadHex = keccak256(unsignedHex).slice(2)          // MPC wants bare hex (no 0x)
// → sign_for(token_id, 'Evm', payloadHex)  — or, recommended below, pass unsignedHex and let the contract hash it
// ← resp = lastResult(finalOutcome)  (kb/11 snippet B)
const sig = { r: `0x${resp.big_r.affine_point.slice(2)}`, s: `0x${resp.s.scalar}`, yParity: resp.recovery_id } as const
const signed = serializeTransaction(unsigned, sig)
if ((await recoverTransactionAddress({ serializedTransaction: signed })).toLowerCase() !== address.toLowerCase()) throw new Error('signature does not recover')
const txHash = keccak256(signed)                              // known before broadcast → store it, poll it
try { await sepoliaClient.sendRawTransaction({ serializedTransaction: signed }) }
catch (e: any) { /* e.details e.g. "insufficient funds for gas * price + value: have 0 want …", "nonce too low", "already known" */ throw e }
const receipt = await sepoliaClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 120_000 })
```

### Unsigned EIP-1559 byte layout (for a contract that hashes + parses) [VERIFIED `evm_rlp_layout.ts`]
`unsigned = 0x02 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, to, value, data, access_list])`, and `payload = keccak256(unsigned)`.
Sample (48 bytes) `02 ee | 83 aa36a7 | 80 | 83 030d48 | 83 030d5c | 82 5208 | 94 61739f33…28be | 86 5af3107a4000 | 80 | c0` gives keccak `0xbc65…c377`, the exact hash the MPC signed. RLP integers are minimal big-endian; `0x80` = empty (nonce 0, empty data); `c0` = empty access list.

### Fee display ("fee ~")
- Before send: `feeMax = gas × maxFeePerGas`, `feeLikely = gas × (baseFee_latest + maxPriorityFeePerGas)`. Today both are under 0.000001 ETH; show "fee < 0.000001 ETH" when it rounds to 0. Don't show 0.
- After mining: `receipt.gasUsed × receipt.effectiveGasPrice`.
- "Max" button: `balance − gas × maxFeePerGas`. That leaves dust (maxFee − actual) in the Satchel; say so, or accept it.

### Nonces, gaps, replacement, cancellation [SOURCED geth DefaultConfig: `PriceBump: 10`, `AccountSlots: 16`, `AccountQueue: 64`, `Lifetime: 3 * time.Hour`, `PriceLimit: 1`]
- **Gap:** a tx with nonce n+1 broadcast while n is unmined or unbroadcast sits in the queue (≤ 64 per account per node; evicted after about 3 h without activity). The UI should block a new send while a previous Satchel EVM tx is pending, or chain nonces from `pending`.
- **Replace (speed up):** same nonce, both `maxFeePerGas` and `maxPriorityFeePerGas` ≥ 110% of the old values, otherwise `replacement transaction underpriced`. That's a new MPC signature, so a new `sign_for`.
- **Cancel:** same nonce, 0-value tx to self, +10% fees. **This is also how a seller "cancels" a pre-signed-but-unbroadcast tx**: it consumes the nonce, after which the old signature can never be valid.
- A signed tx **never expires** on its own. It stays valid until its nonce is consumed (our four nonce-0 spike signatures for `0x532b…832d` are live examples).

### Commands
```bash
cd research/spikes/chains
npx tsx evm_sign.ts [to] [valueWei] [gasTgas]   # derive → prepare → REAL MPC sign → finalize → recover → broadcast
npx tsx evm_viem_only.ts                          # viem-only equivalence (reuses captured MPC response)
SCRATCH=$TMPDIR ./rpc_probe.sh && node rpc_methods.mjs
curl -s "https://eth-sepolia.blockscout.com/api/v2/addresses/0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d/transactions"
```

## Gotchas & failure modes
1. **viem's default `http()` for `sepolia`** points at thirdweb, which rate-limits (34/100). Always pass explicit transports.
2. **`eth_estimateGas` fails for an unfunded sender.** chainsig's prepare calls it unless `gas` is given. For native sends use `21000n`. Recipients that are contracts need estimation (and funds).
3. **Pending nonce:** chainsig uses `latest`, so two quick sends produce the same nonce and the second becomes an underpriced replacement. Pass `nonce` explicitly from `blockTag: 'pending'`.
4. **chainsig `broadcastTx` hides the node's message.** Use viem directly and show `e.details`.
5. **Same address on every EVM chain.** A Satchel's `0x…` exists on mainnet, Arbitrum, Base and the rest. The UI shows only Sepolia, but signatures aren't scoped to Sepolia unless the signed tx has chainId 11155111 (EIP-155/1559 txs do; raw hashes may be anything).
6. **Signed-but-unbroadcast txs are bearer instruments until the nonce moves.** A RESULTS file, a log line or a browser cache holding one is a liability once the address is funded.
7. **Fallback double-broadcast** after a timeout gives "already known" or "nonce too low"; check by hash before showing an error.
8. **Fees are tiny but nonzero.** A Satchel with 0 ETH can't send even "Max". The funding UI should say "fund with ≥ 0.001 Sepolia ETH".
9. Sepolia `baseFee` can spike during load tests. Keep `maxFeePerGas` from `estimateFeesPerGas` (×1.2 headroom), not a hard-coded value (chainsig's fallback is 10 gwei).

## Security notes for the contract (input to `sec` kb/70, `mpc` kb/10, `sdk` kb/20)
If `sign_for(token_id, chain: Evm, payload_hex)` signs **any** 32-byte value, the owner (or a delegate) can get signatures over:
- **EIP-7702 authorization** `keccak(0x05 || rlp([chain_id, address, nonce]))`. Per the EIP: "Verify the chain ID is 0 or the ID of the current chain", "Verify the nonce of `authority` is equal to `nonce`", and the tuple can be submitted inside anyone's type-4 tx. A seller could pre-sign `chain_id = 0` authorizations (valid on every chain) for the current and next few nonces, sell the NFT, and right after the sale delegate the Satchel EOA to drain code. chainsig.js even ships `prepareAuthorizationForSigning`. [SOURCED EIP-7702]
- **Off-chain signatures** (EIP-712 permits / Permit2 for ERC-20s the address may hold; `personal_sign` logins).
- **Txs for other chain ids** (the same address on mainnet or L2s).
- Such hashes are **unreadable to the clean-history check**. The buyer can only match a logged hash against mined txs and can't learn its nonce or chain, so it can't tell whether a stray signature is dead.
- Delegate caps (S-10) **can't be enforced** without knowing `value`.

**Recommendation (P0, decide by Nov 1 because the contract is locked):** `sign_for` for EVM takes the **unsigned EIP-1559 bytes** (≈ 48–120 B for native transfers). The contract:
1. requires `bytes[0] == 0x02`;
2. RLP-decodes the 9 fields;
3. requires `chain_id ∈ {11155111}`, `data` empty (native transfers only, or an allowlist later) and `access_list` empty;
4. records `nonce`, `to` and `value` in `sig_log` (and checks `value` against delegate caps);
5. computes `payload = env::keccak256(bytes)` and calls the MPC with `payload_v2.Ecdsa = hex(payload)`.

The buyer's clean-history check becomes deterministic: `getTransactionCount(addr, 'latest') > max(logged nonce)` means every past signature is dead. The client keeps `unsignedHex` and re-serializes it with the signature (snippet above). Cost: a small RLP decoder in the contract (e.g. the `alloy-rlp` or `rlp` crate, or ~60 lines by hand); near-sdk has `env::keccak256`. [ASSUMED feasible; sdk to confirm wasm size and gas]

## Recommendations for Satchel
- **P0** Use the `sepoliaClient` above (4-endpoint fallback). Avoid thirdweb, tenderly public and 1rpc as primaries.
- **P0** Send flow = the viem-only recipe (verify recovery before broadcast, store `txHash` before broadcast, poll the receipt). Show the node's error text.
- **P0** Contract takes structured EVM payloads (above). If the team keeps hash-only, sec must document the EIP-7702 / cross-chain risks as trust assumptions and the buyer UI must treat **any** unmatched logged hash as "unsafe".
- **P0 (human)** Fund a team Sepolia wallet once (≥ 0.5 ETH via pk910). Top up Satchel addresses from it during the demo (0.01–0.05 ETH per Satchel is plenty).
- **P1** History and activity: Blockscout API v2 from the browser or indexer (keyless). Use Etherscan v2 only server-side with a key, as a fallback (`pay` owns this, kb/50).
- **P1** Block concurrent EVM sends per Satchel while one is pending. Add "Speed up / Cancel" (same nonce, +10%) only if time allows.
- **P2** Show "fee < 0.000001 ETH" and the explorer link right after broadcast (the hash is known before the receipt).

## Deltas vs plan (near_hackathon.md)
| plan location | plan says | finding | recommended change |
|---|---|---|---|
| B2 Phase 0 | get Sepolia ETH from faucets | ✔ needed. No programmatic faucet; pk910 needs captcha + ~20 min mining; Google faucet needs login | Human task now; fund one team EOA and distribute |
| B3 S-3 | owner sign broadcasts a tx visible on Sepolia | signing → valid tx proven (node says insufficient funds); a funded broadcast is still pending | Re-run `evm_sign.ts` after funding |
| B5 clean history | "EVM nonce above every signed nonce" | **impossible to check if the contract only sees hashes** (the nonce isn't recoverable). Also EIP-7702 `chain_id=0` and cross-chain hashes | Contract takes unsigned EIP-1559 bytes and logs the nonce; restrict to type 2 and chainId 11155111 |
| B3 S-10 delegates with caps | "delegate over its daily cap fails" | unenforceable with opaque hashes | Same fix: contract parses `value` |
| B5 indexer "Sepolia RPC" | — | RPCs can't list address history; use Blockscout v2 (keyless) or Etherscan v2 (key) | Blockscout primary |
| B6 Day 3 go/no-go "Sepolia tx from a Satchel" | — | signing/recovery proven on Day −11; only funding left | Keep the gate, it's low risk now |
| B4 "fee ~0.00002" copy | example | Sepolia fees today are ~0.0000000042 ETH | Copy should handle "< 0.000001 ETH" |

## Open questions / human actions
- **Human (now):** open https://sepolia-faucet.pk910.de/, paste `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d` (spike) or the team wallet, solve the captcha, mine until ≥ 0.05 ETH, claim. Or use the Google Cloud faucet with a Google account. Then run `cd research/spikes/chains && npx tsx evm_sign.ts` to produce the first real Satchel-style transfer (prints the Etherscan link). Note: after funding, one of the four leaked nonce-0 signatures may be broadcast instead, which is fine (moves 0.0001 ETH to my other derived address) and is itself a clean-history demo.
- **Human (by Nov 1):** create an Etherscan account and API key if the indexer wants Etherscan as fallback (`pay` decides).
- **Decision (sec/mpc/sdk):** structured EVM payload vs hash-only (see Security notes).
- **Open:** confirm the pk910 PoW claim time and the Google faucet amount in 2026. The survey's numbers are secondary.
