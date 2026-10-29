//! C4 offers and C6 inside assets, end to end (docs/specs/C4-C6.md): deposits and withdrawals of NEAR and USDC,
//! the listing freeze, balances that follow the token through transfer and sale, offers in NEAR and USDC (accept,
//! cancel, expiry, stale refusals, the quiet period, the per-offerer cap), failed transfers that re-credit, and the
//! solvency invariants I-M1 (NEAR) and I-M3 (USDC) checked after every step.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId};
use serde_json::{Value, json};
use std::time::Duration;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const USDC: u128 = 1_000_000; // 6 decimals

// ── call helpers ─────────────────────────────────────────────────────────────────────────

async fn deposit_near(env: &Env, who: &Account, id: &str, amount: u128) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "deposit_near")
        .args_json(json!({ "token_id": id }))
        .deposit(NearToken::from_yoctonear(amount))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn withdraw_near(env: &Env, who: &Account, id: &str, amount: u128, to: Option<&AccountId>) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "withdraw_near")
        .args_json(json!({ "token_id": id, "amount": amount.to_string(), "receiver_id": to }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?)
}

async fn withdraw_usdc(env: &Env, who: &Account, id: &str, amount: u128, to: Option<&AccountId>) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "withdraw_ft")
        .args_json(json!({ "token_id": id, "ft": env.usdc.id(), "amount": amount.to_string(), "receiver_id": to }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?)
}

async fn prepay(env: &Env, who: &Account, amount: u128) -> Result<()> {
    let r = who
        .call(env.satchel.id(), "prepay_storage")
        .args_json(json!({}))
        .deposit(NearToken::from_yoctonear(amount))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    Ok(())
}

async fn make_offer(env: &Env, who: &Account, id: &str, amount: u128, exp_ms: u64) -> Result<ExecutionFinalResult> {
    let sv = satchel_view(env, id).await?;
    let epoch = inside(env, id).await?["inside_epoch"].as_u64().unwrap();
    Ok(who
        .call(env.satchel.id(), "make_offer")
        .args_json(json!({ "token_id": id, "amount": amount.to_string(), "expected_sig_count": num(&sv["sig_count"]) as u64,
                           "expected_inside_epoch": epoch, "expires_at_ms": exp_ms }))
        .deposit(NearToken::from_yoctonear(amount + 10 * MILLI))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn make_offer_ok(env: &Env, who: &Account, id: &str, amount: u128, exp_ms: u64) -> Result<u64> {
    let r = make_offer(env, who, id, amount, exp_ms).await?;
    assert_ok(&r);
    Ok(r.json::<u64>()?)
}

fn deposit_msg(id: &str) -> String {
    json!({ "deposit": id }).to_string()
}

async fn offer_msg(env: &Env, id: &str, exp_ms: u64) -> Result<String> {
    let sc = sig_count(env, id).await?;
    let epoch = inside(env, id).await?["inside_epoch"].as_u64().unwrap();
    Ok(json!({ "offer": { "token_id": id, "expected_sig_count": sc, "expected_inside_epoch": epoch, "expires_at_ms": exp_ms } })
        .to_string())
}

async fn offer_call(env: &Env, who: &Account, method: &str, oid: u64) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), method)
        .args_json(json!({ "offer_id": oid }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?)
}

async fn inside(env: &Env, id: &str) -> Result<Value> {
    view(env, "inside_of", json!({ "token_id": id })).await
}

fn used(r: &ExecutionFinalResult) -> u128 {
    num(&r.clone().json::<Value>().expect("ft_transfer_call returns the used amount"))
}

async fn now_ms(env: &Env) -> Result<u64> {
    Ok(env.worker.view_block().await?.timestamp() / 1_000_000)
}

async fn transfers_to(env: &Env, r: &ExecutionFinalResult, signer: &AccountId, to: &AccountId) -> Result<Vec<u128>> {
    let receipts = rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, signer).await?;
    Ok(rpc::transfers(&receipts, env.satchel.id(), to))
}

// ── the solvency invariants ──────────────────────────────────────────────────────────────

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
        for p in view(env, "proceeds_of", json!({ "account_id": a })).await?.as_array().unwrap() {
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

// ── C6 ───────────────────────────────────────────────────────────────────────────────────

/// Deposit from anyone; only the owner withdraws, exactly what is inside; the epoch bumps; the receiver gets exactly
/// the amount; the contract's own NEAR is never inside any Satchel.
#[tokio::test]
async fn deposit_and_withdraw_near() -> Result<()> {
    let env = setup().await?;
    let accts = [env.alice.id(), env.bob.id()];
    assert_eq!(inside(&env, "1").await?, json!({"near":"0","fts":[],"inside_epoch":0}));
    assert!(inside(&env, "99").await?.is_null());
    let r = deposit_near(&env, &env.bob, "1", 2 * ONE_NEAR).await?;
    assert_ok(&r);
    let credited = num(&r.clone().json::<Value>()?);
    assert!(credited < 2 * ONE_NEAR && credited > 2 * ONE_NEAR - 2 * MILLI, "first deposit pays ≈ 0.0007 NEAR of storage");
    assert_eq!(events(&r, "inside_deposit").len(), 1);
    check_solvency(&env, &["1"], &accts).await?;

    assert_fails_with(&withdraw_near(&env, &env.bob, "1", 1, None).await?, "ERR_NOT_OWNER");
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", credited + 1, None).await?, "ERR_INSIDE_BALANCE");
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", 0, None).await?, "ERR_AMOUNT");
    // the contract holds 50 NEAR of its own; a token with nothing inside can't take any of it
    let t2 = mint(&env, &env.alice, env.alice.id()).await?;
    assert_fails_with(&withdraw_near(&env, &env.alice, &t2, 1, None).await?, "ERR_INSIDE_BALANCE");

    let r = withdraw_near(&env, &env.alice, "1", ONE_NEAR, Some(env.carol.id())).await?;
    assert_ok(&r);
    assert_eq!(r.clone().json::<bool>()?, true, "the tx result is the callback's verdict");
    assert_eq!(transfers_to(&env, &r, env.alice.id(), env.carol.id()).await?, vec![ONE_NEAR]);
    let w = events(&r, "inside_withdraw");
    assert_eq!((w[0]["inside_epoch"].as_u64(), w[0]["receiver_id"].as_str()), (Some(1), Some(env.carol.id().as_str())));
    assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], true);
    assert_eq!(inside(&env, "1").await?, json!({"near": (credited - ONE_NEAR).to_string(), "fts": [], "inside_epoch": 1}));
    check_solvency(&env, &["1", &t2], &accts).await?;
    Ok(())
}

