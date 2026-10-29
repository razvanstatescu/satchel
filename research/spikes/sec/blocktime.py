# Throwaway: measure NEAR testnet average block time (read-only RPC)
import json, urllib.request
RPC = "https://rpc.testnet.fastnear.com"
def rpc(method, params):
    req = urllib.request.Request(RPC, data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(), headers={"Content-Type":"application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["result"]
now = rpc("block", {"finality": "final"})["header"]
for back in (2000, 20000):
    old = None
    for h in range(now["height"] - back, now["height"] - back + 50):  # skip missing heights
        try:
            old = rpc("block", {"block_id": h})["header"]; break
        except Exception:
            continue
    dh = now["height"] - old["height"]; dt = (now["timestamp"] - old["timestamp"]) / 1e9
    print(f"window {dh} heights: avg {dt/dh:.3f}s/height; 200 heights ~ {200*dt/dh:.0f}s; 210 ~ {210*dt/dh:.0f}s")
print("tip", now["height"], now["timestamp"])
