//! Self-checks of the harness payload builders against KB-cited constants (no sandbox).

mod common;
use common::payloads::*;

#[test]
fn kb_evm_vector_hash() {
    assert_eq!(hex(&keccak(&unhex(KB_EVM_TX))), KB_EVM_HASH);
}

#[test]
fn evm_builder_reencodes_kb_vector() {
    // kb/31 vector: chainId 11155111, nonce 0, tip 0x030d48, maxFee 0x030d5c, gas 21000,
    // to 0x61739f…28be, value 0x5af3107a4000 (1e14), empty data and access list.
    let mut to = [0u8; 20];
    to.copy_from_slice(&unhex("61739f33adbb7f76c1b5b222e4119085257528be"));
    let tx = EvmTx {
        chain_id: SEPOLIA,
        nonce: 0,
        tip: 0x030d48,
        max_fee: 0x030d5c,
        gas: 21_000,
        to: Some(to),
        value: 0x5af3107a4000,
        data: vec![],
        access_list: vec![],
    };
    assert_eq!(hex(&tx.encode()), KB_EVM_TX);
}

#[test]
fn btc_preimage_layout() {
    let t = BtcTx::new(2, 1);
    let p = t.preimage(1);
    assert_eq!(&p[0..4], &[2, 0, 0, 0]);
    assert_eq!(&p[68..100], &t.inputs[1].txid_le);
    assert_eq!(&p[178..182], &[1, 0, 0, 0]);
    assert_eq!(&p[142..174], &sha256d(&t.outputs_bytes()));
}

#[test]
fn sol_message_layout() {
    let m = sol_message(1_000_000, [7; 32]);
    assert_eq!(m[0], 1);
    assert_eq!(m.len(), 3 + 1 + 96 + 32 + 1 + 1 + 1 + 2 + 1 + 12);
    assert_eq!(compact_u16(300), vec![0xac, 0x02]);
}

// ── tools/check-wasm-imports.sh (INV-22) on synthetic modules ───────────────────────────────

fn leb(mut n: usize) -> Vec<u8> {
    let mut out = vec![];
    loop {
        let b = (n & 0x7f) as u8;
        n >>= 7;
        if n == 0 {
            out.push(b);
            return out;
        }
        out.push(b | 0x80);
    }
}

/// A minimal wasm module importing `env.<name>` (func, type 0 = () -> ()) for each name, plus an
/// imported memory, so the parser walks a non-function import too.
fn module(imports: &[&str]) -> Vec<u8> {
    let mut m = b"\0asm\x01\0\0\0".to_vec();
    let types = vec![0x01, 0x60, 0x00, 0x00];
    m.push(1);
    m.extend(leb(types.len()));
    m.extend(types);
    let mut body = leb(imports.len() + 1);
    for name in imports {
        body.extend(leb(3));
        body.extend(b"env");
        body.extend(leb(name.len()));
        body.extend(name.as_bytes());
        body.extend([0x00, 0x00]);
    }
    body.extend(leb(3));
    body.extend(b"env");
    body.extend(leb(6));
    body.extend(b"memory");
    body.extend([0x02, 0x00, 0x01]);
    m.push(2);
    m.extend(leb(body.len()));
    m.extend(body);
    m
}

fn run_checker(bytes: &[u8], tag: &str) -> i32 {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let f = std::env::temp_dir().join(format!("satchel-inv22-{tag}-{}.wasm", std::process::id()));
    std::fs::write(&f, bytes).unwrap();
    let out = std::process::Command::new("bash")
        .arg(root.join("tools/check-wasm-imports.sh"))
        .arg(&f)
        .output()
        .expect("run check-wasm-imports.sh");
    let _ = std::fs::remove_file(&f);
    out.status.code().unwrap_or(-1)
}

#[test]
fn wasm_import_check_accepts_clean_module() {
    let m = module(&[
        "promise_batch_create",
        "promise_batch_action_transfer",
        "promise_batch_action_function_call_weight",
    ]);
    assert_eq!(run_checker(&m, "clean"), 0);
}

#[test]
fn wasm_import_check_rejects_forbidden_imports() {
    for (i, bad) in [
        "promise_batch_action_add_key_with_full_access",
        "promise_batch_action_add_key_with_function_call",
        "promise_batch_action_deploy_contract",
        "promise_batch_action_delete_account",
        "promise_batch_action_use_global_contract",
    ]
    .iter()
    .enumerate()
    {
        let m = module(&["promise_batch_action_transfer", bad]);
        assert_eq!(
            run_checker(&m, &format!("bad{i}")),
            1,
            "{bad} must be rejected"
        );
    }
}

#[test]
fn wasm_import_check_rejects_non_wasm() {
    assert_eq!(run_checker(b"not a wasm module", "garbage"), 2);
    let mut truncated = module(&["promise_batch_action_transfer"]);
    truncated.truncate(20);
    assert_eq!(run_checker(&truncated, "trunc"), 2);
}
