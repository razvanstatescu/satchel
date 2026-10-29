//! near-sdk unit tests (`testing_env!`): guards, state transitions, storage charging, error codes, MPC request shape.
//! Note: the mocked chain does NOT roll back state on panic, so "a refusal changes nothing" is checked strictly here:
//! the contract must panic before its first write.

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseResult, RuntimeFeesConfig};

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use crate::errors::*;
use crate::parse::{btc, evm, sol};
use crate::types::*;
use crate::*;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("satchel.testnet")
}
fn mpc() -> AccountId {
    acc("mpc.testnet")
}
fn usdc() -> AccountId {
    acc("usdc.testnet")
}
fn alice() -> AccountId {
    acc("alice.testnet")
}
fn bob() -> AccountId {
    acc("bob.testnet")
}
fn carol() -> AccountId {
    acc("carol.testnet")
}

struct Ctx {
    predecessor: AccountId,
    deposit: u128,
    gas_tgas: u64,
    height: u64,
    results: Vec<PromiseResult>,
}

impl Ctx {
    fn new(predecessor: AccountId) -> Self {
        Ctx { predecessor, deposit: 0, gas_tgas: 300, height: 1_000, results: vec![] }
    }
    fn dep(mut self, d: u128) -> Self {
        self.deposit = d;
        self
    }
    fn gas(mut self, g: u64) -> Self {
        self.gas_tgas = g;
        self
    }
    fn at(mut self, h: u64) -> Self {
        self.height = h;
        self
    }
    fn results(mut self, r: Vec<PromiseResult>) -> Self {
        self.results = r;
        self
    }
    fn set(self) {
        let ctx = VMContextBuilder::new()
            .current_account_id(me())
            .signer_account_id(self.predecessor.clone())
            .predecessor_account_id(self.predecessor)
            .attached_deposit(NearToken::from_yoctonear(self.deposit))
            .prepaid_gas(Gas::from_tgas(self.gas_tgas))
            .block_height(self.height)
            .block_timestamp(self.height * 1_000_000_000)
            .account_balance(NearToken::from_near(100))
            .build();
        testing_env!(ctx, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), self.results);
    }
}

/// Run `f`, expect a panic whose message starts with `code`.
fn expect_err<R>(code: &str, f: impl FnOnce() -> R) {
    let r = catch_unwind(AssertUnwindSafe(f));
    let err = match r {
        Ok(_) => panic!("expected {code}, call succeeded"),
        Err(e) => e,
    };
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    // the mocked host wraps guest panics: `…GuestPanic { panic_msg: "CODE: sentence" }…`
    let msg = match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    };
    assert!(msg.starts_with(&format!("{code}: ")) || msg == code, "expected {code}, got {msg:?}");
}

fn setup_with(usdc_id: Option<AccountId>) -> Contract {
    Ctx::new(acc("team.testnet")).set();
    Contract::new(mpc(), usdc_id, "https://satchel.example/api/card/".into())
}

fn setup() -> Contract {
    setup_with(Some(usdc()))
}

fn mint_to(c: &mut Contract, owner: AccountId) -> String {
    Ctx::new(acc("team.testnet")).dep(20 * MILLI).set();
    c.nft_mint(owner).token_id
}

fn events(name: &str) -> Vec<Value> {
    get_logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|j| serde_json::from_str::<Value>(j).ok())
        .filter(|v| v["event"] == name)
        .collect()
}

fn byte_cost() -> u128 {
    env::storage_byte_cost().as_yoctonear()
}

/// Transfers created in the last call, as (receiver, yocto).
fn transfers() -> Vec<(AccountId, u128)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::Transfer { deposit, .. } => Some((rcv.clone(), deposit.as_yoctonear())),
                _ => None,
            })
        })
        .collect()
}

struct Call {
    receiver: AccountId,
    method: String,
    args: Value,
    deposit: u128,
    gas: Gas,
    weight: u64,
    deps: usize,
}

fn calls() -> Vec<Call> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            let deps = r.receipt_indices.len();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::FunctionCallWeight { method_name, args, attached_deposit, prepaid_gas, gas_weight, .. } => Some(Call {
                    receiver: rcv.clone(),
                    method: String::from_utf8(method_name).unwrap(),
                    args: serde_json::from_slice(&args).unwrap(),
                    deposit: attached_deposit.as_yoctonear(),
                    gas: prepaid_gas,
                    weight: gas_weight.0,
                    deps,
                }),
                _ => None,
            })
        })
        .collect()
}

fn evm_req() -> SignRequest {
    SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }
}
fn btc_req() -> SignRequest {
    SignRequest::Btc { preimages: vec![btc::tests::BJS_PRE0.into(), btc::tests::BJS_PRE1.into()], outputs: btc::tests::BJS_OUTPUTS.into() }
}
fn sol_req() -> SignRequest {
    SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }
}

