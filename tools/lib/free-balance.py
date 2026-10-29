#!/usr/bin/env python3
"""Spare-balance verdict for tools/monitor.sh check [4] (review S-02, M-01; spec §5.4, C4-C6 I-M1). Read-only: it
only parses JSON.

    python3 tools/lib/free-balance.py '<view_account response>' <alert NEAR> <floor NEAR> ['<market_totals response>']

free  = amount − storage_usage × 1e19 yocto
spare = free − escrow, where escrow = market_totals().escrow_near (inside NEAR + open NEAR offers + storage credit +
        NEAR proceeds). Escrow belongs to users: only the spare NEAR can pay S-02 storage (M-01), so the verdict is on
        spare. Prints one line "STATUS message":
  FAIL  spare < alert (default 3 NEAR): top the contract up now (a plain transfer from any account works);
        an exhausted buffer makes transfers and buys to new holders fail with ERR_INSOLVENT (M-01)
  WARN  alert ≤ spare < floor (default 5 NEAR, the spec's liquidity floor), or the escrow is unreadable (the verdict
        then falls back to free, which overstates the buffer, so it can never PASS)
  PASS  spare ≥ floor
"""
import json
import sys

STORAGE_BYTE_COST = 10**19
YOCTO = 10**24
ESCROW_PARTS = ("inside_near", "offers_near", "storage_credit", "proceeds_near")


def escrow_of(totals_resp):
    """escrow_near in yocto from a call_function(market_totals) JSON-RPC response, or None if unreadable."""
    try:
        t = json.loads(bytes(totals_resp["result"]["result"]))
        if "escrow_near" in t:
            return int(t["escrow_near"])
        return sum(int(t.get(k, "0")) for k in ESCROW_PARTS)
    except (KeyError, TypeError, ValueError):
        return None


def verdict(resp: dict, alert: float, floor: float, totals_resp=None) -> str:
    if "error" in resp:
        cause = resp["error"].get("cause", {}).get("name") if isinstance(resp["error"], dict) else resp["error"]
        return f"FAIL account {cause}"
    if "result" not in resp:
        return "FAIL no RPC answered"
    r = resp["result"]
    amount = int(r["amount"])
    free = amount - int(r["storage_usage"]) * STORAGE_BYTE_COST
    escrow = escrow_of(totals_resp) if totals_resp is not None else None
    facts = f"balance {amount / YOCTO:.4f}, storage {r['storage_usage']} B"
    if escrow is None:
        status = "FAIL" if free / YOCTO < alert else "WARN"
        tail = " - top up the contract now (S-02)" if status == "FAIL" else ""
        return f"{status} free {free / YOCTO:.4f} NEAR, escrow unknown (market_totals unreadable; {facts}){tail}"
    spare = (free - escrow) / YOCTO
    status = "FAIL" if spare < alert else "WARN" if spare < floor else "PASS"
    tail = " - top up the contract now (S-02, M-01)" if status == "FAIL" else ""
    return f"{status} spare {spare:.4f} NEAR (free {free / YOCTO:.4f} − escrow {escrow / YOCTO:.4f}; {facts}){tail}"


if __name__ == "__main__":
    try:
        resp = json.loads(sys.argv[1])
    except (IndexError, ValueError):
        resp = {}
    totals = None
    if len(sys.argv) > 4:
        try:
            totals = json.loads(sys.argv[4])
        except ValueError:
            totals = {}
    print(verdict(resp, float(sys.argv[2]), float(sys.argv[3]), totals))
