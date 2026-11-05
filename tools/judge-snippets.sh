#!/usr/bin/env bash
# Every README "Verify on-chain" command with its expected output (SAT-102, kb/00 §Judge-runnable commands).
# Read-only: no keys, no transactions. Needs bash, curl and python3. The near CLI is optional.
#
#   tools/judge-snippets.sh --print     print every command and its expected output (no network)
#   tools/judge-snippets.sh --offline   --print + local checks (wasm SHA-256 with sha256sum AND shasum -a 256)
#   tools/judge-snippets.sh             run every snippet read-only against testnet and compare (default --live)
#
# NEAR history comes from the FastNEAR tx API (tx.test.fastnear.com) and RPC queries go to dRPC with the FastNEAR RPC
# as fallback. The deprecated near.org RPC is never used. Override any value with the env vars below.
set -uo pipefail

TEAM="${SATCHEL_TEAM:-satchelhq}"
C="${SATCHEL_CONTRACT:-satchel.${TEAM}.testnet}"
T="${SATCHEL_TOKEN:-1}"
OWNER="${SATCHEL_OWNER:-alice.${TEAM}.testnet}"
BIRTH_TX="${SATCHEL_BIRTH_TX:-[TBD: birth tx hash]}"
H="${SATCHEL_EXPECTED_CODE_HASH:-[TBD: reproducible wasm SHA-256]}"
APP="${SATCHEL_APP_URL:-https://usesatchel.xyz}"
RPC="${SATCHEL_RPC:-https://near-testnet.drpc.org}"
RPC2="${SATCHEL_RPC_FALLBACK:-https://test.rpc.fastnear.com}"
TXAPI="${SATCHEL_TX_API:-https://tx.test.fastnear.com}"
WASM="${SATCHEL_WASM:-target/near/satchel/satchel.wasm}"
# final #1's derived addresses (research/final-addresses.md, live-checked against the MPC on 2026-10-21)
BTC_ADDR="${SATCHEL_BTC_ADDRESS:-tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5}"
EVM_ADDR="${SATCHEL_EVM_ADDRESS:-0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad}"
MPC="v1.signer-prod.testnet"

MODE=live
case "${1:-}" in
  --print) MODE=print ;;
  --offline) MODE=offline ;;
  --live | "") MODE=live ;;
  -h | --help) sed -n '2,12p' "$0"; exit 0 ;;
  *) echo "unknown option $1" >&2; exit 2 ;;
esac

cd "$(dirname "$0")/.." || exit 2
PASS=0; FAIL=0; SKIP=0
tbd() { [[ "$1" == "[TBD:"* ]]; }

# snippet ID TITLE COMMAND EXPECT [NEEDS...]
#   COMMAND is printed exactly as a judge would paste it, then run with bash -c.
#   EXPECT is literal text; every line must appear in the output (the word ANY matches anything).
snippet() {
  local id="$1" title="$2" cmd="$3" expect="$4"; shift 4
  echo
  echo "[$id] $title"
  printf '  $ %s\n' "$cmd"
  echo "$expect" | sed '1s/^/  expect: /;2,$s/^/          /'
  [[ "$MODE" == live ]] || return 0
  for need in "$@"; do
    if tbd "$need"; then echo "  SKIP   ($need)"; SKIP=$((SKIP + 1)); return 0; fi
  done
  local out
  out="$(bash -c "$cmd" 2>&1)"
  echo "$out" | sed 's/^/  got:   /' | head -12
  local ok=1
  while IFS= read -r want; do
    [[ -z "$want" ]] && continue
    grep -Eq -- "$want" <<<"$out" || { ok=0; echo "  missing: $want"; }
  done <<<"$(echo "$expect" | sed 's/[][\.*^$+?(){}|/]/\\&/g; s/ANY/.*/g')"
  if [[ $ok == 1 ]]; then echo "  PASS"; PASS=$((PASS + 1)); else echo "  FAIL"; FAIL=$((FAIL + 1)); fi
}

# Live mode: fall back to the second RPC if the first does not answer a status request.
if [[ "$MODE" == live ]]; then
  code=$(curl -s -m 8 -o /dev/null -w '%{http_code}' "$RPC" -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"status","params":[]}' || true)
  if [[ "$code" != 200 ]]; then echo "note: $RPC answered HTTP $code; using $RPC2"; RPC="$RPC2"; fi
fi

echo "Satchel judge snippets · mode $MODE · contract $C · token $T"
echo "RPC $RPC (fallback $RPC2) · tx API $TXAPI"

ARGS=$(printf '{"token_id":"%s"}' "$T" | base64 | tr -d '\n')

