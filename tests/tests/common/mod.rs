//! Shared harness for the Satchel sandbox suite (near-workspaces 0.23.0 + mock signer + mock FT).
//!
//! Wasm comes from `target/near/<name>/<name>.wasm`, where `<name>` is the crate name with `-` → `_` (`satchel`,
//! `mock_signer`, `mock_ft`). Build each with `cargo near build non-reproducible-wasm --manifest-path
//! contracts/<crate>/Cargo.toml`. Overrides:
//! - `SATCHEL_WASM=<path>` tests another artifact, e.g. the reproducible build (kb/90 §12.3, R-35);
//! - `SANDBOX_VERSION=2.14.0-rc.5` runs against testnet's nearcore instead of the default 2.13.4.
#![allow(dead_code)]

pub mod payloads;
pub mod rpc;

use anyhow::{Context, Result, anyhow, ensure};
use near_workspaces::network::Sandbox;
use near_workspaces::operations::TransactionStatus;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId, Contract, Worker};
use serde_json::{Value, json};
use std::path::PathBuf;
use std::task::Poll;
use std::time::{Duration, Instant};

pub const YOCTO: NearToken = NearToken::from_yoctonear(1);
pub const COOLDOWN_BLOCKS: u64 = 250;
pub const MINT_DEPOSIT: NearToken = NearToken::from_millinear(20);
pub const LIST_DEPOSIT: NearToken = NearToken::from_millinear(10);
pub const STORAGE_BYTE_COST: u128 = 10_000_000_000_000_000_000;
pub const MAX_MPC_DEPOSIT: u128 = 10_000_000_000_000_000_000_000; // 0.01 NEAR
pub const BASE_URI: &str = "https://satchel.example/api/card/";
pub const USDC_STORAGE: NearToken = NearToken::from_micronear(1250);

/// Callers attach `min(300, 60 + 20·n)` Tgas (spec §5.5 SIGN_ATTACH_GAS).
pub fn sign_attach_gas(n: u64) -> Gas {
    Gas::from_tgas((60 + 20 * n).min(300))
}
/// The contract requires `30 + 18·n` Tgas (spec §5.5 MIN_SIGN_PREPAID).
pub fn min_sign_prepaid(n: u64) -> Gas {
    Gas::from_tgas(30 + 18 * n)
}
/// Callers attach `0.005 NEAR × n` (spec §5.5 SIGN_ATTACH_DEPOSIT).
pub fn sign_attach_deposit(n: u64) -> NearToken {
    NearToken::from_millinear((5 * n) as u128)
}

// ── wasm + worker ────────────────────────────────────────────────────────────────────────

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

pub fn wasm(krate: &str) -> Result<Vec<u8>> {
    let path = if krate == "satchel" {
        std::env::var("SATCHEL_WASM")
            .map(PathBuf::from)
            .unwrap_or_else(|_| repo_root().join("target/near/satchel/satchel.wasm"))
    } else {
        let f = krate.replace('-', "_");
        repo_root().join(format!("target/near/{f}/{f}.wasm"))
    };
    std::fs::read(&path).with_context(|| {
        format!(
            "missing {} — run `cargo near build non-reproducible-wasm --manifest-path contracts/{krate}/Cargo.toml`",
            path.display()
        )
    })
}

pub async fn worker() -> Result<Worker<Sandbox>> {
    match std::env::var("SANDBOX_VERSION") {
        Ok(v) if !v.is_empty() => Ok(near_workspaces::sandbox_with_version(&v).await?),
        _ => Ok(near_workspaces::sandbox().await?),
    }
}

// ── environment ──────────────────────────────────────────────────────────────────────────

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub root: Account,
    pub satchel: Contract,
    pub mpc: Contract,
    pub usdc: Contract,
    pub alice: Account,
    pub bob: Account,
    pub carol: Account,
}

pub struct Opts {
    /// Pass `usdc: Some(<mock ft>)` to `new` (else `None`, which disables USDC sales).
    pub usdc_enabled: bool,
    /// Register alice/bob/carol with the mock FT and give carol and bob 100 USDC.
    pub fund_usdc: bool,
    /// Tokens minted to alice in setup (ids "1".."n").
    pub mint_to_alice: u32,
}

impl Default for Opts {
    fn default() -> Self {
        Self {
            usdc_enabled: true,
            fund_usdc: true,
            mint_to_alice: 1,
        }
    }
}

pub async fn sub(root: &Account, name: &str, near: u128) -> Result<Account> {
    Ok(root
        .create_subaccount(name)
        .initial_balance(NearToken::from_near(near))
        .transact()
        .await?
        .into_result()?)
}

