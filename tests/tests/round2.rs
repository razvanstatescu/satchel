//! Test audit round two, 2026-10-30 (docs/testing/contract.md §7), on the real wasm after the AUDIT-01/-02/-04 fixes.
//! - Events after the AUDIT-04 move: each success path logs every event exactly once, in the order the spec and the
//!   app's parsers expect (`apps/web/src/lib/near/history.ts::contractEvents` keeps only the events of successful
//!   receipts executed by the contract, in receipt order; `lib/data/sale.ts` pairs `sold` with the `payout` of the same tx).
//! - The delegate path: `sign_requested` keeps the owner and carries no `requester` (the record does), extra JSON
//!   arguments cannot relabel a request, an in-flight delegated signature survives a transfer.
//! - Q-03 (withdraw to the MPC or the USDC contract as receiver) and Q-04 (`ft_on_transfer` extra fields): the current
//!   behaviour, pinned. No contract behaviour is changed by this file.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId};
use serde_json::{Value, json};
use std::time::Duration;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const USDC: u128 = 1_000_000;

// ── helpers ─────────────────────────────────────────────────────────────────────────────

/// What the app sees: `(standard, event)` of every NEP-297 log of a SUCCESSFUL receipt executed by the contract, in
/// receipt order (history.ts `contractEvents`). Each entry also carries its receipt index, so "same receipt" is checkable.
fn app_events(env: &Env, r: &ExecutionFinalResult) -> Vec<(usize, String, String, Value)> {
    let mut out = vec![];
    for (i, o) in r.receipt_outcomes().iter().enumerate() {
        if &o.executor_id != env.satchel.id() || !o.is_success() {
            continue;
        }
        for l in &o.logs {
            let Some(j) = l.strip_prefix("EVENT_JSON:") else { continue };
            let Ok(v) = serde_json::from_str::<Value>(j) else { continue };
            let data = match &v["data"] {
                Value::Array(a) if a.len() == 1 => a[0].clone(),
                d => d.clone(),
            };
            out.push((i, v["standard"].as_str().unwrap_or("").to_string(), v["event"].as_str().unwrap_or("").to_string(), data));
        }
    }
    out
}

fn names(ev: &[(usize, String, String, Value)]) -> Vec<String> {
    ev.iter().map(|(_, s, e, _)| format!("{s}:{e}")).collect()
}

/// Every log line of the contract's receipts, failed ones included (what a log-grepping indexer sees).
fn all_contract_event_names(env: &Env, r: &ExecutionFinalResult) -> Vec<String> {
    r.receipt_outcomes()
        .iter()
        .filter(|o| &o.executor_id == env.satchel.id())
        .flat_map(|o| o.logs.iter())
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["standard"] == "satchel" || v["standard"] == "nep171")
        .map(|v| format!("{}:{}", v["standard"].as_str().unwrap(), v["event"].as_str().unwrap()))
        .collect()
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

fn evm_cap() -> Value {
    json!([{ "asset": { "evm": { "chain_id": SEPOLIA } }, "limit": "1000000000000000000000" }])
}

async fn inside(env: &Env, id: &str) -> Result<Value> {
    view(env, "inside_of", json!({ "token_id": id })).await
}

async fn now_ms(env: &Env) -> Result<u64> {
    Ok(env.worker.view_block().await?.timestamp() / 1_000_000)
}

fn used(r: &ExecutionFinalResult) -> u128 {
    num(&r.clone().json::<Value>().expect("ft_transfer_call returns the used amount"))
}

async fn withdraw(env: &Env, method: &str, id: &str, amount: u128, to: &AccountId) -> Result<ExecutionFinalResult> {
    let mut args = json!({ "token_id": id, "amount": amount.to_string(), "receiver_id": to });
    if method == "withdraw_ft" {
        args["ft"] = json!(env.usdc.id());
    }
    Ok(env.alice.call(env.satchel.id(), method).args_json(args).deposit(YOCTO).gas(Gas::from_tgas(50)).transact().await?)
}

