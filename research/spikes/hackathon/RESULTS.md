# Spike results: hackathon (rules, submission API, judge capabilities, prior art)

Run on 2026-10-21, 11:20–12:00 UTC, macOS arm64, from a network IP shared with eight other research agents (relevant to every rate-limit observation). No testnet account was used and nothing was signed. The only POSTs were two empty-body probes to the submission API, which cannot be saved.

## Files in this directory
| Path | What |
|---|---|
| `HACKATHON.snapshot.md` | Required snapshot: a header (fetch time, HTTP metadata, SHA-256) followed by the raw `HACKATHON.md` body, byte for byte |
| `snapshots/HACKATHON.raw.md` (+ `.headers.txt`) | Raw body and response headers |
| `snapshots/index.html`, `snapshots/index.text.txt` | Landing page HTML and extracted text |
| `snapshots/js/page-55fe0ffc8b19dd8b.js` (+ other chunks) | Next.js bundle holding the FAQ, prizes, judges and form logic |
| `snapshots/wayback/` | Wayback copies of the landing page from 2026-09-29 (gzip, decoded) and 2026-10-15, plus text extracts |
| `snapshots/x_2112257967818997891.json`, `x_article_gql.json`, `x_article_jina.md`, `x_article_media/` | Official NEAR announcement tweet, its X Article (full text via reader proxy), embedded images |
| `snapshots/x_illia_ideas*.{json,md}` | Illia's 2026-10-03 idea list (linked from the article) |
| `snapshots/prev_*` | Past NEAR devpost hackathon pages and rules (criteria precedent) |
| `snapshots/docs_near_hackathons.*` | docs.near.org/getting-started/hackathons |
| `check_rules.sh` | Re-fetches HACKATHON.md, the landing page and the public counter, then diffs them against the baseline (GET only) |
| `validate_payload.py` | Offline validator for the submission payload (never sends) |
| `judge_snippets.sh` | Tested curl + python3 snippets judges can run without near CLI |
| `vendor/` | Sparse checkouts: multichain-gas-station-contract, lit-peer, tokenbound-contracts, ika |

## 1. Rules fetch and hashes
```
$ date -u; curl -sS -L -D snapshots/HACKATHON.headers.txt -o snapshots/HACKATHON.raw.md \
    -w "http_code=%{http_code} size=%{size_download} ctype=%{content_type}\n" https://nearhackathon.com/HACKATHON.md
2026-10-21T11:20:39Z
http_code=200 size=12588 url=https://nearhackathon.com/HACKATHON.md ctype=text/markdown; charset=utf-8
(headers: server Vercel, x-vercel-cache HIT, age 3576, date Wed, 21 Oct 2026 10:21:04 GMT)
```
SHA-256 values:
```
39fd39392c43c763222bd4b3f184c173817a3998f92cb212630ceba4a67e33bb  HACKATHON.raw.md
460e1589702f236aca4a538aa5826005e6782c7e31b4de2415fbc12d8ddbc942  index.html (deployment dpl_4vS1LnfyVwALQxRWc7Ewwg2M1z9M)
c52e9925fbf2c0cce5a846e01e3546e10c306f15ee979abf40485ca88be8fd8a  index.text.txt
517963408c0ab57b67a3d15cb6f9d0c1a5450a6d7d3480fb4a41db7a40875ca2  js/page-55fe0ffc8b19dd8b.js
2d66017d1f043447ce1d1d82e3e928c4dd678ce33d68695774db54c5fd93783b  x_article_jina.md
afb868a9d9790bd26f8cce939c2a8752fcef4f8fe0ad2187dfbf888417a65c73  x_illia_ideas_jina.md
ea1c5bcc4b0c8d9ee207dffe2c5dffad8e4682a117b8db5f83f2c3a9c1685c06  wayback/home_20260929.txt
779749b5cd28dd717a8706ce03646069d4089dad45bcda119e34aeba7274649e  wayback/home_20261015.txt
7e43177cfeb593240ae164a90b57fce6099c68891f1f62a2b597ba1d97074c10  docs_near_hackathons.txt
```
`tail -n +12 HACKATHON.snapshot.md | shasum -a 256` reproduces `39fd3939…e33bb`. `./check_rules.sh` at 11:37:59Z reported "HACKATHON.md unchanged", no landing-page diff, `{"count":0}`.

