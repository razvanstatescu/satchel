//! C5 spending allowance: unit tests for every branch (docs/specs/C5.md), the shared vectors
//! (`vectors/allowance.json`) and property tests of the cap accounting against an independent oracle.
//! The mocked chain does NOT roll back state on panic, so every refusal here also proves "panics before its first write".

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, RuntimeFeesConfig};
use proptest::prelude::*;

use crate::allowance::*;
use crate::errors::*;
use crate::parse::{btc, evm, sol};
use crate::types::*;
use crate::*;

const MILLI: u128 = 1_000_000_000_000_000_000_000;
const T0: u64 = 1_793_000_000_000; // ms
const W: u64 = ALLOWANCE_WINDOW_MS;
const SEPOLIA: u64 = 11_155_111;
const KB31_DEBIT: u128 = 100_000_000_000_000 + 21_000 * 200_028; // value + gas_limit × max_fee

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
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
fn bot() -> AccountId {
    acc("bot.testnet")
}
fn usdc() -> AccountId {
    acc("usdc.testnet")
}

/// predecessor, deposit (yocto), block timestamp (ms); height = 1000 + (ms − T0) / 1000.
fn ctx(who: AccountId, deposit: u128, now_ms: u64) {
    let height = 1_000 + now_ms.saturating_sub(T0) / 1_000;
    let c = VMContextBuilder::new()
        .current_account_id(acc("satchel.testnet"))
        .signer_account_id(who.clone())
        .predecessor_account_id(who)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(300))
        .block_height(height)
        .block_timestamp(now_ms * 1_000_000)
        .account_balance(NearToken::from_near(100))
        .build();
    testing_env!(c, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), vec![]);
}

fn expect_err<R>(code: &str, f: impl FnOnce() -> R) {
    let err = match catch_unwind(AssertUnwindSafe(f)) {
        Ok(_) => panic!("expected {code}, call succeeded"),
        Err(e) => e,
    };
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    let msg = match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    };
    assert!(msg.starts_with(&format!("{code}: ")) || msg == code, "expected {code}, got {msg:?}");
}

/// A contract with token "1" owned by alice.
fn setup() -> Contract {
    ctx(acc("team.testnet"), 0, T0);
    let mut c = Contract::new(acc("mpc.testnet"), Some(usdc()), "https://satchel.example/api/card/".into());
    ctx(acc("team.testnet"), 20 * MILLI, T0);
    c.nft_mint(alice());
    c
}

fn cap(asset: Asset, limit: u128) -> CapInput {
    CapInput { asset, limit: U128(limit) }
}
fn evm_cap(limit: u128) -> CapInput {
    cap(Asset::Evm { chain_id: SEPOLIA }, limit)
}

fn set(c: &mut Contract, delegate: AccountId, caps: Vec<CapInput>, exp: Option<u64>, now: u64) {
    ctx(alice(), 10 * MILLI, now);
    c.set_allowance("1".into(), delegate, caps, exp);
}

fn evm_tx(nonce: u64, value: u128, gas: u128, max_fee: u128) -> SignRequest {
    let mut f = evm::tests::base();
    f.nonce = evm::tests::int(nonce as u128);
    f.value = evm::tests::int(value);
    f.gas = evm::tests::int(gas);
    f.fee = evm::tests::int(max_fee);
    f.tip = evm::tests::int(max_fee.min(1));
    SignRequest::Evm { unsigned_tx: hex::encode(evm::tests::build(&f)) }
}
fn kb31() -> SignRequest {
    SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }
}
fn sol_req() -> SignRequest {
    SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }
}

fn sign_as(c: &mut Contract, who: AccountId, req: SignRequest, now: u64) {
    let n = parse::request_count(&req) as u128;
    ctx(who, 5 * MILLI * n, now);
    c.sign_for("1".into(), req, None);
}

fn events(name: &str) -> Vec<Value> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["event"] == name)
        .collect()
}

fn refunds() -> Vec<(AccountId, u128)> {
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

fn remaining(c: &Contract, asset: &Asset) -> u128 {
    let v = c.allowance("1".into(), bot()).expect("allowance");
    v.caps.iter().find(|x| &x.asset == asset).expect("cap").remaining.0
}

fn sig_count(c: &Contract) -> u64 {
    c.satchel("1".into()).unwrap().sig_count
}

// ── set_allowance ────────────────────────────────────────────────────────────────────────────────

#[test]
fn set_allowance_guards_in_order() {
    let mut c = setup();
    ctx(alice(), 10 * MILLI, T0);
    expect_err(ERR_TOKEN_NOT_FOUND, || c.set_allowance("9".into(), bot(), vec![evm_cap(1)], None));
    ctx(bob(), 10 * MILLI, T0);
    expect_err(ERR_NOT_OWNER, || c.set_allowance("1".into(), bot(), vec![evm_cap(1)], None));
    ctx(alice(), 0, T0);
    expect_err(ERR_DEPOSIT, || c.set_allowance("1".into(), bot(), vec![evm_cap(1)], None));
    for d in [alice(), acc("satchel.testnet"), acc("mpc.testnet"), usdc()] {
        ctx(alice(), 10 * MILLI, T0);
        expect_err(ERR_ALLOWANCE_DELEGATE, || c.set_allowance("1".into(), d.clone(), vec![evm_cap(1)], None));
    }
    let tok = "1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    let bad_caps: Vec<Vec<CapInput>> = vec![
        vec![],
        (0..9).map(|i| cap(Asset::Erc20 { chain_id: SEPOLIA, token: format!("{:040x}", i) }, 1)).collect(),
        vec![evm_cap(0)],
        vec![evm_cap(1), evm_cap(2)],
        vec![cap(Asset::Evm { chain_id: 1 }, 1)],
        vec![cap(Asset::Erc20 { chain_id: 1, token: tok.into() }, 1)],
        vec![cap(Asset::Erc20 { chain_id: SEPOLIA, token: "abcd".into() }, 1)],
        vec![cap(Asset::Erc20 { chain_id: SEPOLIA, token: "zz".repeat(20) }, 1)],
        // the same token twice, once with 0x and upper case: duplicates after normalization
        vec![
            cap(Asset::Erc20 { chain_id: SEPOLIA, token: tok.into() }, 1),
            cap(Asset::Erc20 { chain_id: SEPOLIA, token: ["0x", &tok.to_uppercase()].concat() }, 1),
        ],
    ];
    for caps in bad_caps {
        ctx(alice(), 10 * MILLI, T0);
        expect_err(ERR_ALLOWANCE_CAPS, || c.set_allowance("1".into(), bot(), caps.clone(), None));
    }
    for exp in [T0 - 1, T0] {
        ctx(alice(), 10 * MILLI, T0);
        expect_err(ERR_ALLOWANCE_EXPIRY, || c.set_allowance("1".into(), bot(), vec![evm_cap(1)], Some(exp)));
    }
    assert!(c.allowances_of("1".into()).is_empty(), "no refusal wrote anything");
}

#[test]
fn set_allowance_charges_storage_exactly_normalizes_and_emits() {
    let mut c = setup();
    ctx(alice(), 10 * MILLI, T0);
    let s0 = env::storage_usage();
    let tok_in = "0x1C7D4B196CB0C7B01D743FBC6116A902379C7238";
    c.set_allowance(
        "1".into(),
        bot(),
        vec![
            cap(Asset::Btc, 100_000),
            evm_cap(10u128.pow(16)),
            cap(Asset::Sol, 500_000_000),
            cap(Asset::Erc20 { chain_id: SEPOLIA, token: tok_in.into() }, 5_000_000),
        ],
        Some(T0 + 7 * W),
    );
    let used = (env::storage_usage() - s0) as u128;
    assert!(used > 0);
    let kept = used * env::storage_byte_cost().as_yoctonear();
    assert_eq!(refunds(), vec![(alice(), 10 * MILLI - kept)], "charged exactly Δstorage × byte cost");
    let e = &events("allowance_set")[0];
    assert_eq!(e["standard"], "satchel");
    assert_eq!(e["version"], "1.0.0");
    let d = &e["data"];
    assert_eq!(d["owner_id"], "alice.testnet");
    assert_eq!(d["delegate_id"], "bot.testnet");
    assert_eq!(d["expires_at_ms"], json!(T0 + 7 * W));
    assert_eq!(d["caps"][0], json!({"asset":"btc","limit":"100000"}));
    assert_eq!(d["caps"][1], json!({"asset":{"evm":{"chain_id":SEPOLIA}},"limit":"10000000000000000"}));
    assert_eq!(
        d["caps"][3],
        json!({"asset":{"erc20":{"chain_id":SEPOLIA,"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238"}},"limit":"5000000"})
    );
    let v = serde_json::to_value(c.allowance("1".into(), bot()).unwrap()).unwrap();
    assert_eq!(
        v,
        json!({"token_id":"1","delegate":"bot.testnet","owner_id":"alice.testnet","set_at_ms":T0,"expires_at_ms":T0 + 7 * W,
               "status":"active","now_ms":T0,"window_ms":W,"spends_in_window":0,"max_spends":32,
               "caps":[
                 {"asset":"btc","limit":"100000","spent":"0","remaining":"100000","spends":[]},
                 {"asset":{"evm":{"chain_id":SEPOLIA}},"limit":"10000000000000000","spent":"0","remaining":"10000000000000000","spends":[]},
                 {"asset":"sol","limit":"500000000","spent":"0","remaining":"500000000","spends":[]},
                 {"asset":{"erc20":{"chain_id":SEPOLIA,"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238"}},"limit":"5000000","spent":"0","remaining":"5000000","spends":[]}
               ]})
    );
    // short deposit
    ctx(alice(), 1, T0);
    expect_err(ERR_DEPOSIT, || c.set_allowance("1".into(), carol(), vec![evm_cap(1)], None));
}

