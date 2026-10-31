//! Satchel v1: an NFT that is a wallet (spec kb/90 §5). Each NEP-171 token controls BTC / EVM / SOL addresses through
//! NEAR Chain Signatures; every signature is recorded on-chain before the MPC is asked (clean history).

use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::{NftMint, NftTransfer};
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token};
use near_sdk::json_types::U128;
use near_sdk::store::{IterableSet, LazyOption, LookupMap};
use near_sdk::{env, near, AccountId, BorshStorageKey, Gas, PanicOnDefault, PromiseOrValue};

pub mod allowance;
pub mod errors;
pub mod events;
pub mod evm_nonces;
pub mod history;
pub mod inside;
pub mod market;
pub mod mpc;
pub mod offers;
pub mod parse;
pub mod sale;
pub mod sign;
pub mod types;
pub mod views;

use errors::*;
use types::*;

// ── constants (spec §5.5; mirrored in config()) ────────────────────────────────────────────────
pub const VERSION: &str = "1.0.0";
pub const COOLDOWN_BLOCKS: u64 = 250;
pub const MAX_BTC_INPUTS: u64 = parse::btc::MAX_BTC_INPUTS as u64;
pub const MPC_SIGN_GAS_TGAS: u64 = 15;
pub const ON_SIGNED_GAS_BASE_TGAS: u64 = 10;
pub const ON_SIGNED_GAS_PER_REQUEST_TGAS: u64 = 2;
pub const MIN_SIGN_PREPAID_BASE_TGAS: u64 = 30;
pub const MIN_SIGN_PREPAID_PER_REQUEST_TGAS: u64 = 18;
pub const MPC_DEPOSIT_DEFAULT: u128 = 1;
pub const MAX_MPC_DEPOSIT: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR
pub const PAYOUT_FT_GAS_TGAS: u64 = 15;
pub const ON_PAYOUT_GAS_TGAS: u64 = 10; // measured 1.68 Tgas; 10 gives a 6x margin (S-01)
pub const MAX_PAGE: u32 = 50;

pub fn on_signed_gas(n: u64) -> Gas {
    Gas::from_tgas(ON_SIGNED_GAS_BASE_TGAS + ON_SIGNED_GAS_PER_REQUEST_TGAS * n)
}

pub fn min_sign_prepaid(n: u64) -> Gas {
    Gas::from_tgas(MIN_SIGN_PREPAID_BASE_TGAS + MIN_SIGN_PREPAID_PER_REQUEST_TGAS * n)
}

/// The variant order is the on-chain prefix (1 byte each): never reorder after the final deploy.
#[derive(BorshStorageKey)]
#[near]
pub enum StorageKey {
    OwnerById,
    TokenMetadata,
    Enumeration,
    ContractMetadata,
    TokenState,
    SigLog,
    Listings,
    Proceeds,
    Allowances, // C5, allowance.rs
    // C4/C6 (market.rs); appended after C5, never reorder
    Inside,
    InsideFt,
    Offers,
    OffersByToken,
    OffersByTokenLen,
    OffersByAccount,
    OffersByAccountLen,
    StorageCredit,
    /// C3: max signed EVM nonce per (token, chain_id) for chains other than Sepolia (`evm_nonces.rs`). Appended last.
    EvmNonces,
}

#[near(contract_state, contract_metadata(standard(standard = "nep171", version = "1.0.0"), standard(standard = "nep177", version = "2.0.0"), standard(standard = "nep181", version = "1.0.0"), standard(standard = "nep297", version = "1.0.0")))]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) tokens: NonFungibleToken,
    pub(crate) metadata: LazyOption<NFTContractMetadata>,
    pub(crate) mpc: AccountId,
    pub(crate) usdc: Option<AccountId>,
    pub(crate) next_token_id: u64,
    pub(crate) next_listing_id: u64,
    pub(crate) state: LookupMap<TokenId, TokenState>,
    pub(crate) sig_log: LookupMap<(TokenId, u64), SigRecord>,
    pub(crate) listings: IterableSet<TokenId>,
    pub(crate) proceeds: LookupMap<(AccountId, Currency), u128>,
    /// C4 offers + C6 inside assets (market.rs).
    pub(crate) market: market::Market,
}

