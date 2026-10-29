//! EVM type-2 classifier (spec §5.9): native ETH transfer on Sepolia only.
//! Layout: 0x02 ‖ rlp([chain_id, nonce, max_priority_fee, max_fee, gas_limit, to, value, data, access_list]).

use super::rlp::{decode_exact, Item};
use crate::errors::*;

pub const EVM_CHAIN_IDS: [u64; 1] = [11_155_111];
pub const EVM_MAX_TX_BYTES: usize = 128;

#[derive(Debug, PartialEq, Eq)]
pub struct EvmTx {
    pub chain_id: u64,
    pub nonce: u64,
}

/// Minimal big-endian integer: no leading zero (zero is the empty string).
fn int_bytes<'a>(it: &Item<'a>) -> Result<&'a [u8], &'static str> {
    match it {
        Item::Str(s) => {
            if !s.is_empty() && s[0] == 0 {
                Err(ERR_EVM_RLP)
            } else {
                Ok(s)
            }
        }
        Item::List(_) => Err(ERR_EVM_RLP),
    }
}

fn to_u64(b: &[u8]) -> u64 {
    b.iter().fold(0u64, |acc, x| (acc << 8) | (*x as u64))
}

/// Nonce-gap rule (spec §5.9, D-43; review S-04). Only this contract can advance a Satchel's EVM nonce, so a legitimate
/// request never needs more than the highest signed nonce + 1. The first EVM request may use nonce 0 or 1: a faucet
/// deposit does not bump the nonce (the first real send is 0), and 1 keeps demo #4's "nonce = current + 1" record
/// possible. Returns the largest nonce that may be signed next.
pub fn max_allowed_nonce(max_signed: Option<u64>) -> u64 {
    match max_signed {
        None => 1,
        Some(m) => m.saturating_add(1),
    }
}

/// `ERR_EVM_NONCE_GAP` unless `nonce ≤ max_allowed_nonce(max_signed)`. Runs after `classify` (state-dependent).
pub fn check_nonce(nonce: u64, max_signed: Option<u64>) -> Result<(), &'static str> {
    if nonce > max_allowed_nonce(max_signed) { Err(ERR_EVM_NONCE_GAP) } else { Ok(()) }
}