snippet S1 "Who owns Satchel #$T (NEP-171 nft_token)" \
"curl -s $RPC -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"nft_token\",\"args_base64\":\"$ARGS\"}}' | python3 -c 'import sys,json; d=json.load(sys.stdin); \"error\" in d and sys.exit(\"error: \"+str(d[\"error\"].get(\"cause\",{}).get(\"name\"))); r=d[\"result\"]; \"error\" in r and sys.exit(\"error: \"+r[\"error\"][:160]); t=json.loads(bytes(r[\"result\"])); print(\"owner_id =\", t[\"owner_id\"])'" \
"owner_id = $OWNER"

snippet S2 "The contract account exists, has no access keys, and runs the published code (curl + python3)" \
"for M in view_account view_access_key_list; do curl -s $RPC -H 'Content-Type: application/json' -d \"{\\\"jsonrpc\\\":\\\"2.0\\\",\\\"id\\\":1,\\\"method\\\":\\\"query\\\",\\\"params\\\":{\\\"request_type\\\":\\\"\$M\\\",\\\"finality\\\":\\\"final\\\",\\\"account_id\\\":\\\"$C\\\"}}\"; echo; done | python3 -c '
import sys,json
A=\"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz\"
acct,keys=[json.loads(l) for l in sys.stdin if l.strip()]
if \"error\" in acct: sys.exit(\"account does not exist: \"+str(acct[\"error\"].get(\"cause\",{}).get(\"name\")))
n=0
for ch in acct[\"result\"][\"code_hash\"]: n=n*58+A.index(ch)
print(\"code sha256 =\", n.to_bytes(32,\"big\").hex())
k=keys[\"result\"][\"keys\"]; print(\"access keys =\", len(k), \"(full access:\", sum(1 for x in k if x[\"access_key\"][\"permission\"]==\"FullAccess\"), \")\")'" \
"code sha256 = $H
access keys = 0 (full access: 0 )" "$H"

if command -v near >/dev/null 2>&1 || [[ "$MODE" != live ]]; then
snippet S3 "Same lock check with the near CLI (near-cli-rs 0.30.1; fails if the account does not exist)" \
"near account view-account-summary $C network-config testnet-fastnear now" \
"Local Contract (SHA-256 checksum hex) ANY $H
Account is locked (no access keys)" "$H"
fi

snippet S4 "The birth transaction: one tx created, funded, deployed, initialized and minted, with no AddKey" \
"curl -s -X POST $TXAPI/v0/transactions -H 'content-type: application/json' -d '{\"tx_hashes\":[\"$BIRTH_TX\"]}' | python3 -c '
import sys,json
t=json.load(sys.stdin)[\"transactions\"][0]; tx=t[\"transaction\"]
kinds=[a if isinstance(a,str) else next(iter(a)) for a in tx[\"actions\"]]
print(\"signer =\", tx[\"signer_id\"], \"receiver =\", tx[\"receiver_id\"])
print(\"actions =\", \" \".join(kinds))
print(\"AddKey actions =\", kinds.count(\"AddKey\"))
print(\"block =\", t[\"execution_outcome\"][\"block_height\"])'" \
"signer = $TEAM.testnet receiver = $C
actions = CreateAccount Transfer DeployContract FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall FunctionCall
AddKey actions = 0" "$BIRTH_TX"

snippet S5 "The contract never signed a transaction, delegated ones included (FastNEAR is_any_signer)" \
"curl -s -X POST $TXAPI/v0/account -H 'content-type: application/json' -d '{\"account_id\":\"$C\",\"is_any_signer\":true}'" \
'"account_txs":[]
"txs_count":0'

snippet S6 "Its history starts at the birth tx (no earlier incarnation of the id)" \
"curl -s -X POST $TXAPI/v0/account -H 'content-type: application/json' -d '{\"account_id\":\"$C\",\"desc\":false,\"limit\":1}' | python3 -c 'import sys,json; t=json.load(sys.stdin)[\"account_txs\"][0]; print(\"oldest tx =\", t[\"transaction_hash\"], \"block\", t[\"tx_block_height\"])'" \
"oldest tx = $BIRTH_TX block" "$BIRTH_TX"

CFG_ARGS=$(printf '{}' | base64 | tr -d '\n')
snippet S7 "Contract constants: 250-block quiet period, the MPC signer, 4 EVM testnets (config view; sprint 2026-10-29, C3)" \
"curl -s $RPC -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"config\",\"args_base64\":\"$CFG_ARGS\"}}' | python3 -c 'import sys,json; d=json.load(sys.stdin); \"error\" in d and sys.exit(\"error: \"+str(d[\"error\"].get(\"cause\",{}).get(\"name\"))); r=d[\"result\"]; \"error\" in r and sys.exit(\"error: \"+r[\"error\"][:160]); c=json.loads(bytes(r[\"result\"])); print(\"cooldown_blocks =\", c[\"cooldown_blocks\"]); print(\"mpc =\", c[\"mpc_contract_id\"]); print(\"evm_chain_ids =\", c[\"evm_chain_ids\"])'" \
"cooldown_blocks = 250
mpc = $MPC
evm_chain_ids = [11155111, 84532, 421614, 11155420]"

snippet S8 "The MPC signer version the contract depends on" \
"curl -s $RPC -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$MPC\",\"method_name\":\"version\",\"args_base64\":\"$CFG_ARGS\"}}' | python3 -c 'import sys,json; print(\"mpc version =\", json.loads(bytes(json.load(sys.stdin)[\"result\"][\"result\"])))'" \
"mpc version = 3.ANY"

snippet S9 "Satchel #$T's state: how many signatures it has issued, and whether it is listed (satchel view)" \
"curl -s $RPC -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"satchel\",\"args_base64\":\"$ARGS\"}}' | python3 -c 'import sys,json; d=json.load(sys.stdin); \"error\" in d and sys.exit(\"error: \"+str(d[\"error\"].get(\"cause\",{}).get(\"name\"))); r=d[\"result\"]; \"error\" in r and sys.exit(\"error: \"+r[\"error\"][:160]); s=json.loads(bytes(r[\"result\"])); print(\"sig_count =\", s[\"sig_count\"], \"listed =\", s[\"listing\"] is not None)'" \
"sig_count = ANY listed = "

snippet S10 "The app's JSON for Satchel #$T (server-rendered data, no wallet)" \
"curl -s $APP/api/satchels/$T | python3 -c 'import sys,json; s=json.load(sys.stdin); print(\"owner =\", s[\"owner\"]); print(\"contract =\", s[\"contract\"]); print(\"btc =\", s[\"addresses\"][\"btc\"])'" \
"owner = $OWNER
contract = $C
btc = $BTC_ADDR" "$APP"

snippet S11 "Bitcoin testnet4 balance of Satchel #1's address (mempool.space API)" \
"curl -s https://mempool.space/testnet4/api/address/$BTC_ADDR | python3 -c 'import sys,json; s=json.load(sys.stdin)[\"chain_stats\"]; print(\"confirmed sats =\", s[\"funded_txo_sum\"]-s[\"spent_txo_sum\"])'" \
"confirmed sats = "

snippet S12 "Sepolia ETH balance of Satchel #1's address (public JSON-RPC)" \
"curl -s https://ethereum-sepolia-rpc.publicnode.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getBalance\",\"params\":[\"$EVM_ADDR\",\"latest\"]}' | python3 -c 'import sys,json; print(\"wei =\", int(json.load(sys.stdin)[\"result\"],16))'" \
"wei = "

echo
echo "[S13] Rebuild the contract and compare the hash (needs Rust 1.93 + cargo-near 0.22.0 + Docker)"
echo "    \$ git checkout contract-v1.0.0 && cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml"
echo "    \$ sha256sum $WASM          # Linux"
echo "    \$ shasum -a 256 $WASM      # macOS"
echo "  expect: $H  $WASM"
if [[ "$MODE" != print ]]; then
  if [[ -f "$WASM" ]]; then
    a=""; b=""
    command -v sha256sum >/dev/null 2>&1 && a=$(sha256sum "$WASM" | cut -d' ' -f1) && echo "  sha256sum     $a  (local build)"
    command -v shasum >/dev/null 2>&1 && b=$(shasum -a 256 "$WASM" | cut -d' ' -f1) && echo "  shasum -a 256 $b  (local build)"
    if [[ -n "$a" && -n "$b" && "$a" != "$b" ]]; then echo "  FAIL   the two tools disagree"; FAIL=$((FAIL + 1)); fi
    if tbd "$H"; then echo "  INFO   H is not published yet; a host (non-reproducible) build will differ from H anyway"
    elif [[ "${a:-$b}" == "$H" ]]; then echo "  PASS   local wasm == H"; PASS=$((PASS + 1))
    else echo "  INFO   local wasm != H (expected unless this is the reproducible artifact at tag contract-v1.0.0)"; fi
  else echo "  SKIP   $WASM not built"; fi
fi

echo
echo "[S14] Offline tests (no keys, no network once dependencies are fetched)"
echo "    \$ cargo test -p satchel --lib                    # expect: test result: ok (0 failed)"
echo "    \$ pnpm install --frozen-lockfile && pnpm --filter @satchel/core test && pnpm --filter @satchel/tools test   # expect: all pass"
echo "    \$ cargo test -p satchel-tests                    # sandbox suite, Linux or Apple Silicon; expect: all pass"

echo
if [[ "$MODE" == live ]]; then
  echo "summary: $PASS pass · $FAIL fail · $SKIP skip ([TBD] values are skipped until they exist)"
  [[ $FAIL == 0 ]] || exit 1
else
  echo "summary: printed (mode $MODE); run without flags for the live read-only checks"
  [[ $FAIL == 0 ]] || exit 1
fi