#[test]
fn json_shapes_of_args() {
    let caps: Vec<CapInput> = serde_json::from_value(json!([
        {"asset":"btc","limit":"1"},
        {"asset":"sol","limit":"2"},
        {"asset":{"evm":{"chain_id":11155111}},"limit":"3"},
        {"asset":{"erc20":{"chain_id":11155111,"token":"0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"}},"limit":"4"}
    ]))
    .unwrap();
    assert_eq!(caps[0].asset, Asset::Btc);
    assert_eq!(caps[2].asset, Asset::Evm { chain_id: SEPOLIA });
    assert!(serde_json::from_value::<CapInput>(json!({"asset":"eth","limit":"1"})).is_err());
    assert!(serde_json::from_value::<CapInput>(json!({"asset":"btc","limit":1})).is_err(), "limits are U128 strings");
}

#[test]
fn delegate_limit_and_expired_ones_free_a_slot() {
    let mut c = setup();
    for i in 0..4 {
        set(&mut c, acc(&format!("d{i}.testnet")), vec![evm_cap(1)], Some(T0 + 1_000), T0);
    }
    ctx(alice(), 10 * MILLI, T0);
    expect_err(ERR_ALLOWANCE_LIMIT, || c.set_allowance("1".into(), bot(), vec![evm_cap(1)], None));
    // replacing an existing delegate is not a new slot
    set(&mut c, acc("d0.testnet"), vec![evm_cap(5)], None, T0);
    assert_eq!(c.allowances_of("1".into()).len(), 4);
    // once d1..d3 expire, a new delegate fits and the expired ones are dropped
    set(&mut c, bot(), vec![evm_cap(1)], None, T0 + 1_000);
    let ds: Vec<String> = c.allowances_of("1".into()).into_iter().map(|v| v.delegate.to_string()).collect();
    assert_eq!(ds, vec!["d0.testnet", "bot.testnet"]);
}

#[test]
fn replace_keeps_spends_in_window_and_revoke_set_resets() {
    let mut c = setup();
    let evm = Asset::Evm { chain_id: SEPOLIA };
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT * 2), cap(Asset::Sol, 10_000)], None, T0);
    sign_as(&mut c, bot(), kb31(), T0 + 10);
    assert_eq!(remaining(&c, &evm), KB31_DEBIT);
    // raise the cap: the spend stays; drop SOL
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT * 3)], None, T0 + 20);
    let v = c.allowance("1".into(), bot()).unwrap();
    assert_eq!(v.caps.len(), 1);
    assert_eq!(v.caps[0].spent.0, KB31_DEBIT);
    assert_eq!(v.caps[0].spends, vec![SpendView { at_ms: T0 + 10, amount: U128(KB31_DEBIT) }]);
    assert_eq!(v.set_at_ms, T0 + 20);
    // revoke + set: a fresh budget, on purpose
    ctx(alice(), 1, T0 + 30);
    c.revoke_allowance("1".into(), bot());
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT * 3)], None, T0 + 40);
    assert_eq!(remaining(&c, &evm), KB31_DEBIT * 3);
}

// ── revoke_allowance ─────────────────────────────────────────────────────────────────────────────

#[test]
fn revoke_guards_and_effect() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT)], None, T0);
    set(&mut c, carol(), vec![evm_cap(KB31_DEBIT)], None, T0);
    ctx(alice(), 1, T0);
    expect_err(ERR_TOKEN_NOT_FOUND, || c.revoke_allowance("9".into(), bot()));
    ctx(bob(), 1, T0);
    expect_err(ERR_NOT_OWNER, || c.revoke_allowance("1".into(), bot()));
    ctx(bot(), 1, T0);
    expect_err(ERR_NOT_OWNER, || c.revoke_allowance("1".into(), bot()));
    for d in [0, 2, MILLI] {
        ctx(alice(), d, T0);
        expect_err(ERR_DEPOSIT, || c.revoke_allowance("1".into(), bot()));
    }
    ctx(alice(), 1, T0);
    expect_err(ERR_ALLOWANCE_NOT_FOUND, || c.revoke_allowance("1".into(), bob()));
    assert_eq!(c.allowances_of("1".into()).len(), 2);
    ctx(alice(), 1, T0);
    c.revoke_allowance("1".into(), bot());
    assert_eq!(events("allowance_revoked")[0]["data"], json!({"token_id":"1","owner_id":"alice.testnet","delegate_id":"bot.testnet"}));
    assert!(c.allowance("1".into(), bot()).is_none());
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), kb31(), T0 + 1));
    // the last one removes the token's entry: storage shrinks back
    ctx(alice(), 1, T0);
    let s_before = env::storage_usage();
    c.revoke_allowance("1".into(), carol());
    assert!(env::storage_usage() < s_before);
    assert!(c.allowances_of("1".into()).is_empty());
    // an expired allowance can be revoked too
    set(&mut c, bot(), vec![evm_cap(1)], Some(T0 + 5), T0);
    ctx(alice(), 1, T0 + 10);
    c.revoke_allowance("1".into(), bot());
}

// ── sign_for by a delegate ───────────────────────────────────────────────────────────────────────

#[test]
fn delegate_signs_within_cap_and_is_the_requester() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT)], None, T0);
    ctx(bot(), 5 * MILLI, T0 + 1_000);
    let s0 = env::storage_usage();
    c.sign_for("1".into(), kb31(), None);
    // records and spend entry charged to the delegate, exactly (INV-18 with n = 1, d = 1 yocto)
    let used = (env::storage_usage() - s0) as u128;
    let kept = used * env::storage_byte_cost().as_yoctonear() + 1;
    assert_eq!(refunds(), vec![(bot(), 5 * MILLI - kept)]);
    let r = c.sig_records("1".into(), 0, 50);
    assert_eq!(r.len(), 1);
    assert_eq!(r[0].requester, bot());
    let sr = &events("sign_requested")[0]["data"];
    assert_eq!(sr["owner_id"], "alice.testnet", "sign_requested keeps the owner");
    let sp = &events("allowance_spent")[0]["data"];
    assert_eq!(
        *sp,
        json!({"token_id":"1","owner_id":"alice.testnet","delegate_id":"bot.testnet","first_seq":0,
               "debits":[{"asset":{"evm":{"chain_id":SEPOLIA}},"amount":KB31_DEBIT.to_string()}]})
    );
    assert_eq!(remaining(&c, &Asset::Evm { chain_id: SEPOLIA }), 0);
    // an exactly-zero remaining refuses even the smallest spend, and changes nothing
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(1, 1, 1, 0), T0 + 2_000));
    assert_eq!(sig_count(&c), 1);
    // the owner is never limited by the allowance
    sign_as(&mut c, alice(), evm_tx(1, 10u128.pow(18), 21_000, 10u128.pow(10)), T0 + 3_000);
    assert_eq!(c.sig_records("1".into(), 1, 1)[0].requester, alice());
    assert!(events("allowance_spent").is_empty());
}

