//! Adversarial review tests (docs/security/contract-review.md).
//!
//! Three kinds of test live here:
//! - **Guards** (run by default): attack attempts the review tried that the contract correctly refuses. They pin the
//!   current safe behaviour so a later change cannot silently reopen the hole.
//! - **Proofs** (`s0x_*`): each asserts the behaviour the review recommended. They were `#[ignore]`d and failed until
//!   the fix pass (2026-10-23); they now run by default and pass.
//! - **Fix tests** (`fix_*`, at the end): pin the exact behaviour of each fix.
//!
//! Like `tests.rs`, the mocked chain does not roll state back on panic; every case uses a fresh contract.

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::serde_json;
use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseResult, RuntimeFeesConfig};

use crate::errors::*;
use crate::parse::evm::tests::{base as evm_base, build as evm_build, enc_list, enc_str, int};
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

/// `Some(panic message)` if `f` panicked, `None` if it returned.
fn panics<R>(f: impl FnOnce() -> R) -> Option<String> {
    let err = catch_unwind(AssertUnwindSafe(f)).err()?;
    let raw = err
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    Some(match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    })
}

fn expect_code<R>(code: &str, f: impl FnOnce() -> R) {
    match panics(f) {
        None => panic!("expected {code}, call succeeded"),
        Some(m) => assert!(m.starts_with(&format!("{code}: ")), "expected {code}, got {m:?}"),
    }
}

fn setup() -> Contract {
    ctx(acc("team.testnet"), 0, 1, vec![]);
    Contract::new(mpc(), Some(usdc()), "https://satchel.example/api/card/".into())
}

fn mint_to(c: &mut Contract, owner: AccountId) -> String {
    ctx(acc("team.testnet"), 20 * MILLI, 1, vec![]);
    c.nft_mint(owner).token_id
}

fn evm_hex(tx: &[u8]) -> SignRequest {
    SignRequest::Evm { unsigned_tx: hex::encode(tx) }
}

fn sign(c: &mut Contract, who: AccountId, id: &str, req: SignRequest, height: u64) {
    let n = parse::request_count(&req) as u128;
    ctx(who, 5 * MILLI * n, height, vec![]);
    c.sign_for(id.into(), req, None);
}

/// (receiver, method) of every FunctionCall created in the current context, plus Transfers as (receiver, "<transfer>").
fn created() -> Vec<(AccountId, String, u128)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let rcv = r.receiver_id.clone();
            r.actions.into_iter().filter_map(move |a| match a {
                MockAction::FunctionCallWeight { method_name, attached_deposit, .. } => {
                    Some((rcv.clone(), String::from_utf8(method_name).unwrap(), attached_deposit.as_yoctonear()))
                }
                MockAction::Transfer { deposit, .. } => Some((rcv.clone(), "<transfer>".to_string(), deposit.as_yoctonear())),
                _ => None,
            })
        })
        .collect()
}

// ── 1. blind-signing guards ───────────────────────────────────────────────────────────────────

/// RLP / typed-tx tricks the review tried. Each must be refused (and with the structure code before any policy code).
#[test]
fn guard_evm_rlp_and_typed_tx_tricks() {
    let ok = evm_build(&evm_base());
    assert!(evm::classify(&ok).is_ok());
    let body = ok[1..].to_vec();
    let mut cases: Vec<(&str, Vec<u8>, &str)> = vec![];
    // `to` written in the long string form (0xb8 0x14 …) instead of 0x94 …
    let mut f = evm_base();
    f.to = [vec![0xb8, 20], vec![0x11; 20]].concat();
    cases.push(("long-form to", evm_build(&f), ERR_EVM_RLP));
    // the outer list in long form although its payload is < 56 bytes
    {
        let payload = &body[1..];
        assert!(payload.len() < 56);
        let mut t = vec![0x02, 0xf8, payload.len() as u8];
        t.extend_from_slice(payload);
        cases.push(("long-form short list", t, ERR_EVM_RLP));
    }
    // chain id with a leading zero byte (00 aa 36 a7): same number, non-canonical
    let mut f = evm_base();
    f.chain = enc_str(&[0x00, 0xaa, 0x36, 0xa7]);
    cases.push(("chain id leading zero", evm_build(&f), ERR_EVM_RLP));
    // chain id as an 8-byte zero-padded integer
    let mut f = evm_base();
    f.chain = enc_str(&[0, 0, 0, 0, 0, 0xaa, 0x36, 0xa7]);
    cases.push(("chain id padded", evm_build(&f), ERR_EVM_RLP));
    // value zero encoded as 0x00 instead of 0x80
    let mut f = evm_base();
    f.value = vec![0x00];
    cases.push(("zero value as 0x00", evm_build(&f), ERR_EVM_RLP));
    // data hidden in a nested list, access list as a string, a 10th field
    let mut f = evm_base();
    f.data = enc_list(&[enc_str(&[0x09, 0x5e, 0xa7, 0xb3])]);
    cases.push(("calldata in a list", evm_build(&f), ERR_EVM_RLP));
    {
        let mut t = vec![0x02];
        let f = evm_base();
        t.extend(enc_list(&[f.chain, f.nonce, f.tip, f.fee, f.gas, f.to, f.value, f.data, f.al, int(0)]));
        cases.push(("10 fields (type-4-like auth list)", t, ERR_EVM_RLP));
    }
    // two lists back to back; the list wrapped in a byte string; the list length overrunning by one
    cases.push(("two lists", [ok.clone(), body.clone()].concat(), ERR_EVM_RLP));
    {
        let mut t = vec![0x02];
        t.extend(enc_str(&body));
        cases.push(("list inside a string", t, ERR_EVM_RLP));
    }
    {
        let mut t = ok.clone();
        t[1] += 1; // short list header claims one more byte than exists
        cases.push(("list overruns buffer", t, ERR_EVM_RLP));
    }
    // a type-2 payload whose first byte is 0x02 but is really an EIP-191 / raw-hash blob
    cases.push(("0x02 + 31 bytes of hash", [vec![0x02], vec![0xab; 31]].concat(), ERR_EVM_RLP));
    // EIP-2930 (type 1) / EIP-4844 (type 3) / EIP-7702 (type 4) bodies with the type byte rewritten stay refused by RLP shape
    for (name, ty) in [("type 0x01", 0x01u8), ("type 0x03", 0x03), ("type 0x04", 0x04), ("type 0xc0 (legacy list)", 0xc0)] {
        let mut t = ok.clone();
        t[0] = ty;
        cases.push((name, t, ERR_EVM_TYPE));
    }
    for (name, tx, code) in cases {
        assert_eq!(evm::classify(&tx), Err(code), "{name}");
    }
}

