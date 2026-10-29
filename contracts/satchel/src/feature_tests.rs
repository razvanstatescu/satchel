//! Unit tests for C1 (history digest), C2 (USDC transfers), C3 (four EVM testnets, per-chain nonce gap) and C7
//! (message signing), per docs/specs/C1-C2-C3-C7.md. The mocked chain doesn't roll back on panic, so "a refusal
//! changes nothing" is checked strictly: the contract must panic before its first write.

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseResult, RuntimeFeesConfig};
use sha2::{Digest, Sha256};
use sha3::Keccak256;

use crate::errors::*;
use crate::parse::evm::tests::{base as evm_base, build as evm_build, enc_str, erc20_fields, int, transfer_data};
use crate::parse::{btc, evm, sol};
use crate::types::*;
use crate::*;

const MILLI: u128 = 1_000_000_000_000_000_000_000;
const BASE: u64 = 84_532;
const ARB: u64 = 421_614;
const OP: u64 = 11_155_420;
const SECP_OK: &str = r#"{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1}"#;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("satchel.testnet")
}
fn alice() -> AccountId {
    acc("alice.testnet")
}
fn bob() -> AccountId {
    acc("bob.testnet")
}

fn ctx(predecessor: AccountId, deposit: u128, height: u64, results: Vec<PromiseResult>) {
    let c = VMContextBuilder::new()
        .current_account_id(me())
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(300))
        .block_height(height)
        .block_timestamp(height * 1_000_000_000)
        .account_balance(NearToken::from_near(100))
        .build();
    testing_env!(c, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), results);
}

fn panics<R>(f: impl FnOnce() -> R) -> Option<String> {
    let err = catch_unwind(AssertUnwindSafe(f)).err()?;
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    Some(match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    })
}

fn expect_code<R>(code: &str, f: impl FnOnce() -> R) -> String {
    match panics(f) {
        None => panic!("expected {code}, call succeeded"),
        Some(m) => {
            assert!(m.starts_with(&format!("{code}: ")), "expected {code}, got {m:?}");
            m
        }
    }
}

fn setup() -> Contract {
    ctx(acc("team.testnet"), 0, 1, vec![]);
    Contract::new(acc("mpc.testnet"), Some(acc("usdc.testnet")), "https://satchel.example/api/card/".into())
}

fn mint_to(c: &mut Contract, owner: AccountId) -> String {
    ctx(acc("team.testnet"), 20 * MILLI, 1, vec![]);
    c.nft_mint(owner).token_id
}

fn evm_tx(tx: &[u8]) -> SignRequest {
    SignRequest::Evm { unsigned_tx: hex::encode(tx) }
}

/// A native transfer on `chain` with `nonce`.
fn native(chain: u64, nonce: u64) -> SignRequest {
    let mut f = evm_base();
    f.chain = int(chain as u128);
    f.nonce = int(nonce as u128);
    evm_tx(&evm_build(&f))
}

fn usdc(chain: u64, nonce: u64, amount: u128) -> SignRequest {
    let mut f = erc20_fields(chain, [0x22; 20], amount);
    f.nonce = int(nonce as u128);
    evm_tx(&evm_build(&f))
}

fn evm_msg(m: &[u8]) -> SignRequest {
    SignRequest::EvmMessage { message: hex::encode(m) }
}
fn sol_msg(m: &[u8]) -> SignRequest {
    SignRequest::SolMessage { message: hex::encode(m) }
}

/// `who` signs with `deposit` at `height`.
fn sign_with(c: &mut Contract, who: AccountId, id: &str, req: SignRequest, height: u64, deposit: u128) {
    ctx(who, deposit, height, vec![]);
    c.sign_for(id.into(), req, None);
}

fn sign(c: &mut Contract, who: AccountId, id: &str, req: SignRequest, height: u64) {
    let n = parse::request_count(&req) as u128;
    sign_with(c, who, id, req, height, 20 * MILLI * n);
}

