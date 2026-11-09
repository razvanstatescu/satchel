//! Unit tests for C4 (offers) and C6 (inside assets), docs/specs/C4-C6.md. The mocked chain does NOT roll back state on
//! a panic, so "a refusal changes nothing" is asserted on the state the panic left behind: every guard must run before
//! the first write. Includes the I-M2 accounting property (proptest against a reference model).

use std::collections::BTreeMap;
use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseOrValue, PromiseResult, RuntimeFeesConfig};
use proptest::prelude::*;

use crate::errors::*;
use crate::market::{MAX_OFFERS_PER_ACCOUNT, MAX_OFFER_TTL_MS, WNEAR};
use crate::offers::IdIndex;
use crate::parse::evm;
use crate::*;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const T0: u64 = 1_793_000_000_000; // ms
const DAY: u64 = 86_400_000;

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
fn alice() -> AccountId {
    acc("alice.testnet")
}
fn bob() -> AccountId {
    acc("bob.testnet")
}
fn carol() -> AccountId {
    acc("carol.testnet")
}

struct Ctx {
    predecessor: AccountId,
    deposit: u128,
    height: u64,
    now_ms: u64,
    results: Vec<PromiseResult>,
    balance: u128,
}

impl Ctx {
    /// The mock's account balance is fixed per call (it never accumulates deposits), so it defaults to far more than
    /// any test escrows; the M-01 tests set it exactly with `bal`.
    fn new(predecessor: AccountId) -> Self {
        Ctx { predecessor, deposit: 0, height: 1_000, now_ms: T0, results: vec![], balance: 1_000_000 * ONE_NEAR }
    }
    fn bal(mut self, b: u128) -> Self {
        self.balance = b;
        self
    }
    fn dep(mut self, d: u128) -> Self {
        self.deposit = d;
        self
    }
    fn at(mut self, h: u64) -> Self {
        self.height = h;
        self
    }
    fn ms(mut self, t: u64) -> Self {
        self.now_ms = t;
        self
    }
    fn results(mut self, r: Vec<PromiseResult>) -> Self {
        self.results = r;
        self
    }
    fn set(self) {
        let ctx = VMContextBuilder::new()
            .current_account_id(me())
            .signer_account_id(self.predecessor.clone())
            .predecessor_account_id(self.predecessor)
            .attached_deposit(NearToken::from_yoctonear(self.deposit))
            .prepaid_gas(Gas::from_tgas(300))
            .block_height(self.height)
            .block_timestamp(self.now_ms * 1_000_000)
            .account_balance(NearToken::from_yoctonear(self.balance))
            .build();
        testing_env!(ctx, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), self.results);
    }
}

fn panic_msg<R>(f: impl FnOnce() -> R) -> Option<String> {
    let err = catch_unwind(AssertUnwindSafe(f)).err()?;
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    Some(match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    })
}

fn expect_err<R>(code: &str, f: impl FnOnce() -> R) {
    let msg = panic_msg(f).unwrap_or_else(|| panic!("expected {code}, call succeeded"));
    assert!(msg.starts_with(&format!("{code}: ")) || msg == code, "expected {code}, got {msg:?}");
}

/// A fresh contract on EMPTY mocked storage (`testing_env!` carries storage over, so a second `new` in one test, or
/// the next proptest case, would otherwise see the previous contract's state).
fn setup_with(usdc_id: Option<AccountId>) -> Contract {
    wipe();
    Ctx::new(acc("team.testnet")).set();
    Contract::new(mpc(), usdc_id, "https://satchel.example/api/card/".into())
}
fn setup() -> Contract {
    setup_with(Some(usdc()))
}
fn wipe() {
    env::set_blockchain_interface(near_sdk::MockedBlockchain::new(
        VMContextBuilder::new().current_account_id(me()).build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        vec![],
        Default::default(),
        Default::default(),
        None,
    ));
}
/// Storage usage with every cached `store` write flushed (on-chain that happens when the call ends; the unit mock
/// keeps the contract alive, so measurements between calls must flush first).
fn usage(c: &mut Contract) -> u64 {
    c.state.flush();
    c.sig_log.flush();
    c.listings.flush();
    c.proceeds.flush();
    c.market.flush();
    env::storage_usage()
}
fn mint_to(c: &mut Contract, owner: AccountId) -> String {
    Ctx::new(acc("team.testnet")).dep(20 * MILLI).set();
    c.nft_mint(owner).token_id
}
fn byte_cost() -> u128 {
    env::storage_byte_cost().as_yoctonear()
}
fn events(name: &str) -> Vec<Value> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["event"] == name)
        .map(|v| if v["data"].is_array() { v["data"][0].clone() } else { v["data"].clone() })
        .collect()
}
/// Transfers created in the last call, as (receiver, yocto).
fn transfers() -> Vec<(AccountId, u128)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::Transfer { deposit, .. } => Some((rcv.clone(), deposit.as_yoctonear())),
                _ => None,
            })
        })
        .collect()
}
/// Function calls created in the last call, as (receiver, method, args, deposit, gas).
fn calls() -> Vec<(AccountId, String, Value, u128, Gas)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::FunctionCallWeight { method_name, args, attached_deposit, prepaid_gas, .. } => Some((
                    rcv.clone(),
                    String::from_utf8(method_name).unwrap(),
                    serde_json::from_slice(&args).unwrap(),
                    attached_deposit.as_yoctonear(),
                    prepaid_gas,
                )),
                _ => None,
            })
        })
        .collect()
}
fn sign(c: &mut Contract, owner: &AccountId, id: &str, height: u64) {
    Ctx::new(owner.clone()).dep(5 * MILLI).at(height).set();
    c.sign_for(id.into(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None);
}
fn inside(c: &Contract, id: &str) -> Value {
    serde_json::to_value(c.inside_of(id.into())).unwrap()
}
fn totals(c: &Contract) -> Value {
    serde_json::to_value(c.market_totals()).unwrap()
}
fn ft_call(c: &mut Contract, ft: AccountId, sender: AccountId, amount: u128, msg: Value) {
    Ctx::new(ft).set();
    let r = c.ft_on_transfer(sender, U128(amount), msg.to_string());
    assert!(matches!(r, PromiseOrValue::Value(U128(0))));
}
fn deposit_msg(id: &str) -> Value {
    json!({ "deposit": id })
}
fn offer_msg(id: &str, sig_count: u64, epoch: u64, expires: u64) -> Value {
    json!({ "offer": { "token_id": id, "expected_sig_count": sig_count, "expected_inside_epoch": epoch, "expires_at_ms": expires } })
}
/// bob makes a NEAR offer of `amount` on `id` (attaching amount + 10 milliNEAR).
fn near_offer(c: &mut Contract, who: AccountId, id: &str, amount: u128) -> u64 {
    let st = c.token_state(&id.to_string());
    let epoch = c.inside_epoch(&id.to_string());
    Ctx::new(who).dep(amount + 10 * MILLI).set();
    c.make_offer(id.into(), U128(amount), st.sig_count, epoch, T0 + DAY)
}

// ── C6: deposit_near ───────────────────────────────────────────────────────────────────────────

#[test]
fn deposit_near_charges_storage_only_on_the_first_deposit() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    assert_eq!(inside(&c, &id), json!({"near":"0","fts":[],"inside_epoch":0}));
    assert_eq!(c.inside_of("99".into()), None);

    Ctx::new(bob()).dep(ONE_NEAR).set();
    let s0 = usage(&mut c);
    let credited = c.deposit_near(id.clone()).0;
    let used = (usage(&mut c) - s0) as u128;
    assert!(used > 0 && used < 200, "inside record is small: {used} B");
    assert_eq!(credited, ONE_NEAR - used * byte_cost(), "credited = attached − Δstorage × byte cost");
    assert!(transfers().is_empty(), "nothing refunded: the rest is the deposit");
    let ev = events("inside_deposit");
    assert_eq!(ev, vec![json!({"token_id": id, "sender_id": "bob.testnet", "ft": null, "amount": credited.to_string()})]);

    Ctx::new(carol()).dep(7).set();
    let s1 = usage(&mut c);
    assert_eq!(c.deposit_near(id.clone()).0, 7, "a top-up costs no storage");
    assert_eq!(usage(&mut c), s1);
    assert_eq!(inside(&c, &id)["near"], (credited + 7).to_string());
    assert_eq!(
        totals(&c),
        json!({"inside_near": (credited + 7).to_string(), "offers_near": "0", "storage_credit": "0", "proceeds_near": "0",
               "escrow_near": (credited + 7).to_string()})
    );
}

#[test]
fn deposit_near_guards() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(ONE_NEAR).set();
    expect_err(ERR_TOKEN_NOT_FOUND, || c.deposit_near("99".into()));
    Ctx::new(bob()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.deposit_near(id.clone()));
    // a first deposit that doesn't cover the inside record's storage (on-chain this reverts; here only the code matters)
    let mut c2 = setup();
    let id2 = mint_to(&mut c2, alice());
    Ctx::new(bob()).dep(1_000).set();
    expect_err(ERR_DEPOSIT, || c2.deposit_near(id2.clone()));
    assert_eq!(totals(&c)["inside_near"], "0");
}

// ── C6: withdraw_near ──────────────────────────────────────────────────────────────────────────

fn funded(c: &mut Contract, near: u128) -> String {
    let id = mint_to(c, alice());
    Ctx::new(bob()).dep(near).set();
    c.deposit_near(id.clone());
    id
}

#[test]
fn withdraw_near_guards_change_nothing() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    let bal = inside(&c, &id)["near"].as_str().unwrap().parse::<u128>().unwrap();
    let snap = (inside(&c, &id), totals(&c));
    let w = |c: &mut Contract, who: AccountId, dep: u128, id: &str, amount: u128, rcv: Option<AccountId>| {
        Ctx::new(who).dep(dep).set();
        c.withdraw_near(id.into(), U128(amount), rcv)
    };
    expect_err(ERR_TOKEN_NOT_FOUND, || w(&mut c, alice(), 1, "99", 1, None));
    expect_err(ERR_NOT_OWNER, || w(&mut c, bob(), 1, &id, 1, None));
    expect_err(ERR_DEPOSIT, || w(&mut c, alice(), 0, &id, 1, None));
    expect_err(ERR_DEPOSIT, || w(&mut c, alice(), 2, &id, 1, None));
    expect_err(ERR_AMOUNT, || w(&mut c, alice(), 1, &id, 0, None));
    expect_err(ERR_INSIDE_BALANCE, || w(&mut c, alice(), 1, &id, bal + 1, None));
    for r in [me(), mpc(), usdc()] {
        expect_err(ERR_BAD_RECEIVER, || w(&mut c, alice(), 1, &id, 1, Some(r))); // Q-03
    }
    // the contract's own NEAR is not inside any Satchel
    let other = mint_to(&mut c, alice());
    expect_err(ERR_INSIDE_BALANCE, || w(&mut c, alice(), 1, &other, 1, None));
    // listed → ERR_LISTED (checked before the amount)
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(5), Currency::Near);
    expect_err(ERR_LISTED, || w(&mut c, alice(), 1, &id, 0, None));
    assert_eq!((inside(&c, &id), totals(&c)), snap);
    assert!(events("inside_withdraw").is_empty());
}

#[test]
fn withdraw_near_debits_first_bumps_epoch_and_calls_back() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    let bal: u128 = inside(&c, &id)["near"].as_str().unwrap().parse().unwrap();
    Ctx::new(alice()).dep(1).set();
    let s0 = usage(&mut c);
    c.withdraw_near(id.clone(), U128(400 * MILLI), None);
    assert_eq!(usage(&mut c), s0, "debit overwrites");
    assert_eq!(inside(&c, &id), json!({"near": (bal - 400 * MILLI).to_string(), "fts": [], "inside_epoch": 1}));
    assert_eq!(totals(&c)["inside_near"], (bal - 400 * MILLI).to_string());
    assert_eq!(transfers(), vec![(alice(), 400 * MILLI)], "default receiver = owner");
    let cb = calls();
    assert_eq!(cb.len(), 1);
    assert_eq!((cb[0].0.clone(), cb[0].1.as_str()), (me(), "on_inside_withdraw"));
    assert_eq!(cb[0].2, json!({"token_id": id, "ft": null, "amount": (400 * MILLI).to_string()}));
    assert_eq!(cb[0].4, Gas::from_tgas(ON_PAYOUT_GAS_TGAS));
    assert_eq!(
        events("inside_withdraw"),
        vec![json!({"token_id": id, "owner_id": "alice.testnet", "receiver_id": "alice.testnet", "ft": null,
                    "amount": (400 * MILLI).to_string(), "inside_epoch": 1})]
    );
    // to another receiver, the whole rest; the slot stays (at 0)
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(bal - 400 * MILLI), Some(carol()));
    assert_eq!(transfers(), vec![(carol(), bal - 400 * MILLI)]);
    assert_eq!(inside(&c, &id), json!({"near": "0", "fts": [], "inside_epoch": 2}));
    assert_eq!(totals(&c)["inside_near"], "0");
}

#[test]
fn on_inside_withdraw_recredits_only_on_failure_and_never_panics() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    let bal: u128 = inside(&c, &id)["near"].as_str().unwrap().parse().unwrap();
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(bal), None);
    // delivered → nothing changes
    Ctx::new(me()).results(vec![PromiseResult::Successful(vec![])]).set();
    assert!(c.on_inside_withdraw(id.clone(), None, U128(bal)));
    assert_eq!(inside(&c, &id)["near"], "0");
    // no result / two results → logged no-op (S-13 pattern), never a credit
    Ctx::new(me()).set();
    assert!(!c.on_inside_withdraw(id.clone(), None, U128(bal)));
    Ctx::new(me()).results(vec![PromiseResult::Failed, PromiseResult::Failed]).set();
    assert!(!c.on_inside_withdraw(id.clone(), None, U128(bal)));
    assert_eq!(inside(&c, &id)["near"], "0");
    assert!(events("inside_withdraw_resolved").is_empty());
    // failed → re-credited to the same token; the epoch stays bumped; no storage growth (I-M6)
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    let s0 = usage(&mut c);
    assert!(!c.on_inside_withdraw(id.clone(), None, U128(bal)));
    assert_eq!(inside(&c, &id), json!({"near": bal.to_string(), "fts": [], "inside_epoch": 1}));
    assert_eq!(totals(&c)["inside_near"], bal.to_string());
    assert_eq!(events("inside_withdraw_resolved"), vec![json!({"token_id": id, "ft": null, "amount": bal.to_string(), "ok": false})]);
    assert_eq!(usage(&mut c), s0);
    // a callback for a token that has no inside record logs and does not panic
    let bare = mint_to(&mut c, alice());
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    assert!(!c.on_inside_withdraw(bare.clone(), None, U128(5)));
    assert!(!c.on_inside_withdraw(bare.clone(), Some(usdc()), U128(5)));
    assert_eq!(inside(&c, &bare)["near"], "0");
    // `#[private]` is enforced by the wasm entry point only; the sandbox checks a direct call
    // (tests/tests/market.rs::withdraw_failures_recredit, last step).
}

