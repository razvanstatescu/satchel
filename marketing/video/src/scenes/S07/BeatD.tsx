import { AbsoluteFill, spring } from "remotion";
import { noise2D } from "@remotion/noise";
import { EASE, FPS, SPRING } from "../../lib/time";
import { CleanHistoryRow, GroupTitle } from "../../components/product";
import { Headline, tw, type Cues } from "./lib";
import { PANEL, PK, SalePage } from "./SalePage";

/**
 * D · L16 counter-example: whip to Satchel #4. One record is still live ("Ethereum · nonce 5 — Unused"), the verdict
 * turns danger, the gate reads "Blocked: 1 unused signature", and Buy stays at the product's disabled 40 %.
 */
export function BeatD({ t, q }: { t: number; q: Cues }) {
  const f = t * FPS;
  const spin = f * 12;
  const r = tw(t, q.dUnused - 1 / FPS, q.dUnused + 0.26, 0, 1, EASE.expoOut);
  const blocked = t >= q.dVerdict;
  const pop = spring({ frame: f - q.dVerdict * FPS, fps: FPS, config: SPRING.slam });
  const gateBlocked = t >= q.dBuy;
  // impact shake on the panel when the live signature turns up (translate only, decays in ~0.4 s)
  const st = t - q.dUnused;
  const env = st < 0 ? 0 : 10 * Math.exp(-st / 0.14);
  const shake = { x: noise2D("d-x", st * 11, 0) * env, y: noise2D("d-y", 0, st * 11) * env * 0.6 };
  // Buy "refuses": a quick horizontal no-shake, the lit level dips back to the disabled 40 %
  const bt = t - q.dBuy;
  const nudge = bt < 0 ? 0 : Math.sin(bt * 42) * 12 * Math.exp(-bt / 0.12);
  const tug = bt < 0 ? 0 : 0.35 * Math.exp(-bt / 0.1);

  const rows = (
    <div>
      <GroupTitle k={PK} style={{ marginBottom: 6 * PK, opacity: tw(t, q.dUnused, q.dUnused + 0.3) }}>
        Needs attention (1)
      </GroupTitle>
      <CleanHistoryRow k={PK} pad={10} title="Ethereum · nonce 5" wouldPay="Would send 0.0020 ETH to 0x8b2f…f741" evidence="Nonce 5 not used yet" status="unused" resolve={r} spin={spin} />
    </div>
  );

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: PANEL.x, top: 62 }}>
        <Headline lines={["Anything live?"]} t={t} at={q.cutD + 0.12} size={104} style={{ display: "inline-block" }} />
        <Headline lines={["Buy stays locked."]} t={t} at={q.dBuy - 0.03} size={104} style={{ display: "inline-block", marginLeft: 30 }} />
      </div>
      <SalePage
        top={222}
        tokenId="4"
        body="#2d1a14"
        price="5.00 USDC"
        verdict={blocked ? "blocked" : "checking"}
        verdictTitle={blocked ? undefined : "Checking 1 past signature…"}
        verdictPop={blocked ? 1 + 0.25 * (1 - pop) : 1}
        count={1}
        spin={spin}
        trustIn={1}
        rows={rows}
        gate={gateBlocked ? "blocked" : "checking"}
        lit={tug}
        sheen={0}
        buyNudge={nudge}
        panelShake={shake}
      />
    </AbsoluteFill>
  );
}
