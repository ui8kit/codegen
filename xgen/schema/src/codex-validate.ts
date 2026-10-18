// Validates every fixture entry with the @ui8kit/contract v0.4 validator (npm package @ui8kit/contract, a devDependency of
// xgen/schema) against xgen/schema/codex/manifest.json, and the manifest itself against
// https://schema.buildy.tw/manifest.schema.json (shipped by the package as @ui8kit/contract/schemas/manifest.schema.json).
//   bun run codex:validate
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { validateCollectionV04 } from "@ui8kit/contract/validate";
import { MANIFEST_PATH, loadFixtures, loadTaxonomies } from "./codex";

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const schema = JSON.parse(readFileSync(new URL(import.meta.resolve("@ui8kit/contract/schemas/manifest.schema.json")), "utf8"));
const ajv = new Ajv2020({ strict: false });
const okManifest = ajv.validate(schema, manifest);
const entries = loadFixtures().flatMap((c) => c.entries.map((data, i) => ({ file: `${c.collection}.json#${i}`, data })));
// the taxonomy bundles: each against taxonomy.schema.json (with term.schema.json), their terms through the validator with the entries
const schemaOf = (name: string) => JSON.parse(readFileSync(new URL(import.meta.resolve(`@ui8kit/contract/schemas/${name}.schema.json`)), "utf8"));
const taxonomyAjv = new Ajv2020({ strict: false, validateFormats: false });
taxonomyAjv.addSchema(schemaOf("term"));
const validBundle = taxonomyAjv.compile(schemaOf("taxonomy"));
const bundles = loadTaxonomies();
const badBundles: string[] = [];
for (const b of bundles) if (!validBundle(b as unknown)) badBundles.push(`${b.definition.id}: ${JSON.stringify(validBundle.errors)}`);
const terms = bundles.flatMap((b) => b.terms.map((data, i) => ({ file: `taxonomies/${b.definition.id}.json#${i}`, data })));
// the core Menu records (one per location and locale) built from the menu_item entries: label = title, url = "/" + slug, the
// entry as the target, nesting by parent_id and order (xgen/docs/block-data.md, menus)
type Item = { id: string; locale: string; title: string; slug: string; parent_id?: string; order?: number; metadata?: { location?: { value?: string } } };
const items = loadFixtures().flatMap((c) => c.entries as unknown as Item[]).filter((e) => (e as { kind?: string }).kind === "menu_item");
const menuMap = new Map<string, { id: string; location: string; locale: string; items: object[] }>();
for (const e of items) {
  const location = e.metadata?.location?.value ?? "main", key = `${location}/${e.locale}`;
  if (!menuMap.has(key)) menuMap.set(key, { id: `menu-${location}`, location, locale: e.locale, items: [] });
  menuMap.get(key)!.items.push({ id: e.id, label: e.title, url: `/${e.slug}`, ...(e.parent_id ? { parent_id: e.parent_id } : {}), ...(e.order !== undefined ? { order: e.order } : {}), target: { kind: "menu_item", id: e.id } });
}
const menus = [...menuMap.values()].map((data) => ({ file: `menus/${data.id}.${data.locale}`, data }));
const issues = validateCollectionV04({ entries, terms, menus }, { manifest }) as { code: string; path: string; message: string; severity?: string }[];
for (const i of issues) console.log(`${i.severity ?? "error"} ${i.code} ${i.path}: ${i.message}`);
const errors = issues.filter((i) => !i.severity).length, warnings = issues.length - errors;
for (const b of badBundles) console.log(`error taxonomy ${b}`);
console.log(`manifest schema: ${okManifest ? "ok" : JSON.stringify(ajv.errors)}; ${entries.length} entries, ${menus.length} menus (${items.length} items), ${manifest.resources.length} kinds, ${bundles.length} taxonomies (${terms.length} terms): ${errors + badBundles.length} errors, ${warnings} warnings`);
process.exit(okManifest && errors === 0 && badBundles.length === 0 ? 0 : 1);
