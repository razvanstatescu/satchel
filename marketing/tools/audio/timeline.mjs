#!/usr/bin/env node
// Master timeline at 120 BPM: scenes on bar lines (2 s), VO lines on beats (0.5 s), no overlaps.
// Reads tools/audio/work/vo.json, writes video/src/data/timeline.json and script/timeline.md.
//   node tools/audio/timeline.mjs
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS } from './config.mjs';
import { r3, readJson, writeJson } from './lib.mjs';

export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, FPS = 30;
const EPS = 1e-6;
const ceilTo = (t, q) => Math.ceil(t / q - EPS) * q;
const nearestTo = (t, q) => Math.round(t / q) * q;

// Direction knobs (seconds)
const K = {
  firstLine: 0.5, // L01 lands one beat after frame 0 (frame 0 is the music's first hit + whip)
  hookGap: 0.1, // S01: L01-L04 on consecutive beats-ish (~1.5 s apart)
  gap: 0.5, // min silence after any other line before the next one
  lead: 0.5, // default lead-in from a scene's cut to its first line (dropped to 0 when that saves a whole bar)
  tail: 0.3, // min music after a scene's last line before the cut
  suspense: 0.75, // S05: after L08 (trails off) before L09
  heldBeat: 1.0, // S05: near-silent held beat after L09
  cleanHold: 1.5, // S05: "Is it clean?" hold after L11
  logo: 4.0, // S06, no VO
  stitchAfterL18: 2.0, // S08: the stitch lands ~2 s after L18 ends
  handoffMusic: 4.0, // S08: music only after L18
  minSection: 3.0, // music_v1 section minimum
  outroHold: 6.0, // S09: hold after L19
};

// Scene structure, script v2 film order. S07 parts each start on a bar too.
//   target: preferred scene length (s); the lead-in choice per scene is searched to land closest to the targets.
//   lead: fixed lead-in (s) when the scene must keep its v1 internal timing.
const SCENES = [
  { id: 'S01', lines: ['L01', 'L02', 'L03', 'L04'], lead: 0 }, // exactly as v1 (0-8)
  { id: 'W1', lines: ['L20'], target: 6 },
  { id: 'W2', lines: ['L21'], target: 6 },
  { id: 'W3', lines: ['L22', 'L23'], target: 10 },
  { id: 'S04', lines: ['L07'], target: 8 },
  { id: 'S02', lines: ['L05'], target: 6 },
  { id: 'U1', lines: ['L24', 'L25', 'L26'], target: 12, downbeats: 4 }, // each line on a downbeat, ~4 s apart
  { id: 'S05', lines: ['L08', 'L09', 'L10', 'L11'], lead: 0.5 }, // v1 internal timing
  { id: 'S06', lines: [] },
  { id: 'S07a', lines: ['L12'], parent: 'S07', target: 8 },
  { id: 'S07b', lines: ['L13'], parent: 'S07', lead: 0.5 },
  { id: 'S07c', lines: ['L14', 'L15'], parent: 'S07', lead: 0.5 },
  { id: 'S07d', lines: ['L16'], parent: 'S07', lead: 0.5 },
  { id: 'S07e', lines: ['L17'], parent: 'S07', target: 6 }, // the keyless facts need reading time (S07 ~36 s)
  { id: 'S08', lines: ['L18'], lead: 0 }, // v1 relative timing: L18 on the cut, stitch +6, end +10
  { id: 'S09', lines: ['L19'], target: 12 },
];

/** Lay out one scene starting at `t0` with a given lead. Returns { placed:[{id,start}], end, markers, lastEnd }. */
function layout(scene, t0, lead, vo, prevLineEnd) {
  const placed = [];
  const markers = {};
  let lastEnd = prevLineEnd;
  if (scene.id === 'S06') return { placed, end: t0 + K.logo, markers: {}, lastEnd };
  scene.lines.forEach((id, k) => {
    const d = vo[id].duration;
    let start;
    if (scene.downbeats) {
      // U1: every line on a downbeat (bar line); consecutive lines `downbeats` s apart unless a line runs long
      start = k === 0 ? ceilTo(Math.max(t0, lastEnd + K.gap), BAR) : Math.max(placed[k - 1].start + scene.downbeats, ceilTo(lastEnd + K.gap, BAR));
    } else if (k === 0) start = Math.max(ceilTo(t0 + lead, BEAT), ceilTo(lastEnd + K.gap, BEAT));
    else {
      const prev = scene.lines[k - 1];
      let need = K.gap;
      if (scene.id === 'S01') need = K.hookGap;
      if (prev === 'L08') need = K.suspense;
      if (prev === 'L09') need = K.heldBeat;
      start = ceilTo(lastEnd + need, BEAT);
      // S05: "The coins are gone." -> drop to near-silence on the next bar; L11 starts on that bar
      if (id === 'L11') { start = ceilTo(lastEnd + K.gap, BAR); markers.subHit = start; }
    }
    if (scene.id === 'S01' && k === 0) start = Math.max(start, K.firstLine);
    placed.push({ id, start: r3(start) });
    lastEnd = start + d;
  });
  let end = lastEnd + K.tail;
  if (scene.id === 'S05') end = lastEnd + K.cleanHold;
  if (scene.id === 'S08') {
    // the stitch lands on the downbeat nearest to L18end + 2 s (the score's hit is on that bar line)
    const target = lastEnd + K.stitchAfterL18;
    const stitch = Math.max(nearestTo(target, BAR), ceilTo(lastEnd + 1.0, BEAT));
    markers.stitchLand = r3(stitch);
    end = Math.max(lastEnd + K.handoffMusic, stitch + K.minSection);
  }
  if (scene.id === 'S09') end = lastEnd + K.outroHold;
  return { placed, end: ceilTo(end, BAR), markers, lastEnd };
}

