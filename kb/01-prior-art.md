# Prior art and novelty: NFTs that control keys, and where Satchel stands

> Owner: hackathon · Checked: 2026-10-21 · Confidence: high for the source-code findings; medium for "no direct NEAR competitor found" (search-based, so absence of evidence only)
> Primary sources (pinned):
> - `near/multichain-gas-station-contract` @ `2d43bf0129a81bfe0ca66814cdf696545fe03b9d` (2024-10-02): `nft_key/src/lib.rs`, `nft_key/README.md`, `lib/src/chain_key.rs`; live deployment `v2.nft.kagi.testnet`
> - `LIT-Protocol/lit-peer` @ `cd8674fa77f125a4d38d001a944ea60481390309` (2026-09-16): `blockchain/contracts/contracts/lit-node/PKPNFT/PKPNFTFacet.sol`, `PKPPermissions/PKPPermissionsFacet.sol`, `PKPPermissions/LibPKPPermissionsStorage.sol` (the old `LitNodeContracts` repo is gone); Lit blog posts 2026-02-26 ("Introducing Lit Protocol v3 - Chipotle") and 2026-03-05 ("Naga Network Sunset")
> - ERC-6551 text, `ethereum/ERCs` master (`ERCS/erc-6551.md`, status "Review"), plus `tokenbound/contracts` @ `bce75f985558fad3d06ee1b86f224f0cfb783631` (2024-03-11): `src/AccountV3.sol`, `src/abstract/Lockable.sol`, `src/abstract/Permissioned.sol`
> - `dwallet-labs/ika` @ `a3942f5526d5ca2778d5d5b2de4d40eca7376fc6` (2026-09-27): `docs/content/docs/core-concepts/dwallets.mdx`, `docs/content/docs/sdk/ika-transaction/dwallet-types.mdx`
> - Metaplex Core docs "Execute and Asset Signer" and "Freeze Execute Plugin"; NEAR docs (Chain Signatures use cases, Shade Agents page); NEPs 616 and 641; devpost "Near Accounts Market"; Aurora blog "Safe Wallet and Aurora: multisigs for Bitcoin" (2025-02-07)
> - Vendored copies: `research/spikes/hackathon/vendor/` (sparse checkouts)

## TL;DR — what an implementer must know

1. **The closest prior art is NEAR's own `nft_key`** (in `near/multichain-gas-station-contract`, 2024): a NEP-171 NFT whose token id is an MPC derivation path. The owner (or an approved account) calls `ckt_sign_hash`, and sign-approvals are revoked on transfer. **It is still deployed** at `v2.nft.kagi.testnet` (197 tokens, `get_signer_contract_id` = `v1.signer-prod.testnet`). [VERIFIED] It is infrastructure for the gas station: no wallet UX, no BTC flow, no sale safety. Credit it in the README.
2. **Every system that ties a native key to a transferable token shares Satchel's core weakness.** A signature issued before the transfer stays valid after it. Lit PKPs, Ika dWallets and `nft_key` don't address it. **I found no system that offers buyers a verifiable "clean history" check.** That is Satchel's defensible novelty. [ASSUMED: absence across the sources reviewed]
3. **Smart-account designs avoid that weakness, and Satchel cannot.** ERC-6551 and Metaplex Core check the *current* owner when a signature or execution is used (the reference `isValidSignature` checks `owner()`). Satchel's ECDSA/EdDSA signatures land on Bitcoin, Ethereum and Solana, which never consult NEAR. This difference is the honest technical story to tell judges. [SOURCED]
4. **Lit PKP permissions survive NFT transfer.** They are keyed by `tokenId`, and `PKPNFTFacet._beforeTokenTransfer` clears nothing. A seller who added an auth method or address keeps signing power after the sale. Lit has also replaced NFT-held PKPs: Lit v3 "Chipotle" (2026) is TEE-based with API keys, and Naga sunset on 2026-04-01. [VERIFIED in source / SOURCED]
5. **ERC-6551 already wrote down the sale-scam playbook:** "Attach the current token bound account state to the marketplace order"; asset commitments; "a locking mechanism … while locked". Tokenbound V3 implements `lock(lockedUntil)` (max 365 days), a hash-chained `state`, and permissions "keyed by the root owner address, so will be disabled upon transfer". These map one-to-one to Satchel's freeze, `sig_log`/state and `delegate_epoch`. [SOURCED]
6. **Ika (Sui) markets "transferable" dWallets that "enable … a dWallet marketplace".** That is the nearest cross-chain competitor *concept*. Its zero-trust mode needs a user share that must be revealed or re-encrypted to the new owner. Its "Shared" mode is network-controlled, which is the same trust model as Satchel. [SOURCED]
7. **Two design lessons for sec and sdk:**
   (a) `sign_for` over an arbitrary 32-byte hash cannot be classified later: a permit or EIP-712 digest looks the same as a transaction hash. Clean history therefore needs the **preimage**, or must mark unknown payloads as blocking.
   (b) Bind `buy` to the token's current state (ERC-6551's first mitigation) so a buyer's clean-history check cannot go stale.
   Plus: `nft_key` clears approvals through the *public, owner-checked* `ckt_revoke_all` inside the transfer hook. My reading is that this panics for NEP-178-approved transfers. Clear via an internal function instead. [VERIFIED in source; the panic itself is not executed]