/// INV-13 row for C6: while listed, withdrawals are refused (deposits are not); after delist they work again.
#[tokio::test]
async fn withdraw_blocked_while_listed() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    prepay(&env, &env.bob, 10 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 2 * USDC, &deposit_msg("1")).await?), 2 * USDC);
    list_ok(&env, &env.alice, "1", 5 * ONE_NEAR, "near").await?;
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", 1, None).await?, "ERR_LISTED");
    assert_fails_with(&withdraw_usdc(&env, &env.alice, "1", 1, None).await?, "ERR_LISTED");
    assert_ok(&deposit_near(&env, &env.carol, "1", MILLI).await?); // deposits only add, so they stay open
    assert_eq!(inside(&env, "1").await?["inside_epoch"], 0);
    assert_ok(&delist(&env, &env.alice, "1").await?);
    assert_ok(&withdraw_near(&env, &env.alice, "1", MILLI, None).await?);
    assert_ok(&withdraw_usdc(&env, &env.alice, "1", USDC, None).await?);
    assert_eq!(inside(&env, "1").await?["inside_epoch"], 2);
    Ok(())
}

/// I-M8: `nft_transfer` moves the inside balances with the NFT; only the new owner can withdraw.
#[tokio::test]
async fn transfer_moves_inside() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    prepay(&env, &env.bob, 10 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 3 * USDC, &deposit_msg("1")).await?), 3 * USDC);
    let before = inside(&env, "1").await?;
    assert_ok(&transfer(&env, &env.alice, "1", env.carol.id()).await?);
    assert_eq!(inside(&env, "1").await?, before);
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", 1, None).await?, "ERR_NOT_OWNER");
    assert_fails_with(&withdraw_usdc(&env, &env.alice, "1", 1, None).await?, "ERR_NOT_OWNER");
    let c0 = ft_balance(&env, env.carol.id()).await?;
    assert_ok(&withdraw_usdc(&env, &env.carol, "1", 3 * USDC, None).await?);
    assert_eq!(ft_balance(&env, env.carol.id()).await?, c0 + 3 * USDC);
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// I-M8: a NEAR `buy` and a USDC `buy` move the inside balances to the buyer.
#[tokio::test]
async fn buy_moves_inside() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    let before = inside(&env, "1").await?;
    let lid = list_ok(&env, &env.alice, "1", 2 * ONE_NEAR, "near").await?;
    assert_ok(&buy(&env, &env.carol, "1", lid, 0, NearToken::from_yoctonear(2 * ONE_NEAR)).await?);
    assert_eq!(inside(&env, "1").await?, before);
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", 1, None).await?, "ERR_NOT_OWNER");
    // carol relists for USDC; bob buys with ft_transfer_call
    let lid = list_ok(&env, &env.carol, "1", 4 * USDC, "usdc").await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 4 * USDC, &buy_msg("1", lid, 0)).await?), 4 * USDC, "the buy msg still works");
    assert_eq!(inside(&env, "1").await?, before);
    assert_fails_with(&withdraw_near(&env, &env.carol, "1", 1, None).await?, "ERR_NOT_OWNER");
    let r = withdraw_near(&env, &env.bob, "1", num(&before["near"]), None).await?;
    assert_ok(&r);
    assert_eq!(transfers_to(&env, &r, env.bob.id(), env.bob.id()).await?, vec![num(&before["near"])]);
    Ok(())
}

