//! Byte-exact builders for the three structured payloads `sign_for` accepts (kb/90 §5.3, §5.9), plus
//! the hash oracles the contract must reproduce. Written from the spec layouts, independent of the
//! contract's parsers and of the TS vector generator, so a disagreement shows up as a test failure.

use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sha3::Keccak256;

pub const SEPOLIA: u64 = 11_155_111;

/// kb/31 §Real MPC-signed tx: 48-byte Sepolia type-2 tx (nonce 0) and its keccak256.
pub const KB_EVM_TX: &str = "02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0";
pub const KB_EVM_HASH: &str = "bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377";

pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

pub fn unhex(s: &str) -> Vec<u8> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    (0..s.len() / 2)
        .map(|i| u8::from_str_radix(&s[2 * i..2 * i + 2], 16).expect("hex"))
        .collect()
}

pub fn keccak(b: &[u8]) -> [u8; 32] {
    Keccak256::digest(b).into()
}

pub fn sha256(b: &[u8]) -> [u8; 32] {
    Sha256::digest(b).into()
}

pub fn sha256d(b: &[u8]) -> [u8; 32] {
    sha256(&sha256(b))
}

// ── EVM (EIP-1559, type 2) ───────────────────────────────────────────────────────────────

pub fn rlp_bytes(b: &[u8]) -> Vec<u8> {
    if b.len() == 1 && b[0] < 0x80 {
        return b.to_vec();
    }
    let mut out = rlp_len(0x80, b.len());
    out.extend_from_slice(b);
    out
}

fn rlp_len(offset: u8, len: usize) -> Vec<u8> {
    if len < 56 {
        vec![offset + len as u8]
    } else {
        let be: Vec<u8> = (len as u64)
            .to_be_bytes()
            .iter()
            .copied()
            .skip_while(|x| *x == 0)
            .collect();
        let mut v = vec![offset + 55 + be.len() as u8];
        v.extend(be);
        v
    }
}

/// Minimal big-endian integer (0 → empty string → 0x80).
pub fn rlp_uint(u: u128) -> Vec<u8> {
    let be: Vec<u8> = u
        .to_be_bytes()
        .iter()
        .copied()
        .skip_while(|x| *x == 0)
        .collect();
    rlp_bytes(&be)
}

pub fn rlp_list(items: &[Vec<u8>]) -> Vec<u8> {
    let body: Vec<u8> = items.concat();
    let mut out = rlp_len(0xc0, body.len());
    out.extend(body);
    out
}

#[derive(Clone)]
pub struct EvmTx {
    pub chain_id: u64,
    pub nonce: u64,
    pub tip: u128,
    pub max_fee: u128,
    pub gas: u64,
    pub to: Option<[u8; 20]>,
    pub value: u128,
    pub data: Vec<u8>,
    pub access_list: Vec<Vec<u8>>,
}

impl EvmTx {
    pub fn transfer(nonce: u64) -> Self {
        Self {
            chain_id: SEPOLIA,
            nonce,
            tip: 1_000_000_000,
            max_fee: 2_000_000_000,
            gas: 21_000,
            to: Some([0x61; 20]),
            value: 1_000_000_000_000_000,
            data: vec![],
            access_list: vec![],
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        let to = self.to.map(|t| t.to_vec()).unwrap_or_default();
        let mut out = vec![0x02];
        out.extend(rlp_list(&[
            rlp_uint(self.chain_id as u128),
            rlp_uint(self.nonce as u128),
            rlp_uint(self.tip),
            rlp_uint(self.max_fee),
            rlp_uint(self.gas as u128),
            rlp_bytes(&to),
            rlp_uint(self.value),
            rlp_bytes(&self.data),
            rlp_list(&self.access_list),
        ]));
        out
    }
}

pub fn evm_req(tx: &[u8]) -> Value {
    json!({ "evm": { "unsigned_tx": hex(tx) } })
}

// ── BTC (BIP143 P2WPKH, SIGHASH_ALL) ─────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct BtcInput {
    pub txid_le: [u8; 32],
    pub vout: u32,
    pub amount: u64,
    pub sequence: u32,
}

impl BtcInput {
    /// Display-order txid (what explorers show and what `SigDetail::Btc.txid` stores).
    pub fn txid_display(&self) -> [u8; 32] {
        let mut t = self.txid_le;
        t.reverse();
        t
    }
}

#[derive(Clone, Debug)]
pub struct BtcTx {
    pub version: u32,
    pub pkh: [u8; 20],
    pub inputs: Vec<BtcInput>,
    pub outputs: Vec<(u64, Vec<u8>)>,
    pub locktime: u32,
    pub sighash: u32,
}

pub fn btc_varint(n: usize) -> Vec<u8> {
    match n {
        0..=0xfc => vec![n as u8],
        0xfd..=0xffff => {
            let mut v = vec![0xfd];
            v.extend((n as u16).to_le_bytes());
            v
        }
        _ => {
            let mut v = vec![0xfe];
            v.extend((n as u32).to_le_bytes());
            v
        }
    }
}