8. **The NEAR NFT venue landscape is nearly empty.** Mintbase and Bitte return HTTP 402 (mainnet and testnet), Paras redirects to an unrelated product, testnet Paras gives 502, and TradePort's NEAR page is 404. **There is no third-party testnet marketplace to list a Satchel on.** MyNearWallet testnet is live and shows NEP-171 NFTs via NEP-181 `nft_tokens_for_owner`, but only tokens with non-null `metadata`. [VERIFIED]
9. **Shade Agents are deprecated** ("After April 19th, 2026, the Shade Agent Framework will no longer [be] maintained as standalone developer tooling") and Bitte's wallet is offline. Do not cite either as a dependency. [SOURCED/VERIFIED]

## Verified facts & measurements

### 1. `nft_key`: NFT chain keys (NEAR, 2024) — closest prior art
- What it is: "The NFT chain key contract … allow[s] MPC keys to be transferred between users, securely, using the NEP-171 NFT contract standard." It implements NEP-145, 171, 177, 178 and 181 (`nft_key/README.md`). [SOURCED]
- Signing: `ckt_sign_hash(token_id, path: Option<String>, payload: Vec<u8>, approval_id: Option<u32>)`, `#[payable]` with `assert_one_yocto()`. It requires the caller to be the owner **or** an account with a matching sign-approval id, then calls `ext_signer::sign(SignRequest::new(payload, make_path_string(&token_id, &path), key_data.key_version))`. The path is `format!("{token_id},{path}")`. Callback gas is 3 Tgas. `ckt_public_key_for(token_id, path)` proxies `derived_public_key`. [VERIFIED in source, `nft_key/src/lib.rs` lines 120–190]
- Use-approvals (separate from NEP-178 transfer approvals): `ckt_approve`, `ckt_approve_call`, `ckt_revoke`, `ckt_revoke_call`, `ckt_revoke_all`, `ckt_approval_id_for`. README: "there does not exist an approvals standard for _using_ NFTs, which is an intrinsically different operation." [SOURCED]
- On transfer and burn: `Hook<…, Nep171Transfer>` calls `contract.ckt_revoke_all(token_id)` before the transfer. `ckt_revoke_all` does `assert_one_yocto(); … self.require_is_token_owner(&predecessor, &token_id)`. [VERIFIED in source, lines 329–345 and 355–377] **Implication (by reading only):** when a NEP-178-approved account (a marketplace) calls `nft_transfer`, the predecessor is not the owner, so the hook panics with "Unauthorized". Approved transfers would be impossible. Not executed.
- Built on near-sdk 5.1 and near-sdk-contract-tools 3.0.2, with the **old** MPC request shape (`payload`, `path`, `key_version`). [VERIFIED in `Cargo.toml`]
- Live state: `v2.nft.kagi.testnet` exists. `get_signer_contract_id` → `"v1.signer-prod.testnet"`, `nft_total_supply` → `"197"`. Token ids reach #301 ("Chain Key Token #301", owner `caglavol.testnet`, last indexed update at block 173,800,217). FastNear and NearBlocks both index its holders. [VERIFIED via RPC and APIs, 2026-10-21] Whether its legacy-shaped `sign` still succeeds against today's signer was not tested (mpc owns signer API compatibility).
- Missing compared with Satchel: no record of issued signatures, no freeze or cooldown, no sale flow, no wallet or chain UX, unlimited free mint, and the token id is the path.

