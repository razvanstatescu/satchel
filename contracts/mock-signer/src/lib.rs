//! Sandbox fixture that mirrors the `sign` interface of `v1.signer-prod.testnet` (near/mpc 3.17.0).
//!
//! Wire format (kb/10 §`sign`, §Response; spec §5.8):
//! - request:  `{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"<64 hex>"},"domain_id":0}}`
//! - response: `{"scheme":"Secp256k1","big_r":{"affine_point":"02…"},"s":{"scalar":"…"},"recovery_id":1}`
//!   or        `{"scheme":"Ed25519","signature":[64 numbers]}`
//!
//! Behaviour mirrored from the real contract:
//! - preconditions in source order: domain exists → domain purpose is Sign → prepaid gas ≥ 15 Tgas →
//!   deposit ≥ 1 yocto (excess refunded to the *predecessor*) → payload matches the domain's scheme →
//!   ECDSA payload < secp256k1 order n; each failure panics with the live error text;
//! - `sign` creates a yield (`promise_yield_create`, 7 Tgas callback, weight 0) and returns it, so the
//!   caller's promise resolves only when the yield is resumed or times out (200 blocks);
//! - the yield callback returns the resumed bytes as-is on success; on timeout it chains to a 2 Tgas
//!   `fail_on_timeout` that panics `Request has timed out.`, so the caller sees `PromiseError::Failed`;
//! - a late `respond` fails `This sign request has timed out, was completed, or never existed.`
//!
//! Test knobs (not part of the real interface): a global `Mode`, `respond*` hooks that play the MPC
//! node, and a request log that records `(predecessor, path, payload_v2, domain_id, prepaid_gas,
//! attached_deposit)` for every accepted request (spec §6 preamble). Signatures are fake but have the
//! real shape; key derivation is not implemented because no sandbox test needs it.

use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::{self, Value, json};
use near_sdk::store::{IterableMap, Vector};
use near_sdk::{
    AccountId, BorshStorageKey, Gas, GasWeight, NearToken, Promise, YieldId, env, log, near,
};

pub const VERSION: &str = "3.17.0";
/// Live `config.sign_call_gas_attachment_requirement_tera_gas`.
pub const SIGN_GAS_REQUIRED: Gas = Gas::from_tgas(15);
/// Live `config.return_signature_and_clean_state_on_success_call_tera_gas`.
pub const RETURN_SIGNATURE_GAS: Gas = Gas::from_tgas(7);
/// Live `config.fail_on_timeout_tera_gas`.
pub const FAIL_ON_TIMEOUT_GAS: Gas = Gas::from_tgas(2);
/// Gas for the mock's own "fast node" self-call in the auto-reply modes.
pub const AUTO_RESPOND_GAS: Gas = Gas::from_tgas(2);
/// Code constant `SIGN_DEPOSIT_YOCTONEAR` in near/mpc.
pub const SIGN_DEPOSIT: NearToken = NearToken::from_yoctonear(1);
pub const EDDSA_MAX_PAYLOAD: usize = 1232;
/// Protocol `max_yield_payload_size`.
pub const MAX_YIELD_PAYLOAD: usize = 1024;
/// secp256k1 group order n, big-endian.
pub const SECP256K1_N: [u8; 32] = [
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe,
    0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36, 0x41, 0x41,
];

pub const ERR_TIMED_OUT: &str = "Request has timed out.";
pub const ERR_UNKNOWN_REQUEST: &str =
    "This sign request has timed out, was completed, or never existed.";
pub const ERR_NOT_ACCEPTING: &str = "Due to previously failed TEE validation, the network is not accepting new requests at this point in time. Try again later.";

/// How the mock "MPC network" behaves for new requests.
#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Mode {
    /// Yield, then answer with a well-formed fake signature in the next block (a fast node).
    #[default]
    Reply,
    /// Yield and wait for the test to call `respond*` (or for the 200-block timeout).
    Manual,
    /// Yield and never answer; `respond*` is refused, so only the timeout can resolve it.
    Never,
    /// Yield, then answer with bytes that are not JSON.
    Garbage,
    /// Yield, then answer with valid JSON of the wrong shape.
    WrongShape,
    /// Refuse every request after the gas/deposit checks (the MPC-side failure path).
    Panic,
}

