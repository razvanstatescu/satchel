# Human actions, ready to run (prepared 2026-10-21)

Every item below is prepared so that it takes a few minutes. It is either a command to paste, a message to send, or a decision already taken for you (D-38). Items stay here only when something prevents an agent from doing them: HACKATHON.md reserves them for a human, they need your login or a captcha, or this session's auto-mode classifier blocked the testnet transaction.

## 1. Create the team account `satchelhq.testnet` (**DONE 2026-10-29 by Claude, D-48**)

> Done: `satchelhq.testnet` exists with key `ed25519:6WmrWh72…`, plus dev1, alice, bob and carol. The rest of this section is kept for reference.

The name is chosen (D-38) and was free on 2026-10-21. The faucet returned 429 (rate limited), and a funded creation from a spike account was blocked by the auto-mode classifier. Run one of these yourself.

**Option A:** the faucet, once the rate limit clears. You get 10 NEAR, and a key is saved to `~/.near-credentials`.

The faucet attempt left an unused key file for this name (the account doesn't exist on-chain yet). Remove it first so the new key is saved cleanly:
```bash
rm -rf ~/.near-credentials/testnet/satchelhq.testnet ~/.near-credentials/testnet/satchelhq.testnet.json
near account create-account sponsor-by-faucet-service satchelhq.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
```

**Option B:** works now. Fund it from the web spike account (≈ 9.97 NEAR) and reuse the key file already on disk (public key `ed25519:6WmrWh72n51zW6W7W8xo5S3Nad4scDuspGeXUonSqemQ`):
```bash
near account create-account fund-myself satchelhq.testnet '9.5 NEAR' use-manually-provided-public-key ed25519:6WmrWh72n51zW6W7W8xo5S3Nad4scDuspGeXUonSqemQ sign-as satchel-spk-web-e9ea1a.testnet network-config testnet-fastnear sign-with-legacy-keychain send
```

**Or let me do it:** add a permission rule allowing `near account create-account …` and `near tokens … send-near …` for testnet (`/permissions`, or ask me to set it up with the update-config skill), then say "go". I will then create the account, sweep the spike leftovers (≈ 38 NEAR, D-34) and create `alice` (8), `bob` (4), `carol` (8) and `dev1` (5). Never `satchel.` or `rc.`: those are born keyless on Days 9–10.

Check:
```bash
near account view-account-summary satchelhq.testnet network-config testnet-fastnear now
```

## 2. Fund the demo addresses (after step 1)

The addresses and amounts are in `research/final-addresses.md`. With no team testnet4 wallet, the fallback path applies (D-33). Short version:
- **testnet4:** https://mempool.space/testnet4/faucet (log in with GitHub) → the largest claims to **dev1 #1** `tb1qcg94krv9g58qrtslkqlvyrv86el7w3p4ml5urc`, then **final #1** `tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5`.
- **Sepolia:** https://sepolia-faucet.pk910.de (captcha + ~20 min of mining) or the Google Cloud faucet → 0.3 ETH to **dev1 #1** `0x355180f2d253833dfb736b05561588d7d4bc7db3`.
- **Solana devnet:** https://faucet.solana.com (GitHub login; the site bars AI agents) → 0.5 SOL to **final #1** `AGSUq86qgpp1eB53UaL8iRscRjJzsQfrNKsKoxPXTXTd`, and 0.2 SOL to **dev1 #1** `6ZQTrfwUgPBm6n8mKkRz5snfEWRbsBJHt5EzFL4B2Dwu`.
- **Circle testnet USDC:** https://faucet.circle.com → "Near Testnet" → 20 USDC to `carol.satchelhq.testnet` every 2 h, after step 1 creates carol (target 40 by Nov 7).

**Optional:** fund the spike addresses too, so I can finish the real broadcasts (each re-run signs testnet transactions, so it needs your "go"):
- ≥ 0.005 tBTC to `tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a`
- ≥ 0.001 Sepolia ETH to `0x532b9aAEA7803aDCaC5FB8Fe53166147CEE4832d`
- ≥ 0.01 devnet SOL to `6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA`

## 3. Message to the organizers (NEAR Discord, https://discord.gg/nearprotocol)

Posting on your behalf is reserved for a human (HACKATHON.md). Paste this:

The 2026-10-29 HACKATHON.md answers the other questions (D-47): testnet is eligible (Q-010), code counts from Oct 19
(Q-001), and Claude Code and Codex screen projects (Q-017).

> Hi! Thanks for the Rules section in HACKATHON.md. A few questions it doesn't cover yet:
> 1. Can one project win both a track prize and the grand prize, or place in two tracks?
> 2. Are commits pushed after 23:59 UTC Nov 14 ignored by judges, or must the repo be frozen then?
> 3. Will the payout's KYC, tax and NEAR conversion rate/date be published?
> 4. Do the screening agents (Claude Code, Codex) have network access, e.g. to NEAR testnet RPC and explorers?
> Thanks!

## 4. Question to the NEAR MPC team (Discord #chain-signatures, or the near/mpc GitHub discussions)

> We're building on `v1.signer-prod.testnet` (3.17.0) from a contract that will be locked (no access keys) around Nov 10. Can you confirm that, through at least Nov 18, the `sign` arguments (`payload_v2`, `path`, `domain_id`), the 15 Tgas `sign_call_gas_attachment_requirement` and the 1-yoctoNEAR deposit will stay unchanged on testnet? A breaking change would strand a locked contract. Thanks!

## 5. Accounts and keys only you can create

| Item | Why it can't be delegated | Default if you skip it |
|---|---|---|
| FastNEAR API key (https://dashboard.fastnear.com) | needs your sign-up | **Optional.** dRPC `https://near-testnet.drpc.org` is keyless and works. Get the key only if rate limits bite (D-38) |
| Meteor and Intear testnet wallets (import `alice`/`bob`/`carol` after step 1) | browser extensions/logins on your machine | needed by Nov 3 for gate G2 |
| X Premium on the account that posts the demo | only you can see it | assume **no** → video ≤ 2:15 |
| Mainnet payout account (`<name>.near`) | HACKATHON.md: "Never create or invent one on their behalf" | needed by Nov 10 |
| Submission fields: project name, lead name, email (the Satchel team's own) | HACKATHON.md "What the human decides" | needed by Nov 12 |

## 6. Nov 1, 08:00 UTC: grant the standing approvals

Paste this into the team channel (text from H-20):

> Standing approvals for AI agents on Satchel, Nov 1–14:
> - (a) non-force pushes to the private repo;
> - (b) testnet transactions signed with the dev, rc, persona and `satchelhq.testnet` keys (creating and funding devN/rc including the rc keyless birth, deploys to devN, mints, signs, sends of test funds, USDC storage registration, contract top-ups, the spike sweep), within ≤ 25 NEAR, ≤ 0.25 Sepolia ETH, ≤ 0.01 tBTC, ≤ 1 devnet SOL and ≤ 50 test USDC per day, only between team-controlled accounts and addresses;
> - (c) Vercel preview/production deploys of the frontend.
>
> Excluded: force-push, making the repo public, X posts, the submission, creating or deploying `satchel.satchelhq.testnet`, anything on mainnet, spending beyond the caps.

Also on Nov 1: create the private GitHub repo `satchel` under your account or org. It stays private until Day 13.

## 7. Add the Upstash for Redis integration (onboarding survey) — DONE 2026-11-02 (`upstash-kv-charcoal-saddle`, connected to `satchel`)

The first-time onboarding's optional "about you" survey (`apps/web/README.md` §Onboarding survey) needs a small
Redis store to collect answers. Without it the app still works — `POST /api/onboarding` answers 204 and stores
nothing — but nobody sees the responses.

On the Vercel dashboard, for the Satchel project:
1. Project → Integrations → Browse Marketplace → "Upstash" → "Upstash for Redis" → Add Integration.
2. Create (or connect an existing) Redis database, and connect it to the **Production** environment (Preview is
   optional; e2e and local dev never need it, since fixture mode never calls the route).
3. The integration injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` into the project's env vars automatically — no
   values to copy by hand.
4. Redeploy once so the new env vars take effect.

Check it worked: `pnpm --filter @satchel/tools onboarding:report` (with those two env vars set locally, e.g. via
`vercel env pull`) should print "sent: 0  skipped: 0  completion: 0%" instead of the "set the env vars" error.
