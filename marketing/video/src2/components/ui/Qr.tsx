import type { CSSProperties, ReactElement } from "react";
import { Mark } from "../../brand/Logo";
import { C, type Chain } from "../../brand/tokens";
import QR from "./qr-matrices.json";

/**
 * A QR code drawn from a precomputed module matrix (qr-matrices.json, generated offline with `qrcode`, EC level H) for
 * Satchel #7's checksum-INVALID demo addresses: it decodes, and any wallet rejects what it reads.
 * Styled like a shipped wallet: round dot modules, rounded finder eyes, the Satchel mark in a white plate at the centre
 * (inside EC-H's budget). `reveal` 0..1 sweeps the modules in from the top-left (finders first).
 */

type Matrix = { text: string; version: number; size: number; rows: string[] };
const MATRIX = QR as unknown as Record<Chain, Matrix>;

export function QrCode({ chain = "btc", size = 208, color = C.ink, logo = true, reveal = 1, style }: { chain?: Chain; size?: number; color?: string; logo?: boolean; reveal?: number; style?: CSSProperties }) {
  const m = MATRIX[chain];
  const n = m.size;
  const unit = size / n;
  const isFinder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  // logo hole: ~22 % of the width, centred, on whole modules
  const hole = logo ? Math.round(n * 0.22) | 1 : 0;
  const h0 = Math.floor((n - hole) / 2);
  const inHole = (x: number, y: number) => logo && x >= h0 - 1 && x <= h0 + hole && y >= h0 - 1 && y <= h0 + hole;
  const dots: ReactElement[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m.rows[y][x] !== "1" || isFinder(x, y) || inHole(x, y)) continue;
      const order = (x + y) / (2 * n - 2); // diagonal sweep
      const v = Math.max(0, Math.min(1, (reveal * 1.25 - order) / 0.25));
      if (v <= 0) continue;
      dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.43 * v} fill={color} />);
    }
  }
  const finder = (fx: number, fy: number) => {
    const v = Math.max(0, Math.min(1, reveal * 4));
    return (
      <g key={`${fx}-${fy}`} opacity={v}>
        <rect x={fx + 0.5} y={fy + 0.5} width={6} height={6} rx={2} fill="none" stroke={color} strokeWidth={1} />
        <rect x={fx + 2} y={fy + 2} width={3} height={3} rx={1} fill={color} />
      </g>
    );
  };
  const plate = hole + 1.2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} style={{ display: "block" }} aria-hidden>
        {dots}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </svg>
      {logo ? (
        <div style={{ position: "absolute", left: (size - plate * unit) / 2, top: (size - plate * unit) / 2, width: plate * unit, height: plate * unit, display: "grid", placeItems: "center", opacity: Math.max(0, Math.min(1, reveal * 2 - 0.6)) }}>
          <Mark size={plate * unit * 0.92} />
        </div>
      ) : null}
    </div>
  );
}
