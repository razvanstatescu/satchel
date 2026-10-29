# THROWAWAY spike helper: print a compact table of results.jsonl
import json, sys
path = sys.argv[1] if len(sys.argv) > 1 else 'results.jsonl'
for line in open(path):
    r = json.loads(line)
    h = r.get('heights', {})
    sub = r['submit']
    subtxt = f"http={sub.get('http')} {sub.get('ms')}ms {sub.get('kind')}"
    if sub.get('kind') == 'error':
        subtxt += f" {sub.get('name')}/{sub.get('cause')} pending={sub.get('pendingStatus')}"
    elif sub.get('kind') == 'result':
        subtxt += f" {sub.get('final_execution_status')}|{sub.get('status')}"
    blocks = None
    if h.get('txIncluded') and h.get('maxReceipt'):
        blocks = h['maxReceipt'] - h['txIncluded']
    sig = r.get('signature')
    sigtxt = 'sig' if isinstance(sig, dict) and sig.get('big_r') else (json.dumps(sig)[:60] if sig else '-')
    print(f"{r['at'][11:19]} {r['rpc']:<9} {r.get('target','mpc'):<5} {r['mode']:<28} submit[{subtxt}] FINAL@{r.get('finalSeenMs')}ms blocks(tx->last)={blocks} gas={h.get('totalGasBurnt')} {sigtxt} tx={r['tx']}")
    if '-v' in sys.argv:
        for p in r['poll']:
            print('     poll', p)
