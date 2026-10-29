// Public exports of src2/illustration/props. Each component documents its props at the top of its file.
// Convention: authored at UI scale (outline 3, hard drop 4) × `scale` (default 2 → 6px outline, 8px drop). Every state is
// a prop (0..1 progress or a value): no internal timing. Rotate with `tilt` (keeps the drop straight down), not CSS.

export { SignedSlip, SLIP } from "./SignedSlip";
export { CoinSticker, COIN_FILL, type CoinKind } from "./CoinSticker";
export { PriceTag, priceTagSize, BinderClip } from "./PriceTag";
export { FrostLaminate } from "./FrostLaminate";
export { Stamp, StampMark, stampSize, type StampVariant, type StampShape } from "./Stamp";
export { ContractPlaque, PLAQUE, FOOTNOTE, plaqueWidth, plaqueSlot } from "./ContractPlaque";
export { GiftBox, GIFT } from "./GiftBox";
export { TradeDesk } from "./TradeDesk";
export { UsdcStack, usdcStackSize } from "./UsdcStack";
export { StickyNote, SEED_WORDS, NOTE } from "./StickyNote";
export { ExchangeSticker, WalletSticker, BADGE } from "./BadgeStickers";
export { PocketJeans, POCKET } from "./PocketJeans";
export { RequestSticker, REQUESTS, requestSize, type RequestKind } from "./RequestSticker";
export { SignSlot, SLOT, slotEntryY } from "./SignSlot";
export { RecordOutline, RecordFill, STAMP_TEXT, recordPerimeter } from "./RecordOutline";
export { ScanBeam } from "./ScanBeam";
export { Badge, Sparkles, Star4 } from "./Badge";
export { ToastSticker, toastSize } from "./ToastSticker";
export { K as PROP_SCALE, OUT, DROP, DASH, PAL, Dropped, DropFilter, mix, useBrandFonts, textWidth } from "./kit";
