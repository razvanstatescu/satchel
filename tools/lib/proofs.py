#!/usr/bin/env python3
"""Verifier for docs/evidence/proofs.json (used by tools/proofs.sh). Python 3 standard library only.

Read-only: it never signs and never needs a key. tools/proofs.sh fetches every transaction with curl and this file
checks the answers. It holds small, self-contained implementations of keccak-256, secp256k1 public-key recovery,
ed25519 verification, RLP, base58 and bech32, so the cryptographic checks need nothing beyond python3.

  proofs.py plan    <proofs.json> [--only ids]   one line per fetch: KEY<TAB>curl command<TAB>fallback command...
  proofs.py print   <proofs.json> [--only ids]   every proof, its commands and what must hold (no network)
  proofs.py usable  <KEY> <file>                 exit 0 if the saved answer is usable (else bash tries the fallback)
  proofs.py verify  <proofs.json> <dir> [--only ids]   PASS / FAIL / SKIP per proof; exit 1 on any FAIL
  proofs.py self-test                             offline: crypto vectors + the recorded fixtures in tools/test/fixtures

Endpoint overrides (env): SATCHEL_TX_API, SATCHEL_RPC, SATCHEL_RPC_FALLBACK, SATCHEL_SEPOLIA_RPCS (comma list),
SATCHEL_BTC_APIS (comma list), SATCHEL_SOL_RPC.
"""
import base64
import hashlib
import json
import os
import re
import sys

# ----------------------------------------------------------------------------------------------------- endpoints

TX_API = os.environ.get("SATCHEL_TX_API", "https://tx.test.fastnear.com").rstrip("/")
NEAR_RPCS = [os.environ.get("SATCHEL_RPC", "https://near-testnet.drpc.org"), os.environ.get("SATCHEL_RPC_FALLBACK", "https://test.rpc.fastnear.com")]
# publicnode answers eth_getTransactionByHash but forgets older receipts, so it comes last.
SEPOLIA_RPCS = [u for u in os.environ.get("SATCHEL_SEPOLIA_RPCS", "https://rpc.sepolia.ethpandaops.io,https://0xrpc.io/sep,https://sepolia.gateway.tenderly.co,https://ethereum-sepolia-rpc.publicnode.com").split(",") if u]
BTC_APIS = [u.rstrip("/") for u in os.environ.get("SATCHEL_BTC_APIS", "https://mempool.space/testnet4/api,https://mempool.emzy.de/testnet4/api").split(",") if u]
SOL_RPC = os.environ.get("SATCHEL_SOL_RPC", "https://api.devnet.solana.com")
if any(re.search(r"rpc\.testnet\.near\.org", u) for u in NEAR_RPCS + [TX_API]):
    sys.exit("refusing the deprecated near.org testnet RPC; use FastNEAR or dRPC")

NEARBLOCKS = "https://testnet.nearblocks.io/txns/"
EXPLORERS = {
    "sepolia": "https://sepolia.etherscan.io/tx/",
    "bitcoin-testnet4": "https://mempool.space/testnet4/tx/",
    "solana-devnet": "https://explorer.solana.com/tx/{}?cluster=devnet",
}


def explorer(chain, tx):
    t = EXPLORERS[chain]
    return t.format(tx) if "{}" in t else t + tx


# ------------------------------------------------------------------------------------------------------ keccak

def _rol(a, n):
    n %= 64
    return ((a << n) | (a >> (64 - n))) & 0xFFFFFFFFFFFFFFFF


