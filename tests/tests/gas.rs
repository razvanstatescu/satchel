//! INV-19: the prepaid-gas floor `30 + 18·n` Tgas (ERR_GAS before any state change) and the
//! forwarding of ≥ 15 Tgas to every MPC `sign`, for n = 1, 2, 4, 10.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::types::Gas;
use serde_json::Value;
use std::time::Duration;

fn request(n: usize, seed: u8) -> Value {
    if n == 1 {
        // nonces 0/1: a fresh token's first EVM request must have nonce ≤ 1 (nonce-gap rule, spec §5.9)
        evm_req(&EvmTx::transfer((seed % 2) as u64).encode())
    } else {
        BtcTx::new(n, seed).req()
    }
}

async fn floor_and_forwarding(n: usize) -> Result<()> {
    let env = setup().await?;
    let n64 = n as u64;

    // just below the floor → ERR_GAS, nothing changes
    let below = Gas::from_gas(min_sign_prepaid(n64).as_gas() - 1);
    let o = SignOpts {
        gas: Some(below),
        deposit: None,
        mpc_deposit: None,
    };
    let r = sign_sync_fail(&env, &env.alice, "1", &request(n, 1), o).await?;
    assert_fails_with(&r, "ERR_GAS");
    assert!(events(&r, "sign_requested").is_empty());
    assert_eq!(sig_count(&env, "1").await?, 0);
    assert_eq!(mpc_count(&env).await?, 0);

    // the caller-side attach SIGN_ATTACH_GAS(n): every MPC call sees ≥ 15 Tgas
    let st = start_sign(&env, &env.alice, "1", &request(n, 2)).await?;
    let r = wait_resolved(&st, Duration::from_secs(60)).await?;
    assert_ok(&r);
    eprintln!(
        "n={n}: attach {} Tgas, burnt {:.2} Tgas",
        sign_attach_gas(n64).as_tgas(),
        r.total_gas_burnt.as_gas() as f64 / 1e12
    );
    let reqs = mpc_requests(&env).await?;
    assert_eq!(reqs.len(), n);
    for q in &reqs {
        assert!(
            num(&q["prepaid_gas"]) >= 15_000_000_000_000,
            "MPC saw {} gas",
            q["prepaid_gas"]
        );
    }
    let statuses = events(&r, "sign_resolved")[0]["statuses"].clone();
    assert!(
        statuses.as_array().unwrap().iter().all(|s| s == "signed"),
        "{statuses}"
    );

    // exactly the floor is accepted and still completes
    let o = SignOpts {
        gas: Some(min_sign_prepaid(n64)),
        deposit: None,
        mpc_deposit: None,
    };
    let st = start_sign_with(&env, &env.alice, "1", &request(n, 3), o).await?;
    let r = wait_resolved(&st, Duration::from_secs(60)).await?;
    assert_ok(&r);
    let reqs = mpc_requests(&env).await?;
    assert_eq!(reqs.len(), 2 * n);
    for q in &reqs[n..] {
        assert!(
            num(&q["prepaid_gas"]) >= 15_000_000_000_000,
            "at the floor the MPC saw {} gas",
            q["prepaid_gas"]
        );
    }
    let statuses = events(&r, "sign_resolved")[0]["statuses"].clone();
    assert!(
        statuses.as_array().unwrap().iter().all(|s| s == "signed"),
        "at the floor: {statuses}"
    );
    Ok(())
}

#[tokio::test]
async fn floor_and_forwarding_1() -> Result<()> {
    floor_and_forwarding(1).await
}

#[tokio::test]
async fn floor_and_forwarding_2() -> Result<()> {
    floor_and_forwarding(2).await
}

#[tokio::test]
async fn floor_and_forwarding_4() -> Result<()> {
    floor_and_forwarding(4).await
}

#[tokio::test]
async fn floor_and_forwarding_10() -> Result<()> {
    floor_and_forwarding(10).await
}
