import { Composition, Folder } from "remotion";
import { loadBrandFonts } from "./brand/fonts";
import { TIMELINE } from "./lib/timeline";
import { FPS, H, W } from "./lib/time";
import { Main, ScenePreview } from "./Main";
import { FoundationTest } from "./scenes/FoundationTest";
import { Gallery as CharactersGallery } from "./illustration/characters/Gallery";
import { Gallery as PropsGallery } from "./illustration/props/Gallery";
import { UiGallery } from "./components/ui";

loadBrandFonts();

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={Math.round(TIMELINE.durationSec * FPS)} fps={FPS} width={W} height={H} />
      <Folder name="Scenes">
        {TIMELINE.scenes.map((sc) => (
          <Composition key={sc.id} id={sc.id} component={ScenePreview} defaultProps={{ id: sc.id }} durationInFrames={Math.max(1, Math.round((sc.end - sc.start) * FPS))} fps={FPS} width={W} height={H} />
        ))}
      </Folder>
      <Folder name="Dev">
        <Composition id="FoundationTest" component={FoundationTest} durationInFrames={FPS * 4} fps={FPS} width={W} height={H} />
        <Composition id="CharactersGallery" component={CharactersGallery} durationInFrames={FPS * 6} fps={FPS} width={W} height={H} />
        <Composition id="PropsGallery" component={PropsGallery} durationInFrames={FPS * 6} fps={FPS} width={W} height={H} />
        <Composition id="UiGallery" component={UiGallery} durationInFrames={420} fps={FPS} width={W} height={H} />
      </Folder>
    </>
  );
};
