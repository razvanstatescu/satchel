//! The mock signer itself, called directly (no Satchel needed). Proves the fixture mirrors
//! `v1.signer-prod.testnet` 3.17.0: yield/resume, the 200-block timeout via `fast_forward`, the
//! response shapes, the precondition errors, and the failure modes the Satchel suite relies on.

mod common;

use anyhow::Result;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract};
use serde_json::{Value, json};
use std::task::Poll;
use std::time::Duration;

const PAYLOAD: &str = "bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377";

async fn mock_only() -> Result<(
    near_workspaces::Worker<near_workspaces::network::Sandbox>,
    Contract,
    Account,
)> {
    let w = worker().await?;
    let root = w.root_account()?;
    let mpc = sub(&root, "mpc", 50)
        .await?
        .deploy(&wasm("mock-signer")?)
        .await?
        .into_result()?;
    let user = sub(&root, "user", 50).await?;
    Ok((w, mpc, user))
}

fn ecdsa_req(path: &str) -> Value {
    json!({ "request": { "path": path, "payload_v2": { "Ecdsa": PAYLOAD }, "domain_id": 0 } })
}

async fn sign_async(
    mpc: &Contract,
    user: &Account,
    args: Value,
    gas: Gas,
    deposit: NearToken,
) -> Result<near_workspaces::operations::TransactionStatus> {
    Ok(user
        .call(mpc.id(), "sign")
        .args_json(args)
        .gas(gas)
        .deposit(deposit)
        .transact_async()
        .await?)
}

async fn mode(mpc: &Contract, m: &str) -> Result<()> {
    mpc.call("set_mode")
        .args_json(json!({ "mode": m }))
        .transact()
        .await?
        .into_result()?;
    Ok(())
}

async fn pending(mpc: &Contract) -> Result<Vec<Value>> {
    Ok(mpc
        .view("pending_requests")
        .args_json(json!({}))
        .await?
        .json()?)
}

