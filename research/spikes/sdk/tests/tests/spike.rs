//! THROWAWAY Phase-0 spike tests (sdk agent). near-workspaces 0.23.0 + sandbox (nearcore 2.13.4).
//! Run: cargo near build each contract first (see RESULTS.md), then `cargo test -p spike-tests -- --nocapture`.
use std::task::Poll;
use std::time::{Duration, Instant};

use near_workspaces::network::Sandbox;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract, Worker};
use serde_json::{Value, json};

const ROOT: &str = env!("CARGO_MANIFEST_DIR");

fn wasm(name: &str) -> Vec<u8> {
    let p = format!("{ROOT}/../target/near/{name}/{name}.wasm");
    std::fs::read(&p).unwrap_or_else(|e| panic!("missing {p}: build with cargo near first ({e})"))
}

struct Env {
    worker: Worker<Sandbox>,
    signer: Contract,
    nft: Contract,
    alice: Account,
    bob: Account,
    carol: Account,
    node: Account,
}

async fn setup() -> anyhow::Result<Env> {
    let t0 = Instant::now();
    let worker = match std::env::var("SANDBOX_VERSION") {
        Ok(v) => near_workspaces::sandbox_with_version(&v).await?,
        Err(_) => near_workspaces::sandbox().await?,
    };
    println!("[timing] sandbox start: {:?}", t0.elapsed());
    let signer = worker.dev_deploy(&wasm("spike_mock_signer")).await?;
    signer.call("new").transact().await?.into_result()?;
    let nft = worker.dev_deploy(&wasm("spike_nft")).await?;
    nft.call("new").args_json(json!({ "signer": signer.id() })).transact().await?.into_result()?;
    let alice = worker.dev_create_account().await?;
    let bob = worker.dev_create_account().await?;
    let carol = worker.dev_create_account().await?;
    let node = worker.dev_create_account().await?;
    println!("[timing] setup total: {:?}", t0.elapsed());
    Ok(Env { worker, signer, nft, alice, bob, carol, node })
}

fn err_text(r: &ExecutionFinalResult) -> String {
    format!("{:?}", r.clone().into_result().err())
}

async fn mint(env: &Env, to: &Account) -> anyhow::Result<String> {
    let r = to
        .call(env.nft.id(), "nft_mint")
        .args_json(json!({ "receiver_id": to.id() }))
        .deposit(NearToken::from_millinear(100))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    println!("[gas] nft_mint total burnt: {} Tgas; logs: {:?}", r.total_gas_burnt.as_gas() as f64 / 1e12, r.logs());
    let token: Value = r.into_result()?.json()?;
    Ok(token["token_id"].as_str().unwrap().to_string())
}

async fn token_state(env: &Env, id: &str) -> anyhow::Result<Value> {
    Ok(env.nft.view("token_state").args_json(json!({ "token_id": id })).await?.json()?)
}

async fn owner_of(env: &Env, id: &str) -> anyhow::Result<Value> {
    let t: Value = env.nft.view("nft_token").args_json(json!({ "token_id": id })).await?.json()?;
    Ok(t)
}

