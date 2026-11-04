//! USDC sale path via `ft_transfer_call` → `ft_on_transfer` (kb/90 §5.7, §5.12, §12.4 SAT-073):
//! INV-02 (ft buy), INV-16, INV-25 (USDC).

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use serde_json::{Value, json};

const PRICE: u128 = 5_000_000; // 5 USDC (6 decimals)

fn used(r: &near_workspaces::result::ExecutionFinalResult) -> u128 {
    num(&r
        .clone()
        .json::<Value>()
        .expect("ft_transfer_call returns the used amount"))
}

/// Sign once, pass the quiet period, list token 1 for 5 USDC. Returns the listing id.
async fn usdc_listed(env: &Env) -> Result<u64> {
    assert_ok(&sign_and_wait(env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    pass_quiet_period(env, "1").await?;
    list_ok(env, &env.alice, "1", PRICE, "usdc").await
}

/// INV-02 + happy path: the buy succeeds, the tx returns the full price as used, the seller is paid,
/// control moves.
#[tokio::test]
async fn ft_buy_moves_control() -> Result<()> {
    let env = setup().await?;
    let lid = usdc_listed(&env).await?;
    let (c0, a0) = (
        ft_balance(&env, env.carol.id()).await?,
        ft_balance(&env, env.alice.id()).await?,
    );
    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 1)).await?;
    assert_ok(&r);
    assert_eq!(used(&r), PRICE, "SuccessValue = used amount = price");
    assert_eq!(ft_balance(&env, env.carol.id()).await?, c0 - PRICE);
    assert_eq!(
        ft_balance(&env, env.alice.id()).await?,
        a0 + PRICE,
        "seller paid immediately"
    );
    assert_eq!(
        ft_balance(&env, env.satchel.id()).await?,
        0,
        "contract keeps nothing"
    );
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    let sold = events(&r, "sold");
    assert_eq!(sold.len(), 1);
    assert_eq!(sold[0]["currency"], "usdc");
    assert_eq!(num(&sold[0]["price"]), PRICE);
    assert!(satchel_view(&env, "1").await?["listing"].is_null());

    let req = evm_req(&EvmTx::transfer(1).encode());
    assert_fails_with(
        &sign_sync_fail(&env, &env.alice, "1", &req, SignOpts::default_for(1)).await?,
        "ERR_NOT_OWNER",
    );
    assert_ok(&sign_and_wait(&env, &env.carol, "1", &req).await?);
    Ok(())
}

/// INV-16 / SAT-073: every refused buy is a *successful* `ft_transfer_call` that returns "0", the
/// buyer's balance is unchanged and the Satchel state is unchanged.
#[tokio::test]
async fn ft_guards() -> Result<()> {
    let env = setup_with(Opts {
        mint_to_alice: 2,
        ..Default::default()
    })
    .await?;
    let lid = usdc_listed(&env).await?;
    let snapshot = (
        satchel_view(&env, "1").await?,
        sig_records(&env, "1").await?,
    );
    let cases: Vec<(&str, u128, String)> = vec![
        ("ERR_LISTING_CHANGED", PRICE, buy_msg("1", lid + 1, 1)),
        ("ERR_LISTING_CHANGED", PRICE, buy_msg("1", lid, 0)),
        ("ERR_WRONG_AMOUNT", PRICE - 1, buy_msg("1", lid, 1)),
        ("ERR_WRONG_AMOUNT", PRICE + 1, buy_msg("1", lid, 1)),
        ("ERR_BAD_MSG", PRICE, "hello".to_string()),
        ("ERR_BAD_MSG", PRICE, json!({ "buy": {} }).to_string()),
        ("ERR_NOT_LISTED", PRICE, buy_msg("2", 1, 0)),
    ];
    for (code, amount, msg) in cases {
        let c0 = ft_balance(&env, env.carol.id()).await?;
        let r = ft_buy(&env, &env.carol, amount, &msg).await?;
        assert!(
            r.is_success(),
            "{code}: ft_transfer_call itself must succeed: {}",
            fail_text(&r)
        );
        assert_eq!(used(&r), 0, "{code}: SuccessValue must be \"0\" (refunded)");
        assert!(
            fail_text(&r).contains(code),
            "{code}: receiver failure text: {}",
            fail_text(&r)
        );
        assert_eq!(
            ft_balance(&env, env.carol.id()).await?,
            c0,
            "{code}: buyer balance unchanged"
        );
    }
    assert_eq!(
        (
            satchel_view(&env, "1").await?,
            sig_records(&env, "1").await?
        ),
        snapshot
    );
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0);
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    // the correct pair still works afterwards
    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 1)).await?;
    assert_eq!(used(&r), PRICE);
    Ok(())
}

