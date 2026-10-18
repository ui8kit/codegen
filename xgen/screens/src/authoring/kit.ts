// Shared helpers of the authoring files for parts and patterns.
import type { OrganismSpec, PropType, RecordField } from "../ir";

export const SCHEMA = "../../schema/schemas/organism.schema.json";

type Prop = OrganismSpec["props"][number];
export const prop = (name: string, type: PropType, docs?: string, extra: Partial<Prop> = {}): Prop => ({ name, type, ...(docs ? { docs } : {}), ...extra });
export const req = (name: string, type: PropType, docs?: string): Prop => prop(name, type, docs, { required: true });
export const ts = (t: string): PropType => ({ ts: t });
export const rec = (name: string): PropType => ({ record: name });

type Def = Partial<Omit<OrganismSpec, "id" | "name" | "docs">> & { view?: OrganismSpec["view"] };
/** an organism, part or pattern with the empty defaults filled in */
export const spec = (id: string, name: string, docs: string, def: Def): OrganismSpec => ({
  $schema: SCHEMA,
  specVersion: 1,
  id,
  name,
  docs,
  records: {},
  props: [],
  ...(def.className ? { className: true } : {}),
  ...(def.children ? { children: true } : {}),
  ...(def.recipes ? { recipes: def.recipes } : {}),
  ...(def.consts ? { consts: def.consts } : {}),
  ...(def.derived ? { derived: def.derived } : {}),
  slots: [],
  events: [],
  view: [],
  portable: { svelte: true, react: true },
  ...Object.fromEntries(Object.entries(def).filter(([k]) => !["className", "children", "consts", "derived", "recipes"].includes(k))),
} as OrganismSpec);

/** a spec that is only a contract: props, slots and events are fixed, the behaviour stays with the programmer */
export const contract = (id: string, name: string, docs: string, reason: string, def: Def): OrganismSpec =>
  spec(id, name, docs, { ...def, view: [], portable: { svelte: { portable: false, reason }, react: { portable: false, reason } } });

/**
 * the fields of a grouped prop (shadcn style: `actions={{ cta, href }}`): all optional; a field with a union type and a
 * default can be a block axis (`actions.mode`)
 */
export const groupFields = (...f: Array<[name: string, type: string | PropType, docs?: string, def?: string | number | boolean]>): RecordField[] =>
  f.map(([name, type, docs, def]) => ({ name, type: typeof type === "string" ? type : "ts" in type ? type.ts : type.record, optional: true, ...(docs ? { docs } : {}), ...(def !== undefined ? { default: def } : {}) }));
/** the same fields, with the named ones required (no `?`) */
export const requireFields = (f: RecordField[], ...names: string[]): RecordField[] => f.map((x) => (names.includes(x.name) ? { ...x, optional: false } : x));
export const fields = (...f: Array<[string, RecordField["type"], boolean?]>): RecordField[] => f.map(([name, type, optional]) => ({ name, type, ...(optional ? { optional: true } : {}) }));

// ---- recipes: the recipes of xgen/specs/recipes, read while authoring
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import type { RecipeFile } from "../ir";

const recipesDir = xgenPaths(join(import.meta.dir, "..", "..", "..")).specs("recipes");
/** the base classes of the Card primitive (xgen/specs/ui/card.variants.json): a card item that is the root of a block file opens on
 *  `Block tag="article"` with these classes, so it looks the same and is a block (rule 01) */
export const cardBase = (): string => (JSON.parse(readFileSync(join(recipesDir, "..", "ui", "card.variants.json"), "utf8")) as RecipeFile).base;
export const recipeFile = (file: string): RecipeFile => JSON.parse(readFileSync(join(recipesDir, `${file}.variants.json`), "utf8")) as RecipeFile;
/** the values of one key of a recipe as a TypeScript union: `"24" | "32"` */
export const union = (file: string, key: string): PropType => ({ ts: Object.keys(recipeFile(file).byKey[key] ?? {}).map((v) => JSON.stringify(v)).join(" | ") });
export const defaultOf = (file: string, key: string): string => recipeFile(file).defaults[key]!;
type Example = NonNullable<OrganismSpec["examples"]>[number];
/** one example per value of the recipe keys that are props of the component: `{ size: "size", layout: "layout" }` maps recipe key -> prop name */
export function recipeExamples(file: string, mapping: Record<string, string>, base: Record<string, string | number | boolean> = {}): Example[] {
  const recipe = recipeFile(file);
  return Object.entries(mapping).flatMap(([key, propName]) => Object.keys(recipe.byKey[key] ?? {}).map((value) => ({ id: `${propName}.${value}`, props: { ...base, [propName]: value } })));
}
