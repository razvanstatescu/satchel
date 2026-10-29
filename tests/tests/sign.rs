//! `sign_for` / `on_signed` invariants (spec §5.8, §6): INV-01, 06, 07, 08, 09, 11, 12, 17, 23, 24, 26.

mod common;

use anyhow::{Result, ensure};
use common::payloads::*;
use common::*;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::NearToken;
use serde_json::{Value, json};
use std::time::{Duration, Instant};

/// The view encoding of a signature the mock returned (spec §5.14).
fn expected_sig_view(resp: &Value) -> Value {
    match resp["scheme"].as_str() {
        Some("Secp256k1") => json!({
            "r": &resp["big_r"]["affine_point"].as_str().unwrap()[2..],
            "s": resp["s"]["scalar"],
            "recovery_id": resp["recovery_id"],
        }),
        Some("Ed25519") => {
            let b: Vec<u8> = resp["signature"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x.as_u64().unwrap() as u8)
                .collect();
            json!({ "signature": hex(&b) })
        }
        _ => Value::Null,
    }
}

fn mock_response(req: &Value) -> Value {
    serde_json::from_str(req["response"].as_str().unwrap_or("null")).unwrap_or(Value::Null)
}

fn ecdsa_of(req: &Value) -> String {
    req["payload_v2"]["Ecdsa"]
        .as_str()
        .unwrap_or_default()
        .to_string()
}

/// INV-01: a non-owner's `sign_for` fails ERR_NOT_OWNER, the mock receives nothing, sig_count unchanged.
#[tokio::test]
async fn non_owner_rejected() -> Result<()> {
    let env = setup().await?;
    let req = evm_req(&EvmTx::transfer(0).encode());
    let r = sign_sync_fail(&env, &env.bob, "1", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_NOT_OWNER");
    let r = sign_sync_fail(&env, &env.alice, "99", &req, SignOpts::default_for(1)).await?;
    assert_fails_with(&r, "ERR_TOKEN_NOT_FOUND");
    assert_eq!(mpc_count(&env).await?, 0);
    assert_eq!(sig_count(&env, "1").await?, 0);
    assert!(sig_records(&env, "1").await?.is_empty());
    Ok(())
}

/// Happy path: the callback fills the record's slot with the exact signature bytes and returns the
/// raw MPC JSON per request.
#[tokio::test]
async fn callback_fills_slot() -> Result<()> {
    let env = setup().await?;
    let tx = EvmTx::transfer(0).encode();
    let r = sign_and_wait(&env, &env.alice, "1", &evm_req(&tx)).await?;
    assert_ok(&r);
    let reqs = mpc_requests(&env).await?;
    assert_eq!(reqs.len(), 1);
    let resp = mock_response(&reqs[0]);
    assert_eq!(
        r.clone().json::<Vec<Value>>()?,
        vec![resp.clone()],
        "tx result = raw MPC JSON array"
    );

    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs.len(), 1);
    let rec = &recs[0];
    assert_eq!(rec["seq"], 0);
    assert_eq!(rec["request_id"], 0);
    assert_eq!(rec["input_index"], 0);
    assert_eq!(rec["chain"], "evm");
    assert_eq!(rec["status"], "signed");
    assert_eq!(rec["requester"], env.alice.id().to_string());
    assert_eq!(rec["payload"], hex(&keccak(&tx)));
    assert_eq!(rec["signature"], expected_sig_view(&resp));
    let d = &rec["detail"]["evm"];
    assert_eq!(num(&d["chain_id"]), SEPOLIA as u128);
    assert_eq!(num(&d["nonce"]), 0);
    assert_eq!(d["unsigned_tx"], hex(&tx));

    let res = events(&r, "sign_resolved");
    assert_eq!(res.len(), 1);
    assert_eq!(res[0]["statuses"], json!(["signed"]));
    let sv = satchel_view(&env, "1").await?;
    assert_eq!(num(&sv["sig_count"]), 1);
    assert_eq!(num(&sv["last_sign_height"]), num(&rec["height"]));
    Ok(())
}

/// The record exists, `pending`, while the MPC request is still yielded (written in `sign_for`).
#[tokio::test]
async fn records_written_before_mpc_call() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "manual").await?;
    let tx = EvmTx::transfer(1).encode(); // ≤ 1: a fresh token's first EVM nonce (nonce-gap rule, spec §5.9)
    let st = start_sign(&env, &env.alice, "1", &evm_req(&tx)).await?;
    let p = wait_mpc_pending(&env, 1).await?;
    let recs = sig_records(&env, "1").await?;
    assert_eq!(
        recs.len(),
        1,
        "record must exist while the MPC call is in flight"
    );
    assert_eq!(recs[0]["status"], "pending");
    assert!(recs[0]["signature"].is_null());
    assert_eq!(recs[0]["payload"], hex(&keccak(&tx)));
    let sv = satchel_view(&env, "1").await?;
    assert_eq!(num(&sv["sig_count"]), 1);
    assert!(num(&sv["last_sign_height"]) > 0);
    assert!(
        num(&recs[0]["height"]) <= num(&p[0]["created_at"]),
        "record height ≤ MPC request height"
    );

    mpc_respond_valid(&env, 0).await?;
    let r = wait_resolved(&st, Duration::from_secs(30)).await?;
    assert_ok(&r);
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs[0]["status"], "signed");
    Ok(())
}

