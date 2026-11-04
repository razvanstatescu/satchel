# Satchel 2.0: design specs for the web app rebuild (2026-10-26)

> **What this folder is:** the design record of the Satchel 2.0 rebuild of the web app (`apps/web`), 2026-10-26. It
> governs how the app and the landing look and behave, under `brand/` (the source of truth for visual identity, D-44)
> and the tokens in `kb/81-design-tokens.md` R4. Later rounds changed the landing: `docs/design/site-refresh/`
> (2026-11-03, D-51) and `docs/design/site-polish/` (2026-11-03, D-52); where they differ, the later round wins. The
> built app is the reference for what shipped; these files are kept as they were written, so their counts and "today"
> statements are of 2026-10-26.

Razvan rebuilt the brand: Satchel 2.0, the "Sticker S" (`brand/`). He asked for the web app and the site to be
recreated from scratch in it. Decision D-44 in `plan/decisions.md` records his choices:
- the H1 "Sell a wallet with everything inside. The buyer checks it first.";
- hero "the shelf";
- Day first, whatever the OS;
- a `#8A82AE` sticker outline in Night.

The team (research, design, build, QA) worked from these documents. They are copied here from the session scratchpad,
so a spec that says `<R>/…` means this folder, and `<R>/proto/…` means `prototypes/`.

**Names the files use for things not kept here:** `rulings.md` is this folder's `decisions-during-build.md`, and
`app-inventory.md` is `audit-v4-app-inventory.md`. `context.md`, `build-plan.md`, the build shots (`<R>/build/shots/`,
`shots/`, `refs-shots/`), `motion-work/` and the prototype tooling (`tools/app-sync.mjs`, `tools/build-assets.mjs`,
`tools/sync.mjs`) were working files in the session scratchpad and are not in the repo. The prototypes in
`prototypes/` are the generated output, so they open without that tooling.

| File | What |
|---|---|
| `design-system-impl.md` | Tokens to CSS and Tailwind v4, derived tokens, contrast, fonts, component specs, icons, assets, the NFT image. Its theme section is superseded by D-44 (Day first; see `decisions-during-build.md` R12) |
| `design-spec.md` | The concept ("show the object"; in the app, every screen is something you do to the card), principles, layout, the landing section by section, system decisions |
| `app-screens.md` | Every app screen and state: `/satchels`, `/s/[id]` (Wallet, Activity, Sale), Send, Give, Add coins, Market, Mint, Contract, not found |
| `motion-spec.md` | Every motion: the hand-off swing (a damped pendulum), press, sheets, toasts, the signing tracker, the charms, the clean check, the landing loop |
| `voice-copy.md` | The 2.0 voice, the vocabulary decisions (Give, Paused for sale, Stop selling, Add coins…), the key-by-key copy changes, the landing copy, risky claims checked |
| `refs.md` | Mobbin and live-site references per screen (the exact Mobbin URLs) |
| `audit-v4-app-inventory.md` | The audit of the v4 app the rebuild replaced: routes, flows, components, tests, UX problems, what had to survive |
| `decisions-during-build.md` | The orchestrator's binding rulings during the build (R1–R12) |
| `design-qa.md` | The design QA pass: 42 deviations found, 25 fixed, 17 accepted, with reasons |
| `prototypes/` | The static HTML/CSS prototypes. Open `landing.html`, `app-*.html` or `motion-*.html` in a browser; `?theme=night` and `?state=…` work |
| `screens/` | Reference renders of the prototypes |
| `tests/` | `contrast.mjs` and its report; the two blind 5-second tests of the landing (9/12, then 11/12 once the who-line was added) |

The live implementation is `apps/web`. Its tokens are in `apps/web/src/app/globals.css`, and they are summarised in
`kb/81-design-tokens.md` R4.