/// alice signs `req` on token `id` at `height`, attaching 0.005 NEAR × n.
fn sign(c: &mut Contract, id: &str, req: SignRequest, height: u64) {
    let n = parse::request_count(&req) as u128;
    Ctx::new(alice()).dep(5 * MILLI * n).at(height).set();
    c.sign_for(id.into(), req, None);
}

const SECP_OK: &str = r#"{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1}"#;

// ── init / config / NFT ────────────────────────────────────────────────────────────────────────

#[test]
fn config_matches_constants() {
    let c = setup();
    let v = serde_json::to_value(c.config()).unwrap();
    assert_eq!(
        v,
        json!({"version":"1.0.0","mpc_contract_id":"mpc.testnet","usdc_contract_id":"usdc.testnet","cooldown_blocks":250,
            "evm_chain_ids":[11155111,84532,421614,11155420],
            "erc20_tokens":[{"chain_id":11155111,"token":"1c7d4b196cb0c7b01d743fbc6116a902379c7238"},{"chain_id":84532,"token":"036cbd53842c5426634e7929541ec2318f3dcf7e"},
                {"chain_id":421614,"token":"75faf114eafb1bdbe2f0316df893fd58ce46aa4d"},{"chain_id":11155420,"token":"5fd84259d66cd46123540766be93dfe6d43130d7"}],
            "max_message_bytes":1024,"max_btc_inputs":10,"mpc_sign_gas_tgas":15,"on_signed_gas_tgas":{"base":10,"per_request":2},
            "min_sign_prepaid_tgas":{"base":30,"per_request":18},"max_mpc_deposit":"10000000000000000000000",
            "storage_byte_cost": byte_cost().to_string(),"base_uri":"https://satchel.example/api/card/","next_token_id":1,"next_listing_id":1})
    );
    let m = c.nft_metadata();
    assert_eq!((m.spec.as_str(), m.name.as_str(), m.symbol.as_str()), ("nft-1.0.0", "Satchel", "SATCHEL"));
    let c2 = setup_with(None);
    assert_eq!(c2.config().usdc_contract_id, None);
}

#[test]
fn ids_sequential_no_approvals_and_mint_charges_exactly() {
    let mut c = setup();
    for i in 1..=3u64 {
        Ctx::new(acc("team.testnet")).dep(20 * MILLI).set();
        let before = env::storage_usage();
        let t = c.nft_mint(alice());
        let used = (env::storage_usage() - before) as u128;
        assert_eq!(t.token_id, i.to_string());
        assert!(t.approved_account_ids.is_none(), "NEP-178 is disabled");
        let meta = t.metadata.unwrap();
        assert_eq!(meta.title.as_deref(), Some(format!("Satchel #{i}").as_str()));
        assert_eq!(meta.media.as_deref(), Some(format!("{i}.svg").as_str()));
        // INV-18: attached − refund == Δstorage × byte cost
        let refunds = transfers();
        assert_eq!(refunds.len(), 1);
        assert_eq!(refunds[0].0, acc("team.testnet"));
        assert_eq!(20 * MILLI - refunds[0].1, used * byte_cost());
        assert_eq!(events("nft_mint").len(), 1);
    }
    assert_eq!(c.nft_total_supply().0, 3);
    assert_eq!(c.config().next_token_id, 4);
    // short deposit
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_DEPOSIT, || c.nft_mint(alice()));
}

#[test]
fn transfer_guards() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.nft_transfer(carol(), id.clone(), None, None));
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_TOKEN_NOT_FOUND, || c.nft_transfer(carol(), "99".into(), None, None));
    expect_err(ERR_BAD_RECEIVER, || c.nft_transfer(me(), id.clone(), None, None));
    expect_err(ERR_BAD_RECEIVER, || c.nft_transfer(mpc(), id.clone(), None, None));
    expect_err(ERR_TRANSFER_CALL_DISABLED, || c.nft_transfer_call(bob(), id.clone(), None, None, "".into()));
    Ctx::new(alice()).dep(2).set();
    expect_err("Requires attached deposit of exactly 1 yoctoNEAR", || c.nft_transfer(bob(), id.clone(), None, None));
    assert_eq!(c.nft_token(id.clone()).unwrap().owner_id, alice());
    Ctx::new(alice()).dep(1).set();
    c.nft_transfer(bob(), id.clone(), None, Some("gift".into()));
    assert_eq!(c.nft_token(id.clone()).unwrap().owner_id, bob());
    // listed → ERR_LISTED
    Ctx::new(bob()).dep(10 * MILLI).set();
    c.list(id.clone(), U128(5), Currency::Near);
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_LISTED, || c.nft_transfer(carol(), id.clone(), None, None));
}

// ── sign_for ───────────────────────────────────────────────────────────────────────────────────