async fn check_shape(env: &Env, req: &Value, chain: &str, domain: u64, n: usize) -> Result<()> {
    let r = sign_and_wait(env, &env.alice, "1", req).await?;
    assert_ok(&r);
    let reqs = mpc_requests(env).await?;
    assert_eq!(reqs.len(), n);
    for q in &reqs {
        assert_eq!(
            q["predecessor"],
            env.satchel.id().to_string(),
            "MPC predecessor must be the contract"
        );
        assert_eq!(q["path"], format!("satchel/1/{chain}"));
        assert_eq!(q["domain_id"], domain);
        assert_eq!(q["attached_deposit"], "1", "default mpc_deposit is 1 yocto");
        assert!(num(&q["prepaid_gas"]) >= 15_000_000_000_000);
        let key = if domain == 0 { "Ecdsa" } else { "Eddsa" };
        assert!(
            q["payload_v2"].get(key).is_some(),
            "payload_v2 must be {key}: {}",
            q["payload_v2"]
        );
    }
    Ok(())
}

/// INV-06 (EVM): predecessor, path, domain 0, deposit.
#[tokio::test]
async fn mpc_request_shape_evm() -> Result<()> {
    let env = setup().await?;
    check_shape(&env, &evm_req(&EvmTx::transfer(0).encode()), "evm", 0, 1).await
}

/// INV-06 (BTC): one request per input, all on `satchel/1/btc`, domain 0.
#[tokio::test]
async fn mpc_request_shape_btc() -> Result<()> {
    let env = setup().await?;
    check_shape(&env, &BtcTx::new(2, 1).req(), "btc", 0, 2).await
}

/// INV-06 (SOL): Eddsa on domain 1.
#[tokio::test]
async fn mpc_request_shape_sol() -> Result<()> {
    let env = setup().await?;
    check_shape(
        &env,
        &sol_req(&sol_message(1_000_000, [9; 32])),
        "sol",
        1,
        1,
    )
    .await
}

/// INV-07: what the MPC receives is the hash the contract computed from the exact bytes:
/// keccak256(tx), sha256d(preimage_i), and the SOL message itself.
#[tokio::test]
async fn payload_is_hash_of_preimage() -> Result<()> {
    let env = setup().await?;
    // kb/31 vector → keccak bc657845…c377
    let kb = unhex(KB_EVM_TX);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&kb)).await?);
    // the same tx with a 0x prefix and upper case hashes identically (spec §5.3 inputs)
    let shouty = json!({ "evm": { "unsigned_tx": format!("0x{}", KB_EVM_TX.to_uppercase()) } });
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &shouty).await?);
    let btc = BtcTx::new(3, 7);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &btc.req()).await?);
    let msg = sol_message(42, [3; 32]);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &sol_req(&msg)).await?);

    let reqs = mpc_requests(&env).await?;
    assert_eq!(reqs.len(), 6);
    assert_eq!(ecdsa_of(&reqs[0]), KB_EVM_HASH);
    assert_eq!(ecdsa_of(&reqs[1]), KB_EVM_HASH);
    let mut got: Vec<String> = reqs[2..5].iter().map(ecdsa_of).collect();
    let mut want: Vec<String> = btc.preimages().iter().map(|p| hex(&sha256d(p))).collect();
    got.sort();
    want.sort();
    assert_eq!(got, want);
    assert_eq!(reqs[5]["payload_v2"]["Eddsa"], hex(&msg));

    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs[0]["payload"], KB_EVM_HASH);
    assert_eq!(
        recs[5]["payload"],
        hex(&sha256(&msg)),
        "SOL record payload = sha256(message) (id only)"
    );
    Ok(())
}

