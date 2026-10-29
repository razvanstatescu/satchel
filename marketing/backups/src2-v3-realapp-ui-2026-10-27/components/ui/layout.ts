import type { UiBox } from "./app";

/**
 * Layout maps: where scene-targetable elements sit, in SCREEN px (phone 390 × 844 with the default status bar,
 * insetTop 54 / insetBottom 34; browser page 1280 × 800), measured from the rendered components (their data-ui boxes)
 * with default props. x, y = top-left; boxes scrolled off-screen are omitted. With a sheet open, only the sheet's
 * elements are listed (the page behind is dimmed). Scale with the screen (× k inside a frame, plus its origin).
 * Regenerate after layout changes: out/_ui-entry/Measure.tsx (UiMeasure, --log=verbose) + gen-layout.py.
 */

export const boxCenter = (b: UiBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** 390 × 844 */
export const MINT_LAYOUT = {
  button: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  card: { x: 45, y: 283, w: 300, h: 189 } as UiBox,
  title: { x: 20, y: 229, w: 308, h: 34 } as UiBox,
  close: { x: 338, y: 229, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 194, w: 390, h: 650 } as UiBox,
  footer: { x: 0, y: 746, w: 390, h: 98 } as UiBox,
  youGet: { x: 20, y: 520, w: 350, h: 150 } as UiBox,
} as const;

/** 390 × 844 */
export const MINT_DONE_LAYOUT = {
  addCoins: { x: 20, y: 694, w: 350, h: 54 } as UiBox,
  open: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  done: { x: 62, y: 604, w: 265, h: 34 } as UiBox,
  card: { x: 45, y: 393, w: 300, h: 189 } as UiBox,
  title: { x: 20, y: 235, w: 308, h: 34 } as UiBox,
  close: { x: 338, y: 235, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 200, w: 390, h: 644 } as UiBox,
  footer: { x: 0, y: 680, w: 390, h: 164 } as UiBox,
  charms: { x: 91, y: 289, w: 208, h: 96 } as UiBox,
} as const;

/** 390 × 844 */
export const RECEIVE_LAYOUT = {
  copy: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  title: { x: 20, y: 101, w: 308, h: 68 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 745, w: 390, h: 99 } as UiBox,
  address: { x: 37, y: 614, w: 316, h: 48 } as UiBox,
  qr: { x: 85, y: 348, w: 220, h: 220 } as UiBox,
  qrPanel: { x: 20, y: 245, w: 350, h: 438 } as UiBox,
  segmented: { x: 20, y: 185, w: 350, h: 44 } as UiBox,
} as const;

/** 390 × 844 */
export const RECEIVE_LAYOUT_SCROLLED = {
  copy: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  title: { x: 20, y: 101, w: 308, h: 68 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 745, w: 390, h: 99 } as UiBox,
  address: { x: 37, y: 435, w: 316, h: 48 } as UiBox,
  incoming: { x: 20, y: 670, w: 350, h: 70 } as UiBox,
  qr: { x: 85, y: 169, w: 220, h: 220 } as UiBox,
  qrPanel: { x: 20, y: 66, w: 350, h: 438 } as UiBox,
  segmented: { x: 20, y: 6, w: 350, h: 44 } as UiBox,
} as const;

/** 390 × 844 */
export const SEND_FORM_LAYOUT = {
  button: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 745, w: 390, h: 99 } as UiBox,
  amount: { x: 20, y: 235, w: 350, h: 118 } as UiBox,
  segmented: { x: 20, y: 175, w: 350, h: 44 } as UiBox,
  to: { x: 20, y: 399, w: 350, h: 102 } as UiBox,
} as const;

/** 390 × 844 */
export const SEND_LAYOUT = {
  button: { x: 20, y: 710, w: 350, h: 54 } as UiBox,
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 643, w: 390, h: 201 } as UiBox,
  hero: { x: 20, y: 175, w: 350, h: 64 } as UiBox,
  to: { x: 20, y: 255, w: 350, h: 202 } as UiBox,
} as const;

/** 390 × 844 */
export const WALLET_LAYOUT = {
  button: { x: 20, y: 730, w: 350, h: 54 } as UiBox,
  approve: { x: 200, y: 744, w: 170, h: 54 } as UiBox,
  reject: { x: 20, y: 744, w: 170, h: 54 } as UiBox,
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 663, w: 390, h: 181 } as UiBox,
  hero: { x: 20, y: 175, w: 350, h: 64 } as UiBox,
  request: { x: 20, y: 548, w: 350, h: 18 } as UiBox,
  to: { x: 20, y: 255, w: 350, h: 202 } as UiBox,
} as const;

/** 390 × 844 */
export const SIGNING_LAYOUT = {
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  banner: { x: 20, y: 243, w: 350, h: 44 } as UiBox,
  heading: { x: 20, y: 177, w: 350, h: 48 } as UiBox,
  stepper: { x: 20, y: 305, w: 350, h: 165 } as UiBox,
} as const;