/// Refused with `code`, and nothing changed: no record, no event, no receipt, same storage.
fn refuse(c: &mut Contract, who: AccountId, id: &str, req: SignRequest, code: &str) -> String {
    ctx(who, 20 * MILLI, 500, vec![]);
    let (n0, s0) = (c.satchel(id.into()).unwrap().sig_count, env::storage_usage());
    let msg = expect_code(code, || c.sign_for(id.into(), req, None));
    assert_eq!(c.satchel(id.into()).unwrap().sig_count, n0);
    assert_eq!(env::storage_usage(), s0, "{code}: storage changed");
    assert!(get_created_receipts().is_empty(), "{code}: a receipt was created");
    assert!(get_logs().is_empty(), "{code}: an event was emitted");
    msg
}

fn rec_json(c: &Contract, id: &str, seq: u64) -> Value {
    serde_json::to_value(&c.sig_records(id.into(), seq, 1)[0]).unwrap()
}

fn events(name: &str) -> Vec<Value> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["event"] == name)
        .collect()
}

fn mpc_calls() -> Vec<Value> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::FunctionCallWeight { method_name, args, .. } if method_name == b"sign" => serde_json::from_slice(&args).ok(),
            _ => None,
        })
        .collect()
}

/// Kept deposit = attached − refunds to the predecessor.
fn kept(attached: u128, who: &AccountId) -> u128 {
    let refunded: u128 = get_created_receipts()
        .into_iter()
        .filter(|r| &r.receiver_id == who)
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::Transfer { deposit, .. } => Some(deposit.as_yoctonear()),
            _ => None,
        })
        .sum();
    attached - refunded
}

fn keccak(b: &[u8]) -> [u8; 32] {
    Keccak256::digest(b).into()
}

// ── C1: history digest ─────────────────────────────────────────────────────────────────────────

/// An independent encoder of docs/specs/C1-C2-C3-C7.md §5.1, from the `sig_records` view JSON (not the stored structs,
/// not borsh): the TS mirror does the same thing, so this is what clients can reproduce.
fn spec_digest(contract: &str, token: &str, rows: &[Value]) -> String {
    let u32le = |n: usize| (n as u32).to_le_bytes().to_vec();
    let str_ = |s: &str| [u32le(s.len()), s.as_bytes().to_vec()].concat();
    let bytes_ = |h: &str| {
        let b = hex::decode(h).unwrap();
        [u32le(b.len()), b].concat()
    };
    let u64v = |v: &Value| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())).unwrap().to_le_bytes().to_vec();
    let mut h = Sha256::new();
    h.update(str_("satchel.history.v1"));
    h.update(str_(contract));
    h.update(str_(token));
    h.update((rows.len() as u64).to_le_bytes());
    for r in rows {
        h.update(u64v(&r["seq"]));
        h.update(u64v(&r["request_id"]));
        h.update([r["input_index"].as_u64().unwrap() as u8]);
        h.update(u64v(&r["height"]));
        h.update(u64v(&r["timestamp_ms"]));
        h.update(str_(r["requester"].as_str().unwrap()));
        h.update(hex::decode(r["payload"].as_str().unwrap()).unwrap());
        let d = &r["detail"];
        if let Some(e) = d.get("evm") {
            h.update([0u8]);
            h.update(u64v(&e["chain_id"]));
            h.update(u64v(&e["nonce"]));
            h.update(bytes_(e["unsigned_tx"].as_str().unwrap()));
        } else if let Some(b) = d.get("btc") {
            h.update([1u8]);
            h.update(hex::decode(b["txid"].as_str().unwrap()).unwrap());
            h.update((b["vout"].as_u64().unwrap() as u32).to_le_bytes());
            h.update(u64v(&b["amount_sats"]));
        } else if let Some(s) = d.get("sol") {
            h.update([2u8]);
            h.update(hex::decode(s["recent_blockhash"].as_str().unwrap()).unwrap());
            h.update(u64v(&s["lamports"]));
        } else if let Some(m) = d.get("evm_message") {
            h.update([3u8]);
            h.update(bytes_(m["message"].as_str().unwrap()));
        } else if let Some(m) = d.get("sol_message") {
            h.update([4u8]);
            h.update(bytes_(m["message"].as_str().unwrap()));
        } else {
            panic!("unknown detail {d}");
        }
    }
    hex::encode(h.finalize())
}

