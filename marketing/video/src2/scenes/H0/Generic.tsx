import React from "react";
import { Img, random, staticFile } from "remotion";

/**
 * The built cards: generic, UNBRANDED "old world" UI drawn in code (crisp text at any zoom). Dark, so they sit in the
 * black barrage without flashing. System fonts and neutral greys on purpose: nothing here may look like Satchel (no
 * coral, no ink outlines, no brand fonts) or like any real wallet, and nothing is presented as a real event (no names,
 * no outlets, no amounts in $). Warnings use a generic amber, never a red that could read as the brand's coral.
 * All are designed at 1280 × 720.
 */
export const CARD_W = 1280;
export const CARD_H = 720;
const SANS = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = 'Menlo, "SF Mono", "Courier New", monospace';
const BG = "#121418";
const RAISED = "#1c1f25";
const LINE = "#2c3038";
const TEXT = "#f2f3f5";
const MUTED = "#8d939e";
const AMBER = "#f5a524";

/**
 * G1, the seed-phrase photo (generated: a hand photographing a handwritten 12-word list; invalid BIP39 checksum, see
 * public/v2/intro/g1/G1-words-checksum-proof.json). Always the blurred version: 9 of the 12 words are unreadable.
 */
export const G1_SRC = "v2/intro/g1/G1-blurred.png";
export const G1_W = 2560;
export const G1_H = 1440;
/** The phone's screen in G1 px (the photo being taken), the focus of the punch-in and the dive. */
export const G1_SCREEN = { x: 1405, y: 300, w: 640, h: 790 };

export const G1Photo: React.FC<{ width: number; grade?: number }> = ({ width, grade = 1 }) => (
  <Img src={staticFile(G1_SRC)} style={{ width, height: (G1_H * width) / G1_W, display: "block", filter: grade !== 1 ? `brightness(${grade})` : undefined }} />
);

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: CARD_W,
      height: CARD_H,
      background: BG,
      position: "relative",
      overflow: "hidden",
      fontFamily: SANS,
      color: TEXT,
      borderRadius: 28,
      border: `2px solid ${LINE}`,
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

const Button: React.FC<{ label: string; primary?: boolean; pressed?: boolean }> = ({ label, primary, pressed }) => (
  <div
    style={{
      flex: 1,
      height: 88,
      borderRadius: 44,
      border: primary ? "none" : `3px solid ${LINE}`,
      background: primary ? (pressed ? "#c9ccd2" : "#eceef1") : "transparent",
      color: primary ? "#111316" : TEXT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 34,
      fontWeight: 700,
      translate: `0 ${pressed ? 4 : 0}px`,
      scale: pressed ? "0.98" : "1",
    }}
  >
    {label}
  </div>
);

/** A deterministic hex blob (unreadable on purpose: this is what blind signing looks like). */
const hexLines = (seed: string, lines: number, chars: number) =>
  Array.from({ length: lines }, (_, l) =>
    Array.from({ length: chars }, (_, c) => "0123456789abcdef"[Math.floor(random(`${seed}-${l}-${c}`) * 16)]).join(""),
  );

/** G2: a generic signature request with a hex payload; "Sign" goes down when `pressed`. */
export const G2SignRequest: React.FC<{ pressed?: boolean }> = ({ pressed = false }) => (
  <Frame>
    <div style={{ position: "absolute", left: 72, top: 52, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: RAISED, border: `2px solid ${LINE}` }} />
      <div style={{ fontSize: 30, color: MUTED }}>Website request</div>
    </div>
    <div style={{ position: "absolute", left: 72, top: 122, fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>Signature request</div>
    <div style={{ position: "absolute", left: 72, top: 214, fontSize: 28, color: MUTED }}>You are signing:</div>
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 258,
        width: CARD_W - 144,
        height: 238,
        background: RAISED,
        borderRadius: 14,
        padding: "22px 26px",
        boxSizing: "border-box",
        fontFamily: MONO,
        fontSize: 27,
        lineHeight: "38px",
        color: "#b9bfc9",
        overflow: "hidden",
        wordBreak: "break-all",
      }}
    >
      {hexLines("g2", 5, 64).map((l, i) => (
        <div key={i}>{i === 0 ? `0x${l.slice(2)}` : l}</div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 72, top: 520, fontSize: 30, color: MUTED }}>
      Network fee: <span style={{ color: TEXT, fontWeight: 700 }}>none</span>
    </div>
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 48, display: "flex", gap: 28 }}>
      <Button label="Reject" />
      <Button label="Sign" primary pressed={pressed} />
    </div>
  </Frame>
);

/** G4: a generic, unbranded unlimited approval (a permit). */
export const G4Permit: React.FC = () => (
  <Frame>
    <div style={{ position: "absolute", left: 72, top: 56, fontSize: 30, color: MUTED }}>Signature request · Permit</div>
    <div style={{ position: "absolute", left: 72, top: 112, fontSize: 70, fontWeight: 800, letterSpacing: -1 }}>Allow spending of your tokens</div>
    {[
      ["Spender", "0x3c9f…41aa"],
      ["Amount", "Unlimited"],
      ["Expires", "never"],
    ].map(([k, v], i) => (
      <div
        key={k}
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 250 + i * 96,
          height: 80,
          borderBottom: `2px solid ${LINE}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 40,
        }}
      >
        <span style={{ color: MUTED }}>{k}</span>
        <span style={{ fontWeight: 800, fontFamily: i === 0 ? MONO : SANS, color: i === 1 ? AMBER : TEXT }}>{v}</span>
      </div>
    ))}
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 48, display: "flex", gap: 28 }}>
      <Button label="Cancel" />
      <Button label="Sign" primary />
    </div>
  </Frame>
);

/** G5: a generic "verify your recovery phrase" prompt, the shape every seed-phrase phishing page takes. */
export const G5VerifyPhrase: React.FC = () => (
  <Frame>
    <div style={{ position: "absolute", left: 72, top: 60, display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={64} height={58} viewBox="0 0 64 58">
        <path d="M32 3 L61 54 H3 Z" fill="none" stroke={AMBER} strokeWidth={6} strokeLinejoin="round" />
        <rect x={29} y={20} width={6} height={18} rx={3} fill={AMBER} />
        <circle cx={32} cy={45} r={3.6} fill={AMBER} />
      </svg>
      <div style={{ fontSize: 30, color: AMBER, fontWeight: 700 }}>Action required</div>
    </div>
    <div style={{ position: "absolute", left: 72, top: 140, fontSize: 68, fontWeight: 800, letterSpacing: -1 }}>Verify your recovery phrase</div>
    <div style={{ position: "absolute", left: 72, top: 232, width: CARD_W - 144, fontSize: 32, lineHeight: "44px", color: MUTED }}>
      Enter your 12-word recovery phrase to keep access to your wallet.
    </div>
    <div style={{ position: "absolute", left: 72, top: 330, width: CARD_W - 144, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          style={{
            height: 62,
            borderRadius: 12,
            background: RAISED,
            border: `2px solid ${LINE}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            fontSize: 26,
            color: MUTED,
            fontFamily: MONO,
          }}
        >
          {i + 1}.
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 48, display: "flex", gap: 28 }}>
      <Button label="Verify" primary />
    </div>
  </Frame>
);
