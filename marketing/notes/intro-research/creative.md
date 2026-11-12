# Satchel film v5: the cold-open intro (creative research)

Creative research, 2026-11-10. This proposes a 6–9 s cold open that plays before the film's current opening
(`out/satchel-2-v4.mp4`, H1 "Stick it on."). Nothing here is locked; the human picks.

Inputs:
- `script/SCRIPT-v4.md`, `script/timeline-v4.md`, `notes/concepts-v2.md` §4.4, `notes/brand2-motion-bible.md`,
  `brand-v2/DESIGN-SYSTEM-README.md`, `brand-v2/tokens.json`, and the H1 code (`video/src2/scenes/H1/`).
- The v4 film's first 12 s, extracted to `video/out/creative/open.png` and `open_0{1,2,3}.png` (6 fps), plus
  `open_first36f.png` (frames 0–35). The catch and T3 are in `film_c1_59-73s_1.5fps.png` and `film_t3_88-96s_1fps.png`.
- 13 reference openers, analysed frame by frame. Their contact sheets, with timestamps, are in
  `video/out/creative/refs/`.

---

## TL;DR

- **A · "Slap it on" (8 s, recommended).** Crypto's horror stories scroll past faster and faster under three still
  captions. The frame then freezes in silence on a photographed seed phrase, and a coral Satchel card slaps down on top
  of it. The shock knocks the whole mess off the wall, and the Day ground underneath is where "Stick it on." begins.
- **B · "Peel it off" (6 s).** The same barrage, shorter. When it freezes, the frame's corner lifts by itself: the whole
  doomscroll was one big sticker. It peels off in one long crackle, and the clean Day ground and the card are underneath.
- **C · "Pull it out" (8 s).** The screenshots pile up into a heap. In the silent beat, alice's hand digs in and yanks
  the coral card out. The camera whips up with it into Day, straight into H1's slide-up.
- **Every version uses the same three captions**, and each is a problem the film later answers: "Seed phrases get
  copied." (answered by V09), "Signatures drain wallets." (V20) and "Signed once. Used later." (V15, T5, T6).
- **Length.** The intro adds 8 s, and three 1-bar trims remove 6 s, so the film runs about 2:15. A 6 s cut of A with
  the same trims keeps it at 2:13 (§9).
- **Decisions needed** (§10):
  - Night and distortion inside the intro, as a scoped exception to the bible.
  - Real screenshots or re-typeset headline cards.
  - The voice clip.
  - The trims.

---

## 0. What the intro has to do, and what it must not

- **Do:**
  - Open on the user's problem, readable with the sound off from frame 0. This follows the team's X demo-post advice.
  - End exactly on H1's frame 0, so the existing film plays unchanged. At that frame the card is 85% of the way through
    its slide-up (96 px below rest), the camera is at zoom 1.12 settling to 1, and BTC is mid-fall at top left
    (`hook.tsx`, `cardAt`, `camAt`).
  - Keep the film within a few seconds of 2:13.
- **Show only problems Satchel answers:**
  - **Copied seed phrases.** A Satchel's chain addresses have no seed phrase to copy (V09).
  - **Signatures that drain.** It signs only readable requests: no raw hashes, permits, approvals, contract calls,
    7702 authorizations or durable nonces (V20, T3).
  - **Old signatures used later.** Every signature is recorded before it is made, and the buyer's browser checks that
    none can still move the coins (V15, V18, V22–V24).
- **Never show:**
  - Address poisoning.
  - Lost or destroyed hardware and forgotten keys: the brief's "lost wallets". Satchel doesn't fix losing your NEAR
    account, so this theme is reframed as "copied".
  - Exchange hacks and insolvency: FTX, Bybit as an exchange story, the Binance hot-wallet theft of 2026-10-29.
  - Rug pulls, wrench attacks and SIM swaps.

  A crypto-native judge will catch any montage claim the product can't keep. Bybit appears only through the Ethereum
  Foundation's blind-signing headline, never as a hack story.
- **Brand exception, which needs the human's yes:**
  - The bible bans glitch, RGB split, blur, grain and shader effects (§5, §7).
  - The intro uses them only on third-party screenshots, in a Night world, and every one stops on the slap. Nothing
    belonging to Satchel ever warps, and the first coral pixel in the film is the card.
  - Night then means "the problem" twice, in the intro and in C1. That matches the bible's logic (Night only for the
    catch) and doesn't break it.

---

## 1. Research: 13 openers, frame by frame

**Method.**
- I downloaded each film's opening (360p) into the scratchpad and ran ffmpeg scene-cut detection (threshold 0.3) to get
  cut times and shot lengths.
- I made timestamped contact sheets (2–8 fps, plus native-fps strips around each turn) and read them.
- I measured the audio's RMS level every 100 ms around each turn, to see what the sound does there.
- Shot lengths below are in 30 fps frames. The detector misses swaps under a locked element and fades, so those were
  counted by eye.
- Five more films returned HTTP 403 to the downloader, and I did not work around it. They are listed in §1.14.

| # | Film | Cuts in the opening (detector) | Fastest run | The turn |
|---|---|---|---|---|
| 1 | Dumb Money, trailer | 38 in 45 s | ≈ 30 shots in 1.25 s (1–3 f) | burst → flat yellow card, one statement |
| 2 | Eat the Rich, trailer | 54 in 45 s | steady ≈ 20 f | none: flows into interviews |
| 3 | The Social Dilemma, trailer | 24 in 45 s | swaps under a locked bar halve 2.25 → 0.25 s | black + 0.4 s digital silence |
| 4 | Money Electric, trailer | 22 in 45 s | 3 f flicker; headlines 15–18 f | 2–3 f corruption → title card |
| 5 | Bitconned, trailer | 30 in 45 s | a counter steps about every 15 f | hard cut to black + logo |
| 6 | Trust No One, trailer | 21 in 45 s | metronome, one cut every 30 f | typed search → interview |
| 7 | Johnny Harris, "Is This the End of Crypto?" | 60 in 60 s | five 3 f flashes at 0 s | film burn, 0.4 s dip → slam |
| 8 | James Jani, "Crypto: The World's Greatest Scam." | 61 in 70 s | 3–4 f flashes at 0 s | typed search + one glitch frame |
| 9 | Gloam, "How Binance Lost $6,300,000,000 in One Night" | 14 in 60 s | a draining counter, ≈ 10 f per value | "EMPTY" stamp → number slam |
| 10 | Patrick Collins, "Largest crypto exchange hack" | 3 in 40 s | overlays only | a real voice clip takes over |
| 11 | "Newspaper Headline Montage" AE template | 74 in 90 s | 5–15 f | a torn-paper wipe per headline |
| 12 | Folding Ideas, "Line Goes Up" (counterpoint) | 5 in 45 s | 1 s b-roll | the title in three cuts |
| 13 | Starling Bank, "Safe Phrases" (counterpoint) | 6 in 40 s | a 4 s claim card | none: calm |