#[test]
fn cap_edges_exact_and_one_over() {
    let mut c = setup();
    let limit = 1_000_000u128;
    set(&mut c, bot(), vec![evm_cap(limit)], None, T0);
    // gas 21000 × fee 10 = 210000; value 789_999 + 210_000 = 999_999
    sign_as(&mut c, bot(), evm_tx(0, 789_999, 21_000, 10), T0);
    assert_eq!(remaining(&c, &Asset::Evm { chain_id: SEPOLIA }), 1);
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(1, 2, 0, 0), T0));
    sign_as(&mut c, bot(), evm_tx(1, 1, 0, 0), T0);
    assert_eq!(remaining(&c, &Asset::Evm { chain_id: SEPOLIA }), 0);
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(2, 0, 1, 1), T0));
    // the refusal names what's left
    let mut a = Allowance { delegate: bot(), set_at_ms: T0, expires_at_ms: None, caps: validate_caps(vec![evm_cap(10)]).unwrap() };
    let r = a.debit(&[(Asset::Evm { chain_id: SEPOLIA }, 11)], T0).unwrap_err();
    assert_eq!(r, Refusal { code: ERR_ALLOWANCE_EXCEEDED, detail: "remaining 10, request needs 11".into() });
    assert_eq!(sig_count(&c), 2);
}

#[test]
fn fees_count_against_the_cap() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(15))], None, T0);
    // value 0 but a huge priority fee: would drain the account through the tip; refused
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(0, 0, 21_000, 10u128.pow(14)), T0));
    // overflow of gas × max_fee is refused, never wrapped
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(0, 0, u64::MAX as u128, u128::MAX), T0));
    assert_eq!(sig_count(&c), 0);
}

#[test]
fn asset_without_cap_and_strangers() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(18))], None, T0);
    expect_err(ERR_ALLOWANCE_ASSET, || sign_as(&mut c, bot(), sol_req(), T0));
    let tx = btc::tests::sample_tx(1);
    let btc_req = SignRequest::Btc {
        preimages: btc::tests::preimages(&tx).iter().map(hex::encode).collect(),
        outputs: hex::encode(&tx.outputs),
    };
    expect_err(ERR_ALLOWANCE_ASSET, || sign_as(&mut c, bot(), btc_req, T0));
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, carol(), kb31(), T0));
    assert_eq!(sig_count(&c), 0);
}

#[test]
fn window_rollover() {
    let mut c = setup();
    let evm = Asset::Evm { chain_id: SEPOLIA };
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT)], None, T0);
    sign_as(&mut c, bot(), kb31(), T0 + 5_000);
    // still inside the window at at_ms + W − 1
    ctx(bot(), 0, T0 + 5_000 + W - 1);
    assert_eq!(remaining(&c, &evm), 0);
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), kb31(), T0 + 5_000 + W - 1));
    // released exactly at at_ms + W
    ctx(bot(), 0, T0 + 5_000 + W);
    let v = c.allowance("1".into(), bot()).unwrap();
    assert_eq!((v.caps[0].remaining.0, v.caps[0].spends.len(), v.spends_in_window), (KB31_DEBIT, 0, 0));
    sign_as(&mut c, bot(), kb31(), T0 + 5_000 + W);
    assert_eq!(remaining(&c, &evm), 0);
    // the old entry was pruned from state on the write (one entry left)
    assert_eq!(c.allowance("1".into(), bot()).unwrap().caps[0].spends.len(), 1);
}

#[test]
fn sliding_window_has_no_boundary_burst() {
    let mut c = setup();
    let limit = 1_000u128;
    set(&mut c, bot(), vec![evm_cap(limit)], None, T0);
    // 600 at t, 400 at t + 12 h: full. At t + 23 h 59 nothing is free; at t + 24 h the first 600 come back, not 1000.
    sign_as(&mut c, bot(), evm_tx(0, 600, 0, 0), T0);
    sign_as(&mut c, bot(), evm_tx(1, 400, 0, 0), T0 + W / 2);
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(2, 1, 0, 0), T0 + W - 60_000));
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), evm_tx(2, 601, 0, 0), T0 + W));
    sign_as(&mut c, bot(), evm_tx(2, 600, 0, 0), T0 + W);
}

#[test]
fn expiry_edge() {
    let mut c = setup();
    let exp = T0 + 60_000;
    set(&mut c, bot(), vec![evm_cap(10 * KB31_DEBIT)], Some(exp), T0);
    sign_as(&mut c, bot(), kb31(), exp - 1);
    expect_err(ERR_ALLOWANCE_EXPIRED, || sign_as(&mut c, bot(), kb31(), exp));
    assert_eq!(sig_count(&c), 1);
    ctx(bot(), 0, exp);
    assert_eq!(c.allowance("1".into(), bot()).unwrap().status, AllowanceStatus::Expired);
}

#[test]
fn rate_limit_counts_every_debit_including_zero() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(1_000)], None, T0);
    for n in 0..MAX_SPENDS as u64 {
        sign_as(&mut c, bot(), evm_tx(n, 0, 0, 0), T0 + n);
    }
    expect_err(ERR_ALLOWANCE_RATE, || sign_as(&mut c, bot(), evm_tx(32, 0, 0, 0), T0 + 100));
    assert_eq!(sig_count(&c), 32);
    // the first entry leaves the window at T0 + W
    sign_as(&mut c, bot(), evm_tx(32, 0, 0, 0), T0 + W);
}

#[test]
fn forbidden_kinds_for_delegates() {
    // EVM calldata other than an ERC-20 transfer (pure function: today's classifier refuses all calldata first)
    let mut f = evm::tests::base();
    f.data = evm::tests::enc_str(&[0x09, 0x5e, 0xa7, 0xb3, 0, 0, 0, 0]); // approve selector, short
    assert_eq!(evm_debits(&evm::tests::build(&f)).unwrap_err().code, ERR_ALLOWANCE_KIND);
    let mut data = vec![0x09, 0x5e, 0xa7, 0xb3];
    data.extend([0u8; 64]); // approve(address,uint256), 68 bytes
    f.data = evm::tests::enc_str(&data);
    assert_eq!(evm_debits(&evm::tests::build(&f)).unwrap_err().code, ERR_ALLOWANCE_KIND);
    assert_eq!(evm_debits(&[0x01, 0xc0]).unwrap_err().code, ERR_ALLOWANCE_KIND);
    assert_eq!(evm_debits(&[]).unwrap_err().code, ERR_ALLOWANCE_KIND);
    // through sign_for, the classifier's own refusal comes first (ERR_EVM_DATA) and nothing is written
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(18))], None, T0);
    expect_err(ERR_EVM_DATA, || sign_as(&mut c, bot(), SignRequest::Evm { unsigned_tx: hex::encode(evm::tests::build(&f)) }, T0));
    assert_eq!(sig_count(&c), 0);
}

#[test]
fn erc20_debits_token_and_gas() {
    let tok = [0x1c; 20];
    let mut data = ERC20_SELECTOR.to_vec();
    data.extend([0u8; 12]);
    data.extend([0x22; 20]);
    let mut amount = [0u8; 32];
    amount[24..].copy_from_slice(&5_000_000u64.to_be_bytes());
    data.extend(amount);
    let mut f = evm::tests::base();
    f.to = evm::tests::enc_str(&tok);
    f.value = evm::tests::int(0);
    f.gas = evm::tests::int(65_000);
    f.fee = evm::tests::int(3_000_000_000);
    f.data = evm::tests::enc_str(&data);
    let d = evm_debits(&evm::tests::build(&f)).unwrap();
    assert_eq!(
        d,
        vec![
            (Asset::Erc20 { chain_id: SEPOLIA, token: hex::encode(tok) }, 5_000_000),
            (Asset::Evm { chain_id: SEPOLIA }, 65_000 * 3_000_000_000),
        ]
    );
    // an amount ≥ 2^128 is refused as an overflow
    let mut big = data.clone();
    big[36] = 1;
    f.data = evm::tests::enc_str(&big);
    assert_eq!(evm_debits(&evm::tests::build(&f)).unwrap_err().code, ERR_ALLOWANCE_EXCEEDED);
    // and the Allowance needs both caps
    let mut a = Allowance {
        delegate: bot(),
        set_at_ms: T0,
        expires_at_ms: None,
        caps: validate_caps(vec![cap(Asset::Erc20 { chain_id: SEPOLIA, token: hex::encode(tok) }, 5_000_000)]).unwrap(),
    };
    assert_eq!(a.debit(&d, T0).unwrap_err().code, ERR_ALLOWANCE_ASSET, "gas needs an EVM cap");
    a.caps.push(Cap { asset: Asset::Evm { chain_id: SEPOLIA }, limit: 65_000 * 3_000_000_000, spends: vec![] });
    a.debit(&d, T0).unwrap();
    assert_eq!(a.spends_in_window(T0), 2, "two debits, two entries");
}
const ERC20_SELECTOR: [u8; 4] = [0xa9, 0x05, 0x9c, 0xbb];

