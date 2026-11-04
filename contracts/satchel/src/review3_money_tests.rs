//! Review 3 (escrow and money flows), adversarial. Two kinds of test:
//!
//! * `r3_m1_*`: a candidate that turned out unreachable: a USDC buy pays the `ft_transfer` yocto from the contract's
//!   own NEAR, and `ensure_solvent` returns early on level storage; but no USDC buy is ever level, so I-M1 holds.
//! * `prop_r3_*`: a conservation fuzz over EVERY money path (NEAR and USDC listings and buys, NEAR and FT deposits and
//!   withdrawals with wNEAR too, NEAR and USDC offers, cancel by the offerer and by anyone after expiry, accept,
//!   proceeds withdrawals in both currencies, storage credit prepay and withdraw, gifts, signatures), with every
//!   payout/refund/withdrawal callback resolved as delivered or failed. Unlike the existing model test it simulates
//!   the contract's real NEAR balance and FT balances across calls and ROLLS BACK refused calls (snapshot of the
//!   mocked trie + `state_read`), so it can check conservation, not just bookkeeping.

use std::collections::{BTreeMap, HashMap};
use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_sdk::json_types::U128;
use near_sdk::mock::{with_mocked_blockchain, MockAction, MockedBlockchain};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
use near_sdk::{env, AccountId, Gas, NearToken, PromiseOrValue, PromiseResult, RuntimeFeesConfig};
use proptest::prelude::*;

use crate::market::WNEAR;
use crate::parse::evm;
use crate::*;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const T0: u64 = 1_793_000_000_000; // ms
const DAY: u64 = 86_400_000;
const H0: u64 = 2_000;
/// Where the simulated chain's storage usage starts (any value works; the mock default).
const BASE_USAGE: u64 = 1024 * 300;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("satchel.testnet")
}
fn mpc() -> AccountId {
    acc("mpc.testnet")
}
fn usdc() -> AccountId {
    acc("usdc.testnet")
}
fn wnear() -> AccountId {
    acc(WNEAR)
}
fn byte_cost() -> u128 {
    env::storage_byte_cost().as_yoctonear()
}

fn panic_msg<R>(f: impl FnOnce() -> R) -> Option<String> {
    let err = catch_unwind(AssertUnwindSafe(f)).err()?;
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    Some(match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    })
}

/// Installs a fresh mocked call context over `storage` (the trie carried between calls).
#[allow(clippy::too_many_arguments)]
fn install(pred: &AccountId, deposit: u128, height: u64, balance: u128, usage: u64, results: Vec<PromiseResult>, storage: HashMap<Vec<u8>, Vec<u8>>) {
    let ctx = VMContextBuilder::new()
        .current_account_id(me())
        .signer_account_id(pred.clone())
        .predecessor_account_id(pred.clone())
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(300))
        .block_height(height)
        .block_timestamp(now_ms(height) * 1_000_000)
        .account_balance(NearToken::from_yoctonear(balance))
        .storage_usage(usage)
        .build();
    env::set_blockchain_interface(MockedBlockchain::new(
        ctx,
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        results,
        storage,
        Default::default(),
        None,
    ));
}
fn take_trie() -> HashMap<Vec<u8>, Vec<u8>> {
    with_mocked_blockchain(|b| b.take_storage())
}
/// One simulated minute per block: offers (1 day) expire after 1,440 blocks.
fn now_ms(height: u64) -> u64 {
    T0 + height.saturating_sub(H0) * 60_000
}

// ── R3-M-1: the USDC buy's 1-yocto ft_transfer deposit comes out of the contract's own NEAR ───────────────────

/// A fresh contract where `seller` lists token `id` for 4 USDC; `holder_too` makes the buyer an existing holder.
/// bob has 1 NEAR inside another token (escrow). Then a USDC buy by `buyer` runs with `spare` yocto above
/// stake + escrow (None = plenty). Returns (panic, bytes the buy grew, free − escrow after it).
fn usdc_buy_case(seller: &AccountId, buyer: &AccountId, holder_too: bool, spare: Option<u128>) -> (Option<String>, i64, i128) {
    usdc_buy_case2(seller, buyer, holder_too, true, spare)
}

