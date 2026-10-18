// What the static template generators (templ, Twig, Jinja2, Latte) share about organisms: the portable organisms emitted
// one by one, the recipes and presets they read collected and resolved, and the block-root zone of the package.json.
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import { portableTo } from "@ui8kit/xgen-spec";
import type { Inputs, OrganismSpec } from "@ui8kit/xgen-screens";
import { fileName, indexParts, tierDir } from "@ui8kit/xgen-screens";
import { BANNER, type GeneratedFile } from "@ui8kit/xgen-runtime-core";
import { emitTwigOrganism, type Dialect } from "@ui8kit/xgen-runtime-twig";

export interface Emitted { files: GeneratedFile[]; recipes: Iterable<string>; presets: Iterable<string> }
export interface Collected { files: GeneratedFile[]; recipes: Array<{ name: string; value: unknown }>; presets: Array<{ name: string; value: unknown }> }

/** every organism portable to the TypeScript runtimes through `emit` (label prefixes the problems), with the recipes and presets they read, sorted and resolved */
export function collectOrganisms(inputs: Inputs, problems: string[], label: string, emit: (org: OrganismSpec, source: string) => Emitted): Collected {
  const files: GeneratedFile[] = [];
  const recipes = new Set<string>(), presets = new Set<string>();
  for (const o of inputs.organisms) {
    const org = o.value as OrganismSpec;
    if (portableTo(org.portable, "svelte") !== true) continue;
    try {
      const out = emit(org, o.file.slice(o.file.indexOf("xgen/")));
      files.push(...out.files);
      for (const r of out.recipes) recipes.add(r);
      for (const p of out.presets) presets.add(p);
    } catch (e) { problems.push(`${label}: ${(e as Error).message}`); }
  }
  const out: Collected = { files, recipes: [], presets: [] };
  for (const name of [...recipes].sort()) {
    const r = inputs.recipes.find((x) => x.name === name);
    if (!r) problems.push(`${label}: recipe ${name} not found`);
    else out.recipes.push({ name, value: r.value });
  }
  for (const name of [...presets].sort()) {
    const p = inputs.presets.find((x) => x.value.name === name);
    if (!p) problems.push(`${label}: preset ${name} not found`);
    else out.presets.push({ name, value: p.value });
  }
  return out;
}

/** a JSON file with the banner as its first key */
export const bannerJson = (path: string, value: unknown): GeneratedFile => ({ path, contents: JSON.stringify({ "//": BANNER, ...(value as object) }, null, 2) + "\n" });

/** the organisms of a dialect package (Twig, Jinja2, Latte): templates in blocks/, the recipes and presets they read next to them */
export function dialectOrganismFiles(bricks: LoadedBrick[], inputs: Inputs, problems: string[], d: Dialect, label: string): GeneratedFile[] {
  const organisms = Object.fromEntries(inputs.organisms.map((o) => [o.value.name, o.value as OrganismSpec]));
  const deps = { parts: indexParts(bricks), organisms, recipePath: (f: string) => `blocks/recipes/${f}.variants.json`, presetPath: (n: string) => `blocks/presets/${n}.json` };
  const c = collectOrganisms(inputs, problems, label, (org, source) => emitTwigOrganism(org, deps, source, d));
  return [...c.files, ...c.recipes.map((r) => bannerJson(deps.recipePath(r.name), r.value)), ...c.presets.map((p) => bannerJson(deps.presetPath(p.name), p.value))];
}

/** the block-root zone of a template package: the files the TypeScript packages keep in src/blocks plus their frame components, as generated */
export const blockRootOf = (inputs: Inputs, files: GeneratedFile[], ext: string): string[] =>
  inputs.organisms.map((o) => o.value).filter((o) => tierDir(o.id) === "blocks" || (o.frame && tierDir(o.id) === "components"))
    .map((o) => `blocks/${fileName(o.name)}${ext}`).filter((p) => files.some((f) => f.path === p)).sort();
