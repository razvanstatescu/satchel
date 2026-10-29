//! Parser fuzzing for the §5.9 classifiers (method, counts and findings: docs/security/fuzzing.md).
//!
//! Three layers, all stable Rust (proptest + sha2/sha3 as dev-dependencies, so the wasm is unchanged):
//! 1. **Oracles.** An independent re-implementation of each §5.9 rule set, written from the spec in a different style
//!    (RLP canonicality by re-encoding, shortvec/CompactSize canonicality by re-encoding, hashes via sha2/sha3 rather
//!    than near-sdk's env). Every property checks `classifier accepts ⇔ oracle accepts` and, on accept, that every
//!    extracted field and every hash equals the oracle's.
//! 2. **Properties.** No panics on arbitrary bytes / strings; refusals carry a stable code of the right chain; valid
//!    builders are always accepted; seed mutation (byte flips, insertions, deletions, RLP / compact-u16 / varint length
//!    tweaks, BTC structural edits with optional commitment fix-up); RLP round trips.
//! 3. **Differential.** `differential_vs_ts_reference` replays the corpus produced by the TS reference classifier
//!    (`tools/fuzz/gen-corpus.ts`, verdicts from `@satchel/core/policy`) and compares verdict, error code, hashes and
//!    fields. Any disagreement that is not a recorded finding fails the test.
//!
//! Fast (CI) run: `cargo test -p satchel --lib parse::fuzz_tests` (proptest default, 256 cases per property).
//! Deep run:      `PROPTEST_CASES=200000 cargo test -p satchel --lib --release parse::fuzz_tests`
//!                `SATCHEL_FUZZ_CORPUS=target/fuzz-corpus cargo test -p satchel --lib --release differential`

use super::{btc, classify, evm, hex as phex, rlp, sol, Classified};
use crate::errors::*;
use crate::mpc::MpcPayload;
use crate::types::{Chain, SigDetail, SignRequest};
use near_sdk::serde_json::{self, Value};
use proptest::prelude::*;
use proptest::sample::Index;
use sha2::{Digest, Sha256};
use sha3::Keccak256;
use std::collections::{BTreeMap, HashSet};
use std::sync::OnceLock;

// ───────────────────────────────────────── helpers ─────────────────────────────────────────

fn sha256(b: &[u8]) -> [u8; 32] {
    Sha256::digest(b).into()
}
fn sha256d(b: &[u8]) -> [u8; 32] {
    sha256(&sha256(b))
}
fn keccak(b: &[u8]) -> [u8; 32] {
    Keccak256::digest(b).into()
}
fn hx(b: &[u8]) -> String {
    hex::encode(b)
}

/// The mocked blockchain charges gas for every env::sha256/keccak256 and panics with GasLimitExceeded once the
/// prepaid gas is used up; long runs therefore start a fresh mock every few hundred classifications.
fn env_tick() {
    thread_local!(static N: std::cell::Cell<u32> = const { std::cell::Cell::new(0) });
    N.with(|n| {
        n.set(n.get().wrapping_add(1));
        if n.get() % 200 == 0 {
            near_sdk::testing_env!(near_sdk::test_utils::VMContextBuilder::new().build());
        }
    });
}

const EVM_CODES: &[&str] = &[
    ERR_EVM_TOO_LONG, ERR_EVM_TYPE, ERR_EVM_RLP, ERR_EVM_CHAIN_ID, ERR_EVM_INT_WIDTH, ERR_EVM_TO, ERR_EVM_DATA, ERR_EVM_ACCESS_LIST,
];
const BTC_CODES: &[&str] = &[
    ERR_BTC_INPUT_COUNT, ERR_BTC_PREIMAGE_LEN, ERR_BTC_VERSION, ERR_BTC_SIGHASH, ERR_BTC_SCRIPTCODE, ERR_BTC_LOCKTIME,
    ERR_BTC_SEQUENCE, ERR_BTC_MIXED_TX, ERR_BTC_PREVOUTS_INCOMPLETE, ERR_BTC_SEQUENCES_MISMATCH, ERR_BTC_OUTPUTS_MISMATCH,
    ERR_BTC_OUTPUTS_MALFORMED, ERR_BTC_DUPLICATE_INPUT,
];
const SOL_CODES: &[&str] =
    &[ERR_SOL_TOO_LONG, ERR_SOL_VERSION, ERR_SOL_HEADER, ERR_SOL_MALFORMED, ERR_SOL_INSTRUCTION, ERR_SOL_DURABLE_NONCE];

fn cfg() -> ProptestConfig {
    // `default()` honours PROPTEST_CASES; never write regression files into src/.
    ProptestConfig { failure_persistence: None, ..ProptestConfig::default() }
}

// ───────────────────────────────────────── oracle: hex ─────────────────────────────────────────

/// §5.9 Common: optional `0x`/`0X` (once), even length, `[0-9a-fA-F]` only.
fn hex_oracle(s: &str) -> Option<Vec<u8>> {
    let body = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(s);
    let b = body.as_bytes();
    if !b.len().is_multiple_of(2) || !b.iter().all(u8::is_ascii_hexdigit) {
        return None;
    }
    let nib = |c: u8| (c as char).to_digit(16).unwrap() as u8;
    Some(b.chunks(2).map(|p| (nib(p[0]) << 4) | nib(p[1])).collect())
}

// ───────────────────────────────────────── oracle: RLP ─────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
enum R {
    S(Vec<u8>),
    L(Vec<R>),
}

fn be_len(lb: &[u8]) -> Option<usize> {
    if lb.len() > 8 {
        return None;
    }
    usize::try_from(lb.iter().fold(0u64, |a, x| (a << 8) | *x as u64)).ok()
}

fn rlp_hdr(base: u8, len: usize) -> Vec<u8> {
    if len <= 55 {
        vec![base + len as u8]
    } else {
        let lb: Vec<u8> = (len as u64).to_be_bytes().into_iter().skip_while(|b| *b == 0).collect();
        let mut v = vec![base + 55 + lb.len() as u8];
        v.extend(lb);
        v
    }
}

/// The canonical (shortest-form) encoding.
fn rlp_enc(r: &R) -> Vec<u8> {
    match r {
        R::S(b) if b.len() == 1 && b[0] < 0x80 => b.clone(),
        R::S(b) => [rlp_hdr(0x80, b.len()), b.clone()].concat(),
        R::L(items) => {
            let p: Vec<u8> = items.iter().flat_map(rlp_enc).collect();
            [rlp_hdr(0xc0, p.len()), p].concat()
        }
    }
}

/// Lenient decode of one item at the start of `b`: any header form is accepted. Returns (item, bytes consumed).
fn rlp_lenient(b: &[u8]) -> Option<(R, usize)> {
    let h = *b.first()?;
    let (list, off, len) = match h {
        0x00..=0x7f => return Some((R::S(vec![h]), 1)),
        0x80..=0xb7 => (false, 1, (h - 0x80) as usize),
        0xb8..=0xbf => {
            let ll = (h - 0xb7) as usize;
            (false, 1 + ll, be_len(b.get(1..1 + ll)?)?)
        }
        0xc0..=0xf7 => (true, 1, (h - 0xc0) as usize),
        0xf8..=0xff => {
            let ll = (h - 0xf7) as usize;
            (true, 1 + ll, be_len(b.get(1..1 + ll)?)?)
        }
    };
    let end = off.checked_add(len)?;
    let body = b.get(off..end)?;
    if !list {
        return Some((R::S(body.to_vec()), end));
    }
    let mut items = vec![];
    let mut p = 0;
    while p < body.len() {
        let (it, n) = rlp_lenient(&body[p..])?;
        items.push(it);
        p += n;
    }
    Some((R::L(items), end))
}

/// Canonical RLP oracle: exactly one item spanning `b`, and `b` is its canonical encoding (uniqueness ⇒ canonical).
fn rlp_canonical(b: &[u8]) -> Option<R> {
    let (r, n) = rlp_lenient(b)?;
    (n == b.len() && rlp_enc(&r) == b).then_some(r)
}

/// Depth of the deepest item (the top-level item is depth 0).
fn rlp_depth(r: &R) -> usize {
    match r {
        R::S(_) => 0,
        R::L(items) => items.iter().map(|i| 1 + rlp_depth(i)).max().unwrap_or(0),
    }
}

