//! Review 3: new adversarial parser checks, each against an INDEPENDENT reference written from the chain's own rules
//! (Solana `short_vec::visit_byte`, Bitcoin Core `ReadCompactSize`, Unicode Table 3-7, structured RLP header abuse).
//! Run: `PROPTEST_CASES=2000 cargo test -p satchel --lib review3_ -- --nocapture`.

use super::{btc, hex as phex, msg, rlp, sol};
use crate::errors::*;
use proptest::prelude::*;

fn cfg() -> ProptestConfig {
    ProptestConfig { failure_persistence: None, ..ProptestConfig::default() }
}

// ─────────────────────────────── compact-u16 (Solana short_vec) ───────────────────────────────

/// solana-short-vec `decode_shortu16_len` / `visit_byte`, transcribed: alias (a zero byte after the first), at most 3
/// bytes, the third byte must terminate, the value must fit u16. Returns (value, bytes consumed).
fn solana_shortu16(bytes: &[u8]) -> Result<(usize, usize), ()> {
    let mut val: u16 = 0;
    for (nth, &elem) in bytes.iter().take(3).enumerate() {
        if elem == 0 && nth != 0 {
            return Err(()); // VisitError::Alias
        }
        let elem_val = (elem & 0x7f) as u32;
        let done = elem & 0x80 == 0;
        if nth == 2 && !done {
            return Err(()); // ByteThreeContinues
        }
        let new = (val as u32) | (elem_val << (7 * nth as u32));
        val = u16::try_from(new).map_err(|_| ())?; // Overflow
        if done {
            return Ok((val as usize, nth + 1));
        }
    }
    Err(())
}

/// A legacy message whose LAST compact-u16 (the transfer's data length) is `enc`, followed by `data`.
fn sol_msg_with_data_len(enc: &[u8], data: &[u8]) -> Vec<u8> {
    let mut m = vec![1u8, 0, 1, 3];
    m.extend([0x11u8; 32]); // signer
    m.extend([0x22u8; 32]); // recipient
    m.extend([0u8; 32]); // system program (read-only unsigned)
    m.extend([0x09u8; 32]); // blockhash
    m.extend([1, 2, 2, 0, 1]); // 1 ix, program 2, 2 accounts [0, 1]
    m.extend_from_slice(enc);
    m.extend_from_slice(data);
    m
}

#[test]
fn review3_compact_u16_exhaustive_vs_solana_reference() {
    let transfer = |v: usize| -> Vec<u8> {
        if v == 12 {
            let mut d = vec![2u8, 0, 0, 0];
            d.extend(7u64.to_le_bytes());
            d
        } else {
            vec![0x55; v]
        }
    };
    let mut checked = 0u32;
    let mut encs: Vec<Vec<u8>> = (0..=255u8).map(|a| vec![a]).collect();
    for a in 0x80..=0xffu8 {
        for b in 0..=255u8 {
            encs.push(vec![a, b]);
        }
    }
    // every 3-byte form that could still be in range of a 1232-byte message is impossible (≥ 2^14), but the alias /
    // overflow / continuation refusals must hold too: sample all third bytes after a few prefixes
    for p in [[0x80u8, 0x80], [0x8c, 0x80], [0xff, 0xff], [0x80, 0xff]] {
        for c in 0..=255u8 {
            encs.push(vec![p[0], p[1], c]);
        }
    }
    for e in &encs {
        let r = solana_shortu16(e);
        let (data, want): (Vec<u8>, Result<u64, &str>) = match r {
            Err(()) => (vec![], Err(ERR_SOL_MALFORMED)),
            Ok((_, used)) if used < e.len() => continue, // covered by the shorter encoding
            Ok((v, _)) => {
                let len = sol_msg_with_data_len(e, &[]).len() + v;
                if len > sol::SOL_MAX_MESSAGE_BYTES {
                    (vec![], Err(ERR_SOL_TOO_LONG))
                } else if v == 12 {
                    (transfer(12), Ok(7))
                } else {
                    (transfer(v), Err(ERR_SOL_INSTRUCTION))
                }
            }
        };
        let m = if want == Err(ERR_SOL_TOO_LONG) { vec![0u8; sol::SOL_MAX_MESSAGE_BYTES + 1] } else { sol_msg_with_data_len(e, &data) };
        let got = sol::classify(&m).map(|t| t.lamports);
        assert_eq!(got, want, "encoding {}", hex::encode(e));
        checked += 1;
    }
    println!("compact-u16: {checked} encodings agree with solana short_vec");
}