/// FT deposits need storage credit only for a new slot; without it the FT refunds 100 %. wNEAR-only routes and
/// direct calls are refused.
#[tokio::test]
async fn ft_deposit_storage_credit_and_refunds() -> Result<()> {
    let env = setup().await?;
    let c0 = ft_balance(&env, env.carol.id()).await?;
    let r = ft_buy(&env, &env.carol, USDC, &deposit_msg("1")).await?;
    assert_eq!(used(&r), 0, "no credit → refunded");
    assert!(fail_text(&r).contains("ERR_STORAGE_CREDIT"), "{}", fail_text(&r));
    assert_eq!(ft_balance(&env, env.carol.id()).await?, c0);
    prepay(&env, &env.carol, 10 * MILLI).await?;
    let credit0 = num(&view(&env, "storage_credit_of", json!({ "account_id": env.carol.id() })).await?);
    assert_eq!(used(&ft_buy(&env, &env.carol, USDC, &deposit_msg("1")).await?), USDC);
    let credit1 = num(&view(&env, "storage_credit_of", json!({ "account_id": env.carol.id() })).await?);
    assert!(credit1 < credit0 && credit0 - credit1 < 2 * MILLI, "a new slot costs ≈ 0.0015 NEAR of credit");
    // a top-up by an account without credit needs none
    assert_eq!(used(&ft_buy(&env, &env.bob, 2 * USDC, &deposit_msg("1")).await?), 2 * USDC);
    assert_eq!(inside(&env, "1").await?["fts"], json!([{ "token": env.usdc.id(), "amount": (3 * USDC).to_string() }]));
    // unknown token, bad msg → refunded
    for (msg, code) in [(deposit_msg("99"), "ERR_TOKEN_NOT_FOUND"), ("{\"deposit\":1}".to_string(), "ERR_BAD_MSG")] {
        let r = ft_buy(&env, &env.carol, USDC, &msg).await?;
        assert_eq!(used(&r), 0);
        assert!(fail_text(&r).contains(code), "{code}: {}", fail_text(&r));
    }
    // a direct call pretending to be an FT
    let r = env
        .carol
        .call(env.satchel.id(), "ft_on_transfer")
        .args_json(json!({ "sender_id": env.carol.id(), "amount": "1000000", "msg": deposit_msg("1") }))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_WRONG_TOKEN");
    // withdrawing the credit: exactly 1 yocto, pays out everything, then nothing is owed
    let r = env.carol.call(env.satchel.id(), "withdraw_storage_credit").args_json(json!({})).deposit(YOCTO).transact().await?;
    assert_ok(&r);
    assert_eq!(transfers_to(&env, &r, env.carol.id(), env.carol.id()).await?, vec![credit1]);
    let r = env.carol.call(env.satchel.id(), "withdraw_storage_credit").args_json(json!({})).deposit(YOCTO).transact().await?;
    assert_fails_with(&r, "ERR_NOTHING_OWED");
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// I-M4: a failed `ft_transfer` (unregistered receiver) and a failed NEAR transfer (no such account) are re-credited
/// to the token by the callback; the tx result says false; the epoch stays bumped.
#[tokio::test]
async fn withdraw_failures_recredit() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    prepay(&env, &env.bob, 10 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 5 * USDC, &deposit_msg("1")).await?), 5 * USDC);
    let before = inside(&env, "1").await?;
    let dave = sub(&env.root, "dave", 5).await?; // exists, but never registered with the FT
    let r = withdraw_usdc(&env, &env.alice, "1", 5 * USDC, Some(dave.id())).await?;
    assert!(r.is_success(), "{}", fail_text(&r));
    assert_eq!(r.clone().json::<bool>()?, false);
    assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], false);
    assert_eq!(ft_balance(&env, dave.id()).await?, 0);
    let after = inside(&env, "1").await?;
    assert_eq!(after["fts"], before["fts"], "re-credited");
    assert_eq!(after["inside_epoch"], 1, "the epoch stays bumped");

    let ghost: AccountId = format!("ghost.{}", env.root.id()).parse()?;
    let r = withdraw_near(&env, &env.alice, "1", ONE_NEAR / 2, Some(&ghost)).await?;
    assert!(r.is_success(), "{}", fail_text(&r));
    assert_eq!(r.clone().json::<bool>()?, false);
    assert_eq!(inside(&env, "1").await?["near"], before["near"], "re-credited after the refund");
    assert_eq!(inside(&env, "1").await?["inside_epoch"], 2);
    tokio::time::sleep(Duration::from_secs(2)).await; // the failed transfer's refund receipt
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id()]).await?;
    // the callbacks are private
    let r = env
        .carol
        .call(env.satchel.id(), "on_inside_withdraw")
        .args_json(json!({ "token_id": "1", "ft": null, "amount": "1" }))
        .transact()
        .await?;
    assert!(r.is_failure() && fail_text(&r).contains("private"), "{}", fail_text(&r));
    Ok(())
}

// ── C4 ───────────────────────────────────────────────────────────────────────────────────

