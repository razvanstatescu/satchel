import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * No live data on `/` (D-42, design-spec §4: the landing is simulated and generic). A static scan of the landing's own
 * source: `components/Landing.tsx`, everything under `components/landing/` (the sections, the art, the motion engines and
 * their CSS's companions), and `app/(landing)/page.tsx`. A file fails if it imports the data layer (`@/lib/data/*`), the
 * NEAR readers (`@/lib/near/{rpc,contract,history}`) or the chain adapters (`@/lib/chains/*`), by alias or by relative
 * path, statically, dynamically or as a type, or if it calls `fetch(`. The `MySatchels` island (a client component
 * outside this tree) reads only for a connected wallet, and leaves `/` once the `/satchels` app home lands; the
 * browser-side half of the rule is `e2e/landing-static.spec.ts`.
 */

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const ROOTS = ["components/Landing.tsx", "components/landing", "app/(landing)/page.tsx"];
const BANNED: { re: RegExp; why: string }[] = [
  { re: /^@\/lib\/data(?:\/|$)/, why: "the data layer" },
  { re: /^@\/lib\/near\/(?:rpc|contract|history)(?:\.tsx?)?$/, why: "a NEAR reader" },
  { re: /^@\/lib\/chains(?:\/|$)/, why: "a chain adapter" },
];

function walk(rel: string): string[] {
  const abs = join(SRC, rel);
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs)
    .sort()
    .flatMap((name) => walk(join(rel, name)));
}

/** Every module specifier in `src`: static and type imports, re-exports, dynamic `import()` and `require()`. */
function specifiers(src: string): string[] {
  const out: string[] = [];
  const res = [
    /\bimport\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of res) for (const m of src.matchAll(re)) out.push(m[1]);
  return out;
}

/** A specifier in `@/…` form: relative paths are resolved from the importing file (`file` is relative to src/). */
function normalise(spec: string, file: string): string {
  if (!spec.startsWith(".")) return spec;
  return `@/${relative(SRC, resolve(SRC, dirname(file), spec)).split("\\").join("/")}`;
}

/** Why `src` (the file at `file`, relative to src/) breaks the rule: one line per offending import or fetch. */
function offences(src: string, file: string): string[] {
  const out: string[] = [];
  for (const spec of specifiers(src)) {
    const n = normalise(spec, file);
    const hit = BANNED.find((b) => b.re.test(n));
    if (hit) out.push(`imports ${hit.why}: ${spec}`);
  }
  if (/\bfetch\s*\(/.test(src)) out.push("calls fetch(");
  return out;
}

const FILES = ROOTS.flatMap(walk).filter((f) => /\.(?:tsx?|mts|jsx?)$/.test(f));

describe("the scanner (so a clean result means something)", () => {
  it("walks the landing: the page, the assembly and every file under components/landing", () => {
    expect(FILES).toContain("app/(landing)/page.tsx");
    expect(FILES).toContain("components/Landing.tsx");
    for (const f of [
      "HeroSection.tsx",
      "hero/HeroStage.tsx",
      "hero/engine.ts",
      "hero/timeline.ts",
      "WhatSection.tsx",
      "UsesSection.tsx",
      "HowSection.tsx",
      "CleanSection.tsx",
      "TrustSection.tsx",
      "QuestionsSection.tsx",
      "FinaleSection.tsx",
      "art.tsx",
      "LandingMotion.tsx",
      "motion/enter.ts",
      "motion/charms.ts",
      "motion/tracks.ts",
    ]) {
      expect(FILES).toContain(join("components/landing", f));
    }
  });

  it("catches each banned form: alias, relative path, type-only, re-export, dynamic import, require and fetch", () => {
    const f = "components/landing/Example.tsx";
    expect(offences('import { getMarket } from "@/lib/data/server";', f)).toEqual(["imports the data layer: @/lib/data/server"]);
    expect(offences('import type { SatchelSnapshot } from "@/lib/data/types";', f)).toHaveLength(1);
    expect(offences('import { viewSatchel } from "../../lib/near/contract";', f)).toEqual(["imports a NEAR reader: ../../lib/near/contract"]);
    expect(offences('export { send } from "@/lib/chains/send";', f)).toHaveLength(1);
    expect(offences('const m = await import("@/lib/near/rpc");', f)).toHaveLength(1);
    expect(offences('const h = require("@/lib/near/history");', f)).toHaveLength(1);
    expect(offences("const r = await fetch(`/api/satchels/1`);", f)).toEqual(["calls fetch("]);
    expect(offences('import {\n  getActivity,\n  getSatchelSnapshot,\n} from "@/lib/data/server";', f)).toHaveLength(1);
  });

  it("lets the landing's own modules through: copy, config, the motion flag, the wallet island", () => {
    const f = "components/landing/Example.tsx";
    const ok = [
      'import { copy } from "@/lib/copy";',
      'import { CONTRACT_ROLE, REPO_URL } from "@/lib/config";',
      'import { readMotionMode } from "@/lib/motion-flag";',
      'import { play, rollTracks } from "@/lib/motion/play";',
      'import { MySatchels } from "@/components/client/MySatchels";',
      'import { Field } from "./primitives";',
      'import { lockView } from "@/lib/lock-facts";',
      "// the hero fetches nothing", // a word, not a call
    ];
    for (const src of ok) expect(offences(src, f), src).toEqual([]);
  });
});

describe("no live data on / (A10a): a static scan of the landing's source", () => {
  it.for(FILES)("%s reads nothing live", (file) => {
    const src = readFileSync(join(SRC, file), "utf8");
    expect(offences(src, file), `${file} must not read live data on /`).toEqual([]);
  });
});
