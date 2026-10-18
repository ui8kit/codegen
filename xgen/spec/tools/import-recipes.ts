#!/usr/bin/env bun
// One-time tool: copies the recipes (CVA-style *.variants.json) of the canary parts and patterns into xgen/specs/recipes.
// The `source` field (a pointer into the design kit) is dropped; a recipe with a gradient is refused.
// usage: bun spec/tools/import-recipes.ts <canary-root>
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const canary = process.argv[2];
if (!canary) throw new Error("usage: import-recipes.ts <canary-root>");
const out = join(import.meta.dir, "../../specs/recipes");
mkdirSync(out, { recursive: true });
const found: string[] = [];
const walk = (dir: string): void => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".variants.json")) found.push(p);
  }
};
for (const sub of ["parts", "patterns"]) walk(join(canary, "packages/ui/src", sub));
for (const file of found.sort()) {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  if (JSON.stringify(raw).includes("gradient")) throw new Error(`${file}: gradient`);
  const { source: _source, ...rest } = raw;
  const name = file.split("/").pop()!;
  writeFileSync(join(out, name), JSON.stringify({ $schema: "../../schema/schemas/variants.schema.json", ...rest }, null, 2) + "\n");
  console.log(name);
}
console.log(`${found.length} recipes`);
