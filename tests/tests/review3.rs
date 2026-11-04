//! Round-three review fixes on the real wasm (docs/security/review-round-3.md). The unit tests in
//! `contracts/satchel/src/review3_*_tests.rs` cover the logic; these cover what only the wasm entry points do.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use serde_json::{Value, json};

/// R3-I-1: `sign_for` refuses an unknown top-level argument (`#[deny_unknown_arguments]`) and an unknown field inside
/// `request` (`deny_unknown_fields` on `SignRequest`) at the entry point, so a dapp can't add decoy fields a wallet
/// would show next to the bytes that are really signed. Nothing is recorded and the MPC is never called.
#[tokio::test]
async fn r3_i1_sign_for_refuses_unknown_arguments_and_fields() -> Result<()> {
    let env = setup().await?;
    let decoys = [
        json!({ "token_id": "1", "request": evm_req(&unhex(KB_EVM_TX)), "note": "refund to alice" }),
        json!({ "token_id": "1", "request": { "evm": { "unsigned_tx": KB_EVM_TX, "to": "0x000000000000000000000000000000000000a11c" } } }),
    ];
    for args in decoys {
        let r = env
            .alice
            .call(env.satchel.id(), "sign_for")
            .args_json(args.clone())
            .gas(sign_attach_gas(1))
            .deposit(sign_attach_deposit(1))
            .transact()
            .await?;
        assert!(r.is_failure(), "accepted {args}");
        let t = fail_text(&r);
        assert!(t.contains("Failed to deserialize input from JSON") && t.contains("unknown field"), "{args}: {t}");
    }
    assert_eq!(sig_count(&env, "1").await?, 0, "nothing was recorded");
    assert_eq!(mpc_count(&env).await?, 0, "the MPC was never called");
    Ok(())
}

/// R3-X-1 / R3-X-2: `nft_tokens` pages by numeric id on the wasm (mint order, so "10" no longer comes before "2") and
/// keeps near-contract-standards' refusals (`audit.rs::audit02_other_paged_views_handle_huge_offsets` relies on the
/// out-of-bounds one).
#[tokio::test]
async fn r3_x_nft_tokens_pages_in_mint_order() -> Result<()> {
    let env = setup_with(Opts { mint_to_alice: 12, ..Opts::default() }).await?;
    let ids = |v: Value| -> Vec<String> { v.as_array().unwrap().iter().map(|t| t["token_id"].as_str().unwrap().to_string()).collect() };
    let want = |r: std::ops::RangeInclusive<u32>| r.map(|i| i.to_string()).collect::<Vec<_>>();
    assert_eq!(ids(view(&env, "nft_tokens", json!({})).await?), want(1..=12));
    assert_eq!(ids(view(&env, "nft_tokens", json!({ "from_index": "10", "limit": 5 })).await?), want(11..=12));
    assert!(view(&env, "nft_tokens", json!({ "from_index": "12" })).await?.as_array().unwrap().is_empty());
    let past = env.satchel.view("nft_tokens").args_json(json!({ "from_index": "13" })).await;
    assert!(past.is_err(), "from_index past the supply is refused, as near-contract-standards does");
    let zero = env.satchel.view("nft_tokens").args_json(json!({ "limit": 0 })).await;
    assert!(zero.is_err(), "limit 0 is refused, as near-contract-standards does");
    Ok(())
}
