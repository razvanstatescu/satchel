//! NEP-171/177/181 surface: INV-21 (sequential ids, no burn), mint deposit, metadata, enumeration.

mod common;

use anyhow::Result;
use common::*;
use near_workspaces::types::{Gas, NearToken};
use serde_json::json;

/// INV-21: ids are "1","2",… sequential, never reissued; no burn method exists.
#[tokio::test]
async fn ids_sequential_no_burn() -> Result<()> {
    let env = setup().await?;
    let mut ids = vec!["1".to_string()];
    for who in [&env.bob, &env.carol, &env.alice] {
        ids.push(mint(&env, who, who.id()).await?);
    }
    assert_eq!(ids, vec!["1", "2", "3", "4"]);
    assert_eq!(view(&env, "nft_total_supply", json!({})).await?, json!("4"));
    let r = env
        .alice
        .call(env.satchel.id(), "nft_burn")
        .args_json(json!({ "token_id": "1" }))
        .deposit(YOCTO)
        .transact()
        .await?;
    assert_fails_with(&r, "MethodNotFound");
    assert_eq!(num(&config(&env).await?["next_token_id"]), 5);
    assert_eq!(mint(&env, &env.bob, env.bob.id()).await?, "5");
    Ok(())
}

/// `nft_mint`: anyone can mint to anyone; too small a deposit fails ERR_DEPOSIT and mints nothing;
/// metadata follows §5.7.
#[tokio::test]
async fn mint_rules_and_metadata() -> Result<()> {
    let env = setup().await?;
    let r = env
        .carol
        .call(env.satchel.id(), "nft_mint")
        .args_json(json!({ "receiver_id": env.bob.id() }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(30))
        .transact()
        .await?;
    assert_fails_with(&r, "ERR_DEPOSIT");
    assert_eq!(view(&env, "nft_total_supply", json!({})).await?, json!("1"));

    let id = mint(&env, &env.carol, env.bob.id()).await?;
    assert_eq!(id, "2");
    let ev = events_in(
        // the mint above already succeeded; re-read through a fresh mint to check the event
        env.carol
            .call(env.satchel.id(), "nft_mint")
            .args_json(json!({ "receiver_id": env.carol.id() }))
            .deposit(MINT_DEPOSIT)
            .gas(Gas::from_tgas(30))
            .transact()
            .await?
            .logs()
            .iter()
            .map(|s| s.to_string()),
        "nep171",
        "nft_mint",
    );
    assert_eq!(ev.len(), 1);
    assert_eq!(ev[0]["owner_id"], env.carol.id().to_string());
    assert_eq!(ev[0]["token_ids"], json!(["3"]));

    let tok = view(&env, "nft_token", json!({ "token_id": "2" })).await?;
    assert_eq!(tok["owner_id"], env.bob.id().to_string());
    assert_eq!(tok["metadata"]["title"], "Satchel #2");
    assert_eq!(tok["metadata"]["media"], "2.svg");
    assert!(tok["metadata"]["issued_at"].is_string() || tok["metadata"]["issued_at"].is_number());

    let md = view(&env, "nft_metadata", json!({})).await?;
    assert_eq!(md["spec"], "nft-1.0.0");
    assert_eq!(md["name"], "Satchel");
    assert_eq!(md["symbol"], "SATCHEL");
    assert_eq!(md["base_uri"], BASE_URI);

    let mine = view(
        &env,
        "nft_tokens_for_owner",
        json!({ "account_id": env.bob.id() }),
    )
    .await?;
    assert_eq!(mine.as_array().unwrap().len(), 1);
    assert_eq!(
        view(
            &env,
            "nft_supply_for_owner",
            json!({ "account_id": env.alice.id() })
        )
        .await?,
        json!("1")
    );
    let all = view(&env, "nft_tokens", json!({})).await?;
    assert_eq!(all.as_array().unwrap().len(), 3);
    Ok(())
}