/// `payload_v2`: externally tagged, hex without `0x` (`{"Ecdsa":"…"}` / `{"Eddsa":"…"}`).
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Payload {
    Ecdsa(String),
    Eddsa(String),
}

/// `dtos::SignRequestArgs` (3.17.0): the v2 fields plus the deprecated legacy pair.
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct SignRequestArgs {
    pub path: String,
    #[serde(default)]
    pub payload_v2: Option<Payload>,
    #[serde(default, rename = "payload")]
    pub deprecated_payload: Option<Vec<u8>>,
    #[serde(default)]
    pub domain_id: Option<u64>,
    #[serde(default, rename = "key_version")]
    pub deprecated_key_version: Option<u64>,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    Responded,
    TimedOut,
}

/// One accepted `sign` request, as the mock saw it.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct RequestLog {
    pub request_id: u64,
    pub predecessor: AccountId,
    pub signer: AccountId,
    pub path: String,
    pub payload_v2: Payload,
    pub domain_id: u64,
    pub prepaid_gas: U64,
    pub attached_deposit: U128,
    pub block_height: u64,
    /// Each `sign` receipt is a single FunctionCall action: the number of actions is not observable
    /// from inside, but the receipt id is, so tests can check that n requests came in n receipts.
    pub receipt_marker: String,
    pub outcome: Outcome,
    /// The exact bytes resumed into the yield (UTF-8 lossy), once answered.
    pub response: Option<String>,
}

#[near(serializers = [borsh])]
pub struct PendingRequest {
    pub yield_id: YieldId,
    pub payload: Payload,
    pub domain_id: u64,
    pub created_at: u64,
}

#[near(serializers = [json])]
pub struct PendingView {
    pub request_id: u64,
    pub path: String,
    pub domain_id: u64,
    pub created_at: u64,
}

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    Requests,
    Pending,
}

#[near(contract_state)]
pub struct MockSigner {
    mode: Mode,
    requests: Vector<RequestLog>,
    pending: IterableMap<u64, PendingRequest>,
}

impl Default for MockSigner {
    fn default() -> Self {
        Self {
            mode: Mode::Reply,
            requests: Vector::new(StorageKey::Requests),
            pending: IterableMap::new(StorageKey::Pending),
        }
    }
}

#[near]
impl MockSigner {
    /// Optional: the contract also works without init (Default state, mode `reply`).
    #[init]
    pub fn new(mode: Option<Mode>) -> Self {
        Self {
            mode: mode.unwrap_or_default(),
            ..Default::default()
        }
    }

    // ── the real interface ───────────────────────────────────────────────────────────────

