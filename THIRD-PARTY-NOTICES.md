# Third-party notices

Satchel's own code is licensed as the [README](README.md#license) says: the contracts in [`contracts/`](contracts/) under
MIT ([`contracts/LICENSE`](contracts/LICENSE)) and everything else under AGPL-3.0-only ([`LICENSE`](LICENSE)). The
files below are not Satchel's own. Each keeps its own license, and nothing here re-licenses them.

## Fonts (SIL Open Font License 1.1)

| Font | Where | License text |
|---|---|---|
| Funnel Display, Onest, Geist Mono | `docs/design/satchel-2.0/prototypes/assets/fonts/`, `marketing/video/public/v2/fonts/` | the `OFL-*.txt` file next to each font |
| Bricolage Grotesque, Instrument Sans, Spline Sans Mono | `marketing/video/public/fonts/` | the `OFL-*.txt` file next to each font |

The web app (`apps/web`) loads Funnel Display, Onest and Geist Mono through `next/font/google`, which self-hosts them at
build time under the same license. No font file of the app is in the repository.

## Code and documentation kept as research evidence (`research/**/vendor/`)

Phase 0 spikes kept local copies of what they tested against, so that their `RESULTS.md` evidence can be re-read. None of
it is imported by the product code (`contracts/`, `packages/`, `apps/`, `tools/`).

| Path under `research/spikes/` | What it is | License |
|---|---|---|
| `btc/vendor/mpc-3.17.0/`, `mpc/vendor/release/` | Source excerpts and the release wasm of NEAR's MPC signer contract v3.17.0 (github.com/near/mpc) | MIT |
| `mpc/vendor/crates/` | The crates `near-mpc-contract-interface`, `near-mpc-crypto-types`, `near-mpc-sdk` 0.0.1 (crates.io) | MIT |
| `mpc/vendor/chainsigjs/` | The `chainsig.js` npm package | its own `package/LICENSE` |
| `chains/vendor/devnet-pow*` | The `devnet-pow` 0.1.4 crate (crates.io) | MIT |
| `pay/vendor/near-sdk/` | Source excerpts of near-sdk-rs and near-contract-standards (github.com/near/near-sdk-rs) | MIT OR Apache-2.0 |
| `pay/vendor/pylib/` | PyYAML 6.0.3 | MIT (`pyyaml-6.0.3.dist-info/licenses/LICENSE`) |
| `pay/vendor/lake/` | README files of the NEAR Lake framework repositories | their repositories' licenses |
| `pay/vendor/fastnear-docs/`, `pay/vendor/oneclick/`, `pay/vendor/near-intents-docs/`, `pay/vendor/intear/`, `pay/vendor/coingecko/` | Dated snapshots of public API documentation (FastNEAR, the 1Click OpenAPI, NEAR Intents, Intear, CoinGecko `llms.txt`) | © their publishers; kept for reference only |

## Generated media (`marketing/`)

- **Images** in `marketing/video/public/images/` were generated for this project with OpenAI image models
  (`marketing/tools/images/`, log in `gen-log.jsonl`).
- **Voice-over and music** in `marketing/tools/audio-v3/` were generated for this project with ElevenLabs
  (`marketing/tools/audio-v3/config.mjs` names the voice and models).
- The interface screenshots in `marketing/` and `docs/` are of Satchel itself.

They are used under those services' terms. The Satchel mark (the "Sticker S" in `brand/`) is Satchel's own. Bitcoin,
Ethereum, Solana, NEAR and other chain names and symbols belong to their owners and are used only to name the chains.
