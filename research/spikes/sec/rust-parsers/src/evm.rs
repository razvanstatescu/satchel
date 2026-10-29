//! Strict EIP-1559 (type 0x02) unsigned-tx classifier. MVP policy: native ETH transfer only.
//! preimage = 0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gas, to, value, data, accessList])

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvmTx {
    pub chain_id: u64,
    pub nonce: u64,
    pub max_priority_fee: u128,
    pub max_fee: u128,
    pub gas: u64,
    pub to: [u8; 20],
    pub value: u128,
    /// value + gas * max_fee (worst-case debit, for delegate caps)
    pub max_spend: u128,
}

#[cfg(not(feature = "alloy"))]
mod rlp {
    pub struct Rd<'a> {
        pub b: &'a [u8],
        pub i: usize,
    }
    impl<'a> Rd<'a> {
        /// Returns (is_list, payload_len) and advances past the header. Canonical encodings only.
        pub fn header(&mut self) -> Result<(bool, usize), &'static str> {
            let b0 = *self.b.get(self.i).ok_or("rlp eof")?;
            self.i += 1;
            let (list, len) = match b0 {
                0x00..=0x7f => {
                    self.i -= 1; // single byte is its own payload
                    return Ok((false, 1));
                }
                0x80..=0xb7 => (false, (b0 - 0x80) as usize),
                0xb8..=0xbf => (false, self.long_len((b0 - 0xb7) as usize)?),
                0xc0..=0xf7 => (true, (b0 - 0xc0) as usize),
                _ => (true, self.long_len((b0 - 0xf7) as usize)?),
            };
            if !list && len == 1 {
                let v = *self.b.get(self.i).ok_or("rlp eof")?;
                if v < 0x80 {
                    return Err("rlp non-canonical single byte");
                }
            }
            if self.i + len > self.b.len() {
                return Err("rlp overflow");
            }
            Ok((list, len))
        }
        fn long_len(&mut self, ll: usize) -> Result<usize, &'static str> {
            if ll > 4 || self.i + ll > self.b.len() {
                return Err("rlp bad length");
            }
            if self.b[self.i] == 0 {
                return Err("rlp non-canonical length");
            }
            let mut n = 0usize;
            for k in 0..ll {
                n = (n << 8) | self.b[self.i + k] as usize;
            }
            self.i += ll;
            if n < 56 {
                return Err("rlp non-canonical long form");
            }
            Ok(n)
        }
        pub fn string(&mut self) -> Result<&'a [u8], &'static str> {
            let (list, len) = self.header()?;
            if list {
                return Err("rlp expected string");
            }
            let s = &self.b[self.i..self.i + len];
            self.i += len;
            Ok(s)
        }
        pub fn uint(&mut self, max_bytes: usize) -> Result<u128, &'static str> {
            let s = self.string()?;
            if s.len() > max_bytes || s.len() > 16 {
                return Err("integer too wide");
            }
            if !s.is_empty() && s[0] == 0 {
                return Err("integer leading zero");
            }
            Ok(s.iter().fold(0u128, |a, &x| (a << 8) | x as u128))
        }
    }
}

#[cfg(not(feature = "alloy"))]
pub fn classify(p: &[u8], allowed_chain_ids: &[u64]) -> Result<EvmTx, &'static str> {
    if p.first() != Some(&0x02) {
        return Err("only EIP-1559 (type 2) preimages are signed");
    }
    let mut r = rlp::Rd { b: p, i: 1 };
    let (list, len) = r.header()?;
    if !list {
        return Err("expected list");
    }
    if r.i + len != p.len() {
        return Err("trailing bytes");
    }
    let chain_id = r.uint(8)? as u64;
    let nonce = r.uint(8)? as u64;
    let max_priority_fee = r.uint(16)?;
    let max_fee = r.uint(16)?;
    let gas = r.uint(8)? as u64;
    let to_s = r.string()?;
    let value = r.uint(16)?;
    let data = r.string()?;
    let (al_list, al_len) = r.header()?;
    if r.i + al_len != p.len() {
        return Err("expected exactly 9 fields");
    }
    finish(chain_id, nonce, max_priority_fee, max_fee, gas, to_s, value, data, al_list, al_len, allowed_chain_ids)
}

#[cfg(feature = "alloy")]
pub fn classify(p: &[u8], allowed_chain_ids: &[u64]) -> Result<EvmTx, &'static str> {
    use alloy_rlp::{Decodable, Header};
    if p.first() != Some(&0x02) {
        return Err("only EIP-1559 (type 2) preimages are signed");
    }
    let mut buf = &p[1..];
    let h = Header::decode(&mut buf).map_err(|_| "rlp")?;
    if !h.list || h.payload_length != buf.len() {
        return Err("expected list / trailing bytes");
    }
    let chain_id = u64::decode(&mut buf).map_err(|_| "chainId")?;
    let nonce = u64::decode(&mut buf).map_err(|_| "nonce")?;
    let max_priority_fee = u128::decode(&mut buf).map_err(|_| "tip")?;
    let max_fee = u128::decode(&mut buf).map_err(|_| "maxFee")?;
    let gas = u64::decode(&mut buf).map_err(|_| "gas")?;
    let to_h = Header::decode(&mut buf).map_err(|_| "to")?;
    if to_h.list {
        return Err("to");
    }
    let (to_s, rest) = buf.split_at(to_h.payload_length);
    buf = rest;
    let value = u128::decode(&mut buf).map_err(|_| "value")?;
    let d_h = Header::decode(&mut buf).map_err(|_| "data")?;
    if d_h.list {
        return Err("data");
    }
    let (data, rest) = buf.split_at(d_h.payload_length);
    buf = rest;
    let al = Header::decode(&mut buf).map_err(|_| "accessList")?;
    if al.payload_length != buf.len() {
        return Err("expected exactly 9 fields");
    }
    finish(chain_id, nonce, max_priority_fee, max_fee, gas, to_s, value, data, al.list, al.payload_length, allowed_chain_ids)
}

#[allow(clippy::too_many_arguments)]
fn finish(
    chain_id: u64, nonce: u64, max_priority_fee: u128, max_fee: u128, gas: u64, to_s: &[u8], value: u128,
    data: &[u8], al_list: bool, al_len: usize, allowed_chain_ids: &[u64],
) -> Result<EvmTx, &'static str> {
    if !allowed_chain_ids.contains(&chain_id) {
        return Err("chainId not allowlisted");
    }
    if nonce == u64::MAX {
        return Err("nonce >= 2^64-1 (EIP-2681)");
    }
    if to_s.len() != 20 {
        return Err("to must be 20 bytes (no contract creation)");
    }
    if !data.is_empty() {
        return Err("calldata refused (MVP: native transfers only)");
    }
    if !al_list || al_len != 0 {
        return Err("access list must be empty");
    }
    let mut to = [0u8; 20];
    to.copy_from_slice(to_s);
    let max_spend = (gas as u128).checked_mul(max_fee).and_then(|f| f.checked_add(value)).ok_or("overflow")?;
    Ok(EvmTx { chain_id, nonce, max_priority_fee, max_fee, gas, to, value, max_spend })
}
