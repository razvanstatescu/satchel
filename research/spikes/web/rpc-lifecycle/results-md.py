# THROWAWAY spike helper: results.jsonl -> markdown table for RESULTS.md
import json, sys
path = sys.argv[1] if len(sys.argv) > 1 else 'results.jsonl'
print('| # | UTC | RPC (submit) | Target | Mode | Submit HTTP | Submit ms | Submit answer | FINAL seen (ms) | Blocks tx→last receipt | Gas burnt (Tgas) | Result | tx |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for i, line in enumerate(open(path), 1):
    r = json.loads(line)
    s = r['submit']; h = r.get('heights', {})
    ans = ''
    if s.get('kind') == 'result':
        ans = f"{s.get('final_execution_status')} / {s.get('status')}"
    elif s.get('kind') == 'hash':
        ans = 'hash'
    elif s.get('kind') == 'error':
        ans = f"{s.get('name') or ''} {s.get('cause') or ''} {s.get('pendingStatus') or ''}".strip() or 'provider error (see log)'
    blocks = (h['maxReceipt'] - h['txIncluded']) if h.get('maxReceipt') and h.get('txIncluded') else ''
    gas = f"{h['totalGasBurnt']/1e12:.2f}" if h.get('totalGasBurnt') else ''
    sig = r.get('signature')
    res = 'signature' if isinstance(sig, dict) and sig.get('big_r') else (json.dumps(sig) if sig is not None else 'never sent' if s.get('http') == 400 else '')
    print(f"| {i} | {r['at'][11:19]} | {r['rpc']} | {r.get('target','mpc')} | `{r['mode']}` | {s.get('http')} | {s.get('ms')} | {ans} | {r.get('finalSeenMs') or ''} | {blocks} | {gas} | {res} | `{r['tx']}` |")
