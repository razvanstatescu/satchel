import React from "react";
import { Composition, Folder, Still } from "remotion";
import { CardStill, Wall } from "./cards/Wall";
import { CARD_H, CARD_W } from "./cards/NewsCard";
import { A_Wave, B_WarpBurst, C_Rgb, D_Slices, E_Screen, F_Tunnel, G_PunchWhip, type DemoProps } from "./demos/Effects";
import { Smoke } from "./demos/Smoke";
import { GlInfo } from "./demos/GlInfo";
import { Barrage, BARRAGE_FRAMES } from "./demos/Barrage";
import { Bench, BENCH_KINDS } from "./bench/Bench";

const FPS = 30;
const W = 1920;
const H = 1080;

type Route = NonNullable<DemoProps["route"]>;
const demo = (id: string, C: React.FC<DemoProps>, route: Route, extra: DemoProps = {}) => (
  <Composition key={id} id={id} component={C} durationInFrames={60} fps={FPS} width={W} height={H} defaultProps={{ route, ...extra }} />
);

export const ProtoRoot: React.FC = () => {
  return (
    <>
      <Folder name="Barrage">
        <Composition id="H-Barrage" component={Barrage} durationInFrames={BARRAGE_FRAMES} fps={FPS} width={W} height={H} />
      </Folder>
      <Folder name="Effects">
        {demo("A-Wave", A_Wave, "post")}
        {demo("A-Wave-Svg", A_Wave, "svg")}
        {demo("B-WarpBurst", B_WarpBurst, "post")}
        {demo("B-WarpBurst-Svg", B_WarpBurst, "svg")}
        {demo("C-Rgb", C_Rgb, "post")}
        {demo("C-Rgb-Svg", C_Rgb, "svg")}
        {demo("D-Slices", D_Slices, "post")}
        {demo("D-Slices-Css", D_Slices, "css")}
        {demo("E-Screen", E_Screen, "post")}
        {demo("E-Screen-Css", E_Screen, "css")}
        {demo("F-Tunnel", F_Tunnel, "post")}
        {demo("F-Tunnel-Dom", F_Tunnel, "none")}
        {demo("G-PunchWhip", G_PunchWhip, "post")}
        {demo("G-PunchWhip-Cmb", G_PunchWhip, "cmb")}
        {demo("G-PunchWhip-Svg", G_PunchWhip, "svg")}
        {demo("G-PunchWhip-None", G_PunchWhip, "none")}
      </Folder>
      <Folder name="Bench">
        {BENCH_KINDS.map((kind) => (
          <Composition key={kind} id={`Bench-${kind}`} component={Bench} durationInFrames={90} fps={FPS} width={W} height={H} defaultProps={{ kind }} />
        ))}
      </Folder>
      <Folder name="Assets">
        <Still id="Plate" component={Wall} width={W} height={H} />
        <Still id="CardStill" component={CardStill} width={CARD_W} height={CARD_H} defaultProps={{ index: 0 }} />
      </Folder>
      <Folder name="Smoke">
        <Composition id="Smoke" component={Smoke} durationInFrames={60} fps={FPS} width={W} height={H} />
        <Still id="GlInfo" component={GlInfo} width={1920} height={240} />
      </Folder>
    </>
  );
};