### 2. Lit Protocol PKPs (Programmable Key Pairs), 2022–2026
- Model (NFT era): "only the wallet address or smart contract holding the PKP NFT can authorize how it is used for signing" (Lit blog, 2023-01-23). To make a PKP immutable: "burning the PKP … no additional auth methods can be added" or "send the PKP to itself". [SOURCED]
- Transfer semantics, from source: `PKPNFTFacet._beforeTokenTransfer` only calls `ERC721EnumerableUpgradeable._beforeTokenTransfer`. Permission storage is `mapping(uint256 => EnumerableSet.UintSet) permittedAuthMethods`, keyed by the PKP `tokenId`. Mutations are gated by `onlyPKPOwner(tokenId)` (`require(LibERC2771._msgSender() == nftOwner, "Not PKP NFT owner")`). `isPermittedAddress` returns `isPermittedAuthMethod(...) || userIsOwner`. [VERIFIED in source @ `cd8674fa`] **So every auth method, Lit Action and address the seller added keeps working for the buyer's PKP until the buyer removes it.** Signatures the PKP already produced (for example a signed BTC transaction) are permanent like any other.
- Status: Naga mainnet launched January 2026. "Naga fully sunsets" on April 1, 2026 (blog 2026-03-05). Lit v3 "Chipotle" (blog 2026-02-26) moves "from threshold cryptography to TEE-based execution", driven by a REST API with API keys and on-chain permission groups. The NFT-held PKP model is effectively legacy. [SOURCED]
- What Satchel borrows: the vocabulary ("root owner", "permitted signers"), and the warning that per-token permissions must not outlive a transfer. How Satchel differs: NEP-171 on NEAR, NEAR's MPC network rather than Lit's, delegates voided on transfer by `delegate_epoch`, and the clean-history check.

### 3. ERC-6551 token-bound accounts and Tokenbound (EVM, 2023–)
- ERC-6551 (status "Review"; requires 165, 721, 1167, 1271): a registry deploys a smart-contract account per NFT. `state()` "SHOULD be modified each time the account changes state". `isValidSigner(signer, context)`: "By default, the holder of the non-fungible token the account is bound to MUST be considered a valid signer." [SOURCED]
- Fraud Prevention (verbatim excerpt): "Alice withdraws 10ETH from the token bound account, and immediately accepts Bob's offer … Bob receives token X, but account Y is empty." Mitigations: "Attach the current token bound account state to the marketplace order. If the state of the account has changed since the order was placed, consider the offer void." · "Attach a list of asset commitments to the marketplace order …" · "Submit the order … via an external smart contract which performs the above logic …" · "Implement a locking mechanism on the token bound account implementation that prevents malicious owners from extracting assets from the account while locked". "Preventing fraud is outside the scope of this proposal." [SOURCED]
- Ownership cycles: "the simplest example is the case of an ERC-721 token being transferred to its own token bound account … both … would be permanently inaccessible". [SOURCED]
- Tokenbound AccountV3 (source @ `bce75f98`):
  - `Lockable.lock(uint256 _lockedUntil)`: root owner only, `ExceedsMaxLockTime` if more than `block.timestamp + 365 days`; `isLocked()` is `lockedUntil > block.timestamp`.
  - `AccountV3` reverts `AccountLocked` before execute, lock, setOverrides and setPermissions, and runs `_updateState()`: `_state = uint256(keccak256(abi.encode(_state, _msgData())))`.
  - `Permissioned`: "Permissions are keyed by the root owner address, so will be disabled upon transfer of the token which owns this account tree."
  - `_isValidSignature` recovers the signer and returns `_isValidSigner(signer, "")`, the current root owner or a permissioned caller.
  [VERIFIED in source]
- Key contrast: TBAs check authority when the signature is *used*, so the old owner's ERC-1271 signatures die on transfer. On-chain ERC-20 `approve`s made by the TBA still persist, which is why marketplaces must bind orders to `state`. [SOURCED/ASSUMED for the approvals point, standard ERC-20 behaviour] The ERC-6551 discussion adds marketplace escrow during listing as another mitigation (secondary summary).

