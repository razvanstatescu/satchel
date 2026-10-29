//! BTC classifier (spec §5.9): BIP143 P2WPKH preimages (182 B each) + the serialized outputs, SIGHASH_ALL,
//! one complete transaction per call.
//!
//! Check order (chosen so each refusal vector gets its most specific code; see docs/handoff/contract.md):
//!  1. 1 ≤ n ≤ 10                                         ERR_BTC_INPUT_COUNT
//!  2. per preimage: length, then version, scriptCode, nSequence, locktime, sighash (core's vector order)
//!  3. all preimages share hashPrevouts / hashSequence / hashOutputs / pkh   ERR_BTC_MIXED_TX
//!  4. no duplicate outpoint                              ERR_BTC_DUPLICATE_INPUT
//!  5. hashPrevouts == sha256d(outpoints)                 ERR_BTC_PREVOUTS_INCOMPLETE
//!  6. hashSequence == sha256d(sequences)                 ERR_BTC_SEQUENCES_MISMATCH
//!  7. outputs parse (≤ 1024 B, 1–16 outputs, script ≤ 520 B, exact)   ERR_BTC_OUTPUTS_MALFORMED
//!  8. hashOutputs == sha256d(outputs)                    ERR_BTC_OUTPUTS_MISMATCH

use crate::errors::*;

pub const MAX_BTC_INPUTS: usize = 10;
pub const PREIMAGE_LEN: usize = 182;
pub const MAX_OUTPUTS_BYTES: usize = 1024;
pub const MAX_OUTPUTS: usize = 16;
pub const MAX_SCRIPT_LEN: usize = 520;

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct BtcInput {
    /// txid in DISPLAY order (reverse of preimage[68..100]).
    pub txid: [u8; 32],
    pub vout: u32,
    pub amount_sats: u64,
    /// sha256d(preimage): the MPC payload and the record payload.
    pub sighash: [u8; 32],
}

pub fn sha256d(b: &[u8]) -> [u8; 32] {
    near_sdk::env::sha256_array(near_sdk::env::sha256_array(b))
}

fn le_u32(b: &[u8]) -> u32 {
    u32::from_le_bytes([b[0], b[1], b[2], b[3]])
}

fn le_u64(b: &[u8]) -> u64 {
    let mut a = [0u8; 8];
    a.copy_from_slice(&b[..8]);
    u64::from_le_bytes(a)
}

/// Bitcoin CompactSize, canonical only.
fn read_varint(b: &[u8], pos: usize) -> Option<(usize, usize)> {
    let first = *b.get(pos)?;
    match first {
        0x00..=0xfc => Some((first as usize, pos + 1)),
        0xfd => {
            let s = b.get(pos + 1..pos + 3)?;
            let v = u16::from_le_bytes([s[0], s[1]]) as usize;
            if v < 0xfd {
                return None;
            }
            Some((v, pos + 3))
        }
        // 0xfe / 0xff encode lengths far above MAX_SCRIPT_LEN: refused.
        _ => None,
    }
}

/// Parses Σ(value u64 LE ‖ varint(len) ‖ scriptPubKey) exactly to the end. Returns the output count.
pub fn parse_outputs(o: &[u8]) -> Result<usize, &'static str> {
    if o.is_empty() || o.len() > MAX_OUTPUTS_BYTES {
        return Err(ERR_BTC_OUTPUTS_MALFORMED);
    }
    let mut pos = 0usize;
    let mut count = 0usize;
    while pos < o.len() {
        if pos + 8 > o.len() {
            return Err(ERR_BTC_OUTPUTS_MALFORMED);
        }
        pos += 8;
        let (len, next) = read_varint(o, pos).ok_or(ERR_BTC_OUTPUTS_MALFORMED)?;
        if len > MAX_SCRIPT_LEN || next + len > o.len() {
            return Err(ERR_BTC_OUTPUTS_MALFORMED);
        }
        pos = next + len;
        count += 1;
        if count > MAX_OUTPUTS {
            return Err(ERR_BTC_OUTPUTS_MALFORMED);
        }
    }
    Ok(count)
}

