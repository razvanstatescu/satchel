//! NEAR sale path (spec §5.7, §5.10, §5.12): INV-02 (buy), 13, 14, 15, 17 (sale side), 25 (NEAR).

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use serde_json::{Value, json};

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;

async fn listings(env: &Env) -> Result<Vec<Value>> {
    Ok(serde_json::from_value(
        view(env, "listings", json!({ "from_index": 0, "limit": 50 })).await?,
    )?)
}

/// Sign once (so `sig_count` = 1), pass the quiet period, list token 1 for `price` NEAR.
async fn signed_and_listed(env: &Env, price: u128) -> Result<u64> {
    assert_ok(&sign_and_wait(env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    pass_quiet_period(env, "1").await?;
    list_ok(env, &env.alice, "1", price, "near").await
}

/// INV-13: `list` fails ERR_QUIET_PERIOD while h < last_sign_height + 250 and succeeds from exactly
/// that height; while listed, `sign_for` → ERR_FROZEN, `nft_transfer` → ERR_LISTED,
/// `list` → ERR_ALREADY_LISTED.
#[tokio::test]
async fn quiet_period_and_freeze() -> Result<()> {
    let env = setup().await?;
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(0).encode()),
        )
        .await?,
    );
    let sv = satchel_view(&env, "1").await?;
    let last = num(&sv["last_sign_height"]) as u64;
    let listable_at = num(&sv["listable_at"]) as u64;
    assert_eq!(
        listable_at,
        last + COOLDOWN_BLOCKS,
        "listable_at = last_sign_height + 250"
    );

    let r = list(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    assert_fails_with(&r, "ERR_QUIET_PERIOD");

    // walk up to the boundary one tx at a time
    let h = height(&env).await?;
    if listable_at > h + 6 {
        env.worker.fast_forward(listable_at - h - 6).await?;
    }
    let mut failures_near_boundary = 0;
    let mut listed = None;
    for _ in 0..20 {
        let r = list(&env, &env.alice, "1", ONE_NEAR, "near").await?;
        let rh = receipt_height(&env, &r, env.satchel.id()).await?;
        if r.is_failure() {
            assert_fails_with(&r, "ERR_QUIET_PERIOD");
            assert!(
                rh < listable_at,
                "list refused at height {rh} ≥ listable_at {listable_at}"
            );
            failures_near_boundary += 1;
        } else {
            assert!(
                rh >= listable_at,
                "list accepted at height {rh} < listable_at {listable_at}"
            );
            listed = Some((r, rh));
            break;
        }
    }
    let (r, rh) = listed.expect("list never succeeded");
    eprintln!(
        "quiet period: {failures_near_boundary} refusals just before {listable_at}; accepted at {rh}"
    );
    assert!(
        rh <= listable_at + 8,
        "accepted too late to show the boundary ({rh} vs {listable_at})"
    );
    let lid: u64 = r.clone().json()?;
    let ev = events(&r, "listed");
    assert_eq!(ev.len(), 1);
    assert_eq!(num(&ev[0]["listing_id"]), lid as u128);
    assert_eq!(num(&ev[0]["sig_count"]), 1);
    let l = &satchel_view(&env, "1").await?["listing"];
    assert_eq!(num(&l["id"]), lid as u128);
    assert_eq!(l["seller"], env.alice.id().to_string());
    assert_eq!(l["currency"], "near");
    assert_eq!(num(&l["price"]), ONE_NEAR);
    assert_eq!(num(&l["listed_at"]), rh as u128);
    assert_eq!(num(&l["sig_count"]), 1);

    // frozen while listed
    let before = mpc_count(&env).await?;
    let r = sign_sync_fail(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(1).encode()),
        SignOpts::default_for(1),
    )
    .await?;
    assert_fails_with(&r, "ERR_FROZEN");
    assert_eq!(mpc_count(&env).await?, before);
    assert_fails_with(
        &transfer(&env, &env.alice, "1", env.bob.id()).await?,
        "ERR_LISTED",
    );
    assert_fails_with(
        &list(&env, &env.alice, "1", ONE_NEAR, "near").await?,
        "ERR_ALREADY_LISTED",
    );
    assert_eq!(sig_count(&env, "1").await?, 1);
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// INV-13, exact boundary: a `list` receipt executing at `listable_at − 1` is refused and one
/// executing at exactly `listable_at` (= last_sign_height + 250) is accepted. Receipt heights are
/// steered with `fast_forward` and the observed submit→execute lag, one sign/list cycle per try.
#[tokio::test]
async fn quiet_period_exact_boundary() -> Result<()> {
    let env = setup().await?;
    let mut lag: u64 = 2;
    let (mut hit_minus1, mut hit_exact) = (false, false);
    let mut seen = vec![];
    for cycle in 0..10u64 {
        assert_ok(
            &sign_and_wait(
                &env,
                &env.alice,
                "1",
                &evm_req(&EvmTx::transfer(cycle).encode()),
            )
            .await?,
        );
        let listable_at = num(&satchel_view(&env, "1").await?["listable_at"]) as u64;
        let target = if hit_minus1 {
            listable_at
        } else {
            listable_at - 1
        };
        // coarse jump (fast_forward overshoots by a few blocks), then wait for natural block
        // production and submit exactly when head + lag == target
        let h = height(&env).await?;
        if target > h + lag + 12 {
            env.worker.fast_forward(target - h - lag - 12).await?;
        }
        let mut hb = height(&env).await?;
        while hb + lag < target {
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            hb = height(&env).await?;
        }
        let r = list(&env, &env.alice, "1", ONE_NEAR, "near").await?;
        let rh = receipt_height(&env, &r, env.satchel.id()).await?;
        lag = rh.saturating_sub(hb).max(1);
        seen.push((rh as i64 - listable_at as i64, r.is_success()));
        if rh < listable_at {
            assert_fails_with(&r, "ERR_QUIET_PERIOD");
            hit_minus1 |= rh == listable_at - 1;
        } else {
            assert!(
                r.is_success(),
                "list at height {rh} ≥ listable_at {listable_at} refused: {}",
                fail_text(&r)
            );
            hit_exact |= rh == listable_at;
            assert_ok(&delist(&env, &env.alice, "1").await?);
        }
        if hit_minus1 && hit_exact {
            break;
        }
    }
    eprintln!("exact boundary attempts (receipt height − listable_at, accepted): {seen:?}");
    assert!(
        hit_minus1,
        "never landed a list receipt at listable_at − 1: {seen:?}"
    );
    assert!(
        hit_exact,
        "never landed a list receipt at exactly listable_at: {seen:?}"
    );
    Ok(())
}