async fn prepay(env: &Env, who: &Account, amount: u128) -> Result<()> {
    let r = who
        .call(env.satchel.id(), "prepay_storage")
        .args_json(json!({}))
        .deposit(NearToken::from_yoctonear(amount))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    Ok(())
}

// ── events after the AUDIT-04 move ──────────────────────────────────────────────────────

/// Every ownership-changing success path, with allowances to clear, on the real wasm. Each event appears exactly once,
/// in the contract's main receipt, in this order; the payout's `payout` event follows in its callback receipt of the
/// SAME tx (what `saleFromTxs` pairs). A log-grepping view of all contract receipts sees nothing more.
#[tokio::test]
async fn r2_events_once_and_in_order_on_every_ownership_change() -> Result<()> {
    let env = setup().await?;
    // 1. nft_transfer (alice → bob) with a delegate
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, evm_cap()).await?);
    let r = transfer(&env, &env.alice, "1", env.bob.id()).await?;
    assert_ok(&r);
    let ev = app_events(&env, &r);
    assert_eq!(names(&ev), ["nep171:nft_transfer", "satchel:allowances_cleared"]);
    assert_eq!(ev[0].3, json!({ "old_owner_id": env.alice.id(), "new_owner_id": env.bob.id(), "token_ids": ["1"] }));
    assert_eq!(ev[1].3["reason"], "transfer");
    assert_eq!(all_contract_event_names(&env, &r), names(&ev));

    // 2. NEAR buy (bob → carol) with a delegate: one receipt for the sale, then on_payout
    assert_ok(&set_allowance(&env, &env.bob, &env.alice, evm_cap()).await?);
    let lid = list_ok(&env, &env.bob, "1", ONE_NEAR, "near").await?;
    let r = buy(&env, &env.carol, "1", lid, 0, NearToken::from_yoctonear(ONE_NEAR)).await?;
    assert_ok(&r);
    let ev = app_events(&env, &r);
    assert_eq!(names(&ev), ["nep171:nft_transfer", "satchel:allowances_cleared", "satchel:sold", "satchel:payout"]);
    assert!(ev[0].0 == ev[1].0 && ev[1].0 == ev[2].0 && ev[3].0 > ev[2].0, "sale events in one receipt, payout after: {ev:?}");
    assert_eq!(ev[0].3["memo"], "sale");
    assert_eq!(ev[3].3, json!({ "account_id": env.bob.id(), "currency": "near", "amount": ONE_NEAR.to_string(), "ok": true }));
    assert_eq!(all_contract_event_names(&env, &r), names(&ev));

    // 3. USDC buy (carol → bob), no delegates: no allowances_cleared
    let lid = list_ok(&env, &env.carol, "1", 5 * USDC, "usdc").await?;
    let r = ft_buy(&env, &env.bob, 5 * USDC, &buy_msg("1", lid, 0)).await?;
    assert_eq!(used(&r), 5 * USDC);
    let ev = app_events(&env, &r);
    assert_eq!(names(&ev), ["nep171:nft_transfer", "satchel:sold", "satchel:payout"]);
    assert_eq!(ev[1].3["currency"], "usdc");
    assert_eq!(ev[2].3["ok"], true);
    assert_eq!(all_contract_event_names(&env, &r), names(&ev));

    // 4. accept_offer on a listed token with a delegate (bob → alice)
    let exp = now_ms(&env).await? + 3_600_000;
    let r = env
        .alice
        .call(env.satchel.id(), "make_offer")
        .args_json(json!({ "token_id": "1", "amount": ONE_NEAR.to_string(), "expected_sig_count": 0,
                           "expected_inside_epoch": 0, "expires_at_ms": exp }))
        .deposit(NearToken::from_yoctonear(ONE_NEAR + 10 * MILLI))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    assert_eq!(names(&app_events(&env, &r)), ["satchel:offer_made"]);
    let oid = r.json::<u64>()?;
    assert_ok(&set_allowance(&env, &env.bob, &env.carol, evm_cap()).await?);
    list_ok(&env, &env.bob, "1", 2 * ONE_NEAR, "near").await?;
    let r = env.bob.call(env.satchel.id(), "accept_offer").args_json(json!({ "offer_id": oid })).deposit(YOCTO).gas(Gas::from_tgas(50)).transact().await?;
    assert_ok(&r);
    let ev = app_events(&env, &r);
    assert_eq!(
        names(&ev),
        ["satchel:delisted", "nep171:nft_transfer", "satchel:allowances_cleared", "satchel:offer_accepted", "satchel:payout"]
    );
    assert_eq!(ev[1].3["memo"], "offer");
    assert_eq!(ev[2].3["reason"], "sale");
    assert_eq!(all_contract_event_names(&env, &r), names(&ev));
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    Ok(())
}