#[test]
fn sign_for_guards_and_refusals_change_nothing() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let snapshot = |c: &Contract| (c.satchel(id.clone()).unwrap(), c.sig_records(id.clone(), 0, 50).len());
    let before = snapshot(&c);

    Ctx::new(bob()).dep(5 * MILLI).set();
    expect_err(ERR_NOT_OWNER, || c.sign_for(id.clone(), evm_req(), None));
    Ctx::new(alice()).dep(5 * MILLI).set();
    expect_err(ERR_TOKEN_NOT_FOUND, || c.sign_for("9".into(), evm_req(), None));
    // gas floor 30 + 18n (n = 1 → 48; n = 2 → 66)
    Ctx::new(alice()).dep(5 * MILLI).gas(47).set();
    expect_err(ERR_GAS, || c.sign_for(id.clone(), evm_req(), None));
    Ctx::new(alice()).dep(10 * MILLI).gas(65).set();
    expect_err(ERR_GAS, || c.sign_for(id.clone(), btc_req(), None));
    // mpc deposit bounds
    Ctx::new(alice()).dep(5 * MILLI).set();
    expect_err(ERR_MPC_DEPOSIT, || c.sign_for(id.clone(), evm_req(), Some(U128(0))));
    expect_err(ERR_MPC_DEPOSIT, || c.sign_for(id.clone(), evm_req(), Some(U128(MAX_MPC_DEPOSIT + 1))));
    // count
    expect_err(ERR_BTC_INPUT_COUNT, || c.sign_for(id.clone(), SignRequest::Btc { preimages: vec![], outputs: "".into() }, None));
    expect_err(ERR_BTC_INPUT_COUNT, || c.sign_for(id.clone(), SignRequest::Btc { preimages: vec!["00".into(); 11], outputs: "".into() }, None));
    // classifier refusals (every chain), hex
    expect_err(ERR_EVM_TYPE, || c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: "ab".repeat(32) }, None));
    expect_err(ERR_HEX, || c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: "0xzz".into() }, None));
    expect_err(ERR_BTC_PREVOUTS_INCOMPLETE, || {
        c.sign_for(id.clone(), SignRequest::Btc { preimages: vec![btc::tests::BJS_PRE0.into()], outputs: btc::tests::BJS_OUTPUTS.into() }, None)
    });
    expect_err(ERR_SOL_VERSION, || c.sign_for(id.clone(), SignRequest::Sol { message: "80".into() }, None));
    // INV-09: nothing changed, no MPC receipt, no satchel event (the mock never rolls back, so these refusals
    // provably happen before the first write)
    assert_eq!(snapshot(&c), before);
    assert!(calls().iter().all(|x| x.method != "sign"));
    assert!(events("sign_requested").is_empty());
    // zero / short deposit (function-call keys cannot attach deposits) — INV-17. This check runs after the records
    // are measured (spec §5.8 step 6); on-chain the panic reverts them (sandbox: refusals_change_nothing).
    Ctx::new(alice()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.sign_for(id.clone(), evm_req(), None));
    Ctx::new(alice()).dep(1).set();
    expect_err(ERR_DEPOSIT, || c.sign_for(id.clone(), evm_req(), None));
    assert!(events("sign_requested").is_empty(), "no event before the deposit check");
    assert!(calls().is_empty(), "no MPC call on a short deposit");
}

#[test]
fn sign_for_evm_records_charges_and_calls_mpc() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(5 * MILLI).gas(80).at(5_000).set();
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: ["0x", &evm::tests::KB31_TX.to_uppercase()].concat() }, None);
    let used = (env::storage_usage() - s0) as u128;

    // records (INV-11) + state
    let st = c.satchel(id.clone()).unwrap();
    assert_eq!((st.sig_count, st.last_sign_height, st.listable_at), (1, 5_000, 5_250));
    let recs = c.sig_records(id.clone(), 0, 50);
    assert_eq!(recs.len(), 1);
    let r = serde_json::to_value(&recs[0]).unwrap();
    assert_eq!(
        r,
        json!({"seq":0,"request_id":0,"input_index":0,"chain":"evm","height":5000,"timestamp_ms":5_000_000,"requester":"alice.testnet",
            "payload":evm::tests::KB31_HASH,"status":"pending","signature":null,
            "detail":{"evm":{"chain_id":11155111,"nonce":0,"unsigned_tx":evm::tests::KB31_TX}}})
    );

    // INV-18: attached − refund == Δstorage × cost + n × 1 yocto
    let refunds = transfers();
    assert_eq!(refunds.len(), 1);
    assert_eq!(refunds[0].0, alice());
    assert_eq!(5 * MILLI - refunds[0].1, used * byte_cost() + 1);
    assert!(used > 150 && used < 400, "record size {used} B");

    // INV-06/07: MPC request shape; callback gas
    let cs = calls();
    let sign: Vec<&Call> = cs.iter().filter(|x| x.method == "sign").collect();
    assert_eq!(sign.len(), 1);
    assert_eq!(sign[0].receiver, mpc());
    assert_eq!(
        sign[0].args,
        json!({"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":evm::tests::KB31_HASH},"domain_id":0}})
    );
    assert_eq!((sign[0].deposit, sign[0].gas, sign[0].weight), (1, Gas::from_tgas(15), 1));
    let cb: Vec<&Call> = cs.iter().filter(|x| x.method == "on_signed").collect();
    assert_eq!(cb.len(), 1);
    assert_eq!(cb[0].receiver, me());
    assert_eq!(cb[0].args, json!({"token_id":"1","first_seq":0,"n":1}));
    assert_eq!((cb[0].gas, cb[0].weight, cb[0].deposit, cb[0].deps), (Gas::from_tgas(12), 0, 0, 1));

    // INV-08: event preimage hashes to its payload, which equals the MPC payload
    let ev = events("sign_requested");
    assert_eq!(ev.len(), 1);
    let d = &ev[0]["data"];
    assert_eq!(ev[0]["standard"], "satchel");
    assert_eq!(ev[0]["version"], "1.0.0");
    assert_eq!(d["token_id"], "1");
    assert_eq!(d["owner_id"], "alice.testnet");
    assert_eq!((d["request_id"].as_u64(), d["first_seq"].as_u64(), d["count"].as_u64()), (Some(0), Some(0), Some(1)));
    assert_eq!((d["chain"].as_str(), d["path"].as_str(), d["domain_id"].as_u64(), d["height"].as_u64()), (Some("evm"), Some("satchel/1/evm"), Some(0), Some(5000)));
    assert_eq!(d["preimages"], json!([evm::tests::KB31_TX]));
    assert_eq!(d["payloads"], json!([evm::tests::KB31_HASH]));
    assert_eq!(d["btc_outputs"], Value::Null);
    assert_eq!(d["details"], json!([{"seq":0,"chain_id":11155111,"nonce":0}]));
    let pre = hex::decode(d["preimages"][0].as_str().unwrap()).unwrap();
    assert_eq!(hex::encode(env::keccak256_array(&pre)), d["payloads"][0].as_str().unwrap());
}