/// A NEAR offer: escrow, accept (NFT moves, seller paid exactly, INV-02 control moves, inside moves), views.
#[tokio::test]
async fn offer_near_accept() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.carol, "1", ONE_NEAR).await?);
    let inside0 = inside(&env, "1").await?;
    let exp = now_ms(&env).await? + 3_600_000;
    assert_fails_with(&make_offer(&env, &env.alice, "1", ONE_NEAR, exp).await?, "ERR_SELF_BUY");
    let oid = make_offer_ok(&env, &env.bob, "1", 3 * ONE_NEAR, exp).await?;
    let o = view(&env, "offer", json!({ "offer_id": oid })).await?;
    assert_eq!((o["offerer_id"].as_str(), num(&o["amount"]), o["currency"].as_str()), (Some(env.bob.id().as_str()), 3 * ONE_NEAR, Some("near")));
    assert_eq!(view(&env, "offers_for", json!({ "token_id": "1", "from_index": 0, "limit": 50 })).await?, json!([o]));
    assert_eq!(view(&env, "offers_by", json!({ "account_id": env.bob.id(), "from_index": 0, "limit": 50 })).await?, json!([o]));
    let accts = [env.alice.id(), env.bob.id(), env.carol.id()];
    check_solvency(&env, &["1"], &accts).await?;

    assert_fails_with(&offer_call(&env, &env.bob, "accept_offer", oid).await?, "ERR_NOT_OWNER");
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?;
    assert_ok(&r);
    eprintln!("accept_offer gas burnt: {} Tgas", r.total_gas_burnt.as_tgas());
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    assert_eq!(transfers_to(&env, &r, env.alice.id(), env.alice.id()).await?, vec![3 * ONE_NEAR], "seller paid exactly");
    assert_eq!(events(&r, "offer_accepted").len(), 1);
    assert_eq!(events(&r, "payout")[0]["ok"], true);
    assert_eq!(inside(&env, "1").await?, inside0, "inside balances move with the NFT");
    assert!(view(&env, "offer", json!({ "offer_id": oid })).await?.is_null());
    check_solvency(&env, &["1"], &accts).await?;
    // INV-02: control moves
    let req = evm_req(&EvmTx::transfer(0).encode());
    assert_fails_with(&sign_sync_fail(&env, &env.alice, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    assert_ok(&sign_and_wait(&env, &env.bob, "1", &req).await?);
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", 1, None).await?, "ERR_NOT_OWNER");
    Ok(())
}

/// A USDC offer through `ft_transfer_call`: storage from the offerer's credit, accept pays the seller in USDC.
#[tokio::test]
async fn offer_usdc_accept() -> Result<()> {
    let env = setup().await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let msg = offer_msg(&env, "1", exp).await?;
    let r = ft_buy(&env, &env.carol, 5 * USDC, &msg).await?;
    assert_eq!(used(&r), 0, "no storage credit → refunded");
    prepay(&env, &env.carol, 10 * MILLI).await?;
    let c0 = ft_balance(&env, env.carol.id()).await?;
    let r = ft_buy(&env, &env.carol, 5 * USDC, &msg).await?;
    assert_eq!(used(&r), 5 * USDC);
    assert_eq!(ft_balance(&env, env.carol.id()).await?, c0 - 5 * USDC);
    let oid = num(&events(&r, "offer_made")[0]["offer_id"]) as u64;
    let accts = [env.alice.id(), env.bob.id(), env.carol.id()];
    check_solvency(&env, &["1"], &accts).await?;
    let a0 = ft_balance(&env, env.alice.id()).await?;
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?;
    assert_ok(&r);
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    assert_eq!(ft_balance(&env, env.alice.id()).await?, a0 + 5 * USDC, "seller paid in USDC");
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0);
    check_solvency(&env, &["1"], &accts).await?;
    Ok(())
}

/// Accepting delists a listed token (the old listing can no longer be bought) and an offer is made while listed.
#[tokio::test]
async fn offer_accept_delists() -> Result<()> {
    let env = setup().await?;
    let lid = list_ok(&env, &env.alice, "1", 9 * USDC, "usdc").await?;
    let oid = make_offer_ok(&env, &env.bob, "1", 2 * ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "delisted").len(), 1);
    assert!(satchel_view(&env, "1").await?["listing"].is_null());
    assert!(view(&env, "listings", json!({ "from_index": 0, "limit": 50 })).await?.as_array().unwrap().is_empty());
    let r = ft_buy(&env, &env.carol, 9 * USDC, &buy_msg("1", lid, 0)).await?;
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_NOT_LISTED"), "{}", fail_text(&r));
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    Ok(())
}