/// The delegate signing path's events on the real wasm: `sign_requested` (owner_id = the OWNER, no `requester` field),
/// then `allowance_spent` (delegate_id, same first_seq) in the same receipt, then `sign_resolved` in the callback. The
/// delegate is visible only in the record's `requester` and in `allowance_spent` (C5.md §1.3). Finding R2-01: the web
/// app's live Activity reads `sign_requested.data.requester` (apps/web/src/lib/data/server.ts:295), which never exists.
#[tokio::test]
async fn r2_delegate_sign_events_and_requester() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, evm_cap()).await?);
    let r = sign_and_wait(&env, &env.carol, "1", &evm_req(&unhex(KB_EVM_TX))).await?;
    assert_ok(&r);
    let ev = app_events(&env, &r);
    assert_eq!(names(&ev), ["satchel:sign_requested", "satchel:allowance_spent", "satchel:sign_resolved"]);
    assert_eq!(ev[0].0, ev[1].0, "sign_requested and allowance_spent share the sign_for receipt");
    let req = &ev[0].3;
    assert_eq!(req["owner_id"], env.alice.id().to_string());
    assert!(req.get("requester").is_none(), "sign_requested has no requester field: {req}");
    assert_eq!(ev[1].3["delegate_id"], env.carol.id().to_string());
    assert_eq!(ev[1].3["first_seq"], req["first_seq"]);
    assert_eq!(sig_records(&env, "1").await?[0]["requester"], env.carol.id().to_string());
    Ok(())
}

// ── the delegate path ───────────────────────────────────────────────────────────────────

/// "Mislabeled" calls: extra JSON arguments (`requester`, `owner_id`, `signer`) are ignored by the generated
/// deserializer, so a delegate cannot pass itself off as the owner (the record names the delegate and it is debited);
/// a request object with two kinds is refused while deserializing, before anything is written.
#[tokio::test]
async fn r2_extra_sign_for_arguments_cannot_relabel_the_requester() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, evm_cap()).await?);
    let args = json!({ "token_id": "1", "request": evm_req(&unhex(KB_EVM_TX)), "requester": env.alice.id(),
                       "owner_id": env.alice.id(), "signer": env.alice.id() });
    let st = env.carol.call(env.satchel.id(), "sign_for").args_json(args).gas(sign_attach_gas(1)).deposit(sign_attach_deposit(1)).transact_async().await?;
    let r = wait_resolved(&st, Duration::from_secs(60)).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowance_spent")[0]["delegate_id"], env.carol.id().to_string());
    assert_eq!(sig_records(&env, "1").await?[0]["requester"], env.carol.id().to_string());
    // two kinds in one request object
    let mut two = evm_req(&EvmTx::transfer(1).encode());
    two["sol"] = sol_req(&sol_message(1_000, [9; 32]))["sol"].clone();
    for who in [&env.alice, &env.carol] {
        let st = who
            .call(env.satchel.id(), "sign_for")
            .args_json(json!({ "token_id": "1", "request": two }))
            .gas(sign_attach_gas(1))
            .deposit(sign_attach_deposit(1))
            .transact_async()
            .await?;
        let r = wait_final(&st, Duration::from_secs(60)).await?;
        assert!(r.is_failure(), "a two-kind request must not deserialize");
        assert!(fail_text(&r).contains("Failed to deserialize input from JSON"), "{}", fail_text(&r));
    }
    assert_eq!(sig_count(&env, "1").await?, 1);
    Ok(())
}

