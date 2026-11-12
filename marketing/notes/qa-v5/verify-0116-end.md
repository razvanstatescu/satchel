# QA v5 verify · reviewer v3 · 1:16.5–2:17.5 (T0–E1) + every body scene boundary

Film: `marketing/out/satchel-2-v5.mp4` (4125 frames, 30 fps). `fN` = film frame N, t = N / 30 (v5 film time). Scene-local
frames are written `T5+255`. Body frame = fN − 240. Evidence: `marketing/video/out/qa-v5/verify/v3/` (`strips/`, `crops/`,
`issue-N*.png`). Every tile is labelled with frame, time and scene frame.

**Method.** Every frame from 75.0 s to the end at 960 px, plus ±30–45 f around each earlier body boundary. Whole-film
frame-difference series and 1-, 2- and 3-frame A-B-A block scans (every hit in range traced to intended motion).
Full-resolution frames and pixel measurements for every claim below. v4 frames pulled for side-by-side checks where a
change was claimed. Scene sources read only for intent. No renders.

**Result.** 29 first-review rows in range: **28 fixed, 0 partly, 1 not fixed (won't fix, accepted), 0 regressed.** All 17
body boundaries are clean (no blank, wrong-scene or duplicate frame). **New issues: 1 medium (A/V offset in the final mux),
4 low.**

## 1. Fix verification

| id | v5 t / frame | status | what you see | evidence |
|---|---|---|---|---|
| r2#2 (T1) | 84.90→84.93 / f2547→f2548 (T1+132→133) | fixed | "Recorded first." holds to f2547; "Then signed." is already opaque on f2548 (slap frame 2) and settles by f2551. No empty or half-transparent frame. | `strips/t1_swap.png`, `strips/t1_signed.png` |
| r2#2 (T2) | 88.83–88.90 / f2665–f2667 (T2+70–72) | fixed | "No admin key." pops out (1.06 on f2665, ~0.5 on f2666); "Not even ours." starts opaque on f2667. No empty frame. | `strips/t2_swap2.png` |
| r2#5 (T2) | 87.8–89.9 / f2634–f2697 | fixed | The "satchelhq" tag is above the 90 px bottom line on every frame from f2640 on. It only crosses while the arm enters (f2634–f2637). | `strips/t2_tag_margin_full.png` |
| r2#12 | 77.53–77.83 / f2326–f2335 (T0+31–40) | fixed | A real turn. The front narrows over f2327–f2329 (coral band 286 → 210 → 82 px wide), is edge-on around f2329/f2330 and the back grows over f2331–f2333; the overshoot settles by ~f2340. The wipe edge travels x 181 → 471 → 783 → 1086 → 1357 → 1584 → 1764 → 1898 over f2327–f2334; all Day on f2335. The whoosh's high-band peak is 1–2 f before edge-on, which is fine. | `strips/t0_flip.png` |
| r2#13 | 77.83–80.47 / f2335–f2414 | fixed | No Night pixel returns after f2335 (column scan on every frame through the push). | `strips/t0_flip.png` |
| r2#14 | 78.03–80.47 / f2341–f2414 | fixed | "the receipts." clears the glove/card top by ≥ 72 px at rest (f2348–f2400), 46 px on the overshoot (f2343), 29 px on the ghost frame (f2342). The card and charms stay ≥ 103 px above the bottom edge. | `crops/t0_cap_glove_2342_2348.png` |
| r2#15 | 80.47→80.50 / f2414→f2415 | not fixed (owner: won't fix) | Same as v4: the push ends on the filled ETH row and T1 opens on the drop with only BTC (ETH outline drawing). It still reads as the re-enactment and the drop's punch carries it. Accept. | `strips/t0t1_cut.png`, `strips/t0t1_v4_vs_v5.png` |
| r2#16 | 85.23–86.47 / f2557–f2594 | fixed | The strip slides out from under the card's right edge (ghost f2557, landed f2558, settled ~f2564). "Ethereum" ends 107 px from the right edge on the slap frame and ~125 px at rest. The strip body itself runs off-frame, which reads as intended. The signature passes behind the strip (f2583–f2588). | `strips/t1_strip_in2.png`, `strips/t1_fly_full.png` |
| r2#17 | 87.07–88.87 / f2612–f2666 | fixed | "No admin key." lands on "there's" (ghost f2612, landed f2613) and is replaced on f2667: ~1.8 s readable (the rule asks 1.55 s). | `strips/caps_slaps.png` |
| r2#18 | 88.67–88.87 / f2660–f2666 | fixed | The arm and sleeve rotate over ~6 f. The hand drawing swaps from pinch to open on f2664, mid-turn. The palm and the tag stay put, with no snap. | `strips/t2_arm_zoom.png` |
| r2#19 | 94.37–95.03 / f2831–f2851 | fixed | The widen is done by ~f2839, and "Raw hash" is tossed from f2841. Its arc tops out at y ≈ 315, ~87 px below the caption's descenders (y 228). | `strips/t3_first.png` |
| r2#20 | 95.07–96.57 / f2852–f2897 | fixed | Each request has left before the next enters: Raw hash is gone by f2866 and Approve enters on f2867; Approve is gone by f2879 and Durable enters on f2882. Apex tops step down y ≈ 246 → 280 → 300, all ≥ ~45 px under the caption. The boops stay on the grid. The reason pills are still brief (~0.4 s each), as in v4 and by design. | `crops/t3_apex_vs_caption.png`, `strips/t3_bounce_wide.png` |
| r2#21 | 96.53–97.67 / f2896–f2930 | fixed | The message is on the plate from f2896, fully landed by f2910 and still to f2929 (0.67 s; ≈ 0.3 s in v4); it sinks from f2930. "ETH · message" is complete from f2916, ≈ 0.47 s before the sink (2 f in v4). The tag is 44 px under the caption's descenders (≈ 10 px in v4). | `strips/t3_msg.png`, `crops/t3_msg_f2920.png` |
| r2#22 | 97.73–98.00 / f2932–f2940 | fixed | Nothing passes below the plate, and "History · 3 signatures" is never struck through. A new 1-frame nit above the plate is N3. | `strips/t3_below_plate.png`, `strips/t3_sink_low.png` |
| r2#23 | 100.00–101.53 / f3000–f3046 | fixed | The mini sheet is gone. In order: the card alone (f3000), the tag carried in (f3004) and slapped on "it," (f3006–f3010), the hand out (f3024–f3027), the frost squeegee fully visible (f3031–f3040), then the pill (f3042–f3044) with "Paused for sale." (f3044–f3046). Calm and sequential. | `strips/t4_open.png` |
| r2#24 | 100.80–102.63 / f3024–f3079 | fixed | Hand 1 leaves through the top (fingertips at the edge on f3027, gone on f3028). Hand 2 recoils off the right edge (fingertips at the edge on f3076, gone on f3077). The Send sticker falls out on its own by f3079. | `strips/t4_exits.png`, `strips/t4_exit_whole.png` |
| r3#1 | 11.13–11.33 / f334–f340 | fixed | "Hand it over." peels over f334–f338 and is off the top by f340, as the punch-in's fast frames start (f340–f346). "Bitcoin." slaps on f343–f344. The cut at f330 is continuous. | `strips/b_h1h2.png` |
| r3#2 | 24.93–25.33 / f749–f760 | fixed (optional change done) | The chip pops 1 → 1.08 → 0 across the cut (gone on f752). "Fill it up." ghosts over the old caption for 1 f on f751 (the deliberate anti-pop) and is alone from f752. The sheet starts on f757 and the hand on f758, so the swap reads on its own. | `strips/b_p1p2.png` |
| r3#3 | 32.50–32.90 / f975–f987 | fixed | The old caption is held until "Send on all three." is opaque (ghost on f986, alone on f987). No empty frame. | `strips/b_p2p3.png` |
| r3#4 | 105.30–105.57 / f3159–f3167 | fixed (side effect N5) | The browser top is fixed at y 274 throughout T5. The descender gap is 6 px on the first slap frame (f3160) and 24–26 px at rest. | `strips/t5_cap.png` |
| r3#5 | 112.13–115.00 / f3364–f3450 | fixed (residual N4) | SOL's contact is on f3364 and the stamp settles by ~f3376. The close-up on all three stamps holds to f3389 (≈ 0.85 s; 0.17 s in v4). Then a hard cut on the beat (f3390), with the verdict and "Checked" popping on the cut. "Clean history." lands on f3394 and is alone for 1.3 s (to f3432). Buy wakes on f3433 and the switch is on f3450. The chrome never crosses the caption band. | `strips/t5_end1.png`, `strips/t5_end2.png` |
| r3#6 | 113.00–115.00 / f3390–f3449 | fixed | The browser top is at 274 px on every frame; no jolt at the Buy wake. | measured per frame |
| r3#7 | 120.47→120.50 / f3614→f3615 | fixed | The chrome is at top 274 / left 109 / right 1810 on every frame from f3608 to f3620, and T7's push starts on f3621. T5→T6 is the same (f3444–f3459). | `strips/tabs_t6t7.png`, `strips/tabs_t5t6.png` |
| r3#8 | 120.50–121.37 / f3615–f3641 | fixed | No content rise. The page is static over f3615–f3619, the push runs f3620–f3634, carol's hand comes in from f3628 and the press lands on f3641 ("clean,"). | `strips/t7_open.png` |
| r3#9 | 122.73–125.20 / f3682–f3756 | fixed | The pill is right-aligned between the BTC and ETH rows, over their empty right halves, with no record text under it. It stays fully in frame through the W1T zoom (f3700–f3748). It straddles the two rows' dashed borders, which is fine. | `crops/pill_T4_vs_T7.png`, `strips/t7_zoom.png` |
| r3#10 | 127.17–127.27 / f3815–f3818 | fixed | "Yours" slaps: ghost at ~1.3 on f3815, ~1.15 on f3816, contact on f3818, together with the caption's slap. | `strips/t7_yours_band.png` |
| r3#11 | 127.90–131.10 / f3837–f3933 | fixed (copy change, needs script owner's OK) | "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC." rises over f3837–f3840, 0.7 s after the caption lands, and is still ≈ 3.1 s before the peel (the rule asks 2.8 s). Bold, ~41 px tall and 1045 px wide, it clears the price tag by ~100 px. | `strips/t7_amounts.png`, `crops/t7_caption_top.png` |
| r3#12 | 131.10–131.60 / f3933–f3948 | fixed | (a) The white hairline and round-cap notch where the crease meets the frame edge are gone: compare v4 f3807/f3808 with v5 f3942/f3943. Only the flap's hard-shadow step remains. The same holds on H2→P1 (f592–f603). (b) The still tail is unchanged, as accepted. | `strips/peel_notch_v4_v5.png`, `strips/peel_h2p1_edges.png` |
| r3#13 | 134.97–136.37 / f4049–f4092 | fixed | The footer rises with chip 3 (f4051–f4053) and chips 4 and 5 slap on f4055 and f4062. Chip 5's tilt and the charms' sway fade out by ~f4074, and the frame is near-still over f4075–f4077. The press (f4078–f4081) has the frame to itself; then the burst (f4083–f4103) and SOL's bounce (f4104–f4111). | `strips/e1_chips_footer.png`, `strips/e1_press.png` |

### Body boundaries (frame by frame)

| boundary | type | verdict |
|---|---|---|
| 11.0 H1→H2 (f330) | continuous | clean (r3#1) |
| 19.5 H2→P1 (f585) | peel (visible f588–f603) | clean, crease fixed. H2 is still for 1.43 s before it (f545–f587; 2.2 s in v4). "Mint a Satchel." lands as the last corner leaves (f600–f601). |
| 25.0 P1→P2 (f750) | continuous | clean (r3#2) |
| 32.5 P2→P3 (f975) | continuous | clean (r3#3) |
| 41.5 P3→P4 (f1245) · 49.0 P4→P5 (f1470) · 57.5 P5→P6 (f1725) | hard cuts | clean. P6's caption slaps on f1726–f1727. |
| 64.0 P6→C1 (f1920) | Night blind over P6's frozen frame | clean. P6 freezes on f1919/f1920 and the blind falls over f1921–f1938 with C1 already Night above the edge; no Day C1 frame is left (r2#6's double transition is gone). |
| 76.5 C1→T0 (f2295) | whip | clean, same direction (out f2292–f2294, in f2295–f2299) |
| 80.5 T0→T1 (f2415) | push into the drop cut | clean (r2#15 accepted) |
| 86.5 T1→T2 (f2595) | hard cut into the pull-back | clean |
| 93.0 T2→T3 (f2790) | whip | clean (out f2787–f2789, in f2790–f2796); the first request flies in after the settle (f2797) |
| 100.0 T3→T4 (f3000) | hard cut | clean; T3 is still over f2968–f2999 (VO ends 99.54) |
| 104.5 T4→T5 (f3135) | hard cut + browser slap | clean; T4's still tail runs under the VO's last words |
| 115.0 T5→T6 (f3450) | tab switch | chrome locked; "Clean history." leaves with the switch; the sparkles are cut (N4) |
| 120.5 T6→T7 (f3615) | tab switch | chrome locked (r3#7). T6 is fully frozen over f3575–f3614 (1.33 s, unchanged; still a trim candidate). |
| 131.0 T7→E1 (f3930) | peel (visible f3933–f3948) | clean; the lockup slap starts after the flap (f3944) |

## 2. New issues

| # | t / frame | scene | category | severity | what you see | suggested fix |
|---|---|---|---|---|---|---|
| N1 | whole film; example 105.37–105.43 / f3161–f3163 | all (final mux) | cut (A/V sync) | **med** | The final mp4's video stream starts at 0.042 s and its audio at 0. In v4, and in both v5 parts (`satchel-2-v5-h0.mp4` and `-body.mp4`), both streams start at 0. Cross-correlation puts the body's audio at +8.003 s in the film but its pictures at +8.042 s, so **every sound leads its picture by ~39 ms (≈ 1.2 f)**. Example: the "Checked in your browser." slap SFX starts on its contact frame (body f2923) in the body render, but between body f2921 and f2922 in the film. This sits at EBU R37's +40 ms limit and shifts every slap/bonk SFX, plus the Devcon voice in H0. Likely cause: the concat demuxer with `-c:v copy` (`tools/render-master.sh` l.28). Evidence: `issue-N1-av-offset.png`. | Re-mux only, no re-render. Either delay the audio by the video's start_time in the final pass (e.g. `adelay=42:all=1`) or make the video start at 0 (concat filter or re-encode). Then check that both streams start at 0 and that an SFX onset lands on its contact frame. |
| N2 | 76.50–77.50 / f2295–f2325 | T0 | overlap (legibility) | low | The requested check on the Night "Paused for sale" pill. **The text contrast is fine:** #8db8ff on #29214b is 7.6:1. The weakness is the container and the size. The pill fill is 1.17:1 against the card body with no outline, so the pill shape disappears and the text floats. The caps are ~15 px tall (x-height ~11 px), and it is up ~0.9 s while the eye goes to the coral band and the flip. It reads at 1080p full-screen; at feed size it is a smudge, like the card's legend. It is not story-critical: T4 says it with a big caption. Evidence: `issue-N2-t0-pill.png`. | Optional. Give the Night pill the Night `sticker-line` #8A82AE (2 px) and Night-ink text (#f4f2ff), or scale T0's pill ~1.3×. Or accept it. |
| N3 | 97.83–97.93 / f2935–f2938 | T3 | broken (layering) | low | The new clip line is the plate's top edge, below the dark slot bar. So the sinking message's dashed outline (f2935–f2936), then the tag's blue dot and dark text (f2938), are drawn on top of the slot bar for a frame each instead of going into it. Only visible when stepping. Evidence: `issue-N3-t3-slot.png`. | Clip at the bar's top edge (y ≈ 494), or draw the slot bar above the sinking layer. |
| N4 | 114.43–115.00 / f3433–f3450 | T5→T6 | too-close | low | Buy now wakes 17 f before the tab switch. Its sparkles are still animating on f3449 and get cut by the switch, so Buy is "live" for only 0.57 s. Evidence: `issue-N4-t5-buy-wake.png`. | Wake ~6–8 f earlier ("Clean history." stays alone ≥ 1.05 s and remains readable during the wake), or end the sparkles by f3446. |
| N5 | 105.3–108.0 / f3159–f3244 | T5 (also T6 f3528–f3614) | overlap (safe area) | low | r3#4's fix raised "Checked in / your browser." 8 px. Its cap tops are now 34 px from the frame top (42 px in v4), outside even the 3.5 % action-safe area. T6's "Blocked: / 1 unused signature" sits at 39 px (unchanged). Both are well inside the ~90 px margin: fine in a plain web player, at risk under fullscreen player chrome. Evidence: `issue-N5-t5-top-margin.png`. | Set these two two-line captions ~8–10 % smaller, or tighten the leading, so the tops sit ≥ ~60 px while keeping ≥ 20 px over the browser. Or accept it for web. |

Unchanged from v4, so not logged as new: the T7 hand-off card flip takes 2 frames (f3769→f3770, identical in v4), and T6's 1.33 s full freeze.

## Looks good, don't touch
- **T0:** the whip-in, the slower flip with the travelling Day wipe and the latch, the lower card, the push into the drop.
- **T1:** the record drawn dash by dash, the signing pill, the "Then signed." swap, the "Signed" sweep, the strip sliding out from under the card, the signature posting behind the strip.
- **T2:** both caption hand-offs, the arm turn, the sleeve tag inside the margin, the pinch gag on the beat.
- **T2→T3** whip.
- **T3:** the send outlined, checked and swallowed; the widen finished before the toss; the stepped apexes with clean hand-offs; the readable message beat; nothing below the plate.
- **T4:** the calm opening with a visible frost; both hands leave off-frame; the small line arrives on "The history…".
- **T5:** the caption clear of the browser; the three bonks on their phrases; the held close-up on "Blockhash expired"; the hard cut on the beat; "Clean history." alone 1.3 s; no jolt.
- **Both tab switches:** the chrome is pixel-locked.
- **T7:** no content rise; the press on "clean,"; the whip; the pill off the record text; "Yours" slapping with the caption; the shorter amounts line readable ~3.1 s.
- **T7→E1:** a clean peel crease.
- **E1:** the press alone on its beat, then the burst, SOL's bounce and the silent tail.
