import { continueRender, delayRender, staticFile } from "remotion";

// Satchel 2.0 fonts (OFL, from google/fonts), variable: Funnel Display wght 300–800, Onest 100–900, Geist Mono 100–900.
const FACES: { family: string; file: string; descriptors: FontFaceDescriptors }[] = [
  { family: "Funnel Display", file: "v2/fonts/FunnelDisplay-VF.ttf", descriptors: { weight: "300 800" } },
  { family: "Onest", file: "v2/fonts/Onest-VF.ttf", descriptors: { weight: "100 900" } },
  { family: "Geist Mono", file: "v2/fonts/GeistMono-VF.ttf", descriptors: { weight: "100 900" } },
];

let started = false;

export function loadBrandFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading Satchel 2.0 fonts");
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
