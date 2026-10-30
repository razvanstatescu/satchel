//! Test audit round two (docs/testing/contract.md §7.5): gas of the heaviest non-`sign_for`-fan-out paths, printed for
//! a before/after comparison of the AUDIT-01/-02/-04 fixes. Behaviour-neutral on purpose (no assertion depends on the
//! fixes), so the same file runs against the pre-fix wasm with `SATCHEL_WASM=<path>`. Also prints how the contract's
//! own balance moves around a call (the function-call reward), which differs between nearcore 2.13 and 2.14.
//!
//! `cargo test -p satchel-tests --test gas_paths -- --nocapture --test-threads 1`

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::Account;
use serde_json::{Value, json};

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const USDC: u128 = 1_000_000;

fn report(env: &Env, label: &str, r: &ExecutionFinalResult) {
    assert!(r.is_success(), "{label}: {}", fail_text(r));
    let main = r.receipt_outcomes().iter().find(|o| &o.executor_id == env.satchel.id()).map(|o| o.gas_burnt.as_gas()).unwrap_or(0);
    eprintln!(
        "GAS {label}: total burnt {:.3} Tgas; main satchel receipt {:.3} Tgas",
        r.total_gas_burnt.as_gas() as f64 / 1e12,
        main as f64 / 1e12
    );
}

async fn set_allowance(env: &Env, owner: &Account, delegate: &Account, caps: Value) -> Result<ExecutionFinalResult> {
    Ok(owner
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": "1", "delegate": delegate.id(), "caps": caps }))
        .deposit(NearToken::from_millinear(10))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

fn caps() -> Value {
    json!([{ "asset": { "evm": { "chain_id": SEPOLIA } }, "limit": "1000000000000000000000" }, { "asset": "btc", "limit": "100000000" }])
}

/// Four delegates (the maximum) so every ownership change clears the largest allowance set.
async fn four_delegates(env: &Env, owner: &Account, tag: &str) -> Result<()> {
    for name in ["d1", "d2", "d3"] {
        let d = sub(&env.root, &format!("{name}{tag}"), 5).await?;
        assert_ok(&set_allowance(env, owner, &d, caps()).await?);
    }
    assert_ok(&set_allowance(env, owner, &env.carol, caps()).await?);
    Ok(())
}

#[tokio::test]
async fn gas_heavy_paths() -> Result<()> {
    let env = setup().await?;
    let r = set_allowance(&env, &env.alice, &env.carol, caps()).await?;
    report(&env, "set_allowance (new delegate, 2 caps)", &r);
    // delegate signing (C5 debit + the AUDIT-01 input-count check)
    let r = sign_and_wait(&env, &env.carol, "1", &evm_req(&EvmTx::transfer(0).encode())).await?;
    report(&env, "sign_for EVM by a delegate", &r);
    let r = sign_and_wait(&env, &env.carol, "1", &BtcTx::new(1, 9).req()).await?;
    report(&env, "sign_for BTC 1 input by a delegate", &r);
    let r = sign_and_wait(&env, &env.alice, "1", &BtcTx::new(10, 8).req()).await?;
    report(&env, "sign_for BTC 10 inputs by the owner", &r);
    // nft_transfer clearing 4 delegates (AUDIT-04: move_token + deferred events)
    four_delegates(&env, &env.alice, "a").await?;
    let r = transfer(&env, &env.alice, "1", env.bob.id()).await?;
    report(&env, "nft_transfer clearing 4 delegates", &r);
    // NEAR buy clearing 4 delegates
    four_delegates(&env, &env.bob, "b").await?;
    pass_quiet_period(&env, "1").await?;
    let sc = sig_count(&env, "1").await?;
    let lid = list_ok(&env, &env.bob, "1", ONE_NEAR, "near").await?;
    let r = buy(&env, &env.carol, "1", lid, sc, NearToken::from_yoctonear(ONE_NEAR)).await?;
    report(&env, "buy (NEAR) clearing 4 delegates", &r);
    // USDC buy
    let lid = list_ok(&env, &env.carol, "1", 5 * USDC, "usdc").await?;
    let r = ft_buy(&env, &env.bob, 5 * USDC, &buy_msg("1", lid, sc)).await?;
    report(&env, "ft_transfer_call buy (USDC)", &r);
    // make_offer + accept on a listed token clearing 4 delegates
    let exp = env.worker.view_block().await?.timestamp() / 1_000_000 + 3_600_000;
    let r = env
        .alice
        .call(env.satchel.id(), "make_offer")
        .args_json(json!({ "token_id": "1", "amount": ONE_NEAR.to_string(), "expected_sig_count": sc, "expected_inside_epoch": 0, "expires_at_ms": exp }))
        .deposit(NearToken::from_yoctonear(ONE_NEAR + 10 * MILLI))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    report(&env, "make_offer (NEAR)", &r);
    let oid = r.json::<u64>()?;
    four_delegates(&env, &env.bob, "c").await?;
    list_ok(&env, &env.bob, "1", 2 * ONE_NEAR, "near").await?;
    let r = env.bob.call(env.satchel.id(), "accept_offer").args_json(json!({ "offer_id": oid })).deposit(YOCTO).gas(Gas::from_tgas(50)).transact().await?;
    report(&env, "accept_offer (listed, clearing 4 delegates)", &r);
    Ok(())
}

/// How the contract's own balance moves around a call with no deposit kept: on nearcore 2.13.4 it grows by the
/// function-call reward (≈ 30 % of the gas burnt by the receipt); printed, not asserted, so both versions pass.
#[tokio::test]
async fn contract_balance_after_calls() -> Result<()> {
    let env = setup().await?;
    let b0 = balance(&env, env.satchel.id()).await?;
    let r = env
        .alice
        .call(env.satchel.id(), "nft_transfer_call")
        .args_json(json!({ "receiver_id": env.bob.id(), "token_id": "1", "msg": "" }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_TRANSFER_CALL_DISABLED");
    let burnt = r.receipt_outcomes().iter().find(|o| &o.executor_id == env.satchel.id()).map(|o| o.gas_burnt.as_gas()).unwrap_or(0);
    let b1 = settled_balance(&env, env.satchel.id()).await?;
    eprintln!("BALANCE failed call: satchel Δ {} yocto; receipt burnt {:.3} Tgas", b1 as i128 - b0 as i128, burnt as f64 / 1e12);
    let r = transfer(&env, &env.alice, "1", env.bob.id()).await?;
    assert_ok(&r);
    let burnt = r.receipt_outcomes().iter().find(|o| &o.executor_id == env.satchel.id()).map(|o| o.gas_burnt.as_gas()).unwrap_or(0);
    let b2 = settled_balance(&env, env.satchel.id()).await?;
    eprintln!("BALANCE nft_transfer (1 yocto kept): satchel Δ {} yocto; receipt burnt {:.3} Tgas", b2 as i128 - b1 as i128, burnt as f64 / 1e12);
    Ok(())
}
