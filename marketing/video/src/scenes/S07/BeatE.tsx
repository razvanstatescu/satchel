import { CircleCheck } from "lucide-react";
import { AbsoluteFill, spring } from "remotion";
import { C, F, display } from "../../brand/tokens";
import { EASE, FPS, SPRING } from "../../lib/time";
import { BrowserFrame, STROKE } from "../../components/product";
import { Headline, Plate, tw, type Cues } from "./lib";

const CONTRACT = "satchel.satchelhq.near";
const HOOKS_DROP = 372; // moves the plate's row of hooks (image y ≈ 35–60 %) into the lower band of the frame

function Fact({ label, p }: { label: string; p: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * -36}px)` }}>
      <span style={{ display: "inline-flex", color: C.success, transform: `scale(${0.6 + 0.4 * p})` }}>
        <CircleCheck size={48} strokeWidth={STROKE} />
      </span>
      <span style={{ ...display(650, 72), fontSize: 58, lineHeight: "66px", letterSpacing: "-0.02em", color: C.ink, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

/**
 * E · L17 "And the contract has no admin key. Not even ours." The empty brass hooks fill the lower band. While the VO
 * names the contract, its name types out and the facts land beside the real Contract facts page; then the headline
 * slams in on "no" and "not": "No admin key." / "Not even ours."
 */
export function BeatE({ t, q }: { t: number; q: Cues }) {
  const f = t * FPS;
  const t0 = q.cutE;
  // plate: gentle push for the whole beat
  const push = 1 + 0.035 * tw(t, t0, q.end, 0, 1, EASE.standard);
  // contract name types out on "And the contract"
  const typeEnd = Math.min(t0 + 0.12 + CONTRACT.length * 0.03, q.eNo - 0.35);
  const typedN = Math.floor(tw(t, t0 + 0.12, typeEnd, 0, CONTRACT.length, (x) => x));
  const caret = Math.floor(f / 8) % 2 === 0 ? 1 : 0.15;
  // claim first, then the proof: the facts and the real Contract facts page land after "Not even ours."
  const proofAt = q.eNot + 0.35;
  const factAt = (i: number) => proofAt + 0.1 + i * 0.16;
  const facts = [0, 1, 2].map((i) => spring({ frame: f - factAt(i) * FPS, fps: FPS, config: SPRING.snap }));
  const pageIn = spring({ frame: f - proofAt * FPS, fps: FPS, config: SPRING.handoff });
  const pageDrift = tw(t, proofAt, q.end, 0, 1, EASE.standard);
  // the claim
  const slam1 = spring({ frame: f - q.eNo * FPS, fps: FPS, config: SPRING.slam });
  const slam2 = spring({ frame: f - q.eNot * FPS, fps: FPS, config: SPRING.slam });
  const punch = 1 + 0.012 * (t >= q.eNot ? 1 - slam2 : 0) + 0.008 * (t >= q.eNo ? 1 - slam1 : 0);

  return (
    <AbsoluteFill style={{ transform: `scale(${punch})` }}>
      {/* the empty hooks, low in the frame */}
      <AbsoluteFill style={{ transform: `translateY(${HOOKS_DROP}px) scale(${push})`, transformOrigin: "50% 60%" }}>
        <Plate name="key-hooks-empty" opacity={0.92} />
      </AbsoluteFill>
      {/* blend the plate's top edge into the ground; keep the facts' side dark */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${C.ground} 0%, ${C.ground} 38%, rgba(23,16,12,0.86) 50%, rgba(23,16,12,0.35) 64%, rgba(23,16,12,0) 74%, rgba(23,16,12,0.25) 100%)`,
        }}
      />

      {/* the real Contract facts page */}
      <div style={{ position: "absolute", left: 1000, top: 384, transform: `translateX(${(1 - pageIn) * 900}px)`, opacity: Math.min(1, pageIn * 2) }}>
        <BrowserFrame
          src="ui/desktop/contract-mainnet@2x.png"
          width={900}
          crop={{ x: 0.152, y: 0.035, w: 0.6, h: 0.325 }}
          title="Contract facts · Satchel"
          path="/contract"
          zoom={1 + 0.05 * pageDrift}
          focus={{ x: 0.04, y: 0.7 }}
          tilt={{ rx: 4, ry: -16 + 6 * pageIn, rz: 0 }}
        />
      </div>

      {/* contract + facts */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 392,
          fontFamily: F.mono,
          fontSize: 52,
          fontWeight: 500,
          color: C.ink,
          letterSpacing: "-0.01em",
          fontFeatureSettings: '"zero" 1',
          whiteSpace: "nowrap",
        }}
      >
        {CONTRACT.slice(0, typedN)}
        {typedN < CONTRACT.length ? <span style={{ display: "inline-block", width: 4, height: "0.9em", marginLeft: 4, verticalAlign: "-0.1em", background: C.brandBright, opacity: caret }} /> : null}
      </div>
      <div style={{ position: "absolute", left: 120, top: 474, display: "flex", flexDirection: "column", gap: 14 }}>
        {facts[0] > 0.001 ? <Fact label="Access keys: 0" p={facts[0]} /> : null}
        {facts[1] > 0.001 ? <Fact label="Born in one transaction" p={facts[1]} /> : null}
        {facts[2] > 0.001 ? <Fact label="AddKey actions: 0" p={facts[2]} /> : null}
      </div>

      {/* the claim */}
      <div style={{ position: "absolute", left: 120, top: 48, transform: `scale(${t >= q.eNo ? 1 + 0.1 * (1 - slam1) : 1})`, transformOrigin: "left center" }}>
        {t >= q.eNo - 0.05 ? <Headline lines={["No admin key."]} t={t} at={q.eNo - 0.04} size={136} /> : null}
      </div>
      <div style={{ position: "absolute", left: 120, top: 48 + 138, transform: `scale(${t >= q.eNot ? 1 + 0.1 * (1 - slam2) : 1})`, transformOrigin: "left center" }}>
        {t >= q.eNot - 0.05 ? <Headline lines={["Not even ours."]} t={t} at={q.eNot - 0.04} size={136} /> : null}
      </div>
    </AbsoluteFill>
  );
}
