import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Check, CircleCheck, Lock, Snowflake, TriangleAlert } from "lucide-react";
import { C, display, mono, sans } from "../../brand/tokens";
import { CoinIcon, COINS_7, SatchelCard } from "../Sticker";
import { ADDR7, AMOUNTS, coinsOf, HISTORY_7, SATCHEL4, truncate } from "./data";
import { AllowanceCard, ClaimLinkCard, NetworksCard, OfferCard } from "./feature-cards";
import { GiveSheet } from "./GiveSheet";
import { AddressText, Avatar, CoinFace, NewBadge, PausedBanner, Scaled, StatusPill, Steps, Toast, UiButton } from "./kit";
import { ListSheet } from "./ListSheet";
import { MintScreen } from "./MintScreen";
import { QrCode } from "./Qr";
import { ReceiveScreen } from "./ReceiveScreen";
import { SalePage } from "./SalePage";
import { SatchelScreen } from "./SatchelScreen";
import { SendScreen, WalletApproveSheet } from "./SendScreen";
import { SentToast, SigningScreen, SigningTracker } from "./SigningTracker";

/**
 * UiGallery: QA sheet for the Satchel 2.0 UI kit. Five pages of 2 s each (1920 × 1080, 30 fps, 300 frames):
 *   1 Mint · Fund · Send   2 Sent · Satchel page · Give · List   3–4 the sale page (T5–T7)   5 building blocks.
 * Pulses, spinners, the scan beam and the verdict pop run off the frame so the sheet doubles as a motion check.
 * Frames here are simple stand-ins; the real PhoneFrame / BrowserFrame live in src2/illustration/characters.
 */

export const UI_GALLERY = { width: 1920, height: 1080, fps: 30, framesPerPage: 60, pages: 6, durationInFrames: 360 } as const;

const PHONE_S = 0.53;
const BROWSER_S = 0.55;

export function UiGallery() {
  const frame = useCurrentFrame();
  const page = Math.min(UI_GALLERY.pages - 1, Math.floor(frame / UI_GALLERY.framesPerPage));
  const f = frame % UI_GALLERY.framesPerPage;
  const live = { pulse: (f % 30) / 30, spin: (f % 24) / 24 };
  const titles = ["Mint · Fund · Send", "Sent · Satchel page · Give · List", "Sale page (carol.near): the check", "Sale page: buy, hand-off, blocked", "Building blocks", "SCRIPT-v4: the value card · feature stickers"];
  return (
    <AbsoluteFill style={{ background: "#e9e6f3", color: C.ink, ...sans(400) }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 56px" }}>
        <span style={{ ...display(800), fontSize: 30, letterSpacing: "-0.02em" }}>Satchel 2.0 UI kit</span>
        <span style={{ ...sans(600), fontSize: 18, color: C.inkMuted }}>{titles[page]}</span>
        <span style={{ marginLeft: "auto", ...mono(500), fontSize: 14, color: C.inkMuted }}>
          page {page + 1}/{UI_GALLERY.pages} · src2/components/ui
        </span>
      </div>
      {page === 0 ? <PageOne {...live} /> : page === 1 ? <PageTwo {...live} /> : page === 2 ? <PageThree {...live} f={f} /> : page === 3 ? <PageFour {...live} /> : page === 4 ? <PageFive {...live} f={f} /> : <PageSix f={f} />}
    </AbsoluteFill>
  );
}

/* ───────────── frames and cells ───────────── */

function Phone({ children }: { children: ReactNode }) {
  return (
    <Scaled w={406} h={860} scale={PHONE_S}>
      <div style={{ width: 406, height: 860, borderRadius: 50, border: `8px solid ${C.ink}`, overflow: "hidden", boxSizing: "border-box", background: C.ink, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 42, overflow: "hidden" }}>{children}</div>
        <div style={{ position: "absolute", left: "50%", top: 11, width: 112, height: 32, marginLeft: -56, borderRadius: 999, background: C.ink }} />
        <div style={{ position: "absolute", left: "50%", bottom: 8, width: 134, height: 5, marginLeft: -67, borderRadius: 999, background: C.ink, opacity: 0.85 }} />
      </div>
    </Scaled>
  );
}

function Browser({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Scaled w={1280} h={844} scale={BROWSER_S}>
      <div style={{ width: 1280, height: 844, borderRadius: 18, border: `3px solid ${C.ink}`, overflow: "hidden", boxSizing: "border-box", background: C.surface, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 41, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: `1px solid ${C.line}`, background: C.sunken }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.surface, border: `2px solid ${C.lineStrong}` }} />
          ))}
          <span style={{ marginLeft: 120, display: "flex", alignItems: "center", gap: 8, height: 26, padding: "0 14px", borderRadius: 999, background: C.surface, ...sans(500), fontSize: 13, color: C.inkMuted }}>
            <Lock size={12} strokeWidth={2} />
            {title}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
      </div>
    </Scaled>
  );
}

