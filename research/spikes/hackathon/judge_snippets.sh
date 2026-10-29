# --- snippet 1: who owns token X (NEP-171 nft_token), curl + python3 only
RPC=https://near-testnet.drpc.org   # fallback: https://test.rpc.fastnear.com
C=nft.examples.testnet; T=TYPE_A_UNIQUE_VALUE_HERE
ARGS=$(printf '{"token_id":"%s"}' "$T" | base64)
curl -s $RPC -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"final\",\"account_id\":\"$C\",\"method_name\":\"nft_token\",\"args_base64\":\"$ARGS\"}}" \
| python3 -c 'import sys,json; r=json.load(sys.stdin)["result"]; t=json.loads(bytes(r["result"])); print("owner_id =", t["owner_id"])'
# --- snippet 2: contract exists, which code it runs, and how many access keys it has
for M in view_account view_access_key_list; do
curl -s $RPC -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"$M\",\"finality\":\"final\",\"account_id\":\"$C\"}}"; echo; done \
| python3 -c '
import sys,json
A="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
acct,keys=[json.loads(l) for l in sys.stdin if l.strip()]
if "error" in acct: sys.exit("account does not exist: "+acct["error"]["data"])
n=0
for ch in acct["result"]["code_hash"]: n=n*58+A.index(ch)
print("code sha256 =", n.to_bytes(32,"big").hex())
k=keys["result"]["keys"]; print("access keys =", len(k), "(full access:", sum(1 for x in k if x["access_key"]["permission"]=="FullAccess"), ")")'
