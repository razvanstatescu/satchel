# QA v5 · reviewer 3 · 1:41–2:13 (T5, T6, T7, E1) + every scene boundary

Film: `marketing/out/satchel-2-v4.mp4` (3990 frames, 30 fps). Frame `fN` = film frame N (t = N / 30). Scene-local
frames are written `T7+188`. Evidence lives in `marketing/video/out/qa-v5/r3/` (`issue-N.png` for the medium issues,
`st/*.png` for the rest; every strip is labelled with frame, time and scene frame).

**Method.** Mean-abs frame difference of all 3990 frames (240 × 135 grey) to find cuts, spikes and still runs; a
block-level scan for 1–3-frame A-B-A flickers over 100.7–133 s; every frame of 100.7–133 s at 960 px; ±12 frames
around every boundary (H2→P1 +30 for the peel); full-resolution crops wherever something had to be measured.
**Result:** no blank, wrong-scene or duplicate frames anywhere at a boundary, and no flicker in 100.7–133 s. Every
flicker-scan hit was intended motion (whip, card flip, peel edges, sparkles) except the 1-frame jolt in #6.

**Count:** high 0 · med 4 (#5, #7, #9, #10) · low 9.

## Issues (by time)

| # | t (s) / frame | scene | category | severity | what you see | suggested fix | evidence |
|---|---|---|---|---|---|---|---|
| 1 | 3.20–3.40 / f96–f102 | H1→H2 | cut | low | The cut at f90 is continuous and clean. H1's "Hand it over." sticker then starts its peel-off at f96. It is still half visible at the top edge (f100–f101) when H2 hard-cuts to the charm close-up at f102 ("Bitcoin." slaps in at f103–f104), so the exit is truncated. Barely noticeable. | Start the peel-off about 4 f earlier, or move the cut to f104, so the sticker is gone before the cut. | `st/cut90b.png` |
| 2 | 18.03 / f541–f546 | P1→P2 | overlap / too-close | low | Same shot across the cut. At f541 the incoming "Fill it up." (slap frame 1, a ghost) is drawn over the still-visible "Three addresses. One NFT." This is P2's deliberate 2-frame anti-pop. At f542 the old caption and the "Standard NEAR NFT" chip vanish with no exit. At f543–f546 the phone's Add-coins sheet slides up and the hand enters: three changes in 5 f. | Acceptable as is. If touched, delay the sheet and hand by about 4 f so the caption swap reads on its own. | `st/cut540_zoom.png` |
| 3 | 26.00–26.37 / f780–f791 | P2→P3 | cut | low | P2's "USDC too. Four networks." is held 10 f into P3, over the new "Send Bitcoin" screen (the screen swaps at f783–f786). It pops off at f790, which leaves one frame with no caption, and "Send on all three." slaps in at f791–f792. P2 uses a 2-f overlap here (#2) but P3 leaves a 1-f gap, so the two caption hand-offs are inconsistent. The P2 network sticker leaves cleanly (animated, f797–f805). | Hold the old caption one more frame (P3+10) so it matches P2's anti-pop. Optionally swap captions on the screen change (f783). | `st/cut780_zoom.png` |
| 4 | 101.80–104.53 / f3054–f3136 | T5 | overlap | low | The "y" descender of "your browser." sits on the browser's top outline. During the slap overshoot (f3054–f3056) it crosses into the tab strip by up to 13 px. At rest the gap is 0–3 px (touching), because the browser drifts up 6 px during f3069–f3105. T6 already lowers its camera 12 px to fix the same problem. | Use T6's `CAM_MID6` (12 px lower) as T5's MID, or raise the caption about 12 px. Using MID6 for T5, T6 and T7 also removes #7. | `st/t5_cap1.png`, `st/t5_cap1_desc.png` |
| 5 | 108.63–110.50 / f3259–f3314 | T5 (→T6) | too-close | **med** | The third stamp, the verdict and the Buy wake are crammed into 1.9 s. Sequence: SOL contact at f3259; camera pull-back from f3264 (5 f later, while the stamp is still settling until f3269); header pill pop at f3270; the browser's tab and URL bars then descend through the caption band (f3270–f3278) just as "Clean history." starts its slap (at f3273 the ghost caption is drawn over the tab strip); verdict pop at f3274; caption contact at f3276; camera lands at f3278; Buy wake at f3288; cheer plus the 6-px page jolt (#6) at f3291; sparkles until f3314; hard cut at f3315, where the caption pops off with the tab switch. "Blockhash expired" gets 0.17 s of still close-up, against about 1.4 s for each of the first two stamps. "Clean history." is landed and still for about 1.1 s (the rule asks for 1.3 s) while the Buy wake and sparkles compete with it. | Start `camOut` at contact+10 (stamp settled) and run it in about 12 f. Land the verdict and caption with the camera, not before it, so the chrome is clear of the band. Keep the Buy wake, but drop the cheer hop and the jolt. If more time is needed, take one beat from T6's tail (trim list) by moving the T5/T6 boundary. | [`issue-5.png`](../../video/out/qa-v5/r3/issue-5.png) |
| 6 | 109.70 / f3291 | T5 | broken | low | `CameraView dy` drops the whole browser 6 px for one frame on the Buy wake (0 → 6 → ~2 px, f3290–f3293). It coincides with the charms' cheer and reads as a jitter, not a landing. It was the only non-intended hit in the flicker scan. | Remove it, or ease it over 3–4 f at 2–3 px. | `st/t5_buy.png` |
| 7 | 116.00 / f3479→f3480 | T6→T7 | cut | **med** | The cut is a tab switch back to #7, but the browser chrome jumps 12 px up: T6 ends on `CAM_MID6` (top edge at y 274) and T7 starts on `CAM_MID` (y 262). The T5→T6 tab switch keeps the chrome perfectly still, so this one reads as a jolt. | Start T7's camera on `CAM_MID6`; its push to `BUY_CU` begins at f5 anyway. Alternatively use MID6 for all of T5–T7 (see #4). | [`issue-7.png`](../../video/out/qa-v5/r3/issue-7.png) |
| 8 | 116.00–116.87 / f3480–f3506 | T7 | too-close | low | After the cut (and #7's jump), four moves overlap in 0.7 s: the tab slap (f3480–f3486), the page content rising 40 px (f3480–~f3495), the camera push to the Buy panel (f3485–f3501) and carol's hand rising (f3490–f3500), followed by the press at f3506. The clean #7 page is readable for only about 5 f. | Drop the 40-px content rise (the page is the one T5 already showed), or start the push at f8. Keep the press on "clean,". | `st/cut_3480.png`, `st/misc1.png` |
| 9 | 118.20–121.07 / f3546–f3632 | T7 | overlap | **med** | On the frosted card back, the "Paused for sale" pill (`FrostLaminate` pillY 0.6) sits on the ETH row. Its outline cuts through "nonce 1" and its bottom crosses the SOL row's dashed border: text over text. In the W1T zoom on the tag (f3577–f3607) it is large and also clipped by the frame's bottom edge. (In T4 the same pill hides "nonce 1" completely, which reads cleaner.) | Move the pill off the record text: into the card's bottom margin under the SOL row (pillY ≈ 0.9), or right-align it over the empty right half of the rows. | [`issue-9.png`](../../video/out/qa-v5/r3/issue-9.png) |
| 10 | 122.27 / f3668 | T7 | broken | **med** | The lemon "Yours" sticker appears on the card band in a single frame (LAND+8). `yours` is a boolean prop, so there is no slap, and it happens in the middle of the landing beat, the film's payoff. | Give the badge the kit slap (scale 1.3 → 1, contact on f4, 6–8 f), either at LAND+8 or on the "Satchel #7 is yours." contact (f3683). | [`issue-10.png`](../../video/out/qa-v5/r3/issue-10.png) |
| 11 | 122.77–126.77 / f3683–f3804 | T7 | too-close | low | "You now control / 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC." starts rising 11 f after "Satchel #7 is yours." lands, so two must-read lines arrive within 0.37 s. The amounts line settles at f3713 and the peel covers it at about f3804: 3.0 s for 11 tokens, against about 3.5 s by the rule. | Shorten the line (drop "You now control", keep the amounts) or accept it. Either way the T7 tail hold is **not** a trim candidate. | `st/t7_yours.png` |
| 12 | 126.50–126.93 / f3795–f3808 | T7→E1 | cut | low | The peel itself is clean: no blank or wrong-scene frame, and the lockup slap only starts after the flap has left (f3808). There are two cosmetic seams. (a) Where the flap's 8-px border meets the round-capped fold line at the frame edge, there is a small jog or notch: at the right edge on f3803–f3804 and at the top edge on f3807–f3808. (b) The first 3 peel frames (in-out cubic) show no change, so with T7's still tail the picture is frozen from 125.27 to 126.60 s. | (a) Clip the fold line to the frame, or give it butt caps, so it ends flush with the border. (b) Fine as is. | `st/peel_notch.png`, `st/peel_notch2.png`, `st/peel_seq.png` |
| 13 | 131.10–131.70 / f3933–f3951 | E1 | too-close | low | The footer line rises (f3933–f3949) while the end press sinks (f3942–f3945), holds and springs back (to f3950), the lemon burst pops (f3947–f3970) and the charms kick. The last chip landed at f3930. That is four moves in 0.6 s on the final beat, and the five chips (15 words) get only 2–3 s of shared attention. | Bring the footer in with the third chip (≈ f3915) so the press on 131.5 s has the frame to itself. | `st/e1_press.png`, `st/e1_mid.png` |

## Scene boundaries (frame by frame, ±10 f or more)

| boundary | type | verdict |
|---|---|---|
| 3.0 H1→H2 | continuous | clean; the caption exit is truncated at f102 (#1) |
| 12.0 H2→P1 | peel (f360–f379, visible from f363) | clean. P1's "Mint a Satchel." lands as the flap's last corner leaves the top-left (f375–f377), which is fine. H2 is frozen for 2.2 s before it (trim list). |
| 18.0 P1→P2 | continuous | #2 |
| 26.0 P2→P3 | continuous | #3 |
| 35.0 P3→P4 | hard cut | clean; P3's total finishes rolling at f1043 (7 f before the cut) |
| 43.0 P4→P5 | hard cut | clean; P4 is frozen for about 1 s before it |
| 52.0 P5→P6 | hard cut | clean; P6's caption slaps in at f1561–f1562 |
| 59.0 P6→C1 | hard cut + night blind (f1772–f1788) | Clean. The blind's black drop line crossing the card band (f1779–f1781, striking through "Satchel" at f1780) is the blind's own hard shadow: deliberate. |
| 72.0 C1→T0 | whip | clean: C1 whips out over f2157–f2159, T0 whips in over f2160–f2164, in the same direction |
| 76.0 T0→T1 | push-in into the drop cut | clean; the caption is pushed off the top on purpose (f2275–f2279) |
| 82.0 T1→T2 | hard cut into T2's pull-back | clean (T1 ends still for 6 f; T2 is moving from its first frame) |
| 88.5 T2→T3 | whip (out f2652–f2654, in f2655–f2660) | clean; T3's first request flies in at f2662, right after the settle (tight but sequential) |
| 96.0 T3→T4 | hard cut | clean; T3 is frozen for 2.1 s before it (trim list) |
| 101.0 T4→T5 | hard cut + browser slap | clean; T4 is frozen for 2.0 s before it (trim list) |
| 110.5 T5→T6 | tab switch | chrome steady (top edge at 262 on both sides), which is the model for #7; "Clean history." pops off with the switch (part of #5) |
| 116.0 T6→T7 | tab switch | #7 |
| 126.5 T7→E1 | peel (f3795–f3814) | #12; otherwise clean, and only one coral fill per frame throughout |

## Trim candidates

Scene starts sit on the 120 BPM grid, so trim in whole beats (0.5 s) and re-run the timeline/audio pipeline.

| t range | what | could go |
|---|---|---|
| 114.43–116.00 (f3433–f3479), T6 tail | the whole page is static after the "offers" shake; the VO ends at 115.38 | 0.5 s |
| 11.32–12.10, H2 tail (static since 9.90, f297) | lockup and line held still until the peel (cut-adjacent, r1's scene) | 0.5 s |
| 25.30–26.10, P2 end (static since 22.43, f673) | still frame after V06 ends, running into the 26.0 cut | 0.5 s |
| 42.03–43.00, P4 tail (f1261–f1289) | still before the hard cut | 0.5 s |
| 70.24–71.90, C1 (static since 68.73) | the dark pause after "…know it's clean?" (keep at least 1 s of it) | 0.5 s |
| 95.04–96.00, T3 tail (static since 93.90) | still after V20 ends | 0.5 s |
| 100.42–101.00, T4 tail (static since 99.03) | still after V21 ends | 0.5 s |

Not candidates: T5 (it needs time, #5), the T7 tail (the amounts line needs it, #11) and E1 (the chips need it; the
silent still tail from 132.53 s is intended).

## Looks good, don't touch

- **T5:** the browser slap on the T4 cut; the scan beam sweep, with the charms' eyes following it; the three bonks (wind-up, eyes shut on contact, squash against the outline, stamp settling in 10 f with ink specks), each on its V23 phrase onset (f3169, f3212, f3259); "Checked in your browser." lifting off (f3133–f3140) into the push-in; the Buy wake from grey to coral, with the gate pop and the sparkles on the button's flanks, never over words.
- **T6:** the outline turning red on "old", the slip poking out on "signature" and the bonk landing on "move"; the verdict and caption echoing each other; the hard camera cut at 113.5 s (it keeps the tab and URL bars out of the caption band); the greyed Buy and Make an offer "no" shakes on "Buy" and "offers"; the pocket stays clear of the panel text in both framings.
- **T7:** the press → "Re-checking history…" → "Approve in your wallet…" states; the whip (browser out right, world in from left, cut on the fastest frame, no smear artefacts); "One transaction." landing as the world arrives; the binder clip snap with the note re-slapping; the W1T zoom; the hand-off flight (the tag passes over the card but never over its text) landing exactly on 122.0 s with sparkles and bob's catch; the "Satchel #7 is yours." slap.
- **E1:** the lockup slap with the wordmark sliding out from behind the tile; the two headline stickers slapping in on their words; the five chips on half-beats (seeded tilt, no overlap at rest, inside the safe area); the press (the mark sinks, holds 2 f and springs back), the lemon burst, SOL's last bounce, and the silent still tail.
