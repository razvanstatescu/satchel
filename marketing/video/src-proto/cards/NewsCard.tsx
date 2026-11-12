import React from "react";
import { AbsoluteFill } from "remotion";
import { BadgeCheck, ChartNoAxesColumn, Heart, MessageCircle, Repeat2, Share, ShieldAlert, TriangleAlert } from "lucide-react";
import type { CardData } from "./data";

/**
 * FICTIONAL third-party UI cards (post, headline, blog, wallet alert, SMS) that stand in for the real screenshots.
 * They use system fonts on purpose: the barrage is "the internet", not the brand. Card design size 1100 × 620.
 */
export const CARD_W = 1100;
export const CARD_H = 620;

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = 'Menlo, "Courier New", monospace';
const RED = "#d7263d";

const Frame: React.FC<{ bg: string; children: React.ReactNode; radius?: number; border?: string }> = ({ bg, children, radius = 18, border }) => (
  <div
    style={{
      width: CARD_W,
      height: CARD_H,
      background: bg,
      borderRadius: radius,
      overflow: "hidden",
      boxSizing: "border-box",
      border,
      position: "relative",
    }}
  >
    {children}
  </div>
);

const Headline: React.FC<{ d: CardData }> = ({ d }) => (
  <Frame bg="#ffffff">
    <div style={{ padding: "34px 56px 0", fontFamily: SERIF }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #111", paddingBottom: 14 }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, color: "#111" }}>{d.outlet}</div>
        <div style={{ fontFamily: SANS, fontSize: 18, color: "#666" }}>Subscribe</div>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, letterSpacing: 3, color: RED, marginTop: 30 }}>{d.tag}</div>
      <div style={{ fontSize: 66, lineHeight: 1.08, fontWeight: 700, color: "#111", marginTop: 14, letterSpacing: -0.5 }}>{d.title}</div>
      {d.body ? <div style={{ fontSize: 28, lineHeight: 1.35, color: "#444", marginTop: 22 }}>{d.body}</div> : null}
      <div style={{ fontFamily: SANS, fontSize: 19, color: "#777", marginTop: 22 }}>{d.meta}</div>
    </div>
  </Frame>
);

const Post: React.FC<{ d: CardData; dark?: boolean }> = ({ d, dark }) => {
  const fg = dark ? "#e7e9ea" : "#0f1419";
  const muted = dark ? "#71767b" : "#536471";
  const iconProps = { size: 30, strokeWidth: 1.8, color: muted };
  return (
    <Frame bg={dark ? "#000000" : "#ffffff"} border={dark ? "1px solid #2f3336" : "1px solid #e6e8ea"}>
      <div style={{ padding: "40px 52px", fontFamily: SANS, color: fg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              background: dark ? "linear-gradient(135deg,#3a3f47,#15181c)" : "linear-gradient(135deg,#c9d3dc,#8a97a3)",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 32, fontWeight: 700 }}>
              {d.outlet} <BadgeCheck size={28} color={muted} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 26, color: muted, marginTop: 4 }}>{d.handle}</div>
          </div>
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.28, marginTop: 26, letterSpacing: -0.2 }}>{d.title}</div>
        {d.stat ? (
          <div style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700, color: RED, marginTop: 18 }}>{d.stat}</div>
        ) : null}
        <div style={{ position: "absolute", left: 52, right: 52, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <MessageCircle {...iconProps} />
          <Repeat2 {...iconProps} />
          <Heart {...iconProps} />
          <ChartNoAxesColumn {...iconProps} />
          <Share {...iconProps} />
        </div>
        <div style={{ position: "absolute", left: 52, bottom: 84, fontSize: 22, color: muted }}>{d.meta}</div>
      </div>
    </Frame>
  );
};

const Blog: React.FC<{ d: CardData }> = ({ d }) => (
  <Frame bg="#fbfaf7">
    <div style={{ padding: "44px 60px", fontFamily: SERIF, color: "#1a1a1a" }}>
      <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, letterSpacing: 2.5, color: "#1a7f5a" }}>{d.tag}</div>
      <div style={{ fontSize: 58, lineHeight: 1.12, fontWeight: 700, marginTop: 16 }}>{d.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24, fontFamily: SANS, fontSize: 22, color: "#666" }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: "#d9d4c7" }} />
        {d.outlet} · {d.meta}
      </div>
      {d.body ? (
        <div
          style={{
            marginTop: 30,
            background: "#16181d",
            color: "#f2c94c",
            fontFamily: MONO,
            fontSize: 27,
            padding: "22px 28px",
            borderRadius: 10,
          }}
        >
          {d.body}
        </div>
      ) : null}
    </div>
  </Frame>
);

const Alert: React.FC<{ d: CardData }> = ({ d }) => (
  <Frame bg="#f1f2f6" radius={28}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ width: 900, background: "#fff", borderRadius: 28, padding: "40px 48px", boxShadow: "0 18px 50px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {d.outlet.startsWith("Transaction") ? <TriangleAlert size={56} color={RED} /> : <ShieldAlert size={56} color={RED} />}
          <div style={{ fontSize: 30, fontWeight: 700, color: "#333" }}>{d.outlet}</div>
        </div>
        <div style={{ fontSize: 46, lineHeight: 1.15, fontWeight: 800, color: "#111", marginTop: 22 }}>{d.title}</div>
        <div style={{ fontSize: 26, lineHeight: 1.35, color: "#555", marginTop: 16 }}>{d.body}</div>
        <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "18px 0", borderRadius: 16, border: "2px solid #ccc", fontSize: 26, fontWeight: 700 }}>
            {d.meta?.split(" · ")[0]}
          </div>
          {d.meta?.includes(" · ") ? (
            <div style={{ flex: 1, textAlign: "center", padding: "18px 0", borderRadius: 16, background: RED, color: "#fff", fontSize: 26, fontWeight: 700 }}>
              {d.meta.split(" · ")[1]}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  </Frame>
);

const Sms: React.FC<{ d: CardData }> = ({ d }) => (
  <Frame bg="#ffffff">
    <div style={{ padding: "40px 56px", fontFamily: SANS }}>
      <div style={{ textAlign: "center", fontSize: 24, color: "#8e8e93" }}>{d.outlet}</div>
      <div style={{ textAlign: "center", fontSize: 20, color: "#8e8e93", marginTop: 6 }}>{d.meta}</div>
      <div
        style={{
          marginTop: 34,
          maxWidth: 820,
          background: "#e9e9eb",
          color: "#111",
          fontSize: 40,
          lineHeight: 1.3,
          padding: "26px 32px",
          borderRadius: 34,
        }}
      >
        {d.title}
      </div>
    </div>
  </Frame>
);

export const NewsCard: React.FC<{ d: CardData; variant?: number }> = ({ d, variant = 0 }) => {
  switch (d.kind) {
    case "headline":
      return <Headline d={d} />;
    case "post":
      return <Post d={d} dark={variant % 2 === 1} />;
    case "blog":
      return <Blog d={d} />;
    case "alert":
      return <Alert d={d} />;
    case "sms":
      return <Sms d={d} />;
  }
};
