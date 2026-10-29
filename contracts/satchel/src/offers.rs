//! C4: offers (spec docs/specs/C4-C6.md §3). An offer escrows NEAR (`make_offer`) or USDC (`ft_on_transfer` msg
//! `{"offer":{…}}`) on any Satchel, bound to its `sig_count` and `inside_epoch`. The owner accepts it (NFT moves,
//! detached payout + proceeds fallback), the offerer cancels it, or anyone cancels it after expiry (refund to the
//! offerer). Each offer's storage is paid by its offerer; indexes are O(1) swap-remove lists.

use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, AccountId, IntoStorageKey};

use crate::errors::*;
use crate::events::SatchelEvent;
use crate::market::{MAX_OFFERS_PER_ACCOUNT, MAX_OFFER_TTL_MS};
use crate::types::{Currency, TokenId};
use crate::{charge_storage, Contract, ContractExt, MAX_PAGE};

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Offer {
    pub token_id: TokenId,
    pub offerer: AccountId,
    pub amount: u128,
    pub currency: Currency,
    pub expected_sig_count: u64,
    pub expected_inside_epoch: u64,
    pub expires_at_ms: u64,
    pub created_at_ms: u64,
    /// Positions in the per-token and per-offerer indexes (kept in sync by swap-remove).
    pub tpos: u32,
    pub apos: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct OfferView {
    pub id: u64,
    pub token_id: TokenId,
    pub offerer_id: AccountId,
    pub amount: U128,
    pub currency: Currency,
    pub expected_sig_count: u64,
    pub expected_inside_epoch: u64,
    pub expires_at_ms: u64,
    pub created_at_ms: u64,
}

/// `ft_on_transfer` msg body of a USDC offer.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct OfferMsg {
    pub token_id: TokenId,
    pub expected_sig_count: u64,
    pub expected_inside_epoch: u64,
    pub expires_at_ms: u64,
}

/// A list of offer ids per key with O(1) push and swap-remove, paged by position. Keys are token ids or account ids
/// (both borsh-encode as strings). Each offer stores its own position, so removal never scans.
#[near(serializers = [borsh])]
pub struct IdIndex {
    len: LookupMap<String, u32>,
    at: LookupMap<(String, u32), u64>,
}

impl IdIndex {
    pub fn new<S: IntoStorageKey>(len_prefix: S, at_prefix: S) -> Self {
        Self { len: LookupMap::new(len_prefix), at: LookupMap::new(at_prefix) }
    }

    pub fn len(&self, key: &str) -> u32 {
        self.len.get(key).copied().unwrap_or(0)
    }

    /// Appends `id`; returns its position.
    pub fn push(&mut self, key: &str, id: u64) -> u32 {
        let pos = self.len(key);
        self.at.insert((key.to_string(), pos), id);
        self.len.insert(key.to_string(), pos + 1);
        pos
    }

    /// Removes the entry at `pos` by moving the last entry into it. Returns `(moved_id, pos)` when an entry moved, so
    /// the caller can update that offer's stored position.
    pub fn remove(&mut self, key: &str, pos: u32) -> Option<(u64, u32)> {
        let n = self.len(key);
        if n == 0 || pos >= n {
            env::abort(); // positions are maintained by this module only; unreachable
        }
        let last = n - 1;
        let tail = self.at.remove(&(key.to_string(), last)).unwrap_or_else(|| env::abort());
        let moved = if pos != last {
            self.at.insert((key.to_string(), pos), tail);
            Some((tail, pos))
        } else {
            None
        };
        if last == 0 {
            self.len.remove(key);
        } else {
            self.len.insert(key.to_string(), last);
        }
        moved
    }

    pub fn page(&self, key: &str, from_index: u64, limit: u32) -> Vec<u64> {
        let n = self.len(key) as u64;
        let end = n.min(from_index.saturating_add(limit.min(MAX_PAGE) as u64));
        (from_index..end).filter_map(|i| self.at.get(&(key.to_string(), i as u32)).copied()).collect()
    }

    pub fn flush(&mut self) {
        self.len.flush();
        self.at.flush();
    }
}

fn offer_view(id: u64, o: &Offer) -> OfferView {
    OfferView {
        id,
        token_id: o.token_id.clone(),
        offerer_id: o.offerer.clone(),
        amount: U128(o.amount),
        currency: o.currency,
        expected_sig_count: o.expected_sig_count,
        expected_inside_epoch: o.expected_inside_epoch,
        expires_at_ms: o.expires_at_ms,
        created_at_ms: o.created_at_ms,
    }
}

