// Satchel 2.0 SFX library (sticker brand: coral, ink outlines, chain charms with faces). Playful but premium:
// soft, rounded, tactile, tidy transients; never cartoon-cheap. Written for the new film in video/src2.
// dur = target length (s); gen = length requested from ElevenLabs (API minimum 0.5 s; shorter effects are trimmed).
// group 'hit' = whooshes + impacts, loudness-matched to their median. mixDb = intended in-mix level as K-weighted
// momentary-max loudness (LUFS, 400 ms); the catalog's gainDb = mixDb - measured. fadeMs/fadeInMs: edge fades.
// onsetRelDb: onset threshold vs peak (default -40). anchor 'end': keep the last `dur` s. minTransients: QA proxy.
// hitRefractorySec/hitRiseDb/hitFloorDb: also write hitsSec (hit times) to the catalog for animation sync.
// srcStart/srcEnd: use only this window of the source (seconds), e.g. to end a riser at the top of its climb.
const DRY = 'clean, dry, no music, no reverb tail';
export const SPECS = [
  // --- stickers, pops, bounces
  { name: 'sticker-slap', dur: 0.3, gen: 0.5, group: 'hit', mixDb: -20, fadeMs: 60, onsetRelDb: -16,
    prompt: `A thick vinyl sticker slapped flat onto a smooth aluminium laptop lid with an open palm, one soft flat thwap with a tiny papery snap, close-mic foley, ${DRY}.` },
  { name: 'sticker-peel', dur: 0.5, mixDb: -26,
    prompt: `A vinyl sticker peeled off a smooth plastic surface, a slow sticky crackling peel that speeds up and ends with a quick light snap, close-mic foley, ${DRY}.` },
  { name: 'pop', dur: 0.15, gen: 0.5, mixDb: -24, fadeMs: 40, onsetRelDb: -20,
    prompt: `One single clean soft mouth pop, the round hollow pop of a finger flicked out of the cheek, short and tidy, close-mic, one pop only, ${DRY}.` },
  { name: 'pop-high', dur: 0.12, gen: 0.5, mixDb: -26, fadeMs: 35, onsetRelDb: -15,
    prompt: `One single tiny high-pitched bubble pop, a small bright round pop like a soap bubble bursting, very short, close-mic, one pop only, ${DRY}.` },
  { name: 'boing-soft', dur: 0.2, gen: 0.5, mixDb: -26, fadeMs: 40,
    prompt: `A subtle soft rubbery bounce, a small rubber ball bouncing once on a wooden table with a gentle short pitch wobble, muted and tasteful, not a cartoon spring, no metal spring twang, ${DRY}.` },
  // --- charms and chain (the brand's signature sounds)
  { name: 'charm-jingle', dur: 0.6, mixDb: -23,
    prompt: `Three small enamel-coated metal keychain charms clinking together as they swing, a light bright jingle of a few delicate clinks, close-mic foley, ${DRY}.` },
  { name: 'chain-clink', dur: 0.3, gen: 0.5, mixDb: -27, fadeMs: 50,
    prompt: `A light metal ball chain keychain clinking once, a short delicate rattle of tiny steel beads, close-mic foley, ${DRY}.` },
  { name: 'swing-swish', dur: 0.45, gen: 0.5, group: 'hit', mixDb: -27, fadeMs: 60,
    prompt: `A soft gentle air swish of a small keychain charm swinging past the microphone once, smooth and light, ${DRY}.` },
  // --- UI
  { name: 'button-thock', dur: 0.12, gen: 0.5, mixDb: -25, fadeMs: 35, onsetRelDb: -20,
    prompt: `One single satisfying soft button press, a rubbery silicone key pressed down with a muted rounded thock, tactile and premium, close-mic, one press only, ${DRY}.` },
  { name: 'button-thock-deep', dur: 0.17, gen: 0.5, mixDb: -24, fadeMs: 40, onsetRelDb: -20,
    prompt: `One single deeper soft button press, a large rubber keycap pressed into a padded base, a low round thock, tactile and premium, close-mic, one press only, ${DRY}.` },
  { name: 'tick-soft', dur: 0.08, gen: 0.5, mixDb: -30, fadeMs: 25, onsetRelDb: -20,
    prompt: `One single tiny soft tick, a gentle rounded plastic click, very short and quiet, close-mic, one tick only, ${DRY}.` },
  { name: 'bubble-tick-run', dur: 1.0, mixDb: -28, minTransients: 6, hitRefractorySec: 0.035, hitRiseDb: 8, hitFloorDb: -36,
    prompt: `A quick run of soft bubbly interface ticks, about twelve tiny rounded water-drop pops in a fast steady rhythm, light and playful, like a number counting up, clean, no music.` },
  { name: 'type-run', dur: 1.0, mixDb: -29, minTransients: 6, hitRefractorySec: 0.04, hitRiseDb: 8, hitFloorDb: -20,
    prompt: `Soft rounded keyboard typing, a fast short burst of about ten muted rubber-dome key presses, gentle and cozy, close-mic, no voices, ${DRY}.` },
  // --- paper and foley
  { name: 'pen-scribble', dur: 0.7, mixDb: -27,
    prompt: `A felt-tip marker pen scribbling a quick signature on thick paper, fast soft strokes with a final flick, close-mic foley, ${DRY}.` },
  { name: 'paper-slide', dur: 0.5, mixDb: -28,
    prompt: `A stiff paper card sliding across a smooth table, one short smooth slide, close-mic foley, ${DRY}.` },
  { name: 'pocket-slip', dur: 0.6, mixDb: -28,
    prompt: `A paper card slipped into a soft cotton fabric pocket, a short brushing slide ending in a soft settle, close-mic foley, ${DRY}.` },
  { name: 'stamp-thunk', dur: 0.35, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 60,
    prompt: `A rubber stamp pressed firmly onto paper on a wooden desk, one short soft thunk with a slight rubbery squish, close-mic foley, ${DRY}.` },
  { name: 'lock-click', dur: 0.25, gen: 0.5, mixDb: -26, fadeMs: 50, onsetRelDb: -20,
    prompt: `A small metal latch clicking shut, one crisp tidy click of a little clasp closing, close-mic foley, ${DRY}.` },
  // --- air
  { name: 'whoosh-soft', dur: 0.45, gen: 0.5, group: 'hit', mixDb: -24, fadeMs: 60,
    prompt: `A gentle airy whoosh, a soft quick pass of air rising to a peak then falling away, smooth and light, ${DRY}.` },
  { name: 'whoosh-zip', dur: 0.3, gen: 0.5, group: 'hit', mixDb: -24, fadeMs: 50,
    prompt: `A quick bright zip-past whoosh, a fast thin airy zip passing by the microphone, snappy, ${DRY}.` },
  { name: 'swoop-up', dur: 0.6, group: 'hit', mixDb: -24, fadeInMs: 120,
    prompt: `A playful rising swoosh, a smooth soft airy whoosh sweeping upward in pitch, light and refined, not a slide whistle, ${DRY}.` },
  { name: 'swoop-down', dur: 0.6, group: 'hit', mixDb: -24,
    prompt: `A playful falling swoosh, a smooth soft airy whoosh sweeping downward in pitch, light and refined, not a slide whistle, ${DRY}.` },
  // --- tonal
  { name: 'sparkle', dur: 0.6, mixDb: -28,
    prompt: `A tiny tasteful glittery shimmer, a few delicate high glass chime sparkles, soft and quick, no music.` },
  { name: 'success-marimba', dur: 0.7, mixDb: -23, minTransients: 3, hitRefractorySec: 0.06, hitRiseDb: 3, hitFloorDb: -12,
    prompt: `Three quick ascending marimba notes, a warm wooden do-mi-sol flourish played with soft mallets, a short friendly yes, no other instruments, no reverb tail.` },
  { name: 'coin-ding', dur: 0.4, gen: 0.5, mixDb: -25, fadeMs: 80,
    prompt: `One soft bright ding, a small metal bell struck lightly once like a payment arriving, clean and pleasant, not a slot machine, not a video game coin, no music, no reverb tail.` },
  { name: 'error-boop', dur: 0.42, gen: 0.5, mixDb: -26, fadeMs: 40, minTransients: 2, hitRefractorySec: 0.08, hitRiseDb: 6, hitFloorDb: -12,
    prompt: `A gentle low two-note uh-oh boop, two soft rounded synth tones stepping down, friendly and muted, not a buzzer, not harsh, no music.` },
  { name: 'sneaky-pizz', dur: 1.2, mixDb: -24, minTransients: 4, hitRefractorySec: 0.1, hitRiseDb: 8, hitFloorDb: -15,
    prompt: `A short sneaky pizzicato motif, four plucked string notes tiptoeing on cello and violin, comedic suspense but subtle and classy, solo plucked strings only, dry, no reverb tail.` },
  { name: 'tension-tick', dur: 1.5, mixDb: -28, minTransients: 5, hitRefractorySec: 0.15, hitRiseDb: 8, hitFloorDb: -12,
    prompt: `A light clock-tick pulse, a small wooden clock ticking evenly about three ticks per second, steady and slightly tense, close-mic, ${DRY}.` },
  { name: 'freeze-chime', dur: 0.8, mixDb: -27,
    prompt: `An icy crystalline glint, a short bright shimmering chime like frost crackling on glass with one sparkling ring, delicate, no music.` },
  { name: 'magic-wand', dur: 0.8, mixDb: -26,
    prompt: `A soft upward twinkle, a quick rising run of tiny bell and glass sparkles, gentle and tasteful, no music.` },
  // --- impacts and builds
  { name: 'drum-hit-soft', dur: 0.4, gen: 0.5, group: 'hit', mixDb: -20, fadeMs: 70, onsetRelDb: -20,
    prompt: `One punchy soft tom drum hit, a warm round floor tom struck once with a felt mallet, tight and short, no other instruments, no reverb tail.` },
  { name: 'riser-short', dur: 2.0, mixDb: -25, srcEnd: 1.925, fadeMs: 12,
    prompt: `A playful rising synth swell, a soft bubbly synth tone sweeping upward in pitch and brightness for two seconds and ending cleanly at its top, no impact, no drums, no other instruments.` },
  // --- optional
  { name: 'crowd-yay-tiny', dur: 0.8, mixDb: -32, optional: true,
    prompt: `A tiny distant cheer of three or four friends going yay together, brief and happy, very subtle, heard from across a small room, no music.` },
];

// Helper sources: raw material for composites (composite.mjs), never catalogued. Generated with
// `node tools/sfx2/generate.mjs --sources` into _raw/src-<name>.mp3.
export const SOURCES = [
  { name: 'marimba-note', gen: 0.8, influence: 0.75,
    prompt: `One single marimba note, middle register, struck once with a soft rubber mallet, warm wooden tone with a natural short decay, one note only, no other instruments, no reverb tail.` },
];