/// As `usdc_buy_case`; `seller_keeps` = the seller holds a second token (else the sale empties their per-owner set).
fn usdc_buy_case2(seller: &AccountId, buyer: &AccountId, holder_too: bool, seller_keeps: bool, spare: Option<u128>) -> (Option<String>, i64, i128) {
    install(&acc("team.testnet"), 0, H0, 1_000_000 * ONE_NEAR, BASE_USAGE, vec![], HashMap::new());
    let mut c = Contract::new(mpc(), Some(usdc()), "https://satchel.example/api/card/".into());
    let mint = |c: &mut Contract, to: &AccountId| {
        let t = take_trie();
        install(&acc("team.testnet"), 20 * MILLI, H0, 1_000_000 * ONE_NEAR, BASE_USAGE, vec![], t);
        c.nft_mint(to.clone()).token_id
    };
    let id = mint(&mut c, seller);
    let dave = acc("dave.testnet");
    let other = mint(&mut c, if seller_keeps { seller } else { &dave });
    if holder_too {
        mint(&mut c, buyer);
    }
    let t = take_trie();
    install(&acc("bob.testnet"), ONE_NEAR, H0, 1_000_000 * ONE_NEAR, BASE_USAGE, vec![], t);
    c.deposit_near(other);
    let t = take_trie();
    install(seller, 10 * MILLI, H0, 1_000_000 * ONE_NEAR, BASE_USAGE, vec![], t);
    let lid = c.list(id.clone(), U128(4_000_000), Currency::Usdc);
    c.flush_all();
    let escrow = c.market.totals.escrow_near();
    let bal = BASE_USAGE as u128 * byte_cost() + escrow + spare.unwrap_or(1000 * ONE_NEAR);
    let t = take_trie();
    install(&usdc(), 0, H0 + 1, bal, BASE_USAGE, vec![], t);
    let msg = json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":0}}).to_string();
    let r = panic_msg(|| c.ft_on_transfer(buyer.clone(), U128(4_000_000), msg));
    c.flush_all();
    let grew = env::storage_usage() as i64 - BASE_USAGE as i64;
    let free = env::account_balance().as_yoctonear() as i128 - (env::storage_usage() as u128 * byte_cost()) as i128;
    (r, grew, free - c.market.totals.escrow_near() as i128)
}

/// Pins the mechanism: a USDC buy carries no NEAR, yet the payout `ft_transfer` attaches 1 yocto, so every USDC buy
/// lowers `free − escrow_near` by exactly `1 + growth × byte_cost` (a NEAR buy, an accept and a transfer never take
/// that yocto from the contract: their caller attached it, or the price pays it).
#[test]
fn r3_m1_usdc_buy_spends_one_yocto_of_contract_near() {
    let seller = acc("alice.testnet");
    let buyer = acc("carol.testnet");
    let (r, g, slack) = usdc_buy_case(&seller, &buyer, false, Some(1000 * ONE_NEAR));
    assert_eq!(r, None);
    assert_eq!(slack, 1000 * ONE_NEAR as i128 - 1 - g as i128 * byte_cost() as i128, "Δspare = −1 yocto − growth (g = {g} B)");
}

/// Guard for the candidate above (NOT a finding). The yocto could only reach escrow if a USDC buy kept storage exactly
/// level, because `ensure_solvent` returns early then; any freed byte (1e19 yocto) dwarfs it, and any growth is
/// checked with the yocto already deducted. Measured: a first-time buyer nets 2·(len(buyer) − len(seller)) − 35 B
/// (always odd); an existing holder, or a seller whose last token this is, nets ≤ −100 B. So no USDC buy is ever
/// level and I-M1 can't lose that yocto. This pins it on a grid covering both parities of both id lengths; if a
/// later change makes a level USDC buy possible, it fails and points at the early return.
#[test]
fn r3_m1_no_usdc_buy_keeps_storage_level() {
    // both parities of a short and of the longest ids (54 + 8 = 62, 55 + 8 = 63 chars): the cases the parity argument
    // needs. The full grid [3, 4, 9, 10, 20, 21, 40, 41, 54, 55] passed on 2026-11-04 (≈ 47 s); this keeps the default run fast.
    let lens = [3usize, 4, 54, 55];
    for slen in lens {
        for blen in lens {
            for holder_too in [false, true] {
                for seller_keeps in [true, false] {
                    let seller = acc(&format!("s{}.testnet", "a".repeat(slen - 1)));
                    let buyer = acc(&format!("b{}.testnet", "c".repeat(blen - 1)));
                    let (r, g, _) = usdc_buy_case2(&seller, &buyer, holder_too, seller_keeps, None);
                    assert_eq!(r, None);
                    assert_ne!(g, 0, "level USDC buy: seller {slen} chars, buyer {blen}, holder {holder_too}, seller keeps {seller_keeps}");
                }
            }
        }
    }
}

