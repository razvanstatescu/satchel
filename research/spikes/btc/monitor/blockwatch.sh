#!/bin/bash
# Throwaway: log testnet4 tip every 60s to measure block cadence (wall clock vs header timestamps).
B=https://mempool.space/testnet4/api
OUT="$(dirname "$0")/blockwatch.log"
LAST=""
END=$(( $(date +%s) + ${1:-14400} ))
while [ "$(date +%s)" -lt "$END" ]; do
  H=$(curl -s --max-time 20 "$B/blocks/tip/hash")
  if [ -n "$H" ] && [ "$H" != "$LAST" ]; then
    J=$(curl -s --max-time 20 "$B/block/$H")
    M=$(curl -s --max-time 20 "$B/mempool" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["count"],d["vsize"])' 2>/dev/null)
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $(date +%s) $(echo "$J" | python3 -c 'import json,sys;b=json.load(sys.stdin);print(b["height"],b["tx_count"],b["timestamp"],round(b["difficulty"]),b["id"])' 2>/dev/null) mempool=$M" >> "$OUT"
    LAST="$H"
  fi
  sleep 60
done
