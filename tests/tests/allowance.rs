//! C5 spending allowance (docs/specs/C5.md) end to end on the sandbox with the mock signer: a delegate signs within
//! its caps (recorded before the MPC call, `requester` = the delegate), is refused over them with nothing written,
//! has no owner powers, is paused while listed, and loses everything on transfer and on both sale paths.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::Account;
use serde_json::{Value, json};

const SET_DEPOSIT: NearToken = NearToken::from_millinear(10);
const KB_DEBIT: u128 = 100_000_000_000_000 + 21_000 * 200_028; // KB_EVM_TX: value + gas × max_fee

fn evm_cap(limit: u128) -> Value {
    json!({ "asset": { "evm": { "chain_id": SEPOLIA } }, "limit": limit.to_string() })
}

async fn set_allowance(env: &Env, who: &Account, delegate: &Account, caps: Value, expires_at_ms: Option<u64>) -> Result<near_workspaces::result::ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": "1", "delegate": delegate.id(), "caps": caps, "expires_at_ms": expires_at_ms }))
        .deposit(SET_DEPOSIT)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn revoke(env: &Env, who: &Account, delegate: &Account, deposit: NearToken) -> Result<near_workspaces::result::ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "revoke_allowance")
        .args_json(json!({ "token_id": "1", "delegate": delegate.id() }))
        .deposit(deposit)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

async fn allowance(env: &Env, delegate: &Account) -> Result<Value> {
    view(env, "allowance", json!({ "token_id": "1", "delegate": delegate.id() })).await
}

/// Owner sets an allowance; the delegate signs within it through the real fan-out; the record and the MPC request
/// are exactly an owner's, except `requester`; the view shows what is left; `allowance_spent` names the delegate.
#[tokio::test]
async fn delegate_signs_within_cap() -> Result<()> {
    let env = setup().await?;
    let r = set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(2 * KB_DEBIT)]), None).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowance_set")[0]["delegate_id"], env.carol.id().to_string());

    let r = sign_and_wait(&env, &env.carol, "1", &evm_req(&unhex(KB_EVM_TX))).await?;
    assert_ok(&r);
    let spent = &events(&r, "allowance_spent")[0];
    assert_eq!(spent["delegate_id"], env.carol.id().to_string());
    assert_eq!(spent["owner_id"], env.alice.id().to_string());
    assert_eq!(spent["debits"], json!([{ "asset": { "evm": { "chain_id": SEPOLIA } }, "amount": KB_DEBIT.to_string() }]));
    assert_eq!(events(&r, "sign_requested")[0]["owner_id"], env.alice.id().to_string());

    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["requester"], env.carol.id().to_string());
    assert_eq!(rec["status"], "signed");
    assert_eq!(rec["payload"], KB_EVM_HASH);
    // INV-06 unchanged: the MPC sees the contract as predecessor and the token's path
    let reqs = mpc_requests(&env).await?;
    assert_eq!(reqs.len(), 1);
    assert_eq!(reqs[0]["predecessor"], env.satchel.id().to_string());
    assert_eq!(reqs[0]["path"], "satchel/1/evm");

    let a = allowance(&env, &env.carol).await?;
    assert_eq!(a["status"], "active");
    assert_eq!(a["caps"][0]["remaining"], KB_DEBIT.to_string());
    assert_eq!(a["spends_in_window"], 1);
    let all: Vec<Value> = serde_json::from_value(view(&env, "allowances_of", json!({ "token_id": "1" })).await?)?;
    assert_eq!(all.len(), 1);
    // the quiet period counts delegated signatures too
    let s = satchel_view(&env, "1").await?;
    assert!(num(&s["listable_at"]) > 0);
    Ok(())
}

/// Over the cap, without a cap for the asset, expired, revoked or a stranger: refused before anything is written
/// (no record, no MPC call).
#[tokio::test]
async fn delegate_refusals_change_nothing() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(KB_DEBIT - 1)]), None).await?);
    let req = evm_req(&unhex(KB_EVM_TX));
    let r = sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_ALLOWANCE_EXCEEDED");
    let r = sign_sync_fail(&env, &env.carol, "1", &sol_req(&sol_message(1_000, [7; 32])), SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_ALLOWANCE_ASSET");
    let r = sign_sync_fail(&env, &env.bob, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    // revoke (exactly 1 yocto), then the delegate is a stranger
    assert_fails_with(&revoke(&env, &env.alice, &env.carol, NearToken::from_yoctonear(2)).await?, "ERR_DEPOSIT");
    assert_fails_with(&revoke(&env, &env.carol, &env.carol, YOCTO).await?, "ERR_NOT_OWNER");
    let r = revoke(&env, &env.alice, &env.carol, YOCTO).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowance_revoked").len(), 1);
    assert!(allowance(&env, &env.carol).await?.is_null());
    let r = sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    assert_fails_with(&revoke(&env, &env.alice, &env.carol, YOCTO).await?, "ERR_ALLOWANCE_NOT_FOUND");
    // expiry: set it a few seconds ahead of the chain clock, then fast-forward past it
    let ts = env.worker.view_block().await?.timestamp() / 1_000_000;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(10 * KB_DEBIT)]), Some(ts + 3_000)).await?);
    let mut waited = 0;
    while env.worker.view_block().await?.timestamp() / 1_000_000 < ts + 3_000 {
        env.worker.fast_forward(10).await?;
        waited += 1;
        anyhow::ensure!(waited < 200, "the sandbox clock never passed the expiry");
    }
    let r = sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_ALLOWANCE_EXPIRED");
    assert_eq!(allowance(&env, &env.carol).await?["status"], "expired");

    assert_eq!(sig_count(&env, "1").await?, 0);
    assert_eq!(mpc_count(&env).await?, 0);
    Ok(())
}

