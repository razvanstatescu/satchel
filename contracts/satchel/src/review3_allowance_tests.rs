//! Review round three, C5 delegated-spending auditor (R3-A-*). Demonstrating tests: each one PASSES when the behaviour
//! it describes is present in the contract (they pin a finding or a property, they do not change any contract code).
//! The mocked chain does NOT roll back state on panic, so every refusal here also proves "panics before its first write".

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, Value};
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, AccountId, Gas, NearToken, RuntimeFeesConfig};

use crate::allowance::*;
use crate::errors::*;
use crate::parse::{btc, evm};
use crate::*;

const MILLI: u128 = 1_000_000_000_000_000_000_000;
const NEAR: u128 = 1_000 * MILLI;
const T0: u64 = 1_793_000_000_000; // ms
const W: u64 = ALLOWANCE_WINDOW_MS;
const SEPOLIA: u64 = 11_155_111;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn alice() -> AccountId {
    acc("alice.testnet")
}
fn carol() -> AccountId {
    acc("carol.testnet")
}
fn bot() -> AccountId {
    acc("bot.testnet")
}

/// predecessor, deposit (yocto), block timestamp (ms), block height.
fn ctx_h(who: AccountId, deposit: u128, now_ms: u64, height: u64) {
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
/// height = 1000 + (ms − T0) / 1000, like allowance_tests.
fn ctx(who: AccountId, deposit: u128, now_ms: u64) {
    ctx_h(who, deposit, now_ms, 1_000 + now_ms.saturating_sub(T0) / 1_000)
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

fn setup() -> Contract {
    ctx(acc("team.testnet"), 0, T0);
    let mut c = Contract::new(acc("mpc.testnet"), Some(acc("usdc.testnet")), "https://satchel.example/api/card/".into());
    ctx(acc("team.testnet"), 20 * MILLI, T0);
    c.nft_mint(alice());
    c
}
fn cap(asset: Asset, limit: u128) -> CapInput {
    CapInput { asset, limit: U128(limit) }
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
fn sign_at(c: &mut Contract, who: AccountId, req: SignRequest, now: u64, height: u64) {
    let n = parse::request_count(&req) as u128;
    ctx_h(who, 5 * MILLI * n, now, height);
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
fn btc_req(tx: &btc::tests::Tx) -> SignRequest {
    SignRequest::Btc { preimages: btc::tests::preimages(tx).iter().map(hex::encode).collect(), outputs: hex::encode(&tx.outputs) }
}
/// The txid (internal byte order, as it appears in a spending input's outpoint) of an unsigned one-or-more-input
/// segwit tx: sha256d of the legacy (non-witness) serialization, which the witness does not change.
fn txid_le(tx: &btc::tests::Tx) -> [u8; 32] {
    let n_out = btc::parse_outputs(&tx.outputs).unwrap();
    let mut s = tx.version.to_le_bytes().to_vec();
    s.push(tx.inputs.len() as u8);
    for i in &tx.inputs {
        s.extend_from_slice(&i.txid_le);
        s.extend_from_slice(&i.vout.to_le_bytes());
        s.push(0x00); // empty scriptSig (native P2WPKH)
        s.extend_from_slice(&i.sequence.to_le_bytes());
    }
    s.push(n_out as u8);
    s.extend_from_slice(&tx.outputs);
    s.extend_from_slice(&tx.locktime.to_le_bytes());
    btc::sha256d(&s)
}

// ── R3-A-1: banked signatures. The cap bounds what a delegate may SIGN per 24 h, not what it can SPEND in 24 h, and
//    revoke / expiry / transfer stop only new signatures. ────────────────────────────────────────────────────────

/// EVM: a delegate with a 0.01 ETH/24 h cap signs a full-cap send at consecutive nonces 0, 1, 2 on three days and
/// broadcasts none. Every request is accepted (each window holds exactly one cap). The owner then revokes. Nothing in
/// the contract invalidates the three signatures: as soon as the nonces are free (the owner hasn't sent on Sepolia,
/// or a new Satchel), the delegate can broadcast all three in one block = 3 × cap, after the revoke.
#[test]
fn r3a1_banked_evm_signatures_exceed_the_cap_and_survive_revoke() {
    let cap_wei: u128 = 10u128.pow(16);
    let fee: u128 = 1_000_000_000; // 1 gwei
    let value = cap_wei - 21_000 * fee; // debit = value + gas × max_fee = exactly the cap
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Evm { chain_id: SEPOLIA }, cap_wei)], None, T0);
    for day in 0..3u64 {
        let now = T0 + 1 + day * W; // one full window apart: each request finds the whole cap available
        sign_at(&mut c, bot(), evm_tx(day, value, 21_000, fee), now, 1_000 + day * 200_000);
        assert_eq!(events("allowance_spent")[0]["data"]["debits"][0]["amount"], cap_wei.to_string());
    }
    ctx(alice(), 1, T0 + 3 * W);
    c.revoke_allowance("1".into(), bot());
    expect_err(ERR_NOT_OWNER, || sign_at(&mut c, bot(), evm_tx(3, 1, 21_000, 1), T0 + 3 * W + 1, 700_000));
    // the three signed txs: consecutive nonces 0,1,2 → valid together on a fresh account, total = 3 × cap
    let recs = c.sig_records("1".into(), 0, 50);
    let mut total = 0u128;
    for (i, r) in recs.iter().enumerate() {
        assert_eq!(r.requester, bot());
        let rec = c.sig_log.get(&("1".to_string(), i as u64)).expect("record");
        let SigDetail::Evm { nonce, unsigned_tx, .. } = &rec.detail else { panic!("evm") };
        assert_eq!(*nonce, i as u64);
        let d = evm_debits(unsigned_tx).unwrap();
        total += d[0].1;
    }
    assert_eq!(recs.len(), 3);
    assert_eq!(total, 3 * cap_wei, "live, delegate-held signatures worth 3 × the 24 h cap after the revoke");
    eprintln!("R3-A-1 EVM: cap {cap_wei} wei/24h; delegate holds {} signed sends at nonces 0..2 worth {total} wei after revoke", recs.len());
}

/// BTC: the same with ONE UTXO. tx1 spends U and sends `cap − fee` out plus change to the Satchel's own P2WPKH; a day
/// later tx2 spends tx1's (unbroadcast, unconfirmed) change outpoint, whose txid is fixed by the unsigned bytes; tx3
/// likewise. Each debit equals the cap and is accepted; the three form a valid parent→child chain the delegate can
/// broadcast together (or after a revoke): 3 × cap leaves the Satchel at once.
#[test]
fn r3a1_banked_btc_chain_on_own_change_exceeds_the_cap() {
    const CAP: u128 = 11_000;
    let pkh = [0xf6u8; 20];
    let own: Vec<u8> = [&[0x00, 0x14][..], &pkh[..]].concat();
    let ext: Vec<u8> = [&[0x51, 0x20][..], &[0x43; 32][..]].concat(); // the delegate's tb1p
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, CAP)], None, T0);
    let mut prev = btc::tests::TxIn { txid_le: [0xa0; 32], vout: 0, amount: 100_000, sequence: 0xffff_fffd };
    let mut moved = 0u128;
    for day in 0..3u64 {
        let change = prev.amount - 10_000 - 1_000; // 10_000 out, 1_000 fee
        let mut outputs = btc::tests::output(10_000, &ext);
        outputs.extend(btc::tests::output(change, &own));
        let tx = btc::tests::Tx { version: 2, inputs: vec![prev.clone()], outputs, locktime: 0, pkh, sighash: 1 };
        assert_eq!(btc_debit(&btc::tests::preimages(&tx), &tx.outputs).unwrap(), CAP);
        sign_at(&mut c, bot(), btc_req(&tx), T0 + 1 + day * W, 1_000 + day * 200_000);
        moved += 11_000;
        // the next tx spends this one's change output (vout 1) before anything is broadcast
        prev = btc::tests::TxIn { txid_le: txid_le(&tx), vout: 1, amount: change, sequence: 0xffff_fffd };
    }
    assert_eq!(c.satchel("1".into()).unwrap().sig_count, 3);
    assert_eq!(moved, 3 * CAP);
    eprintln!("R3-A-1 BTC: cap {CAP} sats/24h; one UTXO; a 3-tx chain worth {moved} sats (out + fees) is signed and broadcastable at once");
}

