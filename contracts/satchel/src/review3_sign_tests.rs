//! Review 3 (signing pipeline and clean history): proofs and demonstrations. Unit tests only (`testing_env!`).
//! Run: `cargo test -p satchel --lib review3_ -- --nocapture`.

use std::collections::BTreeSet;
use std::panic::{catch_unwind, AssertUnwindSafe};

use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseResult, RuntimeFeesConfig};

use crate::errors::*;
use crate::parse::btc::tests::{output, preimages, sample_tx, Tx, TxIn};
use crate::parse::{self, evm, sol};
use crate::*;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
/// NEAR protocol `max_total_log_length` (one receipt, all logs together).
const MAX_TOTAL_LOG_LENGTH: usize = 16_384;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("satchel.testnet")
}
fn mpc() -> AccountId {
    acc("mpc.testnet")
}
fn alice() -> AccountId {
    acc("alice.testnet")
}
fn bob() -> AccountId {
    acc("bob.testnet")
}

fn ctx(pred: AccountId, deposit: u128, height: u64, results: Vec<PromiseResult>) {
    let c = VMContextBuilder::new()
        .current_account_id(me())
        .signer_account_id(pred.clone())
        .predecessor_account_id(pred)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        // the mocked host prices promises far above the real runtime (a 10-input BTC sign_for "uses" ≈ 332 Tgas in the
        // mock vs 12.1 Tgas burnt + 180 static on the sandbox, docs/testing/contract.md §7.5), so raise the mock's prepaid
        .prepaid_gas(Gas::from_tgas(1_000))
        .block_height(height)
        .block_timestamp(height * 1_000_000_000)
        .account_balance(NearToken::from_near(100))
        .build();
    testing_env!(c, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), results);
}

fn setup() -> Contract {
    ctx(acc("team.testnet"), 0, 1_000, vec![]);
    Contract::new(mpc(), Some(acc("usdc.testnet")), "https://satchel.example/api/card/".into())
}

fn mint(c: &mut Contract, owner: AccountId) -> String {
    ctx(acc("team.testnet"), 20 * MILLI, 1_000, vec![]);
    c.nft_mint(owner).token_id
}

fn panic_msg<R>(f: impl FnOnce() -> R) -> Option<String> {
    let e = catch_unwind(AssertUnwindSafe(f)).err()?;
    Some(e.downcast_ref::<String>().cloned().or_else(|| e.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default())
}

fn events(name: &str) -> Vec<Value> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["event"] == name)
        .collect()
}

/// (receiver, method, args bytes, deposit, gas, dependency count) of every function call created by the last call.
fn calls() -> Vec<(AccountId, String, Vec<u8>, u128, Gas, usize)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            let deps = r.receipt_indices.len();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::FunctionCallWeight { method_name, args, attached_deposit, prepaid_gas, .. } => Some((
                    rcv.clone(),
                    String::from_utf8(method_name).unwrap(),
                    args,
                    attached_deposit.as_yoctonear(),
                    prepaid_gas,
                    deps,
                )),
                _ => None,
            })
        })
        .collect()
}

fn refund_to(who: &AccountId) -> u128 {
    get_created_receipts()
        .into_iter()
        .filter(|r| &r.receiver_id == who)
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::Transfer { deposit, .. } => Some(deposit.as_yoctonear()),
            _ => None,
        })
        .sum()
}

/// A complete BTC request with `n` inputs whose outpoints are `txid_le(i)`.
fn btc_request(n: usize, txid_le: impl Fn(usize) -> [u8; 32], outputs: Vec<u8>) -> SignRequest {
    let tx = Tx {
        version: 2,
        inputs: (0..n).map(|i| TxIn { txid_le: txid_le(i), vout: i as u32, amount: 10_000 + i as u64, sequence: 0xffff_fffd }).collect(),
        outputs,
        locktime: 0,
        pkh: [0x5a; 20],
        sighash: 1,
    };
    SignRequest::Btc { preimages: preimages(&tx).iter().map(hex::encode).collect(), outputs: hex::encode(&tx.outputs) }
}

