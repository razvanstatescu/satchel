#!/usr/bin/env bash
# Read-only daily keep-alive checks, Nov 14–19 (plan §5.5, SAT-103). No keys and no transactions: it only reads.
#
#   tools/monitor.sh             run every check and print PASS / WARN / FAIL / SKIP (exit 1 on any FAIL)
#   tools/monitor.sh --offline   list the checks without touching the network
#   tools/monitor.sh --quick     skip tools/judge-snippets.sh (only the monitor's own checks)
#
# Checks:
#   1. every README command (tools/judge-snippets.sh, live)
#   2. /s/1, /contract and /market no-JS HTML: the facts are present and outside hidden elements
#   3. /api/satchels/1 and /api/contract return JSON
#   4. the contract's spare NEAR: free balance (amount − storage_usage × 1e19) − market_totals.escrow_near: FAIL (alert) < 3 NEAR, WARN < 5 NEAR (S-02, M-01)
#   5. the MPC version() is one whose `sign` interface was checked live (3.17.0, 3.18.0)
#   6. the near-connect wallet manifest is unchanged (R-34): compare with SATCHEL_MANIFEST_SHA256
#   7. the endpoints are up: dRPC, FastNEAR RPC and tx API, mempool.space/emzy testnet4, Sepolia, Solana devnet
#   8. NearBlocks freshness (info only, D-10)
# Results go to the human. Nothing here writes to the repo.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

TEAM="${SATCHEL_TEAM:-satchelhq}"
C="${SATCHEL_CONTRACT:-satchel.${TEAM}.testnet}"
APP="${SATCHEL_APP_URL:-https://usesatchel.xyz}"
OWNER="${SATCHEL_OWNER:-alice.${TEAM}.testnet}"
H="${SATCHEL_EXPECTED_CODE_HASH:-42d12b441f85b3208f97e1b8c6cc7b7ad3198f97d971f5d7651caf749706d8fa}"
RPC="${SATCHEL_RPC:-https://near-testnet.drpc.org}"
RPC2="${SATCHEL_RPC_FALLBACK:-https://test.rpc.fastnear.com}"
TXAPI="${SATCHEL_TX_API:-https://tx.test.fastnear.com}"
BTC_ADDR="${SATCHEL_BTC_ADDRESS:-tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5}"
EVM_ADDR="${SATCHEL_EVM_ADDRESS:-0xd0cdbf830b82fabf6aee04d1a2633a51f6b2d5ad}"
SOL_ADDR="${SATCHEL_SOL_ADDRESS:-AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd}"
MIN_LIQUID_NEAR="${SATCHEL_MIN_LIQUID_NEAR:-5}"   # spec §5.4 liquidity floor: below it → WARN
ALERT_LIQUID_NEAR="${SATCHEL_ALERT_LIQUID_NEAR:-3}" # review S-02: below it → FAIL (top the contract up: anyone can)
MANIFEST_URL="${SATCHEL_MANIFEST_URL:-https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json}"
MANIFEST_SHA="${SATCHEL_MANIFEST_SHA256:-}"
MPC="v1.signer-prod.testnet"

MODE=live; QUICK=0
for a in "$@"; do
  case "$a" in
    --offline) MODE=offline ;;
    --quick) QUICK=1 ;;
    -h | --help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option $a" >&2; exit 2 ;;
  esac
done

PASS=0; WARN=0; FAIL=0; SKIP=0
res() { # STATUS MESSAGE
  printf '  %-4s  %s\n' "$1" "$2"
  case "$1" in PASS) PASS=$((PASS + 1)) ;; WARN) WARN=$((WARN + 1)) ;; FAIL) FAIL=$((FAIL + 1)) ;; SKIP) SKIP=$((SKIP + 1)) ;; esac
}
tbd() { [[ "$1" == "[TBD:"* ]]; }
rpc() { # METHOD PARAMS_JSON → body on stdout (dRPC, then the FastNEAR RPC)
  local body
  for u in "$RPC" "$RPC2"; do
    body=$(curl -s -m 15 "$u" -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}") && [[ "$body" == *'"result"'* || "$body" == *'"error"'* ]] && { echo "$body"; return 0; }
  done
  return 1
}

echo "Satchel monitor · $(date -u +%FT%TZ) · mode $MODE · contract $C · app $APP"
if [[ "$MODE" == offline ]]; then
  sed -n '9,17p' "$0" | sed 's/^#/ /'
  echo "  (offline: nothing was fetched)"
  exit 0
fi

echo; echo "[1] README commands (tools/judge-snippets.sh)"
if [[ $QUICK == 1 ]]; then res SKIP "--quick"
else
  out=$(bash tools/judge-snippets.sh 2>&1); code=$?
  summary=$(grep '^summary:' <<<"$out")
  if [[ $code == 0 ]]; then res PASS "$summary"; else res FAIL "$summary"; grep -B1 '^  FAIL' <<<"$out" | grep '^\[' | sed 's/^/        /'; fi
fi

echo; echo "[2] No-JS HTML of the judge pages"
visible_check() { # URL FACT...
  local url="$1"; shift
  local html
  html=$(curl -s -m 20 -L "$url") || { res FAIL "$url unreachable"; return 1; }
  python3 tools/lib/visible-facts.py "$@" <<<"$html"
}
if tbd "$APP"; then res SKIP "app URL not set (SATCHEL_APP_URL)"
else
  for page in "/s/1|$OWNER|$BTC_ADDR|$EVM_ADDR|$SOL_ADDR" "/contract|$C|Account is locked (no access keys)|MPC version" "/market|Listed|Clean history"; do
    IFS='|' read -r path f1 f2 f3 f4 <<<"$page"
    facts=("$f1"); [[ -n "${f2:-}" ]] && facts+=("$f2"); [[ -n "${f3:-}" ]] && facts+=("$f3"); [[ -n "${f4:-}" ]] && facts+=("$f4")
    tbd "$H" || [[ "$path" == "/market" ]] || facts+=("$H")
    if visible_check "$APP$path" "${facts[@]}"; then res PASS "$path shows its facts without JS"; else res FAIL "$path is missing facts (or they are hidden)"; fi
  done
