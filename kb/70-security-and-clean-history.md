# Security model and the clean-history protocol

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: sec · Checked: 2026-10-21 · Confidence: **high** for payload, parsing and hashing facts (75 offline JS checks, plus 19 cross-language vectors run in two Rust variants) and for MPC facts (source at a pinned commit plus live RPC). **Medium** for the contract design, which is a design for Nov 1 and has not been built or gas-measured in a sandbox.
> Primary sources: near/mpc @ [`13f42bf`](https://github.com/near/mpc/tree/13f42bf4b250c8d4d812185ed7b6e4724b24a411) (`crates/contract/src/api/{sign,common}.rs`, `pending_requests.rs`, `state/resharing.rs`, `crates/near-mpc-crypto-types/src/{sign,primitives,kdf}.rs`, `crates/contract/README.md`) · near-sdk-rs @ [`a0d61a0`](https://github.com/near/near-sdk-rs/tree/a0d61a03533b1ab9a80467d1dbaf2f2c2c988a1d) (5.30.0-rc.1, `near-contract-standards/src/non_fungible_token/core/core_impl.rs`) · anza solana-sdk @ [`0443e67`](https://github.com/anza-xyz/solana-sdk/tree/0443e67b940a4d7feaa64f212697e93a6f2745bd) · chainsig.js @ `17aec4f` · [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702), [EIP-2718](https://eips.ethereum.org/EIPS/eip-2718), [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559), [EIP-155](https://eips.ethereum.org/EIPS/eip-155), [EIP-2681](https://eips.ethereum.org/EIPS/eip-2681), [ERC-191](https://eips.ethereum.org/EIPS/eip-191), [EIP-712](https://eips.ethereum.org/EIPS/eip-712), [ERC-2612](https://eips.ethereum.org/EIPS/eip-2612), [BIP143](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki), [NEP-171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md), [NEP-178](https://github.com/near/NEPs/blob/master/neps/nep-0178.md), [NEP-297](https://github.com/near/NEPs/blob/master/neps/nep-0297.md), [Permit2](https://github.com/Uniswap/permit2), Bitcoin Core 28.0 release notes. Copies of these are in `research/spikes/sec/sources/`.
> Spikes: `research/spikes/sec/` (`RESULTS.md`). They are throwaway. Rebuild from this design after Nov 1.

## TL;DR — what an implementer must know

1. **If `sign_for` accepts a 32-byte hash, it signs anything, and clean history cannot work.** The MPC signs any 32-byte digest, with no domain separation. That lets an owner obtain signatures for ERC-2612 and Permit2 permits, Seaport orders, EIP-191 messages, and EIP-7702 delegations (with `chain_id = 0`, one delegation is valid on every EVM chain). It also covers the BTC legacy SIGHASH_SINGLE "1" digest. None of these consume the account nonce, and nobody can tell what a hash was. **P0: `sign_for` takes the preimage, and the contract computes the hash itself.**
   - EVM: `keccak256(0x02 ‖ rlp(9 fields))`.
   - BTC: `sha256d` of the 182-byte BIP143 P2WPKH preimage.
   - SOL: the message bytes are already the MPC payload.

   Verified with viem, bitcoinjs and web3.js. A Rust port agrees on 19 shared test vectors.
2. **Sign only payloads the contract can classify.**
   - EVM: type 0x02 only; chain allowlist `{11155111}`; `to` of 20 bytes; empty calldata in the MVP; empty access list; canonical RLP; `nonce ≤ max_signed + 1`.
   - BTC: exactly 182 bytes; P2WPKH scriptCode; SIGHASH_ALL (`01000000`); locktime 0.
   - SOL: legacy or v0 message; one signer; no address lookup tables; no durable nonce; only System Transfer and ComputeBudget instructions.

   Measured cost: about 7.9 KB of extra wasm. Hashing costs about 0.01 Tgas. Arguments are 52–1,232 bytes.
3. **Write the record when the signature is requested, inside `sign_for`, in the same receipt as the MPC call. Do not write it in `on_signed`.** Verified: a failed `respond` transaction on testnet carries a valid signature in its public arguments. A failed or timed-out sign does not prove that no signature exists. Treat every accepted request as an issued signature, forever.
4. **Remove `pending_signs`.** A callback that panics or runs out of gas would leave it stuck and brick the token. Use `last_sign_height` instead: `list` requires `height ≥ last_sign_height + 210`. No state that correctness depends on may be updated in a callback. The simplest option is for `sign_for` to return the MPC promise directly.
5. **The state needed for a check is small, and each chain has a simple rule for when a signature is dead.**
   - EVM: keep the maximum signed nonce per chainId. A signature is dead when `eth_getTransactionCount(addr, tag) > max` on the chainId in the record.
   - BTC: keep the signed outpoints. A signature is dead when its outpoint has been spent by a confirmed transaction. The preimage commits only to its own input's outpoint, and that is enough.
   - SOL: keep the blockhashes. A signature is dead when its blockhash has expired. The contract rejects durable nonces, which never expire.
6. **Standing authorizations outlive a sale and pass the nonce check.** Examples: an EIP-7702 delegation, an ERC-20 or Permit2 approval, and Solana `Assign` or SPL `Approve`. The classifier makes them impossible to sign. As defense in depth, the checker also requires `eth_getCode(addr) == 0x` and that the Solana account's owner is the System program.
7. **The cooldown is not what makes a sale safe.** The plan correctly says it does not stop the attack. Safety comes from three things: signing is frozen while the token is listed, the log is written at request time, and `buy` must match `(listing_id, price, currency, sig_count)` exactly. Keep the 210-block cooldown as time for the history to settle and for the buyer to read it.
8. **During `nft_transfer_call`, the receiver owns the token until `nft_resolve_transfer` runs.** In that window it can `sign_for`, add a delegate or list the token, and then return `true` to send the token back. Block those actions while a transfer call is in flight. When the resolver reverts the transfer, it must bump `delegate_epoch` and clear any listing. near-contract-standards reserves only 5 Tgas for the resolver, so write your own.
9. **The lock is a security property, not a formality.** Any access key on the contract account can call the MPC as the predecessor and sign anything for every token, without leaving a record. The badge must therefore check that the account has zero access keys and that its code hash matches. Locking on Day 2 would push the Phase-2 features onto a new account, which means new addresses. Lock the final contract around Nov 11–12.
10. **MPC drift.** The live config requires **15 Tgas** for `sign` on both testnet and mainnet. The README says 10, and the plan's static 15 Tgas is exactly the minimum.
    - Forward unused gas with weight 1.
    - Let the caller set the MPC deposit.
    - Do not add an admin.

    A change to the MPC's argument schema cannot be fixed in a locked contract, so disclose that risk. Resharing preserves keys [SOURCED].
11. **The buyer's browser can run the whole check.** Every data source sends CORS headers (verified). A server cache is only a hint. On-chain enforcement through the MPC's `verify_foreign_transaction` is possible later (Phase 3) for Bitcoin, Solana and some L2s. It does not cover Ethereum or Sepolia today, and its testnet "Bitcoin" is testnet3.
12. **Smaller rules that matter:**
    - `sign_for`, `list` and `add_delegate` must require at least 1 yocto, so that dApp function-call keys cannot call them.
    - `ft_on_transfer` must check that the predecessor is the token in the listing.
    - Approvals must be cleared on every change of owner. `internal_transfer_unguarded` does not clear them.
    - Token ids must never be reused.

## Verified facts & measurements

All checks were run on 2026-10-21. The commands and full outputs are in `research/spikes/sec/` (`RESULTS.md`, `out_*`).

| # | Fact | Evidence |
|---|---|---|
| F1 | `keccak256(serializeTransaction(unsignedEip1559))` is exactly the signing hash. A raw signature over it, assembled with viem, is byte-identical to `account.signTransaction(tx)`. Preimage sizes: 52 B for an ETH transfer, 115 B for an ERC-20 `transfer`. | [VERIFIED] `node evm_preimage.mjs`: 28/28 PASS. For example, `0x02f283aa36a707…dead872bb2c8eabcc00080c0` (52 B) hashes to `0x8cb1b816…f6a1a9`. |
| F2 | A strict hand-written RLP decoder recovers chainId, nonce, to and value, and matches `viem.parseTransaction`. Each of these is refused: legacy (EIP-155 and pre-155), type-1, type-4 (7702), `0x05‖rlp(auth)`, EIP-191 (`0x19 0x45`), EIP-712 (`0x19 0x01`), non-canonical integers, trailing bytes, chainId 1, contract creation, `approve` calldata. | [VERIFIED] same run. |
| F3 | The pre-EIP-155 signing hash does not depend on the chain; the EIP-155 hashes do. | [VERIFIED] same run, section [5]. |
| F4 | `sha256d(BIP143 preimage) == bitcoinjs hashForWitnessV0`. A P2WPKH preimage is always **182 B**. Offsets: outpoint txid at [68..100] (internal byte order), vout at [100..104], amount at [130..138], sighash at [178..182]. A raw signature over it yields the same signed tx (same txid, byte-identical) as the PSBT path. | [VERIFIED] `node btc_preimage.mjs`: 27/27 PASS. |
| F5 | NONE, SINGLE, ANYONECANPAY variants and `0x41` are all detected from the last 4 bytes. The legacy SIGHASH_SINGLE digest with index ≥ outputs is the same constant for unrelated txs, so a signature over it can be reused. | [VERIFIED] same run, sections [4]–[5]. |
| F6 | A BIP143 preimage can be rebuilt from public PSBT fields. Its `sha256d` equals the hash that a chainsig.js-style mock signer captures. chainsig.js never exposes the preimage. | [VERIFIED] same run, section [7]. [SOURCED] chainsig.js `Bitcoin.ts` L223–256: "`sign: (hash) => { hashesToSign[index] = Array.from(hash) …`". |
| F7 | Solana: an Ed25519 signature over the raw message bytes is the transaction signature. A durable nonce means ix[0] uses the System program and its data starts with `04000000`; the "recentBlockhash" field then holds the nonce value. With an address lookup table, the destination account does not appear in the message bytes. | [VERIFIED] `node sol_message.mjs`: 20/20 PASS. [SOURCED] solana-sdk `svm-transaction/src/svm_message.rs` L146–176 (`ix.data.get(..SERIALIZED_SIZE).map(\|data\| data == SERIALIZED_ADVANCE_NONCE_ACCOUNT)`, a prefix match). `message/src/versions/v0/mod.rs` L178–191: "reject program ids loaded from lookup tables". |
| F8 | The Rust parsers agree with the JS reference on 19 vectors (EVM, BTC, SOL; accepted and refused), in both the hand-rolled version and the alloy-rlp version. | [VERIFIED] `cd rust-parsers && cargo test --release [--features alloy]`. |
| F9 | Wasm size (opt z, LTO, wasm32). The baseline with panic/fmt is 16,494 B. On top of that: BTC +0.6 KB, EVM +3.4 KB (alloy-rlp +4.5 KB), SOL +3.6 KB, all three +7.9 KB (alloy +9.1 KB). | [VERIFIED] `out_wasm_sizes.txt`. |
| F10 | NEAR testnet host costs (protocol 87):<br>• keccak256: 5.88 Ggas + 21.5 Mgas/B.<br>• sha256: 4.54 Ggas + 24.1 Mgas/B.<br>• storage write: 64.2 Ggas + 31.0 Mgas/B.<br>• log: 3.54 Ggas + 13.2 Mgas/B.<br>• Wasm op: 822,756 gas.<br>• Contract load: 1.09 Mgas/B.<br>• Max prepaid gas per tx: **1,000 Tgas**.<br>• Gas price: 1e8 yocto/gas.<br>• `yield_timeout_length_in_blocks`: 200.<br>• `max_total_log_length`: 16,384. | [VERIFIED] RPC `EXPERIMENTAL_protocol_config` and `gas_price`. |
| F11 | NEAR testnet blocks take 0.56–0.57 s. 200 blocks ≈ 112–114 s; 210 blocks ≈ 118–120 s. | [VERIFIED] `python3 blocktime.py` (2,000- and 20,000-block windows). |
| F12 | The MPC interface is `sign({"request":{"path","payload_v2":{"Ecdsa":hex32}\|{"Eddsa":hex≤1232},"domain_id"}})`. The deposit must be at least 1 yocto, and **any excess is refunded to the predecessor**, which is the Satchel contract. The tweak is `sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path)`. | [SOURCED] mpc `api/sign.rs` L29–80; `api/common.rs` L131–143 ("`Some(diff) => refund_to(predecessor, diff)`"); `near-mpc-crypto-types/src/sign.rs`, `primitives.rs` L63–68, `kdf.rs` L8, L34. |
| F13 | The live MPC config has `sign_call_gas_attachment_requirement_tera_gas` = **15** on both testnet and mainnet. The README still says "at least 10 Tgas". The yield callback reserves 7 Tgas and `fail_on_timeout` 2 Tgas. | [VERIFIED] view `config` on `v1.signer-prod.testnet` and on `v1.signer`. |
| F14 | Testnet domains: 0 = CaitSith/Sign (secp256k1), 1 = Frost/Sign (ed25519), 2 = CKD, 3 = CaitSith/**ForeignTx**. Testnet is at epoch 25 and mainnet at epoch 13, with the same domain layout. | [VERIFIED] view `state` (mpc agent snapshot, plus a mainnet query). |
| F15 | **Resharing keeps each domain's key**: `vote_reshared` builds `KeyForDomain { …, key: previous_key.key }`. | [SOURCED] mpc `state/resharing.rs` L125–134. |
| F16 | When a request has timed out, `respond` returns `RequestNotFound`. A failed `respond` tx (testnet `J7wZDTNA…kEr`, block 270,420,003) failed with "This sign request has timed out, was completed, or never existed." Its public args nevertheless contain `big_r`/`s`, which **verify** against `root(domain 0) + tweak·G` over the payload. | [SOURCED] `pending_requests.rs` L66–84. [VERIFIED] archival `EXPERIMENTAL_tx_status` + `node verify_failed_respond.mjs` → `signatureValidForDerivedKey: true`. |
| F17 | `v1.signer-prod.testnet` has **4 full-access keys**. Mainnet `v1.signer` has **0**. Both run code hash `DAE5ng4Z…8Sm9`. | [VERIFIED] RPC `view_access_key_list` and `view_account`. |
| F18 | `verify_foreign_transaction` covers these chains on both testnet and mainnet: Solana, Bitcoin, Base, Bnb, Arbitrum, Abstract, Starknet, Polygon, HyperEvm, Aptos, Sui, Avalanche, Fogo. **Ethereum is not on the list.** On testnet, "Bitcoin" points at `bitcoin-testnet-rpc.publicnode.com`, which is **testnet3** (height 5,195,951); testnet4 is at 157,200. | [VERIFIED] views `get_available_foreign_chains` and `allowed_foreign_chain_providers`, plus `getblockchaininfo`. |
| F19 | `derived_public_key({path, predecessor, domain_id})` on the MPC works as a public view. A browser can get each token's keys from the MPC itself. Changing the predecessor changes the key. | [VERIFIED] `node derived_key_check.mjs`. |
| F20 | Sepolia: `finalized` lags `latest` by 88 blocks (1,068 s), and `safe` lags by 56 blocks. EIP-7702 is live there: a delegated EOA has code `0xef0100‖addr` (23 B). | [VERIFIED] `rpc_checks.mjs`, `find7702.mjs` (EOA `0x1c3d…ca69`). |
| F21 | mempool.space testnet4 returns `{"spent":false}` (HTTP 200) from `/tx/<nonexistent>/outspend/0` and also for an out-of-range vout; `/tx/<nonexistent>` returns 404. An unconfirmed spend shows `"status":{"confirmed":false}`. | [VERIFIED] `rpc_checks.mjs`. |
| F22 | Solana devnet: `lastValidBlockHeight − blockHeight = 150`. `isBlockhashValid` is true for a fresh hash at every commitment level, false for a random hash, and false for a hash 400 slots old. `getSignatureStatuses(unknown)` returns `[null]`. | [VERIFIED] `rpc_checks.mjs`. |
| F23 | CORS is open on every source the check needs: mempool.space (`*`), publicnode Sepolia (`*`), drpc (echoes the origin), Solana devnet (echoes the origin), and fastnear and near.org testnet RPC (`*`). | [VERIFIED] curl preflights → `out_cors.txt`. |
| F24 | near-contract-standards behaviour:<br>• `nft_transfer_call` transfers ownership **first** and calls the resolver with `GAS_FOR_RESOLVE_TRANSFER = 5 Tgas`.<br>• On revert, the resolver restores the previous owner's approvals.<br>• `internal_transfer_unguarded` does **not** clear approvals.<br>• NEP-171 says: "If promise chain resolves with `true`, contract MUST return token to `owner_id`". | [SOURCED] `core_impl.rs` L23, L166–196, L201–253, L390–415, L430–480; NEP-171 L160–182. |
| F25 | near-sdk's `GasWeight::default()` is 1, so `ext_*` calls receive a share of unused gas unless told otherwise. | [SOURCED] `near-sdk-core/src/types/mod.rs` L38–44. |
| F26 | Bitcoin Core 28.0 made `mempoolfullrbf=1` the default, so any unconfirmed spend can be replaced. | [SOURCED] release notes 28.0 L144–145. |

## Threat model

**Assets.**
- Native funds at each token's derived addresses: BTC P2WPKH at `satchel/N/btc`, the EVM EOA at `satchel/N/evm`, and the Solana system account at `satchel/N/sol`.
- The NFT itself.
- The sale proceeds.

**Trust roots.**
- The NEAR MPC network: a threshold of its nodes could sign anything. On testnet, the holders of the MPC contract's 4 full-access keys could also redeploy it (F17).
- NEAR consensus.
- The Satchel contract code, once it is locked.
- The RPC providers the checker reads. The checker reads at least two per chain.

**Attackers.**
- A seller or giver who keeps signatures they have not broadcast.
- A malicious receiver contract during `nft_transfer_call`.
- A malicious delegate.
- A malicious or compromised frontend or server.
- Phishers and copycat contracts.

| ID | Attack | Impact | Mitigation (where it is enforced) | Phase |
|---|---|---|---|---|
| a | **Pre-signed, unbroadcast tx survives a sale or gift.** The seller obtains a drain signature, sells, then broadcasts. | Buyer is drained. | A complete log written at request time (on-chain); the per-chain "dead" checks run in the buyer's browser; `buy` is disabled in the UI unless the history is clean. Optional relay that auto-broadcasts. Disclosure. Gifts are not checked: the recipient trusts the giver, and the UI shows the same report. | Log in P1, checker in P2 |
| b | **Blind hashes.** `sign_for(…, payload_hash)` | The log is meaningless and no check is possible. | The caller supplies the preimage; the contract classifies and hashes it (F1, F4, F7). | **P1 (P0 priority)** |
| c | **Signatures that are not transactions.** EIP-191 `personal_sign`; EIP-712 including ERC-2612 `permit` (counter `nonces(owner)` and a `deadline`, not the account nonce); Permit2 `SignatureTransfer` (unordered `nonceBitmap` and a `deadline`); Seaport orders; EIP-7702 authorizations (`0x05`, `chain_id` 0 means every chain; the delegation persists until changed) | Tokens drained after the sale without moving the account nonce; with 7702, permanent takeover of the EOA. | The classifier accepts only `0x02` typed transactions. `0x19`, `0x05`, type-4 and raw hashes are refused (F2). A Satchel that can be sold never signs messages. If message signing is ever offered, it must set a permanent `unverifiable_history` taint on the token, and the badge can never turn green again. | P1 |
| d | **EVM cross-chain replay.** The same address exists on every EVM chain, and pre-155 transactions have no chainId (F3). | A signature is reused on another chain. | Type-2 only, so the chainId is inside the signed data. An allowlist `{11155111}`. The checker queries the nonce on the **chainId stored in the record**. In the UI, the address on chains outside the allowlist is a black hole: there is no way to sign there. | P1 |
| e | **BTC sighash variants.** NONE, SINGLE and ANYONECANPAY let the signature be recombined or the outputs redirected. Legacy SINGLE produces a constant digest (F5). | Theft of the input; signatures that can be reused. | The last 4 bytes must equal `01000000`. The scriptCode must be exactly `19 76a914{20}88ac`. `nLockTime == 0`, and `nSequence ≥ 0xfffffffd`. The checker requires the **signed outpoint** to be spent, confirmed, at the policy depth. | P1 |
| f | **Solana durable nonce.** The transaction never expires. ALTs hide accounts. | A live signature with no end. | Refuse on-chain when `ix[0].program == System && data[..4] == 04000000`. This is the same prefix rule the runtime uses (F7). Refuse any ALT. Parse both legacy and v0 messages. With those rules, a signature is dead once its blockhash expires. | P2 (Solana is in Phase 2) |
| g | **Freeze and sale games.** Listing while a sign is in flight; signing while listed; delist → sign → relist; changing price or currency in front of a buyer; confusing NEAR and USDC units. | The buyer pays for a state that is not the one they checked. | Signing is frozen for owner and delegates while listed. `list` requires `price > 0` and `height ≥ last_sign_height + 210`. Each `listing_id` is new and increasing. `buy(token_id, listing_id, expected_sig_count)` must match the listing, its `currency == Near`, `attached == price`, and `height ≥ listed_at + 210`. `ft_on_transfer` requires `predecessor == listing token` and `amount == price`, and refunds otherwise. The listing is valid only while `listing.seller == current owner`. | P2 |
| h | **Async races and stuck state.** `pending++`, then a callback that runs out of gas or panics, leaves the counter stuck forever. | The token can never be listed or transferred, and its funds are stuck. | No `pending_signs`. The "in flight" state is derived from `last_sign_height`. `sign_for` returns the MPC promise and has **no callback that changes state**. Resolver callbacks must not be able to panic and must reserve enough gas. | P1 |
| i | **The `nft_transfer_call` window.** The receiver becomes owner, signs, adds a delegate or lists, and then returns `true` (F24). Also: a seller approves an accomplice under NEP-178, and the accomplice moves the token away from the buyer if `buy` used `internal_transfer_unguarded`. | The previous owner is drained; the buyer loses the NFT. | A per-token `transfer_call_since: Option<height>` blocks `sign_for`, `list` and `add_delegate` until `nft_resolve_transfer`. Every change of owner runs a hook that bumps `delegate_epoch` and clears the listing, including a revert in the resolver. Approvals are cleared on every path, including `buy`. The resolver gets at least 20 Tgas. | P1 for transfers, P2 for sale |
| j | **Locked contract plus MPC interface drift.** The MPC changes its argument names, raises its gas or deposit requirement, or moves accounts. | The funds can no longer be reached. | Forward unused gas (weight 1, F25). The caller sets the MPC deposit. Build arguments with the canonical names (the MPC still accepts even the legacy v1 names, `sign.rs` compat layer). No admin. Disclose the risk. Lock late. See §Drift. | P1 |
| k | **MPC resharing or rotation.** | The addresses could change. | Resharing keeps keys (F15). Only a new keygen for a domain, or a new MPC account, would change addresses. Disclose this; Satchel cannot mitigate it. | — |
| l | **Storage DoS and an unbounded log.** | The contract runs out of balance, or the checker is too slow. | The caller pays each record's storage. The EVM summary is O(1) per chain. Views are paginated. The checker caps the number of entries it checks and caches entries that are finally dead, since that status never changes. Anyone can top up the contract's balance. | P1 |
| m | **Delegate caps mean nothing without amounts.** | A delegate drains the token. | Parse amounts on-chain. EVM: `value + gas·maxFeePerGas`. SOL: the sum of transfer lamports + 5,000 lamports per signature + `ceil(cu_price·cu_limit/1e6)`. BTC: refuse delegates (see §Delegates). A cap limits **how much can be signed per day**, not how much is settled per day. | P2 |
| n | **UI threats.** Address poisoning; wrong-chain or wrong-network recipients; showing the balance of a wrongly derived address; phishing listing pages; spoofed metadata or SVG. | A user sends or pays wrongly. | Review screens show full addresses with EIP-55 checksums. bitcoinjs `toOutputScript(addr, network)` throws on the wrong network. Derive each address from the MPC's `derived_public_key` view (F19) and compare with chainsig.js. Allowlist the contract id. Compute badges from chain data, never from metadata. Hide incoming dust in Activity. | P1/P2 |
| o | **Keys on the contract account, or an upgrade.** | Anyone can sign anything for any token and bypass the log. | Lock the account. The badge checks `view_access_key_list == []` and `code_hash` (F17 shows how). Statically check that the wasm imports no add-key, deploy-contract or delete-account promise actions. | P1 |
| p | **A malicious frontend with a function-call key** (the key created at wallet sign-in). | Silent calls to `sign_for`, `add_delegate` or `list`. | Require **at least 1 yocto** (function-call keys cannot attach a deposit; the MPC README's rationale applies here too). | P1 |
| q | **Token id reuse or path collision.** | A new token controls old funds. | Ids come from a decimal counter. No burn-and-re-mint. The path is `satchel/{id}/{btc\|evm\|sol}`, and the chain is always the last segment, so the mapping cannot be ambiguous. | P1 |
| r | **MPC collusion, or the MPC goes down.** | Anything gets signed, or signing stops. | This is a trust assumption, so disclose it. On a timeout, the UI offers a retry. Funds are stuck while the MPC is down. | — |
| s | **Unconfirmed deposits counted as "Verified balance".** | The seller double-spends the funding tx after the sale (RBF, F26). | Count only confirmed BTC UTXOs (at the policy depth) and the EVM and SOL balances at the policy tag. | P2 |
| t | **Reorgs undo a "spent".** | A replacement disappears and the drain tx lands instead. | A confirmation policy. Testnet: EVM `latest` with at least 3 confirmations, BTC at least 1. Mainnet: EVM `finalized`, BTC 6. | P2 |
| u | **An RPC, indexer or server lies.** | A false "clean". | Run the check client-side with two providers per chain, which must agree. The server cache is only a hint, and the browser re-checks before Buy. | P2 |
| v | **NEP-141 payment pitfalls.** The seller is not registered with USDC, so `ft_transfer` fails and the proceeds get stuck. A fake token calls `ft_on_transfer`. | Funds stuck or stolen. | Check the predecessor; require the exact amount. The UI makes the seller register before listing. A failed payout records `proceeds[seller]` for a later pull. | P2 |
| w | **The owner or a delegate leaves signatures unused**, through a broadcast failure or griefing. | The token cannot be sold. | "How to settle" flows. Signing counts as sending: a relay may broadcast every logged signature. A delegate can be revoked, but its unused signatures stay in the log. | P2 |

### Notes on the hard cases

**(b)/(c) Why the contract must refuse arbitrary hashes, and why preimages are enough.**
- The MPC checks only that an ECDSA payload is a valid scalar (`k256::Scalar::from_repr`, `sign.rs` L48–51; the README says "< p", but the code requires "< n"; the difference is negligible). It signs those 32 bytes with no further hashing (README: "The signed message is the 32-byte Ecdsa payload … without further hashing").
- So with a raw hash, Satchel is a universal signing oracle. chainsig.js even provides `prepareMessageForSigning` (`hashMessage`), `prepareTypedDataForSigning` (`hashTypedData`), `prepareUserOpForSigning` and `prepareTransactionForSigningLegacy`, which makes it trivial to produce blind hashes ([SOURCED] `EVM.ts` L179–234).
- With preimages, the contract computes `keccak256(bytes)` over bytes that start with `0x02` and decode as canonical RLP. A signature over that digest can be used only as a type-2 transaction signature for exactly those fields, unless keccak collides.
  - Non-canonical encodings are refused for clarity. They would be harmless anyway, because nodes recompute the hash from a canonical re-encoding.
  - Integers wider than 8 bytes for chainId, nonce or gas are refused, never truncated.

**BTC: what the preimage alone reveals.**
- `hashPrevouts`, `hashSequence` and `hashOutputs` are opaque hashes, so the contract cannot see the other inputs, the outputs or the fee.
- It can see **this input's outpoint**, its amount, its sequence, the locktime and the sighash type.
- That is enough for clean history: under any sighash type, a BIP143 signature can spend only that outpoint (BIP143: "outpoint (32-byte hash + 4-byte little endian)" is item 4 of the digest). Once that outpoint is spent, every signature over it is dead.

  It is not enough for spending caps; see (m).
- There is **no "incomplete set" status.** A seller can build a transaction that mixes Satchel inputs with inputs from their own wallet. The log cannot know how many inputs exist. Each signed outpoint is live until it is spent. This rejects UX proposal D14 "Incomplete".
- Cross-interpretation. A legacy P2PKH sighash preimage for the same key would need the signed input's outpoint at offset 68. That requires `4 + varint + 41·k = 68` for k "other" inputs, which has no solution for canonical varints (1, 3, 5 or 9 bytes). So a 182-byte BIP143 preimage can never also be a legacy SIGHASH_ALL preimage. In any case, Satchel never shows legacy addresses.

**Solana.**
- The MPC's Ed25519 domain signs the message itself, up to 1,232 bytes (`EDDSA_PAYLOAD_SIZE_UPPER_BOUND_BYTES = 1232`). The contract therefore always has the full message.
- Solana's off-chain message format starts with `\xff`, which parses as an unsupported version and is refused.
- An Aptos signing message starts with `sha3_256("APTOS::RawTransaction") = b5e97d…` (first byte 0xb5). An accepted Solana message starts with `0x01` (1 signer) or `0x80` (v0). A NEAR transaction signs `sha256(borsh(tx))`, which is 32 bytes and can never equal an accepted message. So the SOL key cannot be tricked into signing for its NEAR implicit, Aptos or Sui account [VERIFIED first byte].

**(g) What the timers do.** Every accepted request is logged before the MPC can see it, and signing is frozen while listed. So the log a buyer reads cannot change during a listing. `buy` must also present the `listing_id` and `sig_count` that the buyer checked.
- The quiet period before listing (210 blocks after the last sign) means no signature can still be arriving while the listing is live. This replaces `pending_signs == 0`, avoids confusing displays, and gives a recent-blockhash Solana signature time to expire.
- The cooldown after listing (210 blocks) gives the buyer's check and the indexer time to settle.

Neither timer is needed for safety. Both are cheap and match S-6.

**(h) In-flight state with no counter.** "A sign may be in flight" means `height < last_sign_height + 200 (yield timeout) + margin`. Nothing has to be decremented, so nothing can get stuck.
- If an event-only callback (`sign_completed`) is added for the indexer, its gas must be static with weight 0, and it must never change state that matters.
- If it fails, the user's transaction shows a failure even though a signature exists (F16). That is a UX cost, so prefer no callback in the MVP. The frontend reads the MPC result from the outcome of the returned promise.

**(i) Locking the transfer-call window.**
- A promise tree spends gas taken from the original transaction's prepaid gas, which is at most 1,000 Tgas (F10). A receiver can therefore keep the window open for at most a few hundred yields. As a rough estimate of 4 Tgas per yield receipt, that is about 50k blocks, around 8 hours.
- Clearing the lock in `nft_resolve_transfer` is the normal path.
- As a last resort, release the lock after 100,000 blocks. That is longer than any tree permitted by the protocol's gas limit [ASSUMED estimate].
- The resolver is written by hand and must not be able to panic (no `unwrap` on state that may be missing). It is attached with a static 20 Tgas and weight 0. **Do not** reuse the standard `nft_transfer_call`, because it reserves only 5 Tgas.

**(j) MPC drift.**

| Option | Fixes | Cost / risk | Verdict |
|---|---|---|---|
| Hardcoded args, static gas and deposit (the plan) | — | Breaks if the gas requirement rises. Today it is already **at** the 15 Tgas minimum (F13). | No |
| Forward unused gas (weight 1) + caller-chosen `mpc_deposit` (default 1 yocto, capped) | Gas and deposit increases | None. Remember that the MPC refunds excess deposit to Satchel, not to the user (F12). | **Yes (P0)** |
| Pass-through args JSON supplied by the caller | Schema changes | A caller could inject another path, which means another token's keys. Unsafe. | No |
| Narrow admin for `mpc` account, gas and deposit only | Account and gas changes | It can only DoS, not steal. But it cannot fix a schema change, and a new MPC account means new keys anyway. | Not needed |
| Stay upgradable (full-access key or DAO) | Everything | The upgrader can sign anything for every token without a record, so the badge becomes meaningless. | Only during development, on throwaway accounts |
| Timelocked DAO upgrade (≥ 7 days, with a "pending upgrade" banner, listings frozen) | Everything, with an exit window | Governance work | Phase 3 / mainnet |

**Recommendation:**
- Develop on unlocked throwaway accounts.
- On about Nov 11–12, deploy the final `satchel.<team>.testnet` with forwarded gas and a caller-chosen deposit, with no admin, and lock it.
- Disclose that a breaking change to the MPC arguments would leave a locked Satchel unable to sign.
- Ask the MPC team before Nov 13 whether `payload_v2` and `domain_id` are stable for the judging window (Nov 16–18).

**(k)** Resharing changes participants and thresholds, never the domain key (F15). The MPC repo also guards the derivation function with a snapshot test, `derive_tweak__has_not_changed` (`near-mpc-crypto-types/src/kdf.rs`) [SOURCED]. Derived addresses depend on `(predecessor = contract account, path, domain root key)`. So redeploying as `satchel-v2` gives **every** token new addresses, and funds held under v1 remain controlled by v1's code.

**(m) Delegates.** Store them as `(token, epoch, account) → {chain, daily_cap, window_day, spent_in_window, expires_at_ms}`.
- Charge the cap when the signature is **requested**. The record exists from that moment, whether or not the transaction is ever broadcast.
- The total a delegate can expose is `daily_cap × days the delegate was valid`, because signed transactions can be broadcast later. EVM signing has the `nonce ≤ max+1` rule, so a delegate cannot pre-sign nonces far in the future, but it can sign sequential ones.
- **BTC:** a delegate's spend cannot be computed from one input's preimage, because the outputs and the other inputs are hidden behind hashes. Refuse BTC for delegates in Phase 2, in both `add_delegate` and `sign_for`. Phase 3 alternatives:
  - Single-input transactions plus the full outputs, so the contract can recompute `hashOutputs`, with spend = `amount − outputs paying the token's own pkh`.
  - The whole unsigned transaction, with the contract building every BIP143 preimage itself.

  Both need the token's pkh on-chain, taken from the MPC `derived_public_key` callback.

## Clean-history protocol

### P1 — What the contract records (per accepted `sign_for`, written before the MPC call)

```text
SigRecord {                       // stored at sig_log[(token_id, seq)], append-only, never deleted
  seq: u64                        // 0,1,2,… per token; == number of earlier records
  chain: Btc | Evm | Sol
  payload: [u8;32]                // EVM keccak256(preimage) | BTC sha256d(preimage) | SOL sha256(message) (id only; MPC signs the message)
  height: u64, timestamp_ms: u64  // env::block_height(), env::block_timestamp_ms()
  requester: AccountId            // owner or delegate
  detail:
    Evm { chain_id: u64, nonce: u64, to: [u8;20], value: u128, max_fee_per_gas: u128, gas: u64 }
    Btc { txid: [u8;32] /* display order */, vout: u32, amount_sats: u64 }
    Sol { recent_blockhash: [u8;32], lamports_out: u64 }
}
SatchelState (per token) += { sig_count: u64, last_sign_height: u64, evm_max_nonce: Vec<(chain_id u64, max_nonce u64)> }
```

- **Storage:** about 110–140 bytes per record including the key, so about 0.0011–0.0014 NEAR at 1e19 yocto per byte. The caller pays it through the deposit, and the contract refunds any excess.
- **Event:** emit NEP-297 `EVENT_JSON:{"standard":"satchel","version":"1.0.0","event":"sign_requested","data":[{token_id, seq, chain, path, domain_id, payload_hex, preimage_hex, detail, requester, block_height}]}` in the same receipt. A 1,232-byte Solana message is about 2.5 KB of hex, well under the 16 KB log limit.
- **Re-broadcast:** the preimage is in the event and the signature is in the public MPC `respond`, so **anyone can rebuild and broadcast any logged signature**. That makes it possible for the buyer or a relay to settle unused signatures.
- **Product rule:** signing counts as sending.

### P2 — When a recorded signature is dead (it can never move funds again)

| Chain | Dead when | Query | Notes |
|---|---|---|---|
| EVM | `nonceCount(addr, chainId, tag) > evm_max_nonce[chainId]` | `eth_getTransactionCount(addr, tag)` on an RPC for **that chainId**, checking that `eth_chainId` matches | A nonce never decreases for an EOA. All txs with nonce ≤ the maximum (including replacements) die together. Use `tag = finalized` on mainnet. On testnet, use `latest` with at least 3 confirmations: Sepolia finality is about 18 minutes (F20). To get 3 confirmations, query `eth_getTransactionCount(addr, toHex(eth_blockNumber − 3))`; full nodes keep recent state. |
| BTC | The outpoint `(txid, vout)` is spent by a transaction confirmed at least K deep | `GET /tx/:txid` (404 means the output **does not exist yet**, which is live). Then `GET /tx/:txid/outspend/:vout` and read `spent`, `status.confirmed` and `status.block_height`. Compare with `/blocks/tip/height`. | Use K = 1 on testnet4 and 6 on mainnet. An unconfirmed spend is **settling**, not dead, because full-RBF lets the drain tx replace it. Remove duplicate outpoints before checking. |
| SOL | The blockhash is no longer valid **and** the record is at least 2 minutes old | `isBlockhashValid(bh, {commitment:'processed'})` on two RPCs. Optionally `getSignatureStatuses([sig], {searchTransactionHistory:true})` to show "landed". | Validity is 150 blocks (F22), about 60–90 s. The age check protects against a lagging RPC. During a chain halt the blockhash stays valid, so the status stays live, which is correct. Durable nonces are refused on-chain. |

**Account-level checks** (standing authorizations, defense in depth):
- EVM: `eth_getCode(addr) == "0x"` on every chainId in the record. The 7702 marker is `0xef0100…` (F20).
- SOL: `getAccountInfo(addr).owner == 11111111111111111111111111111111` and the data is empty.
- If either fails, the status is **unsafe**.

**Contract-level checks:**
- `view_access_key_list(contract).keys == []`.
- `view_account(contract).code_hash == the published reproducible build hash`. See `22-deploy-and-lock.md`.
- The MPC `derived_public_key` for each path matches the addresses shown (F19).

### P3 — The checker (runs in the buyer's browser; the server only caches)

```text
inputs: contract id, token id, policy {evm: 'latest-3'|'finalized', btc_k: 1|6, sol_min_age_s: 120}
1. NEAR (2 RPCs, finality 'final', must agree): access keys, code_hash, satchel(token).sig_count, sig_records(token, 0..sig_count)
2. MPC view derived_public_key(path, predecessor=contract, domain) → addresses; compare with UI-derived addresses
3. per record → status ∈ {spent, expired, settling, unused, unknown}; per account → ok | unsafe
4. aggregate:
     empty     if sig_count == 0 and accounts ok
     unsafe    if any account check fails or contract not locked / code hash mismatch
     unknown   if any status unknown (provider error, providers disagree, chain unsupported)
     blocked   if any status unused
     settling  if any status settling
     clean     otherwise (every record spent or expired)
   Buy enabled only for {clean, empty}; buy() is called with (listing_id, expected_sig_count = sig_count read in step 1).