fn rows(c: &Contract, id: &str) -> Vec<Value> {
    c.sig_records(id.into(), 0, 50).iter().map(|r| serde_json::to_value(r).unwrap()).collect()
}

#[test]
fn c1_history_digest_of_unknown_and_empty_tokens() {
    let mut c = setup();
    assert_eq!(c.history_digest("1".into()), None);
    let id = mint_to(&mut c, alice());
    let d = c.history_digest(id.clone()).unwrap();
    assert_eq!(d.sig_count, 0);
    assert_eq!(d.digest_hex, spec_digest("satchel.testnet", "1", &[]));
    // = SHA-256(H), H = str("satchel.history.v1") ‖ str("satchel.testnet") ‖ str("1") ‖ u64(0)
    let h = [&18u32.to_le_bytes()[..], b"satchel.history.v1", &15u32.to_le_bytes(), b"satchel.testnet", &1u32.to_le_bytes(), b"1", &0u64.to_le_bytes()].concat();
    assert_eq!(d.digest_hex, hex::encode(Sha256::digest(&h)));
}

/// Every record kind is covered; the digest ignores status/signature (on_signed) and changes with every new record.
#[test]
fn c1_history_digest_covers_every_kind_and_ignores_status() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, alice(), &id, native(evm::SEPOLIA, 0), 100);
    sign(
        &mut c,
        alice(),
        &id,
        SignRequest::Btc { preimages: vec![btc::tests::BJS_PRE0.into(), btc::tests::BJS_PRE1.into()], outputs: btc::tests::BJS_OUTPUTS.into() },
        101,
    );
    sign(&mut c, alice(), &id, SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }, 102);
    sign(&mut c, alice(), &id, usdc(BASE, 0, 1_500_000), 103);
    sign(&mut c, alice(), &id, evm_msg(b"hello"), 104);
    sign(&mut c, alice(), &id, sol_msg("Grüße".as_bytes()), 105);
    let d0 = c.history_digest(id.clone()).unwrap();
    assert_eq!(d0.sig_count, 7);
    assert_eq!(d0.digest_hex, spec_digest("satchel.testnet", &id, &rows(&c, &id)), "view == independent encoder");

    // resolving records (status + signature) leaves the digest alone
    ctx(me(), 0, 200, vec![PromiseResult::Successful(SECP_OK.as_bytes().to_vec())]);
    c.on_signed(id.clone(), 0, 1);
    ctx(me(), 0, 201, vec![PromiseResult::Failed, PromiseResult::Failed]);
    c.on_signed(id.clone(), 1, 2);
    assert_eq!(rec_json(&c, &id, 0)["status"], "signed");
    assert_eq!(c.history_digest(id.clone()).unwrap(), d0);

    // one more record → a new digest and count
    sign(&mut c, alice(), &id, native(evm::SEPOLIA, 1), 300);
    let d1 = c.history_digest(id.clone()).unwrap();
    assert_eq!(d1.sig_count, 8);
    assert_ne!(d1.digest_hex, d0.digest_hex);
    assert_eq!(d1.digest_hex, spec_digest("satchel.testnet", &id, &rows(&c, &id)));
}

/// The header binds the token id (and the contract), so two tokens with identical records never share a digest.
#[test]
fn c1_history_digest_binds_the_token() {
    let mut c = setup();
    let a = mint_to(&mut c, alice());
    let b = mint_to(&mut c, alice());
    sign(&mut c, alice(), &a, native(evm::SEPOLIA, 0), 100);
    sign(&mut c, alice(), &b, native(evm::SEPOLIA, 0), 100);
    let (da, db) = (c.history_digest(a.clone()).unwrap(), c.history_digest(b.clone()).unwrap());
    assert_eq!(da.sig_count, db.sig_count);
    assert_ne!(da.digest_hex, db.digest_hex);
    assert_ne!(spec_digest("other.testnet", &a, &rows(&c, &a)), da.digest_hex);
}

