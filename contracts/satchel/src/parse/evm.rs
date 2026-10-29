//! EVM type-2 classifier (spec §5.9, docs/specs/C1-C2-C3-C7.md §3.1): a native ETH transfer, or exactly one ERC-20
//! `transfer` to the chain's Circle testnet USDC, on one of four testnets.
//! Layout: 0x02 ‖ rlp([chain_id, nonce, max_priority_fee, max_fee, gas_limit, to, value, data, access_list]).

use super::rlp::{decode_exact, Item};
use crate::errors::*;

pub const SEPOLIA: u64 = 11_155_111;
/// Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia (C3). Frozen at birth.
pub const EVM_CHAIN_IDS: [u64; 4] = [SEPOLIA, 84_532, 421_614, 11_155_420];
/// Circle testnet USDC per chain (C2), verified read-only on 2026-10-29: `symbol() == "USDC"`, `decimals() == 6`.
pub const ERC20_TOKENS: [(u64, [u8; 20]); 4] = [
    (SEPOLIA, [0x1c, 0x7d, 0x4b, 0x19, 0x6c, 0xb0, 0xc7, 0xb0, 0x1d, 0x74, 0x3f, 0xbc, 0x61, 0x16, 0xa9, 0x02, 0x37, 0x9c, 0x72, 0x38]),
    (84_532, [0x03, 0x6c, 0xbd, 0x53, 0x84, 0x2c, 0x54, 0x26, 0x63, 0x4e, 0x79, 0x29, 0x54, 0x1e, 0xc2, 0x31, 0x8f, 0x3d, 0xcf, 0x7e]),
    (421_614, [0x75, 0xfa, 0xf1, 0x14, 0xea, 0xfb, 0x1b, 0xdb, 0xe2, 0xf0, 0x31, 0x6d, 0xf8, 0x93, 0xfd, 0x58, 0xce, 0x46, 0xaa, 0x4d]),
    (11_155_420, [0x5f, 0xd8, 0x42, 0x59, 0xd6, 0x6c, 0xd4, 0x61, 0x23, 0x54, 0x07, 0x66, 0xbe, 0x93, 0xdf, 0xe6, 0xd4, 0x31, 0x30, 0xd7]),
];
/// A maximal native transfer is 99 B and a maximal USDC transfer 152 B.
pub const EVM_MAX_TX_BYTES: usize = 160;
/// `transfer(address,uint256)`
pub const ERC20_TRANSFER_SELECTOR: [u8; 4] = [0xa9, 0x05, 0x9c, 0xbb];

/// A canonical ERC-20 `transfer(to, amount)` call (C2). `token` is the tx's `to`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Erc20Transfer {
    pub token: [u8; 20],
    pub to: [u8; 20],
    pub amount: u128,
}

#[derive(Debug, PartialEq, Eq)]
pub struct EvmTx {
    pub chain_id: u64,
    pub nonce: u64,
    /// native value in wei (0 for a token transfer)
    pub value: u128,
    pub erc20: Option<Erc20Transfer>,
}

