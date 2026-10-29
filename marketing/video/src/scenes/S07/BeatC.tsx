import { AbsoluteFill, spring } from "remotion";
import { C } from "../../brand/tokens";
import { EASE, FPS, SPRING } from "../../lib/time";
import { BrowserFrame, CleanHistoryRow } from "../../components/product";
import { Headline, tw, type Cues } from "./lib";
import { PANEL, PK, SalePage } from "./SalePage";

const RESOLVE = 0.28; // seconds for a row to flip from Checking… to its result

/**
 * C · L14–L15. A glimpse of the REAL app (3D-tilted browser frame, Satchel #3's sale page), punch-in, then the
 * rebuilt Clean history: three rows resolve exactly on "nonce", "coin", "blockhash"; the verdict turns Clean and the
 * Buy button takes the frame's single brass fill.
 */
export function BeatC({ t, q }: { t: number; q: Cues }) {
  const f = t * FPS;
  const spin = f * 12;

  // ── phase 1: real screenshot in a browser frame ──
  if (t < q.cPunch) {
    const fly = spring({ frame: f - q.cutC * FPS, fps: FPS, config: SPRING.handoff });
    const push = tw(t, q.cPunch - 0.32, q.cPunch, 0, 1, EASE.expoIn);
    const drift = tw(t, q.cutC, q.cPunch, 0, 1, EASE.standard);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2400 }}>
        <div
          style={{
            transform: `translate(${(1 - fly) * 640 + 60}px, ${(1 - fly) * 140 + 10}px) scale(${(0.95 + 0.05 * drift) * (1 + push * 2.2)})`,
            transformOrigin: "70% 72%",
          }}
        >
          <BrowserFrame
            src="ui/flows/buy-s3-1-clean-mainnet@2x.png"
            width={1640}
            crop={{ x: 0, y: 0, w: 1, h: 0.86 }}
            title="Satchel #3 · Satchel"
            path="/s/3/sale"
            tilt={{ rx: 10 - 5 * fly - 5 * push, ry: -24 + 13 * fly + 11 * push, rz: 2 - 2 * fly }}
          />
        </div>
        {/* brass flash on the cut */}
        <AbsoluteFill style={{ background: C.brandBright, opacity: 0.16 * tw(t, q.cPunch - 0.07, q.cPunch, 0, 1, (x) => x) }} />
      </AbsoluteFill>
    );
  }

  // ── phase 2: the rebuilt Clean history ──
  const land = spring({ frame: f - q.cPunch * FPS, fps: FPS, config: SPRING.snap });
  const sc = 1.08 - 0.08 * land;
  const r = (at: number) => tw(t, at - 1 / FPS, at - 1 / FPS + RESOLVE, 0, 1, EASE.expoOut);
  const clean = t >= q.cVerdict;
  const pop = spring({ frame: f - q.cVerdict * FPS, fps: FPS, config: SPRING.slam });
  const buyOn = t >= q.cBuy;
  const lit = tw(t, q.cBuy, q.cBuy + 0.25, 0, 1, EASE.expoOut);
  const sheen = tw(t, q.cBuy + 0.1, q.cBuy + 0.85, 0, 1, EASE.expoInOut);
  // a soft scanner band travelling over the rows while the browser reads each chain
  const scan = tw(t, q.cScan, Math.max(q.cScan + 0.6, q.cR1 - 0.05), 0, 1, EASE.expoInOut);
  const scanOn = t > q.cScan && t < q.cR1 && scan < 1;
  const top = 222;

  const rows = (
    <div style={{ position: "relative" }}>
      <CleanHistoryRow k={PK} pad={10} title="Ethereum · nonce 3" wouldPay="Would send 0.0100 ETH to 0x53f9…1C2A" evidence="Nonce 3 used by 0x9c41…7d2e · 3 confirmations" status="spent" resolve={r(q.cR1)} spin={spin} />
      <CleanHistoryRow k={PK} pad={10} title="Bitcoin · coin 7d…e2:1" wouldPay="Would send 0.0005 BTC to bc1q8zr4…k4m0" evidence="Spent in 4f1c9a2e…b7d0" status="spent" resolve={r(q.cR2)} spin={spin} divider="bottom" />
      <CleanHistoryRow k={PK} pad={10} title="Solana · blockhash 9f…" wouldPay="Would send 0.2500 SOL to 7xKX…sAsU" evidence="Blockhash expired. It can't be used." status="expired" resolve={r(q.cR3)} spin={spin} divider="bottom" />
      {scanOn ? (
        <div
          style={{
            position: "absolute",
            left: -16,
            right: -16,
            top: `${scan * 100 - 12}%`,
            height: "24%",
            background: "linear-gradient(180deg, rgba(243,233,220,0) 0%, rgba(243,233,220,0.07) 50%, rgba(243,233,220,0) 100%)",
            borderBottom: "1px solid rgba(243,233,220,0.18)",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: "60% 60%" }}>
        <div style={{ position: "absolute", left: PANEL.x, top: 62 }}>
          <Headline lines={["Checked in your browser."]} t={t} at={q.cPunch + 0.02} outAt={q.cVerdict - 0.24} size={112} />
        </div>
        <div style={{ position: "absolute", left: PANEL.x, top: 62 }}>
          {clean ? <Headline lines={["Clean history."]} t={t} at={q.cVerdict} size={112} /> : null}
        </div>
        <SalePage
          top={top}
          tokenId="3"
          body="#281a10"
          price="5.00 USDC"
          verdict={clean ? "clean" : "checking"}
          verdictPop={clean ? 1 + 0.25 * (1 - pop) : 1}
          count={3}
          spin={spin}
          trustIn={tw(t, q.cPunch + 0.25, q.cPunch + 0.6)}
          rows={rows}
          gate={buyOn ? "clean" : "checking"}
          lit={lit}
          sheen={sheen}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