### 4. Ika dWallets (Sui-coordinated; Solana pre-alpha), 2025–
- "dWallets are … non-collusive, massively decentralized, programmable and transferable signing mechanism with an address on any other blockchain … **Transferable**: Supports ownership transfer, enhancing access control and enabling features like a dWallet marketplace or future user claims." (`core-concepts/dwallets.mdx` @ `a3942f55`) [SOURCED]
- Types: **Zero-Trust** (user share encrypted and required for every signature, plus network share) and **Shared** ("public user share stored on-chain … it can create signatures without user interaction", aimed at "DAO treasuries, smart contract-controlled wallets"), plus imported-key variants. [SOURCED] In zero-trust mode, transfer means revealing or re-encrypting the user share to the new owner plus a network reshare (Ika docs and blog, via search summary). [SOURCED, secondary] A reshare does not invalidate signatures already produced for the same public key. [ASSUMED, standard ECDSA]
- Positioning: the GitHub description says "programmable signing mechanisms that let smart contracts natively control assets on any chain (Bitcoin, Ethereum, Solana, and more) with no bridging or wrapping. Live beta on Sui; pre-alpha for builders on Solana." Sui's own X post: "wallets are now programmable, transferable objects". [SOURCED]
- Contrast: Satchel's tokens are standard NEP-171, so any NEAR wallet, explorer or contract understands transfer. NEAR's MPC signs with no user share (the same trust model as Ika "Shared"). Satchel adds sale-time safety.

### 5. Metaplex Core "Execute" and Asset Signer (Solana)
- "Only the assetSignerPda can hold SOL and tokens on behalf of the Asset." "The MPL Core Execute instruction will validate that the current Asset owner has also signed the transaction." The **Freeze Execute** plugin is "an Owner Managed plugin that allows freezing the Execute lifecycle event on an Asset." (metaplex.com docs, via search summary) [SOURCED, secondary]
- Same family as ERC-6551: authority is checked at execution time, on one chain only. Freeze Execute is the direct analogue of Satchel's "signing paused while listed".

### 6. Selling whole NEAR accounts: "Near Accounts Market" (devpost)
- "The process of transferring an account is concluded in a contract that is installed on the account … Next, all full access keys are deleted and after that no one, including the creators of the service, can access the account. … After the purchase, a new owner is registered in the contract. At his request, a full access key is created …" [SOURCED, devpost.com/software/near-accounts-market]
- Lesson: NEAR users have traded "control of an account" before. Satchel's distinction is that control is per-token, multichain and native, with no key ever handed over.

### 7. Contract-gated Chain Signatures on NEAR (patterns, not NFTs)
- NEAR docs list Chain Signatures use cases including "Cross-Chain NFT Platforms … a NFT marketplace on NEAR where users purchase NFTs using external cryptocurrencies such as Bitcoin". "NFT as a wallet" is **not** a documented use case. [VERIFIED, docs.near.org/chain-abstraction/chain-signatures]
- Aurora blog (2025-02-07), "Safe Wallet and Aurora: multisigs for Bitcoin": "a Safe Wallet on Aurora to control the Bitcoin assets on the associated derived account." This shows contract-gated control of native BTC, but not a token. [SOURCED]
- Shade Agents: an agent contract gates `request_signature` to TEE-registered agents (secondary). The docs page is now titled "Shade Agents (deprecated)": "After April 19th, 2026, the Shade Agent Framework will no longer maintained as standalone developer tooling." [VERIFIED, docs.near.org/ai/shade-agents/introduction] The hackathon's Sep 29 track hints included SHADE AGENTS; the Oct versions dropped them (see 00-hackathon-rules.md).
- Bitte / Mintbase: `wallet.bitte.ai`, `bitte.ai`, `www.mintbase.xyz` and `testnet.mintbase.xyz` all return HTTP 402 (2026-10-21). A community repo exists to recover keys "from wallet.mintbase.xyz or wallet.bitte.ai", saying the wallets were shut down "suddenly, without any migration process". [VERIFIED for status codes; SOURCED for the recovery repo]