function Cell({ name, state, children }: { name: string; state: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      {children}
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...sans(700), fontSize: 14, color: C.ink }}>{name}</div>
        <div style={{ ...mono(450), fontSize: 11.5, color: C.inkMuted }}>{state}</div>
      </div>
    </div>
  );
}

function PhoneRows({ rows }: { rows: ReactNode[][] }) {
  return (
    <div style={{ padding: "6px 56px 0", display: "flex", flexDirection: "column", gap: 18 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          {r}
        </div>
      ))}
    </div>
  );
}

type Live = { pulse: number; spin: number };

/* ───────────── page 1: Mint · Fund · Send ───────────── */

function PageOne({ pulse, spin }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          <Cell key="m1" name="MintScreen" state='state="idle"'><Phone><MintScreen state="idle" /></Phone></Cell>,
          <Cell key="m2" name="MintScreen" state='state="pressed"'><Phone><MintScreen state="pressed" /></Phone></Cell>,
          <Cell key="m3" name="MintScreen" state='state="wallet"'><Phone><MintScreen state="wallet" spin={spin} pulse={pulse} /></Phone></Cell>,
          <Cell key="m4" name="MintScreen" state='state="minting"'><Phone><MintScreen state="minting" spin={spin} pulse={pulse} /></Phone></Cell>,
          <Cell key="m5" name="MintScreen" state='state="minted"'><Phone><MintScreen state="minted" /></Phone></Cell>,
          <Cell key="r1" name="ReceiveScreen" state='incoming="waiting"'><Phone><ReceiveScreen incoming="waiting" spin={spin} /></Phone></Cell>,
          <Cell key="r2" name="ReceiveScreen" state='incoming="mempool"'><Phone><ReceiveScreen incoming="mempool" /></Phone></Cell>,
        ],
        [
          <Cell key="r3" name="ReceiveScreen" state='incoming="received" copied'><Phone><ReceiveScreen incoming="received" copied /></Phone></Cell>,
          <Cell key="s1" name="SendScreen" state='chain="btc"'><Phone><SendScreen /></Phone></Cell>,
          <Cell key="s2" name="SendScreen" state="press={1}"><Phone><SendScreen press={1} /></Phone></Cell>,
          <Cell key="s3" name="+ WalletApproveSheet" state='cta="wallet" open={1}'><Phone><SendScreen cta="wallet" spin={spin} overlay={<WalletApproveSheet />} /></Phone></Cell>,
          <Cell key="s4" name="WalletApproveSheet" state="press={1} approved"><Phone><SendScreen cta="wallet" spin={spin} overlay={<WalletApproveSheet press={1} approved />} /></Phone></Cell>,
          <Cell key="g1" name="SigningScreen" state='stage="signing" 0:03'><Phone><SigningScreen stage="signing" elapsedSec={3} pulse={pulse} /></Phone></Cell>,
          <Cell key="g2" name="SigningScreen" state='stage="signing" 0:09'><Phone><SigningScreen stage="signing" elapsedSec={9} pulse={pulse} /></Phone></Cell>,
        ],
      ]}
    />
  );
}

/* ───────────── page 2: Sent · Satchel page · Give · List ───────────── */