pub fn classify(tx: &[u8]) -> Result<EvmTx, &'static str> {
    if tx.len() > EVM_MAX_TX_BYTES {
        return Err(ERR_EVM_TOO_LONG);
    }
    if tx.first() != Some(&0x02) {
        return Err(ERR_EVM_TYPE);
    }
    let fields = match decode_exact(&tx[1..]).map_err(|_| ERR_EVM_RLP)? {
        Item::List(f) => f,
        Item::Str(_) => return Err(ERR_EVM_RLP),
    };
    if fields.len() != 9 {
        return Err(ERR_EVM_RLP);
    }
    // Structure first (ERR_EVM_RLP): items 0–6 canonical byte strings, data a byte string, access list a list.
    let chain_id = int_bytes(&fields[0])?;
    let nonce = int_bytes(&fields[1])?;
    let tip = int_bytes(&fields[2])?;
    let max_fee = int_bytes(&fields[3])?;
    let gas = int_bytes(&fields[4])?;
    let to = match &fields[5] {
        Item::Str(to) => *to,
        Item::List(_) => return Err(ERR_EVM_RLP),
    };
    let value = int_bytes(&fields[6])?;
    let data = match &fields[7] {
        Item::Str(d) => *d,
        Item::List(_) => return Err(ERR_EVM_RLP),
    };
    let access_list = match &fields[8] {
        Item::List(l) => l,
        Item::Str(_) => return Err(ERR_EVM_RLP),
    };
    // Policy.
    if chain_id.len() > 8 || !EVM_CHAIN_IDS.contains(&to_u64(chain_id)) {
        return Err(ERR_EVM_CHAIN_ID);
    }
    if nonce.len() > 8 || gas.len() > 8 || tip.len() > 16 || max_fee.len() > 16 || value.len() > 16 {
        return Err(ERR_EVM_INT_WIDTH);
    }
    let nonce = to_u64(nonce);
    if nonce == u64::MAX {
        return Err(ERR_EVM_INT_WIDTH); // EIP-2681: nonce < 2^64 - 1
    }
    if to.len() != 20 {
        return Err(ERR_EVM_TO);
    }
    if !data.is_empty() {
        return Err(ERR_EVM_DATA);
    }
    if !access_list.is_empty() {
        return Err(ERR_EVM_ACCESS_LIST);
    }
    Ok(EvmTx { chain_id: to_u64(chain_id), nonce })
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::parse::hex::decode;

    /// kb/31 §Real MPC-signed tx: 48-byte unsigned Sepolia tx and its keccak (the MPC payload).
    pub const KB31_TX: &str = "02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0";
    pub const KB31_HASH: &str = "bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377";
    /// kb/70 F1: 52-byte ETH transfer (nonce 7, to 0x…dead). KB prints it truncated (`02f283aa36a707…dead872bb2c8eabcc00080c0`);
    /// the full bytes are the sec spike's recorded evidence output (out_evm.txt), checked here against the KB prefix/suffix.
    pub const KB70_F1_TX: &str = "02f283aa36a7078459682f008506fc23ac0082520894000000000000000000000000000000000000dead872bb2c8eabcc00080c0";
    pub const KB70_F1_HASH: &str = "8cb1b816dd6087e2a2680a1e77be488ee50a63fe49b1f384537c399513f6a1a9";

    // ---- tiny RLP encoder for constructing vectors in tests ----
    pub fn enc_str(b: &[u8]) -> Vec<u8> {
        if b.len() == 1 && b[0] < 0x80 {
            return b.to_vec();
        }
        let mut out = enc_len(0x80, b.len());
        out.extend_from_slice(b);
        out
    }
    pub fn enc_list(items: &[Vec<u8>]) -> Vec<u8> {
        let payload: Vec<u8> = items.concat();
        let mut out = enc_len(0xc0, payload.len());
        out.extend(payload);
        out
    }
    fn enc_len(base: u8, len: usize) -> Vec<u8> {
        if len <= 55 {
            vec![base + len as u8]
        } else {
            let lb: Vec<u8> = (len as u64).to_be_bytes().iter().copied().skip_while(|b| *b == 0).collect();
            let mut v = vec![base + 55 + lb.len() as u8];
            v.extend(lb);
            v
        }
    }
    pub fn int(v: u128) -> Vec<u8> {
        let b: Vec<u8> = v.to_be_bytes().iter().copied().skip_while(|b| *b == 0).collect();
        enc_str(&b)
    }
    pub struct Fields {
        pub chain: Vec<u8>,
        pub nonce: Vec<u8>,
        pub tip: Vec<u8>,
        pub fee: Vec<u8>,
        pub gas: Vec<u8>,
        pub to: Vec<u8>,
        pub value: Vec<u8>,
        pub data: Vec<u8>,
        pub al: Vec<u8>,
    }
    pub fn base() -> Fields {
        Fields {
            chain: int(11_155_111),
            nonce: int(0),
            tip: int(1_500_000_000),
            fee: int(30_000_000_000),
            gas: int(21_000),
            to: enc_str(&[0x11; 20]),
            value: int(10u128.pow(15)),
            data: enc_str(&[]),
            al: enc_list(&[]),
        }
    }
    pub fn build(f: &Fields) -> Vec<u8> {
        let mut out = vec![0x02];
        out.extend(enc_list(&[
            f.chain.clone(),
            f.nonce.clone(),
            f.tip.clone(),
            f.fee.clone(),
            f.gas.clone(),
            f.to.clone(),
            f.value.clone(),
            f.data.clone(),
            f.al.clone(),
        ]));
        out
    }

    fn keccak(b: &[u8]) -> String {
        hex::encode(near_sdk::env::keccak256_array(b))
    }

    #[test]
    fn kb31_oracle_accepts_and_hashes() {
        let tx = decode(KB31_TX).unwrap();
        assert_eq!(tx.len(), 48);
        assert_eq!(classify(&tx), Ok(EvmTx { chain_id: 11_155_111, nonce: 0 }));
        assert_eq!(keccak(&tx), KB31_HASH);
    }

    #[test]
    fn kb70_f1_oracle_accepts_and_hashes() {
        assert!(KB70_F1_TX.starts_with("02f283aa36a707") && KB70_F1_TX.ends_with("dead872bb2c8eabcc00080c0"));
        let tx = decode(KB70_F1_TX).unwrap();
        assert_eq!(tx.len(), 52);
        assert_eq!(classify(&tx), Ok(EvmTx { chain_id: 11_155_111, nonce: 7 }));
        assert_eq!(keccak(&tx), KB70_F1_HASH);
    }

    #[test]
    fn accepted_variants() {
        // nonce 7, large values, max-width ints, `to` = a contract address (allowed: no calldata)
        let mut f = base();
        f.nonce = int(7);
        assert_eq!(classify(&build(&f)).unwrap().nonce, 7);
        let mut f = base();
        f.value = int(u128::MAX);
        f.tip = int(u128::MAX);
        f.fee = int(u128::MAX);
        f.gas = int(u64::MAX as u128);
        f.nonce = int(u64::MAX as u128 - 1);
        let tx = build(&f);
        assert!(tx.len() <= EVM_MAX_TX_BYTES);
        assert_eq!(classify(&tx).unwrap().nonce, u64::MAX - 1);
    }

    #[test]
    fn refusals() {
        let ok = build(&base());
        assert!(classify(&ok).is_ok());
        let cases: Vec<(&str, Vec<u8>, &str)> = vec![
            ("empty", vec![], ERR_EVM_TYPE),
            ("raw hash", vec![0xab; 32], ERR_EVM_TYPE),
            ("legacy", decode("e2070182520894000000000000000000000000000000000000dead018083aa36a78080").unwrap(), ERR_EVM_TYPE),
            ("type1", { let mut t = ok.clone(); t[0] = 0x01; t }, ERR_EVM_TYPE),
            ("type4", { let mut t = ok.clone(); t[0] = 0x04; t }, ERR_EVM_TYPE),
            ("7702 auth", decode("05d78094111111111111111111111111111111111111111108").unwrap(), ERR_EVM_TYPE),
            ("eip191", { let mut t = vec![0x19, 0x45]; t.extend([0u8; 30]); t }, ERR_EVM_TYPE),
            ("eip712", { let mut t = vec![0x19, 0x01]; t.extend([0u8; 64]); t }, ERR_EVM_TYPE),
            ("too long", { let mut t = vec![0x02]; t.extend([0u8; 128]); t }, ERR_EVM_TOO_LONG),
            ("trailing byte", { let mut t = ok.clone(); t.push(0); t }, ERR_EVM_RLP),
            ("not a list", { let mut t = vec![0x02]; t.extend(enc_str(&[1, 2, 3])); t }, ERR_EVM_RLP),
            ("8 items", { let mut t = vec![0x02]; t.extend(enc_list(&[int(11155111), int(0), int(1), int(1), int(21000), enc_str(&[0x11; 20]), int(1), enc_str(&[])])); t }, ERR_EVM_RLP),
            ("noncanonical int", { let mut f = base(); f.nonce = enc_str(&[0x00, 0x07]); build(&f) }, ERR_EVM_RLP),
            ("noncanonical zero", { let mut f = base(); f.nonce = vec![0x00]; build(&f) }, ERR_EVM_RLP),
            ("wrapped byte", { let mut f = base(); f.nonce = vec![0x81, 0x07]; build(&f) }, ERR_EVM_RLP),
            ("int is a list", { let mut f = base(); f.value = enc_list(&[]); build(&f) }, ERR_EVM_RLP),
            ("chain 1", { let mut f = base(); f.chain = int(1); build(&f) }, ERR_EVM_CHAIN_ID),
            ("chain 84532", { let mut f = base(); f.chain = int(84532); build(&f) }, ERR_EVM_CHAIN_ID),
            ("chain 0", { let mut f = base(); f.chain = int(0); build(&f) }, ERR_EVM_CHAIN_ID),
            ("chain 9 bytes", { let mut f = base(); f.chain = enc_str(&[1, 0, 0, 0, 0, 0, 0xaa, 0x36, 0xa7]); build(&f) }, ERR_EVM_CHAIN_ID),
            ("wide nonce", { let mut f = base(); f.nonce = enc_str(&[1; 9]); build(&f) }, ERR_EVM_INT_WIDTH),
            ("nonce max", { let mut f = base(); f.nonce = int(u64::MAX as u128); build(&f) }, ERR_EVM_INT_WIDTH),
            ("wide gas", { let mut f = base(); f.gas = enc_str(&[1; 9]); build(&f) }, ERR_EVM_INT_WIDTH),
            ("wide value", { let mut f = base(); f.value = enc_str(&[1; 17]); build(&f) }, ERR_EVM_INT_WIDTH),
            ("wide fee", { let mut f = base(); f.fee = enc_str(&[1; 17]); build(&f) }, ERR_EVM_INT_WIDTH),
            ("wide tip", { let mut f = base(); f.tip = enc_str(&[1; 17]); build(&f) }, ERR_EVM_INT_WIDTH),
            ("creation", { let mut f = base(); f.to = enc_str(&[]); build(&f) }, ERR_EVM_TO),
            ("short to", { let mut f = base(); f.to = enc_str(&[0x11; 19]); build(&f) }, ERR_EVM_TO),
            ("to is list", { let mut f = base(); f.to = enc_list(&[]); build(&f) }, ERR_EVM_RLP),
            ("approve calldata", { let mut f = base(); f.data = enc_str(&decode("095ea7b3").unwrap()); build(&f) }, ERR_EVM_DATA),
            ("one byte calldata", { let mut f = base(); f.data = vec![0x00]; build(&f) }, ERR_EVM_DATA),
            ("access list", { let mut f = base(); f.al = enc_list(&[enc_list(&[enc_str(&[0x22; 20]), enc_list(&[])])]); build(&f) }, ERR_EVM_ACCESS_LIST),
            ("access list as string", { let mut f = base(); f.al = enc_str(&[]); build(&f) }, ERR_EVM_RLP),
            ("data is list", { let mut f = base(); f.data = enc_list(&[]); build(&f) }, ERR_EVM_RLP),
            ("structure before policy", { let mut f = base(); f.chain = int(1); f.to = enc_list(&[]); build(&f) }, ERR_EVM_RLP),
        ];
        for (name, tx, err) in cases {
            assert_eq!(classify(&tx), Err(err), "{name}");
        }
    }
}