def _keccak_f(lanes):
    r = 1
    for _ in range(24):
        c = [lanes[x][0] ^ lanes[x][1] ^ lanes[x][2] ^ lanes[x][3] ^ lanes[x][4] for x in range(5)]
        d = [c[(x + 4) % 5] ^ _rol(c[(x + 1) % 5], 1) for x in range(5)]
        lanes = [[lanes[x][y] ^ d[x] for y in range(5)] for x in range(5)]
        x, y = 1, 0
        cur = lanes[x][y]
        for t in range(24):
            x, y = y, (2 * x + 3 * y) % 5
            cur, lanes[x][y] = lanes[x][y], _rol(cur, (t + 1) * (t + 2) // 2)
        for y in range(5):
            row = [lanes[x][y] for x in range(5)]
            for x in range(5):
                lanes[x][y] = row[x] ^ ((~row[(x + 1) % 5]) & row[(x + 2) % 5])
        for j in range(7):
            r = ((r << 1) ^ ((r >> 7) * 0x71)) % 256
            if r & 2:
                lanes[0][0] ^= 1 << ((1 << j) - 1)
    return lanes


def keccak256(data):
    rate = 136
    msg = bytearray(data) + b"\x01"
    while len(msg) % rate:
        msg.append(0)
    msg[-1] |= 0x80
    state = bytearray(200)
    for off in range(0, len(msg), rate):
        for i in range(rate):
            state[i] ^= msg[off + i]
        lanes = [[int.from_bytes(state[8 * (x + 5 * y):8 * (x + 5 * y) + 8], "little") for y in range(5)] for x in range(5)]
        lanes = _keccak_f(lanes)
        state = bytearray(b"".join(lanes[x][y].to_bytes(8, "little") for y in range(5) for x in range(5)))
    return bytes(state[:32])


def sha256(b):
    return hashlib.sha256(b).digest()


def sha256d(b):
    return sha256(sha256(b))


# --------------------------------------------------------------------------------------------------- secp256k1

P = 2**256 - 2**32 - 977
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8


def _add(a, b):
    if a is None:
        return b
    if b is None:
        return a
    if a[0] == b[0] and (a[1] + b[1]) % P == 0:
        return None
    if a == b:
        lam = 3 * a[0] * a[0] * pow(2 * a[1], -1, P) % P
    else:
        lam = (b[1] - a[1]) * pow(b[0] - a[0], -1, P) % P
    x = (lam * lam - a[0] - b[0]) % P
    return (x, (lam * (a[0] - x) - a[1]) % P)


def _mul(k, pt):
    out = None
    while k:
        if k & 1:
            out = _add(out, pt)
        pt = _add(pt, pt)
        k >>= 1
    return out


def secp_recover(z, r, s, recid):
    """The public key (x, y) that produced ECDSA signature (r, s) with recovery id `recid` over the 32-byte hash z."""
    if not (0 < r < N and 0 < s < N):
        return None
    x = r + (N if recid & 2 else 0)
    if x >= P:
        return None
    y = pow((x * x * x + 7) % P, (P + 1) // 4, P)
    if (y * y - x * x * x - 7) % P:
        return None
    if (y & 1) != (recid & 1):
        y = P - y
    e = int.from_bytes(z, "big") % N
    rinv = pow(r, -1, N)
    q = _add(_mul(s * rinv % N, (x, y)), _mul((-e * rinv) % N, (GX, GY)))
    return q


def compressed(pub):
    return bytes([2 + (pub[1] & 1)]) + pub[0].to_bytes(32, "big")


def eth_address(pub):
    return "0x" + keccak256(pub[0].to_bytes(32, "big") + pub[1].to_bytes(32, "big"))[-20:].hex()


# ------------------------------------------------------------------------------------------------------ ed25519

EP = 2**255 - 19
EQ = 2**252 + 27742317777372353535851937790883648493
ED = -121665 * pow(121666, -1, EP) % EP
_SQRT_M1 = pow(2, (EP - 1) // 4, EP)


def _ed_add(a, b):
    A = (a[1] - a[0]) * (b[1] - b[0]) % EP
    B = (a[1] + a[0]) * (b[1] + b[0]) % EP
    C = 2 * a[3] * b[3] * ED % EP
    D = 2 * a[2] * b[2] % EP
    E, F, G, H = B - A, D - C, D + C, B + A
    return (E * F % EP, G * H % EP, F * G % EP, E * H % EP)


def _ed_mul(k, pt):
    out = (0, 1, 1, 0)
    while k:
        if k & 1:
            out = _ed_add(out, pt)
        pt = _ed_add(pt, pt)
        k >>= 1
    return out


def _ed_x(y, sign):
    if y >= EP:
        return None
    x2 = (y * y - 1) * pow(ED * y * y + 1, -1, EP) % EP
    if x2 == 0:
        return None if sign else 0
    x = pow(x2, (EP + 3) // 8, EP)
    if (x * x - x2) % EP:
        x = x * _SQRT_M1 % EP
    if (x * x - x2) % EP:
        return None
    if (x & 1) != sign:
        x = EP - x
    return x


def _ed_point(b):
    if len(b) != 32:
        return None
    y = int.from_bytes(b, "little")
    sign = y >> 255
    y &= (1 << 255) - 1
    x = _ed_x(y, sign)
    return None if x is None else (x, y, 1, x * y % EP)


_EGY = 4 * pow(5, -1, EP) % EP
_EGX = _ed_x(_EGY, 0)
_EG = (_EGX, _EGY, 1, _EGX * _EGY % EP)


def ed25519_verify(pub, msg, sig):
    """RFC 8032 verification: True iff `sig` (64 bytes) is pub's signature over msg."""
    if len(sig) != 64:
        return False
    a, r = _ed_point(pub), _ed_point(sig[:32])
    if a is None or r is None:
        return False
    s = int.from_bytes(sig[32:], "little")
    if s >= EQ:
        return False
    h = int.from_bytes(hashlib.sha512(sig[:32] + pub + msg).digest(), "little") % EQ
    lhs, rhs = _ed_mul(s, _EG), _ed_add(r, _ed_mul(h, a))
    return (lhs[0] * rhs[2] - rhs[0] * lhs[2]) % EP == 0 and (lhs[1] * rhs[2] - rhs[1] * lhs[2]) % EP == 0


# ----------------------------------------------------------------------------------------- base58, bech32, RLP

B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(b):
    n = int.from_bytes(b, "big")
    out = ""
    while n:
        n, rem = divmod(n, 58)
        out = B58[rem] + out
    return "1" * (len(b) - len(b.lstrip(b"\0"))) + out


def b58decode(s):
    n = 0
    for ch in s:
        n = n * 58 + B58.index(ch)
    body = n.to_bytes((n.bit_length() + 7) // 8, "big") if n else b""
    return b"\0" * (len(s) - len(s.lstrip("1"))) + body


def _bech32_polymod(values):
    gen = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    chk = 1
    for v in values:
        top = chk >> 25
        chk = (chk & 0x1FFFFFF) << 5 ^ v
        for i in range(5):
            chk ^= gen[i] if (top >> i) & 1 else 0
    return chk


def segwit_v0_address(hrp, program):
    """bech32 (BIP 173) address of a witness v0 program, e.g. a P2WPKH key hash."""
    acc, bits, data = 0, 0, [0]
    for b in program:
        acc = (acc << 8) | b
        bits += 8
        while bits >= 5:
            bits -= 5
            data.append((acc >> bits) & 31)
    if bits:
        data.append((acc << (5 - bits)) & 31)
    hrpx = [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]
    pm = _bech32_polymod(hrpx + data + [0] * 6) ^ 1
    chars = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    return hrp + "1" + "".join(chars[d] for d in data + [(pm >> 5 * (5 - i)) & 31 for i in range(6)])


def rlp_decode(b):
    """Decode one RLP item; returns (item, rest). Items are bytes or lists."""
    p = b[0]
    if p < 0x80:
        return b[:1], b[1:]
    if p < 0xB8:
        n = p - 0x80
        return b[1:1 + n], b[1 + n:]
    if p < 0xC0:
        ll = p - 0xB7
        n = int.from_bytes(b[1:1 + ll], "big")
        return b[1 + ll:1 + ll + n], b[1 + ll + n:]
    if p < 0xF8:
        n, off = p - 0xC0, 1
    else:
        ll = p - 0xF7
        n, off = int.from_bytes(b[1:1 + ll], "big"), 1 + ll
    body, out = b[off:off + n], []
    while body:
        item, body = rlp_decode(body)
        out.append(item)
    return out, b[off + n:]


def rlp_encode(x):
    if isinstance(x, list):
        body = b"".join(rlp_encode(i) for i in x)
        return _rlp_len(len(body), 0xC0) + body
    if len(x) == 1 and x[0] < 0x80:
        return x
    return _rlp_len(len(x), 0x80) + x


def _rlp_len(n, off):
    if n < 56:
        return bytes([off + n])
    nb = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([off + 55 + len(nb)]) + nb


def _int(b):
    return int.from_bytes(b, "big")


def _minimal(n):
    return n.to_bytes((n.bit_length() + 7) // 8, "big") if n else b""


# --------------------------------------------------------------------------------------------- chain decoders

def evm_unsigned_fields(pre):
    """An EIP-1559 (type-2) unsigned transaction: 0x02 || rlp([chainId, nonce, tip, maxFee, gas, to, value, data, accessList])."""
    if not pre or pre[0] != 2:
        raise ValueError("not a type-2 transaction")
    items, rest = rlp_decode(pre[1:])
    if rest or len(items) != 9:
        raise ValueError("malformed type-2 transaction")
    return items


def evm_signed_hash(pre, recid, r, s):
    items = evm_unsigned_fields(pre)
    signed = b"\x02" + rlp_encode(items + [_minimal(recid), _minimal(r), _minimal(s)])
    return "0x" + keccak256(signed).hex()


def _varint(b, i):
    p = b[i]
    if p < 0xFD:
        return p, i + 1
    w = {0xFD: 2, 0xFE: 4, 0xFF: 8}[p]
    return int.from_bytes(b[i + 1:i + 1 + w], "little"), i + 1 + w


def _enc_varint(n):
    if n < 0xFD:
        return bytes([n])
    if n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    return b"\xfe" + n.to_bytes(4, "little")


def btc_preimage(pre):
    """BIP 143 sighash preimage of one P2WPKH input."""
    if len(pre) < 156:
        raise ValueError("preimage too short")
    sc_len, i = _varint(pre, 104)
    sc = pre[i:i + sc_len]
    i += sc_len
    return {
        "version": pre[0:4],
        "hash_prevouts": pre[4:36],
        "hash_sequence": pre[36:68],
        "txid": pre[68:100][::-1].hex(),
        "vout": int.from_bytes(pre[100:104], "little"),
        "outpoint": pre[68:104],
        "script_code": sc,
        "amount": int.from_bytes(pre[i:i + 8], "little"),
        "sequence": pre[i + 8:i + 12],
        "hash_outputs": pre[i + 12:i + 44],
        "locktime": pre[i + 44:i + 48],
        "sighash": int.from_bytes(pre[i + 48:i + 52], "little"),
    }


def btc_count_outputs(outs):
    i, n = 0, 0
    while i < len(outs):
        sl, j = _varint(outs, i + 8)
        i = j + sl
        n += 1
    if i != len(outs):
        raise ValueError("malformed outputs")
    return n


def btc_txid(preimages, outputs_hex):
    """txid of the transaction the preimages commit to (non-witness serialization, double SHA-256, reversed)."""
    ps = [btc_preimage(bytes.fromhex(p)) for p in preimages]
    outs = bytes.fromhex(outputs_hex)
    body = ps[0]["version"] + _enc_varint(len(ps))
    for p in ps:
        body += p["outpoint"] + b"\x00" + p["sequence"]
    body += _enc_varint(btc_count_outputs(outs)) + outs + ps[0]["locktime"]
    return sha256d(body)[::-1].hex()


def der_sig(r, s):
    def enc(x):
        b = _minimal(x)
        if b[0] & 0x80:
            b = b"\x00" + b
        return b"\x02" + bytes([len(b)]) + b
    body = enc(r) + enc(s)
    return b"\x30" + bytes([len(body)]) + body


def sol_message_parts(msg):
    """Legacy Solana message: header (3 bytes), compact-u16 key count, keys, recent blockhash, instructions."""
    if msg[0] & 0x80:
        raise ValueError("versioned message")
    n, i = msg[3], 4
    if n & 0x80:
        raise ValueError("too many keys")
    keys = [b58encode(msg[i + 32 * k:i + 32 * k + 32]) for k in range(n)]
    i += 32 * n
    return {"keys": keys, "recent_blockhash": b58encode(msg[i:i + 32])}


SOL_OFFCHAIN_PREFIX = b"\xffsolana offchain"
EIP191_PREFIX = b"\x19Ethereum Signed Message:\n"


# --------------------------------------------------------------------------------------------- NEAR outcomes

def near_tx(doc):
    """Normalize a FastNEAR /v0/transactions answer or a JSON-RPC `tx` answer to one dict, or None."""
    if not isinstance(doc, dict):
        return None
    if isinstance(doc.get("transactions"), list):
        if not doc["transactions"] or not doc["transactions"][0]:
            return None
        t = doc["transactions"][0]
        receipts = []
        for r in t.get("receipts", []):
            o = r["execution_outcome"]
            receipts.append({"id": o.get("id") or r["receipt"]["receipt_id"], "executor": o["outcome"]["executor_id"],
                             "status": o["outcome"]["status"], "logs": o["outcome"]["logs"]})
        first = t["execution_outcome"]["outcome"]["status"]
        tx, height = t["transaction"], t["execution_outcome"]["block_height"]
        ts = t["execution_outcome"].get("block_timestamp")
        source = "FastNEAR tx API"
    elif isinstance(doc.get("result"), dict) and "transaction" in doc["result"]:
        res = doc["result"]
        receipts = [{"id": r["id"], "executor": r["outcome"]["executor_id"], "status": r["outcome"]["status"], "logs": r["outcome"]["logs"]}
                    for r in res.get("receipts_outcome", [])]
        first = res["transaction_outcome"]["outcome"]["status"]
        tx, height, ts = res["transaction"], None, None
        source = "NEAR RPC"
    else:
        return None
    by_id = {r["id"]: r for r in receipts}
    status, seen = first, set()
    while isinstance(status, dict) and "SuccessReceiptId" in status and status["SuccessReceiptId"] in by_id and status["SuccessReceiptId"] not in seen:
        seen.add(status["SuccessReceiptId"])
        status = by_id[status["SuccessReceiptId"]]["status"]
    actions = []
    for a in tx["actions"]:
        if isinstance(a, str):
            actions.append({"kind": a})
            continue
        kind = next(iter(a))
        body = a[kind] if isinstance(a[kind], dict) else {}
        item = {"kind": kind}
        if kind == "FunctionCall":
            item["method"] = body.get("method_name")
            try:
                item["args"] = json.loads(base64.b64decode(body.get("args", "")))
            except Exception:
                item["args"] = None
            item["deposit"] = body.get("deposit")
        actions.append(item)
    events = []
    for r in receipts:
        for line in r["logs"]:
            if line.startswith("EVENT_JSON:"):
                try:
                    e = json.loads(line[len("EVENT_JSON:"):])
                    e["_executor"] = r["executor"]
                    events.append(e)
                except ValueError:
                    pass
    failures = [json.dumps(r["status"]["Failure"]) for r in receipts if isinstance(r["status"], dict) and "Failure" in r["status"]]
    if isinstance(first, dict) and "Failure" in first:
        failures.append(json.dumps(first["Failure"]))
    return {"hash": tx["hash"], "signer": tx["signer_id"], "receiver": tx["receiver_id"], "actions": actions, "receipts": receipts,
            "final": status, "events": events, "failures": failures, "height": height, "timestamp": ts, "source": source}


def error_codes(t):
    out = []
    for f in t["failures"]:
        for c in re.findall(r"ERR_[A-Z0-9_]+", f):
            if c not in out:
                out.append(c)
    return out


def success_values(t, executor):
    out = []
    for r in t["receipts"]:
        st = r["status"]
        if r["executor"] == executor and isinstance(st, dict) and st.get("SuccessValue"):
            try:
                out.append(json.loads(base64.b64decode(st["SuccessValue"])))
            except ValueError:
                pass
    return out


def subset(want, got):
    if isinstance(want, dict):
        return isinstance(got, dict) and all(k in got and subset(v, got[k]) for k, v in want.items())
    if isinstance(want, list):
        return isinstance(got, list) and len(want) <= len(got) and all(subset(w, g) for w, g in zip(want, got))
    return want == got


def find_event(t, name, data=None):
    std, ev = name.split(":", 1)
    for e in t["events"]:
        if e.get("standard") == std and e.get("event") == ev:
            d = e.get("data")
            if std == "nep171" and isinstance(d, list) and d:
                d = d[0]
            if data is None or subset(data, d):
                return e
    return None


def mpc_signatures(t, contract):
    """The signatures the contract's on_signed callback returned (one per request, None for a missing one)."""
    for v in reversed(success_values(t, contract)):
        if isinstance(v, list) and v and all(x is None or isinstance(x, dict) for x in v):
            return v
    return None


def parse_mpc_sig(sig):
    if not sig:
        return None
    if sig.get("scheme") == "Ed25519" or "signature" in sig:
        raw = sig["signature"]
        return {"ed25519": bytes(raw) if isinstance(raw, list) else bytes.fromhex(raw)}
    big_r = bytes.fromhex(sig["big_r"]["affine_point"])
    return {"r": int.from_bytes(big_r[1:], "big"), "s": int(sig["s"]["scalar"], 16), "recid": int(sig["recovery_id"])}


# ------------------------------------------------------------------------------------------------------- plan

def load(path):
    with open(path) as f:
        return json.load(f)


def selected(doc, only):
    ids = set(only.split(",")) if only else None
    return [p for p in doc["proofs"] if ids is None or p["id"] in ids]


def _q(s):
    return "'" + s.replace("'", "'\\''") + "'"


def near_cmds(p):
    h = p["tx"]
    cmds = ["curl -s -m 30 -X POST %s/v0/transactions -H 'content-type: application/json' -d %s" % (TX_API, _q(json.dumps({"tx_hashes": [h]}, separators=(",", ":"))))]
    for rpc in NEAR_RPCS:
        body = {"jsonrpc": "2.0", "id": 1, "method": "tx", "params": {"tx_hash": h, "sender_account_id": p["signer"], "wait_until": "FINAL"}}
        cmds.append("curl -s -m 30 %s -H 'content-type: application/json' -d %s" % (rpc, _q(json.dumps(body, separators=(",", ":")))))
    return cmds


def external_cmds(x):
    if x["chain"] == "sepolia":
        body = [{"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionByHash", "params": [x["tx"]]},
                {"jsonrpc": "2.0", "id": 2, "method": "eth_getTransactionReceipt", "params": [x["tx"]]}]
        return ["curl -s -m 30 %s -H 'content-type: application/json' -d %s" % (u, _q(json.dumps(body, separators=(",", ":")))) for u in SEPOLIA_RPCS]
    if x["chain"] == "bitcoin-testnet4":
        return ["curl -s -m 30 %s/tx/%s" % (u, x["tx"]) for u in BTC_APIS]
    if x["chain"] == "solana-devnet":
        body = {"jsonrpc": "2.0", "id": 1, "method": "getTransaction", "params": [x["tx"], {"encoding": "json", "maxSupportedTransactionVersion": 0, "commitment": "confirmed"}]}
        return ["curl -s -m 30 %s -H 'content-type: application/json' -d %s" % (SOL_RPC, _q(json.dumps(body, separators=(",", ":"))))]
    raise ValueError("unknown chain " + x["chain"])


def key_of(kind, value):
    return kind + "-" + re.sub(r"[^A-Za-z0-9]", "", value)


def fetches(doc, only):
    out, seen = [], set()
    for p in selected(doc, only):
        items = [(key_of("near", p["tx"]), near_cmds(p))]
        if p.get("external"):
            items.append((key_of(p["external"]["chain"], p["external"]["tx"]), external_cmds(p["external"])))
        for k, cmds in items:
            if k not in seen:
                seen.add(k)
                out.append((k, cmds))
    return out


def cmd_plan(doc, only):
    for k, cmds in fetches(doc, only):
        print("\t".join([k] + cmds))


def describe(p):
    e = p["expect"]
    lines = ["signer %s calls %s on %s" % (p["signer"], p["method"], p["receiver"])]
    if e["outcome"] == "success":
        lines.append("the call succeeds")
    else:
        lines.append("the call is refused with %s (and nothing changes)" % e["error"])
    for ev in p.get("events", []):
        lines.append("event %s%s" % (ev["event"], (" with " + json.dumps(ev["data"], separators=(",", ":"))) if ev.get("data") else ""))
    for ev in p.get("absent_events", []):
        lines.append("no %s event" % ev)
    s = p.get("signature")
    if s:
        lines.append("the contract hashed the %s itself, and the MPC signature verifies against Satchel #%s's %s address %s" % (s["kind"].replace("_", " "), p["token_id"], s["chain"].upper(), s["address"]))
    x = p.get("external")
    if x:
        lines.append("%s tx %s exists, is %s, and was sent from %s" % (x["chain"], x["tx"], x.get("status", "confirmed"), x["from"]))
    return lines


def cmd_print(doc, only):
    print("Satchel live proofs · contract %s (%s) · %d proofs" % (doc["contract"], doc.get("contract_role", "?"), len(selected(doc, only))))
    for p in selected(doc, only):
        print()
        print("[%s] %s" % (p["id"], p["action"]))
        print("  near: " + NEARBLOCKS + p["tx"])
        if p.get("external"):
            print("  %s: %s" % (p["external"]["chain"], explorer(p["external"]["chain"], p["external"]["tx"])))
        for c in near_cmds(p)[:1]:
            print("  $ " + c)
        if p.get("external"):
            print("  $ " + external_cmds(p["external"])[0])
        for line in describe(p):
            print("  must: " + line)


# ----------------------------------------------------------------------------------------------------- usable

def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def usable(key, doc):
    if doc is None:
        return False
    kind = key.split("-", 1)[0]
    if kind == "near":
        return near_tx(doc) is not None
    if kind == "sepolia":
        return isinstance(doc, list) and len(doc) == 2 and all(isinstance(x, dict) and x.get("result") for x in doc)
    if kind == "bitcoin":
        return isinstance(doc, dict) and "txid" in doc
    if kind == "solana":
        return isinstance(doc, dict) and isinstance(doc.get("result"), dict)
    return False


# ----------------------------------------------------------------------------------------------------- verify

class Check:
    def __init__(self):
        self.lines, self.ok = [], True

    def that(self, cond, what):
        self.lines.append(("ok   " if cond else "FAIL ") + what)
        if not cond:
            self.ok = False
        return cond

    def note(self, what):
        self.lines.append("     " + what)


def check_signature(c, p, t, doc):
    """sign_for: the request record, the contract-side hash, and the signature against the Satchel's address."""
    s = p["signature"]
    ev = find_event(t, "satchel:sign_requested", {"token_id": p["token_id"]})
    if not c.that(ev is not None, "sign_requested event for Satchel #%s" % p["token_id"]):
        return None
    d = ev["data"]
    c.that(d["chain"] == s["chain"] and d["path"] == s["path"], "MPC path %s (chain %s)" % (d["path"], d["chain"]))
    sigs = mpc_signatures(t, p["receiver"])
    if not c.that(bool(sigs) and len(sigs) == len(d["payloads"]) and all(sigs), "the MPC returned %d signature(s)" % len(d["payloads"])):
        return None
    mpc_calls = sum(1 for r in t["receipts"] for line in r["logs"] if line.startswith("sign: predecessor=AccountId(\"%s\")" % p["receiver"]))
    c.that(mpc_calls == len(d["payloads"]), "%d MPC sign call(s) from this one sign_for, one per request" % len(d["payloads"]))
    out = {"event": d, "sigs": [parse_mpc_sig(x) for x in sigs]}
    kind = s["kind"]
    pres = [bytes.fromhex(x) for x in d["preimages"]]
    pays = [bytes.fromhex(x) for x in d["payloads"]]
    if kind in ("evm_tx", "evm_message"):
        pre, pay, sg = pres[0], pays[0], out["sigs"][0]
        c.that(keccak256(pre) == pay, "payload = keccak256(the bytes the contract parsed): not a blind hash")
        if kind == "evm_message":
            c.that(pre.startswith(EIP191_PREFIX), "EIP-191 personal_sign envelope")
            body = pre[len(EIP191_PREFIX):]
            m = re.match(rb"^(\d+)", body)
            text = body[len(m.group(1)):] if m else b""
            c.that(m is not None and int(m.group(1)) == len(text), "message length prefix matches")
            if s.get("message_text") is not None:
                c.that(text.decode("utf8", "replace") == s["message_text"], "message text %r" % s["message_text"])
        pub = secp_recover(pay, sg["r"], sg["s"], sg["recid"])
        addr = eth_address(pub) if pub else None
        c.that(addr is not None and addr.lower() == s["address"].lower(), "the signature recovers to %s" % s["address"])
        if kind == "evm_tx":
            items = evm_unsigned_fields(pre)
            out["evm"] = {"chain_id": _int(items[0]), "nonce": _int(items[1]), "to": "0x" + items[5].hex(), "value": _int(items[6]), "data": items[7].hex(),
                          "hash": evm_signed_hash(pre, sg["recid"], sg["r"], sg["s"])}
    elif kind == "btc_tx":
        outs = d.get("btc_outputs") or ""
        txid = btc_txid(d["preimages"], outs)
        out["btc"] = {"txid": txid, "inputs": [], "pubkeys": []}
        for i, (pre, pay, sg) in enumerate(zip(pres, pays, out["sigs"])):
            pi = btc_preimage(pre)
            c.that(sha256d(pre) == pay, "input %d: payload = double-SHA-256 of the BIP 143 preimage" % i)
            sc = pi["script_code"]
            pkh = sc[3:23] if len(sc) == 25 and sc[:3] == b"\x76\xa9\x14" else b""
            c.that(segwit_v0_address("tb", pkh) == s["address"], "input %d spends from %s" % (i, s["address"]))
            pub = secp_recover(pay, sg["r"], sg["s"], sg["recid"])
            if pub is not None:
                cp = compressed(pub)
                out["btc"]["pubkeys"].append(cp.hex())
                try:
                    c.that(hashlib.new("ripemd160", sha256(cp)).digest() == pkh, "input %d: the signature's public key hashes to the address" % i)
                except ValueError:
                    c.note("input %d: ripemd160 unavailable in this python; the key is compared with the broadcast witness instead" % i)
            else:
                c.that(False, "input %d: signature recovers a public key" % i)
            out["btc"]["inputs"].append("%s:%d" % (pi["txid"], pi["vout"]))
            c.that(hashlib.sha256(hashlib.sha256(bytes.fromhex(outs)).digest()).digest() == pi["hash_outputs"], "input %d commits to the outputs in the record" % i)
    elif kind in ("sol_tx", "sol_message"):
        pre, sg = pres[0], out["sigs"][0]
        pub = b58decode(s["address"])
        c.that(len(pub) == 32 and ed25519_verify(pub, pre, sg["ed25519"]), "ed25519 signature verifies against %s" % s["address"])
        if kind == "sol_message":
            c.that(pre.startswith(SOL_OFFCHAIN_PREFIX), "Solana off-chain message envelope")
            text = pre[len(SOL_OFFCHAIN_PREFIX) + 4:]
            if s.get("message_text") is not None:
                c.that(text.decode("utf8", "replace") == s["message_text"], "message text %r" % s["message_text"])
        else:
            parts = sol_message_parts(pre)
            c.that(parts["keys"][0] == s["address"], "fee payer is the Satchel's SOL address")
            out["sol"] = {"tx": b58encode(sg["ed25519"]), "recent_blockhash": parts["recent_blockhash"]}
    return out


def check_external(c, p, sig, doc):
    x = p["external"]
    if x["chain"] == "sepolia":
        ev = sig.get("evm") if sig else None
        if ev:
            c.that(ev["hash"] == x["tx"].lower(), "the signed record hashes to Sepolia tx %s" % x["tx"])
            c.that(ev["nonce"] == x["nonce"], "the record's nonce is %d" % x["nonce"])
        if not isinstance(doc, list) or len(doc) != 2:
            return c.that(False, "Sepolia answered for %s" % x["tx"])
        tx, rc = doc[0].get("result"), doc[1].get("result")
        if not c.that(bool(tx), "the tx exists on Sepolia"):
            return None
        c.that(tx["from"].lower() == x["from"].lower(), "sent from the Satchel's EVM address %s" % x["from"])
        c.that(int(tx["nonce"], 16) == x["nonce"], "nonce %d" % x["nonce"])
        if ev:
            c.that(tx["to"].lower() == ev["to"].lower() and int(tx["value"], 16) == ev["value"], "to and value match the signed record")
        c.that(bool(rc) and rc.get("status") == "0x1", "receipt status success (block %s)" % (int(rc["blockNumber"], 16) if rc and rc.get("blockNumber") else "?"))
    elif x["chain"] == "bitcoin-testnet4":
        b = sig.get("btc") if sig else None
        if b:
            c.that(b["txid"] == x["tx"], "the signed record's inputs and outputs give txid %s" % x["tx"])
        if not c.that(isinstance(doc, dict) and doc.get("txid") == x["tx"], "the tx exists on Bitcoin testnet4"):
            return None
        vins = ["%s:%d" % (i["txid"], i["vout"]) for i in doc["vin"]]
        if b:
            c.that(vins == b["inputs"], "it spends exactly the record's outpoints %s" % ", ".join(b["inputs"]))
            for k, i in enumerate(doc["vin"]):
                w = i.get("witness") or []
                sg = sig["sigs"][k]
                c.that(len(w) == 2 and w[0] == der_sig(sg["r"], sg["s"]).hex() + "01", "input %d carries the MPC signature from the record" % k)
                if k < len(b["pubkeys"]):
                    c.that(len(w) == 2 and w[1] == b["pubkeys"][k], "input %d's public key is the one the signature recovers" % k)
        c.that(all((i.get("prevout") or {}).get("scriptpubkey_address") == x["from"] for i in doc["vin"]), "every input belonged to %s" % x["from"])
        st = doc.get("status") or {}
        if x.get("status") == "broadcast" and not st.get("confirmed"):
            c.note("broadcast, not yet confirmed (testnet4 blocks can be hours apart); accepted as recorded")
        else:
            c.that(bool(st.get("confirmed")), "confirmed in block %s" % st.get("block_height"))
    elif x["chain"] == "solana-devnet":
        so = sig.get("sol") if sig else None
        if so:
            c.that(so["tx"] == x["tx"], "the record's signature is the Solana tx id %s" % x["tx"][:16])
        res = doc.get("result") if isinstance(doc, dict) else None
        if not c.that(isinstance(res, dict), "the tx exists on Solana devnet"):
            return None
        msg = res["transaction"]["message"]
        c.that(res["transaction"]["signatures"][0] == x["tx"], "first signature is the record's")
        c.that(msg["accountKeys"][0] == x["from"], "fee payer and signer is the Satchel's SOL address %s" % x["from"])
        if so:
            c.that(msg["recentBlockhash"] == so["recent_blockhash"], "recent blockhash matches the record")
        c.that((res.get("meta") or {}).get("err") is None, "executed without error (slot %s)" % res.get("slot"))


def verify_one(p, docs):
    c = Check()
    t = near_tx(docs.get(key_of("near", p["tx"])))
    if t is None:
        return "SKIP", ["could not fetch NEAR tx %s from the FastNEAR tx API or the RPC fallback" % p["tx"]]
    c.note("source: %s" % t["source"])
    c.that(t["hash"] == p["tx"], "tx %s" % p["tx"])
    c.that(t["signer"] == p["signer"], "signer %s" % p["signer"])
    c.that(t["receiver"] == p["receiver"], "receiver %s" % p["receiver"])
    fc = [a for a in t["actions"] if a["kind"] == "FunctionCall"]
    c.that(bool(fc) and fc[0]["method"] == p["method"], "method %s" % p["method"])
    if p.get("args") and fc:
        c.that(subset(p["args"], fc[0].get("args")), "arguments include %s" % json.dumps(p["args"], separators=(",", ":")))
    codes = error_codes(t)
    e = p["expect"]
    if e["outcome"] == "success":
        c.that(isinstance(t["final"], dict) and "SuccessValue" in t["final"], "the transaction succeeded")
        c.that(not codes, "no contract error" + (" (saw %s)" % ", ".join(codes) if codes else ""))
    else:
        c.that(e["error"] in codes, "refused with %s%s" % (e["error"], "" if e["error"] in codes else " (saw %s)" % (", ".join(codes) or "no error")))
    for ev in p.get("events", []):
        c.that(find_event(t, ev["event"], ev.get("data")) is not None, "event %s%s" % (ev["event"], " " + json.dumps(ev["data"], separators=(",", ":")) if ev.get("data") else ""))
    for name in p.get("absent_events", []):
        c.that(find_event(t, name) is None, "no %s event" % name)
    sig = None
    if p.get("signature"):
        try:
            sig = check_signature(c, p, t, docs)
        except (ValueError, KeyError, IndexError, TypeError) as err:
            c.that(False, "signature record parses (%s)" % err)
    if p.get("external"):
        x = p["external"]
        d = docs.get(key_of(x["chain"], x["tx"]))
        if d is None:
            c.note("could not fetch %s tx %s; external checks skipped" % (x["chain"], x["tx"]))
            return ("PASS" if c.ok else "FAIL"), c.lines + ["SKIP external chain unreachable"]
        try:
            check_external(c, p, sig, d)
        except (ValueError, KeyError, IndexError, TypeError) as err:
            c.that(False, "external tx parses (%s)" % err)
    return ("PASS" if c.ok else "FAIL"), c.lines


def cmd_verify(doc, folder, only, verbose):
    docs = {}
    for k, _ in fetches(doc, only):
        d = read_json(os.path.join(folder, k + ".json"))
        if usable(k, d):
            docs[k] = d
    counts = {"PASS": 0, "FAIL": 0, "SKIP": 0}
    print("Satchel live proofs · contract %s (%s) · %s" % (doc["contract"], doc.get("contract_role", "?"), doc.get("note", "")))
    for p in selected(doc, only):
        verdict, lines = verify_one(p, docs)
        counts[verdict] += 1
        print()
        print("%-4s [%s] %s" % (verdict, p["id"], p["action"]))
        print("     near: %s%s" % (NEARBLOCKS, p["tx"]))
        if p.get("external"):
            print("     %s: %s" % (p["external"]["chain"], explorer(p["external"]["chain"], p["external"]["tx"])))
        for line in lines:
            quiet = line.startswith("ok   ") or line.startswith("     source:")
            if verbose or verdict != "PASS" or not quiet:
                print("     " + line)
    print()
    print("summary: %d pass · %d fail · %d skip" % (counts["PASS"], counts["FAIL"], counts["SKIP"]))
    return 1 if counts["FAIL"] else 0


# -------------------------------------------------------------------------------------------------- self-test

def self_test():
    ok = True

    def t(cond, what):
        nonlocal ok
        print(("PASS " if cond else "FAIL ") + what)
        ok = ok and cond

    t(keccak256(b"").hex() == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470", "keccak256('')")
    t(keccak256(b"abc").hex() == "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45", "keccak256('abc')")
    t(keccak256(b"The quick brown fox jumps over the lazy dog").hex() == "4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15", "keccak256(quick brown fox)")
    # secp256k1: private key 1 → the generator; the well-known address of key 1.
    t(eth_address((GX, GY)) == "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf", "address of private key 1")
    # sign z with k=2, d=1 by hand, then recover
    z = keccak256(b"satchel")
    k, d = 2, 1
    rp = _mul(k, (GX, GY))
    r = rp[0] % N
    s = pow(k, -1, N) * (int.from_bytes(z, "big") + r * d) % N
    recid = rp[1] & 1
    t(secp_recover(z, r, s, recid) == (GX, GY), "secp256k1 public-key recovery")
    # RFC 8032 test 1 and 2
    t(ed25519_verify(bytes.fromhex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"), b"",
                     bytes.fromhex("e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b")), "ed25519 RFC 8032 test 1")
    t(ed25519_verify(bytes.fromhex("3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c"), bytes.fromhex("72"),
                     bytes.fromhex("92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00")), "ed25519 RFC 8032 test 2")
    t(not ed25519_verify(bytes.fromhex("3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c"), bytes.fromhex("73"),
                         bytes.fromhex("92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00")), "ed25519 rejects a changed message")
    t(segwit_v0_address("bc", bytes.fromhex("751e76e8199196d454941c45d1b3a323f1433bd6")) == "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "bech32 BIP 173 vector")
    t(b58encode(b58decode("2jgCnruxgsWMP2EwbtjYdG8gqepRNkBE7T3qJAA71Afo")) == "2jgCnruxgsWMP2EwbtjYdG8gqepRNkBE7T3qJAA71Afo", "base58 round trip")
    t(b58encode(b"\0\0\1") == "112", "base58 leading zeros")
    item, rest = rlp_decode(rlp_encode([b"dog", [b"", b"\x01"], b"x" * 60]))
    t(item == [b"dog", [b"", b"\x01"], b"x" * 60] and rest == b"", "RLP round trip")
    t(der_sig(1, 0x80).hex() == "3007020101020200" + "80", "DER pads a high bit")
    # recorded fixtures: a real proofs.json and the answers fetched for it (tools/test/fixtures/proofs/)
    here = os.path.dirname(os.path.abspath(__file__))
    fx = os.path.join(here, "..", "test", "fixtures", "proofs")
    if os.path.isfile(os.path.join(fx, "proofs.json")):
        doc = load(os.path.join(fx, "proofs.json"))
        docs = {k: read_json(os.path.join(fx, k + ".json")) for k, _ in fetches(doc, None)}
        for p in doc["proofs"]:
            verdict, lines = verify_one(p, {k: v for k, v in docs.items() if usable(k, v)})
            want = p.get("_fixture_expect", "PASS")
            t(verdict == want, "fixture %s: %s (want %s)%s" % (p["id"], verdict, want, "" if verdict == want else "\n  " + "\n  ".join(lines)))
    else:
        t(False, "fixtures missing: " + fx)
    print("self-test: " + ("all pass" if ok else "FAILURES"))
    return 0 if ok else 1


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]
    only = None
    if "--only" in rest:
        i = rest.index("--only")
        only = rest[i + 1]
        rest = rest[:i] + rest[i + 2:]
    verbose = "--verbose" in rest
    rest = [r for r in rest if r != "--verbose"]
    if cmd == "self-test":
        return self_test()
    if cmd == "usable":
        return 0 if usable(rest[0], read_json(rest[1])) else 1
    doc = load(rest[0])
    if cmd == "plan":
        cmd_plan(doc, only)
        return 0
    if cmd == "print":
        cmd_print(doc, only)
        return 0
    if cmd == "verify":
        return cmd_verify(doc, rest[1], only, verbose)
    print("unknown command " + cmd, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
