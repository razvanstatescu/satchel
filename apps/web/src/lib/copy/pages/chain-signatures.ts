import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/** A code sample: a caption (the figure's name), the language label and the text. Rendered by `CodeBlock`. */
export interface CodeCopy {
  caption: string;
  lang: string;
  code: string;
}

/**
 * Copy for /chain-signatures (docs/design/seo/keyword-research.md §2 entries 7 and 10; claims register CR-12, CR-14, CR-17,
 * CR-46). A developer case study: the facts come from docs/near.md, docs/how-it-works.md and kb/90 §5.8, and the snippets are
 * short excerpts of contracts/satchel/src (sign.rs, mpc.rs, types.rs), marked "Simplified" where lines are left out.
 * The copy tests ban the three-letter abbreviation for the signer network and a few units, so this page spells it out
 * ("NEAR's signer network", "multi-party computation") and keeps those words out of the code too.
 */
export const chainSignatures = {
  answer:
    "NEAR Chain Signatures let a NEAR account sign transactions for other blockchains, such as Bitcoin, Ethereum and Solana. Satchel is a worked example. In Satchel, each NFT owns its own derivation path, so one NEAR contract signs on three chains.",
  sections: {
    what: {
      h2: "What NEAR Chain Signatures are",
      body: [
        "NEAR Chain Signatures are a service of NEAR's signer network. A group of nodes jointly holds a root key, using multi-party computation. No single node has the whole key. The nodes answer requests from NEAR accounts. The [NEAR docs](https://docs.near.org/chain-abstraction/chain-signatures) cover the full design.",
        "A contract calls the network's `sign` method with three things: a derivation path, a payload and a domain id. The network adds a tweak to the root key. The tweak comes from the caller's account name and the path. The result is a key pair that belongs to that account and path, and only that account can ask for its signatures.",
        "That key pair has a public key, so it has addresses on other chains. A NEAR contract can own a Bitcoin address, an Ethereum address and a Solana address, and no one holds a private key for them. You do trust the signer network, because it makes every signature.",
      ],
    },
    paths: {
      h2: "One contract, one path per token and chain",
      lead: "Satchel always calls the signer network as the contract itself. The path says which token and which chain the signature is for.",
      table: {
        caption: "Derivation path, domain and curve for each chain a Satchel signs on",
        head: ["Chain", "Path for token N", "Domain", "Curve", "What the contract hashes"],
        rows: [
          ["Bitcoin", "satchel/N/btc", "0", "secp256k1", "Each input's BIP143 preimage, twice with SHA-256"],
          ["Ethereum", "satchel/N/evm", "0", "secp256k1", "The type-2 transaction, with keccak256"],
          ["Solana", "satchel/N/sol", "1", "ed25519", "Nothing: the signer signs the message bytes"],
        ],
      } satisfies TableCopy,
      afterTable: [
        "Token 7's Solana key lives at `satchel/7/sol`. Because the contract is the caller, no one else can ask for a signature on that path. The contract asks only for the token's current owner, or for an account the owner has let spend within daily caps.",
        "Addresses don't need a network call. Satchel's TypeScript package reproduces the tweak, so a page can show a Satchel's addresses before anything is signed. A buyer's check also compares them with the signer network's own `derived_public_key` view.",
        "This is the request the contract sends. Hex is shortened for the Bitcoin and Solana lines.",
      ],
      code: {
        caption: "The sign request, one per payload, as the contract sends it",
        lang: "json",
        code: `{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377"},"domain_id":0}}
{"request":{"path":"satchel/1/btc","payload_v2":{"Ecdsa":"<sha256d of one input's preimage>"},"domain_id":0}}
{"request":{"path":"satchel/1/sol","payload_v2":{"Eddsa":"<hex of the whole message>"},"domain_id":1}}`,
      } satisfies CodeCopy,
      afterCode: [
        "In the contract the path is one line, and the request is a small struct.",
      ],
      code2: {
        caption: "The path and the request type (contracts/satchel/src/mpc.rs, simplified)",
        lang: "rust",
        code: `pub fn derivation_path(token_id: &str, chain: Chain) -> String {
    ["satchel/", token_id, "/", chain.slug()].concat() // "satchel/7/sol"
}

pub struct MpcSignRequest {
    pub path: String,
    pub payload_v2: MpcPayload, // Ecdsa(hex hash) or Eddsa(hex message)
    pub domain_id: u64,         // 0 for secp256k1, 1 for ed25519
}`,
      } satisfies CodeCopy,
    },
    payload: {
      h2: "A structured payload, never a raw hash",
      body: [
        "The simple way to build a signer contract is to accept a 32-byte hash and pass it on. Satchel doesn't do that. The caller sends the unsigned transaction itself, and the contract parses the exact bytes and hashes them.",
      ],
      code: {
        caption: "What the caller may send (contracts/satchel/src/types.rs, simplified)",
        lang: "rust",
        code: `pub enum SignRequest {
    Evm { unsigned_tx: String },                     // 0x02 type-2 transaction
    Btc { preimages: Vec<String>, outputs: String }, // BIP143 preimages + outputs
    Sol { message: String },                         // legacy message bytes
    // plus plain-text message variants
}

// sign_for args: {"token_id":"1","request":{"evm":{"unsigned_tx":"02ee83aa36a7…80c0"}}}`,
      } satisfies CodeCopy,
      afterCode: [
        "The contract hashes with the host functions: keccak256 for Ethereum, SHA-256 twice per Bitcoin input, and the raw message for Solana. It accepts only plain ETH and USDC transfers, standard Bitcoin spends, plain SOL transfers and plain-text messages. It refuses raw hashes, EIP-712 permits, EIP-7702 authorizations, any other contract call and Solana durable nonces.",
        "Why does it matter? A contract that signs raw hashes is a blind signer. It can't say what a signature does, and neither can anyone reading its log. Because Satchel parses the bytes first, the record says exactly what was signed. That record is what makes [clean history](/clean-history) possible.",
      ],
    },
    record: {
      h2: "The record is written before the signer network is called",
      body: [
        "A request that times out can still produce a valid signature later. If the contract wrote its record afterwards, that signature would exist with no trace. So `sign_for` writes one record per signature first, in the same receipt that makes the call.",
      ],
      code: {
        caption: "The order inside sign_for (contracts/satchel/src/sign.rs, simplified)",
        lang: "rust",
        code: `pub fn sign_for(&mut self, token_id: TokenId, request: SignRequest, mpc_deposit: Option<U128>) {
    // 1. only the owner (or an allowed spender) may call; refuse while listed
    // 2. parse the exact bytes, refuse anything unrecognised, hash them here
    let c = parse::classify(&request).unwrap_or_else(|code| fail(code));
    // 3. write one record per signature BEFORE the signer network is called
    for (i, it) in c.items.iter().enumerate() {
        self.sig_log.insert(
            (token_id.clone(), first_seq + i as u64),
            SigRecord { payload: it.record_payload, detail: it.detail.clone(),
                        status: SigStatus::Pending, signature: [0u8; 65], /* … */ },
        );
    }
    st.sig_count += n64;
    // 4. only now ask the signer network: one call per payload, joined
    let joint = env::promise_and(&calls);
    let cb = promise::then_call(joint, &env::current_account_id(), "on_signed", /* … */);
    env::promise_return(cb);
}`,
      } satisfies CodeCopy,
      afterCode: [
        "A signature request is also an event on NEAR. Timed-out requests stay on the record. A buyer can read every record with the `sig_records` view, and the chain a record names shows whether the signature can still move coins.",
      ],
    },
    fanout: {
      h2: "Fan-out and the callback",
      subs: [
        {
          h3: "Several signatures in one call",
          body: [
            "A Bitcoin spend with two inputs needs two signatures. Putting two signer calls as separate actions in one transaction makes both time out. So the contract makes one single-action call per payload and joins them with `promise_and`. One callback, `on_signed`, receives all the results.",
          ],
        },
        {
          h3: "The callback only fills in the result",
          body: [
            "`on_signed` is for the user experience, not for safety. It reads the raw bytes of each result, with a size cap, and never panics. It marks each record Signed, Unparsed or Failed. A Failed record still counts as issued, because a signature may still exist.",
          ],
        },
      ],
      code: {
        caption: "The callback (contracts/satchel/src/sign.rs, simplified)",
        lang: "rust",
        code: `#[private]
pub fn on_signed(&mut self, token_id: TokenId, first_seq: u64, n: u32) -> Vec<Option<Value>> {
    for i in 0..count {
        // raw bytes, size-capped: a parse failure can never revert anything
        let (status, sig) = match env::promise_result_checked(i, MAX_MPC_RESPONSE) {
            Ok(bytes) => /* parse r, s and recovery_id: Signed or Unparsed */,
            Err(_) => (SigStatus::Failed, None), // rejected or timed out
        };
        if let Some(rec) = self.sig_log.get_mut(&key)
            && rec.status == SigStatus::Pending
        {
            rec.status = status;
            rec.signature = sig.unwrap_or([0u8; 65]);
        }
    }
}`,
      } satisfies CodeCopy,
      afterCode: [
        "Two details trip people up. The Ethereum parity bit is the signer's `recovery_id`, never the prefix byte of `big_r`. And the signer's `s` value is already in low-S form. A secp256k1 record stores `r`, `s` and the recovery id in 65 bytes.",
        "Signing usually takes about 10 seconds. The network allows up to about 2 minutes before a request times out, and under load timeouts happen. A retry of an Ethereum send reuses the same nonce.",
      ],
    },
    native: {
      h2: "Native Bitcoin or wrapped Bitcoin",
      body: [
        "Wrapped bitcoin is a token on another chain that stands for bitcoin held somewhere else. It depends on whoever holds the original coins. The [Chainflip overview of wrapped and native bitcoin](https://blog.chainflip.io/wrapped-bitcoin-vs-native-bitcoin-understanding-the-difference-risks) explains the difference and the risks.",
        "A Satchel's Bitcoin address is on Bitcoin itself. The contract builds a standard P2WPKH spend, the signer network signs each input, and the transaction goes out on the Bitcoin network like any other. There is no bridge and no wrapped token for the chain addresses. The coins are native on their own chains.",
        "The trade is trust. A wrapped token trusts a custodian or a bridge. A Satchel trusts NEAR's signer network, and enough colluding nodes could sign anything.",
      ],
    },
    limits: {
      h2: "What to keep in mind",
      lead: "This is a working example, not a security claim.",
      items: [
        "NEAR's signer network makes every signature. Satchel is new and hasn't been audited.",
        "Each sign request needs a small attached deposit and a minimum amount of gas. The contract checks both before it writes anything.",
        "If the signer network changed its interface, a locked contract could no longer sign. The contract forwards leftover gas and lets the caller raise the deposit to soften this.",
      ],
    },
    see: {
      h2: "See it on a Satchel",
      body: [
        "Open [Satchel #1](/s/1) to see its three addresses, derived from the paths above. Its [Activity tab](/s/1/activity) lists each signature record. The [contract page](/contract) shows the account, its access keys and the code it runs.",
        "For what buyers do with the record, read the guide to [clean history](/clean-history). For a gift that uses the same wallet, read [how to gift crypto without a wallet](/gift-crypto). For a different way to give an NFT an account, read [ERC-6551 compared with Satchel](/erc-6551).",
      ],
    },
  },
  faq: [
    {
      q: "What are NEAR Chain Signatures?",
      a: "NEAR Chain Signatures let a NEAR account get signatures for transactions on other chains, such as Bitcoin and Ethereum. NEAR's signer network makes each signature when a contract asks.",
    },
    {
      q: "Does a Satchel hold a private key?",
      a: "No one holds a seed phrase for a Satchel's addresses. The key exists as shares inside NEAR's signer network, which signs only when the Satchel contract asks.",
    },
    {
      q: "Is a Satchel's bitcoin native or wrapped?",
      a: "Native. A Satchel's Bitcoin address is on the Bitcoin network. There is no bridge and no wrapped token for its chain addresses.",
    },
    {
      q: "Why does the contract not sign raw hashes?",
      a: "A raw hash hides what it signs. The contract takes the unsigned transaction, parses it, refuses what it doesn't recognise and hashes the bytes itself. The record then says what was signed.",
    },
    {
      q: "What happens if a signature request times out?",
      a: "The record is already on NEAR, marked Failed. A timed-out request can still produce a valid signature, so the record counts as issued and clean history treats it that way.",
    },
    {
      q: "Is a Satchel a multi-party computation wallet?",
      a: "Partly. NEAR's signer network uses multi-party computation to make signatures. But the owner is a NEAR account, and the NFT decides who may ask for a signature.",
    },
  ] satisfies FaqEntry[],
} as const;