// ── conservation fuzz over every money path ──────────────────────────────────────────────────────────────────

fn people() -> Vec<AccountId> {
    vec![
        acc("alice.testnet"),
        acc("bob.testnet"),
        acc("carol.testnet"),
        acc("dave.testnet"),
        // the longest id NEAR allows: a first-time holder's entries are as large as they get
        acc(&format!("e{}.testnet", "x".repeat(55))),
    ]
}

#[derive(Clone, Debug)]
enum Op {
    Mint { to: usize },
    List { t: usize, usdc: bool, price: u128 },
    Delist { t: usize },
    BuyNear { t: usize, who: usize, wrong: bool },
    BuyUsdc { t: usize, who: usize, wrong: bool },
    DepositNear { t: usize, who: usize, amount: u128 },
    DepositFt { t: usize, who: usize, wnear: bool, amount: u128 },
    WithdrawNear { t: usize, frac: u8, to_other: Option<usize> },
    WithdrawFt { t: usize, wnear: bool, frac: u8, to_other: Option<usize> },
    OfferNear { t: usize, who: usize, amount: u128, stale: bool },
    OfferUsdc { t: usize, who: usize, amount: u128, stale: bool },
    Cancel { pick: usize, by: usize },
    Accept { pick: usize },
    WithdrawProceeds { who: usize, usdc: bool },
    Prepay { who: usize, for_whom: usize, amount: u128 },
    WithdrawCredit { who: usize },
    Transfer { t: usize, to: usize },
    Sign { t: usize },
    Tick { blocks: u64 },
}

fn op_strategy() -> impl Strategy<Value = Op> {
    let t = 0usize..6;
    let who = 0usize..5;
    let near = 1u128..4 * ONE_NEAR;
    let ft = 1u128..10_000_000;
    prop_oneof![
        who.clone().prop_map(|to| Op::Mint { to }),
        (t.clone(), any::<bool>(), 1u128..3 * ONE_NEAR).prop_map(|(t, usdc, p)| Op::List { t, usdc, price: if usdc { p % 9_000_000 + 1 } else { p } }),
        t.clone().prop_map(|t| Op::Delist { t }),
        (t.clone(), who.clone(), prop::bool::weighted(0.1)).prop_map(|(t, who, wrong)| Op::BuyNear { t, who, wrong }),
        (t.clone(), who.clone(), prop::bool::weighted(0.1)).prop_map(|(t, who, wrong)| Op::BuyUsdc { t, who, wrong }),
        (t.clone(), who.clone(), near.clone()).prop_map(|(t, who, amount)| Op::DepositNear { t, who, amount: amount + MILLI }),
        (t.clone(), who.clone(), any::<bool>(), ft.clone()).prop_map(|(t, who, wnear, amount)| Op::DepositFt { t, who, wnear, amount }),
        (t.clone(), any::<u8>(), proptest::option::weighted(0.3, who.clone())).prop_map(|(t, frac, to_other)| Op::WithdrawNear { t, frac, to_other }),
        (t.clone(), any::<bool>(), any::<u8>(), proptest::option::weighted(0.3, who.clone())).prop_map(|(t, wnear, frac, to_other)| Op::WithdrawFt { t, wnear, frac, to_other }),
        (t.clone(), who.clone(), near, prop::bool::weighted(0.1)).prop_map(|(t, who, amount, stale)| Op::OfferNear { t, who, amount, stale }),
        (t.clone(), who.clone(), ft, prop::bool::weighted(0.1)).prop_map(|(t, who, amount, stale)| Op::OfferUsdc { t, who, amount, stale }),
        (any::<usize>(), 0usize..6).prop_map(|(pick, by)| Op::Cancel { pick, by }),
        any::<usize>().prop_map(|pick| Op::Accept { pick }),
        (who.clone(), any::<bool>()).prop_map(|(who, usdc)| Op::WithdrawProceeds { who, usdc }),
        (who.clone(), who.clone(), 1u128..20 * MILLI).prop_map(|(who, for_whom, amount)| Op::Prepay { who, for_whom, amount }),
        who.clone().prop_map(|who| Op::WithdrawCredit { who }),
        (t.clone(), who).prop_map(|(t, to)| Op::Transfer { t, to }),
        t.prop_map(|t| Op::Sign { t }),
        prop_oneof![Just(1u64), Just(260u64), Just(1_500u64)].prop_map(|blocks| Op::Tick { blocks }),
    ]
}