/// INV-16 / SAT-073: a direct `ft_on_transfer` call (predecessor ≠ usdc) fails ERR_WRONG_TOKEN.
#[tokio::test]
async fn direct_call_attack() -> Result<()> {
    let env = setup().await?;
    let lid = usdc_listed(&env).await?;
    let r = env
        .carol
        .call(env.satchel.id(), "ft_on_transfer")
        .args_json(json!({ "sender_id": env.carol.id(), "amount": PRICE.to_string(), "msg": buy_msg("1", lid, 1) }))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_WRONG_TOKEN");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    assert!(!satchel_view(&env, "1").await?["listing"].is_null());
    Ok(())
}

/// INV-16: buying a NEAR-priced listing with USDC → ERR_CURRENCY, full refund.
#[tokio::test]
async fn near_listing_refunds() -> Result<()> {
    let env = setup().await?;
    let lid = list_ok(&env, &env.alice, "1", PRICE, "near").await?;
    let c0 = ft_balance(&env, env.carol.id()).await?;
    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 0)).await?;
    assert!(r.is_success());
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_CURRENCY"), "{}", fail_text(&r));
    assert_eq!(ft_balance(&env, env.carol.id()).await?, c0);
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// INV-16: the seller buying their own listing with USDC → ERR_SELF_BUY, full refund.
#[tokio::test]
async fn ft_self_buy() -> Result<()> {
    let env = setup().await?;
    ft_mint(&env, env.alice.id(), 10_000_000).await?;
    let lid = usdc_listed(&env).await?;
    let a0 = ft_balance(&env, env.alice.id()).await?;
    let r = ft_buy(&env, &env.alice, PRICE, &buy_msg("1", lid, 1)).await?;
    assert!(r.is_success());
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_SELF_BUY"), "{}", fail_text(&r));
    assert_eq!(ft_balance(&env, env.alice.id()).await?, a0);
    Ok(())
}

/// INV-25 (USDC): payout to an unregistered seller fails; the sale completes; proceeds hold the
/// amount; `withdraw_proceeds` pays once the seller registers.
#[tokio::test]
async fn unregistered_seller_recredit() -> Result<()> {
    let env = setup().await?;
    // alice unregisters from the FT (balance 0)
    let r = env
        .alice
        .call(env.usdc.id(), "storage_unregister")
        .args_json(json!({}))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_ok(&r);
    let lid = usdc_listed(&env).await?;
    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 1)).await?;
    assert_ok(&r);
    assert_eq!(used(&r), PRICE, "the sale itself succeeded");
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    let payout = events(&r, "payout");
    assert_eq!(payout.len(), 1);
    assert_eq!(payout[0]["ok"], false);
    assert_eq!(payout[0]["currency"], "usdc");
    let owed = view(&env, "proceeds_of", json!({ "account_id": env.alice.id() })).await?;
    assert_eq!(
        owed,
        json!([{ "currency": "usdc", "amount": PRICE.to_string() }])
    );
    assert_eq!(
        ft_balance(&env, env.satchel.id()).await?,
        PRICE,
        "escrowed in the contract"
    );

    ft_register(&env, env.alice.id()).await?;
    let r = env
        .alice
        .call(env.satchel.id(), "withdraw_proceeds")
        .args_json(json!({ "currency": "usdc" }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert_ok(&r);
    assert_eq!(ft_balance(&env, env.alice.id()).await?, PRICE);
    assert_eq!(ft_balance(&env, env.satchel.id()).await?, 0);
    assert!(
        view(&env, "proceeds_of", json!({ "account_id": env.alice.id() }))
            .await?
            .as_array()
            .unwrap()
            .is_empty()
    );
    Ok(())
}

/// With `usdc: None` USDC listings are refused (ERR_CURRENCY) and any `ft_on_transfer` is refused.
#[tokio::test]
async fn usdc_disabled() -> Result<()> {
    let env = setup_with(Opts {
        usdc_enabled: false,
        fund_usdc: false,
        mint_to_alice: 1,
    })
    .await?;
    assert_fails_with(
        &list(&env, &env.alice, "1", PRICE, "usdc").await?,
        "ERR_CURRENCY",
    );
    assert!(config(&env).await?["usdc_contract_id"].is_null());
    let r = env
        .carol
        .call(env.satchel.id(), "ft_on_transfer")
        .args_json(json!({ "sender_id": env.carol.id(), "amount": "1", "msg": buy_msg("1", 1, 0) }))
        .deposit(NearToken::from_yoctonear(0))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_WRONG_TOKEN");
    Ok(())
}
