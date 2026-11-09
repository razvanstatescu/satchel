//! The transfer path end to end (docs/selling.md): every way a Satchel changes hands (gift `nft_transfer`, NEAR `buy`,
//! USDC `ft_transfer_call` buy, `accept_offer`) takes every power from the old owner, and sales whose payouts are
//! still in flight never cross: a resale while the first seller's payout and `on_payout` receipts have not landed, a
//! resale while that payout is failing and being re-credited, `withdraw_proceeds` in the block of a resale, inside
//! assets moving with a sale whose payout is pending, and an offer accepted or a gift made in the buy's own receipt.
//!
//! The in-flight tests prove the overlap from block heights read from `EXPERIMENTAL_tx_status`: the second sale's
//! receipt executes in a block before the first payout's `on_payout` callback.

mod common;

use anyhow::{Result, anyhow, ensure};
use common::payloads::*;
use common::*;
use near_workspaces::operations::{Function, TransactionStatus};
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId, CryptoHash};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::time::{Duration, Instant};

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const USDC: u128 = 1_000_000; // 6 decimals
const SET_DEPOSIT: NearToken = NearToken::from_millinear(10);
const KB_DEBIT: u128 = 100_000_000_000_000 + 21_000 * 200_028; // KB_EVM_TX: value + gas × max_fee
const FINAL: Duration = Duration::from_secs(90);

// ── call helpers ─────────────────────────────────────────────────────────────────────────

fn near(y: u128) -> NearToken {
    NearToken::from_yoctonear(y)
}

fn used(r: &ExecutionFinalResult) -> u128 {
    num(&r.clone().json::<Value>().expect("ft_transfer_call returns the used amount"))
}

fn deposit_msg(id: &str) -> String {
    json!({ "deposit": id }).to_string()
}

fn evm_cap(limit: u128) -> Value {
    json!({ "asset": { "evm": { "chain_id": SEPOLIA } }, "limit": limit.to_string() })
}

async fn deposit_near(env: &Env, who: &Account, id: &str, amount: u128) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "deposit_near")
        .args_json(json!({ "token_id": id }))
        .deposit(near(amount))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

