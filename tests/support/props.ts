/**
 * Test support: translate canonical (PascalCase) showcase props into each
 * runtime's prop shape, mirroring the documented naming conventions.
 */

import type { BrickDef, PartDef, PropDef } from "../../src/domain/model";
export type { BrickDef };
import { htmlPropName, localIdent, reactPropName } from "../../src/domain/naming";

export type CanonicalProps = Record<string, unknown>;

function itemsToRuntime(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
      out[localIdent(k)] = v;
    }
    return out;
  });
}

function splitProps(part: PartDef, canonical: CanonicalProps) {
  const declared: Array<[PropDef, unknown]> = [];
  const passthrough: Array<[PropDef, unknown]> = [];
  for (const [name, value] of Object.entries(canonical)) {
    const def = part.props.find((p) => p.name === name);
    if (!def) continue; // unknown/deprecated showcase props are dropped
    if (def.passthrough) passthrough.push([def, value]);
    else declared.push([def, value]);
  }
  return { declared, passthrough };
}

/**
 * Filter canonical props down to the ones the part actually declares.
 * Showcase fixtures are brick-wide; multi-part bricks share one fixture file,
 * so cva values that don't exist in this part's recipe mark the case as not
 * applicable (returns undefined).
 */
export function knownCanonicalProps(
  brick: BrickDef,
  part: PartDef,
  canonical: CanonicalProps
): CanonicalProps | undefined {
  const out: CanonicalProps = {};
  for (const [name, value] of Object.entries(canonical)) {
    const def = part.props.find((p) => p.name === name);
    if (!def) continue;
    if (def.cva) {
      const recipe = part.recipeId ? brick.recipes[part.recipeId] : undefined;
      const key = def.cvaKey ?? def.name.toLowerCase();
      const choices = recipe?.byKey[key] ?? {};
      if (typeof value === "string" && value !== "" && choices[value] === undefined) {
        return undefined;
      }
    }
    out[name] = value;
  }
  return out;
}

export function reactProps(part: PartDef, canonical: CanonicalProps): Record<string, unknown> {
  const { declared, passthrough } = splitProps(part, canonical);
  const out: Record<string, unknown> = {};
  for (const [def, value] of declared) {
    if (def.name === "Class") out["className"] = value;
    else if (def.type === "items") out[reactPropName(def)] = itemsToRuntime(value);
    else out[reactPropName(def)] = value;
  }
  // Passthrough props arrive as native DOM attributes through rest.
  for (const [def, value] of passthrough) out[htmlPropName(def)] = value;
  return out;
}

/** Svelte and Vue share HTML-native prop naming. */
export function htmlRuntimeProps(part: PartDef, canonical: CanonicalProps): Record<string, unknown> {
  const { declared, passthrough } = splitProps(part, canonical);
  const out: Record<string, unknown> = {};
  for (const [def, value] of declared) {
    if (def.name === "Class") out["class"] = value;
    else if (def.type === "items") out[htmlPropName(def)] = itemsToRuntime(value);
    else out[htmlPropName(def)] = value;
  }
  for (const [def, value] of passthrough) out[htmlPropName(def)] = value;
  return out;
}

/** Vue converts kebab-case attrs to camelCase declared props automatically,
 * so declared props use camelCase while passthrough stays kebab. */
export function vueProps(part: PartDef, canonical: CanonicalProps): Record<string, unknown> {
  const { declared, passthrough } = splitProps(part, canonical);
  const out: Record<string, unknown> = {};
  for (const [def, value] of declared) {
    if (def.name === "Class") out["class"] = value;
    else if (def.type === "items") out[localIdent(def.name)] = itemsToRuntime(value);
    else out[localIdent(def.name)] = value;
  }
  for (const [def, value] of passthrough) out[htmlPropName(def)] = value;
  return out;
}

export function hasChildren(part: PartDef): boolean {
  return part.props.some((p) => p.type === "children");
}

export function mainPart(brick: BrickDef): PartDef {
  return brick.parts[0]!;
}
