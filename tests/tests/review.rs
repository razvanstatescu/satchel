//! Sprint security review (docs/security/sprint-review.md): sandbox measurements and proofs for C1–C7.
//! Large histories are injected with `patch_state` (borsh, in the contract's exact layout), so a 5,000-record history
//! costs seconds, not thousands of MPC round trips.

mod common;

use anyhow::Result;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use near_workspaces::AccountId;
use serde_json::json;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;

// ── borsh helpers (StorageKey order in lib.rs: TokenState = 4, SigLog = 5) ───────────────────────

fn bstr(s: &str) -> Vec<u8> {
    let mut v = (s.len() as u32).to_le_bytes().to_vec();
    v.extend_from_slice(s.as_bytes());
    v
}
fn state_key(token: &str) -> Vec<u8> {
    let mut k = vec![4u8];
    k.extend(bstr(token));
    k
}
fn sig_key(token: &str, seq: u64) -> Vec<u8> {
    let mut k = vec![5u8];
    k.extend(bstr(token));
    k.extend(seq.to_le_bytes());
    k
}
/// `TokenState { sig_count, last_sign_height, listing: None, max_evm_nonce: None }`
fn token_state(sig_count: u64, last_sign_height: u64) -> Vec<u8> {
    let mut v = sig_count.to_le_bytes().to_vec();
    v.extend(last_sign_height.to_le_bytes());
    v.push(0); // listing: None
    v.push(0); // max_evm_nonce: None
    v
}
/// One signed `SigRecord`. `detail_tag` 0 = `SigDetail::Evm { chain_id, nonce, unsigned_tx: body }`,
/// 3 = `SigDetail::EvmMessage { message: body }`.
fn record(seq: u64, requester: &str, detail_tag: u8, body: &[u8]) -> Vec<u8> {
    let mut v = seq.to_le_bytes().to_vec(); // request_id
    v.push(0); // input_index
    v.extend(100u64.to_le_bytes()); // height
    v.extend(1_793_000_000_000u64.to_le_bytes()); // timestamp_ms
    v.extend(bstr(requester));
    v.extend([0x11u8; 32]); // payload
    v.push(detail_tag);
    if detail_tag == 0 {
        v.extend(11_155_111u64.to_le_bytes());
        v.extend(seq.to_le_bytes());
    }
    v.extend((body.len() as u32).to_le_bytes());
    v.extend_from_slice(body);
    v.push(1); // status: Signed
    v.extend([0u8; 65]);
    v
}

/// Writes records `from..to` of `token` and sets its `sig_count` to `to`.
async fn inject(env: &Env, token: &str, from: u64, to: u64, detail_tag: u8, body: &[u8]) -> Result<()> {
    let requester = env.alice.id().to_string();
    let rows: Vec<(Vec<u8>, Vec<u8>)> = (from..to).map(|s| (sig_key(token, s), record(s, &requester, detail_tag, body))).collect();
    for chunk in rows.chunks(250) {
        env.worker
            .patch(env.satchel.id())
            .states(chunk.iter().map(|(k, v)| (k.as_slice(), v.as_slice())))
            .transact()
            .await?;
    }
    env.worker.patch(env.satchel.id()).state(&state_key(token), &token_state(to, 100)).transact().await?;
    Ok(())
}

/// Gas burnt by `history_digest` run as a 300 Tgas function call (the RPC view limit is also 300 Tgas), or None if
/// it failed (out of gas).
async fn digest_gas(env: &Env, token: &str) -> Result<Option<u64>> {
    let r = env
        .bob
        .call(env.satchel.id(), "history_digest")
        .args_json(json!({ "token_id": token }))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;
    Ok(r.is_success().then(|| r.total_gas_burnt.as_gas()))
}

fn free_of(a: &near_workspaces::types::AccountDetails) -> i128 {
    a.balance.as_yoctonear() as i128 - (a.storage_usage as u128 * STORAGE_BYTE_COST) as i128
}