/// Delist: listing cleared, signing resumes at once, a new sign restarts the quiet period, and a
/// relist gets a new, larger listing id.
#[tokio::test]
async fn delist_resumes_signing() -> Result<()> {
    let env = setup().await?;
    let lid = signed_and_listed(&env, ONE_NEAR).await?;
    assert_eq!(listings(&env).await?.len(), 1);
    assert_fails_with(&delist(&env, &env.bob, "1").await?, "ERR_NOT_OWNER");
    let r = delist(&env, &env.alice, "1").await?;
    assert_ok(&r);
    let ev = events(&r, "delisted");
    assert_eq!(ev.len(), 1);
    assert_eq!(num(&ev[0]["listing_id"]), lid as u128);
    assert!(satchel_view(&env, "1").await?["listing"].is_null());
    assert!(listings(&env).await?.is_empty());
    assert_fails_with(&delist(&env, &env.alice, "1").await?, "ERR_NOT_LISTED");

    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(1).encode()),
        )
        .await?,
    );
    assert_eq!(sig_records(&env, "1").await?[1]["status"], "signed");
    assert_fails_with(
        &list(&env, &env.alice, "1", ONE_NEAR, "near").await?,
        "ERR_QUIET_PERIOD",
    );
    pass_quiet_period(&env, "1").await?;
    let lid2 = list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    assert!(lid2 > lid, "listing ids strictly increase ({lid} → {lid2})");
    Ok(())
}