### 8. NEAR standards that shape the `nfts` track
- **NEP-616 "Deterministic AccountIds"** (Approved; created 2025-07-24): account ids derived from `StateInit` for "sharded contract designs" on top of global contracts (NEP-591). This is the natural NEAR primitive for *token-bound NEAR accounts* (one account per NFT), and a likely approach by other `nfts`-track teams given the SUB-ACCOUNTS hint. Satchel's distinction is native non-NEAR chains. [SOURCED]
- **NEP-641 "Offchain Authorizations for Smart Contracts"** (Final; 2026): `w_resolve_auth(path, authorization)` lets a contract attest offchain authorizations; target use cases include "authorizing an MPC signing request". It could later let "Sign in with this Satchel" work. P2 only. [SOURCED]

### 9. NEAR hackathon projects ("chain signatures + NFT wallet")
- Searched the web (devpost/dorahacks/GitHub/NEAR blog terms). Beyond `nft_key` I found **no public project that sells or transfers native multichain wallets as NEP-171 tokens**. [ASSUMED from search; not exhaustive] Illia Polosukhin's 2026-10-03 idea list (linked from the official X Article) has no NFT-wallet idea. It does include "Private OTC market using 'private deals' from NEAR Intents", which matches Satchel's OTC persona, and an NFT-with-NEAR-attached Tamagotchi. [SOURCED]

### Comparison

| System | Control model | Native non-host chains | On transfer | Signatures/permissions issued before transfer | Sale-safety mechanism | Status (2026-10) |
|---|---|---|---|---|---|---|
| `nft_key` (NEAR) | NEP-171 owner or sign-approved account → MPC `sign`, path `"{id},{path}"` | Yes (any MPC-supported) | Sign-approvals revoked (via owner-checked call) | Issued signatures stay valid; not addressed | None | Live on testnet (197 tokens), repo idle since 2024 |
| Lit PKP NFT | ERC-721 owner + permitted auth methods, actions, addresses (per tokenId) | Yes | Nothing cleared | Permissions **persist**; issued signatures stay valid | None (burn or self-own to freeze config) | Superseded by Lit v3 (TEE, API keys) |
| ERC-6551 / Tokenbound | Smart account; holder (or permissioned) checked at use | No (host EVM chain only) | Permissions keyed by owner → disabled | ERC-1271 signatures re-checked → die; on-chain approvals persist | `state()`, `lock()`, marketplace order binding | Live, standard in "Review" |
| Ika dWallet | Move object cap; 2PC-MPC (zero-trust) or network-only (shared) | Yes | Cap moves; zero-trust needs user-share handover or reshare | Issued signatures stay valid [ASSUMED] | Not found | Mainnet beta on Sui |
| Metaplex Core Execute | Asset-signer PDA; owner must co-sign execute | No (Solana) | Owner changes → control changes | Re-checked at execute | Freeze Execute plugin | Live |
| **Satchel** | NEP-171 owner (and capped delegates) → contract → MPC `sign`, path `satchel/{id}/{chain}` | **Yes: BTC, EVM, SOL** | Approvals cleared, delegates voided (`delegate_epoch`) | Issued signatures stay valid, so it makes them **visible and checkable** (`sig_log` + clean history) | Freeze while listed, cooldown, clean-history gate (+ recommended state binding) | To be built |

## Reference — patterns to borrow, with pointers

| Pattern | Source | Use in Satchel |
|---|---|---|
| Separate *use* approvals from NEP-178 *transfer* approvals; `approval_id` must match | `nft_key` `ckt_approve` / `ckt_sign_hash` (`approval_id` zip check) | Delegates (S-10): store an approval id per delegate and require it on `sign_for` by a delegate, so stale ids fail |
| Clear sign-approvals in the transfer and burn hooks | `nft_key` `Hook<Nep171Transfer>` | Do it, but via an **internal** function (no caller check, no `assert_one_yocto`), and test approved-marketplace transfers and `nft_transfer_call` |
| Permissions keyed by owner or epoch auto-expire on transfer | Tokenbound `Permissioned` ("disabled upon transfer") | Matches the plan's `delegate_epoch`; keep it |
| Time-bounded lock by root owner | Tokenbound `Lockable` (max 365 days) | Freeze while listed. Also cap listing duration, or let the owner delist at any time |
| State hash-chain bound into orders | ERC-6551 Fraud Prevention, Tokenbound `_updateState` | Expose `state(token_id)` (e.g. `sig_log.len()` plus a hash of the last record) and take `buy(token_id, expected_state)`; panic if it differs |
| Asset commitments in the order | ERC-6551 Fraud Prevention | Optional: the buyer passes the minimum balances they saw. They are only checkable off-chain for BTC/ETH, so treat them as UI-level |
| Prevent ownership cycles | ERC-6551 Ownership Cycles | If a NEAR-side derived account is ever added, forbid transferring a Satchel to its own derived account or to the contract |
| Lock by deleting keys; contract-mediated transfer | Near Accounts Market | Satchel's lock (no access keys) is the same trust argument; cite it |