/// INV-07 over every accepted vector in `vectors/*.json` (when the core agent has generated them).
#[tokio::test]
async fn payload_is_hash_of_preimage_shared_vectors() -> Result<()> {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../vectors");
    let mut accepted = vec![];
    for set in ["evm", "btc", "sol"] {
        let Ok(s) = std::fs::read_to_string(root.join(format!("{set}.json"))) else {
            continue;
        };
        let v: Value = serde_json::from_str(&s)?;
        for vec in v["vectors"].as_array().cloned().unwrap_or_default() {
            if vec["expect"]["ok"] == true {
                accepted.push(vec);
            }
        }
    }
    if accepted.is_empty() {
        eprintln!("SKIP-NOTICE: vectors/*.json not present; shared-vector INV-07 not exercised");
        return Ok(());
    }
    let env = setup().await?;
    let mut seen = 0usize;
    let mut skipped = vec![];
    // All vectors run on token 1, so the nonce-gap rule (spec §5.9, D-43) sees one growing EVM history: before an EVM
    // vector with nonce n, sign plain transfers up to n − 1 when needed. Far-future nonces (a state that would need
    // billions of records) are covered by the unit run of the same vectors (`parse::tests::shared_vectors`).
    let mut max_evm: Option<u64> = None;
    for v in &accepted {
        if v["kind"] == "evm" {
            let n: u64 = v["expect"]["fields"]["nonce"].as_str().unwrap_or("0").parse()?;
            let allowed = max_evm.map_or(1, |m| m + 1);
            if n > allowed {
                if n > 64 {
                    skipped.push(v["name"].to_string());
                    continue;
                }
                for k in allowed..n {
                    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&EvmTx::transfer(k).encode())).await?);
                }
                max_evm = Some(n - 1);
            }
            max_evm = Some(max_evm.map_or(n, |m| m.max(n)));
        }
        let before = mpc_count(&env).await? as usize;
        let r = sign_and_wait(&env, &env.alice, "1", &v["request"]).await?;
        assert!(
            r.is_success(),
            "vector {} refused: {}",
            v["name"],
            fail_text(&r)
        );
        let reqs = mpc_requests(&env).await?;
        let mine = &reqs[before..];
        let want = v["expect"]["mpc"].as_array().cloned().unwrap_or_default();
        assert_eq!(mine.len(), want.len(), "vector {}", v["name"]);
        let mut got: Vec<String> = mine.iter().map(|q| q["payload_v2"].to_string()).collect();
        let mut exp: Vec<String> = want.iter().map(|m| m["payload_v2"].to_string()).collect();
        got.sort();
        exp.sort();
        assert_eq!(got, exp, "vector {}", v["name"]);
        seen += 1;
    }
    eprintln!("shared vectors exercised: {seen}; far-future EVM nonces left to the unit run: {skipped:?}");
    assert!(skipped.len() <= 3, "only the 2^53/2^64-scale nonce vectors may be skipped: {skipped:?}");
    Ok(())
}

/// INV-08: `sign_requested` carries the preimages, they hash to its `payloads`, those equal what the
/// MPC received, and `first_seq` is the `sig_count` before the call.
#[tokio::test]
async fn event_matches_mpc_request() -> Result<()> {
    let env = setup().await?;
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(0).encode()),
        )
        .await?,
    );
    let btc = BtcTx::new(2, 4);
    let r = sign_and_wait(&env, &env.alice, "1", &btc.req()).await?;
    assert_ok(&r);
    let ev = events(&r, "sign_requested");
    assert_eq!(ev.len(), 1);
    let e = &ev[0];
    assert_eq!(e["token_id"], "1");
    assert_eq!(e["owner_id"], env.alice.id().to_string());
    assert_eq!(num(&e["first_seq"]), 1);
    assert_eq!(num(&e["request_id"]), 1);
    assert_eq!(num(&e["count"]), 2);
    assert_eq!(e["chain"], "btc");
    assert_eq!(e["path"], "satchel/1/btc");
    assert_eq!(num(&e["domain_id"]), 0);
    assert_eq!(e["btc_outputs"], hex(&btc.outputs_bytes()));
    let pre: Vec<String> = e["preimages"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x.as_str().unwrap().to_string())
        .collect();
    assert_eq!(
        pre,
        btc.preimages().iter().map(|p| hex(p)).collect::<Vec<_>>()
    );
    let payloads: Vec<String> = e["payloads"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x.as_str().unwrap().to_string())
        .collect();
    let rehash: Vec<String> = pre.iter().map(|p| hex(&sha256d(&unhex(p)))).collect();
    assert_eq!(
        payloads, rehash,
        "event payloads = sha256d(event preimages)"
    );
    let mut mpc: Vec<String> = mpc_requests(&env).await?[1..]
        .iter()
        .map(ecdsa_of)
        .collect();
    let mut p2 = payloads.clone();
    mpc.sort();
    p2.sort();
    assert_eq!(mpc, p2, "event payloads = MPC payloads");
    assert_eq!(e["details"].as_array().map(|d| d.len()), Some(2));
    assert_eq!(num(&e["details"][0]["seq"]), 1);
    assert_eq!(num(&e["details"][1]["seq"]), 2);
    Ok(())
}

async fn refuse_all(env: &Env, cases: Vec<(&str, Value)>) -> Result<()> {
    let before_recs = sig_records(env, "1").await?;
    let before_view = satchel_view(env, "1").await?;
    for (code, req) in cases {
        let n = n_of(&req).min(10);
        let r = sign_sync_fail(env, &env.alice, "1", &req, SignOpts::default_for(n)).await?;
        assert_fails_with(&r, code);
        assert!(
            events(&r, "sign_requested").is_empty(),
            "{code}: refused call emitted sign_requested"
        );
        assert_eq!(
            mpc_count(env).await?,
            0,
            "{code}: refused call reached the MPC"
        );
    }
    assert_eq!(sig_records(env, "1").await?, before_recs);
    assert_eq!(satchel_view(env, "1").await?, before_view);
    Ok(())
}

