# Trust, dev variant: a small looping code visual — research + concepts

> The saved images and the raw scan log (`refs/`) were working files and aren't kept; the Mobbin and site links are.

Today (working shots, not kept): the dev H2+body+limits+CTA+Under the hood render in one
column; `art = v.variant === "locked"` in `TrustSection.tsx`, so **`SPLIT` never applies on dev** — there's no right
column to fill yet. Whatever concept ships must also flip that condition (or add a dev-only split) so the card gets
the slot from 1024 px, the way rc/final's `ContractFacts` does today.

## Refs

### Mobbin (dev-tool landing sections with code)
| Site · section | Borrow |
|---|---|
| [Vercel, "Avoid unintended access"](https://mobbin.com/sites/sections/93d44485-6b23-4bdd-9872-5ab7319a8ed5) | closest size/spirit match: a small white terminal card (3-dot chrome, one filename), a command line then a coloured result line. This is roughly our target scale. |
| [1Password, "Build with 1Password SDKs"](https://mobbin.com/sites/sections/05fa989c-697b-4933-9a26-47b09107106d) | a dark code card beside one security claim, restrained 3-colour syntax (not a rainbow) |
| [1Password, "Secure your code from line 1"](https://mobbin.com/sites/sections/4be9e1e5-f4f1-4ac2-b2f7-14261187fc92) | stacked, overlapping windows, plus an explicit "Replay ↻" control next to the card |
| [Stripe, "Ship more quickly…APIs"](https://mobbin.com/sites/sections/286613b2-cec3-4b45-ba6e-77930aa42ef4) | a second pane under the editor appends log lines one at a time (`[200] payment_intent.created`…) — our "recorded → signed" sequence, basically |
| [Tailscale, hero](https://mobbin.com/sites/sections/c7ca2f69-0dd1-4195-815f-e50ae1cf6135) | two stacked terminal/JSON windows, a syntax-coloured policy block |
| [Resend, "Integrate this morning"](https://mobbin.com/sites/sections/ba73bbd7-0644-4c95-b730-f32830a6ef34) | friendly chrome: dots + language tabs + a quiet footer link row — good typography reference |
| [Cursor, hero](https://mobbin.com/sites/sections/a7f2c059-5d26-466d-9337-33ab8583c3d4) / [Tab feature](https://mobbin.com/sites/sections/ff9bd0d5-3d15-4a17-8a1c-49068ba49d84) | the inline diff colour marks are worth borrowing; the multi-pane gradient scale is the "too much" caution — ours must stay one small card |

### Live sites (motion read off the real page)
- **Warp** (warp.dev) — a YAML config block: each line fades in + rises 6 px (`reveal` keyframe), staggered top to
  bottom, while a coral rail travels the left margin to mark the active line (`live-warp-a.png` mid-reveal vs.
  `-b.png` settled). This is effectively Concept 1 below, already shipping.
- **Clerk** (clerk.com) — a tab panel cross-fades through `mask-image` (`tabs-fade-start`/`-end` keyframes) and a
  `blink` keyframe (a typing caret) is declared, confirming both techniques are normal on this kind of page.
- **Railway, Trigger.dev, Convex** — `shimmer`/skeleton keyframes, a `moving-lines` scan sweep (Trigger), a dedicated
  cursor module class (Convex). Noted for completeness; nothing screenshot-worthy beyond the log.

### Ours already (reuse, don't reinvent)
`appearTracks`, `rollTracks`, `stickOnTracks`, `resetTrack`, `EASE` (`motion/tracks.ts`, `lib/motion/play.ts`) cover
every move this needs: line reveal, a label roll, a badge stick-on, the loop's hard reset at the seam. `enter.ts`'s
`ENTER` array is where a once-on-enter moment is registered; `hero/engine.ts` is the one place that already gates a
true loop on visibility/tab/inert. Rules that bind here (motion-spec §0, §10): 60 % in view to trigger; transform
and opacity only; CLS 0; loops **over 5 s** need a visible Pause and must stop off-screen/hidden-tab/inert; nothing
flashes > 3×/s; charms never idle-loop.

## Content: the excerpt (sign.rs, allowance.rs, parse/mod.rs — simplified, no account ids, no addresses)
```
fn sign_for(satchel, request) {
  let signer = authorize(caller)?;        // owner, or someone they let spend
  let parsed = classify(request)?;        // refuses raw hashes, unreadable requests

  record(satchel, parsed, signer);        // written here, before anything is signed

  sign_network::sign(parsed)              // NEAR's signer network, called last
}
```
Traces to `authorize_signer` (allowance.rs:490-514), `classify`/`parse::mod.rs` (refusals are `Err`, never a blind
hash), the `SigRecord` insert loop in `sign_for` (sign.rs:74-89, before the MPC call at :121-135), and the single
`promise::call(&self.mpc, "sign", …)` fan-out. Every token is its own `data-l` span (the art is `aria-hidden`); the
visible text layer stays empty. **Syntax colour stays to 3 tones**, not a rainbow: `--ink` for identifiers, `--frozen`
for keywords (it already means "pending/in-progress" on this page), `--ink-muted` for comments/punctuation, `--success`
only on the verdict line. Keep every line ≤ ~34 characters (the mono sizes already in use, 13px desktop / 12px at
390) so nothing wraps or scrolls at 390 px.

## Concept 1 — Record card (recommended)
```
┌ ● ● ●  sign_for ───────────────┐
│ fn sign_for(satchel, req) {    │
│┃ let signer = authorize()?;    │ ← rail, 4 stops
│  let parsed = classify()?;     │
│  record(satchel, parsed);      │
│  sign_network::sign(parsed)    │
│ }                               │
├─────────────────────────────────┤
│ ↻ Refuses raw hashes…           │ ← one rolling caption
└─────────────────────────────────┘
```
**Elements:** a `.lp-code` card (same recipe as `.lp-slip`: 2px `sticker-line`, `0 4px 0 sticker-shade`, 20px radius)
— a 3-dot + filename header, 6 code rows (each 2-4 `data-l` token spans), one 2px rail (`translate`-only), one
caption row below the rows (`.lp-slip__meta`-like). ~22 DOM nodes, in line with `ContractFacts` today.
**Timeline** (T = 4800 ms, reused helpers only):
| ms | what | how |
|---|---|---|
| 0–700 | 6 lines reveal, staggered 140 ms | `appearTracks` (opacity + 6px rise) |
| 260 | rail fades in at line 2 (authorize) | translate Y to row offset |
| 300→1100 | caption "···" → "Owner, or someone they let spend" | `rollTracks` |
| 1100 | rail → line 3 (classify) | translate, `EASE.inOut`, 260 ms |
| 1100→2050 | caption → "Refuses raw hashes, unreadable requests" | `rollTracks` |
| 2050 | rail → line 4 (record) | translate |
| 2050→3000 | caption → "Written here, before anything is signed" | `rollTracks` |
| 3000 | rail → line 5 (sign_network) | translate |
| 3000→3950 | caption → "NEAR's signer network, called last" | `rollTracks` |
| 3950–4200 | card opacity dips, rail/caption hide | — |
| 4750→4800 | hard reset to the 0 ms state while invisible | `resetTrack`, hero-seam pattern |
**Reduced motion / no-JS:** the server frame is the settled state — all 6 lines visible, rail at line 5, caption
reading "NEAR's signer network, called last" (the honest, final fact). **1280/1024:** right column, ~380px card,
vertically centred beside the copy. **768/390:** stacks *below* the copy (SPLIT's own stacking order), full width
capped ~360-400px, type drops to 12px/16px at 390. **Cost:** low — no new engine code, one new CSS block, one new
loop registration (or one `ENTER` entry if played once instead of looped, see below).

## Concept 2 — Terminal exchange
A two-line exchange: `sign_for(raw_hash)` types, a red `✕ refused: can't read it` line appends; then
`sign_for(transfer)` types with a blinking caret, a green `✓ recorded, then signed by NEAR's signer network` line
appends. Closest to Vercel's Sandbox card and Warp's `tag-type`/`tag-cursor`. Reads as more "terminal," but the caret
needs its own stop-after-typing rule (never an idle blink) and per-character reveal is more engine work than reusing
`appearTracks` line-by-line — medium cost, medium risk of fighting the "nothing flashes" rule if done carelessly.

## Concept 3 — Ledger sweep (low-risk fallback)
Reuses `.lp-slip` verbatim (exactly `ContractFacts`/`CleanSection`'s desks): three rows, `sign_for(spend)` ·
`sign_for(message)` · `sign_for(raw_hash)`, each rolling from "…" to a verdict (✓ Signed / ✕ Refused) with
`rollTracks`/`stickOnTracks`, once on enter. Zero new CSS, lowest risk — but it looks like the slip the page already
shows twice elsewhere, so it under-delivers on "make it look more like code."

## Recommendation
**Concept 1.** It's the only one that reads as code moving (not another slip), it's cheapest to build because every
motion primitive already exists, and its rest frame is itself the most honest line in the whole card. Two open
calls for the designer/builder: (a) **loop vs. once** — 4800 ms stays under the "needs a Pause" threshold and can
reuse the hero's visibility/tab/inert gating without a Pause button, but playing it **once on enter** (one more
`ENTER` entry, matching how the rest of this page already behaves, including Trust's own coin-peek) is lower risk
and arguably more "calm, not a hacker-movie effect" — my lean is once-on-enter unless Razvan specifically wants
perpetual motion; (b) **field colour** — don't flood the card in the lemon field `ContractFacts` uses: that field
already means "locked" (R2), and dev's whole point is that it *isn't*. Use `bg-surface-sunken` (already the tone of
this section's own "What you still trust" panel) or, if a brand accent is wanted, a small lemon corner tag echoing
the header's own Testnet badge — never a full lemon island for the dev state.

## rc/final reuse
The same card could sit behind the existing lemon `ContractFacts` slip later (a second, smaller card peeking from
one edge, the way the two coins already peek above it) as "the code that enforces this" — additive, not required.
Dev stays the priority for this round.
