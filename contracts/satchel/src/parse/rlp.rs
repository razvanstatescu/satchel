//! Minimal canonical RLP decoder (hand-rolled, no deps; kb/70 F9).
//! Canonical means: a single byte < 0x80 is never wrapped, long forms are used only for payloads > 55 bytes,
//! length-of-length has no leading zero, and every list payload is consumed exactly by its items.

#[derive(Debug, PartialEq, Eq)]
pub enum Item<'a> {
    Str(&'a [u8]),
    List(Vec<Item<'a>>),
}

/// The input is malformed or non-canonical.
#[derive(Debug, PartialEq, Eq)]
pub struct RlpError;

const MAX_DEPTH: u8 = 16;

/// Decode exactly one item that spans the whole buffer.
pub fn decode_exact(buf: &[u8]) -> Result<Item<'_>, RlpError> {
    let (item, next) = decode_at(buf, 0, 0)?;
    if next != buf.len() {
        return Err(RlpError);
    }
    Ok(item)
}

fn read_len(buf: &[u8], pos: usize, len_of_len: usize) -> Result<usize, RlpError> {
    if len_of_len == 0 || len_of_len > 4 {
        return Err(RlpError);
    }
    let end = pos.checked_add(len_of_len).ok_or(RlpError)?;
    let bytes = buf.get(pos..end).ok_or(RlpError)?;
    if bytes[0] == 0 {
        return Err(RlpError); // leading zero in the length
    }
    let mut n: usize = 0;
    for b in bytes {
        n = (n << 8) | (*b as usize);
    }
    if n <= 55 {
        return Err(RlpError); // long form for a short payload
    }
    Ok(n)
}

fn decode_at(buf: &[u8], pos: usize, depth: u8) -> Result<(Item<'_>, usize), RlpError> {
    if depth > MAX_DEPTH {
        return Err(RlpError);
    }
    let b = *buf.get(pos).ok_or(RlpError)?;
    match b {
        0x00..=0x7f => Ok((Item::Str(&buf[pos..pos + 1]), pos + 1)),
        0x80..=0xb7 => {
            let len = (b - 0x80) as usize;
            let start = pos + 1;
            let end = start.checked_add(len).ok_or(RlpError)?;
            let data = buf.get(start..end).ok_or(RlpError)?;
            if len == 1 && data[0] < 0x80 {
                return Err(RlpError); // single byte must not be wrapped
            }
            Ok((Item::Str(data), end))
        }
        0xb8..=0xbf => {
            let lol = (b - 0xb7) as usize;
            let len = read_len(buf, pos + 1, lol)?;
            let start = pos + 1 + lol;
            let end = start.checked_add(len).ok_or(RlpError)?;
            let data = buf.get(start..end).ok_or(RlpError)?;
            Ok((Item::Str(data), end))
        }
        0xc0..=0xf7 => {
            let len = (b - 0xc0) as usize;
            decode_list(buf, pos + 1, len, depth)
        }
        0xf8..=0xff => {
            let lol = (b - 0xf7) as usize;
            let len = read_len(buf, pos + 1, lol)?;
            decode_list(buf, pos + 1 + lol, len, depth)
        }
    }
}

fn decode_list(buf: &[u8], start: usize, len: usize, depth: u8) -> Result<(Item<'_>, usize), RlpError> {
    let end = start.checked_add(len).ok_or(RlpError)?;
    if end > buf.len() {
        return Err(RlpError);
    }
    let inner = &buf[..end];
    let mut items = Vec::new();
    let mut p = start;
    while p < end {
        let (it, next) = decode_at(inner, p, depth + 1)?;
        items.push(it);
        p = next;
    }
    if p != end {
        return Err(RlpError);
    }
    Ok((Item::List(items), end))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_basic_items() {
        assert_eq!(decode_exact(&[0x05]).unwrap(), Item::Str(&[0x05]));
        assert_eq!(decode_exact(&[0x80]).unwrap(), Item::Str(&[]));
        assert_eq!(decode_exact(&[0x81, 0x80]).unwrap(), Item::Str(&[0x80]));
        assert_eq!(decode_exact(&[0xc0]).unwrap(), Item::List(vec![]));
        assert_eq!(
            decode_exact(&[0xc2, 0x01, 0x80]).unwrap(),
            Item::List(vec![Item::Str(&[1]), Item::Str(&[])])
        );
        let mut long = vec![0xb8, 56];
        long.extend(std::iter::repeat_n(0xaa, 56));
        assert!(matches!(decode_exact(&long).unwrap(), Item::Str(s) if s.len() == 56));
    }

    #[test]
    fn rejects_non_canonical() {
        assert_eq!(decode_exact(&[0x81, 0x05]), Err(RlpError)); // wrapped single byte
        let mut long_short = vec![0xb8, 55];
        long_short.extend(std::iter::repeat_n(0xaa, 55));
        assert_eq!(decode_exact(&long_short), Err(RlpError)); // long form for 55 bytes
        let mut lead_zero = vec![0xb9, 0x00, 56];
        lead_zero.extend(std::iter::repeat_n(0xaa, 56));
        assert_eq!(decode_exact(&lead_zero), Err(RlpError));
        assert_eq!(decode_exact(&[0xc0, 0x00]), Err(RlpError)); // trailing byte
        assert_eq!(decode_exact(&[0xc2, 0x01]), Err(RlpError)); // truncated list
        assert_eq!(decode_exact(&[0x82, 0x01]), Err(RlpError)); // truncated string
        assert_eq!(decode_exact(&[0xc1, 0x82, 0x01, 0x02]), Err(RlpError)); // item overruns list
        assert_eq!(decode_exact(&[]), Err(RlpError));
    }
}
