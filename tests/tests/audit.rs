//! Test audit 2026-10-30 (docs/testing/contract.md): gaps found by the coverage audit, end to end on the sandbox.
//! - AUDIT-01 (BUG, ignored): the BIP143 split-amount requests bypass a delegate's BTC cap on the real wasm.
//! - AUDIT-02 (BUG, Info, ignored): `listings(from_index ≥ 2^32)` wraps to the first page on wasm32.
//! - wNEAR (`wrap.testnet`, allowlisted for inside deposits only): deposit, withdraw, refused buy/offer, re-credit.
//! - Event fields of the sale path (`listed`, `delisted`, `sold`, `payout`) on the real wasm.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, KeyType, NearToken, SecretKey};
use near_workspaces::{Account, AccountId, Contract};
use serde_json::{Value, json};

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;

fn used(r: &ExecutionFinalResult) -> u128 {
    num(&r.clone().json::<Value>().expect("ft_transfer_call returns the used amount"))
}

async fn set_allowance(env: &Env, delegate: &Account, caps: Value) -> Result<ExecutionFinalResult> {
    Ok(env
        .alice
        .call(env.satchel.id(), "set_allowance")
        .args_json(json!({ "token_id": "1", "delegate": delegate.id(), "caps": caps }))
        .deposit(NearToken::from_millinear(10))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?)
}

/// AUDIT-01 on the real wasm. Two delegate requests for ONE 2-input tx (each input really holds 1,000,000 sats; the
/// single output returns 1,000,000 sats to the Satchel's own P2WPKH, so the real fee is 1,000,000 sats). Request 1
/// states input A's real amount and 1 sat for B; request 2 the reverse. Each is debited 1 sat, yet the record of A from
/// request 1 and of B from request 2 are the sighashes of the REAL tx, i.e. both signatures are spendable together.
/// Expected: the second request is refused ERR_ALLOWANCE_EXCEEDED under a 1,000-sat cap.
#[tokio::test]
#[ignore = "BUG AUDIT-01: BIP143 split-amount requests let a delegate burn BTC as fee far beyond its cap"]
async fn audit01_btc_split_amount_requests_bypass_the_delegate_cap() -> Result<()> {
    let env = setup().await?;
    const X: u64 = 1_000_000;
    let mut real = BtcTx::new(2, 0x5a);
    for i in real.inputs.iter_mut() {
        i.amount = X;
    }
    let mut own = vec![0x00, 0x14];
    own.extend(real.pkh);
    real.outputs = vec![(X, own)];
    let mut r1 = real.clone();
    r1.inputs[1].amount = 1;
    let mut r2 = real.clone();
    r2.inputs[0].amount = 1;

    assert_ok(&set_allowance(&env, &env.carol, json!([{ "asset": "btc", "limit": "1000" }])).await?);
    let r = sign_and_wait(&env, &env.carol, "1", &r1.req()).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowance_spent")[0]["debits"], json!([{ "asset": "btc", "amount": "1" }]));
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs[0]["payload"], hex(&sha256d(&real.preimage(0))), "input A: the real tx's sighash");

    let r = sign_sync_fail(&env, &env.carol, "1", &r2.req(), SignOpts::default_for(2)).await?;
    // Today this succeeds with a 1-sat debit and records input B's real sighash (seq 3):
    if r.is_success() {
        let recs = sig_records(&env, "1").await?;
        assert_eq!(recs[3]["payload"], hex(&sha256d(&real.preimage(1))), "input B: the real tx's sighash");
    }
    assert_fails_with(&r, "ERR_ALLOWANCE_EXCEEDED");
    Ok(())
}