Probed and **404**: `/llms.txt /llms-full.txt /robots.txt /sitemap.xml /skill.md /SKILL.md /AGENTS.md /agents.md /agent.md /RULES.md /rules /terms /TERMS.md /FAQ.md /faq /JUDGING.md /judging /prizes /PRIZES.md /privacy /manifest.json /site.webmanifest /.well-known/ai-plugin.json /.well-known/llms.txt`. The Wayback CDX API has no capture of `/HACKATHON.md` or `/agent.md`; the landing page was captured 2026-09-29 (308 then 200) and 2026-10-15.

## 2. Submission API probes (11:22:25Z)
```
$ curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' -d '{}'
HTTP/2 403  cache-control: public, max-age=0, must-revalidate
{"error":"Submissions open 1 Nov 2026 · 00:00 UTC."}

$ curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' \
       -H 'Origin: https://example.com' -H 'Sec-Fetch-Site: cross-site' -d '{}'
HTTP 403
{"error":"Please submit from the application page."}

$ curl -sS https://nearhackathon.com/api/applications
HTTP/2 200  cache-control: no-store
{"count":0}
```
From the bundle, the form logic is `m.current||(m.current=crypto.randomUUID())`, then `fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...t,tracks:…,size:M,consent:e,requestId:m.current})})`, where `t = Object.fromEntries(new FormData(form))` includes the honeypot `website` (hidden, `tabIndex:-1`).

Validator self-test:
```
$ python3 validate_payload.py --selftest
PASS expected-valid   'satchel-team.near' … (6/6 valid pass, 9/9 invalid rejected, incl. uppercase, double dot, trailing dot, leading/trailing hyphen, 65 chars)
sample payload errors: []
bad payload errors: ["extra fields not allowed: ['website'] …", "size: must be one of [...] exactly as written", "tracks: non-empty array of known ids, each listed once"]
```

## 3. Official announcement (X), via the public syndication endpoint and a reader proxy
```
$ curl -sS "https://cdn.syndication.twimg.com/tweet-result?id=2112257967818997891&lang=en&token=4"
created_at 2026-10-19T19:01:58.000Z, @NEARProtocol:
"NEAR HACKATHON is now live with $250K+ in prizes. No signup. Just ship a public repo + public demo post between November 1st & Nov 14, 23:59 UTC. Build on NEAR Intents, chain signatures, chain abstraction, NEAR AI Cloud, & more. Full details: https://x.com/i/article/2112254340060909569"
article.title "NEAR HACKATHON: Build Beyond Boundaries"
```
X's guest GraphQL (`TweetResultByRestId`) returned the title and preview only, not the body. `r.jina.ai/https://x.com/NEARProtocol/article/2112257967818997891` returned the full text (`snapshots/x_article_jina.md`). `@NEAR_hckthn` (named for updates): "0 posts", bio "12 tracks".