/** Lay out the whole film for one choice of lead-ins (one per scene). */
function run(vo, leads) {
  let t = 0, prevLineEnd = -Infinity, cost = 0;
  const spans = [], placedAll = [], markers = {};
  SCENES.forEach((sc, i) => {
    const a = layout(sc, t, leads[i], vo, prevLineEnd);
    spans.push({ id: sc.id, parent: sc.parent, start: r3(t), end: r3(a.end) });
    placedAll.push(...a.placed);
    Object.assign(markers, a.markers);
    if (sc.id === 'S06') markers.logoDrop = a.end; // the drop = S07 start
    if (a.placed.length) prevLineEnd = a.placed.at(-1).start + vo[a.placed.at(-1).id].duration;
    if (sc.target) cost += Math.abs(a.end - t - sc.target);
    if (leads[i] === 0 && sc.lines.length && sc.lead === undefined) cost += 0.001; // tie-break: prefer air after the cut
    t = a.end;
  });
  return { spans, placedAll, markers, durationSec: r3(t), cost: cost + 0.01 * t };
}

/** Search the free lead-ins (0 or 0.5 s) for the layout closest to the scene targets (then the shortest). */
function bestLayout(vo) {
  const free = SCENES.map((sc, i) => (sc.lead === undefined && sc.lines.length && !sc.downbeats ? i : -1)).filter((i) => i >= 0);
  let best = null;
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const leads = SCENES.map((sc) => sc.lead ?? 0);
    free.forEach((i, b) => (leads[i] = mask & (1 << b) ? K.lead : 0));
    const r = run(vo, leads);
    if (!best || r.cost < best.cost - 1e-9) best = r;
  }
  return best;
}

export function build() {
  const manifest = readJson(resolve(PATHS.work, 'vo.json'));
  if (!manifest) throw new Error('run vo.mjs first');
  const vo = Object.fromEntries(manifest.lines.map((l) => [l.id, l]));
  const { spans, placedAll, markers, durationSec } = bestLayout(vo);
  const sceneOfLine = Object.fromEntries(SCENES.flatMap((sc) => sc.lines.map((id) => [id, { scene: sc.parent || sc.id, part: sc.parent ? sc.id : undefined }])));

  // scenes: S07a-e folded into S07 with `parts`
  const scenes = [];
  for (const s of spans) {
    if (!s.parent) { scenes.push({ id: s.id, start: s.start, end: s.end }); continue; }
    let p = scenes.find((x) => x.id === s.parent);
    if (!p) scenes.push((p = { id: s.parent, start: s.start, end: s.end, parts: [] }));
    p.end = s.end;
    p.parts.push({ id: s.id, start: s.start, end: s.end });
  }

  const voOut = placedAll.map(({ id, start }) => {
    const l = vo[id];
    const o = { id, scene: sceneOfLine[id].scene, part: sceneOfLine[id].part, file: l.file, start, duration: l.duration, end: r3(start + l.duration), text: l.text, words: l.words };
    // sentence starts (relative to the line) for multi-sentence lines; L07 also gets secondSentenceStart ("The contract…")
    const ss = [0];
    l.words.forEach((w, k) => { if (k > 0 && /[.?!…]$/.test(l.words[k - 1].text)) ss.push(k); });
    if (ss.length > 1) o.sentenceStarts = ss.map((k) => (k === 0 ? 0 : l.words[k].start));
    if (ss.length > 1 && id === 'L07') o.secondSentenceStart = l.words[ss[1]].start;
    if (l.phraseGrid) {
      // L15: three phrases re-spaced onto the beat grid. gridStart = where the phrase's clip starts (on a beat);
      // start = the aligner's first-word onset (relative to the line start). absStart = absolute time.
      const sentences = l.text.match(/[^.]+\./g).map((s) => s.trim());
      let wi = 0;
      o.phrases = sentences.map((s, k) => {
        const w = l.words[wi];
        wi += s.split(/\s+/).length;
        return { text: s, gridStart: l.phraseGrid[k], start: w.start, absStart: r3(start + w.start), beatIndex: Math.round((start + l.phraseGrid[k]) / BEAT) };
      });
      o.phrasePeriod = l.period;
    }
    return o;
  });
  for (let i = 1; i < voOut.length; i++) if (voOut[i].start < voOut[i - 1].end - EPS) throw new Error(`overlap ${voOut[i - 1].id}/${voOut[i].id}`);

  // VO spans padded 0.15 s before / 0.3 s after; overlapping spans (the S01 hook) are merged
  const duck = [];
  for (const l of voOut) {
    const d = { start: r3(Math.max(0, l.start - 0.15)), end: r3(Math.min(durationSec, l.end + 0.3)), lines: [l.id] };
    const last = duck.at(-1);
    if (last && d.start <= last.end) { last.end = d.end; last.lines.push(l.id); } else duck.push(d);
  }

  const timeline = {
    fps: FPS,
    bpm: BPM,
    beatSec: BEAT,
    barSec: BAR,
    durationSec,
    durationInFrames: Math.round(durationSec * FPS),
    voice: manifest.voice && { id: manifest.voice.id, model: manifest.voice.model },
    scenes,
    markers: Object.fromEntries(Object.entries(markers).map(([k, v]) => [k, r3(v)])),
    vo: voOut,
    duck,
    music: { file: 'music/score.mp3' },
  };
  return { timeline, spans };
}