pub async fn setup() -> Result<Env> {
    setup_with(Opts::default()).await
}

pub async fn setup_with(o: Opts) -> Result<Env> {
    let worker = worker().await?;
    let root = worker.root_account()?;
    let (sw, mw, fw) = (wasm("satchel")?, wasm("mock-signer")?, wasm("mock-ft")?);

    let mpc = sub(&root, "mpc", 50)
        .await?
        .deploy(&mw)
        .await?
        .into_result()?;
    let usdc = sub(&root, "usdc", 50)
        .await?
        .deploy(&fw)
        .await?
        .into_result()?;
    usdc.call("new")
        .args_json(json!({}))
        .transact()
        .await?
        .into_result()?;
    let satchel = sub(&root, "satchel", 50)
        .await?
        .deploy(&sw)
        .await?
        .into_result()?;
    let alice = sub(&root, "alice", 100).await?;
    let bob = sub(&root, "bob", 100).await?;
    let carol = sub(&root, "carol", 100).await?;

    let usdc_arg = if o.usdc_enabled {
        json!(usdc.id())
    } else {
        Value::Null
    };
    satchel
        .call("new")
        .args_json(json!({ "mpc": mpc.id(), "usdc": usdc_arg, "base_uri": BASE_URI }))
        .transact()
        .await?
        .into_result()
        .map_err(|e| anyhow!("satchel.new failed: {e:?}"))?;

    let env = Env {
        worker,
        root,
        satchel,
        mpc,
        usdc,
        alice,
        bob,
        carol,
    };
    if o.usdc_enabled {
        // spec §5.12: the contract must be storage-registered before the first USDC sale.
        ft_register(&env, env.satchel.id()).await?;
    }
    if o.fund_usdc {
        for a in [&env.alice, &env.bob, &env.carol] {
            ft_register(&env, a.id()).await?;
        }
        ft_mint(&env, env.carol.id(), 100_000_000).await?;
        ft_mint(&env, env.bob.id(), 100_000_000).await?;
    }
    for _ in 0..o.mint_to_alice {
        mint(&env, &env.alice, env.alice.id()).await?;
    }
    Ok(env)
}

// ── generic result helpers ───────────────────────────────────────────────────────────────

/// Debug text of every failure in the result (tx-level and receipt-level).
pub fn fail_text(r: &ExecutionFinalResult) -> String {
    let mut s = String::new();
    if let Err(e) = r.clone().into_result() {
        s.push_str(&format!("{e:?}"));
    }
    for f in r.receipt_failures() {
        s.push_str(&format!(" | {f:?}"));
    }
    s
}

pub fn assert_fails_with(r: &ExecutionFinalResult, code: &str) {
    assert!(
        r.is_failure(),
        "expected failure {code}, got success: {:?}",
        r.logs()
    );
    let t = fail_text(r);
    assert!(t.contains(code), "expected {code}, got: {t}");
}

pub fn assert_ok(r: &ExecutionFinalResult) {
    assert!(r.is_success(), "expected success, got: {}", fail_text(r));
}

/// NEP-297 `satchel` events with the given name (data object; an array `data` is flattened).
pub fn events(r: &ExecutionFinalResult, name: &str) -> Vec<Value> {
    events_in(r.logs().iter().map(|s| s.to_string()), "satchel", name)
}

pub fn events_in(logs: impl Iterator<Item = String>, standard: &str, name: &str) -> Vec<Value> {
    let mut out = vec![];
    for l in logs {
        let Some(j) = l.strip_prefix("EVENT_JSON:") else {
            continue;
        };
        let Ok(v) = serde_json::from_str::<Value>(j) else {
            continue;
        };
        if v["standard"] != standard || v["event"] != name {
            continue;
        }
        match &v["data"] {
            Value::Array(a) => out.extend(a.iter().cloned()),
            d => out.push(d.clone()),
        }
    }
    out
}

pub fn num(v: &Value) -> u128 {
    match v {
        Value::Number(n) => n.as_u64().map(u128::from).unwrap_or(0),
        Value::String(s) => s.parse().unwrap_or(0),
        _ => panic!("not a number: {v}"),
    }
}

pub async fn height(env: &Env) -> Result<u64> {
    Ok(env.worker.view_block().await?.height())
}

pub async fn balance(env: &Env, id: &AccountId) -> Result<u128> {
    Ok(env.worker.view_account(id).await?.balance.as_yoctonear())
}

