//! Ownership paths (kb/90 §5.11): INV-02 (transfer), 03, 05, 11 (survive transfer), 17 (1 yocto), 28, 30.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use serde_json::{Value, json};
use std::time::Duration;

/// INV-02: after `nft_transfer`, the previous owner's `sign_for` fails and the new owner's succeeds.
#[tokio::test]
async fn transfer_moves_control() -> Result<()> {
    let env = setup().await?;
    assert_ok(&transfer(&env, &env.alice, "1", env.bob.id()).await?);
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    let req = evm_req(&EvmTx::transfer(0).encode());
    let r = sign_sync_fail(&env, &env.alice, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    assert_eq!(mpc_count(&env).await?, 0);
    let r = sign_and_wait(&env, &env.bob, "1", &req).await?;
    assert_ok(&r);
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["requester"], env.bob.id().to_string());
    assert_eq!(rec["status"], "signed");
    Ok(())
}

/// INV-03: NEP-178 is absent; a third party's `nft_transfer` fails ERR_NOT_OWNER (wrapper check).
#[tokio::test]
async fn no_approvals_surface() -> Result<()> {
    let env = setup().await?;
    let tok = view(&env, "nft_token", json!({ "token_id": "1" })).await?;
    assert!(
        tok.get("approved_account_ids")
            .map(|v| v.is_null())
            .unwrap_or(true),
        "approved_account_ids must be null/absent: {tok}"
    );
    let r = env
        .alice
        .call(env.satchel.id(), "nft_approve")
        .args_json(json!({ "token_id": "1", "account_id": env.carol.id() }))
        .deposit(NearToken::from_millinear(10))
        .transact()
        .await?;
    assert_fails_with(&r, "MethodNotFound");
    let r = env
        .alice
        .call(env.satchel.id(), "nft_revoke_all")
        .args_json(json!({ "token_id": "1" }))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_fails_with(&r, "MethodNotFound");
    let r = transfer(&env, &env.carol, "1", env.carol.id()).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    let r = env
        .carol
        .call(env.satchel.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.carol.id(), "token_id": "1", "approval_id": 0 }))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// INV-05: `nft_transfer_call` always fails ERR_TRANSFER_CALL_DISABLED and changes nothing.
#[tokio::test]
async fn transfer_call_disabled() -> Result<()> {
    let env = setup().await?;
    let r = env
        .alice
        .call(env.satchel.id(), "nft_transfer_call")
        .args_json(json!({ "receiver_id": env.bob.id(), "token_id": "1", "msg": "" }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_TRANSFER_CALL_DISABLED");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// INV-11: records, sig_count and last_sign_height are unchanged by a transfer (history belongs to
/// the token).
#[tokio::test]
async fn records_survive_transfer() -> Result<()> {
    let env = setup().await?;
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &BtcTx::new(2, 1).req()).await?);
    let before = sig_records(&env, "1").await?;
    let sv = satchel_view(&env, "1").await?;
    assert_ok(&transfer(&env, &env.alice, "1", env.bob.id()).await?);
    assert_eq!(sig_records(&env, "1").await?, before);
    let sv2 = satchel_view(&env, "1").await?;
    assert_eq!(sv2["sig_count"], sv["sig_count"]);
    assert_eq!(sv2["last_sign_height"], sv["last_sign_height"]);
    assert_eq!(sv2["owner_id"], env.bob.id().to_string());
    // and the next record continues the same log
    assert_ok(&sign_and_wait(&env, &env.bob, "1", &evm_req(&EvmTx::transfer(0).encode())).await?);
    let after = sig_records(&env, "1").await?;
    assert_eq!(&after[..2], &before[..]);
    assert_eq!(num(&after[2]["seq"]), 2);
    Ok(())
}

/// INV-28: a transfer while a sign is in flight succeeds (D-08); the record stays and `on_signed`
/// still resolves it afterwards.
#[tokio::test]
async fn transfer_during_inflight_sign() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "manual").await?;
    let st = start_sign(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
    )
    .await?;
    wait_mpc_pending(&env, 1).await?;
    assert_ok(&transfer(&env, &env.alice, "1", env.bob.id()).await?);
    mpc_respond_valid(&env, 0).await?;
    let r = wait_resolved(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["status"], "signed");
    assert_eq!(
        rec["requester"],
        env.alice.id().to_string(),
        "requester = owner at request time"
    );
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    Ok(())
}

/// INV-30: `nft_transfer` to the contract itself or to the MPC account fails ERR_BAD_RECEIVER and
/// changes nothing (R-18).
#[tokio::test]
async fn bad_receivers() -> Result<()> {
    let env = setup().await?;
    for to in [env.satchel.id(), env.mpc.id()] {
        let r = transfer(&env, &env.alice, "1", to).await?;
        assert_fails_with(&r, "ERR_BAD_RECEIVER");
    }
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    let r = transfer(&env, &env.alice, "1", env.alice.id()).await?;
    assert!(
        r.is_failure(),
        "self-transfer must fail (standard: owners must differ)"
    );
    Ok(())
}

/// INV-17: `nft_transfer` requires exactly 1 yocto.
#[tokio::test]
async fn transfer_exactly_one_yocto() -> Result<()> {
    let env = setup().await?;
    for dep in [0u128, 2] {
        let r = env
            .alice
            .call(env.satchel.id(), "nft_transfer")
            .args_json(json!({ "receiver_id": env.bob.id(), "token_id": "1" }))
            .deposit(NearToken::from_yoctonear(dep))
            .transact()
            .await?;
        assert_fails_with(&r, "Requires attached deposit of exactly 1 yoctoNEAR");
    }
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    let r = transfer(&env, &env.alice, "9", env.bob.id()).await?;
    assert_fails_with(&r, "ERR_TOKEN_NOT_FOUND");
    let ev: Vec<Value> = events_in(
        transfer(&env, &env.alice, "1", env.bob.id())
            .await?
            .logs()
            .iter()
            .map(|s| s.to_string()),
        "nep171",
        "nft_transfer",
    );
    assert_eq!(ev.len(), 1, "standard nep171 nft_transfer event");
    Ok(())
}
