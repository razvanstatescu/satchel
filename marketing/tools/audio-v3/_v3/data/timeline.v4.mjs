#!/usr/bin/env node
// Master timeline v3 (Satchel 2.0 film) at 120 BPM: lines on beats (0.5 s), no overlaps, scenes on 2 s bars where
// sensible (a scene may end on a beat when a bar would waste time, except where the next scene must start on a bar:
// the catch's hard stop, the flip, the drop, the blocked dip, the hand-off, the end card).
// Reads tools/audio-v3/work/vo.json, writes video/src2/data/timeline.json and script/timeline-v3.md.
//   node tools/audio-v3/timeline.mjs
// The lead-ins and bar/beat snapping are searched (dynamic programming) to land closest to the SCRIPT-v3 scene targets
// with a total of about 2:10-2:15, so a re-voiced take re-times the whole film automatically.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS, VOICE } from './config.mjs';
import { r3, readJson, writeJson } from './lib.mjs';

export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, FPS = 30;
const EPS = 1e-6;
const ceilTo = (t, q) => Math.ceil(t / q - EPS) * q;

const K = {
  gap: 0.5, // min silence between consecutive lines (exceptions below)
  hookGap: 0.05, // V01 -> V02 -> V03: the frame-by-frame opening (concepts-v2 §4.4)
  tail: 0.15, // min music after a scene's last line before its cut (the next line still keeps K.gap)
  offBarPenalty: 0.4, // cost of a scene boundary on a beat instead of a bar
  total: { min: 129, max: 133, weight: 3 }, // v4 target ≈ 131 s
};

// SCRIPT-v4 scene order and targets (s). barStart: the scene must start on a bar (a music event lands on its cut).
// v4 vs v3: H2 8.5 (V04 0.5 s earlier), P2 7, P3 8.5, P4 8, P5 9, P6 8 (V11 cut), C1 12.5 (drain gap 1.5 s shorter;
// its hard stop may sit on a beat so that the flip and the drop stay on bars), T3 6.5, T6 6, T7 10, E1 6.5.
const SCENES = [
  { id: 'H1', fixed: true },
  { id: 'H2', lines: ['V03', 'V04'], target: 8.5, leads: [0], gaps: { V04: 0.35 } },
  { id: 'P1', lines: ['V05'], target: 6 },
  { id: 'P2', lines: ['V06'], target: 7 },
  { id: 'P3', lines: ['V07', 'V08'], target: 8.5 },
  { id: 'P4', lines: ['V09'], target: 8 },
  { id: 'P5', lines: ['V10'], target: 9 },
  { id: 'P6', lines: ['V12', 'V13'], target: 8, barStart: true, downbeats: 4 }, // two 4 s vignettes
  { id: 'C1', lines: ['V14', 'V15', 'V16'], target: 12.5, kind: 'catch' }, // musicStop on the cut
  { id: 'T0', lines: ['V17'], target: 4, barStart: true, kind: 'flip' }, // 2-bar riser
  { id: 'T1', lines: ['V18'], target: 6, barStart: true }, // the drop on the cut
  { id: 'T2', lines: ['V19'], target: 6.5 },
  { id: 'T3', lines: ['V20'], target: 6.5 },
  { id: 'T4', lines: ['V21'], target: 5 },
  { id: 'T5', lines: ['V22', 'V23'], target: 10.5 },
  { id: 'T6', lines: ['V24'], target: 6 }, // the band drops to bass + tick for 2 bars (v4: may start on a beat)
  { id: 'T7', lines: ['V25', 'V26'], target: 10, kind: 'handoff' }, // the landing itself is always on a bar
  { id: 'E1', lines: ['V27'], target: 6.5, kind: 'end' },
];

/** H1 is drawn frame by frame (concepts-v2 §4.4): V01 ≈ 0.9 s, V02 ≈ 2.1 s, the swing lands at ≈ 2.6 s, V03 at ≈ 3.1 s. */
function layoutH1(vo) {
  const placed = [{ id: 'V01', start: 1.0 }, { id: 'V02', start: 2.0 }];
  return { placed, end: 3.0, lastEnd: 2.0 + vo.V02.duration, markers: { hookLand: 2.5 } };
}