#[test]
fn btc_debit_ignores_change_and_counts_the_fee() {
    let mut tx = btc::tests::sample_tx(2);
    let own: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
    // 40_000 to a P2WPKH recipient, 1_000 to a P2TR, 50_000 change to our own pkh; inputs 50_000 + 50_001
    tx.outputs.extend(btc::tests::output(50_000, &own));
    let pre = btc::tests::preimages(&tx);
    let fee = (50_000 + 50_001) - (40_000 + 1_000 + 50_000);
    assert_eq!(btc_debit(&pre, &tx.outputs).unwrap(), 41_000 + fee);
    // through sign_for, a delegate may only sign it with one input (AUDIT-01): 1 input of 100_001 sats, same outputs
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 41_000 + fee)], None, T0);
    expect_err(ERR_ALLOWANCE_BTC_ONE_INPUT, || sign_as(&mut c, bot(), btc_req_of(&tx), T0));
    assert_eq!(sig_count(&c), 0);
    let mut one = tx.clone();
    one.inputs.truncate(1);
    one.inputs[0].amount = 50_000 + 50_001;
    assert_eq!(btc_debit(&btc::tests::preimages(&one), &one.outputs).unwrap(), 41_000 + fee);
    sign_as(&mut c, bot(), btc_req_of(&one), T0);
    assert_eq!(sig_count(&c), 1);
    assert_eq!(remaining(&c, &Asset::Btc), 0);
    assert_eq!(events("allowance_spent")[0]["data"]["debits"], json!([{"asset":"btc","amount":(41_000 + fee).to_string()}]));
    // outputs above the inputs: no negative fee, the external outputs still count
    let mut t2 = btc::tests::sample_tx(1);
    t2.inputs[0].amount = 1;
    assert_eq!(btc_debit(&btc::tests::preimages(&t2), &t2.outputs).unwrap(), 41_000);
    // a P2SH or P2PKH script paying our pkh is not "change" (only 0014‖pkh is)
    let mut t3 = btc::tests::sample_tx(1);
    t3.outputs = btc::tests::output(7, &[&[0x76, 0xa9, 0x14][..], &t3.pkh[..], &[0x88, 0xac][..]].concat());
    assert_eq!(btc_debit(&btc::tests::preimages(&t3), &t3.outputs).unwrap(), 7 + 50_000 - 7);
}

#[test]
fn sol_debit_is_lamports_plus_fee() {
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Sol, 1_000_000 + 5_000)], None, T0);
    sign_as(&mut c, bot(), sol_req(), T0);
    assert_eq!(remaining(&c, &Asset::Sol), 0);
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), sol_req(), T0 + 1));
}

// ── a delegate has no owner powers ───────────────────────────────────────────────────────────────

#[test]
fn delegate_cannot_list_delist_transfer_withdraw_or_manage_allowances() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(18))], None, T0);
    ctx(bot(), 10 * MILLI, T0 + 600_000);
    expect_err(ERR_NOT_OWNER, || c.list("1".into(), U128(1), Currency::Near));
    ctx(bot(), 1, T0);
    expect_err(ERR_NOT_OWNER, || c.nft_transfer(bot(), "1".into(), None, None));
    ctx(bot(), 10 * MILLI, T0);
    expect_err(ERR_NOT_OWNER, || c.set_allowance("1".into(), carol(), vec![evm_cap(1)], None));
    ctx(bot(), 1, T0);
    expect_err(ERR_NOT_OWNER, || c.revoke_allowance("1".into(), bot()));
    ctx(bot(), 1, T0);
    expect_err(ERR_NOTHING_OWED, || c.withdraw_proceeds(Currency::Near));
    // once listed, delist by the delegate is refused too
    ctx(alice(), 10 * MILLI, T0);
    c.list("1".into(), U128(10), Currency::Near);
    ctx(bot(), 1, T0);
    expect_err(ERR_NOT_OWNER, || c.delist("1".into()));
    assert_eq!(c.tokens.owner_by_id.get(&"1".to_string()).unwrap(), alice());
}

// ── reset on transfer and sale; pause while listed ───────────────────────────────────────────────

#[test]
fn transfer_clears_and_a_return_does_not_revive() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(18))], None, T0);
    set(&mut c, carol(), vec![evm_cap(10u128.pow(18))], None, T0);
    ctx(alice(), 1, T0);
    c.nft_transfer(bob(), "1".into(), None, None);
    assert_eq!(
        events("allowances_cleared")[0]["data"],
        json!({"token_id":"1","delegate_ids":["bot.testnet","carol.testnet"],"reason":"transfer"})
    );
    assert!(c.allowances_of("1".into()).is_empty());
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), kb31(), T0 + 1));
    ctx(bob(), 1, T0 + 2);
    c.nft_transfer(alice(), "1".into(), None, None);
    assert!(events("allowances_cleared").is_empty(), "nothing left to clear");
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), kb31(), T0 + 3));
    assert!(c.allowances_of("1".into()).is_empty());
    // a transfer without allowances clears nothing and leaves no entry
    ctx(alice(), 1, T0 + 4);
    c.nft_transfer(bob(), "1".into(), None, None);
    assert!(events("allowances_cleared").is_empty());
    assert!(near_sdk::collections::LookupMap::<TokenId, TokenAllowances>::new(StorageKey::Allowances).get(&"1".to_string()).is_none());
}

#[test]
fn listing_pauses_then_sale_clears() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10 * KB31_DEBIT)], None, T0);
    ctx(alice(), 10 * MILLI, T0);
    let id = c.list("1".into(), U128(10 * MILLI), Currency::Near);
    expect_err(ERR_FROZEN, || sign_as(&mut c, bot(), kb31(), T0 + 1));
    assert_eq!(sig_count(&c), 0);
    assert_eq!(c.allowance("1".into(), bot()).unwrap().status, AllowanceStatus::Paused);
    // delist resumes delegated signing
    ctx(alice(), 1, T0 + 2);
    c.delist("1".into());
    assert_eq!(c.allowance("1".into(), bot()).unwrap().status, AllowanceStatus::Active);
    sign_as(&mut c, bot(), kb31(), T0 + 3);
    // relist after the quiet period, then a NEAR buy clears everything
    let later = T0 + 3 + 300_000;
    ctx(alice(), 10 * MILLI, later);
    let id2 = c.list("1".into(), U128(10 * MILLI), Currency::Near);
    assert_ne!(id, id2);
    ctx(carol(), 10 * MILLI, later + 1);
    c.buy("1".into(), id2, 1);
    assert_eq!(
        events("allowances_cleared")[0]["data"],
        json!({"token_id":"1","delegate_ids":["bot.testnet"],"reason":"sale"})
    );
    assert!(c.allowances_of("1".into()).is_empty());
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), evm_tx(1, 0, 0, 0), later + 2));
}

#[test]
fn usdc_sale_clears_too() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(1)], None, T0);
    ctx(alice(), 10 * MILLI, T0);
    let id = c.list("1".into(), U128(5_000_000), Currency::Usdc);
    ctx(usdc(), 0, T0 + 1);
    let msg = json!({"buy":{"token_id":"1","listing_id":id,"expected_sig_count":0}}).to_string();
    let _ = c.ft_on_transfer(carol(), U128(5_000_000), msg);
    assert_eq!(events("allowances_cleared")[0]["data"]["reason"], "sale");
    assert!(c.allowances_of("1".into()).is_empty());
}

#[test]
fn set_while_listed_is_paused_and_cleared_by_the_sale() {
    let mut c = setup();
    ctx(alice(), 10 * MILLI, T0);
    let id = c.list("1".into(), U128(10 * MILLI), Currency::Near);
    set(&mut c, bot(), vec![evm_cap(1)], None, T0 + 1);
    assert_eq!(c.allowance("1".into(), bot()).unwrap().status, AllowanceStatus::Paused);
    ctx(carol(), 10 * MILLI, T0 + 2);
    c.buy("1".into(), id, 0);
    assert!(c.allowances_of("1".into()).is_empty());
}