// ── storage credit ─────────────────────────────────────────────────────────────────────────────

#[test]
fn prepay_and_withdraw_storage_credit() {
    let mut c = setup();
    Ctx::new(bob()).dep(10 * MILLI).set();
    let s0 = usage(&mut c);
    let credit = c.prepay_storage(None).0;
    let used = (usage(&mut c) - s0) as u128;
    assert_eq!(credit, 10 * MILLI - used * byte_cost());
    Ctx::new(carol()).dep(5).set();
    assert_eq!(c.prepay_storage(Some(bob())).0, credit + 5, "anyone may top up another account; no storage the 2nd time");
    assert_eq!(c.storage_credit_of(bob()).0, credit + 5);
    assert_eq!(totals(&c)["storage_credit"], (credit + 5).to_string());
    for r in [me(), mpc(), usdc()] {
        Ctx::new(carol()).dep(10 * MILLI).set();
        expect_err(ERR_BAD_RECEIVER, || c.prepay_storage(Some(r))); // Q-03: nobody could withdraw that credit
    }
    assert_eq!(totals(&c)["storage_credit"], (credit + 5).to_string());
    Ctx::new(bob()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.prepay_storage(None));
    let mut c2 = setup();
    Ctx::new(bob()).dep(100).set();
    expect_err(ERR_DEPOSIT, || c2.prepay_storage(None));

    Ctx::new(bob()).dep(2).set();
    expect_err(ERR_DEPOSIT, || c.withdraw_storage_credit());
    Ctx::new(carol()).dep(1).set();
    expect_err(ERR_NOTHING_OWED, || c.withdraw_storage_credit());
    Ctx::new(bob()).dep(1).set();
    let s1 = usage(&mut c);
    c.withdraw_storage_credit();
    assert_eq!(transfers(), vec![(bob(), credit + 5)]);
    assert_eq!(c.storage_credit_of(bob()).0, 0);
    assert_eq!(totals(&c)["storage_credit"], "0");
    assert_eq!(usage(&mut c), s1, "the slot is kept at 0");
    expect_err(ERR_NOTHING_OWED, || c.withdraw_storage_credit());
}

// ── C6: FT deposits and withdrawals ────────────────────────────────────────────────────────────

#[test]
fn ft_deposit_needs_credit_only_for_new_slots() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    // no credit → ERR_STORAGE_CREDIT (the FT refunds); nothing written
    Ctx::new(usdc()).set();
    expect_err(ERR_STORAGE_CREDIT, || c.ft_on_transfer(bob(), U128(5_000_000), deposit_msg(&id).to_string()));
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    let credit = c.prepay_storage(None).0;
    Ctx::new(usdc()).set();
    let s0 = usage(&mut c);
    let _ = c.ft_on_transfer(bob(), U128(5_000_000), deposit_msg(&id).to_string());
    let used = (usage(&mut c) - s0) as u128;
    assert_eq!(c.storage_credit_of(bob()).0, credit - used * byte_cost(), "charged exactly Δstorage");
    assert_eq!(totals(&c)["storage_credit"], (credit - used * byte_cost()).to_string());
    assert_eq!(inside(&c, &id), json!({"near":"0","fts":[{"token":"usdc.testnet","amount":"5000000"}],"inside_epoch":0}));
    assert_eq!(events("inside_deposit"), vec![json!({"token_id": id, "sender_id": "bob.testnet", "ft": "usdc.testnet", "amount": "5000000"})]);
    // a top-up by someone without credit works: no new bytes
    ft_call(&mut c, usdc(), carol(), 1, deposit_msg(&id));
    // wNEAR is allowlisted for deposits too (a new slot, paid from bob's credit)
    ft_call(&mut c, wnear(), bob(), ONE_NEAR, deposit_msg(&id));
    assert_eq!(
        inside(&c, &id)["fts"],
        json!([{"token":"usdc.testnet","amount":"5000001"},{"token":"wrap.testnet","amount": ONE_NEAR.to_string()}])
    );
    assert_eq!(totals(&c)["inside_near"], "0", "FT deposits never count as NEAR");
}

#[test]
fn ft_on_transfer_routing_guards() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    // not allowlisted
    Ctx::new(acc("evil.testnet")).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(bob(), U128(5), deposit_msg(&id).to_string()));
    // wNEAR may not buy or offer
    Ctx::new(wnear()).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(bob(), U128(5), offer_msg(&id, 0, 0, T0 + DAY).to_string()));
    expect_err(
        ERR_WRONG_TOKEN,
        || c.ft_on_transfer(bob(), U128(5), json!({"buy":{"token_id":id,"listing_id":1,"expected_sig_count":0}}).to_string()),
    );
    // bad msgs and unknown tokens
    Ctx::new(usdc()).set();
    for m in ["", "{}", "{\"deposit\":3}", "{\"deposit\":{\"token_id\":\"1\"}}", "{\"offer\":{\"token_id\":\"1\"}}", "{\"withdraw\":\"1\"}"] {
        expect_err(ERR_BAD_MSG, || c.ft_on_transfer(bob(), U128(5), m.to_string()));
    }
    expect_err(ERR_TOKEN_NOT_FOUND, || c.ft_on_transfer(bob(), U128(5), deposit_msg("99").to_string()));
    assert_eq!(inside(&c, &id)["fts"], json!([]));
    // usdc disabled: wNEAR deposits still work, USDC is just another stranger
    let mut c = setup_with(None);
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    Ctx::new(usdc()).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(bob(), U128(5), deposit_msg(&id).to_string()));
    ft_call(&mut c, wnear(), bob(), 5, deposit_msg(&id));
    assert_eq!(serde_json::to_value(c.market_config()).unwrap()["inside_fts"], json!(["wrap.testnet"]));
}

#[test]
fn ft_msg_shapes_are_exact() {
    // docs/specs/C4-C6.md §1.2; the TS mirror (packages/core/test/market.test.ts) emits these exact strings
    let buy: FtMsg = serde_json::from_str(r#"{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}"#).unwrap();
    assert!(matches!(buy, FtMsg::Buy { ref token_id, listing_id: 7, expected_sig_count: 4 } if token_id == "3"));
    let dep: FtMsg = serde_json::from_str(r#"{"deposit":"3"}"#).unwrap();
    assert!(matches!(dep, FtMsg::Deposit(ref t) if t == "3"));
    let off: FtMsg = serde_json::from_str(
        r#"{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1793000000000}}"#,
    )
    .unwrap();
    match off {
        FtMsg::Offer(m) => assert_eq!(
            (m.token_id.as_str(), m.expected_sig_count, m.expected_inside_epoch, m.expires_at_ms),
            ("3", 4, 0, 1_793_000_000_000)
        ),
        _ => panic!("not an offer"),
    }
}

fn usdc_funded(c: &mut Contract, amount: u128) -> String {
    let id = mint_to(c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(c, usdc(), bob(), amount, deposit_msg(&id));
    id
}

#[test]
fn withdraw_ft_guards_and_call_shape() {
    let mut c = setup();
    let id = usdc_funded(&mut c, 5_000_000);
    let snap = (inside(&c, &id), totals(&c));
    let w = |c: &mut Contract, who: AccountId, dep: u128, ft: AccountId, amount: u128, rcv: Option<AccountId>| {
        Ctx::new(who).dep(dep).set();
        c.withdraw_ft(id.clone(), ft, U128(amount), rcv)
    };
    expect_err(ERR_NOT_OWNER, || w(&mut c, bob(), 1, usdc(), 1, None));
    expect_err(ERR_DEPOSIT, || w(&mut c, alice(), 0, usdc(), 1, None));
    expect_err(ERR_WRONG_TOKEN, || w(&mut c, alice(), 1, acc("evil.testnet"), 1, None));
    expect_err(ERR_AMOUNT, || w(&mut c, alice(), 1, usdc(), 0, None));
    expect_err(ERR_INSIDE_BALANCE, || w(&mut c, alice(), 1, usdc(), 5_000_001, None));
    expect_err(ERR_INSIDE_BALANCE, || w(&mut c, alice(), 1, wnear(), 1, None));
    for r in [me(), mpc(), usdc()] {
        expect_err(ERR_BAD_RECEIVER, || w(&mut c, alice(), 1, usdc(), 1, Some(r))); // Q-03
    }
    Ctx::new(alice()).set();
    expect_err(ERR_TOKEN_NOT_FOUND, || c.withdraw_ft("99".into(), usdc(), U128(1), None));
    assert_eq!((inside(&c, &id), totals(&c)), snap);

    Ctx::new(alice()).dep(1).set();
    let s0 = usage(&mut c);
    c.withdraw_ft(id.clone(), usdc(), U128(2_000_000), Some(carol()));
    assert_eq!(usage(&mut c), s0, "both writes overwrite");
    assert_eq!(inside(&c, &id), json!({"near":"0","fts":[{"token":"usdc.testnet","amount":"3000000"}],"inside_epoch":1}));
    let cs = calls();
    assert_eq!(cs.len(), 2);
    assert_eq!((cs[0].0.clone(), cs[0].1.as_str(), cs[0].3, cs[0].4), (usdc(), "ft_transfer", 1, Gas::from_tgas(PAYOUT_FT_GAS_TGAS)));
    assert_eq!(cs[0].2, json!({"receiver_id":"carol.testnet","amount":"2000000","memo":"satchel withdraw"}));
    assert_eq!((cs[1].1.as_str(), cs[1].2.clone()), ("on_inside_withdraw", json!({"token_id": id, "ft": "usdc.testnet", "amount": "2000000"})));
    // the ft_transfer failed (e.g. carol is not registered) → re-credited; no storage growth
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    let s0 = usage(&mut c);
    assert!(!c.on_inside_withdraw(id.clone(), Some(usdc()), U128(2_000_000)));
    assert_eq!(inside(&c, &id), json!({"near":"0","fts":[{"token":"usdc.testnet","amount":"5000000"}],"inside_epoch":1}));
    assert_eq!(usage(&mut c), s0);
    // emptying the slot keeps it, so a later re-credit still only overwrites
    w(&mut c, alice(), 1, usdc(), 5_000_000, None);
    assert_eq!(inside(&c, &id)["fts"], json!([]));
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    let s0 = usage(&mut c);
    c.on_inside_withdraw(id.clone(), Some(usdc()), U128(5_000_000));
    assert_eq!(usage(&mut c), s0);
    // listed → ERR_LISTED
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(5), Currency::Near);
    expect_err(ERR_LISTED, || w(&mut c, alice(), 1, usdc(), 1, None));
}


// ── C6: balances belong to the token ───────────────────────────────────────────────────────────

#[test]
fn inside_moves_with_transfer_and_buy() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(&mut c, usdc(), bob(), 5_000_000, deposit_msg(&id));
    let snap = inside(&c, &id);
    // nft_transfer: alice → carol
    Ctx::new(alice()).dep(1).set();
    c.nft_transfer(carol(), id.clone(), None, None);
    assert_eq!(inside(&c, &id), snap);
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.withdraw_near(id.clone(), U128(1), None));
    // NEAR sale: carol lists, bob buys
    Ctx::new(carol()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    Ctx::new(bob()).dep(3 * ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    assert_eq!(inside(&c, &id), snap, "a sale moves the inside balances with the NFT");
    Ctx::new(carol()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.withdraw_ft(id.clone(), usdc(), U128(1), None));
    Ctx::new(bob()).dep(1).set();
    c.withdraw_ft(id.clone(), usdc(), U128(5_000_000), None);
    assert_eq!(calls()[0].2["receiver_id"], "bob.testnet");
}

// ── C4: make_offer ─────────────────────────────────────────────────────────────────────────────

#[test]
fn make_offer_guards_change_nothing() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let o = |c: &mut Contract, who: AccountId, dep: u128, id: &str, amount: u128, sc: u64, ep: u64, exp: u64| {
        Ctx::new(who).dep(dep).set();
        c.make_offer(id.into(), U128(amount), sc, ep, exp)
    };
    let d = ONE_NEAR + 10 * MILLI;
    expect_err(ERR_TOKEN_NOT_FOUND, || o(&mut c, bob(), d, "99", ONE_NEAR, 0, 0, T0 + DAY));
    expect_err(ERR_SELF_BUY, || o(&mut c, alice(), d, &id, ONE_NEAR, 0, 0, T0 + DAY));
    expect_err(ERR_BAD_RECEIVER, || o(&mut c, mpc(), d, &id, ONE_NEAR, 0, 0, T0 + DAY));
    expect_err(ERR_AMOUNT, || o(&mut c, bob(), d, &id, 0, 0, 0, T0 + DAY));
    expect_err(ERR_OFFER_STALE, || o(&mut c, bob(), d, &id, ONE_NEAR, 1, 0, T0 + DAY));
    expect_err(ERR_OFFER_STALE, || o(&mut c, bob(), d, &id, ONE_NEAR, 0, 1, T0 + DAY));
    expect_err(ERR_OFFER_EXPIRY, || o(&mut c, bob(), d, &id, ONE_NEAR, 0, 0, T0));
    expect_err(ERR_OFFER_EXPIRY, || o(&mut c, bob(), d, &id, ONE_NEAR, 0, 0, T0 + MAX_OFFER_TTL_MS + 1));
    expect_err(ERR_DEPOSIT, || o(&mut c, bob(), ONE_NEAR, &id, ONE_NEAR, 0, 0, T0 + DAY));
    assert!(c.offers_for(id.clone(), 0, 50).is_empty());
    assert_eq!(c.market_config().next_offer_id, 1);
    assert_eq!(totals(&c)["offers_near"], "0");
    // attached covers the amount but not the storage (on-chain this reverts; a fresh contract here)
    let mut c2 = setup();
    let id2 = mint_to(&mut c2, alice());
    expect_err(ERR_DEPOSIT, || o(&mut c2, bob(), ONE_NEAR + 1, &id2, ONE_NEAR, 0, 0, T0 + DAY));
    // the TTL boundary is allowed
    assert_eq!(o(&mut c, bob(), d, &id, ONE_NEAR, 0, 0, T0 + MAX_OFFER_TTL_MS), 1);
}

#[test]
fn make_offer_charges_exactly_and_indexes() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(ONE_NEAR + 10 * MILLI).set();
    let s0 = usage(&mut c);
    let oid = c.make_offer(id.clone(), U128(ONE_NEAR), 0, 0, T0 + DAY);
    let used = (usage(&mut c) - s0) as u128;
    assert_eq!(oid, 1);
    assert!(used > 200 && used < 700, "offer + 2 index entries + refund slot: {used} B");
    assert_eq!(transfers(), vec![(bob(), 10 * MILLI - used * byte_cost())], "refund = attached − amount − storage");
    let view = json!({"id":1,"token_id":id,"offerer_id":"bob.testnet","amount":ONE_NEAR.to_string(),"currency":"near",
                      "expected_sig_count":0,"expected_inside_epoch":0,"expires_at_ms":T0 + DAY,"created_at_ms":T0});
    assert_eq!(serde_json::to_value(c.offer(1)).unwrap(), view);
    assert_eq!(serde_json::to_value(c.offers_for(id.clone(), 0, 50)).unwrap(), json!([view]));
    assert_eq!(serde_json::to_value(c.offers_by(bob(), 0, 50)).unwrap(), json!([view]));
    assert!(c.offers_by(carol(), 0, 50).is_empty());
    assert_eq!(c.offer(2), None);
    assert!(c.proceeds.contains_key(&(bob(), Currency::Near)), "refund slot reserved (S-01 pattern)");
    assert_eq!(totals(&c)["offers_near"], ONE_NEAR.to_string());
    assert_eq!(
        events("offer_made"),
        vec![json!({"offer_id":1,"token_id":id,"offerer_id":"bob.testnet","amount":ONE_NEAR.to_string(),"currency":"near",
                    "expected_sig_count":0,"expected_inside_epoch":0,"expires_at_ms":T0 + DAY})]
    );
    // a listed token takes offers too; a second offer by the same account needs no new refund slot
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(5 * ONE_NEAR), Currency::Near);
    assert_eq!(near_offer(&mut c, bob(), &id, 2 * ONE_NEAR), 2);
    assert_eq!(c.offers_for(id.clone(), 0, 50).len(), 2);
    assert_eq!(c.offers_for(id.clone(), 1, 50)[0].id, 2);
    assert_eq!(c.offers_for(id.clone(), 0, 1).len(), 1);
}

