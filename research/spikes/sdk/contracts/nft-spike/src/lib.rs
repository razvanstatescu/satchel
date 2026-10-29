//! THROWAWAY Phase-0 spike (sdk agent). NOT product code - do not copy into the product repo.
//! Proves patterns only: embedding near-contract-standards NonFungibleToken, a hook on every
//! ownership change, owner-only `sign_for` -> (mock) MPC `sign` with a pending counter and a
//! callback that never panics, custom NEP-297 events, storage-deposit accounting.
use std::collections::HashMap;

use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;
use near_contract_standards::non_fungible_token::core::{
    NonFungibleTokenCore, NonFungibleTokenResolver,
};
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::{
    NFT_METADATA_SPEC, NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata,
};
use near_contract_standards::non_fungible_token::{
    NonFungibleToken, Token, TokenId, refund_deposit_to_account,
};
use near_sdk::json_types::U128;
use near_sdk::store::{LazyOption, LookupMap};
use near_sdk::{
    AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue, env,
    ext_contract, log, near, require, serde_json,
};

const SIGN_GAS: Gas = Gas::from_tgas(15); // MPC requires prepaid >= 15 Tgas on `sign`
const ON_SIGNED_GAS: Gas = Gas::from_tgas(10);
const MAX_SIG_RESULT_BYTES: usize = 1024;
const LIST_COOLDOWN_BLOCKS: u64 = 100; // spike value (plan: 200-210)

#[ext_contract(ext_signer)]
pub trait Signer {
    fn sign(&mut self, request: serde_json::Value);
}

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    OwnerById,
    TokenMetadata,
    Enumeration,
    Approval,
    ContractMetadata,
    TokenState,
    Probe,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct TokenState {
    pub pending_signs: u32,
    pub epoch: u32,
    pub listed_price: Option<NearToken>,
    pub listed_at: Option<u64>,
    pub transfer_call_in_flight: bool,
    pub signs_ok: u32,
    pub signs_failed: u32,
}