/// INV-09 (EVM): each refusal fails with its code and changes nothing.
#[tokio::test]
async fn refusals_change_nothing_evm() -> Result<()> {
    let env = setup().await?;
    let ok = EvmTx::transfer(0);
    // pre-EIP-2718 legacy tx: a bare RLP list (first byte ≥ 0xc0)
    let legacy = rlp_list(&[
        rlp_uint(0),
        rlp_uint(1),
        rlp_uint(21000),
        rlp_bytes(&[0x61; 20]),
        rlp_uint(1),
        rlp_bytes(&[]),
    ]);
    let mut chain1 = ok.clone();
    chain1.chain_id = 1;
    let mut calldata = ok.clone();
    calldata.data = unhex("095ea7b3");
    let mut create = ok.clone();
    create.to = None;
    let mut access = ok.clone();
    access.access_list = vec![rlp_list(&[rlp_bytes(&[0x11; 20]), rlp_list(&[])])];
    let mut trailing = ok.encode();
    trailing.push(0x00);
    let mut type1 = ok.encode();
    type1[0] = 0x01;
    let mut wide_nonce = ok.encode();
    // nonce as a 9-byte integer: rebuild with raw items
    wide_nonce.clear();
    wide_nonce.push(0x02);
    wide_nonce.extend(rlp_list(&[
        rlp_uint(SEPOLIA as u128),
        rlp_bytes(&[1, 0, 0, 0, 0, 0, 0, 0, 0]),
        rlp_uint(1),
        rlp_uint(2),
        rlp_uint(21000),
        rlp_bytes(&[0x61; 20]),
        rlp_uint(1),
        rlp_bytes(&[]),
        rlp_list(&[]),
    ]));
    let cases = vec![
        ("ERR_EVM_TYPE", evm_req(&legacy)),
        ("ERR_EVM_TYPE", evm_req(&type1)),
        ("ERR_EVM_TYPE", evm_req(&unhex(KB_EVM_HASH))),
        ("ERR_EVM_CHAIN_ID", evm_req(&chain1.encode())),
        ("ERR_EVM_DATA", evm_req(&calldata.encode())),
        ("ERR_EVM_TO", evm_req(&create.encode())),
        ("ERR_EVM_ACCESS_LIST", evm_req(&access.encode())),
        ("ERR_EVM_RLP", evm_req(&trailing)),
        ("ERR_EVM_INT_WIDTH", evm_req(&wide_nonce)),
        ("ERR_EVM_TOO_LONG", evm_req(&[0x02; 129])),
        ("ERR_HEX", json!({ "evm": { "unsigned_tx": "02zz" } })),
        ("ERR_HEX", json!({ "evm": { "unsigned_tx": "020" } })),
    ];
    refuse_all(&env, cases).await
}

/// INV-09 (BTC).
#[tokio::test]
async fn refusals_change_nothing_btc() -> Result<()> {
    let env = setup().await?;
    let base = BtcTx::new(2, 1);
    let with = |f: &dyn Fn(&mut BtcTx)| {
        let mut t = base.clone();
        f(&mut t);
        t.req()
    };
    let mut short = base.preimages();
    short[0].pop();
    let mut dup = base.clone();
    dup.inputs[1] = dup.inputs[0].clone();
    let mismatched_outputs = {
        let mut t = base.clone();
        let pre = t.preimages();
        t.outputs[0].0 += 1;
        btc_req_raw(&pre, &t.outputs_bytes())
    };
    let incomplete = btc_req_raw(&base.preimages()[..1], &base.outputs_bytes());
    let malformed_outputs = btc_req_raw(&base.preimages(), &{
        let mut o = base.outputs_bytes();
        o.push(0x01);
        o
    });
    let mixed = {
        let other = BtcTx::new(2, 9);
        btc_req_raw(
            &[base.preimage(0), other.preimage(1)],
            &base.outputs_bytes(),
        )
    };
    let eleven = BtcTx::new(11, 2).req();
    let cases = vec![
        ("ERR_BTC_SIGHASH", with(&|t| t.sighash = 2)),
        ("ERR_BTC_SIGHASH", with(&|t| t.sighash = 0x81)),
        ("ERR_BTC_VERSION", with(&|t| t.version = 1)),
        ("ERR_BTC_LOCKTIME", with(&|t| t.locktime = 1)),
        (
            "ERR_BTC_SEQUENCE",
            with(&|t| t.inputs.iter_mut().for_each(|i| i.sequence = 0xffff_fffc)),
        ),
        ("ERR_BTC_INPUT_COUNT", eleven),
        (
            "ERR_BTC_INPUT_COUNT",
            json!({ "btc": { "preimages": [], "outputs": hex(&base.outputs_bytes()) } }),
        ),
        (
            "ERR_BTC_PREIMAGE_LEN",
            btc_req_raw(&short, &base.outputs_bytes()),
        ),
        ("ERR_BTC_DUPLICATE_INPUT", dup.req()),
        ("ERR_BTC_PREVOUTS_INCOMPLETE", incomplete),
        ("ERR_BTC_OUTPUTS_MISMATCH", mismatched_outputs),
        ("ERR_BTC_OUTPUTS_MALFORMED", malformed_outputs),
        ("ERR_BTC_MIXED_TX", mixed),
    ];
    refuse_all(&env, cases).await
}