// ─────────────────────────────── CompactSize (Bitcoin Core) ───────────────────────────────

/// Bitcoin Core `ReadCompactSize(range_check = true)`: canonical forms only, ≤ MAX_SIZE (0x02000000).
fn core_compact_size(b: &[u8]) -> Result<(u64, usize), ()> {
    let first = *b.first().ok_or(())?;
    let (v, used) = match first {
        0..=252 => (first as u64, 1),
        253 => {
            let v = u16::from_le_bytes(b.get(1..3).ok_or(())?.try_into().unwrap()) as u64;
            if v < 253 {
                return Err(());
            }
            (v, 3)
        }
        254 => {
            let v = u32::from_le_bytes(b.get(1..5).ok_or(())?.try_into().unwrap()) as u64;
            if v < 0x1_0000 {
                return Err(());
            }
            (v, 5)
        }
        255 => {
            let v = u64::from_le_bytes(b.get(1..9).ok_or(())?.try_into().unwrap());
            if v < 0x1_0000_0000 {
                return Err(());
            }
            (v, 9)
        }
    };
    if v > 0x0200_0000 {
        return Err(());
    }
    Ok((v, used))
}

#[test]
fn review3_compact_size_exhaustive_vs_bitcoin_core() {
    let mut encs: Vec<Vec<u8>> = (0..=252u8).map(|a| vec![a]).collect();
    for v in 0..=u16::MAX {
        let mut e = vec![0xfd];
        e.extend(v.to_le_bytes());
        encs.push(e);
    }
    for v in [0u32, 1, 252, 253, 520, 0xffff, 0x1_0000, 0x0200_0000, u32::MAX] {
        let mut e = vec![0xfe];
        e.extend(v.to_le_bytes());
        encs.push(e);
    }
    for v in [0u64, 520, 0xffff_ffff, 0x1_0000_0000, u64::MAX] {
        let mut e = vec![0xff];
        e.extend(v.to_le_bytes());
        encs.push(e);
    }
    for e in &encs {
        let mut o = 5_000u64.to_le_bytes().to_vec();
        o.extend_from_slice(e);
        let want_ok = match core_compact_size(e) {
            Ok((v, _)) if v as usize <= btc::MAX_SCRIPT_LEN && 8 + e.len() + v as usize <= btc::MAX_OUTPUTS_BYTES => {
                o.extend(vec![0x51; v as usize]);
                true
            }
            _ => false,
        };
        let got = btc::parse_outputs(&o);
        if want_ok {
            assert_eq!(got, Ok(1), "{}", hex::encode(e));
        } else {
            assert_eq!(got, Err(ERR_BTC_OUTPUTS_MALFORMED), "{}", hex::encode(e));
        }
    }
}

// ─────────────────────────────── BIP143 vs legacy sighash alignment ───────────────────────────────

/// kb/70's offset argument, made explicit. For a legacy (pre-segwit) SIGHASH_ALL preimage to equal an accepted 182-byte
/// BIP143 preimage P, the signed input's script must be `76a914{pkh}88ac` with its 0x19 length byte, and the only place
/// those bytes can sit is P[104..130]; so that input's outpoint is P[68..104]. Every input before it has an EMPTY script
/// (legacy SIGHASH_ALL blanks the others): 36 + 1 + 4 = 41 bytes each. They would have to fill P[4 + |varint|..68].
#[test]
fn review3_bip143_preimage_cannot_align_as_a_legacy_sighash_preimage() {
    for varint_len in [1usize, 3, 5, 9] {
        let gap = 68 - (4 + varint_len);
        assert!(gap % 41 != 0 && gap > 0, "varint {varint_len}: {gap} bytes would hold whole empty-script inputs");
    }
}

