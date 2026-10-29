//! Sale flow (spec §5.12): list / delist with the quiet period, state-bound `buy` (NEAR) and `ft_on_transfer` (USDC),
//! atomic transfer + detached payout re-credited to `proceeds` on failure, `withdraw_proceeds`.

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::U128;
use near_sdk::serde_json;
use near_sdk::serde_json::json;
use near_sdk::{env, near, AccountId, Gas, NearToken, PromiseIndex, PromiseOrValue};

use crate::errors::*;
use crate::events::SatchelEvent;
use crate::types::*;
use crate::{charge_storage, promise, Contract, ContractExt, COOLDOWN_BLOCKS, ON_PAYOUT_GAS_TGAS, PAYOUT_FT_GAS_TGAS};

impl Contract {
    /// Quiet period (D-05 rev 2): `height ≥ last_sign_height + COOLDOWN_BLOCKS`. A token that never signed has nothing
    /// in flight and is listable at once (see docs/handoff/contract.md, deviation D1).
    pub(crate) fn listable_at(st: &TokenState) -> u64 {
        if st.sig_count == 0 { 0 } else { st.last_sign_height.saturating_add(COOLDOWN_BLOCKS) }
    }

    /// Shared checks of `buy` and `ft_on_transfer` (spec §5.7, in order). Returns the listing.
    fn check_buy(&self, token_id: &TokenId, listing_id: u64, expected_sig_count: u64, currency: Currency, amount: u128, buyer: &AccountId) -> Listing {
        let owner = self.owner_of(token_id);
        let st = self.token_state(token_id);
        let listing = st.listing.clone().unwrap_or_else(|| fail(ERR_NOT_LISTED));
        ensure(
            listing.id == listing_id && st.sig_count == expected_sig_count && listing.sig_count == st.sig_count,
            ERR_LISTING_CHANGED,
        );
        ensure(listing.currency == currency, ERR_CURRENCY);
        ensure(amount == listing.price.0, ERR_WRONG_AMOUNT);
        ensure(*buyer != listing.seller, ERR_SELF_BUY);
        ensure(listing.seller == owner, ERR_LISTING_CHANGED);
        listing
    }

    /// The single receipt of a sale: transfer, clear the listing, `sold` event, detached payout.
    fn execute_sale(&mut self, token_id: TokenId, listing: Listing, buyer: AccountId) {
        self.tokens.internal_transfer(&listing.seller, &buyer, &token_id, None, Some("sale".to_string()));
        self.on_owner_change(&token_id, "sale"); // C5 reset rule (clears allowances)
        let mut st = self.token_state(&token_id);
        st.listing = None;
        self.state.insert(token_id.clone(), st);
        self.listings.remove(&token_id);
        SatchelEvent::Sold {
            token_id,
            listing_id: listing.id,
            seller_id: listing.seller.clone(),
            buyer_id: buyer,
            price: listing.price,
            currency: listing.currency,
        }
        .emit();
        self.payout(listing.seller, listing.currency, listing.price.0); // detached: never the returned promise
    }

    /// Payout promise `.then(on_payout)`. NEAR: plain transfer; USDC: `ft_transfer` with 1 yocto, 15 Tgas.
    pub(crate) fn payout(&self, account: AccountId, currency: Currency, amount: u128) -> PromiseIndex {
        let p = match currency {
            Currency::Near => promise::transfer(&account, amount),
            Currency::Usdc => {
                let usdc = self.usdc.clone().unwrap_or_else(|| fail(ERR_CURRENCY));
                let args = json!({ "receiver_id": account, "amount": U128(amount), "memo": "satchel sale" }).to_string();
                promise::call(&usdc, "ft_transfer", args.as_bytes(), 1, Gas::from_tgas(PAYOUT_FT_GAS_TGAS), 0)
            }
        };
        let cb = json!({ "account_id": account, "currency": currency, "amount": U128(amount) }).to_string();
        promise::then_call(p, &env::current_account_id(), "on_payout", cb.as_bytes(), Gas::from_tgas(ON_PAYOUT_GAS_TGAS))
    }
}