/// INV-09 (SOL).
#[tokio::test]
async fn refusals_change_nothing_sol() -> Result<()> {
    let env = setup().await?;
    let bh = [5u8; 32];
    let ok = sol_message(1_000, bh);
    let mut v0 = vec![0x80];
    v0.extend(&ok);
    let mut trailing = ok.clone();
    trailing.push(0);
    let durable = sol_message_raw(
        [1, 0, 1],
        &[SOL_FROM, SOL_TO, [0xcc; 32], SOL_SYSTEM],
        bh,
        &[
            SolIx {
                program: 3,
                accounts: vec![2, 0],
                data: vec![4, 0, 0, 0],
            },
            SolIx {
                program: 3,
                accounts: vec![0, 1],
                data: sol_transfer_data(1_000),
            },
        ],
    );
    let two_ix = sol_message_raw(
        [1, 0, 1],
        &[SOL_FROM, SOL_TO, SOL_SYSTEM],
        bh,
        &[
            SolIx {
                program: 2,
                accounts: vec![0, 1],
                data: sol_transfer_data(1),
            },
            SolIx {
                program: 2,
                accounts: vec![0, 1],
                data: sol_transfer_data(2),
            },
        ],
    );
    let two_signers = sol_message_raw(
        [2, 0, 1],
        &[SOL_FROM, SOL_TO, SOL_SYSTEM],
        bh,
        &[SolIx {
            program: 2,
            accounts: vec![0, 1],
            data: sol_transfer_data(1),
        }],
    );
    let assign = sol_message_raw(
        [1, 0, 1],
        &[SOL_FROM, SOL_TO, SOL_SYSTEM],
        bh,
        &[SolIx {
            program: 2,
            accounts: vec![0],
            data: {
                let mut d = vec![1, 0, 0, 0];
                d.extend([0xdd; 32]);
                d
            },
        }],
    );
    let cases = vec![
        ("ERR_SOL_VERSION", sol_req(&v0)),
        ("ERR_SOL_VERSION", sol_req(&[0xff; 40])),
        ("ERR_SOL_MALFORMED", sol_req(&trailing)),
        ("ERR_SOL_DURABLE_NONCE", sol_req(&durable)),
        ("ERR_SOL_INSTRUCTION", sol_req(&two_ix)),
        ("ERR_SOL_INSTRUCTION", sol_req(&assign)),
        ("ERR_SOL_HEADER", sol_req(&two_signers)),
        ("ERR_SOL_TOO_LONG", sol_req(&vec![0x01; 1233])),
        // a raw 32-byte hash can never parse as a message (exact code depends on its bytes)
        ("ERR_SOL_", sol_req(&[0x01; 32])),
    ];
    refuse_all(&env, cases).await
}

/// INV-11: sig_count grows by exactly n, seqs are contiguous, and earlier records' safety fields
/// never change.
#[tokio::test]
async fn log_append_only() -> Result<()> {
    let env = setup().await?;
    let strip = |r: &Value| {
        let mut r = r.clone();
        r.as_object_mut().unwrap().remove("status");
        r.as_object_mut().unwrap().remove("signature");
        r
    };
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(0).encode()),
        )
        .await?,
    );
    assert_eq!(sig_count(&env, "1").await?, 1);
    let first = strip(&sig_records(&env, "1").await?[0]);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &BtcTx::new(3, 2).req()).await?);
    assert_eq!(sig_count(&env, "1").await?, 4);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &sol_req(&sol_message(7, [1; 32]))).await?);
    assert_eq!(sig_count(&env, "1").await?, 5);
    // a refused call does not grow it
    let r = sign_sync_fail(
        &env,
        &env.alice,
        "1",
        &evm_req(&[0x01]),
        SignOpts::default_for(1),
    )
    .await?;
    assert!(r.is_failure());
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs.len(), 5);
    for (i, rec) in recs.iter().enumerate() {
        assert_eq!(num(&rec["seq"]), i as u128);
    }
    assert_eq!(strip(&recs[0]), first);
    let rid: Vec<u128> = recs.iter().map(|r| num(&r["request_id"])).collect();
    assert_eq!(rid, vec![0, 1, 1, 1, 4]);
    let idx: Vec<u128> = recs.iter().map(|r| num(&r["input_index"])).collect();
    assert_eq!(idx, vec![0, 0, 1, 2, 0]);
    // pagination respects from_seq/limit
    let page: Vec<Value> = serde_json::from_value(
        view(
            &env,
            "sig_records",
            json!({"token_id":"1","from_seq":2,"limit":2}),
        )
        .await?,
    )?;
    assert_eq!(page.len(), 2);
    assert_eq!(num(&page[0]["seq"]), 2);
    Ok(())
}

/// INV-12 (MANDATORY): the MPC never answers; after `fast_forward(250)` the yield times out, the
/// record persists as `failed`, `on_signed` did not panic, signing keeps working, and `list`
/// succeeds after the quiet period. Nothing gets stuck.
#[tokio::test]
async fn timeout_never_sticks() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "never").await?;
    let tx = EvmTx::transfer(0).encode();
    let st = start_sign(&env, &env.alice, "1", &evm_req(&tx)).await?;
    wait_mpc_pending(&env, 1).await?;
    let t0 = std::time::Instant::now();
    env.worker.fast_forward(250).await?;
    let r = wait_resolved(&st, Duration::from_secs(90)).await?;
    eprintln!("timeout path resolved in {:?}", t0.elapsed());
    assert_ok(&r); // on_signed ran and returned normally
    assert_eq!(r.clone().json::<Vec<Value>>()?, vec![Value::Null]);
    assert_eq!(
        events(&r, "sign_resolved")[0]["statuses"],
        json!(["failed"])
    );
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs.len(), 1, "the record persists after a timeout");
    assert_eq!(recs[0]["status"], "failed");
    assert!(recs[0]["signature"].is_null());
    assert_eq!(recs[0]["payload"], hex(&keccak(&tx)));
    assert!(mpc_pending(&env).await?.is_empty());

    // nothing stuck: list after the quiet period, delist, sign again
    pass_quiet_period(&env, "1").await?;
    let lid = list_ok(&env, &env.alice, "1", 1_000, "near").await?;
    assert!(lid >= 1);
    assert_ok(&delist(&env, &env.alice, "1").await?);
    set_mode(&env, "reply").await?;
    let r = sign_and_wait(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
    )
    .await?;
    assert_ok(&r);
    assert_eq!(sig_records(&env, "1").await?[1]["status"], "signed");
    Ok(())
}