/// INV-14: `buy` succeeds immediately after `list` (no cooldown, no fast-forward).
#[tokio::test]
async fn buy_right_after_list() -> Result<()> {
    let env = setup().await?;
    // never signed → listable at once
    let lid = list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    let r = buy(
        &env,
        &env.carol,
        "1",
        lid,
        0,
        NearToken::from_yoctonear(ONE_NEAR),
    )
    .await?;
    assert_ok(&r);
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    Ok(())
}

/// INV-14: every guard fails with its code, leaves state unchanged and refunds the deposit; after
/// delist + relist the old listing id fails.
#[tokio::test]
async fn buy_guards() -> Result<()> {
    let env = setup_with(Opts {
        mint_to_alice: 3,
        ..Default::default()
    })
    .await?;
    let lid = signed_and_listed(&env, ONE_NEAR).await?;
    let lid2 = list_ok(&env, &env.alice, "2", 5_000_000, "usdc").await?;
    let price = NearToken::from_yoctonear(ONE_NEAR);
    let snapshot = (
        satchel_view(&env, "1").await?,
        sig_records(&env, "1").await?,
    );

    let cases: Vec<(&str, &str, u64, u64, NearToken, bool)> = vec![
        // (code, token, listing_id, expected_sig_count, attached, as_seller)
        ("ERR_LISTING_CHANGED", "1", lid + 100, 1, price, false),
        ("ERR_LISTING_CHANGED", "1", lid, 2, price, false),
        ("ERR_LISTING_CHANGED", "1", lid, 0, price, false),
        (
            "ERR_WRONG_AMOUNT",
            "1",
            lid,
            1,
            NearToken::from_yoctonear(ONE_NEAR - 1),
            false,
        ),
        (
            "ERR_WRONG_AMOUNT",
            "1",
            lid,
            1,
            NearToken::from_yoctonear(ONE_NEAR + 1),
            false,
        ),
        ("ERR_SELF_BUY", "1", lid, 1, price, true),
        (
            "ERR_CURRENCY",
            "2",
            lid2,
            0,
            NearToken::from_yoctonear(5_000_000),
            false,
        ),
        ("ERR_NOT_LISTED", "3", 1, 0, price, false),
    ];
    for (code, tok, l, s, att, as_seller) in cases {
        let who = if as_seller { &env.alice } else { &env.carol };
        let b0 = balance(&env, who.id()).await?;
        let r = buy(&env, who, tok, l, s, att).await?;
        assert_fails_with(&r, code);
        let b1 = balance(&env, who.id()).await?;
        assert!(
            b0 - b1 < NearToken::from_millinear(10).as_yoctonear(),
            "{code}: deposit not refunded ({} yocto lost)",
            b0 - b1
        );
    }
    // a token that doesn't exist: spec §5.7 lists ERR_NOT_LISTED first, §5.15 says ERR_TOKEN_NOT_FOUND
    // applies to all token methods; either is acceptable
    let r = buy(&env, &env.carol, "99", 1, 0, price).await?;
    assert_fails_with_any(&r, &["ERR_NOT_LISTED", "ERR_TOKEN_NOT_FOUND"]);
    assert_eq!(
        (
            satchel_view(&env, "1").await?,
            sig_records(&env, "1").await?
        ),
        snapshot,
        "state unchanged"
    );
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());

    // delist + relist → the old listing id is dead
    assert_ok(&delist(&env, &env.alice, "1").await?);
    let lid3 = list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    assert_fails_with(
        &buy(&env, &env.carol, "1", lid, 1, price).await?,
        "ERR_LISTING_CHANGED",
    );
    assert_ok(&buy(&env, &env.carol, "1", lid3, 1, price).await?);
    Ok(())
}

