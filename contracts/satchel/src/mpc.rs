//! MPC wire types (own ~30 lines; kb/10 §Crate or own types), request builder and a panic-free response parser.

use near_sdk::serde_json::Value;
use near_sdk::near;

use crate::types::Chain;

/// Externally tagged: `{"Ecdsa":"<64 hex>"}` / `{"Eddsa":"<message hex>"}`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub enum MpcPayload {
    Ecdsa(String),
    Eddsa(String),
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MpcSignRequest {
    pub path: String,
    pub payload_v2: MpcPayload,
    pub domain_id: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct K256AffinePoint {
    pub affine_point: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct K256Scalar {
    pub scalar: String,
}

#[near(serializers = [json])]
#[serde(tag = "scheme")]
#[derive(Clone, Debug)]
pub enum MpcSignature {
    Secp256k1 { big_r: K256AffinePoint, s: K256Scalar, recovery_id: u8 },
    Ed25519 { signature: Vec<u8> },
}

/// Args of the MPC `sign` call: `{"request":{…}}`.
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct MpcSignArgs {
    pub request: MpcSignRequest,
}

pub fn derivation_path(token_id: &str, chain: Chain) -> String {
    ["satchel/", token_id, "/", chain.slug()].concat()
}

fn hex32(s: &str) -> Option<[u8; 32]> {
    let v = hex::decode(s).ok()?;
    v.try_into().ok()
}

/// Turn the MPC JSON into the fixed 65-byte record slot. Never panics.
/// secp256k1: r(32) ‖ s(32) ‖ recovery_id (r = affine_point without its 02/03 prefix; recovery_id ∈ {0,1}).
/// ed25519: R‖S (64) ‖ 0x00. The scheme must match the chain's domain, otherwise `None` (→ Unparsed).
pub fn extract_signature_65(v: &Value, chain: Chain) -> Option<[u8; 65]> {
    let sig: MpcSignature = near_sdk::serde_json::from_value(v.clone()).ok()?;
    let mut out = [0u8; 65];
    match (sig, chain) {
        (MpcSignature::Secp256k1 { big_r, s, recovery_id }, Chain::Btc | Chain::Evm) => {
            let r = hex::decode(&big_r.affine_point).ok()?;
            if r.len() != 33 || !(r[0] == 0x02 || r[0] == 0x03) || recovery_id > 1 {
                return None;
            }
            out[..32].copy_from_slice(&r[1..]);
            out[32..64].copy_from_slice(&hex32(&s.scalar)?);
            out[64] = recovery_id;
            Some(out)
        }
        (MpcSignature::Ed25519 { signature }, Chain::Sol) => {
            if signature.len() != 64 {
                return None;
            }
            out[..64].copy_from_slice(&signature);
            Some(out)
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::serde_json::{self, json};

    #[test]
    fn request_json_shape() {
        let r = MpcSignRequest {
            path: derivation_path("1", Chain::Evm),
            payload_v2: MpcPayload::Ecdsa("bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377".into()),
            domain_id: 0,
        };
        assert_eq!(
            serde_json::to_string(&MpcSignArgs { request: r }).unwrap(),
            r#"{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377"},"domain_id":0}}"#
        );
        let e = serde_json::to_value(MpcPayload::Eddsa("0100".into())).unwrap();
        assert_eq!(e, json!({"Eddsa":"0100"}));
    }

    #[test]
    fn parses_kb_secp_response() {
        let v = json!({"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1});
        let sig = extract_signature_65(&v, Chain::Evm).unwrap();
        assert_eq!(hex::encode(&sig[..32]), "f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c");
        assert_eq!(hex::encode(&sig[32..64]), "549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1");
        assert_eq!(sig[64], 1);
        assert!(extract_signature_65(&v, Chain::Btc).is_some());
        assert!(extract_signature_65(&v, Chain::Sol).is_none(), "scheme must match the domain");
    }

    #[test]
    fn parses_ed25519_and_rejects_garbage() {
        let bytes: Vec<u8> = (0..64).collect();
        let v = json!({"scheme":"Ed25519","signature": bytes});
        let sig = extract_signature_65(&v, Chain::Sol).unwrap();
        assert_eq!(&sig[..64], &bytes[..]);
        assert_eq!(sig[64], 0);
        assert!(extract_signature_65(&v, Chain::Evm).is_none());
        for bad in [
            json!(null),
            json!("x"),
            json!({"scheme":"Ed25519","signature":[1,2,3]}),
            json!({"scheme":"Ed25519","signature":[300]}),
            json!({"scheme":"Secp256k1","big_r":{"affine_point":"04aa"},"s":{"scalar":"00"},"recovery_id":0}),
            json!({"scheme":"Secp256k1","big_r":{"affine_point":"05f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":0}),
            json!({"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":2}),
            json!({"scheme":"Other"}),
        ] {
            assert!(extract_signature_65(&bad, Chain::Sol).is_none() && extract_signature_65(&bad, Chain::Evm).is_none(), "{bad}");
        }
    }
}
