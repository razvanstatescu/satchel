import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { BadgeCheck, Wallet } from "lucide-react";
import { C, CHAIN, F, type Chain } from "../../brand/tokens";
import { SatchelCard } from "../../components/SatchelCard";
import { ChainMark, Chip, SigningStep, type StepState } from "../../components/product";
import { Sfx } from "../../lib/Sfx";
import { getScene } from "../../lib/timeline";
import { EASE, FPS, SPRING, W, s, tween } from "../../lib/time";
import { S01_END_CARD } from "../S01";
import { bric, CLAMP, clamp01, KeyLitGround, lerp, MaskLine, pickSfx } from "../S01/kit";
import { cardH, Roll, WalletCard } from "./card";
import { S8_ADDR, S8_ID, W1_END_CARD } from "./s8";

/**
 * W1 Mint (L20). Satchel #1 from S01's last frame flips over into the stitched mint preview ("New Satchel", tickers
 * only; the stitch sews itself: this one is yours). The product's mint steps run (Approve in your wallet → Minting on
 * NEAR → Minted), the band rolls to "Satchel #8", and its three addresses derive and type out on the words "Bitcoin",
 * "Ethereum", "Solana". Text: "Mint one." · "Three addresses." · "Satchel #8 is yours." (product copy).
 */

const sc = getScene("W1");
const D = sc.duration;
const L = sc.line("L20");
const word = (p: string) => sc.wordAt("L20", p);
const tMint = L.start + (L.words[0]?.start ?? 0);
const clampT = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(x, Math.max(lo, hi)));

const CHAINS: Chain[] = ["btc", "evm", "sol"];
const CHAIN_WORD: Record<Chain, string> = { btc: "bitcoin", evm: "ethereum", sol: "solana" };

// Choreography, anchored to the VO.
const T_SEW = Math.max(0.42, tMint + 0.2); // the preview's stitch sews itself
const SEW_DUR = 0.5;
const T_STEPS = T_SEW + 0.42; // product mint steps appear
const T_APPROVED = T_STEPS + 0.22;
const tBtcWord = word("bitcoin");
const T_MINTED = clampT(word("comes") + 0.2, T_APPROVED + 0.45, tBtcWord - 0.6);
const T_YOURS = T_MINTED + 0.16; // band rolls to Satchel #8; "Satchel #8 is yours."
const T_THREE = clampT(word("own") - 0.1, T_YOURS + 0.25, tBtcWord - 0.15);
const TYPE_DUR = 0.45;
const ROW_T: number[] = [];
for (const ch of CHAINS) {
  const prev = ROW_T.length ? ROW_T[ROW_T.length - 1] : T_THREE - 0.1;
  ROW_T.push(Math.min(Math.max(word(CHAIN_WORD[ch]) - 0.1, prev + 0.3), D - 0.35 - TYPE_DUR - (2 - ROW_T.length) * 0.3));
}
const T_NEAR_CHIPS = T_STEPS + 0.1;
// The mint happens centre stage; the group (headline, card, steps, chips) then slides into the left column to make
// room for the addresses, before the steps resolve so "Satchel #8 is yours." lands where it stays.
const T_SHIFT = Math.min(T_SEW + SEW_DUR + 0.05, ROW_T[0] - 0.6);
const SHIFT_X = 960 - W1_END_CARD.cx; // centred card → left column

// Layout.
const CARD = W1_END_CARD; // left column
const CARD_H = cardH(CARD.w);
const COL_R = 730; // right column x
const ROW_CY = [CARD.cy - 140, CARD.cy, CARD.cy + 140];
const MARK = 76;
const TEXT_X = COL_R + MARK + 22;
const STITCH_PERIM = 1216; // card stitch length in base units (384×236 rect, r14), for one-stitch-at-a-time
const quantStitch = (p: number) => (p <= 0 ? 0 : Math.min(1, (Math.ceil((p * STITCH_PERIM) / 11) * 11) / STITCH_PERIM));