#[near(event_json(standard = "satchel_spike"))]
pub enum SpikeEvent {
    #[event_version("1.0.0")]
    SignatureRequested { token_id: String, path: String, payload_hex: String, block: u64 },
    #[event_version("1.0.0")]
    SignatureResolved { token_id: String, ok: bool, requested_at: u64, block: u64 },
    #[event_version("1.0.0")]
    Listed { token_id: String, price: NearToken, block: u64 },
    #[event_version("1.0.0")]
    EpochBumped { token_id: String, epoch: u32 },
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Spike {
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    signer: AccountId,
    state: LookupMap<TokenId, TokenState>,
    probe: LookupMap<String, String>,
    next_token_id: u64,
}

#[near]
impl Spike {
    #[init]
    pub fn new(signer: AccountId) -> Self {
        let metadata = NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "Satchel spike".to_string(),
            symbol: "SPIKE".to_string(),
            icon: None,
            base_uri: None,
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
                Some(StorageKey::Approval),
            ),
            metadata: LazyOption::new(StorageKey::ContractMetadata, Some(metadata)),
            signer,
            state: LookupMap::new(StorageKey::TokenState),
            probe: LookupMap::new(StorageKey::Probe),
            next_token_id: 1,
        }
    }

    /// Open mint: caller pays storage for NFT records + TokenState; excess refunded.
    #[payable]
    pub fn nft_mint(&mut self, receiver_id: AccountId) -> Token {
        let initial = env::storage_usage();
        let token_id = self.next_token_id.to_string();
        self.next_token_id += 1;
        let metadata = TokenMetadata {
            title: Some(format!("Satchel #{token_id}")),
            media: Some(format!("https://example.invalid/api/card/{token_id}.svg")),
            ..Default::default()
        };
        // refund_id = None: we account storage ourselves so TokenState is included.
        let token =
            self.tokens.internal_mint_with_refund(token_id.clone(), receiver_id, Some(metadata), None);
        self.state.insert(token_id.clone(), TokenState::default());
        self.state.flush(); // store::* collections write lazily; flush BEFORE measuring
        let used = env::storage_usage() - initial;
        log!("mint storage bytes: {}", used);
        refund_deposit_to_account(used, env::predecessor_account_id());
        NftMint { owner_id: &token.owner_id, token_ids: &[&token.token_id], memo: None }.emit();
        token
    }

    /// Owner-only: request an MPC signature for `payload_hex` on path satchel/{id}/{chain}.
    #[payable]
    pub fn sign_for(&mut self, token_id: TokenId, chain: String, payload_hex: String) -> Promise {
        require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "ERR_DEPOSIT");
        let owner = self.owner_of(&token_id);
        require!(owner == env::predecessor_account_id(), "ERR_NOT_OWNER");
        let s = self.state.get_mut(&token_id).unwrap_or_else(|| env::panic_str("ERR_NO_STATE"));
        require!(s.listed_price.is_none(), "ERR_FROZEN");
        require!(!s.transfer_call_in_flight, "ERR_TRANSFER_IN_FLIGHT");
        s.pending_signs += 1;
        let path = format!("satchel/{token_id}/{chain}");
        let block = env::block_height();
        SpikeEvent::SignatureRequested {
            token_id: token_id.clone(),
            path: path.clone(),
            payload_hex: payload_hex.clone(),
            block,
        }
        .emit();
        let request = serde_json::json!({
            "path": path,
            "payload_v2": { "Ecdsa": payload_hex },
            "domain_id": 0
        });
        ext_signer::ext(self.signer.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(SIGN_GAS)
            .with_unused_gas_weight(1)
            .sign(request)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(ON_SIGNED_GAS)
                    .with_unused_gas_weight(0)
                    .on_signed(token_id, block),
            )
    }

    /// Callback that must never panic: reads the promise result manually (no #[callback_result],
    /// whose JSON-deserialization failure would panic and leave pending_signs stuck).
    #[private]
    pub fn on_signed(&mut self, token_id: TokenId, requested_at: u64) -> Option<serde_json::Value> {
        let parsed = env::promise_result_checked(0, MAX_SIG_RESULT_BYTES)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok());
        if let Some(s) = self.state.get_mut(&token_id) {
            s.pending_signs = s.pending_signs.saturating_sub(1);
            if parsed.is_some() {
                s.signs_ok += 1;
            } else {
                s.signs_failed += 1;
            }
        }
        SpikeEvent::SignatureResolved {
            token_id,
            ok: parsed.is_some(),
            requested_at,
            block: env::block_height(),
        }
        .emit();
        parsed
    }

    pub fn list(&mut self, token_id: TokenId, price: NearToken) {
        let owner = self.owner_of(&token_id);
        require!(owner == env::predecessor_account_id(), "ERR_NOT_OWNER");
        let s = self.state.get_mut(&token_id).unwrap_or_else(|| env::panic_str("ERR_NO_STATE"));
        require!(s.pending_signs == 0, "ERR_PENDING_SIGNS");
        require!(s.listed_price.is_none(), "ERR_ALREADY_LISTED");
        s.listed_price = Some(price);
        s.listed_at = Some(env::block_height());
        SpikeEvent::Listed { token_id, price, block: env::block_height() }.emit();
    }

    /// Sale path: the only transfer allowed while listed.
    #[payable]
    pub fn buy(&mut self, token_id: TokenId) {
        let owner = self.owner_of(&token_id);
        let s = self.state.get(&token_id).cloned().unwrap_or_default();
        let price = s.listed_price.unwrap_or_else(|| env::panic_str("ERR_NOT_LISTED"));
        let listed_at = s.listed_at.unwrap_or_default();
        require!(env::block_height() >= listed_at + LIST_COOLDOWN_BLOCKS, "ERR_COOLDOWN");
        require!(env::attached_deposit() == price, "ERR_PRICE");
        self.assert_transferable(&token_id, true);
        let buyer = env::predecessor_account_id();
        // internal_transfer: authorizes `owner` as sender, clears approvals, emits nft_transfer.
        self.tokens.internal_transfer(&owner, &buyer, &token_id, None, Some("sale".to_string()));
        self.after_owner_change(&token_id);
        Promise::new(owner).transfer(price).detach();
    }

    pub fn token_state(&self, token_id: TokenId) -> Option<TokenState> {
        self.state.get(&token_id).cloned()
    }

    /// Spike-only probe of the store::* lazy-write gotcha. Returns (delta_without_flush, delta_after_flush).
    pub fn probe_storage(&mut self, key: String) -> (u64, u64) {
        let before = env::storage_usage();
        self.probe.insert(key, "x".repeat(100));
        let no_flush = env::storage_usage() - before;
        self.probe.flush();
        let with_flush = env::storage_usage() - before;
        (no_flush, with_flush)
    }

    pub fn storage_byte_cost(&self) -> NearToken {
        env::storage_byte_cost()
    }

    // ---- internals ----
    fn owner_of(&self, token_id: &TokenId) -> AccountId {
        self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| env::panic_str("ERR_NO_TOKEN"))
    }

    fn assert_transferable(&self, token_id: &TokenId, is_sale: bool) {
        let s = self.state.get(token_id).cloned().unwrap_or_default();
        require!(s.pending_signs == 0, "ERR_PENDING_SIGNS");
        require!(s.listed_price.is_none() || is_sale, "ERR_LISTED");
        require!(!s.transfer_call_in_flight, "ERR_TRANSFER_IN_FLIGHT");
    }

    /// Runs after EVERY ownership change (transfer, transfer_call, its revert, sale).
    fn after_owner_change(&mut self, token_id: &TokenId) {
        if let Some(s) = self.state.get_mut(token_id) {
            s.epoch += 1;
            s.listed_price = None;
            s.listed_at = None;
            SpikeEvent::EpochBumped { token_id: token_id.clone(), epoch: s.epoch }.emit();
        }
    }
}