/** Lay out one scene from `t0` with a lead-in; returns the needed end (before snapping) and markers. */
function layout(sc, t0, lead, vo, prevEnd) {
  const placed = [], markers = {};
  let lastEnd = prevEnd;
  // the opening runs tight (V02 -> V03 as drawn in §4.4); everywhere else lines keep K.gap
  const startAt = (min) => ceilTo(Math.max(min, lastEnd + (sc.id === 'H2' && !placed.length ? K.hookGap : K.gap)), BEAT);
  const put = (id, start) => { placed.push({ id, start: r3(start) }); lastEnd = start + vo[id].duration; };
  if (sc.kind === 'catch') {
    put('V14', startAt(t0 + Math.max(lead, 0.5)));
    put('V15', ceilTo(lastEnd + 0.75, BEAT));
    // the slip is used (thud) and a sub hit lands, then "So how does a buyer know it's clean?" (v4: the drain gap is
    // 1.5 s shorter than v3's: V16 about 2.4 s after V15 ends)
    const subHit = ceilTo(Math.max(t0 + 8.5, lastEnd + 1.9), BEAT);
    markers.musicStop = t0; markers.thud = subHit - 1.5; markers.subHit = subHit;
    put('V16', subHit + 0.5);
    return { placed, need: lastEnd + 1.2, lastEnd, markers, barEnd: true };
  }
  if (sc.kind === 'flip') {
    put('V17', startAt(t0 + 1.5));
    markers.flip = t0 + 1; // whoosh on the flip
    return { placed, need: Math.max(t0 + 4, lastEnd + K.tail), lastEnd, markers, barEnd: true };
  }
  if (sc.kind === 'handoff') {
    put('V25', startAt(t0 + lead));
    const landing = ceilTo(lastEnd + 0.3, BAR); // the swing lands on a downbeat; V26 rides it
    markers.landing = landing;
    put('V26', landing);
    return { placed, need: lastEnd + 1.6, lastEnd, markers };
  }
  if (sc.kind === 'end') {
    put('V27', startAt(t0 + 0.5));
    const endPress = ceilTo(lastEnd + 1.2, BEAT); // the mark's button press on a beat; ring-out, silent last 0.5 s
    markers.endPress = endPress;
    return { placed, need: endPress + 1.5, lastEnd, markers, exact: true };
  }
  sc.lines.forEach((id, k) => {
    let start;
    if (sc.downbeats) {
      // on the vignette downbeats `downbeats` s apart; a long line pushes the next one to the following beat, not bar
      start = k === 0 ? ceilTo(Math.max(t0 + lead, lastEnd + K.gap), BAR) : Math.max(placed[k - 1].start + sc.downbeats, ceilTo(lastEnd + K.gap, BEAT));
    } else if (k === 0) start = startAt(t0 + lead);
    else start = ceilTo(lastEnd + (sc.gaps?.[id] ?? K.gap), BEAT);
    put(id, start);
  });
  return { placed, need: lastEnd + K.tail, lastEnd, markers };
}