### 1.1 Dumb Money, official trailer (Sony, 2023)
<https://www.youtube.com/watch?v=bmr8YmwnZ3w> · `refs/dumbmoney_2fps.png`, `refs/dumbmoney_turn_38-41.5s_24fps.png`
- **Second by second:**
  - 5.3–9.4 s: title cards "New trailer / starts / now", one word every 24–25 f.
  - 15–19 s: two big numbers full frame on white, "992.07%" (green) and "$11,175,979.97".
  - 19–33 s: YouTube-style comments as full-frame white cards in huge type ("I LIKE THE STOCK", "HODL THE LINE!!!!!!!"),
    about 0.5 s each, cut with a news anchor under a "Wall Street Bets" lower third and a split-screen news panel.
  - 38.71–40.0 s: the burst, about 30 shots of 1–3 frames each (comments, news, the number, a hand on a mouse).
  - 40.0 s: a hard cut to a flat yellow field. "SIX MONTHS EARLIER" builds word by word, with 2-frame giant-letter
    flashes between the words.
- **Framing:** recreated comments, full frame, never tilted; the text is the picture.
- **Distortion:** none. Speed is the effect.
- **Sound:** a breath right before the burst (RMS dips to −37 dB at 38.6 s for about 0.2 s), the burst builds to
  −17 dB, and each word of the card lands on a hit.
- **The turn:** noise → a flat colour and one statement.
- **Premium:** huge, readable type, one idea per frame, and the colour card after the noise. **Cheap:** nothing.

### 1.2 Eat the Rich: The GameStop Saga, official trailer (Netflix, 2022)
<https://www.youtube.com/watch?v=P8jtdao1zkE> · `refs/eattherich_2fps.png`
- **Second by second:**
  - 0–9 s: b-roll (suburbs, a COVID drive-up test, a trader in a headset, tickers).
  - 9–11 s: "reddit.com/r/wallstreetbets" panned in giant type.
  - 11.5–24 s: Reddit posts **recreated as white cards on a navy field**, each with its image, plus the one-word card
    "TENDIE".
  - 25–35 s: an animated "GME" logo, a minimal line chart with a glowing dot ($10 2019 → $4 2020), and the counter card
    "907.3k Degenerates".
  - 39.5–41 s: Musk's avatar in a sunburst ("102.6M Followers"), then the tweet card "Gamestonk!!".
- **Cut rate:** steady at about 20 f, with no single burst.
- **Framing:** one house style for every post (same ground, card, radius and slow push). That consistency is the
  premium part.
- **Cheap:** literal stock metaphors, such as a nuclear blast for "it exploded" and a rocket for "to the moon".
- **The turn:** none in the opening; it flows into the interviews.

### 1.3 The Social Dilemma, official trailer (Netflix, 2020)
<https://www.youtube.com/watch?v=uaaC57tcci0> · `refs/socialdilemma_bar_1.5-12s_4fps.png`
- **Second by second:**
  - 1.5–3.0 s: a search bar types "climate change is" across a man's face, covering his eyes.
  - 3.0–11.75 s: **the bar stays locked** while the face and the autocomplete answers change underneath. The holds are
    2.25, 2.75, 1.5, 0.75, 0.5, 0.5, 0.25, 0.25 and 0.25 s: a halving accelerando.
  - 12–13 s: black.
  - 13.0–13.4 s: digital silence (−99 dB).
  - Then a calm interview.
- **The turn:** accelerando → black and 0.4 s of silence → a human.
- **Premium:** one locked element while everything else changes, so the eye never hunts. This is the model for our
  still captions over moving screenshots.

### 1.4 Money Electric: The Bitcoin Mystery, official trailer (HBO, 2024)
<https://www.youtube.com/watch?v=iSF0KGsFuI8> · `refs/moneyelectric_headlines_21.5-26s_8fps.png`
- **Second by second:**
  - 0–3.5 s: a $100 bill whose eye turns into a glowing bitcoin.
  - 5–7 s: a counter in a neon frame, "$1,000,000,000,000 / 1 TRILLION".
  - 8 s: a flicker of five cuts in 0.5 s.
  - 22–25 s: **five outlets asking the same question**, "Who is Satoshi Nakamoto?", at 15–18 f each with a slow push and
    soft edges.
  - 24.0–24.6 s: green and magenta datamosh blocks on the last two seams only.
  - Then a hard cut to "An HBO Original Documentary".
- **Premium:** repetition is an argument, and the glitch lives only at the seams. **Cheap:** the neon number box.

### 1.5 Bitconned, official trailer (Netflix, 2024)
<https://www.youtube.com/watch?v=UDqRvMmuUcU> · `refs/bitconned_2fps.png`
- **Second by second:**
  - 0–8.5 s: tailoring and portraits.
  - 8.5 s: a hard cut to black for the script logo.
  - 17.5–20 s: "Chief Operating Officer" writes itself on in neon over the subject.
  - 33–34 s: a flickering neon counter, "CTR $29 M → $32 M".
  - 35.5–38 s: an on-screen counter, "Total Raised: $412,753 → $486,518 → $560,285 → $634,051 → $1,063,001", a new
    value about every 15 f while the camera tracks along the monitor.
- **Lesson:** a number that changes is a story, while a static one is only a fact. **Premium:** the counter is
  diegetic, on a screen in the world. **Cheap:** the 3D gold coin.

### 1.6 Trust No One: The Hunt for the Crypto King, official trailer (Netflix, 2022)
<https://www.youtube.com/watch?v=vW2BPQ15OSw> · `refs/trustnoone_2fps.png`
- **Second by second:**
  - 0–7 s: the voiceover typed on screen in small caps under dark b-roll.
  - 10–13 s: a search bar types "a netflix documentary".
  - 21–22 s: a URL types itself.
  - 23–25 s: a magazine cover and a newspaper headline, "How Gerald Cotten built QuadrigaCX".
  - 19.8–31.4 s: a cut every 24 frames at 24 fps (one per second), locked to the music.
- **Lesson:** typing puts words on screen cheaply and readably, and a metronomic cut feels deliberate. It ends on a
  news clip with a voice.

### 1.7 Johnny Harris, "Is This the End of Crypto?" (2022)
<https://www.youtube.com/watch?v=TKnCsUubnjc> · `refs/johnnyharris_0-27s_3fps.png`
- **Second by second:**
  - 0–0.42 s: five 3-frame flashes.
  - 0.4–4.4 s: a stinger of 9–24 f shots (a Bored Ape, charts, the word "BIT", a CNBC "Coinbase goes public" chyron,
    mining racks, a president with laser eyes, 1920s dancers).
  - 4.5 s: the host on camera.
  - 8.7–18 s: euphoria b-roll.
  - 18–23 s: the crash (a weeping man in black and white, a falling chart, a founder with glowing eyes, a 1929 bank run).
  - 22.3–24 s: a film-burn melt to black.
- **Distortion:** analogue texture (burn, bleed) rather than digital glitch.
- **Sound:** **"suck and slam"**. The level drops to −37 dB at 24.1–24.5 s, then hits −9 dB at 24.6 s on the next
  scene.
- **Premium:** one consistent archival texture. **Cheap:** the laser-eye memes.

