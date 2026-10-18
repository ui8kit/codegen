// Loads the brick specs of an xgen root (xgen/specs/ui/*.json), checks them against the JSON Schemas and normalizes them into the typed model.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validate, xgenPaths } from "@ui8kit/xgen-schema";
import type { BrickDef } from "./domain/model";
import type { VariantRecipe } from "./domain/recipe";
import type { SpecFile } from "./spec-file";

export interface LoadedBrick { brick: BrickDef; spec: SpecFile; specPath: string; variantPaths: Record<string, string> }
export interface LoadedSpecs { root: string; bricks: LoadedBrick[]; problems: string[] }

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));

/** `root` is the xgen folder (the one that holds specs/, fixtures/ and content/) */
export function loadSpecs(root: string): LoadedSpecs {
  const dir = xgenPaths(root).specs("ui");
  const problems: string[] = [];
  const bricks: LoadedBrick[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".variants.json")).sort()) {
    const specPath = join(dir, name);
    const spec = readJson(specPath) as SpecFile;
    for (const e of validate("spec", spec)) problems.push(`${name}: ${e}`);
    const recipes: Record<string, VariantRecipe> = {};
    const variantPaths: Record<string, string> = {};
    for (const [id, file] of Object.entries(spec.variants ?? {})) {
      const p = join(dir, file);
      const raw = readJson(p);
      for (const e of validate("variants", raw)) problems.push(`${file}: ${e}`);
      recipes[id] = raw as VariantRecipe;
      variantPaths[id] = p;
    }
    const brick: BrickDef = { id: spec.id, dir: spec.dir, file: spec.file, docs: spec.docs, parts: spec.parts, recordTypes: spec.recordTypes, recipes, recipeFiles: spec.variants };
    bricks.push({ brick, spec, specPath, variantPaths });
  }
  return { root, bricks, problems };
}
