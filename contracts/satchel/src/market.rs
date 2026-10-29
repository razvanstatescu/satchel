//! Shared state of C4 (offers) and C6 (assets inside a Satchel), spec docs/specs/C4-C6.md: the `Market` field, the FT
//! allowlist, the storage credit that pays storage inside `ft_on_transfer`, and the NEAR totals (invariant I-M1/I-M2).

use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, AccountId};

use crate::errors::*;
use crate::events::SatchelEvent;
use crate::inside::Inside;
use crate::offers::{IdIndex, Offer};
use crate::types::TokenId;
use crate::{promise, Contract, ContractExt, StorageKey};

/// wNEAR on testnet (checked read-only on 2026-10-29: ft_metadata = wNEAR, 24 decimals). Allowlisted for deposits only.
pub const WNEAR: &str = "wrap.testnet";
/// Open offers one account may have at a time (spec C4-C6 §3.5). There is deliberately no per-token cap.
pub const MAX_OFFERS_PER_ACCOUNT: u32 = 20;
/// An offer may expire at most 90 days after it is made.
pub const MAX_OFFER_TTL_MS: u64 = 90 * 24 * 3600 * 1000;

/// The NEAR the contract owes through C4/C6 (each is the exact sum of its per-entry values, I-M2).
#[near(serializers = [borsh])]
#[derive(Clone, Copy, Default, Debug, PartialEq)]
pub struct MarketTotals {
    pub inside_near: u128,
    pub offers_near: u128,
    pub storage_credit: u128,
}

#[near(serializers = [borsh])]
pub struct Market {
    pub(crate) inside: LookupMap<TokenId, Inside>,
    pub(crate) inside_ft: LookupMap<(TokenId, AccountId), u128>,
    pub(crate) offers: LookupMap<u64, Offer>,
    pub(crate) by_token: IdIndex,
    pub(crate) by_account: IdIndex,
    pub(crate) storage_credit: LookupMap<AccountId, u128>,
    pub(crate) next_offer_id: u64,
    pub(crate) totals: MarketTotals,
}

impl Market {
    pub fn new() -> Self {
        Self {
            inside: LookupMap::new(StorageKey::Inside),
            inside_ft: LookupMap::new(StorageKey::InsideFt),
            offers: LookupMap::new(StorageKey::Offers),
            by_token: IdIndex::new(StorageKey::OffersByTokenLen, StorageKey::OffersByToken),
            by_account: IdIndex::new(StorageKey::OffersByAccountLen, StorageKey::OffersByAccount),
            storage_credit: LookupMap::new(StorageKey::StorageCredit),
            next_offer_id: 1,
            totals: MarketTotals::default(),
        }
    }

    /// Flush every collection; call before measuring storage (spec §5.4 step 3).
    pub fn flush(&mut self) {
        self.inside.flush();
        self.inside_ft.flush();
        self.offers.flush();
        self.by_token.flush();
        self.by_account.flush();
        self.storage_credit.flush();
    }
}

impl Default for Market {
    fn default() -> Self {
        Self::new()
    }
}

impl Contract {
    /// The FTs that may be deposited inside a Satchel: the configured USDC and wNEAR (spec C4-C6 §2.3).
    pub(crate) fn inside_fts(&self) -> Vec<AccountId> {
        let mut v: Vec<AccountId> = self.usdc.iter().cloned().collect();
        let w: AccountId = WNEAR.parse().unwrap_or_else(|_| env::abort());
        if !v.contains(&w) {
            v.push(w);
        }
        v
    }

    pub(crate) fn is_inside_ft(&self, ft: &AccountId) -> bool {
        Some(ft) == self.usdc.as_ref() || ft.as_str() == WNEAR
    }