### 1.8 James Jani, "Crypto: The World's Greatest Scam." (2022)
<https://www.youtube.com/watch?v=ORdWE_ffirg> · `refs/jamesjani_0-27s_3fps.png`
- **Second by second:**
  - 2–3.5 s: a printed headline at an angle, with shallow focus and a push.
  - 3.7–5 s: crypto billboards ("The revolution has started. Where do you stand?").
  - Netscape and AOL screens, then a Rolling Stone cover.
  - 13–14.3 s: a newspaper "CULT OF CRYPTO" slides past.
  - 16–17 s: a Reddit post, "It's official! 1 Bitcoin = $10,000 USD", cropped and punched in.
  - 22.3–27 s: a search bar types "What is 'NFTs'?", "'Blockchain'?" and "'Web 3'?", with one glitch frame.
- **Premium:** paper at an angle with depth. **Cheap:** stock hands pointing at a coin (19–22 s). This is the third
  film here to use the search-bar device.

### 1.9 Gloam, "How Binance Lost $6,300,000,000 in One Night" (2026)
<https://www.youtube.com/watch?v=5eZj1OnC1C4> · `refs/gloam_0-30s_3fps.png`
- **Second by second:**
  - 0–7 s: a printed transaction receipt drops into frame like a sticker.
  - 7.3–12.7 s: a vault with a stopwatch and a counter that **drains** from $2.5B to $26M as the coin stacks vanish,
    then a red "EMPTY" stamp.
  - 13–17 s: "$6.3 BILLION" on the vault door, on the loudest beat (−10 dB).
  - 17.3 s: a CNBC clip with voice.
  - 20.3 s: a bar chart, "$6.3B vs $1.5B ← the old record".
  - 22.5–26.3 s: **three crossed-out icon stickers on the beat**, one per second: "No gun", "No tunnel", "Nobody walked
    in".
- **Lesson:** a draining counter frightens more than a big number, and "three stickers on the beat" is a device we
  already own.
- **Premium:** one consistent world. **Off-limits for us:** the subject itself, an exchange hack.

### 1.10 Patrick Collins, "LARGEST Crypto Exchange Hack of All Time!! ($1.4B Bybit)" (2025)
<https://www.youtube.com/watch?v=Gf8_ovO-jBI> · `refs/patrickbybit_2fps.png`
- **Second by second:**
  - 0–7 s: the host, with his old thumbnail and a green "$50M" popping in.
  - 8–12 s: "$1.4 BILLION" in green bevelled type.
  - 12 s: the exchange CEO's livestream takes over.
- **Lesson:** the real voice clip is the most credible two seconds in the video.
- **Cheap:** neon, bevel, glow and thumbnail clutter. This is what crypto YouTube looks like, and the judges have seen a
  thousand of them, which is why ours has to look different.

### 1.11 "Newspaper Headline Montage", After Effects template (Indra Ibrahim)
<https://www.youtube.com/watch?v=sgKIqqQHdDA> · `refs/tpl_newspaper_2fps.png`
- **What it shows:** the genre's vocabulary in 45 s:
  - a giant headline panned letter by letter (an extreme crop);
  - torn-paper wipes;
  - **yellow highlighter swipes** under the key line;
  - focus pulls;
  - pages sliding past.

  Shots run 0.5–1.5 s.
- **Lesson:** highlight, crop and tear make a headline readable at speed. It turns cheap when every move is used on
  every shot.

### 1.12 Folding Ideas, "Line Goes Up – The Problem With NFTs" (2022): counterpoint
<https://www.youtube.com/watch?v=YQ_xWvX1n9g> · `refs/linegoesup_1fps.png`
- **What it does:** a 45 s monologue, then 20 s of city b-roll at one shot per second, then the title in three cuts
  ("LINE", "LINE GOES", "UP").
- **Lesson:** authority doesn't need a barrage; the title cut is the turn.

