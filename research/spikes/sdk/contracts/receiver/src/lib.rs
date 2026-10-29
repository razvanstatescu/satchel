//! THROWAWAY spike: NEP-171 receiver used to exercise nft_transfer_call + nft_resolve_transfer.
use near_sdk::{AccountId, Gas, NearToken, PromiseOrValue, env, ext_contract, near};

#[ext_contract(ext_nft)]
pub trait Nft {
    fn sign_for(&mut self, token_id: String, chain: String, payload_hex: String);
}

#[near(contract_state)]
#[derive(Default)]
pub struct Receiver {}

#[near]
impl Receiver {
    /// msg: "keep" -> accept; "return" -> refuse (token goes back);
    /// "sign_then_return" -> while owning the token, try sign_for (should fail), then refuse.
    pub fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: String,
        msg: String,
    ) -> PromiseOrValue<bool> {
        near_sdk::log!("nft_on_transfer from {} prev {} token {} msg {}", sender_id, previous_owner_id, token_id, msg);
        match msg.as_str() {
            "keep" => PromiseOrValue::Value(false),
            "sign_then_return" => PromiseOrValue::Promise(
                ext_nft::ext(env::predecessor_account_id())
                    .with_attached_deposit(NearToken::from_yoctonear(1))
                    .with_static_gas(Gas::from_tgas(40))
                    .sign_for(token_id, "evm".into(), "11".repeat(32))
                    .then(Self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(5)).return_true()),
            ),
            _ => PromiseOrValue::Value(true),
        }
    }

    #[private]
    pub fn return_true(&self) -> bool {
        near_sdk::log!("sign_for attempt result ok? {}", env::promise_result_checked(0, 1024).is_ok());
        true
    }
}