## 4. Judge-command verification (near-cli-rs 0.30.1)
The global config was not modified. Tests used `HOME=<scratchpad>/home`, whose freshly generated config had its `testnet` rpc_url pointed at `https://rpc.testnet.near.org/`.
```
$ near account list-keys v1.signer-prod.testnet network-config testnet now   # global default config
Error: Failed to fetch query AccessKeyList … this client has exceeded the rate limit   (0.195 s)

$ curl … archival-rpc.testnet.fastnear.com (view_access_key_list) ×3  -> 429 "Rate limits exceeded. For higher rate limits get a subscription at https://fastnear.com"
$ curl … rpc.testnet.fastnear.com ×3 -> 200 in 0.068/0.070/0.123 s (v1.signer-prod.testnet: 4 keys, 4 full access); later 429
$ curl … rpc.testnet.near.org ×3 -> 200 in 3.086/3.069/3.067 s

$ near account list-keys nft.examples.testnet network-config testnet now          # 3.122 s
| 1 | ed25519:AwxddpngoYod4u6xRJMsgdwbn16xaskGGohnYvU5JKDp | 92968564000002 | full access |
$ near contract call-function as-read-only nft.examples.testnet nft_token json-args '{"token_id":"TYPE_A_UNIQUE_VALUE_HERE"}' network-config testnet now   # 3.223 s
{ "owner_id": "near", "token_id": "TYPE_A_UNIQUE_VALUE_HERE", "approved_account_ids": {}, "metadata": {...}, "royalty": {} }

# Negative tests: an empty key list does NOT prove a lock
$ curl … view_access_key_list satchel-does-not-exist-zz9.testnet -> {"result":{"block_height":274089382,"keys":[]}}
$ near account list-keys satchel-does-not-exist-zz9.testnet … -> empty table, no error
$ curl … view_access_key_list v2.ref-finance.testnet -> keys: []; view_account -> UNKNOWN_ACCOUNT "does not exist while viewing"

$ near account view-account-summary nft.examples.testnet network-config testnet now
 Local Contract (SHA-256 checksum hex)  f38a4eccb1055c6872eda25bdfa4df1858c0df70ca13b10e486f6d780aeae9dc
 Access keys                            1 full access keys and 0 function-call-only access keys
$ near account view-account-summary satchel-does-not-exist-zz9.testnet … -> Error: … does not exist while viewing
$ near account view-account-summary nft.examples.testnet network-config testnet-fastnear now   (while throttled)
 Access keys                            Warning: Failed to retrieve access keys. Retry later.
# base58(code_hash HPgPfGLZotHXxi5VT6YFGuL32Vko4jabiBKffPSjyK4f) -> hex f38a4ecc…eae9dc  (matches the CLI)

$ near config add-connection --network-name testnet --connection-name testnet-drpc --rpc-url https://near-testnet.drpc.org/ … (all optional flags given)
Network connection "testnet-drpc" was successfully added to config.toml   (missing any optional flag -> "The input device is not a TTY")

$ time bash judge_snippets.sh     # against near-testnet.drpc.org
owner_id = near
code sha256 = f38a4eccb1055c6872eda25bdfa4df1858c0df70ca13b10e486f6d780aeae9dc
access keys = 1 (full access: 1 )
real 0.369 s
# negative: account does not exist: account satchel-does-not-exist-zz9.testnet does not exist while viewing (exit 1)
```

RPC endpoint survey (`view_account nft.examples.testnet`):
```
test.rpc.fastnear.com      200  0.075 s
near-testnet.drpc.org      200  0.082 s
testnet-rpc.intea.rs       502  2.56 s  "Requests without an API key are being slowed"
neart.lava.build           410  "This endpoint has been discontinued."
rpc.testnet.near.org       429 at 11:33–11:35Z: "WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW! Switch to https://fastnear.com or alternative RPC providers at https://docs.near.org/api/rpc/providers"
rpc.testnet.near.org       200  3.18 s at 11:58Z (recovered)
```

NearBlocks testnet lag:
```
$ curl https://api-testnet.nearblocks.io/v1/blocks/latest?limit=1   -> 270420307 at 2026-09-27 03:13:30+00:00
$ curl rpc.testnet.fastnear.com status                                -> 274089744 at 2026-10-21T11:34:15Z
$ curl https://test.api.fastnear.com/status                           -> sync_block_height 274091623, sync_latency_sec 2.31
```

## 5. What an AI fetcher sees (Claude WebFetch, 2026-10-21)
| URL | Result |
|---|---|
| `mempool.space/testnet4/tx/fb8c8bdc…f661` | Inputs (tb1q4zyv…90, 0.00369382 BTC), outputs, fee 141 sat. curl with browser UA → 3,070 B `<app-root></app-root>` shell; with UA `Claude-User` → 22,158 B containing the address (prerendered for bots) |
| `mempool.space/testnet4/api/tx/<txid>` | JSON: status `{"confirmed":false}`, first output 10000 sat to tb1qv0rh…3fea |
| `sepolia.etherscan.io/tx/0xa352cf2e…a43b` | Status Success, from, to, value, block 11962144 |
| `testnet.nearblocks.io/txns/J7Umfy…tgXgf` | Success, signer stakin-mpc2.testnet → v1.signer-prod.testnet `respond`, block 270,420,292 (Sep 27) |
| `testnet.mynearwallet.com/profile/nft.examples.testnet` | Only "MyNearWallet" (client-rendered shell) |
| `x.com/NEARProtocol/status/2112257967818997891` | HTTP 402 |
| `help.x.com/en/using-x/x-videos` | 403 (Cloudflare challenge, also via proxy) |
| `learn.chatgpt.com/docs/cloud/internet-access` | "By default, Codex blocks internet access during the agent phase. Setup scripts still run with internet access…" |

