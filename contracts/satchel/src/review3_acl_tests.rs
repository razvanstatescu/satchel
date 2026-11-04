//! Review 3 (access control, state machine, external griefing, platform layer). Guards for the fixed R3-X-1/R3-X-2
//! findings (`nft_tokens` pages by numeric id), a demonstration of R3-X-3 (web side), and soundness tests that pin what
//! was checked. Slow tests are `#[ignore]`d; run them with `--include-ignored`. The mocked chain does not roll back state on a panic, and the
//! gas it reports (`env::used_gas`) counts host functions only (storage reads, hashing, logs), not wasm instructions,
//! so every gas figure here is a LOWER bound of the on-chain cost.

use std::panic::{catch_unwind, AssertUnwindSafe};

use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_sdk::borsh;
use near_sdk::json_types::U128;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{env, testing_env, AccountId, Gas, NearToken, PromiseResult, RuntimeFeesConfig};

use crate::allowance::{Asset, CapInput};
use crate::errors::*;
use crate::parse::evm;
use crate::*;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = ONE_NEAR / 1000;
const T0: u64 = 1_793_000_000_000; // ms
const DAY: u64 = 86_400_000;
/// nearcore's `max_gas_burnt_view` (the RPC view-call ceiling) and the per-receipt ceiling.
const VIEW_LIMIT_TGAS: u64 = 300;

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
fn spammer() -> AccountId {
    acc("spammer.testnet")
}

fn ctx_gas(predecessor: AccountId, deposit: u128, height: u64, prepaid_tgas: u64, results: Vec<PromiseResult>) {
    let c = VMContextBuilder::new()
        .current_account_id(me())
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(prepaid_tgas))
        .block_height(height)
        .block_timestamp(T0 * 1_000_000 + height * 1_000_000_000)
        .account_balance(NearToken::from_near(1_000_000))
        .build();
    testing_env!(c, near_sdk::test_vm_config(), RuntimeFeesConfig::test(), Default::default(), results);
}
fn ctx(predecessor: AccountId, deposit: u128, height: u64) {
    ctx_gas(predecessor, deposit, height, 300, vec![]);
}

/// Fresh, EMPTY mocked storage (`testing_env!` carries storage over between contexts).
fn wipe() {
    env::set_blockchain_interface(near_sdk::MockedBlockchain::new(
        VMContextBuilder::new().current_account_id(me()).build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        vec![],
        Default::default(),
        Default::default(),
        None,
    ));
}
fn setup() -> Contract {
    wipe();
    ctx(acc("team.testnet"), 0, 1);
    Contract::new(mpc(), Some(usdc()), "https://satchel.example/api/card/".into())
}
fn mint_by(c: &mut Contract, minter: AccountId, owner: AccountId) -> String {
    ctx(minter, 20 * MILLI, 1);
    c.nft_mint(owner).token_id
}
fn mint_to(c: &mut Contract, owner: AccountId) -> String {
    mint_by(c, acc("team.testnet"), owner)
}
fn flush(c: &mut Contract) {
    c.state.flush();
    c.sig_log.flush();
    c.listings.flush();
    c.proceeds.flush();
    c.market.flush();
}

fn panic_msg<R>(f: impl FnOnce() -> R) -> Option<String> {
    let err = catch_unwind(AssertUnwindSafe(f)).err()?;
    let raw = err.downcast_ref::<String>().cloned().or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
    Some(match raw.split_once("panic_msg: \"") {
        Some((_, rest)) => rest.rsplit_once("\" }").map(|(m, _)| m.to_string()).unwrap_or(rest.to_string()),
        None => raw,
    })
}
fn expect_prefix<R>(prefix: &str, what: &str, f: impl FnOnce() -> R) {
    let m = panic_msg(f).unwrap_or_else(|| panic!("{what}: expected a refusal starting {prefix:?}, the call succeeded"));
    assert!(m.starts_with(prefix), "{what}: expected {prefix:?}, got {m:?}");
}

/// Host gas (Tgas, 2 decimals) of `f` in a fresh context with a huge prepaid budget, so the call is measured instead of
/// being cut off at 300 Tgas.
fn view_tgas<R>(f: impl FnOnce() -> R) -> (f64, R) {
    ctx_gas(alice(), 0, 1, 1_000_000, vec![]);
    let g0 = env::used_gas().as_gas();
    let r = f();
    let used = env::used_gas().as_gas() - g0;
    ((used as f64 / 1e12 * 100.0).round() / 100.0, r)
}

