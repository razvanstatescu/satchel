//! THROWAWAY spike: mock of the MPC signer's `sign` (yield) / `respond` (resume) flow.
//! Wire shapes mirror near/mpc `crates/contract/src/api/sign.rs` @13f42bf (2026-10-21):
//!   sign({"request":{"path":..,"payload_v2":{"Ecdsa":"<hex32>"},"domain_id":0}}) + 1 yocto, >= 15 Tgas
//!   callback returns the SignatureResponse JSON; on timeout the callback chains to
//!   `fail_on_timeout` which panics, so the caller's callback sees PromiseError::Failed.
use near_sdk::{
    AccountId, Gas, GasWeight, NearToken, PanicOnDefault, Promise, PromiseOrValue, YieldId, env,
    log, near, require, serde_json, store::IterableMap,
};

const MIN_SIGN_GAS: Gas = Gas::from_tgas(15);
const CALLBACK_GAS: Gas = Gas::from_tgas(7);
const FAIL_ON_TIMEOUT_GAS: Gas = Gas::from_tgas(2);

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub enum Payload {
    Ecdsa(String),
    Eddsa(String),
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct SignRequestArgs {
    pub path: String,
    pub payload_v2: Payload,
    pub domain_id: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct PendingRequest {
    pub request_id: u64,
    pub predecessor: AccountId,
    pub request: SignRequestArgs,
    pub yield_id: YieldId,
    pub created_at: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MockSigner {
    pending: IterableMap<u64, PendingRequest>,
    next_id: u64,
}

#[near]
impl MockSigner {
    #[init]
    pub fn new() -> Self {
        Self { pending: IterableMap::new(b"p".to_vec()), next_id: 0 }
    }

    /// Same entrypoint name/args as the real signer. Returns (via yield) the response JSON.
    #[payable]
    pub fn sign(&mut self, request: SignRequestArgs) -> Promise {
        require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "Requires 1 yocto");
        require!(env::prepaid_gas() >= MIN_SIGN_GAS, "Insufficient gas");
        let request_id = self.next_id;
        self.next_id += 1;
        let args = serde_json::to_vec(&serde_json::json!({ "request_id": request_id })).unwrap();
        let (promise, yield_id) =
            Promise::new_yield("on_respond", args, CALLBACK_GAS, GasWeight(0));
        log!("mock sign: id={} predecessor={} path={}", request_id, env::predecessor_account_id(), request.path);
        self.pending.insert(
            request_id,
            PendingRequest {
                request_id,
                predecessor: env::predecessor_account_id(),
                request,
                yield_id,
                created_at: env::block_height(),
            },
        );
        promise
    }

    /// Mimics MPC nodes calling `respond`. Anyone may call in the mock.
    pub fn respond(&mut self, request_id: u64, response: serde_json::Value) -> bool {
        let p = self.pending.get(&request_id).unwrap_or_else(|| env::panic_str("unknown request"));
        let ok = p.yield_id.resume(serde_json::to_vec(&response).unwrap()).is_ok();
        log!("mock respond: id={} resumed={}", request_id, ok);
        ok
    }

    /// Yield callback: success -> return signature; timeout -> chain to a panicking receipt.
    #[private]
    pub fn on_respond(
        &mut self,
        request_id: u64,
        #[callback_result] response: Result<serde_json::Value, near_sdk::PromiseError>,
    ) -> PromiseOrValue<serde_json::Value> {
        self.pending.remove(&request_id);
        match response {
            Ok(v) => PromiseOrValue::Value(v),
            Err(_) => {
                log!("mock on_respond: id={} timed out", request_id);
                PromiseOrValue::Promise(
                    Self::ext(env::current_account_id())
                        .with_static_gas(FAIL_ON_TIMEOUT_GAS)
                        .with_unused_gas_weight(0)
                        .fail_on_timeout()
                        .as_return(),
                )
            }
        }
    }

    #[private]
    pub fn fail_on_timeout(&self) {
        env::panic_str("Signature request has timed out.");
    }

    pub fn pending_requests(&self) -> Vec<PendingRequest> {
        self.pending.values().cloned().collect()
    }
}