/// INV-15: a successful buy moves the token, clears the listing and the index, pays the seller
/// exactly `price` and leaves the records untouched.
#[tokio::test]
async fn buy_happy_path() -> Result<()> {
    let env = setup().await?;
    let price = 2 * ONE_NEAR;
    let lid = signed_and_listed(&env, price).await?;
    let recs = sig_records(&env, "1").await?;
    let seller0 = settled_balance(&env, env.alice.id()).await?;
    let r = buy(
        &env,
        &env.carol,
        "1",
        lid,
        1,
        NearToken::from_yoctonear(price),
    )
    .await?;
    assert_ok(&r);
    let seller1 = settled_balance(&env, env.alice.id()).await?;
    assert_eq!(seller1 - seller0, price, "seller paid exactly the price");
    let receipts =
        rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, env.carol.id()).await?;
    assert_eq!(
        rpc::transfers(&receipts, env.satchel.id(), env.alice.id()),
        vec![price]
    );

    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    let sv = satchel_view(&env, "1").await?;
    assert!(sv["listing"].is_null());
    assert_eq!(sv["owner_id"], env.carol.id().to_string());
    assert!(listings(&env).await?.is_empty());
    assert_eq!(
        sig_records(&env, "1").await?,
        recs,
        "records untouched by the sale"
    );

    let sold = events(&r, "sold");
    assert_eq!(sold.len(), 1);
    assert_eq!(sold[0]["token_id"], "1");
    assert_eq!(num(&sold[0]["listing_id"]), lid as u128);
    assert_eq!(sold[0]["seller_id"], env.alice.id().to_string());
    assert_eq!(sold[0]["buyer_id"], env.carol.id().to_string());
    assert_eq!(num(&sold[0]["price"]), price);
    assert_eq!(sold[0]["currency"], "near");
    let nft = events_in(
        r.logs().iter().map(|s| s.to_string()),
        "nep171",
        "nft_transfer",
    );
    assert_eq!(nft.len(), 1);
    assert_eq!(nft[0]["memo"], "sale");
    let payout = events(&r, "payout");
    assert_eq!(payout.len(), 1);
    assert_eq!(payout[0]["ok"], true);
    assert!(
        view(&env, "proceeds_of", json!({ "account_id": env.alice.id() }))
            .await?
            .as_array()
            .unwrap()
            .is_empty()
    );
    Ok(())
}

/// INV-02 (buy): after a sale the seller can no longer sign; the buyer can.
#[tokio::test]
async fn buy_moves_control() -> Result<()> {
    let env = setup().await?;
    let lid = signed_and_listed(&env, ONE_NEAR).await?;
    assert_ok(
        &buy(
            &env,
            &env.carol,
            "1",
            lid,
            1,
            NearToken::from_yoctonear(ONE_NEAR),
        )
        .await?,
    );
    let req = evm_req(&EvmTx::transfer(1).encode());
    assert_fails_with(
        &sign_sync_fail(&env, &env.alice, "1", &req, SignOpts::default_for(1)).await?,
        "ERR_NOT_OWNER",
    );
    let r = sign_and_wait(&env, &env.carol, "1", &req).await?;
    assert_ok(&r);
    assert_eq!(
        sig_records(&env, "1").await?[1]["requester"],
        env.carol.id().to_string()
    );
    Ok(())
}