/// A delegate has no owner powers: list, delist, nft_transfer, set/revoke_allowance → ERR_NOT_OWNER;
/// withdraw_proceeds only ever pays the caller's own (empty) proceeds.
#[tokio::test]
async fn delegate_has_no_owner_powers() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(KB_DEBIT)]), None).await?);
    assert_fails_with(&list(&env, &env.carol, "1", 1_000, "near").await?, "ERR_NOT_OWNER");
    assert_fails_with(&transfer(&env, &env.carol, "1", env.carol.id()).await?, "ERR_NOT_OWNER");
    assert_fails_with(&set_allowance(&env, &env.carol, &env.bob, json!([evm_cap(1)]), None).await?, "ERR_NOT_OWNER");
    let r = env
        .carol
        .call(env.satchel.id(), "withdraw_proceeds")
        .args_json(json!({ "currency": "near" }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_NOTHING_OWED");
    list_ok(&env, &env.alice, "1", 1_000, "near").await?;
    assert_fails_with(&delist(&env, &env.carol, "1").await?, "ERR_NOT_OWNER");
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// Listing pauses delegated signing (ERR_FROZEN, view "paused"); delist resumes it with the same budget.
#[tokio::test]
async fn listing_pauses_delegate() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(KB_DEBIT)]), None).await?);
    list_ok(&env, &env.alice, "1", 1_000, "near").await?;
    let req = evm_req(&unhex(KB_EVM_TX));
    let r = sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_FROZEN");
    assert_eq!(allowance(&env, &env.carol).await?["status"], "paused");
    assert_ok(&delist(&env, &env.alice, "1").await?);
    assert_ok(&sign_and_wait(&env, &env.carol, "1", &req).await?);
    assert_eq!(allowance(&env, &env.carol).await?["caps"][0]["remaining"], "0");
    Ok(())
}

/// Reset rule on transfer: cleared (event), the delegate is a stranger, and a transfer back does not revive it.
#[tokio::test]
async fn transfer_clears_allowances() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(10 * KB_DEBIT)]), None).await?);
    let r = transfer(&env, &env.alice, "1", env.bob.id()).await?;
    assert_ok(&r);
    let cleared = events(&r, "allowances_cleared");
    assert_eq!(cleared, vec![json!({ "token_id": "1", "delegate_ids": [env.carol.id()], "reason": "transfer" })]);
    let req = evm_req(&unhex(KB_EVM_TX));
    assert_fails_with(&sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    assert_ok(&transfer(&env, &env.bob, "1", env.alice.id()).await?);
    assert_fails_with(&sign_sync_fail(&env, &env.carol, "1", &req, SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    let all: Vec<Value> = serde_json::from_value(view(&env, "allowances_of", json!({ "token_id": "1" })).await?)?;
    assert!(all.is_empty());
    Ok(())
}

/// Reset rule on both sale paths (NEAR `buy`, USDC `ft_on_transfer`), in the sale's own receipt.
#[tokio::test]
async fn sales_clear_allowances() -> Result<()> {
    let env = setup().await?;
    let req = evm_req(&unhex(KB_EVM_TX));
    // NEAR sale, after a delegated signature (so the quiet period applies)
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(10 * KB_DEBIT)]), None).await?);
    assert_ok(&sign_and_wait(&env, &env.carol, "1", &req).await?);
    pass_quiet_period(&env, "1").await?;
    let id = list_ok(&env, &env.alice, "1", 1_000, "near").await?;
    let r = buy(&env, &env.bob, "1", id, 1, NearToken::from_yoctonear(1_000)).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowances_cleared")[0]["reason"], "sale");
    assert_fails_with(&sign_sync_fail(&env, &env.carol, "1", &evm_req(&EvmTx::transfer(1).encode()), SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    // USDC sale: bob grants alice an allowance, lists for USDC, carol buys
    assert_ok(&set_allowance(&env, &env.bob, &env.alice, json!([evm_cap(10 * KB_DEBIT)]), None).await?);
    let id = list_ok(&env, &env.bob, "1", 5_000_000, "usdc").await?;
    let r = ft_buy(&env, &env.carol, 5_000_000, &buy_msg("1", id, 1)).await?;
    assert_ok(&r);
    assert_eq!(owner_of(&env, "1").await?, env.carol.id().to_string());
    assert_eq!(events(&r, "allowances_cleared")[0]["reason"], "sale");
    assert!(allowance(&env, &env.alice).await?.is_null());
    assert_fails_with(&sign_sync_fail(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(1).encode()), SignOpts::default_for(1)).await?, "ERR_NOT_OWNER");
    // the history survives, with the delegate as requester
    assert_eq!(sig_records(&env, "1").await?[0]["requester"], env.carol.id().to_string());
    Ok(())
}