/// BTC preimage fields that disagree with each other or with the outputs.
#[test]
fn guard_btc_preimage_inconsistencies() {
    use btc::tests::{output, preimage, preimages, sample_tx};
    let check = |name: &str, pre: Vec<Vec<u8>>, outs: &[u8], code: &str| {
        assert_eq!(btc::classify(&pre, outs), Err(code), "{name}");
    };
    // only 2 of a 3-input transaction's preimages (an input the log would not show)
    let t3 = sample_tx(3);
    check("2 of 3 inputs", vec![preimage(&t3, 0), preimage(&t3, 1)], &t3.outputs, ERR_BTC_PREVOUTS_INCOMPLETE);
    check("3 of 3, input 2 twice", vec![preimage(&t3, 0), preimage(&t3, 2), preimage(&t3, 2)], &t3.outputs, ERR_BTC_DUPLICATE_INPUT);
    // same outpoint twice inside one tx with different claimed amounts (a duplicated input with a fake amount)
    let mut t = sample_tx(2);
    t.inputs[1].txid_le = t.inputs[0].txid_le;
    t.inputs[1].vout = t.inputs[0].vout;
    check("duplicate outpoint, other amount", preimages(&t), &t.outputs, ERR_BTC_DUPLICATE_INPUT);
    // the per-input nSequence disagrees with the committed hashSequence
    let mut t = sample_tx(2);
    t.inputs[1].sequence = 0xffff_ffff;
    let mut p = preimages(&t);
    p[1][138..142].copy_from_slice(&0xffff_fffdu32.to_le_bytes());
    check("nSequence vs hashSequence", p, &t.outputs, ERR_BTC_SEQUENCES_MISMATCH);
    // hashOutputs commits to other outputs than the blob shown (a redirected payment)
    let t2 = sample_tx(2);
    let mut other = t2.outputs.clone();
    other[0] ^= 1; // 1 sat more to the first output
    check("outputs redirected", preimages(&t2), &other, ERR_BTC_OUTPUTS_MISMATCH);
    // sighash variants that only differ in the upper bytes, and the BCH FORKID bit
    for (name, sh) in [("ALL|0x80000000", 0x8000_0001u32), ("ALL|0x100", 0x0000_0101), ("ALL|FORKID", 0x41), ("0xffffffff", u32::MAX)] {
        let mut t = sample_tx(1);
        t.sighash = sh;
        check(name, preimages(&t), &t.outputs, ERR_BTC_SIGHASH);
    }
    // P2SH-style scriptCode (17 a9 14 … 87)
    let mut p = preimages(&sample_tx(1));
    p[0][104..108].copy_from_slice(&[0x17, 0xa9, 0x14, 0x00]);
    check("P2SH scriptCode", p, &sample_tx(1).outputs, ERR_BTC_SCRIPTCODE);
    // outputs with a 0xfe / 0xff CompactSize, a zero-output blob, and a value-only stub
    let t1 = sample_tx(1);
    for (name, o) in [
        ("0xfe varint", [1u64.to_le_bytes().to_vec(), vec![0xfe, 1, 0, 0, 0, 0x51]].concat()),
        ("0xff varint", [1u64.to_le_bytes().to_vec(), vec![0xff, 1, 0, 0, 0, 0, 0, 0, 0, 0x51]].concat()),
        ("value only", 1u64.to_le_bytes().to_vec()),
    ] {
        check(name, preimages(&t1), &o, ERR_BTC_OUTPUTS_MALFORMED);
    }
    // a well-formed request for another, unrelated tx's outputs
    check("foreign outputs", preimages(&t1), &output(1, &[0x51]), ERR_BTC_OUTPUTS_MISMATCH);
}

