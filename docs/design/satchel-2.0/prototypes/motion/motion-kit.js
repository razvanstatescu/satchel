/* Satchel 2.0 motion kit (motion designer, prototype). Plain script, no dependencies: WAAPI only.
 *
 * Rules it follows (motion-spec.md §0):
 *  - The DOM's static CSS is the END state. Every motion animates FROM earlier states (fill: "both"), and the
 *    animations are cancelled when they finish, so the page rests on plain CSS (no-JS = reduced = final).
 *  - transform (as the individual translate / rotate / scale properties) and opacity only.
 *  - One clock per motion: every track of a motion shares one duration T, so seeking is one number (QA, captures).
 *  - Reduced motion: each motion has an opacity-only variant (a cross-fade or a dip), never a jump cut.
 * The data tables (HANDOFF, SWING, …) are what the builders port to apps/web (src/lib/motion/*.ts).
 */
(function () {
  "use strict";

  /* ── 0. Easing and helpers ─────────────────────────────────────────────────────────────────────────────── */
  const EASE = {
    out: "cubic-bezier(.2, 0, 0, 1)",          // arrivals, settles
    in: "cubic-bezier(.3, 0, 1, 1)",           // exits
    inOut: "cubic-bezier(.65, 0, .35, 1)",
    sheet: "cubic-bezier(.32, .72, 0, 1)",     // sheets in (iOS drawer curve)
    swing: "cubic-bezier(.37, 0, .63, 1)",     // between two swing extremes (a sine half-wave)
    carry: "cubic-bezier(.68, 0, .59, 1)",     // the hand-off carry: gentle start, firm stop
    fall: "cubic-bezier(.55, 0, 1, .45)",      // set down: gravity
  };
  const RQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const state = { forceReduce: null };
  const reduced = () => (state.forceReduce === null ? RQ.matches : state.forceReduce);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));

  /** Two tracks on the same element and property would fight (the later Animation wins outright), so they are merged
   *  into one keyframe list: each track owns the time from where it starts changing until the next one starts. */
  function mergeTracks(tracks) {
    const byEl = new Map();
    const order = [];
    for (const tr of tracks) {
      const els = !tr.el ? [] : tr.el instanceof Element ? [tr.el] : Array.from(tr.el);
      for (const el of els) {
        if (!byEl.has(el)) byEl.set(el, new Map());
        const m = byEl.get(el);
        if (!m.has(tr.prop)) { m.set(tr.prop, []); order.push([el, tr.prop]); }
        m.get(tr.prop).push(tr.frames.slice().sort((a, b) => a[0] - b[0]));
      }
    }
    const start = (f) => { let i = 0; while (i + 1 < f.length && String(f[i + 1][1]) === String(f[0][1])) i++; return f[i][0]; };
    return order.map(([el, prop]) => {
      const list = byEl.get(el).get(prop).sort((a, b) => start(a) - start(b));
      let frames = [];
      list.forEach((f, k) => {
        const from = k === 0 ? -Infinity : start(f);
        const to = k + 1 < list.length ? start(list[k + 1]) : Infinity;
        frames = frames.concat(f.filter(([t]) => t >= from && t < to));
      });
      return { el, prop, frames };
    });
  }

  /** One motion = tracks over one duration T (ms). frames: [[ms, value, easingOfTheSegmentThatStartsHere?], …] */
  function play(tracks, T, opts) {
    opts = opts || {};
    const anims = [];
    for (const tr of mergeTracks(tracks)) {
      const els = [tr.el];
      for (const el of els) {
        const f = tr.frames.slice().sort((a, b) => a[0] - b[0]);
        const kf = f.map(([t, v, e]) => {
          const k = { offset: clamp01(t / T) };
          k[tr.prop] = v;
          if (e) k.easing = e;
          return k;
        });
        if (kf[0].offset > 0) kf.unshift({ offset: 0, [tr.prop]: f[0][1] });
        if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, [tr.prop]: f[f.length - 1][1] });
        const a = el.animate(kf, { duration: T, fill: "both", easing: "linear" });
        a.__motion = opts.name || "motion";
        anims.push(a);
      }
    }
    const handle = {
      anims, T,
      finished: Promise.all(anims.map((a) => a.finished.catch(() => null))),
      cancel() { anims.forEach((a) => a.cancel()); },
      seek(ms) { anims.forEach((a) => { a.pause(); a.currentTime = ms; }); },
    };
    if (opts.keep !== true) handle.finished.then(() => { if (anims.every((a) => a.playState === "finished")) handle.cancel(); });
    return handle;
  }

  /** Damped pendulum keyframes about 0 (deg): amp first, then decays by ratio each half period. */
  function swingFrames(t0, ampDeg, halfMs, ratio, n, easing) {
    const fr = [[t0, "0deg", easing || EASE.swing]];
    let a = ampDeg;
    let t = t0 + halfMs / 2;                      // from rest to the first extreme is a quarter period
    for (let i = 0; i < n; i++) {
      fr.push([Math.round(t), `${a.toFixed(2)}deg`, i === n - 1 ? EASE.out : easing || EASE.swing]);
      t += halfMs;
      a = -a * ratio;
    }
    fr.push([Math.round(t - halfMs / 2), "0deg"]);
    return fr;
  }

  /* ── 1. THE HAND-OFF (the brand's one signature motion) ────────────────────────────────────────────────── */
  /** Timing in ms from the start. Derived from a damped physical pendulum (period 400 ms, damping ratio 0.30)
   *  whose hook is carried 460 ms with a gentle start and a firm stop: it lags back 5.8°, swings forward 10° when
   *  the carry stops, and settles within 600 ms; then it is set down and pressed 2 px into its shadow. */
  function handoffTimes(carryMs) {
    const carry = carryMs || 460;
    const c0 = 140, c1 = c0 + carry;
    const touch = c1 + 540;
    return {
      liftEnd: 180, c0, c1, carry,
      swing: [[c0, 0], [c0 + Math.round(0.548 * carry), 5.8], [c1 + 16, -10], [c1 + 226, 3.7], [c1 + 436, -1.4], [touch, 0]],
      fall: c1 + 420, touch, settle: touch + 120,
      bump: [touch, touch + 100, touch + 260],
      stick: touch + 40,
      after: touch + 60,
      focus: touch + 260,
      T: touch + 360,
    };
  }
  const HANDOFF = { lift: -10, liftScale: 1.02, press: 2, hookY: -16, shadowUp: 0.5, times: handoffTimes(460) };

  function handoff(root, opts) {
    opts = opts || {};
    const variant = root.getAttribute("data-variant") || "give";        // give | buy | sell
    const track = root.querySelector(".handoff__track");
    const carrier = root.querySelector(".handoff__carrier");
    const hanger = root.querySelector(".handoff__hanger");
    const plate = root.querySelector(".handoff__plate");
    const peel = root.querySelector("[data-peel]");
    const yours = root.querySelector("[data-stick]");
    const to = root.querySelector(".handoff__who--to");
    const after = root.querySelectorAll("[data-after]");
    const focusEl = root.querySelector(".handoff__sentence");
    // the one layout read: how far the card travels (the end position is the static layout)
    const cs = getComputedStyle(track);
    const inner = track.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const dx = Math.max(0, inner - carrier.offsetWidth);
    const from = `${-dx}px 0`;
    const reduce = opts.reduce !== undefined ? opts.reduce : reduced();
    let h;
    if (reduce) {
      // Reduced motion: a dip. The card fades out with its old owner, re-appears with the new one.
      const T = 480;
      const tracks = [
        { el: carrier, prop: "opacity", frames: [[0, 1, EASE.in], [150, 0], [170, 0, EASE.out], [350, 1]] },
        { el: carrier, prop: "translate", frames: [[0, from], [159, from], [160, "0 0"]] },
        { el: after, prop: "opacity", frames: [[0, 0], [250, 0, EASE.out], [450, 1]] },
      ];
      if (peel) tracks.push({ el: peel, prop: "opacity", frames: [[0, 1], [159, 1], [160, 0]] });
      if (yours) tracks.push({ el: yours, prop: "opacity", frames: [[0, 0], [159, 0], [160, 1]] });
      h = play(tracks, T, { name: "handoff-reduced", keep: opts.keep });
      if (focusEl && !opts.noFocus) setTimeout(() => focusEl.focus({ preventScroll: true }), 450);
      return h;
    }
    const t = handoffTimes(opts.carryMs || (dx > 300 ? 600 : 460));
    const L = HANDOFF.lift, S = HANDOFF.liftScale, P = HANDOFF.press;
    const tracks = [
      // the hand that carries the hook: x only
      { el: carrier, prop: "translate", frames: [[0, from], [t.c0, from, EASE.carry], [t.c1, "0 0"]] },
      // the card on its hook: lift, swing, set down, press into the shadow
      { el: hanger, prop: "translate", frames: [[0, "0 0", EASE.out], [t.liftEnd, `0 ${L}px`], [t.fall, `0 ${L}px`, EASE.fall], [t.touch, `0 ${P}px`, EASE.out], [t.settle, "0 0"]] },
      { el: hanger, prop: "scale", frames: [[0, "1", EASE.out], [t.liftEnd, `${S}`], [t.fall, `${S}`, EASE.fall], [t.touch, "1"]] },
      { el: hanger, prop: "rotate", frames: t.swing.map(([ms, deg], i, a) => [ms, `${deg}deg`, i === a.length - 2 ? EASE.out : EASE.swing]) },
      // the hard shadow stays on the ground while the card is up (so it grows from 4 to 18 px, then 2, then 4)
      { el: plate, prop: "translate", frames: [[0, "0 0", EASE.out], [t.liftEnd, `0 ${-L}px`], [t.fall, `0 ${-L}px`, EASE.fall], [t.touch, `0 ${-P}px`, EASE.out], [t.settle, "0 0"]] },
      // ...and gets lighter while the card is up (a higher sticker casts a lighter shadow): reads as lifted, not thick
      { el: plate, prop: "opacity", frames: [[0, 1, EASE.out], [t.liftEnd, HANDOFF.shadowUp], [t.fall, HANDOFF.shadowUp, EASE.fall], [t.touch, 1]] },
      // the new owner's chip answers when the card lands
      { el: to, prop: "scale", frames: [[0, "1"], [t.bump[0], "1", EASE.out], [t.bump[1], "1.08", EASE.inOut], [t.bump[2], "1"]] },
      // the result: the state pill and the sentence
      { el: after, prop: "opacity", frames: [[0, 0], [t.after, 0, EASE.out], [t.after + 200, 1]] },
      { el: after, prop: "translate", frames: [[0, "0 6px"], [t.after, "0 6px", EASE.out], [t.after + 200, "0 0"]] },
    ];
    if (peel) tracks.push(
      // "Yours" peels off as it is picked up: it is not yours any more
      { el: peel, prop: "opacity", frames: [[0, 1], [60, 1, EASE.in], [180, 0]] },
      { el: peel, prop: "scale", frames: [[0, "1", EASE.in], [180, "1.25"]] },
      { el: peel, prop: "rotate", frames: [[0, "0deg", EASE.in], [180, "-10deg"]] },
      { el: peel, prop: "translate", frames: [[0, "0 0", EASE.in], [180, "0 -6px"]] },
    );
    if (yours) tracks.push(...stickOnTracks(yours, t.stick));
    h = play(tracks, t.T, { name: "handoff", keep: opts.keep });
    h.times = t;
    h.dx = dx;
    if (focusEl && !opts.noFocus) setTimeout(() => focusEl.focus({ preventScroll: true }), t.focus);
    return h;
  }

  /** THE HAND-OFF ON THE STRAP (the app's stage, product designer's `.hook`): the card hangs on a stem from the strap,
   *  so the pivot is the stem's top (`.hook__card { transform-origin: 50% 0 }`) and nothing lifts: the stem slides
   *  along the strap (the carry), the card lags 5.8°, swings 10° forward when the stem stops, settles in 600 ms, and
   *  the stem clicks 3 px down into the new owner's end. The dashed ghost shows the empty place it left. Same physics
   *  and the same clock as handoff() above. */
  function handoffStrap(root, opts) {
    opts = opts || {};
    const track = root.querySelector(".hook__track");
    const card = root.querySelector(".hook__card");
    const ghost = root.querySelector(".hook__ghost");
    const toAv = root.querySelector(".hook__end:last-child .avatar");
    const peel = root.querySelector("[data-peel]");
    const yours = root.querySelector("[data-stick]");
    const sparks = root.querySelectorAll(".spark");
    const pillFrom = root.querySelector('[data-pill="from"]'), pillTo = root.querySelector('[data-pill="to"]');
    const after = (opts.scope || root).querySelectorAll("[data-after]");
    const focusEl = (opts.scope || root).querySelector("[data-handoff-focus]");
    const dx = Math.max(0, card.offsetLeft);                     // one layout read: the end position is the static layout
    const from = `${-dx}px 0`;
    const reduce = opts.reduce !== undefined ? opts.reduce : reduced();
    let h;
    if (reduce) {
      const T = 480;
      const tr = [
        { el: card, prop: "opacity", frames: [[0, 1, EASE.in], [150, 0], [170, 0, EASE.out], [350, 1]] },
        { el: card, prop: "translate", frames: [[0, from], [159, from], [160, "0 0"]] },
        { el: after, prop: "opacity", frames: [[0, 0], [250, 0, EASE.out], [450, 1]] },
      ];
      if (ghost) tr.push({ el: ghost, prop: "opacity", frames: [[0, 0], [160, 0, EASE.out], [360, 0.7]] });
      if (peel) tr.push({ el: peel, prop: "opacity", frames: [[0, 1], [159, 1], [160, 0]] });
      if (yours) tr.push({ el: yours, prop: "opacity", frames: [[0, 0], [159, 0], [160, 1]] });
      if (pillFrom && pillTo) tr.push({ el: pillFrom, prop: "opacity", frames: [[0, 1], [159, 1], [160, 0]] }, { el: pillTo, prop: "opacity", frames: [[0, 0], [159, 0], [160, 1]] });
      h = play(tr, T, { name: "handoff-strap-reduced", keep: opts.keep });
      if (focusEl && !opts.noFocus) setTimeout(() => focusEl.focus({ preventScroll: true }), 450);
      return h;
    }
    const t = handoffTimes(opts.carryMs || 460);
    const click = t.touch;                                       // the stem drops into its notch as the swing ends
    const tr = [
      { el: card, prop: "translate", frames: [[0, from], [t.c0, from, EASE.carry], [t.c1, "0 0"], [click, "0 0", EASE.out], [click + 90, "0 3px", EASE.out], [click + 220, "0 0"]] },
      { el: card, prop: "rotate", frames: t.swing.map(([ms, deg], i, a) => [ms, `${deg}deg`, i === a.length - 2 ? EASE.out : EASE.swing]) },
      { el: after, prop: "opacity", frames: [[0, 0], [t.after, 0, EASE.out], [t.after + 200, 1]] },
      { el: after, prop: "translate", frames: [[0, "0 6px"], [t.after, "0 6px", EASE.out], [t.after + 200, "0 0"]] },
    ];
    if (ghost) tr.push({ el: ghost, prop: "opacity", frames: [[0, 0], [t.c0 + 160, 0, EASE.out], [t.c0 + 420, 0.7]] });
    if (toAv) tr.push({ el: toAv, prop: "scale", frames: [[0, "1"], [click, "1", EASE.out], [click + 110, "1.14", EASE.inOut], [click + 280, "1"]] });
    if (peel) tr.push(
      { el: peel, prop: "opacity", frames: [[0, 1], [60, 1, EASE.in], [180, 0]] },
      { el: peel, prop: "scale", frames: [[0, "1", EASE.in], [180, "1.25"]] },
      { el: peel, prop: "rotate", frames: [[0, "0deg", EASE.in], [180, "-10deg"]] },
      { el: peel, prop: "translate", frames: [[0, "0 0", EASE.in], [180, "0 -6px"]] },
    );
    if (yours) tr.push(...stickOnTracks(yours, click + 40));
    if (pillFrom && pillTo) tr.push(...morphTracks(pillFrom, pillTo, click));
    Array.from(sparks).forEach((sp, i) => {          // two sparkles pop as it lands, 80 ms apart, done inside the clock
      const s0 = click + 40 + i * 80;
      tr.push({ el: sp, prop: "opacity", frames: [[0, 0], [s0, 0], [s0 + 60, 1]] },
        { el: sp, prop: "scale", frames: [[0, "0.2"], [s0, "0.2", EASE.out], [s0 + 130, "1.15", EASE.inOut], [s0 + 220, "1"]] },
        { el: sp, prop: "rotate", frames: [[0, "-40deg"], [s0, "-40deg", EASE.out], [s0 + 220, "0deg"]] });
    });
    h = play(tr, t.T, { name: "handoff-strap", keep: opts.keep });
    h.times = t;
    h.dx = dx;
    if (focusEl && !opts.noFocus) setTimeout(() => focusEl.focus({ preventScroll: true }), t.focus);
    return h;
  }

  /* ── 2. Stick on / peel off (stickers: badges, coins, checks) ──────────────────────────────────────────── */
  /** A sticker pressed onto the surface: from above (bigger, turned), lands slightly squashed, settles. 320 ms.
   *  Animates the individual properties, so a static `transform: rotate(-4deg)` tilt is kept. */
  function stickOnTracks(el, at, o) {
    o = o || {};
    const big = o.from || 1.6, turn = o.turn === undefined ? -16 : o.turn;
    return [
      { el, prop: "opacity", frames: [[0, 0], [at, 0], [at + 70, 1]] },
      { el, prop: "scale", frames: [[0, `${big}`], [at, `${big}`, EASE.out], [at + 160, "0.92", EASE.inOut], [at + 320, "1"]] },
      { el, prop: "rotate", frames: [[0, `${turn}deg`], [at, `${turn}deg`, EASE.out], [at + 160, `${-turn * 0.15}deg`, EASE.inOut], [at + 320, "0deg"]] },
    ];
  }
  function stickOn(el, opts) {
    if (reduced()) return play([{ el, prop: "opacity", frames: [[0, 0, EASE.out], [150, 1]] }], 150, { name: "stick-reduced" });
    return play(stickOnTracks(el, 0, opts), 320, { name: "stick-on" });
  }

  /* ── 3. Swing (charms) ─────────────────────────────────────────────────────────────────────────────────── */
  /** A charm given a nudge: a damped swing about its hook (its own transform-origin). Never loops. */
  const SWING = { amp: 7, halfMs: 420, ratio: 0.62, n: 5 };
  function swing(el, o) {
    o = Object.assign({}, SWING, o || {});
    if (reduced()) return null;
    if (el.__swingUntil && performance.now() < el.__swingUntil - o.halfMs * 2) return null;   // don't restart mid-swing
    const fr = swingFrames(o.delay || 0, o.amp * (o.dir || 1), o.halfMs, o.ratio, o.n);
    const T = fr[fr.length - 1][0];
    el.__swingUntil = performance.now() + T;
    return play([{ el, prop: "rotate", frames: fr }], T, { name: "swing" });
  }

  /* ── 4. Press (data-pressed holds at least 100 ms, so a quick tap still shows the whole press) ─────────── */
  function pressable(scope) {
    const MIN = 100;
    const down = (el) => { el.__pd = performance.now(); el.setAttribute("data-pressed", ""); };
    const up = (el) => {
      const wait = Math.max(0, MIN - (performance.now() - (el.__pd || 0)));
      setTimeout(() => el.removeAttribute("data-pressed"), wait);
    };
    const target = (e) => e.target.closest && e.target.closest(".m-press:not([aria-disabled='true']):not([data-latched])");
    scope.addEventListener("pointerdown", (e) => { const el = target(e); if (el && e.button === 0) down(el); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => scope.addEventListener(ev, (e) => { const el = target(e); if (el && el.hasAttribute("data-pressed")) up(el); }, true));
    scope.addEventListener("keydown", (e) => { const el = target(e); if (el && (e.key === " " || e.key === "Enter") && !e.repeat) { down(el); if (e.key === "Enter") up(el); } });
    scope.addEventListener("keyup", (e) => { const el = target(e); if (el && e.key === " ") up(el); });
  }

  /* ── 5. Label morph (Give → Giving… → Given): the label rolls, the button never changes size ──────────── */
  /** btn contains .m-morph > [data-label=key] (one per label, all in one grid cell, so the button is as wide as its
   *  widest label: no layout shift). The old label rolls up and out, the new one rolls up into place. */
  function morph(btn, key) {
    const box = btn.querySelector(".m-morph");
    const next = box.querySelector(`[data-label="${key}"]`);
    const cur = box.querySelector('[data-label]:not([aria-hidden="true"])');
    if (!next || next === cur) return null;
    cur.setAttribute("aria-hidden", "true");
    next.removeAttribute("aria-hidden");
    if (reduced()) return play([{ el: cur, prop: "opacity", frames: [[0, 1, EASE.in], [120, 0]] }, { el: next, prop: "opacity", frames: [[0, 0], [60, 0, EASE.out], [200, 1]] }], 200, { name: "morph" });
    return play([
      { el: cur, prop: "opacity", frames: [[0, 1, EASE.in], [140, 0]] },
      { el: cur, prop: "translate", frames: [[0, "0 0", EASE.in], [140, "0 -8px"]] },
      { el: next, prop: "opacity", frames: [[0, 0], [70, 0, EASE.out], [250, 1]] },
      { el: next, prop: "translate", frames: [[0, "0 8px"], [70, "0 8px", EASE.out], [250, "0 0"]] },
    ], 250, { name: "morph" });
  }

  /* ── 6. Overlays: sheet (< 768), dialog (≥ 768), scrim, toasts ─────────────────────────────────────────── */
  function sheetIn(sheet, scrim, kind) {
    if (reduced()) return play([{ el: sheet, prop: "opacity", frames: [[0, 0, EASE.out], [150, 1]] }, { el: scrim, prop: "opacity", frames: [[0, 0], [150, 1]] }], 150, { name: "overlay-in" });
    if (kind === "dialog") return play([
      { el: sheet, prop: "opacity", frames: [[0, 0, "linear"], [140, 1]] },
      { el: sheet, prop: "scale", frames: [[0, "0.96", EASE.out], [240, "1"]] },
      { el: sheet, prop: "translate", frames: [[0, "0 12px", EASE.out], [240, "0 0"]] },
      { el: scrim, prop: "opacity", frames: [[0, 0, "linear"], [200, 1]] },
    ], 240, { name: "dialog-in" });
    return play([
      { el: sheet, prop: "translate", frames: [[0, "0 100%", EASE.sheet], [360, "0 0"]] },
      { el: scrim, prop: "opacity", frames: [[0, 0, "linear"], [240, 1]] },
    ], 360, { name: "sheet-in" });
  }
  function sheetOut(sheet, scrim, kind) {
    if (reduced()) return play([{ el: sheet, prop: "opacity", frames: [[0, 1, EASE.in], [150, 0]] }, { el: scrim, prop: "opacity", frames: [[0, 1], [150, 0]] }], 150, { name: "overlay-out", keep: true });
    if (kind === "dialog") return play([
      { el: sheet, prop: "opacity", frames: [[0, 1, EASE.in], [160, 0]] },
      { el: sheet, prop: "scale", frames: [[0, "1", EASE.in], [160, "0.98"]] },
      { el: scrim, prop: "opacity", frames: [[0, 1, "linear"], [160, 0]] },
    ], 160, { name: "dialog-out", keep: true });
    return play([
      { el: sheet, prop: "translate", frames: [[0, "0 0", "cubic-bezier(.32, 0, .67, 0)"], [240, "0 100%"]] },
      { el: scrim, prop: "opacity", frames: [[0, 1, "linear"], [200, 0]] },
    ], 240, { name: "sheet-out", keep: true });
  }
  function stepChange(outEl, inEl, dir) {   // dir 1 = forward, -1 = back
    const d = 16 * (dir || 1);
    if (reduced()) return play([{ el: outEl, prop: "opacity", frames: [[0, 1], [100, 0]] }, { el: inEl, prop: "opacity", frames: [[0, 0], [80, 0, EASE.out], [200, 1]] }], 200, { name: "step" });
    return play([
      { el: outEl, prop: "opacity", frames: [[0, 1, EASE.in], [120, 0]] },
      { el: outEl, prop: "translate", frames: [[0, "0 0", EASE.in], [120, `${-d}px 0`]] },
      { el: inEl, prop: "opacity", frames: [[0, 0], [80, 0, EASE.out], [280, 1]] },
      { el: inEl, prop: "translate", frames: [[0, `${d}px 0`], [80, `${d}px 0`, EASE.out], [280, "0 0"]] },
    ], 280, { name: "step" });
  }
  function toastIn(el) {
    if (reduced()) return play([{ el, prop: "opacity", frames: [[0, 0, EASE.out], [150, 1]] }], 150, { name: "toast-in" });
    return play([
      { el, prop: "opacity", frames: [[0, 0, EASE.out], [120, 1]] },
      { el, prop: "translate", frames: [[0, "0 16px", EASE.out], [260, "0 0"]] },
      { el, prop: "scale", frames: [[0, "0.94", EASE.out], [260, "1"]] },
    ], 260, { name: "toast-in" });
  }
  function toastOut(el) {
    if (reduced()) return play([{ el, prop: "opacity", frames: [[0, 1, EASE.in], [150, 0]] }], 150, { name: "toast-out", keep: true });
    return play([
      { el, prop: "opacity", frames: [[0, 1, EASE.in], [160, 0]] },
      { el, prop: "translate", frames: [[0, "0 0", EASE.in], [160, "0 8px"]] },
    ], 160, { name: "toast-out", keep: true });
  }
  /** Nudge: a refusal. Two small shakes, 260 ms. Only for a press on something blocked. */
  function nudge(el) {
    if (reduced()) return null;
    return play([{ el, prop: "translate", frames: [[0, "0 0", EASE.inOut], [50, "-4px 0", EASE.inOut], [110, "4px 0", EASE.inOut], [170, "-3px 0", EASE.inOut], [220, "2px 0", EASE.out], [260, "0 0"]] }], 260, { name: "nudge" });
  }

  /* ── 6b. Track builders (the same numbers as the CSS and the functions above, placed on a scene's clock) ─── */
  const shade = (el) => getComputedStyle(el).getPropertyValue("--sticker-shade").trim() || "#1d1340";
  /** The press as tracks: down at tDown (60 ms ease-out), up at tUp (140 ms ease-out); tUp null = latched. */
  function pressTracks(el, tDown, tUp) {
    const s = shade(el), up = `0 4px 0 ${s}`, flat = `0 0 0 ${s}`;
    if (reduced()) {
      const tr = [[0, "0 0"], [tDown, "0 0"], [tDown + 1, "0 4px"]];
      const sh = [[0, up], [tDown, up], [tDown + 1, flat]];
      if (tUp != null) { tr.push([tUp, "0 4px"], [tUp + 1, "0 0"]); sh.push([tUp, flat], [tUp + 1, up]); }
      return [{ el, prop: "translate", frames: tr }, { el, prop: "boxShadow", frames: sh }];
    }
    const tr = [[0, "0 0"], [tDown, "0 0", EASE.out], [tDown + 60, "0 4px"]];
    const sh = [[0, up], [tDown, up, EASE.out], [tDown + 60, flat]];
    if (tUp != null) { tr.push([tUp, "0 4px", EASE.out], [tUp + 140, "0 0"]); sh.push([tUp, flat, EASE.out], [tUp + 140, up]); }
    return [{ el, prop: "translate", frames: tr }, { el, prop: "boxShadow", frames: sh }];
  }
  /** The label roll at `at` (250 ms): cur rolls up and out, next rolls up into place. */
  function morphTracks(cur, next, at) {
    if (reduced()) return [
      { el: cur, prop: "opacity", frames: [[0, 1], [at, 1, EASE.in], [at + 120, 0]] },
      { el: next, prop: "opacity", frames: [[0, 0], [at + 60, 0, EASE.out], [at + 200, 1]] },
    ];
    return [
      { el: cur, prop: "opacity", frames: [[0, 1], [at, 1, EASE.in], [at + 140, 0]] },
      { el: cur, prop: "translate", frames: [[0, "0 0"], [at, "0 0", EASE.in], [at + 140, "0 -8px"]] },
      { el: next, prop: "opacity", frames: [[0, 0], [at + 70, 0, EASE.out], [at + 250, 1]] },
      { el: next, prop: "translate", frames: [[0, "0 8px"], [at + 70, "0 8px", EASE.out], [at + 250, "0 0"]] },
    ];
  }
  /** Appear: fade in, rising dy px (reduced: fade only). */
  function appearTracks(el, at, dur, dy) {
    dur = dur || 200; dy = dy === undefined ? 6 : dy;
    const tr = [{ el, prop: "opacity", frames: [[0, 0], [at, 0, EASE.out], [at + dur, 1]] }];
    if (!reduced() && dy) tr.push({ el, prop: "translate", frames: [[0, `0 ${dy}px`], [at, `0 ${dy}px`, EASE.out], [at + dur, "0 0"]] });
    return tr;
  }
  function vanishTracks(el, at, dur, dy) {
    dur = dur || 140; dy = dy === undefined ? -6 : dy;
    const tr = [{ el, prop: "opacity", frames: [[0, 1], [at, 1, EASE.in], [at + dur, 0]] }];
    if (!reduced() && dy) tr.push({ el, prop: "translate", frames: [[0, "0 0"], [at, "0 0", EASE.in], [at + dur, `0 ${dy}px`]] });
    return tr;
  }
  /** Re-stick (a sticker that is already there celebrates new coins): it peels up 6 px, turns, and slaps back
   *  down 1 px into the card. 320 ms. Reduced: nothing (the number change carries the news). */
  function hopTracks(el, at) {
    if (reduced()) return [];
    return [
      { el, prop: "translate", frames: [[0, "0 0"], [at, "0 0", EASE.out], [at + 120, "0 -6px", EASE.fall], [at + 230, "0 1px", EASE.out], [at + 320, "0 0"]] },
      { el, prop: "scale", frames: [[0, "1"], [at, "1", EASE.out], [at + 120, "1.18", EASE.inOut], [at + 230, "0.94", EASE.out], [at + 320, "1"]] },
      { el, prop: "rotate", frames: [[0, "0deg"], [at, "0deg", EASE.out], [at + 120, "-12deg", EASE.inOut], [at + 230, "2deg", EASE.out], [at + 320, "0deg"]] },
    ];
  }
  /** Stick-on on a scene clock (reduced: a 150 ms fade). */
  function stickTracks(el, at, o) {
    if (reduced()) return [{ el, prop: "opacity", frames: [[0, 0], [at, 0, EASE.out], [at + 150, 1]] }];
    return stickOnTracks(el, at, o);
  }

  /* ── 7. Scenes (prototype demos): WAAPI tracks + state marks on one seekable clock ─────────────────────── */
  /** marks: [[ms, fn]] idempotent DOM setters (text, data-state) applied in time order; reset() restores the start.
   *  seek(t) = reset, apply every mark ≤ t, seek the animations: a frame is a pure function of t (captures, QA). */
  function scene(def) {
    let h = null, raf = 0, next = 0;
    const marks = (def.marks || []).slice().sort((a, b) => a[0] - b[0]);
    const applyTo = (t) => { while (next < marks.length && marks[next][0] <= t) marks[next++][1](); };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const api = {
      T: def.T,
      start(opts) {
        stop();
        if (h) h.cancel();
        if (def.reset) def.reset();
        next = 0;
        const tracks = typeof def.tracks === "function" ? def.tracks() : def.tracks || [];
        h = play(tracks, def.T, { name: def.name, keep: true });
        if (opts && opts.paused) { h.seek(0); applyTo(0); return api; }
        const rate = (opts && opts.rate) || 1;
        h.anims.forEach((a) => (a.playbackRate = rate));
        const t0 = performance.now();
        const tick = () => {
          const t = h.anims.length ? h.anims[0].currentTime : (performance.now() - t0) * rate;
          applyTo(t);
          if (t < def.T) raf = requestAnimationFrame(tick); else { applyTo(Infinity); raf = 0; }
        };
        raf = requestAnimationFrame(tick);
        return api;
      },
      seek(t) {
        stop();
        if (!h) api.start({ paused: true });
        if (def.reset) def.reset();
        next = 0;
        applyTo(t);
        h.seek(t);
      },
      cancel() { stop(); if (h) h.cancel(); h = null; if (def.reset) def.reset(); next = 0; applyTo(Infinity); },
    };
    return api;
  }

  /* ── 8. Exports for the prototype pages and the frame-capture script ───────────────────────────────────── */
  window.SatchelMotion = {
    EASE, HANDOFF, SWING, handoffTimes, play, swingFrames, handoff, handoffStrap, stickOnTracks, stickOn, swing, pressable, morph,
    sheetIn, sheetOut, stepChange, toastIn, toastOut, nudge, reduced, scene,
    pressTracks, morphTracks, appearTracks, vanishTracks, stickTracks, hopTracks, mergeTracks,
    setReduce(v) { state.forceReduce = v; document.documentElement.setAttribute("data-motion", (v === null ? RQ.matches : v) ? "reduce" : "full"); },
  };
  document.documentElement.setAttribute("data-motion", reduced() ? "reduce" : "full");
  if (RQ.addEventListener) RQ.addEventListener("change", () => { if (state.forceReduce === null) document.documentElement.setAttribute("data-motion", RQ.matches ? "reduce" : "full"); });
})();
