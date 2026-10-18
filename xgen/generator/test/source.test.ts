import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BANNER } from "@ui8kit/xgen-runtime-core";
import { authoringIndex, withSource } from "../src/source";
import { appSourceOf, sharedSourceOf } from "../src/plan";

test("withSource adds the pointer as line 2 in the comment style of line 1", () => {
  const svelte = withSource({ path: "a.svelte", contents: `<!-- ${BANNER} -->\n<div></div>` }, "x/a.ts");
  expect(svelte.contents.split("\n")[1]).toBe("<!-- Source: x/a.ts -->");
  const ts = withSource({ path: "a.ts", contents: `// ${BANNER}\nexport {};` }, "x/a.ts");
  expect(ts.contents.split("\n")[1]).toBe("// Source: x/a.ts");
  const css = withSource({ path: "a.css", contents: `/* ${BANNER} */\n` }, "x/a.css");
  expect(css.contents.split("\n")[1]).toBe("/* Source: x/a.css */");
  expect(withSource(ts, "again").contents).toBe(ts.contents);
  expect(withSource({ path: "b.ts", contents: "no banner" }, "x").contents).toBe("no banner");
});

test("authoringIndex finds the authoring file of every organism", () => {
  const idx = authoringIndex(join(import.meta.dir, "..", ".."));
  expect(idx.get("hero-classic")).toBe("xgen/screens/src/authoring/blocks/landing-hero.ts");
  expect(idx.get("nav-links")).toBe("xgen/screens/src/authoring/components/nav.ts");
});

test("shared and host scaffold files point at the file a person changes, and every pointer exists", () => {
  const root = join(import.meta.dir, "..", "..", "..");
  const screen = (name: string): string | undefined => (name === "SiteScreen" ? "xgen/specs/screens/site.json" : undefined);
  const shared = ["src/content.ts", "src/data/features.ts", "src/nav/SiteScreen.ts", "src/runtime/core.ts", "src/runtime/theme.ts", "src/styles/skins.css", "src/screens.ts", "tsconfig.json"];
  for (const p of shared) {
    const src = sharedSourceOf(p, screen);
    expect(src, p).toBeDefined();
    expect(existsSync(join(root, src!.split(" ")[0]!)), `${p} -> ${src}`).toBe(true);
  }
  expect(appSourceOf("vite.config.ts", "svelte", "host-svelte")).toBe("xgen/runtimes/svelte/src/app.ts (settings: apps/host-svelte/xgen.app.json)");
  expect(appSourceOf("xgen/runtime/url.ts", "react", "host-react")).toBe("xgen/runtimes/react/assets/url.ts");
  expect(appSourceOf("xgen/runtime/url.ts", "vue", "host-vue")).toBe("xgen/runtimes/vue/assets/url.ts");
  expect(appSourceOf("package.json", "react", "host-react")).toBeUndefined();
});

test("authoringIndex also finds specs named with a literal prefix", () => {
  const idx = authoringIndex(join(import.meta.dir, "..", ".."));
  expect(idx.get("feature-cards")).toBe("xgen/screens/src/authoring/components/features.ts");
  expect(idx.get("cart-table")).toBe("xgen/screens/src/authoring/components/cart-table.ts");
});

test("authoring follows the tiers: components/ writes parts and patterns, blocks/ writes organisms", () => {
  const dir = join(import.meta.dir, "..", "..", "screens", "src", "authoring");
  const ids = (tier: string): string[] => readdirSync(join(dir, tier)).filter((f) => f.endsWith(".ts")).flatMap((f) => {
    const text = readFileSync(join(dir, tier, f), "utf8");
    const prefix = Object.fromEntries([...text.matchAll(/const (\w+) = "(organism|pattern|part)\.";/g)].map((m) => [m[1]!, m[2]!]));
    return [...text.matchAll(/(?:spec|contract)\(\s*(?:`\$\{(\w+)\}|["`](organism|pattern|part)\.)([a-z0-9-]+)/g)].map((m) => `${f}: ${m[2] ?? prefix[m[1]!]}.${m[3]}`);
  });
  expect(ids("blocks").filter((x) => !x.includes(": organism."))).toEqual([]);
  expect(ids("components").filter((x) => x.includes(": organism."))).toEqual([]);
});
