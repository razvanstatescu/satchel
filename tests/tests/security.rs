//! Adversarial review, sandbox part (docs/security/contract-review.md).
//!
//! - `s01_*` is the S-01 **proof**: it asserts the recommended behaviour. It failed against the pre-fix wasm
//!   (`bec41e44…`) and passes since the fix pass (the proceeds slot is reserved at `list` time).
//! - `fix_*` tests check the other fixes end to end (S-03, S-04, S-05, S-06/S-09).
//! - The other tests are **measurements / guards** and print the numbers the review cites.

mod common;

use anyhow::{Result, ensure};
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use serde_json::{Value, json};
use std::time::Duration;

const PRICE: u128 = 5_000_000; // 5 USDC

/// The contract's free balance: amount − storage stake.
async fn liquid(env: &Env) -> Result<i128> {
    let a = env.worker.view_account(env.satchel.id()).await?;
    Ok(a.balance.as_yoctonear() as i128 - (a.storage_usage as u128 * STORAGE_BYTE_COST) as i128)
}

/// Bring the contract's free balance down to about `target` yocto with its own (sandbox-only) key. This stands in for
/// S-02 storage griefing or plain neglect of the 5 NEAR liquidity floor on the locked contract.
async fn drain_to(env: &Env, target: u128) -> Result<i128> {
    let mut margin: u128 = 1_000_000_000_000_000_000_000; // 0.001 NEAR for the tx fee (charged up front)
    for _ in 0..12 {
        let l = liquid(env).await?;
        if l <= (target + target / 2) as i128 {
            break;
        }
        let amount = (l as u128).saturating_sub(target + margin);
        if amount == 0 {
            margin /= 2;
            continue;
        }
        let sent = env
            .satchel
            .as_account()
            .transfer_near(env.root.id(), NearToken::from_yoctonear(amount))
            .await;
        match sent {
            Ok(r) if r.is_success() => margin = margin / 2 + 1,
            _ => margin *= 2, // the up-front fee would have dipped below the storage stake: retry with more room
        }
        tokio::time::sleep(Duration::from_millis(2500)).await; // let the gas refund land
    }
    liquid(env).await
}

fn receipt_on<'a>(r: &'a ExecutionFinalResult, env: &Env, needle: &str) -> Option<(u64, Vec<String>)> {
    r.receipt_outcomes()
        .iter()
        .find(|o| &o.executor_id == env.satchel.id() && o.logs.iter().any(|l| l.contains(needle)))
        .map(|o| (o.gas_burnt.as_gas(), o.logs.clone()))
}

/// S-01 (proof): a sale whose payout fails must never leave the price orphaned. Before the fix pass the re-credit was
/// written in `on_payout`, a separate receipt that needed contract-funded storage (≈ 77 B per (seller, currency)).
/// With the contract's free balance below that, `on_payout` failed with LackBalanceForState after the sale had
/// completed: the buyer had the NFT, the USDC sat in the contract, and nothing recorded that the seller was owed it.
/// The locked contract has no admin or sweep, so the money would be lost for good.
/// Expected (and now true): the sale either credits the seller or does not happen. The fix reserves the proceeds
/// slot at `list` time, so `on_payout` only overwrites a fixed-size value, like `on_signed`.
#[tokio::test]
async fn s01_failed_payout_is_never_orphaned_when_contract_balance_is_low() -> Result<()> {
    let env = setup().await?;
    mint(&env, &env.alice, env.alice.id()).await?; // token 2: alice's per-owner set survives the sale
    let r = env
        .alice
        .call(env.usdc.id(), "storage_unregister")
        .args_json(json!({}))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_ok(&r); // the seller can no longer receive USDC → the payout will fail
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    pass_quiet_period(&env, "1").await?;
    let lid = list_ok(&env, &env.alice, "1", PRICE, "usdc").await?;

    let target = 10_000_000_000_000_000_000; // 0.00001 NEAR free (on_payout needs ≈ 0.00077 NEAR for its new entry)
    let l0 = drain_to(&env, target).await?;
    println!("contract free balance before the buy: {l0} yocto");
    let carol0 = ft_balance(&env, env.carol.id()).await?;

    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 1)).await?;
    println!("ft_transfer_call ok = {}; receipt failures: {}", r.is_success(), fail_text(&r));
    if let Some((gas, _)) = receipt_on(&r, &env, "\"event\":\"sold\"") {
        println!("sale receipt burnt {:.2} Tgas", gas as f64 / 1e12);
    }
    println!("contract free balance after: {} yocto", liquid(&env).await?);

    let sold = owner_of(&env, "1").await? == env.carol.id().to_string();
    let owed = view(&env, "proceeds_of", json!({ "account_id": env.alice.id() })).await?;
    let credited = owed == json!([{ "currency": "usdc", "amount": PRICE.to_string() }]);
    let escrow = ft_balance(&env, env.satchel.id()).await?;
    let buyer_refunded = ft_balance(&env, env.carol.id()).await? == carol0;
    println!("sold={sold} credited={credited} escrow={escrow} buyer_refunded={buyer_refunded} proceeds_of={owed}");
    assert!(
        !sold || credited,
        "S-01: the NFT was sold and {escrow} USDC sits in the contract, but proceeds_of(seller) = {owed}: the price is orphaned"
    );
    assert!(sold || buyer_refunded, "a reverted sale must refund the buyer");
    Ok(())
}