/// The input-count limit is enforced before any hex is decoded, and at the `sign_for` level too.
#[test]
fn guard_btc_input_count_before_hex() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let req = SignRequest::Btc { preimages: vec!["zz".into(); 11], outputs: "zz".into() };
    ctx(alice(), ONE_NEAR, 10, vec![]);
    expect_code(ERR_BTC_INPUT_COUNT, || c.sign_for(id.clone(), req, None));
    assert_eq!(c.satchel(id).unwrap().sig_count, 0);
}

/// A tiny legacy-message builder for the SOL cases.
fn sol_msg(header: [u8; 3], keys: &[[u8; 32]], ixs: &[(u8, Vec<u8>, Vec<u8>)]) -> Vec<u8> {
    let cu16 = |mut n: usize| {
        let mut v = vec![];
        loop {
            let mut b = (n & 0x7f) as u8;
            n >>= 7;
            if n != 0 {
                b |= 0x80;
            }
            v.push(b);
            if n == 0 {
                return v;
            }
        }
    };
    let mut m = header.to_vec();
    m.extend(cu16(keys.len()));
    for k in keys {
        m.extend_from_slice(k);
    }
    m.extend_from_slice(&[9u8; 32]);
    m.extend(cu16(ixs.len()));
    for (prog, accts, data) in ixs {
        m.push(*prog);
        m.extend(cu16(accts.len()));
        m.extend_from_slice(accts);
        m.extend(cu16(data.len()));
        m.extend_from_slice(data);
    }
    m
}

#[test]
fn guard_sol_message_tricks() {
    let from = [0xaa; 32];
    let to = [0xbb; 32];
    let sys = [0u8; 32];
    let xfer = |l: u64| [vec![2, 0, 0, 0], l.to_le_bytes().to_vec()].concat();
    let ok = sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1], xfer(5))]);
    assert!(sol::classify(&ok).is_ok());
    let nonce = |extra: &[u8]| [vec![4, 0, 0, 0], extra.to_vec()].concat();
    let cases: Vec<(&str, Vec<u8>, &str)> = vec![
        // durable nonce anywhere, including with extra data bytes (the runtime matches on a 4-byte prefix)
        ("nonce first", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![1, 0], nonce(&[])), (2, vec![0, 1], xfer(5))]), ERR_SOL_DURABLE_NONCE),
        ("nonce last + data", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1], xfer(5)), (2, vec![1, 0], nonce(&[7, 7]))]), ERR_SOL_DURABLE_NONCE),
        // a second all-zero key (System listed twice) used as the nonce program
        ("nonce via duplicate system key", sol_msg([1, 0, 2], &[from, to, sys, sys], &[(3, vec![1, 0], nonce(&[])), (2, vec![0, 1], xfer(5))]), ERR_SOL_DURABLE_NONCE),
        // instruction-count and shape rules
        ("no instruction", sol_msg([1, 0, 1], &[from, to, sys], &[]), ERR_SOL_INSTRUCTION),
        ("3 accounts", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1, 2], xfer(5))]), ERR_SOL_INSTRUCTION),
        ("13-byte data", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1], [xfer(5), vec![0]].concat())]), ERR_SOL_INSTRUCTION),
        ("transfer with seed (ix 11)", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1], [vec![11, 0, 0, 0], vec![0; 8]].concat())]), ERR_SOL_INSTRUCTION),
        ("assign (ix 1) 12 bytes", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 1], [vec![1, 0, 0, 0], vec![0; 8]].concat())]), ERR_SOL_INSTRUCTION),
        ("non-system program", sol_msg([1, 0, 1], &[from, to, sys], &[(1, vec![0, 1], xfer(5))]), ERR_SOL_INSTRUCTION),
        ("from a non-signer", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![1, 0], xfer(5))]), ERR_SOL_INSTRUCTION),
        // bounds
        ("account index out of range", sol_msg([1, 0, 1], &[from, to, sys], &[(2, vec![0, 3], xfer(5))]), ERR_SOL_MALFORMED),
        ("program index out of range", sol_msg([1, 0, 1], &[from, to, sys], &[(3, vec![0, 1], xfer(5))]), ERR_SOL_MALFORMED),
        ("one key", sol_msg([1, 0, 0], &[from], &[(0, vec![0, 0], xfer(5))]), ERR_SOL_MALFORMED),
        ("17 keys", sol_msg([1, 0, 1], &[[1u8; 32]; 17], &[(2, vec![0, 1], xfer(5))]), ERR_SOL_MALFORMED),
        ("readonly overflow", sol_msg([1, 0, 3], &[from, to, sys], &[(2, vec![0, 1], xfer(5))]), ERR_SOL_MALFORMED),
        // header
        ("2 signers", sol_msg([2, 0, 1], &[from, to, sys], &[(2, vec![0, 1], xfer(5))]), ERR_SOL_HEADER),
        ("0 signers", sol_msg([0, 0, 1], &[from, to, sys], &[(2, vec![0, 1], xfer(5))]), ERR_SOL_HEADER),
        // versioned (v0, address lookup tables) and off-chain
        ("v0", [vec![0x80], ok.clone(), vec![0]].concat(), ERR_SOL_VERSION),
        ("v0 with ALT", [vec![0x80], ok.clone(), vec![1], vec![0x33; 32], vec![1, 1, 0]].concat(), ERR_SOL_VERSION),
        // trailing byte, truncated
        ("trailing", [ok.clone(), vec![0]].concat(), ERR_SOL_MALFORMED),
        ("truncated", ok[..ok.len() - 1].to_vec(), ERR_SOL_MALFORMED),
    ];
    for (name, m, code) in cases {
        assert_eq!(sol::classify(&m), Err(code), "{name}");
    }
    // compact-u16 edge cases for the data length: non-canonical 2-byte, overlong 3-byte, high bit in byte 3
    let ix_len_at = ok.len() - 13; // compact-u16 of the 12-byte data
    assert_eq!(ok[ix_len_at], 12);
    for (name, enc) in [("8c 00", vec![0x8c, 0x00]), ("8c 80 00", vec![0x8c, 0x80, 0x00]), ("ff ff 83", vec![0xff, 0xff, 0x83]), ("80 80 80", vec![0x80, 0x80, 0x80])] {
        let m = [ok[..ix_len_at].to_vec(), enc, ok[ix_len_at + 1..].to_vec()].concat();
        assert_eq!(sol::classify(&m), Err(ERR_SOL_MALFORMED), "{name}");
    }
}