## Gotchas & failure modes (lessons from prior art)
1. **Signatures over opaque hashes defeat clean history.** `sign_for(token_id, chain, payload_hex)` takes any 32-byte digest. An EIP-2612 or Permit2 permit, an EIP-712 order, or a BTC signature with unusual sighash flags or a far-future locktime cannot be recognised from the hash alone. The plan's checks (EVM account nonce, BTC outpoints, SOL blockhash) then report "clean" while a drain remains possible. Prior art avoids this only by checking at use time (ERC-6551, Metaplex), which native chains cannot do. Recommendation for sec: `sign_for` takes the **unsigned transaction preimage**, the contract hashes it itself (keccak256 of the RLP for EIP-1559; BIP-143 double-SHA256 for P2WPKH; the Solana message), and it records parsed fields (EVM `chain_id`/`nonce`; BTC outpoints; SOL `recent_blockhash`). Anything the contract cannot parse is refused, or permanently flags the token "unverifiable". [ASSUMED design reasoning]
2. **A stale clean-history check.** A buyer checks, then the seller delists, signs and relists. The cooldown narrows the window; binding `buy` to `expected_state` closes it. [SOURCED pattern]
3. **Hook implementation trap (`nft_key`):** calling a public, caller-checked function from inside the NEP-171 transfer hook breaks transfers by approved accounts. [VERIFIED by reading]
4. **Per-token permissions outliving transfer (Lit):** anything keyed only by token id survives a sale. Key by `(token_id, epoch)` or by owner. [VERIFIED in source]
5. **Ownership cycles:** only relevant if Satchels can own NEAR accounts or other Satchels. [SOURCED]
6. **Dependency risk:** NEAR-ecosystem services in this space have vanished (Bitte and Mintbase wallets, Paras, Shade Agents framework). Do not build the demo on any of them. [VERIFIED/SOURCED]

## Recommendations for Satchel (concrete, with priority)

**P0**
1. **Lead with the novelty that survives comparison**: "native BTC/ETH/SOL under one NEP-171 token, and a sale buyers can verify". Make **freeze + clean-history + (recommended) state-bound buy** the hero of the sale flow. Do not claim "first NFT that controls keys" (`nft_key`, Lit and Ika preclude that).
2. **Put a short "Prior art" section in the README.** It helps "originality" and pre-empts "this is just ERC-6551/nft_key". Draft:
   > *Prior art.* NEAR's `nft_key` (multichain-gas-station-contract, 2024) showed that an NFT can own a Chain Signatures path; Lit PKPs and Ika dWallets make keys transferable; ERC-6551 gives NFTs smart-contract accounts on one EVM chain. Satchel combines native multichain keys with a standard NEP-171 token and adds what none of them provide: a buyer-verifiable "clean history". Every signature a Satchel has ever issued is recorded on-chain, signing freezes while it is listed, and the purchase is blocked unless each recorded signature is provably spent or expired.
3. **Send to sec (70-security-and-clean-history.md):** the opaque-hash gap (gotcha 1) and state-bound `buy` (gotcha 2). Both change the `sign_for` and `buy` signatures, so decide before Nov 1.
4. **Send to sdk:** clear approvals and delegates in the transfer hook via an internal path, and add a sandbox test where an approved account (marketplace) performs `nft_transfer` and `nft_transfer_call`.

**P1**
5. Borrow `approval_id` matching for delegates (from `nft_key`).
6. Expose a read-only `state(token_id)` view (counter and hash of `sig_log`) so any third-party marketplace could bind orders to it. Name the pattern after ERC-6551's fraud-prevention section in the README.
7. In the README's "How it differs", one line each: vs `nft_key` (product, sale safety, new MPC API); vs ERC-6551 (native multichain, but signatures are irrevocable, hence clean history); vs Lit/Ika (standard NEP-171 on NEAR, permissions reset on transfer).