#[test]
fn sign_for_btc_fans_out_and_sol_uses_domain_1() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(10 * MILLI).gas(100).at(2_000).set();
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), btc_req(), Some(U128(7)));
    let used = (env::storage_usage() - s0) as u128;
    assert_eq!(10 * MILLI - transfers()[0].1, used * byte_cost() + 2 * 7, "n × mpc_deposit charged");
    let cs = calls();
    let sign: Vec<&Call> = cs.iter().filter(|x| x.method == "sign").collect();
    assert_eq!(sign.len(), 2, "one single-action receipt per input");
    for (s, h) in sign.iter().zip([btc::tests::BJS_H0, btc::tests::BJS_H1]) {
        assert_eq!(s.args, json!({"request":{"path":"satchel/1/btc","payload_v2":{"Ecdsa":h},"domain_id":0}}));
        assert_eq!((s.deposit, s.gas, s.weight), (7, Gas::from_tgas(15), 1));
    }
    let cb = cs.iter().find(|x| x.method == "on_signed").unwrap();
    assert_eq!(cb.args, json!({"token_id":"1","first_seq":0,"n":2}));
    assert_eq!(cb.gas, Gas::from_tgas(14));
    let recs = c.sig_records(id.clone(), 0, 50);
    assert_eq!(recs.len(), 2);
    let r1 = serde_json::to_value(&recs[1]).unwrap();
    assert_eq!((r1["request_id"].as_u64(), r1["input_index"].as_u64()), (Some(0), Some(1)));
    assert_eq!(r1["detail"], json!({"btc":{"txid":"22".repeat(32),"vout":0,"amount_sats":"20000"}}));
    let d = &events("sign_requested")[0]["data"];
    assert_eq!(d["btc_outputs"], btc::tests::BJS_OUTPUTS);
    assert_eq!(d["details"][0], json!({"seq":0,"txid":"11".repeat(32),"vout":1,"amount_sats":"30000"}));

    // SOL: second request on the same token continues the sequence
    Ctx::new(alice()).dep(5 * MILLI).at(2_010).set();
    c.sign_for(id.clone(), sol_req(), None);
    let cs = calls();
    let s = cs.iter().find(|x| x.method == "sign").unwrap();
    assert_eq!(s.args, json!({"request":{"path":"satchel/1/sol","payload_v2":{"Eddsa":sol::tests::W3_TRANSFER},"domain_id":1}}));
    let cb = cs.iter().find(|x| x.method == "on_signed").unwrap();
    assert_eq!(cb.args, json!({"token_id":"1","first_seq":2,"n":1}));
    let r2 = serde_json::to_value(&c.sig_records(id.clone(), 2, 1)[0]).unwrap();
    assert_eq!(r2["request_id"], 2);
    assert_eq!(r2["detail"], json!({"sol":{"recent_blockhash":"09".repeat(32),"lamports":"1000000"}}));
    assert_eq!(c.satchel(id.clone()).unwrap().sig_count, 3);
    assert_eq!(c.satchel(id).unwrap().last_sign_height, 2_010);
}

// ── on_signed ──────────────────────────────────────────────────────────────────────────────────