#[test]
fn guard_hex_quirks() {
    for bad in ["0x0x00", "0xx0", "éé", "0x\u{0660}\u{0660}", "0x00\n", "\u{feff}00", "-1"] {
        assert_eq!(parse::hex::decode(bad), Err(ERR_HEX), "{bad:?}");
    }
}

// ── 2. clean-history guards ───────────────────────────────────────────────────────────────────

/// The only promises to the MPC are created by `sign_for`; no other mutating method can make the contract sign.
#[test]
fn guard_mpc_is_only_called_by_sign_for() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let id2 = mint_to(&mut c, alice());
    let no_mpc = |what: &str| assert!(created().iter().all(|(r, _, _)| *r != mpc()), "{what} called the MPC");
    ctx(alice(), 10 * MILLI, 10, vec![]);
    let lid = c.list(id.clone(), U128(100), Currency::Near);
    no_mpc("list");
    ctx(bob(), 100, 11, vec![]);
    c.buy(id.clone(), lid, 0);
    no_mpc("buy");
    ctx(alice(), 10 * MILLI, 12, vec![]);
    let lid2 = c.list(id2.clone(), U128(7), Currency::Usdc);
    no_mpc("list usdc");
    ctx(usdc(), 0, 13, vec![]);
    let msg = serde_json::json!({"buy":{"token_id": id2, "listing_id": lid2, "expected_sig_count": 0}}).to_string();
    let _ = c.ft_on_transfer(carol(), U128(7), msg);
    no_mpc("ft_on_transfer");
    ctx(me(), 0, 14, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(5));
    no_mpc("on_payout");
    ctx(alice(), 1, 15, vec![]);
    c.withdraw_proceeds(Currency::Near);
    no_mpc("withdraw_proceeds");
    ctx(bob(), 1, 16, vec![]);
    c.nft_transfer(alice(), id.clone(), None, None);
    no_mpc("nft_transfer");
    ctx(me(), 0, 17, vec![PromiseResult::Successful(b"{}".to_vec())]);
    let _ = c.on_signed(id.clone(), 0, 1);
    no_mpc("on_signed");
}

/// Sequence numbers are per token and never reused across owners; a callback reads at most `n` results, so it can
/// never resolve a neighbouring request's record.
#[test]
fn guard_records_append_only_across_owners_and_callbacks_scoped() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, alice(), &id, SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, 100); // seq 0
    ctx(alice(), 1, 101, vec![]);
    c.nft_transfer(bob(), id.clone(), None, None);
    let mut f = evm_base();
    f.nonce = int(1);
    sign(&mut c, bob(), &id, evm_hex(&evm_build(&f)), 102); // seq 1 (nonce 1: within the nonce-gap rule)
    let recs = c.sig_records(id.clone(), 0, 50);
    assert_eq!(recs.iter().map(|r| (r.seq, r.requester.clone())).collect::<Vec<_>>(), vec![(0, alice()), (1, bob())]);
    // on_signed for request 0 with an extra (forged-looking) result: only seq 0 changes
    let ed = serde_json::to_vec(&serde_json::json!({"scheme":"Ed25519","signature":(0..64).collect::<Vec<u8>>()})).unwrap();
    ctx(me(), 0, 103, vec![PromiseResult::Failed, PromiseResult::Successful(ed)]);
    let out = c.on_signed(id.clone(), 0, 1);
    assert_eq!(out.len(), 1);
    let recs = c.sig_records(id.clone(), 0, 50);
    assert_eq!((recs[0].status, recs[1].status), (SigStatus::Failed, SigStatus::Pending));
    // safety fields of seq 0 survived the transfer and the callback
    assert_eq!(recs[0].detail, SigDetailView::Evm { chain_id: 11_155_111, nonce: 0, unsigned_tx: evm::tests::KB31_TX.into(), erc20: None });
}

