import { continueRender, delayRender, staticFile } from "remotion";

// Local variable fonts (OFL, from google/fonts), loaded once per bundle; rendering waits until they're ready.
const FACES: { family: string; file: string; descriptors: FontFaceDescriptors }[] = [
  { family: "Bricolage Grotesque", file: "fonts/BricolageGrotesque-VF.ttf", descriptors: { weight: "200 800", stretch: "75% 100%" } },
  { family: "Instrument Sans", file: "fonts/InstrumentSans-VF.ttf", descriptors: { weight: "400 700", stretch: "75% 100%" } },
  { family: "Spline Sans Mono", file: "fonts/SplineSansMono-VF.ttf", descriptors: { weight: "300 700" } },
];

let started = false;

export function loadBrandFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading brand fonts");
  Promise.all(
    FACES.map(async ({ family, file, descriptors }) => {
      const face = new FontFace(family, `url('${staticFile(file)}') format('truetype')`, descriptors);
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error("Font load failed", err);
      continueRender(handle);
    });
}
