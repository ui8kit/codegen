// Zones catalog: every workspace declares its own zones in the "ui8kit" field of its package.json.
//   runtime      svelte | react | vue | solid | templ | twig | jinja2
//   kit          primitives and utils: raw host markup is allowed, the composition rules never scan it
//   composition  blocks, composite components, app screens: rules 01, 02, 03 and 06 apply
//   blockRoot    the part of the composition whose files must open on Block (blocks and screens)
//   generated    true when xgen writes the files: never hand-edit them, fix the spec or the generator
// readZones(repo) assembles the catalog live; rules/zones.json is the committed copy (`bun packages/tooling/bin/zones.mjs --write`).
import fs from "node:fs";
import path from "node:path";

/** workspace dirs of the root package.json, "dir/*" expanded */
export function workspaces(repo) {
  const root = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
  return root.workspaces.flatMap((w) => {
    if (!w.endsWith("/*")) return [w];
    const base = w.slice(0, -2);
    if (!fs.existsSync(path.join(repo, base))) return [];
    return fs.readdirSync(path.join(repo, base), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${base}/${e.name}`);
  }).filter((d) => fs.existsSync(path.join(repo, d, "package.json"))).sort();
}

/** @returns {{ version: 1, packages: Array<{ name: string, dir: string, runtime: string, generated: boolean, kit: string[], composition: string[], blockRoot: string[] }> }} */
export function readZones(repo) {
  const packages = [];
  for (const dir of workspaces(repo)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(repo, dir, "package.json"), "utf8"));
    const z = pkg.ui8kit;
    if (!z) continue;
    packages.push({ name: pkg.name, dir, runtime: z.runtime, generated: z.generated === true, kit: z.kit ?? [], composition: z.composition ?? [], blockRoot: z.blockRoot ?? [] });
  }
  return { version: 1, packages };
}

export const zonesText = (repo) => JSON.stringify(readZones(repo), null, 2) + "\n";
export const ZONES_FILE = "rules/zones.json";

/** zone of a path relative to the package dir: "kit" | "composition" | null */
export function zoneOf(pkg, rel) {
  const under = (p) => rel === p || rel.startsWith(`${p}/`);
  if (pkg.kit.some(under)) return "kit";
  if (pkg.composition.some(under)) return "composition";
  return null;
}