// ── 3. ownership, quiet period (deviation D1), sale binding ─────────────────────────────────

/// The quiet period belongs to the token: a transfer does not reset it, delist → sign → relist restarts it, and a
/// token that was listable while never-signed (D1) falls under the quiet period after its first sign.
#[test]
fn guard_quiet_period_follows_token_not_owner() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    // D1: never signed → listable at once …
    assert_eq!(c.satchel(id.clone()).unwrap().listable_at, 0);
    ctx(alice(), 10 * MILLI, 50, vec![]);
    c.list(id.clone(), U128(1), Currency::Near);
    ctx(alice(), 1, 51, vec![]);
    c.delist(id.clone());
    // … but after the first sign the quiet period applies, also for the next owner
    sign(&mut c, alice(), &id, SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, 1_000);
    ctx(alice(), 1, 1_001, vec![]);
    c.nft_transfer(bob(), id.clone(), None, None);
    ctx(bob(), 10 * MILLI, 1_000 + COOLDOWN_BLOCKS - 1, vec![]);
    expect_code(ERR_QUIET_PERIOD, || c.list(id.clone(), U128(1), Currency::Near));
    ctx(bob(), 10 * MILLI, 1_000 + COOLDOWN_BLOCKS, vec![]); // the refusal above panicked before any write
    let lid = c.list(id.clone(), U128(1), Currency::Near);
    assert!(lid > 0);
}

/// A listing id cannot be replayed against another token, nor survive delist + relist, and `expected_sig_count` binds.
#[test]
fn guard_buy_binding() {
    let mut c = setup();
    let a = mint_to(&mut c, alice());
    let b = mint_to(&mut c, alice());
    ctx(alice(), 10 * MILLI, 10, vec![]);
    let la = c.list(a.clone(), U128(100), Currency::Near);
    ctx(alice(), 10 * MILLI, 11, vec![]);
    let lb = c.list(b.clone(), U128(100), Currency::Near);
    ctx(bob(), 100, 12, vec![]);
    expect_code(ERR_LISTING_CHANGED, || c.buy(a.clone(), lb, 0));
    ctx(bob(), 100, 12, vec![]);
    expect_code(ERR_LISTING_CHANGED, || c.buy(a.clone(), la, 1));
    ctx(alice(), 1, 13, vec![]);
    c.delist(a.clone());
    ctx(alice(), 10 * MILLI, 14, vec![]);
    let la2 = c.list(a.clone(), U128(100), Currency::Near);
    assert_ne!(la, la2);
    ctx(bob(), 100, 15, vec![]);
    expect_code(ERR_LISTING_CHANGED, || c.buy(a.clone(), la, 0));
}

// ── 4. money ──────────────────────────────────────────────────────────────────────────────────

/// on_payout only re-credits on Failed; a concurrent withdraw + failed payout never loses or doubles a credit.
#[test]
fn guard_payout_recredit_accounting() {
    let mut c = setup();
    ctx(me(), 0, 1, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(10));
    ctx(alice(), 1, 2, vec![]);
    c.withdraw_proceeds(Currency::Near); // entry removed, payout P1 (10) in flight
    ctx(me(), 0, 3, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(4)); // another sale's payout fails meanwhile
    ctx(me(), 0, 4, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(10)); // P1 fails too
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 14);
    ctx(me(), 0, 5, vec![PromiseResult::Successful(b"\"ignored\"".to_vec())]);
    c.on_payout(alice(), Currency::Near, U128(99)); // success with a return value: no credit
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 14);
}

// ── proofs (they failed before the fix pass; docs/security/contract-review.md has the status of each) ─────────

/// S-03: `delist` keeps any deposit above 1 yocto. Expected: either refuse it (exactly 1 yocto) or refund the excess.
#[test]
fn s03_delist_does_not_keep_excess_deposit() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(alice(), 10 * MILLI, 10, vec![]);
    c.list(id.clone(), U128(1), Currency::Near);
    ctx(alice(), ONE_NEAR, 11, vec![]);
    if panics(|| c.delist(id.clone())).is_none() {
        let refunded: u128 = created().iter().filter(|(r, m, _)| *r == alice() && m == "<transfer>").map(|x| x.2).sum();
        assert_eq!(refunded, ONE_NEAR - 1, "1 NEAR attached to delist: the excess over 1 yocto was kept by the contract");
    }
}