fn sha256(b: &[u8]) -> [u8; 32] {
    env::sha256_array(b)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// R3-S-1 (checker): more than `maxBtcTxids` (100) distinct never-spendable txids in a token's BTC records make every
// BTC item `unknown / too_many_txids` for every checker, forever (only `spent` verdicts are cached, and fabricated or
// foreign outpoints never become spent). The contract side: the owner can log them cheaply and they survive transfer.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn review3_s1_btc_txid_cap_poison_is_cheap_and_travels_with_the_token() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    let outs = output(1_000, &[&[0x00, 0x14][..], &[0x5a; 20]].concat());
    let mut total_charged = 0u128;
    let requests = 11usize; // 110 records, 110 distinct fabricated txids (> the checker's soft cap of 100)
    for r in 0..requests {
        let req = btc_request(10, |i| {
            let mut t = [0xee; 32];
            t[0] = r as u8;
            t[1] = i as u8;
            t
        }, outs.clone());
        let attached = 100 * MILLI;
        ctx(alice(), attached, 2_000 + r as u64, vec![]);
        c.sign_for(id.clone(), req, None);
        total_charged += attached - refund_to(&alice());
    }
    // the poison travels with the token: give it away; the records and their txids stay
    ctx(alice(), 1, 3_000, vec![]);
    c.nft_transfer(bob(), id.clone(), None, None);
    let mut txids = BTreeSet::new();
    let mut seq = 0u64;
    loop {
        let page = c.sig_records(id.clone(), seq, 50);
        if page.is_empty() {
            break;
        }
        for r in &page {
            if let SigDetailView::Btc { txid, .. } = &r.detail {
                txids.insert(txid.clone());
            }
        }
        seq = page.last().unwrap().seq + 1;
    }
    assert_eq!(c.satchel(id.clone()).unwrap().sig_count, 110);
    assert_eq!(txids.len(), 110, "distinct txids a fresh checker must query");
    assert!(txids.len() > 100, "above TESTNET_POLICY.maxBtcTxids = 100 ⇒ every BTC item `unknown` (too_many_txids)");
    println!(
        "R3-S-1: {} records / {} distinct fabricated txids cost the poisoner {:.4} NEAR of storage + MPC deposit ({} yocto); \
         the token now belongs to bob and still carries them",
        110,
        txids.len(),
        total_charged as f64 / ONE_NEAR as f64,
        total_charged
    );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Q1: every MPC call carries exactly a record's payload, the token's path and the chain's domain, nothing else.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

fn assert_mpc_calls_match_records(c: &Contract, id: &str, first_seq: u64, n: usize, chain: Chain, d: u128) {
    let cs = calls();
    let mpc_calls: Vec<_> = cs.iter().filter(|x| x.0 == mpc()).collect();
    assert_eq!(mpc_calls.len(), n, "one MPC call per record");
    assert!(cs.iter().all(|x| x.0 == mpc() || (x.0 == me() && x.1 == "on_signed")), "no other function call is created");
    let ev = &events("sign_requested")[0]["data"];
    let recs = c.sig_records(id.into(), first_seq, 50);
    assert_eq!(recs.len(), n);
    for (i, call) in mpc_calls.iter().enumerate() {
        assert_eq!(call.1, "sign");
        assert_eq!(call.3, d, "deposit per call");
        assert!(call.4 >= Gas::from_tgas(MPC_SIGN_GAS_TGAS));
        let args: Value = serde_json::from_slice(&call.2).unwrap();
        // exact key sets (no attacker-influenced extra field can reach the MPC)
        assert_eq!(args.as_object().unwrap().keys().collect::<Vec<_>>(), vec!["request"]);
        let r = &args["request"];
        let mut keys: Vec<_> = r.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        assert_eq!(keys, vec!["domain_id", "path", "payload_v2"]);
        assert_eq!(r["path"], json!(format!("satchel/{id}/{}", chain.slug())));
        assert_eq!(r["domain_id"], json!(chain.domain_id()));
        let rec = &recs[i];
        assert_eq!(rec.seq, first_seq + i as u64);
        assert_eq!(rec.chain, chain);
        match chain {
            Chain::Btc | Chain::Evm => {
                assert_eq!(r["payload_v2"].as_object().unwrap().len(), 1);
                assert_eq!(r["payload_v2"]["Ecdsa"], json!(rec.payload), "MPC hash == record payload");
            }
            Chain::Sol => {
                let m = hex::decode(r["payload_v2"]["Eddsa"].as_str().unwrap()).unwrap();
                assert_eq!(hex::encode(sha256(&m)), rec.payload, "sha256(MPC message) == record payload");
                assert_eq!(json!(hex::encode(&m)), ev["preimages"][0], "the event carries the exact signed bytes");
            }
        }
    }
    let cb: Vec<_> = cs.iter().filter(|x| x.1 == "on_signed").collect();
    assert_eq!(cb.len(), 1);
    assert_eq!(cb[0].5, n, "the callback depends on all n MPC receipts");
    let cb_args: Value = serde_json::from_slice(&cb[0].2).unwrap();
    assert_eq!(cb_args, json!({"token_id": id, "first_seq": first_seq, "n": n}));
}

#[test]
fn review3_q1_mpc_args_are_exactly_the_records() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    let usdc = evm::tests::build(&evm::tests::erc20_fields(84_532, [0x22; 20], 7));
    let cases: Vec<(SignRequest, Chain)> = vec![
        (SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, Chain::Evm),
        (SignRequest::Evm { unsigned_tx: format!("0X{}", hex::encode_upper(&usdc)) }, Chain::Evm),
        (btc_request(10, |i| [0x30 + i as u8; 32], output(5_000, &[0x51, 0x20, 1, 2])), Chain::Btc),
        (SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }, Chain::Sol),
        (SignRequest::EvmMessage { message: hex::encode("Sign in ✓".as_bytes()) }, Chain::Evm),
        (SignRequest::SolMessage { message: hex::encode("Sign in ✓".as_bytes()) }, Chain::Sol),
    ];
    let mut seq = 0u64;
    for (k, (req, chain)) in cases.into_iter().enumerate() {
        let n = parse::request_count(&req);
        let d = 7 + k as u128;
        ctx(alice(), 100 * MILLI, 2_000 + k as u64, vec![]);
        c.sign_for(id.clone(), req, Some(near_sdk::json_types::U128(d)));
        assert_mpc_calls_match_records(&c, &id, seq, n, chain, d);
        seq += n as u64;
    }
}