/// Balance once pending refund receipts have landed (tx status does not wait for gas refunds).
pub async fn settled_balance(env: &Env, id: &AccountId) -> Result<u128> {
    let mut b = balance(env, id).await?;
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(1200)).await;
        let b2 = balance(env, id).await?;
        if b2 == b {
            return Ok(b);
        }
        b = b2;
    }
    Err(anyhow!("balance of {id} never settled"))
}

pub fn assert_fails_with_any(r: &ExecutionFinalResult, codes: &[&str]) {
    assert!(
        r.is_failure(),
        "expected failure {codes:?}, got success: {:?}",
        r.logs()
    );
    let t = fail_text(r);
    assert!(
        codes.iter().any(|c| t.contains(c)),
        "expected one of {codes:?}, got: {t}"
    );
}

pub async fn storage_usage(env: &Env, id: &AccountId) -> Result<u64> {
    Ok(env.worker.view_account(id).await?.storage_usage)
}

/// Block height at which the receipt that produced the first log containing `needle` executed.
pub async fn receipt_height(
    env: &Env,
    r: &ExecutionFinalResult,
    executor: &AccountId,
) -> Result<u64> {
    let o = r
        .receipt_outcomes()
        .iter()
        .find(|o| &o.executor_id == executor)
        .ok_or_else(|| anyhow!("no receipt on {executor}"))?;
    Ok(env
        .worker
        .view_block()
        .block_hash(o.block_hash)
        .await?
        .height())
}

// ── NFT / satchel views and calls ────────────────────────────────────────────────────────

pub async fn mint(env: &Env, payer: &Account, to: &AccountId) -> Result<String> {
    let r = payer
        .call(env.satchel.id(), "nft_mint")
        .args_json(json!({ "receiver_id": to }))
        .deposit(MINT_DEPOSIT)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    ensure!(r.is_success(), "nft_mint failed: {}", fail_text(&r));
    let tok: Value = r.json()?;
    Ok(tok["token_id"]
        .as_str()
        .ok_or_else(|| anyhow!("no token_id in {tok}"))?
        .to_string())
}

pub async fn view(env: &Env, method: &str, args: Value) -> Result<Value> {
    Ok(env.satchel.view(method).args_json(args).await?.json()?)
}

pub async fn satchel_view(env: &Env, id: &str) -> Result<Value> {
    view(env, "satchel", json!({ "token_id": id })).await
}

pub async fn owner_of(env: &Env, id: &str) -> Result<String> {
    let t = view(env, "nft_token", json!({ "token_id": id })).await?;
    Ok(t["owner_id"].as_str().unwrap_or_default().to_string())
}

pub async fn sig_count(env: &Env, id: &str) -> Result<u64> {
    Ok(num(&satchel_view(env, id).await?["sig_count"]) as u64)
}

pub async fn sig_records(env: &Env, id: &str) -> Result<Vec<Value>> {
    let mut out = vec![];
    loop {
        let page: Vec<Value> = serde_json::from_value(
            view(
                env,
                "sig_records",
                json!({ "token_id": id, "from_seq": out.len() as u64, "limit": 50 }),
            )
            .await?,
        )?;
        let n = page.len();
        out.extend(page);
        if n < 50 {
            return Ok(out);
        }
    }
}

pub async fn config(env: &Env) -> Result<Value> {
    view(env, "config", json!({})).await
}

// ── mock signer ──────────────────────────────────────────────────────────────────────────

pub async fn set_mode(env: &Env, mode: &str) -> Result<()> {
    env.mpc
        .call("set_mode")
        .args_json(json!({ "mode": mode }))
        .transact()
        .await?
        .into_result()?;
    Ok(())
}

pub async fn mpc_requests(env: &Env) -> Result<Vec<Value>> {
    Ok(env
        .mpc
        .view("requests")
        .args_json(json!({ "from_index": 0, "limit": 1000 }))
        .await?
        .json()?)
}

pub async fn mpc_count(env: &Env) -> Result<u64> {
    Ok(env
        .mpc
        .view("request_count")
        .args_json(json!({}))
        .await?
        .json()?)
}

pub async fn mpc_pending(env: &Env) -> Result<Vec<Value>> {
    Ok(env
        .mpc
        .view("pending_requests")
        .args_json(json!({}))
        .await?
        .json()?)
}

