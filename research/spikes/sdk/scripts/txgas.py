#!/usr/bin/env python3
"""Throwaway: print per-receipt gas, status and logs of a NEAR testnet tx. Usage: txgas.py <hash> <sender>"""
import json, sys, urllib.request
RPC = "https://near-testnet.drpc.org"
h, sender = sys.argv[1], sys.argv[2]
req = {"jsonrpc": "2.0", "id": "1", "method": "EXPERIMENTAL_tx_status",
       "params": {"tx_hash": h, "sender_account_id": sender, "wait_until": "FINAL"}}
r = json.load(urllib.request.urlopen(urllib.request.Request(RPC, json.dumps(req).encode(), {"Content-Type": "application/json", "User-Agent": "curl/8.7.1"})))
if "error" in r: print(r["error"]); sys.exit(1)
res = r["result"]
tot = res["transaction_outcome"]["outcome"]["gas_burnt"]
print(f"tx {h} final_status={list(res['status'].keys())[0]} prepaid={int(res['transaction']['actions'][0].get('FunctionCall',{}).get('gas',0))/1e12 if isinstance(res['transaction']['actions'][0],dict) else '-'}Tgas")
for ro in res["receipts_outcome"]:
    o = ro["outcome"]; tot += o["gas_burnt"]
    st = list(o["status"].keys())[0]
    extra = o["status"].get("Failure", "")
    print(f"  {o['executor_id']:<45} {o['gas_burnt']/1e12:8.3f} Tgas {st} {extra if extra else ''} logs={[l[:140] for l in o['logs']]}")
print(f"  TOTAL gas burnt: {tot/1e12:.3f} Tgas; tokens_burnt(tx)={res['transaction_outcome']['outcome']['tokens_burnt']}")
if "SuccessValue" in res["status"]:
    import base64
    v = base64.b64decode(res["status"]["SuccessValue"]).decode(errors="replace")
    print("  return:", v[:400])