#[test]
fn stale_set_of_a_previous_owner_is_ignored() {
    // a set granted by bob while alice owns the token (only reachable if a future ownership path forgot to clear)
    let mut c = setup();
    let stale = TokenAllowances {
        owner: bob(),
        list: vec![Allowance {
            delegate: bot(),
            set_at_ms: T0,
            expires_at_ms: None,
            caps: validate_caps(vec![evm_cap(10u128.pow(18))]).unwrap(),
        }],
    };
    near_sdk::collections::LookupMap::<TokenId, TokenAllowances>::new(StorageKey::Allowances).insert(&"1".to_string(), &stale);
    assert!(c.allowances_of("1".into()).is_empty());
    assert!(c.allowance("1".into(), bot()).is_none());
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), kb31(), T0));
    ctx(alice(), 1, T0);
    expect_err(ERR_ALLOWANCE_NOT_FOUND, || c.revoke_allowance("1".into(), bot()));
    // the new owner's set_allowance replaces it
    set(&mut c, carol(), vec![evm_cap(1)], None, T0);
    let ds: Vec<AccountId> = c.allowances_of("1".into()).into_iter().map(|v| v.delegate).collect();
    assert_eq!(ds, vec![carol()]);
}

#[test]
fn views_for_unknown_tokens_and_delegates() {
    let c = setup();
    assert!(c.allowances_of("9".into()).is_empty());
    assert!(c.allowance("1".into(), bot()).is_none());
}

// ── shared vectors (vectors/allowance.json, tools/vectors/allowance.ts) ─────────────────────────

fn asset_of(v: &Value) -> Asset {
    serde_json::from_value(v.clone()).unwrap_or_else(|e| panic!("asset {v}: {e}"))
}
fn u(v: &Value) -> u128 {
    v.as_str().unwrap_or_else(|| panic!("not a decimal string: {v}")).parse().unwrap()
}

#[test]
fn shared_allowance_vectors() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors/allowance.json");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))).unwrap();
    assert_eq!(doc["schema"], "satchel-allowance-vectors/1");
    let mut n = 0;
    // 1. request → debits, through the real classifier
    for v in doc["debits"].as_array().unwrap() {
        let name = v["name"].as_str().unwrap();
        let req: SignRequest = serde_json::from_value(v["request"].clone()).unwrap();
        let got = parse::classify(&req).map_err(|code| code.to_string()).and_then(|c| request_debits(&c).map_err(|r| r.code.to_string()));
        match (got, v["expect"]["ok"].as_bool().unwrap()) {
            (Ok(d), true) => {
                let want: Vec<(Asset, u128)> =
                    v["expect"]["debits"].as_array().unwrap().iter().map(|x| (asset_of(&x["asset"]), u(&x["amount"]))).collect();
                assert_eq!(d, want, "{name}");
            }
            (Err(code), false) => assert_eq!(code, v["expect"]["error"].as_str().unwrap(), "{name}"),
            (got, _) => panic!("{name}: got {got:?}, want {}", v["expect"]),
        }
        n += 1;
    }
    // 2. raw EVM tx bytes → debits (covers ERC-20 calldata the stateless classifier refuses today)
    for v in doc["evm_raw"].as_array().unwrap() {
        let name = v["name"].as_str().unwrap();
        let tx = hex::decode(v["unsigned_tx"].as_str().unwrap()).unwrap();
        match (evm_debits(&tx), v["expect"]["ok"].as_bool().unwrap()) {
            (Ok(d), true) => {
                let want: Vec<(Asset, u128)> =
                    v["expect"]["debits"].as_array().unwrap().iter().map(|x| (asset_of(&x["asset"]), u(&x["amount"]))).collect();
                assert_eq!(d, want, "{name}");
            }
            (Err(r), false) => assert_eq!(r.code, v["expect"]["error"].as_str().unwrap(), "{name}"),
            (got, _) => panic!("{name}: got {got:?}, want {}", v["expect"]),
        }
        n += 1;
    }
    // 3. window: caps with spends + debits at now → ok (remaining after) | error
    for v in doc["window"].as_array().unwrap() {
        let name = v["name"].as_str().unwrap();
        let mut a = Allowance {
            delegate: bot(),
            set_at_ms: 0,
            expires_at_ms: None,
            caps: v["caps"]
                .as_array()
                .unwrap()
                .iter()
                .map(|c| Cap {
                    asset: asset_of(&c["asset"]),
                    limit: u(&c["limit"]),
                    spends: c["spends"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .map(|s| Spend { at_ms: s["at_ms"].as_u64().unwrap(), amount: u(&s["amount"]) })
                        .collect(),
                })
                .collect(),
        };
        let now = v["now_ms"].as_u64().unwrap();
        let debits: Vec<(Asset, u128)> = v["debits"].as_array().unwrap().iter().map(|x| (asset_of(&x["asset"]), u(&x["amount"]))).collect();
        let before: Vec<u128> = a.caps.iter().map(|c| c.remaining(now)).collect();
        let want_before: Vec<u128> = v["expect"]["remaining_before"].as_array().unwrap().iter().map(u).collect();
        assert_eq!(before, want_before, "{name}: remaining before");
        match (a.debit(&debits, now), v["expect"]["ok"].as_bool().unwrap()) {
            (Ok(()), true) => {
                let after: Vec<u128> = a.caps.iter().map(|c| c.remaining(now)).collect();
                let want: Vec<u128> = v["expect"]["remaining_after"].as_array().unwrap().iter().map(u).collect();
                assert_eq!(after, want, "{name}: remaining after");
            }
            (Err(r), false) => assert_eq!(r.code, v["expect"]["error"].as_str().unwrap(), "{name}"),
            (got, _) => panic!("{name}: got {got:?}, want {}", v["expect"]),
        }
        n += 1;
    }
    assert!(n >= 20, "only {n} allowance vectors");
}

// ── property tests: cap accounting vs an independent oracle (docs/security/fuzzing.md §C5) ───────

/// Oracle: the complete history of accepted debits; a debit at `t` is allowed iff, for its asset, the accepted
/// amounts stamped in (t − W, t] plus this one stay ≤ the limit, and the total count stamped in that window plus
/// this request's debits stays ≤ MAX_SPENDS.
struct Oracle {
    limits: Vec<(Asset, u128)>,
    history: Vec<(u64, Asset, u128)>,
}

impl Oracle {
    fn sum(&self, asset: &Asset, t: u64) -> u128 {
        self.history.iter().filter(|(at, a, _)| a == asset && t < at + W).fold(0u128, |s, (_, _, x)| s.saturating_add(*x))
    }
    fn count(&self, t: u64) -> usize {
        self.history.iter().filter(|(at, _, _)| t < at + W).count()
    }
    fn try_debit(&mut self, debits: &[(Asset, u128)], t: u64) -> Result<(), &'static str> {
        let mut pending: Vec<(Asset, u128)> = vec![];
        for (asset, x) in debits {
            let Some((_, limit)) = self.limits.iter().find(|(a, _)| a == asset) else {
                return Err(ERR_ALLOWANCE_ASSET);
            };
            let p = pending.iter().filter(|(a, _)| a == asset).fold(0u128, |s, (_, y)| s.saturating_add(*y));
            if self.sum(asset, t).saturating_add(p).saturating_add(*x) > *limit {
                return Err(ERR_ALLOWANCE_EXCEEDED);
            }
            pending.push((asset.clone(), *x));
        }
        if self.count(t) + debits.len() > MAX_SPENDS {
            return Err(ERR_ALLOWANCE_RATE);
        }
        for (a, x) in pending {
            self.history.push((t, a, x));
        }
        Ok(())
    }
}

fn assets() -> Vec<Asset> {
    vec![Asset::Btc, Asset::Sol, Asset::Evm { chain_id: SEPOLIA }, Asset::Erc20 { chain_id: SEPOLIA, token: "11".repeat(20) }]
}

fn arb_step() -> impl Strategy<Value = (u64, Vec<(usize, u128)>)> {
    // time advance: mostly small, sometimes about a window (to hit both sides of the boundary)
    let dt = prop_oneof![0u64..5_000, (W - 3_000)..(W + 3_000), 0u64..(2 * W)];
    (dt, prop::collection::vec((0usize..5, prop_oneof![0u128..50, 0u128..1_000, Just(u128::MAX)]), 1..3))
}