/// Wait until the mock has at least `n` pending (yielded) requests.
pub async fn wait_mpc_pending(env: &Env, n: usize) -> Result<Vec<Value>> {
    let t0 = Instant::now();
    loop {
        let p = mpc_pending(env).await?;
        if p.len() >= n {
            return Ok(p);
        }
        ensure!(
            t0.elapsed() < Duration::from_secs(30),
            "mock never saw {n} pending requests (has {})",
            p.len()
        );
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
}

/// Play the MPC node: resume request `id` with a JSON response.
pub async fn mpc_respond(env: &Env, id: u64, response: Value) -> Result<ExecutionFinalResult> {
    Ok(env
        .carol
        .call(env.mpc.id(), "respond")
        .args_json(json!({ "request_id": id, "response": response }))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

pub async fn mpc_respond_valid(env: &Env, id: u64) -> Result<()> {
    let r = env
        .carol
        .call(env.mpc.id(), "respond_valid")
        .args_json(json!({ "request_id": id }))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    ensure!(r.is_success(), "respond_valid failed: {}", fail_text(&r));
    Ok(())
}

pub async fn mpc_respond_raw(env: &Env, id: u64, data: &str) -> Result<()> {
    let r = env
        .carol
        .call(env.mpc.id(), "respond_raw")
        .args_json(json!({ "request_id": id, "data": data }))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    ensure!(r.is_success(), "respond_raw failed: {}", fail_text(&r));
    Ok(())
}

// ── signing ──────────────────────────────────────────────────────────────────────────────

pub struct SignOpts {
    pub gas: Option<Gas>,
    pub deposit: Option<NearToken>,
    pub mpc_deposit: Option<u128>,
}

impl SignOpts {
    pub fn default_for(_n: u64) -> Self {
        Self {
            gas: None,
            deposit: None,
            mpc_deposit: None,
        }
    }
}

/// C7: a message record stores its body, so callers attach 0.005 NEAR + len × 1e19 yocto (`messageSignAttachDeposit`).
pub fn message_len(request: &Value) -> Option<usize> {
    ["evm_message", "sol_message"]
        .iter()
        .find_map(|k| request[k]["message"].as_str())
        .map(|h| h.trim_start_matches("0x").trim_start_matches("0X").len() / 2)
}

pub fn sign_deposit_for(request: &Value) -> NearToken {
    match message_len(request) {
        Some(len) => NearToken::from_yoctonear(sign_attach_deposit(1).as_yoctonear() + len as u128 * STORAGE_BYTE_COST),
        None => sign_attach_deposit(n_of(request)),
    }
}

pub fn n_of(request: &Value) -> u64 {
    request["btc"]["preimages"]
        .as_array()
        .map(|a| a.len() as u64)
        .unwrap_or(1)
        .max(1)
}

fn sign_call(
    env: &Env,
    who: &Account,
    id: &str,
    request: &Value,
    o: &SignOpts,
) -> near_workspaces::operations::CallTransaction {
    let n = n_of(request);
    let mut args = json!({ "token_id": id, "request": request });
    if let Some(d) = o.mpc_deposit {
        args["mpc_deposit"] = json!(d.to_string());
    }
    who.call(env.satchel.id(), "sign_for")
        .args_json(args)
        .gas(o.gas.unwrap_or_else(|| sign_attach_gas(n)))
        .deposit(o.deposit.unwrap_or_else(|| sign_deposit_for(request)))
}

/// Submit `sign_for` without blocking on the yield (kb/21 §TL;DR 4).
pub async fn start_sign(
    env: &Env,
    who: &Account,
    id: &str,
    request: &Value,
) -> Result<TransactionStatus> {
    start_sign_with(env, who, id, request, SignOpts::default_for(n_of(request))).await
}

pub async fn start_sign_with(
    env: &Env,
    who: &Account,
    id: &str,
    request: &Value,
    o: SignOpts,
) -> Result<TransactionStatus> {
    Ok(sign_call(env, who, id, request, &o)
        .transact_async()
        .await?)
}

/// For calls that must fail before any promise is created (no yield to wait for).
pub async fn sign_sync_fail(
    env: &Env,
    who: &Account,
    id: &str,
    request: &Value,
    o: SignOpts,
) -> Result<ExecutionFinalResult> {
    let st = sign_call(env, who, id, request, &o)
        .transact_async()
        .await?;
    wait_final(&st, Duration::from_secs(60)).await
}

/// Poll until the tx is final. Use for txs that fail fast or never yield.
pub async fn wait_final(st: &TransactionStatus, max: Duration) -> Result<ExecutionFinalResult> {
    let t0 = Instant::now();
    loop {
        if let Poll::Ready(r) = st.status().await? {
            return Ok(r);
        }
        ensure!(t0.elapsed() < max, "timed out waiting for tx {}", st.hash());
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

/// Poll until the tx is Ready AND `on_signed` has logged `sign_resolved` (status can be Ready early,
/// kb/21 §Gotchas), or the tx failed.
pub async fn wait_resolved(st: &TransactionStatus, max: Duration) -> Result<ExecutionFinalResult> {
    let t0 = Instant::now();
    loop {
        if let Poll::Ready(r) = st.status().await?
            && (r.is_failure() || !events(&r, "sign_resolved").is_empty())
        {
            return Ok(r);
        }
        ensure!(
            t0.elapsed() < max,
            "timed out waiting for sign_resolved on {}",
            st.hash()
        );
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

/// Sign with the mock in its current (auto-reply) mode and wait for the callback.
pub async fn sign_and_wait(
    env: &Env,
    who: &Account,
    id: &str,
    request: &Value,
) -> Result<ExecutionFinalResult> {
    let st = start_sign(env, who, id, request).await?;
    wait_resolved(&st, Duration::from_secs(60)).await
}

/// Fast-forward until `list` is allowed for token `id` (height ≥ listable_at), plus a margin.
pub async fn pass_quiet_period(env: &Env, id: &str) -> Result<()> {
    let listable_at = num(&satchel_view(env, id).await?["listable_at"]) as u64;
    let h = height(env).await?;
    if h < listable_at + 2 {
        env.worker.fast_forward(listable_at + 2 - h).await?;
    }
    Ok(())
}

// ── sale ─────────────────────────────────────────────────────────────────────────────────

pub async fn list(
    env: &Env,
    who: &Account,
    id: &str,
    price: u128,
    currency: &str,
) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "list")
        .args_json(json!({ "token_id": id, "price": price.to_string(), "currency": currency }))
        .deposit(LIST_DEPOSIT)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

pub async fn list_ok(
    env: &Env,
    who: &Account,
    id: &str,
    price: u128,
    currency: &str,
) -> Result<u64> {
    let r = list(env, who, id, price, currency).await?;
    ensure!(r.is_success(), "list failed: {}", fail_text(&r));
    Ok(r.json::<u64>()?)
}

pub async fn delist(env: &Env, who: &Account, id: &str) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "delist")
        .args_json(json!({ "token_id": id }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

pub async fn buy(
    env: &Env,
    who: &Account,
    id: &str,
    listing_id: u64,
    sig_count: u64,
    attached: NearToken,
) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "buy")
        .args_json(
            json!({ "token_id": id, "listing_id": listing_id, "expected_sig_count": sig_count }),
        )
        .deposit(attached)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?)
}

pub async fn transfer(
    env: &Env,
    who: &Account,
    id: &str,
    to: &AccountId,
) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.satchel.id(), "nft_transfer")
        .args_json(json!({ "receiver_id": to, "token_id": id }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

// ── mock FT ──────────────────────────────────────────────────────────────────────────────

pub async fn ft_register(env: &Env, who: &AccountId) -> Result<()> {
    env.root
        .call(env.usdc.id(), "storage_deposit")
        .args_json(json!({ "account_id": who, "registration_only": true }))
        .deposit(USDC_STORAGE)
        .transact()
        .await?
        .into_result()?;
    Ok(())
}

pub async fn ft_mint(env: &Env, who: &AccountId, amount: u128) -> Result<()> {
    env.root
        .call(env.usdc.id(), "mint")
        .args_json(json!({ "account_id": who, "amount": amount.to_string() }))
        .transact()
        .await?
        .into_result()?;
    Ok(())
}

pub async fn ft_balance(env: &Env, who: &AccountId) -> Result<u128> {
    let v: Value = env
        .usdc
        .view("ft_balance_of")
        .args_json(json!({ "account_id": who }))
        .await?
        .json()?;
    Ok(num(&v))
}

/// `usdc.ft_transfer_call(satchel, amount, msg)` with 1 yocto and 150 Tgas (spec §5.5 BUY_USDC_ATTACH).
pub async fn ft_buy(
    env: &Env,
    who: &Account,
    amount: u128,
    msg: &str,
) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(env.usdc.id(), "ft_transfer_call")
        .args_json(
            json!({ "receiver_id": env.satchel.id(), "amount": amount.to_string(), "msg": msg }),
        )
        .deposit(YOCTO)
        .gas(Gas::from_tgas(150))
        .transact()
        .await?)
}

pub fn buy_msg(id: &str, listing_id: u64, sig_count: u64) -> String {
    json!({ "buy": { "token_id": id, "listing_id": listing_id, "expected_sig_count": sig_count } })
        .to_string()
}