pub fn classify(preimages: &[Vec<u8>], outputs: &[u8]) -> Result<Vec<BtcInput>, &'static str> {
    let n = preimages.len();
    if n == 0 || n > MAX_BTC_INPUTS {
        return Err(ERR_BTC_INPUT_COUNT);
    }
    // 2. every length first, then per-preimage policy fields
    if preimages.iter().any(|p| p.len() != PREIMAGE_LEN) {
        return Err(ERR_BTC_PREIMAGE_LEN);
    }
    for p in preimages {
        if p[0..4] != [2, 0, 0, 0] {
            return Err(ERR_BTC_VERSION);
        }
        if p[104..108] != [0x19, 0x76, 0xa9, 0x14] || p[128..130] != [0x88, 0xac] {
            return Err(ERR_BTC_SCRIPTCODE);
        }
        if le_u32(&p[138..142]) < 0xffff_fffd {
            return Err(ERR_BTC_SEQUENCE);
        }
        if p[174..178] != [0, 0, 0, 0] {
            return Err(ERR_BTC_LOCKTIME);
        }
        if p[178..182] != [1, 0, 0, 0] {
            return Err(ERR_BTC_SIGHASH);
        }
    }
    // 3. one transaction: shared commitments and the same pkh
    let p0 = &preimages[0];
    for p in &preimages[1..] {
        if p[4..36] != p0[4..36] || p[36..68] != p0[36..68] || p[142..174] != p0[142..174] || p[108..128] != p0[108..128] {
            return Err(ERR_BTC_MIXED_TX);
        }
    }
    // 4. duplicate outpoints
    for i in 0..n {
        for j in (i + 1)..n {
            if preimages[i][68..104] == preimages[j][68..104] {
                return Err(ERR_BTC_DUPLICATE_INPUT);
            }
        }
    }
    // 5. completeness: every input present, in order
    let mut outpoints = Vec::with_capacity(36 * n);
    let mut sequences = Vec::with_capacity(4 * n);
    for p in preimages {
        outpoints.extend_from_slice(&p[68..104]);
        sequences.extend_from_slice(&p[138..142]);
    }
    if sha256d(&outpoints)[..] != p0[4..36] {
        return Err(ERR_BTC_PREVOUTS_INCOMPLETE);
    }
    // 6.
    if sha256d(&sequences)[..] != p0[36..68] {
        return Err(ERR_BTC_SEQUENCES_MISMATCH);
    }
    // 7. + 8.
    parse_outputs(outputs)?;
    if sha256d(outputs)[..] != p0[142..174] {
        return Err(ERR_BTC_OUTPUTS_MISMATCH);
    }
    Ok(preimages
        .iter()
        .map(|p| {
            let mut txid = [0u8; 32];
            txid.copy_from_slice(&p[68..100]);
            txid.reverse();
            BtcInput { txid, vout: le_u32(&p[100..104]), amount_sats: le_u64(&p[130..138]), sighash: sha256d(p) }
        })
        .collect())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::parse::hex::decode;

    /// A test-side BIP143 P2WPKH builder (independent of the classifier) for constructing vectors.
    #[derive(Clone)]
    pub struct TxIn {
        pub txid_le: [u8; 32],
        pub vout: u32,
        pub amount: u64,
        pub sequence: u32,
    }
    #[derive(Clone)]
    pub struct Tx {
        pub version: u32,
        pub inputs: Vec<TxIn>,
        pub outputs: Vec<u8>,
        pub locktime: u32,
        pub pkh: [u8; 20],
        pub sighash: u32,
    }
    pub fn output(value: u64, script: &[u8]) -> Vec<u8> {
        let mut o = value.to_le_bytes().to_vec();
        o.push(script.len() as u8);
        o.extend_from_slice(script);
        o
    }
    pub fn sample_tx(n: usize) -> Tx {
        let mut outputs = output(40_000, &[&[0x00, 0x14][..], &[0x42; 20]].concat());
        // a tb1p (P2TR) recipient output
        outputs.extend(output(1_000, &[&[0x51, 0x20][..], &[0x43; 32]].concat()));
        Tx {
            version: 2,
            inputs: (0..n)
                .map(|i| TxIn { txid_le: [0xa0 + i as u8; 32], vout: i as u32, amount: 50_000 + i as u64, sequence: 0xffff_fffd })
                .collect(),
            outputs,
            locktime: 0,
            pkh: [0xf6; 20],
            sighash: 1,
        }
    }
    pub fn preimage(tx: &Tx, i: usize) -> Vec<u8> {
        let mut prevouts = vec![];
        let mut seqs = vec![];
        for x in &tx.inputs {
            prevouts.extend_from_slice(&x.txid_le);
            prevouts.extend_from_slice(&x.vout.to_le_bytes());
            seqs.extend_from_slice(&x.sequence.to_le_bytes());
        }
        let x = &tx.inputs[i];
        let mut p = tx.version.to_le_bytes().to_vec();
        p.extend(sha256d(&prevouts));
        p.extend(sha256d(&seqs));
        p.extend_from_slice(&x.txid_le);
        p.extend_from_slice(&x.vout.to_le_bytes());
        p.extend_from_slice(&[0x19, 0x76, 0xa9, 0x14]);
        p.extend_from_slice(&tx.pkh);
        p.extend_from_slice(&[0x88, 0xac]);
        p.extend_from_slice(&x.amount.to_le_bytes());
        p.extend_from_slice(&x.sequence.to_le_bytes());
        p.extend(sha256d(&tx.outputs));
        p.extend_from_slice(&tx.locktime.to_le_bytes());
        p.extend_from_slice(&tx.sighash.to_le_bytes());
        assert_eq!(p.len(), 182);
        p
    }
    pub fn preimages(tx: &Tx) -> Vec<Vec<u8>> {
        (0..tx.inputs.len()).map(|i| preimage(tx, i)).collect()
    }

    /// kb/70 F4 oracle: sha256d(BIP143 preimage) == bitcoinjs `hashForWitnessV0`. The preimage and the bitcoinjs hash are
    /// the sec spike's recorded evidence (kb/70 F4 cites `btc_preimage.mjs` 27/27 PASS); the bytes are data, not code.
    #[test]
    fn kb70_f4_oracle_sha256d_equals_bitcoinjs() {
        let p = decode("02000000871ac990f57c186530da7ae2105d118661e48b6e13e0d5bf581dba93579a8c36caf35e5224de16efa3ccaf41070f6e7b9432b6f79551e629fca9d1c03b43bc5201aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000001976a914f6bdf8b714f1429ce51023f7840e430f29c3eeb088acf049020000000000fdffffffd1d104b9d08f597ac17625c2050371756a75fed4f95caab3063f481060ade27c0000000001000000").unwrap();
        assert_eq!(p.len(), 182);
        assert_eq!(hex::encode(sha256d(&p)), "9331a4dd60d668bb4afc79795e8b04f2dc434af4dc1226c5aa52d333c9b5e376");
        // It passes every per-preimage and completeness rule (a complete 1-input tx); only the outputs bytes, which the
        // evidence does not record, are missing, so a stand-in outputs blob fails exactly at the last rule.
        assert_eq!(classify(&[p], &output(1, &[0x51])), Err(ERR_BTC_OUTPUTS_MISMATCH));
    }

    /// Independent oracle: a complete 2-input P2WPKH tx built with bitcoinjs-lib 7.0.4 (fresh scratch script, see
    /// docs/handoff/contract.md); `hashForWitnessV0` per input must equal the contract's sha256d(preimage).
    pub const BJS_OUTPUTS: &str = "409c000000000000160014333333333333333333333333333333333333333328230000000000002251204444444444444444444444444444444444444444444444444444444444444444";
    pub const BJS_PRE0: &str = "020000003d7fa400dcb6c41ad9876d0302eae528d7ad85454ba022329d82e3007d9b524a957879fdce4d8ab885e32ff307d54e75884da52522cc53d3c4fdb60edb69a0981111111111111111111111111111111111111111111111111111111111111111010000001976a9145a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a88ac3075000000000000fdfffffffa20bbf52f6cc7acfe1699280d9a877eb26b438647a6743aaafa1d5c32b0fbe60000000001000000";
    pub const BJS_PRE1: &str = "020000003d7fa400dcb6c41ad9876d0302eae528d7ad85454ba022329d82e3007d9b524a957879fdce4d8ab885e32ff307d54e75884da52522cc53d3c4fdb60edb69a0982222222222222222222222222222222222222222222222222222222222222222000000001976a9145a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a88ac204e000000000000fdfffffffa20bbf52f6cc7acfe1699280d9a877eb26b438647a6743aaafa1d5c32b0fbe60000000001000000";
    pub const BJS_H0: &str = "e751a0c51843217c759304a94cb0f38d920be72ed601e6f19191ab636764fa0c";
    pub const BJS_H1: &str = "a265c7b036860962fa92bb49ef201e29714017ed610e0f52c7864463f0f29d27";

    #[test]
    fn bitcoinjs_oracle_two_inputs() {
        let pre = vec![decode(BJS_PRE0).unwrap(), decode(BJS_PRE1).unwrap()];
        let got = classify(&pre, &decode(BJS_OUTPUTS).unwrap()).unwrap();
        assert_eq!(hex::encode(got[0].sighash), BJS_H0);
        assert_eq!(hex::encode(got[1].sighash), BJS_H1);
        assert_eq!(got[0].txid, [0x11; 32]);
        assert_eq!((got[0].vout, got[0].amount_sats), (1, 30_000));
        assert_eq!(got[1].txid, [0x22; 32]);
        assert_eq!((got[1].vout, got[1].amount_sats), (0, 20_000));
    }

    #[test]
    fn accepts_1_2_4_10_inputs_with_fields() {
        for n in [1usize, 2, 4, 10] {
            let tx = sample_tx(n);
            let pre = preimages(&tx);
            let got = classify(&pre, &tx.outputs).unwrap_or_else(|e| panic!("n={n}: {e}"));
            assert_eq!(got.len(), n);
            for (i, inp) in got.iter().enumerate() {
                let mut disp = tx.inputs[i].txid_le;
                disp.reverse();
                assert_eq!(inp.txid, disp);
                assert_eq!(inp.vout, i as u32);
                assert_eq!(inp.amount_sats, 50_000 + i as u64);
                assert_eq!(inp.sighash, sha256d(&pre[i]));
            }
        }
        // nSequence 0xffffffff and 0xfffffffe are fine too
        for seq in [0xffff_fffe, 0xffff_ffff] {
            let mut tx = sample_tx(2);
            tx.inputs.iter_mut().for_each(|x| x.sequence = seq);
            assert!(classify(&preimages(&tx), &tx.outputs).is_ok());
        }
        // 16 outputs ok; a 0xfd-varint script (253 B) ok
        let mut tx = sample_tx(1);
        tx.outputs = (0..16).flat_map(|_| output(1, &[0x51])).collect();
        assert!(classify(&preimages(&tx), &tx.outputs).is_ok());
        let mut tx = sample_tx(1);
        let mut o = 5u64.to_le_bytes().to_vec();
        o.extend([0xfd, 0xfd, 0x00]);
        o.extend([0x6a; 253]);
        tx.outputs = o;
        assert!(classify(&preimages(&tx), &tx.outputs).is_ok());
    }

    #[test]
    fn refusals() {
        let check = |name: &str, pre: Vec<Vec<u8>>, outs: Vec<u8>, err: &str| {
            assert_eq!(classify(&pre, &outs), Err(err), "{name}");
        };
        let t2 = sample_tx(2);
        check("no inputs", vec![], t2.outputs.clone(), ERR_BTC_INPUT_COUNT);
        let t11 = sample_tx(11);
        check("11 inputs", preimages(&t11), t11.outputs.clone(), ERR_BTC_INPUT_COUNT);
        let mut p = preimages(&t2);
        p[1].push(0);
        check("183 bytes", p, t2.outputs.clone(), ERR_BTC_PREIMAGE_LEN);
        check("32-byte hash", vec![vec![0xab; 32]], t2.outputs.clone(), ERR_BTC_PREIMAGE_LEN);
        for (name, sh) in [("NONE", 2u32), ("SINGLE", 3), ("ALL|ACP", 0x81), ("NONE|ACP", 0x82), ("SINGLE|ACP", 0x83), ("FORKID", 0x41), ("0", 0)] {
            let mut t = t2.clone();
            t.sighash = sh;
            check(name, preimages(&t), t.outputs.clone(), ERR_BTC_SIGHASH);
        }
        let mut t = t2.clone();
        t.version = 1;
        check("version 1", preimages(&t), t.outputs.clone(), ERR_BTC_VERSION);
        let mut t = t2.clone();
        t.locktime = 1;
        check("locktime", preimages(&t), t.outputs.clone(), ERR_BTC_LOCKTIME);
        let mut t = t2.clone();
        t.inputs[1].sequence = 0xffff_fffc;
        check("sequence", preimages(&t), t.outputs.clone(), ERR_BTC_SEQUENCE);
        let mut p = preimages(&t2);
        p[0][104] = 0x17; // not the P2WPKH scriptCode
        check("scriptCode", p, t2.outputs.clone(), ERR_BTC_SCRIPTCODE);
        let mut p = preimages(&t2);
        p[0][129] = 0xae;
        check("scriptCode tail", p, t2.outputs.clone(), ERR_BTC_SCRIPTCODE);
        // mixed: input 1 from another tx (different outputs commitment)
        let mut other = t2.clone();
        other.outputs = output(7, &[0x51]);
        let p = vec![preimage(&t2, 0), preimage(&other, 1)];
        check("mixed outputs", p, t2.outputs.clone(), ERR_BTC_MIXED_TX);
        let mut other = t2.clone();
        other.pkh = [0x01; 20];
        check("mixed pkh", vec![preimage(&t2, 0), preimage(&other, 1)], t2.outputs.clone(), ERR_BTC_MIXED_TX);
        let mut other = t2.clone();
        other.inputs[0].vout = 9;
        check("mixed prevouts", vec![preimage(&t2, 0), preimage(&other, 1)], t2.outputs.clone(), ERR_BTC_MIXED_TX);
        // duplicate input: same preimage twice
        let p0 = preimage(&t2, 0);
        check("duplicate", vec![p0.clone(), p0], t2.outputs.clone(), ERR_BTC_DUPLICATE_INPUT);
        // incomplete: 1 of 2
        check("1 of 2", vec![preimage(&t2, 0)], t2.outputs.clone(), ERR_BTC_PREVOUTS_INCOMPLETE);
        // out of order
        check("reordered", vec![preimage(&t2, 1), preimage(&t2, 0)], t2.outputs.clone(), ERR_BTC_PREVOUTS_INCOMPLETE);
        // sequence mismatch: hashSequence commits to other sequences than the inputs carry
        let mut p = preimages(&t2);
        for x in p.iter_mut() {
            x[36..68].copy_from_slice(&[0x55; 32]);
        }
        check("hashSequence", p, t2.outputs.clone(), ERR_BTC_SEQUENCES_MISMATCH);
        // outputs mismatch / malformed
        check("outputs mismatch", preimages(&t2), output(39_999, &[0x51]), ERR_BTC_OUTPUTS_MISMATCH);
        check("outputs empty", preimages(&t2), vec![], ERR_BTC_OUTPUTS_MALFORMED);
        let mut o = t2.outputs.clone();
        o.push(0);
        check("outputs trailing", preimages(&t2), o, ERR_BTC_OUTPUTS_MALFORMED);
        check("outputs truncated", preimages(&t2), t2.outputs[..t2.outputs.len() - 1].to_vec(), ERR_BTC_OUTPUTS_MALFORMED);
        let seventeen: Vec<u8> = (0..17).flat_map(|_| output(1, &[0x51])).collect();
        check("17 outputs", preimages(&t2), seventeen, ERR_BTC_OUTPUTS_MALFORMED);
        let mut o = 1u64.to_le_bytes().to_vec();
        o.extend([0xfd, 0x09, 0x02]);
        o.extend([0x6a; 521]);
        check("script 521", preimages(&t2), o, ERR_BTC_OUTPUTS_MALFORMED);
        let mut o = 1u64.to_le_bytes().to_vec();
        o.extend([0xfd, 0x10, 0x00]);
        o.extend([0x6a; 16]);
        check("noncanonical varint", preimages(&t2), o, ERR_BTC_OUTPUTS_MALFORMED);
        check("outputs > 1024", preimages(&t2), vec![0; 1025], ERR_BTC_OUTPUTS_MALFORMED);
    }
}