    /// Storage charging inside `ft_on_transfer` (which carries no NEAR): the bytes added since `initial_usage` are paid
    /// from `account`'s storage credit. Call after every touched collection was flushed. Panics ERR_STORAGE_CREDIT when
    /// short (the FT then refunds 100 %). The debit only overwrites an existing slot, so it adds no bytes itself.
    pub(crate) fn charge_credit(&mut self, account: &AccountId, initial_usage: u64) {
        let used = env::storage_usage().saturating_sub(initial_usage) as u128;
        if used == 0 {
            return;
        }
        let cost = used * env::storage_byte_cost().as_yoctonear();
        let have = self.market.storage_credit.get(account).copied().unwrap_or(0);
        if have < cost {
            fail_with(ERR_STORAGE_CREDIT, &["prepay_storage ≥ ", &(cost - have).to_string(), " yocto more"].concat());
        }
        self.market.storage_credit.insert(account.clone(), have - cost);
        self.market.storage_credit.flush();
        self.market.totals.storage_credit -= cost;
    }
}

#[near]
impl Contract {
    /// Anyone, payable. Credits `attached − storage` to `account_id` (default: the caller); only a new credit slot costs
    /// storage. The credit pays storage in `ft_on_transfer` (FT deposits, USDC offers). Returns the new credit.
    #[payable]
    pub fn prepay_storage(&mut self, account_id: Option<AccountId>) -> U128 {
        let account = account_id.unwrap_or_else(env::predecessor_account_id);
        let attached = env::attached_deposit().as_yoctonear();
        ensure(attached > 0, ERR_DEPOSIT);
        let s0 = env::storage_usage();
        let have = self.market.storage_credit.get(&account).copied().unwrap_or(0);
        self.market.storage_credit.insert(account.clone(), have);
        self.market.storage_credit.flush();
        let cost = env::storage_usage().saturating_sub(s0) as u128 * env::storage_byte_cost().as_yoctonear();
        if attached <= cost {
            fail_with(ERR_DEPOSIT, &["attach > ", &cost.to_string(), " yocto"].concat());
        }
        let credited = attached - cost;
        let now = have + credited;
        self.market.storage_credit.insert(account, now);
        self.market.storage_credit.flush();
        self.market.totals.storage_credit += credited;
        U128(now)
    }

    /// EXACTLY 1 yocto. Pays out the caller's whole unused credit; the slot is kept at 0. The tx result is the transfer.
    #[payable]
    pub fn withdraw_storage_credit(&mut self) {
        crate::sale::ensure_one_yocto();
        let account = env::predecessor_account_id();
        let have = self.market.storage_credit.get(&account).copied().unwrap_or(0);
        ensure(have > 0, ERR_NOTHING_OWED);
        self.market.storage_credit.insert(account.clone(), 0);
        self.market.totals.storage_credit -= have;
        SatchelEvent::StorageCreditWithdrawn { account_id: account.clone(), amount: U128(have) }.emit();
        let p = promise::transfer(&account, have);
        env::promise_return(p);
    }

    pub fn storage_credit_of(&self, account_id: AccountId) -> U128 {
        U128(self.market.storage_credit.get(&account_id).copied().unwrap_or(0))
    }

    pub fn market_config(&self) -> MarketConfigView {
        MarketConfigView {
            inside_fts: self.inside_fts(),
            max_offers_per_account: MAX_OFFERS_PER_ACCOUNT,
            max_offer_ttl_ms: MAX_OFFER_TTL_MS,
            next_offer_id: self.market.next_offer_id,
        }
    }

    pub fn market_totals(&self) -> MarketTotalsView {
        let t = self.market.totals;
        MarketTotalsView {
            inside_near: U128(t.inside_near),
            offers_near: U128(t.offers_near),
            storage_credit: U128(t.storage_credit),
        }
    }
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MarketConfigView {
    pub inside_fts: Vec<AccountId>,
    pub max_offers_per_account: u32,
    pub max_offer_ttl_ms: u64,
    pub next_offer_id: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MarketTotalsView {
    pub inside_near: U128,
    pub offers_near: U128,
    pub storage_credit: U128,
}