async fn wait_pending(mpc: &Contract, n: usize) -> Result<()> {
    for _ in 0..150 {
        if pending(mpc).await?.len() >= n {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    anyhow::bail!("request never became pending")
}

async fn log0(mpc: &Contract) -> Result<Value> {
    let v: Vec<Value> = mpc.view("requests").args_json(json!({})).await?.json()?;
    Ok(v.into_iter().next().unwrap_or(Value::Null))
}

#[tokio::test]
async fn mock_reply_secp256k1_shape() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    let st = sign_async(
        &mpc,
        &user,
        ecdsa_req("satchel/1/evm"),
        Gas::from_tgas(50),
        YOCTO,
    )
    .await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let v: Value = r.clone().json()?;
    assert_eq!(v["scheme"], "Secp256k1");
    let big_r = v["big_r"]["affine_point"].as_str().unwrap();
    assert_eq!(big_r.len(), 66);
    assert!(big_r.starts_with("02") || big_r.starts_with("03"));
    assert_eq!(v["s"]["scalar"].as_str().unwrap().len(), 64);
    assert!(v["recovery_id"].as_u64().unwrap() <= 1);
    let l = log0(&mpc).await?;
    assert_eq!(l["predecessor"], user.id().to_string());
    assert_eq!(l["path"], "satchel/1/evm");
    assert_eq!(l["payload_v2"], json!({ "Ecdsa": PAYLOAD }));
    assert_eq!(l["domain_id"], 0);
    assert_eq!(l["attached_deposit"], "1");
    assert!(num(&l["prepaid_gas"]) >= 15_000_000_000_000);
    assert_eq!(l["outcome"], "responded");
    assert!(pending(&mpc).await?.is_empty());
    Ok(())
}

#[tokio::test]
async fn mock_reply_ed25519_shape() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    let args = json!({ "request": { "path": "satchel/1/sol", "payload_v2": { "Eddsa": "01000203" }, "domain_id": 1 } });
    let st = sign_async(&mpc, &user, args, Gas::from_tgas(50), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let v: Value = r.clone().json()?;
    assert_eq!(v["scheme"], "Ed25519");
    let sig = v["signature"].as_array().unwrap();
    assert_eq!(sig.len(), 64);
    assert!(sig.iter().all(|b| b.as_u64().unwrap() <= 255));
    Ok(())
}

/// Exactly 15 Tgas (the live floor) still completes in auto-reply mode, for ECDSA and for a
/// maximal 1232-byte Eddsa message.
#[tokio::test]
async fn mock_exact_floor_gas_completes() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    let st = sign_async(&mpc, &user, ecdsa_req("p"), Gas::from_tgas(15), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    assert_eq!(r.clone().json::<Value>()?["scheme"], "Secp256k1");
    let big = json!({ "request": { "path": "satchel/1/sol", "payload_v2": { "Eddsa": "01".repeat(1232) }, "domain_id": 1 } });
    let st = sign_async(&mpc, &user, big, Gas::from_tgas(15), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    assert_eq!(r.clone().json::<Value>()?["scheme"], "Ed25519");
    Ok(())
}

#[tokio::test]
async fn mock_manual_respond_resumes_yield() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    mode(&mpc, "manual").await?;
    let st = sign_async(
        &mpc,
        &user,
        ecdsa_req("satchel/7/btc"),
        Gas::from_tgas(50),
        YOCTO,
    )
    .await?;
    wait_pending(&mpc, 1).await?;
    assert!(
        matches!(st.status().await?, Poll::Pending),
        "tx must stay pending while yielded"
    );
    let resp = json!({"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1});
    let rr = user
        .call(mpc.id(), "respond")
        .args_json(json!({ "request_id": 0, "response": resp }))
        .transact()
        .await?;
    assert_ok(&rr);
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    assert_eq!(
        r.clone().json::<Value>()?,
        resp,
        "caller receives exactly the resumed JSON"
    );
    // a second respond to the same id is a late respond
    let again = user
        .call(mpc.id(), "respond")
        .args_json(json!({ "request_id": 0, "response": resp }))
        .transact()
        .await?;
    assert_fails_with(
        &again,
        "This sign request has timed out, was completed, or never existed.",
    );
    Ok(())
}

/// The 200-block yield timeout, triggered with `fast_forward(250)` (kb/21 §TL;DR 3).
#[tokio::test]
async fn mock_timeout_via_fast_forward() -> Result<()> {
    let (w, mpc, user) = mock_only().await?;
    mode(&mpc, "manual").await?;
    let st = sign_async(
        &mpc,
        &user,
        ecdsa_req("satchel/1/evm"),
        Gas::from_tgas(50),
        YOCTO,
    )
    .await?;
    wait_pending(&mpc, 1).await?;
    let t0 = std::time::Instant::now();
    w.fast_forward(250).await?;
    let r = wait_final(&st, Duration::from_secs(60)).await?;
    eprintln!(
        "timeout resolved {:?} after fast_forward start",
        t0.elapsed()
    );
    assert_fails_with(&r, "Request has timed out.");
    assert!(
        pending(&mpc).await?.is_empty(),
        "timed-out request is cleaned"
    );
    assert_eq!(log0(&mpc).await?["outcome"], "timed_out");
    let late = user
        .call(mpc.id(), "respond_valid")
        .args_json(json!({ "request_id": 0 }))
        .transact()
        .await?;
    assert_fails_with(
        &late,
        "This sign request has timed out, was completed, or never existed.",
    );
    Ok(())
}

#[tokio::test]
async fn mock_never_mode_refuses_respond() -> Result<()> {
    let (w, mpc, user) = mock_only().await?;
    mode(&mpc, "never").await?;
    let st = sign_async(&mpc, &user, ecdsa_req("p"), Gas::from_tgas(50), YOCTO).await?;
    wait_pending(&mpc, 1).await?;
    let rr = user
        .call(mpc.id(), "respond_valid")
        .args_json(json!({ "request_id": 0 }))
        .transact()
        .await?;
    assert_fails_with(&rr, "mode `never` ignores respond");
    w.fast_forward(250).await?;
    let r = wait_final(&st, Duration::from_secs(60)).await?;
    assert_fails_with(&r, "Request has timed out.");
    Ok(())
}

#[tokio::test]
async fn mock_garbage_and_wrong_shape() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    mode(&mpc, "garbage").await?;
    let st = sign_async(&mpc, &user, ecdsa_req("p"), Gas::from_tgas(50), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let raw = r.raw_bytes()?;
    assert!(
        serde_json::from_slice::<Value>(&raw).is_err(),
        "garbage must not be JSON: {raw:?}"
    );

    mode(&mpc, "wrong_shape").await?;
    let st = sign_async(&mpc, &user, ecdsa_req("p"), Gas::from_tgas(50), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let v: Value = r.clone().json()?;
    assert_eq!(v["big_r"], "oops");
    Ok(())
}

#[tokio::test]
async fn mock_panic_mode_fails_immediately() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    mode(&mpc, "panic").await?;
    let st = sign_async(&mpc, &user, ecdsa_req("p"), Gas::from_tgas(50), YOCTO).await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_fails_with(&r, "not accepting new requests");
    let n: u64 = mpc
        .view("request_count")
        .args_json(json!({}))
        .await?
        .json()?;
    assert_eq!(n, 0);
    Ok(())
}

#[tokio::test]
async fn mock_preconditions_match_live_errors() -> Result<()> {
    let (_w, mpc, user) = mock_only().await?;
    let call = |args: Value, gas: Gas, dep: NearToken| {
        let (mpc, user) = (mpc.clone(), user.clone());
        async move {
            user.call(mpc.id(), "sign")
                .args_json(args)
                .gas(gas)
                .deposit(dep)
                .transact()
                .await
        }
    };
    let r = call(ecdsa_req("p"), Gas::from_gas(14_999_999_999_999), YOCTO).await?;
    assert_fails_with(
        &r,
        "Provided gas is lower than required. Provided: 14999999999999, required: 15000000000000",
    );
    let r = call(
        ecdsa_req("p"),
        Gas::from_tgas(50),
        NearToken::from_yoctonear(0),
    )
    .await?;
    assert_fails_with(
        &r,
        "Attached deposit is lower than required. Attached: 0, required: 1",
    );
    let r = call(
        json!({"request":{"path":"p","payload_v2":{"Ecdsa":PAYLOAD},"domain_id":3}}),
        Gas::from_tgas(50),
        YOCTO,
    )
    .await?;
    assert_fails_with(
        &r,
        "Domain 3 has purpose ForeignTx, but this method requires Sign.",
    );
    let r = call(
        json!({"request":{"path":"p","payload_v2":{"Eddsa":"00"},"domain_id":0}}),
        Gas::from_tgas(50),
        YOCTO,
    )
    .await?;
    assert_fails_with(&r, "Payload is not Ecdsa");
    let r = call(json!({"request":{"path":"p","payload_v2":{"Ecdsa":format!("0x{}", &PAYLOAD[2..])},"domain_id":0}}), Gas::from_tgas(50), YOCTO).await?;
    assert_fails_with(&r, "Invalid character 'x' at position 1");
    let n: u64 = mpc
        .view("request_count")
        .args_json(json!({}))
        .await?
        .json()?;
    assert_eq!(n, 0, "refused requests are not logged");

    // excess deposit is refunded to the predecessor
    let st = sign_async(
        &mpc,
        &user,
        ecdsa_req("p"),
        Gas::from_tgas(50),
        NearToken::from_yoctonear(5),
    )
    .await?;
    let r = wait_final(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    assert!(
        r.logs()
            .iter()
            .any(|l| *l == format!("refund 4 to {}", user.id())),
        "logs: {:?}",
        r.logs()
    );
    Ok(())
}
