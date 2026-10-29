import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Hourglass, Lock } from "lucide-react";
import { C, display, mono, sans } from "../../brand/tokens";
import { AppCard, AppPill, AppSegmented, ChainFace, InfoChip, Stepper, Swatch } from "./app";
import { ADDR7, AMOUNTS, CHAIN_NAME, CHAINS, HISTORY_7 } from "./data";
import { GiveSheet } from "./GiveSheet";
import { AddressText, Avatar, Scaled, UiButton } from "./kit";
import { ListSheet } from "./ListSheet";
import { MintScreen } from "./MintScreen";
import { QrCode } from "./Qr";
import { ReceiveScreen } from "./ReceiveScreen";
import { SalePage } from "./SalePage";
import { SatchelScreen } from "./SatchelScreen";
import { SendScreen, WalletApproveSheet } from "./SendScreen";
import { SentToast, SigningScreen } from "./SigningTracker";

/**
 * UiGallery: QA sheet for the Satchel 2.0 UI kit, matched to the real app. Seven pages of 2 s each (1920 × 1080,
 * 30 fps, 420 frames): 1 Mint · Add coins  2 Add coins · Send  3 Signing · the Satchel page  4 Give · Sell
 * 5–6 the sale page (T5–T7)  7 building blocks. Spinners, the scan beam and the pops run off the frame.
 * Frames here are simple stand-ins; the real PhoneFrame / BrowserFrame live in src2/illustration/characters.
 */

export const UI_GALLERY = { width: 1920, height: 1080, fps: 30, framesPerPage: 60, pages: 7, durationInFrames: 420 } as const;

const PHONE_S = 0.53;
const BROWSER_S = 0.55;

export function UiGallery() {
  const frame = useCurrentFrame();
  const page = Math.min(UI_GALLERY.pages - 1, Math.floor(frame / UI_GALLERY.framesPerPage));
  const f = frame % UI_GALLERY.framesPerPage;
  const live: Live = { spin: (f % 24) / 24, f };
  const titles = ["Mint · Add coins", "Add coins · Send", "Signing · the Satchel page", "Give · Sell", "Sale page (carol.near): the check", "Sale page: buy, hand-off, blocked, the record", "Building blocks"];
  const pages = [PageMint, PageSend, PageSatchel, PageGive, PageSaleA, PageSaleB, PageKit];
  const P = pages[page];
  return (
    <AbsoluteFill style={{ background: "#e9e6f3", color: C.ink, ...sans(400) }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 56px" }}>
        <span style={{ ...display(800), fontSize: 30, letterSpacing: "-0.02em" }}>Satchel 2.0 UI kit</span>
        <span style={{ ...sans(600), fontSize: 18, color: C.inkMuted }}>{titles[page]}</span>
        <span style={{ marginLeft: "auto", ...mono(500), fontSize: 14, color: C.inkMuted }}>
          page {page + 1}/{UI_GALLERY.pages} · src2/components/ui · matches apps/web
        </span>
      </div>
      <P {...live} />
    </AbsoluteFill>
  );
}

type Live = { spin: number; f: number };

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

const c = (key: string, name: string, state: string, el: ReactNode) => (
  <Cell key={key} name={name} state={state}>
    <Phone>{el}</Phone>
  </Cell>
);

/* ───────────── pages ───────────── */

function PageMint({ spin }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          c("m1", "MintScreen", 'state="idle"', <MintScreen />),
          c("m2", "MintScreen", 'state="pressed"', <MintScreen state="pressed" />),
          c("m3", "MintScreen", 'state="wallet"', <MintScreen state="wallet" spin={spin} />),
          c("m4", "MintScreen", 'state="minting"', <MintScreen state="minting" spin={spin} />),
          c("m5", "MintScreen", 'state="minted"', <MintScreen state="minted" />),
          c("m6", "MintScreen", "open={0.6}", <MintScreen open={0.6} />),
          c("r1", "ReceiveScreen", 'incoming="waiting"', <ReceiveScreen spin={spin} />),
        ],
        [
          c("r2", "ReceiveScreen", 'incoming="mempool"', <ReceiveScreen incoming="mempool" />),
          c("r3", "ReceiveScreen", 'incoming="received" copied', <ReceiveScreen incoming="received" copied />),
          c("r4", "ReceiveScreen", 'chain="evm"', <ReceiveScreen chain="evm" />),
          c("r5", "ReceiveScreen", 'chain="sol" press={1}', <ReceiveScreen chain="sol" press={1} />),
          c("p0", "SatchelScreen", "balances=fill", <SatchelScreen balances={AMOUNTS.fill} />),
          c("s1", "SendScreen", "step={1}", <SendScreen step={1} />),
          c("s2", "SendScreen", 'chain="evm" step={1}', <SendScreen chain="evm" step={1} />),
        ],
      ]}
    />
  );
}