/// S-02 (measurement): ownership changes grow storage that the contract pays for (NEP-171 transfers carry 1 yocto).
/// Prints the contract-paid bytes for a transfer to a fresh 64-hex implicit id while the sender keeps another token,
/// next to the bytes a minter pays, so the griefing cost ratio in the review can be checked.
#[tokio::test]
async fn s02_contract_pays_storage_for_new_holders() -> Result<()> {
    let env = setup_with(Opts { usdc_enabled: false, fund_usdc: false, mint_to_alice: 2 }).await?;
    let s0 = storage_usage(&env, env.satchel.id()).await?;
    mint(&env, &env.alice, env.alice.id()).await?; // token 3
    let mint_bytes = storage_usage(&env, env.satchel.id()).await? - s0;

    let fresh: near_workspaces::AccountId = "5a".repeat(32).parse()?; // implicit id, never created
    let s1 = storage_usage(&env, env.satchel.id()).await?;
    let l1 = liquid(&env).await?;
    assert_ok(&transfer(&env, &env.alice, "1", &fresh).await?);
    let s2 = storage_usage(&env, env.satchel.id()).await?;
    let paid = s2 as i64 - s1 as i64;
    println!(
        "mint (paid by the minter): {mint_bytes} B; nft_transfer to a fresh 64-char holder (paid by the contract): {paid} B \
         = {} yocto; contract free balance {l1} → {}",
        paid as i128 * STORAGE_BYTE_COST as i128,
        liquid(&env).await?
    );
    ensure!(paid > 0, "expected contract-funded growth");
    ensure!((paid as u64) < mint_bytes, "contract-paid growth per holder should stay below the minter's cost");
    // a nonexistent account now owns token 1 (no existence check on the receiver: S-09)
    assert_eq!(owner_of(&env, "1").await?, fresh.to_string());
    Ok(())
}

/// Measurement for S-01's second trigger: gas burnt by `on_payout` in the re-credit path vs its static gas
/// (raised from 5 to 10 Tgas by the fix pass).
#[tokio::test]
async fn on_payout_recredit_gas_margin() -> Result<()> {
    let env = setup().await?;
    let r = env
        .alice
        .call(env.usdc.id(), "storage_unregister")
        .args_json(json!({}))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_ok(&r);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    pass_quiet_period(&env, "1").await?;
    let lid = list_ok(&env, &env.alice, "1", PRICE, "usdc").await?;
    let r = ft_buy(&env, &env.carol, PRICE, &buy_msg("1", lid, 1)).await?;
    assert_ok(&r);
    let (gas, logs) = receipt_on(&r, &env, "\"event\":\"payout\"").expect("on_payout receipt");
    let ev: Vec<Value> = events_in(logs.into_iter(), "satchel", "payout");
    assert_eq!(ev[0]["ok"], false, "the payout failed and was re-credited");
    println!("on_payout (re-credit path) burnt {:.3} Tgas of the 10 Tgas static (incl. receipt exec fees)", gas as f64 / 1e12);
    ensure!(gas < Gas::from_tgas(5).as_gas(), "unexpectedly heavy on_payout: the 10 Tgas static should keep a ≥ 2× margin");
    Ok(())
}

// ── fix pass (2026-10-23): end-to-end checks of the other fixes ─────────────────────────────