impl BtcTx {
    /// `n` inputs from distinct funding txids, one P2WPKH recipient + one change output.
    pub fn new(n: usize, seed: u8) -> Self {
        let inputs = (0..n)
            .map(|i| BtcInput {
                txid_le: sha256(&[seed, i as u8, 0xb7]),
                vout: (i as u32) % 3,
                amount: 50_000 + 1_000 * i as u64,
                sequence: 0xffff_fffd,
            })
            .collect();
        let mut p2wpkh = vec![0x00, 0x14];
        p2wpkh.extend([0x42; 20]);
        let mut change = vec![0x00, 0x14];
        change.extend([0x11; 20]);
        Self {
            version: 2,
            pkh: [0x11; 20],
            inputs,
            outputs: vec![(40_000, p2wpkh), (9_000, change)],
            locktime: 0,
            sighash: 1,
        }
    }

    pub fn outputs_bytes(&self) -> Vec<u8> {
        let mut out = vec![];
        for (value, script) in &self.outputs {
            out.extend(value.to_le_bytes());
            out.extend(btc_varint(script.len()));
            out.extend(script);
        }
        out
    }

    pub fn hash_prevouts(&self) -> [u8; 32] {
        let mut b = vec![];
        for i in &self.inputs {
            b.extend(i.txid_le);
            b.extend(i.vout.to_le_bytes());
        }
        sha256d(&b)
    }

    pub fn hash_sequence(&self) -> [u8; 32] {
        let b: Vec<u8> = self
            .inputs
            .iter()
            .flat_map(|i| i.sequence.to_le_bytes())
            .collect();
        sha256d(&b)
    }

    /// The 182-byte BIP143 preimage for input `idx`.
    pub fn preimage(&self, idx: usize) -> Vec<u8> {
        let i = &self.inputs[idx];
        let mut p = Vec::with_capacity(182);
        p.extend(self.version.to_le_bytes());
        p.extend(self.hash_prevouts());
        p.extend(self.hash_sequence());
        p.extend(i.txid_le);
        p.extend(i.vout.to_le_bytes());
        p.extend([0x19, 0x76, 0xa9, 0x14]);
        p.extend(self.pkh);
        p.extend([0x88, 0xac]);
        p.extend(i.amount.to_le_bytes());
        p.extend(i.sequence.to_le_bytes());
        p.extend(sha256d(&self.outputs_bytes()));
        p.extend(self.locktime.to_le_bytes());
        p.extend(self.sighash.to_le_bytes());
        assert_eq!(p.len(), 182);
        p
    }

    pub fn preimages(&self) -> Vec<Vec<u8>> {
        (0..self.inputs.len()).map(|i| self.preimage(i)).collect()
    }

    pub fn req(&self) -> Value {
        btc_req_raw(&self.preimages(), &self.outputs_bytes())
    }
}

pub fn btc_req_raw(preimages: &[Vec<u8>], outputs: &[u8]) -> Value {
    json!({ "btc": {
        "preimages": preimages.iter().map(|p| hex(p)).collect::<Vec<_>>(),
        "outputs": hex(outputs),
    }})
}

// ── SOL (legacy message, single-signer System Transfer) ──────────────────────────────────

pub fn compact_u16(n: usize) -> Vec<u8> {
    let mut n = n as u16;
    let mut out = vec![];
    loop {
        let mut b = (n & 0x7f) as u8;
        n >>= 7;
        if n != 0 {
            b |= 0x80;
            out.push(b);
        } else {
            out.push(b);
            return out;
        }
    }
}

pub struct SolIx {
    pub program: u8,
    pub accounts: Vec<u8>,
    pub data: Vec<u8>,
}

pub fn sol_transfer_data(lamports: u64) -> Vec<u8> {
    let mut d = vec![2, 0, 0, 0];
    d.extend(lamports.to_le_bytes());
    d
}

/// header (num_required_signatures, num_readonly_signed, num_readonly_unsigned), keys, blockhash, ixs.
pub fn sol_message_raw(
    header: [u8; 3],
    keys: &[[u8; 32]],
    blockhash: [u8; 32],
    ixs: &[SolIx],
) -> Vec<u8> {
    let mut m = header.to_vec();
    m.extend(compact_u16(keys.len()));
    for k in keys {
        m.extend(k);
    }
    m.extend(blockhash);
    m.extend(compact_u16(ixs.len()));
    for ix in ixs {
        m.push(ix.program);
        m.extend(compact_u16(ix.accounts.len()));
        m.extend(&ix.accounts);
        m.extend(compact_u16(ix.data.len()));
        m.extend(&ix.data);
    }
    m
}

pub const SOL_FROM: [u8; 32] = [0xaa; 32];
pub const SOL_TO: [u8; 32] = [0xbb; 32];
pub const SOL_SYSTEM: [u8; 32] = [0; 32];

/// Canonical legacy System Transfer `from → to`.
pub fn sol_message(lamports: u64, blockhash: [u8; 32]) -> Vec<u8> {
    sol_message_raw(
        [1, 0, 1],
        &[SOL_FROM, SOL_TO, SOL_SYSTEM],
        blockhash,
        &[SolIx {
            program: 2,
            accounts: vec![0, 1],
            data: sol_transfer_data(lamports),
        }],
    )
}

pub fn sol_req(msg: &[u8]) -> Value {
    json!({ "sol": { "message": hex(msg) } })
}
