import { Composition, Folder } from "remotion";
import { loadBrandFonts } from "./brand/fonts";
import { TIMELINE } from "./lib/timeline";
import { FPS, H, W } from "./lib/time";
import { Main, ScenePreview } from "./Main";
import { FoundationTest } from "./scenes/FoundationTest";

loadBrandFonts();

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={Math.round(TIMELINE.durationSec * FPS)} fps={FPS} width={W} height={H} />
      <Folder name="Scenes">
        {TIMELINE.scenes.map((sc) => (
          <Composition
            key={sc.id}
            id={sc.id}
            component={ScenePreview}
            defaultProps={{ id: sc.id }}
            durationInFrames={Math.round((sc.end - sc.start) * FPS)}
            fps={FPS}
            width={W}
            height={H}
          />
        ))}
      </Folder>
      <Folder name="Dev">
        <Composition id="FoundationTest" component={FoundationTest} durationInFrames={FPS * 3} fps={FPS} width={W} height={H} />
      </Folder>
    </>
  );
};