impl Contract {
    /// Checks 1–7 of spec §3.1 (shared by NEAR and USDC offers), all before any write.
    fn check_offer(&self, offerer: &AccountId, m: &OfferMsg, amount: u128) {
        let owner = self.owner_of(&m.token_id);
        ensure(*offerer != owner, ERR_SELF_BUY);
        self.ensure_receiver(offerer);
        ensure(amount > 0, ERR_AMOUNT);
        let st = self.token_state(&m.token_id);
        ensure(
            st.sig_count == m.expected_sig_count && self.inside_epoch(&m.token_id) == m.expected_inside_epoch,
            ERR_OFFER_STALE,
        );
        let now = env::block_timestamp_ms();
        ensure(now < m.expires_at_ms && m.expires_at_ms <= now.saturating_add(MAX_OFFER_TTL_MS), ERR_OFFER_EXPIRY);
        ensure(self.market.by_account.len(offerer.as_str()) < MAX_OFFERS_PER_ACCOUNT, ERR_TOO_MANY_OFFERS);
    }

    /// Writes the offer, its index entries and the offerer's refund slot. The caller measures and charges storage.
    fn insert_offer(&mut self, offerer: AccountId, m: OfferMsg, amount: u128, currency: Currency) -> u64 {
        let id = self.market.next_offer_id;
        self.market.next_offer_id += 1;
        let tpos = self.market.by_token.push(&m.token_id, id);
        let apos = self.market.by_account.push(offerer.as_str(), id);
        let offer = Offer {
            token_id: m.token_id.clone(),
            offerer: offerer.clone(),
            amount,
            currency,
            expected_sig_count: m.expected_sig_count,
            expected_inside_epoch: m.expected_inside_epoch,
            expires_at_ms: m.expires_at_ms,
            created_at_ms: env::block_timestamp_ms(),
            tpos,
            apos,
        };
        self.market.offers.insert(id, offer);
        if currency == Currency::Near {
            self.market.totals.offers_near += amount;
        }
        // S-01 pattern: a failed refund re-credits proceeds[(offerer, currency)] by overwriting this slot.
        self.reserve_proceeds_slot(&offerer, currency);
        self.market.flush();
        self.proceeds.flush();
        SatchelEvent::OfferMade {
            offer_id: id,
            token_id: m.token_id,
            offerer_id: offerer,
            amount: U128(amount),
            currency,
            expected_sig_count: m.expected_sig_count,
            expected_inside_epoch: m.expected_inside_epoch,
            expires_at_ms: m.expires_at_ms,
        }
        .emit();
        id
    }

    pub(crate) fn reserve_proceeds_slot(&mut self, account: &AccountId, currency: Currency) {
        let slot = (account.clone(), currency);
        if !self.proceeds.contains_key(&slot) {
            self.proceeds.insert(slot, 0);
        }
    }

    /// Removes the offer and its index entries (fixing the position of any entry that moved). Returns the offer.
    fn take_offer(&mut self, id: u64) -> Offer {
        let o = self.market.offers.remove(&id).unwrap_or_else(|| fail(ERR_NO_OFFER));
        if let Some((moved, pos)) = self.market.by_token.remove(&o.token_id, o.tpos)
            && let Some(m) = self.market.offers.get_mut(&moved) {
                m.tpos = pos;
            }
        if let Some((moved, pos)) = self.market.by_account.remove(o.offerer.as_str(), o.apos)
            && let Some(m) = self.market.offers.get_mut(&moved) {
                m.apos = pos;
            }
        if o.currency == Currency::Near {
            self.market.totals.offers_near -= o.amount;
        }
        o
    }

    /// USDC offer through `ft_on_transfer` msg `{"offer":{…}}`; the predecessor is already checked to be USDC.
    /// Storage is paid from the offerer's storage credit.
    pub(crate) fn ft_offer(&mut self, offerer: AccountId, m: OfferMsg, amount: u128) {
        self.check_offer(&offerer, &m, amount);
        let s0 = env::storage_usage();
        self.insert_offer(offerer.clone(), m, amount, Currency::Usdc);
        self.charge_credit(&offerer, s0);
    }
}

#[near]
impl Contract {
    /// Anyone but the owner. A NEAR offer of exactly `amount`; attach `amount + storage` (excess refunded). The expected
    /// values must equal the token's current `sig_count` and `inside_epoch`. Returns the offer id.
    #[payable]
    pub fn make_offer(
        &mut self,
        token_id: TokenId,
        amount: U128,
        expected_sig_count: u64,
        expected_inside_epoch: u64,
        expires_at_ms: u64,
    ) -> u64 {
        let offerer = env::predecessor_account_id();
        let m = OfferMsg { token_id, expected_sig_count, expected_inside_epoch, expires_at_ms };
        self.check_offer(&offerer, &m, amount.0);
        ensure(env::attached_deposit().as_yoctonear() > amount.0, ERR_DEPOSIT);
        let s0 = env::storage_usage();
        let id = self.insert_offer(offerer, m, amount.0, Currency::Near);
        charge_storage(s0, amount.0, 0);
        id
    }