fn from_contract(it: &rlp::Item) -> R {
    match it {
        rlp::Item::Str(s) => R::S(s.to_vec()),
        rlp::Item::List(l) => R::L(l.iter().map(from_contract).collect()),
    }
}

/// Header positions (and long-form length bytes) of every item, for length-field tweaks. Best effort on bad input.
fn rlp_hot(b: &[u8], base: usize, out: &mut Vec<usize>, depth: usize) {
    let mut p = 0;
    while p < b.len() && depth < 24 && out.len() < 64 {
        out.push(base + p);
        let h = b[p];
        let (list, off, len) = match h {
            0x00..=0x7f => {
                p += 1;
                continue;
            }
            0x80..=0xb7 => (false, 1, (h - 0x80) as usize),
            0xc0..=0xf7 => (true, 1, (h - 0xc0) as usize),
            _ => {
                let ll = (h - if h >= 0xf8 { 0xf7 } else { 0xb7 }) as usize;
                for i in 1..=ll {
                    out.push(base + p + i);
                }
                let Some(n) = b.get(p + 1..p + 1 + ll).and_then(be_len) else { return };
                (h >= 0xf8, 1 + ll, n)
            }
        };
        let Some(end) = (p + off).checked_add(len) else { return };
        if list {
            let stop = end.min(b.len());
            if p + off <= stop {
                rlp_hot(&b[p + off..stop], base + p + off, out, depth + 1);
            }
        }
        p = end;
    }
}

// ───────────────────────────────────────── oracle: EVM ─────────────────────────────────────────

#[derive(Debug, PartialEq)]
struct EvmO {
    chain_id: u64,
    nonce: u64,
}

fn be_u128(b: &[u8]) -> u128 {
    b.iter().fold(0u128, |a, x| (a << 8) | *x as u128)
}

fn evm_oracle(tx: &[u8]) -> Option<EvmO> {
    if tx.len() > 128 || tx.first() != Some(&0x02) {
        return None;
    }
    let R::L(f) = rlp_canonical(&tx[1..])? else { return None };
    if f.len() != 9 {
        return None;
    }
    let s = |i: usize| match &f[i] {
        R::S(b) => Some(b.as_slice()),
        R::L(_) => None,
    };
    let int = |i: usize| s(i).filter(|b| b.first() != Some(&0));
    let (chain, nonce, tip, fee, gas, to, value, data) = (int(0)?, int(1)?, int(2)?, int(3)?, int(4)?, s(5)?, int(6)?, s(7)?);
    let R::L(al) = &f[8] else { return None };
    if chain.len() > 8 || be_u128(chain) != 11_155_111 {
        return None;
    }
    if nonce.len() > 8 || gas.len() > 8 || tip.len() > 16 || fee.len() > 16 || value.len() > 16 {
        return None;
    }
    if be_u128(nonce) == u64::MAX as u128 || to.len() != 20 || !data.is_empty() || !al.is_empty() {
        return None;
    }
    Some(EvmO { chain_id: 11_155_111, nonce: be_u128(nonce) as u64 })
}

// ───────────────────────────────────────── oracle: BTC ─────────────────────────────────────────

#[derive(Debug, PartialEq)]
struct BtcO {
    txid: [u8; 32],
    vout: u32,
    amount: u64,
    sighash: [u8; 32],
}

/// CompactSize, any width; canonical iff it re-encodes to the same bytes.
fn compact_size(b: &[u8], pos: usize) -> Option<(u64, usize)> {
    let f = *b.get(pos)?;
    let w = match f {
        0xfd => 2,
        0xfe => 4,
        0xff => 8,
        _ => return Some((f as u64, pos + 1)),
    };
    let bytes = b.get(pos + 1..pos + 1 + w)?;
    let v = bytes.iter().rev().fold(0u64, |a, x| (a << 8) | *x as u64);
    let min = match w {
        2 => 0xfd,
        4 => 0x1_0000,
        _ => 0x1_0000_0000,
    };
    (v >= min).then_some((v, pos + 1 + w))
}

fn enc_compact_size(n: u64) -> Vec<u8> {
    match n {
        0..=0xfc => vec![n as u8],
        0xfd..=0xffff => [vec![0xfd], (n as u16).to_le_bytes().to_vec()].concat(),
        0x1_0000..=0xffff_ffff => [vec![0xfe], (n as u32).to_le_bytes().to_vec()].concat(),
        _ => [vec![0xff], n.to_le_bytes().to_vec()].concat(),
    }
}

fn outputs_oracle(o: &[u8]) -> Option<Vec<(u64, Vec<u8>)>> {
    if o.is_empty() || o.len() > 1024 {
        return None;
    }
    let mut outs = vec![];
    let mut p = 0;
    while p < o.len() {
        let value = u64::from_le_bytes(o.get(p..p + 8)?.try_into().ok()?);
        let (len, q) = compact_size(o, p + 8)?;
        if len > 520 {
            return None;
        }
        let script = o.get(q..q + len as usize)?;
        outs.push((value, script.to_vec()));
        p = q + len as usize;
    }
    (1..=16).contains(&outs.len()).then_some(outs)
}

fn ser_outputs(outs: &[(u64, Vec<u8>)]) -> Vec<u8> {
    outs.iter().flat_map(|(v, s)| [v.to_le_bytes().to_vec(), enc_compact_size(s.len() as u64), s.clone()].concat()).collect()
}

fn u32le(b: &[u8]) -> u32 {
    u32::from_le_bytes(b[..4].try_into().unwrap())
}

fn btc_oracle(pre: &[Vec<u8>], outs: &[u8]) -> Option<Vec<BtcO>> {
    if pre.is_empty() || pre.len() > 10 || pre.iter().any(|p| p.len() != 182) {
        return None;
    }
    for p in pre {
        let script_ok = p[104] == 0x19 && p[105] == 0x76 && p[106] == 0xa9 && p[107] == 0x14 && p[128] == 0x88 && p[129] == 0xac;
        if u32le(&p[0..]) != 2 || !script_ok || u32le(&p[138..]) < 0xffff_fffd || u32le(&p[174..]) != 0 || u32le(&p[178..]) != 1 {
            return None;
        }
    }
    let p0 = &pre[0];
    let shared = |p: &Vec<u8>| p[4..68] == p0[4..68] && p[108..128] == p0[108..128] && p[142..174] == p0[142..174];
    if !pre.iter().all(shared) {
        return None;
    }
    let distinct: HashSet<&[u8]> = pre.iter().map(|p| &p[68..104]).collect();
    if distinct.len() != pre.len() {
        return None;
    }
    let outpoints: Vec<u8> = pre.iter().flat_map(|p| p[68..104].to_vec()).collect();
    let seqs: Vec<u8> = pre.iter().flat_map(|p| p[138..142].to_vec()).collect();
    if sha256d(&outpoints)[..] != p0[4..36] || sha256d(&seqs)[..] != p0[36..68] {
        return None;
    }
    outputs_oracle(outs)?;
    if sha256d(outs)[..] != p0[142..174] {
        return None;
    }
    Some(
        pre.iter()
            .map(|p| {
                let mut txid: [u8; 32] = p[68..100].try_into().unwrap();
                txid.reverse();
                BtcO {
                    txid,
                    vout: u32le(&p[100..]),
                    amount: u64::from_le_bytes(p[130..138].try_into().unwrap()),
                    sighash: sha256d(p),
                }
            })
            .collect(),
    )
}

// ───────────────────────────────────────── oracle: SOL ─────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
struct SolIx {
    prog: u8,
    accounts: Vec<u8>,
    data: Vec<u8>,
}
#[derive(Debug, Clone, PartialEq)]
struct SolMsg {
    header: [u8; 3],
    keys: Vec<[u8; 32]>,
    blockhash: [u8; 32],
    ixs: Vec<SolIx>,
}

/// Generic LEB128-style shortvec (≤ 3 bytes, ≤ u16::MAX); canonical iff it re-encodes to the same bytes.
fn shortvec(b: &[u8], pos: &mut usize) -> Option<usize> {
    let start = *pos;
    let mut v: u32 = 0;
    for i in 0..3 {
        let x = *b.get(*pos)?;
        *pos += 1;
        v |= ((x & 0x7f) as u32) << (7 * i);
        if x & 0x80 == 0 {
            return (v <= 0xffff && enc_shortvec(v as usize) == b[start..*pos]).then_some(v as usize);
        }
    }
    None
}