// ── C2: USDC transfers ─────────────────────────────────────────────────────────────────────────

#[test]
fn c2_usdc_transfer_record_view_event_and_exact_charge() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let req = usdc(evm::SEPOLIA, 0, 1_500_000);
    let SignRequest::Evm { unsigned_tx } = &req else { unreachable!() };
    let tx = hex::decode(unsigned_tx).unwrap();
    ctx(alice(), 5 * MILLI, 100, vec![]);
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), req.clone(), None);
    let used = (env::storage_usage() - s0) as u128;
    assert_eq!(kept(5 * MILLI, &alice()), used * env::storage_byte_cost().as_yoctonear() + 1, "INV-18");
    assert!(used < 500, "record {used} B");
    let r = rec_json(&c, &id, 0);
    assert_eq!(r["chain"], "evm");
    assert_eq!(r["payload"], hex::encode(keccak(&tx)));
    assert_eq!(
        r["detail"],
        json!({"evm":{"chain_id":11155111,"nonce":0,"unsigned_tx":hex::encode(&tx),
            "erc20":{"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238","to":hex::encode([0x22u8; 20]),"amount":"1500000"}}})
    );
    let calls = mpc_calls();
    assert_eq!(calls, vec![json!({"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":hex::encode(keccak(&tx))},"domain_id":0}})]);
    let ev = events("sign_requested");
    assert_eq!(
        ev[0]["data"]["details"],
        json!([{"seq":0,"chain_id":11155111,"nonce":0,"erc20":{"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238","to":hex::encode([0x22u8; 20]),"amount":"1500000"}}])
    );
    // a native record has no "erc20" key at all (not null)
    sign(&mut c, alice(), &id, native(evm::SEPOLIA, 1), 101);
    let r = rec_json(&c, &id, 1);
    assert!(r["detail"]["evm"].as_object().unwrap().get("erc20").is_none(), "{r}");
    assert!(events("sign_requested")[0]["data"]["details"][0].as_object().unwrap().get("erc20").is_none());
    // the USDC nonce shares the chain's nonce sequence with native sends
    assert_eq!(c.max_evm_nonce(id.clone(), evm::SEPOLIA), Some(1));
}

#[test]
fn c2_calldata_refusals_change_nothing() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let with = |edit: &dyn Fn(&mut evm::tests::Fields)| {
        let mut f = erc20_fields(evm::SEPOLIA, [0x22; 20], 1);
        edit(&mut f);
        evm_tx(&evm_build(&f))
    };
    refuse(&mut c, alice(), &id, with(&|f| f.to = enc_str(&evm::token_of(BASE).unwrap())), ERR_EVM_TOKEN);
    refuse(&mut c, alice(), &id, with(&|f| f.to = enc_str(&[0x11; 20])), ERR_EVM_TOKEN);
    refuse(&mut c, alice(), &id, with(&|f| f.value = int(1)), ERR_EVM_VALUE);
    refuse(&mut c, alice(), &id, with(&|f| { let mut d = transfer_data([0x22; 20], 1); d[0] = 0x09; f.data = enc_str(&d) }), ERR_EVM_DATA);
    refuse(&mut c, alice(), &id, with(&|f| { let mut d = transfer_data([0x22; 20], 1); d[10] = 1; f.data = enc_str(&d) }), ERR_EVM_DATA);
    refuse(&mut c, alice(), &id, with(&|f| { let mut d = transfer_data([0x22; 20], 1); d[40] = 1; f.data = enc_str(&d) }), ERR_EVM_DATA);
    assert_eq!(c.max_evm_nonce(id.clone(), evm::SEPOLIA), None);
    assert!(c.sig_records(id, 0, 50).is_empty());
}

// ── C3: four EVM testnets, the nonce-gap rule per chain ────────────────────────────────────────

