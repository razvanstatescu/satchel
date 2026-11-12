/**
 * H0, the cold open, v8 (film v6): the barrage-test direction (black ground, a wall and a z-tunnel of real screenshots,
 * whips, zoom punches and full-frame slams through the GL pass), a hard cut to black in silence, the bridge (the
 * narrator's first line, on the black), then the reveal: the coral card slaps down at its rest pose on the biggest hit,
 * and the Day world bursts open around it (a tile-shaped iris with an ink outline and hard shadow, a shockwave ring, an
 * impact punch) into H1's own world. Frames are LOCAL to H0; H0's last frame + 1 is H1 frame 0. 120 BPM: a beat is
 * 15 f, a bar 60 f.
 *
 *   bar 1    0–59   "Seed phrases get copied."   the wall, the SEAL post read in close (F01, the chorus's clear line);
 *                                                whip to the photo; the phishing prompt; dive into the phone
 *   bar 2   60–119  "Signatures drain wallets."  the Devcon talk slams in (its first frame held f60–63, voice f64–176)
 *                                                and holds 1.3 s; dive into the tunnel; slams back to back from f105
 *   bar 3  120–179  "Signed once. Used later."   458 days held 0.4 s; the dark posts, then the graded light pages
 *          180–194  HARD CUT TO BLACK, digital silence (0.5 s); M0 and the suck-in stop exactly on f180
 *          195–250  THE BRIDGE: Sarah's first words, "That's why we built Satchel." (speech f195–245, on beat 2), and
 *                   the same words as a title card on the black (Razvan, film v6: the turn from the industry's problems
 *                   to Satchel needs a sentence, not only a cut)
 *          251–254  the Satchel card falls in out of the black (silent; the title has gone)
 *          255      CONTACT at the card's rest pose (H1 at g −7): the reveal hit (beat 2 of bar 5)
 *          255–261  the Day world bursts open around it (7 frames, ease-out); f261 is H1's own world at g −1
 * Everything from the black on is relative to these constants: the reveal (Turn.tsx) and its ring-out into the body
 * (Sound.tsx, H0Tail) hang on CONTACT and H0_FRAMES, so moving them together leaves the body's render untouched.
 */
export const BEAT = 15;
export const BAR = 60;

export const BAR1 = 0;
export const BAR2 = 60;
export const BAR3 = 120;
export const BLACK = 180; // the hard cut to black (bar 4 downbeat)

/**
 * The bridge (film v6). `src` is the narrator's line (tools/audio-v3/intro-bridge.mjs, take 0: the pitch falls on
 * "Satchel" like V17's); its speech starts at the file's t = 0 and ends 1.66 s in. It plays from `at`; the title card
 * holds from `at` to SLAP_START − 1.
 */
export const BRIDGE = { at: 195, frames: 52, text: "That's why we built Satchel.", src: "v2/intro/audio/wav/V00.wav" } as const;
export const SLAP_START = 251; // the card appears, falling (motion kit slapAt: contact on its 4th frame)
export const CONTACT = 255;
export const H0_FRAMES = CONTACT + 7; // 262: the reveal's 7 frames after contact, then H1 frame 0
export const CONTACT_G = CONTACT - H0_FRAMES; // −7: the H1 frame the card lands on (at rest since H1 no longer slides it in)

/** The strip camera (bar 1): the whip from the wall to the photo, on beat 3. */
export const WHIP = { at: 30, dur: 6 };

/**
 * Devcon SEA 2024 clip (3.76 s, CC BY): "Blind signing is simply equivalent to signing a blank check." The picture
 * slams in on the bar line with its first frame held; the clip (picture and voice together) starts on VOICE_AT, so
 * "Blind" (0.06 s in) lands on f66, after the chorus's line has ended (no chorus under any of his words).
 */
export const VOICE_AT = 64;
export const VOICE_FRAMES = 113;
export const DEVCON = { from: BAR2, to: 98 }; // on the glass 1.3 s, then the visuals move on while he speaks
export const DIVE = { from: 94, to: 98 }; // zoom-through the talk into the tunnel

/** Captions: one per bar, held perfectly still on top of the moving world (≥ 0.8 s + 0.25 s per word). */
export const CAPTIONS = [
  { from: BAR1, to: BAR2 - 1, text: "Seed phrases get copied." },
  { from: BAR2, to: BAR3 - 1, text: "Signatures drain wallets." },
  { from: BAR3, to: BLACK - 1, text: "Signed once. Used later." },
] as const;