export function writeTimeline({ timeline, spans }) {
  const prev = readJson(resolve(PATHS.dataDir, 'timeline.json'));
  if (prev?.music) { timeline.music = { ...prev.music, ...timeline.music }; delete timeline.music.pending; }
  writeJson(resolve(PATHS.dataDir, 'timeline.json'), timeline);
  const f = (x) => x.toFixed(2);
  const mmss = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  const md = [
    '# Satchel video: master timeline',
    '',
    `Generated by \`node tools/audio/run.mjs\` from the voiced lines (do not edit by hand). ${timeline.bpm} BPM (beat ${timeline.beatSec} s, bar ${timeline.barSec} s), ${timeline.fps} fps.`,
    `**Total: ${f(timeline.durationSec)} s (${mmss(timeline.durationSec)}), ${timeline.durationInFrames} frames.** Voice: ${timeline.voice?.id} / ${timeline.voice?.model}.`,
    '',
    '## Scenes',
    '',
    '| scene | start | end | length | bar | VO |',
    '|---|---|---|---|---|---|',
    ...spans.map((s) => `| ${s.id} | ${f(s.start)} | ${f(s.end)} | ${f(s.end - s.start)} | ${s.start / timeline.barSec + 1} | ${timeline.vo.filter((l) => l.start >= s.start && l.start < s.end).map((l) => l.id).join(', ') || '(music only)'} |`),
    '',
    '## Voiceover',
    '',
    '| line | start | end | dur | frame | text |',
    '|---|---|---|---|---|---|',
    ...timeline.vo.map((l) => `| ${l.id} | ${f(l.start)} | ${f(l.end)} | ${f(l.duration)} | ${Math.round(l.start * timeline.fps)} | ${l.text} |`),
    '',
    '## Markers',
    '',
    ...Object.entries(timeline.markers).map(([k, v]) => `- **${k}**: ${f(v)} s (frame ${Math.round(v * timeline.fps)})`),
    ...timeline.vo.filter((l) => l.phrases).flatMap((l) => l.phrases.map((p) => `- **${l.id} phrase** "${p.text}": clip at ${f(l.start + p.gridStart)} s (beat ${p.beatIndex}), voice onset ${f(p.absStart)} s`)),
    '',
    'Ducking: each VO span padded 0.15 s before and 0.3 s after, overlaps merged (`duck` in timeline.json).',
    '',
    '## Music (video/public/music/score.mp3)',
    '',
    timeline.music?.bpmGrid ? `Measured ${timeline.music.bpmGrid} BPM; beat 1 at ${timeline.music.beatOffset} s (every scene/VO time is ~${Math.round(timeline.music.beatOffset * 1000)} ms ahead of the audible beat, under one frame). Beat grid: video/src/data/beats.json.` : '',
    '',
    '| cue | start | end | what |',
    '|---|---|---|---|',
    ...(timeline.music?.sections || []).map((c) => `| ${c.id} | ${f(c.start)} | ${f(c.end)} | ${c.what ?? ''} |`),
    '',
  ].join('\n');
  writeFileSync(PATHS.timelineMd, md);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  writeTimeline(r);
  console.log(JSON.stringify({ durationSec: r.timeline.durationSec, scenes: r.spans.map((s) => `${s.id} ${s.start}-${s.end}`), markers: r.timeline.markers }, null, 1));
  console.log(r.timeline.vo.map((l) => `${l.id} ${l.start}-${l.end}`).join('\n'));
}