fn enc_shortvec(mut n: usize) -> Vec<u8> {
    let mut out = vec![];
    loop {
        let x = (n & 0x7f) as u8;
        n >>= 7;
        if n == 0 {
            out.push(x);
            return out;
        }
        out.push(x | 0x80);
    }
}

/// Full strict parse of a legacy message (rule 3 + header).
fn sol_parse(m: &[u8]) -> Option<SolMsg> {
    let header: [u8; 3] = m.get(0..3)?.try_into().ok()?;
    let mut p = 3;
    let nk = shortvec(m, &mut p)?;
    let mut keys = vec![];
    for _ in 0..nk {
        keys.push(m.get(p..p + 32)?.try_into().ok()?);
        p += 32;
    }
    let blockhash = m.get(p..p + 32)?.try_into().ok()?;
    p += 32;
    let nix = shortvec(m, &mut p)?;
    let mut ixs = vec![];
    for _ in 0..nix {
        let prog = *m.get(p)?;
        p += 1;
        let na = shortvec(m, &mut p)?;
        let accounts = m.get(p..p + na)?.to_vec();
        p += na;
        let nd = shortvec(m, &mut p)?;
        let data = m.get(p..p + nd)?.to_vec();
        p += nd;
        ixs.push(SolIx { prog, accounts, data });
    }
    (p == m.len()).then_some(SolMsg { header, keys, blockhash, ixs })
}

fn sol_ser(s: &SolMsg) -> Vec<u8> {
    let mut out = s.header.to_vec();
    out.extend(enc_shortvec(s.keys.len()));
    s.keys.iter().for_each(|k| out.extend(k));
    out.extend(s.blockhash);
    out.extend(enc_shortvec(s.ixs.len()));
    for ix in &s.ixs {
        out.push(ix.prog);
        out.extend(enc_shortvec(ix.accounts.len()));
        out.extend(&ix.accounts);
        out.extend(enc_shortvec(ix.data.len()));
        out.extend(&ix.data);
    }
    out
}

#[derive(Debug, PartialEq)]
struct SolO {
    blockhash: [u8; 32],
    lamports: u64,
}

fn sol_oracle(m: &[u8]) -> Option<SolO> {
    if m.len() > 1232 || *m.first()? >= 0x80 {
        return None;
    }
    let s = sol_parse(m)?;
    let nk = s.keys.len();
    if s.header[0] != 1 || s.header[1] != 0 || !(2..=16).contains(&nk) || 1 + s.header[2] as usize > nk {
        return None;
    }
    if s.ixs.iter().any(|ix| ix.prog as usize >= nk || ix.accounts.iter().any(|a| *a as usize >= nk)) {
        return None;
    }
    let system = |ix: &SolIx| s.keys[ix.prog as usize] == [0u8; 32];
    if s.ixs.iter().any(|ix| system(ix) && ix.data.starts_with(&[4, 0, 0, 0])) {
        return None;
    }
    let [ix] = s.ixs.as_slice() else { return None };
    if !system(ix) || ix.data.len() != 12 || ix.data[..4] != [2, 0, 0, 0] || ix.accounts.len() != 2 || ix.accounts[0] != 0 {
        return None;
    }
    Some(SolO { blockhash: s.blockhash, lamports: u64::from_le_bytes(ix.data[4..12].try_into().unwrap()) })
}

/// shortvec positions of a (possibly malformed) message, for compact-u16 tweaks.
fn sol_hot(m: &[u8]) -> Vec<usize> {
    let mut hot = vec![0, 1, 2, 3];
    let mut p = 3;
    let lenient = |p: &mut usize| -> Option<usize> {
        let mut v = 0usize;
        for i in 0..3 {
            let x = *m.get(*p)?;
            *p += 1;
            v |= ((x & 0x7f) as usize) << (7 * i);
            if x & 0x80 == 0 {
                return Some(v);
            }
        }
        Some(v)
    };
    let Some(nk) = lenient(&mut p) else { return hot };
    p += 32 * nk.min(40) + 32;
    hot.push(p);
    let Some(nix) = lenient(&mut p) else { return hot };
    for _ in 0..nix.min(8) {
        hot.push(p);
        p += 1;
        hot.push(p);
        let Some(na) = lenient(&mut p) else { break };
        p += na;
        hot.push(p);
        let Some(nd) = lenient(&mut p) else { break };
        if p < m.len() {
            hot.push(p); // first data byte (instruction tag)
        }
        p += nd;
    }
    hot.retain(|x| *x < m.len());
    hot
}

// ───────────────────────────────────── contract-vs-oracle checks ─────────────────────────────────────

fn check_evm(tx: &[u8]) -> Result<(), String> {
    env_tick();
    let got = evm::classify(tx);
    let want = evm_oracle(tx);
    match (&got, &want) {
        (Ok(g), Some(w)) if g.chain_id == w.chain_id && g.nonce == w.nonce => Ok(()),
        (Err(e), None) if EVM_CODES.contains(e) => Ok(()),
        _ => Err(format!("EVM {}: contract {got:?}, oracle {want:?}", hx(tx))),
    }
}

fn check_btc(pre: &[Vec<u8>], outs: &[u8]) -> Result<(), String> {
    env_tick();
    let got = btc::classify(pre, outs);
    let want = btc_oracle(pre, outs);
    let same = |g: &Vec<btc::BtcInput>, w: &Vec<BtcO>| {
        g.len() == w.len()
            && g.iter().zip(w).all(|(g, w)| g.txid == w.txid && g.vout == w.vout && g.amount_sats == w.amount && g.sighash == w.sighash)
    };
    match (&got, &want) {
        (Ok(g), Some(w)) if same(g, w) => Ok(()),
        (Err(e), None) if BTC_CODES.contains(e) => Ok(()),
        _ => Err(format!(
            "BTC pre=[{}] outs={}: contract {got:?}, oracle {}",
            pre.iter().map(|p| hx(p)).collect::<Vec<_>>().join(","),
            hx(outs),
            if want.is_some() { "accept" } else { "refuse" }
        )),
    }
}

fn check_sol(m: &[u8]) -> Result<(), String> {
    env_tick();
    let got = sol::classify(m);
    let want = sol_oracle(m);
    match (&got, &want) {
        (Ok(g), Some(w)) if g.recent_blockhash == w.blockhash && g.lamports == w.lamports => {
            // canonical uniqueness: an accepted message is exactly the re-serialization of what was parsed
            let s = sol_parse(m).ok_or("accepted but unparseable")?;
            (sol_ser(&s) == m).then_some(()).ok_or_else(|| format!("SOL {}: accepted but not canonical", hx(m)))
        }
        (Err(e), None) if SOL_CODES.contains(e) => Ok(()),
        _ => Err(format!("SOL {}: contract {got:?}, oracle {want:?}", hx(m))),
    }
}