#[test]
fn offer_cap_is_per_offerer_not_per_token() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for _ in 0..MAX_OFFERS_PER_ACCOUNT {
        near_offer(&mut c, bob(), &id, 1);
    }
    Ctx::new(bob()).dep(ONE_NEAR).set();
    expect_err(ERR_TOO_MANY_OFFERS, || c.make_offer(id.clone(), U128(1), 0, 0, T0 + DAY));
    // another offerer is not blocked by bob's dust offers
    near_offer(&mut c, carol(), &id, ONE_NEAR);
    assert_eq!(c.offers_for(id.clone(), 0, 50).len(), MAX_OFFERS_PER_ACCOUNT as usize + 1);
    // cancelling one frees a slot
    Ctx::new(bob()).dep(1).set();
    c.cancel_offer(5);
    near_offer(&mut c, bob(), &id, 1);
}

#[test]
fn usdc_offer_through_ft_on_transfer() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(usdc()).set();
    expect_err(ERR_STORAGE_CREDIT, || c.ft_on_transfer(bob(), U128(5_000_000), offer_msg(&id, 0, 0, T0 + DAY).to_string()));
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    let credit = c.prepay_storage(None).0;
    Ctx::new(usdc()).set();
    expect_err(ERR_OFFER_STALE, || c.ft_on_transfer(bob(), U128(5_000_000), offer_msg(&id, 1, 0, T0 + DAY).to_string()));
    expect_err(ERR_SELF_BUY, || c.ft_on_transfer(alice(), U128(5_000_000), offer_msg(&id, 0, 0, T0 + DAY).to_string()));
    Ctx::new(usdc()).set();
    let s0 = usage(&mut c);
    let _ = c.ft_on_transfer(bob(), U128(5_000_000), offer_msg(&id, 0, 0, T0 + DAY).to_string());
    let used = (usage(&mut c) - s0) as u128;
    assert_eq!(c.storage_credit_of(bob()).0, credit - used * byte_cost(), "storage paid from the credit, exactly");
    let o = c.offer(1).unwrap();
    assert_eq!((o.currency, o.amount.0, o.offerer_id.clone()), (Currency::Usdc, 5_000_000, bob()));
    assert_eq!(totals(&c)["offers_near"], "0");
    assert!(c.proceeds.contains_key(&(bob(), Currency::Usdc)));
    // usdc disabled → an offer msg can only come from wNEAR, which may not offer
    let mut c = setup_with(None);
    let id = mint_to(&mut c, alice());
    Ctx::new(wnear()).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(bob(), U128(5), offer_msg(&id, 0, 0, T0 + DAY).to_string()));
}

// ── C4: cancel_offer ───────────────────────────────────────────────────────────────────────────

#[test]
fn cancel_offer_guards_refunds_and_expiry() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_NO_OFFER, || c.cancel_offer(99));
    Ctx::new(bob()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.cancel_offer(oid));
    Ctx::new(carol()).dep(1).ms(T0 + DAY - 1).set();
    expect_err(ERR_NOT_OFFERER, || c.cancel_offer(oid));
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_NOT_OFFERER, || c.cancel_offer(oid));
    assert!(c.offer(oid).is_some());
    // the offerer cancels: refund through the payout path
    Ctx::new(bob()).dep(1).set();
    let s0 = usage(&mut c);
    c.cancel_offer(oid);
    assert!(usage(&mut c) < s0, "freed stake stays in the contract");
    assert_eq!(transfers(), vec![(bob(), ONE_NEAR)]);
    let cs = calls();
    assert_eq!((cs[0].1.as_str(), cs[0].2.clone()), ("on_payout", json!({"account_id":"bob.testnet","currency":"near","amount":ONE_NEAR.to_string()})));
    assert_eq!(
        events("offer_cancelled"),
        vec![json!({"offer_id":oid,"token_id":id,"offerer_id":"bob.testnet","by_id":"bob.testnet","amount":ONE_NEAR.to_string(),"currency":"near"})]
    );
    assert_eq!(c.offer(oid), None);
    assert!(c.offers_for(id.clone(), 0, 50).is_empty() && c.offers_by(bob(), 0, 50).is_empty());
    assert_eq!(totals(&c)["offers_near"], "0");
    expect_err(ERR_NO_OFFER, || c.cancel_offer(oid));
    // after expiry anyone may cancel; the refund still goes to the offerer
    let oid = near_offer(&mut c, bob(), &id, 2 * ONE_NEAR);
    Ctx::new(carol()).dep(1).ms(T0 + DAY).set();
    c.cancel_offer(oid);
    assert_eq!(transfers(), vec![(bob(), 2 * ONE_NEAR)]);
    assert_eq!(events("offer_cancelled")[0]["by_id"], "carol.testnet");
    // a failed refund is credited to proceeds_of(offerer), overwriting the reserved slot
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    let s1 = usage(&mut c);
    c.on_payout(bob(), Currency::Near, U128(2 * ONE_NEAR));
    assert_eq!(usage(&mut c), s1);
    assert_eq!(serde_json::to_value(c.proceeds_of(bob())).unwrap(), json!([{"currency":"near","amount":(2 * ONE_NEAR).to_string()}]));
}

#[test]
fn cancel_usdc_offer_refunds_with_ft_transfer() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(&mut c, usdc(), bob(), 5_000_000, offer_msg(&id, 0, 0, T0 + DAY));
    Ctx::new(bob()).dep(1).set();
    c.cancel_offer(1);
    let cs = calls();
    assert_eq!((cs[0].0.clone(), cs[0].1.as_str(), cs[0].3), (usdc(), "ft_transfer", 1));
    assert_eq!(cs[0].2, json!({"receiver_id":"bob.testnet","amount":"5000000","memo":"satchel sale"}));
    assert_eq!(cs[1].2, json!({"account_id":"bob.testnet","currency":"usdc","amount":"5000000"}));
}

#[test]
fn offer_indexes_survive_swap_remove() {
    let mut c = setup();
    let a = mint_to(&mut c, alice());
    let b = mint_to(&mut c, alice());
    let ids: Vec<u64> = (0..4).map(|i| near_offer(&mut c, if i % 2 == 0 { bob() } else { carol() }, if i < 3 { &a } else { &b }, 10 + i as u128)).collect();
    let ids_for = |c: &Contract, t: &str| c.offers_for(t.into(), 0, 50).into_iter().map(|o| o.id).collect::<Vec<_>>();
    let ids_by = |c: &Contract, x: AccountId| c.offers_by(x, 0, 50).into_iter().map(|o| o.id).collect::<Vec<_>>();
    assert_eq!(ids_for(&c, &a), vec![ids[0], ids[1], ids[2]]);
    assert_eq!(ids_by(&c, bob()), vec![ids[0], ids[2]]);
    // remove the first of token a: the last (ids[2]) moves into slot 0
    Ctx::new(bob()).dep(1).set();
    c.cancel_offer(ids[0]);
    assert_eq!(ids_for(&c, &a), vec![ids[2], ids[1]]);
    assert_eq!(ids_by(&c, bob()), vec![ids[2]]);
    // the moved offer's stored positions were updated: removing it now leaves the index consistent
    Ctx::new(bob()).dep(1).set();
    c.cancel_offer(ids[2]);
    assert_eq!(ids_for(&c, &a), vec![ids[1]]);
    assert!(ids_by(&c, bob()).is_empty());
    assert_eq!(c.market.by_account.len("bob.testnet"), 0);
    Ctx::new(carol()).dep(1).set();
    c.cancel_offer(ids[1]);
    c.cancel_offer(ids[3]);
    assert!(ids_for(&c, &a).is_empty() && ids_for(&c, &b).is_empty() && ids_by(&c, carol()).is_empty());
    assert_eq!(c.market.by_token.len(&a), 0);
}

// ── C4: accept_offer ───────────────────────────────────────────────────────────────────────────

#[test]
fn accept_offer_guards() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    let acc_ = |c: &mut Contract, who: AccountId, dep: u128, h: u64, t: u64, oid: u64| {
        Ctx::new(who).dep(dep).at(h).ms(t).set();
        c.accept_offer(oid)
    };
    expect_err(ERR_NO_OFFER, || acc_(&mut c, alice(), 1, 1000, T0, 99));
    expect_err(ERR_NOT_OWNER, || acc_(&mut c, carol(), 1, 1000, T0, oid));
    expect_err(ERR_NOT_OWNER, || acc_(&mut c, bob(), 1, 1000, T0, oid));
    expect_err(ERR_DEPOSIT, || acc_(&mut c, alice(), 0, 1000, T0, oid));
    expect_err(ERR_DEPOSIT, || acc_(&mut c, alice(), 2, 1000, T0, oid));
    expect_err(ERR_OFFER_EXPIRED, || acc_(&mut c, alice(), 1, 1000, T0 + DAY, oid));
    // a new signature makes the offer stale
    sign(&mut c, &alice(), &id, 1000);
    expect_err(ERR_OFFER_STALE, || acc_(&mut c, alice(), 1, 2000, T0, oid));
    // an offer on the new state: the quiet period applies (listable_at = 1000 + 250)
    let oid2 = near_offer(&mut c, bob(), &id, ONE_NEAR);
    expect_err(ERR_QUIET_PERIOD, || acc_(&mut c, alice(), 1, 1249, T0, oid2));
    // a withdrawal makes it stale
    Ctx::new(carol()).dep(ONE_NEAR).set();
    c.deposit_near(id.clone());
    let oid3 = near_offer(&mut c, bob(), &id, ONE_NEAR); // binds to epoch 0
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(1), None);
    expect_err(ERR_OFFER_STALE, || acc_(&mut c, alice(), 1, 2000, T0, oid3));
    // the offerer became the owner by another path → ERR_SELF_BUY
    Ctx::new(alice()).dep(1).set();
    c.nft_transfer(bob(), id.clone(), None, None);
    let oid4 = near_offer(&mut c, carol(), &id, ONE_NEAR);
    Ctx::new(bob()).dep(1).set();
    c.nft_transfer(carol(), id.clone(), None, None);
    expect_err(ERR_SELF_BUY, || acc_(&mut c, carol(), 1, 2000, T0, oid4));
    assert_eq!(c.offers_for(id.clone(), 0, 50).len(), 4, "every refusal left the offers in place");
    assert!(events("offer_accepted").is_empty());
    // exactly at the quiet-period boundary: owner is carol now; oid2 binds to sig_count 1, epoch 0 → stale (epoch 1)
    expect_err(ERR_OFFER_STALE, || acc_(&mut c, carol(), 1, 1250, T0, oid2));
}

#[test]
fn accept_offer_at_the_quiet_period_boundary() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, &alice(), &id, 1000);
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    Ctx::new(alice()).dep(1).at(1249).set();
    expect_err(ERR_QUIET_PERIOD, || c.accept_offer(oid));
    Ctx::new(alice()).dep(1).at(1250).set();
    c.accept_offer(oid);
    assert_eq!(c.owner_of(&id), bob());
}