/// INV-25 (NEAR): the payout to a deleted seller fails, the sale still completes, the amount is
/// credited to `proceeds`, and `withdraw_proceeds` pays it once the seller exists again.
#[tokio::test]
async fn payout_failure_recredit() -> Result<()> {
    let env = setup().await?;
    let seller = sub(&env.root, "seller", 10).await?;
    let id = mint(&env, &seller, seller.id()).await?;
    let price = 3 * ONE_NEAR;
    let lid = list_ok(&env, &seller, &id, price, "near").await?;
    seller
        .clone()
        .delete_account(env.root.id())
        .await?
        .into_result()?;
    assert!(
        env.worker.view_account(seller.id()).await.is_err(),
        "seller deleted"
    );

    let r = buy(
        &env,
        &env.carol,
        &id,
        lid,
        0,
        NearToken::from_yoctonear(price),
    )
    .await?;
    assert_ok(&r);
    assert_eq!(owner_of(&env, &id).await?, env.carol.id().to_string());
    let payout = events(&r, "payout");
    assert_eq!(payout.len(), 1);
    assert_eq!(payout[0]["ok"], false);
    let owed = view(&env, "proceeds_of", json!({ "account_id": seller.id() })).await?;
    assert_eq!(
        owed,
        json!([{ "currency": "near", "amount": price.to_string() }])
    );

    // the seller comes back (new key, same id) and withdraws
    let seller = sub(&env.root, "seller", 1).await?;
    let w = |s: near_workspaces::Account, dep: u128| {
        let id = env.satchel.id().clone();
        async move {
            s.call(&id, "withdraw_proceeds")
                .args_json(json!({ "currency": "near" }))
                .deposit(NearToken::from_yoctonear(dep))
                .gas(Gas::from_tgas(50))
                .transact()
                .await
        }
    };
    assert_fails_with(&w(seller.clone(), 0).await?, "ERR_DEPOSIT");
    let r = w(seller.clone(), 1).await?;
    assert_ok(&r);
    let receipts =
        rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, seller.id()).await?;
    assert_eq!(
        rpc::transfers(&receipts, env.satchel.id(), seller.id()),
        vec![price]
    );
    assert!(
        view(&env, "proceeds_of", json!({ "account_id": seller.id() }))
            .await?
            .as_array()
            .unwrap()
            .is_empty()
    );
    assert_fails_with(&w(seller.clone(), 1).await?, "ERR_NOTHING_OWED");
    Ok(())
}

/// INV-17 (sale side): `list`, `delist`, `withdraw_proceeds` with 0 deposit fail.
#[tokio::test]
async fn zero_deposit_rejected() -> Result<()> {
    let env = setup().await?;
    let zero = NearToken::from_yoctonear(0);
    let r = env
        .alice
        .call(env.satchel.id(), "list")
        .args_json(json!({ "token_id": "1", "price": "1", "currency": "near" }))
        .deposit(zero)
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    let r = env
        .alice
        .call(env.satchel.id(), "delist")
        .args_json(json!({ "token_id": "1" }))
        .deposit(zero)
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    let r = env
        .alice
        .call(env.satchel.id(), "withdraw_proceeds")
        .args_json(json!({ "currency": "near" }))
        .deposit(zero)
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert!(
        !satchel_view(&env, "1").await?["listing"].is_null(),
        "still listed"
    );
    Ok(())
}

/// `list` preconditions: token exists, owner, price > 0, storage deposit.
#[tokio::test]
async fn list_guards() -> Result<()> {
    let env = setup().await?;
    assert_fails_with(
        &list(&env, &env.alice, "99", ONE_NEAR, "near").await?,
        "ERR_TOKEN_NOT_FOUND",
    );
    assert_fails_with(
        &list(&env, &env.bob, "1", ONE_NEAR, "near").await?,
        "ERR_NOT_OWNER",
    );
    assert_fails_with(&list(&env, &env.alice, "1", 0, "near").await?, "ERR_PRICE");
    let r = env
        .alice
        .call(env.satchel.id(), "list")
        .args_json(json!({ "token_id": "1", "price": "1", "currency": "near" }))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert!(satchel_view(&env, "1").await?["listing"].is_null());
    let lid = list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    let ls = listings(&env).await?;
    assert_eq!(ls.len(), 1);
    assert_eq!(ls[0]["token_id"], "1");
    assert_eq!(num(&ls[0]["listing"]["id"]), lid as u128);
    Ok(())
}
