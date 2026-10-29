//! NEP-297 events, `standard: "satchel"`, `version: "1.0.0"` (spec §5.13). Emitted after every require.

use near_sdk::json_types::U128;
use near_sdk::serde_json::Value;
use near_sdk::{near, AccountId};

use crate::types::{Chain, Currency, SigStatus, TokenId};

#[near(event_json(standard = "satchel"))]
pub enum SatchelEvent {
    #[event_version("1.0.0")]
    SignRequested {
        token_id: TokenId,
        owner_id: AccountId,
        request_id: u64,
        first_seq: u64,
        count: u64,
        chain: Chain,
        path: String,
        domain_id: u64,
        height: u64,
        payloads: Vec<String>,
        preimages: Vec<String>,
        btc_outputs: Option<String>,
        details: Vec<Value>,
    },
    #[event_version("1.0.0")]
    SignResolved { token_id: TokenId, first_seq: u64, count: u64, statuses: Vec<SigStatus> },
    #[event_version("1.0.0")]
    Listed {
        token_id: TokenId,
        listing_id: u64,
        seller_id: AccountId,
        price: U128,
        currency: Currency,
        listed_at: u64,
        sig_count: u64,
    },
    #[event_version("1.0.0")]
    Delisted { token_id: TokenId, listing_id: u64, seller_id: AccountId },
    #[event_version("1.0.0")]
    Sold { token_id: TokenId, listing_id: u64, seller_id: AccountId, buyer_id: AccountId, price: U128, currency: Currency },
    #[event_version("1.0.0")]
    Payout { account_id: AccountId, currency: Currency, amount: U128, ok: bool },
    // ── C6 (docs/specs/C4-C6.md §5) ──
    #[event_version("1.0.0")]
    InsideDeposit { token_id: TokenId, sender_id: AccountId, ft: Option<AccountId>, amount: U128 },
    #[event_version("1.0.0")]
    InsideWithdraw {
        token_id: TokenId,
        owner_id: AccountId,
        receiver_id: AccountId,
        ft: Option<AccountId>,
        amount: U128,
        inside_epoch: u64,
    },
    #[event_version("1.0.0")]
    InsideWithdrawResolved { token_id: TokenId, ft: Option<AccountId>, amount: U128, ok: bool },
    #[event_version("1.0.0")]
    StorageCreditWithdrawn { account_id: AccountId, amount: U128 },
    // ── C4 ──
    #[event_version("1.0.0")]
    OfferMade {
        offer_id: u64,
        token_id: TokenId,
        offerer_id: AccountId,
        amount: U128,
        currency: Currency,
        expected_sig_count: u64,
        expected_inside_epoch: u64,
        expires_at_ms: u64,
    },
    #[event_version("1.0.0")]
    OfferCancelled { offer_id: u64, token_id: TokenId, offerer_id: AccountId, by_id: AccountId, amount: U128, currency: Currency },
    #[event_version("1.0.0")]
    OfferAccepted { offer_id: u64, token_id: TokenId, seller_id: AccountId, buyer_id: AccountId, amount: U128, currency: Currency },
}