    #[payable]
    pub fn sign(&mut self, request: SignRequestArgs) -> Promise {
        let (payload, domain_id) = normalize_args(&request);
        check_domain(domain_id);
        let prepaid = env::prepaid_gas();
        if prepaid < SIGN_GAS_REQUIRED {
            env::panic_str(&format!(
                "Provided gas is lower than required. Provided: {}, required: {}",
                prepaid.as_gas(),
                SIGN_GAS_REQUIRED.as_gas()
            ));
        }
        let attached = env::attached_deposit();
        if attached < SIGN_DEPOSIT {
            env::panic_str(&format!(
                "Attached deposit is lower than required. Attached: {}, required: {}",
                attached.as_yoctonear(),
                SIGN_DEPOSIT.as_yoctonear()
            ));
        }
        if self.mode == Mode::Panic {
            env::panic_str(ERR_NOT_ACCEPTING);
        }
        check_payload_scheme(&payload, domain_id);

        let predecessor = env::predecessor_account_id();
        let excess = attached.saturating_sub(SIGN_DEPOSIT);
        if !excess.is_zero() {
            log!("refund {} to {}", excess.as_yoctonear(), predecessor);
            Promise::new(predecessor.clone()).transfer(excess).detach();
        }

        let request_id = self.requests.len() as u64;
        let (promise, yield_id) = Promise::new_yield(
            "return_signature_and_clean_state_on_success",
            serde_json::to_vec(&json!({ "request_id": request_id })).unwrap_or_default(),
            RETURN_SIGNATURE_GAS,
            GasWeight(0),
        );
        self.requests.push(RequestLog {
            request_id,
            predecessor,
            signer: env::signer_account_id(),
            path: request.path.clone(),
            payload_v2: payload.clone(),
            domain_id,
            prepaid_gas: U64(prepaid.as_gas()),
            attached_deposit: U128(attached.as_yoctonear()),
            block_height: env::block_height(),
            receipt_marker: hex_encode(&env::random_seed()),
            outcome: Outcome::Pending,
            response: None,
        });
        self.pending.insert(
            request_id,
            PendingRequest {
                yield_id,
                payload,
                domain_id,
                created_at: env::block_height(),
            },
        );
        if matches!(self.mode, Mode::Reply | Mode::Garbage | Mode::WrongShape) {
            // weight 1: the self-call takes all leftover gas (an Eddsa payload of a few hundred
            // bytes needs more than the static floor to read, record and resume)
            Self::ext(env::current_account_id())
                .with_static_gas(AUTO_RESPOND_GAS)
                .with_unused_gas_weight(1)
                .auto_respond(request_id, self.mode)
                .detach();
        }
        promise
    }

    /// Yield callback (same name as the real one). Success: return the resumed bytes unchanged.
    /// Timeout: chain to `fail_on_timeout`, so the caller's promise fails.
    #[private]
    pub fn return_signature_and_clean_state_on_success(&mut self, request_id: u64) {
        self.pending.remove(&request_id);
        let result = env::promise_result_checked(0, MAX_YIELD_PAYLOAD);
        let timed_out = result.is_err();
        if let Some(rec) = self.requests.get_mut(request_id as u32) {
            rec.outcome = if timed_out {
                Outcome::TimedOut
            } else {
                Outcome::Responded
            };
        }
        match result {
            Ok(bytes) => env::value_return(&bytes),
            Err(_) => {
                let _ = Self::ext(env::current_account_id())
                    .with_static_gas(FAIL_ON_TIMEOUT_GAS)
                    .with_unused_gas_weight(0)
                    .fail_on_timeout()
                    .as_return();
            }
        }
    }

    #[private]
    pub fn fail_on_timeout(&self) {
        env::panic_str(ERR_TIMED_OUT);
    }

    pub fn version(&self) -> String {
        VERSION.to_string()
    }

    // ── test "MPC node" hooks ────────────────────────────────────────────────────────────

    pub fn set_mode(&mut self, mode: Mode) {
        self.mode = mode;
    }

    pub fn mode(&self) -> Mode {
        self.mode
    }

    /// Resume request `request_id` with `response` serialized as JSON.
    pub fn respond(&mut self, request_id: u64, response: Value) -> bool {
        let bytes = serde_json::to_vec(&response).unwrap_or_default();
        self.resume(request_id, bytes)
    }

    /// Resume with arbitrary raw bytes (UTF-8 of `data`), e.g. non-JSON garbage.
    pub fn respond_raw(&mut self, request_id: u64, data: String) -> bool {
        self.resume(request_id, data.into_bytes())
    }

    /// Resume with a well-formed fake signature for the request's scheme.
    pub fn respond_valid(&mut self, request_id: u64) -> bool {
        let p = self
            .pending
            .get(&request_id)
            .unwrap_or_else(|| env::panic_str(ERR_UNKNOWN_REQUEST));
        let v = fake_signature(&p.payload, request_id);
        self.respond(request_id, v)
    }

    /// Resume every pending request with a well-formed fake signature. Returns how many.
    pub fn respond_all_valid(&mut self) -> u32 {
        let ids: Vec<u64> = self.pending.keys().copied().collect();
        let mut n = 0;
        for id in ids {
            if self.respond_valid(id) {
                n += 1;
            }
        }
        n
    }

