//! THROWAWAY Phase-0 spike tests (sdk agent): wasm compatibility + storage staking behaviour.
use near_workspaces::types::{Gas, NearToken};
use serde_json::json;

const ROOT: &str = env!("CARGO_MANIFEST_DIR");

fn wasm(name: &str) -> Vec<u8> {
    std::fs::read(format!("{ROOT}/../target/near/{name}/{name}.wasm")).unwrap()
}

/// Deploy wasm built by rustc 1.93 WITHOUT the wasm-opt post-step (path in NOWASMOPT_WASM).
#[tokio::test]
async fn deploy_without_wasm_opt() -> anyhow::Result<()> {
    let Ok(path) = std::env::var("NOWASMOPT_WASM") else {
        println!("skip: set NOWASMOPT_WASM");
        return Ok(());
    };
    let worker = near_workspaces::sandbox().await?;
    let c = worker.dev_deploy(&std::fs::read(path)?).await?;
    let r = c.call("new").args_json(json!({ "signer": "signer.test.near" })).transact().await?;
    println!("[no-wasm-opt] init result success={} err={:?}", r.is_success(), r.clone().into_result().err());
    let alice = worker.dev_create_account().await?;
    let m = alice
        .call(c.id(), "nft_mint")
        .args_json(json!({ "receiver_id": alice.id() }))
        .deposit(NearToken::from_millinear(100))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    println!("[no-wasm-opt] mint success={} gas={} Tgas err={:?}", m.is_success(), m.total_gas_burnt.as_gas() as f64 / 1e12, m.clone().into_result().err());
    Ok(())
}

/// A contract account must keep balance >= storage_usage * 1e19. Uncharged state growth drains
/// the liquid balance until every state-growing call fails with LackBalanceForState.
#[tokio::test]
async fn storage_staking_exhaustion_and_topup() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let root = worker.root_account()?;
    let code = wasm("spike_nft");
    // code bytes + ~0.03 NEAR headroom (gas for deploy/init + a few hundred bytes)
    let acct = root
        .create_subaccount("tight")
        .initial_balance(NearToken::from_millinear(2_650))
        .transact()
        .await?
        .into_result()?;
    let c = acct.deploy(&code).await?.into_result()?;
    c.call("new").args_json(json!({ "signer": "signer.test.near" })).transact().await?.into_result()?;
    let d = acct.view_account().await?;
    let stake = d.storage_usage as u128 * 10u128.pow(19);
    println!("[storage] code={} B storage_usage={} B balance={} yocto staked_for_storage={} liquid={}", code.len(), d.storage_usage, d.balance.as_yoctonear(), stake, d.balance.as_yoctonear() as i128 - stake as i128);

    let caller = worker.dev_create_account().await?;
    let mut ok = 0;
    let mut last_err = String::new();
    for i in 0..400 {
        let r = caller.call(c.id(), "probe_storage").args_json(json!({ "key": format!("k{i}") })).transact().await?;
        if r.is_success() {
            ok += 1;
        } else {
            last_err = format!("{:?}", r.into_result().err());
            break;
        }
    }
    println!("[storage] uncharged 151-byte writes that succeeded before failure: {ok}; error: {last_err}");
    assert!(last_err.contains("LackBalanceForState"), "{last_err}");

    // A paid mint also fails now? (mint charges the caller, but the contract balance check happens at receipt end)
    let m = caller
        .call(c.id(), "nft_mint")
        .args_json(json!({ "receiver_id": caller.id() }))
        .deposit(NearToken::from_millinear(100))
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    println!("[storage] mint with attached deposit while contract is at its storage limit: success={} err={:?}", m.is_success(), m.clone().into_result().err());

    // Anyone can top up a (locked) contract account with a plain transfer
    caller.transfer_near(c.id(), NearToken::from_millinear(50)).await?.into_result()?;
    let r = caller.call(c.id(), "probe_storage").args_json(json!({ "key": "after-topup" })).transact().await?;
    println!("[storage] after 0.05 NEAR top-up: probe success={}", r.is_success());
    assert!(r.is_success());
    Ok(())
}