function PageTwo({ pulse, spin }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          <Cell key="g3" name="SigningScreen" state='stage="broadcasting"'><Phone><SigningScreen stage="broadcasting" spin={spin} pulse={pulse} /></Phone></Cell>,
          <Cell key="g4" name="SigningScreen" state='stage="sent" toast={1}'><Phone><SigningScreen stage="sent" toast={1} /></Phone></Cell>,
          <Cell key="e1" name="SendScreen" state='chain="evm"'><Phone><SendScreen chain="evm" /></Phone></Cell>,
          <Cell key="e2" name="SendScreen" state='chain="sol"'><Phone><SendScreen chain="sol" /></Phone></Cell>,
          <Cell key="p1" name="SatchelScreen" state='balances=fill pill="new"'><Phone><SatchelScreen balances={AMOUNTS.fill} pill="new" /></Phone></Cell>,
          <Cell key="p2" name="SatchelScreen" state="after · pressGive={1}"><Phone><SatchelScreen pressGive={1} /></Phone></Cell>,
          <Cell key="v1" name="+ GiveSheet" state='typed={0.6} lookup="checking"'><Phone><SatchelScreen overlay={<GiveSheet typed={0.6} caret={1} lookup="checking" spin={spin} />} /></Phone></Cell>,
        ],
        [
          <Cell key="v2" name="GiveSheet" state='lookup="found"'><Phone><SatchelScreen overlay={<GiveSheet />} /></Phone></Cell>,
          <Cell key="v3" name="GiveSheet" state="press={1}"><Phone><SatchelScreen overlay={<GiveSheet press={1} />} /></Phone></Cell>,
          <Cell key="v4" name="GiveSheet" state='cta="wallet"'><Phone><SatchelScreen overlay={<GiveSheet cta="wallet" spin={spin} />} /></Phone></Cell>,
          <Cell key="l1" name="+ ListSheet" state='state="ready"'><Phone><SatchelScreen overlay={<ListSheet />} /></Phone></Cell>,
          <Cell key="l2" name="ListSheet" state='state="listing"'><Phone><SatchelScreen overlay={<ListSheet state="listing" spin={spin} />} /></Phone></Cell>,
          <Cell key="l3" name="ListSheet" state='state="listed"'><Phone><SatchelScreen listed overlay={<ListSheet state="listed" />} /></Phone></Cell>,
          <Cell key="l4" name="SatchelScreen" state="listed"><Phone><SatchelScreen listed /></Phone></Cell>,
        ],
      ]}
    />
  );
}

/* ───────────── pages 3–4: the sale page ───────────── */

function BrowserGrid({ cells }: { cells: ReactNode[] }) {
  return (
    <div style={{ padding: "4px 56px 0", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 14, columnGap: 40, justifyItems: "center" }}>
      {cells}
    </div>
  );
}

function PageThree({ spin, f }: Live & { f: number }) {
  const t = f / 59;
  const partial = HISTORY_7.map((r, i) => ({ ...r, status: i === 1 ? ("settled" as const) : i === 0 ? ("checking" as const) : ("pending" as const), pop: i === 1 ? Math.min(1, t * 2) : undefined }));
  return (
    <BrowserGrid
      cells={[
        <Cell key="a" name="SalePage" state='verdict="checking" scan={…}'><Browser title="Satchel #7 · Satchel"><SalePage verdict="checking" scan={t} spin={spin} /></Browser></Cell>,
        <Cell key="b" name="SalePage" state="records: ETH settled (pop), BTC checking, SOL pending"><Browser title="Satchel #7 · Satchel"><SalePage verdict="checking" records={partial} spin={spin} /></Browser></Cell>,
        <Cell key="c" name="SalePage" state='verdict="clean" verdictPop={…} buy="enabled"'><Browser title="Satchel #7 · Satchel"><SalePage verdict="clean" verdictPop={Math.min(1, t * 1.6)} /></Browser></Cell>,
        <Cell key="d" name="SalePage" state='buy="pressed"'><Browser title="Satchel #7 · Satchel"><SalePage verdict="clean" buy="pressed" /></Browser></Cell>,
      ]}
    />
  );
}

function PageFour({ spin }: Live) {
  return (
    <BrowserGrid
      cells={[
        <Cell key="a" name="SalePage" state='buy="recheck"'><Browser title="Satchel #7 · Satchel"><SalePage verdict="clean" buy="recheck" spin={spin} /></Browser></Cell>,
        <Cell key="b" name="SalePage" state='buy="wallet"'><Browser title="Satchel #7 · Satchel"><SalePage verdict="clean" buy="wallet" spin={spin} /></Browser></Cell>,
        <Cell key="c" name="SalePage" state='buy="done"'><Browser title="Satchel #7 · Satchel"><SalePage verdict="clean" buy="done" /></Browser></Cell>,
        <Cell key="d" name="SalePage" state='satchel="4" (blocked)'><Browser title="Satchel #4 · Satchel"><SalePage satchel="4" /></Browser></Cell>,
      ]}
    />
  );
}