/// A delegate's signature in flight when the owner gives the token away: the record keeps the delegate as requester
/// and resolves `signed`; the allowance is gone (`allowances_cleared` on the transfer), the delegate's next request is
/// ERR_NOT_OWNER, and the new owner signs.
#[tokio::test]
async fn r2_inflight_delegate_sign_survives_a_transfer() -> Result<()> {
    let env = setup().await?;
    assert_ok(&set_allowance(&env, &env.alice, &env.carol, evm_cap()).await?);
    set_mode(&env, "manual").await?;
    let st = start_sign(&env, &env.carol, "1", &evm_req(&EvmTx::transfer(0).encode())).await?;
    wait_mpc_pending(&env, 1).await?;
    let r = transfer(&env, &env.alice, "1", env.bob.id()).await?;
    assert_ok(&r);
    assert_eq!(events(&r, "allowances_cleared")[0]["delegate_ids"], json!([env.carol.id()]));
    mpc_respond_valid(&env, 0).await?;
    let r = wait_resolved(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!((rec["status"].as_str(), rec["requester"].as_str()), (Some("signed"), Some(env.carol.id().as_str())));
    set_mode(&env, "reply").await?;
    let r = sign_sync_fail(&env, &env.carol, "1", &evm_req(&EvmTx::transfer(1).encode()), SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    assert_ok(&sign_and_wait(&env, &env.bob, "1", &evm_req(&EvmTx::transfer(1).encode())).await?);
    assert_eq!(sig_count(&env, "1").await?, 2);
    Ok(())
}

// ── Q-03: withdraw receivers ────────────────────────────────────────────────────────────

/// Q-03 (current behaviour, pinned; no change): `withdraw_near` refuses only the contract itself as receiver.
/// - To the MPC contract and to the USDC contract: DELIVERED (`inside_withdraw_resolved.ok = true`), the inside balance
///   is debited and the NEAR sits on those accounts, which no Satchel method can get back (user error, permanent loss).
/// - To a named account that does not exist: the transfer fails and the callback re-credits the token (no loss).
#[tokio::test]
async fn q03_withdraw_near_to_mpc_or_usdc_is_delivered_and_lost() -> Result<()> {
    let env = setup().await?;
    let r = env.bob.call(env.satchel.id(), "deposit_near").args_json(json!({ "token_id": "1" })).deposit(NearToken::from_near(1)).gas(Gas::from_tgas(30)).transact().await?;
    assert_ok(&r);
    let credited = num(&r.json::<Value>()?);
    let amt = 100 * MILLI;
    for to in [env.mpc.id().clone(), env.usdc.id().clone()] {
        let b0 = balance(&env, &to).await?;
        let r = withdraw(&env, "withdraw_near", "1", amt, &to).await?;
        assert_ok(&r);
        assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], true, "delivered to {to}");
        assert!(balance(&env, &to).await? >= b0 + amt - MILLI, "{to} received the NEAR");
    }
    assert_eq!(num(&inside(&env, "1").await?["near"]), credited - 2 * amt);
    let ghost: AccountId = format!("ghost.{}", env.root.id()).parse()?;
    let r = withdraw(&env, "withdraw_near", "1", amt, &ghost).await?;
    assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], false, "{}", fail_text(&r));
    assert_eq!(num(&inside(&env, "1").await?["near"]), credited - 2 * amt, "re-credited");
    let r = withdraw(&env, "withdraw_near", "1", amt, env.satchel.id()).await?;
    assert_fails_with(&r, "ERR_BAD_RECEIVER");
    Ok(())
}

