#!/bin/bash
# THROWAWAY: probe keyless Sepolia RPCs: chainId, latency, CORS preflight, 20-request burst.
ORIGIN="https://satchel-test.vercel.app"
URLS=(
  https://ethereum-sepolia-rpc.publicnode.com
  https://sepolia.drpc.org
  https://1rpc.io/sepolia
  https://rpc.sepolia.org
  https://rpc2.sepolia.org
  https://11155111.rpc.thirdweb.com
  https://sepolia.gateway.tenderly.co
  https://gateway.tenderly.co/public/sepolia
  https://endpoints.omniatech.io/v1/eth/sepolia/public
  https://rpc.sepolia.ethpandaops.io
  https://eth-sepolia.api.onfinality.io/public
  https://api.zan.top/eth-sepolia
  https://0xrpc.io/sep
  https://ethereum-sepolia.rpc.subquery.network/public
  https://eth-sepolia.public.blastapi.io
  https://sepolia.rpc.grove.city/v1/01fdb492
  https://rpc.ankr.com/eth_sepolia
  https://eth-sepolia.g.alchemy.com/v2/demo
)
BODY='{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
for u in "${URLS[@]}"; do
  cid=$(curl -s -m 8 -X POST "$u" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' | head -c 200)
  t=$(curl -s -m 8 -o /dev/null -w '%{http_code} %{time_total}' -X POST "$u" -H 'content-type: application/json' -d "$BODY")
  bn=$(curl -s -m 8 -X POST "$u" -H 'content-type: application/json' -d "$BODY" | head -c 120)
  cors=$(curl -s -m 8 -o /dev/null -D - -X OPTIONS "$u" -H "Origin: $ORIGIN" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' | grep -i '^access-control-allow-origin' | tr -d '\r' | head -1)
  ok=0; fail=0; codes=""
  for i in $(seq 1 20); do
    c=$(curl -s -m 8 -o "${SCRATCH:-.}/burst.$$" -w '%{http_code}' -X POST "$u" -H 'content-type: application/json' -d "$BODY")
    if [ "$c" = "200" ] && grep -q '"result"' "${SCRATCH:-.}/burst.$$"; then ok=$((ok+1)); else fail=$((fail+1)); codes="$codes $c"; fi
  done
  rm -f "${SCRATCH:-.}/burst.$$"
  echo "URL=$u"
  echo "  chainId=$cid"
  echo "  blockNumber=$bn  http+time=$t"
  echo "  CORS: ${cors:-<none>}"
  echo "  burst20: ok=$ok fail=$fail codes:$codes"
done
