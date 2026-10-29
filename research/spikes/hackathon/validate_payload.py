#!/usr/bin/env python3
"""Throwaway spike: validate a NEAR HACKATHON submission payload against the
contract published in https://nearhackathon.com/HACKATHON.md (fetched 2026-10-21,
sha256 39fd3939...7e33bb). Offline only: this script NEVER sends anything.

Usage:  python3 validate_payload.py payload.json
        python3 validate_payload.py --selftest
"""
import json, re, sys, uuid

TRACKS = ["defi", "thesis", "privacy", "business", "swarms", "security", "agents",
          "realworld", "games", "nfts", "memecoins", "social", "open"]
SIZES = ["1", "2 - 4", "4 - 6", "6 - 8", "8+"]
NEAR_RE = re.compile(r"^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")  # approximation; server rule unknown
URL_RE = re.compile(r"^https?://\S+$")
FIELDS = ["requestId", "projectName", "leadName", "email", "size", "tracks",
          "nearAddress", "projectUrl", "demoUrl", "idea", "consent"]


def validate(p):
    errs = []
    extra = set(p) - set(FIELDS)
    if extra:
        errs.append(f"extra fields not allowed: {sorted(extra)} (note: 'website' is a spam trap)")
    missing = [f for f in FIELDS if f not in p]
    if missing:
        return errs + [f"missing field: {f}" for f in missing]
    try:
        uuid.UUID(p["requestId"])
    except Exception:
        errs.append("requestId: not a UUID")
    for f, lo, hi in [("projectName", 2, 80), ("leadName", 2, 80), ("idea", 20, 2000)]:
        if not isinstance(p[f], str) or not (lo <= len(p[f]) <= hi):
            errs.append(f"{f}: must be a string of {lo}-{hi} characters")
    if not isinstance(p["email"], str) or len(p["email"]) > 160 or not EMAIL_RE.match(p["email"]):
        errs.append("email: invalid or longer than 160 characters")
    if p["size"] not in SIZES:
        errs.append(f"size: must be one of {SIZES} exactly as written")
    t = p["tracks"]
    if not isinstance(t, list) or not t or any(x not in TRACKS for x in t) or len(set(t)) != len(t):
        errs.append("tracks: non-empty array of known ids, each listed once")
    a = p["nearAddress"]
    if not isinstance(a, str) or not (2 <= len(a) <= 64) or a != a.lower() or not NEAR_RE.match(a):
        errs.append("nearAddress: 2-64 chars, lowercase, must match the published regex")
    for f in ["projectUrl", "demoUrl"]:
        if not isinstance(p[f], str) or len(p[f]) > 300 or not URL_RE.match(p[f]):
            errs.append(f"{f}: http(s) URL, max 300 characters")
    if p["consent"] is not True:
        errs.append("consent: must be boolean true (only after the human agreed verbatim)")
    if len(json.dumps(p).encode()) > 12000:
        errs.append("body larger than 12000 bytes")
    return errs


def selftest():
    good_addrs = ["satchel-team.near", "a1.near", "x" * 64, "0123456789abcdef" * 4,
                  "team_satchel.near", "sub.satchel-team.near"]
    bad_addrs = ["Satchel.near", "satchel..near", "satchel.near.", "-satchel.near",
                 "satchel-.near", "a", "x" * 65, "satchel team.near", "satchel@near"]
    for a in good_addrs:
        ok = 2 <= len(a) <= 64 and bool(NEAR_RE.match(a))
        print(f"{'PASS' if ok else 'FAIL'} expected-valid   {a!r}")
    for a in bad_addrs:
        ok = 2 <= len(a) <= 64 and a == a.lower() and bool(NEAR_RE.match(a))
        print(f"{'PASS' if not ok else 'FAIL'} expected-invalid {a!r}")
    sample = {  # shape only; placeholder values, never to be sent
        "requestId": str(uuid.uuid4()), "projectName": "Example", "leadName": "Ada",
        "email": "ada@example.com", "size": "2 - 4", "tracks": ["nfts", "open"],
        "nearAddress": "example-team.near", "projectUrl": "https://github.com/x/y",
        "demoUrl": "https://x.com/x/status/1", "idea": "x" * 20, "consent": True}
    print("sample payload errors:", validate(sample))
    bad = dict(sample, website="", tracks=["nfts", "nfts"], size="2-4")
    print("bad payload errors:", validate(bad))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        selftest()
    elif len(sys.argv) > 1:
        e = validate(json.load(open(sys.argv[1])))
        print("OK" if not e else "\n".join(e))
        sys.exit(1 if e else 0)
    else:
        print(__doc__)