/** 390 × 844 */
export const SIGNING_SENT_LAYOUT = {
  done: { x: 20, y: 694, w: 350, h: 54 } as UiBox,
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 680, w: 390, h: 164 } as UiBox,
  heading: { x: 20, y: 177, w: 350, h: 48 } as UiBox,
  stepper: { x: 20, y: 243, w: 350, h: 248 } as UiBox,
} as const;

/** 390 × 844 */
export const SATCHEL_LAYOUT = {
  addCoins: { x: 201, y: 481, w: 173, h: 54 } as UiBox,
  send: { x: 16, y: 481, w: 173, h: 54 } as UiBox,
  give: { x: 16, y: 547, w: 173, h: 54 } as UiBox,
  sell: { x: 201, y: 547, w: 173, h: 54 } as UiBox,
  card: { x: 16, y: 235, w: 358, h: 226 } as UiBox,
  inside: { x: 16, y: 671, w: 358, h: 496 } as UiBox,
} as const;

/** 390 × 844 */
export const SATCHEL_LISTED_LAYOUT = {
  addCoins: { x: 201, y: 692, w: 173, h: 54 } as UiBox,
  send: { x: 16, y: 692, w: 173, h: 54 } as UiBox,
  give: { x: 16, y: 758, w: 173, h: 54 } as UiBox,
  sell: { x: 201, y: 758, w: 173, h: 54 } as UiBox,
  card: { x: 16, y: 235, w: 358, h: 226 } as UiBox,
  forSale: { x: 16, y: 481, w: 358, h: 193 } as UiBox,
} as const;

/** 390 × 844 */
export const SATCHEL_SELL_LAYOUT = {
  listForSale: { x: 37, y: 403, w: 146, h: 54 } as UiBox,
  readyToList: { x: 37, y: 294, w: 316, h: 20 } as UiBox,
  sellPanel: { x: 16, y: 237, w: 358, h: 243 } as UiBox,
} as const;

/** 390 × 844 */
export const GIVE_RECIPIENT_LAYOUT = {
  button: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  card: { x: 45, y: 177, w: 300, h: 189 } as UiBox,
  title: { x: 20, y: 101, w: 308, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 745, w: 390, h: 99 } as UiBox,
  account: { x: 20, y: 480, w: 350, h: 68 } as UiBox,
  to: { x: 20, y: 414, w: 350, h: 56 } as UiBox,
} as const;

/** 390 × 844 */
export const GIVE_LAYOUT = {
  button: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  card: { x: 45, y: 187, w: 300, h: 189 } as UiBox,
  title: { x: 20, y: 101, w: 308, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 693, w: 390, h: 151 } as UiBox,
  tag: { x: 180, y: 373, w: 132, h: 56 } as UiBox,
} as const;

/** 390 × 844 */
export const LIST_LAYOUT = {
  button: { x: 20, y: 760, w: 350, h: 54 } as UiBox,
  title: { x: 70, y: 101, w: 258, h: 34 } as UiBox,
  close: { x: 338, y: 101, w: 36, h: 36 } as UiBox,
  sheet: { x: 0, y: 66, w: 390, h: 778 } as UiBox,
  footer: { x: 0, y: 745, w: 390, h: 99 } as UiBox,
  checks: { x: 20, y: 227, w: 350, h: 143 } as UiBox,
  price: { x: 20, y: 472, w: 350, h: 98 } as UiBox,
} as const;

/** 1280 × 800 */
export const SALE_LAYOUT = {
  buy: { x: 309, y: 461, w: 358, h: 54 } as UiBox,
  card: { x: 288, y: 40, w: 400, h: 252 } as UiBox,
  paused: { x: 728, y: 375, w: 520, h: 72 } as UiBox,
  price: { x: 288, y: 308, w: 400, h: 254 } as UiBox,
  verdict: { x: 728, y: 147, w: 520, h: 214 } as UiBox,
  youGet: { x: 728, y: 517, w: 520, h: 110 } as UiBox,
} as const;

/** 1280 × 800 */
export const SALE_LAYOUT_RECORD = {
  buy: { x: 309, y: 461, w: 358, h: 54 } as UiBox,
  card: { x: 288, y: 40, w: 400, h: 252 } as UiBox,
  price: { x: 288, y: 308, w: 400, h: 254 } as UiBox,
  records: [{ x: 728, y: 317, w: 520, h: 99 }, { x: 728, y: 426, w: 520, h: 99 }, { x: 728, y: 535, w: 520, h: 99 }] as UiBox[],
  youGet: { x: 728, y: -83, w: 520, h: 110 } as UiBox,
} as const;

/** 1280 × 800 */
export const SALE_DONE_LAYOUT = {
  open: { x: 488, y: 580, w: 560, h: 54 } as UiBox,
  done: { x: 488, y: 344, w: 560, h: 34 } as UiBox,
  card: { x: 748, y: 128, w: 300, h: 189 } as UiBox,
  stage: { x: 488, y: 36, w: 560, h: 300 } as UiBox,
} as const;