/// Checks a full `parse::classify` result (record, MPC payload, detail, event bytes) against the oracles.
fn check_request(req: &SignRequest) -> Result<(), String> {
    env_tick();
    let got = classify(req);
    let fail = |m: &str| Err(format!("{req:?}: {m}: {got:?}"));
    let ecdsa = |h: &[u8; 32]| MpcPayload::Ecdsa(hx(h));
    match req {
        SignRequest::Evm { unsigned_tx } => {
            let Some(tx) = hex_oracle(unsigned_tx) else { return if got == Err(ERR_HEX) { Ok(()) } else { fail("want ERR_HEX") } };
            match (&got, evm_oracle(&tx)) {
                (Err(e), None) if *e == evm::classify(&tx).unwrap_err() => Ok(()),
                (Ok(c), Some(o)) => {
                    let h = keccak(&tx);
                    let ok = c.chain == Chain::Evm
                        && c.items.len() == 1
                        && c.items[0].record_payload == h
                        && c.items[0].mpc_payload == ecdsa(&h)
                        && c.items[0].detail == SigDetail::Evm { chain_id: o.chain_id, nonce: o.nonce, unsigned_tx: tx.clone() }
                        && c.preimages == vec![tx.clone()]
                        && c.btc_outputs.is_none();
                    if ok { Ok(()) } else { fail("accepted with wrong record") }
                }
                _ => fail("verdict differs from oracle"),
            }
        }
        SignRequest::Btc { preimages, outputs } => {
            if preimages.is_empty() || preimages.len() > 10 {
                return if got == Err(ERR_BTC_INPUT_COUNT) { Ok(()) } else { fail("want ERR_BTC_INPUT_COUNT") };
            }
            let pre: Option<Vec<Vec<u8>>> = preimages.iter().map(|p| hex_oracle(p)).collect();
            let (Some(pre), Some(outs)) = (pre, hex_oracle(outputs)) else {
                return if got == Err(ERR_HEX) { Ok(()) } else { fail("want ERR_HEX") };
            };
            match (&got, btc_oracle(&pre, &outs)) {
                (Err(e), None) if *e == btc::classify(&pre, &outs).unwrap_err() => Ok(()),
                (Ok(c), Some(o)) => {
                    let ok = c.chain == Chain::Btc
                        && c.items.len() == o.len()
                        && c.items.iter().zip(&o).all(|(it, o)| {
                            it.record_payload == o.sighash
                                && it.mpc_payload == ecdsa(&o.sighash)
                                && it.detail == SigDetail::Btc { txid: o.txid, vout: o.vout, amount_sats: o.amount }
                        })
                        && c.preimages == pre
                        && c.btc_outputs.as_deref() == Some(&outs[..]);
                    if ok { Ok(()) } else { fail("accepted with wrong records") }
                }
                _ => fail("verdict differs from oracle"),
            }
        }
        SignRequest::Sol { message } => {
            let Some(m) = hex_oracle(message) else { return if got == Err(ERR_HEX) { Ok(()) } else { fail("want ERR_HEX") } };
            match (&got, sol_oracle(&m)) {
                (Err(e), None) if *e == sol::classify(&m).unwrap_err() => Ok(()),
                (Ok(c), Some(o)) => {
                    let ok = c.chain == Chain::Sol
                        && c.items.len() == 1
                        && c.items[0].record_payload == sha256(&m)
                        && c.items[0].mpc_payload == MpcPayload::Eddsa(hx(&m))
                        && c.items[0].detail == SigDetail::Sol { recent_blockhash: o.blockhash, lamports: o.lamports }
                        && c.preimages == vec![m.clone()];
                    if ok { Ok(()) } else { fail("accepted with wrong record") }
                }
                _ => fail("verdict differs from oracle"),
            }
        }
    }
}

// ───────────────────────────────────────── builders (independent) ─────────────────────────────────────────

fn int_r(v: u128) -> R {
    R::S(v.to_be_bytes().into_iter().skip_while(|b| *b == 0).collect())
}

fn evm_build(nonce: u64, tip: u128, fee: u128, gas: u64, to: [u8; 20], value: u128) -> Vec<u8> {
    let l = R::L(vec![
        int_r(11_155_111),
        int_r(nonce as u128),
        int_r(tip),
        int_r(fee),
        int_r(gas as u128),
        R::S(to.to_vec()),
        int_r(value),
        R::S(vec![]),
        R::L(vec![]),
    ]);
    [vec![0x02], rlp_enc(&l)].concat()
}

#[derive(Debug, Clone)]
struct BIn {
    txid_le: [u8; 32],
    vout: u32,
    amount: u64,
    seq: u32,
}

fn btc_preimages(ins: &[BIn], pkh: [u8; 20], outs: &[u8]) -> Vec<Vec<u8>> {
    let outpoints: Vec<u8> = ins.iter().flat_map(|i| [i.txid_le.to_vec(), i.vout.to_le_bytes().to_vec()].concat()).collect();
    let seqs: Vec<u8> = ins.iter().flat_map(|i| i.seq.to_le_bytes()).collect();
    let (hp, hs, ho) = (sha256d(&outpoints), sha256d(&seqs), sha256d(outs));
    ins.iter()
        .map(|i| {
            [
                &2u32.to_le_bytes()[..],
                &hp,
                &hs,
                &i.txid_le,
                &i.vout.to_le_bytes(),
                &[0x19, 0x76, 0xa9, 0x14],
                &pkh,
                &[0x88, 0xac],
                &i.amount.to_le_bytes(),
                &i.seq.to_le_bytes(),
                &ho,
                &0u32.to_le_bytes(),
                &1u32.to_le_bytes(),
            ]
            .concat()
        })
        .collect()
}

/// Recompute hashPrevouts / hashSequence / hashOutputs from the current preimages + outputs (when all are 182 B).
fn btc_fixup(pre: &mut [Vec<u8>], outs: &[u8], align_pkh: bool) {
    if pre.is_empty() || pre.iter().any(|p| p.len() != 182) {
        return;
    }
    let outpoints: Vec<u8> = pre.iter().flat_map(|p| p[68..104].to_vec()).collect();
    let seqs: Vec<u8> = pre.iter().flat_map(|p| p[138..142].to_vec()).collect();
    let (hp, hs, ho) = (sha256d(&outpoints), sha256d(&seqs), sha256d(outs));
    let pkh = pre[0][108..128].to_vec();
    for p in pre.iter_mut() {
        p[4..36].copy_from_slice(&hp);
        p[36..68].copy_from_slice(&hs);
        p[142..174].copy_from_slice(&ho);
        if align_pkh {
            p[108..128].copy_from_slice(&pkh);
        }
    }
}

fn sol_build(nk: usize, ro_u: u8, sys: usize, to: usize, key_seed: u64, blockhash: [u8; 32], lamports: u64) -> Vec<u8> {
    let keys: Vec<[u8; 32]> =
        (0..nk).map(|i| if i == sys { [0u8; 32] } else { sha256(&[key_seed.to_le_bytes(), (i as u64).to_le_bytes()].concat()) }).collect();
    let data = [vec![2, 0, 0, 0], lamports.to_le_bytes().to_vec()].concat();
    sol_ser(&SolMsg { header: [1, 0, ro_u], keys, blockhash, ixs: vec![SolIx { prog: sys as u8, accounts: vec![0, to as u8], data }] })
}

// ───────────────────────────────────────── seeds (vectors/*.json) ─────────────────────────────────────────

fn vectors(set: &str) -> Vec<Value> {
    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("../../vectors/{set}.json"));
    let Ok(t) = std::fs::read_to_string(&p) else { return vec![] };
    let doc: Value = serde_json::from_str(&t).expect("vectors json");
    doc["vectors"].as_array().cloned().unwrap_or_default()
}

fn evm_seeds() -> &'static Vec<Vec<u8>> {
    static S: OnceLock<Vec<Vec<u8>>> = OnceLock::new();
    S.get_or_init(|| {
        let mut v: Vec<Vec<u8>> =
            vectors("evm").iter().filter_map(|x| x["request"]["evm"]["unsigned_tx"].as_str().and_then(hex_oracle)).collect();
        v.push(evm_build(7, 1_500_000_000, 30_000_000_000, 21_000, [0x11; 20], 10u128.pow(15)));
        v.push(evm_build(u64::MAX - 1, u128::MAX, u128::MAX, u64::MAX, [0xff; 20], u128::MAX));
        v
    })
}

type BtcCase = (Vec<Vec<u8>>, Vec<u8>);
fn btc_seeds() -> &'static Vec<BtcCase> {
    static S: OnceLock<Vec<BtcCase>> = OnceLock::new();
    S.get_or_init(|| {
        let mut v: Vec<BtcCase> = vectors("btc")
            .iter()
            .filter_map(|x| {
                let b = &x["request"]["btc"];
                let pre: Option<Vec<Vec<u8>>> = b["preimages"].as_array()?.iter().map(|p| p.as_str().and_then(hex_oracle)).collect();
                Some((pre?, hex_oracle(b["outputs"].as_str()?)?))
            })
            .collect();
        let outs = ser_outputs(&[(40_000, [&[0x00, 0x14][..], &[0x42; 20]].concat()), (1_000, [&[0x51, 0x20][..], &[0x43; 32]].concat())]);
        let ins: Vec<BIn> = (0..3).map(|i| BIn { txid_le: [0xa0 + i as u8; 32], vout: i, amount: 50_000, seq: 0xffff_fffd }).collect();
        v.push((btc_preimages(&ins, [0xf6; 20], &outs), outs));
        v
    })
}

fn sol_seeds() -> &'static Vec<Vec<u8>> {
    static S: OnceLock<Vec<Vec<u8>>> = OnceLock::new();
    S.get_or_init(|| {
        let mut v: Vec<Vec<u8>> =
            vectors("sol").iter().filter_map(|x| x["request"]["sol"]["message"].as_str().and_then(hex_oracle)).collect();
        v.push(sol_build(3, 1, 2, 1, 1, [9; 32], 1_000_000));
        v.push(sol_build(16, 15, 15, 15, 2, [7; 32], u64::MAX));
        v
    })
}