#[near]
impl Contract {
    /// One-time init; every argument is immutable afterwards (no admin methods exist).
    /// NOT #[private] on purpose (R-32): in the keyless birth the caller is <team>.testnet. Safe because deploy + `new`
    /// (+ mints) run in one atomic receipt, and #[init] refuses a second init.
    #[init]
    pub fn new(mpc: AccountId, usdc: Option<AccountId>, base_uri: String) -> Self {
        let metadata = NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "Satchel".to_string(),
            symbol: "SATCHEL".to_string(),
            icon: None,
            base_uri: Some(base_uri),
            reference: None,
            reference_hash: None,
        };
        metadata.assert_valid();
        Self {
            tokens: NonFungibleToken::new(
                StorageKey::OwnerById,
                env::current_account_id(),
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                None::<StorageKey>, // NEP-178 approvals disabled
            ),
            metadata: LazyOption::new(StorageKey::ContractMetadata, Some(metadata)),
            mpc,
            usdc,
            next_token_id: 1,
            next_listing_id: 1,
            state: LookupMap::new(StorageKey::TokenState),
            sig_log: LookupMap::new(StorageKey::SigLog),
            listings: IterableSet::new(StorageKey::Listings),
            proceeds: LookupMap::new(StorageKey::Proceeds),
            market: market::Market::new(),
        }
    }

    /// Anyone. Mints token `next_token_id` to `receiver_id`. The caller pays the measured storage; the excess is refunded.
    /// Refuses the same stranding receivers as `nft_transfer` (R-18, S-06).
    #[payable]
    pub fn nft_mint(&mut self, receiver_id: AccountId) -> Token {
        self.ensure_receiver(&receiver_id);
        let initial = env::storage_usage();
        let token_id = self.next_token_id.to_string();
        self.next_token_id += 1;
        let meta = TokenMetadata {
            title: Some(["Satchel #", &token_id].concat()),
            description: None,
            media: Some([&token_id, ".svg"].concat()),
            media_hash: None,
            copies: None,
            issued_at: Some(env::block_timestamp_ms().to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: None,
            reference: None,
            reference_hash: None,
        };
        let token = self.tokens.internal_mint_with_refund(token_id.clone(), receiver_id, Some(meta), None);
        self.state.insert(token_id, TokenState::default());
        self.state.flush();
        charge_storage(initial, 0, 0);
        NftMint { owner_id: &token.owner_id, token_ids: &[&token.token_id], memo: None }.emit();
        token
    }
}

// ── internal helpers ───────────────────────────────────────────────────────────────────────────
impl Contract {
    pub(crate) fn owner_of(&self, token_id: &TokenId) -> AccountId {
        self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| fail(ERR_TOKEN_NOT_FOUND))
    }

    pub(crate) fn token_state(&self, token_id: &TokenId) -> TokenState {
        self.state.get(token_id).cloned().unwrap_or_default()
    }

    /// R-18 receiver guard (S-06, S-09): a token owned by the contract itself, the MPC or the configured USDC contract
    /// can never call `sign_for`, so its funds would be stranded for good. Used by `nft_mint` and `nft_transfer`.
    /// The single post-transfer hook. Called after EVERY ownership change, in the same receipt: `nft_transfer`
    /// (reason "transfer"), `execute_sale` (`buy`, USDC `ft_on_transfer` buy; "sale") and `accept_offer` ("sale").
    /// C5 reset rule: every allowance of the token is cleared. Inside balances (C6) are keyed by token and offers (C4)
    /// are bound to token state, so neither needs anything here.
    /// Returns the `allowances_cleared` event, which the caller emits after its last check (AUDIT-04).
    #[must_use]
    pub(crate) fn on_owner_change(&mut self, token_id: &TokenId, reason: &str) -> Option<allowance::AllowanceEvent> {
        self.clear_allowances(token_id, reason)
    }

    /// The writes of near-contract-standards' `internal_transfer` for an owner-initiated transfer (approvals are
    /// disabled), with the same checks and panic messages, but WITHOUT its NEP-171 `nft_transfer` event: the caller
    /// emits that with `emit_nft_transfer` after its last check that can refuse (AUDIT-04, events.rs, spec §5.8 step 7).
    pub(crate) fn move_token(&mut self, from: &AccountId, to: &AccountId, token_id: &TokenId) {
        let owner = self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| env::panic_str("Token not found"));
        if owner != *from {
            env::panic_str("Approval extension is disabled");
        }
        near_sdk::require!(owner != *to, "Current and next owner must differ");
        self.tokens.internal_transfer_unguarded(token_id, from, to);
    }

    /// ERR_BAD_RECEIVER for the accounts that would strand an NFT or funds: the contract itself, the MPC signer and
    /// the configured USDC. The one rule for every caller-chosen receiver: `nft_mint`, `nft_transfer`, offerers, and
    /// (Q-03) `withdraw_near`, `withdraw_ft`, `prepay_storage(account_id)`.
    pub(crate) fn ensure_receiver(&self, receiver_id: &AccountId) {
        ensure(
            *receiver_id != env::current_account_id() && *receiver_id != self.mpc && Some(receiver_id) != self.usdc.as_ref(),
            ERR_BAD_RECEIVER,
        );
    }
}

/// The NEP-171 `nft_transfer` event `internal_transfer` would have logged for an owner-initiated transfer (no
/// `authorized_id`). Emitted by the caller of `Contract::move_token` after its last check (AUDIT-04).
pub(crate) fn emit_nft_transfer(from: &AccountId, to: &AccountId, token_id: &str, memo: Option<&str>) {
    NftTransfer { old_owner_id: from, new_owner_id: to, token_ids: &[token_id], authorized_id: None, memo }.emit();
}

