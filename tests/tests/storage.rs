//! Storage charging (spec §5.4, review R-26): INV-18 exactness and INV-29 (callback never grows).
//! The refund is read from the receipts' Transfer actions (EXPERIMENTAL_tx_status), not inferred
//! from balances, because the contract also earns gas rewards and receives MPC deposit refunds.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use serde_json::{Value, json};
use std::time::Duration;

struct Charge {
    attached: u128,
    refund: u128,
    delta_bytes: u64,
    result: ExecutionFinalResult,
}

impl Charge {
    fn net(&self) -> u128 {
        self.attached - self.refund
    }
}

async fn sign_charged(
    env: &Env,
    req: &Value,
    deposit: Option<NearToken>,
    mpc_deposit: Option<u128>,
) -> Result<Charge> {
    let n = n_of(req);
    let attached = deposit
        .unwrap_or_else(|| sign_attach_deposit(n))
        .as_yoctonear();
    let s0 = storage_usage(env, env.satchel.id()).await?;
    let st = start_sign_with(
        env,
        &env.alice,
        "1",
        req,
        SignOpts {
            gas: None,
            deposit,
            mpc_deposit,
        },
    )
    .await?;
    let result = wait_resolved(&st, Duration::from_secs(60)).await?;
    let s1 = storage_usage(env, env.satchel.id()).await?;
    let receipts = rpc::tx_receipts(&env.worker, st.hash(), env.alice.id()).await?;
    let refund = rpc::transfers(&receipts, env.satchel.id(), env.alice.id())
        .iter()
        .sum();
    Ok(Charge {
        attached,
        refund,
        delta_bytes: s1.saturating_sub(s0),
        result,
    })
}

fn assert_exact(c: &Charge, n: u64, mpc_deposit: u128, what: &str) {
    assert_ok(&c.result);
    let required = c.delta_bytes as u128 * STORAGE_BYTE_COST + n as u128 * mpc_deposit;
    eprintln!(
        "{what}: Δ = {} B, required = {required} yocto, refund = {}",
        c.delta_bytes, c.refund
    );
    assert!(c.delta_bytes > 0, "{what}: a record must take storage");
    assert_eq!(
        c.net(),
        required,
        "{what}: attached − refund must equal Δstorage × byte_cost + n × mpc_deposit"
    );
}

/// INV-18: for every `sign_for`, attached − refund == Δstorage_usage × storage_byte_cost + n × mpc_deposit.
#[tokio::test]
async fn sign_for_charges_exactly() -> Result<()> {
    let env = setup().await?;
    let c = sign_charged(&env, &evm_req(&EvmTx::transfer(0).encode()), None, None).await?;
    assert_exact(&c, 1, 1, "evm");
    let c = sign_charged(&env, &BtcTx::new(3, 1).req(), None, None).await?;
    assert_exact(&c, 3, 1, "btc×3");
    let c = sign_charged(&env, &sol_req(&sol_message(5, [2; 32])), None, None).await?;
    assert_exact(&c, 1, 1, "sol");
    let c = sign_charged(
        &env,
        &evm_req(&EvmTx::transfer(1).encode()),
        None,
        Some(5_000),
    )
    .await?;
    assert_exact(&c, 1, 5_000, "evm, mpc_deposit 5000");
    Ok(())
}

/// INV-18: excess is refunded exactly; one yocto short fails ERR_DEPOSIT and changes nothing; the
/// exact amount succeeds with no refund.
#[tokio::test]
async fn excess_refunded() -> Result<()> {
    let env = setup().await?;
    // warm-up (any lazily created per-token state), then measure an identical-size record
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(0).encode()),
        )
        .await?,
    );
    let c = sign_charged(
        &env,
        &evm_req(&EvmTx::transfer(1).encode()),
        Some(NearToken::from_near(1)),
        None,
    )
    .await?;
    assert_exact(&c, 1, 1, "evm with 1 NEAR attached");
    let required = c.net();
    assert_eq!(c.refund, NearToken::from_near(1).as_yoctonear() - required);

    let before = (sig_records(&env, "1").await?, mpc_count(&env).await?);
    let o = SignOpts {
        gas: None,
        deposit: Some(NearToken::from_yoctonear(required - 1)),
        mpc_deposit: None,
    };
    let r = sign_sync_fail(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(2).encode()),
        o,
    )
    .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert!(
        fail_text(&r).contains(&required.to_string()),
        "ERR_DEPOSIT should state the required yocto: {}",
        fail_text(&r)
    );
    assert_eq!(
        (sig_records(&env, "1").await?, mpc_count(&env).await?),
        before
    );

    let c = sign_charged(
        &env,
        &evm_req(&EvmTx::transfer(2).encode()),
        Some(NearToken::from_yoctonear(required)),
        None,
    )
    .await?;
    assert_exact(&c, 1, 1, "evm with the exact amount");
    assert_eq!(c.refund, 0, "nothing to refund");
    Ok(())
}