/// Q1: crafted token ids never reach `derivation_path` through `sign_for`.
#[test]
fn review3_q1_crafted_token_ids_are_refused_before_any_write() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    assert_eq!(id, "1");
    for bad in ["1/evm", "01", "1 ", " 1", "", "1/../2", "+1", "1\u{0}"] {
        ctx(alice(), 100 * MILLI, 2_000, vec![]);
        let m = panic_msg(|| c.sign_for(bad.into(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None));
        assert!(m.unwrap_or_default().contains(ERR_TOKEN_NOT_FOUND), "{bad:?}");
        assert!(get_created_receipts().is_empty(), "{bad:?}: no MPC call");
    }
    assert_eq!(c.satchel(id).unwrap().sig_count, 0);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Q5: on_signed. Real-size MPC responses, TooLong, Failed, garbage, wrong scheme, missing records, fewer results than n,
// no overwrite of a resolved slot, no neighbour write.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const SECP_OK: &str = r#"{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1}"#;

fn ed25519_max_json() -> Vec<u8> {
    format!(r#"{{"scheme":"Ed25519","signature":[{}]}}"#, vec!["255"; 64].join(",")).into_bytes()
}

#[test]
fn review3_q5_on_signed_handles_every_result_shape_without_panicking() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    // seq 0..3: BTC (3 inputs); seq 3: SOL tx; seq 4: SOL message; seq 5: EVM
    let t = sample_tx(3);
    ctx(alice(), 100 * MILLI, 2_000, vec![]);
    c.sign_for(id.clone(), SignRequest::Btc { preimages: preimages(&t).iter().map(hex::encode).collect(), outputs: hex::encode(&t.outputs) }, None);
    ctx(alice(), 100 * MILLI, 2_001, vec![]);
    c.sign_for(id.clone(), SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }, None);
    ctx(alice(), 100 * MILLI, 2_002, vec![]);
    c.sign_for(id.clone(), SignRequest::SolMessage { message: hex::encode("hello") }, None);
    ctx(alice(), 100 * MILLI, 2_003, vec![]);
    c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None);

    let max_ed = ed25519_max_json();
    assert!(max_ed.len() < 300, "a maximal real ed25519 response is {} B, far below MAX_MPC_RESPONSE = 1024", max_ed.len());

    // BTC: Signed, Failed, Unparsed (garbage)
    ctx(me(), 0, 2_100, vec![PromiseResult::Successful(SECP_OK.into()), PromiseResult::Failed, PromiseResult::Successful(b"\x00not json".to_vec())]);
    let out = c.on_signed(id.clone(), 0, 3);
    assert_eq!(out.len(), 3);
    // SOL tx: a maximal real ed25519 response → Signed
    ctx(me(), 0, 2_101, vec![PromiseResult::Successful(max_ed.clone())]);
    c.on_signed(id.clone(), 3, 1);
    // SOL message: a 1025-byte success → TooLong → Unparsed, state unchanged in size
    let before = env::storage_usage();
    ctx(me(), 0, 2_102, vec![PromiseResult::Successful(vec![b' '; 1025])]);
    c.on_signed(id.clone(), 4, 1);
    c.sig_log.flush();
    assert_eq!(env::storage_usage(), before);
    // EVM: an ed25519 response on a secp256k1 record → Unparsed
    ctx(me(), 0, 2_103, vec![PromiseResult::Successful(max_ed.clone())]);
    c.on_signed(id.clone(), 5, 1);

    let st: Vec<SigStatus> = c.sig_records(id.clone(), 0, 50).iter().map(|r| r.status).collect();
    assert_eq!(st, vec![SigStatus::Signed, SigStatus::Failed, SigStatus::Unparsed, SigStatus::Signed, SigStatus::Unparsed, SigStatus::Unparsed]);

    // a second callback for an already-resolved range (or a bogus n > results) never overwrites, never panics
    ctx(me(), 0, 2_200, vec![PromiseResult::Successful(SECP_OK.into())]);
    c.on_signed(id.clone(), 1, 9);
    assert_eq!(c.sig_records(id.clone(), 1, 1)[0].status, SigStatus::Failed);
    // records that don't exist (unknown token, seq past the end, u64::MAX overflow) → no panic, no write
    ctx(me(), 0, 2_201, vec![PromiseResult::Successful(SECP_OK.into()), PromiseResult::Failed]);
    let before = env::storage_usage();
    c.on_signed("999".into(), 0, 2);
    c.on_signed(id.clone(), u64::MAX, 2);
    c.on_signed(id.clone(), 6, 0);
    c.sig_log.flush();
    assert_eq!(env::storage_usage(), before);
    assert_eq!(c.satchel(id).unwrap().sig_count, 6);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Q6: worst-case logs per receipt (NEAR `max_total_log_length` = 16 384 B) and worst-case MPC args.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