```

The response shape for `/api/clean-history/:id` (the cache) matches what the browser computes itself:

```json
{ "token_id": "1", "checked_at": "2026-11-10T12:00:00Z",
  "contract": { "account_id": "satchel.<team>.testnet", "access_keys": 0, "code_hash": "…", "expected_code_hash": "…" },
  "policy": { "evm": "latest-3", "btc_k": 1, "sol_min_age_s": 120 },
  "sig_count": 3, "aggregate": "clean",
  "accounts": [ { "chain": "evm", "address": "0x…", "code": "0x", "status": "ok" } ],
  "items": [
    { "seq": 0, "chain": "evm", "chain_id": 11155111, "nonce": 2, "status": "spent",
      "evidence": { "count_latest": 3, "count_finalized": 3 }, "evidence_url": "https://sepolia.etherscan.io/address/0x…" },
    { "seq": 1, "chain": "btc", "outpoint": "<txid>:0", "status": "spent",
      "evidence": { "spending_txid": "…", "confirmations": 2 }, "evidence_url": "https://mempool.space/testnet4/tx/…" },
    { "seq": 2, "chain": "sol", "recent_blockhash": "…", "status": "expired", "evidence": { "valid": false, "age_s": 3600 } } ] }
```

Cache only what cannot change. A record that is **finally** dead (EVM finalized, BTC at depth K or more) is permanent. Every other status must be re-queried.

### P4 — What the badge promises, and the README disclosure

**Badge tooltip:** "Every signature this Satchel has issued is recorded on-chain. Your browser just checked each one against the live chains: none can still move funds."

**README disclosure (draft):**

> **Clean history — what it checks and what it trusts.**
>
> **What signs.** A Satchel's keys can sign only through `sign_for` on `satchel.<team>.testnet`. That account has no access keys (`near account list-keys satchel.<team>.testnet network-config testnet now`) and runs the published code (code hash `<hash>`).
>
> **What gets recorded.** Before NEAR's MPC network signs anything, `sign_for` records on-chain what is being signed: the Ethereum chain and nonce, the Bitcoin coin being spent, or the Solana blockhash. The contract refuses everything else, including raw hashes, messages, permits and token approvals.
>
> **What "Clean history" means.** Your browser checked every recorded signature against the chains and found that it can no longer move funds:
> - Ethereum: the nonce was used (3 confirmations on Sepolia).
> - Bitcoin: the coin was spent in a confirmed transaction.
> - Solana: the blockhash has expired.
>
> It also checked that the Ethereum address has no delegated code and that the Solana account is a plain wallet.
>
> **What it trusts.** The contract does **not** enforce this check. The app disables Buy until it passes. It trusts:
> - The NEAR MPC network. A threshold of its nodes could sign anything, and on testnet the MPC contract account itself has full-access keys.
> - The two RPC providers per chain that it queries.
> - The confirmation depth used.
>
> **What it does not cover.** Other chains and tokens than those shown, and signatures made after you buy.

### P5 — Optional: broadcast relay ("signing = sending")

A worker that follows `sign_requested` events and MPC `respond` transactions can broadcast every Satchel signature as soon as it exists. This removes stranded signatures (UX D9) and shrinks the window for attack (a). The protocol must not rely on it:
- BTC: inputs that don't exist yet, or fees that are too low.
- EVM: a maxFee below the base fee.
- Either way, the record stays **unused** until it is dead.

A "Settle now" button for the buyer can do the same. P2.

### P6 — Decisions for `80-ux-spec.md`

**Status mapping:**
- `spent` → Settled.
- `expired` → Expired.
- `settling` → **"Settling"**. This is a new status, and Buy stays disabled.
- `unused` → Unused.
- `unknown` → Can't verify.
- `unsafe` → **"Unsafe: approval or delegation found"**. This is a new status.
- **There is no "Incomplete" status.** See the notes on BTC above.

**Changes to UX copy:**
- The owner-state `pending_signs=0` becomes `height ≥ last_sign_height + 210` ("You can list in {t}").
- `sell.settle.evm` must say that settling uses up **every nonce up to {max}**. That may take more than one transaction.
- `sell.settle.sol` should say "about 2 minutes", because of the age margin.
- Durable nonces are rejected, so "Solana signatures expire" stays true.
- The timeout copy "Nothing was sent and no funds moved" is fine. But the request still appears in Clean history as Unused until its nonce, outpoint or blockhash is dead (F16), so never say "no signature exists".

## Enforcement matrix and parser costs

| Property | On-chain (contract) | Off-chain (browser checker) | MVP (Nov 6) | Phase 2 |
|---|---|---|---|---|
| Only the owner or a live delegate signs; at least 1 yocto | ✓ | — | ✓ | + delegates |
| Only classifiable payloads (no raw hashes, messages, permits, 7702 or calldata) | ✓ (parsers) | — | **✓ EVM + BTC** | + SOL; optional ERC-20 `transfer` (`a9059cbb`, 68 B, allowlisted token) |
| Append-only log written at request time; EVM max nonce; nonce ≤ max+1 | ✓ | reads it | ✓ | ✓ |
| Signed EVM nonce consumed | ✗ (cannot see Sepolia) | ✓ | display only | ✓ gates Buy |
| Signed BTC outpoint spent | ✗ (Phase 3: MPC foreign-tx on mainnet BTC; testnet is testnet3, F18) | ✓ | display only | ✓ |
| SOL blockhash expired | ✗ | ✓ | — | ✓ |
| No standing authorizations | ✓ by construction | ✓ code and owner checks (defense in depth) | ✓ | ✓ |
| Freeze while listed; quiet period; cooldown | ✓ | countdown | — | ✓ |
| Buy must match `(listing_id, price, currency, sig_count)` | ✓ | supplies the values | — | ✓ |
| Contract locked; code hash | protocol | ✓ | final contract | ✓ |
| Delegate caps (EVM, SOL) | ✓ | — | — | ✓ |

**Costs** (F9, F10): parsers add about 7.9 KB of wasm (hand-rolled) or 9.1 KB (with alloy-rlp). That is about 1 KB more for alloy, so either is fine; the hand-rolled version has no dependencies. Gas:
- keccak of 52 B ≈ 7 Ggas.
- sha256d of 182 B ≈ 14 Ggas.
- Parsing ≤ 50k wasm ops, at most about 0.04 Tgas [ASSUMED from the op cost].
- A 1 KB log ≈ 17 Ggas.
- A ~140 B storage write ≈ 70 Ggas.

The total is under 0.2 Tgas, against the MPC's own 15 Tgas. Arguments are 52 B (ETH), 115 B (ERC-20), 182 B per BTC input, and up to 1,232 B for SOL, all hex-encoded in JSON.

**Recommendation:** ship the EVM and BTC classifiers and the request-time log in Phase 1. A contract that signs raw hashes and gets locked can never offer verifiable history. Add SOL, sale, checker and delegates in Phase 2, and on-chain proof that records are dead in Phase 3.

## Reference — corrected contract interface (design for Nov 1; not compiled)

```rust
pub type TokenId = String; // decimal counter; never reused

