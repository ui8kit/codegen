// JSON Schemas of xgen and a validator over them. Kinds: spec, variants, organism, screen, app, collection, dictionary, preset.
import Ajv2020 from "ajv/dist/2020.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type SchemaKind = "spec" | "variants" | "organism" | "screen" | "block" | "composed" | "app" | "collection" | "dictionary" | "preset";

const dir = join(import.meta.dir, "..", "schemas");
export const schemaFiles = (): string[] => readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
export const schemaPath = (kind: SchemaKind): string => join(dir, `${kind}.schema.json`);

const ajv = new Ajv2020({ allErrors: true, strict: false });
const compiled = new Map<SchemaKind, ReturnType<typeof ajv.compile>>();

/** error lines (empty when valid) */
export function validate(kind: SchemaKind, data: unknown): string[] {
  let fn = compiled.get(kind);
  if (!fn) {
    fn = ajv.compile(JSON.parse(readFileSync(schemaPath(kind), "utf8")));
    compiled.set(kind, fn);
  }
  if (fn(data)) return [];
  return (fn.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}${e.params && "allowedValues" in e.params ? ` (${(e.params.allowedValues as unknown[]).join("|")})` : ""}`).slice(0, 12);
}
export * from "./versions";
export * from "./paths";