/** DP over scenes: state = (scene start, last line end); options = lead-in x bar/beat snapping of the scene end. */
function bestLayout(vo) {
  let states = new Map();
  const h1 = layoutH1(vo);
  states.set(`3|${h1.lastEnd}`, { t: 3, prevEnd: h1.lastEnd, cost: 0, trail: [{ sc: SCENES[0], start: 0, end: 3, placed: h1.placed, markers: h1.markers }] });
  for (let i = 1; i < SCENES.length; i++) {
    const sc = SCENES[i], next = SCENES[i + 1];
    const nextStates = new Map();
    for (const st of states.values()) {
      if (sc.barStart && Math.abs(st.t / BAR - Math.round(st.t / BAR)) > EPS) continue;
      for (const lead of sc.leads ?? [0, 0.5, 1.0]) {
        const a = layout(sc, st.t, lead, vo, st.prevEnd);
        const snaps = a.exact ? ['exact'] : a.barEnd || next?.barStart ? ['bar'] : ['bar', 'beat'];
        for (const snap of snaps) {
          const end = snap === 'exact' ? a.need : ceilTo(a.need, snap === 'bar' ? BAR : BEAT);
          const len = end - st.t;
          let cost = st.cost + (sc.target ? Math.abs(len - sc.target) : 0) + (snap === 'beat' && Math.abs(end / BAR - Math.round(end / BAR)) > EPS ? K.offBarPenalty : 0) + lead * 0.01;
          const key = `${r3(end)}|${r3(a.lastEnd)}`;
          const cand = { t: end, prevEnd: a.lastEnd, cost, trail: [...st.trail, { sc, start: st.t, end, placed: a.placed, markers: a.markers }] };
          if (!nextStates.has(key) || nextStates.get(key).cost > cost) nextStates.set(key, cand);
        }
      }
    }
    states = nextStates;
  }
  let best = null;
  for (const st of states.values()) {
    const over = Math.max(0, K.total.min - st.t, st.t - K.total.max);
    const cost = st.cost + K.total.weight * over;
    if (!best || cost < best.cost) best = { ...st, cost };
  }
  return best;
}

