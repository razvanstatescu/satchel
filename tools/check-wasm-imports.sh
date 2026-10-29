#!/usr/bin/env bash
# INV-22 (spec §6): the release wasm must not import any host function that could give the
# keyless Satchel account a key, new code, or delete it:
#   promise_batch_action_add_key*            (AddKey: full-access or function-call key)
#   promise_batch_action_deploy_contract*    (DeployContract: code upgrade)
#   promise_batch_action_delete_account      (DeleteAccount)
# plus, as a superset (newer nearcore host functions that also replace an account's code):
#   promise_batch_action_deploy_global_contract*, promise_batch_action_use_global_contract*
#
# Usage: tools/check-wasm-imports.sh [--list] [path/to/contract.wasm ...]
#   default path: target/near/satchel/satchel.wasm (run it on the reproducible artifact too, R-35)
# Exit: 0 = clean, 1 = forbidden import found, 2 = usage / unreadable / not a wasm module.
# Needs only bash + python3 (present on ubuntu-latest and macOS); parses the wasm import section
# itself, so no wabt/wasm-tools install is required.
set -euo pipefail

LIST=0
FILES=()
for a in "$@"; do
  case "$a" in
    --list) LIST=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) FILES+=("$a") ;;
  esac
done
if [ ${#FILES[@]} -eq 0 ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  FILES=("$ROOT/target/near/satchel/satchel.wasm")
fi

command -v python3 >/dev/null 2>&1 || { echo "check-wasm-imports: python3 is required" >&2; exit 2; }

status=0
for f in "${FILES[@]}"; do
  if [ ! -r "$f" ]; then
    echo "check-wasm-imports: cannot read $f" >&2
    exit 2
  fi
  set +e
  python3 - "$f" "$LIST" <<'PY'
import sys

FORBIDDEN_PREFIXES = (
    "promise_batch_action_add_key",
    "promise_batch_action_deploy_contract",
    "promise_batch_action_delete_account",
    "promise_batch_action_deploy_global_contract",
    "promise_batch_action_use_global_contract",
)

path, list_all = sys.argv[1], sys.argv[2] == "1"
data = open(path, "rb").read()
if data[:4] != b"\x00asm" or data[4:8] != b"\x01\x00\x00\x00":
    print(f"check-wasm-imports: {path}: not a wasm v1 module", file=sys.stderr)
    sys.exit(2)

def leb(buf, i):
    result = shift = 0
    while True:
        b = buf[i]; i += 1
        result |= (b & 0x7F) << shift
        shift += 7
        if not b & 0x80:
            return result, i

def name(buf, i):
    n, i = leb(buf, i)
    return buf[i:i + n].decode("utf-8"), i + n

imports = []
i = 8
try:
    while i < len(data):
        sid = data[i]; i += 1
        size, i = leb(data, i)
        end = i + size
        if end > len(data):
            raise ValueError(f"section {sid} overruns the file")
        if sid == 2:  # import section
            count, j = leb(data, i)
            for _ in range(count):
                mod, j = name(data, j)
                field, j = name(data, j)
                kind = data[j]; j += 1
                if kind == 0x00:      # func: typeidx
                    _, j = leb(data, j)
                elif kind == 0x01:    # table: reftype + limits
                    j += 1
                    flag = data[j]; j += 1
                    _, j = leb(data, j)
                    if flag & 1: _, j = leb(data, j)
                elif kind == 0x02:    # memory: limits
                    flag = data[j]; j += 1
                    _, j = leb(data, j)
                    if flag & 1: _, j = leb(data, j)
                elif kind == 0x03:    # global: valtype + mut
                    j += 2
                else:
                    raise ValueError(f"unknown import kind {kind}")
                imports.append((mod, field, kind))
        i = end
except (IndexError, ValueError, UnicodeDecodeError) as e:
    print(f"check-wasm-imports: {path}: malformed module ({e})", file=sys.stderr)
    sys.exit(2)

funcs = [(m, f) for (m, f, k) in imports if k == 0x00]
bad = [(m, f) for (m, f) in funcs if f.startswith(FORBIDDEN_PREFIXES)]
if list_all:
    for m, f in funcs:
        print(f"  import {m}.{f}{'   <-- FORBIDDEN' if (m, f) in bad else ''}")
promise_actions = sorted(f for (_, f) in funcs if f.startswith("promise_batch_action_"))
print(f"{path}: {len(funcs)} function imports; promise actions: {', '.join(promise_actions) or 'none'}")
if bad:
    for m, f in bad:
        print(f"FORBIDDEN import: {m}.{f}", file=sys.stderr)
    print(f"INV-22 FAIL: {path}", file=sys.stderr)
    sys.exit(1)
print(f"INV-22 OK: {path}")
PY
  rc=$?
  set -e
  if [ $rc -eq 2 ]; then exit 2; fi
  if [ $rc -ne 0 ]; then status=1; fi
done
exit $status