#[test]
fn on_signed_fills_slots_never_panics_and_grows_no_storage() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, &id, btc_req(), 100); // seq 0, 1
    sign(&mut c, &id, evm_req(), 101); // seq 2
    sign(&mut c, &id, sol_req(), 102); // seq 3
    sign(&mut c, &id, evm_req(), 103); // seq 4

    // BTC partial failure (INV-24): input 0 signed, input 1 failed
    Ctx::new(me()).results(vec![PromiseResult::Successful(SECP_OK.as_bytes().to_vec()), PromiseResult::Failed]).set();
    let s0 = env::storage_usage();
    let out = c.on_signed(id.clone(), 0, 2);
    assert_eq!(out.len(), 2);
    assert_eq!(out[0].as_ref().unwrap()["scheme"], "Secp256k1");
    assert!(out[1].is_none());
    let ev = events("sign_resolved");
    assert_eq!(ev[0]["data"], json!({"token_id":"1","first_seq":0,"count":2,"statuses":["signed","failed"]}));

    // EVM garbage → unparsed; SOL ed25519 → signed; EVM with an ed25519 reply → unparsed (scheme mismatch)
    Ctx::new(me()).results(vec![PromiseResult::Successful(b"not json".to_vec())]).set();
    assert_eq!(c.on_signed(id.clone(), 2, 1), vec![None]);
    let ed: Vec<u8> = (0..64).collect();
    let ed_json = serde_json::to_vec(&json!({"scheme":"Ed25519","signature":ed})).unwrap();
    Ctx::new(me()).results(vec![PromiseResult::Successful(ed_json.clone())]).set();
    c.on_signed(id.clone(), 3, 1);
    Ctx::new(me()).results(vec![PromiseResult::Successful(ed_json)]).set();
    c.on_signed(id.clone(), 4, 1);
    // oversized success → unparsed
    Ctx::new(me()).results(vec![PromiseResult::Successful(vec![b' '; 2000])]).set();
    c.on_signed(id.clone(), 4, 1);
    // missing records / bogus counts never panic
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    assert_eq!(c.on_signed("nope".into(), 77, 5).len(), 1);
    Ctx::new(me()).results(vec![]).set();
    assert!(c.on_signed(id.clone(), 0, 3).is_empty());
    assert_eq!(env::storage_usage(), s0, "INV-29: on_signed grows no storage");

    let recs: Vec<Value> = c.sig_records(id.clone(), 0, 50).iter().map(|r| serde_json::to_value(r).unwrap()).collect();
    assert_eq!(recs[0]["status"], "signed");
    assert_eq!(
        recs[0]["signature"],
        json!({"r":"f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c","s":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1","recovery_id":1})
    );
    assert_eq!((recs[1]["status"].as_str(), &recs[1]["signature"]), (Some("failed"), &Value::Null));
    assert_eq!(recs[2]["status"], "unparsed");
    assert_eq!(recs[3]["status"], "signed");
    assert_eq!(recs[3]["signature"], json!({"signature": hex::encode((0..64).collect::<Vec<u8>>())}));
    assert_eq!(recs[4]["status"], "unparsed", "first resolution wins; a later one never overwrites");

    // a resolved record is never rewritten
    Ctx::new(me()).results(vec![PromiseResult::Failed, PromiseResult::Failed]).set();
    c.on_signed(id.clone(), 0, 2);
    assert_eq!(serde_json::to_value(&c.sig_records(id.clone(), 0, 1)[0]).unwrap()["status"], "signed");
    // (#[private] lives in the exported wasm wrapper, so it is covered by the sandbox suite, not here)
}

// ── sale ───────────────────────────────────────────────────────────────────────────────────────

#[test]
fn quiet_period_and_freeze() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, &id, evm_req(), 10_000);
    Ctx::new(alice()).dep(10 * MILLI).at(10_249).set();
    expect_err(ERR_QUIET_PERIOD, || c.list(id.clone(), U128(ONE_NEAR), Currency::Near));
    // exactly last_sign_height + 250 succeeds; storage charged exactly (n = 0, min 1 yocto)
    Ctx::new(alice()).dep(10 * MILLI).at(10_250).set();
    let s0 = env::storage_usage();
    let lid = c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
    let used = (env::storage_usage() - s0) as u128;
    assert_eq!(lid, 1);
    assert_eq!(10 * MILLI - transfers()[0].1, used * byte_cost());
    assert_eq!(
        events("listed")[0]["data"],
        json!({"token_id":"1","listing_id":1,"seller_id":"alice.testnet","price":ONE_NEAR.to_string(),"currency":"near","listed_at":10250,"sig_count":1})
    );
    // frozen while listed
    Ctx::new(alice()).dep(5 * MILLI).at(10_251).set();
    expect_err(ERR_FROZEN, || c.sign_for(id.clone(), evm_req(), None));
    Ctx::new(alice()).dep(10 * MILLI).at(10_251).set();
    expect_err(ERR_ALREADY_LISTED, || c.list(id.clone(), U128(1), Currency::Near));
    // delist guards, then signing resumes immediately
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_NOT_OWNER, || c.delist(id.clone()));
    Ctx::new(alice()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.delist(id.clone()));
    Ctx::new(alice()).dep(1).set();
    c.delist(id.clone());
    assert_eq!(events("delisted")[0]["data"], json!({"token_id":"1","listing_id":1,"seller_id":"alice.testnet"}));
    expect_err(ERR_NOT_LISTED, || c.delist(id.clone()));
    sign(&mut c, &id, evm_req(), 10_300);
    assert_eq!(c.satchel(id.clone()).unwrap().listable_at, 10_550);
    // relist after the new quiet period gets a new listing id
    Ctx::new(alice()).dep(10 * MILLI).at(10_550).set();
    assert_eq!(c.list(id.clone(), U128(ONE_NEAR), Currency::Near), 2);
}