#[test]
fn accept_near_offer_moves_the_nft_and_pays_the_seller() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    let snap = inside(&c, &id);
    let oid = near_offer(&mut c, bob(), &id, 2 * ONE_NEAR);
    let other = near_offer(&mut c, carol(), &id, ONE_NEAR);
    Ctx::new(alice()).dep(1).set();
    let s0 = usage(&mut c);
    c.accept_offer(oid);
    assert!(usage(&mut c) <= s0, "the freed offer pays for the seller's proceeds slot");
    assert_eq!(c.owner_of(&id), bob());
    assert_eq!(inside(&c, &id), snap, "inside balances move with the NFT");
    assert_eq!(c.offer(oid), None);
    assert_eq!(transfers(), vec![(alice(), 2 * ONE_NEAR)]);
    let cs = calls();
    assert_eq!((cs[0].1.as_str(), cs[0].2.clone()), ("on_payout", json!({"account_id":"alice.testnet","currency":"near","amount":(2 * ONE_NEAR).to_string()})));
    assert_eq!(
        events("offer_accepted"),
        vec![json!({"offer_id":oid,"token_id":id,"seller_id":"alice.testnet","buyer_id":"bob.testnet","amount":(2 * ONE_NEAR).to_string(),"currency":"near"})]
    );
    assert!(get_logs().iter().any(|l| l.contains("\"nft_transfer\"") && l.contains("\"memo\":\"offer\"")));
    assert_eq!(totals(&c)["offers_near"], ONE_NEAR.to_string(), "only carol's offer is still escrowed");
    assert!(c.proceeds.contains_key(&(alice(), Currency::Near)));
    // the payout fails (e.g. deleted seller) → credited to proceeds; no storage growth
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    let s1 = usage(&mut c);
    c.on_payout(alice(), Currency::Near, U128(2 * ONE_NEAR));
    assert_eq!(usage(&mut c), s1);
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 2 * ONE_NEAR);
    // the previous owner lost control; the new owner can accept the other open offer (same state)
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.accept_offer(other));
    expect_err(ERR_NOT_OWNER, || c.withdraw_near(id.clone(), U128(1), None));
    Ctx::new(bob()).dep(1).set();
    c.accept_offer(other);
    assert_eq!(c.owner_of(&id), carol());
    assert_eq!(transfers(), vec![(bob(), ONE_NEAR)]);
    assert_eq!(totals(&c)["offers_near"], "0");
}

#[test]
fn accept_delists_a_listed_token_and_pays_usdc() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(9_000_000), Currency::Usdc);
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(&mut c, usdc(), bob(), 5_000_000, offer_msg(&id, 0, 0, T0 + DAY));
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(1);
    assert_eq!(c.owner_of(&id), bob());
    assert!(c.token_state(&id).listing.is_none());
    assert!(c.listings(0, 50).is_empty());
    assert_eq!(events("delisted"), vec![json!({"token_id":id,"listing_id":lid,"seller_id":"alice.testnet"})]);
    assert!(events("sold").is_empty());
    let cs = calls();
    assert_eq!((cs[0].0.clone(), cs[0].1.as_str(), cs[0].3), (usdc(), "ft_transfer", 1));
    assert_eq!(cs[0].2, json!({"receiver_id":"alice.testnet","amount":"5000000","memo":"satchel sale"}));
    // the old listing can't be bought any more
    Ctx::new(usdc()).set();
    expect_err(
        ERR_NOT_LISTED,
        || c.ft_on_transfer(carol(), U128(9_000_000), json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":0}}).to_string()),
    );
    // and the new owner can sign right away (the token had never signed)
    sign(&mut c, &bob(), &id, 1001);
    assert_eq!(c.token_state(&id).sig_count, 1);
}

#[test]
fn a_full_token_of_offers_costs_the_same_to_accept() {
    // no per-token cap: accept and cancel are O(1) whatever the number of open offers
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let mut last = 0;
    for i in 0..60u32 {
        let who = acc(&format!("o{i}.testnet"));
        last = near_offer(&mut c, who, &id, 1 + i as u128);
    }
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(1);
    assert_eq!(c.market.by_token.len(&id), 59);
    assert_eq!(c.offers_for(id.clone(), 0, 50)[0].id, last, "the last entry moved into slot 0");
    assert_eq!(c.offers_for(id.clone(), 0, 100).len(), 50, "pages are capped at MAX_PAGE");
}

// ── M-01: contract-paid storage is paid by the contract's own NEAR, never by escrow ──────────────
// The mock never rolls state back after a panic, so every refused case runs on its own fresh contract. And
// `testing_env!` keeps the storage but restarts the usage counter at the `VMContextBuilder` default on every call, so
// a storage delta is only meaningful inside one call: flush first (`bal_for`), then measure in the call's own context.

/// Where every mocked call's `env::storage_usage()` starts (the `VMContextBuilder` default, 300 KiB).
const CALL_BASE_USAGE: u64 = 1024 * 300;

/// Flushes pending writes, then returns the account balance at which the next call starts with exactly
/// `escrow_near + spare` above its storage stake.
fn bal_for(c: &mut Contract, spare: u128) -> u128 {
    usage(c);
    CALL_BASE_USAGE as u128 * byte_cost() + c.market.totals.escrow_near() + spare
}
/// Bytes the last call added (negative: freed), measured in its own context.
fn grew(c: &mut Contract) -> i64 {
    usage(c) as i64 - CALL_BASE_USAGE as i64
}
/// A 64-char account id, the longest NEAR allows: a new holder's entries are as large as they get.
fn long_acc(first: char) -> AccountId {
    acc(&format!("{first}{}.testnet", "x".repeat(55)))
}
/// alice holds `1` (2 NEAR inside, deposited by bob) and `2`; bob escrows a NEAR offer on `2` and a storage credit.
fn m01_setup() -> (Contract, String) {
    let mut c = setup();
    let id = funded(&mut c, 2 * ONE_NEAR);
    let other = mint_to(&mut c, alice());
    near_offer(&mut c, bob(), &other, ONE_NEAR);
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    (c, id)
}
/// `nft_transfer(1 → carol)` with `spare` yocto above escrow. Returns the panic (if any) and the storage it grew.
fn m01_transfer(spare: u128) -> (Option<String>, i64) {
    let (mut c, id) = m01_setup();
    let b = bal_for(&mut c, spare);
    Ctx::new(alice()).dep(1).bal(b).set();
    let r = panic_msg(|| c.nft_transfer(carol(), id.clone(), None, None));
    (r, grew(&mut c))
}

#[test]
fn m01_transfer_growth_is_paid_by_the_buffer_never_by_escrow() {
    let (ok, grew) = m01_transfer(ONE_NEAR);
    assert_eq!(ok, None);
    assert!((100..400).contains(&grew), "a new holder costs the contract {grew} B (S-02; sandbox: 150–250 B)");
    // exactly enough spare NEAR passes (the attached yocto is part of the balance and stays); one yocto less would
    // dip into escrow and is refused, naming the shortfall
    let exact = grew as u128 * byte_cost() - 1;
    assert_eq!(m01_transfer(exact).0, None);
    let (r, _) = m01_transfer(exact - 1);
    assert_eq!(r.as_deref(), Some("ERR_INSOLVENT: top the contract up by ≥ 1 yocto (a plain transfer); its own NEAR pays storage, never escrow"));
    // with no spare at all, every kind of escrow counts: inside NEAR, the NEAR offer and the storage credit
    let (mut c, id) = m01_setup();
    let t = c.market.totals;
    assert!(t.inside_near > 0 && t.offers_near > 0 && t.storage_credit > 0);
    assert_eq!(t.escrow_near(), t.inside_near + t.offers_near + t.storage_credit + t.proceeds_near);
    let b = bal_for(&mut c, 0);
    Ctx::new(alice()).dep(1).bal(b).set();
    expect_err(ERR_INSOLVENT, || c.nft_transfer(carol(), id.clone(), None, None));
}

#[test]
fn m01_sales_to_a_new_holder_are_refused_when_only_escrow_could_pay() {
    // NEAR buy by a 64-char holder: grows storage even though the listing is freed. The attached price is part of the
    // balance during the call (the mock adds it, as the runtime does), and the payout takes it out before the guard.
    let near_buy = |spare: u128| {
        let (mut c, id) = m01_setup();
        Ctx::new(alice()).dep(10 * MILLI).set();
        let lid = c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
        let b = bal_for(&mut c, spare);
        Ctx::new(long_acc('e')).dep(ONE_NEAR).bal(b).set();
        let r = panic_msg(|| c.buy(id.clone(), lid, 0));
        (r, grew(&mut c))
    };
    let (ok, grew) = near_buy(ONE_NEAR);
    assert_eq!(ok, None);
    assert!(grew > 0, "this sale grows storage by {grew} B");
    assert_eq!(near_buy(grew as u128 * byte_cost()).0, None);
    assert!(near_buy(grew as u128 * byte_cost() - 1).0.unwrap().starts_with("ERR_INSOLVENT: "));
    // USDC buy through ft_on_transfer: the panic makes the FT refund 100 %
    let usdc_buy = |spare: u128| {
        let (mut c, id) = m01_setup();
        Ctx::new(alice()).dep(10 * MILLI).set();
        let lid = c.list(id.clone(), U128(4_000_000), Currency::Usdc);
        let b = bal_for(&mut c, spare);
        Ctx::new(usdc()).bal(b).set();
        let msg = json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":0}}).to_string();
        panic_msg(|| c.ft_on_transfer(long_acc('f'), U128(4_000_000), msg))
    };
    assert_eq!(usdc_buy(ONE_NEAR), None);
    assert!(usdc_buy(0).unwrap().starts_with("ERR_INSOLVENT: "));
}

#[test]
fn m01_calls_that_free_storage_never_trip_the_guard() {
    // The balance covers the stake and the offer being paid out, but none of the remaining escrow: already short.
    // An accept frees the offer record, so it can't make I-M1 worse and must still go through.
    let (mut c, id) = m01_setup();
    let oid = near_offer(&mut c, long_acc('g'), &id, ONE_NEAR);
    let b = bal_for(&mut c, 0) - c.market.totals.escrow_near() + ONE_NEAR;
    Ctx::new(alice()).dep(1).bal(b).set();
    c.accept_offer(oid);
    let g = grew(&mut c);
    assert!(g < 0, "the accept freed storage ({g} B)");
    assert_eq!(c.owner_of(&id), long_acc('g'));
    // a NEAR buy by a short-id holder frees the listing and adds less than it frees
    let (mut c, id) = m01_setup();
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
    let b = bal_for(&mut c, 0) - c.market.totals.escrow_near() + ONE_NEAR;
    Ctx::new(carol()).dep(ONE_NEAR).bal(b).set();
    c.buy(id.clone(), lid, 0);
    let g = grew(&mut c);
    assert!(g <= 0, "a short-id buyer adds less than the listing frees ({g} B)");
    assert_eq!(c.owner_of(&id), carol());
}

#[test]
fn m01_proceeds_near_follows_failed_payouts_and_withdrawals() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    Ctx::new(bob()).dep(3 * ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    assert_eq!(totals(&c)["proceeds_near"], "0", "the payout is in flight, not owed");
    let near_payout = |c: &mut Contract, results: Vec<PromiseResult>| {
        Ctx::new(me()).results(results).set();
        c.on_payout(alice(), Currency::Near, U128(3 * ONE_NEAR));
    };
    near_payout(&mut c, vec![PromiseResult::Successful(vec![])]);
    assert_eq!(totals(&c)["proceeds_near"], "0");
    near_payout(&mut c, vec![]); // not a callback of one payout (S-13): a no-op
    assert_eq!(totals(&c)["proceeds_near"], "0");
    near_payout(&mut c, vec![PromiseResult::Failed]);
    assert_eq!(totals(&c)["proceeds_near"], (3 * ONE_NEAR).to_string());
    assert_eq!(totals(&c)["escrow_near"], (3 * ONE_NEAR).to_string());
    // failed USDC payouts are owed in USDC (I-M3), never counted as NEAR
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    c.on_payout(alice(), Currency::Usdc, U128(5_000_000));
    assert_eq!(totals(&c)["proceeds_near"], (3 * ONE_NEAR).to_string());
    // withdraw_proceeds takes it out of the total before the transfer; a failed transfer puts it back
    Ctx::new(alice()).dep(1).set();
    c.withdraw_proceeds(Currency::Near);
    assert_eq!(transfers(), vec![(alice(), 3 * ONE_NEAR)]);
    assert_eq!(totals(&c)["proceeds_near"], "0");
    near_payout(&mut c, vec![PromiseResult::Failed]);
    assert_eq!(totals(&c)["proceeds_near"], (3 * ONE_NEAR).to_string());
    Ctx::new(alice()).dep(1).set();
    c.withdraw_proceeds(Currency::Usdc);
    assert_eq!(totals(&c)["proceeds_near"], (3 * ONE_NEAR).to_string(), "a USDC withdrawal leaves the NEAR total alone");
}

/// One M-01 scenario on a fresh contract: alice holds `1` and `2`; bob escrows `inside` in `1`, a NEAR `offer` on `2`
/// and a storage `credit`; `to` (a holder already, or not) then receives `1` by `nft_transfer`, or buys it for 1 NEAR.
/// `spare` = yocto above escrow at the call (None: a huge balance, to measure). Returns the panic, the bytes the call
/// grew, and `free − escrow_near` after it.
fn m01_case(inside: u128, offer: u128, credit: u128, to: &AccountId, existing: bool, sale: bool, spare: Option<u128>) -> (Option<String>, i64, i128) {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let other = mint_to(&mut c, alice());
    if inside > 0 {
        Ctx::new(bob()).dep(inside).set();
        c.deposit_near(id.clone());
    }
    if offer > 0 {
        near_offer(&mut c, bob(), &other, offer);
    }
    if credit > 0 {
        Ctx::new(bob()).dep(credit).set();
        c.prepay_storage(None);
    }
    if existing {
        mint_to(&mut c, to.clone());
    }
    let lid = sale.then(|| {
        Ctx::new(alice()).dep(10 * MILLI).set();
        c.list(id.clone(), U128(ONE_NEAR), Currency::Near)
    });
    let b = match spare {
        Some(s) => bal_for(&mut c, s),
        None => {
            usage(&mut c);
            1_000_000 * ONE_NEAR
        }
    };
    let r = match lid {
        Some(lid) => {
            Ctx::new(to.clone()).dep(ONE_NEAR).bal(b).set();
            panic_msg(|| c.buy(id.clone(), lid, 0))
        }
        None => {
            Ctx::new(alice()).dep(1).bal(b).set();
            panic_msg(|| c.nft_transfer(to.clone(), id.clone(), None, None))
        }
    };
    let g = grew(&mut c);
    let free = env::account_balance().as_yoctonear() as i128 - (env::storage_usage() as u128 * byte_cost()) as i128;
    (r, g, free - c.market.totals.escrow_near() as i128)
}