/// The allowlisted token of `chain_id`, if any.
pub fn token_of(chain_id: u64) -> Option<[u8; 20]> {
    ERC20_TOKENS.iter().find(|(c, _)| *c == chain_id).map(|(_, t)| *t)
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

fn to_u128(b: &[u8]) -> u128 {
    b.iter().fold(0u128, |acc, x| (acc << 8) | (*x as u128))
}

/// `a9059cbb ‖ 12 zero bytes ‖ recipient(20) ‖ 16 zero bytes ‖ amount(16)`, exactly 68 bytes, else None.
/// The zero bytes make the encoding canonical (a padded address) and keep the amount below 2^128.
fn transfer_call(data: &[u8]) -> Option<([u8; 20], u128)> {
    if data.len() != 68 || data[..4] != ERC20_TRANSFER_SELECTOR || data[4..16].iter().any(|b| *b != 0) || data[36..52].iter().any(|b| *b != 0) {
        return None;
    }
    let mut to = [0u8; 20];
    to.copy_from_slice(&data[16..36]);
    Some((to, to_u128(&data[52..68])))
}

/// Nonce-gap rule (spec §5.9, D-43; review S-04), applied per chain id (C3). Only this contract can advance a
/// Satchel's EVM nonce on a chain, so a legitimate request never needs more than the highest nonce signed on that chain
/// + 1. The first EVM request on a chain may use nonce 0 or 1: a faucet deposit does not bump the nonce (the first real
/// send is 0), and 1 keeps demo #4's "nonce = current + 1" record possible. Returns the largest nonce that may be signed next.
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

/// The ERC-20 transfer inside an already-recorded `unsigned_tx` (views and events). None for a native transfer or
/// anything that doesn't classify (never panics).
pub fn erc20_of(tx: &[u8]) -> Option<Erc20Transfer> {
    classify(tx).ok().and_then(|t| t.erc20)
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
    let chain_id = to_u64(chain_id);
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
    let mut token = [0u8; 20];
    token.copy_from_slice(to);
    // C2: empty data (native), or one canonical transfer to this chain's USDC with no ETH attached.
    let erc20 = if data.is_empty() {
        None
    } else {
        let (recipient, amount) = transfer_call(data).ok_or(ERR_EVM_DATA)?;
        if token_of(chain_id) != Some(token) {
            return Err(ERR_EVM_TOKEN);
        }
        if !value.is_empty() {
            return Err(ERR_EVM_VALUE); // canonical zero is the empty string
        }
        Some(Erc20Transfer { token, to: recipient, amount })
    };
    if !access_list.is_empty() {
        return Err(ERR_EVM_ACCESS_LIST);
    }
    Ok(EvmTx { chain_id, nonce, value: to_u128(value), erc20 })
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
        assert_eq!(classify(&tx), Ok(EvmTx { chain_id: 11_155_111, nonce: 0, value: 100_000_000_000_000, erc20: None }));
        assert_eq!(keccak(&tx), KB31_HASH);
    }

    #[test]
    fn kb70_f1_oracle_accepts_and_hashes() {
        assert!(KB70_F1_TX.starts_with("02f283aa36a707") && KB70_F1_TX.ends_with("dead872bb2c8eabcc00080c0"));
        let tx = decode(KB70_F1_TX).unwrap();
        assert_eq!(tx.len(), 52);
        assert_eq!(classify(&tx).map(|t| (t.chain_id, t.nonce, t.erc20)), Ok((11_155_111, 7, None)));
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
            ("too long", { let mut t = vec![0x02]; t.extend([0u8; 160]); t }, ERR_EVM_TOO_LONG),
            ("129 bytes is no longer too long", { let mut t = vec![0x02]; t.extend([0u8; 128]); t }, ERR_EVM_RLP),
            ("trailing byte", { let mut t = ok.clone(); t.push(0); t }, ERR_EVM_RLP),
            ("not a list", { let mut t = vec![0x02]; t.extend(enc_str(&[1, 2, 3])); t }, ERR_EVM_RLP),
            ("8 items", { let mut t = vec![0x02]; t.extend(enc_list(&[int(11155111), int(0), int(1), int(1), int(21000), enc_str(&[0x11; 20]), int(1), enc_str(&[])])); t }, ERR_EVM_RLP),
            ("noncanonical int", { let mut f = base(); f.nonce = enc_str(&[0x00, 0x07]); build(&f) }, ERR_EVM_RLP),
            ("noncanonical zero", { let mut f = base(); f.nonce = vec![0x00]; build(&f) }, ERR_EVM_RLP),
            ("wrapped byte", { let mut f = base(); f.nonce = vec![0x81, 0x07]; build(&f) }, ERR_EVM_RLP),
            ("int is a list", { let mut f = base(); f.value = enc_list(&[]); build(&f) }, ERR_EVM_RLP),
            ("chain 1", { let mut f = base(); f.chain = int(1); build(&f) }, ERR_EVM_CHAIN_ID),
            ("chain 8453 (Base mainnet)", { let mut f = base(); f.chain = int(8453); build(&f) }, ERR_EVM_CHAIN_ID),
            ("chain 17000 (Holesky)", { let mut f = base(); f.chain = int(17_000); build(&f) }, ERR_EVM_CHAIN_ID),
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

    // ── C2 / C3 ────────────────────────────────────────────────────────────────────────────────

    pub fn transfer_data(to: [u8; 20], amount: u128) -> Vec<u8> {
        let mut d = ERC20_TRANSFER_SELECTOR.to_vec();
        d.extend([0u8; 12]);
        d.extend(to);
        d.extend([0u8; 16]);
        d.extend(amount.to_be_bytes());
        d
    }

    /// A USDC transfer on `chain` (to = that chain's token, value 0).
    pub fn erc20_fields(chain: u64, recipient: [u8; 20], amount: u128) -> Fields {
        let mut f = base();
        f.chain = int(chain as u128);
        f.to = enc_str(&token_of(chain).unwrap());
        f.value = int(0);
        f.gas = int(65_000);
        f.data = enc_str(&transfer_data(recipient, amount));
        f
    }

    #[test]
    fn chains_accept_native_transfers() {
        for chain in EVM_CHAIN_IDS {
            let mut f = base();
            f.chain = int(chain as u128);
            let t = classify(&build(&f)).unwrap();
            assert_eq!((t.chain_id, t.nonce, t.value, t.erc20), (chain, 0, 10u128.pow(15), None), "{chain}");
        }
        assert_eq!(EVM_CHAIN_IDS, [11_155_111, 84_532, 421_614, 11_155_420]);
    }

    #[test]
    fn erc20_transfer_accepted_on_every_chain() {
        for (chain, token) in ERC20_TOKENS {
            let t = classify(&build(&erc20_fields(chain, [0x22; 20], 1_500_000))).unwrap();
            assert_eq!(t.chain_id, chain);
            assert_eq!(t.value, 0);
            assert_eq!(t.erc20, Some(Erc20Transfer { token, to: [0x22; 20], amount: 1_500_000 }));
        }
        // amount 0, amount 2^128 − 1, recipient = the token itself, the zero address: all signable (they at most revert)
        for (rcpt, amount) in [([0x22; 20], 0u128), ([0x22; 20], u128::MAX), (token_of(SEPOLIA).unwrap(), 5), ([0u8; 20], 5)] {
            let t = classify(&build(&erc20_fields(SEPOLIA, rcpt, amount))).unwrap();
            assert_eq!(t.erc20.map(|e| (e.to, e.amount)), Some((rcpt, amount)));
        }
        assert_eq!(erc20_of(&build(&erc20_fields(84_532, [0x33; 20], 7))).map(|e| e.amount), Some(7));
        assert_eq!(erc20_of(&build(&base())), None);
        assert_eq!(erc20_of(&[0xde, 0xad]), None);
    }

    #[test]
    fn erc20_maximal_transfer_fits_the_length_limit() {
        let mut f = erc20_fields(11_155_420, [0xff; 20], u128::MAX);
        f.nonce = int(u64::MAX as u128 - 1);
        f.gas = int(u64::MAX as u128);
        f.tip = int(u128::MAX);
        f.fee = int(u128::MAX);
        let tx = build(&f);
        assert_eq!(tx.len(), 152);
        assert!(classify(&tx).is_ok());
    }

    #[test]
    fn erc20_refusals() {
        let ok = erc20_fields(SEPOLIA, [0x22; 20], 1);
        assert!(classify(&build(&ok)).is_ok());
        let with = |edit: &dyn Fn(&mut Fields)| {
            let mut f = erc20_fields(SEPOLIA, [0x22; 20], 1);
            edit(&mut f);
            build(&f)
        };
        let data = transfer_data([0x22; 20], 1);
        let al = || enc_list(&[enc_list(&[enc_str(&[0x22; 20]), enc_list(&[])])]);
        let cases: Vec<(&str, Vec<u8>, &str)> = vec![
            ("approve selector", with(&|f| { let mut d = data.clone(); d[..4].copy_from_slice(&[0x09, 0x5e, 0xa7, 0xb3]); f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("transferFrom selector", with(&|f| { let mut d = data.clone(); d[..4].copy_from_slice(&[0x23, 0xb8, 0x72, 0xdd]); f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("67 bytes", with(&|f| f.data = enc_str(&data[..67])), ERR_EVM_DATA),
            ("69 bytes", with(&|f| { let mut d = data.clone(); d.push(0); f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("selector only", with(&|f| f.data = enc_str(&ERC20_TRANSFER_SELECTOR)), ERR_EVM_DATA),
            ("dirty address padding", with(&|f| { let mut d = data.clone(); d[15] = 1; f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("dirty address padding, first byte", with(&|f| { let mut d = data.clone(); d[4] = 0x80; f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("amount ≥ 2^128", with(&|f| { let mut d = data.clone(); d[51] = 1; f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("amount high byte", with(&|f| { let mut d = data.clone(); d[36] = 0xff; f.data = enc_str(&d) }), ERR_EVM_DATA),
            ("Sepolia USDC on Base", with(&|f| f.chain = int(84_532)), ERR_EVM_TOKEN),
            ("Base USDC on Sepolia", with(&|f| f.to = enc_str(&token_of(84_532).unwrap())), ERR_EVM_TOKEN),
            ("another contract", with(&|f| f.to = enc_str(&[0x11; 20])), ERR_EVM_TOKEN),
            ("value 1 wei", with(&|f| f.value = int(1)), ERR_EVM_VALUE),
            ("value max", with(&|f| f.value = int(u128::MAX)), ERR_EVM_VALUE),
            ("access list after a valid transfer", with(&|f| f.al = al()), ERR_EVM_ACCESS_LIST),
            // order: data shape before token, token before value, value before access list
            ("bad data and bad token", with(&|f| { f.to = enc_str(&[0x11; 20]); f.data = enc_str(&data[..67]) }), ERR_EVM_DATA),
            ("bad token and value", with(&|f| { f.to = enc_str(&[0x11; 20]); f.value = int(1) }), ERR_EVM_TOKEN),
            ("value and access list", with(&|f| { f.value = int(1); f.al = al() }), ERR_EVM_VALUE),
            ("unsupported chain before data", with(&|f| { f.chain = int(1); f.data = enc_str(&data[..67]) }), ERR_EVM_CHAIN_ID),
            ("short to before data", with(&|f| { f.to = enc_str(&[0x11; 19]); f.data = enc_str(&data[..67]) }), ERR_EVM_TO),
        ];
        for (name, tx, err) in cases {
            assert_eq!(classify(&tx).map(|_| ()), Err(err), "{name}");
        }
    }

    #[test]
    fn token_allowlist_is_one_token_per_supported_chain() {
        for chain in EVM_CHAIN_IDS {
            assert!(token_of(chain).is_some(), "{chain}");
        }
        assert_eq!(ERC20_TOKENS.len(), EVM_CHAIN_IDS.len());
        assert_eq!(token_of(1), None);
        assert_eq!(hex::encode(token_of(SEPOLIA).unwrap()), "1c7d4b196cb0c7b01d743fbc6116a902379c7238");
        assert_eq!(hex::encode(token_of(84_532).unwrap()), "036cbd53842c5426634e7929541ec2318f3dcf7e");
        assert_eq!(hex::encode(token_of(421_614).unwrap()), "75faf114eafb1bdbe2f0316df893fd58ce46aa4d");
        assert_eq!(hex::encode(token_of(11_155_420).unwrap()), "5fd84259d66cd46123540766be93dfe6d43130d7");
    }
}