#[test]
fn c3_every_chain_signs_with_the_same_key_path() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for (i, chain) in evm::EVM_CHAIN_IDS.into_iter().enumerate() {
        sign(&mut c, alice(), &id, native(chain, 0), 100 + i as u64);
        let calls = mpc_calls();
        assert_eq!(calls[0]["request"]["path"], "satchel/1/evm");
        assert_eq!(calls[0]["request"]["domain_id"], 0);
        assert_eq!(rec_json(&c, &id, i as u64)["detail"]["evm"]["chain_id"], chain);
    }
    let mut f = evm_base();
    f.chain = int(8453); // Base mainnet
    refuse(&mut c, alice(), &id, evm_tx(&evm_build(&f)), ERR_EVM_CHAIN_ID);
}

#[test]
fn c3_nonce_gap_is_per_chain() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    // Sepolia at 5 doesn't open Base: Base starts from "no record" (nonce ≤ 1)
    for n in 0..=5 {
        sign(&mut c, alice(), &id, native(evm::SEPOLIA, n), 100 + n);
    }
    let m = refuse(&mut c, alice(), &id, native(BASE, 2), ERR_EVM_NONCE_GAP);
    assert!(m.contains("≤ 1 on chain 84532"), "{m}");
    assert_eq!(c.max_evm_nonce(id.clone(), BASE), None, "a refusal writes no nonce entry");
    sign(&mut c, alice(), &id, native(BASE, 1), 200);
    sign(&mut c, alice(), &id, usdc(BASE, 2, 10), 201);
    refuse(&mut c, alice(), &id, native(BASE, 4), ERR_EVM_NONCE_GAP);
    sign(&mut c, alice(), &id, native(BASE, 0), 202); // lower: allowed, max unchanged
    assert_eq!(c.max_evm_nonce(id.clone(), BASE), Some(2));
    // a Base gap doesn't constrain Sepolia, Arbitrum or OP
    sign(&mut c, alice(), &id, native(evm::SEPOLIA, 6), 203);
    sign(&mut c, alice(), &id, native(ARB, 1), 204);
    sign(&mut c, alice(), &id, native(OP, 0), 205);
    refuse(&mut c, alice(), &id, native(OP, 2), ERR_EVM_NONCE_GAP);
    let m = refuse(&mut c, alice(), &id, native(evm::SEPOLIA, 8), ERR_EVM_NONCE_GAP);
    assert!(m.contains("≤ 7 on chain 11155111"), "{m}");
    assert_eq!(
        evm::EVM_CHAIN_IDS.map(|ch| c.max_evm_nonce(id.clone(), ch)),
        [Some(6), Some(2), Some(1), Some(0)]
    );
    assert_eq!(c.state.get(&id).unwrap().max_evm_nonce, Some(6), "Sepolia keeps its TokenState slot");
    assert_eq!(c.max_evm_nonce(id.clone(), 1), None, "unsupported chain");
    assert_eq!(c.max_evm_nonce("99".into(), BASE), None);
    // the per-chain maxima belong to the token: the next owner continues from them
    ctx(alice(), 1, 300, vec![]);
    c.nft_transfer(bob(), id.clone(), None, None);
    refuse(&mut c, bob(), &id, native(BASE, 4), ERR_EVM_NONCE_GAP);
    sign(&mut c, bob(), &id, native(BASE, 3), 301);
    assert_eq!(c.max_evm_nonce(id.clone(), BASE), Some(3));
    // stateless codes still come first
    let mut f = erc20_fields(BASE, [0x22; 20], 1);
    f.nonce = int(50);
    f.value = int(1);
    refuse(&mut c, bob(), &id, evm_tx(&evm_build(&f)), ERR_EVM_VALUE);
}

/// The first record on a new chain writes the map entry, paid by the requester; later ones only overwrite it.
#[test]
fn c3_first_record_on_a_new_chain_charges_the_nonce_entry() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let charged = |c: &mut Contract, req: SignRequest, h: u64| {
        ctx(alice(), 5 * MILLI, h, vec![]);
        let s0 = env::storage_usage();
        c.sign_for(id.clone(), req, None);
        let used = env::storage_usage() - s0;
        assert_eq!(kept(5 * MILLI, &alice()), used as u128 * env::storage_byte_cost().as_yoctonear() + 1, "INV-18");
        used
    };
    let first = charged(&mut c, native(ARB, 0), 100);
    let second = charged(&mut c, native(ARB, 1), 101);
    let same = charged(&mut c, native(ARB, 1), 102);
    assert_eq!(second, same, "an update grows nothing");
    let entry = first - second;
    // 40 B per-entry overhead + key (1-byte prefix ‖ borsh("1") 5 B ‖ u64 8 B) + u64 value 8 B
    assert_eq!(entry, 40 + 1 + 5 + 8 + 8, "map entry size");
}