/// AUDIT-02 (Info). `listings` does `iter().skip(from_index as usize)`; on wasm32 `usize` is 32 bits, so
/// `from_index = 2^32` truncates to 0 and returns the FIRST page instead of an empty one. Harmless for the UI (it
/// pages from 0), but a client that pages by offset can loop forever or double-count. Suggested fix: clamp
/// (`usize::try_from(from_index).unwrap_or(usize::MAX)`) or compare against `listings.len()` first.
#[tokio::test]
#[ignore = "BUG AUDIT-02: listings(from_index >= 2^32) wraps to the first page on wasm32"]
async fn audit02_listings_from_index_does_not_wrap() -> Result<()> {
    let env = setup().await?;
    list_ok(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    assert_eq!(view(&env, "listings", json!({ "from_index": 0, "limit": 50 })).await?.as_array().unwrap().len(), 1);
    assert!(view(&env, "listings", json!({ "from_index": 1, "limit": 50 })).await?.as_array().unwrap().is_empty());
    let page = view(&env, "listings", json!({ "from_index": 4_294_967_296u64, "limit": 50 })).await?;
    assert!(page.as_array().unwrap().is_empty(), "offset 2^32 must be past the end, got {page}");
    Ok(())
}

/// Companion of AUDIT-02 that passes: the other paged views are not affected (`sig_records` and `offers_for` keep
/// u64 offsets; NEP-181 `nft_tokens` refuses an offset past the supply).
#[tokio::test]
async fn audit02_other_paged_views_handle_huge_offsets() -> Result<()> {
    let env = setup().await?;
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&unhex(KB_EVM_TX))).await?);
    let big = 4_294_967_296u64;
    assert!(view(&env, "sig_records", json!({ "token_id": "1", "from_seq": big, "limit": 50 })).await?.as_array().unwrap().is_empty());
    assert!(view(&env, "offers_for", json!({ "token_id": "1", "from_index": big, "limit": 50 })).await?.as_array().unwrap().is_empty());
    assert!(view(&env, "offers_by", json!({ "account_id": env.bob.id(), "from_index": big, "limit": 50 })).await?.as_array().unwrap().is_empty());
    let r = env.satchel.view("nft_tokens").args_json(json!({ "from_index": big.to_string(), "limit": 50 })).await;
    assert!(r.is_err(), "near-contract-standards refuses an out-of-bounds from_index");
    Ok(())
}

/// Deploys the mock FT at `wrap.testnet` (a sandbox TLA `testnet`, then `wrap`): the contract allowlists that id
/// for inside deposits regardless of `usdc`.
async fn deploy_wnear(env: &Env) -> Result<Contract> {
    let tla = env
        .worker
        .create_tla("testnet".parse()?, SecretKey::from_random(KeyType::ED25519))
        .await?
        .into_result()?;
    let wrap = tla
        .create_subaccount("wrap")
        .initial_balance(NearToken::from_near(20))
        .transact()
        .await?
        .into_result()?;
    let w = wrap.deploy(&wasm("mock-ft")?).await?.into_result()?;
    w.call("new").args_json(json!({ "name": "Wrapped NEAR", "symbol": "wNEAR" })).transact().await?.into_result()?;
    for a in [env.satchel.id(), env.alice.id(), env.bob.id()] {
        env.root
            .call(w.id(), "storage_deposit")
            .args_json(json!({ "account_id": a, "registration_only": true }))
            .deposit(USDC_STORAGE)
            .transact()
            .await?
            .into_result()?;
    }
    env.root.call(w.id(), "mint").args_json(json!({ "account_id": env.bob.id(), "amount": (10 * ONE_NEAR).to_string() })).transact().await?.into_result()?;
    Ok(w)
}

