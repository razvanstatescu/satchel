# Verify Satchel on-chain (copy-paste, read-only)

> Part of the Satchel docs. Start at the [README](../README.md); a guide for AI reviewers is in [`AGENTS.md`](../AGENTS.md).

Each command reads public chain data; nothing needs a key or a wallet. `tools/judge-snippets.sh` runs them all.
For a live testnet transaction of every Satchel action (mint, gift, sends, list, buy, offers, refusals), see
[docs/evidence/](evidence/README.md); `tools/proofs.sh` verifies them all.


`tools/judge-snippets.sh` runs every command below and compares the output (`--print` lists them without network).
It needs `bash`, `curl` and `python3`; the near CLI is optional. RPC: dRPC (`near-testnet.drpc.org`), with
`test.rpc.fastnear.com` as fallback. NEAR history: the FastNEAR tx API (`tx.test.fastnear.com`), which keeps old
transactions that non-archival RPC nodes soon forget.

The checks run against the release contract, `satchel.satchelhq.testnet`. They also run against a development
contract:

```sh
SATCHEL_CONTRACT=dev2.satchelhq.testnet tools/judge-snippets.sh
```

There the lock checks (2 and 4 below) skip, because a development contract keeps its key, and so do the birth checks
(3 and 5), which belong to the release contract. That token's addresses come from `SATCHEL_BTC_ADDRESS` and
`SATCHEL_EVM_ADDRESS`, or from the app when it serves that contract. Every other value can be overridden too:
`SATCHEL_TOKEN`, `SATCHEL_OWNER`, `SATCHEL_EXPECTED_CODE_HASH`, `SATCHEL_BIRTH_TX`, `SATCHEL_BIRTH_BLOCK`, `SATCHEL_BTC_ADDRESS`,
`SATCHEL_EVM_ADDRESS`, `SATCHEL_APP_URL`, `SATCHEL_RPC` (the full list is in `tools/judge-snippets.sh --help`).

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
code sha256 = 42d12b441f85b3208f97e1b8c6cc7b7ad3198f97d971f5d7651caf749706d8fa
access keys = 0 (full access: 0 )
```
With the near CLI (near-cli-rs): `near account view-account-summary satchel.satchelhq.testnet network-config testnet-fastnear now`
→ `Local Contract (SHA-256 checksum hex)  42d12b441f85b3208f97e1b8c6cc7b7ad3198f97d971f5d7651caf749706d8fa` and `Access keys  Account is locked (no access keys)`. Do not
use `near account list-keys`: it prints the same empty table for an account that does not exist.

**3. The birth transaction had no AddKey.** One tx from `satchelhq.testnet` created the account, funded it, deployed
the code, ran `new` and minted #1–#7:
```sh
curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["2h46feHW4uAAHtYkJvgBRzWUq1jsx1bfxYGXA7Wiq6GL"]}' | python3 -c '
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
Expected: the first entry is `"transaction_hash":"2h46feHW4uAAHtYkJvgBRzWUq1jsx1bfxYGXA7Wiq6GL"` at `"tx_block_height":277053821`.

**6. The deployed code is this repository's code.** You need Rust (pinned by `rust-toolchain.toml`), cargo-near and
Docker; the build itself runs in the Docker image pinned in `contracts/satchel/Cargo.toml`. That image is linux/amd64
only: run it on Linux x86_64. On Apple Silicon it crashes under emulation; use the CI job instead (below).
```sh
git checkout contract-v1.0.0
cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml
sha256sum target/near/satchel/satchel.wasm        # Linux
shasum -a 256 target/near/satchel/satchel.wasm    # macOS
```
Expected: `42d12b441f85b3208f97e1b8c6cc7b7ad3198f97d971f5d7651caf749706d8fa`, the same hash as in step 2. Without an x86_64 machine: the `reproducible` job in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs the same build on every push to `main`, prints the
SHA-256 in its summary and keeps the wasm as an artifact. After the repo is public:
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