#[near]
impl Contract {
    /// Owner only, ≥ 1 yocto + storage (excess refunded). Requires the quiet period to be over. Returns the listing id.
    #[payable]
    pub fn list(&mut self, token_id: TokenId, price: U128, currency: Currency) -> u64 {
        let owner = self.owner_of(&token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        let mut st = self.token_state(&token_id);
        ensure(st.listing.is_none(), ERR_ALREADY_LISTED);
        ensure(price.0 > 0, ERR_PRICE);
        ensure(currency == Currency::Near || self.usdc.is_some(), ERR_CURRENCY);
        let height = env::block_height();
        if height < Self::listable_at(&st) {
            fail_with(ERR_QUIET_PERIOD, &["listable at block ", &Self::listable_at(&st).to_string()].concat());
        }
        let s0 = env::storage_usage();
        let id = self.next_listing_id;
        self.next_listing_id += 1;
        let listing = Listing { id, seller: owner.clone(), price, currency, listed_at: height, sig_count: st.sig_count };
        st.listing = Some(listing.clone());
        self.state.insert(token_id.clone(), st);
        self.listings.insert(token_id.clone());
        // S-01: reserve the seller's proceeds slot now, paid by the seller, so a failed payout's re-credit in
        // `on_payout` only overwrites a fixed-size u128 and can never need storage the contract pays for.
        let slot = (owner.clone(), currency);
        if !self.proceeds.contains_key(&slot) {
            self.proceeds.insert(slot, 0);
        }
        self.state.flush();
        self.listings.flush();
        self.proceeds.flush();
        charge_storage(s0, 0, 1);
        SatchelEvent::Listed {
            token_id,
            listing_id: id,
            seller_id: owner,
            price,
            currency,
            listed_at: height,
            sig_count: listing.sig_count,
        }
        .emit();
        id
    }

    /// Owner only, exactly 1 yocto (S-03). Signing resumes immediately.
    #[payable]
    pub fn delist(&mut self, token_id: TokenId) {
        let owner = self.owner_of(&token_id);
        let mut st = self.token_state(&token_id);
        let listing = st.listing.take().unwrap_or_else(|| fail(ERR_NOT_LISTED));
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        ensure_one_yocto();
        self.state.insert(token_id.clone(), st);
        self.listings.remove(&token_id);
        SatchelEvent::Delisted { token_id, listing_id: listing.id, seller_id: listing.seller }.emit();
    }

    /// Anyone but the seller. Attach exactly `price`; the listing must be NEAR-priced and match
    /// `(listing_id, expected_sig_count)`. No post-listing cooldown.
    #[payable]
    pub fn buy(&mut self, token_id: TokenId, listing_id: u64, expected_sig_count: u64) {
        let buyer = env::predecessor_account_id();
        let attached = env::attached_deposit().as_yoctonear();
        let listing = self.check_buy(&token_id, listing_id, expected_sig_count, Currency::Near, attached, &buyer);
        self.execute_sale(token_id, listing, buyer);
    }

    /// Escrow fallback: pays out everything credited to the caller in `currency` (exactly 1 yocto, S-03).
    /// The tx result is the payout chain's result.
    #[payable]
    pub fn withdraw_proceeds(&mut self, currency: Currency) {
        ensure_one_yocto();
        let account = env::predecessor_account_id();
        let key = (account.clone(), currency);
        let owed = self.proceeds.get(&key).copied().unwrap_or(0);
        ensure(owed > 0, ERR_NOTHING_OWED);
        // S-01: zero the slot instead of removing it, so a re-credit after a failed withdraw needs no new storage.
        self.proceeds.insert(key, 0);
        let p = self.payout(account, currency, owed);
        env::promise_return(p);
    }

    /// Self only. MUST NOT panic. Re-credits `proceeds` if the payout promise failed; emits `payout`.
    #[private]
    pub fn on_payout(&mut self, account_id: AccountId, currency: Currency, amount: U128) {
        // S-13: act only as the callback of exactly one payout promise; anything else is a no-op (never a credit).
        if env::promise_results_count() != 1 {
            env::log_str("on_payout: ignored (expects exactly one promise result)");
            return;
        }
        // Ok or TooLong both mean the payout receipt succeeded; only Failed re-credits. The slot was reserved by
        // `list` (or zeroed by `withdraw_proceeds`), so this insert overwrites a fixed-size value (S-01).
        let ok = !matches!(env::promise_result_checked(0, 0), Err(near_sdk::PromiseError::Failed));
        if !ok {
            let key = (account_id.clone(), currency);
            let owed = self.proceeds.get(&key).copied().unwrap_or(0);
            self.proceeds.insert(key, owed.saturating_add(amount.0));
        }
        SatchelEvent::Payout { account_id, currency, amount, ok }.emit();
    }
}

/// Exactly 1 yoctoNEAR (S-03): a full-access-key guard that can never keep a larger deposit by mistake.
pub(crate) fn ensure_one_yocto() {
    if env::attached_deposit() != NearToken::from_yoctonear(1) {
        fail_with(ERR_DEPOSIT, "attach exactly 1 yocto");
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    /// Only allowlisted FTs may call (the configured USDC; wNEAR for deposits only). Panics on any mismatch (the FT then
    /// refunds 100 %). Success → "0" unused. Messages: `buy` (USDC), `offer` (USDC), `deposit` (any allowlisted FT).
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        let ft = env::predecessor_account_id();
        ensure(self.is_inside_ft(&ft), ERR_WRONG_TOKEN);
        let parsed = serde_json::from_str::<FtMsg>(&msg).unwrap_or_else(|_| fail(ERR_BAD_MSG));
        match parsed {
            FtMsg::Buy { token_id, listing_id, expected_sig_count } => {
                ensure(Some(&ft) == self.usdc.as_ref(), ERR_WRONG_TOKEN);
                let listing = self.check_buy(&token_id, listing_id, expected_sig_count, Currency::Usdc, amount.0, &sender_id);
                self.execute_sale(token_id, listing, sender_id);
            }
            FtMsg::Offer(m) => {
                ensure(Some(&ft) == self.usdc.as_ref(), ERR_WRONG_TOKEN);
                self.ft_offer(sender_id, m, amount.0);
            }
            FtMsg::Deposit(token_id) => self.ft_deposit(ft, sender_id, token_id, amount.0),
        }
        PromiseOrValue::Value(U128(0))
    }
}
