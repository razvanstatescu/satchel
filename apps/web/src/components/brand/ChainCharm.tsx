import { SOL_UI_ENABLED } from "@/lib/config";
import { ART, artA11y } from "./art";

export type CharmChain = "btc" | "evm" | "sol";

const FILL: Record<CharmChain, string> = { btc: ART.btc, evm: ART.evm, sol: ART.sol };

/** The string colour: ink on light fields (the pack), or the themed sticker outline when it hangs on a Night ground. */
type StringTone = "ink" | "sticker";
const stringFill = (tone: StringTone) => (tone === "ink" ? { fill: ART.ink } : { style: { fill: "var(--sticker-line)" } });

/** One coin with a face, drawn at (0,0)–(140,140) as in `assets/chain-*.svg`. */
function Coin({ chain, mood }: { chain: CharmChain; mood: "happy" | "sad" }) {
  const eyeY = mood === "sad" ? 66 : 64;
  return (
    <>
      <circle cx="70" cy="70" r="64" fill={FILL[chain]} stroke={ART.ink} strokeWidth="12" />
      <circle cx="48" cy={eyeY} r="9" fill={ART.ink} />
      <circle cx="92" cy={eyeY} r="9" fill={ART.ink} />
      <path d={mood === "sad" ? "M54 100 Q70 86 86 100" : "M54 88 Q70 102 86 88"} fill="none" stroke={ART.ink} strokeWidth="9" strokeLinecap="round" />
    </>
  );
}

/**
 * A chain charm: Satchel's own character for a chain (a coin with a face; never the real chain logo). 32 in pickers,
 * rows and headers; 18–28 in the card ledger; 48–64 in empty states. `hang` adds its stem (`chain-*-hang.svg`);
 * `mood="sad"` flips the smile (`chain-eth-sad.svg`: only the landing's loss frame uses it). Decorative unless
 * `title` names it (the ticker or chain name beside it usually carries the meaning).
 */
export function ChainCharm({
  chain,
  size = 32,
  mood = "happy",
  hang = false,
  stringTone = "ink",
  title,
  className,
}: {
  chain: CharmChain;
  size?: number;
  mood?: "happy" | "sad";
  hang?: boolean;
  stringTone?: StringTone;
  title?: string;
  className?: string;
}) {
  const h = hang ? 180 : 140;
  return (
    <svg viewBox={`0 0 140 ${h}`} width={size} height={Math.round((size * h) / 140)} className={className} {...artA11y(title)}>
      {hang ? <rect x="64" y="0" width="12" height="46" rx="6" {...stringFill(stringTone)} /> : null}
      <g transform={hang ? "translate(0 40)" : undefined}>
        <Coin chain={chain} mood={mood} />
      </g>
    </svg>
  );
}

/**
 * The chain charms on their strap (illustration/satchel-charms-chains.svg, one coin per chain the app shows: BTC and
 * ETH, plus SOL only with SOL_UI_ENABLED, D-40). For the empty wallet, onboarding, the signed-out /satchels state and
 * the first mint. Put it on a light field (`bg-sky`), or pass `stringTone="sticker"` on a Night ground.
 */
export function ChainCharms({
  chains = SOL_UI_ENABLED ? ["btc", "evm", "sol"] : ["btc", "evm"],
  width = 168,
  layout = "pack",
  stringTone = "ink",
  title,
  className,
}: {
  chains?: readonly CharmChain[];
  width?: number;
  /**
   * `pack`: the brand pack's illustration (big coins under a short strap). `strap`: the app's compact charm bar
   * (proto `.mint-charms`: a long 10 px strap with 52 px coins 28 px apart at `width` 168), for the signed-out
   * /satchels state and the first mint. `width` is the strap's width.
   */
  layout?: "pack" | "strap";
  stringTone?: StringTone;
  title?: string;
  className?: string;
}) {
  if (layout === "strap") {
    // units: a coin is 140 wide (52 px at a 168 px strap); the strap is 27 tall, coins hang 75 apart, the stems start
    // 5 units above the strap's bottom edge, and the strap reaches 48 units past the outer coins
    const row = chains.length * 140 + (chains.length - 1) * 75;
    const strapW = Math.max(452, row + 96);
    const x0 = (strapW - row) / 2;
    const vbH = 22 + 180;
    return (
      <svg viewBox={`0 0 ${strapW} ${vbH}`} width={width} height={Math.round((width * vbH) / strapW)} className={className} {...artA11y(title)}>
        <rect x="0" y="0" width={strapW} height="27" rx="13.5" {...stringFill(stringTone)} />
        {/* each coin is one top-level <g> with no transform of its own: the swing (MintFlow's useCharmSwing) pivots it
            about the top of its stem with `transform-box: fill-box` */}
        {chains.map((c, i) => {
          const x = x0 + i * 215;
          return (
            <g key={c}>
              <rect x={x + 64} y="22" width="12" height="46" rx="6" {...stringFill(stringTone)} />
              <g transform={`translate(${x} 62)`}>
                <Coin chain={c} mood="happy" />
              </g>
            </g>
          );
        })}
      </svg>
    );
  }
  const strapW = 160 * (chains.length - 1) + 120;
  const vbW = strapW + 40;
  return (
    <svg viewBox={`40 20 ${vbW} 236`} width={width} height={Math.round((width * 236) / vbW)} className={className} {...artA11y(title)}>
      <rect x="60" y="40" width={strapW} height="22" rx="11" {...stringFill(stringTone)} />
      {chains.map((c, i) => {
        const x = 120 + 160 * i;
        return (
          <g key={c}>
            <rect x={x - 6} y="74" width="12" height="40" rx="6" {...stringFill(stringTone)} />
            <g transform={`translate(${x - 70} 100)`}>
              <Coin chain={c} mood="happy" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
