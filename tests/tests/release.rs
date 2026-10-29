//! INV-31 keyless birth (spec §5.16, SAT-036): one transaction from a parent account does
//! CreateAccount · Transfer · DeployContract · `new` · `nft_mint` ×7 with **no AddKey**.

mod common;

use anyhow::Result;
use common::payloads::{hex, sha256};
use common::*;
use near_workspaces::operations::Function;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, AccountId};
use serde_json::{Value, json};

struct Parent {
    worker: near_workspaces::Worker<near_workspaces::network::Sandbox>,
    team: Account,
    mpc: AccountId,
    usdc: AccountId,
    alice: Account,
}

async fn parent() -> Result<Parent> {
    let worker = worker().await?;
    let root = worker.root_account()?;
    let team = sub(&root, "team", 50).await?;
    let mpc = sub(&root, "mpc", 20)
        .await?
        .deploy(&wasm("mock-signer")?)
        .await?
        .into_result()?;
    let usdc = sub(&root, "usdc", 20)
        .await?
        .deploy(&wasm("mock-ft")?)
        .await?
        .into_result()?;
    usdc.call("new")
        .args_json(json!({}))
        .transact()
        .await?
        .into_result()?;
    let alice = sub(&root, "alice", 10).await?;
    Ok(Parent {
        worker,
        team,
        mpc: mpc.id().clone(),
        usdc: usdc.id().clone(),
        alice,
    })
}

fn birth_batch(
    p: &Parent,
    acct: &AccountId,
    wasm: &[u8],
    new_args: Value,
    last_mint_deposit: NearToken,
) -> near_workspaces::operations::Transaction {
    let mut tx = p
        .team
        .batch(acct)
        .create_account()
        .transfer(NearToken::from_near(5))
        .deploy(wasm)
        .call(
            Function::new("new")
                .args_json(new_args)
                .gas(Gas::from_tgas(30))
                .deposit(NearToken::from_yoctonear(0)),
        );
    for i in 0..7 {
        let dep = if i == 6 {
            last_mint_deposit
        } else {
            MINT_DEPOSIT
        };
        tx = tx.call(
            Function::new("nft_mint")
                .args_json(json!({ "receiver_id": p.alice.id() }))
                .gas(Gas::from_tgas(20))
                .deposit(dep),
        );
    }
    tx
}

fn good_new(p: &Parent) -> Value {
    json!({ "mpc": p.mpc, "usdc": p.usdc, "base_uri": BASE_URI })
}

