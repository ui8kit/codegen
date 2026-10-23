/** Generated TS utils and primitives never use `import.meta`: the web components (and every TS runtime) bundle as IIFE too. */
import { expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureGenerated } from "./support/ensure-generated";

await ensureGenerated();
const root = join(import.meta.dir, "..", "generated");

it("no import.meta in generated/utils and generated/ui", () => {
  const hits = ["utils", "ui"].flatMap((d) =>
    (readdirSync(join(root, d), { recursive: true, encoding: "utf8" }) as string[])
      .filter((f) => /\.(ts|tsx|svelte|vue)$/.test(f))
      .filter((f) => /import\.meta/.test(readFileSync(join(root, d, f), "utf8")))
      .map((f) => `${d}/${f}`));
  expect(hits).toEqual([]);
});

it("the web components bundle as a classic IIFE script", async () => {
  const entry = (readdirSync(join(root, "ui"), { recursive: true, encoding: "utf8" }) as string[]).filter((f) => f.endsWith(".wc.ts"));
  expect(entry.length).toBeGreaterThan(10);
  const out = await Bun.build({ entrypoints: entry.map((f) => join(root, "ui", f)), format: "iife" as never, target: "browser", minify: false, outdir: join(import.meta.dir, "..", "node_modules", ".cache", "wc-iife") });
  expect(out.success).toBe(true);
  for (const o of out.outputs) expect(await o.text()).not.toContain("import.meta");
});
