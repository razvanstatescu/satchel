//! Sandbox tests for C1 (history digest), C2 (USDC transfers), C3 (four EVM testnets) and C7 (message signing),
//! docs/specs/C1-C2-C3-C7.md, against the real wasm + mock signer.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

const BASE: u64 = 84_532;
const ARB: u64 = 421_614;
const OP: u64 = 11_155_420;
const USDC_SEPOLIA: [u8; 20] = [0x1c, 0x7d, 0x4b, 0x19, 0x6c, 0xb0, 0xc7, 0xb0, 0x1d, 0x74, 0x3f, 0xbc, 0x61, 0x16, 0xa9, 0x02, 0x37, 0x9c, 0x72, 0x38];
const USDC_BASE: [u8; 20] = [0x03, 0x6c, 0xbd, 0x53, 0x84, 0x2c, 0x54, 0x26, 0x63, 0x4e, 0x79, 0x29, 0x54, 0x1e, 0xc2, 0x31, 0x8f, 0x3d, 0xcf, 0x7e];

fn native(chain: u64, nonce: u64) -> Vec<u8> {
    let mut t = EvmTx::transfer(nonce);
    t.chain_id = chain;
    t.encode()
}

fn transfer_data(to: [u8; 20], amount: u128) -> Vec<u8> {
    let mut d = vec![0xa9, 0x05, 0x9c, 0xbb];
    d.extend([0u8; 12]);
    d.extend(to);
    d.extend([0u8; 16]);
    d.extend(amount.to_be_bytes());
    d
}

fn usdc(chain: u64, token: [u8; 20], nonce: u64, amount: u128) -> Vec<u8> {
    let mut t = EvmTx::transfer(nonce);
    t.chain_id = chain;
    t.to = Some(token);
    t.value = 0;
    t.gas = 65_000;
    t.data = transfer_data([0x22; 20], amount);
    t.encode()
}

fn evm_msg(m: &[u8]) -> Value {
    json!({ "evm_message": { "message": hex(m) } })
}
fn sol_msg(m: &[u8]) -> Value {
    json!({ "sol_message": { "message": hex(m) } })
}

fn eip191(m: &[u8]) -> Vec<u8> {
    [format!("\x19Ethereum Signed Message:\n{}", m.len()).into_bytes(), m.to_vec()].concat()
}

fn offchain(m: &[u8]) -> Vec<u8> {
    let fmt = if m.iter().all(|b| (0x20..=0x7e).contains(b)) { 0 } else { 1 };
    [b"\xffsolana offchain".to_vec(), vec![0, fmt], (m.len() as u16).to_le_bytes().to_vec(), m.to_vec()].concat()
}

/// A third, independent encoder of the C1 digest (docs/specs/C1-C2-C3-C7.md §5.1), straight from the `sig_records` JSON.
fn digest_of(contract: &str, token: &str, rows: &[Value]) -> String {
    let s = |x: &str| [(x.len() as u32).to_le_bytes().to_vec(), x.as_bytes().to_vec()].concat();
    let b = |h: &str| {
        let v = unhex(h);
        [(v.len() as u32).to_le_bytes().to_vec(), v].concat()
    };
    let u = |v: &Value| (num(v) as u64).to_le_bytes().to_vec();
    let mut buf = [s("satchel.history.v1"), s(contract), s(token), (rows.len() as u64).to_le_bytes().to_vec()].concat();
    for r in rows {
        buf.extend(u(&r["seq"]));
        buf.extend(u(&r["request_id"]));
        buf.push(num(&r["input_index"]) as u8);
        buf.extend(u(&r["height"]));
        buf.extend(u(&r["timestamp_ms"]));
        buf.extend(s(r["requester"].as_str().unwrap()));
        buf.extend(unhex(r["payload"].as_str().unwrap()));
        let d = &r["detail"];
        if let Some(e) = d.get("evm") {
            buf.push(0);
            buf.extend(u(&e["chain_id"]));
            buf.extend(u(&e["nonce"]));
            buf.extend(b(e["unsigned_tx"].as_str().unwrap()));
        } else if let Some(x) = d.get("btc") {
            buf.push(1);
            buf.extend(unhex(x["txid"].as_str().unwrap()));
            buf.extend((num(&x["vout"]) as u32).to_le_bytes());
            buf.extend(u(&x["amount_sats"]));
        } else if let Some(x) = d.get("sol") {
            buf.push(2);
            buf.extend(unhex(x["recent_blockhash"].as_str().unwrap()));
            buf.extend(u(&x["lamports"]));
        } else if let Some(x) = d.get("evm_message") {
            buf.push(3);
            buf.extend(b(x["message"].as_str().unwrap()));
        } else {
            buf.push(4);
            buf.extend(b(d["sol_message"]["message"].as_str().unwrap()));
        }
    }
    hex(&Sha256::digest(&buf))
}

async fn digest(env: &Env, id: &str) -> Result<Value> {
    view(env, "history_digest", json!({ "token_id": id })).await
}