#[near(serializers = [json, borsh])] #[derive(Clone, Copy, PartialEq, Eq)]
pub enum Chain { Btc, Evm, Sol }            // path "satchel/{id}/{btc|evm|sol}", domain 0|0|1

#[near(serializers = [json])]
pub enum SignRequest {                      // replaces (chain, payload_hex)
    Evm { unsigned_tx_hex: String },        // 0x02 || rlp([chainId,nonce,tip,maxFee,gas,to,value,data,accessList])
    Btc { bip143_preimage_hex: String },    // 182 B, one input per call
    Sol { message_hex: String },            // legacy or v0 message bytes, signed as-is
}
#[near(serializers = [json, borsh])] pub enum Currency { Near, Ft(AccountId) } // Ft only == configured USDC
#[near(serializers = [json, borsh])]
pub struct Listing { pub id: u64, pub seller: AccountId, pub price: U128, pub currency: Currency,
                     pub listed_at: u64, pub sig_count: u64 }
#[near(serializers = [borsh])]
pub struct SatchelState { pub sig_count: u64, pub last_sign_height: u64, pub evm_max_nonce: Vec<(u64, u64)>,
                          pub listing: Option<Listing>, pub listing_nonce: u64, pub delegate_epoch: u32,
                          pub transfer_call_since: Option<u64> }