/// NEP-181 page size: `limit` defaults to and is capped at `MAX_PAGE`, like the Satchel views (S-05).
fn page_limit(limit: Option<u64>) -> Option<u64> {
    Some(limit.unwrap_or(MAX_PAGE as u64).min(MAX_PAGE as u64))
}

/// Spec §5.4 charging pattern. Call after every touched `store` collection was flushed.
/// required = Δstorage × byte cost + `extra_yocto`, at least `min_yocto`. Panics ERR_DEPOSIT when short; refunds the excess
/// to the predecessor with a detached transfer. Returns the amount kept.
pub(crate) fn charge_storage(initial_usage: u64, extra_yocto: u128, min_yocto: u128) -> u128 {
    let used = env::storage_usage().saturating_sub(initial_usage) as u128;
    let required = (used * env::storage_byte_cost().as_yoctonear() + extra_yocto).max(min_yocto);
    let attached = env::attached_deposit().as_yoctonear();
    if attached < required {
        fail_with(ERR_DEPOSIT, &["attach ≥ ", &required.to_string(), " yocto"].concat());
    }
    let refund = attached - required;
    if refund > 0 {
        promise::transfer(&env::predecessor_account_id(), refund);
    }
    required
}

/// Low-level promises. near-sdk's `Promise` type links every action host function (AddKey, DeployContract,
/// DeleteAccount, …) into the wasm through its drop glue; INV-22 requires the release wasm to import none of them,
/// so the contract builds receipts with `env::promise_*` directly. Only FunctionCall and Transfer actions exist here.
pub(crate) mod promise {
    use near_sdk::{env, AccountId, Gas, GasWeight, NearToken, PromiseIndex};

    pub fn call(account: &AccountId, method: &str, args: &[u8], deposit: u128, gas: Gas, weight: u64) -> PromiseIndex {
        let p = env::promise_batch_create(account);
        env::promise_batch_action_function_call_weight(p, method, args, NearToken::from_yoctonear(deposit), gas, GasWeight(weight));
        p
    }

    pub fn then_call(after: PromiseIndex, account: &AccountId, method: &str, args: &[u8], gas: Gas) -> PromiseIndex {
        let p = env::promise_batch_then(after, account);
        env::promise_batch_action_function_call_weight(p, method, args, NearToken::from_yoctonear(0), gas, GasWeight(0));
        p
    }

    pub fn transfer(account: &AccountId, amount: u128) -> PromiseIndex {
        let p = env::promise_batch_create(account);
        env::promise_batch_action_transfer(p, NearToken::from_yoctonear(amount));
        p
    }
}

// ── NEP-171 / 177 / 181 ────────────────────────────────────────────────────────────────────────
#[near]
impl NonFungibleTokenCore for Contract {
    /// Owner only (checked here first, R-16); refused while listed; refuses the contract itself, the MPC and USDC (R-18).
    /// NEP-171: exactly 1 yocto, so the contract pays a new holder's storage from its own NEAR, never from escrow
    /// (M-01: `ERR_INSOLVENT` if that buffer is exhausted).
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        let owner = self.owner_of(&token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        ensure(self.token_state(&token_id).listing.is_none(), ERR_LISTED);
        self.ensure_receiver(&receiver_id);
        let s0 = env::storage_usage();
        // = `self.tokens.nft_transfer(…)` (1 yocto, then `internal_transfer`), its event deferred (AUDIT-04);
        // `approval_id` is ignored there too when the sender is the owner
        let _ = approval_id;
        near_sdk::assert_one_yocto();
        self.move_token(&owner, &receiver_id, &token_id);
        let cleared = self.on_owner_change(&token_id, "transfer");
        self.ensure_solvent(s0);
        // events only after the last check that can refuse (AUDIT-04)
        emit_nft_transfer(&owner, &receiver_id, &token_id, memo.as_deref());
        if let Some(e) = cleared {
            e.emit();
        }
    }

    /// Disabled in v1 (D-07). Present so NEP-171 tooling gets a clear error instead of MethodNotFound.
    #[payable]
    #[allow(unused_variables)]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        fail(ERR_TRANSFER_CALL_DISABLED)
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }

    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, page_limit(limit))
    }

    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }

    fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens_for_owner(account_id, from_index, page_limit(limit))
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().clone().unwrap_or_else(|| env::abort())
    }
}

// Test modules stay at the end of the file: a `mod` line mid-file shifts every later line, and with it the panic
// locations compiled into the wasm (docs/security/fuzzing.md W-01).
#[cfg(test)]
mod tests;
#[cfg(test)]
mod security_tests;
#[cfg(test)]
mod allowance_tests;
#[cfg(test)]
mod market_tests;
#[cfg(test)]
mod feature_tests;
