# How Satchel uses NEAR

> Part of the Satchel docs. Start at the [README](../README.md); a guide for AI reviewers is in [`AGENTS.md`](../AGENTS.md).

Every NEAR feature Satchel relies on, how it is used and where the code is.


Everything that gives a Satchel its value happens on NEAR, in one contract: the token, the authority over its keys,
the log of every signature, the sale and the offers. The other chains only see ordinary signed transactions.

| Track hint | How Satchel uses it | Code |
|---|---|---|
| `open` · **CHAIN ABSTRACTION** | NEAR Chain Signatures signs native Bitcoin, Ethereum (four testnets) and Solana transactions for each token. There is no bridge and no wrapped asset | [`sign.rs`](../contracts/satchel/src/sign.rs), [`mpc.rs`](../contracts/satchel/src/mpc.rs) |
| `nfts` · **NEP-171** | The wallet is an ordinary NEP-171 token (with NEP-177, NEP-181 and NEP-297), so any NEAR wallet or explorer can show it. Transferring it is what hands over the coins | [`lib.rs`](../contracts/satchel/src/lib.rs) |
| `nfts` · **DYNAMIC NFTS** | The token's `media` is `https://usesatchel.xyz/api/card/{id}.svg`, drawn from contract state: its status (active, listed or frozen) and how many signatures it has issued (the card in the README's banner) | [`api/card`](../apps/web/src/app/api/card) |
| `nfts` · **SUB-ACCOUNTS** | The contract is the named sub-account `satchel.satchelhq.testnet`, born from `satchelhq.testnet` in one transaction with no access key | [`keyless-birth.md`](../tools/deploy/keyless-birth.md) |
| `open` · **EXPERIMENTAL** | Clean history: signature records written when a signature is requested, signing frozen while a token is listed, a buy bound to the record count, and a verifier that runs in the browser | [`clean-history/`](../packages/core/src/clean-history) |

## Chain Signatures: one NEAR contract signs for three chains

- **Whose key it is.** The MPC network behind `v1.signer-prod.testnet` derives a child key from the caller's account
  and a path. Satchel always calls as the contract itself, with the path `satchel/{token_id}/{btc|evm|sol}`. Each
  token therefore has keys that only this contract can use, and the contract uses them only for the token's current
  owner (or an account the owner allows, within caps).
- **The request.** `sign_for` sends `sign({request: {path, payload_v2: {Ecdsa | Eddsa}, domain_id}})` to the MPC
  contract. Domain 0 (secp256k1) signs for BTC and EVM, and domain 1 (ed25519) signs for SOL. Each call carries
  exactly 1 yoctoNEAR and at least 15 Tgas, and the contract hands the MPC call whatever gas the caller left over.
- **The contract hashes; the user never sends a hash.** The owner sends the unsigned transaction: an EVM type-2 tx,
  BTC BIP143 preimages with the outputs, or a Solana message. The contract parses it, refuses anything it cannot
  classify, and computes the hash the MPC signs. So the on-chain record says exactly what was signed. A contract that
  signed raw hashes would be a blind signer, and no buyer could audit its history.
- **Several signatures in one call.** A Bitcoin spend with two inputs needs two signatures. Two MPC calls placed as
  separate actions in one transaction both time out, so the contract makes one single-action receipt per payload,
  joins them with `promise_and`, and adds one `#[private]` callback, `on_signed`.
- **Timeouts are normal.** The MPC answers through yield/resume, usually within seconds, and a request it does not
  answer in time fails; on testnet that happens often under load. The record is written in the same receipt that
  creates the MPC calls, before any node signs, so a signature that arrives late is still on record. `on_signed` only
  fills in the result: it reads the raw promise bytes, with a size cap, and never panics.
- **Addresses without a network call.** [`packages/core/src/derive`](../packages/core/src/derive/index.ts) reproduces
  the MPC's key derivation (the tweak `sha3_256(… predecessor "," path)` added to the root key), so a page can show
  a Satchel's addresses before anyone signs. The buyer's check also compares them with the MPC's own
  `derived_public_key` view.

## NFT standards

- **NEP-171 core:** `nft_transfer`, `nft_token`. **NEP-177:** metadata. **NEP-181:** enumeration (`nft_tokens`, paged
  by token id). **NEP-297:** events. These are the standard `nft_mint` and `nft_transfer` events plus Satchel's own
  (`standard: "satchel"`): `sign_requested`, `sign_resolved`, `listed`, `sold`, `payout`, offers, allowances, and
  coins held inside a Satchel. The app builds each Satchel's activity page from these events.