    /// The offerer at any time, or anyone once the offer has expired. Exactly 1 yocto. The refund goes to the offerer
    /// through the payout path (a failed refund is credited to `proceeds_of(offerer)`); the tx result is that chain.
    #[payable]
    pub fn cancel_offer(&mut self, offer_id: u64) {
        let o = self.market.offers.get(&offer_id).cloned().unwrap_or_else(|| fail(ERR_NO_OFFER));
        crate::sale::ensure_one_yocto();
        let by = env::predecessor_account_id();
        ensure(by == o.offerer || env::block_timestamp_ms() >= o.expires_at_ms, ERR_NOT_OFFERER);
        let o = self.take_offer(offer_id);
        SatchelEvent::OfferCancelled {
            offer_id,
            token_id: o.token_id,
            offerer_id: o.offerer.clone(),
            by_id: by,
            amount: U128(o.amount),
            currency: o.currency,
        }
        .emit();
        let p = self.payout(o.offerer, o.currency, o.amount);
        env::promise_return(p);
    }

    /// Owner only, exactly 1 yocto. Requires the offer unexpired, `sig_count` and `inside_epoch` unchanged and the
    /// quiet period over. Delists if listed, moves the NFT to the offerer, runs `on_owner_change`, pays the seller
    /// (detached payout + proceeds fallback).
    #[payable]
    pub fn accept_offer(&mut self, offer_id: u64) {
        let o = self.market.offers.get(&offer_id).cloned().unwrap_or_else(|| fail(ERR_NO_OFFER));
        let owner = self.owner_of(&o.token_id);
        ensure(env::predecessor_account_id() == owner, ERR_NOT_OWNER);
        crate::sale::ensure_one_yocto();
        ensure(o.offerer != owner, ERR_SELF_BUY);
        ensure(env::block_timestamp_ms() < o.expires_at_ms, ERR_OFFER_EXPIRED);
        let mut st = self.token_state(&o.token_id);
        ensure(
            st.sig_count == o.expected_sig_count && self.inside_epoch(&o.token_id) == o.expected_inside_epoch,
            ERR_OFFER_STALE,
        );
        let listable_at = Contract::listable_at(&st);
        if env::block_height() < listable_at {
            fail_with(ERR_QUIET_PERIOD, &["acceptable at block ", &listable_at.to_string()].concat());
        }
        // ── all checks passed; one receipt from here ──
        let s0 = env::storage_usage();
        let token_id = o.token_id.clone();
        if let Some(listing) = st.listing.take() {
            self.state.insert(token_id.clone(), st);
            self.listings.remove(&token_id);
            SatchelEvent::Delisted { token_id: token_id.clone(), listing_id: listing.id, seller_id: listing.seller }.emit();
        }
        let o = self.take_offer(offer_id);
        self.tokens.internal_transfer(&owner, &o.offerer, &token_id, None, Some("offer".to_string()));
        self.on_owner_change(&token_id, "sale"); // C5 reset rule: an accepted offer is a sale
        // The freed offer record pays for this slot, so the payout's re-credit never needs contract-paid storage.
        self.reserve_proceeds_slot(&owner, o.currency);
        SatchelEvent::OfferAccepted {
            offer_id,
            token_id,
            seller_id: owner.clone(),
            buyer_id: o.offerer,
            amount: U128(o.amount),
            currency: o.currency,
        }
        .emit();
        self.payout(owner, o.currency, o.amount); // detached: never the returned promise
        // M-01: last, after the NEAR payout is deducted. The freed offer record usually outweighs the new holder's
        // entries (measured −194 B), so this only bites if an accept ever grows storage the buffer can't pay.
        self.ensure_solvent(s0);
    }

    pub fn offer(&self, offer_id: u64) -> Option<OfferView> {
        self.market.offers.get(&offer_id).map(|o| offer_view(offer_id, o))
    }

    /// Open offers on `token_id`, positions `from_index ..` (at most `limit`, capped at 50).
    pub fn offers_for(&self, token_id: TokenId, from_index: u64, limit: u32) -> Vec<OfferView> {
        self.offer_page(self.market.by_token.page(&token_id, from_index, limit))
    }

    /// Open offers made by `account_id` (at most 20 exist), positions `from_index ..` (at most `limit`, capped at 50).
    pub fn offers_by(&self, account_id: AccountId, from_index: u64, limit: u32) -> Vec<OfferView> {
        self.offer_page(self.market.by_account.page(account_id.as_str(), from_index, limit))
    }
}

impl Contract {
    fn offer_page(&self, ids: Vec<u64>) -> Vec<OfferView> {
        ids.into_iter().filter_map(|id| self.market.offers.get(&id).map(|o| offer_view(id, o))).collect()
    }
}