#[test]
fn list_guards() {
    let mut c = setup_with(None);
    let id = mint_to(&mut c, alice());
    Ctx::new(bob()).dep(10 * MILLI).set();
    expect_err(ERR_NOT_OWNER, || c.list(id.clone(), U128(1), Currency::Near));
    Ctx::new(alice()).dep(10 * MILLI).set();
    expect_err(ERR_TOKEN_NOT_FOUND, || c.list("5".into(), U128(1), Currency::Near));
    expect_err(ERR_PRICE, || c.list(id.clone(), U128(0), Currency::Near));
    expect_err(ERR_CURRENCY, || c.list(id.clone(), U128(1), Currency::Usdc)); // usdc: None
    assert!(c.satchel(id.clone()).unwrap().listing.is_none());
    // a never-signed token lists at once (deviation D1)
    Ctx::new(alice()).dep(10 * MILLI).at(3).set();
    assert_eq!(c.satchel(id.clone()).unwrap().listable_at, 0);
    c.list(id.clone(), U128(1), Currency::Near);
}

#[test]
fn list_zero_deposit_rejected() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    Ctx::new(alice()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.list(id.clone(), U128(1), Currency::Near));
    assert!(events("listed").is_empty());
}

fn listed(c: &mut Contract, currency: Currency, price: u128) -> (String, u64) {
    let id = mint_to(c, alice());
    sign(c, &id, evm_req(), 100);
    Ctx::new(alice()).dep(10 * MILLI).at(400).set();
    let lid = c.list(id.clone(), U128(price), currency);
    (id, lid)
}

#[test]
fn buy_guards_then_buy_right_after_list() {
    let mut c = setup();
    let price = 3 * ONE_NEAR;
    let (id, lid) = listed(&mut c, Currency::Near, price);
    let before = (c.satchel(id.clone()).unwrap(), c.listings(0, 50));
    Ctx::new(carol()).dep(price).at(400).set();
    expect_err(ERR_LISTING_CHANGED, || c.buy(id.clone(), lid + 1, 1));
    expect_err(ERR_LISTING_CHANGED, || c.buy(id.clone(), lid, 0));
    expect_err(ERR_TOKEN_NOT_FOUND, || c.buy("42".into(), lid, 1));
    Ctx::new(carol()).dep(price - 1).at(400).set();
    expect_err(ERR_WRONG_AMOUNT, || c.buy(id.clone(), lid, 1));
    Ctx::new(carol()).dep(price + 1).at(400).set();
    expect_err(ERR_WRONG_AMOUNT, || c.buy(id.clone(), lid, 1));
    Ctx::new(alice()).dep(price).at(400).set();
    expect_err(ERR_SELF_BUY, || c.buy(id.clone(), lid, 1));
    assert_eq!((c.satchel(id.clone()).unwrap(), c.listings(0, 50)), before, "failed buys change nothing");

    // INV-14/15: buyable in the same block as the listing, no cooldown
    Ctx::new(carol()).dep(price).at(400).set();
    c.buy(id.clone(), lid, 1);
    let s = c.satchel(id.clone()).unwrap();
    assert_eq!(s.owner_id, carol());
    assert!(s.listing.is_none());
    assert_eq!(s.sig_count, 1, "records survive the sale");
    assert!(c.listings(0, 50).is_empty());
    assert_eq!(c.sig_records(id.clone(), 0, 50).len(), 1);
    assert_eq!(transfers(), vec![(alice(), price)], "detached payout of exactly the price");
    let cb = calls();
    assert_eq!(cb.len(), 1);
    assert_eq!((cb[0].method.as_str(), cb[0].gas, cb[0].deps), ("on_payout", Gas::from_tgas(ON_PAYOUT_GAS_TGAS), 1));
    assert_eq!(cb[0].args, json!({"account_id":"alice.testnet","currency":"near","amount":price.to_string()}));
    assert_eq!(
        events("sold")[0]["data"],
        json!({"token_id":"1","listing_id":lid,"seller_id":"alice.testnet","buyer_id":"carol.testnet","price":price.to_string(),"currency":"near"})
    );
    assert!(get_logs().iter().any(|l| l.contains("\"nft_transfer\"") && l.contains("\"memo\":\"sale\"")));
    // INV-02: control moved
    Ctx::new(alice()).dep(5 * MILLI).set();
    expect_err(ERR_NOT_OWNER, || c.sign_for(id.clone(), evm_req(), None));
    Ctx::new(carol()).dep(5 * MILLI).set();
    c.sign_for(id.clone(), evm_req(), None);
    assert_eq!(c.satchel(id.clone()).unwrap().sig_count, 2);
    // sold → not listed
    Ctx::new(bob()).dep(price).set();
    expect_err(ERR_NOT_LISTED, || c.buy(id, lid, 1));
}