/// INV-18 for `nft_mint` and `list` (n = 0): attached − refund == Δstorage × byte_cost.
#[tokio::test]
async fn mint_and_list_charge_exactly() -> Result<()> {
    let env = setup().await?;
    let s0 = storage_usage(&env, env.satchel.id()).await?;
    let r = env
        .bob
        .call(env.satchel.id(), "nft_mint")
        .args_json(json!({ "receiver_id": env.bob.id() }))
        .deposit(MINT_DEPOSIT)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    let s1 = storage_usage(&env, env.satchel.id()).await?;
    let rc = rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, env.bob.id()).await?;
    let refund: u128 = rpc::transfers(&rc, env.satchel.id(), env.bob.id())
        .iter()
        .sum();
    eprintln!("mint: Δ = {} B, refund = {refund}", s1 - s0);
    assert_eq!(
        MINT_DEPOSIT.as_yoctonear() - refund,
        (s1 - s0) as u128 * STORAGE_BYTE_COST,
        "mint charges exactly"
    );

    let s0 = storage_usage(&env, env.satchel.id()).await?;
    let r = list(&env, &env.bob, "2", 1_000, "near").await?;
    assert_ok(&r);
    let s1 = storage_usage(&env, env.satchel.id()).await?;
    let rc = rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, env.bob.id()).await?;
    let refund: u128 = rpc::transfers(&rc, env.satchel.id(), env.bob.id())
        .iter()
        .sum();
    eprintln!("list: Δ = {} B, refund = {refund}", s1 - s0);
    assert!(s1 > s0);
    assert_eq!(
        LIST_DEPOSIT.as_yoctonear() - refund,
        (s1 - s0) as u128 * STORAGE_BYTE_COST,
        "list charges exactly"
    );

    let short = env
        .bob
        .call(env.satchel.id(), "nft_mint")
        .args_json(json!({ "receiver_id": env.bob.id() }))
        .deposit(NearToken::from_yoctonear(
            ((s1 - s0) as u128) * STORAGE_BYTE_COST,
        ))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_fails_with(&short, "ERR_DEPOSIT");
    Ok(())
}

/// INV-29: `on_signed` overwrites only fixed-size status/signature bytes: storage usage is
/// identical before and after it runs (signed, unparsed and failed paths).
#[tokio::test]
async fn callback_no_growth() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "manual").await?;
    for (id, (label, how)) in [("signed", 0), ("unparsed", 1), ("failed", 2)]
        .into_iter()
        .enumerate()
    {
        let id = id as u64;
        let st = start_sign(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(id).encode()),
        )
        .await?;
        wait_mpc_pending(&env, 1).await?;
        let s_pending = storage_usage(&env, env.satchel.id()).await?;
        match how {
            0 => mpc_respond_valid(&env, id).await?,
            1 => mpc_respond_raw(&env, id, "garbage").await?,
            _ => env.worker.fast_forward(250).await?,
        }
        let r = wait_resolved(&st, Duration::from_secs(90)).await?;
        assert_ok(&r);
        let s_after = storage_usage(&env, env.satchel.id()).await?;
        assert_eq!(
            s_after, s_pending,
            "{label}: on_signed changed storage usage"
        );
        assert_eq!(sig_records(&env, "1").await?[id as usize]["status"], label);
    }
    Ok(())
}
