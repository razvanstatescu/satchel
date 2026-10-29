//! INV-27 (config = compiled constants) and the exact JSON shapes of spec §5.14 that the UI, the SSR
//! pages and the README consume.

mod common;

use anyhow::Result;
use common::payloads::*;
use common::*;
use serde_json::{Value, json};

/// INV-27: `config()` equals the compiled constants and init args.
#[tokio::test]
async fn config_matches_constants() -> Result<()> {
    let env = setup().await?;
    let want = json!({
        "version": "1.0.0",
        "mpc_contract_id": env.mpc.id(),
        "usdc_contract_id": env.usdc.id(),
        "cooldown_blocks": 250,
        "evm_chain_ids": [11155111, 84532, 421614, 11155420],
        "erc20_tokens": [
            { "chain_id": 11155111, "token": "1c7d4b196cb0c7b01d743fbc6116a902379c7238" },
            { "chain_id": 84532, "token": "036cbd53842c5426634e7929541ec2318f3dcf7e" },
            { "chain_id": 421614, "token": "75faf114eafb1bdbe2f0316df893fd58ce46aa4d" },
            { "chain_id": 11155420, "token": "5fd84259d66cd46123540766be93dfe6d43130d7" },
        ],
        "max_message_bytes": 1024,
        "max_btc_inputs": 10,
        "mpc_sign_gas_tgas": 15,
        "on_signed_gas_tgas": { "base": 10, "per_request": 2 },
        "min_sign_prepaid_tgas": { "base": 30, "per_request": 18 },
        "max_mpc_deposit": "10000000000000000000000",
        "storage_byte_cost": "10000000000000000000",
        "base_uri": BASE_URI,
        "next_token_id": 2,
        "next_listing_id": 1,
    });
    assert_eq!(config(&env).await?, want);
    Ok(())
}

fn is_hex(v: &Value, bytes: usize) -> bool {
    v.as_str()
        .map(|s| {
            s.len() == 2 * bytes
                && s.bytes()
                    .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
        })
        .unwrap_or(false)
}

/// Spec §5.14 / §5.3 encoding rules: counters and heights are JSON numbers, token amounts are decimal
/// strings, bytes are lowercase hex without 0x, enum tags are snake_case.
#[tokio::test]
async fn view_shapes_match_spec() -> Result<()> {
    let env = setup().await?;
    let sv = satchel_view(&env, "1").await?;
    assert_eq!(sv["token_id"], "1");
    assert_eq!(sv["owner_id"], env.alice.id().to_string());
    assert!(
        sv["sig_count"].is_u64() && sv["last_sign_height"].is_u64() && sv["listable_at"].is_u64(),
        "{sv}"
    );
    assert_eq!(sv["sig_count"], 0);
    assert_eq!(sv["last_sign_height"], 0);
    assert!(sv["listing"].is_null());
    assert_eq!(
        sv["paths"],
        json!({ "btc": "satchel/1/btc", "evm": "satchel/1/evm", "sol": "satchel/1/sol" })
    );
    assert!(
        view(&env, "satchel", json!({ "token_id": "99" }))
            .await?
            .is_null()
    );
    for (c, p) in [
        ("btc", "satchel/1/btc"),
        ("evm", "satchel/1/evm"),
        ("sol", "satchel/1/sol"),
    ] {
        assert_eq!(
            view(&env, "derived_path", json!({ "token_id": "1", "chain": c })).await?,
            json!(p)
        );
    }

    let tx = EvmTx::transfer(0).encode();
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &evm_req(&tx)).await?);
    assert_ok(&sign_and_wait(&env, &env.alice, "1", &BtcTx::new(1, 1).req()).await?);
    assert_ok(
        &sign_and_wait(
            &env,
            &env.alice,
            "1",
            &sol_req(&sol_message(1_000_000, [4; 32])),
        )
        .await?,
    );
    let recs = sig_records(&env, "1").await?;
    for r in &recs {
        for k in ["seq", "request_id", "input_index", "height", "timestamp_ms"] {
            assert!(r[k].is_u64(), "{k} must be a JSON number: {r}");
        }
        assert!(r["requester"].is_string());
        assert!(is_hex(&r["payload"], 32), "payload hex32: {}", r["payload"]);
        assert_eq!(r["status"], "signed");
        assert_eq!(r["detail"].as_object().map(|o| o.len()), Some(1));
    }
    let evm = &recs[0];
    assert_eq!(evm["chain"], "evm");
    let s = &evm["signature"];
    assert!(
        is_hex(&s["r"], 32) && is_hex(&s["s"], 32) && s["recovery_id"].is_u64(),
        "{s}"
    );
    assert_eq!(evm["detail"]["evm"]["chain_id"], json!(11155111));
    assert_eq!(evm["detail"]["evm"]["nonce"], json!(0));
    assert_eq!(evm["detail"]["evm"]["unsigned_tx"], hex(&tx));
    let btc = &recs[1];
    assert_eq!(btc["chain"], "btc");
    assert!(is_hex(&btc["detail"]["btc"]["txid"], 32));
    assert!(btc["detail"]["btc"]["vout"].is_u64());
    assert!(
        btc["detail"]["btc"]["amount_sats"].is_string(),
        "amount_sats is a decimal string"
    );
    let sol = &recs[2];
    assert_eq!(sol["chain"], "sol");
    assert!(is_hex(&sol["signature"]["signature"], 64));
    assert!(is_hex(&sol["detail"]["sol"]["recent_blockhash"], 32));
    assert_eq!(
        sol["detail"]["sol"]["lamports"],
        json!("1000000"),
        "lamports is a decimal string"
    );

    pass_quiet_period(&env, "1").await?;
    list_ok(&env, &env.alice, "1", 5_000_000, "usdc").await?;
    let l = &satchel_view(&env, "1").await?["listing"];
    assert!(
        l["id"].is_u64() && l["listed_at"].is_u64() && l["sig_count"].is_u64(),
        "{l}"
    );
    assert_eq!(l["price"], json!("5000000"));
    assert_eq!(l["currency"], "usdc");
    assert_eq!(l["seller"], env.alice.id().to_string());
    let ls = view(&env, "listings", json!({ "from_index": 0, "limit": 50 })).await?;
    assert_eq!(ls, json!([{ "token_id": "1", "listing": l }]));
    assert_eq!(
        view(&env, "proceeds_of", json!({ "account_id": env.alice.id() })).await?,
        json!([])
    );
    let page: Vec<Value> = serde_json::from_value(
        view(
            &env,
            "sig_records",
            json!({ "token_id": "1", "from_seq": 0, "limit": 500 }),
        )
        .await?,
    )?;
    assert!(page.len() <= 50);
    Ok(())
}
