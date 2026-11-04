import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, sans } from "../../brand/tokens";
import { SatchelCard } from "../../components/Sticker";
import { Badge, Sparkles } from "./Badge";
import { ExchangeSticker, WalletSticker } from "./BadgeStickers";
import { CoinSticker } from "./CoinSticker";
import { ContractPlaque } from "./ContractPlaque";
import { FrostLaminate } from "./FrostLaminate";
import { GiftBox } from "./GiftBox";
import { PocketJeans } from "./PocketJeans";
import { PriceTag } from "./PriceTag";
import { RecordFill, RecordOutline } from "./RecordOutline";
import { RequestSticker } from "./RequestSticker";
import { ScanBeam } from "./ScanBeam";
import { SignSlot } from "./SignSlot";
import { SignedSlip } from "./SignedSlip";
import { Stamp } from "./Stamp";
import { StickyNote } from "./StickyNote";
import { ToastSticker } from "./ToastSticker";
import { TradeDesk } from "./TradeDesk";
import { NearStack, nearStackSize } from "./NearStack";
import { UsdcStack, usdcStackSize } from "./UsdcStack";

/**
 * QA gallery for src2/illustration/props (composition `PropsGallery`, 6 s). Every prop and state in a labelled grid on
 * the Day ground; animated: slip scribble, coin flip, tag clip, frost sweep + pill + melt, stamp impacts, plaque zero +
 * footnote, gift lid + sparkles, note curl, request accept/bounce, slot intake, record draw/sign/stamp, scan sweep.
 */
const ROW_H = 330;
const GUT = 16;
const ROWS: { y: number; w: number[] }[] = [
  { y: 20, w: [300, 330, 330, 390, 466] },
  { y: 20 + ROW_H + GUT, w: [410, 330, 390, 320, 366] },
  { y: 20 + 2 * (ROW_H + GUT), w: [340, 330, 380, 330, 436] },
];
function cellX(row: number, col: number) {
  return 20 + ROWS[row].w.slice(0, col).reduce((a, b) => a + b + GUT, 0);
}