**P2**
8. Optional NEAR-side account per Satchel (ed25519 derived implicit account, or a NEP-616 deterministic account) to answer the SUB-ACCOUNTS hint. If built, prevent ownership cycles. Needs mpc and sdk validation. Cut first if time is short.
9. NEP-641 `w_resolve_auth` ("Sign in with this Satchel"): only a roadmap mention.

### What judges may see as derivative, and the answer
| Likely remark | Answer (README or video) |
|---|---|
| "ERC-6551 on NEAR" | TBAs hold assets on one EVM chain. Satchel holds native BTC (a chain without smart contracts), ETH and SOL from one NEP-171 token, with no bridge. And because native-chain signatures can't be re-checked at use time, Satchel ships a clean-history protocol. |
| "That's `nft_key` from NEAR's gas station" | Yes, credited. `nft_key` is a primitive (old MPC API, no sale safety, no wallet). Satchel is the product: wallet UX, BTC/EVM/SOL flows, freeze, cooldown, clean history, locked contract. |
| "Lit PKPs did this" | Lit's NFT PKPs are legacy (v3 is TEE plus API keys), and their permissions survive transfer. Satchel voids delegates on transfer and exposes every issued signature. |
| "Ika has transferable dWallets" | Different chain and trust model. Satchel is a standard NEP-171 token any NEAR wallet can hold, and it addresses pre-signed signatures, which Ika's docs don't. |

## NEAR NFT ecosystem on testnet (P2 item 5): can a Satchel be shown outside our app?

| Venue | Status 2026-10-21 | Usable for Satchel? |
|---|---|---|
| Mintbase (`www.mintbase.xyz`, `testnet.mintbase.xyz`) | HTTP 402 | No |
| Bitte (`bitte.ai`, `wallet.bitte.ai`) | HTTP 402 | No |
| Paras (`paras.id`) | Redirects to `narrativeprotocol.com`; `testnet.paras.id` 502 | No |
| TradePort (`tradeport.xyz/near`) | 404 | No |
| Meteor wallet (`wallet.meteorwallet.app`) | Cloudflare challenge to curl (403) | Unknown, needs a browser test |
| **MyNearWallet testnet** (`testnet.mynearwallet.com`) | 200, live | **Probably yes** (see below) |
| NearBlocks testnet NFT tracker (`testnet.nearblocks.io/nft-tokens`) | 200, but the indexer stopped at block 270,420,307 (2026-09-27) | Only if it catches up |
| FastNear API (`test.api.fastnear.com`) | `/status` sync latency 2.3 s at block 274,091,623; `/v1/account/<id>/nft` lists NFT contracts per holder | Yes, as a curl-able proof for judges |

How MyNearWallet finds and renders NFTs (from its live bundle `index.632befda.js`, 12.1 MB) [VERIFIED by reading; not exercised in a browser]:
- Discovery runs every configured indexer with `Promise.any(...)`, so the **first successful** answer wins. FastNear: `GET ${"https://test.api.fastnear.com/v0"}/account/${id}/nft` → `contract_ids`. NearBlocks: `GET https://api-testnet.nearblocks.io/v1/kitwallet/account/${id}/likelyNFTsFromBlock` → `list` (currently stale, `lastBlockTimestamp` 2026-09-27). If the stale NearBlocks answer arrives first, a new Satchel may not appear. [ASSUMED from code]
- Listing: calls the contract's `nft_tokens_for_owner_set` and, on `MethodNotFound`, falls back to `nft_tokens_for_owner({account_id, from_index, limit})`. Then `getTokenMetadata`, filters out tokens whose `metadata` is falsy, and maps media through `base_uri`.

Recommendations:
- (sdk, P1) Implement NEP-181 `nft_tokens_for_owner` and NEP-177 metadata with non-null `metadata`, a `media` URL (the dynamic SVG card, e.g. `/api/card/<id>.svg`) and a sensible `base_uri`. Emit standard NEP-171 `nft_mint` and `nft_transfer` events so indexers (FastNear) pick tokens up.
- (web or human, P1) On day 2, mint to a fresh testnet account and check MyNearWallet testnet → Collectibles in a browser. Record the result and a screenshot for the README.
- (README, P1) Judge-facing proof that does not depend on any wallet UI: `curl https://test.api.fastnear.com/v1/account/<owner>/nft` → see `satchel.<team>.testnet`, and the RPC `nft_token` call from 00-hackathon-rules.md.
- (scope) A "list on a third-party marketplace" step is not possible on testnet today. Satchel's own `/market` is the only market. Treat "marketplace integrations" (Phase 3) as wallet display plus the `state()` view for future marketplaces.