// ── C7: message signing ─────────────────────────────────────────────────────────────────────────

#[test]
fn c7_evm_message_is_eip191_and_its_own_record_kind() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let req = evm_msg(b"hello");
    ctx(alice(), 5 * MILLI, 100, vec![]);
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), req, None);
    let used = (env::storage_usage() - s0) as u128;
    assert_eq!(kept(5 * MILLI, &alice()), used * env::storage_byte_cost().as_yoctonear() + 1, "INV-18");
    let h = "50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750"; // viem hashMessage("hello")
    assert_eq!(mpc_calls(), vec![json!({"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":h},"domain_id":0}})]);
    let ev = events("sign_requested");
    let d = &ev[0]["data"];
    assert_eq!(d["chain"], "evm");
    assert_eq!(d["preimages"], json!([hex::encode(b"\x19Ethereum Signed Message:\n5hello")]));
    assert_eq!(d["payloads"], json!([h]));
    assert_eq!(d["details"], json!([{"seq":0,"kind":"evm_message"}]));
    let r = rec_json(&c, &id, 0);
    assert_eq!((r["chain"].as_str(), r["payload"].as_str()), (Some("evm"), Some(h)));
    assert_eq!(r["detail"], json!({"evm_message":{"message":hex::encode(b"hello")}}));
    assert_eq!(c.max_evm_nonce(id.clone(), evm::SEPOLIA), None, "messages never touch EVM nonces");
    // the callback fills it like any secp256k1 record, without growing storage
    ctx(me(), 0, 101, vec![PromiseResult::Successful(SECP_OK.as_bytes().to_vec())]);
    let s1 = env::storage_usage();
    c.on_signed(id.clone(), 0, 1);
    assert_eq!(env::storage_usage(), s1);
    let r = rec_json(&c, &id, 0);
    assert_eq!(r["status"], "signed");
    assert_eq!(r["signature"]["recovery_id"], 1);
    assert_eq!(c.satchel(id).unwrap().last_sign_height, 100, "a message restarts the quiet period like any signature");
}

#[test]
fn c7_sol_message_is_offchain_v0_on_the_ed25519_domain() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, alice(), &id, sol_msg(b"Hi"), 100);
    let bytes = "ff736f6c616e61206f6666636861696e000002004869";
    assert_eq!(mpc_calls(), vec![json!({"request":{"path":"satchel/1/sol","payload_v2":{"Eddsa":bytes},"domain_id":1}})]);
    let r = rec_json(&c, &id, 0);
    assert_eq!(r["chain"], "sol");
    assert_eq!(r["payload"], hex::encode(Sha256::digest(hex::decode(bytes).unwrap())));
    assert_eq!(r["detail"], json!({"sol_message":{"message":"4869"}}));
    assert_eq!(events("sign_requested")[0]["data"]["details"], json!([{"seq":0,"kind":"sol_message"}]));
    // format 1 for non-ASCII, and the Ed25519 reply fills the slot
    sign(&mut c, alice(), &id, sol_msg("line\nbreak".as_bytes()), 101);
    assert_eq!(&mpc_calls()[0]["request"]["payload_v2"]["Eddsa"].as_str().unwrap()[34..36], "01");
    let ed: Vec<u8> = (0..64).collect();
    ctx(me(), 0, 102, vec![PromiseResult::Successful(serde_json::to_vec(&json!({"scheme":"Ed25519","signature":ed})).unwrap())]);
    c.on_signed(id.clone(), 0, 1);
    assert_eq!(rec_json(&c, &id, 0)["signature"], json!({"signature": hex::encode(&ed)}));
    // a secp256k1 reply for a Solana message is the wrong scheme → unparsed
    ctx(me(), 0, 103, vec![PromiseResult::Successful(SECP_OK.as_bytes().to_vec())]);
    c.on_signed(id.clone(), 1, 1);
    assert_eq!(rec_json(&c, &id, 1)["status"], "unparsed");
}