async fn wnear_call(env: &Env, w: &Contract, who: &Account, amount: u128, msg: &Value) -> Result<ExecutionFinalResult> {
    Ok(who
        .call(w.id(), "ft_transfer_call")
        .args_json(json!({ "receiver_id": env.satchel.id(), "amount": amount.to_string(), "msg": msg.to_string() }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(150))
        .transact()
        .await?)
}

async fn wnear_balance(w: &Contract, who: &AccountId) -> Result<u128> {
    Ok(num(&w.view("ft_balance_of").args_json(json!({ "account_id": who })).await?.json::<Value>()?))
}

/// C6 with the second allowlisted FT, wNEAR, which had unit coverage only: a deposit through `ft_on_transfer`
/// (storage from the sender's credit), `buy` and `offer` msgs from wNEAR refused (`ERR_WRONG_TOKEN`, refunded 100 %),
/// `withdraw_ft` of wNEAR to the owner, and a withdrawal to an unregistered receiver re-credited.
#[tokio::test]
async fn audit_wnear_inside_deposit_withdraw_and_refusals() -> Result<()> {
    let env = setup().await?;
    let w = deploy_wnear(&env).await?;
    assert_eq!(w.id().as_str(), "wrap.testnet");
    // no storage credit yet: a first deposit needs it → refunded
    let r = wnear_call(&env, &w, &env.bob, ONE_NEAR, &json!({ "deposit": "1" })).await?;
    assert_eq!(used(&r), 0, "refunded: {}", fail_text(&r));
    let pre = env.bob.call(env.satchel.id(), "prepay_storage").args_json(json!({})).deposit(NearToken::from_yoctonear(10 * MILLI)).transact().await?;
    assert_ok(&pre);
    let r = wnear_call(&env, &w, &env.bob, ONE_NEAR, &json!({ "deposit": "1" })).await?;
    assert_eq!(used(&r), ONE_NEAR, "{}", fail_text(&r));
    assert_eq!(events(&r, "inside_deposit")[0]["ft"], "wrap.testnet");
    let ins = view(&env, "inside_of", json!({ "token_id": "1" })).await?;
    assert_eq!(ins["fts"], json!([{ "token": "wrap.testnet", "amount": ONE_NEAR.to_string() }]));
    // wNEAR may not buy or make offers
    let lid = list_ok(&env, &env.alice, "1", 5, "usdc").await?;
    let r = wnear_call(&env, &w, &env.bob, 5, &json!({ "buy": { "token_id": "1", "listing_id": lid, "expected_sig_count": 0 } })).await?;
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_WRONG_TOKEN"), "{}", fail_text(&r));
    let now = env.worker.view_block().await?.timestamp() / 1_000_000;
    let r = wnear_call(&env, &w, &env.bob, 5, &json!({ "offer": { "token_id": "1", "expected_sig_count": 0, "expected_inside_epoch": 0, "expires_at_ms": now + 3_600_000 } })).await?;
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_WRONG_TOKEN"), "{}", fail_text(&r));
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    assert_ok(&delist(&env, &env.alice, "1").await?);
    // withdraw to the owner
    let wd = |to: Option<&AccountId>, amount: u128| {
        env.alice
            .call(env.satchel.id(), "withdraw_ft")
            .args_json(json!({ "token_id": "1", "ft": "wrap.testnet", "amount": amount.to_string(), "receiver_id": to }))
            .deposit(YOCTO)
            .gas(Gas::from_tgas(50))
            .transact()
    };
    let r = wd(None, ONE_NEAR / 4).await?;
    assert!(r.is_success() && r.clone().json::<bool>()?, "{}", fail_text(&r));
    assert_eq!(wnear_balance(&w, env.alice.id()).await?, ONE_NEAR / 4);
    // to an existing account never registered with wNEAR: ft_transfer fails → re-credited, epoch stays bumped
    let dave = sub(&env.root, "dave", 5).await?;
    let r = wd(Some(dave.id()), ONE_NEAR / 4).await?;
    assert!(r.is_success(), "{}", fail_text(&r));
    assert!(!r.clone().json::<bool>()?);
    let ins = view(&env, "inside_of", json!({ "token_id": "1" })).await?;
    assert_eq!(ins["fts"], json!([{ "token": "wrap.testnet", "amount": (3 * ONE_NEAR / 4).to_string() }]));
    assert_eq!(ins["inside_epoch"], 2);
    // the FT books balance: the contract holds exactly what is inside
    assert_eq!(wnear_balance(&w, env.satchel.id()).await?, 3 * ONE_NEAR / 4);
    Ok(())
}

/// Event fields of the sale path on the real wasm (unit tests cover them on the mock): `listed`, `delisted`, `sold`
/// and `payout` carry exactly the documented keys (spec §5.13).
#[tokio::test]
async fn audit_sale_path_event_fields() -> Result<()> {
    let env = setup().await?;
    let r = list(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    assert_ok(&r);
    let lid = r.json::<u64>()?;
    let ev = &events(&list(&env, &env.alice, "1", ONE_NEAR, "near").await?, "listed");
    assert!(ev.is_empty(), "a refused second list emits nothing");
    let l = view(&env, "listings", json!({ "from_index": 0, "limit": 1 })).await?[0]["listing"].clone();
    let h = num(&l["listed_at"]) as u64;
    let r = delist(&env, &env.alice, "1").await?;
    assert_eq!(events(&r, "delisted"), vec![json!({ "token_id": "1", "listing_id": lid, "seller_id": env.alice.id() })]);
    let r = list(&env, &env.alice, "1", ONE_NEAR, "near").await?;
    let lid2 = r.clone().json::<u64>()?;
    let listed = &events(&r, "listed")[0];
    assert_eq!(listed["listing_id"], lid2);
    assert_eq!(listed["seller_id"], env.alice.id().to_string());
    assert_eq!(listed["price"], ONE_NEAR.to_string());
    assert_eq!(listed["currency"], "near");
    assert_eq!(listed["sig_count"], 0);
    assert!(num(&listed["listed_at"]) as u64 > h);
    assert_eq!(listed.as_object().unwrap().len(), 7, "{listed}");
    let r = buy(&env, &env.carol, "1", lid2, 0, NearToken::from_yoctonear(ONE_NEAR)).await?;
    assert_ok(&r);
    assert_eq!(
        events(&r, "sold"),
        vec![json!({ "token_id": "1", "listing_id": lid2, "seller_id": env.alice.id(), "buyer_id": env.carol.id(), "price": ONE_NEAR.to_string(), "currency": "near" })]
    );
    assert_eq!(
        events(&r, "payout"),
        vec![json!({ "account_id": env.alice.id(), "currency": "near", "amount": ONE_NEAR.to_string(), "ok": true })]
    );
    Ok(())
}