    #[private]
    pub fn auto_respond(&mut self, request_id: u64, mode: Mode) {
        let Some(p) = self.pending.get(&request_id) else {
            log!("auto_respond: request {} no longer pending", request_id);
            return;
        };
        let bytes = match mode {
            Mode::Garbage => b"\xffnot json at all".to_vec(),
            Mode::WrongShape => {
                serde_json::to_vec(&json!({"scheme":"Secp256k1","big_r":"oops","s":7}))
                    .unwrap_or_default()
            }
            _ => serde_json::to_vec(&fake_signature(&p.payload, request_id)).unwrap_or_default(),
        };
        let yield_id = p.yield_id;
        self.record_response(request_id, &bytes);
        if yield_id.resume(&bytes).is_err() {
            log!("auto_respond: resume failed for {}", request_id);
        }
    }

    // ── views ────────────────────────────────────────────────────────────────────────────

    pub fn request_count(&self) -> u64 {
        self.requests.len() as u64
    }

    pub fn requests(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<RequestLog> {
        let from = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(100);
        (from..(from.saturating_add(limit)).min(self.requests.len() as u64))
            .filter_map(|i| self.requests.get(i as u32).cloned())
            .collect()
    }

    pub fn pending_requests(&self) -> Vec<PendingView> {
        self.pending
            .iter()
            .map(|(id, p)| PendingView {
                request_id: *id,
                path: self
                    .requests
                    .get(*id as u32)
                    .map(|r| r.path.clone())
                    .unwrap_or_default(),
                domain_id: p.domain_id,
                created_at: p.created_at,
            })
            .collect()
    }

    /// The fake signature `respond_valid` / mode `reply` would return for this payload and id.
    pub fn fake_signature_for(&self, payload: Payload, request_id: u64) -> Value {
        fake_signature(&payload, request_id)
    }
}

impl MockSigner {
    fn resume(&mut self, request_id: u64, bytes: Vec<u8>) -> bool {
        if self.mode == Mode::Never {
            env::panic_str("mock-signer: mode `never` ignores respond");
        }
        if bytes.len() > MAX_YIELD_PAYLOAD {
            env::panic_str("mock-signer: response exceeds max_yield_payload_size (1024)");
        }
        let yield_id = self
            .pending
            .get(&request_id)
            .map(|p| p.yield_id)
            .unwrap_or_else(|| env::panic_str(ERR_UNKNOWN_REQUEST));
        self.record_response(request_id, &bytes);
        if yield_id.resume(&bytes).is_err() {
            env::panic_str(ERR_UNKNOWN_REQUEST);
        }
        true
    }