proptest! {
    #![proptest_config(ProptestConfig { cases: cases(48), failure_persistence: None, ..ProptestConfig::default() })]

    /// M-01 / I-M1: for random escrow mixes, receivers (new or existing holders, 10–64-char ids), transfers and NEAR
    /// buys, and buffers within ±60 B (± a few yocto) of the exact storage the call adds, `ensure_solvent` refuses
    /// exactly when the call grew storage and the spare NEAR (plus the attached yocto a transfer leaves behind) can't
    /// pay it. A refusal is always `ERR_INSOLVENT`; an accepted call leaves `free ≥ escrow_near`.
    #[test]
    fn prop_ensure_solvent_refuses_exactly_when_escrow_would_pay(
        inside in prop_oneof![Just(0u128), 2 * MILLI..5 * ONE_NEAR],
        offer in prop_oneof![Just(0u128), 1u128..3 * ONE_NEAR],
        credit in prop_oneof![Just(0u128), 2 * MILLI..ONE_NEAR],
        to_len in 1usize..56,
        existing in any::<bool>(),
        sale in any::<bool>(),
        bytes in -60i64..60,
        yocto in -3i128..3,
    ) {
        let to = acc(&format!("t{}.testnet", "y".repeat(to_len)));
        let (ok, g0, _) = m01_case(inside, offer, credit, &to, existing, sale, None);
        prop_assert_eq!(ok, None);
        let need = g0.max(0) as i128 * byte_cost() as i128;
        let spare = (need + bytes as i128 * byte_cost() as i128 + yocto).max(0);
        let (r, g, slack_after) = m01_case(inside, offer, credit, &to, existing, sale, Some(spare as u128));
        prop_assert_eq!(g, g0, "the growth doesn't depend on the balance");
        let kept = if sale { 0 } else { 1 }; // a transfer's 1 yocto stays; a buy's price leaves with the payout
        let refuse = g > 0 && spare + kept < need;
        match r {
            Some(msg) => {
                prop_assert!(refuse, "refused although the buffer covers it: {msg}");
                prop_assert!(msg.starts_with("ERR_INSOLVENT: "), "{msg}");
            }
            None => {
                prop_assert!(!refuse, "accepted although only escrow could pay {g} B");
                prop_assert!(slack_after >= 0, "I-M1 broken after the call: free − escrow = {slack_after}");
            }
        }
    }
}

// ── IdIndex: swap-remove property ──────────────────────────────────────────────────────────────