/// Sanity for the injection helper: the contract reads an injected history like a real one.
#[tokio::test]
async fn sr_injected_history_reads_back() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 2, ..Default::default() }).await?;
    inject(&env, "2", 0, 3, 3, b"hello").await?;
    let rows = sig_records(&env, "2").await?;
    assert_eq!(rows.len(), 3);
    assert_eq!(rows[2]["detail"]["evm_message"]["message"], "68656c6c6f");
    assert_eq!(rows[2]["status"], "signed");
    let d = view(&env, "history_digest", json!({ "token_id": "2" })).await?;
    assert_eq!(d["sig_count"], 3);
    Ok(())
}

/// SR-05 (measurement + pin): `history_digest` reads every record, so its gas grows with the history. Spec §5.1 says it
/// "stays within the 300 Tgas view limit up to roughly 2,500 records". Measured here for the two extremes: small
/// native EVM records (52-byte tx) and maximal 1,024-byte C7 message records.
#[tokio::test]
async fn sr05_history_digest_gas_ceiling() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 3, ..Default::default() }).await?;
    let small_tx = vec![0x02u8; 52];
    let big_msg = vec![b'a'; 1024];
    let mut fits: Vec<(&str, u64, u64, Option<u64>)> = vec![];
    for (token, tag, body, label, steps) in [
        ("2", 0u8, &small_tx, "evm 52 B", &[500u64, 1000, 2000, 2500, 3000, 4000, 5000, 6000, 8000][..]),
        ("3", 3u8, &big_msg, "msg 1024 B", &[250u64, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000][..]),
    ] {
        let mut have = 0u64;
        let mut best = (0u64, 0u64);
        let mut first_fail = None;
        for &n in steps {
            inject(&env, token, have, n, tag, body).await?;
            have = n;
            let g = digest_gas(&env, token).await?;
            let view_ok = env.satchel.view("history_digest").args_json(json!({ "token_id": token })).await.is_ok();
            eprintln!("history_digest {label}: n={n} call_gas={:?} Tgas view_ok={view_ok}", g.map(|g| g as f64 / 1e12));
            match g {
                Some(g) if view_ok => best = (n, g),
                _ => {
                    first_fail = Some(n);
                    break;
                }
            }
        }
        eprintln!(
            "history_digest {label}: largest measured history that fits: {} records ({:.1} Tgas); first failure at {first_fail:?}",
            best.0,
            best.1 as f64 / 1e12
        );
        fits.push((label, best.0, best.1, first_fail));
    }
    assert!(fits[0].1 >= 2500, "small records: 2,500 must fit (spec §5.1): {fits:?}");
    Ok(())
}