#[test]
fn seeds_are_loaded_and_agree_with_oracles() {
    // Every vector's verdict must match the oracle too (the vectors are themselves a differential seed set).
    assert!(evm_seeds().len() > 30 && btc_seeds().len() > 20 && sol_seeds().len() > 20, "vectors/*.json missing");
    let mut fails = vec![];
    fails.extend(evm_seeds().iter().filter_map(|s| check_evm(s).err()));
    fails.extend(btc_seeds().iter().filter_map(|(p, o)| check_btc(p, o).err()));
    fails.extend(sol_seeds().iter().filter_map(|s| check_sol(s).err()));
    assert!(fails.is_empty(), "{}", fails.join("\n"));
    assert!(evm_seeds().iter().filter(|s| evm_oracle(s).is_some()).count() >= 8);
    assert!(btc_seeds().iter().filter(|(p, o)| btc_oracle(p, o).is_some()).count() >= 10);
    assert!(sol_seeds().iter().filter(|s| sol_oracle(s).is_some()).count() >= 6);
}

// ───────────────────────────────────────── mutation engine ─────────────────────────────────────────

const INTERESTING: [u8; 24] =
    [0x00, 0x01, 0x02, 0x03, 0x04, 0x0c, 0x7f, 0x80, 0x81, 0x82, 0xb7, 0xb8, 0xb9, 0xbf, 0xc0, 0xc1, 0xf7, 0xf8, 0xf9, 0xfc, 0xfd, 0xfe, 0xff, 0x14];

#[derive(Debug, Clone)]
struct Op {
    kind: u8,
    pos: u16,
    val: u8,
    n: u8,
}

fn arb_ops(max: usize) -> impl Strategy<Value = Vec<Op>> {
    let op = (any::<u8>(), any::<u16>(), any::<u8>(), any::<u8>()).prop_map(|(kind, pos, val, n)| Op { kind, pos, val, n });
    // mostly one or two edits (stay near the accept boundary), sometimes a burst
    let len = prop_oneof![3 => Just(1usize..2), 2 => Just(1usize..4), 1 => Just(1usize..max + 1)];
    len.prop_flat_map(move |r| prop::collection::vec(op.clone(), r))
}

fn apply(b: &mut Vec<u8>, op: &Op, hot: &[usize]) {
    let len = b.len();
    let at = |p: u16| -> usize {
        if !hot.is_empty() && p & 1 == 0 {
            hot[(p as usize >> 1) % hot.len()]
        } else if len == 0 {
            0
        } else {
            (p as usize >> 1) % len
        }
    };
    let i = at(op.pos);
    let interesting = INTERESTING[op.val as usize % INTERESTING.len()];
    match op.kind % 11 {
        0 if len > 0 => b[i.min(len - 1)] ^= 1 << (op.val % 8),
        1 if len > 0 => b[i.min(len - 1)] = interesting,
        2 if len > 0 => b[i.min(len - 1)] = op.val,
        3 => b.insert(i.min(len), if op.n & 1 == 0 { op.val } else { interesting }),
        4 if len > 0 => {
            b.remove(i.min(len - 1));
        }
        5 if op.n.is_multiple_of(4) => b.truncate(i.min(len)),
        6 => b.extend(std::iter::repeat_n(op.val, 1 + op.n as usize % 4)),
        7 | 8 if len > 0 => {
            // length-field tweak: ±1..3 (or ±0x80 to toggle a continuation / long-form bit)
            let d = [1u8, 2, 3, 0xff, 0xfe, 0xfd, 0x80, 0x38][op.n as usize % 8];
            let j = i.min(len - 1);
            b[j] = b[j].wrapping_add(d);
        }
        9 if len > 0 => {
            let s = i.min(len - 1);
            let chunk = b[s..(s + 1 + op.n as usize % 40).min(len)].to_vec();
            let at = op.val as usize % (len + 1);
            b.splice(at..at, chunk);
        }
        10 => {
            // non-canonical encodings: a redundant continuation byte, or a zero length prefix
            let j = i.min(len);
            if op.n & 1 == 0 && j < len && b[j] < 0x80 {
                b[j] |= 0x80;
                b.insert(j + 1, 0x00);
            } else {
                b.insert(j, 0x00);
            }
        }
        _ => {}
    }
}

fn mutate(seed: &[u8], ops: &[Op], hot: &[usize]) -> Vec<u8> {
    let mut b = seed.to_vec();
    for op in ops {
        apply(&mut b, op, hot);
    }
    b
}

fn evm_hot(tx: &[u8]) -> Vec<usize> {
    let mut hot = vec![];
    if tx.len() > 1 {
        rlp_hot(&tx[1..], 1, &mut hot, 0);
    }
    hot
}

fn outputs_hot(o: &[u8]) -> Vec<usize> {
    let mut hot = vec![];
    let mut p = 0;
    while p + 8 < o.len() && hot.len() < 40 {
        hot.push(p + 8);
        hot.push(p + 7);
        let Some((l, q)) = compact_size(o, p + 8).or_else(|| Some((o[p + 8] as u64 % 0xfd, p + 9))) else { break };
        p = q + l as usize;
    }
    hot
}

const PRE_HOT: [usize; 32] =
    [0, 1, 3, 4, 35, 36, 67, 68, 99, 100, 103, 104, 105, 106, 107, 108, 127, 128, 129, 130, 137, 138, 139, 141, 142, 173, 174, 177, 178, 179, 181, 181];

#[derive(Debug, Clone)]
struct BtcMut {
    structural: Vec<(u8, u8, u8)>,
    ops: Vec<(u8, Op)>,
    fixup: u8,
}

fn arb_btc_mut() -> impl Strategy<Value = BtcMut> {
    (
        prop::collection::vec((any::<u8>(), any::<u8>(), any::<u8>()), 0..3),
        prop::collection::vec((any::<u8>(), arb_ops(1).prop_map(|v| v[0].clone())), 0..6),
        any::<u8>(),
    )
        .prop_map(|(structural, ops, fixup)| BtcMut { structural, ops, fixup })
}

fn btc_apply(case: &BtcCase, m: &BtcMut) -> BtcCase {
    let (mut pre, mut outs) = case.clone();
    for (k, a, b) in &m.structural {
        let n = pre.len().max(1);
        let (i, j) = (*a as usize % n, *b as usize % n);
        match k % 7 {
            0 if pre.len() > 1 => pre.swap(i, j),
            1 if !pre.is_empty() => pre.push(pre[i].clone()),
            2 if !pre.is_empty() => {
                pre.remove(i);
            }
            3 => pre.truncate(1),
            4 if !pre.is_empty() => {
                while pre.len() < 10 + (*b as usize % 2) {
                    let mut c = pre[pre.len() - 1].clone();
                    if c.len() > 100 {
                        c[100] = c[100].wrapping_add(1); // a fresh vout so the outpoint is distinct
                    }
                    pre.push(c);
                }
            }
            5 if !pre.is_empty() => {
                let p = &mut pre[i];
                if *b & 1 == 0 { p.push(*a) } else { p.pop(); }
            }
            6 => {
                // swap in another seed's preimage (another transaction)
                let other = &btc_seeds()[*a as usize % btc_seeds().len()].0;
                if !other.is_empty() && !pre.is_empty() {
                    pre[i] = other[*b as usize % other.len()].clone();
                }
            }
            _ => {}
        }
    }
    let ohot = outputs_hot(&outs);
    for (t, op) in &m.ops {
        if t % 3 == 0 || pre.is_empty() {
            apply(&mut outs, op, &ohot);
        } else {
            let n = pre.len();
            let mut op = op.clone();
            if op.n % 8 != 7 {
                op.kind = [0u8, 1, 2, 7][op.kind as usize % 4]; // preimages: mostly in-place edits (keep 182 B)
            }
            apply(&mut pre[*t as usize % n], &op, &PRE_HOT);
        }
    }
    if m.fixup.is_multiple_of(2) {
        btc_fixup(&mut pre, &outs, m.fixup.is_multiple_of(4));
    }
    (pre, outs)
}

// ───────────────────────────────────────── string mutation (hex layer) ─────────────────────────────────────────

