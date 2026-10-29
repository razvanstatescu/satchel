#!/bin/bash
# usage: rpc_view.sh <rpc> <contract> <method> <json-args>
RPC=$1; C=$2; M=$3; ARGS=$4
B64=$(printf '%s' "$ARGS" | base64)
curl -s -X POST "$RPC" -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"$M\",\"args_base64\":\"$B64\"}}" | python3 -c 'import sys,json; r=json.load(sys.stdin); 
res=r.get("result",{}); 
print(bytes(res["result"]).decode() if "result" in res else json.dumps(r)[:800])'