fn total_log_bytes() -> usize {
    get_logs().iter().map(|l| l.len()).sum()
}

/// 1024 B of outputs, two scripts (520 + 482 B), CompactSize 0xfd each.
fn max_outputs() -> Vec<u8> {
    let mut o = output_long(u64::MAX, &[0x6a; 520]);
    o.extend(output_long(u64::MAX, &[0x6a; 482]));
    assert_eq!(o.len(), 1024);
    o
}
fn output_long(value: u64, script: &[u8]) -> Vec<u8> {
    let mut o = value.to_le_bytes().to_vec();
    o.push(0xfd);
    o.extend((script.len() as u16).to_le_bytes());
    o.extend_from_slice(script);
    o
}

#[test]
fn review3_q6_worst_case_logs_and_mpc_args_fit() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    let mut worst = Vec::new();
    // BTC: 10 inputs, 1024 B of outputs, maximal txid/vout/amount digits
    ctx(alice(), 100 * MILLI, 2_000, vec![]);
    let tx = Tx {
        version: 2,
        inputs: (0..10).map(|i| TxIn { txid_le: [0xf0 + i as u8; 32], vout: u32::MAX - i as u32, amount: u64::MAX - i as u64, sequence: 0xffff_ffff }).collect(),
        outputs: max_outputs(),
        locktime: 0,
        pkh: [0xff; 20],
        sighash: 1,
    };
    c.sign_for(id.clone(), SignRequest::Btc { preimages: preimages(&tx).iter().map(hex::encode).collect(), outputs: hex::encode(&tx.outputs) }, None);
    worst.push(("btc 10 inputs + 1024 B outputs", total_log_bytes(), calls().iter().map(|x| x.2.len()).max().unwrap()));
    // messages: 1024 B bodies of 4-byte UTF-8 characters
    let body = "😀".repeat(256);
    assert_eq!(body.len(), 1024);
    ctx(alice(), 100 * MILLI, 2_001, vec![]);
    c.sign_for(id.clone(), SignRequest::EvmMessage { message: hex::encode(&body) }, None);
    worst.push(("evm_message 1024 B", total_log_bytes(), calls().iter().map(|x| x.2.len()).max().unwrap()));
    ctx(alice(), 100 * MILLI, 2_002, vec![]);
    c.sign_for(id.clone(), SignRequest::SolMessage { message: hex::encode(&body) }, None);
    worst.push(("sol_message 1024 B", total_log_bytes(), calls().iter().map(|x| x.2.len()).max().unwrap()));
    // largest SOL transaction the classifier can accept: 16 keys, one transfer (566 B)
    let mut m = vec![1u8, 0, 14, 16];
    m.extend([0x11u8; 32]);
    m.extend([0u8; 32]); // system program at index 1
    for k in 2..16u8 {
        m.extend([k; 32]);
    }
    m.extend([0x09; 32]);
    m.extend([1, 1, 2, 0, 2, 12, 2, 0, 0, 0]);
    m.extend(u64::MAX.to_le_bytes());
    assert_eq!(sol::classify(&m).map(|t| t.lamports), Ok(u64::MAX));
    ctx(alice(), 100 * MILLI, 2_003, vec![]);
    c.sign_for(id.clone(), SignRequest::Sol { message: hex::encode(&m) }, None);
    worst.push(("sol tx 566 B", total_log_bytes(), calls().iter().map(|x| x.2.len()).max().unwrap()));
    for (name, logs, args) in &worst {
        println!("Q6: {name}: total logs {logs} B (limit {MAX_TOTAL_LOG_LENGTH}), largest MPC/callback args {args} B");
        assert!(*logs < MAX_TOTAL_LOG_LENGTH / 2, "{name}");
    }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// R3-I-1 (fixed): `SignRequest` refuses unknown fields, like FtMsg (Q-04). `sign_for` also carries