async fn max_nonce(env: &Env, id: &str, chain: u64) -> Result<Value> {
    view(env, "max_evm_nonce", json!({ "token_id": id, "chain_id": chain })).await
}

/// Refused with `code`; no record and no MPC request.
async fn refused(env: &Env, req: &Value, code: &str) -> Result<()> {
    let (n0, m0) = (sig_count(env, "1").await?, mpc_count(env).await?);
    let r = sign_sync_fail(env, &env.alice, "1", req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, code);
    assert_eq!(sig_count(env, "1").await?, n0, "{code}: a record was written");
    assert_eq!(mpc_count(env).await?, m0, "{code}: the MPC was called");
    Ok(())
}

/// C1: the view equals an independent encoder over every record kind, ignores status, and is null for unknown tokens.
#[tokio::test]
async fn c1_history_digest_matches_independent_impl() -> Result<()> {
    let env = setup().await?;
    assert!(digest(&env, "99").await?.is_null());
    let contract = env.satchel.id().to_string();
    let d0 = digest(&env, "1").await?;
    assert_eq!(d0, json!({ "sig_count": 0, "digest_hex": digest_of(&contract, "1", &[]) }));

    set_mode(&env, "manual").await?; // leave every record pending first
    for req in [
        evm_req(&native(SEPOLIA, 0)),
        BtcTx::new(2, 7).req(),
        sol_req(&sol_message(1_000_000, [9; 32])),
        evm_req(&usdc(BASE, USDC_BASE, 0, 1_500_000)),
        evm_msg(b"hello"),
        sol_msg("Gr\u{fc}\u{df}e \u{2713}".as_bytes()),
    ] {
        start_sign(&env, &env.alice, "1", &req).await?;
    }
    let pending = wait_mpc_pending(&env, 7).await?;
    let rows = sig_records(&env, "1").await?;
    assert_eq!(rows.len(), 7);
    assert!(rows.iter().all(|r| r["status"] == "pending"));
    let d1 = digest(&env, "1").await?;
    assert_eq!(d1["sig_count"], 7);
    assert_eq!(d1["digest_hex"], digest_of(&contract, "1", &rows), "view == independent encoder");

    // resolve some (signed) and let the rest time out (failed): statuses and signatures change, the digest doesn't
    for p in pending.iter().take(3) {
        mpc_respond_valid(&env, num(&p["request_id"]) as u64).await?;
    }
    env.worker.fast_forward(260).await?;
    let t0 = std::time::Instant::now();
    loop {
        let rows = sig_records(&env, "1").await?;
        if rows.iter().all(|r| r["status"] != "pending") || t0.elapsed().as_secs() > 60 {
            assert!(rows.iter().any(|r| r["status"] == "signed"), "{rows:?}");
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    assert_eq!(digest(&env, "1").await?, d1);
    Ok(())
}

/// C2: a USDC transfer is recorded with its token, recipient and amount (view + event); refusals change nothing.
#[tokio::test]
async fn c2_usdc_transfer_records_detail_and_refusals() -> Result<()> {
    let env = setup().await?;
    let tx = usdc(SEPOLIA, USDC_SEPOLIA, 0, 2_500_000);
    let r = sign_and_wait(&env, &env.alice, "1", &evm_req(&tx)).await?;
    assert_ok(&r);
    let erc20 = json!({ "token": hex(&USDC_SEPOLIA), "to": hex(&[0x22; 20]), "amount": "2500000" });
    let ev = events(&r, "sign_requested");
    assert_eq!(ev[0]["details"], json!([{ "seq": 0, "chain_id": SEPOLIA, "nonce": 0, "erc20": erc20 }]));
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["detail"]["evm"]["erc20"], erc20);
    assert_eq!(rec["payload"], hex(&keccak(&tx)));
    assert_eq!(mpc_requests(&env).await?[0]["payload_v2"]["Ecdsa"], hex(&keccak(&tx)));

    refused(&env, &evm_req(&usdc(BASE, USDC_SEPOLIA, 0, 1)), "ERR_EVM_TOKEN").await?;
    let mut v = EvmTx::transfer(1);
    v.to = Some(USDC_SEPOLIA);
    v.data = transfer_data([0x22; 20], 1);
    refused(&env, &evm_req(&v.encode()), "ERR_EVM_VALUE").await?;
    let mut a = v.clone();
    a.value = 0;
    a.data[0] = 0x09; // not transfer()
    refused(&env, &evm_req(&a.encode()), "ERR_EVM_DATA").await?;
    Ok(())
}

/// C3: every chain signs on the same path; the nonce-gap rule and its state are per chain and survive a transfer.
#[tokio::test]
async fn c3_nonce_gap_is_per_chain() -> Result<()> {
    let env = setup().await?;
    let cfg = config(&env).await?;
    assert_eq!(cfg["evm_chain_ids"], json!([SEPOLIA, BASE, ARB, OP]));
    for n in 0..=3 {
        assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&native(SEPOLIA, n))).await?);
    }
    refused(&env, &evm_req(&native(BASE, 2)), "ERR_EVM_NONCE_GAP").await?;
    assert!(max_nonce(&env, "1", BASE).await?.is_null());
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&native(BASE, 1))).await?);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&native(ARB, 0))).await?);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&native(OP, 1))).await?);
    refused(&env, &evm_req(&native(BASE, 3)), "ERR_EVM_NONCE_GAP").await?;
    refused(&env, &evm_req(&native(8453, 0)), "ERR_EVM_CHAIN_ID").await?;
    assert_eq!(max_nonce(&env, "1", SEPOLIA).await?, 3);
    assert_eq!(max_nonce(&env, "1", BASE).await?, 1);
    assert_eq!(max_nonce(&env, "1", ARB).await?, 0);
    assert_eq!(max_nonce(&env, "1", OP).await?, 1);
    for q in mpc_requests(&env).await? {
        assert_eq!((q["path"].as_str(), q["domain_id"].as_u64()), (Some("satchel/1/evm"), Some(0)));
    }
    // the state belongs to the token
    assert_ok(&transfer(&env, &env.alice, "1", env.bob.id()).await?);
    let r = sign_sync_fail(&env, &env.bob, "1", &evm_req(&native(BASE, 3)), SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_EVM_NONCE_GAP");
    assert_ok(&sign_and_wait(&env, &env.bob, "1", &evm_req(&native(BASE, 2))).await?);
    assert_eq!(max_nonce(&env, "1", BASE).await?, 2);
    Ok(())
}