fi

echo; echo "[3] JSON endpoints"
if tbd "$APP"; then res SKIP "app URL not set"
else
  for path in /api/satchels/1 /api/contract; do
    if curl -s -m 20 "$APP$path" | python3 -c 'import sys,json; json.load(sys.stdin)' 2>/dev/null; then res PASS "$path is valid JSON"; else res FAIL "$path is not JSON"; fi
  done
fi

echo; echo "[4] Contract spare NEAR = free balance − escrow (alert < $ALERT_LIQUID_NEAR NEAR, floor $MIN_LIQUID_NEAR NEAR)"
acct=$(rpc query "{\"request_type\":\"view_account\",\"finality\":\"final\",\"account_id\":\"$C\"}") || acct=""
# M-01: escrow (inside NEAR, NEAR offers, storage credit, NEAR proceeds) is the users'; only the rest pays S-02 storage
totals=$(rpc query "{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"market_totals\",\"args_base64\":\"e30=\"}") || totals=""
line=$(python3 tools/lib/free-balance.py "${acct:-{\}}" "$ALERT_LIQUID_NEAR" "$MIN_LIQUID_NEAR" "${totals:-{\}}" 2>/dev/null || echo "FAIL no RPC answered")
res "${line%% *}" "${line#* }"

echo; echo "[5] MPC version"
v=$(rpc query "{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$MPC\",\"method_name\":\"version\",\"args_base64\":\"e30=\"}" | python3 -c 'import sys,json; print(json.loads(bytes(json.load(sys.stdin)["result"]["result"])))' 2>/dev/null)
if [[ "$v" == "3.17.0" || "$v" == "3.18.0" ]]; then res PASS "$MPC version $v"; else res FAIL "$MPC version '${v:-unreadable}' (expected 3.17.0 or 3.18.0; A-01)"; fi

echo; echo "[6] near-connect wallet manifest (R-34)"
sha=$(curl -s -m 20 "$MANIFEST_URL" | { command -v sha256sum >/dev/null && sha256sum || shasum -a 256; } | cut -d' ' -f1)
if [[ -z "$MANIFEST_SHA" ]]; then res WARN "manifest sha256 $sha (set SATCHEL_MANIFEST_SHA256 to this value to detect changes)"
elif [[ "$sha" == "$MANIFEST_SHA" ]]; then res PASS "manifest unchanged ($sha)"
else res WARN "manifest CHANGED: $sha != $MANIFEST_SHA (re-test Meteor and Intear)"; fi

echo; echo "[7] Endpoints"
probe() { # NAME CMD EXPECT_SUBSTRING
  local out; out=$(bash -c "$2" 2>/dev/null)
  if [[ "$out" == *"$3"* ]]; then res PASS "$1"; else res FAIL "$1 (got: ${out:0:80})"; fi
}
probe "dRPC NEAR testnet status" "curl -s -m 10 $RPC -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"status\",\"params\":[]}'" '"chain_id":"testnet"'
probe "FastNEAR NEAR RPC status" "curl -s -m 10 $RPC2 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"status\",\"params\":[]}'" '"chain_id":"testnet"'
probe "FastNEAR tx API" "curl -s -m 10 -X POST $TXAPI/v0/account -H 'content-type: application/json' -d '{\"account_id\":\"$MPC\",\"limit\":1}'" '"account_txs"'
probe "mempool.space testnet4 (genesis guard)" "curl -s -m 10 https://mempool.space/testnet4/api/block-height/0" '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043'
probe "mempool.emzy.de testnet4 (genesis guard)" "curl -s -m 10 https://mempool.emzy.de/testnet4/api/block-height/0" '00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043'
probe "Sepolia publicnode (chainId 0xaa36a7)" "curl -s -m 10 https://ethereum-sepolia-rpc.publicnode.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}'" '0xaa36a7'
probe "Sepolia ethpandaops (chainId 0xaa36a7)" "curl -s -m 10 https://rpc.sepolia.ethpandaops.io -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}'" '0xaa36a7'
probe "Solana devnet getHealth" "curl -s -m 10 https://api.devnet.solana.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}'" '"ok"'

echo; echo "[8] NearBlocks testnet freshness (info; FastNEAR is the canonical proof, D-10)"
nb=$(curl -s -m 15 https://api-testnet.nearblocks.io/v1/blocks/latest?limit=1 | python3 -c 'import sys,json; print(json.load(sys.stdin)["blocks"][0]["block_height"])' 2>/dev/null)
head_h=$(rpc block '{"finality":"final"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["header"]["height"])' 2>/dev/null)
if [[ -n "$nb" && -n "$head_h" ]]; then
  lag=$((head_h - nb)); if (( lag < 3000 )); then res PASS "NearBlocks at $nb, chain at $head_h (lag $lag blocks)"; else res WARN "NearBlocks at $nb, chain at $head_h: $lag blocks behind (≈ $((lag * 56 / 100 / 3600)) h); keep using FastNEAR proofs"; fi
else res WARN "NearBlocks or RPC height unreadable"; fi

echo
echo "summary: $PASS pass · $WARN warn · $FAIL fail · $SKIP skip"
[[ $FAIL == 0 ]]