// ─────────────────────────────── structured RLP header abuse ───────────────────────────────

#[derive(Clone, Debug)]
enum T {
    S(Vec<u8>),
    L(Vec<T>),
}

/// How a node's header is written. Only `Canon` is canonical.
#[derive(Clone, Copy, Debug)]
enum Mode {
    Canon,
    LongForShort,  // 0xb8/0xf8 + 1-byte length ≤ 55
    LeadingZeroLoL, // length-of-length with a leading 0x00
    WrapSingle,    // 0x81 b for b < 0x80
    LenPlus1,
    LenMinus1,
}

fn be(n: usize) -> Vec<u8> {
    (n as u64).to_be_bytes().iter().copied().skip_while(|b| *b == 0).collect()
}

fn hdr(base: u8, len: usize, mode: Mode, single: Option<u8>) -> (Vec<u8>, bool) {
    // returns (header, still canonical)
    let canon = |len: usize| -> Vec<u8> {
        if len <= 55 {
            vec![base + len as u8]
        } else {
            let l = be(len);
            let mut v = vec![base + 55 + l.len() as u8];
            v.extend(l);
            v
        }
    };
    match mode {
        Mode::Canon => (canon(len), true),
        Mode::LongForShort if len <= 55 => (vec![base + 56, len as u8], false),
        Mode::LeadingZeroLoL => {
            let l = be(len.max(1));
            let mut v = vec![base + 56 + l.len() as u8, 0];
            v.extend(if len == 0 { vec![0] } else { l });
            (v, false)
        }
        Mode::WrapSingle if single.is_some() => (vec![0x81], false),
        Mode::LenPlus1 => (canon(len + 1), false),
        Mode::LenMinus1 if len > 0 => (canon(len - 1), false),
        _ => (canon(len), true),
    }
}

/// Encode with per-node modes (modes cycle through `ms`). Returns (bytes, canonical?, max depth).
fn enc(t: &T, ms: &[Mode], k: &mut usize, depth: usize) -> (Vec<u8>, bool, usize) {
    let mode = ms[*k % ms.len()];
    *k += 1;
    match t {
        T::S(s) => {
            if s.len() == 1 && s[0] < 0x80 {
                if let Mode::WrapSingle = mode {
                    return (vec![0x81, s[0]], false, depth);
                }
                return (s.clone(), true, depth);
            }
            let (mut h, ok) = hdr(0x80, s.len(), mode, None);
            h.extend_from_slice(s);
            (h, ok, depth)
        }
        T::L(items) => {
            let mut payload = vec![];
            let mut ok = true;
            let mut d = depth;
            for it in items {
                let (b, o, dd) = enc(it, ms, k, depth + 1);
                payload.extend(b);
                ok &= o;
                d = d.max(dd);
            }
            let (mut h, o) = hdr(0xc0, payload.len(), mode, None);
            h.extend(payload);
            (h, ok && o, d)
        }
    }
}

fn canon_enc(it: &rlp::Item) -> Vec<u8> {
    let mut k = 0;
    enc(&to_t(it), &[Mode::Canon], &mut k, 0).0
}
fn to_t(it: &rlp::Item) -> T {
    match it {
        rlp::Item::Str(s) => T::S(s.to_vec()),
        rlp::Item::List(l) => T::L(l.iter().map(to_t).collect()),
    }
}
fn same(a: &T, b: &rlp::Item) -> bool {
    match (a, b) {
        (T::S(x), rlp::Item::Str(y)) => x.as_slice() == *y,
        (T::L(x), rlp::Item::List(y)) => x.len() == y.len() && x.iter().zip(y).all(|(p, q)| same(p, q)),
        _ => false,
    }
}

