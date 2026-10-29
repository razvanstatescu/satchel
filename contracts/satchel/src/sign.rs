//! `sign_for` (spec §5.8): classify → write records + charge storage → event → MPC fan-out → panic-free `on_signed`.

use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, near, Gas, PromiseError, PromiseIndex};

use crate::errors::*;
use crate::events::SatchelEvent;
use crate::mpc::{derivation_path, extract_signature_65, MpcSignArgs, MpcSignRequest};
use crate::parse::{self, hex};
use crate::types::*;
use crate::{charge_storage, min_sign_prepaid, on_signed_gas, promise, Contract, ContractExt, MAX_MPC_DEPOSIT, MPC_DEPOSIT_DEFAULT, MPC_SIGN_GAS_TGAS};

/// Upper bound on one MPC response we read (a secp256k1 reply is ≈ 200 B; ed25519 ≈ 300 B).
const MAX_MPC_RESPONSE: usize = 1024;

fn detail_json(seq: u64, d: &SigDetail) -> Value {
    match d {
        SigDetail::Evm { chain_id, nonce, .. } => json!({ "seq": seq, "chain_id": chain_id, "nonce": nonce }),
        SigDetail::Btc { txid, vout, amount_sats } => {
            json!({ "seq": seq, "txid": hex::encode(txid), "vout": vout, "amount_sats": U64(*amount_sats) })
        }
        SigDetail::Sol { recent_blockhash, lamports } => {
            json!({ "seq": seq, "recent_blockhash": hex::encode(recent_blockhash), "lamports": U64(*lamports) })
        }
    }
}