proptest! {
    #![proptest_config(ProptestConfig {
        cases: std::env::var("PROPTEST_CASES").ok().and_then(|s| s.parse().ok()).unwrap_or(256),
        failure_persistence: None,
        ..ProptestConfig::default()
    })]

    /// Contract accounting == oracle at every step, and the cap invariant holds at every instant.
    #[test]
    fn window_accounting_matches_oracle(
        limits in prop::collection::vec(1u128..2_000, 4),
        cap_mask in 1u8..16,
        steps in prop::collection::vec(arb_step(), 1..80),
    ) {
        let all = assets();
        let caps: Vec<(Asset, u128)> = all.iter().cloned().zip(limits).enumerate()
            .filter(|(i, _)| cap_mask & (1 << i) != 0).map(|(_, x)| x).collect();
        let mut a = Allowance {
            delegate: bot(), set_at_ms: 0, expires_at_ms: None,
            caps: caps.iter().map(|(asset, l)| Cap { asset: asset.clone(), limit: *l, spends: vec![] }).collect(),
        };
        let mut o = Oracle { limits: caps.clone(), history: vec![] };
        let mut t = T0;
        for (dt, ds) in steps {
            t += dt;
            // index 4 = an asset that never has a cap
            let debits: Vec<(Asset, u128)> = ds.into_iter().map(|(i, x)| {
                let asset = if i < 4 { all[i].clone() } else { Asset::Evm { chain_id: 84_532 } };
                (asset, x)
            }).collect();
            let got = a.debit(&debits, t).map_err(|r| r.code);
            let want = o.try_debit(&debits, t);
            prop_assert_eq!(got, want, "t={} debits={:?}", t, debits);
            for (asset, limit) in &caps {
                let c = a.caps.iter().find(|c| &c.asset == asset).unwrap();
                prop_assert_eq!(c.spent(t), o.sum(asset, t));
                prop_assert!(c.spent(t) <= *limit, "cap exceeded");
                prop_assert_eq!(c.remaining(t), limit - o.sum(asset, t));
            }
            prop_assert!(a.spends_in_window(t) <= MAX_SPENDS);
            // storage is bounded: pruned state never holds more than MAX_SPENDS entries
            let stored: usize = a.caps.iter().map(|c| c.spends.len()).sum();
            prop_assert!(stored <= MAX_SPENDS);
        }
    }

    /// EVM debits: native = value + gas × max_fee exactly (checked), never less than value; random calldata is KIND.
    #[test]
    fn evm_debit_is_worst_case(value in any::<u128>(), gas in any::<u64>(), fee in any::<u128>(), data in prop::collection::vec(any::<u8>(), 0..80)) {
        let mut f = evm::tests::base();
        f.value = evm::tests::int(value);
        f.gas = evm::tests::int(gas as u128);
        f.fee = evm::tests::int(fee);
        f.data = evm::tests::enc_str(&data);
        let r = evm_debits(&evm::tests::build(&f));
        let native = (gas as u128).checked_mul(fee).and_then(|x| x.checked_add(value));
        let is_erc20 = data.len() == 68 && data[..4] == ERC20_SELECTOR;
        match (r, native) {
            (Err(e), None) => prop_assert_eq!(e.code, ERR_ALLOWANCE_EXCEEDED),
            (Err(e), Some(_)) => prop_assert!(e.code == ERR_ALLOWANCE_KIND && !data.is_empty() && !is_erc20
                || e.code == ERR_ALLOWANCE_EXCEEDED && is_erc20),
            (Ok(d), Some(n)) => {
                prop_assert!(n >= value);
                prop_assert_eq!(d.last().unwrap(), &(Asset::Evm { chain_id: SEPOLIA }, n));
                prop_assert!(data.is_empty() && d.len() == 1 || is_erc20 && d.len() == 2);
            }
            (Ok(_), None) => prop_assert!(false, "overflow must refuse"),
        }
    }

    /// BTC debits: ≥ every external output and = external + max(0, inputs − outputs); change never counts.
    #[test]
    fn btc_debit_bounds(n in 1usize..4, amounts in prop::collection::vec(0u64..1_000_000, 4),
                        outs in prop::collection::vec((0u64..1_000_000, any::<bool>()), 1..6)) {
        ctx(alice(), 0, T0); // a fresh mock per case: env::sha256 is gas-metered (docs/security/fuzzing.md §5 notes)
        let mut tx = btc::tests::sample_tx(n);
        for (i, inp) in tx.inputs.iter_mut().enumerate() { inp.amount = amounts[i]; }
        let own: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
        let other: Vec<u8> = [&[0x00, 0x14][..], &[0x42; 20][..]].concat();
        tx.outputs = outs.iter().flat_map(|(v, mine)| btc::tests::output(*v, if *mine { &own } else { &other })).collect();
        let d = btc_debit(&btc::tests::preimages(&tx), &tx.outputs).unwrap();
        let ext: u128 = outs.iter().filter(|(_, m)| !m).map(|(v, _)| *v as u128).sum();
        let total: u128 = outs.iter().map(|(v, _)| *v as u128).sum();
        let inputs: u128 = amounts[..n].iter().map(|a| *a as u128).sum();
        prop_assert!(d >= ext);
        prop_assert_eq!(d, ext + inputs.saturating_sub(total));
    }

    /// AUDIT-01: through the real classifier, a delegate's BTC request is debited iff it has exactly one input; any
    /// other count the classifier accepts is refused ERR_ALLOWANCE_BTC_ONE_INPUT, whatever the stated amounts.
    #[test]
    fn btc_delegate_debits_need_one_input(n in 1usize..6, amounts in prop::collection::vec(0u64..2_000_000, 5),
                                          outs in prop::collection::vec((0u64..1_000_000, any::<bool>()), 1..4)) {
        ctx(alice(), 0, T0);
        let mut tx = btc::tests::sample_tx(n);
        for (i, inp) in tx.inputs.iter_mut().enumerate() { inp.amount = amounts[i]; }
        let own: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
        let other: Vec<u8> = [&[0x00, 0x14][..], &[0x42; 20][..]].concat();
        tx.outputs = outs.iter().flat_map(|(v, mine)| btc::tests::output(*v, if *mine { &own } else { &other })).collect();
        let c = parse::classify(&btc_req_of(&tx)).expect("a well-formed P2WPKH tx classifies");
        match request_debits(&c) {
            Ok(d) => {
                prop_assert_eq!(n, 1);
                let want = btc_debit(&btc::tests::preimages(&tx), &tx.outputs).unwrap();
                prop_assert_eq!(d, vec![(Asset::Btc, want)]);
            }
            Err(r) => {
                prop_assert!(n > 1);
                prop_assert_eq!(r.code, ERR_ALLOWANCE_BTC_ONE_INPUT);
            }
        }
    }
}

/// C7 × C5: message signing is the owner's alone. A delegate with caps on EVM and SOL is refused ERR_ALLOWANCE_KIND
/// before anything is written; the owner signs the same message.
#[test]
fn c7_messages_are_refused_for_delegates() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(18)), cap(Asset::Sol, 10u128.pow(12))], None, T0);
    for req in [SignRequest::EvmMessage { message: hex::encode(b"hello") }, SignRequest::SolMessage { message: hex::encode(b"hello") }] {
        expect_err(ERR_ALLOWANCE_KIND, || sign_as(&mut c, bot(), req.clone(), T0 + 1_000));
        assert_eq!(sig_count(&c), 0);
    }
    ctx(alice(), 6 * MILLI, T0 + 2_000);
    c.sign_for("1".into(), SignRequest::EvmMessage { message: hex::encode(b"hello") }, None);
    assert_eq!(sig_count(&c), 1);
}

// ── test audit 2026-10-30 (docs/testing/contract.md) ─────────────────────────────────────────────

/// A BTC request whose preimages carry the real input amounts (what a usable signature needs), for one tx.
fn btc_req_of(tx: &btc::tests::Tx) -> SignRequest {
    let pre = btc::tests::preimages(tx);
    SignRequest::Btc { preimages: pre.iter().map(hex::encode).collect(), outputs: hex::encode(&tx.outputs) }
}