#[near]
impl NonFungibleTokenCore for Spike {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        self.assert_transferable(&token_id, false);
        self.tokens.nft_transfer(receiver_id, token_id.clone(), approval_id, memo);
        self.after_owner_change(&token_id);
    }

    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        self.assert_transferable(&token_id, false);
        let r = self.tokens.nft_transfer_call(receiver_id, token_id.clone(), approval_id, memo, msg);
        self.after_owner_change(&token_id);
        // lock signing/listing/transfers until nft_resolve_transfer runs
        if let Some(s) = self.state.get_mut(&token_id) {
            s.transfer_call_in_flight = true;
        }
        r
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenResolver for Spike {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        if let Some(s) = self.state.get_mut(&token_id) {
            s.transfer_call_in_flight = false;
        }
        let transferred = self.tokens.nft_resolve_transfer(
            previous_owner_id,
            receiver_id,
            token_id.clone(),
            approved_account_ids,
        );
        if !transferred {
            // token went back to previous owner via internal_transfer_unguarded: ownership changed again
            self.after_owner_change(&token_id);
        }
        transferred
    }
}

#[near]
impl NonFungibleTokenApproval for Spike {
    #[payable]
    fn nft_approve(
        &mut self,
        token_id: TokenId,
        account_id: AccountId,
        msg: Option<String>,
    ) -> Option<Promise> {
        self.tokens.nft_approve(token_id, account_id, msg)
    }

    #[payable]
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens.nft_revoke(token_id, account_id);
    }

    #[payable]
    fn nft_revoke_all(&mut self, token_id: TokenId) {
        self.tokens.nft_revoke_all(token_id);
    }

    fn nft_is_approved(
        &self,
        token_id: TokenId,
        approved_account_id: AccountId,
        approval_id: Option<u64>,
    ) -> bool {
        self.tokens.nft_is_approved(token_id, approved_account_id, approval_id)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Spike {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }

    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }

    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }

    fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        self.tokens.nft_tokens_for_owner(account_id, from_index, limit)
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Spike {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().clone().unwrap()
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod unit {
    //! THROWAWAY: proves near-sdk 5.29.1 unit-testing (mocked blockchain) works with the hook.
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::testing_env;

    fn ctx(pred: AccountId, deposit: NearToken) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.current_account_id(accounts(0)).predecessor_account_id(pred).attached_deposit(deposit);
        b
    }

    #[test]
    fn transfer_blocked_while_pending_then_allowed() {
        testing_env!(ctx(accounts(1), NearToken::from_millinear(100)).build());
        let mut c = Spike::new(accounts(4));
        let t = c.nft_mint(accounts(1));
        // simulate a pending sign without promises
        c.state.get_mut(&t.token_id).unwrap().pending_signs = 1;
        testing_env!(ctx(accounts(1), NearToken::from_yoctonear(1)).build());
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.nft_transfer(accounts(2), t.token_id.clone(), None, None)
        }));
        assert!(r.is_err(), "transfer must panic while pending");
        c.state.get_mut(&t.token_id).unwrap().pending_signs = 0;
        c.nft_transfer(accounts(2), t.token_id.clone(), None, None);
        assert_eq!(c.nft_token(t.token_id.clone()).unwrap().owner_id, accounts(2));
        assert_eq!(c.token_state(t.token_id).unwrap().epoch, 1);
    }
}