#[near]
impl Contract {
    /// Owner only. Classifies `request`, writes one SigRecord per MPC request, emits `sign_requested`, and returns
    /// `sign × n` (separate single-action receipts joined with `.and()`) `.then(on_signed)`.
    /// Attach `min(300, 60 + 20·n)` Tgas (floor `30 + 18·n`) and `0.005 NEAR × n` (excess refunded).
    /// The tx result is `on_signed`'s return value (set with `promise_return`).
    #[payable]
    pub fn sign_for(&mut self, token_id: TokenId, request: SignRequest, mpc_deposit: Option<U128>) {
        // 1. ownership (INV-01)
        let owner = self.owner_of(&token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        // 2. frozen while listed (INV-13)
        let mut st = self.token_state(&token_id);
        ensure(st.listing.is_none(), ERR_FROZEN);
        // 3. count, gas floor (INV-19), mpc deposit bounds (INV-26)
        let n = parse::request_count(&request);
        ensure((1..=crate::MAX_BTC_INPUTS as usize).contains(&n), ERR_BTC_INPUT_COUNT);
        let n64 = n as u64;
        let floor = min_sign_prepaid(n64);
        if env::prepaid_gas() < floor {
            fail_with(ERR_GAS, &["attach ≥ ", &floor.as_tgas().to_string(), " Tgas"].concat());
        }
        let d = mpc_deposit.map(|d| d.0).unwrap_or(MPC_DEPOSIT_DEFAULT);
        ensure((1..=MAX_MPC_DEPOSIT).contains(&d), ERR_MPC_DEPOSIT);
        // 4. classify + hash on-chain (INV-09: a refusal panics before any state change)
        let c = parse::classify(&request).unwrap_or_else(|code| fail(code));
        // 4b. EVM nonce-gap rule (spec §5.9, D-43): after every stateless check, before any state change
        if let Some(SigDetail::Evm { nonce, .. }) = c.items.first().map(|i| &i.detail) {
            if parse::evm::check_nonce(*nonce, st.max_evm_nonce).is_err() {
                let allowed = parse::evm::max_allowed_nonce(st.max_evm_nonce).to_string();
                fail_with(ERR_EVM_NONCE_GAP, &["nonce must be ≤ ", &allowed, " (highest signed nonce + 1)"].concat());
            }
            st.max_evm_nonce = Some(st.max_evm_nonce.map_or(*nonce, |m| m.max(*nonce)));
        }
        // 5. records before the MPC call
        let s0 = env::storage_usage();
        let first_seq = st.sig_count;
        let height = env::block_height();
        let ts = env::block_timestamp_ms();
        for (i, it) in c.items.iter().enumerate() {
            self.sig_log.insert(
                (token_id.clone(), first_seq + i as u64),
                SigRecord {
                    request_id: first_seq,
                    input_index: i as u8,
                    height,
                    timestamp_ms: ts,
                    requester: owner.clone(),
                    payload: it.record_payload,
                    detail: it.detail.clone(),
                    status: SigStatus::Pending,
                    signature: [0u8; 65],
                },
            );
        }
        st.sig_count += n64;
        st.last_sign_height = height;
        self.state.insert(token_id.clone(), st);
        self.state.flush();
        self.sig_log.flush();
        // 6. charge storage + n × d exactly (INV-17, INV-18); refund the excess
        charge_storage(s0, n as u128 * d, 0);
        // 7. event
        let path = derivation_path(&token_id, c.chain);
        SatchelEvent::SignRequested {
            token_id: token_id.clone(),
            owner_id: owner,
            request_id: first_seq,
            first_seq,
            count: n64,
            chain: c.chain,
            path: path.clone(),
            domain_id: c.chain.domain_id(),
            height,
            payloads: c.items.iter().map(|i| hex::encode(&i.record_payload)).collect(),
            preimages: c.preimages.iter().map(|p| hex::encode(p)).collect(),
            btc_outputs: c.btc_outputs.as_ref().map(|o| hex::encode(o)),
            details: c.items.iter().enumerate().map(|(i, it)| detail_json(first_seq + i as u64, &it.detail)).collect(),
        }
        .emit();
        // 8. MPC fan-out: one single-action `sign` receipt per payload, joined with .and()
        let domain_id = c.chain.domain_id();
        let calls: Vec<PromiseIndex> = c
            .items
            .into_iter()
            .map(|it| {
                let args = serde_json::to_vec(&MpcSignArgs {
                    request: MpcSignRequest { path: path.clone(), payload_v2: it.mpc_payload, domain_id },
                })
                .unwrap_or_else(|_| env::abort());
                promise::call(&self.mpc, "sign", &args, d, Gas::from_tgas(MPC_SIGN_GAS_TGAS), 1)
            })
            .collect();
        let joint = if calls.len() == 1 { calls[0] } else { env::promise_and(&calls) };
        let cb_args = json!({ "token_id": token_id, "first_seq": first_seq, "n": n as u32 }).to_string();
        let cb = promise::then_call(joint, &env::current_account_id(), "on_signed", cb_args.as_bytes(), on_signed_gas(n64));
        env::promise_return(cb);
    }

    /// Self only. UX only and MUST NOT panic: reads raw promise bytes, fills the pre-paid status/signature slot of each
    /// still-Pending record, emits `sign_resolved` and returns the raw MPC JSON per request (null on failure).
    #[private]
    pub fn on_signed(&mut self, token_id: TokenId, first_seq: u64, n: u32) -> Vec<Option<Value>> {
        let count = (n as u64).min(env::promise_results_count());
        let mut out = Vec::with_capacity(count as usize);
        let mut statuses = Vec::with_capacity(count as usize);
        for i in 0..count {
            let key = (token_id.clone(), first_seq.saturating_add(i));
            let chain = self.sig_log.get(&key).map(|r| r.detail.chain());
            let (v, status, sig) = match env::promise_result_checked(i, MAX_MPC_RESPONSE) {
                Ok(bytes) => {
                    let v = serde_json::from_slice::<Value>(&bytes).ok();
                    let sig = match (&v, chain) {
                        (Some(v), Some(chain)) => extract_signature_65(v, chain),
                        _ => None,
                    };
                    let status = if sig.is_some() { SigStatus::Signed } else { SigStatus::Unparsed };
                    (v, status, sig)
                }
                // succeeded, but larger than any real signature: keep it out of state
                Err(PromiseError::TooLong(_)) => (None, SigStatus::Unparsed, None),
                // MPC rejected or timed out; a signature may still exist (F16), the record stays "issued"
                Err(_) => (None, SigStatus::Failed, None),
            };
            if let Some(rec) = self.sig_log.get_mut(&key)
                && rec.status == SigStatus::Pending {
                    rec.status = status;
                    rec.signature = sig.unwrap_or([0u8; 65]);
                }
            out.push(v);
            statuses.push(status);
        }
        SatchelEvent::SignResolved { token_id, first_seq, count, statuses }.emit();
        out
    }
}
