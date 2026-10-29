//! Views (spec §5.14). Shapes are consumed verbatim by the UI, the SSR pages and the README.

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, AccountId};

use crate::mpc::derivation_path;
use crate::parse::{evm::EVM_CHAIN_IDS, hex};
use crate::types::*;
use crate::*;

fn record_view(seq: u64, r: &SigRecord) -> SigRecordView {
    let chain = r.detail.chain();
    let signature = (r.status == SigStatus::Signed).then(|| match chain {
        Chain::Sol => SignatureView::Ed25519 { signature: hex::encode(&r.signature[..64]) },
        Chain::Btc | Chain::Evm => SignatureView::Secp256k1 {
            r: hex::encode(&r.signature[..32]),
            s: hex::encode(&r.signature[32..64]),
            recovery_id: r.signature[64],
        },
    });
    let detail = match &r.detail {
        SigDetail::Evm { chain_id, nonce, unsigned_tx } => {
            SigDetailView::Evm { chain_id: *chain_id, nonce: *nonce, unsigned_tx: hex::encode(unsigned_tx) }
        }
        SigDetail::Btc { txid, vout, amount_sats } => {
            SigDetailView::Btc { txid: hex::encode(txid), vout: *vout, amount_sats: U64(*amount_sats) }
        }
        SigDetail::Sol { recent_blockhash, lamports } => {
            SigDetailView::Sol { recent_blockhash: hex::encode(recent_blockhash), lamports: U64(*lamports) }
        }
    };
    SigRecordView {
        seq,
        request_id: r.request_id,
        input_index: r.input_index,
        chain,
        height: r.height,
        timestamp_ms: r.timestamp_ms,
        requester: r.requester.clone(),
        payload: hex::encode(&r.payload),
        status: r.status,
        signature,
        detail,
    }
}

#[near]
impl Contract {
    /// Mirrors the compiled constants (INV-27).
    pub fn config(&self) -> ConfigView {
        ConfigView {
            version: VERSION.to_string(),
            mpc_contract_id: self.mpc.clone(),
            usdc_contract_id: self.usdc.clone(),
            cooldown_blocks: COOLDOWN_BLOCKS,
            evm_chain_ids: EVM_CHAIN_IDS.to_vec(),
            max_btc_inputs: MAX_BTC_INPUTS,
            mpc_sign_gas_tgas: MPC_SIGN_GAS_TGAS,
            on_signed_gas_tgas: GasFormula { base: ON_SIGNED_GAS_BASE_TGAS, per_request: ON_SIGNED_GAS_PER_REQUEST_TGAS },
            min_sign_prepaid_tgas: GasFormula {
                base: MIN_SIGN_PREPAID_BASE_TGAS,
                per_request: MIN_SIGN_PREPAID_PER_REQUEST_TGAS,
            },
            max_mpc_deposit: U128(MAX_MPC_DEPOSIT),
            storage_byte_cost: U128(env::storage_byte_cost().as_yoctonear()),
            base_uri: self.metadata.get().as_ref().and_then(|m| m.base_uri.clone()).unwrap_or_default(),
            next_token_id: self.next_token_id,
            next_listing_id: self.next_listing_id,
        }
    }

    pub fn satchel(&self, token_id: TokenId) -> Option<SatchelView> {
        let owner_id = self.tokens.owner_by_id.get(&token_id)?;
        let st = self.token_state(&token_id);
        Some(SatchelView {
            listable_at: Contract::listable_at(&st),
            paths: PathsView {
                btc: derivation_path(&token_id, Chain::Btc),
                evm: derivation_path(&token_id, Chain::Evm),
                sol: derivation_path(&token_id, Chain::Sol),
            },
            token_id,
            owner_id,
            sig_count: st.sig_count,
            last_sign_height: st.last_sign_height,
            listing: st.listing,
        })
    }

    /// Records `from_seq ..` (at most `limit`, capped at 50) of one token. Read `0..sig_count` for completeness.
    pub fn sig_records(&self, token_id: TokenId, from_seq: u64, limit: u32) -> Vec<SigRecordView> {
        let end = self.token_state(&token_id).sig_count;
        let limit = limit.min(MAX_PAGE) as u64;
        let mut out = Vec::new();
        let mut seq = from_seq;
        while seq < end && (out.len() as u64) < limit {
            if let Some(r) = self.sig_log.get(&(token_id.clone(), seq)) {
                out.push(record_view(seq, r));
            }
            seq += 1;
        }
        out
    }

    /// Active listings (at most `limit`, capped at 50), in index order.
    pub fn listings(&self, from_index: u64, limit: u32) -> Vec<ListingView> {
        self.listings
            .iter()
            .skip(from_index as usize)
            .take(limit.min(MAX_PAGE) as usize)
            .filter_map(|id| {
                self.state.get(id).and_then(|s| s.listing.clone()).map(|listing| ListingView { token_id: id.clone(), listing })
            })
            .collect()
    }

    pub fn proceeds_of(&self, account_id: AccountId) -> Vec<ProceedsView> {
        [Currency::Near, Currency::Usdc]
            .into_iter()
            .filter_map(|c| {
                let a = self.proceeds.get(&(account_id.clone(), c)).copied().unwrap_or(0);
                (a > 0).then_some(ProceedsView { currency: c, amount: U128(a) })
            })
            .collect()
    }

    /// `satchel/{token_id}/{btc|evm|sol}`: the MPC derivation path (predecessor = this contract).
    pub fn derived_path(&self, token_id: TokenId, chain: Chain) -> String {
        derivation_path(&token_id, chain)
    }
}