/// The account exists, has no keys, runs the exact wasm, `config()` is right, ids 1–7 belong to the
/// persona, nothing else was minted, and a second `new` fails.
#[tokio::test]
async fn keyless_birth_batch() -> Result<()> {
    let p = parent().await?;
    let acct: AccountId = format!("satchel.{}", p.team.id()).parse()?;
    let code = wasm("satchel")?;
    let r = birth_batch(&p, &acct, &code, good_new(&p), MINT_DEPOSIT)
        .transact()
        .await?;
    assert!(r.is_success(), "birth failed: {}", fail_text(&r));
    eprintln!(
        "birth: {} B wasm (sha256 {}), burnt {:.1} Tgas",
        code.len(),
        hex(&sha256(&code)),
        r.total_gas_burnt.as_gas() as f64 / 1e12
    );

    // the receipt's action list: no AddKey anywhere
    let rc = rpc::tx_receipts(&p.worker, &r.outcome().transaction_hash, p.team.id()).await?;
    let birth: Vec<_> = rpc::action_receipts(&rc)
        .into_iter()
        .filter(|a| a.receiver == acct.as_str() && a.predecessor == p.team.id().as_str())
        .collect();
    assert_eq!(birth.len(), 1, "one receipt carries the whole batch");
    let kinds: Vec<String> = birth[0]
        .actions
        .iter()
        .map(|a| match a {
            Value::String(s) => s.clone(),
            Value::Object(o) => o.keys().next().cloned().unwrap_or_default(),
            _ => String::new(),
        })
        .collect();
    let mut want = vec![
        "CreateAccount",
        "Transfer",
        "DeployContract",
        "FunctionCall",
    ];
    want.extend(std::iter::repeat_n("FunctionCall", 7));
    assert_eq!(kinds, want, "action list");
    assert!(
        !rc.to_string().contains("AddKey"),
        "no AddKey in the birth tx"
    );

    // exists (view_account succeeds) AND has no keys (an empty list alone also means "no account")
    let acc = p.worker.view_account(&acct).await?;
    assert!(acc.balance.as_yoctonear() > 0);
    assert!(
        p.worker.view_access_keys(&acct).await?.is_empty(),
        "keyless"
    );
    assert_eq!(
        p.worker.view_code(&acct).await?,
        code,
        "deployed code = artifact"
    );

    let cfg: Value = p.worker.view(&acct, "config").await?.json()?;
    assert_eq!(cfg["mpc_contract_id"], p.mpc.to_string());
    assert_eq!(cfg["usdc_contract_id"], p.usdc.to_string());
    assert_eq!(cfg["base_uri"], BASE_URI);
    assert_eq!(cfg["next_token_id"], 8);
    assert_eq!(cfg["cooldown_blocks"], 250);
    for id in 1..=7 {
        let t: Value = p
            .worker
            .view(&acct, "nft_token")
            .args_json(json!({ "token_id": id.to_string() }))
            .await?
            .json()?;
        assert_eq!(t["owner_id"], p.alice.id().to_string(), "token {id}");
    }
    let t8: Value = p
        .worker
        .view(&acct, "nft_token")
        .args_json(json!({ "token_id": "8" }))
        .await?
        .json()?;
    assert!(t8.is_null());

    let again = p
        .team
        .call(&acct, "new")
        .args_json(good_new(&p))
        .transact()
        .await?;
    assert_fails_with(&again, "The contract has already been initialized");
    Ok(())
}

/// A batch with a failing action (bad `new` argument, or a short-paid 7th mint) reverts everything:
/// no account is left behind, and the corrected batch can be re-sent to the same id.
#[tokio::test]
async fn failed_birth_leaves_nothing() -> Result<()> {
    let p = parent().await?;
    let acct: AccountId = format!("satchel.{}", p.team.id()).parse()?;
    let code = wasm("satchel")?;

    let bad_new = json!({ "mpc": "NOT a valid account id!", "usdc": null, "base_uri": BASE_URI });
    let b0 = p
        .worker
        .view_account(p.team.id())
        .await?
        .balance
        .as_yoctonear();
    let r = birth_batch(&p, &acct, &code, bad_new, MINT_DEPOSIT)
        .transact()
        .await?;
    assert!(r.is_failure(), "bad new must fail the batch");
    assert!(
        p.worker.view_account(&acct).await.is_err(),
        "no account may exist after a failed birth"
    );
    let b1 = p
        .worker
        .view_account(p.team.id())
        .await?
        .balance
        .as_yoctonear();
    assert!(
        b0 - b1 < NearToken::from_millinear(100).as_yoctonear(),
        "transfer and deposits refunded ({} yocto spent)",
        b0 - b1
    );

    let r = birth_batch(&p, &acct, &code, good_new(&p), NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(r.is_failure(), "short-paid 7th mint must fail the batch");
    assert!(fail_text(&r).contains("ERR_DEPOSIT"), "{}", fail_text(&r));
    assert!(
        p.worker.view_account(&acct).await.is_err(),
        "no account after a failing last mint"
    );

    let r = birth_batch(&p, &acct, &code, good_new(&p), MINT_DEPOSIT)
        .transact()
        .await?;
    assert!(r.is_success(), "fixed batch re-sent: {}", fail_text(&r));
    assert!(p.worker.view_access_keys(&acct).await?.is_empty());
    Ok(())
}
