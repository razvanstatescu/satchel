import { registerRoot } from "remotion";
import { ProtoRoot } from "./Root";

// Intro-barrage technique prototypes (scratch, not the film).
// Still:  npx remotion still src-proto/index.ts <comp> out/proto/x.png --frame=N --port=3530 --gl=angle
// Studio: npx remotion studio src-proto/index.ts --port=3530
registerRoot(ProtoRoot);