/// AUDIT-01 (Medium, C5, FIXED): the BIP143 "split amount" attack no longer bypasses a delegate's BTC cap.
///
/// BIP143 (segwit v0) commits each input's amount only in THAT input's sighash. A delegate used to ask for the same tx
/// twice: request 1 states input A's real amount and understates B; request 2 states B's real amount and understates
/// A. Each request's debit used the stated (low) amounts, so its computed fee was ≈ 0, but the signature for A (from
/// request 1) and for B (from request 2) are both valid for the real tx, whose real fee is huge. Here 2 inputs of
/// 1,000,000 sats each, one 1,000,000-sat output back to the Satchel's own P2WPKH (change, never debited): the real fee
/// burns 1,000,000 sats while the two requests would have been debited 1 sat each against a 1,000-sat cap.
///
/// Fix: a delegate may sign BTC only with exactly one input (`ERR_ALLOWANCE_BTC_ONE_INPUT`), so the only sighash
/// commits to the only amount and the stated fee is the real fee. Both halves are refused before any write.
#[test]
fn audit01_btc_split_amount_requests_bypass_the_delegate_cap() {
    const X: u64 = 1_000_000;
    let mut real = btc::tests::sample_tx(2);
    for i in real.inputs.iter_mut() {
        i.amount = X;
    }
    let own: Vec<u8> = [&[0x00, 0x14][..], &real.pkh[..]].concat();
    real.outputs = btc::tests::output(X, &own); // all value "returns" as change; the rest (X sats) is fee
    let real_pre = btc::tests::preimages(&real);
    // request 1: A real, B understated to 1 sat; request 2: the reverse
    let mut r1 = real.clone();
    r1.inputs[1].amount = 1;
    let mut r2 = real.clone();
    r2.inputs[0].amount = 1;
    // the debit math alone is fooled (why the fix is a request-shape rule, not a debit change) …
    assert_eq!(btc_debit(&btc::tests::preimages(&r1), &r1.outputs).unwrap(), 1, "stated fee of request 1");
    assert_eq!(btc_debit(&btc::tests::preimages(&r2), &r2.outputs).unwrap(), 1, "stated fee of request 2");
    assert_eq!(btc_debit(&real_pre, &real.outputs).unwrap(), X as u128, "the real tx burns X sats as fee");
    // … but neither half reaches it: both are refused before any record or spend entry is written
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 1_000)], None, T0);
    expect_err(ERR_ALLOWANCE_BTC_ONE_INPUT, || sign_as(&mut c, bot(), btc_req_of(&r1), T0));
    expect_err(ERR_ALLOWANCE_BTC_ONE_INPUT, || sign_as(&mut c, bot(), btc_req_of(&r2), T0 + 1_000));
    assert_eq!(sig_count(&c), 0);
    assert_eq!(remaining(&c, &Asset::Btc), 1_000);
    assert!(events("allowance_spent").is_empty() && events("sign_requested").is_empty());
    // the owner signs the same 2-input tx (owners are trusted and never debited)
    ctx(alice(), 10 * MILLI, T0 + 2_000);
    c.sign_for("1".into(), btc_req_of(&real), None);
    assert_eq!(sig_count(&c), 2);
}

/// Companion of AUDIT-01: with the real amounts in ONE request, a 2-input tx is still refused for the delegate (one
/// input only), and the 1-input version of the same fee burn is debited in full, so the cap holds.
#[test]
fn audit01_btc_real_amounts_in_one_request_debit_the_full_fee() {
    const X: u64 = 1_000_000;
    let mut real = btc::tests::sample_tx(2);
    for i in real.inputs.iter_mut() {
        i.amount = X;
    }
    let own: Vec<u8> = [&[0x00, 0x14][..], &real.pkh[..]].concat();
    real.outputs = btc::tests::output(X, &own);
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 1_000)], None, T0);
    expect_err(ERR_ALLOWANCE_BTC_ONE_INPUT, || sign_as(&mut c, bot(), btc_req_of(&real), T0));
    // one input of 2X, the same X-sat change: the X-sat fee is debited and refused under a 1,000-sat cap
    let mut one = real.clone();
    one.inputs.truncate(1);
    one.inputs[0].amount = 2 * X;
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), btc_req_of(&one), T0));
    assert_eq!(sig_count(&c), 0);
}

/// AUDIT-01: a delegate's single-input BTC send within its cap still works, is debited the external outputs plus the
/// fee, and a second one is refused once the cap is spent.
#[test]
fn audit01_delegate_single_input_btc_within_cap_signs() {
    let mut tx = btc::tests::sample_tx(1); // 50_000 in; 40_000 + 1_000 out to others
    let own: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
    tx.outputs.extend(btc::tests::output(8_500, &own)); // change; fee = 500
    let debit = 41_000 + 500;
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, debit + 100)], None, T0);
    sign_as(&mut c, bot(), btc_req_of(&tx), T0);
    assert_eq!(sig_count(&c), 1);
    assert_eq!(remaining(&c, &Asset::Btc), 100);
    assert_eq!(events("allowance_spent")[0]["data"]["debits"], json!([{"asset":"btc","amount":debit.to_string()}]));
    let recs = c.sig_records("1".into(), 0, 50);
    assert_eq!(recs[0].requester, bot());
    assert_eq!(recs[0].payload, hex::encode(btc::sha256d(&btc::tests::preimages(&tx)[0])));
    expect_err(ERR_ALLOWANCE_EXCEEDED, || sign_as(&mut c, bot(), btc_req_of(&tx), T0 + 1_000));
    assert_eq!(sig_count(&c), 1);
}

// ── test audit round two (2026-10-30, docs/testing/contract.md §7) ──────────────────────────────

/// The code `sign_for` gives the owner for `req` (the stateless classifier's), so a delegate test can assert that the
/// delegate gets exactly the same refusal, before any allowance logic runs.
fn classifier_code(req: &SignRequest) -> &'static str {
    match parse::classify(req) {
        Err(code) => code,
        Ok(_) => panic!("expected the classifier to refuse {req:?}"),
    }
}

fn btc_raw(pre: &[Vec<u8>], outputs: &[u8]) -> SignRequest {
    SignRequest::Btc { preimages: pre.iter().map(hex::encode).collect(), outputs: hex::encode(outputs) }
}

/// Round two, one-input rule (AUDIT-01) with edge shapes. Every shape below is refused for the delegate before any
/// write (no record, no spend entry, no event, the cap untouched), and a valid 1-input send still signs afterwards:
/// - 0 inputs → `ERR_BTC_INPUT_COUNT` (step 3, before the classifier); 11 inputs → the same;
/// - the same outpoint twice (two inputs) and the same preimage twice → `ERR_BTC_DUPLICATE_INPUT` (classifier);
/// - ONE input of a 2-input tx sent alone, either one → `ERR_BTC_PREVOUTS_INCOMPLETE`: hashPrevouts commits to every
///   outpoint, so a delegate cannot get a multi-input tx signed one "single-input" request at a time (the bypass the
///   fix would otherwise invite);
/// - a 2-input tx whose preimages state the real amounts → `ERR_ALLOWANCE_BTC_ONE_INPUT` (after the classifier).
#[test]
fn r2_delegate_btc_one_input_rule_edge_shapes() {
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 1_000_000_000)], None, T0);
    let tx2 = btc::tests::sample_tx(2);
    let pre2 = btc::tests::preimages(&tx2);
    let mut dup = btc::tests::sample_tx(2);
    dup.inputs[1].txid_le = dup.inputs[0].txid_le;
    dup.inputs[1].vout = dup.inputs[0].vout;
    let tx11 = btc::tests::sample_tx(11);
    let cases: Vec<(&str, SignRequest)> = vec![
        (ERR_BTC_INPUT_COUNT, btc_raw(&[], &tx2.outputs)),
        (ERR_BTC_INPUT_COUNT, btc_raw(&btc::tests::preimages(&tx11), &tx11.outputs)),
        (ERR_BTC_DUPLICATE_INPUT, btc_raw(&btc::tests::preimages(&dup), &dup.outputs)),
        (ERR_BTC_DUPLICATE_INPUT, btc_raw(&[pre2[0].clone(), pre2[0].clone()], &tx2.outputs)),
        (ERR_BTC_PREVOUTS_INCOMPLETE, btc_raw(&pre2[..1], &tx2.outputs)),
        (ERR_BTC_PREVOUTS_INCOMPLETE, btc_raw(&pre2[1..], &tx2.outputs)),
        (ERR_ALLOWANCE_BTC_ONE_INPUT, btc_raw(&pre2, &tx2.outputs)),
    ];
    for (i, (code, req)) in cases.iter().enumerate() {
        // the owner gets the same code for every classifier refusal (the delegate path adds nothing before it)
        if *code != ERR_ALLOWANCE_BTC_ONE_INPUT && *code != ERR_BTC_INPUT_COUNT {
            assert_eq!(classifier_code(req), *code, "case {i}");
        }
        expect_err(code, || sign_as(&mut c, bot(), req.clone(), T0 + 1_000 * i as u64));
        assert_eq!(sig_count(&c), 0, "case {i}");
        assert!(events("sign_requested").is_empty() && events("allowance_spent").is_empty(), "case {i}");
    }
    assert_eq!(remaining(&c, &Asset::Btc), 1_000_000_000);
    assert_eq!(c.allowance("1".into(), bot()).unwrap().spends_in_window, 0);
    // the owner signs the 2-input tx; the delegate signs a complete 1-input tx
    ctx(alice(), 10 * MILLI, T0 + 20_000);
    c.sign_for("1".into(), btc_raw(&pre2, &tx2.outputs), None);
    let tx1 = btc::tests::sample_tx(1);
    sign_as(&mut c, bot(), btc_req_of(&tx1), T0 + 21_000);
    assert_eq!(sig_count(&c), 3);
    assert_eq!(c.sig_records("1".into(), 2, 1)[0].requester, bot());
}

