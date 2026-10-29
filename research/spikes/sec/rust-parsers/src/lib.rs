//! THROWAWAY spike (sec, Phase 0): strict classifiers for sign_for payload *preimages*.
//! Purpose: prove that hand-rolled parsers are small and agree with viem / bitcoinjs / web3.js.
//! Hashing is NOT done here: on NEAR use the host functions env::keccak256 / env::sha256.
pub mod btc;
pub mod evm;
pub mod sol;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod vectors;

#[cfg(feature = "baseline")]
#[no_mangle]
pub extern "C" fn baseline(ptr: *const u8, len: usize) -> u64 { let b = unsafe { core::slice::from_raw_parts(ptr, len) }; b.iter().map(|&x| x as u64).sum() }

#[cfg(feature = "baseline-panic")]
#[no_mangle]
pub extern "C" fn baseline_panic(ptr: *const u8, len: usize) -> u64 { let b = unsafe { core::slice::from_raw_parts(ptr, len) }; (b[3] as u64) + (b[len / 2] as u64) + u64::from_le_bytes(b[8..16].try_into().unwrap()) }

#[cfg(any(feature = "export-evm", feature = "export-btc", feature = "export-sol"))]
mod exports {
    use core::slice;
    #[cfg(feature = "export-evm")]
    #[no_mangle]
    pub extern "C" fn classify_evm(ptr: *const u8, len: usize) -> u64 {
        let b = unsafe { slice::from_raw_parts(ptr, len) };
        match crate::evm::classify(b, &[11_155_111]) { Ok(t) => t.nonce, Err(_) => u64::MAX }
    }
    #[cfg(feature = "export-btc")]
    #[no_mangle]
    pub extern "C" fn classify_btc(ptr: *const u8, len: usize) -> u64 {
        let b = unsafe { slice::from_raw_parts(ptr, len) };
        match crate::btc::classify(b) { Ok(t) => t.vout as u64, Err(_) => u64::MAX }
    }
    #[cfg(feature = "export-sol")]
    #[no_mangle]
    pub extern "C" fn classify_sol(ptr: *const u8, len: usize) -> u64 {
        let b = unsafe { slice::from_raw_parts(ptr, len) };
        match crate::sol::classify(b) { Ok(t) => t.total_lamports, Err(_) => u64::MAX }
    }
}