/// I-M7: a new signature or a withdrawal makes an offer stale; an offer on the new state still waits for the quiet
/// period.
#[tokio::test]
async fn offer_stale_refused() -> Result<()> {
    let env = setup().await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let o1 = make_offer_ok(&env, &env.bob, "1", ONE_NEAR, exp).await?; // sig_count 0, epoch 0
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    assert_fails_with(&offer_call(&env, &env.alice, "accept_offer", o1).await?, "ERR_OFFER_STALE");
    let o2 = make_offer_ok(&env, &env.bob, "1", ONE_NEAR, exp).await?; // sig_count 1
    assert_fails_with(&offer_call(&env, &env.alice, "accept_offer", o2).await?, "ERR_QUIET_PERIOD");
    assert_ok(&deposit_near(&env, &env.carol, "1", ONE_NEAR).await?);
    let o3 = make_offer_ok(&env, &env.carol, "1", ONE_NEAR, exp).await?; // epoch 0
    assert_ok(&withdraw_near(&env, &env.alice, "1", MILLI, None).await?); // epoch 1
    pass_quiet_period(&env, "1").await?;
    assert_fails_with(&offer_call(&env, &env.alice, "accept_offer", o3).await?, "ERR_OFFER_STALE");
    assert_fails_with(&offer_call(&env, &env.alice, "accept_offer", o2).await?, "ERR_OFFER_STALE");
    // a fresh offer on the current state, after the quiet period, is accepted
    let o4 = make_offer_ok(&env, &env.bob, "1", ONE_NEAR, exp).await?;
    assert_ok(&offer_call(&env, &env.alice, "accept_offer", o4).await?);
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    // stale offers are still refundable by their offerers
    assert_ok(&offer_call(&env, &env.bob, "cancel_offer", o1).await?);
    assert_ok(&offer_call(&env, &env.carol, "cancel_offer", o3).await?);
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// I-M5: cancel by the offerer at any time, by anyone after expiry; the refund always goes to the offerer, exactly.
#[tokio::test]
async fn offer_cancel_and_expiry() -> Result<()> {
    let env = setup().await?;
    let oid = make_offer_ok(&env, &env.bob, "1", 2 * ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    assert_fails_with(&offer_call(&env, &env.carol, "cancel_offer", oid).await?, "ERR_NOT_OFFERER");
    let r = offer_call(&env, &env.bob, "cancel_offer", oid).await?;
    assert_ok(&r);
    assert_eq!(transfers_to(&env, &r, env.bob.id(), env.bob.id()).await?, vec![2 * ONE_NEAR]);
    assert_fails_with(&offer_call(&env, &env.bob, "cancel_offer", oid).await?, "ERR_NO_OFFER");

    // a short-lived offer
    let exp = now_ms(&env).await? + 4_000;
    let oid = make_offer_ok(&env, &env.bob, "1", ONE_NEAR, exp).await?;
    for _ in 0..60 {
        if now_ms(&env).await? > exp {
            break;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    assert_fails_with(&offer_call(&env, &env.alice, "accept_offer", oid).await?, "ERR_OFFER_EXPIRED");
    let r = offer_call(&env, &env.carol, "cancel_offer", oid).await?;
    assert_ok(&r);
    assert_eq!(transfers_to(&env, &r, env.carol.id(), env.bob.id()).await?, vec![ONE_NEAR], "refund to the offerer, not the canceller");
    assert_eq!(events(&r, "offer_cancelled")[0]["by_id"], env.carol.id().as_str());
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// A failed refund (the offerer deleted their account) is credited to proceeds and withdrawable later; nothing is
/// orphaned.
#[tokio::test]
async fn offer_refund_failure_goes_to_proceeds() -> Result<()> {
    let env = setup().await?;
    let dave = sub(&env.root, "dave", 10).await?;
    let oid = make_offer_ok(&env, &dave, "1", 3 * ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    dave.clone().delete_account(env.root.id()).await?.into_result()?;
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?; // the buyer is gone, the NFT still moves
    assert_ok(&r);
    assert_eq!(owner_of(&env, "1").await?, dave.id().to_string());
    // a second offer whose offerer then deletes their account: after expiry anyone cancels, the refund fails and
    // lands in proceeds_of(offerer), which the re-created account withdraws
    let erin = sub(&env.root, "erin", 10).await?;
    let oid = make_offer_ok(&env, &erin, "1", 2 * ONE_NEAR, now_ms(&env).await? + 4_000).await?;
    erin.clone().delete_account(env.root.id()).await?.into_result()?;
    tokio::time::sleep(Duration::from_secs(6)).await;
    let r = offer_call(&env, &env.carol, "cancel_offer", oid).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "payout")[0]["ok"], false, "the refund to a deleted account failed");
    assert_eq!(
        view(&env, "proceeds_of", json!({ "account_id": erin.id() })).await?,
        json!([{ "currency": "near", "amount": (2 * ONE_NEAR).to_string() }])
    );
    tokio::time::sleep(Duration::from_secs(2)).await;
    check_solvency(&env, &["1"], &[env.alice.id(), erin.id(), dave.id()]).await?;
    let erin = sub(&env.root, "erin", 1).await?;
    let r = erin.call(env.satchel.id(), "withdraw_proceeds").args_json(json!({ "currency": "near" })).deposit(YOCTO).gas(Gas::from_tgas(50)).transact().await?;
    assert_ok(&r);
    assert_eq!(transfers_to(&env, &r, erin.id(), erin.id()).await?, vec![2 * ONE_NEAR]);
    Ok(())
}

/// The storage cap: 20 open offers per offerer; others are not blocked; a cancel frees a slot.
#[tokio::test]
async fn offer_cap_per_offerer() -> Result<()> {
    let env = setup().await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let cfg = view(&env, "market_config", json!({})).await?;
    assert_eq!(cfg["max_offers_per_account"], 20);
    assert_eq!(cfg["inside_fts"], json!([env.usdc.id(), "wrap.testnet"]));
    let mut ids = vec![];
    for _ in 0..20 {
        ids.push(make_offer_ok(&env, &env.bob, "1", 1, exp).await?);
    }
    assert_fails_with(&make_offer(&env, &env.bob, "1", 1, exp).await?, "ERR_TOO_MANY_OFFERS");
    make_offer_ok(&env, &env.carol, "1", ONE_NEAR, exp).await?;
    let page = view(&env, "offers_for", json!({ "token_id": "1", "from_index": 0, "limit": 100 })).await?;
    assert_eq!(page.as_array().unwrap().len(), 21);
    assert_ok(&offer_call(&env, &env.bob, "cancel_offer", ids[3]).await?);
    make_offer_ok(&env, &env.bob, "1", 1, exp).await?;
    check_solvency(&env, &["1"], &[env.alice.id(), env.bob.id(), env.carol.id()]).await?;
    Ok(())
}

/// I-M1 under pressure: with the contract's own free balance drained to ≈ 0.05 NEAR (S-01-style), deposits,
/// withdrawals, failed withdrawals, offers, a failed refund and an accept all still work, and the contract always
/// holds at least what it owes.
#[tokio::test]
async fn near_solvency_invariant() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 2, ..Default::default() }).await?;
    let accts = [env.alice.id(), env.bob.id(), env.carol.id()];
    // drain the contract's own NEAR (sandbox only: the account still has its key)
    let a = env.worker.view_account(env.satchel.id()).await?;
    let free = a.balance.as_yoctonear() - a.storage_usage as u128 * STORAGE_BYTE_COST;
    let r = env.satchel.as_account().transfer_near(env.root.id(), NearToken::from_yoctonear(free - 50 * MILLI)).await?;
    assert!(r.is_success());
    tokio::time::sleep(Duration::from_secs(2)).await;
    check_solvency(&env, &["1", "2"], &accts).await?;

    assert_ok(&deposit_near(&env, &env.bob, "1", 5 * ONE_NEAR).await?);
    check_solvency(&env, &["1", "2"], &accts).await?;
    assert_ok(&deposit_near(&env, &env.carol, "2", ONE_NEAR).await?);
    prepay(&env, &env.carol, 20 * MILLI).await?;
    check_solvency(&env, &["1", "2"], &accts).await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let o1 = make_offer_ok(&env, &env.bob, "2", 3 * ONE_NEAR, exp).await?;
    let o2 = make_offer_ok(&env, &env.carol, "1", 2 * ONE_NEAR, exp).await?;
    check_solvency(&env, &["1", "2"], &accts).await?;
    // a failed withdrawal: the NEAR comes back and is re-credited
    let ghost: AccountId = format!("ghost.{}", env.root.id()).parse()?;
    let r = withdraw_near(&env, &env.alice, "1", 4 * ONE_NEAR, Some(&ghost)).await?;
    assert_eq!(r.clone().json::<bool>()?, false);
    tokio::time::sleep(Duration::from_secs(2)).await;
    check_solvency(&env, &["1", "2"], &accts).await?;
    // the whole inside of token 1 comes out; not a yocto more
    let all = num(&inside(&env, "1").await?["near"]);
    assert_fails_with(&withdraw_near(&env, &env.alice, "1", all + 1, None).await?, "ERR_INSIDE_BALANCE");
    assert_ok(&withdraw_near(&env, &env.alice, "1", all, None).await?);
    check_solvency(&env, &["1", "2"], &accts).await?;
    // accept and cancel
    assert_ok(&offer_call(&env, &env.alice, "accept_offer", o1).await?);
    assert_ok(&offer_call(&env, &env.carol, "cancel_offer", o2).await?);
    tokio::time::sleep(Duration::from_secs(2)).await;
    check_solvency(&env, &["1", "2"], &accts).await?;
    let t = view(&env, "market_totals", json!({})).await?;
    assert_eq!((num(&t["inside_near"]), num(&t["offers_near"])), (num(&inside(&env, "2").await?["near"]), 0));
    Ok(())
}

/// I-M3 across a USDC deposit, a USDC offer, a failed USDC withdrawal and a USDC accept.
#[tokio::test]
async fn ft_solvency_invariant() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 2, ..Default::default() }).await?;
    let accts = [env.alice.id(), env.bob.id(), env.carol.id()];
    prepay(&env, &env.bob, 20 * MILLI).await?;
    prepay(&env, &env.carol, 20 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 7 * USDC, &deposit_msg("1")).await?), 7 * USDC);
    check_solvency(&env, &["1", "2"], &accts).await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let msg = offer_msg(&env, "2", exp).await?;
    let r = ft_buy(&env, &env.carol, 4 * USDC, &msg).await?;
    assert_eq!(used(&r), 4 * USDC);
    let oid = num(&events(&r, "offer_made")[0]["offer_id"]) as u64;
    check_solvency(&env, &["1", "2"], &accts).await?;
    let dave = sub(&env.root, "dave", 5).await?;
    assert_eq!(withdraw_usdc(&env, &env.alice, "1", 7 * USDC, Some(dave.id())).await?.json::<bool>()?, false);
    check_solvency(&env, &["1", "2"], &accts).await?;
    assert_ok(&offer_call(&env, &env.alice, "accept_offer", oid).await?);
    check_solvency(&env, &["1", "2"], &accts).await?;
    assert_ok(&withdraw_usdc(&env, &env.alice, "1", 7 * USDC, None).await?);
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0, "everything owed was paid out");
    check_solvency(&env, &["1", "2"], &accts).await?;
    Ok(())
}

