//! Payload classifiers (spec §5.9). Pure functions: a refusal returns the stable error code and changes nothing.

pub mod btc;
pub mod evm;
pub mod hex;
pub mod rlp;
pub mod sol;

use crate::errors::ERR_BTC_INPUT_COUNT;
use crate::mpc::MpcPayload;
use crate::types::{Chain, SigDetail, SignRequest};

/// One MPC request and the record it produces.
#[derive(Debug, Clone, PartialEq)]
pub struct Item {
    pub mpc_payload: MpcPayload,
    pub record_payload: [u8; 32],
    pub detail: SigDetail,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Classified {
    pub chain: Chain,
    pub items: Vec<Item>,
    /// The exact bytes that were classified, for the `sign_requested` event (EVM tx · BTC preimages · SOL message).
    pub preimages: Vec<Vec<u8>>,
    pub btc_outputs: Option<Vec<u8>>,
}

/// Number of MPC requests a SignRequest produces (1, or the number of BTC preimages).
pub fn request_count(req: &SignRequest) -> usize {
    match req {
        SignRequest::Btc { preimages, .. } => preimages.len(),
        _ => 1,
    }
}

pub fn classify(req: &SignRequest) -> Result<Classified, &'static str> {
    let keccak = near_sdk::env::keccak256_array;
    let sha256 = near_sdk::env::sha256_array;
    match req {
        SignRequest::Evm { unsigned_tx } => {
            let tx = hex::decode(unsigned_tx)?;
            let parsed = evm::classify(&tx)?;
            let h = keccak(&tx);
            Ok(Classified {
                chain: Chain::Evm,
                items: vec![Item {
                    mpc_payload: MpcPayload::Ecdsa(hex::encode(&h)),
                    record_payload: h,
                    detail: SigDetail::Evm { chain_id: parsed.chain_id, nonce: parsed.nonce, unsigned_tx: tx.clone() },
                }],
                preimages: vec![tx],
                btc_outputs: None,
            })
        }
        SignRequest::Btc { preimages, outputs } => {
            if preimages.is_empty() || preimages.len() > btc::MAX_BTC_INPUTS {
                return Err(ERR_BTC_INPUT_COUNT);
            }
            let pre = preimages.iter().map(|p| hex::decode(p)).collect::<Result<Vec<_>, _>>()?;
            let outs = hex::decode(outputs)?;
            let inputs = btc::classify(&pre, &outs)?;
            Ok(Classified {
                chain: Chain::Btc,
                items: inputs
                    .into_iter()
                    .map(|i| Item {
                        mpc_payload: MpcPayload::Ecdsa(hex::encode(&i.sighash)),
                        record_payload: i.sighash,
                        detail: SigDetail::Btc { txid: i.txid, vout: i.vout, amount_sats: i.amount_sats },
                    })
                    .collect(),
                preimages: pre,
                btc_outputs: Some(outs),
            })
        }
        SignRequest::Sol { message } => {
            let m = hex::decode(message)?;
            let parsed = sol::classify(&m)?;
            Ok(Classified {
                chain: Chain::Sol,
                items: vec![Item {
                    mpc_payload: MpcPayload::Eddsa(hex::encode(&m)),
                    record_payload: sha256(&m),
                    detail: SigDetail::Sol { recent_blockhash: parsed.recent_blockhash, lamports: parsed.lamports },
                }],
                preimages: vec![m],
                btc_outputs: None,
            })
        }
    }
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod fuzz_tests;
