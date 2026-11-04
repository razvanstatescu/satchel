// Satchel 2.0 UI kit for the film: animatable app screens and components, authored at true UI px (390 × 844 phone,
// 1280 × 800 browser), frame-agnostic (each screen fills its parent), every state driven by props. Each file documents
// its props at the top. Scale a whole screen with <Scaled w h scale> or your own transform.

// screens
export { MintScreen, type MintScreenProps, type MintState } from "./MintScreen";
export { ReceiveScreen, type IncomingState, type ReceiveScreenProps } from "./ReceiveScreen";
export { SendScreen, type SendScreenProps, WalletApproveSheet } from "./SendScreen";
export { SentToast, type SignStage, SigningScreen, SigningTracker } from "./SigningTracker";
export { SatchelScreen, type SatchelScreenProps } from "./SatchelScreen";
export { GiveSheet, type GiveSheetProps } from "./GiveSheet";
export { ListSheet, type ListSheetProps, type ListState } from "./ListSheet";
export { BuyBlock, type BuyState, HistoryPanel, SalePage, type SalePageProps, SideNav, type Verdict } from "./SalePage";

// building blocks
export {
  AccountChip,
  AddressText,
  AmountChip,
  AppBar,
  Avatar,
  Banner,
  BROWSER,
  type ButtonKind,
  CoinFace,
  Dot,
  Field,
  FlowHeader,
  Group,
  NewBadge,
  NUM,
  PausedBanner,
  PHONE,
  type PhoneChrome,
  PhoneScreen,
  popScale,
  PulseDot,
  Row,
  Scaled,
  SectionLabel,
  Segmented,
  Sheet,
  Spinner,
  StatusBar,
  StatusPill,
  type StepState,
  Steps,
  STROKE,
  Toast,
  TONE,
  type Tone,
  TY,
  UiButton,
} from "./kit";
export { QrCode } from "./Qr";
export * from "./data";

// SCRIPT-v4 app-art stickers (landing bento style)
export { AllowanceCard, ClaimLinkCard, type L2, NetworksCard, OfferCard } from "./feature-cards";

// the value card's maths (the card itself is SatchelCard in ../Sticker)
export { type CardCoin, cardOverview, type Coin, COIN_FILL, COIN_PRICE, CoinIcon, COINS_7, type Network, usd, usdText, ValueBar, ValueLegend } from "../Sticker";

// QA gallery (composition id "UiGallery")
export { UI_GALLERY, UiGallery } from "./UiGallery";
