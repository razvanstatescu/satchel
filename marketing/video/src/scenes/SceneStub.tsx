import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, display, F } from "../brand/tokens";
import { getScene } from "../lib/timeline";
import { FPS } from "../lib/time";

/** Placeholder scene: shows the scene id and each VO line as it is spoken. */
export function SceneStub({ id }: { id: string }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const sc = getScene(id);
  const current = [...sc.lines].reverse().find((l) => t >= l.start);
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center", padding: 160 }}>
      <div style={{ position: "absolute", top: 60, left: 80, fontFamily: F.mono, color: C.inkMuted, fontSize: 28 }}>
        {id} · {t.toFixed(1)}s / {sc.duration.toFixed(1)}s
      </div>
      <div style={{ ...display(700, 96), color: C.ink, fontSize: 84, lineHeight: 1.05, textAlign: "center" }}>{current?.text ?? ""}</div>
    </AbsoluteFill>
  );
}
