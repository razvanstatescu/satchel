// Satchel v5 cold-open intro (scene H0, ~8 s "doomscroll" barrage ending in silence and one sticker slap).
// Prompts from notes/intro-research/tech.md §8 (and creative.md §8 for paper-unstick and sub-drone).
// Same fields as specs.mjs. This set is processed on its own (`--set intro`): peaks normalized to -6.5 dBFS sample peak
// (decoded mp3 <= -6 dBFS), its 'hit' group matched only among itself, gainDb capped so mix peaks stay <= -6 dBFS,
// and only these keys are merged into src2/data/sfx.json (existing entries are never touched).
// Takes: glitch-hit-1..3 (same prompt, three generations), notif-ping-1..3 (glassy, marimba tick, chat pop),
// paper-unstick-1..3 (tape, sticker, taped paper).
// Extra fields used here: hpHz (extra high-pass), shelf {hz, db} (high-shelf EQ), sat {mix, drive} (tanh saturation),
// abruptEnd (a deliberate hard stop: the last-sample click check is skipped), peakAtEnd (peakSec = the file's end).
const DRY = 'clean, dry, no music, no reverb tail';
const GLITCH = `One short harsh digital glitch, a corrupted-data crackle with a bit-crushed buzz and a tiny electrical pop, starts instantly, ${DRY}.`;
export const INTRO_SPECS = [
  // --- chaos hits
  { name: 'barrage-cold-hit', dur: 0.5, gen: 0.8, group: 'hit', mixDb: -16, hpHz: 30, fadeMs: 60, // 22-43 Hz sub was eating headroom; tighter stop
    prompt: `A sudden harsh digital impact: a deep sub thump layered with a burst of bit-crushed static and a short electrical zap, hits instantly and stops dead, ${DRY}.` },
  { name: 'glitch-hit-1', dur: 0.2, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 30, prompt: GLITCH },
  { name: 'glitch-hit-2', dur: 0.2, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 30, prompt: GLITCH },
  { name: 'glitch-hit-3', dur: 0.2, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 30, prompt: GLITCH },
  { name: 'glitch-stutter', dur: 0.5, mixDb: -24, minTransients: 6,
    prompt: `A fast digital stutter: one tiny electronic blip repeated about ten times and speeding up like a skipping CD, harsh and clean, ${DRY}.` },
  { name: 'whip-fast', dur: 0.3, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 40,
    prompt: `A very fast aggressive whip-pan whoosh, a sharp swipe of air passing left to right in a quarter of a second, cinematic, ${DRY}.` },
  { name: 'zoom-punch', dur: 0.35, gen: 0.5, group: 'hit', mixDb: -21, fadeMs: 50,
    prompt: `A short punchy cinematic hit: a tight low thud with a quick bright click on top, like a camera zoom impact, ${DRY}.` },
  { name: 'sub-drop', dur: 1.2, mixDb: -20, fadeMs: 800, sat: { mix: 0.35, drive: 2.5 }, // fade = 'fades out'; harmonics for small speakers
    prompt: `A deep cinematic sub bass drop, a low boom that falls in pitch and fades out over one second, ${DRY}.` },
  // --- phone and screen
  { name: 'notif-ping-1', dur: 0.35, gen: 0.5, mixDb: -26, fadeMs: 60,
    prompt: `One single modern smartphone notification sound, a short bright two-note glassy ping, ${DRY}.` },
  { name: 'notif-ping-2', dur: 0.35, gen: 0.5, mixDb: -26, fadeMs: 60,
    prompt: `One single modern smartphone notification sound, a short soft marimba tick, two quick wooden notes, ${DRY}.` },
  { name: 'notif-ping-3', dur: 0.2, gen: 0.5, mixDb: -26, fadeMs: 40,
    prompt: `One single modern chat app message notification, a short round bubbly pop, ${DRY}.` },
  { name: 'notif-swarm', dur: 3.0, mixDb: -27,
    prompt: `Dozens of different smartphone notification pings, message chimes and vibration buzzes piling up and overlapping faster and faster, a chaotic swarm, no music, no voices.` },
  { name: 'phone-buzz', dur: 0.6, mixDb: -26,
    prompt: `A smartphone vibrating twice on a hard wooden desk, two short buzzy rattles, close-mic, ${DRY}.` },
  { name: 'keyboard-burst', dur: 1.0, mixDb: -28, minTransients: 8,
    prompt: `A frantic burst of fast mechanical keyboard typing, about twenty sharp clicky keystrokes in one second, close-mic, no voices, ${DRY}.` },
  { name: 'shutter-snap', dur: 0.2, gen: 0.5, mixDb: -24, fadeMs: 30, onsetRelDb: -10, // start on the first strong click
    prompt: `A single crisp mechanical camera shutter click with a tiny mirror clack, close-mic, ${DRY}.` },
  { name: 'static-burst', dur: 0.3, gen: 0.5, mixDb: -26, fadeMs: 4, abruptEnd: true, shelf: { hz: 3000, db: 8 }, // both takes were mid-band crackle
    prompt: `A short burst of harsh analog TV static, white-noise hiss with crackles, abruptly cut, ${DRY}.` },
  { name: 'news-murmur', dur: 4.0, mixDb: -30, fadeMs: 80,
    prompt: `Several television news anchors talking over each other, indistinct overlapping broadcast voices with no clear words, small TV speaker sound, no music.` },
  // --- build and stop
  { name: 'riser-digital', dur: 2.0, gen: 2.5, mixDb: -24, fadeMs: 4, fadeInMs: 30, anchor: 'end', abruptEnd: true, peakAtEnd: true, // keep the last 2.0 s so it ends on its top
    prompt: `A tense rising digital riser, filtered white noise and a thin glassy synth tone sweeping upward for two seconds, getting brighter and faster, stopping abruptly at the top, no drums, ${DRY}.` },
  { name: 'tape-stop', dur: 0.5, mixDb: -22,
    prompt: `A tape-stop effect: chaotic electronic noise slowing down and falling in pitch to a dead stop in half a second, like a cassette player losing power, ${DRY}.` },
  { name: 'sub-drone', dur: 8.0, mixDb: -26, fadeInMs: 50, fadeMs: 4, abruptEnd: true, // composite: rises 2 semitones, stops dead
    prompt: `A low dark ominous drone, a deep sustained synth bass with a gritty mid-range harmonic layer, slowly rising in pitch by about two semitones over eight seconds and stopping dead at the end, no drums, no melody, no music.` },
  // --- the knock-off (creative.md §8)
  { name: 'paper-unstick-1', dur: 0.4, gen: 0.5, mixDb: -26, fadeMs: 50,
    prompt: `A strip of sticky tape torn loose from a painted wall, one short quick rip, close-mic, ${DRY}.` },
  { name: 'paper-unstick-2', dur: 0.4, gen: 0.5, mixDb: -26, fadeMs: 50,
    prompt: `A sticker torn loose from a wall in one fast tug, a short sticky crackle, close-mic, ${DRY}.` },
  { name: 'paper-unstick-3', dur: 0.4, gen: 0.5, mixDb: -26, fadeMs: 50,
    prompt: `A sheet of paper taped to a wall pulled loose at the corner, a short tearing rustle, close-mic, ${DRY}.` },
  // --- round 2 (cut to black, then the reveal): reveal-boom-1..2 (same prompt, two generations), crt-off, suck-in
  { name: 'reveal-boom-1', dur: 1.6, gen: 1.8, mixDb: -16, hpHz: 30, fadeMs: 300, sat: { mix: 0.25, drive: 2.5 }, prompt: `A massive cinematic impact for a big reveal: a deep sub boom with a punchy transient, followed by a bright airy shimmer and sparkle tail that rings out, starts instantly with no pre-roll, no riser and no whoosh before the hit, clean, no music.` },
  { name: 'reveal-boom-2', dur: 1.6, gen: 1.8, mixDb: -16, hpHz: 30, fadeMs: 300, sat: { mix: 0.25, drive: 2.5 }, prompt: `A massive cinematic impact for a big reveal: a deep sub boom with a punchy transient, followed by a bright airy shimmer and sparkle tail that rings out, starts instantly with no pre-roll, no riser and no whoosh before the hit, clean, no music.` },
  { name: 'crt-off', dur: 0.7, mixDb: -24, hpHz: 40, // removes a 22 Hz rumble, keeps the 54-108 Hz collapse hum
    prompt: `An old CRT television switching off: a short high-pitched whine and a soft electric pop as the picture collapses, ${DRY}.` },
  { name: 'suck-in', dur: 0.5, gen: 0.7, mixDb: -22, fadeMs: 4, fadeInMs: 30, srcEnd: 0.43, anchor: 'end', abruptEnd: true, peakAtEnd: true, // cut where it is still within 1 dB of its peak
    prompt: `A fast reverse whoosh like a sharp inhale of air, rising quickly in intensity and pitch and stopping dead at its loudest point, sucked in, no impact, ${DRY}.` },
];