    fn record_response(&mut self, request_id: u64, bytes: &[u8]) {
        if let Some(rec) = self.requests.get_mut(request_id as u32) {
            rec.response = Some(String::from_utf8_lossy(bytes).into_owned());
        }
    }
}

// ── pure helpers (unit-tested) ───────────────────────────────────────────────────────────

/// Resolve the (payload, domain) pair like `SignRequestArgs` handling in 3.17.0.
pub fn normalize_args(r: &SignRequestArgs) -> (Payload, u64) {
    if r.payload_v2.is_some() && r.deprecated_payload.is_some() {
        env::panic_str("payload_v2 and payload are mutually exclusive");
    }
    if r.domain_id.is_some() && r.deprecated_key_version.is_some() {
        env::panic_str("domain_id and key_version are mutually exclusive");
    }
    let domain_id = r.domain_id.or(r.deprecated_key_version).unwrap_or(0);
    let payload = match (&r.payload_v2, &r.deprecated_payload) {
        (Some(p), None) => p.clone(),
        (None, Some(bytes)) => {
            if bytes.len() != 32 {
                deser_panic(&format!(
                    "invalid length {}, expected an array of length 32",
                    bytes.len()
                ));
            }
            Payload::Ecdsa(hex_encode(bytes))
        }
        _ => deser_panic("missing field `payload_v2`"),
    };
    // Bounds are enforced while deserializing in the real contract.
    match &payload {
        Payload::Ecdsa(h) => {
            let b = hex_decode(h).unwrap_or_else(|e| deser_panic(&e));
            if b.len() < 32 {
                deser_panic(&format!(
                    "Lower bound violation: got {} (expected >= 32)",
                    b.len()
                ));
            }
            if b.len() > 32 {
                deser_panic(&format!(
                    "Upper bound violation: got {} (expected <= 32)",
                    b.len()
                ));
            }
        }
        Payload::Eddsa(h) => {
            let b = hex_decode(h).unwrap_or_else(|e| deser_panic(&e));
            if b.len() > EDDSA_MAX_PAYLOAD {
                deser_panic(&format!(
                    "Upper bound violation: got {} (expected <= {})",
                    b.len(),
                    EDDSA_MAX_PAYLOAD
                ));
            }
        }
    }
    (payload, domain_id)
}

fn deser_panic(msg: &str) -> ! {
    env::panic_str(&format!(
        "Failed to deserialize input from JSON. Error: `{msg}`"
    ))
}

/// Domains of the live network: 0 secp256k1/Sign, 1 ed25519/Sign, 2 CKD, 3 ForeignTx.
pub fn check_domain(domain_id: u64) {
    match domain_id {
        0 | 1 => {}
        2 => env::panic_str("Domain 2 has purpose CKD, but this method requires Sign."),
        3 => env::panic_str("Domain 3 has purpose ForeignTx, but this method requires Sign."),
        d => env::panic_str(&format!("The provided domain ID, {d}, was not found.")),
    }
}

pub fn check_payload_scheme(payload: &Payload, domain_id: u64) {
    match (domain_id, payload) {
        (0, Payload::Ecdsa(h)) => {
            let b = hex_decode(h).unwrap_or_default();
            if b.as_slice() >= SECP256K1_N.as_slice() {
                env::panic_str("Ecdsa payload cannot be converted to Scalar");
            }
        }
        (0, _) => env::panic_str("Payload is not Ecdsa"),
        (1, Payload::Eddsa(_)) => {}
        (1, _) => env::panic_str("Payload is not EdDSA"),
        _ => env::panic_str("unreachable domain"),
    }
}

/// A well-formed fake MPC response for `payload` (deterministic per (payload, request_id), like a
/// fresh real signature each time). secp256k1: `s` < n/2 (low-S) and a 02/03 `big_r` prefix that is
/// deliberately independent of `recovery_id` (they disagree in practice, kb/10 §TL;DR 10).
pub fn fake_signature(payload: &Payload, request_id: u64) -> Value {
    let (tag, h) = match payload {
        Payload::Ecdsa(h) => ("ecdsa", h),
        Payload::Eddsa(h) => ("eddsa", h),
    };
    let seed = format!("{tag}:{request_id}:{}", h.to_ascii_lowercase());
    let a = env::sha256_array(format!("a:{seed}").as_bytes());
    let b = env::sha256_array(format!("b:{seed}").as_bytes());
    match payload {
        Payload::Ecdsa(_) => {
            let prefix = if a[31] & 1 == 0 { "02" } else { "03" };
            let mut s = b;
            s[0] &= 0x3f; // < 2^254 < n/2
            json!({
                "scheme": "Secp256k1",
                "big_r": { "affine_point": format!("{prefix}{}", hex_encode(&a)) },
                "s": { "scalar": hex_encode(&s) },
                "recovery_id": (b[31] >> 1) & 1,
            })
        }
        Payload::Eddsa(_) => {
            let mut sig = a.to_vec();
            sig.extend_from_slice(&b);
            json!({ "scheme": "Ed25519", "signature": sig })
        }
    }
}

pub fn hex_encode(b: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(b.len() * 2);
    for x in b {
        s.push(HEX[(x >> 4) as usize] as char);
        s.push(HEX[(x & 15) as usize] as char);
    }
    s
}

/// Case-insensitive hex, no `0x` (the MPC rejects a prefix: "Invalid character 'x' at position 1").
pub fn hex_decode(s: &str) -> Result<Vec<u8>, String> {
    fn nib(c: u8, i: usize) -> Result<u8, String> {
        match c {
            b'0'..=b'9' => Ok(c - b'0'),
            b'a'..=b'f' => Ok(c - b'a' + 10),
            b'A'..=b'F' => Ok(c - b'A' + 10),
            _ => Err(format!(
                "Invalid character '{}' at position {}",
                c as char, i
            )),
        }
    }
    let bytes = s.as_bytes();
    if !bytes.len().is_multiple_of(2) {
        return Err("Odd number of digits".into());
    }
    (0..bytes.len() / 2)
        .map(|i| Ok(nib(bytes[2 * i], 2 * i)? << 4 | nib(bytes[2 * i + 1], 2 * i + 1)?))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, accounts};
    use near_sdk::testing_env;