fn hex_variant(b: &[u8], mode: u8, pos: u16) -> String {
    let h = hx(b);
    let i = if h.is_empty() { 0 } else { pos as usize % (h.len() + 1) };
    match mode % 12 {
        0..=2 => h,
        3 => format!("0x{h}"),
        4 => format!("0X{}", h.to_uppercase()),
        5 => h.chars().enumerate().map(|(k, c)| if k % 3 == 0 { c.to_ascii_uppercase() } else { c }).collect(),
        6 => h[..h.len().saturating_sub(1)].to_string(),
        7 => format!("{}g{}", &h[..i], &h[i..]),
        8 => format!("0x0x{h}"),
        9 => format!(" {h}"),
        10 => format!("{}é{}", &h[..i.min(h.len())], &h[i.min(h.len())..]),
        _ => format!("x{h}"),
    }
}

// ───────────────────────────────────────── properties ─────────────────────────────────────────

fn arb_rlp() -> impl Strategy<Value = R> {
    let leaf = prop_oneof![
        prop::collection::vec(any::<u8>(), 0..3).prop_map(R::S),
        prop::collection::vec(any::<u8>(), 50..70).prop_map(R::S),
        Just(R::S(vec![])),
    ];
    leaf.prop_recursive(20, 48, 5, |inner| prop::collection::vec(inner, 0..5).prop_map(R::L))
}

fn nest(depth: usize) -> R {
    (0..depth).fold(R::L(vec![]), |acc, _| R::L(vec![acc]))
}

/// A field for structured EVM fuzzing: canonical ints of every width, odd byte strings, chain ids, small lists.
fn arb_evm_field() -> impl Strategy<Value = R> {
    prop_oneof![
        4 => (0usize..=17, any::<u128>(), any::<u64>()).prop_map(|(w, a, b)| {
            let mut v: Vec<u8> = [a.to_be_bytes().to_vec(), b.to_be_bytes().to_vec()].concat();
            v.truncate(w);
            if let Some(f) = v.first_mut() { *f |= 1; }
            R::S(v)
        }),
        2 => Just(int_r(11_155_111)),
        1 => prop_oneof![Just(int_r(1)), Just(int_r(84532)), Just(R::S(vec![0, 0xaa, 0x36, 0xa7])), Just(int_r(u64::MAX as u128))],
        2 => prop::collection::vec(any::<u8>(), 18..=22).prop_map(R::S),
        1 => Just(R::S(vec![])),
        1 => Just(R::L(vec![])),
        1 => (0usize..20).prop_map(nest),
        1 => prop::collection::vec(any::<u8>(), 0..3).prop_map(|v| R::L(vec![R::S(v)])),
    ]
}