/// Poll a tx sent with transact_async until it is Ready AND its logs satisfy `done`.
async fn wait_tx(
    status: &near_workspaces::operations::TransactionStatus,
    max: Duration,
    done: impl Fn(&ExecutionFinalResult) -> bool,
) -> anyhow::Result<ExecutionFinalResult> {
    let t0 = Instant::now();
    loop {
        if let Poll::Ready(r) = status.status().await? {
            if done(&r) {
                return Ok(r);
            }
        }
        anyhow::ensure!(t0.elapsed() < max, "timed out waiting for tx");
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

fn has_log(r: &ExecutionFinalResult, needle: &str) -> bool {
    r.logs().iter().any(|l| l.contains(needle))
}

fn fake_sig() -> Value {
    json!({ "scheme": "Secp256k1",
            "big_r": { "affine_point": format!("02{}", "ab".repeat(32)) },
            "s": { "scalar": "cd".repeat(32) },
            "recovery_id": 1 })
}

async fn start_sign(env: &Env, who: &Account, id: &str) -> anyhow::Result<near_workspaces::operations::TransactionStatus> {
    Ok(who
        .call(env.nft.id(), "sign_for")
        .args_json(json!({ "token_id": id, "chain": "evm", "payload_hex": "aa".repeat(32) }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact_async()
        .await?)
}

async fn wait_pending(env: &Env, id: &str, n: u64, max: Duration) -> anyhow::Result<Value> {
    let t0 = Instant::now();
    loop {
        let s = token_state(env, id).await?;
        let reqs: Value = env.signer.view("pending_requests").await?.json()?;
        if s["pending_signs"].as_u64() == Some(n) && reqs.as_array().map(|a| a.len() as u64) == Some(n) {
            return Ok(reqs);
        }
        anyhow::ensure!(t0.elapsed() < max, "pending never reached {n}: {s} {reqs}");
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
}

#[tokio::test]
async fn yield_resume_happy_path_and_transfer_hook() -> anyhow::Result<()> {
    let t_all = Instant::now();
    let env = setup().await?;
    let id = mint(&env, &env.alice).await?;
    assert_eq!(owner_of(&env, &id).await?["owner_id"], json!(env.alice.id()));

    // Non-owner rejected
    let r = env.bob
        .call(env.nft.id(), "sign_for")
        .args_json(json!({ "token_id": id, "chain": "evm", "payload_hex": "aa".repeat(32) }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_NOT_OWNER"), "{}", err_text(&r));

    // Owner sign: yield is created, pending observable before respond
    let t_sign = Instant::now();
    let st = start_sign(&env, &env.alice, &id).await?;
    let reqs = wait_pending(&env, &id, 1, Duration::from_secs(30)).await?;
    println!("[timing] pending observable after {:?}; mock request: {}", t_sign.elapsed(), reqs[0]);
    assert_eq!(reqs[0]["request"]["path"], json!(format!("satchel/{id}/evm")));
    assert_eq!(reqs[0]["predecessor"], json!(env.nft.id()), "predecessor must be the NFT contract");
    assert!(matches!(st.status().await?, Poll::Pending), "tx must still be pending while yielded");

    // Hook: transfer blocked while pending; list blocked while pending
    let r = env.alice
        .call(env.nft.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.bob.id(), "token_id": id }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_PENDING_SIGNS"), "{}", err_text(&r));
    let r = env.alice
        .call(env.nft.id(), "list")
        .args_json(json!({ "token_id": id, "price": NearToken::from_near(1) }))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_PENDING_SIGNS"), "{}", err_text(&r));

    // MPC "node" responds -> yield resumes -> on_respond -> on_signed
    let rid = reqs[0]["request_id"].as_u64().unwrap();
    let rr = env.node
        .call(env.signer.id(), "respond")
        .args_json(json!({ "request_id": rid, "response": fake_sig() }))
        .transact()
        .await?;
    println!("[gas] respond burnt: {} Tgas", rr.total_gas_burnt.as_gas() as f64 / 1e12);
    assert!(rr.is_success(), "{:?}", rr);
    let done = wait_tx(&st, Duration::from_secs(60), |r| has_log(r, "signature_resolved")).await?;
    println!("[timing] sign_for end-to-end (incl. respond): {:?}", t_sign.elapsed());
    println!("[gas] sign_for tx total burnt: {} Tgas; receipts: {}", done.total_gas_burnt.as_gas() as f64 / 1e12, done.receipt_outcomes().len());
    for o in done.receipt_outcomes() {
        println!("   receipt executor={} gas={} Tgas logs={:?}", o.executor_id, o.gas_burnt.as_gas() as f64 / 1e12, o.logs);
    }
    assert!(done.is_success(), "{:?}", done);
    let ret: Value = done.json()?;
    assert_eq!(ret, fake_sig(), "caller receives the signature JSON as the tx return value");
    let s = token_state(&env, &id).await?;
    assert_eq!(s["pending_signs"], json!(0));
    assert_eq!(s["signs_ok"], json!(1));

    // Approvals: approve carol, then transfer alice -> bob, approvals must be cleared
    let r = env.alice
        .call(env.nft.id(), "nft_approve")
        .args_json(json!({ "token_id": id, "account_id": env.carol.id() }))
        .deposit(NearToken::from_millinear(10))
        .transact()
        .await?;
    assert!(r.is_success(), "{:?}", r);
    let t = owner_of(&env, &id).await?;
    assert!(t["approved_account_ids"][env.carol.id().as_str()].is_number(), "{t}");

    let r = env.alice
        .call(env.nft.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.bob.id(), "token_id": id }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    println!("[gas] nft_transfer burnt: {} Tgas; logs: {:?}", r.total_gas_burnt.as_gas() as f64 / 1e12, r.logs());
    assert!(r.is_success(), "{:?}", r);
    let t = owner_of(&env, &id).await?;
    assert_eq!(t["owner_id"], json!(env.bob.id()));
    assert_eq!(t["approved_account_ids"], json!({}), "NEP-178 approvals cleared on transfer");
    assert_eq!(token_state(&env, &id).await?["epoch"], json!(1));

    // Carol's stale approval can no longer move the token
    let r = env.carol
        .call(env.nft.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.carol.id(), "token_id": id, "approval_id": 1 }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(err_text(&r).contains("Sender not approved"), "{}", err_text(&r));

    // Old owner voided, new owner can sign
    let r = env.alice
        .call(env.nft.id(), "sign_for")
        .args_json(json!({ "token_id": id, "chain": "btc", "payload_hex": "bb".repeat(32) }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_NOT_OWNER"), "{}", err_text(&r));
    let st2 = start_sign(&env, &env.bob, &id).await?;
    let reqs = wait_pending(&env, &id, 1, Duration::from_secs(30)).await?;
    env.node
        .call(env.signer.id(), "respond")
        .args_json(json!({ "request_id": reqs[0]["request_id"], "response": fake_sig() }))
        .transact()
        .await?
        .into_result()?;
    let done2 = wait_tx(&st2, Duration::from_secs(60), |r| has_log(r, "signature_resolved")).await?;
    assert_eq!(done2.json::<Value>()?, fake_sig());
    println!("[timing] test total: {:?}", t_all.elapsed());
    Ok(())
}

#[tokio::test]
async fn yield_timeout_via_fast_forward() -> anyhow::Result<()> {
    let t_all = Instant::now();
    let env = setup().await?;
    let id = mint(&env, &env.alice).await?;
    let h0 = env.worker.view_block().await?.height();
    let st = start_sign(&env, &env.alice, &id).await?;
    wait_pending(&env, &id, 1, Duration::from_secs(30)).await?;
    let h1 = env.worker.view_block().await?.height();
    println!("[timeout] yield created around height {h1} (h0={h0})");

    let t_ff = Instant::now();
    env.worker.fast_forward(250).await?;
    let h2 = env.worker.view_block().await?.height();
    println!("[timeout] fast_forward(250) took {:?}; height now {h2}", t_ff.elapsed());

    let done = wait_tx(&st, Duration::from_secs(120), |r| has_log(r, "signature_resolved")).await?;
    let h3 = env.worker.view_block().await?.height();
    println!("[timeout] callback observed {:?} after fast_forward; height {h3}", t_ff.elapsed());
    for o in done.receipt_outcomes() {
        println!("   receipt executor={} gas={} Tgas ok={} logs={:?}", o.executor_id, o.gas_burnt.as_gas() as f64 / 1e12, o.is_success(), o.logs);
    }
    assert!(has_log(&done, r#""ok":false"#), "callback must see the failure: {:?}", done.logs());
    // on_signed returned None -> tx success with `null`
    assert!(done.is_success(), "{:?}", done);
    assert_eq!(done.json::<Value>()?, Value::Null);
    let s = token_state(&env, &id).await?;
    assert_eq!(s["pending_signs"], json!(0), "pending decremented on timeout");
    assert_eq!(s["signs_failed"], json!(1));
    let reqs: Value = env.signer.view("pending_requests").await?.json()?;
    assert_eq!(reqs, json!([]));
    // A late respond is now impossible (yield gone)
    let late = env.node
        .call(env.signer.id(), "respond")
        .args_json(json!({ "request_id": 0, "response": fake_sig() }))
        .transact()
        .await?;
    assert!(err_text(&late).contains("unknown request"), "{}", err_text(&late));
    println!("[timing] test total: {:?}", t_all.elapsed());
    Ok(())
}

#[tokio::test]
async fn sale_path_cooldown_and_freeze() -> anyhow::Result<()> {
    let env = setup().await?;
    let id = mint(&env, &env.alice).await?;
    let price = NearToken::from_near(2);
    env.alice
        .call(env.nft.id(), "list")
        .args_json(json!({ "token_id": id, "price": price }))
        .transact()
        .await?
        .into_result()?;
    // frozen: no signing, no plain transfer
    let r = env.alice
        .call(env.nft.id(), "sign_for")
        .args_json(json!({ "token_id": id, "chain": "evm", "payload_hex": "aa".repeat(32) }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_FROZEN"), "{}", err_text(&r));
    let r = env.alice
        .call(env.nft.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.carol.id(), "token_id": id }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(err_text(&r).contains("ERR_LISTED"), "{}", err_text(&r));
    // cooldown
    let h_before = env.worker.view_block().await?.height();
    let r = env.bob.call(env.nft.id(), "buy").args_json(json!({ "token_id": id })).deposit(price).transact().await?;
    let h_after = env.worker.view_block().await?.height();
    println!("[blocks] one sandbox transact() spans ~{} blocks", h_after - h_before);
    assert!(err_text(&r).contains("ERR_COOLDOWN"), "{}", err_text(&r));
    env.worker.fast_forward(105).await?;
    let seller_before = env.alice.view_account().await?.balance;
    let r = env.bob.call(env.nft.id(), "buy").args_json(json!({ "token_id": id })).deposit(price).gas(Gas::from_tgas(50)).transact().await?;
    println!("[gas] buy burnt: {} Tgas; logs: {:?}", r.total_gas_burnt.as_gas() as f64 / 1e12, r.logs());
    assert!(r.is_success(), "{:?}", r);
    let seller_after = env.alice.view_account().await?.balance;
    assert_eq!(seller_after.as_yoctonear() - seller_before.as_yoctonear(), price.as_yoctonear(), "seller paid exactly");
    assert_eq!(owner_of(&env, &id).await?["owner_id"], json!(env.bob.id()));
    let s = token_state(&env, &id).await?;
    assert_eq!(s["listed_price"], Value::Null);
    assert_eq!(s["epoch"], json!(1));
    Ok(())
}

#[tokio::test]
async fn transfer_call_revert_and_inflight_lock() -> anyhow::Result<()> {
    let env = setup().await?;
    let receiver = env.worker.dev_deploy(&wasm("spike_receiver")).await?;
    let id = mint(&env, &env.alice).await?;
    // approve carol so we can see approvals restored on revert
    env.alice
        .call(env.nft.id(), "nft_approve")
        .args_json(json!({ "token_id": id, "account_id": env.carol.id() }))
        .deposit(NearToken::from_millinear(10))
        .transact()
        .await?
        .into_result()?;

    // receiver refuses -> token returns to alice
    let r = env.alice
        .call(env.nft.id(), "nft_transfer_call")
        .args_json(json!({ "receiver_id": receiver.id(), "token_id": id, "msg": "return" }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    println!("[gas] nft_transfer_call(return) burnt: {} Tgas; logs: {:?}", r.total_gas_burnt.as_gas() as f64 / 1e12, r.logs());
    assert!(r.is_success(), "{:?}", r);
    for o in r.receipt_outcomes() {
        println!("   [transfer_call(return)] receipt executor={} gas={} Tgas ok={} logs={:?}", o.executor_id, o.gas_burnt.as_gas() as f64 / 1e12, o.is_success(), o.logs.iter().map(|l| l.chars().take(60).collect::<String>()).collect::<Vec<_>>());
    }
    assert_eq!(r.json::<bool>()?, false, "nft_transfer_call returns false when reverted");
    let t = owner_of(&env, &id).await?;
    assert_eq!(t["owner_id"], json!(env.alice.id()));
    println!("[approvals after revert] {}", t["approved_account_ids"]);
    assert_eq!(token_state(&env, &id).await?["epoch"], json!(2), "epoch bumped on transfer AND on revert");

    // receiver tries to sign while it temporarily owns the token -> blocked by in-flight lock
    let r = env.alice
        .call(env.nft.id(), "nft_transfer_call")
        .args_json(json!({ "receiver_id": receiver.id(), "token_id": id, "msg": "sign_then_return" }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(200))
        .transact()
        .await?;
    let fails: Vec<String> = r.receipt_failures().iter().map(|o| format!("{:?}", o)).collect();
    println!("[transfer_call sign attempt] receipt failures: {fails:?}; logs: {:?}", r.logs());
    assert!(fails.iter().any(|f| f.contains("ERR_TRANSFER_IN_FLIGHT")), "{fails:?}");
    assert_eq!(owner_of(&env, &id).await?["owner_id"], json!(env.alice.id()));
    let s = token_state(&env, &id).await?;
    assert_eq!(s["pending_signs"], json!(0));
    assert_eq!(s["transfer_call_in_flight"], json!(false));

    // receiver keeps it
    let r = env.alice
        .call(env.nft.id(), "nft_transfer_call")
        .args_json(json!({ "receiver_id": receiver.id(), "token_id": id, "msg": "keep" }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    assert_eq!(r.json::<bool>()?, true);
    assert_eq!(owner_of(&env, &id).await?["owner_id"], json!(receiver.id()));
    Ok(())
}

#[tokio::test]
async fn approved_account_transfer_event_and_storage_probe() -> anyhow::Result<()> {
    let env = setup().await?;
    let id = mint(&env, &env.alice).await?;
    env.alice
        .call(env.nft.id(), "nft_approve")
        .args_json(json!({ "token_id": id, "account_id": env.carol.id() }))
        .deposit(NearToken::from_millinear(10))
        .transact()
        .await?
        .into_result()?;
    let r = env.carol
        .call(env.nft.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": env.bob.id(), "token_id": id, "approval_id": 1 }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(r.is_success(), "{:?}", r);
    let ev = r.logs().into_iter().find(|l| l.contains("nft_transfer")).unwrap().to_string();
    println!("[event] approved transfer log: {ev}");

    let probe: (u64, u64) = env.alice.call(env.nft.id(), "probe_storage").args_json(json!({ "key": "k1" })).transact().await?.json()?;
    println!("[storage] store::LookupMap insert delta without flush={} after flush={}", probe.0, probe.1);
    let cost: NearToken = env.nft.view("storage_byte_cost").await?.json()?;
    println!("[storage] storage_byte_cost = {} yocto", cost.as_yoctonear());
    Ok(())
}