/// C7: the contract builds the signed bytes itself (EIP-191 / Solana off-chain v0), on the chain's key and domain.
#[tokio::test]
async fn c7_messages_mpc_shape_records_and_refusals() -> Result<()> {
    let env = setup().await?;
    let r = sign_and_wait(&env, &env.alice, "1", &evm_msg(b"hello")).await?;
    assert_ok(&r);
    let h = "50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750";
    assert_eq!(hex(&keccak(&eip191(b"hello"))), h);
    let q = &mpc_requests(&env).await?[0];
    assert_eq!((q["path"].as_str(), q["domain_id"].as_u64(), q["payload_v2"]["Ecdsa"].as_str()), (Some("satchel/1/evm"), Some(0), Some(h)));
    let ev = &events(&r, "sign_requested")[0];
    assert_eq!(ev["preimages"], json!([hex(&eip191(b"hello"))]));
    assert_eq!(ev["details"], json!([{ "seq": 0, "kind": "evm_message" }]));

    let body = "Prove you control this Satchel\nnonce 42".as_bytes();
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &sol_msg(body)).await?);
    let q = &mpc_requests(&env).await?[1];
    assert_eq!((q["path"].as_str(), q["domain_id"].as_u64()), (Some("satchel/1/sol"), Some(1)));
    assert_eq!(q["payload_v2"]["Eddsa"], hex(&offchain(body)));

    let rows = sig_records(&env, "1").await?;
    assert_eq!((rows[0]["chain"].as_str(), rows[0]["status"].as_str()), (Some("evm"), Some("signed")));
    assert_eq!(rows[0]["detail"], json!({ "evm_message": { "message": hex(b"hello") } }));
    assert_eq!(rows[1]["payload"], hex(&sha256(&offchain(body))));
    assert_eq!((rows[1]["chain"].as_str(), rows[1]["status"].as_str()), (Some("sol"), Some("signed")));
    assert!(max_nonce(&env, "1", SEPOLIA).await?.is_null(), "messages never touch EVM nonces");

    refused(&env, &evm_msg(b""), "ERR_MSG_EMPTY").await?;
    refused(&env, &sol_msg(&[b'a'; 1025]), "ERR_MSG_TOO_LONG").await?;
    refused(&env, &evm_msg(&[0xff]), "ERR_MSG_ENCODING").await?;
    refused(&env, &sol_msg(&sol_message(1, [9; 32])), "ERR_MSG_ENCODING").await?; // a legacy tx message is not text
    Ok(())
}

/// C7: a 1024-byte message is charged exactly (INV-18) with `messageSignAttachDeposit`, and 0.005 NEAR is refused.
#[tokio::test]
async fn c7_long_message_storage_charge() -> Result<()> {
    let env = setup().await?;
    let req = evm_msg(&[b'x'; 1024]);
    let short = SignOpts { gas: None, deposit: Some(sign_attach_deposit(1)), mpc_deposit: None };
    let r = sign_sync_fail(&env, &env.alice, "1", &req, short).await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert_eq!(sig_count(&env, "1").await?, 0);
    let s0 = storage_usage(&env, env.satchel.id()).await?;
    let r = sign_and_wait(&env, &env.alice, "1", &req).await?;
    assert_ok(&r);
    let used = storage_usage(&env, env.satchel.id()).await? - s0;
    assert!((1024..1400).contains(&used), "record {used} B");
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["detail"]["evm_message"]["message"].as_str().map(str::len), Some(2048));
    Ok(())
}