proptest! {
    #![proptest_config(cfg())]

    // ── no panics + stable codes on arbitrary input ──
    #[test]
    fn evm_arbitrary_bytes(b in prop::collection::vec(any::<u8>(), 0..160), first in prop_oneof![Just(None), Just(Some(2u8))]) {
        let mut b = b;
        if let (Some(f), Some(x)) = (first, b.first_mut()) { *x = f; }
        check_evm(&b).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn btc_arbitrary_bytes(pre in prop::collection::vec(prop::collection::vec(any::<u8>(), 180..=184), 0..12), outs in prop::collection::vec(any::<u8>(), 0..80)) {
        check_btc(&pre, &outs).map_err(TestCaseError::fail)?;
        prop_assert!(btc::parse_outputs(&outs).is_ok() == outputs_oracle(&outs).is_some());
    }

    #[test]
    fn sol_arbitrary_bytes(b in prop_oneof![prop::collection::vec(any::<u8>(), 0..400), prop::collection::vec(any::<u8>(), 1228..1240)], head in any::<bool>()) {
        let mut b = b;
        if head && b.len() >= 4 { b[0] = 1; b[1] = 0; b[2] %= 4; b[3] %= 18; }
        check_sol(&b).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn hex_arbitrary_strings(s in "(0[xX])?[0-9a-fA-FgxX \\u{e9}]{0,40}", t in any::<String>()) {
        for s in [&s, &t] {
            prop_assert_eq!(phex::decode(s).ok(), hex_oracle(s));
            if let Err(e) = phex::decode(s) { prop_assert_eq!(e, ERR_HEX); }
        }
    }

    #[test]
    fn classify_arbitrary_requests(s in "(0[xX])?[0-9a-fA-F]{0,300}", n in 0usize..13, chain in 0u8..3) {
        let req = match chain {
            0 => SignRequest::Evm { unsigned_tx: s.clone() },
            1 => SignRequest::Btc { preimages: vec![s.clone(); n], outputs: s.clone() },
            _ => SignRequest::Sol { message: s.clone() },
        };
        check_request(&req).map_err(TestCaseError::fail)?;
        prop_assert_eq!(classify(&req), classify(&req)); // pure
    }

    // ── RLP: canonical uniqueness and round trips ──
    #[test]
    fn rlp_decode_agrees_with_canonical_oracle(b in prop::collection::vec(any::<u8>(), 0..120)) {
        let got = rlp::decode_exact(&b);
        match (rlp_canonical(&b), &got) {
            (Some(r), Ok(it)) => {
                prop_assert_eq!(from_contract(it), r.clone());
                prop_assert!(rlp_depth(&r) <= 16);
                prop_assert_eq!(rlp_enc(&r), b); // decode → encode is the identity on accepted input
            }
            (Some(r), Err(_)) => prop_assert!(rlp_depth(&r) > 16, "canonical RLP refused: {}", hx(&b)),
            (None, Err(_)) => {}
            (None, Ok(it)) => prop_assert!(false, "non-canonical RLP accepted: {} → {:?}", hx(&b), it),
        }
    }

    #[test]
    fn rlp_round_trip(r in arb_rlp(), deep in 0usize..24) {
        for r in [r, nest(deep)] {
            let enc = rlp_enc(&r);
            match rlp::decode_exact(&enc) {
                Ok(it) => { prop_assert!(rlp_depth(&r) <= 16); prop_assert_eq!(from_contract(&it), r); }
                Err(_) => prop_assert!(rlp_depth(&r) > 16, "round trip failed for {}", hx(&enc)),
            }
        }
    }

    // ── valid builders are always accepted, with the right fields ──
    #[test]
    fn evm_valid_always_accepted(nonce in prop_oneof![0u64..1000, any::<u64>().prop_map(|n| n.min(u64::MAX - 1))],
                                 tip in any::<u128>(), fee in any::<u128>(), gas in any::<u64>(), to in any::<[u8; 20]>(), value in any::<u128>(),
                                 shift in 0u32..128) {
        let tx = evm_build(nonce, tip >> shift, fee >> shift, gas >> (shift % 64), to, value >> shift);
        prop_assert_eq!(evm::classify(&tx), Ok(evm::EvmTx { chain_id: 11_155_111, nonce }));
        check_request(&SignRequest::Evm { unsigned_tx: hx(&tx) }).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn btc_valid_always_accepted(ins in prop::collection::vec((any::<[u8; 32]>(), any::<u32>(), any::<u64>(), prop_oneof![Just(0xffff_fffdu32), Just(0xffff_fffe), Just(0xffff_ffff)]), 1..=10),
                                 pkh in any::<[u8; 20]>(),
                                 outs in prop::collection::vec((any::<u64>(), prop_oneof![0usize..=40, Just(252usize), Just(253usize), 254usize..=520], any::<u8>()), 1..=16)) {
        let ins: Vec<BIn> = ins.into_iter().map(|(t, v, a, s)| BIn { txid_le: t, vout: v, amount: a, seq: s }).collect();
        let mut outs: Vec<(u64, Vec<u8>)> = outs.into_iter().map(|(v, l, tag)| (v, (0..l).map(|i| (i as u8).wrapping_mul(31) ^ tag).collect())).collect();
        while ser_outputs(&outs).len() > 1024 { outs.pop(); }
        let ob = ser_outputs(&outs);
        prop_assert_eq!(btc::parse_outputs(&ob), Ok(outs.len()));
        prop_assert_eq!(outputs_oracle(&ob), Some(outs.clone())); // serialize → parse round trip
        let pre = btc_preimages(&ins, pkh, &ob);
        let got = btc::classify(&pre, &ob);
        prop_assert!(got.is_ok(), "valid tx refused: {:?}", got);
        check_btc(&pre, &ob).map_err(TestCaseError::fail)?;
        check_request(&SignRequest::Btc { preimages: pre.iter().map(|p| hx(p)).collect(), outputs: hx(&ob) }).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn sol_valid_always_accepted(nk in 2usize..=16, a in any::<u8>(), b in any::<u8>(), c in any::<u8>(), seed in any::<u64>(), bh in any::<[u8; 32]>(), lamports in any::<u64>()) {
        let sys = 1 + a as usize % (nk - 1);
        let to = b as usize % nk;
        let ro_u = (c as usize % nk) as u8; // 1 + ro_u ≤ nk
        let m = sol_build(nk, ro_u, sys, to, seed, bh, lamports);
        prop_assert_eq!(sol::classify(&m), Ok(sol::SolTransfer { recent_blockhash: bh, lamports }));
        check_request(&SignRequest::Sol { message: hx(&m) }).map_err(TestCaseError::fail)?;
    }

    // ── structured EVM: random fields of every kind in a 7–10 item list ──
    #[test]
    fn evm_structured_fields(fields in prop::collection::vec(arb_evm_field(), 7..=10), sepolia in any::<bool>(), ty in prop_oneof![9 => Just(2u8), 1 => any::<u8>()]) {
        let mut fields = fields;
        if sepolia { fields[0] = int_r(11_155_111); }
        let tx = [vec![ty], rlp_enc(&R::L(fields))].concat();
        check_evm(&tx).map_err(TestCaseError::fail)?;
    }

    // ── mutation fuzzing from every vector + builder seed ──
    #[test]
    fn evm_mutated_seeds(i in any::<Index>(), ops in arb_ops(8), mode in any::<u8>(), pos in any::<u16>()) {
        let seed = i.get(evm_seeds());
        let tx = mutate(seed, &ops, &evm_hot(seed));
        check_evm(&tx).map_err(TestCaseError::fail)?;
        check_request(&SignRequest::Evm { unsigned_tx: hex_variant(&tx, mode, pos) }).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn btc_mutated_seeds(i in any::<Index>(), m in arb_btc_mut(), mode in any::<u8>(), pos in any::<u16>()) {
        let (pre, outs) = btc_apply(i.get(btc_seeds()), &m);
        check_btc(&pre, &outs).map_err(TestCaseError::fail)?;
        prop_assert!(btc::parse_outputs(&outs).is_ok() == outputs_oracle(&outs).is_some());
        let mut pre_hex: Vec<String> = pre.iter().map(|p| hx(p)).collect();
        if let Some(p) = pre_hex.first_mut() { *p = hex_variant(&pre[0], mode, pos); }
        check_request(&SignRequest::Btc { preimages: pre_hex, outputs: hex_variant(&outs, mode / 12, pos) }).map_err(TestCaseError::fail)?;
    }

    #[test]
    fn sol_mutated_seeds(i in any::<Index>(), ops in arb_ops(8), mode in any::<u8>(), pos in any::<u16>()) {
        let seed = i.get(sol_seeds());
        let m = mutate(seed, &ops, &sol_hot(seed));
        check_sol(&m).map_err(TestCaseError::fail)?;
        check_request(&SignRequest::Sol { message: hex_variant(&m, mode, pos) }).map_err(TestCaseError::fail)?;
    }

    // SOL: extra instructions spliced into a valid transfer (durable nonce anywhere, compute budget, second transfer …)
    #[test]
    fn sol_extra_instructions(i in any::<Index>(), extra in prop::collection::vec((any::<u8>(), prop::collection::vec(any::<u8>(), 0..4), prop_oneof![
            Just(vec![4u8, 0, 0, 0]), Just(vec![2u8, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]), prop::collection::vec(any::<u8>(), 0..16)]), 1..4),
            first in any::<bool>()) {
        let seed = i.get(sol_seeds());
        if let Some(mut s) = sol_parse(seed) {
            let nk = s.keys.len().max(1) as u8;
            let sys = s.keys.iter().position(|k| *k == [0u8; 32]).unwrap_or(0) as u8;
            for (p, accts, data) in extra {
                let ix = SolIx { prog: if p & 1 == 0 { sys } else { p % nk }, accounts: accts.iter().map(|a| a % nk).collect(), data };
                if first { s.ixs.insert(0, ix) } else { s.ixs.push(ix) }
            }
            let m = sol_ser(&s);
            check_sol(&m).map_err(TestCaseError::fail)?;
            prop_assert!(sol::classify(&m).is_err(), "more than one instruction accepted");
        }
    }
}

// ───────────────────────────────────────── coverage of the mutation generators ─────────────────────────────────────────

/// Not a property: runs the mutation generators deterministically and prints the verdict histogram per chain, so a run
/// shows that the generators reach the accept path and nearly every refusal code (FUZZ_STATS_CASES, default 3000).
#[test]
fn mutation_coverage_stats() {
    use proptest::strategy::ValueTree;
    use proptest::test_runner::TestRunner;
    let n: usize = std::env::var("FUZZ_STATS_CASES").ok().and_then(|v| v.parse().ok()).unwrap_or(3000);
    let mut runner = TestRunner::deterministic();
    let mut tally = |name: &str, f: &mut dyn FnMut(&mut TestRunner) -> String, must: &[&str]| {
        let mut h: BTreeMap<String, usize> = BTreeMap::new();
        for _ in 0..n {
            env_tick();
            *h.entry(f(&mut runner)).or_default() += 1;
        }
        eprintln!("coverage {name} ({n}): {h:?}");
        for c in must {
            assert!(h.contains_key(*c), "{name}: generator never produced {c}");
        }
    };
    let evm_s = (any::<Index>(), arb_ops(8));
    tally("evm", &mut |r| {
        let (i, ops) = evm_s.new_tree(r).unwrap().current();
        let seed = i.get(evm_seeds());
        verdict(&classify(&SignRequest::Evm { unsigned_tx: hx(&mutate(seed, &ops, &evm_hot(seed))) }))
    }, &[&["ok"][..], EVM_CODES].concat());
    let btc_s = (any::<Index>(), arb_btc_mut());
    tally("btc", &mut |r| {
        let (i, m) = btc_s.new_tree(r).unwrap().current();
        let (pre, outs) = btc_apply(i.get(btc_seeds()), &m);
        verdict(&classify(&SignRequest::Btc { preimages: pre.iter().map(|p| hx(p)).collect(), outputs: hx(&outs) }))
    }, &[&["ok"][..], BTC_CODES].concat());
    let sol_s = (any::<Index>(), arb_ops(8));
    tally("sol", &mut |r| {
        let (i, ops) = sol_s.new_tree(r).unwrap().current();
        let seed = i.get(sol_seeds());
        verdict(&classify(&SignRequest::Sol { message: hx(&mutate(seed, &ops, &sol_hot(seed))) }))
    }, &["ok", ERR_SOL_VERSION, ERR_SOL_HEADER, ERR_SOL_MALFORMED, ERR_SOL_INSTRUCTION, ERR_SOL_DURABLE_NONCE]);
}

// ───────────────────────────────────────── recorded findings (see docs/security/fuzzing.md) ─────────────────────────────────────────

/// F-01 input: a canonical 9-item type-2 Sepolia tx whose access list is `depth` nested empty lists. With
/// `depth` = 16 the deepest item sits at depth 17 (outer list = depth 0), one past the RLP limit.
fn f01_tx_at(depth: usize) -> Vec<u8> {
    let l = R::L(vec![
        int_r(11_155_111),
        int_r(0),
        int_r(1),
        int_r(1),
        int_r(21_000),
        R::S(vec![0x11; 20]),
        int_r(1),
        R::S(vec![]),
        nest(depth),
    ]);
    [vec![0x02], rlp_enc(&l)].concat()
}

fn f01_tx() -> Vec<u8> {
    f01_tx_at(16)
}

#[test]
fn f01_deep_access_list_is_refused_either_way() {
    let tx = f01_tx();
    assert_eq!(rlp_depth(&rlp_canonical(&tx[1..]).unwrap()), 17);
    assert!(evm_oracle(&tx).is_none());
    assert_eq!(evm::classify(&tx), Err(ERR_EVM_RLP));
    let tx = f01_chain1_tx();
    assert!(rlp_canonical(&tx[1..]).is_some());
    assert_eq!(evm::classify(&tx), Err(ERR_EVM_RLP));
}

/// F-01 variant: the same deep access list with chain id 1.
fn f01_chain1_tx() -> Vec<u8> {
    let mut tx = f01_tx();
    let at = tx.windows(4).position(|w| w == [0x83, 0xaa, 0x36, 0xa7]).unwrap();
    tx.splice(at..at + 4, [0x01]);
    tx[1] -= 3; // short-form list header: the payload is 3 bytes shorter
    tx
}

/// F-01, fixed by option (a): spec §5.9 now states the RLP depth limit (the outer list is depth 0; any item deeper than
/// 16 → `ERR_EVM_RLP`, found while decoding the structure, so before every policy rule), and the TS mirror
/// (`policy/rlp.ts`) applies the same limit. The contract was not changed.
#[test]
fn f01_deep_access_list_error_code_matches_spec() {
    assert_eq!(evm::classify(&f01_tx()), Err(ERR_EVM_RLP));
    // the depth refusal pre-empts every policy rule: chain 1 + deep access list → ERR_EVM_RLP, not ERR_EVM_CHAIN_ID
    assert_eq!(evm::classify(&f01_chain1_tx()), Err(ERR_EVM_RLP));
    // boundary: deepest item at depth exactly 16 still decodes, so the policy code applies
    let at16 = f01_tx_at(15);
    assert_eq!(rlp_depth(&rlp_canonical(&at16[1..]).unwrap()), 16);
    assert_eq!(evm::classify(&at16), Err(ERR_EVM_ACCESS_LIST));
}

/// F-03 (informational, pinned): shapes both classifiers accept although the target chain rejects the resulting tx, so
/// the signature cannot move funds (it only adds an `unused` record to the owner's own history). Pinned so a tightening
/// pass sees what changes.
#[test]
fn f03_chain_invalid_but_accepted_shapes() {
    // SOL: duplicate account keys (runtime: AccountLoadedTwice) and a transfer *to* the System program (k = sys).
    let mut s = sol_parse(&sol_build(3, 1, 1, 2, 9, [5; 32], 1)).unwrap();
    s.keys[2] = s.keys[0];
    let dup = sol_ser(&s);
    assert!(sol::classify(&dup).is_ok() && sol_oracle(&dup).is_some());
    let to_sys = sol_build(3, 1, 1, 1, 9, [5; 32], 1);
    assert!(sol::classify(&to_sys).is_ok());
    // EVM: max_priority_fee > max_fee, and gas_limit 0 (node: invalid / intrinsic gas too low).
    assert!(evm::classify(&evm_build(0, 10, 1, 21_000, [0x11; 20], 1)).is_ok());
    assert!(evm::classify(&evm_build(0, 1, 1, 0, [0x11; 20], 1)).is_ok());
    // BTC: Σ outputs > any plausible input value, and an empty scriptPubKey.
    let outs = ser_outputs(&[(u64::MAX, vec![])]);
    let ins = [BIn { txid_le: [1; 32], vout: 0, amount: 1, seq: 0xffff_fffd }];
    assert!(btc::classify(&btc_preimages(&ins, [2; 20], &outs), &outs).is_ok());
}

// ───────────────────────────────────────── differential: Rust vs the TS reference ─────────────────────────────────────────

/// Known, classified disagreements (docs/security/fuzzing.md). Returns the finding id, or None (= a new finding).
/// F-01 (the RLP depth limit) was fixed by adding the limit to spec §5.9 and to the TS mirror, so none remain.
fn known_disagreement(_chain: &str, _ts: &str, _rust: &str, _req: &SignRequest) -> Option<&'static str> {
    None
}

fn verdict(r: &Result<Classified, &'static str>) -> String {
    match r {
        Ok(_) => "ok".into(),
        Err(e) => (*e).into(),
    }
}

/// Compares the TS-recorded hashes / fields of an accepted case with the contract's.
fn compare_ok(chain: &str, line: &Value, c: &Classified) -> Result<(), String> {
    let hashes: Vec<String> = c.items.iter().map(|i| hx(&i.record_payload)).collect();
    let want: Vec<String> = line["h"].as_array().map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect()).unwrap_or_default();
    if hashes != want {
        return Err(format!("record hashes {hashes:?} != TS {want:?}"));
    }
    let f = &line["f"];
    let s = |v: &Value| v.as_str().map(String::from).unwrap_or_else(|| v.to_string());
    match (chain, &c.items[0].detail) {
        ("evm", SigDetail::Evm { chain_id, nonce, .. }) => {
            if s(&f["chain_id"]) != chain_id.to_string() || s(&f["nonce"]) != nonce.to_string() {
                return Err(format!("evm fields {f}"));
            }
        }
        ("btc", _) => {
            let ins = f["inputs"].as_array().cloned().unwrap_or_default();
            if ins.len() != c.items.len() {
                return Err("btc input count".into());
            }
            for (fi, it) in ins.iter().zip(&c.items) {
                let SigDetail::Btc { txid, vout, amount_sats } = &it.detail else { return Err("detail".into()) };
                if s(&fi["txid"]) != hx(txid) || s(&fi["vout"]) != vout.to_string() || s(&fi["amount_sats"]) != amount_sats.to_string() {
                    return Err(format!("btc input {fi}"));
                }
            }
        }
        ("sol", SigDetail::Sol { recent_blockhash, lamports }) => {
            if s(&f["recent_blockhash"]) != hx(recent_blockhash) || s(&f["lamports"]) != lamports.to_string() {
                return Err(format!("sol fields {f}"));
            }
        }
        _ => return Err("chain/detail mismatch".into()),
    }
    Ok(())
}

fn corpus_dir() -> std::path::PathBuf {
    match std::env::var("SATCHEL_FUZZ_CORPUS") {
        Ok(d) if std::path::Path::new(&d).is_absolute() => d.into(),
        Ok(d) => std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..").join(d),
        Err(_) => std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tools/fuzz/corpus"),
    }
}

#[test]
fn differential_vs_ts_reference() {
    let dir = corpus_dir();
    let t0 = std::time::Instant::now();
    let mut unknown: BTreeMap<String, (usize, String)> = BTreeMap::new();
    let mut known: BTreeMap<&'static str, usize> = BTreeMap::new();
    let mut oracle_fails: Vec<String> = vec![];
    let mut ran = 0usize;
    for chain in ["evm", "btc", "sol"] {
        let path = dir.join(format!("{chain}.jsonl"));
        let Ok(text) = std::fs::read_to_string(&path) else {
            eprintln!("differential: {} not present, skipped (generate with tools/fuzz/gen-corpus.ts)", path.display());
            continue;
        };
        let (mut n, mut agree_ok, mut agree_err) = (0usize, 0usize, 0usize);
        for (ln, line) in text.lines().enumerate() {
            if line.trim().is_empty() {
                continue;
            }
            let v: Value = serde_json::from_str(line).unwrap_or_else(|e| panic!("{}:{}: {e}", path.display(), ln + 1));
            let req: SignRequest = serde_json::from_value(v["r"].clone()).unwrap_or_else(|e| panic!("{}:{}: request: {e}", path.display(), ln + 1));
            n += 1;
            env_tick();
            let ts = v["v"].as_str().unwrap_or("?").to_string();
            let got = classify(&req);
            let rust = verdict(&got);
            // the Rust oracles see every corpus input too
            if let Err(e) = check_request(&req)
                && oracle_fails.len() < 20
            {
                oracle_fails.push(e);
            }
            let mismatch = if ts != rust {
                Some(format!("verdict TS {ts} vs Rust {rust}"))
            } else if let Ok(c) = &got {
                compare_ok(chain, &v, c).err()
            } else {
                None
            };
            match mismatch {
                None if rust == "ok" => agree_ok += 1,
                None => agree_err += 1,
                Some(m) => {
                    if let Some(id) = known_disagreement(chain, &ts, &rust, &req) {
                        *known.entry(id).or_default() += 1;
                    } else {
                        let e = unknown.entry(format!("{chain}: {m}")).or_insert((0, line.chars().take(1200).collect()));
                        e.0 += 1;
                    }
                }
            }
        }
        ran += n;
        eprintln!("differential {chain}: {n} cases, agree {agree_ok} ok + {agree_err} refused");
    }
    eprintln!("differential: {ran} cases in {:.1?}; known findings {known:?}; {} new disagreement classes", t0.elapsed(), unknown.len());
    let report: Vec<String> = unknown.iter().map(|(k, (n, ex))| format!("{k} ×{n}\n   e.g. {ex}")).collect();
    assert!(unknown.is_empty(), "Rust/TS disagreements:\n{}", report.join("\n"));
    assert!(oracle_fails.is_empty(), "contract vs Rust oracle on corpus inputs:\n{}", oracle_fails.join("\n"));
}