// ── M-01: contract-paid storage never comes out of escrow ────────────────────────────────

/// I-M1 slack: the contract's free balance minus everything it owes in NEAR (inside + open NEAR offers + storage
/// credit + NEAR proceeds), from `view_account` and `market_totals`. Negative = I-M1 is broken.
async fn slack(env: &Env) -> Result<i128> {
    let a = env.worker.view_account(env.satchel.id()).await?;
    let free = a.balance.as_yoctonear() as i128 - (a.storage_usage as u128 * STORAGE_BYTE_COST) as i128;
    let t = view(env, "market_totals", json!({})).await?;
    let get = |k: &str| t.get(k).map(num).unwrap_or(0) as i128;
    Ok(free - get("inside_near") - get("offers_near") - get("storage_credit") - get("proceeds_near"))
}

/// Sandbox only (the satchel account still has its key): send the contract's own NEAR away until only ≈ `spare`
/// yocto is left above what it owes. Returns the slack after the drain.
async fn drain_to(env: &Env, spare: u128) -> Result<i128> {
    let s = slack(env).await?;
    assert!(s > spare as i128, "slack {s} is already below {spare}");
    let r = env.satchel.as_account().transfer_near(env.root.id(), NearToken::from_yoctonear(s as u128 - spare)).await?;
    assert!(r.is_success());
    tokio::time::sleep(Duration::from_secs(2)).await;
    let s = slack(env).await?;
    assert!(s > 0 && s <= spare as i128, "drained slack {s}");
    Ok(s)
}