// `#[deny_unknown_arguments]`, which applies at the wasm JSON entry point (not reachable from a unit test).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn review3_i1_sign_request_refuses_unknown_fields() {
    let decoy = json!({"evm": {"unsigned_tx": evm::tests::KB31_TX, "to": "0x000000000000000000000000000000000000a11c", "value": "0.000001 ETH", "note": "refund to alice"}});
    let err = serde_json::from_value::<SignRequest>(decoy).expect_err("a decoy field next to the signed bytes is refused");
    assert!(err.to_string().contains("unknown field"), "{err}");
    // every variant is strict, and the exact shapes the clients build still parse
    for bad in [
        json!({"btc": {"preimages": [], "outputs": "00", "fee": "1 sat"}}),
        json!({"sol": {"message": "00", "to": "alice"}}),
        json!({"evm_message": {"message": "6869", "display": "hi"}}),
        json!({"sol_message": {"message": "6869", "display": "hi"}}),
    ] {
        assert!(serde_json::from_value::<SignRequest>(bad.clone()).is_err(), "{bad}");
    }
    for good in [
        json!({"evm": {"unsigned_tx": evm::tests::KB31_TX}}),
        json!({"btc": {"preimages": ["00"], "outputs": "00"}}),
        json!({"sol": {"message": "00"}}),
        json!({"evm_message": {"message": "6869"}}),
        json!({"sol_message": {"message": "6869"}}),
    ] {
        assert!(serde_json::from_value::<SignRequest>(good.clone()).is_ok(), "{good}");
    }
    // for comparison: FtMsg is strict too (types.rs, Q-04)
    assert!(serde_json::from_value::<FtMsg>(json!({"deposit": "3", "extra": 1})).is_err());
    // a second variant key is refused, a duplicate field is refused
    assert!(serde_json::from_str::<SignRequest>(r#"{"evm":{"unsigned_tx":"02"},"sol":{"message":"00"}}"#).is_err());
    assert!(serde_json::from_str::<SignRequest>(r#"{"evm":{"unsigned_tx":"02","unsigned_tx":"02"}}"#).is_err());
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Q8: history views. A record can't be in state but missing from the views (or vice versa); the digest binds every
// immutable field and ignores status/signature.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

#[test]
fn review3_q8_digest_and_views_cover_every_record_and_ignore_callbacks() {
    let mut c = setup();
    let id = mint(&mut c, alice());
    ctx(alice(), 100 * MILLI, 2_000, vec![]);
    c.sign_for(id.clone(), btc_request(3, |i| [0x40 + i as u8; 32], output(1, &[0x51])), None);
    ctx(alice(), 100 * MILLI, 2_001, vec![]);
    c.sign_for(id.clone(), SignRequest::EvmMessage { message: hex::encode("x") }, None);
    let d0 = c.history_digest(id.clone()).unwrap();
    assert_eq!(d0.sig_count, 4);
    assert_eq!(c.sig_records(id.clone(), 0, 50).len(), 4);
    // a resolved callback changes the views but not the digest
    ctx(me(), 0, 2_100, vec![PromiseResult::Successful(SECP_OK.into()), PromiseResult::Failed, PromiseResult::Failed]);
    c.on_signed(id.clone(), 0, 3);
    assert_eq!(c.history_digest(id.clone()).unwrap(), d0);
    // nonexistent tokens: null digest, empty pages
    assert_eq!(c.history_digest("2".into()), None);
    assert!(c.sig_records("2".into(), 0, 50).is_empty());
    // the borsh encoding is injective over the fields that matter: same seq/payload, different detail ⇒ different bytes
    let mut a = Vec::new();
    let mut b = Vec::new();
    let r = c.sig_log.get(&(id.clone(), 0)).unwrap().clone();
    let mut r2 = r.clone();
    r2.detail = SigDetail::Btc { txid: [0x40; 32], vout: 0, amount_sats: 10_001 };
    crate::history::write_entry(&mut a, 0, &r);
    crate::history::write_entry(&mut b, 0, &r2);
    assert_ne!(a, b);
    assert_eq!(c.satchel(id).unwrap().sig_count, 4);
}