/// INV-12: a non-JSON success value → `unparsed`; never bricks the token.
#[tokio::test]
async fn garbage_response() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "garbage").await?;
    let r = sign_and_wait(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
    )
    .await?;
    assert_ok(&r);
    assert_eq!(r.clone().json::<Vec<Value>>()?, vec![Value::Null]);
    assert_eq!(
        events(&r, "sign_resolved")[0]["statuses"],
        json!(["unparsed"])
    );
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["status"], "unparsed");
    assert!(rec["signature"].is_null());
    // valid JSON of the wrong shape → unparsed too, and the JSON is returned as-is
    set_mode(&env, "wrong_shape").await?;
    let r = sign_and_wait(&env, &env.alice, "1", &BtcTx::new(1, 3).req()).await?;
    assert_ok(&r);
    let out = r.clone().json::<Vec<Value>>()?;
    assert_eq!(out.len(), 1);
    assert_eq!(out[0]["big_r"], "oops");
    assert_eq!(sig_records(&env, "1").await?[1]["status"], "unparsed");
    // still works
    set_mode(&env, "reply").await?;
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(1).encode()),
        )
        .await?,
    );
    assert_eq!(sig_records(&env, "1").await?[2]["status"], "signed");
    Ok(())
}

/// INV-12: the MPC panics (immediate failure path) → `failed`; never bricks the token.
#[tokio::test]
async fn mpc_panics() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "panic").await?;
    let r = sign_and_wait(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
    )
    .await?;
    assert_ok(&r);
    assert_eq!(r.clone().json::<Vec<Value>>()?, vec![Value::Null]);
    assert_eq!(
        events(&r, "sign_resolved")[0]["statuses"],
        json!(["failed"])
    );
    assert_eq!(sig_records(&env, "1").await?[0]["status"], "failed");
    set_mode(&env, "reply").await?;
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &evm_req(&EvmTx::transfer(0).encode()),
        )
        .await?,
    );
    assert_eq!(sig_records(&env, "1").await?[1]["status"], "signed");
    Ok(())
}

/// INV-23: one record per BTC input, display-order txid, vout, amount, payload sha256d(preimage).
#[tokio::test]
async fn btc_records_per_input() -> Result<()> {
    let env = setup().await?;
    let btc = BtcTx::new(3, 5);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &btc.req()).await?);
    let recs = sig_records(&env, "1").await?;
    assert_eq!(recs.len(), 3);
    for (i, rec) in recs.iter().enumerate() {
        let inp = &btc.inputs[i];
        assert_eq!(rec["chain"], "btc");
        assert_eq!(num(&rec["request_id"]), 0);
        assert_eq!(num(&rec["input_index"]), i as u128);
        assert_eq!(rec["payload"], hex(&sha256d(&btc.preimage(i))));
        let d = &rec["detail"]["btc"];
        assert_eq!(
            d["txid"],
            hex(&inp.txid_display()),
            "txid must be in display order"
        );
        assert_eq!(num(&d["vout"]), inp.vout as u128);
        assert_eq!(num(&d["amount_sats"]), inp.amount as u128);
        assert_eq!(rec["status"], "signed");
    }
    Ok(())
}

