#!/usr/bin/env bash
# Verify every live proof in docs/evidence/proofs.json (read-only: no keys, no wallet, no transactions).
# Needs bash, curl and python3 (standard library only). Each proof is one real testnet transaction.
#
#   tools/proofs.sh              fetch every transaction and check it: PASS / FAIL / SKIP per proof, exit 1 on any FAIL
#   tools/proofs.sh --print      list every proof, its explorer links, the curl commands and what must hold (no network)
#   tools/proofs.sh --self-test  offline: the crypto checks against known vectors and recorded answers
#   tools/proofs.sh --only id,id check some proofs only        --verbose   show every passing check too
#
# NEAR transactions come from the FastNEAR tx API (tx.test.fastnear.com), which keeps old transactions; the NEAR RPC
# (dRPC, then FastNEAR RPC) is the fallback for recent ones. Sepolia: ethpandaops, 0xrpc, tenderly, publicnode.
# Bitcoin testnet4: mempool.space, then emzy. Solana devnet: api.devnet.solana.com. No API keys. The deprecated
# near.org RPC is never used.
#
# What is checked (tools/lib/proofs.py): the signer, receiver and method; success, or the exact ERR_ code of a refusal
# and the absence of its side effects; the NEP-297 events. For a signature: the contract hashed the bytes it
# recorded itself, and the MPC signature verifies against the Satchel's address (secp256k1 recovery, ed25519). For a
# chain send: the signed record rebuilds exactly the Sepolia / testnet4 / devnet transaction, which exists, comes
# from the Satchel's address and is confirmed.
# Overrides (env vars): SATCHEL_PROOFS (default docs/evidence/proofs.json), SATCHEL_TX_API, SATCHEL_RPC,
# SATCHEL_RPC_FALLBACK, SATCHEL_SEPOLIA_RPCS, SATCHEL_BTC_APIS, SATCHEL_SOL_RPC.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2
PROOFS="${SATCHEL_PROOFS:-docs/evidence/proofs.json}"
PY="tools/lib/proofs.py"
MODE=live
ONLY=()
VERBOSE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --print) MODE=print ;;
    --self-test) MODE=self-test ;;
    --live) MODE=live ;;
    --only) ONLY=(--only "${2:?--only needs a comma list of proof ids}"); shift ;;
    --verbose) VERBOSE=(--verbose) ;;
    -h | --help) sed -n '2,23p' "$0"; exit 0 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
  shift
done

command -v python3 >/dev/null 2>&1 || { echo "python3 is required" >&2; exit 2; }
if [[ "$MODE" == self-test ]]; then exec python3 "$PY" self-test; fi
[[ -f "$PROOFS" ]] || { echo "no $PROOFS (generate it with: pnpm --filter @satchel/tools e2e:proofs --send)" >&2; exit 2; }
if [[ "$MODE" == print ]]; then exec python3 "$PY" print "$PROOFS" ${ONLY[@]+"${ONLY[@]}"}; fi

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 2; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
n=0
# One line per answer to fetch: KEY, then the curl command and its fallbacks. The first usable answer wins.
while IFS=$'\t' read -r -a parts; do
  key="${parts[0]}"
  n=$((n + 1))
  for cmd in "${parts[@]:1}"; do
    bash -c "$cmd" >"$TMP/$key.json" 2>/dev/null
    python3 "$PY" usable "$key" "$TMP/$key.json" && break
    sleep 1
  done
done < <(python3 "$PY" plan "$PROOFS" ${ONLY[@]+"${ONLY[@]}"})
echo "fetched $n answers (FastNEAR tx API, NEAR RPC fallback, Sepolia, testnet4, devnet)"
python3 "$PY" verify "$PROOFS" "$TMP" ${ONLY[@]+"${ONLY[@]}"} ${VERBOSE[@]+"${VERBOSE[@]}"}