/* ───────────── page 5: building blocks ───────────── */

function Block({ title, children, width }: { title: string; children: ReactNode; width?: number }) {
  return (
    <div style={{ background: C.ground, borderRadius: 22, padding: "16px 20px 20px", width, boxSizing: "border-box" }}>
      <div style={{ ...sans(700), fontSize: 14, color: C.inkMuted, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function PageFive({ pulse, spin, f }: Live & { f: number }) {
  // a press loop: down over 4 frames, hold 6, up over 6
  const cyc = f % 30;
  const press = cyc < 4 ? cyc / 4 : cyc < 10 ? 1 : cyc < 16 ? 1 - (cyc - 10) / 6 : 0;
  return (
    <div style={{ padding: "4px 56px 0", display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: 22, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title="UiButton · primary presses 4px into its shadow (press loop) · busy · disabled 40 % · secondary · neutral (outside wallet)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <UiButton label="Mint a Satchel" press={press} />
            <UiButton label="Approve in your wallet…" busy spin={spin} />
            <UiButton label="Buy for 2,000 NEAR" disabled />
            <UiButton label="Give" kind="secondary" />
            <UiButton label="Approve" kind="neutral" press={press} />
            <UiButton label="Reject" kind="neutralSecondary" />
          </div>
        </Block>
        <Block title="StatusPill · NewBadge (icon + word, never colour alone)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <StatusPill tone="success" icon={Check} word="Sent" />
            <StatusPill tone="frozen" icon={Snowflake} word="Paused for sale" />
            <StatusPill tone="danger" icon={TriangleAlert} word="Needs attention" />
            <NewBadge />
            <StatusPill tone="success" icon={CircleCheck} word="Coin spent" />
            <StatusPill tone="success" icon={CircleCheck} word="Nonce used" />
            <StatusPill tone="success" icon={CircleCheck} word="Blockhash expired" />
            <StatusPill tone="danger" icon={TriangleAlert} word="Unused" />
            <StatusPill tone="muted" icon="spinner" spin={spin} word="Checking…" />
          </div>
        </Block>
        <Block title="Toast · SentToast (show 0..1 pops in)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <SentToast chain="btc" />
            <SentToast chain="evm" />
            <SentToast chain="sol" />
            <Toast title="Listed for 2,000 NEAR" sub="Signing paused" tone="frozen" icon={Snowflake} />
          </div>
        </Block>
        <Block title="PausedBanner · Steps (pulse)">
          <PausedBanner />
          <Steps
            style={{ marginTop: 14 }}
            pulse={pulse}
            steps={[
              ["Approve in your wallet", "done"],
              ["Giving on NEAR", "active"],
              ["Given", "future"],
            ]}
          />
        </Block>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title="CoinFace (the charms' faces, never chain logos) · Avatar">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <CoinFace chain="btc" size={52} />
            <CoinFace chain="evm" size={52} face={{ smile: 1.6 }} />
            <CoinFace chain="sol" size={52} face={{ blink: 1, smile: 1.4 }} />
            <CoinFace chain="evm" size={52} face={{ smile: -0.6, wide: 0.6 }} />
            <span style={{ width: 10 }} />
            <Avatar account="alice.near" size={40} />
            <Avatar account="bob.near" size={40} />
            <Avatar account="carol.near" size={40} />
          </div>
        </Block>
        <Block title="AddressText (Geist Mono; grouped ends = the truncation; reveal types it in)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AddressText value={ADDR7.btc} size={15} />
            <AddressText value={ADDR7.evm} size={15} />
            <AddressText value={ADDR7.sol} size={15} />
            <div style={{ display: "flex", gap: 16 }}>
              <AddressText value={truncate(ADDR7.btc, "btc")} mode="truncated" size={15} />
              <AddressText value={truncate(ADDR7.evm, "evm")} mode="truncated" size={15} />
              <AddressText value={truncate(ADDR7.sol, "sol")} mode="truncated" size={15} />
            </div>
            <AddressText value={ADDR7.btc} size={15} reveal={(f % 60) / 45} />
          </div>
        </Block>
        <Block title="SigningTracker (stage, elapsedSec, pulse)">
          <SigningTracker stage="signing" elapsedSec={3 + Math.floor(f / 10)} pulse={pulse} />
        </Block>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title="QrCode (checksum-invalid demo addresses; reveal sweeps in)">
          <div style={{ display: "flex", gap: 18 }}>
            <QrCode chain="btc" size={150} reveal={Math.min(1, f / 40)} />
            <QrCode chain="evm" size={150} />
          </div>
        </Block>
        <Block title="SigningTracker (sent: the receipt)">
          <SigningTracker stage="sent" />
        </Block>
      </div>
    </div>
  );
}

/* ───────────── page 6: SCRIPT-v4 value card and feature stickers ───────────── */

function PageSix({ f }: { f: number }) {
  const t = Math.min(1, f / 45);
  // P2: the fill counts up to ≈ $9,025.00; C1: the drain rolls ETH to 0% (order "given" keeps the legend still)
  const fill = coinsOf(AMOUNTS.fill).map((c) => ({ ...c, amount: c.amount * t }));
  const drained = COINS_7.map((c) => (c.coin === "ETH" ? { ...c, amount: 0.8 * (1 - t) } : c));
  const label = (s: string) => <div style={{ ...mono(450), fontSize: 12, color: C.inkMuted, marginTop: 10 }}>{s}</div>;
  return (
    <div style={{ padding: "6px 56px 0", display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
        <div>
          <SatchelCard width={400} yours pill="active" />
          {label("default (#7) yours pill=active · ≈ $8,000.00")}
        </div>
        <div>
          <SatchelCard width={400} yours coins={fill} pill="active" />
          {label("coins={fill × t} (P2 count-up → ≈ $9,025.00)")}
        </div>
        <div style={{ background: "#120c26", padding: 16, borderRadius: 22, marginTop: -16 }}>
          <SatchelCard width={400} night order="given" coins={drained} pill="paused" />
          <div style={{ ...mono(450), fontSize: 12, color: "#b7b0d1", marginTop: 10 }}>night order=&quot;given&quot; (C1 drain → ≈ $6,000.00)</div>
        </div>
        <div>
          <SatchelCard width={400} id="4" coins={coinsOf(SATCHEL4.balances)} pill="paused" />
          {label("#4 · ≈ $2,880.00 · pill=paused")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
        <div>
          <SatchelCard width={300} yours chips={[]} pill="active" />
          {label("empty → Nothing inside yet")}
        </div>
        <div>
          <SatchelCard width={300} preview />
          {label("preview (mint)")}
        </div>
        <div>
          <SatchelCard width={300} id="30" coins={[{ coin: "BTC", amount: 1.2 }, { coin: "ETH", amount: 18 }, { coin: "SOL", amount: 300 }]} />
          {label("#30 OTC · ≈ $171,000.00")}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 20 }}>
          <CoinIcon coin="BTC" size={44} />
          <CoinIcon coin="ETH" size={44} />
          <CoinIcon coin="SOL" size={44} />
          <CoinIcon coin="USDC" size={44} network="base" />
          <CoinIcon coin="USDC" size={44} network="arbitrum" />
          <CoinIcon coin="ETH" size={44} sad />
        </div>
      </div>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        <div>
          <AllowanceCard width={300} left={0.25 - 0.05 * t} account="sam.near" />
          {label("AllowanceCard left 0.25 → 0.20")}
        </div>
        <div>
          <OfferCard width={300} tilt={2} typed={Math.min(1, f / 20)} accepted={f >= 30} acceptPop={Math.min(1, (f - 30) / 10)} />
          {label("OfferCard typed · accepted + acceptPop")}
        </div>
        <div>
          <ClaimLinkCard width={300} tilt={-2} press={f >= 10 && f < 16 ? 1 : 0} copied={f >= 16} claimed={f >= 34} claimedPop={Math.min(1, (f - 34) / 10)} />
          {label("ClaimLinkCard press · copied · claimed")}
        </div>
        <div>
          <NetworksCard width={300} highlight="base" reveal={t} />
          {label("NetworksCard highlight=base reveal")}
        </div>
      </div>
    </div>
  );
}
