//! Raw JSON-RPC helpers. near-workspaces' `ExecutionOutcome` has no action details, but several
//! invariants need them: the exact refund a `sign_for` sends back (INV-18), and that each MPC `sign`
//! is its own single-action receipt (INV-24). `EXPERIMENTAL_tx_status` returns every receipt with
//! its actions.

use anyhow::{Context, Result, anyhow};
use base64::Engine;
use near_workspaces::network::Sandbox;
use near_workspaces::{AccountId, CryptoHash, Worker};
use serde_json::{Value, json};

pub async fn tx_receipts(
    worker: &Worker<Sandbox>,
    hash: &CryptoHash,
    sender: &AccountId,
) -> Result<Value> {
    let body = json!({
        "jsonrpc": "2.0", "id": "satchel-tests", "method": "EXPERIMENTAL_tx_status",
        "params": { "tx_hash": hash.to_string(), "sender_account_id": sender.to_string(), "wait_until": "FINAL" }
    });
    let v: Value = reqwest::Client::new()
        .post(worker.rpc_addr())
        .json(&body)
        .send()
        .await
        .context("rpc post")?
        .json()
        .await
        .context("rpc json")?;
    if let Some(e) = v.get("error") {
        return Err(anyhow!("EXPERIMENTAL_tx_status error: {e}"));
    }
    v.get("result")
        .cloned()
        .ok_or_else(|| anyhow!("no result: {v}"))
}

#[derive(Debug, Clone)]
pub struct ActionReceipt {
    pub predecessor: String,
    pub receiver: String,
    pub actions: Vec<Value>,
}

pub fn action_receipts(result: &Value) -> Vec<ActionReceipt> {
    result["receipts"]
        .as_array()
        .map(|rs| {
            rs.iter()
                .filter_map(|r| {
                    let actions = r["receipt"]["Action"]["actions"].as_array()?.clone();
                    Some(ActionReceipt {
                        predecessor: r["predecessor_id"].as_str()?.to_string(),
                        receiver: r["receiver_id"].as_str()?.to_string(),
                        actions,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Amounts of every plain Transfer `from → to` (excludes gas refunds, whose predecessor is `system`).
pub fn transfers(result: &Value, from: &AccountId, to: &AccountId) -> Vec<u128> {
    action_receipts(result)
        .into_iter()
        .filter(|r| r.predecessor == from.as_str() && r.receiver == to.as_str())
        .flat_map(|r| r.actions)
        .filter_map(|a| {
            a.get("Transfer")
                .and_then(|t| t["deposit"].as_str())
                .and_then(|d| d.parse().ok())
        })
        .collect()
}

#[derive(Debug, Clone)]
pub struct Call {
    pub method: String,
    pub args: Value,
    pub deposit: u128,
    pub gas: u64,
    /// Number of actions in the receipt that carried this call.
    pub receipt_actions: usize,
}

/// Every FunctionCall `from → to` named `method`, with the size of its receipt.
pub fn calls(result: &Value, from: &AccountId, to: &AccountId, method: &str) -> Vec<Call> {
    let mut out = vec![];
    for r in action_receipts(result) {
        if r.predecessor != from.as_str() || r.receiver != to.as_str() {
            continue;
        }
        let n = r.actions.len();
        for a in &r.actions {
            let Some(fc) = a.get("FunctionCall") else {
                continue;
            };
            if fc["method_name"].as_str() != Some(method) {
                continue;
            }
            let raw = fc["args"].as_str().unwrap_or_default();
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(raw)
                .unwrap_or_default();
            out.push(Call {
                method: method.to_string(),
                args: serde_json::from_slice(&bytes).unwrap_or(Value::Null),
                deposit: fc["deposit"]
                    .as_str()
                    .and_then(|d| d.parse().ok())
                    .unwrap_or(0),
                gas: fc["gas"].as_u64().unwrap_or(0),
                receipt_actions: n,
            });
        }
    }
    out
}
