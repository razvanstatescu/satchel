import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Check, CircleCheck, Lock, Snowflake, TriangleAlert } from "lucide-react";
import { C, display, mono, sans } from "../../brand/tokens";
import { ADDR7, AMOUNTS, HISTORY_7, truncate } from "./data";
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

export const UI_GALLERY = { width: 1920, height: 1080, fps: 30, framesPerPage: 60, pages: 5, durationInFrames: 300 } as const;

const PHONE_S = 0.53;
const BROWSER_S = 0.55;

export function UiGallery() {
  const frame = useCurrentFrame();
  const page = Math.min(UI_GALLERY.pages - 1, Math.floor(frame / UI_GALLERY.framesPerPage));
  const f = frame % UI_GALLERY.framesPerPage;
  const live = { pulse: (f % 30) / 30, spin: (f % 24) / 24 };
  const titles = ["Mint · Fund · Send", "Sent · Satchel page · Give · List", "Sale page (carol.near): the check", "Sale page: buy, hand-off, blocked", "Building blocks"];
  return (
    <AbsoluteFill style={{ background: "#e9e6f3", color: C.ink, ...sans(400) }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 56px" }}>
        <span style={{ ...display(800), fontSize: 30, letterSpacing: "-0.02em" }}>Satchel 2.0 UI kit</span>
        <span style={{ ...sans(600), fontSize: 18, color: C.inkMuted }}>{titles[page]}</span>
        <span style={{ marginLeft: "auto", ...mono(500), fontSize: 14, color: C.inkMuted }}>
          page {page + 1}/{UI_GALLERY.pages} · src2/components/ui
        </span>
      </div>
      {page === 0 ? <PageOne {...live} /> : page === 1 ? <PageTwo {...live} /> : page === 2 ? <PageThree {...live} f={f} /> : page === 3 ? <PageFour {...live} /> : <PageFive {...live} f={f} />}
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
            <UiButton label="Buy for 4,750.00 USDC" disabled />
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
            <Toast title="Listed for 4,750.00 USDC" sub="Signing paused" tone="frozen" icon={Snowflake} />
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
