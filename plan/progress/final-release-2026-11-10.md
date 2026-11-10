# Final release, 2026-11-10 (working note)

Release runbook `docs/handoff/release-runbook.md` (e) and (f), run on Nov 10 between 10:14 and 10:45 UTC. Logs in
`target/release-logs/` (local, not in git). Not a judge doc.

## Before

- HACKATHON.md re-read (`research/spikes/hackathon/check_rules.sh`): only Q-000 changed (where the NEAR Builders
  credits are claimed). Nothing to do; new baseline committed (D-54 note).
- Razvan's "yes" (H-15): `yes: keyless birth of satchel.satchelhq.testnet with H=42d12b44…08fa`.
- Dry run: exit 0, every pre-check PASS (rc twin runs H, 0 keys, same config). Diff against the rc dry run: only
  the banner, the balance line, Transfer 20 NEAR, attached 20.14 NEAR, the nonce and the rc-twin lines. FastNEAR knew
  no history for the name.

## The birth (E-02)

| What | Value |
|---|---|
| Account | `satchel.satchelhq.testnet` |
| Birth tx | [`2h46feHW4uAAHtYkJvgBRzWUq1jsx1bfxYGXA7Wiq6GL`](https://testnet.nearblocks.io/txns/2h46feHW4uAAHtYkJvgBRzWUq1jsx1bfxYGXA7Wiq6GL) |
| Block A | 277053821 |
| H | `42d12b441f85b3208f97e1b8c6cc7b7ad3198f97d971f5d7651caf749706d8fa` (CI reproducible job, rev 843d353) |
| Tag | `contract-v1.0.0` → 843d353 (same commit as `contract-v1.0.0-rc1`) |
| Registrations | USDC `CrmxUzZg…`, wrap.testnet `45kqWe7p…` (0.00125 NEAR each, from `satchelhq.testnet`) |

`verify-birth`: ALL PASS (15 pass, 9 info). `view-account-summary`: code H, "Account is locked (no access keys)".

## Demo staging (E-04, D-32, D-55)

| Satchel | State | Txs |
|---|---|---|
| #1 | flagship, alice; funded; its history comes from the proof set's chain sends | (proofs) |
| #2 | gift: alice → bob (`4VDsKixj…`); bob sent 20,000 sats to #1 (`9odeCWiq…`, BTC `762856b7…`, block 160362) | clean |
| #3 | one EVM send to #1 (`8TFmrjRs…`, Sepolia block 12103989); listed 0.5 NEAR and bought by carol (`3y75WK6G…`, `HFW5664H…`) | clean |
| #4 | its one record: nonce 1 Sepolia transfer, sign-only, never broadcast (`5PExfKrU…`); listed 1 NEAR by alice (`25NpjMev…`) | blocked |
| #5 | one BTC send of 20,000 sats to #1 (`FYq5uZbX…`, BTC `75b4ff63…`, block 160362); listed 0.5 NEAR (`5vNvqWDb…`) | clean, for sale |
| #6, #7 | untouched retakes, funded | — |

Nothing else signs with #4, ever (D-55).

## Production switch (E-03)

`fill-final --from-evidence --verify --env --write`: 9 files, 0 `[TBD]` left (d8b27cb). Tools and web (role final)
suites passed before the push. `/api/contract` after the deploy: role final, live, locked, 0 keys, code matches,
never signed, birth tx and block A as above, no AddKey.

## Proofs (E-05)

`e2e:proofs --contract satchel.satchelhq.testnet --send --yes`: fresh Satchels #8 (sale), #9 (btc), #10 (inside);
chain sends from #1 only. The first run stopped at `offer-accept` with ERR_QUIET_PERIOD (#9 had just signed the L2
tx); the tool now waits out the quiet period before `accept_offer` (809709c) and the run resumed with `--merge`.
Result: 35 proofs including `buy-usdc` (carol's Circle USDC), `tools/proofs.sh` 35 pass; the dev2 set (34) is kept
in `docs/evidence/history/` and still verifies (8e3c188). No MPC timeouts.

## Checks (F-01, F-03)

- `tools/judge-snippets.sh` (no overrides, with the CI wasm): S1–S10 and S13 PASS, S11–S12 INFO; 11 pass · 0 fail ·
  0 skip · 2 info.
- `tools/monitor.sh --quick`: 0 fail after fixing its visible-text check, which split grouped addresses and hashes
  at every span (6aad847). Two warnings remain, both info: the wallet manifest hash isn't pinned, and NearBlocks
  freshness.
- No `[TBD]` and no pre-birth wording left in judge-facing files.

## Left

- F-07 fresh-clone rehearsal: done; three findings fixed (S13 skip count, #4 wording, development.md notes).
- CI on the pushed commits: confirm green on GitHub (no `gh` CLI on this machine).
- `FASTNEAR_API_KEY` in Vercel or the `.env.production` comment; the `security` track (H-02, by Nov 12); re-shoot
  `docs/assets/readme/activity.png` (it shows dev2); repo public on Day 13 (needs a yes); submission (needs a yes).