fn ids(v: &[near_contract_standards::non_fungible_token::Token]) -> Vec<String> {
    v.iter().map(|t| t.token_id.clone()).collect()
}

// ── R3-X-1: `nft_tokens(from_index)` costs O(from_index × log n) storage reads ─────────────────────────────

const N_TOKENS: usize = 1_000;

fn mint_many(n: usize) -> Contract {
    let mut c = setup();
    for _ in 0..n {
        mint_by(&mut c, spammer(), spammer());
    }
    c
}

/// GUARD (R3-X-1, fixed): a deep `nft_tokens` page costs about what the first one does. near-contract-standards' own
/// version (still reachable as `c.tokens.nft_tokens`, measured alongside so the test proves it can tell them apart)
/// skips through the legacy TreeMap with one `higher(key)` search per skipped token, so its deep page costs several
/// times its first; at 1,000 tokens its page at 950 needed ≥ 710 Tgas of host gas, over the 300 Tgas view limit.
#[test]
fn r3x1_guard_deep_nft_tokens_page_costs_like_the_first() {
    let c = mint_many(200);
    let (a, p0) = view_tgas(|| c.nft_tokens(Some(U128(0)), Some(50)));
    let (b, p1) = view_tgas(|| c.nft_tokens(Some(U128(150)), Some(50)));
    let (la, _) = view_tgas(|| c.tokens.nft_tokens(Some(U128(0)), Some(50)));
    let (lb, _) = view_tgas(|| c.tokens.nft_tokens(Some(U128(150)), Some(50)));
    println!("R3-X-1 nft_tokens host gas, 200 tokens, from 0 / from 150: Satchel {a} / {b} Tgas; library {la} / {lb} Tgas");
    assert_eq!(p0.len(), 50);
    assert_eq!(ids(&p1), (151..=200).map(|i| i.to_string()).collect::<Vec<_>>());
    assert!(lb > 3.0 * la, "the library's deep page should cost several times its first ({la} vs {lb} Tgas)");
    assert!(b < 1.5 * a + 1.0, "the deep page costs {b} Tgas against {a} Tgas for the first");
    // the per-owner view was always flat (legacy Vector::nth is O(1))
    let (x, _) = view_tgas(|| c.nft_tokens_for_owner(spammer(), Some(U128(0)), Some(50)));
    let (y, _) = view_tgas(|| c.nft_tokens_for_owner(spammer(), Some(U128(150)), Some(50)));
    assert!(y < 2.0 * x + 1.0, "nft_tokens_for_owner skip is O(1) (legacy Vector::nth)");
}

/// PROOF (failed before the fix, passes now): every NEP-181 page fits a view call, also with 1,000 tokens (≈ 4.9 NEAR
/// of mint storage, or ordinary growth).
#[test]
#[ignore = "slow (1,000 mints, ≈ 18 s); the fast guard above covers the same regression"]
fn r3x1_proof_every_nft_tokens_page_fits_a_view_call() {
    let c = mint_many(N_TOKENS);
    let (tgas, page) = view_tgas(|| c.nft_tokens(Some(U128((N_TOKENS - 50) as u128)), Some(50)));
    println!("R3-X-1 nft_tokens(from_index = {}, limit = 50) with {N_TOKENS} tokens: {tgas} Tgas of host gas", N_TOKENS - 50);
    assert_eq!(ids(&page), ((N_TOKENS - 49)..=N_TOKENS).map(|i| i.to_string()).collect::<Vec<_>>());
    assert!(tgas < VIEW_LIMIT_TGAS as f64, "nft_tokens(from_index = {}, limit = 50) burns ≥ {tgas} Tgas of host gas alone (view limit {VIEW_LIMIT_TGAS})", N_TOKENS - 50);
}

// ── R3-X-2: `nft_tokens` used to page in lexicographic order of the string ids (fixed) ──────────────────