fn withdraw_near_call(env: &Env, who: &Account, id: &str, amount: u128) -> near_workspaces::operations::CallTransaction {
    who.call(env.satchel.id(), "withdraw_near")
        .args_json(json!({ "token_id": id, "amount": amount.to_string() }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
}

fn withdraw_usdc_call(env: &Env, who: &Account, id: &str, amount: u128) -> near_workspaces::operations::CallTransaction {
    who.call(env.satchel.id(), "withdraw_ft")
        .args_json(json!({ "token_id": id, "ft": env.usdc.id(), "amount": amount.to_string() }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
}

async fn prepay(env: &Env, who: &Account, amount: u128) -> Result<()> {
    let r = who
        .call(env.satchel.id(), "prepay_storage")
        .args_json(json!({}))
        .deposit(near(amount))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    Ok(())
}

async fn set_allowance(env: &Env, who: &Account, id: &str, delegate: &AccountId) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": id, "delegate": delegate, "caps": [evm_cap(10 * KB_DEBIT)], "expires_at_ms": null }))
        .deposit(SET_DEPOSIT)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn revoke_allowance(env: &Env, who: &Account, id: &str, delegate: &AccountId) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "revoke_allowance")
        .args_json(json!({ "token_id": id, "delegate": delegate }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn inside(env: &Env, id: &str) -> Result<Value> {
    view(env, "inside_of", json!({ "token_id": id })).await
}

async fn now_ms(env: &Env) -> Result<u64> {
    Ok(env.worker.view_block().await?.timestamp() / 1_000_000)
}

/// A NEAR offer on the token's current `sig_count` and `inside_epoch`, valid for an hour. Returns the offer id.
async fn make_offer_ok(env: &Env, who: &Account, id: &str, amount: u128) -> Result<u64> {
    let sc = sig_count(env, id).await?;
    let epoch = inside(env, id).await?["inside_epoch"].as_u64().unwrap();
    let exp = now_ms(env).await? + 3_600_000;
    let r = who
        .call(env.satchel.id(), "make_offer")
        .args_json(json!({ "token_id": id, "amount": amount.to_string(), "expected_sig_count": sc,
                           "expected_inside_epoch": epoch, "expires_at_ms": exp }))
        .deposit(near(amount + 10 * MILLI))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    ensure!(r.is_success(), "make_offer failed: {}", fail_text(&r));
    Ok(r.json::<u64>()?)
}

async fn accept_offer(env: &Env, who: &Account, oid: u64) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "accept_offer")
        .args_json(json!({ "offer_id": oid }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?)
}

fn withdraw_proceeds_call(env: &Env, who: &Account, currency: &str) -> near_workspaces::operations::CallTransaction {
    who.call(env.satchel.id(), "withdraw_proceeds")
        .args_json(json!({ "currency": currency }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
}

fn buy_call(env: &Env, who: &Account, id: &str, lid: u64, sc: u64, price: u128) -> near_workspaces::operations::CallTransaction {
    who.call(env.satchel.id(), "buy")
        .args_json(json!({ "token_id": id, "listing_id": lid, "expected_sig_count": sc }))
        .deposit(near(price))
        .gas(Gas::from_tgas(50))
}

fn buy_fn(id: &str, lid: u64, sc: u64, price: u128) -> Function {
    Function::new("buy")
        .args_json(json!({ "token_id": id, "listing_id": lid, "expected_sig_count": sc }))
        .deposit(near(price))
        .gas(Gas::from_tgas(50))
}

fn list_fn(id: &str, price: u128, currency: &str) -> Function {
    Function::new("list")
        .args_json(json!({ "token_id": id, "price": price.to_string(), "currency": currency }))
        .deposit(LIST_DEPOSIT)
        .gas(Gas::from_tgas(30))
}

fn ft_buy_call(env: &Env, who: &Account, amount: u128, msg: &str) -> near_workspaces::operations::CallTransaction {
    who.call(env.usdc.id(), "ft_transfer_call")
        .args_json(json!({ "receiver_id": env.satchel.id(), "amount": amount.to_string(), "msg": msg }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(150))
}

async fn proceeds(env: &Env, who: &AccountId) -> Result<Value> {
    view(env, "proceeds_of", json!({ "account_id": who })).await
}

async fn assert_no_proceeds(env: &Env, accounts: &[&AccountId]) -> Result<()> {
    for a in accounts {
        assert_eq!(proceeds(env, a).await?, json!([]), "no proceeds owed to {a}");
    }
    Ok(())
}

// ── the solvency invariants (the same checks as market.rs `check_solvency`) ──────────────

/// I-M1 + I-M2 + I-M3 over the given tokens and accounts (every account that ever held a credit, an offer or proceeds).
async fn check_solvency(env: &Env, tokens: &[&str], accounts: &[&AccountId]) -> Result<()> {
    let mut inside_near = 0u128;
    let mut inside_usdc = 0u128;
    for t in tokens {
        let v = inside(env, t).await?;
        inside_near += num(&v["near"]);
        for f in v["fts"].as_array().unwrap() {
            if f["token"] == env.usdc.id().as_str() {
                inside_usdc += num(&f["amount"]);
            }
        }
    }
    let (mut credits, mut proceeds_near, mut proceeds_usdc, mut offers_usdc, mut offers_near) = (0u128, 0u128, 0u128, 0u128, 0u128);
    for a in accounts {
        credits += num(&view(env, "storage_credit_of", json!({ "account_id": a })).await?);
        for p in proceeds(env, a).await?.as_array().unwrap() {
            match p["currency"].as_str().unwrap() {
                "near" => proceeds_near += num(&p["amount"]),
                _ => proceeds_usdc += num(&p["amount"]),
            }
        }
        for o in view(env, "offers_by", json!({ "account_id": a, "from_index": 0, "limit": 50 })).await?.as_array().unwrap() {
            match o["currency"].as_str().unwrap() {
                "near" => offers_near += num(&o["amount"]),
                _ => offers_usdc += num(&o["amount"]),
            }
        }
    }
    let t = view(env, "market_totals", json!({})).await?;
    assert_eq!(num(&t["inside_near"]), inside_near, "I-M2: totals.inside_near");
    assert_eq!(num(&t["offers_near"]), offers_near, "I-M2: totals.offers_near");
    assert_eq!(num(&t["storage_credit"]), credits, "I-M2: totals.storage_credit");
    assert_eq!(num(&t["proceeds_near"]), proceeds_near, "I-M2: totals.proceeds_near (M-01)");
    let owed = inside_near + offers_near + credits + proceeds_near;
    assert_eq!(num(&t["escrow_near"]), owed, "I-M2: totals.escrow_near (M-01)");
    let a = env.worker.view_account(env.satchel.id()).await?;
    let free = a.balance.as_yoctonear() - a.storage_usage as u128 * STORAGE_BYTE_COST;
    assert!(owed <= free, "I-M1: owed {owed} > free balance {free}");
    let fb = ft_balance(env, env.satchel.id()).await?;
    let owed_usdc = inside_usdc + offers_usdc + proceeds_usdc;
    assert!(owed_usdc <= fb, "I-M3: owed {owed_usdc} USDC > contract FT balance {fb}");
    Ok(())
}

// ── receipts and block heights ───────────────────────────────────────────────────────────

async fn rpc_call(env: &Env, method: &str, params: Value) -> Result<Value> {
    let body = json!({ "jsonrpc": "2.0", "id": "transfer-path", "method": method, "params": params });
    let v: Value = reqwest::Client::new().post(env.worker.rpc_addr()).json(&body).send().await?.json().await?;
    if let Some(e) = v.get("error") {
        return Err(anyhow!("{method}: {e}"));
    }
    Ok(v["result"].clone())
}

/// Returns as soon as the transaction is in a block (its first receipt runs in the next one).
async fn wait_included(env: &Env, st: &TransactionStatus, sender: &AccountId) -> Result<()> {
    let t0 = Instant::now();
    loop {
        let r = rpc_call(
            env,
            "tx",
            json!({ "tx_hash": st.hash().to_string(), "sender_account_id": sender, "wait_until": "INCLUDED" }),
        )
        .await;
        match r {
            Ok(_) => return Ok(()),
            Err(e) => ensure!(t0.elapsed() < Duration::from_secs(30), "tx {} never included: {e}", st.hash()),
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
}

#[derive(Debug, Clone)]
struct Rcpt {
    height: u64,
    executor: String,
    logs: Vec<String>,
    failed: bool,
}

impl Rcpt {
    fn events(&self, name: &str) -> Vec<Value> {
        events_in(self.logs.iter().cloned(), "satchel", name)
    }
}

/// Every receipt of the transaction once all of them (detached payouts and callbacks too) have executed, with the
/// height of the block each one ran in.
async fn receipts(env: &Env, hash: &CryptoHash, sender: &AccountId) -> Result<Vec<Rcpt>> {
    let v = rpc::tx_receipts(&env.worker, hash, sender).await?;
    let mut heights: HashMap<String, u64> = HashMap::new();
    let mut out = vec![];
    for o in v["receipts_outcome"].as_array().cloned().unwrap_or_default() {
        let bh = o["block_hash"].as_str().unwrap_or_default().to_string();
        let height = match heights.get(&bh) {
            Some(h) => *h,
            None => {
                let b = rpc_call(env, "block", json!({ "block_id": bh })).await?;
                let h = b["header"]["height"].as_u64().ok_or_else(|| anyhow!("no height in {b}"))?;
                heights.insert(bh, h);
                h
            }
        };
        out.push(Rcpt {
            height,
            executor: o["outcome"]["executor_id"].as_str().unwrap_or_default().to_string(),
            logs: o["outcome"]["logs"]
                .as_array()
                .map(|a| a.iter().filter_map(|l| l.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            failed: o["outcome"]["status"].get("Failure").is_some(),
        });
    }
    Ok(out)
}

/// The one receipt on `executor` that logged a `name` event matching `pred`.
fn the<'a>(rs: &'a [Rcpt], executor: &AccountId, name: &str, pred: impl Fn(&Value) -> bool) -> &'a Rcpt {
    let hits: Vec<&Rcpt> =
        rs.iter().filter(|r| r.executor == executor.as_str() && r.events(name).iter().any(&pred)).collect();
    assert_eq!(hits.len(), 1, "expected one {name} receipt on {executor}, got {hits:?}");
    hits[0]
}

/// The height of the single receipt `executor` ran (e.g. a payout Transfer to a plain account).
fn only_on(rs: &[Rcpt], executor: &AccountId) -> u64 {
    let hits: Vec<&Rcpt> = rs.iter().filter(|r| r.executor == executor.as_str()).collect();
    assert_eq!(hits.len(), 1, "expected one receipt on {executor}, got {hits:?}");
    hits[0].height
}

fn payout_to(who: &AccountId) -> impl Fn(&Value) -> bool + '_ {
    move |e: &Value| e["account_id"] == who.as_str()
}

fn sold(lid: u64) -> impl Fn(&Value) -> bool {
    move |e: &Value| num(&e["listing_id"]) == lid as u128
}

/// Every satchel event of `name` across the given receipts.
fn all_events(rs: &[&[Rcpt]], name: &str) -> Vec<Value> {
    rs.iter().flat_map(|r| r.iter()).flat_map(|r| r.events(name)).collect()
}

/// Plain Transfers satchel → `to` in a transaction (refunds from `system` excluded).
async fn paid(env: &Env, hash: &CryptoHash, sender: &AccountId, to: &AccountId) -> Result<Vec<u128>> {
    let v = rpc::tx_receipts(&env.worker, hash, sender).await?;
    Ok(rpc::transfers(&v, env.satchel.id(), to))
}

/// Everything the old owner must no longer see or change.
async fn snapshot(env: &Env, id: &str) -> Result<Value> {
    Ok(json!({
        "satchel": satchel_view(env, id).await?,
        "inside": inside(env, id).await?,
        "allowances": view(env, "allowances_of", json!({ "token_id": id })).await?,
        "offers": view(env, "offers_for", json!({ "token_id": id, "from_index": 0, "limit": 50 })).await?,
        "records": sig_records(env, id).await?.len(),
        "mpc_requests": mpc_count(env).await?,
        "listings": view(env, "listings", json!({ "from_index": 0, "limit": 50 })).await?,
    }))
}

// ── 1. the old owner loses every power, on every ownership path ─────────────────────────

/// Table-driven over the four ownership paths (gift, NEAR buy, USDC buy, accepted offer), one token each, alice → bob.
/// Before the change alice holds NEAR and USDC inside, has a delegate (carol) and an open offer from carol. After it:
/// alice's `sign_for`, `list`, `delist`, `nft_transfer`, `set_allowance`, `revoke_allowance`, `withdraw_near`,
/// `withdraw_ft` and `accept_offer` on that token all fail with the expected code and change nothing; carol's allowance
/// is gone and her `sign_for` fails; bob can do every one of them.
#[tokio::test]
async fn old_owner_loses_every_power_on_every_ownership_path() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 4, ..Default::default() }).await?;
    prepay(&env, &env.carol, 50 * MILLI).await?;
    let paths = ["gift", "near_buy", "usdc_buy", "accept_offer"];
    let req = evm_req(&EvmTx::transfer(0).encode());
    for (i, path) in paths.iter().enumerate() {
        let id = (i + 1).to_string();
        let id = id.as_str();
        // what alice has on the token before the change
        assert_ok(&deposit_near(&env, &env.carol, id, ONE_NEAR).await?);
        assert_eq!(used(&ft_buy(&env, &env.carol, 2 * USDC, &deposit_msg(id)).await?), 2 * USDC, "{path}: usdc inside");
        assert_ok(&set_allowance(&env, &env.alice, id, env.carol.id()).await?);
        let carols_offer = make_offer_ok(&env, &env.carol, id, ONE_NEAR).await?;

        // the change of owner
        match *path {
            "gift" => assert_ok(&transfer(&env, &env.alice, id, env.bob.id()).await?),
            "near_buy" => {
                let lid = list_ok(&env, &env.alice, id, 2 * ONE_NEAR, "near").await?;
                assert_ok(&buy(&env, &env.bob, id, lid, 0, near(2 * ONE_NEAR)).await?);
            }
            "usdc_buy" => {
                let lid = list_ok(&env, &env.alice, id, 5 * USDC, "usdc").await?;
                assert_eq!(used(&ft_buy(&env, &env.bob, 5 * USDC, &buy_msg(id, lid, 0)).await?), 5 * USDC);
            }
            "accept_offer" => {
                let oid = make_offer_ok(&env, &env.bob, id, 2 * ONE_NEAR).await?;
                assert_ok(&accept_offer(&env, &env.alice, oid).await?);
            }
            _ => unreachable!(),
        }
        assert_eq!(owner_of(&env, id).await?, env.bob.id().to_string(), "{path}");

        // the delegate alice added is gone with her
        assert!(view(&env, "allowance", json!({ "token_id": id, "delegate": env.carol.id() })).await?.is_null(), "{path}");
        assert_eq!(view(&env, "allowances_of", json!({ "token_id": id })).await?, json!([]), "{path}");
        let r = sign_sync_fail(&env, &env.carol, id, &req, SignOpts::default_for(1)).await?;
        assert_fails_with(&r, "ERR_NOT_OWNER");

        // the old owner, every way
        let before = snapshot(&env, id).await?;
        let alice_usdc = ft_balance(&env, env.alice.id()).await?;
        let refusals: Vec<(&str, ExecutionFinalResult, &str)> = vec![
            ("sign_for", sign_sync_fail(&env, &env.alice, id, &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER"),
            ("list", list(&env, &env.alice, id, ONE_NEAR, "near").await?, "ERR_NOT_OWNER"),
            ("delist (not listed)", delist(&env, &env.alice, id).await?, "ERR_NOT_LISTED"),
            ("nft_transfer", transfer(&env, &env.alice, id, env.carol.id()).await?, "ERR_NOT_OWNER"),
            ("set_allowance", set_allowance(&env, &env.alice, id, env.carol.id()).await?, "ERR_NOT_OWNER"),
            ("revoke_allowance", revoke_allowance(&env, &env.alice, id, env.carol.id()).await?, "ERR_NOT_OWNER"),
            ("withdraw_near", withdraw_near_call(&env, &env.alice, id, 1).transact().await?, "ERR_NOT_OWNER"),
            ("withdraw_ft", withdraw_usdc_call(&env, &env.alice, id, 1).transact().await?, "ERR_NOT_OWNER"),
            ("accept_offer", accept_offer(&env, &env.alice, carols_offer).await?, "ERR_NOT_OWNER"),
        ];
        for (what, r, code) in &refusals {
            assert!(r.is_failure(), "{path}: alice's {what} must fail, got success: {:?}", r.logs());
            let t = fail_text(r);
            assert!(t.contains(code), "{path}: alice's {what}: expected {code}, got {t}");
        }
        assert_eq!(snapshot(&env, id).await?, before, "{path}: the refusals changed nothing");
        assert_eq!(ft_balance(&env, env.alice.id()).await?, alice_usdc, "{path}: no USDC to alice");
        // a live listing by the new owner: the old owner cannot take it down
        let lid = list_ok(&env, &env.bob, id, ONE_NEAR, "near").await?;
        assert_fails_with(&delist(&env, &env.alice, id).await?, "ERR_NOT_OWNER");
        assert_fails_with(&list(&env, &env.alice, id, 1, "near").await?, "ERR_NOT_OWNER");
        assert_eq!(num(&satchel_view(&env, id).await?["listing"]["id"]), lid as u128, "{path}: bob's listing stands");

        // the new owner, every way
        assert_ok(&delist(&env, &env.bob, id).await?);
        assert_ok(&set_allowance(&env, &env.bob, id, env.carol.id()).await?);
        assert_ok(&revoke_allowance(&env, &env.bob, id, env.carol.id()).await?);
        let r = withdraw_near_call(&env, &env.bob, id, ONE_NEAR / 2).transact().await?;
        assert_ok(&r);
        assert_eq!(paid(&env, &r.outcome().transaction_hash, env.bob.id(), env.bob.id()).await?, vec![ONE_NEAR / 2]);
        let b0 = ft_balance(&env, env.bob.id()).await?;
        assert_ok(&withdraw_usdc_call(&env, &env.bob, id, USDC).transact().await?);
        assert_eq!(ft_balance(&env, env.bob.id()).await?, b0 + USDC, "{path}: bob withdrew USDC");
        assert_ok(&sign_and_wait(&env, &env.bob, id, &req).await?);
        assert_eq!(sig_records(&env, id).await?[0]["requester"], env.bob.id().to_string());
        assert_ok(&transfer(&env, &env.bob, id, env.carol.id()).await?);
        assert_ok(&transfer(&env, &env.carol, id, env.bob.id()).await?); // handed back for the accept below
        assert!(view(&env, "offer", json!({ "offer_id": carols_offer })).await?.is_object(), "{path}: alice's refusal kept it");
    }
    // the new owner accepts a fresh offer once its signature's quiet period is over
    for i in 1..=paths.len() {
        let id = i.to_string();
        pass_quiet_period(&env, &id).await?;
        let oid = make_offer_ok(&env, &env.carol, &id, ONE_NEAR).await?;
        assert_ok(&accept_offer(&env, &env.bob, oid).await?);
        assert_eq!(owner_of(&env, &id).await?, env.carol.id().to_string());
    }
    check_solvency(&env, &["1", "2", "3", "4"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

// ── 2. a resale while the first payout is in flight ──────────────────────────────────────

/// alice lists; bob buys and relists in one receipt; carol's buy is sent the moment bob's tx is in a block, so it
/// executes before alice's `on_payout` has run. alice gets exactly price1, bob exactly price2, carol owns the token,
/// nobody else is paid or credited, and the solvency invariants hold.
#[tokio::test]
async fn resale_while_first_payout_in_flight_pays_each_seller_once() -> Result<()> {
    let env = setup().await?;
    let (p1, p2) = (3 * ONE_NEAR, 5 * ONE_NEAR);
    let lid1 = list_ok(&env, &env.alice, "1", p1, "near").await?;
    let lid2 = lid1 + 1; // next_listing_id: bob's relist in the same receipt
    let alice0 = settled_balance(&env, env.alice.id()).await?;

    let st_b = env
        .bob
        .batch(env.satchel.id())
        .call(buy_fn("1", lid1, 0, p1))
        .call(list_fn("1", p2, "near"))
        .transact_async()
        .await?;
    wait_included(&env, &st_b, env.bob.id()).await?;
    let st_c = buy_call(&env, &env.carol, "1", lid2, 0, p2).transact_async().await?;
    let (rb, rc) = (wait_final(&st_b, FINAL).await?, wait_final(&st_c, FINAL).await?);
    assert_ok(&rb);
    assert_ok(&rc);

    let b = receipts(&env, st_b.hash(), env.bob.id()).await?;
    let c = receipts(&env, st_c.hash(), env.carol.id()).await?;
    let sale1 = the(&b, env.satchel.id(), "sold", sold(lid1)).height;
    let pay_a = only_on(&b, env.alice.id());
    let on_pay_a = the(&b, env.satchel.id(), "payout", payout_to(env.alice.id())).height;
    let sale2 = the(&c, env.satchel.id(), "sold", sold(lid2)).height;
    let on_pay_b = the(&c, env.satchel.id(), "payout", payout_to(env.bob.id())).height;
    eprintln!("heights: sale1 {sale1}, alice payout {pay_a}, alice on_payout {on_pay_a}, sale2 {sale2}, bob on_payout {on_pay_b}");
    assert!(sale1 < sale2 && sale2 < on_pay_a, "the resale must run while alice's payout is in flight");

    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    assert_eq!(paid(&env, st_b.hash(), env.bob.id(), env.alice.id()).await?, vec![p1], "alice paid once, price1");
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), env.bob.id()).await?, vec![p2], "bob paid once, price2");
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), env.alice.id()).await?, Vec::<u128>::new());
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), env.carol.id()).await?, Vec::<u128>::new());
    let payouts = all_events(&[&b, &c], "payout");
    assert_eq!(
        payouts,
        vec![
            json!({ "account_id": env.alice.id(), "currency": "near", "amount": p1.to_string(), "ok": true }),
            json!({ "account_id": env.bob.id(), "currency": "near", "amount": p2.to_string(), "ok": true }),
        ]
    );
    assert_eq!(settled_balance(&env, env.alice.id()).await? - alice0, p1, "alice's balance grew by exactly price1");
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    assert_eq!(num(&view(&env, "market_totals", json!({})).await?["proceeds_near"]), 0);
    assert!(satchel_view(&env, "1").await?["listing"].is_null());
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// The same race with the resale in USDC: carol's `ft_transfer_call` goes out with bob's buy-and-relist, so her
/// `ft_on_transfer` lands one hop later, between alice's NEAR payout and its `on_payout`.
#[tokio::test]
async fn usdc_resale_while_first_payout_in_flight_pays_each_seller_once() -> Result<()> {
    let env = setup().await?;
    let (p1, p2) = (2 * ONE_NEAR, 7 * USDC);
    let lid1 = list_ok(&env, &env.alice, "1", p1, "near").await?;
    let lid2 = lid1 + 1;
    let (bob_usdc0, carol_usdc0) = (ft_balance(&env, env.bob.id()).await?, ft_balance(&env, env.carol.id()).await?);

    let st_b = env
        .bob
        .batch(env.satchel.id())
        .call(buy_fn("1", lid1, 0, p1))
        .call(list_fn("1", p2, "usdc"))
        .transact_async()
        .await?;
    let st_c = ft_buy_call(&env, &env.carol, p2, &buy_msg("1", lid2, 0)).transact_async().await?;
    let (rb, rc) = (wait_final(&st_b, FINAL).await?, wait_final(&st_c, FINAL).await?);
    assert_ok(&rb);
    assert_ok(&rc);
    assert_eq!(used(&rc), p2, "carol's buy went through");

    let b = receipts(&env, st_b.hash(), env.bob.id()).await?;
    let c = receipts(&env, st_c.hash(), env.carol.id()).await?;
    let sale1 = the(&b, env.satchel.id(), "sold", sold(lid1)).height;
    let on_pay_a = the(&b, env.satchel.id(), "payout", payout_to(env.alice.id())).height;
    let sale2 = the(&c, env.satchel.id(), "sold", sold(lid2)).height;
    eprintln!("heights: sale1 {sale1}, alice on_payout {on_pay_a}, usdc sale2 {sale2}");
    assert!(sale1 < sale2 && sale2 < on_pay_a, "the USDC resale must run while alice's payout is in flight");

    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    assert_eq!(paid(&env, st_b.hash(), env.bob.id(), env.alice.id()).await?, vec![p1]);
    assert_eq!(ft_balance(&env, env.bob.id()).await?, bob_usdc0 + p2, "bob paid exactly price2 in USDC");
    assert_eq!(ft_balance(&env, env.carol.id()).await?, carol_usdc0 - p2);
    assert_eq!(ft_balance(&env, env.alice.id()).await?, 0, "alice was paid in NEAR only");
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0, "the contract keeps no USDC");
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

// ── 3. a resale while the previous seller's payout is failing ────────────────────────────

/// The seller's account is deleted, so the payout of the first sale fails and `on_payout` re-credits it. bob buys and
/// relists in one receipt and carol buys before that re-credit lands: the credit goes to the seller's `proceeds_of`
/// only, bob is paid normally, and the seller (back with a new key) withdraws exactly once.
#[tokio::test]
async fn resale_during_failed_payout_recredits_only_the_first_seller() -> Result<()> {
    let env = setup().await?;
    let seller = sub(&env.root, "seller", 10).await?;
    let id = mint(&env, &seller, seller.id()).await?;
    let (p1, p2) = (3 * ONE_NEAR, 4 * ONE_NEAR);
    let lid1 = list_ok(&env, &seller, &id, p1, "near").await?;
    let lid2 = lid1 + 1;
    seller.clone().delete_account(env.root.id()).await?.into_result()?;

    let st_b = env
        .bob
        .batch(env.satchel.id())
        .call(buy_fn(&id, lid1, 0, p1))
        .call(list_fn(&id, p2, "near"))
        .transact_async()
        .await?;
    wait_included(&env, &st_b, env.bob.id()).await?;
    let st_c = buy_call(&env, &env.carol, &id, lid2, 0, p2).transact_async().await?;
    assert_ok(&wait_final(&st_b, FINAL).await?);
    assert_ok(&wait_final(&st_c, FINAL).await?);

    let b = receipts(&env, st_b.hash(), env.bob.id()).await?;
    let c = receipts(&env, st_c.hash(), env.carol.id()).await?;
    let failed_pay = b.iter().find(|r| r.executor == seller.id().as_str()).expect("the payout receipt to the seller");
    assert!(failed_pay.failed, "the transfer to the deleted seller failed");
    let recredit = the(&b, env.satchel.id(), "payout", payout_to(seller.id()));
    assert_eq!(recredit.events("payout")[0]["ok"], false);
    let sale2 = the(&c, env.satchel.id(), "sold", sold(lid2)).height;
    eprintln!("heights: failed payout {}, re-credit {}, sale2 {sale2}", failed_pay.height, recredit.height);
    assert!(sale2 < recredit.height, "the resale must run before the re-credit lands");

    assert_eq!(owner_of(&env, &id).await?, env.carol.id().to_string());
    assert_eq!(proceeds(&env, seller.id()).await?, json!([{ "currency": "near", "amount": p1.to_string() }]));
    assert_no_proceeds(&env, &[env.bob.id(), env.carol.id()]).await?;
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), env.bob.id()).await?, vec![p2], "bob paid normally");
    assert_eq!(all_events(&[&c], "payout")[0]["ok"], true);
    assert_eq!(num(&view(&env, "market_totals", json!({})).await?["proceeds_near"]), p1);
    check_solvency(&env, &[id.as_str()], &[seller.id(), env.bob.id(), env.carol.id()]).await?;

    // bob and carol have nothing to withdraw; the seller comes back and withdraws exactly once
    for who in [&env.bob, &env.carol] {
        assert_fails_with(&withdraw_proceeds_call(&env, who, "near").transact().await?, "ERR_NOTHING_OWED");
    }
    let seller = sub(&env.root, "seller", 1).await?;
    let r = withdraw_proceeds_call(&env, &seller, "near").transact().await?;
    assert_ok(&r);
    assert_eq!(paid(&env, &r.outcome().transaction_hash, seller.id(), seller.id()).await?, vec![p1]);
    assert_fails_with(&withdraw_proceeds_call(&env, &seller, "near").transact().await?, "ERR_NOTHING_OWED");
    assert_no_proceeds(&env, &[seller.id(), env.bob.id(), env.carol.id()]).await?;
    check_solvency(&env, &[id.as_str()], &[seller.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// USDC: alice is not registered with the FT, so her USDC payout fails and is re-credited to her. bob's resale to
/// carol right after pays bob normally; alice's credit is untouched by it and she withdraws it exactly once.
#[tokio::test]
async fn usdc_resale_after_failed_payout_recredits_only_the_first_seller() -> Result<()> {
    let env = setup().await?;
    let r = env.alice.call(env.usdc.id(), "storage_unregister").args_json(json!({})).deposit(YOCTO).transact().await?;
    assert_ok(&r);
    let (p1, p2) = (5 * USDC, 6 * USDC);
    let lid1 = list_ok(&env, &env.alice, "1", p1, "usdc").await?;
    let r1 = ft_buy(&env, &env.bob, p1, &buy_msg("1", lid1, 0)).await?;
    assert_eq!(used(&r1), p1);
    // bob relists and carol buys without waiting for anything else of the first sale
    let lid2 = list_ok(&env, &env.bob, "1", p2, "usdc").await?;
    let bob0 = ft_balance(&env, env.bob.id()).await?;
    let r = ft_buy(&env, &env.carol, p2, &buy_msg("1", lid2, 0)).await?;
    assert_eq!(used(&r), p2);
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    // every receipt of both sales, the first one's failed payout and re-credit included
    let first = receipts(&env, &r1.outcome().transaction_hash, env.bob.id()).await?;
    let recredit = the(&first, env.satchel.id(), "payout", payout_to(env.alice.id()));
    assert_eq!(recredit.events("payout")[0]["ok"], false);
    let second = receipts(&env, &r.outcome().transaction_hash, env.carol.id()).await?;
    let sale2 = the(&second, env.satchel.id(), "sold", sold(lid2)).height;
    eprintln!("heights: alice re-credit {}, usdc resale {sale2}", recredit.height);
    assert_eq!(all_events(&[&second], "payout"), vec![json!({ "account_id": env.bob.id(), "currency": "usdc", "amount": p2.to_string(), "ok": true })]);
    assert_eq!(proceeds(&env, env.alice.id()).await?, json!([{ "currency": "usdc", "amount": p1.to_string() }]));
    assert_no_proceeds(&env, &[env.bob.id(), env.carol.id()]).await?;
    assert_eq!(ft_balance(&env, env.bob.id()).await?, bob0 + p2, "bob paid normally");
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, p1, "only alice's credit stays in escrow");
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;

    ft_register(&env, env.alice.id()).await?;
    assert_ok(&withdraw_proceeds_call(&env, &env.alice, "usdc").transact().await?);
    assert_eq!(ft_balance(&env, env.alice.id()).await?, p1);
    assert_fails_with(&withdraw_proceeds_call(&env, &env.alice, "usdc").transact().await?, "ERR_NOTHING_OWED");
    assert_eq!(ft_balance(&env, env.alice.id()).await?, p1, "paid once");
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0);
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

// ── 4. withdraw_proceeds racing a resale ─────────────────────────────────────────────────

/// The seller is owed price1 (failed payout). In one burst: the seller sends `withdraw_proceeds` twice and carol buys
/// bob's relisting. Exactly one withdraw pays price1, the other finds nothing owed, bob gets exactly price2.
#[tokio::test]
async fn withdraw_proceeds_racing_a_resale_pays_once() -> Result<()> {
    let env = setup().await?;
    let seller = sub(&env.root, "seller", 10).await?;
    let id = mint(&env, &seller, seller.id()).await?;
    let (p1, p2) = (2 * ONE_NEAR, 3 * ONE_NEAR);
    let lid1 = list_ok(&env, &seller, &id, p1, "near").await?;
    seller.clone().delete_account(env.root.id()).await?.into_result()?;
    assert_ok(&buy(&env, &env.bob, &id, lid1, 0, near(p1)).await?);
    assert_eq!(proceeds(&env, seller.id()).await?, json!([{ "currency": "near", "amount": p1.to_string() }]));
    let seller = sub(&env.root, "seller", 1).await?;
    // one blocking tx first: it refreshes near-workspaces' cached nonce for the re-created account, so the async
    // withdrawals below are not dropped as InvalidNonce
    seller.transfer_near(env.root.id(), YOCTO).await?.into_result()?;
    let lid2 = list_ok(&env, &env.bob, &id, p2, "near").await?;

    let w1 = withdraw_proceeds_call(&env, &seller, "near").transact_async().await?;
    let st_c = buy_call(&env, &env.carol, &id, lid2, 0, p2).transact_async().await?;
    let w2 = withdraw_proceeds_call(&env, &seller, "near").transact_async().await?;
    let (r1, rc, r2) = (wait_final(&w1, FINAL).await?, wait_final(&st_c, FINAL).await?, wait_final(&w2, FINAL).await?);
    assert_ok(&rc);
    assert_eq!([r1.is_success(), r2.is_success()].iter().filter(|ok| **ok).count(), 1, "exactly one withdraw succeeds");
    let (ok, refused) = if r1.is_success() { (&w1, &r2) } else { (&w2, &r1) };
    assert!(fail_text(refused).contains("ERR_NOTHING_OWED"), "{}", fail_text(refused));

    let wr = receipts(&env, ok.hash(), seller.id()).await?;
    let c = receipts(&env, st_c.hash(), env.carol.id()).await?;
    let wh = wr.iter().find(|r| r.executor == env.satchel.id().as_str()).unwrap().height;
    let sale2 = the(&c, env.satchel.id(), "sold", sold(lid2)).height;
    eprintln!("heights: withdraw {wh}, resale {sale2}");
    assert_eq!(wh, sale2, "the withdraw and the resale ran in the same block");

    let to_seller = [paid(&env, w1.hash(), seller.id(), seller.id()).await?, paid(&env, w2.hash(), seller.id(), seller.id()).await?].concat();
    assert_eq!(to_seller, vec![p1], "the seller is paid exactly once");
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), env.bob.id()).await?, vec![p2]);
    assert_eq!(paid(&env, st_c.hash(), env.carol.id(), seller.id()).await?, Vec::<u128>::new());
    assert_eq!(owner_of(&env, &id).await?, env.carol.id().to_string());
    assert_no_proceeds(&env, &[seller.id(), env.bob.id(), env.carol.id()]).await?;
    assert_eq!(num(&view(&env, "market_totals", json!({})).await?["proceeds_near"]), 0);
    check_solvency(&env, &[id.as_str()], &[seller.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

// ── 5. inside assets during a sale with a payout in flight ───────────────────────────────

/// NEAR and USDC inside token 1. alice's withdrawals go out in the same burst as bob's buy (refused either way:
/// ERR_LISTED before the sale, ERR_NOT_OWNER after) and again once the buy is in a block, landing while her payout is
/// in flight. bob withdraws everything in that window. alice ends with price1 and nothing from inside.
#[tokio::test]
async fn inside_assets_go_to_the_buyer_while_the_payout_is_in_flight() -> Result<()> {
    let env = setup().await?;
    let credited = num(&deposit_near(&env, &env.carol, "1", 2 * ONE_NEAR).await?.json::<Value>()?);
    prepay(&env, &env.carol, 10 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.carol, 3 * USDC, &deposit_msg("1")).await?), 3 * USDC);
    let p1 = ONE_NEAR;
    let lid = list_ok(&env, &env.alice, "1", p1, "near").await?;
    let (alice_usdc0, bob_usdc0) = (ft_balance(&env, env.alice.id()).await?, ft_balance(&env, env.bob.id()).await?);

    // the block of the sale
    let a1 = withdraw_near_call(&env, &env.alice, "1", credited).transact_async().await?;
    let st_b = buy_call(&env, &env.bob, "1", lid, 0, p1).transact_async().await?;
    let a2 = withdraw_usdc_call(&env, &env.alice, "1", 3 * USDC).transact_async().await?;
    wait_included(&env, &st_b, env.bob.id()).await?;
    // while alice's payout is in flight
    let a3 = withdraw_near_call(&env, &env.alice, "1", credited).transact_async().await?;
    let b1 = withdraw_near_call(&env, &env.bob, "1", credited).transact_async().await?;
    let b2 = withdraw_usdc_call(&env, &env.bob, "1", 3 * USDC).transact_async().await?;
    let a4 = withdraw_usdc_call(&env, &env.alice, "1", 3 * USDC).transact_async().await?;
    assert_ok(&wait_final(&st_b, FINAL).await?);
    for (st, what) in [(&a1, "near, sale block"), (&a2, "usdc, sale block"), (&a3, "near, in flight"), (&a4, "usdc, in flight")] {
        let r = wait_final(st, FINAL).await?;
        assert_fails_with_any(&r, &["ERR_LISTED", "ERR_NOT_OWNER"]);
        assert_eq!(paid(&env, st.hash(), env.alice.id(), env.alice.id()).await?, Vec::<u128>::new(), "alice's {what}");
    }
    let (rb1, rb2) = (wait_final(&b1, FINAL).await?, wait_final(&b2, FINAL).await?);
    assert_ok(&rb1);
    assert_ok(&rb2);

    let b = receipts(&env, st_b.hash(), env.bob.id()).await?;
    let sale = the(&b, env.satchel.id(), "sold", sold(lid)).height;
    let on_pay_a = the(&b, env.satchel.id(), "payout", payout_to(env.alice.id())).height;
    let h = |rs: Vec<Rcpt>| rs.iter().find(|r| r.executor == env.satchel.id().as_str()).unwrap().height;
    let (ha1, ha2) = (h(receipts(&env, a1.hash(), env.alice.id()).await?), h(receipts(&env, a2.hash(), env.alice.id()).await?));
    let (ha3, hb1) = (h(receipts(&env, a3.hash(), env.alice.id()).await?), h(receipts(&env, b1.hash(), env.bob.id()).await?));
    eprintln!("heights: sale {sale}, alice on_payout {on_pay_a}, alice withdraws {ha1} {ha2} {ha3}, bob withdraw {hb1}");
    assert_eq!((ha1, ha2), (sale, sale), "alice's first withdrawals ran in the block of the sale");
    assert!(sale < ha3 && ha3 < on_pay_a, "alice's next withdrawal ran while her payout was in flight");
    assert!(hb1 < on_pay_a, "bob withdrew while alice's payout was in flight");

    assert_eq!(paid(&env, st_b.hash(), env.bob.id(), env.alice.id()).await?, vec![p1], "alice gets price1 only");
    assert_eq!(paid(&env, b1.hash(), env.bob.id(), env.bob.id()).await?, vec![credited]);
    assert_eq!(ft_balance(&env, env.bob.id()).await?, bob_usdc0 + 3 * USDC);
    assert_eq!(ft_balance(&env, env.alice.id()).await?, alice_usdc0);
    let ins = inside(&env, "1").await?;
    assert_eq!((num(&ins["near"]), ins["fts"].clone()), (0, json!([])));
    assert_eq!(ins["inside_epoch"], 2, "only bob's two withdrawals bumped the epoch");
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

// ── 6. more of the transfer path with a payout pending ───────────────────────────────────

/// bob buys and, in the same receipt, accepts carol's NEAR offer (made while alice owned it; the sale changes neither
/// `sig_count` nor `inside_epoch`). Two detached payouts are in flight at once: alice gets price1, bob the offer.
#[tokio::test]
async fn accept_offer_in_the_buy_receipt_pays_both_sellers() -> Result<()> {
    let env = setup().await?;
    let (p1, offer) = (2 * ONE_NEAR, 3 * ONE_NEAR);
    let oid = make_offer_ok(&env, &env.carol, "1", offer).await?;
    let lid = list_ok(&env, &env.alice, "1", p1, "near").await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    let st = env
        .bob
        .batch(env.satchel.id())
        .call(buy_fn("1", lid, 0, p1))
        .call(Function::new("accept_offer").args_json(json!({ "offer_id": oid })).deposit(YOCTO).gas(Gas::from_tgas(50)))
        .transact_async()
        .await?;
    assert_ok(&wait_final(&st, FINAL).await?);
    let rs = receipts(&env, st.hash(), env.bob.id()).await?;
    let sale = the(&rs, env.satchel.id(), "sold", sold(lid));
    assert_eq!(sale.events("offer_accepted").len(), 1, "accepted in the buy's own receipt");
    let on_pay_a = the(&rs, env.satchel.id(), "payout", payout_to(env.alice.id())).height;
    assert!(sale.height < on_pay_a);
    assert_eq!(paid(&env, st.hash(), env.bob.id(), env.alice.id()).await?, vec![p1]);
    assert_eq!(paid(&env, st.hash(), env.bob.id(), env.bob.id()).await?, vec![offer], "bob paid the offer, once");
    assert_eq!(paid(&env, st.hash(), env.bob.id(), env.carol.id()).await?, Vec::<u128>::new());
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    assert!(view(&env, "offer", json!({ "offer_id": oid })).await?.is_null());
    assert!(satchel_view(&env, "1").await?["listing"].is_null());
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    // neither seller keeps a power
    let req = evm_req(&EvmTx::transfer(0).encode());
    for who in [&env.alice, &env.bob] {
        assert_fails_with(&sign_sync_fail(&env, who, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    }
    assert_ok(&sign_and_wait(&env, &env.carol, "1", &req).await?);
    Ok(())
}

/// bob buys and gifts the Satchel to carol in the same receipt, with alice's payout still pending: alice gets price1,
/// bob gets nothing and keeps no power, carol owns and signs.
#[tokio::test]
async fn gift_in_the_buy_receipt_leaves_the_buyer_nothing() -> Result<()> {
    let env = setup().await?;
    let p1 = 2 * ONE_NEAR;
    let lid = list_ok(&env, &env.alice, "1", p1, "near").await?;
    let st = env
        .bob
        .batch(env.satchel.id())
        .call(buy_fn("1", lid, 0, p1))
        .call(Function::new("nft_transfer").args_json(json!({ "receiver_id": env.carol.id(), "token_id": "1" })).deposit(YOCTO).gas(Gas::from_tgas(30)))
        .transact_async()
        .await?;
    assert_ok(&wait_final(&st, FINAL).await?);
    let rs = receipts(&env, st.hash(), env.bob.id()).await?;
    let sale = the(&rs, env.satchel.id(), "sold", sold(lid));
    let nft = events_in(sale.logs.iter().cloned(), "nep171", "nft_transfer");
    assert_eq!(nft.len(), 2, "sale and gift in one receipt: {nft:?}");
    assert_eq!(nft[1]["new_owner_id"], env.carol.id().as_str());
    assert!(sale.height < the(&rs, env.satchel.id(), "payout", payout_to(env.alice.id())).height);
    assert_eq!(paid(&env, st.hash(), env.bob.id(), env.alice.id()).await?, vec![p1]);
    assert_eq!(paid(&env, st.hash(), env.bob.id(), env.bob.id()).await?, Vec::<u128>::new());
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    let req = evm_req(&EvmTx::transfer(0).encode());
    assert_fails_with(&sign_sync_fail(&env, &env.bob, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    assert_fails_with(&list(&env, &env.bob, "1", ONE_NEAR, "near").await?, "ERR_NOT_OWNER");
    assert_fails_with(&transfer(&env, &env.bob, "1", env.bob.id()).await?, "ERR_NOT_OWNER");
    assert_ok(&sign_and_wait(&env, &env.carol, "1", &req).await?);
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// alice delists in the same block as bob's buy. Exactly one wins: either bob owns the Satchel and alice is paid once,
/// or alice keeps it unlisted and bob's NEAR is refunded in full (the contract keeps none of it).
#[tokio::test]
async fn delist_racing_a_buy_settles_one_way() -> Result<()> {
    let env = setup().await?;
    let p1 = 4 * ONE_NEAR;
    let lid = list_ok(&env, &env.alice, "1", p1, "near").await?;
    let bal0 = {
        let a = env.worker.view_account(env.satchel.id()).await?;
        a.balance.as_yoctonear() as i128
    };
    let sd = env
        .alice
        .call(env.satchel.id(), "delist")
        .args_json(json!({ "token_id": "1" }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(30))
        .transact_async()
        .await?;
    let sb = buy_call(&env, &env.bob, "1", lid, 0, p1).transact_async().await?;
    let (rd, rb) = (wait_final(&sd, FINAL).await?, wait_final(&sb, FINAL).await?);
    let hd = receipts(&env, sd.hash(), env.alice.id()).await?.iter().find(|r| r.executor == env.satchel.id().as_str()).unwrap().height;
    let hb = receipts(&env, sb.hash(), env.bob.id()).await?.iter().find(|r| r.executor == env.satchel.id().as_str()).unwrap().height;
    eprintln!("heights: delist {hd}, buy {hb}; delist ok {}, buy ok {}", rd.is_success(), rb.is_success());
    assert_ne!(rd.is_success(), rb.is_success(), "exactly one of delist and buy succeeds");
    if rb.is_success() {
        assert_fails_with(&rd, "ERR_NOT_LISTED");
        assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
        assert_eq!(paid(&env, sb.hash(), env.bob.id(), env.alice.id()).await?, vec![p1]);
    } else {
        assert_fails_with(&rb, "ERR_NOT_LISTED");
        assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
        assert!(satchel_view(&env, "1").await?["listing"].is_null());
        assert_eq!(paid(&env, sb.hash(), env.bob.id(), env.alice.id()).await?, Vec::<u128>::new());
    }
    // either way the contract kept none of bob's NEAR (only gas rewards move its balance)
    let bal1 = env.worker.view_account(env.satchel.id()).await?.balance.as_yoctonear() as i128;
    assert!((bal1 - bal0).abs() < (ONE_NEAR / 10) as i128, "contract balance moved by {}", bal1 - bal0);
    assert_no_proceeds(&env, &[env.alice.id(), env.bob.id()]).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}
