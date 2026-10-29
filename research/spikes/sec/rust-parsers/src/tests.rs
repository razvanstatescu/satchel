use crate::vectors::VECTORS;
use sha2::{Digest, Sha256};
use sha3::Keccak256;

#[test]
fn vectors_agree_with_js_reference() {
    let mut n = 0;
    for v in VECTORS {
        let bytes = hex::decode(v.hex).unwrap();
        match v.kind {
            "evm" => {
                let r = crate::evm::classify(&bytes, &[11_155_111]);
                assert_eq!(r.is_ok(), v.ok, "{}: {:?}", v.name, r);
                if let Ok(t) = r {
                    assert_eq!(hex::encode(Keccak256::digest(&bytes)), v.hash, "{} hash", v.name);
                    assert_eq!(t.chain_id.to_string(), v.a);
                    assert_eq!(t.nonce.to_string(), v.b);
                    let (val, to) = v.c.split_once('|').unwrap();
                    assert_eq!(t.value.to_string(), val);
                    assert_eq!(hex::encode(t.to), to);
                }
            }
            "btc" => {
                let r = crate::btc::classify(&bytes);
                assert_eq!(r.is_ok(), v.ok, "{}: {:?}", v.name, r);
                if let Ok(t) = r {
                    let h = Sha256::digest(Sha256::digest(&bytes));
                    assert_eq!(hex::encode(h), v.hash, "{} sha256d", v.name);
                    assert_eq!(hex::encode(t.txid), v.a);
                    assert_eq!(t.vout.to_string(), v.b);
                    assert_eq!(t.amount_sats.to_string(), v.c);
                }
            }
            "sol" => {
                let r = crate::sol::classify(&bytes);
                assert_eq!(r.is_ok(), v.ok, "{}: {:?}", v.name, r.as_ref().err());
                if let Ok(t) = r {
                    assert_eq!(hex::encode(t.recent_blockhash), v.a);
                    assert_eq!(t.total_lamports.to_string(), v.b);
                    assert_eq!(hex::encode(t.transfers[0].0), v.c);
                }
            }
            _ => unreachable!(),
        }
        println!("ok {:<28} expect_ok={}", v.name, v.ok);
        n += 1;
    }
    assert_eq!(n, VECTORS.len());
}