/// GUARD (R3-X-2, fixed): pages follow mint order, so the first page (what `getUnlistedMarket` reads, apps/web
/// server.ts:218) holds tokens 1–50 and the next one 51–60. The library paged in string order (`1, 10…19, 2, …`), which
/// left the genesis tokens 6–9 and every id ≥ 55 off page 0.
#[test]
fn r3x2_guard_pages_follow_mint_order() {
    let mut c = setup();
    for _ in 0..60 {
        mint_to(&mut c, alice());
    }
    let want = |r: std::ops::RangeInclusive<u32>| r.map(|i| i.to_string()).collect::<Vec<_>>();
    assert_eq!(ids(&c.nft_tokens(Some(U128(0)), Some(50))), want(1..=50));
    assert_eq!(ids(&c.nft_tokens(Some(U128(50)), Some(50))), want(51..=60));
    assert_eq!(ids(&c.nft_tokens(None, None)), want(1..=50), "defaults: from 0, limit 50");
    assert_eq!(ids(&c.nft_tokens(Some(U128(58)), Some(5))), want(59..=60));
    assert!(c.nft_tokens(Some(U128(60)), Some(5)).is_empty(), "from_index == supply is an empty page");
    assert_eq!(ids(&c.nft_tokens(Some(U128(0)), Some(1_000))).len(), MAX_PAGE as usize, "limit is capped at 50 (S-05)");
    // the library's order, for the record
    assert_eq!(&ids(&c.tokens.nft_tokens(Some(U128(0)), Some(50)))[..4], &["1", "10", "11", "12"]);
}

/// GUARD: the override keeps near-contract-standards' refusals (`audit.rs::audit02_other_paged_views_handle_huge_offsets`
/// relies on the out-of-bounds one) and returns exactly the library's `Token` shape.
#[test]
fn r3x_guard_nft_tokens_refusals_and_shape_match_the_library() {
    let mut c = setup();
    for _ in 0..3 {
        mint_to(&mut c, alice());
    }
    expect_prefix("Out of bounds, please use a smaller from_index.", "from_index past the supply", || c.nft_tokens(Some(U128(4)), Some(1)));
    expect_prefix("Out of bounds", "a huge from_index", || c.nft_tokens(Some(U128(u128::MAX)), Some(1)));
    expect_prefix("Cannot provide limit of 0.", "limit 0", || c.nft_tokens(Some(U128(0)), Some(0)));
    let ours = near_sdk::serde_json::to_value(c.nft_tokens(None, None)).unwrap();
    let theirs = near_sdk::serde_json::to_value(c.tokens.nft_tokens(None, None)).unwrap();
    assert_eq!(ours, theirs, "ids 1–3 sort the same either way, so the pages must be identical, metadata included");
}

// ── R3-X-3: spam mints push a holder's newly received Satchel off `nft_tokens_for_owner(…, 0, 50)` ──────────

/// Demonstration (passes): an outsider mints 50 tokens to alice (≈ 50 × 4.9 mNEAR, measured below), then alice
/// receives a real Satchel. The first page of `nft_tokens_for_owner`, which MySatchels (apps/web
/// components/client/MySatchels.tsx:64), MintFlow's fallback and the claim page read, no longer shows it.
#[test]
fn r3x3_demo_spam_mints_hide_a_newly_received_token() {
    let mut c = setup();
    let first = mint_to(&mut c, alice());
    let real = mint_to(&mut c, bob());
    for _ in 0..49 {
        mint_by(&mut c, spammer(), alice());
    }
    // the 50th spam mint, measured in its own context (the mock resets storage_usage per context)
    ctx(spammer(), 20 * MILLI, 1);
    flush(&mut c);
    let s0 = env::storage_usage();
    c.nft_mint(alice());
    flush(&mut c);
    let per_mint_bytes = env::storage_usage() - s0;
    ctx(bob(), 1, 10);
    c.nft_transfer(alice(), real.clone(), None, None);
    let page = ids(&c.nft_tokens_for_owner(alice(), Some(U128(0)), Some(50)));
    println!(
        "R3-X-3 per spam mint: {per_mint_bytes} B = {:.2} mNEAR; alice owns {} tokens; page 0 holds {:?}…",
        (per_mint_bytes as u128 * env::storage_byte_cost().as_yoctonear()) as f64 / MILLI as f64,
        c.nft_supply_for_owner(alice()).0,
        &page[..3]
    );
    assert!(page.contains(&first), "the oldest token stays first (insertion order)");
    assert!(!page.contains(&real), "the newly received Satchel {real} is beyond page 0");
    assert_eq!(c.nft_supply_for_owner(alice()).0, 52);
}

// ── soundness checks ─────────────────────────────────────────────────────────────────────────────

