// The zones catalog, read live from the "ui8kit" field of every workspace package.json (the same walk as packages/tooling/src/zones.mjs).
// rules/zones.json is the committed copy; the `rules` group fails when it differs from the live catalog.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Runtime } from "./ir";

export interface Zone { name: string; dir: string; runtime: Runtime; generated: boolean; kit: string[]; composition: string[]; blockRoot: string[] }
export interface Zones { version: 1; packages: Zone[] }
export const ZONES_FILE = "rules/zones.json";

function workspaces(repo: string): string[] {
  const root = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as { workspaces: string[] };
  return root.workspaces.flatMap((w) => {
    if (!w.endsWith("/*")) return [w];
    const base = w.slice(0, -2);
    if (!existsSync(join(repo, base))) return [];
    return readdirSync(join(repo, base), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${base}/${e.name}`);
  }).filter((d) => existsSync(join(repo, d, "package.json"))).sort();
}

export function readZones(repo: string): Zones {
  const packages: Zone[] = [];
  for (const dir of workspaces(repo)) {
    const pkg = JSON.parse(readFileSync(join(repo, dir, "package.json"), "utf8")) as { name: string; ui8kit?: Partial<Zone> };
    const z = pkg.ui8kit;
    if (!z) continue;
    packages.push({ name: pkg.name, dir, runtime: z.runtime as Runtime, generated: z.generated === true, kit: z.kit ?? [], composition: z.composition ?? [], blockRoot: z.blockRoot ?? [] });
  }
  return { version: 1, packages };
}

export const zonesText = (repo: string): string => JSON.stringify(readZones(repo), null, 2) + "\n";
const under = (rel: string, p: string): boolean => rel === p || rel.startsWith(`${p}/`);
export const inKit = (z: Zone, rel: string): boolean => z.kit.some((p) => under(rel, p));
export const inBlockRoot = (z: Zone, rel: string): boolean => z.blockRoot.some((p) => under(rel, p));