/// near-contract-standards keeps owner_by_id in a legacy TreeMap<String, _>: enumeration is
/// lexicographic by token_id string, not numeric.
#[tokio::test]
async fn nft_tokens_enumeration_order() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let nft = worker.dev_deploy(&wasm("spike_nft")).await?;
    nft.call("new").args_json(json!({ "signer": "signer.test.near" })).transact().await?.into_result()?;
    let alice = worker.dev_create_account().await?;
    for _ in 0..12 {
        alice
            .call(nft.id(), "nft_mint")
            .args_json(json!({ "receiver_id": alice.id() }))
            .deposit(NearToken::from_millinear(20))
            .gas(Gas::from_tgas(50))
            .transact()
            .await?
            .into_result()?;
    }
    let toks: Vec<serde_json::Value> = nft.view("nft_tokens").args_json(json!({ "from_index": "0", "limit": 50 })).await?.json()?;
    let ids: Vec<&str> = toks.iter().map(|t| t["token_id"].as_str().unwrap()).collect();
    println!("[enum] nft_tokens order: {ids:?}");
    let v = nft.view("nft_tokens").args_json(json!({ "from_index": "0", "limit": 50 })).await?;
    println!("[enum] nft_tokens(12) view logs={:?} result_bytes={}", v.logs, v.result.len());
    let owned: Vec<serde_json::Value> = nft.view("nft_tokens_for_owner").args_json(json!({ "account_id": alice.id(), "limit": 50 })).await?.json()?;
    let ids2: Vec<&str> = owned.iter().map(|t| t["token_id"].as_str().unwrap()).collect();
    println!("[enum] nft_tokens_for_owner order: {ids2:?}");
    Ok(())
}

/// near-workspaces `unstable` feature: build the contract from source inside the test.
#[tokio::test]
async fn compile_project_from_test() -> anyhow::Result<()> {
    let t0 = std::time::Instant::now();
    let code = near_workspaces::compile_project(&format!("{ROOT}/../contracts/hello")).await?;
    println!("[compile_project] built {} bytes in {:?}", code.len(), t0.elapsed());
    let worker = near_workspaces::sandbox().await?;
    let c = worker.dev_deploy(&code).await?;
    c.call("new").args_json(json!({ "greeting": "hi" })).transact().await?.into_result()?;
    let g: String = c.view("get_greeting").await?.json()?;
    assert_eq!(g, "hi");
    Ok(())
}

/// Who pays for state growth on transfer? nft_transfer takes 1 yocto; receiver's
/// tokens_per_owner set is created on first receipt. Measure the contract's storage delta.
#[tokio::test]
async fn transfer_storage_delta() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let nft = worker.dev_deploy(&wasm("spike_nft")).await?;
    nft.call("new").args_json(json!({ "signer": "signer.test.near" })).transact().await?.into_result()?;
    let alice = worker.dev_create_account().await?;
    let bob = worker.dev_create_account().await?;
    for _ in 0..2 {
        alice.call(nft.id(), "nft_mint").args_json(json!({ "receiver_id": alice.id() }))
            .deposit(NearToken::from_millinear(20)).gas(Gas::from_tgas(50)).transact().await?.into_result()?;
    }
    let s0 = nft.view_account().await?.storage_usage;
    alice.call(nft.id(), "nft_transfer").args_json(json!({ "receiver_id": bob.id(), "token_id": "1" }))
        .deposit(NearToken::from_yoctonear(1)).transact().await?.into_result()?;
    let s1 = nft.view_account().await?.storage_usage;
    alice.call(nft.id(), "nft_transfer").args_json(json!({ "receiver_id": bob.id(), "token_id": "2" }))
        .deposit(NearToken::from_yoctonear(1)).transact().await?.into_result()?;
    let s2 = nft.view_account().await?.storage_usage;
    println!("[transfer-storage] first transfer to a new owner: {} bytes; second (owner already has a set, sender's set emptied): {} bytes", s1 as i64 - s0 as i64, s2 as i64 - s1 as i64);
    Ok(())
}

/// Logs emitted before a panic remain visible in the failed receipt outcome.
#[tokio::test]
async fn failed_receipt_keeps_logs() -> anyhow::Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let nft = worker.dev_deploy(&wasm("spike_nft")).await?;
    nft.call("new").args_json(json!({ "signer": "signer.test.near" })).transact().await?.into_result()?;
    let alice = worker.dev_create_account().await?;
    let r = alice.call(nft.id(), "nft_mint").args_json(json!({ "receiver_id": alice.id() }))
        .deposit(NearToken::from_yoctonear(1)).gas(Gas::from_tgas(50)).transact().await?;
    println!("[failed-logs] success={} logs={:?}", r.is_success(), r.logs());
    for f in r.receipt_failures() { println!("[failed-logs] failure receipt logs={:?}", f.logs); }
    let supply: String = nft.view("nft_total_supply").await?.json()?;
    println!("[failed-logs] nft_total_supply after failed mint = {supply}");
    Ok(())
}