/// Anyone can refill the contract's own buffer with a plain transfer (it needs no key on the receiving side).
async fn top_up(env: &Env, amount: u128) -> Result<()> {
    assert!(env.root.transfer_near(env.satchel.id(), NearToken::from_yoctonear(amount)).await?.is_success());
    tokio::time::sleep(Duration::from_secs(2)).await;
    Ok(())
}

/// M-01, `nft_transfer`. With the buffer drained to ≈ 0.5 mNEAR above escrow, a transfer to an account that never held
/// a Satchel needs ≈ 250 B of new storage. It must be refused (ERR_INSOLVENT) rather than paid out of inside NEAR, so
/// the last yocto inside can still be withdrawn. After anyone tops the buffer up, the same transfer goes through.
#[tokio::test]
async fn m01_transfer_to_new_holder_never_spends_escrow() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 2, ..Default::default() }).await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", 2 * ONE_NEAR).await?);
    let s0 = drain_to(&env, MILLI / 2).await?;
    let dave = sub(&env.root, "dave", 5).await?;
    let u0 = storage_usage(&env, env.satchel.id()).await?;
    let r = transfer(&env, &env.alice, "1", dave.id()).await?;
    let grew = storage_usage(&env, env.satchel.id()).await? as i64 - u0 as i64;
    eprintln!("m01 transfer: slack before {s0}, storage Δ {grew} B, slack after {}, ok {}", slack(&env).await?, r.is_success());
    // whoever holds the token now must be able to take every yocto that is inside it
    let holder = if owner_of(&env, "1").await? == dave.id().as_str() { &dave } else { &env.alice };
    let all = num(&inside(&env, "1").await?["near"]);
    assert_ok(&withdraw_near(&env, holder, "1", all, None).await?);
    check_solvency(&env, &["1", "2"], &[env.alice.id(), env.bob.id(), dave.id()]).await?;
    assert_fails_with(&r, "ERR_INSOLVENT");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string(), "the refused transfer moved nothing");
    // the buffer, not escrow, pays S-02 storage: refill it and the transfer goes through
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    top_up(&env, ONE_NEAR / 10).await?;
    assert_ok(&transfer(&env, &env.alice, "1", dave.id()).await?);
    check_solvency(&env, &["1", "2"], &[env.alice.id(), env.bob.id(), dave.id()]).await?;
    let all = num(&inside(&env, "1").await?["near"]);
    assert_ok(&withdraw_near(&env, &dave, "1", all, None).await?);
    Ok(())
}

/// A sandbox account whose id is the longest NEAR allows (64 chars): the new holder's entries are as large as they get.
async fn long_sub(env: &Env, first: char, near: u128) -> Result<Account> {
    let name = format!("{first}{}", "x".repeat(64 - env.root.id().as_str().len() - 2));
    sub(&env.root, &name, near).await
}

/// M-01, `buy` and USDC `buy` (`execute_sale`). Escrow of every kind is present (inside NEAR, a NEAR offer, storage
/// credit). The seller keeps another Satchel and the buyers have 64-char ids, so each sale grows storage even though
/// it frees the listing. With the buffer drained, the sale is refused with ERR_INSOLVENT (the NEAR price and the USDC
/// come back to the buyer), I-M1 holds, and after a top-up both sales go through.
#[tokio::test]
async fn m01_buy_by_new_holder_never_spends_escrow() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 3, ..Default::default() }).await?;
    let erin = long_sub(&env, 'e', 20).await?;
    let fred = long_sub(&env, 'f', 5).await?;
    ft_register(&env, fred.id()).await?;
    ft_mint(&env, fred.id(), 10 * USDC).await?;
    let accts = [env.alice.id(), env.bob.id(), env.carol.id(), erin.id(), fred.id()];
    let toks = ["1", "2", "3"];
    assert_ok(&deposit_near(&env, &env.bob, "1", 2 * ONE_NEAR).await?);
    prepay(&env, &env.carol, 20 * MILLI).await?;
    make_offer_ok(&env, &env.carol, "3", ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    let lid = list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;

    // NEAR buy
    drain_to(&env, MILLI / 2).await?;
    let e0 = balance(&env, erin.id()).await?;
    let u0 = storage_usage(&env, env.satchel.id()).await?;
    let r = buy(&env, &erin, "1", lid, 0, NearToken::from_yoctonear(ONE_NEAR)).await?;
    let grew = storage_usage(&env, env.satchel.id()).await? as i64 - u0 as i64;
    eprintln!("m01 buy: storage Δ {grew} B, slack after {}, ok {}", slack(&env).await?, r.is_success());
    check_solvency(&env, &toks, &accts).await?;
    assert_fails_with(&r, "ERR_INSOLVENT");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    assert!(e0 - balance(&env, erin.id()).await? < 10 * MILLI, "the price came back (only gas was spent)");
    top_up(&env, ONE_NEAR / 10).await?;
    assert_ok(&buy(&env, &erin, "1", lid, 0, NearToken::from_yoctonear(ONE_NEAR)).await?);
    assert_eq!(owner_of(&env, "1").await?, erin.id().to_string());
    check_solvency(&env, &toks, &accts).await?;

    // USDC buy of token 2 (ft_on_transfer): the refusal panics, so the FT refunds 100 %
    let lid = list_ok(&env, &env.alice, "2", 4 * USDC, "usdc").await?;
    drain_to(&env, MILLI / 2).await?;
    let u0 = storage_usage(&env, env.satchel.id()).await?;
    let r = ft_buy(&env, &fred, 4 * USDC, &buy_msg("2", lid, 0)).await?;
    let grew = storage_usage(&env, env.satchel.id()).await? as i64 - u0 as i64;
    eprintln!("m01 usdc buy: storage Δ {grew} B, slack after {}, used {}", slack(&env).await?, used(&r));
    check_solvency(&env, &toks, &accts).await?;
    assert_eq!(used(&r), 0, "refused → refunded");
    assert!(fail_text(&r).contains("ERR_INSOLVENT"), "{}", fail_text(&r));
    assert_eq!(ft_balance(&env, fred.id()).await?, 10 * USDC);
    top_up(&env, ONE_NEAR / 10).await?;
    assert_eq!(used(&ft_buy(&env, &fred, 4 * USDC, &buy_msg("2", lid, 0)).await?), 4 * USDC);
    assert_eq!(owner_of(&env, "2").await?, fred.id().to_string());
    check_solvency(&env, &toks, &accts).await?;
    Ok(())
}

