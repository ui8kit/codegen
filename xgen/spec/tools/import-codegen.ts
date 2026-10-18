#!/usr/bin/env bun
// One-time importer (not part of `xgen build`): reads the brick definitions of a local ui8kit/codegen clone and the canary recipes
// (*.variants.json) of a ui source folder, and writes xgen/specs/ui/*.json. After the import the specs are the source of truth and xgen
// does not read either source again.
//   CODEGEN_DIR=/path/to/codegen RECIPES_DIR=/path/to/ui bun spec/tools/import-codegen.ts [xgenRoot]
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { deriveA11y, deriveData, deriveSlots, deriveTokens, type SpecExample, type SpecFile, type SpecPart, type BrickDef, type PropDef, type VariantRecipe } from "../src/index";

/** a one-time import tool reads files outside the repository: the folder comes from the environment, never from a path written here */
const need = (name: string): string => process.env[name] ?? (() => { throw new Error(`set ${name} to the folder to read`); })();
const CODEGEN = need("CODEGEN_DIR");
const RECIPES = need("RECIPES_DIR");
const ROOT = resolve(process.argv[2] ?? join(import.meta.dir, "../.."));
const THEME = readFileSync(join(ROOT, "runtimes/core/assets/styles/theme.css"), "utf8");
const TOKENS = [...THEME.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]!);

const { bricks } = (await import(join(CODEGEN, "bricks/index.ts"))) as { bricks: BrickDef[] };
const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const out = join(ROOT, "specs/ui");
mkdirSync(out, { recursive: true });

let nParts = 0;
for (const b of bricks) {
  const recipes: Record<string, VariantRecipe> = {};
  for (const [rid, file] of Object.entries(b.recipeFiles)) {
    const ours = join(RECIPES, b.dir, file);
    const src: Record<string, unknown> = JSON.parse(readFileSync(existsSync(ours) ? ours : join(CODEGEN, "bricks", b.dir, file), "utf8"));
    delete src.$schema;
    delete src.source; // design provenance is not published
    const r = { id: String(src.id ?? b.id), base: src.base, keys: src.keys, defaults: src.defaults, byKey: src.byKey, ...(src.compound ? { compound: src.compound } : {}) } as VariantRecipe;
    if (JSON.stringify(r).includes("gradient")) throw new Error(`${file}: gradient in a recipe`);
    recipes[rid] = r;
    writeFileSync(join(out, file), JSON.stringify(r, null, 2) + "\n");
  }
  // overlay: every dimension of the recipe is a prop of the parts that use the recipe
  const parts: SpecPart[] = b.parts.map((p) => {
    const part = JSON.parse(JSON.stringify(p)) as typeof p;
    const rid = part.recipeId ?? part.classes?.recipeId;
    const recipe = rid ? recipes[rid] : undefined;
    if (recipe && part.classes) {
      part.classes.recipe = part.classes.recipe ?? {};
      for (const key of recipe.keys) {
        if (key in part.classes.recipe) continue;
        const name = pascal(key);
        if (!part.props.some((x) => x.name === name)) {
          const prop: PropDef = { name, type: "string", cva: true, ...(name.toLowerCase() === key ? {} : { cvaKey: key }), docs: `sets ${key}` };
          const last = part.props.map((x) => !!x.cva).lastIndexOf(true);
          part.props.splice(last + 1, 0, prop);
        }
        part.classes.recipe[key] = name;
      }
      // keep the order of keys of the recipe
      part.classes.recipe = Object.fromEntries(recipe.keys.filter((k) => k in part.classes!.recipe!).map((k) => [k, part.classes!.recipe![k]!]));
    }
    nParts++;
    return {
      ...part,
      slots: deriveSlots(part),
      events: [],
      a11y: deriveA11y(part),
      data: deriveData(part),
      tokens: deriveTokens(recipe ? [recipe] : [], TOKENS),
    } as SpecPart;
  });
  const dataFile = join(CODEGEN, "bricks", b.dir, `${b.file ?? b.dir}.data.json`);
  const examples: SpecExample[] = existsSync(dataFile)
    ? Object.entries(JSON.parse(readFileSync(dataFile, "utf8")).showcase as Record<string, { props: Record<string, unknown>; children?: Record<string, unknown> }>).map(([id, v]) => ({ id, props: v.props, ...(v.children ? { children: v.children } : {}) }))
    : [];
  const spec: SpecFile = {
    $schema: "../../schema/schemas/spec.schema.json",
    specVersion: 1,
    id: b.id, tier: "brick", dir: b.dir, ...(b.file ? { file: b.file } : {}), docs: b.docs,
    variants: b.recipeFiles,
    ...(b.recordTypes ? { recordTypes: b.recordTypes } : {}),
    parts, examples,
    portable: { svelte: true, react: true },
  };
  writeFileSync(join(out, `${b.file ?? b.dir}.json`), JSON.stringify(spec, null, 2) + "\n");
}
console.log(`imported ${bricks.length} bricks, ${nParts} parts`);