function PageSend({ spin }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          c("s3", "SendScreen", "review (default)", <SendScreen />),
          c("s4", "SendScreen", "press={1}", <SendScreen press={1} />),
          c("s5", "SendScreen", 'cta="wallet"', <SendScreen cta="wallet" spin={spin} />),
          c("s6", "+ WalletApproveSheet", "open={1}", <SendScreen cta="wallet" spin={spin} overlay={<WalletApproveSheet />} />),
          c("s7", "WalletApproveSheet", "press={1} approved", <SendScreen cta="wallet" spin={spin} overlay={<WalletApproveSheet press={1} approved />} />),
          c("s8", "SendScreen", 'chain="sol"', <SendScreen chain="sol" />),
          c("g1", "SigningScreen", 'stage="signing" 0:03', <SigningScreen elapsedSec={3} spin={spin} />),
        ],
        [
          c("g2", "SigningScreen", "0:09", <SigningScreen elapsedSec={9} spin={spin} />),
          c("g3", "SigningScreen", 'stage="broadcasting"', <SigningScreen stage="broadcasting" spin={spin} />),
          c("g4", "SigningScreen", 'stage="sent" toast={1}', <SigningScreen stage="sent" toast={1} />),
          c("g5", "SigningScreen", 'stage="confirmed"', <SigningScreen stage="confirmed" />),
          c("g6", "SigningScreen", 'chain="evm" stage="sent"', <SigningScreen chain="evm" stage="sent" />),
          c("p1", "SatchelScreen", "after the sends", <SatchelScreen />),
          c("p2", "SatchelScreen", "pressSend={1}", <SatchelScreen pressSend={1} />),
        ],
      ]}
    />
  );
}

function PageSatchel({ spin }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          c("p3", "SatchelScreen", 'status="signing" activity', <SatchelScreen status="signing" activity="Sending 0.0100 BTC · 0:02" spin={spin} />),
          c("p4", "SatchelScreen", "listed", <SatchelScreen listed />),
          c("p5", "SatchelScreen", 'tab="sell"', <SatchelScreen tab="sell" />),
          c("p6", "SatchelScreen", 'tab="sell" pressList={1}', <SatchelScreen tab="sell" pressList={1} />),
          c("p7", "SatchelScreen", 'tab="sell" listed', <SatchelScreen tab="sell" listed />),
          c("p8", "SatchelScreen", "scroll={420}", <SatchelScreen scroll={420} />),
          c("p9", "SatchelScreen", "pressGive={1}", <SatchelScreen pressGive={1} />),
        ],
        [
          c("v0", "+ GiveSheet", 'step={1} lookup="checking"', <SatchelScreen overlay={<GiveSheet step={1} typed={0.6} caret={1} lookup="checking" spin={spin} />} />),
          c("v1", "GiveSheet", 'step={1} lookup="found"', <SatchelScreen overlay={<GiveSheet step={1} />} />),
          c("v2", "GiveSheet", "step={1} press={1}", <SatchelScreen overlay={<GiveSheet step={1} press={1} />} />),
          c("v3", "GiveSheet", "review (default)", <SatchelScreen overlay={<GiveSheet />} />),
          c("v4", "GiveSheet", "press={1}", <SatchelScreen overlay={<GiveSheet press={1} />} />),
          c("v5", "GiveSheet", 'cta="wallet"', <SatchelScreen overlay={<GiveSheet cta="wallet" spin={spin} />} />),
          c("v6", "GiveSheet", 'cta="giving"', <SatchelScreen overlay={<GiveSheet cta="giving" spin={spin} />} />),
        ],
      ]}
    />
  );
}