/// INV-24: BTC fan-out → n separate single-action `sign` receipts; with some failing, per-index
/// statuses and `null` at failed indices of the returned array.
#[tokio::test]
async fn btc_fanout_partial_failure() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "manual").await?;
    let btc = BtcTx::new(4, 6);
    let st = start_sign(&env, &env.alice, "1", &btc.req()).await?;
    wait_mpc_pending(&env, 4).await?;
    // map MPC request id → input index via the payload
    let reqs = mpc_requests(&env).await?;
    let idx_of = |q: &Value| -> usize {
        let p = ecdsa_of(q);
        (0..4)
            .find(|i| hex(&sha256d(&btc.preimage(*i))) == p)
            .expect("payload maps to an input")
    };
    let by_input: Vec<u64> = (0..4)
        .map(|i| {
            reqs.iter()
                .find(|q| idx_of(q) == i)
                .map(|q| q["request_id"].as_u64().unwrap())
                .unwrap()
        })
        .collect();
    let wrong = json!({"scheme":"Secp256k1","big_r":"nope"});
    mpc_respond_valid(&env, by_input[0]).await?;
    mpc_respond_valid(&env, by_input[2]).await?;
    assert_ok(&mpc_respond(&env, by_input[3], wrong.clone()).await?);
    // input 1 never answered → timeout
    env.worker.fast_forward(250).await?;
    let r = wait_resolved(&st, Duration::from_secs(90)).await?;
    assert_ok(&r);
    let out = r.clone().json::<Vec<Value>>()?;
    assert_eq!(out.len(), 4);
    assert!(out[0]["scheme"] == "Secp256k1" && out[2]["scheme"] == "Secp256k1");
    assert!(out[1].is_null(), "failed index must be null");
    assert_eq!(out[3], wrong);
    assert_eq!(
        events(&r, "sign_resolved")[0]["statuses"],
        json!(["signed", "failed", "signed", "unparsed"])
    );
    let st: Vec<String> = sig_records(&env, "1")
        .await?
        .iter()
        .map(|r| r["status"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(st, vec!["signed", "failed", "signed", "unparsed"]);

    // n separate receipts, one action each (never a batched multi-action receipt)
    let receipts =
        rpc::tx_receipts(&env.worker, &r.outcome().transaction_hash, env.alice.id()).await?;
    let calls = rpc::calls(&receipts, env.satchel.id(), env.mpc.id(), "sign");
    assert_eq!(calls.len(), 4, "four MPC sign calls");
    assert!(
        calls.iter().all(|c| c.receipt_actions == 1),
        "each sign is a single-action receipt: {calls:?}"
    );
    assert!(
        calls
            .iter()
            .all(|c| c.deposit == 1 && c.gas >= 15_000_000_000_000)
    );
    for c in &calls {
        let req = &c.args["request"];
        assert_eq!(req["path"], "satchel/1/btc");
        assert_eq!(req["domain_id"], 0);
    }
    Ok(())
}

/// SOL request end to end: Eddsa domain 1, SOL record detail and the ed25519 signature view.
#[tokio::test]
async fn sol_request() -> Result<()> {
    let env = setup().await?;
    let msg = sol_message(1_000_000, [0x77; 32]);
    let r = sign_and_wait(&env, &env.alice, "1", &sol_req(&msg)).await?;
    assert_ok(&r);
    let q = &mpc_requests(&env).await?[0];
    assert_eq!(q["domain_id"], 1);
    assert_eq!(q["path"], "satchel/1/sol");
    assert_eq!(q["payload_v2"]["Eddsa"], hex(&msg));
    let rec = &sig_records(&env, "1").await?[0];
    assert_eq!(rec["chain"], "sol");
    assert_eq!(rec["status"], "signed");
    assert_eq!(rec["detail"]["sol"]["recent_blockhash"], hex(&[0x77; 32]));
    assert_eq!(num(&rec["detail"]["sol"]["lamports"]), 1_000_000);
    assert_eq!(rec["signature"], expected_sig_view(&mock_response(q)));
    assert_eq!(
        rec["signature"]["signature"].as_str().map(|s| s.len()),
        Some(128)
    );
    Ok(())
}

/// INV-17: `sign_for` with 0 deposit fails and changes nothing (function-call keys can't attach).
#[tokio::test]
async fn zero_deposit_rejected() -> Result<()> {
    let env = setup().await?;
    let o = SignOpts {
        gas: None,
        deposit: Some(NearToken::from_yoctonear(0)),
        mpc_deposit: None,
    };
    let r = sign_sync_fail(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
        o,
    )
    .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert_eq!(sig_count(&env, "1").await?, 0);
    assert_eq!(mpc_count(&env).await?, 0);
    Ok(())
}

/// INV-26: `mpc_deposit` outside [1 yocto, 0.01 NEAR] → ERR_MPC_DEPOSIT; inside, the MPC sees exactly
/// that deposit per call.
#[tokio::test]
async fn mpc_deposit_bounds() -> Result<()> {
    let env = setup().await?;
    let req = evm_req(&EvmTx::transfer(0).encode());
    for bad in [0u128, MAX_MPC_DEPOSIT + 1] {
        let o = SignOpts {
            gas: None,
            deposit: Some(NearToken::from_millinear(30)),
            mpc_deposit: Some(bad),
        };
        let r = sign_sync_fail(&env, &env.alice, "1", &req, o).await?;
        assert_fails_with(&r, "ERR_MPC_DEPOSIT");
    }
    assert_eq!(mpc_count(&env).await?, 0);
    let o = SignOpts {
        gas: None,
        deposit: Some(NearToken::from_millinear(30)),
        mpc_deposit: Some(MAX_MPC_DEPOSIT),
    };
    let st = start_sign_with(&env, &env.alice, "1", &req, o).await?;
    assert_ok(&wait_resolved(&st, Duration::from_secs(60)).await?);
    let btc = BtcTx::new(2, 8);
    let o = SignOpts {
        gas: None,
        deposit: None,
        mpc_deposit: Some(7),
    };
    let st = start_sign_with(&env, &env.alice, "1", &btc.req(), o).await?;
    assert_ok(&wait_resolved(&st, Duration::from_secs(60)).await?);
    let reqs = mpc_requests(&env).await?;
    assert_eq!(num(&reqs[0]["attached_deposit"]), MAX_MPC_DEPOSIT);
    assert_eq!(num(&reqs[1]["attached_deposit"]), 7);
    assert_eq!(num(&reqs[2]["attached_deposit"]), 7);
    Ok(())
}

/// nearcore `yield_timeout_length_in_blocks`: a yielded MPC `sign` resumes as a timeout once this many blocks
/// have passed since the mock's `sign` receipt (the pending request's `created_at`).
const YIELD_TIMEOUT_BLOCKS: u64 = 200;

/// Height of the last block that executed one of `r`'s receipts.
async fn last_receipt_height(env: &Env, r: &ExecutionFinalResult) -> Result<u64> {
    let mut h = 0;
    for o in r.receipt_outcomes() {
        h = h.max(
            env.worker
                .view_block()
                .block_hash(o.block_hash)
                .await?
                .height(),
        );
    }
    Ok(h)
}

/// `sig_records(id, 0, 50)` as of block `h`: a pinned read that does not depend on how fast blocks are produced.
async fn sig_records_at(env: &Env, id: &str, h: u64) -> Result<Vec<Value>> {
    Ok(env
        .satchel
        .view("sig_records")
        .args_json(json!({ "token_id": id, "from_seq": 0, "limit": 50 }))
        .block_height(h)
        .await?
        .json()?)
}

/// Poll until record `seq` of token `id` has `status`. Transient RPC errors are retried until the deadline.
async fn wait_record_status(
    env: &Env,
    id: &str,
    seq: usize,
    status: &str,
    max: Duration,
) -> Result<()> {
    let t0 = Instant::now();
    loop {
        let seen = match sig_records(env, id).await {
            Ok(recs) => match recs.get(seq) {
                Some(r) if r["status"] == status => return Ok(()),
                Some(r) => r["status"].to_string(),
                None => "no record".to_string(),
            },
            Err(e) => format!("rpc error: {e}"),
        };
        ensure!(
            t0.elapsed() < max,
            "record {seq} of token {id} never became {status} (last seen: {seen})"
        );
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

/// `on_signed` and `on_payout` are `#[private]`: an outsider cannot overwrite a record's status or
/// signature, nor credit proceeds.
///
/// Every step is pinned to block heights, never to wall time. The yield expires `YIELD_TIMEOUT_BLOCKS` after the
/// mock's `sign` receipt, which is only ≈ 20 s at the sandbox's ≈ 0.1 s blocks. The earlier version read "pending"
/// from the latest block after two transactions and a view: in a loaded full run they could outlast that window, the
/// yield then timed out on its own, and the read saw "failed". It also relied on a fixed `fast_forward(250)` plus a
/// single 90 s tx wait.
#[tokio::test]
async fn callbacks_are_private() -> Result<()> {
    let env = setup().await?;
    set_mode(&env, "never").await?;
    let st = start_sign(
        &env,
        &env.alice,
        "1",
        &evm_req(&EvmTx::transfer(0).encode()),
    )
    .await?;
    let pending = wait_mpc_pending(&env, 1).await?;
    // The timeout resumes at a height ≥ created_at + 200, so the record is pending at least through `live_until`.
    let live_until = num(&pending[0]["created_at"]) as u64 + YIELD_TIMEOUT_BLOCKS - 1;

    let mut calls_at = 0;
    for who in [&env.alice, &env.carol] {
        let r = who
            .call(env.satchel.id(), "on_signed")
            .args_json(json!({ "token_id": "1", "first_seq": 0, "n": 1 }))
            .gas(near_workspaces::types::Gas::from_tgas(30))
            .transact()
            .await?;
        assert_fails_with(&r, "is private");
        calls_at = calls_at.max(last_receipt_height(&env, &r).await?);
    }
    // Read the record as of the block that executed the refused calls. If they landed after the yield window (a
    // heavily loaded machine), read it as of the window's last block instead: a refused call reverts, so the record
    // must still be untouched and pending there.
    let check_at = calls_at.min(live_until);
    let recs = sig_records_at(&env, "1", check_at).await?;
    assert_eq!(
        recs[0]["status"], "pending",
        "as of block {check_at} (refused calls executed by {calls_at}; yield live through {live_until})"
    );
    assert!(recs[0]["signature"].is_null());

    let r = env
        .carol
        .call(env.satchel.id(), "on_payout")
        .args_json(json!({ "account_id": env.carol.id(), "currency": "near", "amount": "1000000000000000000000000" }))
        .transact()
        .await?;
    assert_fails_with(&r, "is private");
    assert_eq!(
        view(&env, "proceeds_of", json!({ "account_id": env.carol.id() })).await?,
        json!([])
    );

    // Force the timeout: fast-forward only what is left of the window (plus a margin), then poll the chain state.
    let target = live_until + 1 + 10;
    let h = height(&env).await?;
    if h < target {
        env.worker.fast_forward(target - h).await?;
    }
    wait_record_status(&env, "1", 0, "failed", Duration::from_secs(90)).await?;
    let r = wait_resolved(&st, Duration::from_secs(60)).await?;
    assert_ok(&r); // on_signed ran (as the yield's callback) and returned normally
    assert_eq!(
        events(&r, "sign_resolved")[0]["statuses"],
        json!(["failed"])
    );
    Ok(())
}