/// M-01, `accept_offer`. The accept frees the offer record (paid by its offerer) and creates the new holder's entry
/// and, for a seller who never listed or offered, the seller's proceeds slot. Whatever the net storage change, the
/// accept must never leave I-M1 broken; if it needs contract-paid storage the buffer can't cover, it is refused.
#[tokio::test]
async fn m01_accept_by_new_holder_never_spends_escrow() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 2, ..Default::default() }).await?;
    let gina = long_sub(&env, 'g', 20).await?;
    let accts = [env.alice.id(), env.bob.id(), gina.id()];
    assert_ok(&deposit_near(&env, &env.bob, "1", 2 * ONE_NEAR).await?);
    let oid = make_offer_ok(&env, &gina, "1", ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    drain_to(&env, MILLI / 2).await?;
    let u0 = storage_usage(&env, env.satchel.id()).await?;
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?;
    let grew = storage_usage(&env, env.satchel.id()).await? as i64 - u0 as i64;
    eprintln!("m01 accept: storage Δ {grew} B, slack after {}, ok {}", slack(&env).await?, r.is_success());
    tokio::time::sleep(Duration::from_secs(2)).await;
    check_solvency(&env, &["1", "2"], &accts).await?;
    if grew > 0 {
        assert_fails_with(&r, "ERR_INSOLVENT");
    } else {
        assert_ok(&r);
    }
    Ok(())
}

// ── C5 compatibility ─────────────────────────────────────────────────────────────────────

/// accept_offer is an ownership change: it clears every allowance (C5 reset rule) and the old delegate can no longer
/// sign. A delegate never gets inside or offer powers over the owner's token (ERR_NOT_OWNER / ERR_NOT_OFFERER).
#[tokio::test]
async fn offer_accept_clears_allowances_and_delegates_have_no_market_powers() -> Result<()> {
    let env = setup().await?;
    assert_ok(&deposit_near(&env, &env.bob, "1", ONE_NEAR).await?);
    let r = env
        .alice
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": "1", "delegate": env.carol.id(),
                           "caps": [{ "asset": { "evm": { "chain_id": 11155111 } }, "limit": ONE_NEAR.to_string() }] }))
        .deposit(NearToken::from_millinear(10))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    let oid = make_offer_ok(&env, &env.bob, "1", 2 * ONE_NEAR, now_ms(&env).await? + 3_600_000).await?;
    assert_fails_with(&withdraw_near(&env, &env.carol, "1", 1, None).await?, "ERR_NOT_OWNER");
    assert_fails_with(&withdraw_usdc(&env, &env.carol, "1", 1, None).await?, "ERR_NOT_OWNER");
    assert_fails_with(&offer_call(&env, &env.carol, "accept_offer", oid).await?, "ERR_NOT_OWNER");
    assert_fails_with(&offer_call(&env, &env.carol, "cancel_offer", oid).await?, "ERR_NOT_OFFERER");
    let r = offer_call(&env, &env.alice, "accept_offer", oid).await?;
    assert_ok(&r);
    let cleared = events(&r, "allowances_cleared");
    assert_eq!(cleared.len(), 1, "cleared in the accept receipt");
    assert_eq!((cleared[0]["reason"].as_str(), cleared[0]["delegate_ids"].clone()), (Some("sale"), json!([env.carol.id()])));
    assert!(view(&env, "allowances_of", json!({ "token_id": "1" })).await?.as_array().unwrap().is_empty());
    let req = evm_req(&EvmTx::transfer(0).encode());
    assert_fails_with(&sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    Ok(())
}