fn sign(c: &mut Contract, owner: &AccountId, id: &str, height: u64) {
    ctx(owner.clone(), 5 * MILLI, height);
    c.sign_for(id.into(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None);
}

/// No mutating public method can be called with 0 deposit, so a function-call access key (which can't attach any)
/// reaches none of them: every refusal comes from the method body, not just the macro wrapper.
#[test]
fn r3x_sound_no_mutating_method_runs_with_zero_deposit() {
    // nft_mint
    let mut c = setup();
    ctx(alice(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "nft_mint", || c.nft_mint(alice()));

    // nft_transfer, list, set_allowance, sign_for, deposit_near, prepay_storage, make_offer
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(alice(), 0, 1);
    expect_prefix("Requires attached deposit of exactly 1 yoctoNEAR", "nft_transfer", || c.nft_transfer(bob(), id.clone(), None, None));
    ctx(alice(), 0, 1);
    let caps = vec![CapInput { asset: Asset::Sol, limit: U128(1) }];
    expect_prefix(ERR_DEPOSIT, "set_allowance", || c.set_allowance(id.clone(), bob(), caps.clone(), None));
    ctx(alice(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "sign_for", || c.sign_for(id.clone(), SignRequest::Evm { unsigned_tx: evm::tests::KB31_TX.into() }, None));
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    ctx(bob(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "deposit_near", || c.deposit_near(id.clone()));
    ctx(bob(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "prepay_storage", || c.prepay_storage(None));
    ctx(bob(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "make_offer", || c.make_offer(id.clone(), U128(1), 0, 0, T0 + DAY));
    ctx(alice(), 0, 1);
    expect_prefix(ERR_DEPOSIT, "list", || c.list(id.clone(), U128(ONE_NEAR), Currency::Near));

    // delist, buy, withdraw_* on a fresh contract with a listing, an offer, an allowance and inside NEAR
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let id2 = mint_to(&mut c, alice());
    ctx(carol(), ONE_NEAR, 1);
    c.deposit_near(id2.clone());
    ctx(bob(), ONE_NEAR + 10 * MILLI, 1);
    let offer = c.make_offer(id2.clone(), U128(ONE_NEAR), 0, 0, T0 + DAY);
    ctx(alice(), 10 * MILLI, 1);
    c.set_allowance(id2.clone(), carol(), caps.clone(), None);
    ctx(alice(), 10 * MILLI, 1);
    c.list(id.clone(), U128(ONE_NEAR), Currency::Near);
    ctx(bob(), 0, 2);
    expect_prefix(ERR_WRONG_AMOUNT, "buy", || c.buy(id.clone(), 1, 0));
    ctx(alice(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "delist", || c.delist(id.clone()));
    ctx(alice(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "withdraw_near", || c.withdraw_near(id2.clone(), U128(1), None));
    ctx(alice(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "withdraw_ft", || c.withdraw_ft(id2.clone(), usdc(), U128(1), None));
    ctx(alice(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "accept_offer", || c.accept_offer(offer));
    ctx(alice(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "revoke_allowance", || c.revoke_allowance(id2.clone(), carol()));
    ctx(bob(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "cancel_offer", || c.cancel_offer(offer));
    ctx(bob(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "withdraw_proceeds", || c.withdraw_proceeds(Currency::Near));
    ctx(bob(), 0, 2);
    expect_prefix(ERR_DEPOSIT, "withdraw_storage_credit", || c.withdraw_storage_credit());
}

/// The root `Contract` value has the same borsh size after every kind of call, so writing it after `charge_storage`
/// (the macro's `state_write` runs after the method body) never changes storage that was not charged.
#[test]
fn r3x_sound_root_state_size_is_constant() {
    let mut c = setup();
    let size = |c: &Contract| borsh::to_vec(c).unwrap().len();
    let s = size(&c);
    let id = mint_to(&mut c, alice());
    let id2 = mint_to(&mut c, alice());
    sign(&mut c, &alice(), &id2, 10);
    ctx(carol(), ONE_NEAR, 300);
    c.deposit_near(id.clone());
    ctx(bob(), ONE_NEAR + 10 * MILLI, 300);
    let offer = c.make_offer(id.clone(), U128(ONE_NEAR), 0, 0, T0 + DAY);
    ctx(alice(), 10 * MILLI, 300);
    c.list(id.clone(), U128(2 * ONE_NEAR), Currency::Near);
    ctx(alice(), 1, 300);
    c.accept_offer(offer);
    ctx(bob(), 10 * MILLI, 300);
    let l2 = c.list(id.clone(), U128(2 * ONE_NEAR), Currency::Usdc);
    ctx(carol(), 2 * ONE_NEAR, 301);
    expect_prefix(ERR_CURRENCY, "NEAR buy of a USDC listing", || c.buy(id.clone(), l2, 0));
    ctx(bob(), 1, 302);
    c.delist(id.clone());
    ctx(bob(), 1, 302);
    c.withdraw_near(id.clone(), U128(1), None);
    ctx(bob(), 10 * MILLI, 302);
    c.prepay_storage(None);
    assert_eq!(size(&c), s, "root Contract size changed");
}

/// The prefixes near-contract-standards builds under Satchel's `StorageKey::OwnerById` (byte 0) are disjoint: the
/// TreeMap uses `[0,'v',…]` / `[0,'n',…]` and the per-owner sets `[0, 32,0,0,0, sha256(owner), 'i'|'e', …]`
/// (`StorageKey::TokensPerOwner { account_hash: Vec<u8> }`, variant 0 of the library's own enum). Checked on the
/// real keys a mint and a transfer write.
#[test]
fn r3x_sound_nft_library_keys_live_where_the_analysis_says() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    let borsh_str = |s: &str| [&(s.len() as u32).to_le_bytes()[..], s.as_bytes()].concat();
    let owner_val = [&[0u8, b'v'][..], &borsh_str(&id)].concat();
    let set_prefix = |owner: &AccountId| [&[0u8, 32, 0, 0, 0][..], &env::sha256(owner.as_bytes())].concat();
    let set_index = |owner: &AccountId| [&set_prefix(owner)[..], &[b'i'], &borsh_str(&id)].concat();
    let set_elem0 = |owner: &AccountId| [&set_prefix(owner)[..], &[b'e'], &0u64.to_le_bytes()[..]].concat();
    assert!(env::storage_has_key(&owner_val), "TreeMap value key");
    assert!(env::storage_has_key(&[&[0u8, b'n'][..], &0u64.to_le_bytes()[..]].concat()), "TreeMap node 0");
    assert!(env::storage_has_key(&set_index(&alice())) && env::storage_has_key(&set_elem0(&alice())), "alice's per-owner set");
    ctx(alice(), 1, 5);
    c.nft_transfer(bob(), id.clone(), None, None);
    assert!(!env::storage_has_key(&set_index(&alice())), "alice's entry removed");
    assert!(env::storage_has_key(&set_index(&bob())), "bob's per-owner set (the library uses TokensPerOwner here too)");
    // byte 1 after the 0 prefix is 'v' (0x76) / 'n' (0x6e) for the TreeMap and 0x20 for every per-owner set: disjoint
    assert_ne!(set_prefix(&bob())[1], b'v');
    assert_ne!(set_prefix(&bob())[1], b'n');
}

/// The cheapest outsider levers on someone else's token change nothing an owner, buyer or offerer relies on:
/// deposits only add, offers only add entries, a mint to the owner adds a token, and none of them moves
/// `sig_count`, `inside_epoch`, `last_sign_height`, the listing, or makes `accept_offer` / `buy` refuse.
#[test]
fn r3x_sound_outsider_actions_never_break_a_pending_sale_or_accept() {
    let mut c = setup();
    let id = mint_to(&mut c, alice());
    sign(&mut c, &alice(), &id, 10);
    ctx(bob(), ONE_NEAR + 10 * MILLI, 300);
    let offer = c.make_offer(id.clone(), U128(ONE_NEAR), 1, 0, T0 + 30 * DAY);
    ctx(alice(), 10 * MILLI, 300);
    let listing = c.list(id.clone(), U128(3 * ONE_NEAR), Currency::Near);
    let before = (c.token_state(&id).sig_count, c.inside_epoch(&id), c.token_state(&id).last_sign_height, c.token_state(&id).listing.clone());
    // outsider: deposits, dust offers from 3 accounts, spam mints to alice, prepay for alice
    ctx(spammer(), 10 * MILLI, 301);
    c.deposit_near(id.clone());
    for who in ["s1.testnet", "s2.testnet", "s3.testnet"] {
        ctx(acc(who), 1 + 10 * MILLI, 301);
        c.make_offer(id.clone(), U128(1), 1, 0, T0 + DAY);
    }
    for _ in 0..3 {
        mint_by(&mut c, spammer(), alice());
    }
    ctx(spammer(), 10 * MILLI, 301);
    c.prepay_storage(Some(alice()));
    let after = (c.token_state(&id).sig_count, c.inside_epoch(&id), c.token_state(&id).last_sign_height, c.token_state(&id).listing.clone());
    assert_eq!(before, after);
    // the buyer's bound call still goes through
    ctx(carol(), 3 * ONE_NEAR, 302);
    c.buy(id.clone(), listing, 1);
    assert_eq!(c.owner_of(&id), carol());
    // and so does the old offer, for the new owner (Q-02, by design)
    ctx(carol(), 1, 303);
    c.accept_offer(offer);
    assert_eq!(c.owner_of(&id), bob());
}
