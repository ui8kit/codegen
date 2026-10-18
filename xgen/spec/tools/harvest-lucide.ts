// One-time tool: harvests the Lucide icons (ISC license) a canary checkout uses into xgen/specs/assets/lucide-icons.json.
// usage: bun spec/tools/harvest-lucide.ts <canary-root>
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const canary = process.argv[2];
if (!canary) throw new Error("usage: harvest-lucide.ts <canary-root>");
const registry = readFileSync(join(canary, "packages/ui/src/ui/icon/lucide-registry.ts"), "utf8");
const names = [...registry.matchAll(/@lucide\/svelte\/icons\/([a-z0-9-]+)"/g)].map((m) => m[1]!).sort();
const bun = join(canary, "node_modules/.bun");
const pkg = readdirSync(bun).find((d) => d.startsWith("@lucide+svelte@"));
if (!pkg) throw new Error("@lucide/svelte is not installed in the canary checkout");
const dir = join(bun, pkg, "node_modules/@lucide/svelte/dist/icons");
const out: Record<string, Array<[string, Record<string, string>]>> = {};
for (const n of names) {
  const src = readFileSync(join(dir, `${n}.svelte`), "utf8");
  const m = src.match(/const iconData = (\{.*\});/);
  if (!m) throw new Error(`icon ${n}: no iconData`);
  out[n] = JSON.parse(m[1]!).node;
}
const file = { "//": "Lucide icons (ISC license, https://lucide.dev): the glyphs the canary registry names. Harvested by spec/tools/harvest-lucide.ts. Rendering: <svg viewBox=0 0 24 24> with these nodes.", icons: out };
writeFileSync(join(import.meta.dir, "../../specs/assets/lucide-icons.json"), JSON.stringify(file) + "\n");
console.log(`${names.length} icons`);