/// SR-06 (measurement, feeds M-01): `accept_offer` charges no storage, so whatever it grows is paid by the contract.
/// Prints the contract-paid bytes for an accept by a first-time holder (bob owns no Satchel), next to an
/// `nft_transfer` to a first-time 64-char holder (the S-02 baseline).
#[tokio::test]
async fn sr06_accept_offer_storage_delta() -> Result<()> {
    let env = setup_with(Opts { usdc_enabled: false, fund_usdc: false, mint_to_alice: 3 }).await?;
    let now = env.worker.view_block().await?.timestamp() / 1_000_000;

    // bob offers 1 NEAR on token 1 (he owns nothing yet, so the accept creates his per-owner set)
    let r = env
        .bob
        .call(env.satchel.id(), "make_offer")
        .args_json(json!({ "token_id": "1", "amount": ONE_NEAR.to_string(), "expected_sig_count": 0,
                           "expected_inside_epoch": 0, "expires_at_ms": now + 3_600_000 }))
        .deposit(NearToken::from_yoctonear(ONE_NEAR + 10 * MILLI))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    let oid: u64 = r.json()?;
    let a0 = env.worker.view_account(env.satchel.id()).await?;
    let r = env
        .alice
        .call(env.satchel.id(), "accept_offer")
        .args_json(json!({ "offer_id": oid }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    assert_ok(&r);
    assert_eq!(owner_of(&env, "1").await?, env.bob.id().to_string());
    let a1 = env.worker.view_account(env.satchel.id()).await?;
    let accept_delta = a1.storage_usage as i64 - a0.storage_usage as i64;

    // the S-02 baseline: nft_transfer of token 2 to a first-time 64-char implicit holder
    let fresh: AccountId = "5b".repeat(32).parse()?;
    let s0 = storage_usage(&env, env.satchel.id()).await?;
    assert_ok(&transfer(&env, &env.alice, "2", &fresh).await?);
    let transfer_delta = storage_usage(&env, env.satchel.id()).await? as i64 - s0 as i64;

    eprintln!(
        "SR-06: accept_offer (offer record freed, first-time named holder) = {accept_delta:+} B contract-paid \
         (free balance {} → {} yocto, the 1 NEAR payout included); nft_transfer to a first-time 64-char holder = \
         {transfer_delta:+} B contract-paid",
        free_of(&a0),
        free_of(&a1)
    );
    assert!(transfer_delta > 0, "S-02 baseline: the contract pays for the new holder");
    Ok(())
}

/// M-01 (proof; fixed on `fix/m01-solvency` by `ensure_solvent`): contract-paid storage (the S-02 class: `nft_transfer`, `buy`,
/// `accept_offer` to a first-time holder) comes out of the same balance that holds user escrow since C4/C6. Once the
/// contract's own surplus is gone, transfers silently spend inside NEAR, I-M1 breaks, and the owner's
/// `withdraw_near` of the whole balance fails. Passes when the transfers are refused or the escrow stays withdrawable.
#[tokio::test]
async fn m01_contract_paid_storage_never_consumes_escrow() -> Result<()> {
    let env = setup_with(Opts { usdc_enabled: false, fund_usdc: false, mint_to_alice: 4 }).await?;
    let r = env
        .bob
        .call(env.satchel.id(), "deposit_near")
        .args_json(json!({ "token_id": "1" }))
        .deposit(NearToken::from_near(1))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_ok(&r);
    let inside: u128 = num(&view(&env, "inside_of", json!({ "token_id": "1" })).await?["near"]);

    // the contract's own surplus is gone (S-02 griefing or neglect): free ≈ escrow + 0.001 NEAR
    drain_free_to(&env, inside + MILLI).await?;
    let free0 = free_of(&env.worker.view_account(env.satchel.id()).await?);

    // three transfers to first-time 64-char holders, ≈ 0.0025 NEAR of contract-paid storage each
    let mut refused = 0;
    for (i, tok) in ["2", "3", "4"].iter().enumerate() {
        let fresh: AccountId = format!("{:02x}", 0xc0 + i).repeat(32).parse()?;
        if !transfer(&env, &env.alice, tok, &fresh).await?.is_success() {
            refused += 1;
        }
    }
    let free1 = free_of(&env.worker.view_account(env.satchel.id()).await?);
    let w = env
        .alice
        .call(env.satchel.id(), "withdraw_near")
        .args_json(json!({ "token_id": "1", "amount": inside.to_string() }))
        .deposit(YOCTO)
        .gas(Gas::from_tgas(50))
        .transact()
        .await?;
    eprintln!(
        "M-01: inside={inside} free before={free0} after transfers={free1} refused={refused}/3 withdraw ok={} {}",
        w.is_success(),
        fail_text(&w)
    );
    assert!(free1 >= inside as i128, "M-01: I-M1 broken: escrow {inside} > free {free1} after contract-paid transfers");
    assert!(w.is_success(), "M-01: the owner can't withdraw the escrow: {}", fail_text(&w));
    Ok(())
}

/// Bring the contract's free balance down to about `target` yocto with its own (sandbox-only) key.
async fn drain_free_to(env: &Env, target: u128) -> Result<()> {
    for _ in 0..8 {
        let free = free_of(&env.worker.view_account(env.satchel.id()).await?);
        if free <= (target + MILLI) as i128 {
            return Ok(());
        }
        let amount = free as u128 - target - MILLI / 2; // the tx fee is charged up front
        let _ = env.satchel.as_account().transfer_near(env.root.id(), NearToken::from_yoctonear(amount)).await?;
    }
    Ok(())
}
