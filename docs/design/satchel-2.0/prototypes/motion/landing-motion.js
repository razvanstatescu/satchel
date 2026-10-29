/* Satchel 2.0 landing motion (motion designer, prototype). Needs motion-kit.js. WAAPI only; transform and opacity.
 *
 * 1. The hero loop: one 12 s clock, every element a track over the whole loop (data, not code), started on the
 *    server frame (act 3, START_AT), so hydration changes nothing visible and the first thing that moves is the
 *    hand-off. Pause button, and paused off-screen (< 20 % visible), on a hidden tab and behind a dialog.
 * 2. Once-on-enter motions (what, how, clean strip, trust, finale): an element still below the fold at mount is put
 *    on its first frame and plays once when 60 % of it is in view; anything already on screen stays as drawn.
 * Reduced motion and no JS: nothing runs; the page is the lead's server frame.
 */
(function () {
  "use strict";
  const M = window.SatchelMotion;
  if (!M) return;
  const E = M.EASE;
  const root = document.documentElement;
  const full = () => root.dataset.motion === "full" && !M.reduced() && typeof root.animate === "function";
  const qs = new URLSearchParams(location.search);
  const capture = qs.has("capture");

  /* ── helpers ───────────────────────────────────────────────────────────────────────────────────────────── */
  /** Looping animations: every track spans the whole loop T (value at 0 must equal value at T). */
  function loop(tracks, T) {
    return M.mergeTracks(tracks).map(({ el, prop, frames }) => {
      const f = frames.slice().sort((a, b) => a[0] - b[0]);
      const kf = f.map(([t, v, e]) => { const k = { offset: Math.min(1, Math.max(0, t / T)), [prop]: v }; if (e) k.easing = e; return k; });
      if (kf[0].offset > 0) kf.unshift({ offset: 0, [prop]: f[0][1] });
      if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, [prop]: f[f.length - 1][1] });
      return el.animate(kf, { duration: T, iterations: Infinity, fill: "both", easing: "linear" });
    });
  }
  const reset = (el, prop, at, from, to, T) => ({ el, prop, frames: [[0, from], [at, from], [at + 1, to], [T, to]] });

  /* ── 1. THE HERO LOOP ──────────────────────────────────────────────────────────────────────────────────── */
  const T = 12000;
  const START_AT = 7900;                       // act 3, settled = the server frame
  const ACTS = [0, 3000, 5400, 9000];          // 1 inside · 2 listed · 3 checked · 4 coins included (the hand-off)
  const H = {                                   // the timeline, in ms (motion-spec.md §8 mirrors this table)
    fadeIn: 380, coins: [600, 1050], toPaused: 3200, tagIn: 3500, slipIn: 5600, ticks: [6300, 6550, 6800],
    verdict: 7100, sparks: [7300, 7420], tagOff: 9000, slipOut: 9050, hand: 9350, seamOut: 11500, seamDone: 11850,
    capOut: [3000, 5400, 9000, 11700],
  };
  // the hand-off inside the loop: the same physics as the app (motion-kit handoffTimes), offset to H.hand
  const HT = M.handoffTimes(460);
  const at = (x) => H.hand + x;
  const TOUCH = at(HT.touch);

  function heroTracks(fig, dx) {
    const q = (s) => fig.querySelector(s);
    const qa = (s) => Array.from(fig.querySelectorAll(s));
    const card = q('[data-el="card"]'), hanger = q('[data-el="hanger"]'), plate = q('[data-el="plate"]');
    const tr = [];
    const R = H.seamDone + 1;                   // the reset instant: everything behind the faded-out card goes back to act 1
    // the carrier: fades in at the seller's end, is carried dx in act 4, fades out at the seam
    tr.push({ el: card, prop: "opacity", frames: [[0, 0, E.out], [H.fadeIn, 1], [H.seamOut, 1, E.in], [H.seamDone, 0], [T, 0]] });
    tr.push({ el: card, prop: "translate", frames: [[0, "0 8px", E.out], [H.fadeIn, "0 0"], [at(HT.c0), "0 0", E.carry], [at(HT.c1), `${dx}px 0`], [H.seamDone, `${dx}px 0`], [R, "0 8px"], [T, "0 8px"]] });
    // the hanger: lift, swing, set down, press 2 px into the shadow (the brand's 10° pendulum)
    tr.push({ el: hanger, prop: "translate", frames: [[0, "0 0"], [at(0), "0 0", E.out], [at(HT.liftEnd), "0 -10px"], [at(HT.fall), "0 -10px", E.fall], [TOUCH, "0 2px", E.out], [at(HT.settle), "0 0"], [T, "0 0"]] });
    tr.push({ el: hanger, prop: "scale", frames: [[0, "1"], [at(0), "1", E.out], [at(HT.liftEnd), "1.02"], [at(HT.fall), "1.02", E.fall], [TOUCH, "1"], [T, "1"]] });
    tr.push({ el: hanger, prop: "rotate", frames: [[0, "0deg"], ...HT.swing.map(([ms, deg], i, a) => [at(ms), `${deg}deg`, i === a.length - 2 ? E.out : E.swing]), [T, "0deg"]] });
    tr.push({ el: plate, prop: "translate", frames: [[0, "0 0"], [at(0), "0 0", E.out], [at(HT.liftEnd), "0 10px"], [at(HT.fall), "0 10px", E.fall], [TOUCH, "0 -2px", E.out], [at(HT.settle), "0 0"], [T, "0 0"]] });
    tr.push({ el: plate, prop: "opacity", frames: [[0, 1], [at(0), 1, E.out], [at(HT.liftEnd), 0.5], [at(HT.fall), 0.5, E.fall], [TOUCH, 1], [T, 1]] });
    // act 1: the coins stick on, one after the other; act 4: they hop once after the landing (they came along)
    [["btc", H.coins[0], TOUCH + 300], ["eth", H.coins[1], TOUCH + 450]].forEach(([k, t0, hop]) => {
      const row = q(`[data-el="coin-${k}"]`), coin = row.querySelector(".coin");
      tr.push(...M.stickOnTracks(coin, t0, { from: 1.7, turn: k === "btc" ? -18 : 18 }));
      tr.push(...M.hopTracks(coin, hop));
      tr.push(reset(coin, "opacity", R, 1, 0, T), reset(coin, "scale", R, "1", "1.7", T), reset(coin, "rotate", R, "0deg", `${k === "btc" ? -18 : 18}deg`, T));
      for (const el of row.querySelectorAll(".card__amt, .card__tick")) {
        tr.push(...M.appearTracks(el, t0 + 60, 220, 6));
        tr.push(reset(el, "opacity", R, 1, 0, T), reset(el, "translate", R, "0 0", "0 6px", T));
      }
    });
    // the pill: Active → Paused for sale (act 2) → Active again for the new owner (act 4, on the landing)
    const pa = q('[data-pill="active"]'), pp = q('[data-pill="paused"]');
    tr.push(...M.morphTracks(pa, pp, H.toPaused), ...M.morphTracks(pp, pa, TOUCH));
    // act 2: the price tag swings in on its string; act 4: it unclips and falls
    const tag = q('[data-el="tag"]');
    tr.push({ el: tag, prop: "opacity", frames: [[0, 0], [H.tagIn, 0, E.out], [H.tagIn + 100, 1], [H.tagOff, 1, E.in], [H.tagOff + 320, 0], [T, 0]] });
    tr.push({ el: tag, prop: "rotate", frames: [[0, "28deg"], [H.tagIn, "28deg", E.swing], [H.tagIn + 290, "-12deg", E.swing], [H.tagIn + 560, "6.5deg", E.swing], [H.tagIn + 820, "-3deg", E.swing], [H.tagIn + 1060, "1.2deg", E.out], [H.tagIn + 1260, "0deg"], [H.tagOff, "0deg", E.in], [H.tagOff + 320, "30deg"], [T, "28deg"]] });
    // (no drop on the way in: its string's top stays pinned to the card's edge, which is the swing's pivot)
    tr.push({ el: tag, prop: "translate", frames: [[0, "0 0"], [H.tagOff, "0 0", E.in], [H.tagOff + 320, "0 36px"], [H.tagOff + 321, "0 0"], [T, "0 0"]] });
    // act 3: the buyer's check slip comes in, its rows tick in order, the verdict sticks on, sparkles pop
    const slip = q('[data-el="slip"]');
    tr.push({ el: slip, prop: "opacity", frames: [[0, 0], [H.slipIn, 0, E.out], [H.slipIn + 200, 1], [H.slipOut, 1, E.in], [H.slipOut + 300, 0], [T, 0]] });
    tr.push({ el: slip, prop: "translate", frames: [[0, "0 28px"], [H.slipIn, "0 28px", E.out], [H.slipIn + 450, "0 0"], [H.slipOut, "0 0", E.in], [H.slipOut + 300, "0 24px"], [T, "0 28px"]] });
    tr.push({ el: slip, prop: "rotate", frames: [[0, "4deg"], [H.slipIn, "4deg", E.out], [H.slipIn + 450, "0deg"], [H.slipOut, "0deg", E.in], [H.slipOut + 300, "3deg"], [T, "4deg"]] });
    [1, 2, 3].forEach((k, i) => {
      const used = q(`[data-el="sig-${k}"] [data-state="used"]`), chk = q(`[data-el="sig-${k}"] [data-state="checking"]`);
      tr.push(...M.morphTracks(chk, used, H.ticks[i]));
      tr.push(reset(chk, "opacity", R, 0, 1, T), reset(chk, "translate", R, "0 -8px", "0 0", T));
      tr.push(reset(used, "opacity", R, 1, 0, T), reset(used, "translate", R, "0 0", "0 8px", T));
    });
    const verdict = q('[data-el="verdict"]');
    tr.push(...M.stickOnTracks(verdict, H.verdict, { from: 1.3, turn: 0 }));
    tr.push(reset(verdict, "opacity", R, 1, 0, T), reset(verdict, "scale", R, "1", "1.3", T), reset(verdict, "rotate", R, "0deg", "0deg", T));
    qa('[data-el="spark"]').forEach((sp, i) => {
      const t0 = H.sparks[i] || H.sparks[0];
      tr.push({ el: sp, prop: "opacity", frames: [[0, 0], [t0, 0], [t0 + 80, 1], [H.tagOff, 1, E.in], [H.tagOff + 200, 0], [T, 0]] });
      tr.push({ el: sp, prop: "scale", frames: [[0, "0.2"], [t0, "0.2", E.out], [t0 + 180, "1.15", E.inOut], [t0 + 300, "1"], [H.tagOff + 200, "0.6"], [T, "0.2"]] });
      tr.push({ el: sp, prop: "rotate", frames: [[0, "-40deg"], [t0, "-40deg", E.out], [t0 + 300, "0deg"], [11000, "0deg"], [T, "-40deg"]] });
    });
    // act 4: the lemon Yours sticks on as the card lands
    const yours = q('[data-el="yours"]');
    tr.push(...M.stickOnTracks(yours, TOUCH + 40));
    tr.push(reset(yours, "opacity", R, 1, 0, T), reset(yours, "scale", R, "1", "1.6", T), reset(yours, "rotate", R, "0deg", "-16deg", T));
    // the caption ticker and the progress bars
    const caps = [1, 2, 3, 4].map((k) => q(`[data-cap="${k}"]`));
    caps.forEach((c, i) => tr.push(...M.morphTracks(c, caps[(i + 1) % 4], H.capOut[i])));
    qa(".stage__step > b").forEach((b, i) => {
      const a0 = ACTS[i], a1 = [3000, 5400, START_AT, 11400][i];
      tr.push({ el: b, prop: "scale", frames: [[0, "0 1"], [a0, "0 1", "linear"], [a1, "1 1"], [11550, "1 1", E.inOut], [11900, "0 1"], [T, "0 1"]] });
    });
    return tr;
  }

  function mountHero(fig) {
    if (!fig) return null;
    const btn = fig.querySelector("[data-pause]");
    const steps = Array.from(fig.querySelectorAll(".stage__step"));
    const scene = fig.querySelector(".stage__scene"), card = fig.querySelector('[data-el="card"]');
    let anims = [], userPaused = false, onScreen = true, inert = false, raf = 0, lastAct = 3;
    const isPaused = () => userPaused || !onScreen || inert || document.hidden;
    const setAct = (n) => {
      if (n === lastAct) return;
      lastAct = n;
      fig.setAttribute("data-act", String(n));
      steps.forEach((li, i) => {
        li.toggleAttribute("data-done", i + 1 < n);
        if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
    };
    const actAt = (t) => { t = ((t % T) + T) % T; return t < ACTS[1] ? 1 : t < ACTS[2] ? 2 : t < ACTS[3] ? 3 : 4; };
    const watch = () => { raf = 0; if (!anims.length) return; setAct(actAt(anims[0].currentTime)); if (!isPaused()) raf = requestAnimationFrame(watch); };
    function sync() {
      const p = isPaused();
      fig.classList.toggle("stage--paused", p);
      if (!anims.length) return;
      const t0 = anims[0].currentTime;
      for (const a of anims) { if (p) a.pause(); else { a.currentTime = t0; a.play(); } }
      if (!p && !raf) raf = requestAnimationFrame(watch);
    }
    function stop() {
      anims.forEach((a) => a.cancel());
      anims = [];
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastAct = 0;
      setAct(3);                                // back to the server frame
    }
    function start(t) {
      stop();
      if (!full()) return;
      // one layout read: how far the card can travel and still swing inside the sky field. The 10° arrival swing
      // reaches 0.174 × (card height + 16) past the card's right edge; the field's side padding absorbs part of it.
      const pad = parseFloat(getComputedStyle(fig).paddingRight) || 0;
      const room = Math.max(0, Math.round(0.174 * (card.offsetHeight + 16)) - pad + 6);
      const dx = Math.max(0, Math.round(scene.clientWidth - card.offsetWidth - 2 * card.offsetLeft - room));
      anims = loop(heroTracks(fig, dx), T);
      anims.forEach((a) => (a.currentTime = t));
      setAct(actAt(t));
      sync();
    }
    btn && btn.addEventListener("click", () => {
      userPaused = !userPaused;
      btn.setAttribute("aria-pressed", String(userPaused));
      btn.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
      sync();
    });
    const io = new IntersectionObserver((es) => { const e = es[es.length - 1]; onScreen = e.isIntersecting && e.intersectionRatio >= 0.2; sync(); }, { threshold: [0, 0.2] });
    io.observe(fig);
    document.addEventListener("visibilitychange", sync);
    const inInert = () => { for (let n = fig; n; n = n.parentElement) if (n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true") return true; return false; };
    new MutationObserver(() => { const now = inInert(); if (now !== inert) { inert = now; sync(); } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["inert", "aria-hidden"] });
    let rz = 0;
    addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (anims.length) start(anims[0].currentTime % T); }, 200); });
    new MutationObserver(() => { if (full()) { if (!anims.length) start(START_AT); } else stop(); }).observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    if (!capture) start(START_AT);
    return {
      T, START_AT, ACTS, H,
      start, stop,
      seek(ms) { if (!anims.length) start(ms); anims.forEach((a) => { a.pause(); a.currentTime = ms; }); setAct(actAt(ms)); },
      play() { userPaused = false; sync(); },
      pause() { userPaused = true; sync(); },
    };
  }

  /* ── 2. ONCE ON ENTER ──────────────────────────────────────────────────────────────────────────────────── */
  const ENTER = {};
  /** def: { trigger, T, tracks(), after?() }. Below the fold at mount: first frame now, plays at 60 % in view. */
  function onEnter(name, def, chain) {
    const trig = document.querySelector(def.trigger);
    if (!trig) return;
    let h = null, played = false;
    const make = () => { if (h) h.cancel(); h = M.play(def.tracks(), def.T, { name, keep: true }); h.seek(0); return h; };
    const go = () => {
      if (played) return;
      played = true;
      const run = () => {
        if (!h) make();
        h.anims.forEach((a) => a.play());
        h.finished.then(() => { if (def.after) def.after(); if (h) { h.cancel(); h = null; } });
      };
      if (chain) chain(run); else run();
    };
    ENTER[name] = { T: def.T, seek(ms) { make(); h.seek(ms); }, start() { played = false; make(); go(); } };
    if (!full() || capture) return;
    const r = trig.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return;          // already on screen: stays as drawn
    make();                                                    // its first frame, while it is still below the fold
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.intersectionRatio >= 0.6) { io.disconnect(); go(); } }, { threshold: [0.6] });
    io.observe(trig);
  }
  /** Beats of the clean strip play one after another, at least GAP apart, even when several enter together. */
  const GAP = 700;
  let nextSlot = 0;
  const inTurn = (run) => { const now = performance.now(); const wait = Math.max(0, nextSlot - now); nextSlot = Math.max(now, nextSlot) + GAP; setTimeout(run, wait); };

  const swingIn = (el, d, amp) => [
    { el, prop: "opacity", frames: [[0, 0], [d, 0, E.out], [d + 120, 1]] },
    { el, prop: "rotate", frames: [[0, `${amp}deg`], [d, `${amp}deg`, E.swing], [d + 260, `${-amp * 0.56}deg`, E.swing], [d + 520, `${amp * 0.31}deg`, E.swing], [d + 770, `${-amp * 0.16}deg`, E.swing], [d + 1000, `${amp * 0.06}deg`, E.out], [d + 1180, "0deg"]] },
  ];

  function mountEnter() {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    // What it is: the address tags swing in on their strings (about the string's top, on the card's edge)
    onEnter("what", { trigger: ".what__art", T: 1400, tracks: () => [...swingIn($('[data-el="addr-btc"]'), 0, 16), ...swingIn($('[data-el="addr-eth"]'), 140, -16)] });
    // How it works, step 1: the New card drops into its shadow, then New sticks on, then the sparkles
    onEnter("how-mint", { trigger: '[data-el="mint-card"]', T: 1000, tracks: () => {
      const c = $('[data-el="mint-card"]'), scene = c.closest(".step__scene");
      return [
        { el: c, prop: "translate", frames: [[0, "0 -14px", E.fall], [240, "0 2px", E.out], [360, "0 0"]] },
        { el: c, prop: "scale", frames: [[0, "1.06", E.fall], [240, "1"]] },
        { el: c, prop: "opacity", frames: [[0, 0, E.out], [100, 1]] },
        ...M.stickOnTracks(c.querySelector(".badge--new"), 380),
        ...$$(".step__spark").filter((s) => scene.contains(s)).flatMap((s, i) => [
          { el: s, prop: "opacity", frames: [[0, 0], [560 + i * 120, 0], [640 + i * 120, 1]] },
          { el: s, prop: "scale", frames: [[0, "0.2"], [560 + i * 120, "0.2", E.out], [740 + i * 120, "1.15", E.inOut], [860 + i * 120, "1"]] },
        ]),
      ]; } });
    // How it works, step 3: released from its drawn −8° pose, the card swings to rest above the new owner
    onEnter("how-give", { trigger: ".swing-pose", T: 1800, tracks: () => [{ el: $(".swing-pose"), prop: "rotate", frames: [[0, "0deg", E.swing], [380, "14.2deg", E.swing], [760, "3.6deg", E.swing], [1140, "10.8deg", E.swing], [1500, "6.6deg", E.out], [1800, "8deg"]] }],
      after: () => $(".swing-pose").setAttribute("data-rest", "") });
    // The catch, beat by beat
    const beat = (k) => $(`.frame[data-beat="${k}"]`);
    onEnter("beat-1", { trigger: '.frame[data-beat="1"] .frame__desk', T: 520, tracks: () => {
      const n = beat(1).querySelector(".desk-note");
      return [{ el: n, prop: "opacity", frames: [[0, 0, E.out], [160, 1]] }, { el: n, prop: "translate", frames: [[0, "-56px -18px", E.out], [460, "0 0"]] }, { el: n, prop: "rotate", frames: [[0, "-8deg", E.out], [460, "0deg"]] }];
    } }, inTurn);
    onEnter("beat-2", { trigger: '.frame[data-beat="2"] .frame__desk', T: 820, tracks: () => {
      const f = beat(2), coin = f.querySelector('[data-el="eth-coin"]'), amt = f.querySelector('[data-el="eth-amt"]');
      return [
        ...M.morphTracks(amt.querySelector("[data-old]"), amt.querySelector("[data-new]"), 120),
        { el: coin.querySelector("[data-old]"), prop: "opacity", frames: [[0, 1], [120, 1, E.in], [240, 0]] },
        { el: coin.querySelector("[data-new]"), prop: "opacity", frames: [[0, 0], [120, 0, E.out], [240, 1]] },
        { el: coin, prop: "translate", frames: [[0, "0 0"], [120, "0 0", E.out], [260, "0 2px"], [380, "0 0"]] },
        ...M.stickOnTracks(f.querySelector(".stamp"), 440, { from: 1.8, turn: -14 }),
      ]; } }, inTurn);
    onEnter("beat-3", { trigger: '.frame[data-beat="3"] .frame__desk', T: 640, tracks: () => {
      const row = beat(3).querySelector(".slip__row--hl");
      return [{ el: row, prop: "opacity", frames: [[0, 0, E.out], [180, 1]] }, { el: row, prop: "translate", frames: [[0, "8px 0", E.out], [260, "0 0"]] },
        ...M.stickOnTracks(row.querySelector(".slip__state svg"), 200, { from: 1.6, turn: -24 })];
    } }, inTurn);
    onEnter("beat-4", { trigger: '.frame[data-beat="4"] .frame__desk', T: 820, tracks: () => {
      const f = beat(4), head = f.querySelector(".slip__head"), bad = f.querySelector(".slip__state--danger"), buy = f.querySelector(".desk-buy--off");
      return [...M.appearTracks(head, 0, 200, 6), ...M.stickOnTracks(bad, 180, { from: 1.4, turn: 0 }),
        { el: buy, prop: "translate", frames: [[0, "0 0"], [540, "0 0", E.inOut], [590, "-2px 0", E.inOut], [640, "2px 0", E.inOut], [690, "-2px 0", E.inOut], [740, "2px 0", E.out], [790, "0 0"]] }];
    } }, inTurn);
    onEnter("beat-5", { trigger: '.frame[data-beat="5"] .frame__desk', T: 720, tracks: () => {
      const f = beat(5), row = f.querySelector('[data-el="row5"]'), head = f.querySelector('[data-el="head5"]'), buy = f.querySelector('[data-el="buy5"]');
      return [
        ...M.morphTracks(row.querySelector("[data-old]"), row.querySelector("[data-new]"), 0),
        ...M.morphTracks(head.querySelector("[data-old]"), head.querySelector("[data-new]"), 140),
        { el: buy.querySelector("[data-old]"), prop: "opacity", frames: [[0, 1], [300, 1, E.in], [420, 0]] },
        { el: buy.querySelector("[data-new]"), prop: "opacity", frames: [[0, 0], [300, 0, E.out], [380, 1]] },
        { el: buy.querySelector("[data-new]"), prop: "translate", frames: [[0, "0 3px"], [300, "0 3px", E.out], [520, "0 0"]] },
      ]; } }, inTurn);
    // Trust: the two coins peek up from behind the contract facts
    onEnter("trust", { trigger: ".trust__art", T: 640, tracks: () => $$(".trust__peek img").map((img, i) => ({ el: img, prop: "translate", frames: [[0, "0 34px"], [i * 90, "0 34px", "cubic-bezier(.34, 1.4, .64, 1)"], [i * 90 + 440, "0 0"]] })) });
    // Finale: the S lands on the cover and stamps into its own drop ("Stick it on.")
    onEnter("finale", { trigger: ".finale", T: 520, tracks: () => {
      const face = $(".finale__s .m-s-face"), drop = $(".finale__s > path");
      // the drop darkens as the S comes down onto it (a sticker's shadow sharpens as it nears the surface)
      return [{ el: drop, prop: "opacity", frames: [[0, 0, E.in], [300, 1]] },
        { el: face, prop: "opacity", frames: [[0, 0], [60, 0, E.out], [120, 1]] }, { el: face, prop: "translate", frames: [[0, "0 -64px"], [60, "0 -64px", E.fall], [300, "0 10px", E.out], [460, "0 0"]] }];
    } });
  }

  /* ── 3. Hanging charms in the hero: one swing after load, one per brush; never a loop ───────────────────── */
  function mountCharms() {
    const hangs = Array.from(document.querySelectorAll(".shelf__hang, .charm-row__coin")).filter((el) => el.offsetParent !== null);
    if (!full() || capture) return;
    hangs.forEach((el, i) => {
      setTimeout(() => M.swing(el, { amp: i % 2 ? -6 : 7, halfMs: 520, ratio: 0.6, n: 4 }), 450 + i * 110);
      el.addEventListener("pointerenter", (e) => M.swing(el, { amp: 5, halfMs: 520, ratio: 0.6, n: 4, dir: e.movementX < 0 ? -1 : 1 }));
    });
  }

  const hero = mountHero(document.querySelector("[data-stage]"));
  mountEnter();
  mountCharms();
  window.__landing = { hero, enter: ENTER };
})();
