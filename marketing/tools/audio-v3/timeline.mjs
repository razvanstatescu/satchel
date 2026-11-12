#!/usr/bin/env node
// Master timeline v5 (Satchel 2.0 film body; the H0 cold open plays before it as its own Series item, so H1 stays at 0)
// at 120 BPM: lines on beats (0.5 s), no overlaps, every scene start on a beat.
// Reads tools/audio-v3/work/vo.json, writes video/src2/data/timeline.json and script/timeline-v5.md.
//   node tools/audio-v3/timeline.mjs
// v5 is a re-time of v4, not a re-layout: every line keeps its v4 offset inside its scene (the scenes are choreographed
// to it), and only the still holds at scene ends change (notes/qa-v5 "Trim candidates"). The search (dynamic
// programming over the scene ends) lands as close to the v5 targets as these rules allow:
//   - a scene ends at least 0.03 s after its last word (the file's silent tail may run 0.05 s past the cut);
//   - across a cut, the next line's first word starts at least K.minAudibleGap after the last word (0.28 s, the
//     hook's own V02 -> V03 gap); a cut that would crowd the next line is pushed later instead of moving the line;
//   - C1 keeps at least 1 s of its dark pause after V16;
//   - drop -> landing is a whole number of bars, so the score needs only bar-line edits after the drop.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS, VOICE } from './config.mjs';
import { r3, readJson, writeJson } from './lib.mjs';

export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT, FPS = 30;
const EPS = 1e-6;
const ceilTo = (t, q) => Math.ceil(t / q - EPS) * q;
const onGrid = (t, q) => Math.abs(t / q - Math.round(t / q)) < EPS;

const K = {
  gap: 0.5, // min silence between consecutive lines inside a scene (file end -> next file start; exceptions below)
  hookGap: 0.05, // V02 -> V03: the frame-by-frame opening (concepts-v2 §4.4)
  minAudibleGap: 0.28, // across a cut: last word end -> next first word start
  wordTail: 0.03, // a scene ends at least this long after its last word...
  fileOverhang: 0.05, // ...and its last file may run at most this far past the cut (silent tail)
  darkPause: 1.0, // C1: at least this much after V16's file end
  total: { min: 126, max: 131, weight: 2 }, // v5 body target ≈ 128 s (v4 133 s minus the trims)
};

// SCRIPT-v4 scenes with the v5 targets (v4 length -> v5): H2 9 -> 8.5, P1 6 -> 5.5, P2 8 -> 7.5, P4 8 -> 7.5,
// P5 9 -> 8.5, P6 7 -> 6.5, C1 13 -> 12, T3 7.5 -> 7, T4 5 -> 4.5, T5 9.5 -> 10 (+0.5 at its end), T6 5.5 -> 5; the rest
// unchanged. leads = each scene's v4 lead-in, fixed so that the choreography stays put.
const SCENES = [
  { id: 'H1', fixed: true },
  { id: 'H2', lines: ['V03', 'V04'], target: 8.5, leads: [0], gaps: { V04: 0.35 } },
  { id: 'P1', lines: ['V05'], target: 5.5, leads: [0] },
  { id: 'P2', lines: ['V06'], target: 7.5, leads: [0] },
  { id: 'P3', lines: ['V07', 'V08'], target: 9, leads: [0] },
  { id: 'P4', lines: ['V09'], target: 7.5, leads: [0.5] },
  { id: 'P5', lines: ['V10'], target: 8.5, leads: [0] },
  { id: 'P6', lines: ['V12', 'V13'], target: 6.5, leads: [0], vignette: 4 }, // two 4 s vignettes
  { id: 'C1', lines: ['V14', 'V15', 'V16'], target: 12, kind: 'catch' }, // musicStop on the cut
  { id: 'T0', lines: ['V17'], target: 4, kind: 'flip' }, // 2-bar riser
  { id: 'T1', lines: ['V18'], target: 6, leads: [0] }, // the drop on the cut
  { id: 'T2', lines: ['V19'], target: 6.5, leads: [0.5] },
  { id: 'T3', lines: ['V20'], target: 7, leads: [0.5] },
  { id: 'T4', lines: ['V21'], target: 4.5, leads: [0] },
  { id: 'T5', lines: ['V22', 'V23'], target: 10, leads: [0], overWeight: 0.5 }, // crammed: extra time costs less
  { id: 'T6', lines: ['V24'], target: 5, leads: [0] }, // blocked: the band drops to bass + tick for 2 bars
  { id: 'T7', lines: ['V25', 'V26'], target: 10.5, leads: [0], kind: 'handoff' },
  { id: 'E1', lines: ['V27'], target: 6.5, kind: 'end' },
];

/** H1 is drawn frame by frame (concepts-v2 §4.4): V01 ≈ 0.9 s, V02 ≈ 2.1 s, the swing lands at ≈ 2.6 s, V03 at ≈ 3.1 s. */
function layoutH1(vo) {
  const placed = [{ id: 'V01', start: 1.0 }, { id: 'V02', start: 2.0 }];
  return { placed, end: 3.0, last: { id: 'V02', start: 2.0 }, markers: { hookLand: 2.5 } };
}

const wordStart = (vo, p) => p.start + vo[p.id].words[0].start;
const wordEnd = (vo, p) => p.start + vo[p.id].words.at(-1).end;
const fileEnd = (vo, p) => p.start + vo[p.id].duration;

/**
 * Lay out one scene from `t0` with its fixed lead-in. Returns null when its first line would crowd the previous line
 * (the previous scene then has to end later), else the minimum end and the markers.
 */