fn arb_tree() -> impl Strategy<Value = T> {
    let leaf = prop_oneof![
        prop::collection::vec(any::<u8>(), 0..3).prop_map(T::S),
        prop::collection::vec(any::<u8>(), 54..58).prop_map(T::S),
        (0u8..0x80).prop_map(|b| T::S(vec![b])),
    ];
    leaf.prop_recursive(20, 120, 4, |inner| prop::collection::vec(inner, 0..4).prop_map(T::L))
}

fn arb_mode() -> impl Strategy<Value = Mode> {
    prop_oneof![
        12 => Just(Mode::Canon),
        1 => Just(Mode::LongForShort),
        1 => Just(Mode::LeadingZeroLoL),
        1 => Just(Mode::WrapSingle),
        1 => Just(Mode::LenPlus1),
        1 => Just(Mode::LenMinus1),
    ]
}

proptest! {
    #![proptest_config(cfg())]

    /// decode_exact(b) = Ok(t) ⇒ b is the ONLY encoding of t (injective, canonical); a fully canonical tree within
    /// MAX_DEPTH decodes to itself; every abused header is refused unless it happens to re-parse as another canonical
    /// tree; nothing panics.
    #[test]
    fn review3_rlp_structured_header_abuse(t in arb_tree(), ms in prop::collection::vec(arb_mode(), 1..8)) {
        let mut k = 0;
        let (b, canonical, depth) = enc(&t, &ms, &mut k, 0);
        let r = rlp::decode_exact(&b);
        if let Ok(it) = &r {
            prop_assert_eq!(canon_enc(it), b.clone(), "accepted bytes must be the canonical encoding of what they decode to");
        }
        if canonical {
            if depth <= 16 {
                let it = r.expect("canonical tree within MAX_DEPTH must decode");
                prop_assert!(same(&t, &it));
            } else {
                prop_assert!(r.is_err(), "deeper than MAX_DEPTH");
            }
        }
    }

    /// Length-of-length 1..8 with every high byte, around the u32 / usize boundaries: never panics, never accepts.
    #[test]
    fn review3_rlp_length_of_length_extremes(lol in 1usize..=8, list in any::<bool>(), lead in any::<u8>(), rest in prop::collection::vec(any::<u8>(), 0..12)) {
        let mut b = vec![if list { 0xf7 } else { 0xb7 } + lol as u8, lead];
        b.extend(rest.iter().take(lol - 1));
        b.extend([0u8; 4]);
        let r = rlp::decode_exact(&b);
        prop_assert!(r.is_err());
    }
}

// ─────────────────────────────── UTF-8 (Unicode Table 3-7) ───────────────────────────────

/// Well-formed UTF-8 byte sequences, Unicode 15 §3.9 Table 3-7, written as the table (not via core::str).
fn utf8_table_3_7(b: &[u8]) -> bool {
    let mut i = 0;
    let cont = |x: Option<&u8>, lo: u8, hi: u8| matches!(x, Some(v) if (lo..=hi).contains(v));
    while i < b.len() {
        let c = b[i];
        let n = match c {
            0x00..=0x7f => 1,
            0xc2..=0xdf => cont(b.get(i + 1), 0x80, 0xbf).then_some(2).unwrap_or(0),
            0xe0 => (cont(b.get(i + 1), 0xa0, 0xbf) && cont(b.get(i + 2), 0x80, 0xbf)).then_some(3).unwrap_or(0),
            0xe1..=0xec | 0xee..=0xef => (cont(b.get(i + 1), 0x80, 0xbf) && cont(b.get(i + 2), 0x80, 0xbf)).then_some(3).unwrap_or(0),
            0xed => (cont(b.get(i + 1), 0x80, 0x9f) && cont(b.get(i + 2), 0x80, 0xbf)).then_some(3).unwrap_or(0),
            0xf0 => (cont(b.get(i + 1), 0x90, 0xbf) && cont(b.get(i + 2), 0x80, 0xbf) && cont(b.get(i + 3), 0x80, 0xbf)).then_some(4).unwrap_or(0),
            0xf1..=0xf3 => (cont(b.get(i + 1), 0x80, 0xbf) && cont(b.get(i + 2), 0x80, 0xbf) && cont(b.get(i + 3), 0x80, 0xbf)).then_some(4).unwrap_or(0),
            0xf4 => (cont(b.get(i + 1), 0x80, 0x8f) && cont(b.get(i + 2), 0x80, 0xbf) && cont(b.get(i + 3), 0x80, 0xbf)).then_some(4).unwrap_or(0),
            _ => 0,
        };
        if n == 0 {
            return false;
        }
        i += n;
    }
    true
}

