// Loads the hand-written inputs of an xgen root and validates them against the JSON Schemas:
//   specs/organisms|parts|patterns/*.json, specs/presets/*.json, specs/screens/*.json, fixtures/*.json, content/ui/en.json and apps/<app>/xgen.app.json.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validate, xgenPaths } from "@ui8kit/xgen-schema";
import { expandComposed } from "./compose";
import type { AppSpec, BlockSpec, CollectionFile, TaxonomyFile, ComposedSpec, Dictionary, OrganismSpec, PresetSpec, RecipeFile, ScreenSpec } from "./ir";

export const readJson = <T = unknown>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

export interface Loaded<T> { file: string; value: T }
export interface Inputs {
  root: string;
  organisms: Loaded<OrganismSpec>[];
  /** specs/recipes/*.variants.json, by file name without the extension */
  recipes: Array<Loaded<RecipeFile> & { name: string }>;
  /** specs/presets/*.json: the layout presets of the kits */
  presets: Loaded<PresetSpec>[];
  /** page and collection screens; a composed screen is here already expanded to a page screen */
  screens: Array<Loaded<ScreenSpec> & { composed?: ComposedSpec }>;
  blocks: Loaded<BlockSpec>[];
  collections: Loaded<CollectionFile>[];
  /** fixtures/taxonomies/*.json: the taxonomy bundles (checked against the contract by codex:validate) */
  taxonomies: Loaded<TaxonomyFile>[];
  dictionary: Loaded<Dictionary>;
  problems: string[];
}

function loadDir<T>(dir: string, kind: "organism" | "screen" | "collection" | "variants" | "block" | "preset", problems: string[], skip?: (f: string) => boolean): Loaded<T>[] {
  if (!existsSync(dir)) return [];
  const out: Loaded<T>[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && !(skip?.(x))).sort()) {
    const file = join(dir, f);
    const value = readJson<T>(file);
    const schema = kind === "screen" && (value as { kind?: string }).kind === "composed" ? "composed" : kind;
    for (const e of validate(schema, value)) problems.push(`${kind}s/${f}: ${e}`);
    out.push({ file, value });
  }
  return out;
}

/** `root` is the xgen folder */
export function loadInputs(root: string): Inputs {
  const problems: string[] = [];
  const dictFile = xgenPaths(root).dictionary;
  const dictionary = { file: dictFile, value: readJson<Dictionary>(dictFile) };
  for (const e of validate("dictionary", dictionary.value)) problems.push(`content/ui/en.json: ${e}`);
  const organisms = ["organisms", "parts", "patterns"].flatMap((d) => loadDir<OrganismSpec>(xgenPaths(root).specs(d), "organism", problems));
  const blocks = loadDir<BlockSpec>(xgenPaths(root).specs("blocks"), "block", problems);
  const byName = Object.fromEntries(organisms.map((o) => [o.value.name, o.value]));
  const screens = loadDir<ScreenSpec | ComposedSpec>(xgenPaths(root).specs("screens"), "screen", problems).map((l) => {
    if ((l.value as ComposedSpec).kind !== "composed") return l as Loaded<ScreenSpec>;
    const composed = l.value as ComposedSpec;
    const r = expandComposed(composed, blocks.map((b) => b.value), byName);
    problems.push(...r.problems.map((m) => `screens/${l.file.split("/").pop()}: ${m}`));
    return { file: l.file, value: r.screen, composed };
  });
  return {
    root,
    organisms,
    blocks,
    recipes: loadDir<RecipeFile>(xgenPaths(root).specs("recipes"), "variants", problems).map((r) => ({ ...r, name: r.file.split("/").pop()!.replace(/\.variants\.json$/, "") })),
    presets: loadDir<PresetSpec>(xgenPaths(root).specs("presets"), "preset", problems),
    screens,
    collections: loadDir<CollectionFile>(xgenPaths(root).fixtures, "collection", problems),
    taxonomies: existsSync(xgenPaths(root).taxonomies)
      ? readdirSync(xgenPaths(root).taxonomies).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: join(xgenPaths(root).taxonomies, f), value: readJson<TaxonomyFile>(join(xgenPaths(root).taxonomies, f)) }))
      : [],
    dictionary,
    problems,
  };
}

export function loadApp(file: string): { app: AppSpec; problems: string[] } {
  const app = readJson<AppSpec>(file);
  return { app, problems: validate("app", app).map((e) => `${file}: ${e}`) };
}

/** every app of the workspace: apps/<name>/xgen.app.json */
export function findApps(workspace: string): string[] {
  const dir = join(workspace, "apps");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, "xgen.app.json"))).sort().map((d) => join(dir, d));
}

export const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