### 1.13 Starling Bank, "Safe Phrases" (2024): counterpoint
<https://www.youtube.com/watch?v=E_jP1R6aiUU> · `refs/starling_2fps.png`
- **What it does:** a fintech security launch. A lavender card ("AI voice cloning is on the rise. But how good is it
  really?") holds for 4 s, then a calm single-camera experiment follows.
- **Lesson:** security brands open on one calm claim. A barrage in a product film has to be short and must hand over
  to the product at once.

### 1.14 Not analysed, and why
- **Blocked:** YouTube refused these five downloads (403):
  - Kurzgesagt, "Tired of Doomscrolling?" (<https://www.youtube.com/watch?v=c1nYtX-NUsc>), the most relevant
    "flat brand meets doomscroll" reference;
  - the Fyre trailer (<https://www.youtube.com/watch?v=uZ0KNVU2fV0>);
  - ColdFusion, "The FTX Disaster…" (<https://www.youtube.com/watch?v=20BEJouWBgY>);
  - Caser, "The Kid Who Stole $230,000,000" (<https://www.youtube.com/watch?v=dXx1RnZ2Nlo>);
  - Fireship (<https://www.youtube.com/watch?v=2X2V3xv_jik>).

  They're worth a human look before the build.
- **Opened and dropped, because they aren't this genre:** "Everybody Coinbase", "A Coinbase Musical" and Tangem's "The
  only crypto wallet you'll ever need." Their sheets are in `refs/`.
- **Gap:** I found no fintech or security *product launch* that opens on a headline barrage. In this sample the device
  belongs to documentaries and creator explainers, which is one more reason to keep ours short and the turn decisive.

### 1.15 What the genre teaches, for an 8-second opener
1. **Lock one thing and move the world.** The caption stays still while the screenshots swap underneath (1.3).
2. **Accelerate by halving, on the grid:** 15 → 8 → 4 → 2 frames per shot (1.3, 1.1).
3. **Repetition is an argument.** Show the same problem from many sources (1.4).
4. **One phrase per shot.** Highlight or punch in on the key words; the rest is texture (1.1, 1.11).
5. **Distortion is punctuation.** Put it on the seams (2–3 f) and in one rising curve, never on words that must be read
   (1.4).
6. **A number that moves is a story** (1.5, 1.9).
7. **The turn is instant and quiet:** 0.2–0.5 s of suck or silence, then one hit (1.3, 1.7, 1.1).
8. **The turn lands on something flat and bold:** black, a flat colour field, one statement (1.1, 1.4).
9. **A real voice is the most credible two seconds** (1.10, 1.9).
10. **Premium means one grade or house style for every screenshot** (1.2, 1.4). Neon, bevels, glow, stock hackers,
    glitch on every frame and a whoosh on every cut read as cheap.

### 1.16 Technique references (not opened frame by frame)
- **Distortion in Remotion:** the `@remotion/effects` 4.0.537 package is already in `node_modules` as a dependency of
  `@remotion/light-leaks`. It provides `wave`, `turbulentDisplace`, `chromaticAberration`, `scanlines`, `tear` and
  `barrelDistortion`, all on WebGL2; `<Img>` and `<Video>` take an `effects` prop. Docs:
  <https://www.remotion.dev/docs/effects/wave> and <https://www.remotion.dev/docs/effects/turbulent-displace>.
- **Templates:**
  - Motion Array "Tweets": <https://motionarray.com/after-effects-templates/tweets-879788/>
  - Motion Array "Glitch Posts And Stories": <https://motionarray.com/after-effects-templates/glitch-posts-and-stories-327378/>
  - Envato "Tweets Pack": <https://elements.envato.com/tweets-pack-6XV2RV6>
- **Tutorials** (the "wave warp" look the brief describes):
  - "wave warp transition": <https://www.youtube.com/watch?v=VheneTo9Q2E>
  - "Wavy Shake Effect": <https://www.youtube.com/watch?v=qnNTPNS08xk>
  - "Animate Screenshots Like A Pro": <https://www.youtube.com/watch?v=vwpYzXOXeuA>
  - "News Paper Animation like Vox / Johnny Harris": <https://www.youtube.com/watch?v=qjafHzNJLQ0>
  - Motion Array, "3 Johnny Harris style tips" (texture, film burns, grain):
    <https://motionarray.com/learn/premiere-pro/edit-documentary-in-premiere-pro/>

---

## 2. Shared grammar (all three storyboards)

### 2.1 The world
- **Ground: Night `#120C26`.** This is the brand's own dark theme and already the film's "problem" colour (C1). The
  Day ground `#F6F5FB` arrives only at the turn.
- **Screenshots (the old world):**
  - Real captures at 2×, rectangular and flat. They get **no ink outline and no hard shadow**, because those mean
    "Satchel".
  - One grade for all of them: desaturate by 25%, contrast +5%.
  - At most 1400 px wide, with the key phrase at least 64 px tall after a punch-in.
  - The key words get a Night-danger `#FF7A92` underline. That is the same "danger" that later marks the unused
    signature in T6.
- **Captions (our voice):**
  - Funnel Display 800, 130 px, sentence case, Night ink `#F4F2FF`, top centre inside the central 1080 × 1080, the same
    style as C1's captions.
  - Each hard-cuts in on a bar downbeat with the bible's 2-frame anti-pop and holds perfectly still. Captions are never
    distorted and never slap, because slapping is Satchel's move.
  - One per bar.
- **Coral:** the only coral in the intro is the Satchel card at the turn, so the one-coral rule does the storytelling.

### 2.2 Motion vocabulary (six moves; screenshots only)

| Move | Frames | Numbers |
|---|---|---|
| Slam-in | 3 | from scale 1.12, +40 px, ±2–6°, ease-in, landing on the cut frame |
| Underline swipe | 4 | a `#FF7A92` bar, 8 px, wipes left → right under the key phrase |
| Punch-in | 4 | 1.0 → 1.5–1.8 toward the key phrase (expo-out), then still |
| Drift | rest of the shot | +0.4% scale per frame |
| Locked card | 2 per swap | one white 1280 × 720 card, centred; only its content swaps (photosensitivity-safe, §2.6) |
| Stack (C only) | 3 | each shot lands on the last one (±40 px, ±3–9°), so a pile grows |

### 2.3 The distortion stack (screenshot layer only)

| Effect | Bar 1 | Bar 2 | Bar 3 | Strobe | Tape-stop | Freeze → |
|---|---|---|---|---|---|---|
| `wave` (direction `'vertical'`, which shifts rows sideways) amplitude | 3 px | 6 → 10 | 10 → 14 | 16 → 24 | 24 → 0 | 0 |
| wavelength | 260 px | 220 | 180 | 140 | 140 | — |
| phase speed | 0.25 rad/f | 0.35 | 0.5 | 0.7 | → 0 | frozen |
| `turbulentDisplace` kick on each cut (→ 0 over) | 30 px (3 f) | 50 px (3 f) | 70 px (2 f) | 40 px held, evolution +30°/f | 0 | 0 |
| `chromaticAberration` on the cut frame | 2 px | 3 px | 4 px | 6 px held | 0 | 0 |
| `scanlines` | 0 | 0 | 0.06 | 0.10 | 0 | 0 |
| bulge (`turbulentDisplace` mode `bulge`) | — | — | — | pulses on beats 13 and 14 | — | — |

- **How to build it:**
  - Use `<Img src … effects={[wave(…), turbulentDisplace(…), chromaticAberration(…)]} />`, or pre-render the
    undistorted montage plate and play it through `<Video effects>`.
  - Add `@remotion/effects` 4.0.537 to `video/package.json` as an exact pin.
  - Prove headless WebGL with a single `npx remotion still` first; try `--gl=angle` if it fails.
- **Fallback with no GPU:** a DOM "slice wave". Each screenshot is drawn as 36 horizontal strips, each strip offset by
  `noise2D` from `@remotion/noise` (installed). It is deterministic and costs only CSS transforms.
- **Never distort:** captions, the voice-note bubble or anything Satchel.

### 2.4 The grid (30 fps, 120 BPM)
- A beat is 15 f and a bar is 60 f. The intro is a whole number of bars, so the score's bars keep landing on even
  seconds after the offset.
- **The accelerando:**
  - bar 1: one cut per beat (15 f);
  - bar 2: one per eighth (8/7 f);
  - bar 3: one per sixteenth (4 f);
  - bar 4: two beats at 2 f, then the tape-stop, the silent freeze and the slap on beat 16.
- That gives about 4.5 s of real burst before the breath. The cookbook's limit is about 4 s, so bar 1 is kept at the
  calmer "hypermotion standard" pace.

### 2.5 The sound bed (M0): designed, not composed
Eleven Music places events a few seconds late ("the fix is always a bar-line edit", `tools/audio-v3/music.mjs`). An
8 s bed has to be frame-exact, so M0 is a stack of sound effects on the grid. The film's score starts unchanged with H1,
and its first glockenspiel note becomes the first musical note of the film.
- **The layers:**
  - a sub drone that rises two semitones;
  - a tick on the accelerating grid (quarters, then eighths, sixteenths and 32nds);
  - generic notification pings on the cuts of bars 1–2 (two pitches, −14 dB), none in bar 3;
  - one-off foley: phone buzz, camera shutter, a keyboard burst, a falling "drain" whoosh;
  - glitch zaps on alternate cuts (−16 dB);
  - a riser from bar 3, beat 3.
- **The end:** a 6-frame tape-stop dives everything into **digital silence for one beat**, followed by the turn's
  single hero sound.
- **Levels:** the intro sits about 2 dB under the film's body, so the slap and the glockenspiel feel like a lift. The
  master stays at −14 LUFS and −1 dBTP for the whole film.

### 2.6 Safety, rights and accuracy
- **Photosensitivity.** No full-frame flash of light and dark more than 3 times a second (WCAG 2.3.1 "Three flashes";
  the Ofcom/Harding guidance). The 2-frame strobe swaps content inside one fixed white card, so the luminance stays
  steady. Run a flash check on the render before posting; the free PEAT tool works.
- **Rights.**
  - Use real, unaltered headlines with the outlet name and date visible, each for 0.5 s or less, as commentary.
  - Never make a logo the subject. Blur private people's names and avatars on X posts.
  - **Never invent a post or headline for a real account or outlet.**
  - Safer variant: re-typeset each headline verbatim in one house card with the outlet named as text, as Eat the Rich
    does. It is also crisper than low-resolution captures.
- **The generated seed phrase.** Use 12 random BIP39 words with an **invalid checksum**, so it can never be a real
  wallet, and blur 9 of the 12.
- **Accuracy.**
  - Captions state problems, never cures. No caption says Satchel would have prevented any shown incident.
  - Skip the Forklog version of the Slope story: its headline also names a NEAR wallet bug.
  - Name no other hackathon project or team.

### 2.7 Plants and payoffs (v4 times; add the intro's length)

| Intro plant | Caption | Paid off in the film |
|---|---|---|
| SparkCat, Slope, a second-hand wallet whose seller kept the phrase | "Seed phrases get copied." | P4 0:35, V09 "There's no seed phrase to copy." and the seed note sliding off the card; P5, "Everything inside goes with it." |
| A $55M whale, a $6M "no gas" permit, $494M drained, blind signing | "Signatures drain wallets." | T3 1:28, V20 "It only signs what it can read": "Raw hash · Can't read it" and "Approve unlimited tokens" bounce |
| OpenSea's old listings, Drift's pre-signed durable-nonce transactions | "Signed once. Used later." | C1 0:59, V15 "A signature made before the sale can still be used after it."; T3 "Durable nonce · Doesn't expire"; T5 "Nonce used. Coin spent. Blockhash expired."; T6 Blocked |
| The freeze on a photographed seed phrase, covered by the card | — | H1 "Stick it on." / "Hand it over."; T7, the bound buy |

The intro shows the problem in general. C1 still lands, because it applies the problem to *this* sale.

---

## 3. Storyboard A · "Slap it on" (8.0 s = 240 f = 4 bars) · recommended

**Logline.** Crypto's horror stories scroll past faster and faster under three still captions. The frame then freezes
in silence on a photographed seed phrase, and a coral Satchel card slaps down on it. The shock knocks the mess off the
wall, and the Day ground underneath is where the film starts.

```
bar 1  | S1 ----- | S2 ----- | S3 ----- | S4 ----- |   "Seed phrases get copied."   15 f per shot
bar 2  |S5 |S6 |S7 |S8 |S9 |S10|S11|S12|             "Signatures drain wallets."    8/7 f
bar 3  |||||||||||||||                                 "Signed once. Used later."     4 f + voice note
bar 4  :::::::::::: tape | FREEZE (silence) | SLAP→fall    2 f strobe, then beat 15 still, contact on beat 16
```

| Frames | Beat | Picture | On screen | Sound |
|---|---|---|---|---|
| 0–14 | 1 | **S1 (generated photo):** a hand holds a phone over a handwritten 12-word list on a desk; the camera UI frames it; shutter flash on f8; a "Photo saved" toast at f9–14. Wave 3 px. This is the poster frame. | **"Seed phrases get copied."** (f0–56; needs 54 f) | phone buzz f0 + f5; the sub drone fades in; shutter f8; tick |
| 15–29 | 2 | **S2:** Engadget, "Kaspersky researchers find screenshot-reading malware on the App Store and Google Play". Slam-in (f15–17), underline "screenshot-reading malware" (f18–21), drift. | (held) | ping A; tick |
| 30–44 | 3 | **S3:** The Block, "Slope wallet provider saved user seed phrases in plain text…". Punch-in to "seed phrases in plain text" (f33–36). | | ping B |
| 45–59 | 4 | **S4:** Cointelegraph, "Life savings stolen from second-hand Ledger hardware wallet". Underline "second-hand". | caption out f57 | ping A |
| 60–119 | 5–8 | Eight shots on the eighths (cuts on f60, 68, 75, 83, 90, 98, 105, 113): **S5** "Crypto whale loses $55M in phishing attack" (punch "$55M"); **S6** a generated signature request: a hex blob, "Network fee: none", and a thumb pressing **Sign** on f72; **S7** CryptoSlate, "…loses $6M to sneaky phishing scheme targeting staked Ethereum"; **S8** a generated balance, "12.40 ETH" rolling to "0.00 ETH" in Geist Mono over 6 f; **S9** Scam Sniffer, "Wallet Drainers Drain $494 Million" (punch); **S10** a security account's X post about a permit victim; **S11** Cointelegraph, "…launch security feature to end blind signing" (underline); **S12** The Block, "…attacks on individual wallets rise: Chainalysis" (underline). Wave 6 → 10 px; a turbulence kick and a 3 px split on each cut frame. | **"Signatures drain wallets."** (f60–116; needs 50 f) | pings on every cut, alternating; a key burst f68–74; the drain whoosh peaks f86; zaps on f60, 75, 90, 105; ticks on the eighths |
| 120–179 | 9–12 | 15 shots × 4 f: The Record, "Hacker abuses OpenSea to buy NFTs at older, cheaper prices"; Decrypt, the Bored Ape sold for $1,700; Fortune, "OpenSea reimburses users $1.8 million…"; a generated permit card, "Permit · Unlimited · Expires in 30 days"; CoinDesk, "…drain more than $270 million from Drift"; The Hacker News, Drift's durable nonces; the LastPass "$35 Million"; Bloomberg TV 2013; then crops of S2, S3, S5, S9 and S11 as callbacks. A **voice-note bubble** sits bottom-left (f120–165): Night surface `#1C1538`, a waveform, "0:02", no name. Wave 10 → 14 px; kicks of 70 px over 2 f; a 4 px split; scanlines. | **"Signed once. Used later."** (f120–176; needs 54 f) | **voice note f122–160:** "Wait… I signed that weeks ago." The bed ducks −8 dB under it; ticks on the sixteenths; the riser starts at f150 |
| 180–203 | 13–14 | **Strobe:** 12 crops × 2 f inside the locked white card ("plain text", "$55M", "Network fee: none", "$494 Million", "blind signing", "older, cheaper prices", "durable nonce", "$270 million", "second-hand", "screenshot-reading" …). Wave 16 → 24 px, turbulence held, a 6 px split, bulges on f180 and f195. | — | a stutter riser (2 f grains); ticks on the 32nds |
| 204–209 | 14 | **Tape-stop:** the card settles on S1's seed-phrase photo; the wave decays 24 → 0 and the image slows with the sound. | — | a pitch dive to nothing by f210 |
| 210–224 | 15 | **FREEZE:** the seed-phrase photo, crisp and still on Night, every effect off. From f221 the Satchel card (the Day value card: coral "Satchel #7" band, "≈ $8,000.00", an empty charm bar) falls in from scale 1.28, 28 px up, shadow 0, ease-in. | — | **digital silence** |
| 225 | 16 | **CONTACT**, on the beat: the card slaps over the seed phrase (squash 1.07 × 0.93, shadow 0, held f225–226, rebound f227, the shadow catches up f228). It lands **exactly on H1 frame 0's pose**: 96 px below rest, zoom 1.12. | — | `sticker-slap` +3 dB and `drum-hit-soft` −4 dB, the only loud sound in a second |
| 227–239 | 16 | **KNOCK-OFF:** the shock un-sticks the mess. The photo and screenshots lift 6 px (f227–228), then drop out of frame staggered by 1–3 f with ±15–30° of spin. The Night backdrop falls as one sheet (f229–239) and uncovers the Day ground. Only the card stays: Satchel sticks and the mess doesn't. | — | 3–5 un-stick rustles f227–231; `swoop-down` peaks f233; then quiet |
| 240 | H1 f0 | The film as it stands: the card finishes its slide, BTC is mid-fall, and "Stick it on." lands with ETH. | "Stick it on." | M1's glockenspiel; V01 at H1 +1.0 s |

- **Voice clip.**
  - What: an optional dramatised voice note, about 1.3 s, f122–160: "Wait… I signed that weeks ago."
  - Voice: phone-band EQ, a tired close-mic read. Use an ElevenLabs voice that has never narrated a Satchel film, such
    as Chris from the probes, never Sarah. Or record a teammate on a phone.
  - Muted viewers miss nothing: the caption already says it.
  - No realistic AI faces, and never dub a stock clip of a real person.
- **Narrator.** None, by design. Sarah's first word, "Stick it on.", is the release; a voice of God over the chaos would
  spend it early.
- **Why 3 captions and not more.** The hold rule (0.8 s + 0.25 s per word) needs 50–54 f for each. Three captions fill
  three bars, and bar 4 has nothing to read.

**A-6, the 6-second cut (3 bars)**
- f0–59: "Seed phrases get copied.", 8 shots on the eighths.
- f60–119: "Signed once. Used later.", 15 × 4 f mixing the drain and old-signature shots, with the voice note at
  f62–100.
- f120–143: the strobe. f144–149: the tape-stop.
- f150–164: the freeze; the card falls from f161.
- f165: contact. f167–179: the knock-off.
- f180: H1.

This drops the "Signatures drain wallets." caption but keeps its screenshots.

---

## 4. Storyboard B · "Peel it off" (6.0 s = 180 f = 3 bars)

**Logline.** The same barrage, faster and shorter. When it freezes, the frame's corner lifts by itself: the whole
doomscroll was one big sticker stuck over the film. It peels off in one long crackle, and the clean Day ground and the
card are waiting underneath.

| Frames | Beat | Picture | On screen | Sound |
|---|---|---|---|---|
| 0–59 | 1–4 | 8 shots on the eighths (cuts f0, 8, 15, 23, 30, 38, 45, 53): S1 photo, SparkCat, Slope, the second-hand Ledger, LastPass, Bloomberg TV, the S6 signature request, Scam Sniffer "$494 Million". Wave 3 → 6 px. | **"Seed phrases get copied."** (f0–56) | buzz, shutter, pings on the cuts, ticks |
| 60–119 | 5–8 | 15 × 4 f of drain and old-signature shots, with the voice-note bubble. | **"Signed once. Used later."** (f60–116) | voice note f62–100; the riser from f90 |
| 120–131 | 9 | strobe, 6 × 2 f, in the locked card | — | stutter |
| 132–134 | 9 | tape-stop (3 f) | — | dive |
| 135–149 | 10 | **FREEZE.** At f142 the top-right corner of the *whole frame* lifts a few pixels to show a white backing and an ink crease, and a shadow appears under the flap. | — | silence; one tiny corner "tick" at f142 |
| 150–164 | 11 | **The peel:** the dog-ear grows 0.05 → 0.3 (ease-in cubic, the bible's frame peel). The frozen mess curls away, and the Day ground and the coral card show through the curl at H1 frame 0's pose. | — | `sticker-peel`, time-stretched to 0.5 s, its crackle rising as the montage's residue is low-passed into it |
| 165–175 | 12 | **DETACH** on f165: the sheet rips free and flies off top-right, its shadow growing. | — | the peel's snap, the loudest moment |
| 176–179 | 12 | Day and the card, still. | — | silence |
| 180 | H1 f0 | The film as it stands. | | |

- **Voice clip:** as in A, at f62–100.
- **Narrator:** none.
- **Strength:** the shortest (+6 s), with zero new characters and pure satisfying sound.
- **Weakness:** peel fatigue. H1's alice peels the card's corner 1.6 s later, and H2 → P1 is already a frame peel, so the
  film would show three peels in about 18 s. "Peel off" followed by "Stick it on." are also opposite verbs.

---

## 5. Storyboard C · "Pull it out" (8.0 s = 240 f = 4 bars)

**Logline.** The screenshots don't just pass; they **pile up** into a heap of everything that goes wrong when a wallet
changes hands. In the silent beat, alice's hand digs in and yanks out the one clean thing, the coral card. The camera
whips up with it into Day, straight into H1's own slide-up.

| Frames | Beat | Picture | On screen | Sound |
|---|---|---|---|---|
| 0–179 | 1–12 | As in A: same shots and captions, with one change. **Each screenshot slams onto the last** (±40 px, ±3–9°), so a pile grows, and the camera pushes 1.0 → 1.15 over 6 s. | A's three captions | as in A, but the voice clip moves to bar 1 (below) |
| 180–203 | 13–14 | Strobe on the pile's top card. **Coral glints:** a 1-frame sliver of coral between two layers on f188, f196 and f202. | — | stutter; one detuned glockenspiel note under the noise at f202, a hint of the world to come |
| 204–209 | 14 | tape-stop | — | dive |
| 210–224 | 15 | **FREEZE.** alice's hand (lemon sleeve, `alice.near` tag) reaches into the pile from bottom left (f210–219, ease-out) and pinches the coral edge on f220. | — | silence; a paper rustle at −20 dB, f212–219; a pinch tick at f220 |
| 225–232 | 16 | **YANK** on f225: the card rips out (10° lean, scale 1.04) and the screenshots flutter apart. The camera whips up with it (f226–232, cut on the fastest frame, f229, with the bible's 2-frame smear). Night turns into Day across the cut. | — | `sticker-peel` peaks f225; `whoosh-zip` peaks f229 |
| 233–239 | 16 | The card rises into the Day frame to H1 frame 0's pose (85% of its slide). alice lets go on f234, and her hand leaves down-left by f239. | — | quiet |
| 240 | H1 f0 | The card finishes the slide-up; alice's hand comes back at H1 f27 for the hand-over. | | |

- **Voice clip:** the seller instead of the victim, in bar 1 (f18–52): "Relax. I deleted my copy." It lands over
  "Seed phrases get copied." The irony is the hand-over theme in four words.
- **Narrator:** none.
- **Strength:** the most continuous into H1, and it tells the film's thesis (a wallet you can pull out and hand over).
- **Weakness:**
  - The most animation: a hand rig in Night, a 20-layer pile and a whip.
  - Two hand gestures within 4 s.
  - "Pull out" followed by "Stick it on." are opposite verbs.

---

## 6. Comparison

| | A · Slap it on | B · Peel it off | C · Pull it out |
|---|---|---|---|
| Length | 8 s (A-6 cut: 6 s) | 6 s | 8 s |
| How long the turn takes | **one frame** (contact on f225) | 1.5 s (corner → detach) | 0.5 s (yank + whip) |
| Muted read | coral slams onto the mess, the mess falls off | the mess was a sticker | the clean card, out of the mess |
| Verb into "Stick it on." | **the same verb** | the opposite | the opposite |
| Brand move | the slap, the film's most frequent move | the frame peel (already used twice, H2 → P1 and T7 → E1, plus H1's corner peel) | hand, swing, whip |
| Into H1 | lands on H1 f0's pose; H1 unchanged | reveal at H1 f0's pose; H1 unchanged | rises into H1's slide-up; H1 unchanged |
| New characters before H1 | none | none | alice's hand |
| Build cost | low–mid | low | mid–high |
| Main risk | "a sticker over a problem" (the knock-off defuses it: the mess falls away) | peel fatigue | busier; two hands in 4 s |

---

## 7. Recommendation: A, "Slap it on"

1. **The turn is one frame.** The best turns in the research are instant: Dumb Money's colour card and The Social
   Dilemma's black. A's is the brand's own verb, slap, on beat 16, after a beat of true silence.
2. **The picture says the next line.** One second after the slap, Sarah says "Stick it on." over a card that has just
   been stuck on. Neither B nor C gets that rhyme.
3. **It reads muted on a phone.** Three still captions, then a coral rectangle hitting a dark frame. The one-coral rule
   becomes the story.
4. **It spends nothing H1 needs.** No extra hands and no extra peel, so alice's peel and the hand-off swing in H1 stay
   special.
5. **It's the cheapest robust build.**
   - One new scene: the screenshot layer with its effects, three captions and the falling sheet.
   - The existing slap from the motion kit.
   - The DOM slice-wave fallback if WebGL won't render headless.
6. **It rhymes with the film.** Night means the problem (here and in C1), and every caption has a payoff (§2.7).

**Borrow from the others:**
- From C, the seller line ("Relax. I deleted my copy.") is the alternative voice clip if the human prefers irony to
  the victim's voice.
- From B, the corner "tick" before the peel could become one tiny sound on the freeze, if the silence feels too long in
  review.

---

## 8. Assets for A

**Real screenshots: 16.** Capture at 2× from a 1440-wide viewport and crop to the outlet name, headline and date. No
edits. Check each headline's exact wording at capture time.

| # | Theme | Source and headline | URL |
|---|---|---|---|
| S2 | copied phrases | Engadget, "Kaspersky researchers find screenshot-reading malware on the App Store and Google Play" (Feb 2025) | <https://www.engadget.com/cybersecurity/kaspersky-researchers-find-screenshot-reading-malware-on-the-app-store-and-google-play-211011103.html> |
| S3 | copied phrases | The Block, "Slope wallet provider saved user seed phrases in plain text, Solana security researchers find" (Aug 2022) | <https://www.theblock.co/post/161425/slope-wallet-provider-saved-user-seed-phrases-in-plain-text-solana-security-researchers-find> |
| S4 | copied phrases / hand-over | Cointelegraph, "Life Savings Stolen from Second-hand Ledger Hardware Wallet" (Jan 2018; the eBay seller had set the seed phrase himself) | <https://cointelegraph.com/news/life-savings-stolen-from-second-hand-ledger-hardware-wallet> |
| — | copied phrases | BGR, "…LastPass Security Breach Was Linked To $35 Million In Crypto Heists" (after Krebs, Sep 2023) | <https://www.bgr.com/tech/last-years-lastpass-security-breach-was-linked-to-35-million-in-crypto-heists/> |
| — | copied phrases / gift | Business Insider, "A Bloomberg TV Host Gifted Bitcoin On Air And It Immediately Got Stolen" (Dec 2013) | <https://www.businessinsider.in/a-bloomberg-tv-host-gifted-bitcoin-on-air-and-it-immediately-got-stolen/articleshow/27800050.cms> |
| S5 | signatures | Cointelegraph, "Crypto whale loses $55M in phishing attack" (Aug 2024; a single signature handed over a Maker vault) | <https://cointelegraph.com/news/crypto-whale-loses-55m-phishing-attack> |
| S7 | signatures | CryptoSlate, "Crypto whale loses $6M to sneaky phishing scheme targeting staked Ethereum" (Sep 2025; permit signatures, no gas) | <https://cryptoslate.com/crypto-whale-loses-6m-to-sneaky-phishing-scheme-targeting-staked-ethereum/> |
| S9 | signatures / numbers | Scam Sniffer, "…Wallet Drainers Drain $494 Million" (2024 report, EVM chains) | <https://drops.scamsniffer.io/?p=971> |
| S10 | signatures | An X post from a public security account (Scam Sniffer, ZachXBT or Lookonchain) about one permit or drainer victim; find and verify it at capture | — |
| S11 | blind signing | Cointelegraph, "Ethereum contributors launch security feature to end blind signing" (May 2026) | <https://cointelegraph.com/news/ethereum-contributors-launch-security-feature-to-end-blind-signing> |
| S12 | numbers | The Block, "Crypto hacks hit $3.4 billion in 2025, attacks on individual wallets rise: Chainalysis" (Dec 2025; "158,000 cases", "at least 80,000 unique victims") | <https://www.theblock.co/post/382477/crypto-hack-2025-chainalysis> |
| — | old signatures | The Record, "Hacker abuses OpenSea to buy NFTs at older, cheaper prices" (Jan 2022) | <https://therecord.media/hacker-abuses-opensea-to-buy-nfts-at-older-cheaper-prices/> |
| — | old signatures | Decrypt, the OpenSea exploit and the Bored Ape sold for $1,700 | <https://decrypt.co/91076/opensea-exploit-sees-bored-ape-yacht-club-nft-sell-1700> |
| — | old signatures / hand-over | Fortune, OpenSea reimburses users $1.8M (victims had moved NFTs without cancelling old listings) | <https://fortune.com/2022/01/28/opensea-reimburses-users-1-8-million-bug-sell-nfts-bored-ape-yacht-club/> |
| — | old signatures | CoinDesk, "How a Solana feature designed for convenience let attackers drain more than $270 million from Drift" (Apr 2026; pre-signed transactions run weeks later) | <https://www.coindesk.com/tech/2026/04/02/how-a-solana-feature-designed-for-convenience-let-an-attacker-drain-usd270-million-from-drift> |
| — | old signatures | The Hacker News, Drift's $285M durable-nonce loss | <https://thehackernews.com/2026/04/drift-loses-285-million-in-durable.html> |

Spares, if one doesn't capture well:
- Kaspersky's SparkCat press release: <https://kaspersky.com/about/press-releases/kaspersky-discovers-new-crypto-stealing-trojan-in-appstore-and-google-play>
- The Block on the $55M whale: <https://www.theblock.co/post/312326/hacking-55-million-dai-inferno-drainer>
- Scam Sniffer's 2025 report ($83.85M, 106,106 victims): <https://drops.scamsniffer.io/scam-sniffer-2025-crypto-phishing-losses-fall-83-to-84-million/>

**Count by theme:**
- copied seed phrases: 5;
- signatures, drainers and blind signing: 6;
- old signatures used later: 5, two of which also cover unsafe hand-overs;
- big loss numbers: inside the screenshots ($35M, $55M, $6M, $494M, $1.8M, $270M, $3.4B, 158,000), shown as punch-ins.

Our own type never shows "$". That keeps the script's rule of no dollar figures outside the card overview, and it needs
the human's yes (§10).

**Generated or built: 5.**
- **G1 S1 (image):** a photoreal hand holding a phone over a handwritten 12-word list on a desk, with a generic camera UI
  and no brands. The words have an invalid checksum, and 9 of the 12 are blurred. Make it with the existing
  `tools/images` pipeline.
- **G2 S6 (React):** a generic, unbranded signature-request sheet with a hex blob, "Network fee: none" and a Sign
  button. Built in code, so the text stays crisp.
- **G3 S8 (React):** the balance "12.40 ETH" rolling to "0.00 ETH" in Geist Mono.
- **G4 (React):** a "Permit · Unlimited · Expires in 30 days" approval card, unbranded.
- **G5 (React):** the voice-note bubble, with its waveform drawn from the clip's real envelope.

**Voice clip: 1.** About 1.3 s: "Wait… I signed that weeks ago." Use an ElevenLabs voice that has never narrated a
Satchel film (not Sarah), phone-band EQ and slight room tone. A teammate's phone recording is the more honest option.

**SFX.**
- New, made with `eleven_text_to_sound_v2` the way `tools/sfx2` does:
  - phone-buzz;
  - notification-ping (one sound, pitched two ways);
  - camera-shutter;
  - keyboard-burst;
  - glitch-zap ×3;
  - sub-drone (8 s);
  - stutter-riser (2 s);
  - tape-stop;
  - paper-unstick ×3.
- Reused from the library: `sticker-slap`, `drum-hit-soft`, `swoop-down`, `tension-tick`.

**Music.** No new score. M0 is the effects bed, and the existing score starts with H1.

**Code.**
- A new scene, `video/src2/scenes/H0/`: the montage, its effects, the captions, the slap and the knock-off.
- A `MainV5` composition that plays `<Series>` H0 (240 f) and then the existing `Main`. `Main`'s internal timeline,
  voiceover and score don't move.
- The trims below go into the timeline config.
- Add `@remotion/effects` 4.0.537 to `package.json` as an exact pin.

---

## 9. Length: what the film loses

These are 1-bar trims (2 s), so the score can be cut at bar lines (`arrange.py`). Times are v4's.

| Trim | Where | Cut | Cost |
|---|---|---|---|
| P6: drop V13 ("Hand a treasury to the next team.", 56.5–58.5) and the relay vignette; end P6 at 57.0, 1 s after V12 | 57.0–59.0 | −2.0 s | one use case fewer; P6 ends on the offer being accepted |
| C1: start V16 1 s earlier (the drain gap goes 2.4 → 1.4 s) and shorten the tail after V16 (1.8 → 0.8 s) | 65.6–72.0 | −2.0 s | a shorter dread, which the intro has already seeded |
| T7 tail after V26 (−1 s) + E1 6.5 → 5.5 s (still ≥ 5 s on the end card) | 124.4–133.0 | −2.0 s | a shorter ring-out |

Totals:
- A (8 s): 133 + 8 − 6 = **2:15**.
- A-6: **2:13**, the same as now.
- B: 2:13.
- C: 2:15.

If more must go:
- H2's tail after V04 (−0.5 s);
- T0's lead-in before "Satchel keeps the receipts." (−0.5 s);
- a shorter V06 ("…USDC too, on four networks.", about −1.5 s, which means a re-voice).

The v5 QA notes (`notes/qa-v5/`) also list trim candidates; prefer theirs where they overlap.

---

## 10. Decisions for the human

1. **A, B or C**, and 8 s or the 6 s cut.
2. **The scoped exception:** Night plus distortion and glitch in the intro only, on third-party material only, ending
   at the slap.
3. **Screenshots:** real captures, or re-typeset headline cards with the outlet named as text (safer and crisper).
4. **The voice clip:** a dramatised voice note (a non-Sarah ElevenLabs voice), a teammate's real recording, or none.
   Captions carry it either way.
5. **Dollar figures** inside screenshots, as the world's numbers, given the "no $ except the card overview" rule.
6. **The trims** in §9.
7. **A flash check** on the render before the X post.

---

## Sources

- **Films:**
  - Dumb Money: <https://www.youtube.com/watch?v=bmr8YmwnZ3w>
  - Eat the Rich: <https://www.youtube.com/watch?v=P8jtdao1zkE>
  - The Social Dilemma: <https://www.youtube.com/watch?v=uaaC57tcci0>
  - Money Electric: <https://www.youtube.com/watch?v=iSF0KGsFuI8>
  - Bitconned: <https://www.youtube.com/watch?v=UDqRvMmuUcU>
  - Trust No One: <https://www.youtube.com/watch?v=vW2BPQ15OSw>
  - Johnny Harris: <https://www.youtube.com/watch?v=TKnCsUubnjc>
  - James Jani: <https://www.youtube.com/watch?v=ORdWE_ffirg>
  - Gloam: <https://www.youtube.com/watch?v=5eZj1OnC1C4>
  - Patrick Collins: <https://www.youtube.com/watch?v=Gf8_ovO-jBI>
  - Newspaper template: <https://www.youtube.com/watch?v=sgKIqqQHdDA>
  - Line Goes Up: <https://www.youtube.com/watch?v=YQ_xWvX1n9g>
  - Starling: <https://www.youtube.com/watch?v=E_jP1R6aiUU>
- **Facts:**
  - Chainalysis via The Block (2025 thefts $3.41B; personal-wallet compromises "158,000 cases", "at least 80,000
    unique victims", $713M): <https://www.theblock.co/post/382477/crypto-hack-2025-chainalysis>
  - Scam Sniffer 2024 ($494M, about 332,000 addresses, EVM chains): <https://drops.scamsniffer.io/?p=971>
  - Scam Sniffer 2025 ($83.85M, 106,106 victims; the largest case was $6.5M via a Permit signature):
    <https://drops.scamsniffer.io/scam-sniffer-2025-crypto-phishing-losses-fall-83-to-84-million/>
  - The $55M whale: <https://www.halborn.com/blog/post/explained-55m-dollar-whale-phishing-hack-august-2024>
  - The Ethereum Foundation's Clear Signing announcement (blind signing as "a structural flaw"):
    <https://blog.ethereum.org/2026/05/12/clear-signing-announcement>
  - OpenSea's old listings: <https://www.elliptic.co/insights/bug-allows-nfts-worth-over-1-million-to-be-stolen>
  - Drift and durable nonces: <https://www.coindesk.com/tech/2026/04/02/how-a-solana-feature-designed-for-convenience-let-an-attacker-drain-usd270-million-from-drift>
  - SparkCat: <https://www.theregister.com/2025/02/07/infected_apps_google_apple_stores>
  - Slope: <https://www.theblock.co/post/161425/slope-wallet-provider-saved-user-seed-phrases-in-plain-text-solana-security-researchers-find>
  - LastPass: <https://www.coindesk.com/business/2023/10/30/lastpass-hack-victims-lose-44m-in-a-single-day/>
  - Bloomberg TV, 2013: <https://www.entrepreneur.com/article/230537>
  - The Binance theft of 2026-10-29 (cited only to explain why it is excluded):
    <https://cointelegraph.com/news/binance-hack-may-involve-private-key-misuse-not-theft-blockaid-ceo>
- **Craft:**
  - Remotion effects: <https://www.remotion.dev/docs/effects/wave>
  - WCAG 2.3.1, three flashes: <https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html>
  - Templates and tutorials: as listed in §1.16.
