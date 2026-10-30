import type { Coin, Network } from "@/lib/holdings";
import { ART, artA11y } from "./art";

/**
 * A coin as Satchel draws it (brand 2.0: a disc with a face and the constant ink outline, never a real logo), with a
 * small network sticker in its lower right when the coin isn't on its home chain: ETH on Base, USDC anywhere, anything
 * held inside the Satchel contract on NEAR. BTC, ETH and SOL are the chain charms' coins (`ChainCharm`); USDC is sky,
 * NEAR is mint, wNEAR is mint inside an ink ring (wrapped). The badge carries a letter (B, A, OP,
 * S, N) so it reads without colour; the coin's name beside it always carries the meaning (decorative unless `title`).
 */

export const COIN_FILL: Record<Coin, string> = {
  BTC: ART.btc,
  ETH: ART.evm,
  SOL: ART.sol,
  USDC: ART.sky,
  NEAR: ART.mint,
  wNEAR: ART.mint,
};

const BADGE: Record<Network, { fill: string; letter: string }> = {
  bitcoin: { fill: ART.btc, letter: "₿" },
  sepolia: { fill: ART.evm, letter: "S" },
  base: { fill: ART.base, letter: "B" },
  arbitrum: { fill: ART.arbitrum, letter: "A" },
  optimism: { fill: ART.coral, letter: "OP" },
  solana: { fill: ART.sol, letter: "S" },
  near: { fill: ART.mint, letter: "N" },
};

function Face({ coin }: { coin: Coin }) {
  return (
    <>
      <circle cx="70" cy="70" r="64" fill={COIN_FILL[coin]} stroke={ART.ink} strokeWidth="12" />
      {coin === "wNEAR" ? <circle cx="70" cy="70" r="50" fill="none" stroke={ART.ink} strokeWidth="6" /> : null}
      <circle cx="48" cy="64" r="9" fill={ART.ink} />
      <circle cx="92" cy="64" r="9" fill={ART.ink} />
      <path d="M54 88 Q70 102 86 88" fill="none" stroke={ART.ink} strokeWidth="9" strokeLinecap="round" />
    </>
  );
}

export function CoinIcon({
  coin,
  badge = null,
  size = 32,
  title,
  className,
}: {
  coin: Coin;
  badge?: Network | null;
  size?: number;
  title?: string;
  className?: string;
}) {
  // the coin is drawn at (0,0)–(140,140); the badge sits on its lower-right edge and pokes 14 units past it
  const vb = badge ? 154 : 140;
  const b = badge ? BADGE[badge] : null;
  return (
    <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} className={className} data-coin={coin} data-badge={badge ?? undefined} {...artA11y(title)}>
      <Face coin={coin} />
      {b ? (
        <g>
          <circle cx="120" cy="120" r="30" fill={b.fill} stroke={ART.ink} strokeWidth="8" />
          <text
            x="120"
            y="121"
            textAnchor="middle"
            dominantBaseline="central"
            fill={ART.ink}
            fontFamily="inherit"
            fontWeight="800"
            fontSize={b.letter.length > 1 ? 24 : 32}
          >
            {b.letter}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