/// Case count: `PROPTEST_CASES` if set (deep runs, docs/security/fuzzing.md §8), else the fast CI default.
fn cases(default: u32) -> u32 {
    std::env::var("PROPTEST_CASES").ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

proptest! {
    #![proptest_config(ProptestConfig { cases: cases(64), failure_persistence: None, ..ProptestConfig::default() })]

    /// The index behaves exactly like `Vec::swap_remove` per key, and `remove` reports the entry that moved.
    #[test]
    fn prop_id_index_is_a_swap_remove_vec(ops in proptest::collection::vec((0u8..3, any::<bool>(), any::<u16>()), 1..80)) {
        wipe();
        Ctx::new(me()).set();
        let mut idx = IdIndex::new(StorageKey::OffersByTokenLen, StorageKey::OffersByToken);
        let mut model: BTreeMap<String, Vec<u64>> = BTreeMap::new();
        let mut next = 1u64;
        for (k, push, r) in ops {
            let key = k.to_string();
            let v = model.entry(key.clone()).or_default();
            if push || v.is_empty() {
                let pos = idx.push(&key, next);
                prop_assert_eq!(pos as usize, v.len());
                v.push(next);
                next += 1;
            } else {
                let pos = (r as usize) % v.len();
                let moved = idx.remove(&key, pos as u32);
                let last = *v.last().unwrap();
                v.swap_remove(pos);
                prop_assert_eq!(moved, (pos < v.len()).then_some((last, pos as u32)));
            }
            prop_assert_eq!(idx.len(&key) as usize, v.len());
            prop_assert_eq!(idx.page(&key, 0, 50), v.iter().take(50).copied().collect::<Vec<_>>());
        }
    }
}

// ── I-M2 / I-M4 / I-M5: accounting property against a reference model ────────────────────────────

#[derive(Debug, Clone)]
enum Op {
    DepositNear { t: usize, who: usize, amount: u128 },
    DepositUsdc { t: usize, who: usize, amount: u128 },
    WithdrawNear { t: usize, frac: u8, fail: bool },
    WithdrawUsdc { t: usize, frac: u8, fail: bool },
    OfferNear { t: usize, who: usize, amount: u128 },
    OfferUsdc { t: usize, who: usize, amount: u128 },
    Cancel { pick: usize, by_offerer: bool, fail: bool },
    Accept { pick: usize, fail: bool },
    Transfer { t: usize, to: usize },
    /// M-01: `withdraw_proceeds(near)`, the only path that lowers `proceeds_near` (a failed payout raises it again).
    WithdrawProceeds { who: usize, fail: bool },
    Sign { t: usize },
    Tick,
}

fn op_strategy() -> impl Strategy<Value = Op> {
    let t = 0usize..3;
    let who = 0usize..4;
    let amt = 1u128..5_000_000_000_000_000_000_000_000u128;
    prop_oneof![
        (t.clone(), who.clone(), amt.clone()).prop_map(|(t, who, amount)| Op::DepositNear { t, who, amount: amount + 2 * MILLI }),
        (t.clone(), who.clone(), 1u128..10_000_000).prop_map(|(t, who, amount)| Op::DepositUsdc { t, who, amount }),
        (t.clone(), any::<u8>(), any::<bool>()).prop_map(|(t, frac, fail)| Op::WithdrawNear { t, frac, fail }),
        (t.clone(), any::<u8>(), any::<bool>()).prop_map(|(t, frac, fail)| Op::WithdrawUsdc { t, frac, fail }),
        (t.clone(), who.clone(), amt).prop_map(|(t, who, amount)| Op::OfferNear { t, who, amount }),
        (t.clone(), who.clone(), 1u128..10_000_000).prop_map(|(t, who, amount)| Op::OfferUsdc { t, who, amount }),
        (any::<usize>(), any::<bool>(), any::<bool>()).prop_map(|(pick, by_offerer, fail)| Op::Cancel { pick, by_offerer, fail }),
        (any::<usize>(), any::<bool>()).prop_map(|(pick, fail)| Op::Accept { pick, fail }),
        (who.clone(), any::<bool>()).prop_map(|(who, fail)| Op::WithdrawProceeds { who, fail }),
        (t.clone(), who).prop_map(|(t, to)| Op::Transfer { t, to }),
        t.prop_map(|t| Op::Sign { t }),
        Just(Op::Tick),
    ]
}

#[derive(Default, Debug)]
struct Model {
    near: BTreeMap<String, u128>,
    usdc: BTreeMap<String, u128>,
    epoch: BTreeMap<String, u64>,
    /// id → (token, offerer, amount, currency)
    offers: BTreeMap<u64, (String, AccountId, u128, Currency)>,
    proceeds: BTreeMap<(AccountId, Currency), u128>,
}

proptest! {
    #![proptest_config(ProptestConfig { cases: cases(48), failure_persistence: None, ..ProptestConfig::default() })]

    /// Random mixes of deposits, withdrawals (delivered or failed), offers, cancels, accepts (paid or failed),
    /// transfers and signatures. After every step the contract's per-token balances, epochs, open offers, proceeds
    /// and totals equal the model; refused steps change nothing.
    #[test]
    fn prop_accounting_matches_model(ops in proptest::collection::vec(op_strategy(), 1..40)) {
        let people = [alice(), bob(), carol(), acc("dave.testnet")];
        let mut c = setup();
        let toks: Vec<String> = (0..3).map(|_| mint_to(&mut c, alice())).collect();
        for p in &people {
            Ctx::new(p.clone()).dep(ONE_NEAR).set();
            c.prepay_storage(None);
        }
        let mut m = Model::default();
        let mut height = 2_000u64;
        for op in ops {
            height += 1;
            match op {
                Op::DepositNear { t, who, amount } => {
                    Ctx::new(people[who].clone()).dep(amount).at(height).set();
                    let got = c.deposit_near(toks[t].clone()).0;
                    prop_assert!(got <= amount);
                    *m.near.entry(toks[t].clone()).or_default() += got;
                }
                Op::DepositUsdc { t, who, amount } => {
                    Ctx::new(usdc()).at(height).set();
                    let _ = c.ft_on_transfer(people[who].clone(), U128(amount), deposit_msg(&toks[t]).to_string());
                    *m.usdc.entry(toks[t].clone()).or_default() += amount;
                }
                Op::WithdrawNear { t, frac, fail } | Op::WithdrawUsdc { t, frac, fail } => {
                    let is_near = matches!(op, Op::WithdrawNear { .. });
                    let id = toks[t].clone();
                    let bal = if is_near { m.near.get(&id).copied().unwrap_or(0) } else { m.usdc.get(&id).copied().unwrap_or(0) };
                    let amount = bal * (frac as u128 + 1) / 256;
                    let owner = c.owner_of(&id);
                    Ctx::new(owner).dep(1).at(height).set();
                    let listed = c.token_state(&id).listing.is_some();
                    let r = panic_msg(|| if is_near { c.withdraw_near(id.clone(), U128(amount), None) } else { c.withdraw_ft(id.clone(), usdc(), U128(amount), None) });
                    if listed || amount == 0 {
                        prop_assert!(r.is_some());
                    } else {
                        prop_assert_eq!(r, None);
                        let slot = if is_near { m.near.get_mut(&id).unwrap() } else { m.usdc.get_mut(&id).unwrap() };
                        *slot -= amount;
                        *m.epoch.entry(id.clone()).or_default() += 1;
                        Ctx::new(me()).at(height).results(vec![if fail { PromiseResult::Failed } else { PromiseResult::Successful(vec![]) }]).set();
                        let ok = c.on_inside_withdraw(id.clone(), if is_near { None } else { Some(usdc()) }, U128(amount));
                        prop_assert_eq!(ok, !fail);
                        if fail {
                            let slot = if is_near { m.near.get_mut(&id).unwrap() } else { m.usdc.get_mut(&id).unwrap() };
                            *slot += amount;
                        }
                    }
                }
                Op::OfferNear { t, who, amount } | Op::OfferUsdc { t, who, amount } => {
                    let is_near = matches!(op, Op::OfferNear { .. });
                    let id = toks[t].clone();
                    let (sc, ep) = (c.token_state(&id).sig_count, c.inside_epoch(&id));
                    let offerer = people[who].clone();
                    let n_by = c.market.by_account.len(offerer.as_str());
                    let r = if is_near {
                        Ctx::new(offerer.clone()).dep(amount + 10 * MILLI).at(height).set();
                        panic_msg(|| c.make_offer(id.clone(), U128(amount), sc, ep, T0 + DAY))
                    } else {
                        Ctx::new(usdc()).at(height).set();
                        panic_msg(|| c.ft_on_transfer(offerer.clone(), U128(amount), offer_msg(&id, sc, ep, T0 + DAY).to_string()))
                    };
                    let owner = c.owner_of(&id);
                    if offerer == owner || n_by >= MAX_OFFERS_PER_ACCOUNT {
                        prop_assert!(r.is_some());
                    } else {
                        prop_assert_eq!(r, None);
                        let oid = c.market.next_offer_id - 1;
                        m.offers.insert(oid, (id, offerer, amount, if is_near { Currency::Near } else { Currency::Usdc }));
                    }
                }
                Op::Cancel { pick, by_offerer, fail } => {
                    if m.offers.is_empty() { continue; }
                    let oid = *m.offers.keys().nth(pick % m.offers.len()).unwrap();
                    let (_, offerer, amount, cur) = m.offers[&oid].clone();
                    let by = if by_offerer { offerer.clone() } else { acc("eve.testnet") };
                    Ctx::new(by).dep(1).at(height).set();
                    let r = panic_msg(|| c.cancel_offer(oid));
                    if !by_offerer {
                        prop_assert!(r.is_some(), "a stranger can't cancel before expiry");
                        continue;
                    }
                    prop_assert_eq!(r, None);
                    m.offers.remove(&oid);
                    Ctx::new(me()).at(height).results(vec![if fail { PromiseResult::Failed } else { PromiseResult::Successful(vec![]) }]).set();
                    c.on_payout(offerer.clone(), cur, U128(amount));
                    if fail { *m.proceeds.entry((offerer, cur)).or_default() += amount; }
                }
                Op::Accept { pick, fail } => {
                    if m.offers.is_empty() { continue; }
                    let oid = *m.offers.keys().nth(pick % m.offers.len()).unwrap();
                    let (id, offerer, amount, cur) = m.offers[&oid].clone();
                    let owner = c.owner_of(&id);
                    let o = c.offer(oid).unwrap();
                    let st = c.token_state(&id);
                    let ok_state = st.sig_count == o.expected_sig_count && c.inside_epoch(&id) == o.expected_inside_epoch
                        && height >= Contract::listable_at(&st) && offerer != owner;
                    Ctx::new(owner.clone()).dep(1).at(height).set();
                    let r = panic_msg(|| c.accept_offer(oid));
                    if !ok_state {
                        prop_assert!(r.is_some());
                        continue;
                    }
                    prop_assert_eq!(r, None);
                    prop_assert_eq!(c.owner_of(&id), offerer);
                    m.offers.remove(&oid);
                    Ctx::new(me()).at(height).results(vec![if fail { PromiseResult::Failed } else { PromiseResult::Successful(vec![]) }]).set();
                    c.on_payout(owner.clone(), cur, U128(amount));
                    if fail { *m.proceeds.entry((owner, cur)).or_default() += amount; }
                }
                Op::Transfer { t, to } => {
                    let id = toks[t].clone();
                    let owner = c.owner_of(&id);
                    if owner == people[to] || c.token_state(&id).listing.is_some() { continue; }
                    Ctx::new(owner).dep(1).at(height).set();
                    c.nft_transfer(people[to].clone(), id, None, None);
                }
                Op::WithdrawProceeds { who, fail } => {
                    let p = people[who].clone();
                    let owed = m.proceeds.get(&(p.clone(), Currency::Near)).copied().unwrap_or(0);
                    Ctx::new(p.clone()).dep(1).at(height).set();
                    let r = panic_msg(|| c.withdraw_proceeds(Currency::Near));
                    if owed == 0 {
                        prop_assert!(r.is_some(), "nothing owed");
                        continue;
                    }
                    prop_assert_eq!(r, None);
                    m.proceeds.insert((p.clone(), Currency::Near), 0);
                    Ctx::new(me()).at(height).results(vec![if fail { PromiseResult::Failed } else { PromiseResult::Successful(vec![]) }]).set();
                    c.on_payout(p.clone(), Currency::Near, U128(owed));
                    if fail { *m.proceeds.entry((p, Currency::Near)).or_default() += owed; }
                }
                Op::Sign { t } => {
                    let id = toks[t].clone();
                    if c.token_state(&id).listing.is_some() { continue; }
                    let owner = c.owner_of(&id);
                    sign(&mut c, &owner, &id, height);
                }
                Op::Tick => height += 300,
            }
            // ── invariants after every step ──
            let mut sum_near = 0u128;
            for id in &toks {
                let v = c.inside_of(id.clone()).unwrap();
                let mn = m.near.get(id).copied().unwrap_or(0);
                let mu = m.usdc.get(id).copied().unwrap_or(0);
                prop_assert_eq!(v.near.0, mn);
                prop_assert_eq!(v.fts.iter().find(|f| f.token == usdc()).map(|f| f.amount.0).unwrap_or(0), mu);
                prop_assert_eq!(v.inside_epoch, m.epoch.get(id).copied().unwrap_or(0));
                sum_near += mn;
                let mut open: Vec<u64> = c.offers_for(id.clone(), 0, 50).into_iter().map(|o| o.id).collect();
                open.sort();
                let want: Vec<u64> = m.offers.iter().filter(|(_, o)| &o.0 == id).map(|(k, _)| *k).collect();
                prop_assert_eq!(open, want);
            }
            let tv = c.market_totals();
            prop_assert_eq!(tv.inside_near.0, sum_near);
            let offers_near: u128 = m.offers.values().filter(|o| o.3 == Currency::Near).map(|o| o.2).sum();
            prop_assert_eq!(tv.offers_near.0, offers_near);
            let credits: u128 = people.iter().map(|p| c.storage_credit_of(p.clone()).0).sum();
            prop_assert_eq!(tv.storage_credit.0, credits);
            let proceeds_near: u128 = m.proceeds.iter().filter(|(k, _)| k.1 == Currency::Near).map(|(_, v)| *v).sum();
            prop_assert_eq!(tv.proceeds_near.0, proceeds_near);
            prop_assert_eq!(tv.escrow_near.0, sum_near + offers_near + credits + proceeds_near);
            for p in &people {
                let mut by: Vec<u64> = c.offers_by(p.clone(), 0, 50).into_iter().map(|o| o.id).collect();
                by.sort();
                let want: Vec<u64> = m.offers.iter().filter(|(_, o)| &o.1 == p).map(|(k, _)| *k).collect();
                prop_assert_eq!(by, want);
                for cur in [Currency::Near, Currency::Usdc] {
                    let got = c.proceeds.get(&(p.clone(), cur)).copied().unwrap_or(0);
                    prop_assert_eq!(got, m.proceeds.get(&(p.clone(), cur)).copied().unwrap_or(0));
                }
            }
        }
    }

    /// Q-04: inserting ANY key (unknown, or a duplicate of a real field) at any position of any of the three msg
    /// types, with any value, at the top level or inside `buy` / `offer`, is refused with ERR_BAD_MSG and changes
    /// nothing; the msg without the inserted key is accepted.
    #[test]
    fn prop_ft_msg_any_extra_key_is_refused(
        kind in 0usize..3,
        inner in any::<bool>(),
        pos in 0usize..8,
        key in prop_oneof![
            "[a-z_]{1,14}",
            Just("token_id".to_string()), Just("listing_id".to_string()), Just("expected_sig_count".to_string()),
            Just("receiver_id".to_string()), Just("buy".to_string()), Just("offer".to_string()), Just("deposit".to_string()),
        ],
        val in prop_oneof![Just("null"), Just("1"), Just("\"x\""), Just("{}"), Just("[]"), Just("true"), Just("\"1\"")],
    ) {
        let mut c = setup();
        let id = mint_to(&mut c, alice());
        Ctx::new(alice()).dep(10 * MILLI).set();
        let lid = c.list(id.clone(), U128(5_000_000), Currency::Usdc);
        Ctx::new(bob()).dep(10 * MILLI).set();
        c.prepay_storage(None);
        let (tag, fields): (&str, Vec<String>) = match kind {
            0 => ("buy", vec![format!("\"token_id\":\"{id}\""), format!("\"listing_id\":{lid}"), "\"expected_sig_count\":0".into()]),
            1 => ("offer", vec![
                format!("\"token_id\":\"{id}\""), "\"expected_sig_count\":0".into(), "\"expected_inside_epoch\":0".into(),
                format!("\"expires_at_ms\":{}", T0 + DAY),
            ]),
            _ => ("deposit", vec![]),
        };
        let extra = format!("\"{key}\":{val}");
        let body = |extra_inner: Option<&str>| match kind {
            2 => format!("\"{id}\""),
            _ => {
                let mut f = fields.clone();
                if let Some(e) = extra_inner {
                    f.insert(pos % (f.len() + 1), e.to_string());
                }
                format!("{{{}}}", f.join(","))
            }
        };
        let msg = if inner && kind != 2 {
            format!("{{\"{tag}\":{}}}", body(Some(&extra)))
        } else if pos % 2 == 0 {
            format!("{{\"{tag}\":{},{extra}}}", body(None))
        } else {
            format!("{{{extra},\"{tag}\":{}}}", body(None))
        };
        let amount = if kind == 0 { 5_000_000 } else { 3_000_000 };
        let s0 = (c.owner_of(&id), inside(&c, &id), totals(&c), c.offers_for(id.clone(), 0, 50).len(), c.storage_credit_of(bob()));
        Ctx::new(usdc()).set();
        let e = panic_msg(|| c.ft_on_transfer(bob(), U128(amount), msg.clone()));
        prop_assert!(e.as_deref().is_some_and(|e| e.starts_with("ERR_BAD_MSG: ")), "{msg} → {e:?}");
        prop_assert!(logged_event_names().is_empty() && get_created_receipts().is_empty(), "{msg}");
        prop_assert_eq!(&(c.owner_of(&id), inside(&c, &id), totals(&c), c.offers_for(id.clone(), 0, 50).len(), c.storage_credit_of(bob())), &s0);
        // the same msg without the inserted key is accepted
        let exact = format!("{{\"{tag}\":{}}}", body(None));
        Ctx::new(usdc()).set();
        let r = c.ft_on_transfer(bob(), U128(amount), exact.clone());
        prop_assert!(matches!(r, PromiseOrValue::Value(U128(0))), "{exact}");
    }

    /// `ft_on_transfer` never panics with anything but a stable code, whatever the msg (the FT refunds on a panic).
    #[test]
    fn prop_ft_msg_garbage_is_refused_cleanly(msg in ".{0,120}", amount in 1u128..u128::MAX) {
        let mut c = setup();
        mint_to(&mut c, alice());
        Ctx::new(usdc()).set();
        if let Some(e) = panic_msg(|| c.ft_on_transfer(bob(), U128(amount), msg.clone())) {
            prop_assert!(e.starts_with("ERR_"), "unstable panic {e:?} for msg {msg:?}");
        }
    }
}

// ── C5 compatibility: accept_offer clears allowances; delegates get no inside or offer powers ─────

fn grant(c: &mut Contract, owner: AccountId, id: &str, delegate: AccountId) {
    use crate::allowance::{Asset, CapInput};
    Ctx::new(owner).dep(10 * MILLI).set();
    c.set_allowance(id.into(), delegate, vec![CapInput { asset: Asset::Evm { chain_id: 11_155_111 }, limit: U128(10u128.pow(18)) }], None);
}

#[test]
fn delegates_cannot_withdraw_or_accept_and_accept_clears_allowances() {
    let mut c = setup();
    let id = funded(&mut c, ONE_NEAR);
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(&mut c, usdc(), bob(), 5_000_000, deposit_msg(&id));
    let bot = acc("bot.alice.testnet");
    grant(&mut c, alice(), &id, bot.clone());
    assert_eq!(c.allowances_of(id.clone()).len(), 1);
    let oid = near_offer(&mut c, bob(), &id, 2 * ONE_NEAR);
    // the delegate may only sign_for: never withdraw inside assets or accept or cancel an offer for the owner
    Ctx::new(bot.clone()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.withdraw_near(id.clone(), U128(1), None));
    expect_err(ERR_NOT_OWNER, || c.withdraw_ft(id.clone(), usdc(), U128(1), None));
    expect_err(ERR_NOT_OWNER, || c.accept_offer(oid));
    expect_err(ERR_NOT_OFFERER, || c.cancel_offer(oid));
    // a delegate's own offer spends the delegate's own money and binds nothing of the owner's
    Ctx::new(bot.clone()).dep(ONE_NEAR + 10 * MILLI).set();
    let own = c.make_offer(id.clone(), U128(ONE_NEAR), 0, 0, T0 + DAY);
    assert_eq!(c.offer(own).unwrap().offerer_id, bot);
    // accepting is an ownership change: the C5 reset rule clears every allowance in the same receipt
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(oid);
    assert_eq!(events("allowances_cleared"), vec![json!({"token_id": id, "delegate_ids": ["bot.alice.testnet"], "reason": "sale"})]);
    // cleared from state, not just hidden by the owner backstop: back with alice, nothing is left
    Ctx::new(bob()).dep(1).set();
    c.nft_transfer(alice(), id.clone(), None, None);
    assert!(c.allowances_of(id.clone()).is_empty());
}

// ── test audit 2026-10-30 (docs/testing/contract.md) ─────────────────────────────────────────────

/// `withdraw_storage_credit` emits its event with the exact amount, and pays with a bare transfer: there is NO
/// callback, so if that transfer ever failed the credit would not be restored (observation AUDIT-03; only possible if
/// the caller's account is deleted between the call and the transfer receipt).
#[test]
fn audit_withdraw_storage_credit_event_and_bare_transfer() {
    let mut c = setup();
    Ctx::new(bob()).dep(10 * MILLI).set();
    let credit = c.prepay_storage(None).0;
    Ctx::new(bob()).dep(1).set();
    c.withdraw_storage_credit();
    assert_eq!(events("storage_credit_withdrawn"), vec![json!({"account_id":"bob.testnet","amount":credit.to_string()})]);
    assert_eq!(transfers(), vec![(bob(), credit)]);
    assert!(calls().is_empty(), "no on_* callback follows the transfer");
}

/// The offer expiry boundary is half-open: acceptable while `now < expires_at_ms`, so 1 ms before it works and at
/// it fails (ERR_OFFER_EXPIRED), and from that same instant anyone may cancel it.
#[test]
fn audit_offer_expiry_boundary_is_half_open() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR); // expires at T0 + DAY
    Ctx::new(carol()).dep(1).ms(T0 + DAY - 1).set();
    expect_err(ERR_NOT_OFFERER, || c.cancel_offer(oid));
    Ctx::new(alice()).dep(1).ms(T0 + DAY).set();
    expect_err(ERR_OFFER_EXPIRED, || c.accept_offer(oid));
    Ctx::new(alice()).dep(1).ms(T0 + DAY - 1).set();
    c.accept_offer(oid);
    assert_eq!(c.owner_of(&id), bob());
    assert_eq!(transfers(), vec![(alice(), ONE_NEAR)]);
}

/// Offers bind to the token's state `(sig_count, inside_epoch)`, not to its owner: after a gift (no new signature, no
/// withdrawal) the NEW owner may accept an offer made to the old one, and gets paid. Documented as question Q-02.
#[test]
fn audit_offer_survives_a_gift_and_the_new_owner_accepts() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    Ctx::new(alice()).dep(1).set();
    c.nft_transfer(carol(), id.clone(), None, None);
    Ctx::new(carol()).dep(1).set();
    c.accept_offer(oid);
    assert_eq!(c.owner_of(&id), bob());
    assert_eq!(transfers(), vec![(carol(), ONE_NEAR)], "the current owner is paid, not the owner at offer time");
    assert_eq!(events("offer_accepted")[0]["seller_id"], "carol.testnet");
}

/// A sale through `buy` changes neither `sig_count` nor `inside_epoch`, so an offer made while the token was listed
/// stays acceptable by the buyer right away (sig_count 0 → no quiet period).
#[test]
fn audit_offer_made_while_listed_survives_the_sale() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    Ctx::new(carol()).dep(3 * ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    Ctx::new(carol()).dep(1).set();
    c.accept_offer(oid);
    assert_eq!(c.owner_of(&id), bob());
}

/// Deposits are allowed while listed (they only add value for the buyer); withdrawals are not (ERR_LISTED).
/// Q-03 (FIXED): `withdraw_near` refuses the contract, the MPC and the USDC contract as receiver (they used to be
/// accepted and the NEAR was lost); any other named receiver still gets it.
#[test]
fn audit_deposits_while_listed_and_withdraw_receivers() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(5), Currency::Near);
    Ctx::new(carol()).dep(ONE_NEAR).set();
    let credited = c.deposit_near(id.clone()).0;
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    ft_call(&mut c, usdc(), bob(), 7, deposit_msg(&id));
    assert_eq!(inside(&c, &id)["fts"], json!([{"token":"usdc.testnet","amount":"7"}]));
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_LISTED, || c.withdraw_near(id.clone(), U128(1), None));
    c.delist(id.clone());
    for r in [mpc(), usdc(), me()] {
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.withdraw_near(id.clone(), U128(1), Some(r)));
    }
    assert_eq!(inside(&c, &id)["near"], credited.to_string());
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(1), Some(carol()));
    assert_eq!(transfers(), vec![(carol(), 1)]);
    assert_eq!(inside(&c, &id)["near"], (credited - 1).to_string());
}