## 6. Prior-art evidence
```
$ git clone --depth 1 https://github.com/near/multichain-gas-station-contract.git    # 2d43bf01…, 2024-10-02
nft_key/src/lib.rs: ckt_sign_hash (owner || approval_id match) -> ext_signer.sign(SignRequest::new(payload, "{token_id},{path}", key_version))
                    Hook<Nep171Transfer> -> ckt_revoke_all() which does assert_one_yocto + require_is_token_owner(predecessor)
$ curl drpc … v2.nft.kagi.testnet get_signer_contract_id -> "v1.signer-prod.testnet"; nft_total_supply -> "197"
$ … nft_tokens from_index 190 -> tokens #295–#301 owned by caglavol.testnet ("Chain Key Token #301")
$ curl https://test.api.fastnear.com/v1/account/caglavol.testnet/nft -> v2.nft.kagi.testnet (last_update_block_height 173800217)

$ git clone https://github.com/LIT-Protocol/LitNodeContracts.git -> "repository not found"
$ git clone --filter=blob:none --no-checkout https://github.com/LIT-Protocol/lit-peer.git   # cd8674fa…, 2026-09-16 (sparse)
PKPNFTFacet._beforeTokenTransfer -> only ERC721EnumerableUpgradeable._beforeTokenTransfer
LibPKPPermissionsStorage: mapping(uint256 => EnumerableSet.UintSet) permittedAuthMethods   (keyed by tokenId)
PKPPermissionsFacet.onlyPKPOwner: require(_msgSender() == pkpNFT.ownerOf(tokenId), "Not PKP NFT owner")

$ curl https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-6551.md   # status: Review; "Fraud Prevention" quoted in kb/01
$ git clone (sparse) https://github.com/tokenbound/contracts.git   # bce75f98…, 2024-03-11
Lockable.lock(): ExceedsMaxLockTime if > block.timestamp + 365 days; AccountV3._updateState(): _state = keccak256(abi.encode(_state, _msgData()))
Permissioned: "Permissions are keyed by the root owner address, so will be disabled upon transfer…"

$ git clone (sparse) https://github.com/dwallet-labs/ika.git   # a3942f55…, 2026-09-27
dwallets.mdx: "**Transferable**: Supports ownership transfer … enabling features like a dWallet marketplace or future user claims."

$ docs.near.org/ai/shade-agents/introduction -> title "Shade Agents (deprecated)": "After April 19th, 2026, the Shade Agent Framework will no longer maintained as standalone developer tooling."
$ curl https://raw.githubusercontent.com/near/chainsig-lib/main/README.md -> "# DEPRECATED"
```
Venue status (`curl -L -w "%{http_code}"`): `wallet.bitte.ai` 402, `bitte.ai` 402, `www.mintbase.xyz` 402, `testnet.mintbase.xyz` 402, `paras.id` → `narrativeprotocol.com` 200, `testnet.paras.id` 502, `testnet.mynearwallet.com` 200, `app.mynearwallet.com` 200, `wallet.meteorwallet.app` 403 (Cloudflare), `testnet.nearblocks.io/nft-tokens` 200, `tradeport.xyz/near` 404.

MyNearWallet NFT discovery (bundle `https://testnet.mynearwallet.com/index.632befda.js`, 12,124,307 B):
`getAccountNfts(e){return await Promise.any(this.indexersInQueue.filter(...getAccountNfts).map(t=>t.getAccountNfts(e))).catch(()=>[])}`. The adapters are FastNear `https://test.api.fastnear.com/v0/account/${e}/nft` (→ `contract_ids`) and NearBlocks `https://api-testnet.nearblocks.io/v1/kitwallet/account/${e}/likelyNFTsFromBlock` (→ `list`, `lastBlockTimestamp` 1790478810893120060 = 2026-09-27). Token listing: `nft_tokens_for_owner_set`, falling back to `nft_tokens_for_owner`, then `.filter(({metadata:e})=>!!e)`.

## 7. Observations worth repeating
- Rate limits (FastNear anonymous, the near.org deprecation throttle) were hit within minutes because nine agents share this IP. Judges on other IPs may not hit them, but the README must not depend on any single endpoint.
- Nothing in this spike is product code. The validator and snippets are submission and README tooling.
