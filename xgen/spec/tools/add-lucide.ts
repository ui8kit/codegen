// One-time tool: adds more Lucide icons (ISC license) to xgen/specs/assets/lucide-icons.json from a checkout that has @lucide/svelte installed.
// usage: bun spec/tools/add-lucide.ts <canary-root> <icon-name>...
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [canary, ...names] = process.argv.slice(2);
if (!canary || !names.length) throw new Error("usage: add-lucide.ts <canary-root> <icon-name>...");
const bun = join(canary, "node_modules/.bun");
const pkg = readdirSync(bun).find((d) => d.startsWith("@lucide+svelte@"));
if (!pkg) throw new Error("@lucide/svelte is not installed in that checkout");
const dir = join(bun, pkg, "node_modules/@lucide/svelte/dist/icons");
const file = join(import.meta.dir, "../../specs/assets/lucide-icons.json");
const doc = JSON.parse(readFileSync(file, "utf8")) as { icons: Record<string, unknown> };
const missing: string[] = [];
for (const n of names) {
  const f = join(dir, `${n}.svelte`);
  if (!existsSync(f)) { missing.push(n); continue; }
  const m = readFileSync(f, "utf8").match(/const iconData = (\{.*\});/);
  if (!m) throw new Error(`icon ${n}: no iconData`);
  doc.icons[n] = JSON.parse(m[1]!).node;
}
doc.icons = Object.fromEntries(Object.entries(doc.icons).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(file, JSON.stringify(doc) + "\n");
console.log(`${Object.keys(doc.icons).length} icons`);
if (missing.length) { console.error(`not in this Lucide version: ${missing.join(", ")}`); process.exitCode = 1; }
