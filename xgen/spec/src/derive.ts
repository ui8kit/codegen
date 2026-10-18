// Contract metadata derived from the render tree and the recipes: slots, a11y, data attributes, tokens.
// The importer writes it into the spec; `xgen check` derives it again and fails when the spec drifted from its own render tree.
import type { Node, PartDef, TagSpec, AttrSpec } from "./domain/model";
import { walkNodes } from "./domain/model";
import type { VariantRecipe } from "./domain/recipe";
import type { A11yInfo, DataAttr, SlotInfo } from "./spec-file";

const tagNames = (t: TagSpec): string[] => (t.kind === "static" ? [t.tag] : t.kind === "heading" ? ["h1", "h2", "h3", "h4", "h5", "h6"] : t.kind === "mapped" ? t.tags : [t.fallback, `(${t.group})`]);

function rootTags(n: Node): string[] {
  if (n.kind === "element") return tagNames(n.tag);
  if (n.kind === "when") return [...n.then, ...(n.else ?? [])].flatMap(rootTags);
  return [];
}

function attrsOf(part: PartDef): AttrSpec[] {
  const out: AttrSpec[] = [];
  walkNodes(part.render, (n) => { if (n.kind === "element") out.push(...n.attrs); });
  return out;
}

const attrKind = (a: AttrSpec): "static" | "expr" | "bool" | undefined => (a.kind === "static" ? "static" : a.kind === "expr" ? "expr" : a.kind === "bool" ? "bool" : undefined);
const attrName = (a: AttrSpec): string | undefined => (a.kind === "static" || a.kind === "expr" || a.kind === "bool" ? a.name : undefined);

export function deriveSlots(part: PartDef): SlotInfo[] {
  let slot = false;
  walkNodes(part.render, (n) => { if (n.kind === "slot") slot = true; });
  return slot || part.props.some((p) => p.type === "children") ? [{ name: "children" }] : [];
}

export function deriveA11y(part: PartDef): A11yInfo {
  const aria: A11yInfo["aria"] = [];
  const roles = new Set<string>();
  for (const a of attrsOf(part)) {
    const name = attrName(a);
    const kind = attrKind(a);
    if (!name || !kind || !(name === "role" || name.startsWith("aria-") || name === "tabindex")) continue;
    const value = a.kind === "static" ? a.value : undefined;
    if (name === "role" && value) roles.add(value);
    if (!aria.some((x) => x.name === name && x.kind === kind && x.value === value)) aria.push({ name, kind, ...(value !== undefined ? { value } : {}) });
  }
  return { roots: [...new Set(rootTags(part.render))], roles: [...roles].sort(), aria: aria.sort((a, b) => a.name.localeCompare(b.name)), keyboard: [] };
}

export function deriveData(part: PartDef): DataAttr[] {
  const out: DataAttr[] = [];
  for (const a of attrsOf(part)) {
    const name = attrName(a);
    const kind = attrKind(a);
    if (name && kind && name.startsWith("data-")) out.push({ name, kind, ...(a.kind === "static" ? { value: a.value } : {}) });
  }
  return out;
}

/** theme tokens used by the classes of the recipes of a part (color utilities only) */
export function deriveTokens(recipes: VariantRecipe[], tokenNames: string[]): string[] {
  const classes = recipes.flatMap((r) => [r.base, ...Object.values(r.byKey).flatMap((m) => Object.values(m)), ...(r.compound ?? []).map((c) => c.class)]).join(" ");
  const names = [...tokenNames].sort((a, b) => b.length - a.length);
  const used = new Set<string>();
  const re = new RegExp(`(?:^|[\\s:!\\[(&>_-])(?:bg|text|border|ring|inset-ring|outline|fill|stroke|divide|placeholder|caret|accent|decoration|from|via|to)-(${names.map((n) => n.replace(/[-]/g, "\\-")).join("|")})(?:/\\d+)?(?=$|[\\s\\]):])`, "g");
  for (const m of classes.matchAll(re)) used.add(`--${m[1]}`);
  return [...used].sort();
}