/// S-03: `delist` and `withdraw_proceeds` refuse anything but exactly 1 yocto; nothing changes on a refusal.
#[tokio::test]
async fn fix_s03_exactly_one_yocto() -> Result<()> {
    let env = setup().await?;
    let lid = list_ok(&env, &env.alice, "1", 1_000, "near").await?;
    let r = env
        .alice
        .call(env.satchel.id(), "delist")
        .args_json(json!({ "token_id": "1" }))
        .deposit(NearToken::from_yoctonear(2))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert_eq!(satchel_view(&env, "1").await?["listing"]["id"], json!(lid), "still listed");
    assert_ok(&delist(&env, &env.alice, "1").await?);
    let r = env
        .alice
        .call(env.satchel.id(), "withdraw_proceeds")
        .args_json(json!({ "currency": "near" }))
        .deposit(NearToken::from_millinear(100))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    Ok(())
}

/// S-04 / D-43: the nonce-gap rule on the deployed wasm. A refused request writes no record and calls no MPC.
#[tokio::test]
async fn fix_s04_nonce_gap_rule() -> Result<()> {
    let env = setup().await?;
    let refused = |r: &ExecutionFinalResult| assert_fails_with(r, "ERR_EVM_NONCE_GAP");
    let before = mpc_count(&env).await?;
    refused(&sign_sync_fail(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(2).encode()), SignOpts::default_for(1)).await?);
    let poison = sign_sync_fail(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(u64::MAX - 1).encode()), SignOpts::default_for(1)).await?;
    refused(&poison);
    assert_eq!((sig_count(&env, "1").await?, mpc_count(&env).await?), (0, before), "refusals change nothing");
    // demo #4's record: nonce = current + 1 on a never-sent address
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(1).encode())).await?);
    refused(&sign_sync_fail(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(3).encode()), SignOpts::default_for(1)).await?);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(2).encode())).await?);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    // the maximum belongs to the token: the next owner continues from it
    assert_ok(&transfer(&env, &env.alice, "1", env.bob.id()).await?);
    refused(&sign_sync_fail(&env, &env.bob, "1", &evm_req(&EvmTx::transfer(4).encode()), SignOpts::default_for(1)).await?);
    assert_ok(&sign_and_wait(&env, &env.bob, "1", &evm_req(&EvmTx::transfer(3).encode())).await?);
    assert_eq!(sig_count(&env, "1").await?, 4);
    Ok(())
}

/// S-06 / S-09: `nft_mint` and `nft_transfer` refuse the contract itself, the MPC and the configured USDC contract.
#[tokio::test]
async fn fix_s06_s09_receiver_guard() -> Result<()> {
    let env = setup().await?;
    let total = view(&env, "nft_total_supply", json!({})).await?;
    for to in [env.satchel.id(), env.mpc.id(), env.usdc.id()] {
        let r = env
            .alice
            .call(env.satchel.id(), "nft_mint")
            .args_json(json!({ "receiver_id": to }))
            .deposit(MINT_DEPOSIT)
            .gas(Gas::from_tgas(30))
            .transact()
            .await?;
        assert_fails_with(&r, "ERR_BAD_RECEIVER");
        assert_fails_with(&transfer(&env, &env.alice, "1", to).await?, "ERR_BAD_RECEIVER");
    }
    assert_eq!(view(&env, "nft_total_supply", json!({})).await?, total, "nothing was minted");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// S-05: with more than MAX_PAGE (50) tokens, `nft_tokens` / `nft_tokens_for_owner` without a limit return one page.
#[tokio::test]
async fn fix_s05_nep181_views_are_paged() -> Result<()> {
    let env = setup().await?;
    // 3 batches of 17 mints (15 Tgas each) push the supply past 50
    for _ in 0..3 {
        let mut b = env.alice.batch(env.satchel.id());
        for _ in 0..17 {
            b = b.call(
                near_workspaces::operations::Function::new("nft_mint")
                    .args_json(json!({ "receiver_id": env.alice.id() }))
                    .deposit(MINT_DEPOSIT)
                    .gas(Gas::from_tgas(15)),
            );
        }
        assert_ok(&b.transact().await?);
    }
    let total: u64 = view(&env, "nft_total_supply", json!({})).await?.as_str().unwrap_or("0").parse()?;
    ensure!(total > 50, "supply {total}");
    let all = view(&env, "nft_tokens", json!({})).await?;
    let mine = view(&env, "nft_tokens_for_owner", json!({ "account_id": env.alice.id(), "limit": 1000 })).await?;
    assert_eq!((all.as_array().unwrap().len(), mine.as_array().unwrap().len()), (50, 50));
    let rest = view(&env, "nft_tokens", json!({ "from_index": "50" })).await?;
    assert_eq!(rest.as_array().unwrap().len() as u64, total - 50);
    Ok(())
}
