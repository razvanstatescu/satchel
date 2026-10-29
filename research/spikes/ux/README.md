# ux spike (Phase 0, throwaway)

Calculation scripts only. They produce the numbers that kb/80-ux-spec.md and kb/81-design-tokens.md cite.
Not product code: never import them into the product repo. Re-implement the algorithms from the spec on or after Nov 1.

| Script | Produces | Run |
|---|---|---|
| `color.mjs` | WCAG 2.x contrast, alpha compositing, OKLCH<->sRGB helpers | (library) |
| `tokens_table.mjs` | Contrast table in 81 (all text/non-text pairs, tinted pills) | `node tokens_table.mjs` |
| `tokens_final.mjs` | Card glass/scrim numbers, metal CTA, danger fill, focus ring, avatar contrast | `node tokens_final.mjs` |
| `tokens_check.mjs` | First-pass palette check (superseded by tokens_table) | `node tokens_check.mjs` |
| `card_seed.mjs` | SatchelCard seeding reference: test vectors + 100k-id contrast sweep | `node card_seed.mjs vectors` / `node card_seed.mjs sweep` |
| `spring_timings.mjs`, `spring_extra.mjs` | Motion (motion@14.5.0) spring timings: t95/t99/settle/overshoot | `node spring_timings.mjs` |
| `spring_probe.mjs` | Checks that `spring` is exported from `motion` | `node spring_probe.mjs` |

Measured inputs (2026-10-21):
- NEAR testnet block time: 0.5529-0.5713 s/block (windows of 100/210/1000/5000 blocks at height 274,089,059), via rpc.testnet.near.org.
- testnet4: recommended fees 1 sat/vB on every tier; the last 14 block intervals were all 1201 s, via mempool.space/testnet4/api.
- Sepolia eth_gasPrice: 0.000200024 gwei (publicnode).
- Fonts: GSUB/fvar parsed from google/fonts main (Archivo, Martian Mono, Geist, Geist Mono, JetBrains Mono).
