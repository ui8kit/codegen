// The Codex v0.4 manifest of the kit's fixtures (xgen/fixtures): one resource per entry kind, its metadata fields
// inferred from the fixtures. Money fields hold integer minor units (rule fastygo.codex/money) next to a `currency`
// field; dates are RFC 3339 (type datetime); ids of entries of one other kind become relations.
// `bun xgen/schema/src/codex.ts` writes xgen/schema/codex/manifest.json; a test keeps the file equal to the fixtures.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "./paths";

export const MONEY_FIELDS = ["price", "compare_at", "yearly", "total", "amount", "freeFrom", "minOrder"] as const;
export const MANIFEST_PATH = join(import.meta.dir, "..", "codex", "manifest.json");
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

type Meta = Record<string, { value: unknown }>;
export interface Entry { id: string; kind: string; metadata?: Meta }
export interface Collection { collection: string; kind: string; entries: Entry[] }
export interface Field { id: string; label: string; type: string; required?: boolean; rules?: { name: string; args?: Record<string, string> }[]; items?: Field; fields?: Field[] }
export interface Manifest { name: string; version: string; resources: { record: { id: string; label: string; scope: string; description: string; fields: Field[]; relations?: { id: string; source: string; target: string; cardinality: string }[] }; taxonomies?: string[] }[] }

export interface Term { id: string; locale: string; taxonomy_id: string; name: string; slug: string }
export interface TaxonomyBundle { definition: { id: string; locale: string; label: string; mode: string; assigned_to_kinds: string[] }; terms: Term[] }
/** the taxonomy bundles of xgen/fixtures/taxonomies (the terms that entries name in `terms`) */
export function loadTaxonomies(dir = xgenPaths(join(import.meta.dir, "..", "..")).taxonomies): TaxonomyBundle[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as TaxonomyBundle) : [];
}

export function loadFixtures(dir = xgenPaths(join(import.meta.dir, "..", "..")).fixtures): Collection[] {
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Collection);
}

const label = (id: string) => id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

function typeOf(id: string, values: unknown[]): Field {
  const f: Field = { id, label: label(id), type: "json" };
  const vs = values.filter((v) => v !== null && v !== undefined);
  if (vs.length && vs.every((v) => typeof v === "boolean")) f.type = "boolean";
  else if (vs.length && vs.every((v) => typeof v === "number")) {
    f.type = "number";
    if (vs.every((v) => Number.isInteger(v))) f.rules = [{ name: "fastygo.codex/integer" }];
  } else if (vs.length && vs.every((v) => typeof v === "string")) f.type = vs.every((v) => RFC3339.test(v as string)) ? "datetime" : "string";
  else if (vs.length && vs.every(Array.isArray)) { f.type = "collection"; f.items = typeOf("item", (vs as unknown[][]).flat()); }
  else if (vs.length && vs.every((v) => typeof v === "object" && !Array.isArray(v))) {
    f.type = "object";
    const keys = [...new Set(vs.flatMap((v) => Object.keys(v as object)))].sort();
    f.fields = keys.map((k) => ({ ...typeOf(k, vs.map((v) => (v as Record<string, unknown>)[k])), ...(vs.every((v) => k in (v as object)) ? { required: true } : {}) }));
  }
  return f;
}

export function buildManifest(cols: Collection[], taxonomies: TaxonomyBundle[] = loadTaxonomies()): Manifest {
  const byKind = new Map<string, Entry[]>();
  for (const c of cols) for (const e of c.entries) byKind.set(e.kind, [...(byKind.get(e.kind) ?? []), e]);
  const kindOfId = new Map<string, string>();
  for (const [k, es] of byKind) for (const e of es) kindOfId.set(e.id, k);
  const resources = [...byKind.keys()].sort().map((kind) => {
    const es = byKind.get(kind)!;
    const keys = [...new Set(es.flatMap((e) => Object.keys(e.metadata ?? {})))].sort();
    const relations: { id: string; source: string; target: string; cardinality: string }[] = [];
    const fields = keys.map((k) => {
      const values = es.map((e) => e.metadata?.[k]?.value);
      let f = typeOf(k, values);
      const strs = values.filter((v): v is string => typeof v === "string");
      const targets = new Set(strs.map((v) => kindOfId.get(v)));
      if (f.type === "string" && strs.length && !targets.has(undefined) && targets.size === 1) {
        f = { id: k, label: label(k), type: "relation" };
        relations.push({ id: k, source: kind, target: [...targets][0]!, cardinality: "one-to-one" });
      }
      if ((MONEY_FIELDS as readonly string[]).includes(k) && keys.includes("currency") && f.type === "number") f.rules = [{ name: "fastygo.codex/money" }];
      if (es.every((e) => e.metadata?.[k] !== undefined && e.metadata[k]!.value !== null && e.metadata[k]!.value !== "")) f.required = true;
      return f;
    });
    const collections = [...new Set(cols.filter((c) => c.entries.some((e) => e.kind === kind)).map((c) => c.collection))].sort();
    // the taxonomies a kind's entries may name in `terms` (Manifest Resource.taxonomies)
    const tax = taxonomies.filter((t) => t.definition.assigned_to_kinds.includes(kind)).map((t) => t.definition.id).sort();
    return { record: { id: kind, label: label(kind), scope: "workspace", description: `fixtures: ${collections.join(", ")}`, fields, ...(relations.length ? { relations } : {}) }, ...(tax.length ? { taxonomies: tax } : {}) };
  });
  return { name: "ui8kit-fixtures", version: "0.4.0", resources };
}

export const manifestText = (m: Manifest) => JSON.stringify(m, null, 2) + "\n";

if (import.meta.main) {
  writeFileSync(MANIFEST_PATH, manifestText(buildManifest(loadFixtures())));
  console.log(`wrote ${MANIFEST_PATH}`);
}