/// S-03: `withdraw_proceeds` keeps any deposit above 1 yocto.
#[test]
fn s03_withdraw_does_not_keep_excess_deposit() {
    let mut c = setup();
    ctx(me(), 0, 1, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Usdc, U128(10));
    ctx(alice(), ONE_NEAR, 2, vec![]);
    if panics(|| c.withdraw_proceeds(Currency::Usdc)).is_none() {
        let refunded: u128 = created().iter().filter(|(r, m, _)| *r == alice() && m == "<transfer>").map(|x| x.2).sum();
        assert_eq!(refunded, ONE_NEAR - 1, "1 NEAR attached to withdraw_proceeds: the excess was kept by the contract");
    }
}

/// S-04: a token can be given a record that can never die. A fresh token's EVM account has nonce 0 and only this
/// contract can advance it, so nonce 2^64−2 stays "unused" forever and the token can never pass the Buy gate again,
/// including for every later owner. Expected: `sign_for` refuses a nonce above the highest signed nonce + 1
/// (kb/70 TL;DR 2), or at least a far-future nonce.
#[test]
fn s04_far_future_evm_nonce_is_refused() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let mut f = evm_base();
    f.nonce = int(u64::MAX as u128 - 1);
    let poison = evm_build(&f);
    ctx(alice(), 5 * MILLI, 100, vec![]);
    let r = panics(|| c.sign_for(id.clone(), evm_hex(&poison), None));
    assert!(r.is_some(), "a never-consumable nonce was signed and logged: the token is permanently unsellable");
}

/// S-05: the NEP-181 views have no default limit; with permissionless minting anyone can make `nft_tokens()` (no
/// args) exceed the view gas limit. Expected: the wrapper clamps `limit` (e.g. to MAX_PAGE) like the Satchel views.
#[test]
fn s05_nft_tokens_default_limit_is_bounded() {
    let mut c = setup();
    for _ in 0..(MAX_PAGE + 5) {
        mint_to(&mut c, alice());
    }
    assert!(c.nft_tokens(None, None).len() <= MAX_PAGE as usize, "nft_tokens() returned every token");
    assert!(c.nft_tokens_for_owner(alice(), None, Some(10_000)).len() <= MAX_PAGE as usize, "nft_tokens_for_owner unbounded");
}

/// S-06: `nft_mint` lacks the R-18 receiver guard that `nft_transfer` has.
#[test]
fn s06_nft_mint_refuses_stranding_receivers() {
    for to in [me(), mpc(), usdc()] {
        let mut c = setup();
        ctx(acc("team.testnet"), 20 * MILLI, 1, vec![]);
        let r = panics(|| c.nft_mint(to.clone()));
        assert!(r.is_some_and(|m| m.starts_with(ERR_BAD_RECEIVER)), "minted a token to {to}, which can never sign for it");
    }
}

// ── fix tests (fix pass, 2026-10-23) ─────────────────────────────────────────────────────────

/// Kept deposit of the current context = attached − refunds to `who`.
fn kept(attached: u128, who: &AccountId) -> u128 {
    attached - created().iter().filter(|(r, m, _)| r == who && m == "<transfer>").map(|x| x.2).sum::<u128>()
}

/// S-01: `list` reserves `proceeds[(seller, currency)] = 0`, paid by the seller; a failed payout's re-credit and a
/// re-credit after a failed withdraw then only overwrite that fixed-size value, so `on_payout` never needs storage.
#[test]
fn fix_s01_list_reserves_the_proceeds_slot_and_recredits_grow_no_storage() {
    let mut c = setup();
    let a = mint_to(&mut c, alice());
    let b = mint_to(&mut c, alice());
    let slot = (alice(), Currency::Usdc);
    assert!(c.proceeds.get(&slot).is_none());
    ctx(alice(), 10 * MILLI, 10, vec![]);
    let s0 = env::storage_usage();
    let la = c.list(a.clone(), U128(100), Currency::Usdc);
    let first = env::storage_usage() - s0;
    assert_eq!(c.proceeds.get(&slot).copied(), Some(0), "slot reserved at list time");
    assert!(c.proceeds_of(alice()).is_empty(), "a reserved zero slot is hidden");
    assert_eq!(kept(10 * MILLI, &alice()), first as u128 * env::storage_byte_cost().as_yoctonear(), "the seller paid for it");
    ctx(alice(), 10 * MILLI, 11, vec![]);
    let s1 = env::storage_usage();
    c.list(b.clone(), U128(100), Currency::Usdc);
    let second = env::storage_usage() - s1;
    assert!(first > second, "the slot is reserved once per (seller, currency): {first} vs {second} B");
    // sale with a failed payout → re-credit overwrites the slot
    ctx(usdc(), 0, 12, vec![]);
    let msg = serde_json::json!({"buy":{"token_id": a, "listing_id": la, "expected_sig_count": 0}}).to_string();
    let _ = c.ft_on_transfer(carol(), U128(100), msg);
    // The mock resets storage_usage with every new context, so each delta is measured inside one context.
    let flush = |c: &mut Contract| {
        c.state.flush();
        c.listings.flush();
        c.proceeds.flush();
    };
    let delta = |c: &mut Contract, f: &mut dyn FnMut(&mut Contract)| {
        flush(c);
        let before = env::storage_usage();
        f(c);
        flush(c);
        env::storage_usage() as i64 - before as i64
    };
    ctx(me(), 0, 13, vec![PromiseResult::Failed]);
    assert_eq!(delta(&mut c, &mut |c| c.on_payout(alice(), Currency::Usdc, U128(100))), 0, "on_payout grew storage");
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 100);
    // withdraw zeroes the slot (it stays), and a failed withdraw payout re-credits in place
    ctx(alice(), 1, 14, vec![]);
    assert_eq!(delta(&mut c, &mut |c| c.withdraw_proceeds(Currency::Usdc)), 0, "withdraw keeps the slot");
    assert_eq!(c.proceeds.get(&slot).copied(), Some(0));
    ctx(me(), 0, 15, vec![PromiseResult::Failed]);
    assert_eq!(delta(&mut c, &mut |c| c.on_payout(alice(), Currency::Usdc, U128(100))), 0, "re-credit after a failed withdraw grew storage");
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 100);
    // contrast: a credit for an account without a reserved slot (only reachable via a pre-fix withdraw) would grow it
    ctx(me(), 0, 16, vec![PromiseResult::Failed]);
    assert!(delta(&mut c, &mut |c| c.on_payout(bob(), Currency::Near, U128(1))) > 0);
}

