// Satchel 2.0 UI kit for the film, matched to the REAL app (apps/web, frozen): animatable app screens and components,
// authored at true UI px (390 × 844 phone, 1280 × 800 browser page), frame-agnostic (each screen fills its parent),
// every state driven by props. Each file documents its props at the top. Element boxes for tap-hands and effects:
// ./layout (MINT_LAYOUT, SEND_LAYOUT, SALE_LAYOUT, …). Scale a whole screen with <Scaled w h scale>.

// screens
export { MintScreen, type MintScreenProps, type MintState, MySatchelsPage } from "./MintScreen";
export { RECEIVE_INCOMING_SCROLL, ReceiveScreen, type IncomingState, type ReceiveScreenProps } from "./ReceiveScreen";
export { SendScreen, type SendScreenProps, WalletApproveSheet } from "./SendScreen";
export { SentToast, type SignStage, SigningScreen, SigningTracker, trackerRows } from "./SigningTracker";
export { SatchelScreen, type SatchelScreenProps } from "./SatchelScreen";
export { GiveSheet, type GiveSheetProps } from "./GiveSheet";
export { ListSheet, type ListSheetProps, type ListState } from "./ListSheet";
export { BuyBlock, type BuyState, HistoryPanel, SALE_FOCUS, SalePage, type SalePageProps, SideNav, type Verdict } from "./SalePage";

// the real app's pieces
export {
  AppCard,
  AppLink,
  AppPill,
  AppSegmented,
  type AppStatus,
  AppTabs,
  AppTopBar,
  BandBadge,
  ChainFace,
  FlowSheet,
  FootNote,
  holdingsSentence,
  InfoChip,
  Stepper,
  type StepperRow,
  type StepperState,
  Swatch,
  type UiBox,
} from "./app";

// layout maps (screen px)
export * from "./layout";

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

// QA gallery (composition id "UiGallery")
export { UI_GALLERY, UiGallery } from "./UiGallery";
