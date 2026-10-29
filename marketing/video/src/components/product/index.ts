/**
 * Product UI ports for the video (faithful to apps/web/src/components, restyled only by scale).
 * Every component is pure (props → pixels; no useCurrentFrame inside), sized as product px × k (default K = 2.25).
 *
 *   base.ts         K, STROKE, TYPE, txt(), TONE, mixColor(), truncateAddress()
 *   Pills.tsx       StatusPill, ItemPill (animatable from→status), ChainMark, ChainDot, Avatar, Chip
 *   Banner.tsx      Banner, FreezeBanner, FREEZE_COPY
 *   Clean.tsx       CleanHistoryPanel, CleanVerdict, CleanHistoryRow (status + resolve + write), GroupTitle,
 *                   GateLine, CheckLine, CLEAN_COPY, VERDICT
 *   Buy.tsx         BuyButton (lit / sheen / press), BuyBlock, Swatch
 *   Signing.tsx     SigningStep, SIGN_COPY
 *   BrowserFrame.tsx BrowserFrame (real screenshots with crop / zoom / 3D tilt)
 */
export * from "./base";
export * from "./Pills";
export * from "./Banner";
export * from "./Clean";
export * from "./Buy";
export * from "./Signing";
export * from "./BrowserFrame";