/// Q-03 for USDC (mock FT with near-contract-standards semantics): to the MPC or to the USDC contract itself, an
/// unregistered receiver makes `ft_transfer` fail and the callback re-credits (no loss). But registration is
/// permissionless: once anyone pays `storage_deposit` for the MPC account, the same withdrawal is delivered and the
/// USDC is stranded there (the MPC contract has no way to send it on).
#[tokio::test]
async fn q03_withdraw_usdc_to_mpc_or_usdc_recredits_until_registered() -> Result<()> {
    let env = setup().await?;
    prepay(&env, &env.bob, 10 * MILLI).await?;
    assert_eq!(used(&ft_buy(&env, &env.bob, 10 * USDC, &json!({ "deposit": "1" }).to_string()).await?), 10 * USDC);
    for to in [env.mpc.id().clone(), env.usdc.id().clone()] {
        let r = withdraw(&env, "withdraw_ft", "1", USDC, &to).await?;
        assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], false, "{to}: {}", fail_text(&r));
        assert_eq!(inside(&env, "1").await?["fts"], json!([{ "token": env.usdc.id(), "amount": (10 * USDC).to_string() }]));
    }
    ft_register(&env, env.mpc.id()).await?; // anyone can do this
    let r = withdraw(&env, "withdraw_ft", "1", USDC, env.mpc.id()).await?;
    assert_eq!(events(&r, "inside_withdraw_resolved")[0]["ok"], true);
    assert_eq!(ft_balance(&env, env.mpc.id()).await?, USDC, "stranded at the MPC account");
    assert_eq!(inside(&env, "1").await?["fts"], json!([{ "token": env.usdc.id(), "amount": (9 * USDC).to_string() }]));
    Ok(())
}

// ── Q-04: ft_on_transfer extra fields ───────────────────────────────────────────────────

/// Q-04 (current behaviour, pinned; no change): unknown fields inside a known msg shape are IGNORED.
/// - A buy msg with `receiver_id` (another account) and a lower `price`: the sale goes through at the listing price,
///   the NFT goes to the FT sender, the extra fields have no effect.
/// - An offer msg with an `amount` field different from the transferred amount: the offer escrows the transferred
///   amount.
/// - A duplicate field inside the object is refused (serde `duplicate field`), so the FT refunds 100 % — note that a
///   JS client's `JSON.parse` would take the last value instead.
#[tokio::test]
async fn q04_ft_msg_extra_fields_are_ignored_and_duplicates_refused() -> Result<()> {
    let env = setup().await?;
    let lid = list_ok(&env, &env.alice, "1", 5 * USDC, "usdc").await?;
    let dup = format!(r#"{{"buy":{{"token_id":"1","token_id":"2","listing_id":{lid},"expected_sig_count":0}}}}"#);
    let b0 = ft_balance(&env, env.bob.id()).await?;
    let r = ft_buy(&env, &env.bob, 5 * USDC, &dup).await?;
    assert_eq!(used(&r), 0);
    assert!(fail_text(&r).contains("ERR_BAD_MSG"), "{}", fail_text(&r));
    assert_eq!(ft_balance(&env, env.bob.id()).await?, b0);
    assert_eq!(owner_of(&env, "1").await?, env.alice.id().to_string());
    let msg = json!({ "buy": { "token_id": "1", "listing_id": lid, "expected_sig_count": 0, "receiver_id": env.carol.id(), "price": "1" } });
    let r = ft_buy(&env, &env.bob, 5 * USDC, &msg.to_string()).await?;
    assert_eq!(used(&r), 5 * USDC);
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string(), "the sender gets the NFT, receiver_id is ignored");
    assert_eq!(events(&r, "sold")[0]["price"], (5 * USDC).to_string());
    // offer with a misleading `amount`
    prepay(&env, &env.carol, 10 * MILLI).await?;
    let exp = now_ms(&env).await? + 3_600_000;
    let msg = json!({ "offer": { "token_id": "1", "expected_sig_count": 0, "expected_inside_epoch": 0, "expires_at_ms": exp, "amount": "1" } });
    let r = ft_buy(&env, &env.carol, 3 * USDC, &msg.to_string()).await?;
    assert_eq!(used(&r), 3 * USDC);
    assert_eq!(events(&r, "offer_made")[0]["amount"], (3 * USDC).to_string());
    Ok(())
}
