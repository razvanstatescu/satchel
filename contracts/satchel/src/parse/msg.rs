//! Message signing (C7, docs/specs/C1-C2-C3-C7.md §3.3). The caller sends only the UTF-8 body; the contract builds the
//! exact signed bytes itself, so it can never be made to sign a transaction, a typed-data digest or a raw hash.
//! - EVM: EIP-191 `personal_sign` = "\x19Ethereum Signed Message:\n" ‖ decimal(len) ‖ message, hashed with keccak256.
//! - SOL: off-chain message v0 (solana-sdk `OffchainMessage`) = "\xffsolana offchain" ‖ 0x00 ‖ format ‖ u16le(len) ‖ message.
//!   Its first byte 0xff can never start a Solana transaction message.

use crate::errors::*;

pub const MAX_MESSAGE_BYTES: usize = 1024;
pub const EIP191_PREFIX: &[u8] = b"\x19Ethereum Signed Message:\n";
pub const SOL_OFFCHAIN_DOMAIN: &[u8; 16] = b"\xffsolana offchain";
/// v0 formats: 0 = restricted ASCII (every byte in 0x20..=0x7e), 1 = limited UTF-8. Format 2 (extended UTF-8) is only
/// for messages longer than 1212 bytes, so it never applies under the 1024-byte cap.
pub const SOL_FORMAT_ASCII: u8 = 0;
pub const SOL_FORMAT_UTF8: u8 = 1;

/// 1..=1024 bytes of valid UTF-8.
pub fn check(m: &[u8]) -> Result<(), &'static str> {
    if m.is_empty() {
        return Err(ERR_MSG_EMPTY);
    }
    if m.len() > MAX_MESSAGE_BYTES {
        return Err(ERR_MSG_TOO_LONG);
    }
    if core::str::from_utf8(m).is_err() {
        return Err(ERR_MSG_ENCODING);
    }
    Ok(())
}

fn decimal(mut n: usize, out: &mut Vec<u8>) {
    let mut d = [0u8; 20];
    let mut i = d.len();
    loop {
        i -= 1;
        d[i] = b'0' + (n % 10) as u8;
        n /= 10;
        if n == 0 {
            break;
        }
    }
    out.extend_from_slice(&d[i..]);
}

/// The EIP-191 version 0x45 bytes whose keccak256 is signed.
pub fn eip191(m: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(EIP191_PREFIX.len() + 4 + m.len());
    out.extend_from_slice(EIP191_PREFIX);
    decimal(m.len(), &mut out);
    out.extend_from_slice(m);
    out
}

/// The format solana-sdk's `OffchainMessage::new` picks for a message under the ledger limit.
pub fn sol_format(m: &[u8]) -> u8 {
    if m.iter().all(|b| (0x20..=0x7e).contains(b)) { SOL_FORMAT_ASCII } else { SOL_FORMAT_UTF8 }
}

/// The Solana off-chain message v0 bytes that are signed as-is by the Ed25519 domain. `m` must have passed `check`.
pub fn sol_offchain(m: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(20 + m.len());
    out.extend_from_slice(SOL_OFFCHAIN_DOMAIN);
    out.push(0); // header version
    out.push(sol_format(m));
    out.extend_from_slice(&(m.len() as u16).to_le_bytes());
    out.extend_from_slice(m);
    out
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::parse::{evm, sol};

    fn keccak(b: &[u8]) -> String {
        hex::encode(near_sdk::env::keccak256_array(b))
    }

    #[test]
    fn eip191_matches_known_hashes() {
        // ethers/viem `hashMessage("hello")` = 0x50b2c43f…3750 (EIP-191 "\x19Ethereum Signed Message:\n5hello")
        assert_eq!(eip191(b"hello"), b"\x19Ethereum Signed Message:\n5hello".to_vec());
        assert_eq!(keccak(&eip191(b"hello")), "50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750");
        assert_eq!(&eip191(&[b'a'; 10])[..28], b"\x19Ethereum Signed Message:\n10");
        assert_eq!(&eip191(&[b'a'; 1024])[..30], b"\x19Ethereum Signed Message:\n1024");
    }

    #[test]
    fn sol_offchain_layout() {
        let b = sol_offchain(b"Hi");
        assert_eq!(hex::encode(&b), "ff736f6c616e61206f6666636861696e000002004869");
        assert_eq!(sol_format(b"plain ascii ~"), SOL_FORMAT_ASCII);
        assert_eq!(sol_format(b"line\nbreak"), SOL_FORMAT_UTF8, "a newline is not printable ASCII");
        assert_eq!(sol_format("café".as_bytes()), SOL_FORMAT_UTF8);
        let long = vec![b'x'; 1024];
        let b = sol_offchain(&long);
        assert_eq!(b.len(), 20 + 1024);
        assert_eq!(&b[18..20], &[0x00, 0x04]);
    }

    #[test]
    fn check_refusals() {
        assert_eq!(check(b""), Err(ERR_MSG_EMPTY));
        assert_eq!(check(&[b'a'; 1025]), Err(ERR_MSG_TOO_LONG));
        assert_eq!(check(&[0xff]), Err(ERR_MSG_ENCODING));
        assert_eq!(check(&[0xc3]), Err(ERR_MSG_ENCODING), "truncated 2-byte sequence");
        assert_eq!(check(&[0xed, 0xa0, 0x80]), Err(ERR_MSG_ENCODING), "UTF-16 surrogate");
        assert_eq!(check(&[0xc0, 0x80]), Err(ERR_MSG_ENCODING), "overlong NUL");
        assert_eq!(check(&[b'a'; 1024]), Ok(()));
        assert_eq!(check("Sign in to example.org\nNonce: 42 ✓".as_bytes()), Ok(()));
        assert_eq!(check(&[0x00]), Ok(()), "NUL is valid UTF-8");
    }

    /// The signed bytes can never classify as a transaction on the same key.
    #[test]
    fn signed_bytes_never_parse_as_transactions() {
        for m in [&b"x"[..], b"\x02\xee", &[0x01, 0x00, 0x01, 0x03], &[b'a'; 1024]] {
            assert!(evm::classify(&eip191(m)).is_err());
            assert!(sol::classify(&sol_offchain(m)).is_err());
            assert_eq!(sol::classify(&sol_offchain(m)), Err(crate::errors::ERR_SOL_VERSION));
        }
    }
}
