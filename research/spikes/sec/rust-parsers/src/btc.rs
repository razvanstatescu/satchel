//! BIP143 (segwit v0) P2WPKH sighash preimage: fixed 182-byte layout.
//! [0..4] nVersion | [4..36] hashPrevouts | [36..68] hashSequence | [68..100] prevout txid (internal order)
//! [100..104] prevout vout | [104..130] scriptCode 0x19 76a914{pkh}88ac | [130..138] amount
//! [138..142] nSequence | [142..174] hashOutputs | [174..178] nLockTime | [178..182] sighash type

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BtcInput {
    /// txid in *display* (RPC / explorer) byte order
    pub txid: [u8; 32],
    pub vout: u32,
    pub amount_sats: u64,
    pub pkh: [u8; 20],
    pub locktime: u32,
    pub sequence: u32,
}

pub const PREIMAGE_LEN: usize = 182;

fn le32(b: &[u8]) -> u32 { u32::from_le_bytes([b[0], b[1], b[2], b[3]]) }

pub fn classify(p: &[u8]) -> Result<BtcInput, &'static str> {
    if p.len() != PREIMAGE_LEN {
        return Err("not a 182-byte P2WPKH BIP143 preimage");
    }
    let sc = &p[104..130];
    if !(sc[0] == 0x19 && sc[1] == 0x76 && sc[2] == 0xa9 && sc[3] == 0x14 && sc[24] == 0x88 && sc[25] == 0xac) {
        return Err("scriptCode is not P2WPKH");
    }
    if le32(&p[178..182]) != 1 {
        return Err("only SIGHASH_ALL");
    }
    let mut txid = [0u8; 32];
    txid.copy_from_slice(&p[68..100]);
    txid.reverse();
    let mut pkh = [0u8; 20];
    pkh.copy_from_slice(&sc[4..24]);
    let mut a = [0u8; 8];
    a.copy_from_slice(&p[130..138]);
    Ok(BtcInput { txid, vout: le32(&p[100..104]), amount_sats: u64::from_le_bytes(a), pkh, locktime: le32(&p[174..178]), sequence: le32(&p[138..142]) })
}