#[near(contract_state)]
pub struct Contract {
    tokens: NonFungibleToken, metadata: LazyOption<NFTContractMetadata>, next_id: u64,
    mpc: AccountId, usdc: AccountId,                                   // set at init, immutable
    state: LookupMap<TokenId, SatchelState>,
    sig_log: LookupMap<(TokenId, u64), SigRecord>,                     // append-only; separate top-level map
    delegates: LookupMap<(TokenId, u32, AccountId), Delegate>,
}
#[near]
impl Contract {
    #[payable] pub fn nft_mint(&mut self, receiver_id: AccountId) -> Token;            // id = next_id++
    pub fn derived_path(&self, token_id: TokenId, chain: Chain) -> String;
    /// owner or live delegate; not listed; not in transfer_call; deposit >= storage + mpc_deposit (>= 1 yocto)
    /// returns the MPC promise (tx result = MPC SignatureResponse); no state-changing callback
    #[payable] pub fn sign_for(&mut self, token_id: TokenId, request: SignRequest, mpc_deposit_yocto: Option<U128>) -> Promise;
    #[payable] pub fn list(&mut self, token_id: TokenId, price: U128, currency: Currency) -> u64;    // 1 yocto; returns listing id
    #[payable] pub fn delist(&mut self, token_id: TokenId);                                          // 1 yocto
    #[payable] pub fn buy(&mut self, token_id: TokenId, listing_id: u64, expected_sig_count: u64);   // attached == price
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128>;
        // msg = {"token_id","listing_id","expected_sig_count"}; predecessor must == listing Ft account
    #[payable] pub fn add_delegate(&mut self, token_id: TokenId, account_id: AccountId, chain: Chain, daily_cap: U128, expires_at_ms: u64);
    #[payable] pub fn revoke_delegate(&mut self, token_id: TokenId, account_id: AccountId);
    // NEP-171 wrappers: nft_transfer / nft_transfer_call / #[private] nft_resolve_transfer, all via on_owner_change()
    pub fn satchel(&self, token_id: TokenId) -> SatchelView;                                         // summary + listing
    pub fn sig_records(&self, token_id: TokenId, from_seq: u64, limit: u64) -> Vec<SigRecordView>;   // hex in JSON
}
```

**`sign_for` order of operations** (this order is part of the security model):

1. `require!(attached_deposit >= 1 yocto)`. Load the state; check `listing.is_none()` (`ERR_FROZEN`) and `transfer_call_since.is_none()` (`ERR_IN_TRANSFER`). Authorize the caller as the owner or a live delegate of the current `delegate_epoch` (`ERR_NOT_OWNER`).
2. Decode the hex and classify it (§Classification). Panic with the parser's reason on any refusal.
   - For EVM, also require `nonce ≤ evm_max_nonce[chain_id].map_or(0, |m| m + 1)`.
   - For a delegate, charge the cap from the parsed amount, or refuse BTC.
3. Compute the MPC payload **from the same bytes**: `env::keccak256_array(p)`, `env::sha256_array(&env::sha256_array(p))`, or the message itself.
4. Append the `SigRecord` with `seq = sig_count`. Then `sig_count += 1`, `last_sign_height = height`, update `evm_max_nonce`, emit `sign_requested`, charge storage `(Δstorage_usage × storage_byte_cost) + mpc_deposit`, and refund the excess.
5. Return `Promise::new(mpc).function_call_weight("sign", {"request":{"path","payload_v2":{"Ecdsa"|"Eddsa":hex},"domain_id"}}, mpc_deposit, Gas::from_tgas(15), GasWeight(1))`. The frontend attaches 100 Tgas. The protocol allows up to 1,000.

**`on_owner_change(token)`** runs on every path that changes the owner: `nft_transfer`, `nft_transfer_call`, a revert in `nft_resolve_transfer`, `buy` and `ft_on_transfer`.
- It sets `delegate_epoch += 1` and `listing = None`.
- Approvals are cleared by `internal_transfer`. Never use `internal_transfer_unguarded` for a sale.
- `nft_transfer` and `nft_transfer_call` require `listing.is_none()` and `transfer_call_since.is_none()`.
- `nft_transfer_call` sets `transfer_call_since = Some(height)`.
- The resolver clears it first and must not be able to panic.

### Classification rules (normative; tested in `research/spikes/sec/rust-parsers`)

- **EVM** (`evm.rs`):
  - `p[0] == 0x02`, followed by one canonical RLP list that ends exactly at `p.len()` and has exactly 9 items.
  - chainId, nonce and gas are ≤ 8 bytes; fees and value are ≤ 16 bytes. No leading zeros. Single bytes below `0x80` must not be wrapped.
  - `chain_id ∈ ALLOWED`, `nonce < 2^64−1`, `to.len() == 20`, `data.is_empty()` (MVP), `accessList == []`.
  - Return `max_spend = value + gas × maxFee` with checked arithmetic.
- **BTC** (`btc.rs`):
  - `len == 182`, `p[104..130] == 19 76 a9 14 <20> 88 ac`, `le32(p[178..182]) == 1`. In addition (P1): `le32(p[174..178]) == 0` and `le32(p[138..142]) ≥ 0xfffffffd`.
  - Outpoint: `txid = reverse(p[68..100])`, `vout = le32(p[100..104])`, `amount = le64(p[130..138])`.
- **SOL** (`sol.rs`):
  - Optional prefix `0x80`; any other version is refused. Header with `numRequiredSignatures == 1`. Canonical shortvec encoding. Every program id must be a static key.
  - Refuse when `ix[0]` is the System program and `data[..4] == 04000000`.
  - Allowed instructions: ComputeBudget tag 2 or 3, and System Transfer (`data.len()==12`, `data[..4]==02000000`, `accounts==[0, k]`).
  - For v0, the lookup count must be 0. No trailing bytes.
  - Return the recentBlockhash and the transfers. P2: also require `keys[0] ==` the token's derived SOL key.

### Frontend: producing the preimage from the chainsig.js flows (tested)

```ts
// EVM — chainsig.js hashes exactly serializeTransaction(transaction) (EVM.ts L187-188)
const { transaction, hashesToSign } = await evm.prepareTransactionForSigning(req) // never the *Legacy* variant
const unsigned = serializeTransaction(transaction)                               // viem
if (keccak256(unsigned) !== toHex(Uint8Array.from(hashesToSign[0]))) throw new Error('preimage mismatch')
// sign_for args: { token_id, request: { Evm: { unsigned_tx_hex: unsigned } } }