// ── R3-A-2: zero-cap griefing of the sale paths ─────────────────────────────────────────────────────────────────

/// A delegate whose only cap is 1 wei of Sepolia ETH signs `gas_limit = 0, max_fee = 0, value = 0` (debit 0: no budget
/// used, never executable). Each such request bumps `sig_count` (every open offer goes stale) and restarts the
/// 250-block quiet period (`list` and `accept_offer` refuse). It can do this 32 times per 24 h, front-running each
/// accept attempt; only `revoke_allowance` stops it.
#[test]
fn r3a2_zero_debit_requests_stale_offers_and_restart_the_quiet_period() {
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Evm { chain_id: SEPOLIA }, 1)], None, T0);
    // carol offers 1 NEAR on the untouched token
    ctx_h(carol(), NEAR + 10 * MILLI, T0 + 10, 1_000);
    let oid = c.make_offer("1".into(), U128(NEAR), 0, 0, T0 + W);
    // the delegate front-runs alice's accept with a 0-debit request
    sign_at(&mut c, bot(), evm_tx(0, 0, 0, 0), T0 + 20, 1_001);
    assert_eq!(events("allowance_spent")[0]["data"]["debits"][0]["amount"], "0");
    ctx_h(alice(), 1, T0 + 30, 1_002);
    expect_err(ERR_OFFER_STALE, || c.accept_offer(oid));
    // carol re-offers on the new state; it is still unacceptable for 250 blocks, and listing is blocked too
    ctx_h(carol(), NEAR + 10 * MILLI, T0 + 40, 1_003);
    let oid2 = c.make_offer("1".into(), U128(NEAR), 1, 0, T0 + W);
    ctx_h(alice(), 1, T0 + 50, 1_250);
    expect_err(ERR_QUIET_PERIOD, || c.accept_offer(oid2));
    ctx_h(alice(), 10 * MILLI, T0 + 60, 1_250);
    expect_err(ERR_QUIET_PERIOD, || c.list("1".into(), U128(1), Currency::Near));
    // 31 more zero-debit requests fit in the same 24 h, each one 249 blocks after the last (nonce 0 re-signed: ≤ max+1)
    for i in 1..32u64 {
        sign_at(&mut c, bot(), evm_tx(0, 0, 0, 0), T0 + 100 + i, 1_001 + i * 249);
    }
    let v = c.allowance("1".into(), bot()).unwrap();
    assert_eq!((v.spends_in_window, v.caps[0].spent.0, v.caps[0].remaining.0), (32, 0, 1), "32 requests, 0 wei of budget");
    let last_h = 1_001 + 31 * 249;
    ctx_h(alice(), 10 * MILLI, T0 + 200, last_h + 249);
    expect_err(ERR_QUIET_PERIOD, || c.list("1".into(), U128(1), Currency::Near));
    expect_err(ERR_ALLOWANCE_RATE, || sign_at(&mut c, bot(), evm_tx(0, 0, 0, 0), T0 + 300, last_h + 250));
    // the owner's remedy: revoke (1 yocto), then wait out one quiet period
    ctx_h(alice(), 1, T0 + 400, last_h + 250);
    c.revoke_allowance("1".into(), bot());
    expect_err(ERR_NOT_OWNER, || sign_at(&mut c, bot(), evm_tx(0, 0, 0, 0), T0 + 500, last_h + 250));
    eprintln!(
        "R3-A-2: 32 zero-debit delegate requests kept the token unlistable/unacceptable from block 1001 to {} (≈ {} blocks) with 0 wei spent",
        last_h + 250,
        last_h + 250 - 1_001
    );
}