/// Round two: what a 1-input request can and cannot hide. The debit uses the preimage's own scriptCode pkh to tell
/// change from spending; a delegate that states a FOREIGN pkh and pays it is debited only the fee, but the MPC then
/// signs a sighash over a scriptCode that is not the Satchel's (BIP143 commits the scriptCode), so the signature cannot
/// spend any Satchel coin. Pinned: such a request is recorded (requester = the delegate, so it shows in clean history),
/// debited 0, and still counts against the 32-per-24 h rate limit.
#[test]
fn r2_delegate_foreign_pkh_change_is_debited_zero_but_recorded() {
    let mut tx = btc::tests::sample_tx(1);
    tx.pkh = [0x99; 20]; // not the Satchel's key hash
    let foreign: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
    tx.outputs = btc::tests::output(tx.inputs[0].amount, &foreign); // all value to "change" at the foreign pkh
    assert_eq!(btc_debit(&btc::tests::preimages(&tx), &tx.outputs).unwrap(), 0);
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 1)], None, T0);
    sign_as(&mut c, bot(), btc_req_of(&tx), T0);
    assert_eq!(events("allowance_spent")[0]["data"]["debits"], json!([{"asset":"btc","amount":"0"}]));
    let rec = &c.sig_records("1".into(), 0, 1)[0];
    assert_eq!(rec.requester, bot());
    assert_eq!(c.allowance("1".into(), bot()).unwrap().spends_in_window, 1, "a zero debit is still a rate-limit entry");
}

/// Round two, "mislabeled" requests: a delegate cannot smuggle bytes past the classifier by labeling them as another
/// kind. A message labeled as a transaction, a BTC preimage labeled EVM, an EVM tx labeled SOL, a Solana off-chain
/// message labeled SOL: each is refused with the classifier's code (the owner's code), before the allowance logic,
/// and nothing is written. Message kinds are refused for delegates with `ERR_ALLOWANCE_KIND` BEFORE the classifier,
/// so an invalid message gives ERR_ALLOWANCE_KIND here (the TS mirror `allowanceDebits` classifies first and reports
/// ERR_MSG_*: same refusal, different code; docs/testing/contract.md §7, R2-02).
#[test]
fn r2_delegate_mislabeled_requests_get_the_classifier_code() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(10u128.pow(20)), cap(Asset::Sol, 10u128.pow(12)), cap(Asset::Btc, 10u128.pow(9))], None, T0);
    let eip191 = [b"\x19Ethereum Signed Message:\n5".as_slice(), b"hello"].concat();
    let offchain = [&[0xff][..], b"solana offchain", &[0, 0, 0], b"hello"].concat();
    let btc_pre = btc::tests::preimages(&btc::tests::sample_tx(1)).remove(0);
    let reqs = vec![
        SignRequest::Evm { unsigned_tx: hex::encode(&eip191) },
        SignRequest::Evm { unsigned_tx: hex::encode(&btc_pre) },
        SignRequest::Sol { message: evm::tests::KB31_TX.into() },
        SignRequest::Sol { message: hex::encode(&offchain) },
        SignRequest::Btc { preimages: vec![evm::tests::KB31_TX.into()], outputs: "".into() },
    ];
    for (i, req) in reqs.iter().enumerate() {
        let code = classifier_code(req);
        assert!(code.starts_with("ERR_EVM") || code.starts_with("ERR_SOL") || code.starts_with("ERR_BTC"), "{code}");
        expect_err(code, || sign_as(&mut c, bot(), req.clone(), T0 + i as u64));
    }
    for m in ["", "c0", "68656c6c6f"] {
        for req in [SignRequest::EvmMessage { message: m.into() }, SignRequest::SolMessage { message: m.into() }] {
            expect_err(ERR_ALLOWANCE_KIND, || sign_as(&mut c, bot(), req.clone(), T0 + 100));
        }
    }
    assert_eq!(sig_count(&c), 0);
    assert_eq!(c.allowance("1".into(), bot()).unwrap().spends_in_window, 0);
}

/// Round two, a delegate across owner changes:
/// 1. alice's delegate spends its whole cap; alice gives the token to bob: the delegate is a stranger (ERR_NOT_OWNER);
/// 2. bob grants the SAME delegate a cap: it is a fresh budget (alice's spends are gone with her set), and the records
///    and `allowance_spent` name bob as the owner;
/// 3. bob gives the token to the delegate itself: allowances are cleared; the delegate now signs as the OWNER (no debit,
///    no `allowance_spent`, message signing allowed), and the earlier delegated records keep their requester;
/// 4. it gives the token back to alice: nothing revives.
#[test]
fn r2_delegate_across_owner_changes() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT)], None, T0);
    sign_as(&mut c, bot(), kb31(), T0 + 1_000);
    assert_eq!(remaining(&c, &Asset::Evm { chain_id: SEPOLIA }), 0);
    ctx(alice(), 1, T0 + 2_000);
    c.nft_transfer(bob(), "1".into(), None, None);
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), evm_tx(1, 0, 1, 1), T0 + 3_000));
    // 2. bob's grant to the same delegate starts from zero
    ctx(bob(), 10 * MILLI, T0 + 4_000);
    c.set_allowance("1".into(), bot(), vec![evm_cap(KB31_DEBIT)], None);
    let v = c.allowance("1".into(), bot()).unwrap();
    assert_eq!((v.owner_id.clone(), v.caps[0].spent.0, v.spends_in_window), (bob(), 0, 0));
    let req = evm_tx(1, 0, 21_000, 1);
    sign_as(&mut c, bot(), req, T0 + 5_000);
    assert_eq!(events("allowance_spent")[0]["data"]["owner_id"], "bob.testnet");
    assert_eq!(events("sign_requested")[0]["data"]["owner_id"], "bob.testnet");
    // 3. the delegate becomes the owner
    ctx(bob(), 1, T0 + 6_000);
    c.nft_transfer(bot(), "1".into(), None, None);
    assert_eq!(events("allowances_cleared")[0]["data"]["delegate_ids"], json!(["bot.testnet"]));
    sign_as(&mut c, bot(), evm_tx(2, 10u128.pow(18), 21_000, 10u128.pow(10)), T0 + 7_000);
    assert!(events("allowance_spent").is_empty(), "an owner is never debited");
    ctx(bot(), 6 * MILLI, T0 + 8_000);
    c.sign_for("1".into(), SignRequest::EvmMessage { message: hex::encode(b"hi") }, None);
    let recs = c.sig_records("1".into(), 0, 50);
    assert_eq!(recs.iter().map(|r| r.requester.clone()).collect::<Vec<_>>(), vec![bot(); 4]);
    assert_eq!(events("sign_requested")[0]["data"]["owner_id"], "bot.testnet");
    // 4. back to alice: nothing revives, the ex-owner is a stranger again
    ctx(bot(), 1, T0 + 9_000);
    c.nft_transfer(alice(), "1".into(), None, None);
    assert!(c.allowances_of("1".into()).is_empty());
    expect_err(ERR_NOT_OWNER, || sign_as(&mut c, bot(), evm_tx(3, 0, 1, 1), T0 + 10_000));
}

/// Round two: a refused ownership change (self-transfer, listed token) leaves the allowances in place and logs nothing
/// (the AUDIT-04 move did not make `on_owner_change` run before a refusal that is checked later).
#[test]
fn r2_refused_transfers_keep_allowances_and_log_nothing() {
    let mut c = setup();
    set(&mut c, bot(), vec![evm_cap(KB31_DEBIT)], None, T0);
    ctx(alice(), 1, T0 + 1);
    expect_err("Current and next owner must differ", || c.nft_transfer(alice(), "1".into(), None, None));
    assert!(get_logs().is_empty());
    ctx(alice(), 2, T0 + 2);
    expect_err("Requires attached deposit of exactly 1 yoctoNEAR", || c.nft_transfer(bob(), "1".into(), None, None));
    assert!(get_logs().is_empty());
    ctx(alice(), 10 * MILLI, T0 + 3);
    c.list("1".into(), U128(10), Currency::Near);
    ctx(alice(), 1, T0 + 4);
    expect_err(ERR_LISTED, || c.nft_transfer(bob(), "1".into(), None, None));
    assert!(get_logs().is_empty());
    assert_eq!(c.allowances_of("1".into()).len(), 1);
    assert_eq!(c.tokens.owner_by_id.get(&"1".to_string()).unwrap(), alice());
}
