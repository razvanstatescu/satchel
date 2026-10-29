//! THROWAWAY Phase 0 spike: mock signer that mirrors the MPC contract's yield/resume code path
//! (near/mpc 3.17.0 crates/contract/src/api/{sign.rs,common.rs}) to observe timeout behaviour
//! for a calling contract. Modes by `request.path` prefix:
//!   "timeout/..." -> promise_yield_create, never resumed -> times out after yield_timeout_length_in_blocks
//!   "garbage/..." -> returns a success value that is NOT a valid SignatureResponse
use near_sdk::serde_json::{self, Value};
use near_sdk::{env, near, Gas, GasWeight, PromiseError, PromiseOrValue};

const DATA_ID_REGISTER: u64 = 0;

#[near(contract_state)]
#[derive(Default)]
pub struct Mock {
    yields: u64,
}

#[near]
impl Mock {
    #[payable]
    pub fn sign(&mut self, request: Value) {
        let path = request.get("path").and_then(|p| p.as_str()).unwrap_or("").to_string();
        if path.starts_with("garbage") {
            env::value_return(br#"{"scheme":"Secp256k1","big_r":"not-an-object","s":7}"#);
            return;
        }
        self.yields += 1;
        let args = serde_json::to_vec(&(&request,)).unwrap();
        let idx = env::promise_yield_create(
            "return_signature_and_clean_state_on_success",
            args,
            Gas::from_tgas(7),
            GasWeight(0),
            DATA_ID_REGISTER,
        );
        let _data_id = env::read_register(DATA_ID_REGISTER).expect("register");
        env::promise_return(idx);
    }

    #[private]
    pub fn return_signature_and_clean_state_on_success(
        &mut self,
        request: Value,
        #[callback_result] signature: Result<Value, PromiseError>,
    ) -> PromiseOrValue<Value> {
        let _ = request;
        match signature {
            Ok(sig) => PromiseOrValue::Value(sig),
            Err(_) => PromiseOrValue::Promise(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(2))
                    .with_unused_gas_weight(0)
                    .fail_on_timeout()
                    .as_return(),
            ),
        }
    }

    #[private]
    pub fn fail_on_timeout(&self) {
        env::panic_str("Request has timed out.");
    }

    pub fn yields(&self) -> u64 {
        self.yields
    }
}