// ── R3-A-3: silent drop of expired allowances ───────────────────────────────────────────────────────────────────

/// `set_allowance` for a new delegate drops every other expired allowance (spec §2 step 7) without any
/// `allowance_revoked` / `allowances_cleared` event: an indexer that follows only events keeps showing the dropped one.
#[test]
fn r3a3_set_allowance_drops_expired_allowances_without_an_event() {
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 1)], Some(T0 + 10), T0);
    set(&mut c, carol(), vec![cap(Asset::Btc, 1)], None, T0 + 20);
    let names: Vec<AccountId> = c.allowances_of("1".into()).into_iter().map(|v| v.delegate).collect();
    assert_eq!(names, vec![carol()], "bot's expired allowance is gone");
    assert_eq!(events("allowance_set").len(), 1);
    assert!(events("allowance_revoked").is_empty() && events("allowances_cleared").is_empty(), "no event says bot was removed");
    // and the owner can no longer revoke it explicitly
    ctx(alice(), 1, T0 + 30);
    expect_err(ERR_ALLOWANCE_NOT_FOUND, || c.revoke_allowance("1".into(), bot()));
}

// ── things checked and found sound (pinned) ─────────────────────────────────────────────────────────────────────

/// The debit parser and the classifier read the same BTC outputs, including a canonical 0xfd-length script, and the
/// debit equals Σ external outputs + fee. A non-canonical 0xfd length (which `btc_outputs` alone would accept) never
/// reaches the debit: the classifier refuses it first.
#[test]
fn r3_sound_btc_varint_agreement() {
    let mut tx = btc::tests::sample_tx(1); // in 50_000
    let own: Vec<u8> = [&[0x00, 0x14][..], &tx.pkh[..]].concat();
    let mut o = 5u64.to_le_bytes().to_vec();
    o.extend([0xfd, 0xfd, 0x00]);
    o.extend([0x6a; 253]);
    o.extend(btc::tests::output(49_000, &own));
    tx.outputs = o;
    assert!(btc::classify(&btc::tests::preimages(&tx), &tx.outputs).is_ok());
    assert_eq!(btc_debit(&btc::tests::preimages(&tx), &tx.outputs).unwrap(), 5 + 995);
    let mut bad = 5u64.to_le_bytes().to_vec();
    bad.extend([0xfd, 0x10, 0x00]);
    bad.extend([0x6a; 16]);
    tx.outputs = bad;
    assert_eq!(btc::classify(&btc::tests::preimages(&tx), &tx.outputs), Err(ERR_BTC_OUTPUTS_MALFORMED));
    let mut c = setup();
    set(&mut c, bot(), vec![cap(Asset::Btc, 10u128.pow(9))], None, T0);
    expect_err(ERR_BTC_OUTPUTS_MALFORMED, || sign_at(&mut c, bot(), btc_req(&tx), T0 + 1, 1_001));
}

