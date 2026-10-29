import { Landmark } from "lucide-react";
import { C, CHAIN, display, sans } from "../../brand/tokens";
import type { SleeveStyle } from "../../illustration/characters";
import { SatchelCard } from "../../components/Sticker";

/**
 * P6's cast and the three cards' faces (bands always read "Satchel #N", amendment A4; no fiat; native amounts).
 *   #12  the gift (charms in party hats)          → sam.near
 *   #30  the OTC position: 1.20 BTC · 18 ETH · 300 SOL (A2), set big on the card's face
 *   #21  the team treasury: "Team treasury" is a pennant on a pole OUTSIDE the card, never on the band
 */

// sleeves (cast colours stay distinct from alice lemon, bob sky, carol ink stripes, the stranger grey)
export const SLEEVE = {
  sam: { fill: C.sky, stripes: C.white, cuff: C.sky } as SleeveStyle,
  seller: { fill: C.white, cuff: C.sunken } as SleeveStyle,
  buyer: { fill: C.sunken, cuff: C.white } as SleeveStyle,
  oldTeam: { fill: C.white, stripes: C.sky } as SleeveStyle,
  newTeam: { fill: C.lemon, stripes: C.white, cuff: C.lemon } as SleeveStyle,
};

export const GIFT_CHIPS = [
  { chain: "btc" as const, amount: "0.0050" },
  { chain: "evm" as const, amount: "0.10" },
  { chain: "sol" as const, amount: "2.50" },
];
export const TREASURY_CHIPS = [
  { chain: "btc" as const, amount: "0.6200" },
  { chain: "evm" as const, amount: "9.50" },
  { chain: "sol" as const, amount: "180" },
];
export const HEAVY = [
  { chain: "btc" as const, amount: "1.20" },
  { chain: "evm" as const, amount: "18" },
  { chain: "sol" as const, amount: "300" },
];

/** The heavy card's face: the whole position set big (tabular), each with its chain dot. */
export function HeavyFront({ width, lift }: { width: number; lift: number }) {
  const rows = (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
      {HEAVY.map((r) => (
        <div key={r.chain} style={{ display: "flex", alignItems: "center", gap: 10, height: 34 }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: CHAIN[r.chain].ui, flexShrink: 0 }} />
          <span style={{ ...display(800), fontSize: 31, lineHeight: "34px", letterSpacing: "-0.03em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>{r.amount}</span>
          <span style={{ ...sans(700), fontSize: 20, lineHeight: "34px", color: C.inkMuted, paddingTop: 3 }}>{CHAIN[r.chain].ticker}</span>
        </div>
      ))}
    </div>
  );
  return <SatchelCard id="30" width={width} lift={lift} label="Inside" chips={[]} total={rows} />;
}

/**
 * "Team treasury": a lemon pennant on an ink pole standing on the card's top-left corner, pointing back along the
 * travel (flags trail). Drawn in card px as a child of the card (it turns with the swing). `k` = card width / 400.
 * `flutter` in degrees. `lift` = the card face's lift in px (the pennant rides with the face).
 */
export function TreasuryPennant({ k, lift = 0, flutter = 0 }: { k: number; lift?: number; flutter?: number }) {
  const poleH = 86 * k;
  const poleX = 26 * k;
  const fh = 50 * k;
  const fw = 246 * k;
  const notch = 16 * k;
  const ow = Math.max(4, 3 * k);
  const drop = Math.max(5, 4 * k);
  const shape = `M ${fw} 0 L ${fw} ${fh} L 0 ${fh} L ${notch} ${fh / 2} L 0 0 Z`;
  return (
    <div style={{ position: "absolute", left: 0, top: -lift, width: 0, height: 0, pointerEvents: "none" }}>
      {/* pole */}
      <div style={{ position: "absolute", left: poleX - 4 * k, top: -poleH, width: 8 * k, height: poleH + 6 * k, borderRadius: 4 * k, background: C.ink }} />
      <div style={{ position: "absolute", left: poleX - 7 * k, top: -poleH - 7 * k, width: 14 * k, height: 14 * k, borderRadius: 99, background: C.ink }} />
      {/* pennant, hinged at the pole top */}
      <div style={{ position: "absolute", left: poleX - fw, top: -poleH + 2 * k, width: fw, height: fh, rotate: `${flutter}deg`, transformOrigin: "100% 0%" }}>
        <svg width={fw} height={fh + drop} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={shape} transform={`translate(0 ${drop})`} fill={C.ink} stroke={C.ink} strokeWidth={ow} strokeLinejoin="round" />
          <path d={shape} fill={C.lemon} stroke={C.ink} strokeWidth={ow} strokeLinejoin="round" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: notch + 4 * k,
            right: 10 * k,
            top: 0,
            height: fh,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7 * k,
            ...sans(750),
            fontSize: 25 * k,
            color: C.ink,
            whiteSpace: "nowrap",
          }}
        >
          <Landmark size={24 * k} strokeWidth={2.2} color={C.ink} />
          Team treasury
        </div>
      </div>
    </div>
  );
}