    fn ctx(gas_tgas: u64, deposit: u128) {
        let mut b = VMContextBuilder::new();
        b.current_account_id("mpc.test.near".parse().unwrap())
            .predecessor_account_id(accounts(1))
            .signer_account_id(accounts(2))
            .prepaid_gas(Gas::from_tgas(gas_tgas))
            .attached_deposit(NearToken::from_yoctonear(deposit));
        testing_env!(b.build());
    }

    fn req(payload: Payload, domain: u64) -> SignRequestArgs {
        SignRequestArgs {
            path: "satchel/1/evm".into(),
            payload_v2: Some(payload),
            deprecated_payload: None,
            domain_id: Some(domain),
            deprecated_key_version: None,
        }
    }

    fn ecdsa() -> Payload {
        Payload::Ecdsa("bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377".into())
    }

    #[test]
    fn request_json_shape_parses() {
        let v: SignRequestArgs = serde_json::from_str(
            r#"{"path":"satchel/1/sol","payload_v2":{"Eddsa":"0100"},"domain_id":1}"#,
        )
        .unwrap();
        assert_eq!(v.payload_v2, Some(Payload::Eddsa("0100".into())));
        assert_eq!(v.domain_id, Some(1));
        let p = serde_json::to_value(ecdsa()).unwrap();
        assert!(p.get("Ecdsa").is_some());
    }

    #[test]
    fn fake_secp_shape_and_low_s() {
        ctx(15, 1);
        let v = fake_signature(&ecdsa(), 0);
        assert_eq!(v["scheme"], "Secp256k1");
        let r = v["big_r"]["affine_point"].as_str().unwrap();
        assert_eq!(r.len(), 66);
        assert!(r.starts_with("02") || r.starts_with("03"));
        let s = hex_decode(v["s"]["scalar"].as_str().unwrap()).unwrap();
        assert_eq!(s.len(), 32);
        assert!(s[0] < 0x7f, "low-S");
        assert!(v["recovery_id"].as_u64().unwrap() <= 1);
        // new signature per request id
        assert_ne!(fake_signature(&ecdsa(), 1), v);
    }

    #[test]
    fn fake_ed25519_shape() {
        ctx(15, 1);
        let v = fake_signature(&Payload::Eddsa("01".into()), 3);
        assert_eq!(v["scheme"], "Ed25519");
        let sig = v["signature"].as_array().unwrap();
        assert_eq!(sig.len(), 64);
        assert!(sig.iter().all(|x| x.as_u64().unwrap() <= 255));
        assert!(v.get("recovery_id").is_none());
    }

    #[test]
    fn hex_rules() {
        assert_eq!(hex_decode("0aFF").unwrap(), vec![0x0a, 0xff]);
        assert!(
            hex_decode("0x00")
                .unwrap_err()
                .contains("Invalid character 'x' at position 1")
        );
        assert!(hex_decode("abc").is_err());
        assert_eq!(hex_encode(&[0, 171]), "00ab");
    }

