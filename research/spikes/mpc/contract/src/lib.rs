//! THROWAWAY Phase 0 spike B (mpc agent): contract-initiated MPC `sign`.
//! Not product code. No NFT logic. Never import into the product repo.
use near_sdk::json_types::{U128, U64};
use near_sdk::{
    env, ext_contract, log, near, require, AccountId, Gas, GasWeight, NearToken, PanicOnDefault,
    Promise, PromiseError,
};

// ---------- MPC wire types (own minimal definitions, see kb/10-mpc-signer.md) ----------

/// `payload_v2` of the MPC `sign` request: hex string, no 0x prefix.
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub enum Payload {
    /// exactly 32 bytes (64 hex chars), must be < secp256k1 group order n
    Ecdsa(String),
    /// raw message bytes, 0..=1232 bytes
    Eddsa(String),
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct SignRequest {
    pub path: String,
    pub payload_v2: Payload,
    pub domain_id: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct K256AffinePoint {
    /// 33-byte compressed point, hex
    pub affine_point: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct K256Scalar {
    /// 32-byte scalar, hex
    pub scalar: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
#[serde(tag = "scheme")]
pub enum SignatureResponse {
    Secp256k1 {
        big_r: K256AffinePoint,
        s: K256Scalar,
        recovery_id: u8,
    },
    Ed25519 {
        /// 64 bytes, serialized by the MPC contract as a JSON array of numbers
        signature: Vec<u8>,
    },
}

#[allow(dead_code)]
#[ext_contract(ext_mpc)]
trait MpcSigner {
    fn sign(&mut self, request: SignRequest);
}

// ---------- spike contract ----------

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    mpc: AccountId,
    pending: u32,
    ok: u32,
    err: u32,
    mpc_gas_tgas: u64,
    cb_gas_tgas: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new(mpc: AccountId, mpc_gas_tgas: u64, cb_gas_tgas: u64) -> Self {
        Self { mpc, pending: 0, ok: 0, err: 0, mpc_gas_tgas, cb_gas_tgas }
    }

    /// Start a contract-initiated MPC signature. Optional overrides exist only for gas/failure experiments.
    /// `raw_cb = true` uses the raw-bytes callback (`on_signed_raw`) instead of `#[callback_result]`.
    #[payable]
    #[allow(clippy::too_many_arguments)]
    pub fn sign_for(
        &mut self,
        path: String,
        payload_hex: String,
        domain_id: u64,
        mpc_deposit_yocto: Option<U128>,
        mpc_gas_tgas: Option<u64>,
        cb_gas_tgas: Option<u64>,
        cb_weight: Option<u64>,
        raw_cb: Option<bool>,
        cb_gas_raw: Option<U64>,
        mpc_weight: Option<u64>,
    ) -> Promise {
        // Satchel must enforce the "full-access key" property itself: MPC only sees the contract as caller.
        require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "ERR_ATTACH_1_YOCTO");
        self.pending += 1;
        let payload_v2 = if domain_id == 1 {
            Payload::Eddsa(payload_hex.clone())
        } else {
            Payload::Ecdsa(payload_hex.clone())
        };
        let request = SignRequest { path: path.clone(), payload_v2, domain_id };
        let deposit = NearToken::from_yoctonear(mpc_deposit_yocto.map(|d| d.0).unwrap_or(1));
        let mpc_gas = Gas::from_tgas(mpc_gas_tgas.unwrap_or(self.mpc_gas_tgas));
        let cb_gas = match cb_gas_raw {
            Some(g) => Gas::from_gas(g.0),
            None => Gas::from_tgas(cb_gas_tgas.unwrap_or(self.cb_gas_tgas)),
        };
        log!(
            "sign_for: prepaid={} used_before_promises={} mpc_gas={} cb_gas={} pending={}",
            env::prepaid_gas().as_gas(),
            env::used_gas().as_gas(),
            mpc_gas.as_gas(),
            cb_gas.as_gas(),
            self.pending
        );
        let mpc_call = ext_mpc::ext(self.mpc.clone())
            .with_attached_deposit(deposit)
            .with_static_gas(mpc_gas)
            .with_unused_gas_weight(mpc_weight.unwrap_or(0))
            .sign(request);
        let cb = Self::ext(env::current_account_id())
            .with_static_gas(cb_gas)
            .with_unused_gas_weight(cb_weight.unwrap_or(1));
        if raw_cb.unwrap_or(false) {
            mpc_call.then(cb.on_signed_raw(path, payload_hex, domain_id))
        } else {
            mpc_call.then(cb.on_signed(path, payload_hex, domain_id))
        }
    }

    /// Typed callback, as in the plan: `#[callback_result] Result<SignatureResponse, PromiseError>`.
    #[private]
    pub fn on_signed(
        &mut self,
        path: String,
        payload_hex: String,
        domain_id: u64,
        #[callback_result] r: Result<SignatureResponse, PromiseError>,
    ) -> Option<SignatureResponse> {
        self.pending = self.pending.saturating_sub(1);
        match r {
            Ok(sig) => {
                self.ok += 1;
                log!(
                    "EVENT_JSON:{{\"standard\":\"mpcspike\",\"version\":\"0.0.1\",\"event\":\"signature_issued\",\"data\":[{{\"path\":\"{}\",\"domain_id\":{},\"payload\":\"{}\",\"block\":{},\"pending\":{}}}]}}",
                    path, domain_id, payload_hex, env::block_height(), self.pending
                );
                Some(sig)
            }
            Err(e) => {
                self.err += 1;
                log!(
                    "EVENT_JSON:{{\"standard\":\"mpcspike\",\"version\":\"0.0.1\",\"event\":\"sign_failed\",\"data\":[{{\"path\":\"{}\",\"domain_id\":{},\"error\":\"{:?}\",\"block\":{},\"pending\":{}}}]}}",
                    path, domain_id, e, env::block_height(), self.pending
                );
                None
            }
        }
    }

    /// Raw callback: reads the promise result bytes itself so a parse failure can never revert the
    /// `pending` decrement. Returns the raw JSON string (or None).
    #[private]
    pub fn on_signed_raw(&mut self, path: String, payload_hex: String, domain_id: u64) -> Option<String> {
        self.pending = self.pending.saturating_sub(1);
        let res = env::promise_result_checked(0, 2048);
        match res {
            Ok(bytes) => {
                let parsed = near_sdk::serde_json::from_slice::<SignatureResponse>(&bytes).is_ok();
                if parsed { self.ok += 1 } else { self.err += 1 }
                let s = String::from_utf8(bytes).unwrap_or_default();
                log!(
                    "EVENT_JSON:{{\"standard\":\"mpcspike\",\"version\":\"0.0.1\",\"event\":\"signature_issued_raw\",\"data\":[{{\"path\":\"{}\",\"domain_id\":{},\"payload\":\"{}\",\"parsed\":{},\"block\":{},\"pending\":{}}}]}}",
                    path, domain_id, payload_hex, parsed, env::block_height(), self.pending
                );
                Some(s)
            }
            Err(e) => {
                self.err += 1;
                log!(
                    "EVENT_JSON:{{\"standard\":\"mpcspike\",\"version\":\"0.0.1\",\"event\":\"sign_failed_raw\",\"data\":[{{\"path\":\"{}\",\"domain_id\":{},\"error\":\"{:?}\",\"block\":{},\"pending\":{}}}]}}",
                    path, domain_id, e, env::block_height(), self.pending
                );
                None
            }
        }
    }

    pub fn pending(&self) -> u32 {
        self.pending
    }

    pub fn stats(&self) -> (u32, u32, u32, u64, u64) {
        (self.pending, self.ok, self.err, self.mpc_gas_tgas, self.cb_gas_tgas)
    }

    /// Point at a different signer (e.g. the mock yield contract) for timeout experiments.
    #[private]
    pub fn set_config(&mut self, mpc: AccountId, mpc_gas_tgas: u64, cb_gas_tgas: u64) {
        self.mpc = mpc;
        self.mpc_gas_tgas = mpc_gas_tgas;
        self.cb_gas_tgas = cb_gas_tgas;
    }

    /// Test-only escape hatch to observe a never-decremented counter (spike only; a product must not have this).
    #[private]
    pub fn reset_pending(&mut self) {
        self.pending = 0;
    }

    #[allow(dead_code)]
    fn _unused(&self) -> GasWeight {
        GasWeight(0)
    }
}