fn boundary_byte() -> impl Strategy<Value = u8> {
    prop_oneof![
        Just(0x00u8), Just(0x7f), Just(0x80), Just(0x8f), Just(0x90), Just(0x9f), Just(0xa0), Just(0xbf), Just(0xc0), Just(0xc1),
        Just(0xc2), Just(0xdf), Just(0xe0), Just(0xe1), Just(0xec), Just(0xed), Just(0xee), Just(0xef), Just(0xf0), Just(0xf1),
        Just(0xf3), Just(0xf4), Just(0xf5), Just(0xf8), Just(0xfe), Just(0xff), b'a'..=b'z', any::<u8>(),
    ]
}

proptest! {
    #![proptest_config(cfg())]

    /// msg::check ⇔ (1..=1024 bytes ∧ Table 3-7); on accept the built bytes carry the exact length and format.
    #[test]
    fn review3_utf8_boundaries_vs_table_3_7(body in prop::collection::vec(boundary_byte(), 0..12), pad in 0usize..1030, tail_at_end in any::<bool>()) {
        let mut m = vec![b'x'; pad.min(1030)];
        if tail_at_end { m.extend(&body) } else { let mut b = body.clone(); b.extend(m); m = b; }
        let want = if m.is_empty() { Err(ERR_MSG_EMPTY) } else if m.len() > msg::MAX_MESSAGE_BYTES { Err(ERR_MSG_TOO_LONG) }
            else if !utf8_table_3_7(&m) { Err(ERR_MSG_ENCODING) } else { Ok(()) };
        prop_assert_eq!(msg::check(&m), want);
        if want.is_ok() {
            let e = msg::eip191(&m);
            let mut exp = b"\x19Ethereum Signed Message:\n".to_vec();
            exp.extend(m.len().to_string().as_bytes());
            exp.extend(&m);
            prop_assert_eq!(e, exp);
            let s = msg::sol_offchain(&m);
            prop_assert_eq!(&s[..16], &b"\xffsolana offchain"[..]);
            prop_assert_eq!(s[16], 0);
            prop_assert_eq!(s[17], if m.iter().all(|c| (0x20..=0x7e).contains(c)) { 0 } else { 1 });
            prop_assert_eq!(u16::from_le_bytes([s[18], s[19]]) as usize, m.len());
            prop_assert_eq!(&s[20..], &m[..]);
        }
    }

    /// Strict hex: exactly one optional 0x/0X, even length, ASCII hex only (no Unicode digits, fullwidth, signs, spaces).
    #[test]
    fn review3_hex_adversarial_alphabet(parts in prop::collection::vec(prop_oneof![
            Just("0x"), Just("0X"), Just("x"), Just("X"), Just("0"), Just("9"), Just("a"), Just("F"), Just("g"), Just(" "),
            Just("\u{663}"), Just("\u{ff41}"), Just("\u{feff}"), Just("+"), Just("-"), Just("é"), Just("\0")], 0..12)) {
        let s: String = parts.concat();
        let body = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(&s);
        let ok = body.len() % 2 == 0 && body.bytes().all(|c| c.is_ascii_hexdigit());
        let got = phex::decode(&s);
        prop_assert_eq!(got.is_ok(), ok, "{:?}", s);
        if let Ok(v) = got {
            prop_assert_eq!(phex::encode(&v), body.to_ascii_lowercase());
        }
    }
}