function layout(sc, t0, lead, vo, prev) {
  const placed = [], markers = {};
  const put = (id, start) => { placed.push({ id, start: r3(start) }); return placed.at(-1); };
  const fe = () => fileEnd(vo, placed.at(-1));
  const first = (id, start) => {
    const p = put(id, start);
    if (prev && wordStart(vo, p) - wordEnd(vo, prev) < K.minAudibleGap - EPS) return false;
    if (prev && p.start < fileEnd(vo, prev) - K.fileOverhang - EPS) return false;
    return true;
  };
  const sceneNeed = () => Math.max(wordEnd(vo, placed.at(-1)) + K.wordTail, fe() - K.fileOverhang);
  if (sc.kind === 'catch') {
    if (!first('V14', t0 + Math.max(lead, 0.5))) return null;
    put('V15', ceilTo(fe() + 0.75, BEAT));
    // the slip is used (thud) and a sub hit lands, then "So how does a buyer know it's clean?" (as v4)
    const subHit = ceilTo(Math.max(t0 + 8.5, fe() + 1.9), BEAT);
    markers.musicStop = t0; markers.thud = subHit - 1.5; markers.subHit = subHit;
    put('V16', subHit + 0.5);
    return { placed, need: fe() + K.darkPause, markers };
  }
  if (sc.kind === 'flip') {
    if (!first('V17', t0 + 1.5)) return null;
    markers.flip = t0 + 1; // whoosh on the flip
    return { placed, need: Math.max(t0 + 4, sceneNeed()), markers, exact: true };
  }
  if (sc.kind === 'handoff') {
    if (!first('V25', t0 + lead)) return null;
    const landing = t0 + ceilTo(fe() + 0.3 - t0, BAR); // the swing lands on the bar after V25 (from T7's start); V26 rides it
    markers.landing = landing;
    put('V26', landing);
    return { placed, need: fe() + 1.6, markers };
  }
  if (sc.kind === 'end') {
    if (!first('V27', t0 + 0.5)) return null;
    const endPress = ceilTo(fe() + 1.2, BEAT); // the mark's button press on a beat; ring-out, silent last 0.5 s
    markers.endPress = endPress;
    return { placed, need: endPress + 1.5, markers, exact: true };
  }
  for (const [k, id] of sc.lines.entries()) {
    if (k === 0) {
      const gapOk = sc.id === 'H2' ? fileEnd(vo, prev) + K.hookGap <= t0 + lead + EPS : true;
      if (!gapOk || !first(id, t0 + lead)) return null;
    } else if (sc.vignette) {
      // the next vignette's downbeat (`vignette` s later); a long line pushes it to the following beat
      put(id, Math.max(placed[k - 1].start + sc.vignette, ceilTo(fe() + K.gap, BEAT)));
    } else put(id, ceilTo(fe() + (sc.gaps?.[id] ?? K.gap), BEAT));
  }
  return { placed, need: sceneNeed(), markers };
}

/** DP over the scene ends: state = scene start (+ the last placed line); options = beat-aligned ends from the minimum up. */
function bestLayout(vo) {
  let states = new Map();
  const h1 = layoutH1(vo);
  states.set('3', { t: 3, last: h1.last, cost: 0, trail: [{ sc: SCENES[0], start: 0, end: 3, placed: h1.placed, markers: h1.markers }] });
  for (let i = 1; i < SCENES.length; i++) {
    const sc = SCENES[i];
    const nextStates = new Map();
    for (const st of states.values()) {
      for (const lead of sc.leads ?? [0]) {
        const a = layout(sc, st.t, lead, vo, st.last);
        if (!a) continue;
        if (sc.kind === 'handoff') {
          const drop = st.trail.find((x) => x.sc.id === 'T1').start;
          if (!onGrid(a.markers.landing - drop, BAR)) continue; // whole bars from the drop to the landing
        }
        const min = a.exact ? a.need : ceilTo(a.need, BEAT);
        const ends = a.exact ? [min] : [0, 0.5, 1, 1.5, 2].map((x) => min + x);
        for (const end of ends) {
          const len = end - st.t;
          const dev = sc.target ? len - sc.target : 0;
          const cost = st.cost + (dev > 0 ? dev * (sc.overWeight ?? 1) : -dev);
          const key = `${r3(end)}|${a.placed.at(-1).id}@${a.placed.at(-1).start}`; // the last line's position decides what the next cut allows
          const cand = { t: end, last: a.placed.at(-1), cost, trail: [...st.trail, { sc, start: st.t, end, placed: a.placed, markers: a.markers }] };
          if (!nextStates.has(key) || nextStates.get(key).cost > cost + EPS) nextStates.set(key, cand);
        }
      }
    }
    states = nextStates;
    if (!states.size) throw new Error(`no feasible layout at ${sc.id}`);
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
    '# Satchel 2.0 film: master timeline (v5 body)',
    '',
    `Generated by \`node tools/audio-v3/run.mjs\` from the voiced lines (do not edit by hand). ${timeline.bpm} BPM (beat ${timeline.beatSec} s, bar ${timeline.barSec} s), ${timeline.fps} fps.`,
    `**Total: ${f(timeline.durationSec)} s (${mmss(timeline.durationSec)}), ${timeline.durationInFrames} frames.** Voice: ${timeline.voice.name} (${timeline.voice.id}) / ${timeline.voice.model}.`,
    '',
    '## Scenes',
    '',
    'Scene starts are on beats. The score\'s bar lines move at its edits (see beats.json `downbeats`): even seconds up to the',
    'hard stop, then 58.5 + 2k s from the Night section to the end.',
    '',
    '| scene | start | end | length | VO |',
    '|---|---|---|---|---|',
    ...spans.map((s) => `| ${s.id} | ${f(s.start)} | ${f(s.end)} | ${f(s.end - s.start)} | ${timeline.vo.filter((l) => l.scene === s.id).map((l) => l.id).join(', ') || '(music only)'} |`),
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