// BTC — rebuild per input from the PSBT (btc_preimage.mjs §7; sha256d(result) == hashesToSign[i])
function preimageFromPsbt(psbt, i) {           // P2WPKH, SIGHASH_ALL
  const ins = psbt.txInputs, outs = psbt.txOutputs, wu = psbt.data.inputs[i].witnessUtxo
  const prevouts = concat(ins.map(x => concat([x.hash, u32le(x.index)])))
  const seqs = concat(ins.map(x => u32le(x.sequence ?? 0xffffffff)))
  const outsSer = concat(outs.map(o => concat([u64le(o.value), varint(o.script.length), o.script])))
  const scriptCode = concat([[0x19, 0x76, 0xa9, 0x14], wu.script.subarray(2, 22), [0x88, 0xac]])
  return concat([u32le(psbt.version), sha256d(prevouts), sha256d(seqs), ins[i].hash, u32le(ins[i].index),
                 scriptCode, u64le(wu.value), u32le(ins[i].sequence ?? 0xffffffff), sha256d(outsSer),
                 u32le(psbt.locktime), u32le(1)])
}
// SOL — the payload already is the message: chainsig.js Solana.ts L119-127 `transaction.compileMessage().serialize()`
```

### Invariants as testable properties (near-workspaces with a `mock-signer`)

The mock signer records `(predecessor, request.path, request.payload_v2, request.domain_id, prepaid_gas, attached_deposit)`. It has three modes: reply immediately, never reply (use a yield and `fast_forward` more than 200 blocks), and panic.

| ID | Property |
|---|---|
| INV-01 | A non-owner, non-delegate `sign_for` → `ERR_NOT_OWNER`, and the mock receives nothing (S-3). |
| INV-02 | After any owner change (`nft_transfer`, `nft_transfer_call` accepted, `buy` with NEAR, `buy` with FT), the previous owner's `sign_for` fails and the new owner's succeeds (S-4). |
| INV-03 | After any owner change, `nft_token(id).approved_account_ids == {}`. This holds for `buy` and `ft_on_transfer` too (S-5). |
| INV-04 | After any owner change, **including a revert in `nft_resolve_transfer`**, every delegate added before it fails (S-10). |
| INV-05 | Between `nft_transfer_call` and `nft_resolve_transfer`, a receiver contract calling `sign_for`, `list` or `add_delegate` from `nft_on_transfer` fails `ERR_IN_TRANSFER`. After the resolver runs, `transfer_call_since == None`. |
| INV-06 | The mock always sees `predecessor == contract`, `path == "satchel/{id}/{btc\|evm\|sol}"`, and `domain_id == 0` for btc/evm and `1` for sol. |
| INV-07 | For random valid transactions, the mock's payload is `keccak256(preimage)` for EVM, `sha256(sha256(preimage))` for BTC, and `== message` for SOL. |
| INV-08 | Every `sign_requested` event contains a `preimage_hex` whose hash equals `payload_hex` and what the mock received. The event's `seq` equals the `sig_count` before the call. |
| INV-09 | `sign_for` refuses every refusal vector in `vectors.json` (raw 32-byte hash, legacy, type-1, type-4, `0x05…`, `0x19…`, chainId ≠ allowlist, calldata, creation, access list, trailing bytes, non-canonical RLP, BTC non-ALL or wrong length or wrong scriptCode, SOL durable nonce, ALT, Assign, SPL Approve, multi-signer), and a refused call changes nothing. |
| INV-10 | EVM: after records with nonces {0, 1, 1, 2}, `evm_max_nonce[11155111] == 2`. A `sign_for` with nonce 4 fails `ERR_NONCE_GAP`; one with nonce 3 succeeds. |
| INV-11 | `sig_count` grows by exactly 1 per accepted `sign_for` and never shrinks. No method removes or rewrites a `SigRecord`. Records survive transfers. |
| INV-12 | With the mock in never-reply or panic mode, the record still exists after the timeout (it is never rolled back). After 210 blocks, `list` succeeds, and `sign_for` keeps working. Nothing gets stuck. |
| INV-13 | `list` fails while `height < last_sign_height + 210`. While listed, `sign_for` fails `ERR_FROZEN` for the owner and for delegates. While listed, `nft_transfer` and `nft_transfer_call` fail `ERR_LISTED` (S-6). |
| INV-14 | `buy` fails before `listed_at + 210`. It fails on a wrong `listing_id`, a wrong `expected_sig_count`, the wrong currency, or `attached != price`, and in each case state is unchanged and the deposit refunded. After delist and relist, the old `listing_id` fails (S-6, S-7). |
| INV-15 | A successful `buy` sets `owner == buyer` and `listing == None`, leaves approvals empty, bumps the epoch, and pays the seller exactly `price` or records it as claimable (S-7). |
| INV-16 | `ft_on_transfer` refunds the full amount (returns `amount`) and changes nothing when: the predecessor is not the listing's FT account, the amount ≠ price, or the msg is malformed (S-8). |
| INV-17 | `sign_for`, `list`, `delist` and `add_delegate` with 0 deposit fail. (Function-call keys cannot call them.) |
| INV-18 | Storage: n `sign_for` calls by an attacker attaching the minimum never lower `balance − storage_usage × byte_cost`. Any excess deposit comes back to the caller. |
| INV-19 | With 100 Tgas attached, the mock observes `prepaid_gas ≥ 15 Tgas` and a deposit of at least 1 yocto. |
| INV-20 | A delegate over its daily cap (EVM `value + gas·maxFee`) fails. A delegate's BTC `sign_for` fails. An expired delegate fails (S-10). |
| INV-21 | Token ids are `"1","2",…` and are never reissued. There is no burn. |
| INV-22 | Static check: the release wasm imports no `promise_batch_action_add_key*`, `promise_batch_action_deploy_contract` or `promise_batch_action_delete_account`. |

## Gotchas & failure modes

1. **Hash bytes, not intent.** Hash on-chain the exact bytes the parser checked. Never accept "hash plus description" from the caller.
2. **BTC txid byte order.** Inside the preimage the txid is in internal byte order; mempool.space and explorers use display order. Reverse it (F4).
3. **mempool.space reports nonexistent outpoints as unspent**, with no error (F21). Always GET `/tx/:txid` first. A missing transaction means the record is **live**, because a seller can pre-sign a spend of a segwit transaction whose txid is known before it is broadcast.
4. **An unconfirmed spend is not dead.** Full-RBF is the default (F26).
5. **Sepolia finality takes about 18 minutes** (F20). For the demo, use `latest` with at least 3 confirmations and label the policy. Mainnet uses `finalized`.
6. **The EVM tx hash is not the signing hash.** The record stores the signing hash. The explorer hash is `keccak256(serializeTransaction(tx, sig))`, which you can compute after the response.
7. **Solana:**
   - Use a prefix match on `04000000` for durable nonces (F7).
   - Use commitment `processed` for `isBlockhashValid`; at `finalized`, a fresh blockhash can look invalid.
   - An ALT hides destinations.
8. **near-contract-standards traps** (F24):
   - The resolver gets only 5 Tgas.
   - `internal_transfer_unguarded` keeps approvals.
   - A revert restores the old owner's approvals. That is fine, but you still need to bump the epoch.
9. **MPC gas is already at the limit:** 15 Tgas live versus 10 in the README (F13). Use a weighted promise and attach 100 Tgas.
10. **The MPC refunds excess deposit to the Satchel contract** (the predecessor), not to the user (F12). Send the exact deposit.
11. **A failed callback hides a real signature from the user** (F16). Avoid callbacks in the MVP. If you keep one, it must only emit an event.
12. **Nested collections:** keep `sig_log` as its own top-level `LookupMap<(TokenId,u64),_>`. Do not nest a `Vector` inside a value stored by borsh, which risks prefix collisions.
13. **Never reuse a token id.** The id is the path, and the path is the keys.
14. **The badge must check the lock.** An unlocked or upgradable contract makes "Clean" meaningless (attack o). Testnet's MPC contract has full-access keys (F17); say so in the disclosure.
15. **Chains outside the allowlist are black holes.** ETH sent to a token's address on mainnet or an L2 can never be moved by a locked testnet contract. Show "Sepolia only" next to the address.
16. **Delegate caps limit issuance, not settlement**, and revoking a delegate does not cancel its signatures.
17. **`@solana/web3.js` `latest` is 3.1.1** (2026-10-19). The spike used 1.99.0. The chains agent should pin the version on Nov 1.
18. **The log is only meaningful if it covers the whole life of the predecessor account.** If code is redeployed with wiped state on an account that has already signed, every earlier signature disappears from the log, while the derived keys stay the same. The EVM nonce rule would also restart at 0 and lock the owner out. So the final `satchel.<team>.testnet` must be a **brand-new account** that has never signed, initialised once and then locked. During development, every deploy that wipes state goes to a new throwaway account name.

## Recommendations for Satchel

**P0. Day 1–2, before any demo funds** (about +0.75 day for S1 and +0.25 for S2; removing `pending_signs` and the callback saves about 0.25 day):
1. `sign_for(token_id, SignRequest, mpc_deposit_yocto)` with the EVM and BTC classifiers (§Classification), hashing on-chain.
2. Write the record and the `sign_requested` event before the MPC call. `sign_for` returns the MPC promise. No `pending_signs`, and no callback that changes state.
3. Require at least 1 yocto. Charge storage and refund the excess.
4. Run `on_owner_change` on every path, and lock out the transfer-call window.
5. MPC call: `function_call_weight(…, 15 Tgas, GasWeight(1))`, a deposit chosen by the caller, and 100 Tgas from the frontend.
6. Counter token ids, no burn. Allowlist chainId 11155111.

**P1. MVP, Nov 6:**

7. The `sig_records` and `satchel` views. The EVM nonce-gap rule. BTC locktime and sequence rules.
8. Invariant tests INV-01…12, 17–19, 21–22 with the mock signer (coordinate with `21-testing-sandbox.md`).
9. Develop on throwaway accounts. Deploy and lock the final contract on Nov 11–12, on a **brand-new account** (Gotcha 18), with a reproducible build hash in the README (`22-deploy-and-lock.md`).
10. The UI shows Sepolia only and full addresses, and derives addresses through the MPC view.

**P2. Phase 2:**

11. `list`, `delist`, `buy` and `ft_on_transfer` with the matching rules, the quiet period and the cooldown.
12. The client-side checker (§P3), the `/api/clean-history/:id` cache, the badge and the README disclosure.
13. The SOL classifier.
14. EVM and SOL delegates with parsed caps; no BTC delegates.
15. Account-level checks for code and owner.
16. The broadcast relay.

**P3:**
- Prove on-chain that records are dead through MPC `verify_foreign_transaction` (mainnet BTC, SOL and L2s).
- An ERC-20 `transfer` policy.
- Durable nonces, but only when the nonce authority is the Satchel key, with the checker comparing the stored nonce.
- A timelocked DAO upgrade path.
- A hash chain over `sig_log` so a light client can check the events.
- Message signing only behind a permanent taint.

## Deltas vs plan (near_hackathon.md)

1. **B5 `sign_for(token_id, chain, payload_hex)` (hash input) is unsound.** Replace it with the `SignRequest` preimage enum and hash on-chain (TL;DR 1–2). This changes the architecture and costs about 0.5 day on Days 1–2.
2. **B5 "on_signed (logs SignatureIssued)" is wrong.** Log at request time inside `sign_for`. A signature can exist even when the MPC call fails (F16).
3. **The `pending_signs` field, and "list fails while pending_signs > 0" (S-6), create a stuck-state risk.** Remove the counter. Use `list` only when `height ≥ last_sign_height + 210`, and give `sign_for` no state-changing callback. `80-ux-spec` uses `pending_signs=0`; update it.
4. **The `sig_log` record "chain, payload_hash, block" (B5/S-9) cannot be checked.** It needs chainId and nonce, the outpoint, or the blockhash (§P1). S-9 should list nonce, outpoint or blockhash rows, not payload hashes.
5. **"EVM nonce above every signed nonce" is correct**, but only per **logged chainId** and at a confirmation policy. Add the `eth_getCode == 0x` check, type-2 only and the chain allowlist.
6. **"Every BTC outpoint in a signed tx spent" cannot be done**, because only the signed input's outpoint is visible (hashPrevouts is opaque). It is also not needed, since that outpoint is enough. Require a confirmed spend at depth K, and treat nonexistent outpoints as live.
7. **"SOL signatures expire with their blockhash" is false for durable nonces.** Reject them on-chain.
8. **"A cooldown does not stop this" is confirmed.** But the claim that 210 blocks must exceed the 200-block timeout matters only for logging at callback time. Safety comes from the freeze, request-time logging, and `buy` matching `(listing_id, price, currency, sig_count)`. Add those parameters to `buy` and to the `ft_on_transfer` msg (`{"buy": token_id}` is not enough).
9. **The transfer hook "require !listed || is_sale and pending_signs == 0" is incomplete.** Add the transfer-call lock, bump the epoch when the resolver reverts, clear the listing on every owner change, check `listing.seller == owner`, and clear approvals on the `buy` path.
10. **B5 `with_static_gas(15)` sits exactly on the live minimum, and "7 Tgas (with 10 Tgas attached)" (PR #4385) is stale.** Live config is 15 Tgas (F13). Use the weighted promise, attach 100 Tgas, and use a deposit chosen by the caller.
11. **Locking the contract on Day 2 conflicts with Phase 2.** The new features need a new account, which means new addresses. Locking is a security requirement, but do it for the **final** contract on Nov 11–12. Develop on throwaway accounts. The badge checks zero keys and the code hash.
12. **"It runs off-chain; disclose as trust assumption" is confirmed, and it is better than the plan implies.** The check runs in the buyer's browser (F23), with the server only caching. On-chain enforcement is possible in Phase 3 through MPC `verify_foreign_transaction` (F18), but not for Sepolia or testnet4.
13. **The plan misses standing authorizations and signatures that aren't transactions** (permit, Permit2, Seaport, 7702, ERC-20 approve, Solana Assign or SPL Approve). Add attack (c) and refuse them in the classifier.
14. **S-10 delegates "daily cap" needs amounts parsed from the preimage**, and it limits issuance only. BTC delegates are impossible from preimages, so make delegates EVM and SOL only.
15. **B5 "paths never include owner or epoch" is confirmed.** Add that addresses depend on the contract account id: B8's "redeploy as satchel-v2" gives every token new addresses and strands v1 funds if v1 is broken.
16. **S-8 `ft_on_transfer` must check the predecessor and the currency.** The seller must be registered with USDC storage, or proceeds get stuck; fall back to pull payments.
17. **S-7 "seller paid … in one transaction" is not atomic.** The NEAR payout is a separate receipt. If it fails (for example, the account was deleted), the funds return to the contract. Keep claimable proceeds (P2).
18. **S-2 should also check the MPC `derived_public_key` view**, not only chainsig.js (F19).
19. **B4 timeout copy is fine for funds**, but the request stays in Clean history as Unused until its nonce, outpoint or blockhash is dead.
20. **Versions:** `@solana/web3.js` 3.x exists (latest 3.1.1). The chains agent should pin it.
21. **Trust model:** testnet `v1.signer-prod.testnet` has 4 full-access keys (F17). Add this to the README disclosure.

## Open questions / human actions

1. **Human: confirm the confirmation policy for the demo.** Proposed testnet values: EVM `latest` with 3 confirmations (about 36 s), BTC 1 confirmation (about 10 min, so settle BTC well before recording), SOL 2 minutes. The alternative is `finalized` (about 18 minutes on Sepolia).
2. **Human: confirm the EVM allowlist for the locked contract.** The proposal is `{11155111}` only; alternatively add Base Sepolia 84532 and Arbitrum Sepolia 421614.
3. **Human (S1 with the sdk agent): set the date of the final deploy and lock** (proposed Nov 11–12). Decide whether Phase-1 demo tokens are re-minted on the final contract.
4. **Human: ask the NEAR MPC team (Discord or Telegram) whether `sign` args (`payload_v2`, `domain_id`), the 15 Tgas requirement and the 1-yocto deposit are stable until Nov 18.** Also ask about plans to add Ethereum or Sepolia and testnet4 to `verify_foreign_transaction`.
5. **Decide whether ERC-20 `transfer` (for example, Sepolia USDC) is in scope** for Phase 2 sends. If not, the MVP stays native ETH only.
6. **Cross-checks with teammates:**
   - mpc agent (`10-mpc-signer.md`): the exact response format returned to `sign_for`.
   - btc agent (`30-bitcoin-testnet4.md`): building the preimage from the chainsig.js PSBT path. chainsig.js `Bitcoin.ts` L131–138 calls `psbt.addInput({hash, index, witnessUtxo})` with no sequence, so bitcoinjs defaults apply (sequence `0xffffffff`, locktime 0). That is compatible with the locktime and sequence rule above [SOURCED], but confirm it on a real testnet4 transaction.
   - chains agent (`11`/`31`/`32`): `attachGasAndNonce` sets `type: 'eip1559'` and then spreads `...rest`, so a caller-supplied `type` overrides it (`EVM.ts` L68–87). Never pass `type`; the classifier refuses anything else anyway. Its nonce comes from `getTransactionCount` at `latest`, so a pending tx's nonce gets reused (a replacement). Also confirm the Solana message version.
   - web agent: the checker running in the browser.
   - ux agent: statuses Settling and Unsafe, and no Incomplete.
7. **Open:** should the badge allow Buy while records are `settling`? The proposal is no. That costs demo time, so planning has to account for it.