/// BTC: a delegate's 1-input send debits the external output plus the fee; change to the preimages' own P2WPKH
/// doesn't count. A cap of exactly that passes; one sat less is refused. A 2-input send is refused for the delegate
/// whatever the cap (AUDIT-01: BIP143 commits each input's amount only in its own sighash).
#[tokio::test]
async fn btc_debit_counts_fee_not_change() -> Result<()> {
    let env = setup().await?;
    let two = BtcTx::new(2, 9); // inputs 50,000 + 51,000; outputs 40,000 (other) + 9,000 (change to pkh 0x11…)
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([{ "asset": "btc", "limit": "1000000000" }]), None).await?);
    let r = sign_sync_fail(&env, &env.carol, "1", &two.req(), SignOpts::default_for(2)).await?;
    assert_fails_with(&r, "ERR_ALLOWANCE_BTC_ONE_INPUT");
    let tx = BtcTx::new(1, 9); // input 50,000; the same outputs
    let debit: u128 = 40_000 + (50_000 - 49_000);
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([{ "asset": "btc", "limit": (debit - 1).to_string() }]), None).await?);
    let r = sign_sync_fail(&env, &env.carol, "1", &tx.req(), SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_ALLOWANCE_EXCEEDED");
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([{ "asset": "btc", "limit": debit.to_string() }]), None).await?);
    let r = sign_and_wait(&env, &env.carol, "1", &tx.req()).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowance_spent")[0]["debits"], json!([{ "asset": "btc", "amount": debit.to_string() }]));
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs.len(), 1);
    assert!(recs.iter().all(|r| r["requester"] == env.carol.id().to_string() && r["status"] == "signed"));
    assert_eq!(allowance(&env, &env.carol).await?["caps"][0]["remaining"], "0");
    // the owner still signs the 2-input tx
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &two.req()).await?);
    assert_eq!(sig_records(&env, "1").await?.len(), 3);
    Ok(())
}

/// set_allowance guards and the storage charge: refunds the excess of the 0.01 NEAR attach; 0 deposit refused.
#[tokio::test]
async fn set_allowance_guards_and_charge() -> Result<()> {
    let env = setup().await?;
    let r = env
        .alice
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": "1", "delegate": env.carol.id(), "caps": [evm_cap(1)] }))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    for (delegate, code) in [(env.alice.id().clone(), "ERR_ALLOWANCE_DELEGATE"), (env.mpc.id().clone(), "ERR_ALLOWANCE_DELEGATE"), (env.satchel.id().clone(), "ERR_ALLOWANCE_DELEGATE")] {
        let r = env
            .alice
            .call(env.satchel.id(), "set_allowance")
            .args_json(json!({ "token_id": "1", "delegate": delegate, "caps": [evm_cap(1)] }))
            .deposit(SET_DEPOSIT)
            .gas(Gas::from_tgas(30))
            .transact()
            .await?;
        assert_fails_with(&r, code);
    }
    assert_fails_with(&set_allowance(&env, &env.alice, &env.carol, json!([{ "asset": { "evm": { "chain_id": 1 } }, "limit": "1" }]), None).await?, "ERR_ALLOWANCE_CAPS");
    assert_fails_with(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(1)]), Some(1)).await?, "ERR_ALLOWANCE_EXPIRY");
    // exact charge: the contract keeps Δstorage × byte cost, the rest comes back
    let s0 = storage_usage(&env, env.satchel.id()).await?;
    let c0 = balance(&env, env.satchel.id()).await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, json!([evm_cap(1), { "asset": "btc", "limit": "5" }]), None).await?);
    let used = (storage_usage(&env, env.satchel.id()).await? - s0) as u128;
    let kept = settled_balance(&env, env.satchel.id()).await? as i128 - c0 as i128;
    assert!(used > 0);
    // the contract also earns a share of the gas: kept ≥ storage, and far below the 0.01 NEAR attached
    assert!(kept >= (used * STORAGE_BYTE_COST) as i128, "kept {kept} < storage {}", used * STORAGE_BYTE_COST);
    assert!(kept < (SET_DEPOSIT.as_yoctonear() / 2) as i128, "the excess was not refunded: kept {kept}");
    Ok(())
}
