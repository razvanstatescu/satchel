//! Strict hex: an optional `0x`/`0X` prefix, even length, `[0-9a-fA-F]` only. Outputs are lowercase, no prefix.

use crate::errors::ERR_HEX;

pub fn decode(s: &str) -> Result<Vec<u8>, &'static str> {
    let body = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(s);
    if !body.len().is_multiple_of(2) {
        return Err(ERR_HEX);
    }
    hex::decode(body).map_err(|_| ERR_HEX)
}

pub fn encode(b: &[u8]) -> String {
    hex::encode(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_prefix_and_both_cases() {
        assert_eq!(decode("0xAbCd").unwrap(), vec![0xab, 0xcd]);
        assert_eq!(decode("abcd").unwrap(), vec![0xab, 0xcd]);
        assert_eq!(decode("0X01").unwrap(), vec![0x01]);
        assert_eq!(decode("").unwrap(), Vec::<u8>::new());
        assert_eq!(decode("0x").unwrap(), Vec::<u8>::new());
    }

    #[test]
    fn rejects_bad_hex() {
        for bad in ["abc", "0xabc", "zz", "0x0g", " 00", "00 ", "0x 0", "x0", "00x0", "+1"] {
            assert_eq!(decode(bad), Err(ERR_HEX), "{bad}");
        }
    }

    #[test]
    fn encode_is_lowercase() {
        assert_eq!(encode(&[0xAB, 0x01]), "ab01");
    }
}
