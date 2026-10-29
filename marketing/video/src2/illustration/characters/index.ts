// Public exports of src2/illustration/characters. Each component documents its props at the top of its file.
// The charm rig itself lives in src2/brand/Charm.tsx and is re-exported here for convenience.

export {
  Charm,
  CharmBar,
  CharmShape,
  CHARM,
  CHARM_GREY,
  CHARM_PERSONALITY,
  charmBlink,
  charmFill,
  charmFollow,
  charmKick,
  charmSpring,
  charmSwing,
  charmTilt,
  pendulum,
} from "../../brand/Charm";
export type { CharmFace, CharmPersonality, CharmShapeProps } from "../../brand/Charm";

export { Hand, HandG, handPoint, HAND_FILL, HAND_POSES, HAND_SIZE, NameTag, SLEEVES } from "./Hand";
export type { HandAnchor, HandLayer, HandPose, HandProps, SleevePreset, SleeveStyle } from "./Hand";

export { CardBack, DashedOutline, RecordRow, RecordStamp } from "./CardBack";
export type { RecordProps, RecordState } from "./CardBack";

export { CardFlip, flipWidth } from "./CardFlip";

export { CardWithCharms, cardWithCharmsHeight } from "./CardWithCharms";
export type { CharmSlot } from "./CardWithCharms";

export { BROWSER_CHROME, BrowserFrame, PHONE_SCREEN, PhoneFrame } from "./Devices";