/// S-03: `delist` and `withdraw_proceeds` take exactly 1 yocto (0 and 2 are refused, nothing changes).
#[test]
fn fix_s03_delist_and_withdraw_require_exactly_one_yocto() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(alice(), 10 * MILLI, 10, vec![]);
    c.list(id.clone(), U128(1), Currency::Near);
    for dep in [0, 2, ONE_NEAR] {
        ctx(alice(), dep, 11, vec![]);
        expect_code(ERR_DEPOSIT, || c.delist(id.clone()));
    }
    assert!(c.satchel(id.clone()).unwrap().listing.is_some());
    ctx(alice(), 1, 11, vec![]);
    c.delist(id.clone());
    ctx(me(), 0, 12, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(10));
    for dep in [0, 2, ONE_NEAR] {
        ctx(alice(), dep, 13, vec![]);
        expect_code(ERR_DEPOSIT, || c.withdraw_proceeds(Currency::Near));
    }
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 10);
    ctx(alice(), 1, 13, vec![]);
    c.withdraw_proceeds(Currency::Near);
    assert!(c.proceeds_of(alice()).is_empty());
}

fn evm_nonce(n: u64) -> SignRequest {
    let mut f = evm_base();
    f.nonce = int(n as u128);
    evm_hex(&evm_build(&f))
}

/// S-04 / D-43: the nonce-gap rule. First EVM request: nonce ≤ 1; then nonce ≤ highest signed + 1. Re-signing a lower
/// nonce (retry, replacement) is allowed. Refusals change nothing; BTC/SOL requests don't touch the EVM maximum; the
/// maximum belongs to the token and survives transfers.
#[test]
fn fix_s04_nonce_gap_rule() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let refuse = |c: &mut Contract, who: AccountId, n: u64| {
        ctx(who, 5 * MILLI, 200, vec![]);
        let before = c.satchel(id.clone()).unwrap().sig_count;
        expect_code(ERR_EVM_NONCE_GAP, || c.sign_for(id.clone(), evm_nonce(n), None));
        assert_eq!(c.satchel(id.clone()).unwrap().sig_count, before, "a refusal changes nothing");
    };
    let max = |c: &Contract| c.state.get(&id).and_then(|s| s.max_evm_nonce);
    assert_eq!(max(&c), None);
    refuse(&mut c, alice(), 2);
    sign(&mut c, alice(), &id, evm_nonce(1), 101); // demo #4: nonce = current + 1 on a never-sent EVM address
    assert_eq!(max(&c), Some(1));
    refuse(&mut c, alice(), 3);
    sign(&mut c, alice(), &id, evm_nonce(0), 102); // fills the gap
    sign(&mut c, alice(), &id, evm_nonce(2), 103);
    sign(&mut c, alice(), &id, evm_nonce(2), 104); // retry / replacement of the same nonce
    sign(&mut c, alice(), &id, evm_nonce(1), 105); // lower nonce: allowed, max unchanged
    assert_eq!(max(&c), Some(2));
    refuse(&mut c, alice(), 4);
    let mut f = evm_base();
    f.nonce = int(u64::MAX as u128 - 1);
    ctx(alice(), 5 * MILLI, 106, vec![]);
    expect_code(ERR_EVM_NONCE_GAP, || c.sign_for(id.clone(), evm_hex(&evm_build(&f)), None));
    // BTC and SOL requests leave the EVM maximum alone
    sign(&mut c, alice(), &id, SignRequest::Sol { message: sol::tests::W3_TRANSFER.into() }, 107);
    assert_eq!(max(&c), Some(2));
    // the maximum travels with the token: the next owner is bound by it, and can continue from it
    ctx(alice(), 1, 108, vec![]);
    c.nft_transfer(bob(), id.clone(), None, None);
    refuse(&mut c, bob(), 4);
    sign(&mut c, bob(), &id, evm_nonce(3), 109);
    assert_eq!(max(&c), Some(3));
    // the classifier's own codes still come first (a gap and a wrong chain → ERR_EVM_CHAIN_ID)
    let mut f = evm_base();
    f.nonce = int(9);
    f.chain = int(1);
    ctx(bob(), 5 * MILLI, 110, vec![]);
    expect_code(ERR_EVM_CHAIN_ID, || c.sign_for(id.clone(), evm_hex(&evm_build(&f)), None));
    assert_eq!(evm::max_allowed_nonce(None), 1);
    assert_eq!(evm::max_allowed_nonce(Some(u64::MAX - 1)), u64::MAX);
    assert_eq!(evm::check_nonce(2, None), Err(ERR_EVM_NONCE_GAP));
    assert_eq!(evm::check_nonce(1, None), Ok(()));
}

