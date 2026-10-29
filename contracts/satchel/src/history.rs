//! C1: `history_digest(token_id)` (docs/specs/C1-C2-C3-C7.md §5.1). A view: no state, nothing written.
//!
//! digest = SHA-256( H ‖ E(r_0) ‖ … ‖ E(r_{n−1}) ), every part borsh:
//!   H    = str("satchel.history.v1") ‖ str(contract) ‖ str(token_id) ‖ u64(n)
//!   E(r) = u64(seq) ‖ u64(request_id) ‖ u8(input_index) ‖ u64(height) ‖ u64(timestamp_ms) ‖ str(requester)
//!          ‖ payload[32] ‖ borsh(SigDetail)
//! Only immutable fields: `status` and `signature` change in `on_signed`, so they are left out.

use near_sdk::borsh::BorshSerialize;
use near_sdk::{env, near};

use crate::parse::hex;
use crate::types::*;
use crate::{Contract, ContractExt};

pub const HISTORY_DOMAIN: &str = "satchel.history.v1";

pub(crate) fn write_header(buf: &mut Vec<u8>, contract: &str, token_id: &str, n: u64) {
    (HISTORY_DOMAIN, contract, token_id, n).serialize(buf).unwrap_or_else(|_| env::abort());
}

pub(crate) fn write_entry(buf: &mut Vec<u8>, seq: u64, r: &SigRecord) {
    (seq, r.request_id, r.input_index, r.height, r.timestamp_ms, r.requester.as_str(), r.payload, &r.detail)
        .serialize(buf)
        .unwrap_or_else(|_| env::abort());
}

#[near]
impl Contract {
    /// C1: `{sig_count, digest_hex}` over the token's whole history, or null if the token doesn't exist. Equal digests
    /// mean equal histories, so a marketplace can bind an order to `(sig_count, digest)` without reading every record.
    /// Reads every record (≈ 0.1 Tgas each). Recompute off-chain with `historyDigest` in `@satchel/core/clean-history`.
    pub fn history_digest(&self, token_id: TokenId) -> Option<HistoryDigestView> {
        self.tokens.owner_by_id.get(&token_id)?;
        let n = self.token_state(&token_id).sig_count;
        let mut buf = Vec::new();
        write_header(&mut buf, env::current_account_id().as_str(), &token_id, n);
        for seq in 0..n {
            // records are append-only and never deleted; a gap would be a bug, so fail closed rather than skip it
            let r = self.sig_log.get(&(token_id.clone(), seq)).unwrap_or_else(|| env::abort());
            write_entry(&mut buf, seq, r);
        }
        Some(HistoryDigestView { sig_count: n, digest_hex: hex::encode(&env::sha256_array(&buf)) })
    }
}
