//! Sandbox NEP-141 standing in for Circle testnet USDC (`3e2210e1…b8af`, 6 decimals, 0.00125 NEAR
//! storage). Written against near-contract-standards 5.29.1 (`FungibleToken`, NEP-145 storage), so
//! `ft_transfer_call` / `ft_resolve_transfer` have exactly the standard semantics kb/51 relies on:
//! a panicking receiver means "unused = everything" and the sender is refunded 100 %.
//!
//! The only non-standard method is an **open** `mint` (anyone, any amount) for test setup.

use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::{
    AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue, env, log, near,
};

pub const DECIMALS: u8 = 6;

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    FungibleToken,
    Metadata,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MockFt {
    token: FungibleToken,
    metadata: LazyOption<FungibleTokenMetadata>,
}

#[near]
impl MockFt {
    #[init]
    pub fn new(name: Option<String>, symbol: Option<String>) -> Self {
        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: name.unwrap_or_else(|| "Mock USDC".to_string()),
            symbol: symbol.unwrap_or_else(|| "USDC".to_string()),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: DECIMALS,
        };
        metadata.assert_valid();
        Self {
            token: FungibleToken::new(StorageKey::FungibleToken),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
        }
    }

    /// Open mint for tests. Registers `account_id` first if needed (storage paid by this contract).
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        if !self.token.accounts.contains_key(&account_id) {
            self.token.internal_register_account(&account_id);
        }
        self.token.internal_deposit(&account_id, amount.0);
        FtMint {
            owner_id: &account_id,
            amount,
            memo: Some("mock mint"),
        }
        .emit();
    }
}

#[near]
impl FungibleTokenCore for MockFt {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for MockFt {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        if burned > 0 {
            log!("Account @{} burned {}", sender_id, burned);
        }
        used.into()
    }
}

#[near]
impl StorageManagement for MockFt {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        #[allow(unused_variables)]
        if let Some((account_id, balance)) = self.token.internal_storage_unregister(force) {
            log!("Closed @{} with {}", account_id, balance);
            true
        } else {
            false
        }
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for MockFt {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap_or_else(|| env::abort())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::testing_env;

    fn ctx(pred: AccountId, deposit: u128) {
        let mut b = VMContextBuilder::new();
        b.current_account_id("usdc.test.near".parse().unwrap())
            .predecessor_account_id(pred)
            .attached_deposit(NearToken::from_yoctonear(deposit));
        testing_env!(b.build());
    }

    #[test]
    fn metadata_six_decimals() {
        ctx(accounts(0), 0);
        let c = MockFt::new(None, None);
        let m = c.ft_metadata();
        assert_eq!(m.decimals, 6);
        assert_eq!(m.symbol, "USDC");
        assert_eq!(m.spec, "ft-1.0.0");
    }

    #[test]
    fn open_mint_registers_and_credits() {
        ctx(accounts(3), 0);
        let mut c = MockFt::new(None, None);
        assert!(c.storage_balance_of(accounts(1)).is_none());
        c.mint(accounts(1), U128(5_000_000));
        c.mint(accounts(1), U128(1));
        assert_eq!(c.ft_balance_of(accounts(1)), U128(5_000_001));
        assert_eq!(c.ft_total_supply(), U128(5_000_001));
        assert!(c.storage_balance_of(accounts(1)).is_some());
    }

    #[test]
    fn storage_bound_matches_usdc() {
        ctx(accounts(0), 0);
        let c = MockFt::new(None, None);
        // Circle testnet USDC: 0.00125 NEAR (min = max), kb/51 §TL;DR 3
        assert_eq!(
            c.storage_balance_bounds().min,
            NearToken::from_micronear(1250)
        );
    }

    #[test]
    fn transfer_between_registered() {
        ctx(accounts(1), 0);
        let mut c = MockFt::new(None, None);
        c.mint(accounts(1), U128(10));
        c.mint(accounts(2), U128(0));
        ctx(accounts(1), 1);
        c.ft_transfer(accounts(2), U128(4), None);
        assert_eq!(c.ft_balance_of(accounts(1)), U128(6));
        assert_eq!(c.ft_balance_of(accounts(2)), U128(4));
    }

    #[test]
    #[should_panic(expected = "is not registered")]
    fn transfer_to_unregistered_panics() {
        ctx(accounts(1), 0);
        let mut c = MockFt::new(None, None);
        c.mint(accounts(1), U128(10));
        ctx(accounts(1), 1);
        c.ft_transfer(accounts(4), U128(4), None);
    }

    #[test]
    #[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
    fn transfer_needs_one_yocto() {
        ctx(accounts(1), 0);
        let mut c = MockFt::new(None, None);
        c.mint(accounts(1), U128(10));
        c.mint(accounts(2), U128(0));
        c.ft_transfer(accounts(2), U128(4), None);
    }
}