/// The simulated chain: the contract's NEAR balance and storage usage at rest (no transfer in flight: every
/// payout is resolved before the next call), and its balance in each FT.
struct Sim {
    c: Contract,
    bal: u128,
    usage: u64,
    height: u64,
    ft: BTreeMap<AccountId, u128>,
    toks: Vec<String>,
}

/// One callback the last call scheduled: (method, args).
fn scheduled_callbacks() -> Vec<(String, Value)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| r.actions.into_iter())
        .filter_map(|a| match a {
            MockAction::FunctionCallWeight { method_name, args, .. } => {
                let m = String::from_utf8(method_name).unwrap();
                (m == "on_payout" || m == "on_inside_withdraw").then(|| (m, serde_json::from_slice::<Value>(&args).unwrap()))
            }
            _ => None,
        })
        .collect()
}

impl Sim {
    fn new() -> Self {
        install(&acc("team.testnet"), 0, H0, 0, BASE_USAGE, vec![], HashMap::new());
        let mut c = Contract::new(mpc(), Some(usdc()), "https://satchel.example/api/card/".into());
        c.flush_all();
        let usage = env::storage_usage();
        // a 1,000 NEAR buffer above the stake: contract-paid growth (S-02) never gets near it
        let bal = usage as u128 * byte_cost() + 1000 * ONE_NEAR;
        let mut s = Sim { c, bal, usage, height: H0, ft: BTreeMap::new(), toks: vec![] };
        s.ft.insert(usdc(), 0);
        s.ft.insert(wnear(), 0);
        s
    }

    fn spare(&self) -> i128 {
        self.bal as i128 - (self.usage as u128 * byte_cost()) as i128 - self.c.market.totals.escrow_near() as i128
    }

