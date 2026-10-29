#!/usr/bin/env python3
"""Free-balance verdict for tools/monitor.sh check [4] (review S-02; spec §5.4). Read-only: it only parses JSON.

    python3 tools/lib/free-balance.py '<view_account JSON-RPC response>' <alert NEAR> <floor NEAR>

free = amount − storage_usage × 1e19 yocto. Prints one line "STATUS message":
  FAIL  free < alert (default 3 NEAR): top the contract up now (a plain transfer from any account works);
        an exhausted balance stops transfers and buys to new holders (S-02)
  WARN  alert ≤ free < floor (default 5 NEAR, the spec's liquidity floor)
  PASS  free ≥ floor
"""
import json
import sys

STORAGE_BYTE_COST = 10**19
YOCTO = 10**24


def verdict(resp: dict, alert: float, floor: float) -> str:
    if "error" in resp:
        cause = resp["error"].get("cause", {}).get("name") if isinstance(resp["error"], dict) else resp["error"]
        return f"FAIL account {cause}"
    if "result" not in resp:
        return "FAIL no RPC answered"
    r = resp["result"]
    amount = int(r["amount"])
    free = (amount - int(r["storage_usage"]) * STORAGE_BYTE_COST) / YOCTO
    status = "FAIL" if free < alert else "WARN" if free < floor else "PASS"
    tail = " - top up the contract now (S-02)" if status == "FAIL" else ""
    return f"{status} free {free:.4f} NEAR (balance {amount / YOCTO:.4f}, storage {r['storage_usage']} B){tail}"


if __name__ == "__main__":
    try:
        resp = json.loads(sys.argv[1])
    except (IndexError, ValueError):
        resp = {}
    print(verdict(resp, float(sys.argv[2]), float(sys.argv[3])))