- **A transfer hands over the wallet.** When the owner changes, the next `sign_for` must come from the new owner, and
  every allowance the old owner granted ends. Records stay with the token, so the next buyer can audit them too.
- **Left out on purpose:** NEP-178 approvals and `nft_transfer_call` (D-07). Either would let a third party move the
  token outside the sale flow, and only the sale flow ties a purchase to a checked history. `nft_transfer_call`
  exists and always fails with a clear error, so NEP-171 tooling does not get a "method not found".

## Fungible tokens (NEP-141)

`ft_on_transfer` accepts Circle's testnet USDC
(`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`) to buy a listed Satchel, to escrow an offer, or to
deposit USDC into a Satchel. It also accepts wNEAR (`wrap.testnet`) as a deposit. The `msg` must parse as one of a few
strict shapes; anything else is refunded. Withdrawals go out by `ft_transfer`, and a callback credits the amount
back if the transfer fails. NEAR itself can be held inside a Satchel too (`deposit_near`, `withdraw_near`).

## Accounts: a keyless sub-account that cannot change

- **Born without a key.** `satchelhq.testnet` creates `satchel.satchelhq.testnet` in a single transaction of batched
  actions: CreateAccount, Transfer, DeployContract, FunctionCall `new`, and FunctionCall `nft_mint` seven times. There
  is no AddKey action. On NEAR, an account with no access key can never sign a transaction, so nobody can redeploy
  or delete the contract, or move its funds except by its own rules. Anyone can check that with two RPC calls
  (`view_account` and `view_access_key_list`, step 2 of [Verify on-chain](verify.md)).
- **Safe even if the code has a bug.** near-sdk's `Promise` type links the AddKey, DeployContract and DeleteAccount
  host functions into the wasm. The contract builds its receipts with the low-level `env::promise_batch_*` functions
  instead, using only FunctionCall and Transfer actions. `tools/check-wasm-imports.sh` (INV-22, run in CI) fails if the
  release wasm imports any of the others.
- **Source you can verify (NEP-330).** `contract_source_metadata` names this repository and the standards above. The
  reproducible build (`cargo near build reproducible-wasm`) also records the pinned Docker image and the build command.
  Once the repository is public, `near contract verify` can match the deployed code to it (step 6 of
  [Verify on-chain](verify.md)).
- **Access by account, not by key.** Who may sign is decided by `predecessor_account_id`: the token's owner, or a
  delegate within a rolling 24-hour cap per coin (C5). Allowances live in contract state rather than as NEAR access
  keys, which lets the contract end them when the token changes hands.

## Other protocol features the design relies on

- **Storage staking.** Every record, mint, offer and allowance is paid by its caller: the contract measures the bytes
  it actually stored, charges for them and refunds the rest. `prepay_storage` lets an account fund storage before a
  `ft_on_transfer` call, which cannot carry NEAR.
- **Chain time.** Listing needs 250 blocks (a couple of minutes) with no new signature, counted by block height.
  Allowances measure their rolling 24-hour window with the block timestamp.
- **A buy bound to state.** `buy` names the listing id and the record count the buyer checked, and fails if either has
  changed.
- **Payment in the same transaction.** `buy` pays the seller with a Transfer receipt. If the payout fails, the money
  is credited to `proceeds_of` for the seller to withdraw.

## In the app and the tests

- **Wallets:** `@hot-labs/near-connect`, which lists Meteor, Intear and other NEAR wallets.
- **Transactions:** calls are built with near-api-js. The app tracks each transaction by its hash, with the RPC
  `tx` method and `wait_until`, rather than waiting on the wallet's promise. An MPC receipt can take up to two
  minutes.
- **Reads:** FastNEAR RPC, with dRPC (`near-testnet.drpc.org`) as the fallback. History comes from the FastNEAR
  transactions API, which keeps transactions that ordinary RPC nodes soon forget. Every page a judge needs renders on
  the server, so it reads the same with `curl`.
- **Tests:** near-workspaces runs the sandbox suite on a local NEAR node. A mock MPC signer
  ([`contracts/mock-signer`](../contracts/mock-signer)) reproduces the real `sign` interface, its yield/resume and its
  timeout, and a mock NEP-141 stands in for USDC. A real testnet run checks the same flow against the live MPC:
  `tools/e2e/{evm,btc,sol}.ts --sign-only`.