export function build() {
  const manifest = readJson(resolve(PATHS.work, 'vo.json'));
  if (!manifest) throw new Error('run vo.mjs first');
  const vo = Object.fromEntries(manifest.lines.map((l) => [l.id, l]));
  const best = bestLayout(vo);
  const spans = best.trail.map((x) => ({ id: x.sc.id, start: r3(x.start), end: r3(x.end) }));
  const markers = Object.assign({}, ...best.trail.map((x) => x.markers));
  markers.drop = spans.find((s) => s.id === 'T1').start;
  markers.blocked = spans.find((s) => s.id === 'T6').start;
  const durationSec = r3(best.t);
  markers.end = durationSec;
  const sceneOf = Object.fromEntries(best.trail.flatMap((x) => x.placed.map((p) => [p.id, x.sc.id])));
  const placedAll = best.trail.flatMap((x) => x.placed);

  const voOut = placedAll.map(({ id, start }) => {
    const l = vo[id];
    const o = { id, scene: sceneOf[id], file: l.file, start, duration: l.duration, end: r3(start + l.duration), text: l.text, words: l.words };
    const ss = [0];
    l.words.forEach((w, k) => { if (k > 0 && /[.?!…]$/.test(l.words[k - 1].text)) ss.push(k); });
    if (ss.length > 1) o.sentenceStarts = ss.map((k) => (k === 0 ? 0 : l.words[k].start));
    if (l.phraseGrid) {
      // V23: three phrases re-spaced onto the beat grid. gridStart = where the phrase's clip starts (on a beat, relative
      // to the line); start = the aligner's first-word onset (relative); absStart = absolute time.
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
  for (const l of voOut) if (Math.abs(l.start / BEAT - Math.round(l.start / BEAT)) > EPS) throw new Error(`${l.id} not on a beat`);

  // VO spans padded 0.15 s before / 0.3 s after; overlapping spans (the hook) are merged
  const duck = [];
  for (const l of voOut) {
    const d = { start: r3(Math.max(0, l.start - 0.15)), end: r3(Math.min(durationSec, l.end + 0.3)), lines: [l.id] };
    const last = duck.at(-1);
    if (last && d.start <= last.end) { last.end = d.end; last.lines.push(l.id); } else duck.push(d);
  }

  const timeline = {
    fps: FPS, bpm: BPM, beatSec: BEAT, barSec: BAR, durationSec, durationInFrames: Math.round(durationSec * FPS),
    voice: { id: VOICE.id, name: VOICE.name, model: VOICE.model },
    scenes: spans,
    markers: Object.fromEntries(Object.entries(markers).map(([k, v]) => [k, r3(v)])),
    vo: voOut,
    duck,
    music: { file: `${PATHS.musicPrefix}/score.mp3` },
  };
  return { timeline, spans, cost: best.cost };
}

export function writeTimeline({ timeline, spans }) {
  const prev = readJson(resolve(PATHS.dataDir, 'timeline.json'));
  if (prev?.music && !prev.placeholder) { timeline.music = { ...prev.music, ...timeline.music }; delete timeline.music.pending; }
  writeJson(resolve(PATHS.dataDir, 'timeline.json'), timeline);
  const f = (x) => x.toFixed(2);
  const mmss = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  const md = [
    '# Satchel 2.0 film: master timeline (v4)',
    '',
    `Generated by \`node tools/audio-v3/run.mjs\` from the voiced lines (do not edit by hand). ${timeline.bpm} BPM (beat ${timeline.beatSec} s, bar ${timeline.barSec} s), ${timeline.fps} fps.`,
    `**Total: ${f(timeline.durationSec)} s (${mmss(timeline.durationSec)}), ${timeline.durationInFrames} frames.** Voice: ${timeline.voice.name} (${timeline.voice.id}) / ${timeline.voice.model}.`,
    '',
    '## Scenes',
    '',
    '| scene | start | end | length | on bar | VO |',
    '|---|---|---|---|---|---|',
    ...spans.map((s) => `| ${s.id} | ${f(s.start)} | ${f(s.end)} | ${f(s.end - s.start)} | ${Math.abs(s.start / 2 - Math.round(s.start / 2)) < 1e-6 ? 'bar ' + (s.start / 2 + 1) : 'beat'} | ${timeline.vo.filter((l) => l.scene === s.id).map((l) => l.id).join(', ') || '(music only)'} |`),
    '',
    '## Voiceover',
    '',
    '| line | scene | start | end | dur | frame | text |',
    '|---|---|---|---|---|---|---|',
    ...timeline.vo.map((l) => `| ${l.id} | ${l.scene} | ${f(l.start)} | ${f(l.end)} | ${f(l.duration)} | ${Math.round(l.start * timeline.fps)} | ${l.text} |`),
    '',
    '## Markers',
    '',
    ...Object.entries(timeline.markers).map(([k, v]) => `- **${k}**: ${f(v)} s (${mmss(v)}, frame ${Math.round(v * timeline.fps)})`),
    ...timeline.vo.filter((l) => l.phrases).flatMap((l) => l.phrases.map((p) => `- **${l.id} phrase** "${p.text}": clip at ${f(l.start + p.gridStart)} s (beat ${p.beatIndex}), voice onset ${f(p.absStart)} s`)),
    '',
    'Ducking: each VO span padded 0.15 s before and 0.3 s after, overlaps merged (`duck` in timeline.json).',
    '',
    `## Music (video/public/${PATHS.musicPrefix}/score.mp3)`,
    '',
    timeline.music?.bpmGrid ? `Measured ${timeline.music.bpmGrid} BPM; beat 1 at ${timeline.music.beatOffset} s. Beat grid: video/src2/data/beats.json.` : '(not scored yet)',
    '',
    ...(timeline.music?.sections?.length ? ['| cue | start | end | what |', '|---|---|---|---|', ...timeline.music.sections.map((c) => `| ${c.id} | ${f(c.start)} | ${f(c.end)} | ${c.what ?? ''} |`)] : []),
    '',
  ].join('\n');
  writeFileSync(PATHS.timelineMd, md);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  writeTimeline(r);
  console.log(JSON.stringify({ durationSec: r.timeline.durationSec, cost: +r.cost.toFixed(2), scenes: r.spans.map((s) => `${s.id} ${s.start}-${s.end} (${(s.end - s.start).toFixed(1)})`), markers: r.timeline.markers }, null, 1));
  console.log(r.timeline.vo.map((l) => `${l.id} ${l.scene} ${l.start}-${l.end}`).join('\n'));
}