/// Window boundary: a debit stamped at t stops counting at exactly t + 24 h, and replacing the allowance with the
/// same ERC-20 cap written in another case/prefix keeps the spends (no reset by re-keying).
#[test]
fn r3_sound_window_boundary_and_rekeying() {
    let tok = "1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    let mut c = setup();
    let caps = |t: &str| vec![cap(Asset::Evm { chain_id: SEPOLIA }, 10u128.pow(18)), cap(Asset::Erc20 { chain_id: SEPOLIA, token: t.into() }, 100)];
    set(&mut c, bot(), caps(tok), None, T0);
    let mut f = evm::tests::base();
    f.to = evm::tests::enc_str(&hex::decode(tok).unwrap());
    f.value = evm::tests::int(0);
    let mut data = vec![0xa9, 0x05, 0x9c, 0xbb];
    data.extend([0u8; 12]);
    data.extend([0x22; 20]);
    data.extend([0u8; 31]);
    data.push(100);
    f.data = evm::tests::enc_str(&data);
    sign_at(&mut c, bot(), SignRequest::Evm { unsigned_tx: hex::encode(evm::tests::build(&f)) }, T0 + 5, 1_001);
    // re-set with "0X" + upper case: same asset after normalization → the spend is kept
    set(&mut c, bot(), caps(&["0X", &tok.to_uppercase()].concat()), None, T0 + 6);
    let erc = Asset::Erc20 { chain_id: SEPOLIA, token: tok.into() };
    let rem = |c: &Contract, now: u64| {
        ctx(alice(), 0, now);
        c.allowance("1".into(), bot()).unwrap().caps.iter().find(|x| x.asset == erc).unwrap().remaining.0
    };
    assert_eq!(rem(&c, T0 + 7), 0);
    assert_eq!(rem(&c, T0 + 5 + W - 1), 0, "still counts 1 ms before t + 24 h");
    assert_eq!(rem(&c, T0 + 5 + W), 100, "released at exactly t + 24 h");
}
