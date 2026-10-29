#!/bin/bash
# Throwaway: retry CypherFaucet testnet4 claim every 10 min (max 18 tries = 3h); stop on success.
OUT="$(dirname "$0")/faucet-retry.log"
ADDR=${1:-tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a}
for i in $(seq 1 18); do
  R=$(curl -s -m 100 -X POST https://cypherfaucet.com/api/v1/claim -H 'Content-Type: application/json' -d "{\"network\":\"btc-testnet\",\"address\":\"$ADDR\"}")
  echo "$(date -u +%FT%TZ) try=$i $R" >> "$OUT"
  if echo "$R" | grep -q '"ok":true'; then echo "SUCCESS $R"; exit 0; fi
  if echo "$R" | grep -q 'rate_limited'; then echo "RATE_LIMITED $R"; exit 2; fi
  sleep 600
done
echo "GAVE_UP"; exit 1