function Headline({ p, children }: { p: number; children: string }) {
  return (
    <MaskLine p={p}>
      <div style={{ ...bric(lerp(560, 780, p), lerp(86, 100, p)), fontSize: 112, lineHeight: 1.04, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>{children}</div>
    </MaskLine>
  );
}

export default function W1() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;

  // card: carried over from S01, flips into the mint preview while it travels to the left column
  const travel = spring({ frame: f, fps, config: SPRING.handoff });
  const flip = spring({ frame: f - 1, fps, config: SPRING.lift });
  const angle = 180 * flip;
  const shift = spring({ frame: f - s(T_SHIFT), fps, config: SPRING.lift });
  const gx = SHIFT_X * (1 - shift); // group offset while centred
  const cx = lerp(S01_END_CARD.cx, CARD.cx + SHIFT_X, travel) - SHIFT_X * shift;
  const cy = lerp(S01_END_CARD.cy, CARD.cy, travel);
  const cw = lerp(S01_END_CARD.w, CARD.w, travel);

  const sew = quantStitch(tween(f, T_SEW, T_SEW + SEW_DUR, 0, 1, EASE.standard));
  const minted = t >= T_YOURS;
  const roll = interpolate(f, [s(T_YOURS), s(T_YOURS) + 9], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const pill = interpolate(f, [s(T_YOURS) + 4, s(T_YOURS) + 12], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const settle = spring({ frame: f - s(T_YOURS), fps, config: SPRING.slam });
  const pop = 1 + 0.035 * Math.sin(Math.PI * clamp01(settle)) * (1 - clamp01((t - T_YOURS - 0.3) / 0.3));

  // product mint steps
  const pulse = 0.55 + 0.45 * Math.cos((2 * Math.PI * t) / 1.2);
  const stepState = (start: number, end: number): StepState => (t < start ? "future" : t < end ? "active" : "done");
  const stepsIn = interpolate(f, [s(T_STEPS), s(T_STEPS) + 12], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const stepsOut = interpolate(f, [s(T_YOURS) - 2, s(T_YOURS) + 6], [0, 1], { ...CLAMP, easing: EASE.expoIn });
  const yoursP = interpolate(f, [s(T_YOURS), s(T_YOURS) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const nearChips = interpolate(f, [s(T_NEAR_CHIPS), s(T_NEAR_CHIPS) + 14], [0, 1], { ...CLAMP, easing: EASE.expoOut });

  // lands just after the card has flipped past the headline's band (the card travels down through it)
  const tMintText = Math.max(tMint - 0.05, 0.2);
  const mintP = interpolate(f, [s(tMintText), s(tMintText) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const threeP = interpolate(f, [s(T_THREE), s(T_THREE) + 16], [0, 1], { ...CLAMP, easing: EASE.expoOut });
  const drift = 1 + 0.015 * tween(f, 0, D, 0, 1, EASE.standard);

  const backFace = (
    <WalletCard
      width={cw}
      name={<Roll from="New Satchel" to={`Satchel #${S8_ID}`} p={roll} />}
      status="active"
      pillOpacity={pill}
      total="3 chains"
      sub={minted ? "Balances below" : "Bitcoin, Ethereum and Solana addresses"}
      chips={CHAINS.map((ch) => ({ chain: ch, label: minted ? `${CHAIN[ch].ticker} 0` : CHAIN[ch].ticker }))}
      stitch={sew}
      strongStitch
    />
  );
  const frontFace = <SatchelCard tokenId="1" width={cw} status="active" stitch={1} />;

  return (
    <AbsoluteFill style={{ background: C.ground }}>
      <KeyLitGround plateName="leather-ground" plateOpacity={0.3} light={0.26} dx={-24 * tween(f, 0, D, 0, 1, EASE.standard)} />
      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        {/* headlines: "Mint one." over the card, "Three addresses." over the addresses */}
        <div style={{ position: "absolute", left: 120 + gx, top: 104 }}>
          <Headline p={mintP}>Mint one.</Headline>
        </div>
        <div style={{ position: "absolute", left: COL_R, top: 104 }}>
          <Headline p={threeP}>Three addresses.</Headline>
        </div>

        {/* derivation connectors (not a stitch: the addresses are derived from the token) */}
        <svg width={W} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {CHAINS.map((ch, i) => {
            const x0 = CARD.cx + CARD.w / 2 + 4 + gx;
            const d = `M ${x0} ${CARD.cy} C ${x0 + 46} ${CARD.cy}, ${COL_R - 50} ${ROW_CY[i]}, ${COL_R - 6} ${ROW_CY[i]}`;
            const p = tween(f, ROW_T[i] - 0.22, ROW_T[i] + 0.04, 0, 1, EASE.expoInOut);
            if (p <= 0) return null;
            const evo = evolvePath(p, d);
            return <path key={ch} d={d} fill="none" stroke={C.lineStrong} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />;
          })}
        </svg>

        {/* the three derived addresses */}
        {CHAINS.map((ch, i) => {
          const rowIn = interpolate(f, [s(ROW_T[i]) - 3, s(ROW_T[i]) + 9], [0, 1], { ...CLAMP, easing: EASE.expoOut });
          if (rowIn <= 0) return null;
          const markP = spring({ frame: f - s(ROW_T[i]) + 3, fps, config: SPRING.slam });
          const addr = S8_ADDR[ch];
          const typed = Math.max(0, Math.min(addr.length, Math.floor(((t - ROW_T[i] - 0.05) / TYPE_DUR) * addr.length)));
          const typing = typed > 0 && typed < addr.length;
          return (
            <div key={ch}>
              <div style={{ position: "absolute", left: COL_R, top: ROW_CY[i] - MARK / 2, transform: `scale(${lerp(0.4, 1, markP)})`, opacity: clamp01(markP * 3) }}>
                <ChainMark chain={ch} size={MARK} />
              </div>
              <div style={{ position: "absolute", left: TEXT_X, top: ROW_CY[i] - 46, opacity: rowIn, transform: `translateX(${(1 - rowIn) * -16}px)` }}>
                <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 30, lineHeight: "36px", color: C.inkMuted }}>{CHAIN[ch].name}</div>
                <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 36, lineHeight: "50px", color: C.ink, whiteSpace: "pre" }}>
                  {addr.slice(0, typed)}
                  {typing ? <span style={{ display: "inline-block", width: "0.55em", height: "0.95em", verticalAlign: "-0.12em", background: C.ink, opacity: 0.85 }} /> : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* the card */}
        <div style={{ position: "absolute", left: cx - cw / 2, top: cy - cardH(cw) / 2, perspective: 1800 }}>
          <div style={{ transform: `rotateY(${angle < 90 ? angle : angle - 180}deg) scale(${pop})`, transformStyle: "preserve-3d" }}>{angle < 90 ? frontFace : backFace}</div>
        </div>

        {/* product mint steps → "Satchel #8 is yours." */}
        <div style={{ position: "absolute", left: CARD.cx - CARD.w / 2 + gx, top: CARD.cy + CARD_H / 2 + 34 }}>
          {stepsIn > 0 && stepsOut < 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: stepsIn * (1 - stepsOut), transform: `translateY(${(1 - stepsIn) * 24 - stepsOut * 30}px)` }}>
              <SigningStep k={2} state={stepState(T_STEPS, T_APPROVED)} label="Approve in your wallet" pulse={pulse} />
              <SigningStep k={2} state={stepState(T_APPROVED, T_MINTED)} label="Minting on NEAR" pulse={pulse} />
              <SigningStep k={2} state={t >= T_MINTED ? "done" : "future"} label="Minted" />
            </div>
          ) : null}
          {yoursP > 0 ? (
            <div style={{ position: "absolute", left: 0, top: 0 }}>
              <MaskLine p={yoursP}>
                <div style={{ ...bric(lerp(560, 720, yoursP), 100), fontSize: 64, lineHeight: 1.08, letterSpacing: "-0.02em", color: C.ink, whiteSpace: "nowrap" }}>Satchel #{S8_ID} is yours.</div>
              </MaskLine>
            </div>
          ) : null}
        </div>

        {/* it's a standard NEAR NFT */}
        <div style={{ position: "absolute", left: CARD.cx - CARD.w / 2 + gx, top: 906, display: "flex", gap: 16, opacity: nearChips, transform: `translateY(${(1 - nearChips) * 20}px)` }}>
          <Chip k={2.25}>
            <BadgeCheck size={30} strokeWidth={1.75} color={C.inkMuted} />
            Standard NEAR NFT
          </Chip>
          <Chip k={2.25}>
            <Wallet size={30} strokeWidth={1.75} color={C.inkMuted} />
            Works in any NEAR wallet
          </Chip>
        </div>
      </AbsoluteFill>

      <Sfx name={pickSfx("card-flick", "swish-short")} at={0.12} align="peak" />
      <Sfx name="stitch-run" at={T_SEW} gainDb={-2} />
      <Sfx name={pickSfx("approve-chime", "ui-tick")} at={T_APPROVED} gainDb={-4} />
      <Sfx name="ui-tick" at={T_MINTED} />
      <Sfx name="success-brass" at={T_YOURS} gainDb={-6} />
      {ROW_T.map((rt, i) => (
        <Sfx key={i} name="type-tick-run" at={rt + 0.05} rate={1.6} gainDb={-2} />
      ))}
    </AbsoluteFill>
  );
}