## Deltas vs plan (near_hackathon.md)

| # | Plan says | Finding | Change |
|---|---|---|---|
| 1 | Phase 0: "Read near/multichain-gas-station-contract `nft_key` for patterns only (old MPC API)." | Done. Still live (`v2.nft.kagi.testnet`, 197 tokens, signer now `v1.signer-prod.testnet`). Useful patterns: use-approvals with `approval_id`, revoke on transfer. Pitfall: owner-checked revoke inside the transfer hook. [VERIFIED] | Borrow the approval pattern for delegates; clear via an internal function; credit it in the README. |
| 2 | B5 "Hidden attack … Mitigation: `sig_log` plus clean history (EVM nonce above every signed nonce; every BTC outpoint in a signed tx spent; SOL signatures expire with their blockhash)." | Incomplete. With `sign_for(payload_hex)` over an opaque 32-byte hash, the checker cannot know what was signed (permits, EIP-712, sighash flags). Prior-art systems with use-time checks don't have this issue; native-key systems never solved it. | `sign_for` takes the preimage and the contract hashes and parses it, or unknown payloads block `buy`. Hand to sec. |
| 3 | B3 S-6/S-7: list → freeze → cooldown → `buy` | ERC-6551's first mitigation is to bind the order to state. | Add `state(token_id)` and `buy(token_id, expected_state)`. Cheap, and it closes the stale-check race. |
| 4 | B4 "Borrowed patterns: Tokenbound's account tab on the NFT page" | Also borrow Tokenbound's lock, state and owner-keyed permissions semantics (validates `delegate_epoch`). | Note it in the design rationale and README. |
| 5 | TL;DR / B1 pitch "an NFT that is a wallet … no bridge" | The concept exists (`nft_key`, Lit PKPs, Ika "transferable dWallets … dWallet marketplace"). The differentiator is the verifiable sale. | Frame the README and video hook around "sell a native-BTC wallet safely", not "first NFT wallet". |
| 6 | B2 Phase 3 "marketplace integrations" | No live NEAR NFT marketplaces (Mintbase/Bitte 402, Paras gone, TradePort 404). | Re-scope to wallet display (NEP-181 + metadata) and the public `state()` view. |
| 7 | Not in plan | `nfts` hint SUB-ACCOUNTS and NEP-616 deterministic accounts suggest other teams will build NEAR-side token-bound accounts. | Optional P2 NEAR-side account per Satchel; otherwise state plainly that Satchel targets native non-NEAR chains. |
| 8 | Not in plan | Illia's ideas list includes a "Private OTC market" (NEAR Intents). Satchel's OTC persona (Dana) aligns. | Mention OTC use in the README's "why it matters". |
| 9 | Not in plan | Shade Agents deprecated (Apr 19, 2026); Bitte offline. | Don't reference them as dependencies. |

## Open questions / human actions
1. **Human or web, by Nov 2:** check in a browser whether MyNearWallet testnet (and Meteor, HOT if they support testnet) shows a freshly minted NEP-171 token with SVG `media` under Collectibles. The curl-level checks can't confirm rendering.
2. **sec decision before Nov 1:** preimage-based `sign_for` versus hash-only. This changes the contract interface and the chainsig.js integration (chains). Also adopt `buy(token_id, expected_state)`.
3. **mpc:** does `nft_key`'s legacy request shape (`payload`, `path`, `key_version`) still work on `v1.signer-prod.testnet`? Only relevant if we want to cite `nft_key` as "still works".
4. Not researched in depth: Ika "future sign" or partial-signature objects, and whether a seller could keep one after transferring a dWallet. Low priority (positioning only).
5. Competitive watch: after Nov 14, skim X posts tagged NEAR HACKATHON for other NFT-wallet entries. Nothing can be checked before submissions open (public counter 0).
