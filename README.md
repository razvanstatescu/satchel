# Satchel: an NFT that is a wallet

Satchel is a NEP-171 NFT contract on NEAR testnet. Each token controls its own native Bitcoin (testnet4), Ethereum
(Sepolia, plus Base, Arbitrum and OP Sepolia; one address on all four) and Solana (devnet) addresses through NEAR
Chain Signatures. Transfer or sell the NFT and you hand over the
wallet. No bridge, wrapped token or seed phrase changes hands.

Built for NEAR HACKATHON (Nov 1–14, 2026), tracks `nfts` and `open`. **Testnet only: the coins have no value.**

> **Status.** The contract is complete, tested and security-reviewed. The app is live at
> **https://usesatchel.xyz**, reading the development contract `dev2.satchelhq.testnet`. The final contract
> `satchel.satchelhq.testnet` is born keyless on Nov 10; values marked `[TBD: …]` (its code hash **H** and birth
> transaction) do not exist until then, and checks against it report `SKIP` or "account does not
> exist". Nothing in this file is invented.
>
> **Reviewing this repo?** [`AGENTS.md`](AGENTS.md) gives the reading order and maps each claim to its code and
> tests. [Repository map](#repository-map) below; IDs such as `D-43` or `INV-09` are decoded in
> [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

**The problem**
- A wallet's keys cannot be sold safely. Whoever held the seed phrase can keep a copy.
- An NFT that controls keys solves the copy problem: the contract signs only for the current owner. It leaves one
  hole. A signature issued **before** a sale can still be broadcast **after** it.
- A buyer therefore needs proof that no old signature can still move the coins. No existing NFT-wallet design
  provides that (see [Prior art](#prior-art)).

**What Satchel does about it**
- The contract writes a record of every signature **before** it asks the MPC network to sign.
- Signing freezes while a Satchel is listed.
- The buyer's browser checks each record against the three chains ("clean history"), and Buy stays disabled until
  every record is provably spent or expired.

**Built on NEAR:** Chain Signatures (MPC) for the keys; NEP-171, NEP-177, NEP-181 and NEP-297 for the token; NEP-141
for USDC and wNEAR; a keyless sub-account so the code can never change; NEP-330 so the source can be verified. The
details are in [How Satchel uses NEAR](#how-satchel-uses-near).

---

## Try it in 60 seconds (no wallet, no install)

Until Nov 10 the hosted app reads `dev2.satchelhq.testnet`, so its owners and addresses differ from the final ones
quoted below; every page and the JSON API already work. Example today:
`curl -s https://usesatchel.xyz/api/satchels/1` returns `"contract":"dev2.satchelhq.testnet"` with live balances.

| Do | See |
|---|---|
| Open `https://usesatchel.xyz/s/1` | The owner `alice.satchelhq.testnet`, three full addresses (BTC `tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5`, ETH `0xD0CdbF830B82FaBf6aee04D1a2633A51F6b2d5ad`, SOL `AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd`), their live balances, the signature count and "Contract keys: none since birth". The page is server-rendered, so it reads the same with JavaScript off. |
| `curl -s https://usesatchel.xyz/api/satchels/1` | The same facts as JSON: `owner`, `addresses{btc,evm,sol}`, `balances`, `sig_count`, `listing`, `status`. |
| Open `https://usesatchel.xyz/contract` | The lock facts for `satchel.satchelhq.testnet`: "Account is locked (no access keys)", the birth tx `[TBD: birth tx hash]`, the code hash `[TBD: H]` = the expected hash, and the MPC signer's live version. |
| Open `https://usesatchel.xyz/market` | Listed Satchels, each with its clean-history verdict. #4 shows "Blocked: 1 unused signature" ([why](#demo-token-4-is-blocked-on-purpose)). |
| With a testnet wallet (Meteor or Intear): open `/mint` and mint | A new Satchel #8+ appears with three fresh addresses. Fund one from a faucet (BTC: `mempool.space/testnet4/faucet`, ETH: a Sepolia faucet) and use Send. |

The addresses above are derived from `satchel.satchelhq.testnet` and the paths `satchel/1/{btc,evm,sol}`. They were
computed and checked against the MPC's `derived_public_key`. A Satchel's addresses depend only on
(contract id, path), so they never change when the NFT changes hands.

---

## Verify on-chain (copy-paste, read-only)

`tools/judge-snippets.sh` runs every command below and compares the output (`--print` lists them without network).
It needs `bash`, `curl` and `python3`; the near CLI is optional. RPC: dRPC (`near-testnet.drpc.org`), with
`test.rpc.fastnear.com` as fallback. NEAR history: the FastNEAR tx API (`tx.test.fastnear.com`), which keeps old
transactions that non-archival RPC nodes soon forget.

**1. Who owns Satchel #1** (NEP-171 `nft_token`)
```sh
curl -s https://near-testnet.drpc.org -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"call_function","finality":"final","account_id":"satchel.satchelhq.testnet","method_name":"nft_token","args_base64":"eyJ0b2tlbl9pZCI6IjEifQ=="}}' | python3 -c 'import sys,json; d=json.load(sys.stdin); r=d["result"]; print("owner_id =", json.loads(bytes(r["result"]))["owner_id"])'
```
Expected: `owner_id = alice.satchelhq.testnet`

**2. The contract exists, has no access keys, and runs the published code.** An empty key list alone proves nothing,
because a non-existent account also returns `[]`, so this checks `view_account` too:
```sh
for M in view_account view_access_key_list; do curl -s https://near-testnet.drpc.org -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"$M\",\"finality\":\"final\",\"account_id\":\"satchel.satchelhq.testnet\"}}"; echo; done | python3 -c '
import sys,json
A="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
acct,keys=[json.loads(l) for l in sys.stdin if l.strip()]
if "error" in acct: sys.exit("account does not exist")
n=0
for ch in acct["result"]["code_hash"]: n=n*58+A.index(ch)
print("code sha256 =", n.to_bytes(32,"big").hex())
k=keys["result"]["keys"]; print("access keys =", len(k), "(full access:", sum(1 for x in k if x["access_key"]["permission"]=="FullAccess"), ")")'
```
Expected:
```
code sha256 = [TBD: H]
access keys = 0 (full access: 0 )
```
With the near CLI (near-cli-rs): `near account view-account-summary satchel.satchelhq.testnet network-config testnet-fastnear now`
→ `Local Contract (SHA-256 checksum hex)  [TBD: H]` and `Access keys  Account is locked (no access keys)`. Do not
use `near account list-keys`: it prints the same empty table for an account that does not exist.

**3. The birth transaction had no AddKey.** One tx from `satchelhq.testnet` created the account, funded it, deployed
the code, ran `new` and minted #1–#7:
```sh
curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["[TBD: birth tx hash]"]}' | python3 -c '
import sys,json
t=json.load(sys.stdin)["transactions"][0]; tx=t["transaction"]
kinds=[a if isinstance(a,str) else next(iter(a)) for a in tx["actions"]]
print("signer =", tx["signer_id"], "receiver =", tx["receiver_id"])
print("actions =", " ".join(kinds))
print("AddKey actions =", kinds.count("AddKey"))'
```
Expected:
```
signer = satchelhq.testnet receiver = satchel.satchelhq.testnet
actions = CreateAccount Transfer DeployContract FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall
AddKey actions = 0
```

**4. The contract never signed a transaction, delegated (NEP-366) ones included**
```sh
curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.satchelhq.testnet","is_any_signer":true}'
```
Expected: `{"account_txs":[],"txs_count":0}`

**5. There was no earlier account with this id.** Its history starts at the birth tx:
```sh
curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.satchelhq.testnet","desc":false,"limit":1}'
```
Expected: the first entry is `"transaction_hash":"[TBD: birth tx hash]"` at `"tx_block_height":[TBD: block A]`.

**6. The deployed code is this repository's code.** You need Rust (pinned by `rust-toolchain.toml`), cargo-near and
Docker; the build itself runs in the Docker image pinned in `contracts/satchel/Cargo.toml`:
```sh
git checkout contract-v1.0.0
cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml
sha256sum target/near/satchel/satchel.wasm        # Linux
shasum -a 256 target/near/satchel/satchel.wasm    # macOS
```
Expected: `[TBD: H]`, the same hash as in step 2. After the repo is public:
`near contract verify deployed-at satchel.satchelhq.testnet network-config testnet-fastnear now` → "…are the same".

**7. Contract constants and the MPC it depends on**
```sh
curl -s https://near-testnet.drpc.org -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"call_function","finality":"final","account_id":"satchel.satchelhq.testnet","method_name":"config","args_base64":"e30="}}' | python3 -c 'import sys,json; c=json.loads(bytes(json.load(sys.stdin)["result"]["result"])); print("cooldown_blocks =", c["cooldown_blocks"], "mpc =", c["mpc_contract_id"], "evm_chain_ids =", c["evm_chain_ids"])'
curl -s https://near-testnet.drpc.org -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"query","params":{"request_type":"call_function","finality":"final","account_id":"v1.signer-prod.testnet","method_name":"version","args_base64":"e30="}}' | python3 -c 'import sys,json; print("mpc version =", json.loads(bytes(json.load(sys.stdin)["result"]["result"])))'
```
Expected: `cooldown_blocks = 250 mpc = v1.signer-prod.testnet evm_chain_ids = [11155111, 84532, 421614, 11155420]`,
then `mpc version = ` followed by the MPC signer's current version. The MPC network upgrades on its own schedule;
signing is re-checked against each new version with the sign-only scripts in `tools/e2e`. The four EVM testnets
are specified in `docs/specs/C1-C2-C3-C7.md`.

**8. Balances of Satchel #1's addresses** (no NEAR involved)
```sh
curl -s https://mempool.space/testnet4/api/address/tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5 | python3 -c 'import sys,json; s=json.load(sys.stdin)["chain_stats"]; print("confirmed sats =", s["funded_txo_sum"]-s["spent_txo_sum"])'
curl -s https://ethereum-sepolia-rpc.publicnode.com -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad","latest"]}' | python3 -c 'import sys,json; print("wei =", int(json.load(sys.stdin)["result"],16))'
```
Expected: each address's current balance, the same numbers `/s/1` shows.

---

## Run it locally

Prerequisites: Node (version in `.nvmrc`) with pnpm (corepack), plus Rust with the wasm32 target and cargo-near for
the contracts (`rust-toolchain.toml` pins the toolchain). The sandbox suite needs Linux or Apple Silicon.

```sh
pnpm install --frozen-lockfile
pnpm --filter web dev                        # http://localhost:3000, fixture data (no chain reads) by default
NEXT_PUBLIC_DATA_MODE=live pnpm --filter web dev   # live testnet reads; see .env.example for every variable
```

Tests, all offline. Every suite must pass in full; what each one covers is in
[`docs/testing/README.md`](docs/testing/README.md), which also keeps the dated results of each run:

| Command | What it covers |
|---|---|
| `cargo test -p satchel --lib` | Contract unit tests: every guard and refusal, the payload classifiers, the shared vectors in `vectors/*.json` and the parser fuzz properties. A few slow review proofs are `#[ignore]`d; run them with `-- --include-ignored` |
| `cargo test -p satchel-tests` | The sandbox suite: the real contract on a local NEAR node, with a mock MPC signer and a mock USDC. First build the three wasm files: `for c in satchel mock-signer mock-ft; do cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml; done` |
| `pnpm --filter @satchel/core test` | The shared TypeScript library: derivation, transaction builders, the TS mirror of the contract's rules, the clean-history checker, and a browser-bundle check |
| `pnpm --filter @satchel/tools test` | The testnet scripts' dry runs and a check that the shared vectors are up to date |
| `pnpm --filter web test` / `test:e2e` (fixture mode) | The app's unit tests, and Playwright user journeys with accessibility checks |
| `tools/check-wasm-imports.sh` | INV-22: the release wasm cannot add a key, deploy code or delete the account |

CI: `.github/workflows/ci.yml` runs the contract build and tests, the web build and the unit tests.

Testnet scripts (`tools/e2e`, `tools/deploy`) default to a **dry run** that prints exactly what would be signed.
They sign only with `--send` and a typed `yes`, using keys from `~/.near-credentials` (never from the repo).

---

## How it works

```
 owner's wallet ──sign_for(token, structured payload)──► satchel.satchelhq.testnet (keyless, NEP-171)
                                                            1. caller == owner?  token not listed?
                                                            2. classify: EVM type-2 transfer (4 testnets) or a USDC
                                                               transfer │ BTC BIP143 preimages + outputs │ Solana
                                                               legacy transfer │ an EIP-191 or Solana off-chain message
                                                            3. write SigRecord(s) + sign_requested event
                                                            4. MPC sign ×n ──► v1.signer-prod.testnet
 browser ◄── on_signed: one signature per request ◄──────────  (path satchel/{id}/{btc|evm|sol}, one receipt each)
    └── attaches the signature, verifies it, broadcasts ──► Bitcoin testnet4 · Ethereum Sepolia · Solana devnet
```

- **One contract owns every key.** Token N signs at the MPC paths `satchel/N/btc`, `satchel/N/evm` (secp256k1,
  domain 0) and `satchel/N/sol` (ed25519, domain 1), with the contract as the predecessor. Only the current owner can
  call `sign_for` ([`contracts/satchel/src/sign.rs`](contracts/satchel/src/sign.rs)), or an account the owner lets
  spend within a rolling 24-hour cap per coin and network ([`allowance.rs`](contracts/satchel/src/allowance.rs));
  allowances end when the Satchel changes hands. Ownership moves only through `nft_transfer`
  ([`lib.rs`](contracts/satchel/src/lib.rs)), `buy` / `ft_on_transfer` ([`sale.rs`](contracts/satchel/src/sale.rs))
  and `accept_offer` ([`offers.rs`](contracts/satchel/src/offers.rs)).
- **Structured payloads, never hashes.** The contract parses the exact bytes and hashes them itself:
  keccak256 for EVM, sha256d per BTC input, and the raw message for SOL. It accepts only plain ETH and USDC transfers
  on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and plain-text messages, and refuses anything
  else, including raw hashes, EIP-712 permits, EIP-7702 authorizations, any other contract call, other chains, non-ALL
  sighash types and durable nonces ([`contracts/satchel/src/parse/`](contracts/satchel/src/parse)).
- **The record comes before the signature.** It is written in the same receipt as the MPC call, so a signature that
  arrives late or after a timeout is still on record.
- **The sale is bound to the record count.** `list` needs 250 blocks (a couple of minutes) of signing silence. While listed,
  signing and transfers are refused. `buy(token_id, listing_id, expected_sig_count)` fails if anything changed. The
  seller is paid in the same transaction, and a failed payout is credited to `proceeds_of` instead.
- **Clean history** runs in the buyer's browser ([`packages/core/src/clean-history`](packages/core/src/clean-history)).
  EVM: the nonce is used, read 3 blocks back on two providers. BTC: the outpoint is spent in a confirmed tx, read on
  two Esplora providers. SOL: the blockhash is expired.

## What a Satchel can do

Every flow below works in the hosted app; the pages marked **SSR** render their facts in the server HTML (readable
with `curl`). Contract methods are in [`contracts/satchel/src/`](contracts/satchel/src); the sprint features
C1–C7 are specified in [`docs/specs/`](docs/specs/).

| What | App route | Contract |
|---|---|---|
| See a Satchel: owner, addresses, balances, signature count (**SSR**) | `/s/{id}`, `/api/satchels/{id}` | `satchel`, `sig_records` |
| Mint one | `/mint` | `nft_mint` |
| Add coins (anyone can open the link) | `/s/{id}/receive`, `/fund/{id}` | none (addresses are derived) |
| Send BTC, ETH, USDC or SOL; ETH and USDC on Sepolia, Base, Arbitrum and OP Sepolia (C2, C3) | `/s/{id}/send` | `sign_for` |
| Sign a plain-text message: EIP-191 or Solana off-chain (C7) | `/s/{id}/sign` | `sign_for` |
| Give it away, directly or by a claim link (A2) | `/s/{id}/transfer`, `/s/{id}/give-link`, `/claim` | `nft_transfer` |
| Sell it for NEAR or USDC; buy one after the clean-history check (**SSR**) | `/s/{id}/sale`, `/market` | `list`, `delist`, `buy`, `ft_on_transfer`, `withdraw_proceeds` |
| Make, accept or cancel an offer on any Satchel (C4) | `/s/{id}/offer` | `make_offer`, `accept_offer`, `cancel_offer` |
| Let another account spend up to a daily cap (C5) | `/s/{id}/allowance` | `set_allowance`, `revoke_allowance` |
| Hold NEAR, USDC or wNEAR inside the Satchel on NEAR itself (C6) | `/s/{id}/coin/{key}` | `deposit_near`, `ft_on_transfer`, `withdraw_near`, `withdraw_ft` |
| Empty it: send everything to one address per chain (A3) | `/s/{id}/empty` | `sign_for` |
| Read its history: who held it, sales, signatures and what each one signed, coins in and out (C1 adds a digest) | `/s/{id}/activity`, `/s/{id}/transactions` | `sig_records`, `history_digest` |
| Check the contract itself: lock, code hash, MPC version (**SSR**) | `/contract`, `/api/contract` | `config` |

## How Satchel uses NEAR

Everything that gives a Satchel its value happens on NEAR, in one contract: the token, the authority over its keys,
the log of every signature, the sale and the offers. The other chains only see ordinary signed transactions.

| Track hint | How Satchel uses it | Code |
|---|---|---|
| `open` · **CHAIN ABSTRACTION** | NEAR Chain Signatures signs native Bitcoin, Ethereum (four testnets) and Solana transactions for each token. There is no bridge and no wrapped asset | [`sign.rs`](contracts/satchel/src/sign.rs), [`mpc.rs`](contracts/satchel/src/mpc.rs) |
| `nfts` · **NEP-171** | The wallet is an ordinary NEP-171 token (with NEP-177, NEP-181 and NEP-297), so any NEAR wallet or explorer can show it. Transferring it is what hands over the coins | [`lib.rs`](contracts/satchel/src/lib.rs) |
| `nfts` · **DYNAMIC NFTS** | The token's `media` is `https://usesatchel.xyz/api/card/{id}.svg`, drawn from contract state: its status (active, listed or frozen) and how many signatures it has issued | [`api/card`](apps/web/src/app/api/card) |
| `nfts` · **SUB-ACCOUNTS** | The contract is the named sub-account `satchel.satchelhq.testnet`, born from `satchelhq.testnet` in one transaction with no access key | [`keyless-birth.md`](tools/deploy/keyless-birth.md) |
| `open` · **EXPERIMENTAL** | Clean history: signature records written when a signature is requested, signing frozen while a token is listed, a buy bound to the record count, and a verifier that runs in the browser | [`clean-history/`](packages/core/src/clean-history) |

### Chain Signatures: one NEAR contract signs for three chains

- **Whose key it is.** The MPC network behind `v1.signer-prod.testnet` derives a child key from the caller's account and a path. Satchel always calls as the contract itself,
  with the path `satchel/{token_id}/{btc|evm|sol}`. Each token therefore has keys that only this contract can use, and
  the contract uses them only for the token's current owner (or an account the owner allows, within caps).
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
  answer in time fails; on testnet that happens often under load. The record is written in the same receipt that creates the MPC
  calls, before any node signs, so a signature that arrives late is still on record. `on_signed` only fills in the
  result: it reads the raw promise bytes, with a size cap, and never panics.
- **Addresses without a network call.** [`packages/core/src/derive`](packages/core/src/derive/index.ts) reproduces
  the MPC's key derivation (the tweak `sha3_256(… predecessor "," path)` added to the root key), so a page can show
  a Satchel's addresses before anyone signs. The buyer's check also compares them with the MPC's own
  `derived_public_key` view.

### NFT standards

- **NEP-171 core:** `nft_transfer`, `nft_token`. **NEP-177:** metadata. **NEP-181:** enumeration (`nft_tokens`, paged
  by token id). **NEP-297:** events. These are the standard `nft_mint` and `nft_transfer` events plus Satchel's own
  (`standard: "satchel"`): `sign_requested`, `sign_resolved`, `listed`, `sold`, `payout`, offers, allowances, and
  coins held inside a Satchel. The app builds each Satchel's activity page from these events.
- **A transfer hands over the wallet.** When the owner changes, the next `sign_for` must come from the new owner, and
  every allowance the old owner granted ends. Records stay with the token, so the next buyer can audit them too.
- **Left out on purpose:** NEP-178 approvals and `nft_transfer_call` (D-07). Either would let a third party move the
  token outside the sale flow, and only the sale flow ties a purchase to a checked history. `nft_transfer_call` exists and always fails
  with a clear error, so NEP-171 tooling does not get a "method not found".

### Fungible tokens (NEP-141)

`ft_on_transfer` accepts Circle's testnet USDC
(`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`) to buy a listed Satchel, to escrow an offer, or to
deposit USDC into a Satchel. It also accepts wNEAR (`wrap.testnet`) as a deposit. The `msg` must parse as one of a few
strict shapes; anything else is refunded. Withdrawals go out by `ft_transfer`, and a callback credits the amount
back if the transfer fails. NEAR itself can be held inside a Satchel too (`deposit_near`, `withdraw_near`).

### Accounts: a keyless sub-account that cannot change

- **Born without a key.** `satchelhq.testnet` creates `satchel.satchelhq.testnet` in a single transaction of batched
  actions: CreateAccount, Transfer, DeployContract, FunctionCall `new`, and FunctionCall `nft_mint` seven times. There
  is no AddKey action. On NEAR, an account with no access key can never sign a transaction, so nobody can redeploy
  or delete the contract, or move its funds except by its own rules. Anyone can check that with two RPC calls (`view_account` and
  `view_access_key_list`, step 2 above).
- **Safe even if the code has a bug.** near-sdk's `Promise` type links the AddKey, DeployContract and DeleteAccount
  host functions into the wasm. The contract builds its receipts with the low-level `env::promise_batch_*` functions
  instead, using only FunctionCall and Transfer actions. `tools/check-wasm-imports.sh` (INV-22, run in CI) fails if the
  release wasm imports any of the others.
- **Source you can verify (NEP-330).** `contract_source_metadata` names this repository and the standards above. The
  reproducible build (`cargo near build reproducible-wasm`) also records the pinned Docker image and the build command.
  Once the repository is public, `near contract verify` can match the deployed code to it (step 6 above).
- **Access by account, not by key.** Who may sign is decided by `predecessor_account_id`: the token's owner, or a
  delegate within a rolling 24-hour cap per coin (C5). Allowances live in contract state rather than as NEAR access keys,
  which lets the contract end them when the token changes hands.

### Other protocol features the design relies on

- **Storage staking.** Every record, mint, offer and allowance is paid by its caller: the contract measures the bytes
  it actually stored, charges for them and refunds the rest. `prepay_storage` lets an account fund storage before a
  `ft_on_transfer` call, which cannot carry NEAR.
- **Chain time.** Listing needs 250 blocks (a couple of minutes) with no new signature, counted by block height. Allowances
  measure their rolling 24-hour window with the block timestamp.
- **A buy bound to state.** `buy` names the listing id and the record count the buyer checked, and fails if either has
  changed.
- **Payment in the same transaction.** `buy` pays the seller with a Transfer receipt. If the payout fails, the money
  is credited to `proceeds_of` for the seller to withdraw.

### In the app and the tests

- **Wallets:** `@hot-labs/near-connect`, which lists Meteor, Intear and other NEAR wallets.
- **Transactions:** calls are built with near-api-js. The app tracks each transaction by its hash, with the RPC
  `tx` method and `wait_until`, rather than waiting on the wallet's promise. An MPC receipt can take up to two
  minutes.
- **Reads:** FastNEAR RPC, with dRPC (`near-testnet.drpc.org`) as the fallback. History comes from the FastNEAR
  transactions API, which keeps transactions that ordinary RPC nodes soon forget. Every page a judge
  needs renders on the server, so it reads the same with `curl`.
- **Tests:** near-workspaces runs the sandbox suite on a local NEAR node. A mock MPC signer
  ([`contracts/mock-signer`](contracts/mock-signer)) reproduces the real `sign` interface, its yield/resume and its
  timeout, and a mock NEP-141 stands in for USDC. A real testnet run checks the same flow against the live MPC:
  `tools/e2e/{evm,btc,sol}.ts --sign-only`.

## Repository map

| Path | What it is | Start with |
|---|---|---|
| [`contracts/`](contracts/README.md) | The NEP-171 contract (`satchel`) and two sandbox-only test doubles | `contracts/satchel/src/lib.rs`, `sign.rs` |
| [`packages/core/`](packages/core/README.md) | Shared TypeScript: derivation, transaction builders, the TS mirror of the contract's rules, the clean-history checker | `src/clean-history/`, `src/policy/` |
| [`apps/web/`](apps/web/README.md) | The Next.js app at https://usesatchel.xyz | `src/app/` (routes), `src/lib/` |
| [`tests/`](tests/README.md) | Sandbox integration tests (near-workspaces, mock MPC signer and mock FT) | `tests/tests/sign.rs`, `tests/tests/sale.rs` |
| [`vectors/`](vectors/README.md) | Shared vectors that the Rust contract and the TS library both run | |
| [`tools/`](tools/README.md) | Testnet scripts (dry run by default), the keyless-birth runbook, vector generator, fuzzing, judge checks | `judge-snippets.sh` |
| [`docs/`](docs/README.md) | Feature specs, engineering handoffs, security reviews, test audits, UI design | [`docs/README.md`](docs/README.md) |
| [`kb/`](kb/README.md) | The technical specification ([`kb/90`](kb/90-technical-spec.md), source of truth) and the research notes behind it | `kb/90` §3, §5, §7 |
| [`plan/`](plan/README.md) | Internal planning: decisions log (why), task plan, checklists, sprint log | `plan/decisions.md` |
| [`brand/`](brand/README.md) | Visual identity (Satchel 2.0) | |
| [`research/`](research/README.md) | Throwaway Phase-0 spikes and their results; not product code | |
| [`marketing/`](marketing/README.md) | Sources of the demo video; not product code | |

## Selling a Satchel: how control passes, and what stops the seller keeping the coins

### How control passes

Ownership changes in exactly three places: `nft_transfer` (a gift), `buy` (NEAR, or USDC through `ft_on_transfer`)
and `accept_offer`. In the same receipt as the change of owner:
- `sign_for` starts accepting the new owner and stops accepting the old one;
- every allowance the old owner granted is cleared;
- the NEAR, USDC and wNEAR held inside the Satchel move with it;
- the signature records stay with the token, so the next buyer can check them too.

The old owner keeps nothing to sign with. There is no private key to copy: each address is a key the MPC network
derives for (this contract, `satchel/{id}/{chain}`), and the MPC uses it only when the contract asks. There is no
NEP-178 approval and no leftover delegate. And nobody holds a key to the contract itself (it is keyless).

### Threat model: every way we know a seller could try to keep the coins

| The seller tries to… | What stops it | Tested by |
|---|---|---|
| Keep a copy of the private key | No key exists outside the MPC network, and only the contract can ask it to sign for a token | `tests/tests/release.rs` `keyless_birth_batch`; `tools/check-wasm-imports.sh` (INV-22) |
| Keep signing after the sale | `sign_for` accepts only the current owner, or a delegate the current owner added | `tests/tests/transfer.rs` `transfer_moves_control`; `sale.rs` `buy_moves_control`; `usdc.rs` `ft_buy_moves_control` |
| Leave a delegate behind to keep spending | Every change of owner clears the allowances, and a delegate has no owner powers | `tests/tests/allowance.rs` `transfer_clears_allowances`, `sales_clear_allowances`, `delegate_has_no_owner_powers` |
| Sign a transaction before the sale and broadcast it afterwards | Every signature is recorded. The buyer's Buy button stays disabled until each record is provably spent or expired | `packages/core/test/clean-history.test.ts`; demo token #4 ([below](#demo-token-4-is-blocked-on-purpose)) |
| Request a signature, let the MPC time out, and hope it was not recorded | The record is written before the MPC is called, in the same receipt | `tests/tests/sign.rs` `records_written_before_mpc_call`, `timeout_never_sticks` |
| Sign while the Satchel is listed, just before the buyer clicks | Signing is frozen while listed, for the owner and delegates alike; listing needs 250 blocks without a signature | `tests/tests/sale.rs` `quiet_period_and_freeze`, `quiet_period_exact_boundary`; `allowance.rs` `listing_pauses_delegate` |
| Delist, sign, and relist between the buyer's check and the buy | `buy` names the listing id and the record count the buyer checked, and fails if either changed | `tests/tests/sale.rs` `buy_guards` |
| Sign something that is not a plain transfer but moves funds later: a raw hash, an EIP-712 permit, an ERC-20 `approve`, an EIP-7702 delegation, a Solana durable nonce, a Bitcoin sighash other than ALL | The contract parses every payload and refuses all of these | `tests/tests/sign.rs` `refusals_change_nothing_{evm,btc,sol}`; the refused cases in `vectors/*.json`; [`docs/security/fuzzing.md`](docs/security/fuzzing.md) |
| Leave code on the Ethereum address, or hand the Solana account to a program | The buyer's check marks the Satchel unsafe | `packages/core/test/clean-history.test.ts` (the EIP-7702 and Solana-owner cases) |
| Withdraw the coins held inside the Satchel on NEAR once it is listed | Withdrawals are refused while listed, and the balances move with the token | `tests/tests/market.rs` `withdraw_blocked_while_listed`, `transfer_moves_inside`, `buy_moves_inside` |
| Move the token outside the sale, through an approval or `nft_transfer_call` | NEP-178 is not implemented, `nft_transfer_call` always fails, and transfers are refused while listed | `tests/tests/transfer.rs` `no_approvals_surface`, `transfer_call_disabled` |
| Get the contract changed after the sale | Nobody can: the account has no key, and its code cannot deploy code or add a key | `tests/tests/release.rs`; INV-22 |

**Mid-flight cases.**
- A transfer while a signature is still pending completes normally. The signature still lands in the record, which
  names the old owner as the requester (`transfer.rs` `transfer_during_inflight_sign`).
- If paying the seller fails in the middle of a sale, the buyer still gets the Satchel, and the seller's money is
  credited to `proceeds_of` (`sale.rs` `payout_failure_recredit`).

What this does not stop is listed under [What it does not cover](#security-model-and-trust-assumptions) below, for
example a testnet4 reorg.

### Each Satchel's history

`/s/{id}/activity` lists every event in the token's life: minted, given (from and to), listed, sold (to whom and for
how much), and each signature with what it signed. `/s/{id}/transactions` lists the coins that came in and went out
on each chain. The same history is on-chain: `sig_records` returns the signature records, and the `history_digest`
view gives one hash over all of them.

## Security model and trust assumptions

**Clean history: what it checks and what it trusts.**

**What signs.** A Satchel's keys can sign only through `sign_for` on `satchel.satchelhq.testnet`.
- That account was **born without a key**. One transaction (`[TBD: birth tx hash]`, block `[TBD: block A]`) created
  it, deployed the published code, initialized it and minted Satchels #1–#7. That transaction contains no AddKey
  action.
- It still has no access keys (`near account view-account-summary satchel.satchelhq.testnet network-config testnet-fastnear now`
  shows "Account is locked (no access keys)").
- It has never signed a transaction, delegated ones included. The FastNEAR `is_any_signer` query in step 4 returns
  nothing.
- Its history starts at the birth transaction.
- It runs the published code: SHA-256 `[TBD: H]`, reproducible with `cargo near build reproducible-wasm` at tag
  `contract-v1.0.0`. Compare with `shasum -a 256` on macOS or `sha256sum` on Linux.

**What gets recorded.** Before NEAR's MPC network signs anything, `sign_for` records on-chain exactly what is being
signed:
- the Ethereum chain and nonce;
- the Bitcoin coin (outpoint) being spent;
- the Solana blockhash;
- the full text of a signed message.

It accepts only plain ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and
plain-text messages (EIP-191 and Solana off-chain). It refuses everything else: raw hashes, EIP-712 permits, EIP-7702
authorizations, any other contract call, other chains, Bitcoin sighash types other than ALL, and Solana durable nonces.

**What "Clean history" means.** Your browser read every record and found that none can still move funds:
- Ethereum: the nonce was used (3 confirmations), on whichever of the four supported testnets the record names.
- A signed message (EIP-191 or a Solana off-chain message) never blocks: it can never move funds on any chain.
- Bitcoin: the coin was spent in a confirmed transaction, or it never existed. Coins that never existed are excluded
  from the balance you buy.
- Solana: the blockhash expired.

It also checked that the Ethereum address has no delegated code and that the Solana account is a plain wallet.

**What it trusts.**
- The contract does **not** enforce this check, because it cannot see other chains. The app disables Buy until the
  check passes.
- It trusts NEAR's MPC network. A threshold of its nodes could sign anything, and on testnet the MPC contract account
  itself has full-access keys.
- It trusts the data providers it queries (two each for Bitcoin and Ethereum; the UI says when only one answered) and
  the confirmation depth used.

**What it does not cover.**
- Other chains or addresses, and tokens other than USDC.
- Signatures made after you buy.
- Testnet4 reorgs: anyone who mines two difficulty-1 blocks can undo one confirmation on testnet4.
- Coins that another wallet later sends to an outpoint an old signature already spends. The app marks them
  "encumbered". Satchel's own sends cannot create such outpoints, because the app refuses to build any transaction
  whose id an old record already references.

### Demo token #4 is blocked on purpose

Satchel #4's only record is an Ethereum transaction signed with nonce = current + 1 and never broadcast. It cannot be
mined while the current nonce is unused, and only the Satchel's own key (through `sign_for` by the owner) could use
that nonce. The record therefore stays "unused" forever, and #4's listing always shows "Blocked: 1 unused signature".
This is the negative case of the clean-history check. Nobody will ever send from #4.

## Limitations

- **Testnet only**: Bitcoin testnet4, Ethereum Sepolia, Solana devnet and NEAR testnet. There is no mainnet
  deployment, and a mainnet version would need an audit.
- **The MPC is trusted** (see above). If the MPC network changed its `sign` interface, gas floor or deposit, a locked
  Satchel could no longer sign. The contract forwards leftover gas and lets the caller raise the MPC deposit to
  soften this.
- **Confirmation depth is testnet-grade**: BTC K = 1, a disclosed weakness. Mainnet would use K = 6 and EVM `finalized`.
- **v1 scope**: native transfers plus USDC ERC-20 transfers (no SPL), EVM on four testnets (Sepolia, Base Sepolia,
  Arbitrum Sepolia, OP Sepolia), P2WPKH Bitcoin, Solana legacy messages only, and EIP-191/Solana off-chain message
  signing. There are no NEP-178 approvals; delegated signing (allowances, capped and rolling-window) shipped in the
  2026-10-29 sprint, and `nft_transfer_call` is still disabled. The contract can sign Solana transfers; the app shows
  Bitcoin, Ethereum and Solana, including the Solana send flow.
- **The contract is immutable** (keyless). A bug means a new contract with new addresses (`satchel-v2`), and old
  funds stay with v1.
- **If something fails:**
  - *The MPC network is slow or down:* nothing is lost, and the owner signs again later. A request that timed out
    stays on record and counts in the buyer's check like any other signature.
  - *A data provider is down or wrong:* the check asks two providers per chain. If they disagree, the verdict is
    "unknown" and Buy stays disabled; if only one answers, the page says so.
  - *The owner loses their NEAR wallet:* the Satchel and its coins go with it, as with any NFT. There is no admin
    and no recovery key, by design.
  - *The app goes down:* the contract does not depend on it. Anyone can still call the contract directly; the scripts
    in `tools/e2e` show how.
- Screening agents (Claude Code and Codex, Q-017) and `curl` see the server-rendered pages. Wallet flows (mint,
  send, buy) need a testnet wallet. Every on-chain fact also has a read-only command under "Verify on-chain".

## What's next

1. An external audit of the contract and the clean-history checker, then a mainnet deployment with K = 6 and
   finalized EVM reads.
2. SPL token support with its own classifier and "dead record" rule (ERC-20 shipped for USDC in the 2026-10-29 sprint).
3. Third-party NEAR marketplaces. The `history_digest` view (C1) already gives the record count plus one SHA-256 of
   the whole log, so a marketplace can bind its orders to a Satchel's history the same way `buy` does. What remains
   is a sale path for such marketplaces that keeps the freeze and the binding.
4. Sustainability: a small fee on Satchel sales, decided at the mainnet launch.

## Prior art

NEAR's `nft_key` (multichain-gas-station-contract, 2024) showed that an NFT can own a Chain Signatures path, and
House of Stake's Top Level Accounts make a rented NEAR name an NFT that is also an account. Lit PKPs
and Ika dWallets make keys transferable, and ERC-6551 gives NFTs smart-contract accounts on one EVM chain. Satchel
combines native multichain keys with a standard NEP-171 token and adds a buyer-verifiable clean history:
- every signature a Satchel has ever issued is recorded on-chain;
- signing freezes while it is listed;
- the purchase is blocked unless each recorded signature is provably spent or expired.

How it differs:
- vs `nft_key`: a product (wallet UX, BTC/EVM/SOL flows, sale safety) on the current MPC API.
- vs ERC-6551: native multichain. Native-chain signatures cannot be revoked, which is why clean history exists.
- vs Lit and Ika: a standard NEP-171 token on NEAR, and permissions reset on transfer.

## Team

Razvan Statescu, solo builder.

## Timeline

All of this falls inside the hackathon window, which counts code from the announcement on 2026-10-19 (HACKATHON.md
Q-001). Nothing predates it, so there is no baseline.
- **Oct 20–21, 2026: research and design.** This covered research notes, throwaway testnet spikes (kept in
  [`research/`](research/README.md) as evidence; no product code imports them), the technical specification, and the
  Satchel brand, logo and design system.
- **From Oct 21, 2026: implementation** of the code in this repository, written from the specification. No spike file
  was copied.
- The repository was created on 2026-10-29, so its history starts then. Work done before that date is described in
  `plan/progress/` and `docs/handoff/`.

## Libraries, tools and AI (HACKATHON.md Q-005)

- **Contract:** near-sdk, near-contract-standards (NEP-171, NEP-177, NEP-181), cargo-near, and near-workspaces for
  sandbox tests.
- **Web and shared library:** Next.js, React, Tailwind CSS, near-api-js, @hot-labs/near-connect, viem, bitcoinjs-lib,
  @solana/web3.js, and @noble/@scure (hashing, curves, encoding).
- **Fonts:** Funnel Display, Onest and Geist Mono (Google Fonts, OFL).
- **Pinned versions:** exact versions are in `Cargo.lock` and `pnpm-lock.yaml`.
- **No templates or boilerplate repositories were used.**
- **AI:** the code, tests and docs were written with AI coding agents (Claude Code) under the builder's direction. Every
  chunk ships with unit tests and an end-to-end test.

## License

- **Contracts: MIT.** Everything in [`contracts/`](contracts/) (the Satchel contract and its two sandbox test
  doubles) is under the MIT License, see [`contracts/LICENSE`](contracts/LICENSE). Anyone may reuse the contract
  code, including in closed-source work.
- **Everything else: AGPL-3.0-only.** The rest of the repository (the app, the shared TypeScript library, the tools
  and tests, the docs and the other assets) is under the GNU Affero General Public License v3.0, see
  [`LICENSE`](LICENSE). If you run a modified version as a network service, you must offer its source to that
  service's users.
- **Third-party files keep their own licenses:** the copies under `research/**/vendor/`, and the fonts (SIL Open Font
  License 1.1) in `docs/design/`, `marketing/` and the app's generated font files.

The repository stays public through judging (Q-014).
