//! THROWAWAY spike: proves Rust 1.93 + near-sdk 5.29.1 + cargo-near 0.22 output deploys and runs.
use near_sdk::{AccountId, NearToken, PanicOnDefault, env, log, near};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Hello {
    owner: AccountId,
    greeting: String,
    calls: u64,
}

#[near(serializers = [json])]
pub struct Info {
    pub block_height: u64,
    pub block_timestamp_ms: u64,
    pub chain_id: String,
    pub sha256_hex: String,
    pub keccak256_hex: String,
    pub storage_usage: u64,
    pub storage_byte_cost: NearToken,
    pub account_balance: NearToken,
    pub account_locked_balance: NearToken,
    pub calls: u64,
}

fn to_hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[near]
impl Hello {
    #[init]
    pub fn new(greeting: String) -> Self {
        Self { owner: env::predecessor_account_id(), greeting, calls: 0 }
    }

    pub fn set_greeting(&mut self, greeting: String) {
        self.calls += 1;
        log!("set_greeting by {} at height {}", env::predecessor_account_id(), env::block_height());
        self.greeting = greeting;
    }

    pub fn get_greeting(&self) -> String {
        self.greeting.clone()
    }

    pub fn info(&self) -> Info {
        Info {
            block_height: env::block_height(),
            block_timestamp_ms: env::block_timestamp_ms(),
            chain_id: env::chain_id(),
            sha256_hex: to_hex(&env::sha256(self.greeting.as_bytes())),
            keccak256_hex: to_hex(&env::keccak256(self.greeting.as_bytes())),
            storage_usage: env::storage_usage(),
            storage_byte_cost: env::storage_byte_cost(),
            account_balance: env::account_balance(),
            account_locked_balance: env::account_locked_balance(),
            calls: self.calls,
        }
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }
}