function PageGive({ spin, f }: Live) {
  return (
    <PhoneRows
      rows={[
        [
          c("l1", "+ ListSheet", 'state="ready"', <SatchelScreen tab="sell" overlay={<ListSheet />} />),
          c("l2", "ListSheet", "priceReveal caret", <SatchelScreen tab="sell" overlay={<ListSheet priceReveal={0.5} caret={1} />} />),
          c("l3", "ListSheet", 'state="pressed"', <SatchelScreen tab="sell" overlay={<ListSheet state="pressed" />} />),
          c("l4", "ListSheet", 'state="wallet"', <SatchelScreen tab="sell" overlay={<ListSheet state="wallet" spin={spin} />} />),
          c("l5", "ListSheet", 'state="listing"', <SatchelScreen tab="sell" overlay={<ListSheet state="listing" spin={spin} />} />),
          c("l6", "ListSheet", 'state="listed"', <SatchelScreen tab="sell" listed overlay={<ListSheet state="listed" pausedPop={Math.min(1, f / 30)} />} />),
          c("l7", "ListSheet", "open={0.5}", <SatchelScreen tab="sell" overlay={<ListSheet open={0.5} />} />),
        ],
        [
          c("x1", "MintScreen", "cardStyle hidden", <MintScreen state="minted" cardStyle={{ opacity: 0 }} />),
          c("x2", "ReceiveScreen", "qrReveal={…}", <ReceiveScreen qrReveal={Math.min(1, f / 45)} />),
          c("x3", "ReceiveScreen", "incomingPop={…}", <ReceiveScreen incoming="received" incomingPop={Math.min(1, f / 20)} />),
          c("x4", "SigningScreen", "toast={…}", <SigningScreen stage="sent" toast={Math.min(1, f / 15)} />),
          c("x5", "SendScreen", "open={…}", <SendScreen open={Math.min(1, f / 20)} />),
          c("x6", "GiveSheet + backdrop", "standalone", <GiveSheet backdrop={<SatchelScreen />} />),
          c("x7", "SatchelScreen", "no status bar", <SatchelScreen statusBar={false} insetTop={0} />),
        ],
      ]}
    />
  );
}

function BrowserGrid({ cells }: { cells: ReactNode[] }) {
  return (
    <div style={{ padding: "4px 56px 0", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 14, columnGap: 40, justifyItems: "center" }}>
      {cells}
    </div>
  );
}

const b = (key: string, state: string, el: ReactNode, title = "Satchel #7 · Satchel") => (
  <Cell key={key} name="SalePage" state={state}>
    <Browser title={title}>{el}</Browser>
  </Cell>
);

function PageSaleA({ spin, f }: Live) {
  const t = f / 59;
  const partial = HISTORY_7.map((r, i) => ({ ...r, status: i === 1 ? ("settled" as const) : ("checking" as const), pop: i === 1 ? Math.min(1, t * 2) : undefined }));
  return (
    <BrowserGrid
      cells={[
        b("a", 'verdict="checking"', <SalePage verdict="checking" spin={spin} />),
        b("b", 'focus="record" records: ETH settled (pop) scan={…}', <SalePage verdict="checking" records={partial} focus="record" scan={t} spin={spin} />),
        b("c", 'verdict="clean" verdictPop={…}', <SalePage verdictPop={Math.min(1, t * 1.6)} />),
        b("d", 'buy="pressed"', <SalePage buy="pressed" />),
      ]}
    />
  );
}

