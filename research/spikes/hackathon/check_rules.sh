#!/usr/bin/env bash
# Throwaway helper: re-fetch the live hackathon rules and diff them against the
# 2026-10-21 snapshots. Read-only (GET requests only). Run before the submission.
# Usage: ./check_rules.sh
set -euo pipefail
cd "$(dirname "$0")"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="snapshots/recheck-$TS"
mkdir -p "$OUT"

curl -sS -L -o "$OUT/HACKATHON.md" https://nearhackathon.com/HACKATHON.md
curl -sS -L -o "$OUT/index.html" https://nearhackathon.com/
curl -sS -o "$OUT/count.json" https://nearhackathon.com/api/applications

echo "== HACKATHON.md sha256 (baseline 6dd0c1ff...4868d, 2026-11-10 rules: Q-000 credits clarified; older copies: snapshots/HACKATHON.2026-11-09.raw.md, snapshots/HACKATHON.2026-10-29.raw.md, snapshots/HACKATHON.2026-10-21.raw.md)"
shasum -a 256 "$OUT/HACKATHON.md"
if diff -u snapshots/HACKATHON.raw.md "$OUT/HACKATHON.md" > "$OUT/HACKATHON.diff"; then
  echo "HACKATHON.md unchanged"
else
  echo "HACKATHON.md CHANGED, see $OUT/HACKATHON.diff"; head -80 "$OUT/HACKATHON.diff"
fi

python3 - "$OUT/index.html" > "$OUT/index.text.txt" <<'EOF'
import re, html, sys
s = open(sys.argv[1], encoding="utf-8", errors="replace").read()
for tag in ("script", "style", "svg"):
    s = re.sub(rf"<{tag}[\s\S]*?</{tag}>", "", s)
s = re.sub(r"<br\s*/?>", "\n", s)
s = re.sub(r"</(p|div|h1|h2|h3|h4|li|tr|section|header|footer|button|a|span|dt|dd|label|option)>", r"</\1>\n", s)
t = html.unescape(re.sub(r"<[^>]+>", "", s))
out = []
for line in (x.strip() for x in t.split("\n")):
    if line and (not out or out[-1] != line):
        out.append(line)
print("\n".join(out))
EOF
echo "== landing page text diff vs snapshots/index.text.txt"
diff -u snapshots/index.text.txt "$OUT/index.text.txt" | head -60 || true
echo "== public submission count: $(cat "$OUT/count.json")"
