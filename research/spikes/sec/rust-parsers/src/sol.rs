//! Solana message classifier (legacy + v0). MVP allowlist: System Transfer + ComputeBudget
//! SetComputeUnitLimit/Price; one signer; no address lookup tables; durable nonce refused.

const SYSTEM: [u8; 32] = [0u8; 32]; // 11111111111111111111111111111111
// ComputeBudget111111111111111111111111111111
const COMPUTE_BUDGET: [u8; 32] = [
    3, 6, 70, 111, 229, 33, 23, 50, 255, 236, 173, 186, 114, 195, 155, 231, 188, 140, 229, 187, 197, 247, 18, 107, 44,
    67, 155, 58, 64, 0, 0, 0,
];
pub const MAX_TRANSFERS: usize = 4;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SolTx {
    pub version: Option<u8>,
    pub signer: [u8; 32],
    pub recent_blockhash: [u8; 32],
    pub transfers: [([u8; 32], u64); MAX_TRANSFERS],
    pub n_transfers: usize,
    pub total_lamports: u64,
}

struct Rd<'a> { b: &'a [u8], i: usize }
impl<'a> Rd<'a> {
    fn u8(&mut self) -> Result<u8, &'static str> { let v = *self.b.get(self.i).ok_or("eof")?; self.i += 1; Ok(v) }
    fn take(&mut self, n: usize) -> Result<&'a [u8], &'static str> {
        if self.i + n > self.b.len() { return Err("eof"); }
        let s = &self.b[self.i..self.i + n]; self.i += n; Ok(s)
    }
    /// compact-u16 ("shortvec"), canonical only
    fn shortvec(&mut self) -> Result<usize, &'static str> {
        let mut v: u32 = 0;
        for k in 0..3 {
            let b = self.u8()?;
            v |= ((b & 0x7f) as u32) << (7 * k);
            if b & 0x80 == 0 {
                if k > 0 && b == 0 { return Err("non-canonical shortvec"); }
                if v > 0xffff { return Err("shortvec overflow"); }
                return Ok(v as usize);
            }
        }
        Err("shortvec too long")
    }
}

pub fn classify(m: &[u8]) -> Result<SolTx, &'static str> {
    let mut r = Rd { b: m, i: 0 };
    let mut version = None;
    if m.first().ok_or("empty")? & 0x80 != 0 {
        let v = r.u8()? & 0x7f;
        if v != 0 { return Err("unsupported message version"); }
        version = Some(0);
    }
    let (nsig, _ro_signed, _ro_unsigned) = (r.u8()?, r.u8()?, r.u8()?);
    if nsig != 1 { return Err("exactly one signer required"); }
    let nkeys = r.shortvec()?;
    if nkeys == 0 { return Err("no keys"); }
    let keys = r.take(nkeys.checked_mul(32).ok_or("overflow")?)?;
    let key = |idx: usize| -> Result<&[u8], &'static str> { keys.get(idx * 32..idx * 32 + 32).ok_or("account index") };
    let mut recent_blockhash = [0u8; 32];
    recent_blockhash.copy_from_slice(r.take(32)?);
    let nix = r.shortvec()?;
    let mut out = SolTx { version, signer: [0; 32], recent_blockhash, transfers: [([0; 32], 0); MAX_TRANSFERS], n_transfers: 0, total_lamports: 0 };
    out.signer.copy_from_slice(key(0)?);
    for ix_i in 0..nix {
        let prog_idx = r.u8()? as usize;
        let na = r.shortvec()?;
        let accts = r.take(na)?;
        let nd = r.shortvec()?;
        let data = r.take(nd)?;
        let prog = key(prog_idx)?; // program ids must be static keys (v0 sanitize rule)
        if prog == SYSTEM && data.len() >= 4 && data[..4] == [4, 0, 0, 0] && ix_i == 0 {
            return Err("durable nonce refused");
        }
        if prog == COMPUTE_BUDGET && matches!(data.first(), Some(2) | Some(3)) {
            continue;
        }
        if prog == SYSTEM && data.len() == 12 && data[..4] == [2, 0, 0, 0] {
            if na != 2 || accts[0] != 0 { return Err("transfer must be from the signer"); }
            if out.n_transfers == MAX_TRANSFERS { return Err("too many transfers"); }
            let mut l = [0u8; 8];
            l.copy_from_slice(&data[4..12]);
            let lamports = u64::from_le_bytes(l);
            let mut to = [0u8; 32];
            to.copy_from_slice(key(accts[1] as usize)?);
            out.transfers[out.n_transfers] = (to, lamports);
            out.n_transfers += 1;
            out.total_lamports = out.total_lamports.checked_add(lamports).ok_or("overflow")?;
            continue;
        }
        return Err("instruction not allowlisted");
    }
    if version.is_some() {
        let nlookups = r.shortvec()?;
        if nlookups != 0 { return Err("address lookup tables refused"); }
    }
    if r.i != m.len() { return Err("trailing bytes"); }
    Ok(out)
}
