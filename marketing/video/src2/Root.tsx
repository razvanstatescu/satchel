import { Composition, Folder } from "remotion";
import { loadBrandFonts } from "./brand/fonts";
import { TIMELINE } from "./lib/timeline";
import { FPS, H, W } from "./lib/time";
import { Body, BODY_FRAMES, Main, ScenePreview } from "./Main";
import H0 from "./scenes/H0";
import { H0_FRAMES } from "./scenes/H0/timing";
import { FoundationTest } from "./scenes/FoundationTest";
import { Gallery as CharactersGallery } from "./illustration/characters/Gallery";
import { Gallery as PropsGallery } from "./illustration/props/Gallery";
import { UiGallery } from "./components/ui";

loadBrandFonts();

export const RemotionRoot = () => {
  return (
    <>
      {/* the full film: H0 (the cold open) then the body; "Body" is the film without the cold open */}
      <Composition id="Main" component={Main} durationInFrames={H0_FRAMES + BODY_FRAMES} fps={FPS} width={W} height={H} />
      <Composition id="Body" component={Body} defaultProps={{ introTail: false }} durationInFrames={BODY_FRAMES} fps={FPS} width={W} height={H} />
      <Folder name="Scenes">
        <Composition id="H0" component={H0} durationInFrames={H0_FRAMES} fps={FPS} width={W} height={H} />
        {TIMELINE.scenes.map((sc) => (
          <Composition key={sc.id} id={sc.id} component={ScenePreview} defaultProps={{ id: sc.id }} durationInFrames={Math.max(1, Math.round((sc.end - sc.start) * FPS))} fps={FPS} width={W} height={H} />
        ))}
      </Folder>
      <Folder name="Dev">
        <Composition id="FoundationTest" component={FoundationTest} durationInFrames={FPS * 4} fps={FPS} width={W} height={H} />
        <Composition id="CharactersGallery" component={CharactersGallery} durationInFrames={FPS * 6} fps={FPS} width={W} height={H} />
        <Composition id="PropsGallery" component={PropsGallery} durationInFrames={FPS * 6} fps={FPS} width={W} height={H} />
        <Composition id="UiGallery" component={UiGallery} durationInFrames={360} fps={FPS} width={W} height={H} />
      </Folder>
    </>
  );
};