function PageSaleB({ spin }: Live) {
  return (
    <BrowserGrid
      cells={[
        b("a", 'buy="recheck"', <SalePage buy="recheck" spin={spin} />),
        b("b", 'buy="wallet" focus="verdict"', <SalePage buy="wallet" spin={spin} focus="verdict" />),
        b("c", 'buy="done"', <SalePage buy="done" />),
        b("d", 'satchel="4" (blocked)', <SalePage satchel="4" />, "Satchel #4 · Satchel"),
      ]}
    />
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: C.ground, borderRadius: 22, padding: "16px 20px 20px", boxSizing: "border-box" }}>
      <div style={{ ...sans(700), fontSize: 14, color: C.inkMuted, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function PageKit({ spin, f }: Live) {
  const cyc = f % 30;
  const press = cyc < 4 ? cyc / 4 : cyc < 10 ? 1 : cyc < 16 ? 1 - (cyc - 10) / 6 : 0;
  return (
    <div style={{ padding: "4px 56px 0", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 22, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title="AppCard (charm ledger): lg 358+, md; preview, Yours, state pills, lift/tilt">
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <AppCard width={300} preview />
            <AppCard width={300} balances={AMOUNTS.after} status="paused" badge={null} tilt={-2} lift={1} />
          </div>
        </Block>
        <Block title="UiButton: primary (press loop), busy, the app's disabled, secondary, tertiary, neutral (outside wallet)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <UiButton label="Mint a Satchel" press={press} />
            <UiButton label="Approve in your wallet…" busy spin={spin} />
            <UiButton label="Buy for 4,750.00 USDC" disabled />
            <UiButton label="Add coins" kind="secondary" />
            <UiButton label="Open Satchel #7" kind="tertiary" />
            <UiButton label="Approve" kind="neutral" press={press} />
          </div>
        </Block>
        <Block title="AppPill · Toast">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <AppPill status="active" />
            <AppPill status="paused" />
            <AppPill status="signing" spin={spin} />
            <AppPill status="bought" />
            <AppPill status="given" />
            <AppPill status="attention" />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
            <SentToast chain="btc" />
            <SentToast chain="evm" />
            <SentToast chain="sol" />
          </div>
        </Block>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title="AppSegmented · Swatch · ChainFace · Avatar">
          <AppSegmented items={CHAINS.map((k) => ({ key: k, label: CHAIN_NAME[k], lead: <ChainFace chain={k} size={20} /> }))} selected="btc" />
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14 }}>
            <Swatch />
            <ChainFace chain="btc" size={40} />
            <ChainFace chain="evm" size={40} />
            <ChainFace chain="sol" size={40} />
            <ChainFace chain="evm" size={40} sad />
            <Avatar account="alice.near" size={34} />
            <Avatar account="bob.near" size={34} />
            <Avatar account="carol.near" size={34} />
          </div>
        </Block>
        <Block title="Stepper (the tracker that becomes the receipt) · InfoChip">
          <Stepper
            spin={spin}
            rows={[
              { label: "Approved in your wallet", state: "done" },
              { label: "Signing with NEAR's signer network", state: "active", sub: "0:03" },
              { label: "Broadcast to Bitcoin", state: "future" },
              { label: "Waiting for 1 confirmation", state: "waiting" },
            ]}
          />
          <InfoChip icon={<Hourglass size={18} strokeWidth={2} />} style={{ marginTop: 14 }}>
            Signing: usually about 10 seconds
          </InfoChip>
        </Block>
        <Block title="AddressText (grouped ends = the truncation)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AddressText value={ADDR7.btc} size={15} />
            <AddressText value={ADDR7.evm} size={15} />
            <AddressText value={ADDR7.sol} size={15} />
          </div>
        </Block>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Block title='QrCode variant="app" (checksum-invalid demo addresses)'>
          <div style={{ display: "flex", gap: 18 }}>
            <QrCode chain="btc" size={150} variant="app" reveal={Math.min(1, f / 40)} />
            <QrCode chain="evm" size={150} variant="app" />
          </div>
        </Block>
        <Block title="Layout maps: ./layout (MINT_LAYOUT, SEND_LAYOUT, SALE_LAYOUT, …)">
          <div style={{ ...sans(400), fontSize: 14, lineHeight: "21px", color: C.ink }}>
            Every screen exports the boxes of its tap targets in screen px, measured from the rendered components.
          </div>
        </Block>
      </div>
    </div>
  );
}
