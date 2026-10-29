//! THROWAWAY spike (2026-10-21). Not product code.
//! Question 1: can one contract call fan out N MPC `sign` promises joined with `.and()` (each its own
//!             single-action receipt) and collect all N signatures in one callback? Gas/latency?
//! Question 2: if the caller sends BIP143 preimages (182 bytes, P2WPKH, SIGHASH_ALL) instead of raw
//!             hashes, does on-chain sha256(sha256(preimage)) give exactly the sighash bitcoinjs computes
//!             (i.e. the MPC signature verifies against bitcoinjs' hashForWitnessV0)?
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::{self, json};
use near_sdk::{env, ext_contract, log, near, require, AccountId, Gas, NearToken, Promise, PromiseResult};

#[derive(Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum PayloadV2 {
    Ecdsa(String),
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SignRequest {
    pub payload_v2: PayloadV2,
    pub path: String,
    pub domain_id: u32,
}

#[ext_contract(ext_mpc)]
#[allow(dead_code)]
trait Mpc {
    fn sign(&mut self, request: SignRequest);
}

#[near(contract_state)]
pub struct Contract {
    mpc: AccountId,
}

impl Default for Contract {
    fn default() -> Self {
        Self { mpc: "v1.signer-prod.testnet".parse().unwrap() }
    }
}

const PREIMAGE_LEN: usize = 182;

fn sha256d(b: &[u8]) -> Vec<u8> {
    env::sha256(&env::sha256(b))
}

#[near]
impl Contract {
    /// `preimages_hex`: one BIP143 preimage per input, in input order, covering ALL inputs of the tx.
    /// `sign_gas_tgas`: static gas per MPC sign promise (MPC requires >= 15 Tgas prepaid).
    /// `raw_hashes_hex`: if non-empty, skip preimage logic and sign these 32-byte hashes (control experiment).
    #[payable]
    pub fn sign_btc(
        &mut self,
        token_id: String,
        preimages_hex: Vec<String>,
        sign_gas_tgas: Option<u64>,
        cb_gas_tgas: Option<u64>,
    ) -> Promise {
        let n = preimages_hex.len();
        require!(n >= 1 && n <= 16, "1..=16 inputs");
        require!(env::attached_deposit() >= NearToken::from_yoctonear(n as u128), "attach >= 1 yocto per input");
        let pre: Vec<Vec<u8>> = preimages_hex
            .iter()
            .map(|h| hex::decode(h).unwrap_or_else(|_| env::panic_str("bad hex")))
            .collect();
        for p in &pre {
            require!(p.len() == PREIMAGE_LEN, "ERR_PREIMAGE_LEN (P2WPKH BIP143 preimage is 182 bytes)");
            // sighash type (last 4 bytes, LE) must be SIGHASH_ALL = 1
            require!(p[178..182] == [1, 0, 0, 0], "ERR_SIGHASH_NOT_ALL");
            // scriptCode must be P2WPKH-style: 0x19 76 a9 14 <20> 88 ac
            require!(p[104..108] == [0x19, 0x76, 0xa9, 0x14] && p[128..130] == [0x88, 0xac], "ERR_SCRIPTCODE");
        }
        // all inputs must come from one tx: same version, hashPrevouts, hashSequence, scriptCode, hashOutputs, locktime
        let first = &pre[0];
        for p in &pre[1..] {
            require!(p[0..68] == first[0..68], "ERR_MIXED_TX (version/hashPrevouts/hashSequence)");
            require!(p[104..130] == first[104..130], "ERR_MIXED_KEY (scriptCode)");
            require!(p[142..182] == first[142..182], "ERR_MIXED_TX (hashOutputs/locktime/sighash)");
        }
        // the preimages cover ALL inputs in order: sha256d(concat(outpoints)) must equal hashPrevouts
        let outpoints: Vec<u8> = pre.iter().flat_map(|p| p[68..104].to_vec()).collect();
        require!(sha256d(&outpoints) == first[4..36].to_vec(), "ERR_PREVOUTS_INCOMPLETE");

        let path = format!("satchel/{}/btc", token_id);
        let sign_gas = Gas::from_tgas(sign_gas_tgas.unwrap_or(15));
        let mut fan: Option<Promise> = None;
        let mut events = Vec::with_capacity(n);
        for p in &pre {
            let payload = sha256d(p);
            let mut txid = p[68..100].to_vec();
            txid.reverse();
            let vout = u32::from_le_bytes(p[100..104].try_into().unwrap());
            let amount = u64::from_le_bytes(p[130..138].try_into().unwrap());
            events.push(json!({
                "payload": hex::encode(&payload), "txid": hex::encode(&txid), "vout": vout,
                "amount": amount.to_string(), "hash_outputs": hex::encode(&p[142..174]),
            }));
            let call = ext_mpc::ext(self.mpc.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(sign_gas)
                .sign(SignRequest { payload_v2: PayloadV2::Ecdsa(hex::encode(&payload)), path: path.clone(), domain_id: 0 });
            fan = Some(match fan {
                None => call,
                Some(acc) => acc.and(call),
            });
        }
        log!(
            "EVENT_JSON:{}",
            json!({"standard":"satchel_spike","version":"0.0.1","event":"btc_sign_requested",
                   "data":[{"token_id": token_id, "path": path, "inputs": events}]})
        );
        fan.unwrap().then(
            Self::ext(env::current_account_id())
                .with_static_gas(Gas::from_tgas(cb_gas_tgas.unwrap_or(10)))
                .on_signed_batch(n as u64),
        )
    }

    /// Control experiment: fan out raw 32-byte hashes (no preimage checks).
    #[payable]
    pub fn sign_raw_fanout(&mut self, path: String, hashes_hex: Vec<String>, sign_gas_tgas: Option<u64>) -> Promise {
        let n = hashes_hex.len();
        require!(n >= 1 && n <= 16);
        let mut fan: Option<Promise> = None;
        for h in &hashes_hex {
            let call = ext_mpc::ext(self.mpc.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(Gas::from_tgas(sign_gas_tgas.unwrap_or(15)))
                .sign(SignRequest { payload_v2: PayloadV2::Ecdsa(h.clone()), path: path.clone(), domain_id: 0 });
            fan = Some(match fan {
                None => call,
                Some(acc) => acc.and(call),
            });
        }
        fan.unwrap().then(Self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(10)).on_signed_batch(n as u64))
    }

    #[private]
    pub fn on_signed_batch(&mut self, n: u64) -> Vec<Option<serde_json::Value>> {
        require!(env::promise_results_count() == n, "results count mismatch");
        let out: Vec<Option<serde_json::Value>> = (0..n)
            .map(|i| match env::promise_result(i) {
                PromiseResult::Successful(v) => serde_json::from_slice(&v).ok(),
                _ => None,
            })
            .collect();
        let ok = out.iter().filter(|x| x.is_some()).count();
        log!("EVENT_JSON:{}", json!({"standard":"satchel_spike","version":"0.0.1","event":"btc_sign_completed","data":[{"ok": ok, "failed": (n as usize) - ok}]}));
        out
    }

    /// Pure view: what payload would the contract sign for this preimage? (lets the frontend pre-check)
    pub fn payload_for(&self, preimage_hex: String) -> String {
        hex::encode(sha256d(&hex::decode(preimage_hex).unwrap()))
    }
}
