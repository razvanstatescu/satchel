//! C3: the EVM nonce-gap state per (token, chain_id) (docs/specs/C1-C2-C3-C7.md §3.2; spec §5.9, D-43).
//! Sepolia keeps `TokenState.max_evm_nonce` (layout unchanged). The other chains live in a map under
//! `StorageKey::EvmNonces`, opened on demand, so the root `Contract` layout is unchanged too.
//! The state belongs to the token: it survives transfers and sales, like the records.

use near_sdk::near;
use near_sdk::store::LookupMap;

use crate::errors::*;
use crate::parse::{evm, Classified};
use crate::types::*;
use crate::{Contract, ContractExt, StorageKey};

fn map() -> LookupMap<(TokenId, u64), u64> {
    LookupMap::new(StorageKey::EvmNonces)
}

/// A nonce maximum to write once the storage snapshot is taken (so the requester pays for a new entry).
pub(crate) struct NonceUpdate {
    chain_id: u64,
    max: u64,
}

/// Highest nonce this token signed on `chain_id` (any status), None if none.
pub(crate) fn max_signed(token_id: &TokenId, st: &TokenState, chain_id: u64) -> Option<u64> {
    if chain_id == evm::SEPOLIA { st.max_evm_nonce } else { map().get(&(token_id.clone(), chain_id)).copied() }
}

/// The nonce-gap rule for a classified request, per chain. Panics `ERR_EVM_NONCE_GAP` before any write (INV-09,
/// INV-10). Returns the update to `commit`, or None when nothing changes (not an EVM tx, or a nonce ≤ the maximum).
pub(crate) fn gate(token_id: &TokenId, st: &TokenState, c: &Classified) -> Option<NonceUpdate> {
    let Some(SigDetail::Evm { chain_id, nonce, .. }) = c.items.first().map(|i| &i.detail) else { return None };
    let m = max_signed(token_id, st, *chain_id);
    if evm::check_nonce(*nonce, m).is_err() {
        let allowed = evm::max_allowed_nonce(m).to_string();
        fail_with(ERR_EVM_NONCE_GAP, &["nonce must be ≤ ", &allowed, " on chain ", &chain_id.to_string(), " (highest signed nonce + 1)"].concat());
    }
    let max = m.map_or(*nonce, |m| m.max(*nonce));
    (m != Some(max)).then_some(NonceUpdate { chain_id: *chain_id, max })
}

/// Apply a `gate` result. Sepolia updates `st` (the caller writes it); other chains write and flush the map now.
pub(crate) fn commit(token_id: &TokenId, st: &mut TokenState, u: Option<NonceUpdate>) {
    let Some(u) = u else { return };
    if u.chain_id == evm::SEPOLIA {
        st.max_evm_nonce = Some(u.max);
    } else {
        let mut m = map();
        m.insert((token_id.clone(), u.chain_id), u.max);
        m.flush();
    }
}

#[near]
impl Contract {
    /// C3: the highest nonce `token_id` ever signed on `chain_id` (any status), or null if none or if the chain isn't
    /// supported. The next request on that chain may use at most `max + 1`, or 1 when null.
    pub fn max_evm_nonce(&self, token_id: TokenId, chain_id: u64) -> Option<u64> {
        if !evm::EVM_CHAIN_IDS.contains(&chain_id) {
            return None;
        }
        max_signed(&token_id, &self.token_state(&token_id), chain_id)
    }
}