/// S-04: the first EVM record costs the 8 extra bytes of `max_evm_nonce`, and the requester pays for them.
#[test]
fn fix_s04_first_evm_record_charges_the_nonce_slot() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(alice(), 5 * MILLI, 100, vec![]);
    let s0 = env::storage_usage();
    c.sign_for(id.clone(), evm_nonce(0), None);
    let d0 = env::storage_usage() - s0;
    assert_eq!(kept(5 * MILLI, &alice()), d0 as u128 * env::storage_byte_cost().as_yoctonear() + 1);
    ctx(alice(), 5 * MILLI, 101, vec![]);
    let s1 = env::storage_usage();
    c.sign_for(id.clone(), evm_nonce(1), None);
    let d1 = env::storage_usage() - s1;
    assert_eq!(d0, d1 + 8, "Some(nonce) is 8 bytes more than None, paid once");
}

/// S-05: NEP-181 pages default to and are capped at MAX_PAGE; smaller limits and from_index paging still work.
#[test]
fn fix_s05_nep181_paging_still_works_below_the_cap() {
    let mut c = setup();
    for _ in 0..(MAX_PAGE + 5) {
        mint_to(&mut c, alice());
    }
    assert_eq!(c.nft_tokens(None, None).len(), MAX_PAGE as usize);
    assert_eq!(c.nft_tokens(Some(U128(MAX_PAGE as u128)), Some(100)).len(), 5);
    assert_eq!(c.nft_tokens(None, Some(3)).len(), 3);
    assert_eq!(c.nft_tokens_for_owner(alice(), None, None).len(), MAX_PAGE as usize);
    assert_eq!(c.nft_tokens_for_owner(alice(), Some(U128(50)), Some(50)).len(), 5);
}

/// S-06 / S-09: the receiver guard covers the contract, the MPC and the configured USDC, in `nft_mint` and
/// `nft_transfer`; a contract without USDC still mints to ordinary accounts.
#[test]
fn fix_s06_s09_receiver_guard_in_mint_and_transfer() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    for to in [me(), mpc(), usdc()] {
        ctx(alice(), 1, 10, vec![]);
        expect_code(ERR_BAD_RECEIVER, || c.nft_transfer(to.clone(), id.clone(), None, None));
    }
    assert_eq!(c.nft_token(id.clone()).unwrap().owner_id, alice());
}

/// S-09: with USDC disabled (`usdc: None`) the USDC account id is an ordinary receiver.
#[test]
fn fix_s09_usdc_is_ordinary_when_usdc_is_disabled() {
    ctx(acc("team.testnet"), 0, 1, vec![]);
    let mut c = Contract::new(mpc(), None, "https://satchel.example/api/card/".into());
    let t = mint_to(&mut c, usdc());
    assert_eq!(c.nft_token(t).unwrap().owner_id, usdc());
}

/// S-13: `on_payout` credits only as the callback of exactly one promise result.
#[test]
fn fix_s13_on_payout_needs_exactly_one_promise_result() {
    let mut c = setup();
    ctx(me(), 0, 1, vec![]);
    c.on_payout(alice(), Currency::Near, U128(10 * ONE_NEAR));
    ctx(me(), 0, 2, vec![PromiseResult::Failed, PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(10 * ONE_NEAR));
    assert!(c.proceeds_of(alice()).is_empty(), "no single result: never a credit");
    assert!(near_sdk::test_utils::get_logs().iter().all(|l| !l.contains("\"event\":\"payout\"")));
    ctx(alice(), 1, 3, vec![]);
    expect_code(ERR_NOTHING_OWED, || c.withdraw_proceeds(Currency::Near));
    ctx(me(), 0, 4, vec![PromiseResult::Failed]);
    c.on_payout(alice(), Currency::Near, U128(7));
    assert_eq!(c.proceeds_of(alice())[0].amount.0, 7);
}