    /// Runs one call as `pred` attaching `deposit`. On a panic the trie and the contract are rolled back (the real
    /// runtime does that; the mock doesn't) and the message is returned. On success the balance and usage move on.
    fn call<R>(&mut self, pred: &AccountId, deposit: u128, f: impl FnOnce(&mut Contract) -> R) -> Result<(R, i64), String> {
        self.c.flush_all();
        env::state_write(&self.c);
        let snap = take_trie();
        install(pred, deposit, self.height, self.bal, self.usage, vec![], snap.clone());
        let c = &mut self.c;
        match catch_unwind(AssertUnwindSafe(|| f(c))) {
            Ok(r) => {
                self.c.flush_all();
                let usage = env::storage_usage();
                let grew = usage as i64 - self.usage as i64;
                self.usage = usage;
                self.bal = env::account_balance().as_yoctonear();
                Ok((r, grew))
            }
            Err(e) => {
                let msg = e.downcast_ref::<String>().cloned().or_else(|| e.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
                install(pred, 0, self.height, self.bal, self.usage, vec![], snap);
                self.c = env::state_read::<Contract>().expect("state");
                Err(msg)
            }
        }
    }

    /// Resolves every payout / refund / withdrawal callback the last call scheduled, delivered or failed per `fails`.
    /// A failed transfer's deposit is refunded to the contract (NEAR, or the FT call's 1 yocto) before the callback
    /// runs; a delivered FT transfer lowers the contract's FT balance (it must never go below 0). Callbacks must never
    /// panic and never change storage usage (I-M6).
    fn resolve(&mut self, fails: &mut impl Iterator<Item = bool>) -> Result<(), TestCaseError> {
        for (method, args) in scheduled_callbacks() {
            let fail = fails.next().unwrap_or(false);
            let amount: u128 = args["amount"].as_str().unwrap().parse().unwrap();
            let ft: Option<AccountId> = match method.as_str() {
                "on_payout" => (args["currency"] == "usdc").then(usdc),
                _ => args["ft"].as_str().map(acc),
            };
            if fail {
                self.bal += if ft.is_some() { 1 } else { amount };
            } else if let Some(f) = &ft {
                let b = self.ft.get_mut(f).unwrap();
                *b = b.checked_sub(amount).ok_or_else(|| TestCaseError::fail(format!("contract sent {amount} of {f} it never received")))?;
            }
            let usage0 = self.usage;
            let results = vec![if fail { PromiseResult::Failed } else { PromiseResult::Successful(vec![]) }];
            self.c.flush_all();
            let t = take_trie();
            install(&me(), 0, self.height, self.bal, self.usage, results, t);
            let c = &mut self.c;
            let r = catch_unwind(AssertUnwindSafe(|| match method.as_str() {
                "on_payout" => {
                    let cur: Currency = serde_json::from_value(args["currency"].clone()).unwrap();
                    c.on_payout(acc(args["account_id"].as_str().unwrap()), cur, U128(amount));
                }
                _ => {
                    let ok = c.on_inside_withdraw(args["token_id"].as_str().unwrap().to_string(), args["ft"].as_str().map(acc), U128(amount));
                    assert_eq!(ok, !fail);
                }
            }));
            prop_assert!(r.is_ok(), "callback {} panicked", method);
            self.c.flush_all();
            prop_assert_eq!(env::storage_usage(), usage0, "callback {} changed storage (I-M6)", method);
            prop_assert_eq!(env::account_balance().as_yoctonear(), self.bal, "a callback moved NEAR");
        }
        Ok(())
    }

    fn tok(&self, t: usize) -> String {
        self.toks[t % self.toks.len()].clone()
    }

    /// The `t`-th token (mod) among those that satisfy `keep`, else the plain `t`-th: biases buys toward listed
    /// tokens and withdrawals toward funded, unlisted ones so the success paths run often.
    fn tok_where(&self, t: usize, keep: impl Fn(&Contract, &String) -> bool) -> String {
        let cands: Vec<&String> = self.toks.iter().filter(|id| keep(&self.c, id)).collect();
        if cands.is_empty() { self.tok(t) } else { cands[t % cands.len()].clone() }
    }

    /// Every invariant, at rest.
    fn check(&mut self, ppl: &[AccountId]) -> Result<(), TestCaseError> {
        self.c.flush_all();
        let c = &self.c;
        // I-M2: the NEAR totals equal the per-entry sums
        let inside_near: u128 = self.toks.iter().map(|t| c.market.inside.get(t).map(|i| i.near).unwrap_or(0)).sum();
        let mut open: Vec<(u64, crate::offers::Offer)> = vec![];
        for id in 1..c.market.next_offer_id {
            if let Some(o) = c.market.offers.get(&id) {
                open.push((id, o.clone()));
            }
        }
        let offers_near: u128 = open.iter().filter(|(_, o)| o.currency == Currency::Near).map(|(_, o)| o.amount).sum();
        let offers_usdc: u128 = open.iter().filter(|(_, o)| o.currency == Currency::Usdc).map(|(_, o)| o.amount).sum();
        let credit: u128 = ppl.iter().map(|p| c.market.storage_credit.get(p).copied().unwrap_or(0)).sum();
        let pr = |cur: Currency| -> u128 { ppl.iter().map(|p| c.proceeds.get(&(p.clone(), cur)).copied().unwrap_or(0)).sum() };
        let t = c.market.totals;
        prop_assert_eq!(t.inside_near, inside_near, "inside_near total");
        prop_assert_eq!(t.offers_near, offers_near, "offers_near total");
        prop_assert_eq!(t.storage_credit, credit, "storage_credit total");
        prop_assert_eq!(t.proceeds_near, pr(Currency::Near), "proceeds_near total");
        // I-M3 (exact): every FT ledger equals what the contract really holds of that FT
        for f in [usdc(), wnear()] {
            let inside: u128 = self.toks.iter().map(|t| c.market.inside_ft.get(&(t.clone(), f.clone())).copied().unwrap_or(0)).sum();
            let owed = inside + if f == usdc() { offers_usdc + pr(Currency::Usdc) } else { 0 };
            prop_assert_eq!(owed, self.ft[&f], "FT ledger of {} ≠ the contract's balance", f);
        }
        // IdIndex: every open offer sits exactly at its stored positions, and the indexes hold nothing else
        for (id, o) in &open {
            prop_assert_eq!(c.market.by_token.page(&o.token_id, o.tpos as u64, 1), vec![*id]);
            prop_assert_eq!(c.market.by_account.page(o.offerer.as_str(), o.apos as u64, 1), vec![*id]);
        }
        let in_tok: u32 = self.toks.iter().map(|t| c.market.by_token.len(t)).sum();
        let in_acc: u32 = ppl.iter().map(|p| c.market.by_account.len(p.as_str())).sum();
        prop_assert_eq!(in_tok as usize, open.len());
        prop_assert_eq!(in_acc as usize, open.len());
        // I-M1 at rest (a 1,000 NEAR buffer: only a real leak can break it)
        prop_assert!(self.spare() >= 0, "I-M1 broken: free − escrow = {}", self.spare());
        Ok(())
    }
}

proptest! {
    #![proptest_config(ProptestConfig {
        cases: std::env::var("PROPTEST_CASES").ok().and_then(|v| v.parse().ok()).unwrap_or(64),
        failure_persistence: None,
        ..ProptestConfig::default()
    })]

    /// For random sequences of every money operation, with each payout, refund and inside withdrawal delivered or
    /// failed at random:
    /// * NEAR: `free − escrow_near` never drops except by the storage a transfer / buy / accept grows (S-02, M-01)
    ///   plus, for a USDC buy, the payout's 1 yocto (R3-M-1); every user-paid path leaves it ≥ unchanged.
    /// * FT: for USDC and wNEAR, Σ inside + open USDC offers + USDC proceeds == the contract's real FT balance
    ///   (tokens received by successful `ft_on_transfer` − delivered `ft_transfer`s), exactly, after every step.
    /// * the NEAR totals equal the per-entry sums (I-M2); the offer indexes match the stored positions;
    /// * callbacks never panic, never grow storage, never move NEAR; a refused call is rolled back.
    /// Slow (≈ 1 s per case), so it is not part of the default run (CPU budget, CLAUDE.md). Run it with
    /// `PROPTEST_CASES=256 cargo test -p satchel --lib review3_money -- --include-ignored` (256 cases passed on 2026-11-04).
    #[test]
    #[ignore = "slow conservation fuzz; run with --include-ignored"]
    fn prop_r3_conservation_over_every_money_path(
        ops in proptest::collection::vec(op_strategy(), 1..70),
        fail_bits in proptest::collection::vec(any::<bool>(), 64),
    ) {
        let ppl = people();
        let mut s = Sim::new();
        let mut fails = fail_bits.into_iter().cycle();
        for i in 0..4 {
            let to = ppl[i % 2].clone();
            let (tok, _) = s.call(&acc("team.testnet"), 20 * MILLI, |c| c.nft_mint(to)).unwrap();
            s.toks.push(tok.token_id);
        }
        for p in &ppl {
            s.call(p, 50 * MILLI, |c| c.prepay_storage(None)).unwrap();
        }
        s.check(&ppl)?;
        let mut stats: BTreeMap<&'static str, (u32, u32)> = BTreeMap::new();
        for op in ops {
            s.height += 1;
            let spare0 = s.spare();
            // (name, result, bytes grown, NEAR the contract itself may legitimately pay: growth on the M-01 paths)
            let (name, res, guarded, ft_in): (&'static str, Result<i64, String>, bool, Option<(AccountId, u128)>) = match op.clone() {
                Op::Mint { to } => {
                    let to = ppl[to].clone();
                    let r = s.call(&acc("team.testnet"), 20 * MILLI, |c| c.nft_mint(to).token_id);
                    if let Ok((t, _)) = &r { s.toks.push(t.clone()); }
                    ("mint", r.map(|x| x.1), false, None)
                }
                Op::List { t, usdc, price } => {
                    let id = s.tok(t);
                    let owner = s.c.owner_of(&id);
                    let cur = if usdc { Currency::Usdc } else { Currency::Near };
                    ("list", s.call(&owner, 10 * MILLI, |c| c.list(id, U128(price), cur)).map(|x| x.1), false, None)
                }
                Op::Delist { t } => {
                    let id = s.tok(t);
                    let owner = s.c.owner_of(&id);
                    ("delist", s.call(&owner, 1, |c| c.delist(id)).map(|x| x.1), false, None)
                }
                Op::BuyNear { t, who, wrong } => {
                    let id = s.tok_where(t, |c, id| c.token_state(id).listing.is_some_and(|l| l.currency == Currency::Near));
                    let st = s.c.token_state(&id);
                    let (lid, price) = st.listing.as_ref().map(|l| (l.id, l.price.0)).unwrap_or((0, ONE_NEAR));
                    let price = if wrong { price + 1 } else { price };
                    let sc = st.sig_count;
                    ("buy_near", s.call(&ppl[who], price, |c| c.buy(id, lid, sc)).map(|x| x.1), true, None)
                }
                Op::BuyUsdc { t, who, wrong } => {
                    let id = s.tok_where(t, |c, id| c.token_state(id).listing.is_some_and(|l| l.currency == Currency::Usdc));
                    let st = s.c.token_state(&id);
                    let (lid, price) = st.listing.as_ref().map(|l| (l.id, l.price.0)).unwrap_or((0, 1_000_000));
                    let price = if wrong { price + 1 } else { price };
                    let msg = json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":st.sig_count}}).to_string();
                    let buyer = ppl[who].clone();
                    let r = s.call(&usdc(), 0, |c| c.ft_on_transfer(buyer, U128(price), msg));
                    if let Ok((v, _)) = &r { prop_assert!(matches!(v, PromiseOrValue::Value(U128(0)))); }
                    ("buy_usdc", r.map(|x| x.1), true, Some((usdc(), price)))
                }
                Op::DepositNear { t, who, amount } => {
                    let id = s.tok(t);
                    ("deposit_near", s.call(&ppl[who], amount, |c| c.deposit_near(id)).map(|x| x.1), false, None)
                }
                Op::DepositFt { t, who, wnear, amount } => {
                    let id = s.tok(t);
                    let f = if wnear { self::wnear() } else { self::usdc() };
                    let sender = ppl[who].clone();
                    let msg = json!({"deposit": id}).to_string();
                    let r = s.call(&f, 0, |c| c.ft_on_transfer(sender, U128(amount), msg));
                    ("deposit_ft", r.map(|x| x.1), false, Some((f, amount)))
                }
                Op::WithdrawNear { t, frac, to_other } => {
                    let id = s.tok_where(t, |c, id| c.token_state(id).listing.is_none() && c.market.inside.get(id).is_some_and(|i| i.near > 0));
                    let owner = s.c.owner_of(&id);
                    let have = s.c.market.inside.get(&id).map(|i| i.near).unwrap_or(0);
                    let amount = (have * (frac as u128 + 1) / 256).max(have.min(1));
                    let to = to_other.map(|i| ppl[i].clone());
                    ("withdraw_near", s.call(&owner, 1, |c| c.withdraw_near(id, U128(amount), to)).map(|x| x.1), false, None)
                }
                Op::WithdrawFt { t, wnear, frac, to_other } => {
                    let f = if wnear { self::wnear() } else { self::usdc() };
                    let ff = f.clone();
                    let id = s.tok_where(t, move |c, id| c.token_state(id).listing.is_none() && c.market.inside_ft.get(&(id.clone(), ff.clone())).is_some_and(|v| *v > 0));
                    let owner = s.c.owner_of(&id);
                    let have = s.c.market.inside_ft.get(&(id.clone(), f.clone())).copied().unwrap_or(0);
                    let amount = (have * (frac as u128 + 1) / 256).max(have.min(1));
                    let to = to_other.map(|i| ppl[i].clone());
                    ("withdraw_ft", s.call(&owner, 1, |c| c.withdraw_ft(id, f, U128(amount), to)).map(|x| x.1), false, None)
                }
                Op::OfferNear { t, who, amount, stale } => {
                    let id = s.tok(t);
                    let sc = s.c.token_state(&id).sig_count + stale as u64;
                    let ep = s.c.inside_epoch(&id);
                    let exp = now_ms(s.height) + DAY;
                    ("offer_near", s.call(&ppl[who], amount + 10 * MILLI, |c| c.make_offer(id, U128(amount), sc, ep, exp)).map(|x| x.1), false, None)
                }
                Op::OfferUsdc { t, who, amount, stale } => {
                    let id = s.tok(t);
                    let ep = s.c.inside_epoch(&id) + stale as u64;
                    let msg = json!({"offer":{"token_id":id,"expected_sig_count":s.c.token_state(&id).sig_count,"expected_inside_epoch":ep,"expires_at_ms":now_ms(s.height) + DAY}}).to_string();
                    let offerer = ppl[who].clone();
                    let r = s.call(&usdc(), 0, |c| c.ft_on_transfer(offerer, U128(amount), msg));
                    ("offer_usdc", r.map(|x| x.1), false, Some((usdc(), amount)))
                }
                Op::Cancel { pick, by } => {
                    let ids: Vec<u64> = (1..s.c.market.next_offer_id).filter(|i| s.c.market.offers.get(i).is_some()).collect();
                    if ids.is_empty() { continue; }
                    let oid = ids[pick % ids.len()];
                    let by = if by == 5 { s.c.market.offers.get(&oid).unwrap().offerer.clone() } else { ppl[by].clone() };
                    ("cancel", s.call(&by, 1, |c| c.cancel_offer(oid)).map(|x| x.1), false, None)
                }
                Op::Accept { pick } => {
                    let ids: Vec<u64> = (1..s.c.market.next_offer_id).filter(|i| s.c.market.offers.get(i).is_some()).collect();
                    if ids.is_empty() { continue; }
                    let oid = ids[pick % ids.len()];
                    let owner = s.c.owner_of(&s.c.market.offers.get(&oid).unwrap().token_id);
                    ("accept", s.call(&owner, 1, |c| c.accept_offer(oid)).map(|x| x.1), true, None)
                }
                Op::WithdrawProceeds { who, usdc } => {
                    let cur = if usdc { Currency::Usdc } else { Currency::Near };
                    // prefer someone who is owed (failed payouts / refunds), so the withdrawal path runs
                    let owed: Vec<&AccountId> = ppl.iter().filter(|p| s.c.proceeds.get(&((*p).clone(), cur)).is_some_and(|v| *v > 0)).collect();
                    let p = if owed.is_empty() { ppl[who].clone() } else { owed[who % owed.len()].clone() };
                    ("withdraw_proceeds", s.call(&p, 1, |c| c.withdraw_proceeds(cur)).map(|x| x.1), false, None)
                }
                Op::Prepay { who, for_whom, amount } => {
                    let a = Some(ppl[for_whom].clone());
                    ("prepay", s.call(&ppl[who], amount, |c| c.prepay_storage(a)).map(|x| x.1), false, None)
                }
                Op::WithdrawCredit { who } => {
                    ("withdraw_credit", s.call(&ppl[who], 1, |c| c.withdraw_storage_credit()).map(|x| x.1), false, None)
                }
                Op::Transfer { t, to } => {
                    let id = s.tok(t);
                    let owner = s.c.owner_of(&id);
                    let to = ppl[to].clone();
                    ("transfer", s.call(&owner, 1, |c| c.nft_transfer(to, id, None, None)).map(|x| x.1), true, None)
                }
                Op::Sign { t } => {
                    let id = s.tok(t);
                    let owner = s.c.owner_of(&id);
                    let req = SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() };
                    ("sign", s.call(&owner, 5 * MILLI, |c| c.sign_for(id, req, None)).map(|x| x.1), false, None)
                }
                Op::Tick { blocks } => {
                    s.height += blocks;
                    continue;
                }
            };
            let e = stats.entry(name).or_default();
            match res {
                Ok(grew) => {
                    e.0 += 1;
                    if let Some((f, amount)) = ft_in {
                        *s.ft.get_mut(&f).unwrap() += amount; // the FT moved the tokens before calling (kept: "0" unused)
                    }
                    s.resolve(&mut fails)?;
                    let spare1 = s.spare();
                    // what the contract's own NEAR may pay: the storage an M-01 path grew, and a USDC buy's yocto
                    let allowed = if guarded { grew.max(0) as i128 * byte_cost() as i128 } else { 0 } + if name == "buy_usdc" { 1 } else { 0 };
                    prop_assert!(spare1 >= spare0 - allowed, "{name} took {} yocto of escrow/buffer beyond the allowed {allowed} (grew {grew} B)", spare0 - spare1);
                }
                Err(msg) => {
                    e.1 += 1;
                    if std::env::var("R3_STATS").is_ok() {
                        let code: String = msg.split("panic_msg: \"").nth(1).unwrap_or(&msg).chars().take(40).collect();
                        println!("REFUSED {name}: {code}");
                    }
                    prop_assert!(msg.contains("ERR_") || msg.contains("Current and next owner must differ"), "{name} failed without a contract error code: {msg}");
                    prop_assert!(!msg.contains("ERR_INSOLVENT"), "{name}: ERR_INSOLVENT with a 1,000 NEAR buffer: {msg}");
                    prop_assert_eq!(s.spare(), spare0, "a refused call moved NEAR");
                }
            }
            s.check(&ppl)?;
        }
        if std::env::var("R3_STATS").is_ok() {
            println!("ok/refused per op: {stats:?}");
        }
    }
}

#[test]
#[ignore = "diagnostic: prints the storage growth of a USDC buy by seller/buyer id length"]
fn r3_diag_usdc_buy_growth_table() {
    for slen in [3usize, 4, 13, 14, 30, 31, 55] {
        for blen in [3usize, 4, 13, 14, 30, 31, 55] {
            for holder_too in [false, true] {
                let seller = acc(&format!("s{}.testnet", "a".repeat(slen - 1)));
                let buyer = acc(&format!("b{}.testnet", "c".repeat(blen - 1)));
                let (_, g, _) = usdc_buy_case(&seller, &buyer, holder_too, None);
                eprintln!("GROWTH slen={slen} blen={blen} holder={holder_too} g={g}");
            }
        }
    }
}