function Cell({ row, col, title, sub, children }: { row: number; col: number; title: string; sub?: string; children: ReactNode }) {
  const x = cellX(row, col);
  const w = ROWS[row].w[col];
  return (
    <div style={{ position: "absolute", left: x, top: ROWS[row].y, width: w, height: ROW_H, background: C.ground, border: `1.5px solid ${C.line}`, borderRadius: 22, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 18, top: 12, ...sans(700), fontSize: 22, lineHeight: "28px", color: C.ink, whiteSpace: "nowrap" }}>{title}</div>
      {sub ? <div style={{ position: "absolute", left: 18, top: 40, ...sans(500), fontSize: 15, lineHeight: "20px", color: C.inkMuted, whiteSpace: "nowrap" }}>{sub}</div> : null}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

const at = (x: number, y: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: x, top: y, ...extra });

function Cap({ x, y, children, center }: { x: number; y: number; children: ReactNode; center?: boolean }) {
  return <div style={{ position: "absolute", left: x, top: y, ...sans(500), fontSize: 15, color: C.inkMuted, whiteSpace: "nowrap", transform: center ? "translateX(-50%)" : undefined }}>{children}</div>;
}

/** Hero-scale QA pages (scale 2, film size): npx remotion still src2/index.ts PropsGallery out.png --props='{"page":"hero1"}' */
function Hero({ page }: { page: "hero1" | "hero2" | "hero3" | "hero4" }) {
  if (page === "hero4") {
    return (
      <AbsoluteFill style={{ background: C.ground }}>
        {(["base", "arbitrum", "optimism", "ethereum"] as const).map((n, i) => (
          <CoinSticker key={n} chain="usdc" network={n} size={150} style={at(80 + i * 200, 70)} />
        ))}
        <CoinSticker chain="usdc" size={150} style={at(880, 70)} />
        <CoinSticker chain="near" size={150} style={at(1080, 70)} />
        <CoinSticker chain="wnear" network="near" size={150} style={at(1280, 70)} />
        <CoinSticker chain="near" size={150} flip={62} face={{ blink: 1, smile: 1.6 }} style={at(1480, 70)} />
        <NearStack style={at(80, 300)} />
        <NearStack columns={[3, 5]} face={false} scale={1.4} style={at(760, 380)} />
        <RequestSticker kind="message" accepted={1} outline={1} style={at(1120, 300)} />
        <RequestSticker kind="message" bounced={1} style={at(1120, 420)} />
        <RecordOutline kind="message" style={at(80, 700)} />
        <RecordOutline kind="message" signed={1} style={at(80, 800)} />
        <RecordOutline kind="message" chain="sol" label="SOL · message" stamp={1} style={at(80, 900)} />
        <RecordFill kind="message" drop={2.5} style={at(1000, 760)} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {page === "hero1" ? (
        <>
          <SignedSlip style={at(70, 70)} />
          <PriceTag note="bound to 3 signatures" clip={1} style={at(560, 120)} />
          <PriceTag style={at(560, 380)} />
          <Stamp text="Nonce used" style={at(1120, 90)} />
          <Stamp text="Clean" shape="circle" style={at(1560, 60)} />
          <CoinSticker chain="btc" style={at(560, 640)} />
          <CoinSticker chain="evm" style={at(690, 640)} />
          <CoinSticker chain="sol" style={at(820, 640)} />
          <CoinSticker chain="usdc" style={at(950, 640)} />
          <RequestSticker accepted={1} outline={1} style={at(1120, 300)} />
          <RequestSticker kind="rawHash" bounced={1} style={at(1120, 450)} />
          <ToastSticker style={at(1120, 700)} />
          <Badge style={at(70, 560)} />
          <Badge shape="burst" style={at(250, 520)} />
        </>
      ) : page === "hero2" ? (
        <>
          <ContractPlaque footnote style={at(60, 60)} />
          <GiftBox open={1} style={at(940, 160)} />
          <GiftBox style={at(1400, 160)} />
          <StickyNote curl={0.55} tilt={5} style={at(80, 560)} />
          <ExchangeSticker style={at(520, 640)} />
          <WalletSticker style={at(780, 640)} />
          <div style={at(1500, 760)}>
            <Sparkles progress={0.42} radius={170} size={60} />
          </div>
        </>
      ) : (
        <>
          <PocketJeans fabric part="back" style={at(150, 230)} />
          <SignedSlip scale={1.7} style={at(205, 110)} />
          <PocketJeans fabric part="front" style={at(150, 230)} />
          <TradeDesk width={900} legs={60} style={at(740, 380)} />
          <UsdcStack scale={1.0} style={at(1100, 168)} />
          <SatchelCard width={300} chips={[{ chain: "btc", amount: "1.20" }, { chain: "evm", amount: "18" }, { chain: "sol", amount: "300" }]} total="" style={at(790, 186)} />
          <SignSlot part="back" style={at(760, 700)} />
          <RequestSticker style={at(830, 640)} />
          <SignSlot part="front" accept={1} style={at(760, 700)} />
          <RecordOutline signed={1} scale={1.5} style={at(1430, 640)} />
          <RecordOutline chain="sol" label="SOL · blockhash 1" stamp={1} scale={1.5} style={at(1430, 740)} />
          <RecordOutline label="ETH · nonce 12" variant="unused" scale={1.5} style={at(1430, 840)} />
        </>
      )}
    </AbsoluteFill>
  );
}

export function Gallery({ page = "grid" }: { page?: "grid" | "hero1" | "hero2" | "hero3" | "hero4" }) {
  if (page !== "grid") return <Hero page={page} />;
  return <Grid />;
}

function Grid() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const ramp = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const sp = (sec: number, cfg = { stiffness: 260, damping: 14, mass: 0.8 }) => spring({ frame: f - Math.round(sec * fps), fps, config: cfg });
  const hit = (sec: number) => ramp(sec, sec + 0.4);
  // loops
  // two passes per loop: animate, then hold through t = 3.0 s (the QA still), then animate again
  const pass = (a: number, b: number) => (t < 3.4 ? ramp(a, b) : ramp(a + 3.4, b + 3.4));
  const sign = pass(0.3, 1.6);
  const curl = 0.16 + 0.5 * (0.5 - 0.5 * Math.cos(t * 1.7));
  const scanP = t < 3.4 ? ramp(0.4, 2.2) : ramp(3.6, 5.4);
  const scanT0 = t < 3.4 ? 0.4 : 3.6;
  const draw = pass(0.2, 1.4);
  const type = pass(0.9, 1.7);

  return (
    <AbsoluteFill style={{ background: C.sunken }}>
      {/* ---------------- row 1 ---------------- */}
      <Cell row={0} col={0} title="SignedSlip" sub="sign 0→1 · tilt">
        <SignedSlip scale={0.8} sign={sign} style={at(14, 84)} />
        <SignedSlip scale={0.8} tilt={-7} style={at(156, 94)} />
      </Cell>

      <Cell row={0} col={1} title="CoinSticker" sub="chains · faced (app) · network · flip · squash">
        {(["btc", "evm", "sol"] as const).map((c, i) => (
          <CoinSticker key={c} chain={c} size={48} k={2} style={at(22 + i * 60, 78)} />
        ))}
        <CoinSticker chain="usdc" network="base" size={48} k={2} style={at(202, 78)} />
        <CoinSticker chain="near" size={48} k={2} style={at(262, 78)} />
        {["BTC", "ETH", "SOL", "USDC", "NEAR"].map((s, i) => (
          <Cap key={s} x={46 + i * 60} y={138} center>
            {s}
          </Cap>
        ))}
        {(["ethereum", "arbitrum", "optimism"] as const).map((n, i) => (
          <CoinSticker key={n} chain="usdc" network={n} size={44} k={2} style={at(24 + i * 60, 176)} />
        ))}
        <CoinSticker chain="wnear" network="near" size={44} k={2} style={at(204, 176)} />
        <CoinSticker chain="btc" size={50} k={2} flip={t * 220} style={at(22, 240)} />
        <CoinSticker chain="usdc" network="base" size={50} k={2} flip={t * 180 + 40} style={at(94, 240)} />
        <CoinSticker chain="evm" size={50} k={2} squash={0.75} style={at(166, 240)} />
        <CoinSticker chain="near" size={50} k={2} face={{ smile: 1.6, blink: t % 2 > 1.8 ? 1 : 0 }} style={at(244, 240)} />
        {["flip", "flip", "squash", "face"].map((s, i) => (
          <Cap key={i} x={[47, 119, 191, 269][i]} y={300} center>
            {s}
          </Cap>
        ))}
      </Cell>

      <Cell row={0} col={2} title="PriceTag" sub="string · note · clip">
        <PriceTag scale={1.05} swing={6 * Math.sin(t * 3)} style={at(88, 92)} />
        <PriceTag scale={1.05} note="bound to 3 signatures" clip={sp(2.4, { stiffness: 320, damping: 18, mass: 0.7 })} tilt={-3} style={at(88, 212)} />
      </Cell>

      <Cell row={0} col={3} title="FrostLaminate" sub="progress · pill · melt">
        <div style={at(25, 86)}>
          <SatchelCard width={340} />
          <FrostLaminate width={340} height={214.4} progress={ramp(0.5, 1.6)} pill={sp(1.7)} melt={ramp(5.0, 5.7)} style={at(0, 0)} />
        </div>
      </Cell>

      <Cell row={0} col={4} title="Stamp" sub="impact · success · danger · rect · circle">
        <Stamp scale={0.9} text="Nonce used" impact={hit(0.7)} style={at(26, 84)} />
        <Stamp scale={0.9} text="Coin spent" impact={hit(1.1)} style={at(26, 146)} />
        <Stamp scale={0.9} text="Blockhash expired" impact={hit(1.5)} style={at(26, 208)} />
        <Stamp scale={0.9} text="Unused" variant="danger" impact={hit(2.2)} style={at(26, 270)} />
        <Stamp scale={0.86} text="Clean" shape="circle" impact={hit(1.9)} style={at(330, 78)} />
        <Stamp scale={0.86} text="Unused" shape="circle" variant="danger" impact={hit(2.5)} style={at(330, 202)} />
      </Cell>

      {/* ---------------- row 2 ---------------- */}
      <Cell row={1} col={0} title="ContractPlaque" sub="empty key · zero · footnote">
        <ContractPlaque scale={0.92} zero={sp(0.8)} march={t * 12} footnote reveal={ramp(1.0, 2.6)} style={at(30, 74)} />
      </Cell>

      <Cell row={1} col={1} title="GiftBox" sub="closed · open (lid pop)">
        <GiftBox scale={0.66} style={at(12, 178)} />
        <GiftBox scale={0.66} open={sp(1.2, { stiffness: 220, damping: 12, mass: 0.9 })} style={at(184, 178)} />
        <div style={at(184 + 66, 178 + 44)}>
          <Sparkles progress={ramp(1.3, 2.5)} radius={96} size={34} k={1.4} />
        </div>
      </Cell>

      <Cell row={1} col={2} title="Desk · NearStack · UsdcStack" sub="money on the OTC table (no numbers)">
        <NearStack scale={0.62} style={at(40, 214 - 0.62 * nearStackSize().h)} />
        <UsdcStack scale={0.42} style={at(222, 214 - 0.42 * usdcStackSize().h)} />
        <TradeDesk width={350} scale={1.05} legs={44} style={at(20, 214)} />
      </Cell>

      <Cell row={1} col={3} title="StickyNote" sub="12 words · curl">
        <StickyNote scale={0.78} curl={0.12} style={at(16, 84)} />
        <StickyNote scale={0.78} curl={curl} tilt={7} style={at(166, 98)} />
      </Cell>

      <Cell row={1} col={4} title="PocketJeans" sub="back · item · front (occluder)">
        <PocketJeans scale={0.82} part="back" style={at(101, 132)} />
        <SignedSlip scale={0.72} style={at(122, 64)} />
        <PocketJeans scale={0.82} part="front" style={at(101, 132)} />
      </Cell>

      {/* ---------------- row 3 ---------------- */}
      <Cell row={2} col={0} title="RequestSticker" sub="accepted · bounced · neutral">
        <RequestSticker scale={0.72} accepted={sp(1.5)} outline={ramp(1.1, 1.6)} style={at(24, 76)} />
        <RequestSticker scale={0.72} kind="message" accepted={sp(1.9)} outline={ramp(1.5, 2.0)} style={at(24, 124)} />
        <RequestSticker scale={0.72} kind="rawHash" bounced={sp(2.3)} style={at(24, 170)} />
        <RequestSticker scale={0.72} kind="approve" style={at(24, 240)} />
        <RequestSticker scale={0.72} kind="durableNonce" style={at(24, 282)} />
      </Cell>

      <Cell row={2} col={1} title="SignSlot" sub="back · sticker · front">
        {(() => {
          const sx = 15;
          const sy = 200;
          const inY = 84 + 150 * ramp(0.6, 4.2);
          const tryP = ramp(4.45, 4.85);
          const back = ramp(4.9, 5.35);
          const rawY = t < 4.9 ? 70 + 104 * Math.pow(tryP, 2) : 174 - 92 * (1 - Math.pow(1 - back, 3));
          const rej = t > 4.85 && t < 5.8 ? 1 : 0;
          return (
            <>
              <SignSlot scale={0.88} part="back" style={at(sx, sy)} />
              {t < 4.3 ? <RequestSticker scale={0.8} style={at(52, inY)} /> : null}
              {t > 4.4 ? <RequestSticker scale={0.8} kind="rawHash" bounced={t > 4.9 ? sp(4.95) : 0} tilt={t > 4.9 ? -4 * (1 - back) : 0} style={at(70, rawY)} /> : null}
              <SignSlot scale={0.88} part="front" accept={t > 4.15 && t < 4.85 ? 1 : 0} reject={rej} style={at(sx, sy)} />
            </>
          );
        })()}
      </Cell>

      <Cell row={2} col={2} title="RecordOutline" sub="draw · record · sign · stamp · message · unused">
        <RecordOutline scale={0.86} draw={draw} type={type} style={at(30, 72)} />
        <RecordOutline scale={0.86} chain="btc" label="BTC · coin 1" style={at(30, 114)} />
        <RecordOutline scale={0.86} signed={ramp(0.9, 1.3)} style={at(30, 156)} />
        <RecordOutline scale={0.86} chain="sol" label="SOL · blockhash 1" stamp={hit(1.8)} style={at(30, 198)} />
        <RecordOutline scale={0.86} kind="message" stamp={hit(2.2)} style={at(30, 240)} />
        <RecordOutline scale={0.86} label="ETH · nonce 12" variant="unused" style={at(30, 282)} />
      </Cell>

      <Cell row={2} col={3} title="ScanBeam" sub="sweep · brackets">
        <div style={at(22, 92, { width: 286, height: 214, background: C.surface, border: `3px solid ${C.ink}`, boxShadow: `0 4px 0 ${C.ink}`, borderRadius: 22, boxSizing: "border-box" })}>
          <div style={{ position: "absolute", left: 16, top: 12, ...sans(700), fontSize: 15, color: C.ink }}>History · 3 signatures</div>
          <RecordOutline scale={0.74} chain="btc" label="BTC · coin 1" stamp={hit(scanT0 + 0.3)} style={at(14, 44)} />
          <RecordOutline scale={0.74} label="ETH · nonce 1" stamp={hit(scanT0 + 0.9)} style={at(14, 92)} />
          <RecordOutline scale={0.74} chain="sol" label="SOL · blockhash 1" stamp={hit(scanT0 + 1.5)} style={at(14, 140)} />
          <ScanBeam width={252} height={140} progress={scanP} k={1} brackets={1} radius={12} style={at(14, 44)} />
        </div>
      </Cell>

      <Cell row={2} col={4} title="Badges & toasts" sub="Exchange · Wallet · New · burst · Sparkles · Sent">
        <ExchangeSticker scale={0.8} bump={ramp(1.4, 1.8)} style={at(20, 80)} />
        <WalletSticker scale={0.8} bump={ramp(2.0, 2.4)} style={at(112, 80)} />
        <Badge scale={1.3} pop={sp(0.6)} style={at(212, 100)} />
        <Badge scale={0.9} shape="burst" pop={sp(0.9)} style={at(322, 84)} />
        <div style={at(360, 122)}>
          <Sparkles progress={(t % 2) / 1.4} radius={62} size={24} k={1.3} seed={5} />
        </div>
        <ToastSticker scale={0.92} check={ramp(0.8, 1.3)} style={at(20, 196)} />
        <ToastSticker scale={0.82} text="Sent 0.05 ETH" style={at(20, 262)} />
        <ToastSticker scale={0.82} text="Sent 1.25 SOL" style={at(214, 262)} />
      </Cell>

    </AbsoluteFill>
  );
}