#[test]
fn c7_message_refusals_change_nothing() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for kind in [evm_msg as fn(&[u8]) -> SignRequest, sol_msg] {
        refuse(&mut c, alice(), &id, kind(b""), ERR_MSG_EMPTY);
        refuse(&mut c, alice(), &id, kind(&[b'a'; 1025]), ERR_MSG_TOO_LONG);
        refuse(&mut c, alice(), &id, kind(&[0xff, 0xfe]), ERR_MSG_ENCODING);
        refuse(&mut c, alice(), &id, kind(&[b'a', 0xc3]), ERR_MSG_ENCODING);
    }
    refuse(&mut c, alice(), &id, SignRequest::EvmMessage { message: "zz".into() }, ERR_HEX);
    refuse(&mut c, alice(), &id, SignRequest::SolMessage { message: "0".into() }, ERR_HEX);
    // owner and frozen guards come first, as for every kind
    refuse(&mut c, bob(), &id, evm_msg(b"hi"), ERR_NOT_OWNER);
    assert_eq!(c.satchel(id).unwrap().sig_count, 0);
}

/// A 1024-byte message costs ≈ 0.0124 NEAR of storage: 0.005 NEAR is refused (ERR_DEPOSIT, before any write survives
/// in the real runtime), `messageSignAttachDeposit(1024)` = 0.005 NEAR + 1024 × 1e19 yocto is enough, charged exactly.
#[test]
fn c7_long_message_storage_is_charged_exactly() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let long = vec![b'x'; 1024];
    ctx(alice(), 5 * MILLI, 100, vec![]);
    expect_code(ERR_DEPOSIT, || c.sign_for(id.clone(), evm_msg(&long), None));
    // the mock keeps writes made before a panic (the real runtime reverts them), so continue on a fresh token
    let id = mint_to(&mut c, alice());
    let deposit = 5 * MILLI + 1024 * 10_000_000_000_000_000_000;
    ctx(alice(), deposit, 100, vec![]);
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), sol_msg(&long), None);
    let used = (env::storage_usage() - s0) as u128;
    assert!((1024..1400).contains(&used), "record {used} B");
    assert_eq!(kept(deposit, &alice()), used * env::storage_byte_cost().as_yoctonear() + 1);
    // on_signed rewrites the big record in place
    ctx(me(), 0, 101, vec![PromiseResult::Failed]);
    let s1 = env::storage_usage();
    c.on_signed(id.clone(), 0, 1);
    assert_eq!(env::storage_usage(), s1);
}

#[test]
fn c7_messages_while_listed_are_frozen() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(alice(), 10 * MILLI, 1_000, vec![]);
    c.list(id.clone(), near_sdk::json_types::U128(1), Currency::Near);
    refuse(&mut c, alice(), &id, evm_msg(b"hi"), ERR_FROZEN);
    refuse(&mut c, alice(), &id, usdc(BASE, 0, 1), ERR_FROZEN);
}

#[test]
fn config_lists_chains_tokens_and_message_cap() {
    let c = setup();
    let v = serde_json::to_value(c.config()).unwrap();
    assert_eq!(v["evm_chain_ids"], json!([11155111, 84532, 421614, 11155420]));
    assert_eq!(
        v["erc20_tokens"],
        json!([{"chain_id":11155111,"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238"},
               {"chain_id":84532,"token":"036cbd53842c5426634e7929541ec2318f3dcf7e"},
               {"chain_id":421614,"token":"75faf114eafb1bdbe2f0316df893fd58ce46aa4d"},
               {"chain_id":11155420,"token":"5fd84259d66cd46123540766be93dfe6d43130d7"}])
    );
    assert_eq!(v["max_message_bytes"], 1024);
}