/// Offer pages: limit 0, offsets past the end and u32::MAX limits are empty or capped, never a panic.
#[test]
fn audit_offer_pages_edges() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for who in [bob(), carol(), bob()] {
        near_offer(&mut c, who, &id, ONE_NEAR);
    }
    assert!(c.offers_for(id.clone(), 0, 0).is_empty());
    assert!(c.offers_for(id.clone(), 3, 50).is_empty());
    assert!(c.offers_for(id.clone(), u64::MAX, u32::MAX).is_empty());
    assert_eq!(c.offers_for(id.clone(), 2, u32::MAX).iter().map(|o| o.id).collect::<Vec<_>>(), vec![3]);
    assert_eq!(c.offers_by(bob(), 0, u32::MAX).iter().map(|o| o.id).collect::<Vec<_>>(), vec![1, 3]);
}

/// `ft_on_transfer` msg parsing. Q-04 (FIXED): `deny_unknown_fields` on `FtMsg` and `OfferMsg`, so an unknown extra
/// field inside a known shape is now REFUSED (it used to be ignored); two top-level keys, a numeric token id, a wrong
/// case, a missing or a duplicate field were already refused. Pinned so a parser change is visible.
#[test]
fn audit_ft_msg_strict_cases() {
    let ok = [
        r#"{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}"#,
        r#"{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1}}"#,
        r#"{"deposit":"3"}"#,
        // field order and whitespace are free
        r#" { "buy" : { "expected_sig_count" : 4 , "listing_id" : 7 , "token_id" : "3" } } "#,
    ];
    for m in ok {
        assert!(serde_json::from_str::<FtMsg>(m).is_ok(), "{m}");
    }
    let bad = [
        // Q-04: unknown fields, now refused
        r#"{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4,"price":"1"}}"#,
        r#"{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4,"receiver_id":"carol.testnet"}}"#,
        r#"{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1,"x":null}}"#,
        r#"{"offer":{"token_id":"3","expected_sig_count":4,"expected_inside_epoch":0,"expires_at_ms":1,"amount":"1"}}"#,
        r#"{"buy":{"tokenId":"3","token_id":"3","listing_id":7,"expected_sig_count":4}}"#,
        // already refused
        r#"{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4},"deposit":"3"}"#,
        r#"{"deposit":"3","receiver_id":"carol.testnet"}"#,
        r#"{"buy":{"token_id":"3","token_id":"2","listing_id":7,"expected_sig_count":4}}"#,
        r#"{"deposit":3}"#,
        r#"{"Deposit":"3"}"#,
        r#"{"buy":{"token_id":"3","listing_id":-1,"expected_sig_count":4}}"#,
        r#"{"buy":{"token_id":"3","listing_id":7}}"#,
        r#""deposit""#,
        r#"{}"#,
        "null",
        "[]",
        r#""""#,
        "",
    ];
    for m in bad {
        assert!(serde_json::from_str::<FtMsg>(m).is_err(), "{m}");
    }
    // and through the entry point: a refused msg panics ERR_BAD_MSG (the FT refunds 100 %)
    let mut c = setup();
    mint_to(&mut c, alice());
    Ctx::new(usdc()).set();
    for m in bad {
        expect_err(ERR_BAD_MSG, || c.ft_on_transfer(bob(), U128(1), m.into()));
    }
}

/// Q-04 (FIXED): an unknown field in each msg type `ft_on_transfer` parses (buy, offer, deposit) is refused with
/// ERR_BAD_MSG before anything happens: the NFT does not move, nothing is escrowed or credited, no storage credit is
/// spent, no event is logged and no promise is created. The exact msgs still work afterwards.
#[test]
fn q04_unknown_msg_fields_are_refused_and_change_nothing() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(5_000_000), Currency::Usdc);
    for who in [bob(), carol()] {
        Ctx::new(who).dep(10 * MILLI).set();
        c.prepay_storage(None);
    }
    let buy = json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":0}});
    let offer = offer_msg(&id, 0, 0, T0 + DAY);
    let deposit = deposit_msg(&id);
    let with = |m: &Value, path: &[&str], k: &str, v: Value| {
        let mut m = m.clone();
        let mut at = &mut m;
        for p in path {
            at = &mut at[*p];
        }
        at[k] = v;
        m.to_string()
    };
    let snap = |c: &Contract| (c.owner_of(&id), inside(c, &id), totals(c), c.offers_for(id.clone(), 0, 50), c.storage_credit_of(bob()), c.storage_credit_of(carol()));
    let s0 = snap(&c);
    let cases = [
        (usdc(), carol(), 5_000_000, with(&buy, &["buy"], "receiver_id", json!("bob.testnet"))),
        (usdc(), carol(), 5_000_000, with(&buy, &["buy"], "max_price", json!("5000000"))),
        (usdc(), carol(), 5_000_000, with(&buy, &[], "receiver_id", json!("bob.testnet"))),
        (usdc(), bob(), 3_000_000, with(&offer, &["offer"], "amount", json!("1"))),
        (usdc(), bob(), 3_000_000, with(&offer, &["offer"], "min_sig_count", json!(0))),
        (usdc(), bob(), 3_000_000, with(&offer, &[], "memo", Value::Null)),
        (usdc(), bob(), 7, with(&deposit, &[], "receiver_id", json!("carol.testnet"))),
        (wnear(), bob(), 7, with(&deposit, &[], "x", json!(1))),
    ];
    for (ft, sender, amount, m) in &cases {
        Ctx::new(ft.clone()).set();
        expect_err(ERR_BAD_MSG, || c.ft_on_transfer(sender.clone(), U128(*amount), m.clone()));
        assert!(logged_event_names().is_empty() && get_created_receipts().is_empty(), "{m}");
        assert_eq!(snap(&c), s0, "{m} changed state");
    }
    // the exact msgs still work
    ft_call(&mut c, wnear(), bob(), 7, deposit.clone());
    ft_call(&mut c, usdc(), bob(), 3_000_000, offer.clone());
    assert_eq!(events("offer_made").len(), 1);
    ft_call(&mut c, usdc(), carol(), 5_000_000, buy.clone());
    assert_eq!(c.owner_of(&id), carol(), "the FT sender gets the NFT");
}

/// Names of every satchel/nep171 event logged by the last call (including a call that then panicked: on-chain, the
/// logs of a failed receipt stay visible in its outcome, kb/20 §Events).
fn logged_event_names() -> Vec<String> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .map(|v| v["event"].as_str().unwrap_or_default().to_string())
        .collect()
}

/// AUDIT-04 (Low, FIXED): no event is logged before a later refusal in the same receipt (the rule in `events.rs`,
/// "Emitted after every require", and spec §5.8 step 7). On-chain the logs of a failed receipt stay visible, so a
/// refused call used to show an offer or a sale that never happened.
/// - `make_offer` / USDC `ft_offer`: `offer_made` is emitted after `charge_storage` / `charge_credit`.
/// - `buy` / USDC buy (`execute_sale`), `accept_offer`, `nft_transfer`: `sold` / `offer_accepted` / `delisted` /
///   `allowances_cleared` / nep171 `nft_transfer` are emitted after `ensure_solvent`.
#[test]
fn audit04_refused_calls_log_no_events() {
    // make_offer: attached covers the amount but not the storage → ERR_DEPOSIT, nothing logged
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(ONE_NEAR + 1).set();
    expect_err(ERR_DEPOSIT, || c.make_offer(id.clone(), U128(ONE_NEAR), 0, 0, T0 + DAY));
    let a = logged_event_names();
    // USDC offer without storage credit → ERR_STORAGE_CREDIT, nothing logged
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(usdc()).set();
    expect_err(ERR_STORAGE_CREDIT, || c.ft_on_transfer(bob(), U128(5_000_000), offer_msg(&id, 0, 0, T0 + DAY).to_string()));
    let u = logged_event_names();
    // NEAR buy refused ERR_INSOLVENT: no nft_transfer, no sold
    let (mut c, id) = m01_setup();
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
    let b = bal_for(&mut c, 0);
    Ctx::new(long_acc('e')).dep(ONE_NEAR).bal(b).set();
    expect_err(ERR_INSOLVENT, || c.buy(id.clone(), lid, 0));
    let s = logged_event_names();
    // USDC buy refused ERR_INSOLVENT
    let (mut c, id) = m01_setup();
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(4_000_000), Currency::Usdc);
    let b = bal_for(&mut c, 0);
    Ctx::new(usdc()).bal(b).set();
    let msg = json!({"buy":{"token_id":id,"listing_id":lid,"expected_sig_count":0}}).to_string();
    expect_err(ERR_INSOLVENT, || c.ft_on_transfer(long_acc('f'), U128(4_000_000), msg));
    let us = logged_event_names();
    // nft_transfer refused ERR_INSOLVENT, with an allowance to clear: no nft_transfer, no allowances_cleared
    let (mut c, id) = m01_setup();
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.set_allowance(id.clone(), carol(), vec![crate::allowance::CapInput { asset: crate::allowance::Asset::Sol, limit: U128(1) }], None);
    let b = bal_for(&mut c, 0);
    Ctx::new(alice()).dep(1).bal(b).set();
    expect_err(ERR_INSOLVENT, || c.nft_transfer(long_acc('h'), id.clone(), None, None));
    let t = logged_event_names();
    assert!(
        a.is_empty() && u.is_empty() && s.is_empty() && us.is_empty() && t.is_empty(),
        "refused calls logged events: make_offer {a:?}, usdc offer {u:?}, buy {s:?}, usdc buy {us:?}, nft_transfer {t:?}"
    );
}

/// AUDIT-04: the fix moved the events, it did not drop or reorder them. A successful call logs the same events in
/// the same order as before.
#[test]
fn audit04_successful_calls_log_their_events_in_order() {
    let cap = || vec![crate::allowance::CapInput { asset: crate::allowance::Asset::Sol, limit: U128(1) }];
    // nft_transfer: nep171 nft_transfer, then allowances_cleared
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.set_allowance(id.clone(), carol(), cap(), None);
    Ctx::new(alice()).dep(1).set();
    c.nft_transfer(bob(), id.clone(), None, Some("gift".into()));
    assert_eq!(logged_event_names(), ["nft_transfer", "allowances_cleared"]);
    let ev: Value = serde_json::from_str(get_logs()[0].strip_prefix("EVENT_JSON:").unwrap()).unwrap();
    assert_eq!(ev["standard"], "nep171");
    assert_eq!(ev["data"], json!([{ "old_owner_id": alice(), "new_owner_id": bob(), "token_ids": [id], "memo": "gift" }]));
    // NEAR buy: nft_transfer (memo "sale"), allowances_cleared, sold
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.set_allowance(id.clone(), carol(), cap(), None);
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
    Ctx::new(bob()).dep(ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    assert_eq!(logged_event_names(), ["nft_transfer", "allowances_cleared", "sold"]);
    let ev: Value = serde_json::from_str(get_logs()[0].strip_prefix("EVENT_JSON:").unwrap()).unwrap();
    assert_eq!(ev["data"], json!([{ "old_owner_id": alice(), "new_owner_id": bob(), "token_ids": [id], "memo": "sale" }]));
    // accept_offer on a listed token: delisted, nft_transfer (memo "offer"), allowances_cleared, offer_accepted
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.set_allowance(id.clone(), carol(), cap(), None);
    Ctx::new(alice()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(2 * ONE_NEAR), Currency::Near);
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(oid);
    assert_eq!(logged_event_names(), ["delisted", "nft_transfer", "allowances_cleared", "offer_accepted"]);
    let ev: Value = serde_json::from_str(get_logs()[1].strip_prefix("EVENT_JSON:").unwrap()).unwrap();
    assert_eq!(ev["data"], json!([{ "old_owner_id": alice(), "new_owner_id": bob(), "token_ids": [id], "memo": "offer" }]));
    // make_offer and the USDC offer: offer_made
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    near_offer(&mut c, bob(), &id, ONE_NEAR);
    assert_eq!(logged_event_names(), ["offer_made"]);
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.prepay_storage(None);
    Ctx::new(usdc()).set();
    let _ = c.ft_on_transfer(bob(), U128(5_000_000), offer_msg(&id, 0, 0, T0 + DAY).to_string());
    assert_eq!(logged_event_names(), ["offer_made"]);
}

/// Companion of AUDIT-04 that passes: the paths that DO follow the rule log nothing when refused (sign_for over its
/// deposit, list short of storage, an FT deposit without storage credit).
#[test]
fn audit04_well_ordered_paths_log_nothing_when_refused() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_DEPOSIT, || c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None));
    assert!(logged_event_names().is_empty());
    Ctx::new(usdc()).set();
    expect_err(ERR_STORAGE_CREDIT, || c.ft_on_transfer(carol(), U128(5), deposit_msg(&id).to_string()));
    assert!(logged_event_names().is_empty());
}