    #[test]
    #[should_panic(
        expected = "Provided gas is lower than required. Provided: 14999999999999, required: 15000000000000"
    )]
    fn gas_floor_exact() {
        let mut b = VMContextBuilder::new();
        b.prepaid_gas(Gas::from_gas(14_999_999_999_999))
            .attached_deposit(NearToken::from_yoctonear(1));
        testing_env!(b.build());
        let _ = MockSigner::default().sign(req(ecdsa(), 0));
    }

    #[test]
    #[should_panic(expected = "Attached deposit is lower than required. Attached: 0, required: 1")]
    fn deposit_floor() {
        ctx(15, 0);
        let _ = MockSigner::default().sign(req(ecdsa(), 0));
    }

    #[test]
    #[should_panic(expected = "Payload is not Ecdsa")]
    fn eddsa_on_domain_0() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(Payload::Eddsa("00".into()), 0));
    }

    #[test]
    #[should_panic(expected = "Payload is not EdDSA")]
    fn ecdsa_on_domain_1() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(ecdsa(), 1));
    }

    #[test]
    #[should_panic(expected = "Domain 3 has purpose ForeignTx, but this method requires Sign.")]
    fn foreign_tx_domain() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(ecdsa(), 3));
    }

    #[test]
    #[should_panic(expected = "The provided domain ID, 99, was not found.")]
    fn unknown_domain() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(ecdsa(), 99));
    }

    #[test]
    #[should_panic(expected = "Ecdsa payload cannot be converted to Scalar")]
    fn ecdsa_payload_ge_n() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(Payload::Ecdsa(hex_encode(&SECP256K1_N)), 0));
    }

    #[test]
    #[should_panic(expected = "Lower bound violation: got 31 (expected >= 32)")]
    fn ecdsa_short() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(Payload::Ecdsa("00".repeat(31)), 0));
    }

    #[test]
    #[should_panic(expected = "Upper bound violation: got 1233 (expected <= 1232)")]
    fn eddsa_too_long() {
        ctx(15, 1);
        let _ = MockSigner::default().sign(req(Payload::Eddsa("00".repeat(1233)), 1));
    }

    #[test]
    #[should_panic(expected = "Due to previously failed TEE validation")]
    fn panic_mode_refuses() {
        ctx(15, 1);
        let mut m = MockSigner::default();
        m.set_mode(Mode::Panic);
        let _ = m.sign(req(ecdsa(), 0));
    }

    #[test]
    fn accepted_request_is_logged_and_pending() {
        ctx(300, 5);
        let mut m = MockSigner::default();
        m.set_mode(Mode::Manual);
        let _ = m.sign(req(ecdsa(), 0));
        assert_eq!(m.request_count(), 1);
        let r = &m.requests(None, None)[0];
        assert_eq!(r.predecessor, accounts(1));
        assert_eq!(r.path, "satchel/1/evm");
        assert_eq!(r.domain_id, 0);
        assert_eq!(r.attached_deposit, U128(5));
        assert_eq!(r.prepaid_gas, U64(Gas::from_tgas(300).as_gas()));
        assert_eq!(r.outcome, Outcome::Pending);
        assert_eq!(m.pending_requests().len(), 1);
        // 1232-byte Eddsa and empty Eddsa are accepted
        let _ = m.sign(req(Payload::Eddsa("ab".repeat(1232)), 1));
        let _ = m.sign(req(Payload::Eddsa(String::new()), 1));
        assert_eq!(m.request_count(), 3);
    }

    #[test]
    fn legacy_args_normalize() {
        ctx(15, 1);
        let r = SignRequestArgs {
            path: "p".into(),
            payload_v2: None,
            deprecated_payload: Some(vec![7; 32]),
            domain_id: None,
            deprecated_key_version: Some(0),
        };
        let (p, d) = normalize_args(&r);
        assert_eq!(p, Payload::Ecdsa("07".repeat(32)));
        assert_eq!(d, 0);
    }

    #[test]
    #[should_panic(expected = "This sign request has timed out, was completed, or never existed.")]
    fn respond_unknown() {
        ctx(15, 1);
        MockSigner::default().respond(42, json!({}));
    }
}