#[test]
fn buy_currency_mismatch_and_old_listing_id() {
    let mut c = setup();
    let (id, lid) = listed(&mut c, Currency::Usdc, 5_000_000);
    Ctx::new(carol()).dep(5_000_000).set();
    expect_err(ERR_CURRENCY, || c.buy(id.clone(), lid, 1));
    // delist + relist: the old listing id fails
    Ctx::new(alice()).dep(1).set();
    c.delist(id.clone());
    Ctx::new(alice()).dep(10 * MILLI).at(500).set();
    let lid2 = c.list(id.clone(), U128(7), Currency::Near);
    Ctx::new(carol()).dep(7).set();
    expect_err(ERR_LISTING_CHANGED, || c.buy(id.clone(), lid, 1));
    c.buy(id, lid2, 1);
}

#[test]
fn ft_on_transfer_guards_and_happy_path() {
    let mut c = setup();
    let price = 5_000_000u128;
    let (id, lid) = listed(&mut c, Currency::Usdc, price);
    let msg = |l: u64, n: u64| format!(r#"{{"buy":{{"token_id":"{id}","listing_id":{l},"expected_sig_count":{n}}}}}"#);
    // direct-call attack: predecessor is not the USDC contract
    Ctx::new(carol()).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(carol(), U128(price), msg(lid, 1)));
    Ctx::new(acc("fake-usdc.testnet")).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(carol(), U128(price), msg(lid, 1)));
    Ctx::new(usdc()).set();
    expect_err(ERR_BAD_MSG, || c.ft_on_transfer(carol(), U128(price), "".into()));
    expect_err(ERR_BAD_MSG, || c.ft_on_transfer(carol(), U128(price), r#"{"token_id":"1","listing_id":1,"expected_sig_count":1}"#.into()));
    expect_err(ERR_LISTING_CHANGED, || c.ft_on_transfer(carol(), U128(price), msg(lid, 2)));
    expect_err(ERR_WRONG_AMOUNT, || c.ft_on_transfer(carol(), U128(price - 1), msg(lid, 1)));
    expect_err(ERR_SELF_BUY, || c.ft_on_transfer(alice(), U128(price), msg(lid, 1)));
    assert!(c.satchel(id.clone()).unwrap().listing.is_some());
    // success: "0" unused, payout = ft_transfer(1 yocto, 15 Tgas) → on_payout
    let r = c.ft_on_transfer(carol(), U128(price), msg(lid, 1));
    assert!(matches!(r, PromiseOrValue::Value(U128(0))));
    assert_eq!(c.nft_token(id.clone()).unwrap().owner_id, carol());
    let cs = calls();
    let ft = cs.iter().find(|x| x.method == "ft_transfer").unwrap();
    assert_eq!(ft.receiver, usdc());
    assert_eq!(ft.args, json!({"receiver_id":"alice.testnet","amount":"5000000","memo":"satchel sale"}));
    assert_eq!((ft.deposit, ft.gas, ft.weight), (1, Gas::from_tgas(15), 0));
    let cb = cs.iter().find(|x| x.method == "on_payout").unwrap();
    assert_eq!(cb.args, json!({"account_id":"alice.testnet","currency":"usdc","amount":"5000000"}));

}

#[test]
fn ft_on_transfer_near_listing_refunds() {
    let price = 5_000_000u128;
    let mut c = setup();
    let (id, lid) = listed(&mut c, Currency::Near, price);
    Ctx::new(usdc()).set();
    expect_err(ERR_CURRENCY, || {
        c.ft_on_transfer(carol(), U128(price), format!(r#"{{"buy":{{"token_id":"{id}","listing_id":{lid},"expected_sig_count":1}}}}"#))
    });
}

#[test]
fn ft_on_transfer_without_usdc() {
    let mut c = setup_with(None);
    Ctx::new(usdc()).set();
    expect_err(ERR_WRONG_TOKEN, || c.ft_on_transfer(carol(), U128(1), "{}".into()));
}

#[test]
fn payout_failure_recredit_and_withdraw() {
    let mut c = setup();
    // success → no credit
    Ctx::new(me()).results(vec![PromiseResult::Successful(vec![])]).set();
    c.on_payout(alice(), Currency::Near, U128(10));
    assert!(c.proceeds_of(alice()).is_empty());
    assert_eq!(events("payout")[0]["data"], json!({"account_id":"alice.testnet","currency":"near","amount":"10","ok":true}));
    // failure → credit, accumulates, saturates (never panics)
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    c.on_payout(alice(), Currency::Usdc, U128(5));
    c.on_payout(alice(), Currency::Usdc, U128(7));
    c.on_payout(alice(), Currency::Near, U128(u128::MAX));
    c.on_payout(alice(), Currency::Near, U128(9));
    assert_eq!(events("payout").last().unwrap()["data"]["ok"], false);
    let p = serde_json::to_value(c.proceeds_of(alice())).unwrap();
    assert_eq!(p, json!([{"currency":"near","amount":u128::MAX.to_string()},{"currency":"usdc","amount":"12"}]));
    // withdraw
    Ctx::new(alice()).dep(0).set();
    expect_err(ERR_DEPOSIT, || c.withdraw_proceeds(Currency::Usdc));
    Ctx::new(bob()).dep(1).set();
    expect_err(ERR_NOTHING_OWED, || c.withdraw_proceeds(Currency::Usdc));
    Ctx::new(alice()).dep(1).set();
    c.withdraw_proceeds(Currency::Usdc);
    let cs = calls();
    let ft = cs.iter().find(|x| x.method == "ft_transfer").unwrap();
    assert_eq!(ft.args, json!({"receiver_id":"alice.testnet","amount":"12","memo":"satchel sale"}));
    assert!(cs.iter().any(|x| x.method == "on_payout"));
    assert_eq!(serde_json::to_value(c.proceeds_of(alice())).unwrap(), json!([{"currency":"near","amount":u128::MAX.to_string()}]));
    expect_err(ERR_NOTHING_OWED, || c.withdraw_proceeds(Currency::Usdc));
    // NEAR withdraw = a plain transfer, then on_payout
    Ctx::new(me()).results(vec![PromiseResult::Failed]).set();
    c.on_payout(bob(), Currency::Near, U128(42));
    Ctx::new(bob()).dep(1).set();
    c.withdraw_proceeds(Currency::Near);
    assert_eq!(transfers(), vec![(bob(), 42)]);
    assert!(c.proceeds_of(bob()).is_empty());
}

// ── views ──────────────────────────────────────────────────────────────────────────────────────

#[test]
fn views_shapes_and_paging() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    assert!(c.satchel("2".into()).is_none());
    assert_eq!(c.derived_path(id.clone(), Chain::Sol), "satchel/1/sol");
    let v = serde_json::to_value(c.satchel(id.clone()).unwrap()).unwrap();
    assert_eq!(
        v,
        json!({"token_id":"1","owner_id":"alice.testnet","sig_count":0,"last_sign_height":0,"listable_at":0,"listing":null,
            "paths":{"btc":"satchel/1/btc","evm":"satchel/1/evm","sol":"satchel/1/sol"}})
    );
    for h in 0..3 {
        sign(&mut c, &id, btc_req(), 10 + h); // 6 records
    }
    assert_eq!(c.sig_records(id.clone(), 0, 4).len(), 4);
    assert_eq!(c.sig_records(id.clone(), 4, 50).iter().map(|r| r.seq).collect::<Vec<_>>(), vec![4, 5]);
    assert!(c.sig_records(id.clone(), 6, 50).is_empty());
    assert!(c.sig_records("9".into(), 0, 50).is_empty());
    for _ in 0..60 {
        let t = mint_to(&mut c, bob());
        Ctx::new(bob()).dep(10 * MILLI).set();
        c.list(t, U128(1), Currency::Near);
    }
    assert_eq!(c.listings(0, 100).len(), 50, "limit capped at 50");
    assert_eq!(c.listings(50, 50).len(), 10);
    let l = serde_json::to_value(&c.listings(0, 1)[0]).unwrap();
    assert_eq!(l, json!({"token_id":"2","listing":{"id":1,"seller":"bob.testnet","price":"1","currency":"near","listed_at":1000,"sig_count":0}}));
    assert_eq!(c.config().next_listing_id, 61);
}

#[test]
fn transfer_keeps_history_and_inflight_resolution() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, &id, evm_req(), 50);
    // INV-28: transfer during an in-flight sign is allowed; on_signed still resolves the record
    Ctx::new(alice()).dep(1).at(51).set();
    c.nft_transfer(bob(), id.clone(), None, None);
    let s = c.satchel(id.clone()).unwrap();
    assert_eq!((s.owner_id, s.sig_count, s.last_sign_height), (bob(), 1, 50));
    Ctx::new(me()).results(vec![PromiseResult::Successful(SECP_OK.as_bytes().to_vec())]).set();
    c.on_signed(id.clone(), 0, 1);
    let r = &c.sig_records(id.clone(), 0, 1)[0];
    assert_eq!((r.status, r.requester.clone()), (SigStatus::Signed, alice()), "history belongs to the token");
    // the quiet period follows the token: bob cannot list before 50 + 250
    Ctx::new(bob()).dep(10 * MILLI).at(299).set();
    expect_err(ERR_QUIET_PERIOD, || c.list(id.clone(), U128(1), Currency::Near));
    Ctx::new(alice()).dep(5 * MILLI).set();
    expect_err(ERR_NOT_OWNER, || c.sign_for(id, evm_req(), None));
}