/// Q-03 (FIXED): every method where the CALLER picks who receives value refuses the same set as `nft_transfer`
/// (`ensure_receiver`: the contract, the MPC, the configured USDC) with ERR_BAD_RECEIVER, before any write and before
/// any event or promise. Payouts to a receiver the contract fixes (the seller, the offerer, the caller of
/// `withdraw_proceeds` / `withdraw_storage_credit`) have no receiver argument and are unchanged.
#[test]
fn q03_caller_chosen_receivers_refuse_the_contract_mpc_and_usdc() {
    let mut c = setup();
    let id = usdc_funded(&mut c, 5_000_000);
    Ctx::new(bob()).dep(ONE_NEAR).set();
    c.deposit_near(id.clone());
    ft_call(&mut c, wnear(), bob(), 5, deposit_msg(&id));
    let snap = (inside(&c, &id), totals(&c), c.storage_credit_of(carol()));
    let bad = [me(), mpc(), usdc()];
    for r in &bad {
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.withdraw_near(id.clone(), U128(1), Some(r.clone())));
        assert!(get_created_receipts().is_empty() && logged_event_names().is_empty(), "withdraw_near to {r}");
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.withdraw_ft(id.clone(), usdc(), U128(1), Some(r.clone())));
        assert!(get_created_receipts().is_empty() && logged_event_names().is_empty(), "withdraw_ft to {r}");
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.withdraw_ft(id.clone(), wnear(), U128(1), Some(r.clone())));
        Ctx::new(carol()).dep(10 * MILLI).set();
        expect_err(ERR_BAD_RECEIVER, || c.prepay_storage(Some(r.clone())));
        assert!(get_created_receipts().is_empty() && logged_event_names().is_empty(), "prepay_storage for {r}");
        // the same set nft_transfer and nft_mint refuse
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.nft_transfer(r.clone(), id.clone(), None, None));
        Ctx::new(acc("team.testnet")).dep(20 * MILLI).set();
        expect_err(ERR_BAD_RECEIVER, || c.nft_mint(r.clone()));
    }
    assert_eq!((inside(&c, &id), totals(&c), c.storage_credit_of(carol())), snap, "nothing changed");
    assert_eq!(inside(&c, &id)["inside_epoch"], 0, "no withdrawal bumped the epoch");
    // legitimate receivers: the owner by default, any other named account, a credit for another account
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(7), None);
    assert_eq!(transfers(), vec![(alice(), 7)]);
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(8), Some(carol()));
    assert_eq!(transfers(), vec![(carol(), 8)]);
    Ctx::new(alice()).dep(1).set();
    c.withdraw_ft(id.clone(), usdc(), U128(9), Some(carol()));
    assert_eq!(calls()[0].2["receiver_id"], "carol.testnet");
    Ctx::new(alice()).dep(1).set();
    c.withdraw_ft(id.clone(), usdc(), U128(10), None);
    assert_eq!(calls()[0].2["receiver_id"], "alice.testnet");
    Ctx::new(bob()).dep(10 * MILLI).set();
    assert!(c.prepay_storage(Some(carol())).0 > 0);
    assert_eq!(inside(&c, &id)["inside_epoch"], 4);
    // USDC disabled: usdc.testnet is an ordinary account, so it is an ordinary receiver; the contract and MPC are not
    let mut c = setup_with(None);
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(ONE_NEAR).set();
    c.deposit_near(id.clone());
    Ctx::new(alice()).dep(1).set();
    c.withdraw_near(id.clone(), U128(1), Some(usdc()));
    assert_eq!(transfers(), vec![(usdc(), 1)]);
    for r in [me(), mpc()] {
        Ctx::new(alice()).dep(1).set();
        expect_err(ERR_BAD_RECEIVER, || c.withdraw_near(id.clone(), U128(1), Some(r)));
    }
}

// ── U-2 (docs/security/seller-threat-model.md): one offer's escrow is spent exactly once, in any order ─────────
// Accept then cancel, accept twice, cancel then accept, and accept after the token was sold to someone else, for NEAR
// and USDC offers. Each payout or refund is counted across every call; refused calls must create no receipt.

/// Every NEAR transfer and USDC `ft_transfer` the last call created, as (currency, receiver, amount).
fn u2_payouts() -> Vec<(&'static str, AccountId, u128)> {
    let mut v: Vec<_> = transfers().into_iter().map(|(r, a)| ("near", r, a)).collect();
    for (rcv, method, args, _, _) in calls() {
        if rcv == usdc() && method == "ft_transfer" {
            v.push(("usdc", args["receiver_id"].as_str().unwrap().parse().unwrap(), args["amount"].as_str().unwrap().parse().unwrap()));
        }
    }
    v
}

/// The NEAR books: `offers_near` equals the open NEAR offers on `ids`, `proceeds_near` is what failed payouts left
/// owed, and escrow is the sum of its parts (the I-M2 identity the model test checks after every step).
fn u2_books(c: &Contract, ids: &[&String], proceeds_near: u128) {
    let open: u128 =
        ids.iter().flat_map(|id| c.offers_for((*id).clone(), 0, 50)).filter(|o| o.currency == Currency::Near).map(|o| o.amount.0).sum();
    let t = c.market_totals();
    assert_eq!(t.offers_near.0, open, "offers_near tracks the open NEAR offers");
    assert_eq!(t.proceeds_near.0, proceeds_near, "proceeds_near");
    assert_eq!(t.escrow_near.0, t.inside_near.0 + t.offers_near.0 + t.storage_credit.0 + t.proceeds_near.0);
}

/// `who` (1 yocto, at `ms`) calls `f`, which must refuse with `code` and change nothing: no receipt, same owner,
/// same open offers, same totals.
fn u2_refuse(c: &mut Contract, id: &String, who: AccountId, ms: u64, code: &str, f: impl FnOnce(&mut Contract)) {
    let ids = |c: &Contract| c.offers_for(id.clone(), 0, 50).into_iter().map(|o| o.id).collect::<Vec<_>>();
    let before = (c.owner_of(id), ids(c), totals(c));
    Ctx::new(who).dep(1).ms(ms).set();
    expect_err(code, || f(&mut *c));
    assert!(get_created_receipts().is_empty(), "{code}: a refused call creates no receipt");
    assert_eq!((c.owner_of(id), ids(c), totals(c)), before, "{code}: a refused call changes nothing");
}

/// Resolves the payout callback the last accept/cancel/withdraw scheduled.
fn u2_resolve(c: &mut Contract, to: AccountId, cur: Currency, amount: u128, ok: bool) {
    Ctx::new(me()).results(vec![if ok { PromiseResult::Successful(vec![]) } else { PromiseResult::Failed }]).set();
    c.on_payout(to, cur, U128(amount));
}

#[test]
fn offer_escrow_is_spent_once_in_any_order() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let mut paid = vec![];
    // 1. accept, then cancel: by the offerer, and by anyone after the expiry
    let o1 = near_offer(&mut c, bob(), &id, ONE_NEAR);
    u2_books(&c, &[&id], 0);
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(o1);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, alice(), Currency::Near, ONE_NEAR, true);
    assert_eq!(c.owner_of(&id), bob());
    u2_books(&c, &[&id], 0);
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o1));
    u2_refuse(&mut c, &id, carol(), T0 + DAY, ERR_NO_OFFER, |c| c.cancel_offer(o1));
    // 2. accept twice: by the new owner (bob, also the offerer) and by the old one
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(o1));
    u2_refuse(&mut c, &id, alice(), T0, ERR_NO_OFFER, |c| c.accept_offer(o1));
    // 3. cancel, then accept (and cancel again)
    let o2 = near_offer(&mut c, carol(), &id, 2 * ONE_NEAR);
    u2_books(&c, &[&id], 0);
    Ctx::new(carol()).dep(1).set();
    c.cancel_offer(o2);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, carol(), Currency::Near, 2 * ONE_NEAR, true);
    u2_books(&c, &[&id], 0);
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(o2));
    u2_refuse(&mut c, &id, carol(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o2));
    u2_refuse(&mut c, &id, alice(), T0 + DAY, ERR_NO_OFFER, |c| c.cancel_offer(o2));
    assert_eq!(c.owner_of(&id), bob());
    assert_eq!(totals(&c)["offers_near"], "0");
    assert_eq!(paid, vec![("near", alice(), ONE_NEAR), ("near", carol(), 2 * ONE_NEAR)], "one payout, one refund");
    assert_eq!(events("offer_accepted").len() + events("offer_cancelled").len(), 0, "the last call was a refusal");
    // 4. a failed payout is owed exactly once: credited to proceeds, the offer stays gone, one withdrawal pays it
    let o3 = near_offer(&mut c, alice(), &id, 3 * ONE_NEAR);
    Ctx::new(bob()).dep(1).set();
    c.accept_offer(o3);
    assert_eq!(u2_payouts(), vec![("near", bob(), 3 * ONE_NEAR)]);
    u2_resolve(&mut c, bob(), Currency::Near, 3 * ONE_NEAR, false);
    u2_books(&c, &[&id], 3 * ONE_NEAR);
    u2_refuse(&mut c, &id, alice(), T0, ERR_NO_OFFER, |c| c.accept_offer(o3));
    u2_refuse(&mut c, &id, alice(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o3));
    Ctx::new(bob()).dep(1).set();
    c.withdraw_proceeds(Currency::Near);
    assert_eq!(u2_payouts(), vec![("near", bob(), 3 * ONE_NEAR)]);
    u2_resolve(&mut c, bob(), Currency::Near, 3 * ONE_NEAR, true);
    u2_books(&c, &[&id], 0);
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_NOTHING_OWED, || c.withdraw_proceeds(Currency::Near));
    assert!(get_created_receipts().is_empty());
    assert_eq!(c.owner_of(&id), alice());
}

#[test]
fn usdc_offer_escrow_is_spent_once_in_any_order() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for p in [bob(), carol()] {
        Ctx::new(p).dep(10 * MILLI).set();
        c.prepay_storage(None);
    }
    let usdc_offer = |c: &mut Contract, who: AccountId, amount: u128| {
        let (sc, ep) = (c.token_state(&id).sig_count, c.inside_epoch(&id));
        ft_call(c, usdc(), who, amount, offer_msg(&id, sc, ep, T0 + DAY));
        c.market_config().next_offer_id - 1
    };
    let mut paid = vec![];
    let near_before = totals(&c);
    // accept, then cancel, then accept again
    let o1 = usdc_offer(&mut c, bob(), 5_000_000);
    Ctx::new(alice()).dep(1).set();
    c.accept_offer(o1);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, alice(), Currency::Usdc, 5_000_000, true);
    assert_eq!(c.owner_of(&id), bob());
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o1));
    u2_refuse(&mut c, &id, carol(), T0 + DAY, ERR_NO_OFFER, |c| c.cancel_offer(o1));
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(o1));
    // cancel, then accept
    let o2 = usdc_offer(&mut c, carol(), 7_000_000);
    Ctx::new(carol()).dep(1).set();
    c.cancel_offer(o2);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, carol(), Currency::Usdc, 7_000_000, true);
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(o2));
    u2_refuse(&mut c, &id, carol(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o2));
    assert_eq!(c.owner_of(&id), bob());
    assert_eq!(paid, vec![("usdc", alice(), 5_000_000), ("usdc", carol(), 7_000_000)], "one ft_transfer per offer");
    assert!(c.offers_for(id.clone(), 0, 50).is_empty());
    assert!(c.proceeds_of(alice()).iter().chain(c.proceeds_of(carol()).iter()).all(|p| p.amount.0 == 0), "nothing owed");
    // the USDC offers never touched the NEAR books (storage came from the prepaid credit)
    assert_eq!(totals(&c)["offers_near"], near_before["offers_near"]);
    assert_eq!(totals(&c)["proceeds_near"], "0");
    u2_books(&c, &[&id], 0);
}

#[test]
fn offer_accept_after_the_token_was_sold_pays_only_the_current_owner_once() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let mut paid = vec![];
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    let o_bob = near_offer(&mut c, bob(), &id, ONE_NEAR);
    let o_dave = near_offer(&mut c, acc("dave.testnet"), &id, 2 * ONE_NEAR);
    u2_books(&c, &[&id], 0);
    // carol buys the listing: only the price moves, both offers stay escrowed
    Ctx::new(carol()).dep(3 * ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    assert_eq!(transfers(), vec![(alice(), 3 * ONE_NEAR)], "the sale pays the seller the price only");
    assert_eq!(c.owner_of(&id), carol());
    u2_books(&c, &[&id], 0);
    assert_eq!(totals(&c)["offers_near"], (3 * ONE_NEAR).to_string());
    // the seller can no longer accept either offer
    u2_refuse(&mut c, &id, alice(), T0, ERR_NOT_OWNER, |c| c.accept_offer(o_bob));
    u2_refuse(&mut c, &id, alice(), T0, ERR_NOT_OWNER, |c| c.accept_offer(o_dave));
    // the buyer accepts bob's offer: paid once, to the buyer
    Ctx::new(carol()).dep(1).set();
    c.accept_offer(o_bob);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, carol(), Currency::Near, ONE_NEAR, true);
    assert_eq!(c.owner_of(&id), bob());
    u2_books(&c, &[&id], 0);
    u2_refuse(&mut c, &id, carol(), T0, ERR_NO_OFFER, |c| c.accept_offer(o_bob));
    u2_refuse(&mut c, &id, alice(), T0, ERR_NO_OFFER, |c| c.accept_offer(o_bob));
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.cancel_offer(o_bob));
    // dave's offer survives a second sale; the old owners can't take it, and once cancelled no one can accept it
    u2_refuse(&mut c, &id, carol(), T0, ERR_NOT_OWNER, |c| c.accept_offer(o_dave));
    Ctx::new(acc("dave.testnet")).dep(1).set();
    c.cancel_offer(o_dave);
    paid.extend(u2_payouts());
    u2_resolve(&mut c, acc("dave.testnet"), Currency::Near, 2 * ONE_NEAR, true);
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(o_dave));
    assert_eq!(paid, vec![("near", carol(), ONE_NEAR), ("near", acc("dave.testnet"), 2 * ONE_NEAR)]);
    assert_eq!(totals(&c)["offers_near"], "0");
    u2_books(&c, &[&id], 0);
}

#[test]
fn offer_made_by_the_later_buyer_is_refunded_once_never_self_accepted() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).set();
    let lid = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    let oid = near_offer(&mut c, bob(), &id, ONE_NEAR);
    // bob buys the listing outright; his own offer is still escrowed
    Ctx::new(bob()).dep(3 * ONE_NEAR).set();
    c.buy(id.clone(), lid, 0);
    assert_eq!(c.owner_of(&id), bob());
    u2_books(&c, &[&id], 0);
    u2_refuse(&mut c, &id, bob(), T0, ERR_SELF_BUY, |c| c.accept_offer(oid));
    u2_refuse(&mut c, &id, alice(), T0, ERR_NOT_OWNER, |c| c.accept_offer(oid));
    Ctx::new(bob()).dep(1).set();
    c.cancel_offer(oid);
    assert_eq!(u2_payouts(), vec![("near", bob(), ONE_NEAR)]);
    u2_resolve(&mut c, bob(), Currency::Near, ONE_NEAR, true);
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.accept_offer(oid));
    u2_refuse(&mut c, &id, bob(), T0, ERR_NO_OFFER, |c| c.cancel_offer(oid));
    assert_eq!(totals(&c)["offers_near"], "0");
    u2_books(&c, &[&id], 0);
}
