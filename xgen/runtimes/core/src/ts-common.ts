/**
 * Shared analysis for the TypeScript runtimes (React, Svelte): declared props, the variant tables printed at the top
 * of each component (shadcn style) and the inline classes expression of a part.
 */

import { walkExpr, type Expr } from "@ui8kit/xgen-spec";
import {
  type BrickDef,
  type ClassSpec,
  type PartDef,
  type PropDef,
} from "@ui8kit/xgen-spec";
import { htmlPropName, localIdent, reactPropName } from "@ui8kit/xgen-spec";
import { exprType, indent, pascalCase, type TypeEnv } from "./common";
import { printTsExpr, type TsPrintCtx } from "./ts-expr";
import { isEmptyRecipe, printClassString, printVariantTable, variantsName } from "./variant-table";

// ---------------------------------------------------------------------------
// Declared props
// ---------------------------------------------------------------------------

export interface DeclaredProp {
  def: PropDef;
  /** React prop name (camelCase / className / aria-*). */
  reactName: string;
  /** Svelte/Vue prop name (HTML-native). */
  htmlName: string;
  /** Safe local identifier in generated code. */
  local: string;
  /** TS type reference. */
  tsType: string;
}

/**
 * Props that appear in TS runtime signatures (passthrough flows via rest;
 * `Class` is handled uniformly by each runtime: `className` in React,
 * `class` in Svelte, the class attr in Vue).
 */
export function declaredProps(brick: BrickDef, part: PartDef): DeclaredProp[] {
  return part.props
    .filter(
      (p) => p.type !== "attrs" && p.type !== "children" && !p.passthrough && p.name !== "Class"
    )
    .map((p) => ({
      def: p,
      reactName: reactPropName(p),
      htmlName: htmlPropName(p),
      local: localIdent(p.name),
      tsType: tsTypeOf(brick, part, p),
    }));
}

export function variantTypeName(part: PartDef, cvaKey: string): string {
  return part.name + pascalCase(cvaKey);
}

export function tsTypeOf(brick: BrickDef, part: PartDef, p: PropDef): string {
  if (p.cva) return variantTypeName(part, p.cvaKey ?? p.name.toLowerCase());
  switch (p.type) {
    case "string":
      return p.enumValues ? p.enumValues.map((v) => JSON.stringify(v)).join(" | ") : "string";
    case "bool":
      return "boolean";
    case "int":
      return p.enumValues ? p.enumValues.join(" | ") : "number";
    case "items":
      return `${p.itemsOf}[]`;
    default:
      throw new Error(`${part.name}.${p.name}: type ${p.type} has no TS representation`);
  }
}

/** Canonical prop names referenced by a class spec (excluding Class). */
export function classSpecProps(spec: ClassSpec): string[] {
  const names = new Set<string>();
  const fromExpr = (e: Expr) =>
    walkExpr(e, (x) => {
      if (x.kind === "prop") names.add(x.name);
    });
  for (const source of Object.values(spec.recipe ?? {})) {
    if (typeof source === "string") names.add(source);
    else fromExpr(source);
  }
  for (const e of spec.extra ?? []) fromExpr(e);
  for (const st of spec.state ?? []) fromExpr(st.test);
  names.delete("Class");
  return [...names];
}

/**
 * Print an inline ClassSpec as a `cn(...)` expression (used for non-root
 * class attrs, e.g. per-item classes inside loops).
 */
export function printInlineClassSpec(
  spec: ClassSpec,
  ctx: TsPrintCtx,
  classPropCode: () => string | undefined
): string {
  const args: string[] = [];
  if (spec.recipe) {
    throw new Error("inline class specs with recipes are not supported; use the part classes contract");
  }
  if (spec.staticBase) args.push(JSON.stringify(spec.staticBase));
  for (const e of spec.extra ?? []) args.push(printTsExpr(e, ctx));
  for (const st of spec.state ?? []) {
    args.push(`(${printTsExpr(st.test, ctx)} ? ${JSON.stringify(st.classes)} : "")`);
  }
  if (spec.includeClassProp !== false) {
    const cp = classPropCode();
    if (cp) args.push(cp);
  }
  return `cn(${args.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Variant tables at the top of a component (shadcn style)
// ---------------------------------------------------------------------------

/** the part whose file holds the variant table of a recipe: the first part that uses it */
export function recipeOwner(brick: BrickDef, recipeId: string): PartDef {
  return brick.parts.find((p) => p.recipeId === recipeId || p.classes?.recipeId === recipeId) ?? brick.parts[0]!;
}

/** recipes a part reads (for its prop types and its classes) */
function recipesOf(part: PartDef): string[] {
  const ids = new Set<string>();
  if (part.recipeId && (part.props.some((p) => p.cva) || part.classes?.recipe)) ids.add(part.recipeId);
  if (part.classes?.recipe) ids.add(part.classes.recipeId ?? part.recipeId!);
  return [...ids];
}

export type PartHead = {
  /** code at the top of the part: owned variant tables, record types, variant value types */
  code: string[];
  /** names to import from a sibling part of the same brick: part name -> names */
  fromSibling: Map<string, { values: Set<string>; types: Set<string> }>;
  /** utils the head needs */
  usesVariants: boolean;
  usesVariantKey: boolean;
};

/**
 * The top of one part: the variant tables it owns, the record types (first part of the brick), and the value types
 * of its variant props (`type BadgeSize = VariantKey<typeof badgeVariants, "size">`).
 */
export function partHead(brick: BrickDef, part: PartDef): PartHead {
  const head: PartHead = { code: [], fromSibling: new Map(), usesVariants: false, usesVariantKey: false };
  const sibling = (owner: PartDef) => {
    if (!head.fromSibling.has(owner.name)) head.fromSibling.set(owner.name, { values: new Set(), types: new Set() });
    return head.fromSibling.get(owner.name)!;
  };
  for (const id of Object.keys(brick.recipes)) {
    if (recipeOwner(brick, id) !== part || isEmptyRecipe(brick.recipes[id]!)) continue;
    head.usesVariants = true;
    head.code.push(`/** ${part.name}: the classes of each value of each prop (shadcn/cva style). */`);
    head.code.push(printVariantTable(variantsName(id), brick.recipes[id]!), ``);
  }
  for (const id of recipesOf(part)) if (recipeOwner(brick, id) !== part && !isEmptyRecipe(brick.recipes[id]!)) sibling(recipeOwner(brick, id)).values.add(variantsName(id));
  const first = brick.parts[0]!;
  for (const record of brick.recordTypes ?? []) {
    if (part === first) {
      const fields = record.fields.map((f) => `  ${localIdent(f.name)}${f.type === "string" ? "?: string" : "?: boolean"};`);
      head.code.push(`export type ${record.name} = {\n${fields.join("\n")}\n};`, ``);
    } else if (part.props.some((p) => p.type === "items" && p.itemsOf === record.name)) sibling(first).types.add(record.name);
  }
  const seen = new Set<string>();
  for (const d of declaredProps(brick, part)) {
    if (!d.def.cva) continue;
    const k = d.def.cvaKey ?? d.def.name.toLowerCase();
    const typeName = variantTypeName(part, k);
    if (seen.has(typeName)) continue;
    seen.add(typeName);
    head.usesVariantKey = true;
    head.code.push(`export type ${typeName} = VariantKey<typeof ${variantsName(part.recipeId!)}, ${JSON.stringify(k)}>;`);
  }
  if (seen.size) head.code.push(``);
  return head;
}

/**
 * The classes of a part as one inline expression:
 * `cn(badgeVariants({ size, variant }), "static classes", state ? "on" : "", className)`.
 */
export function classesExpr(brick: BrickDef, part: PartDef, ctx: TsPrintCtx): { expr: string; usesVariantKey: boolean } {
  const spec = part.classes!;
  const args: string[] = [];
  let usesVariantKey = false;
  const recipeId = spec.recipeId ?? part.recipeId;
  if (spec.recipe && recipeId && !isEmptyRecipe(brick.recipes[recipeId]!)) {
    const fn = variantsName(spec.recipeId ?? part.recipeId!);
    const selection = Object.entries(spec.recipe).map(([k, source]) => {
      if (typeof source === "string") {
        const local = ctx.propCode(source);
        return local === k ? k : `${quoteIfNeeded(k)}: ${local}`;
      }
      usesVariantKey = true;
      return `${quoteIfNeeded(k)}: ${printTsExpr(source, ctx)} as VariantKey<typeof ${fn}, ${JSON.stringify(k)}>`;
    });
    args.push(selection.length ? `${fn}({ ${selection.join(", ")} })` : `${fn}()`);
  }
  if (spec.staticBase) args.push(printClassString(spec.staticBase, "  "));
  for (const e of spec.extra ?? []) args.push(wrapLookup(printTsExpr(e, ctx)));
  for (const st of spec.state ?? []) args.push(`(${printTsExpr(st.test, ctx)} ? ${JSON.stringify(st.classes)} : "")`);
  if (spec.includeClassProp !== false) args.push(ctx.propCode("Class"));
  const one = `cn(${args.join(", ")})`;
  // a long expression: one argument per line, like a formatter would print it
  if (one.length <= 100 && !one.includes("\n")) return { expr: one, usesVariantKey };
  return { expr: `cn(\n${args.map((a) => indent(a, 1)).join(",\n")}\n)`, usesVariantKey };
}

/**
 * True when an attr is a plain conditional forward of a passthrough prop —
 * TS runtimes skip it because rest props deliver the identical attribute.
 */
export function isPassthroughForward(
  attr: { kind: string; expr?: Expr; when?: Expr },
  part: PartDef
): boolean {
  if (attr.kind !== "expr" || !attr.expr || attr.when) return false;
  if (attr.expr.kind !== "prop") return false;
  const p = part.props.find((x) => x.name === (attr.expr as { name: string }).name);
  return p?.passthrough === true;
}

/**
 * A long lookup expression (`mapOr(cols, { "1": "grid-cols-1", ... }, "")`): the entries of its object literal go
 * on their own lines, a few per line, so no line runs past the readability width.
 */
export function wrapLookup(code: string, width = 110): string {
  if (code.length <= width) return code;
  const open = code.indexOf("{ ");
  if (open < 0) return code;
  let depth = 0;
  let quoted = false;
  const cuts: number[] = [];
  let close = -1;
  for (let i = open; i < code.length; i++) {
    const c = code[i]!;
    if (c === '"' && code[i - 1] !== "\\") quoted = !quoted;
    if (quoted) continue;
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) { close = i; break; }
    if (c === "," && depth === 1) cuts.push(i);
  }
  if (close < 0) return code;
  const entries: string[] = [];
  let from = open + 1;
  for (const cut of [...cuts, close]) { entries.push(code.slice(from, cut).trim()); from = cut + 1; }
  const rows: string[] = [];
  for (const e of entries.filter(Boolean)) {
    const last = rows[rows.length - 1];
    if (last !== undefined && last.length + e.length + 2 <= width - 10) rows[rows.length - 1] = `${last} ${e},`;
    else rows.push(`${e},`);
  }
  return `${code.slice(0, open)}{\n${rows.map((r) => `  ${r}`).join("\n")}\n}${code.slice(close + 1)}`;
}

export function quoteIfNeeded(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** True when a string-typed expression can never print empty (attr always kept). */
export function neverEmptyString(expr: Expr, env: TypeEnv): boolean {
  switch (expr.kind) {
    case "lit":
      return typeof expr.value === "string" ? expr.value !== "" : true;
    case "defaultIfEmpty":
      return expr.fallback !== "";
    case "mapOr":
      return expr.fallback !== "" && Object.values(expr.mapping).every((v) => v !== "");
    case "intMapOr":
      return expr.fallback !== "" && Object.values(expr.mapping).every((v) => v !== "");
    case "boolToString":
    case "intToString":
    case "resolvedTag":
      return true;
    case "cond":
      return neverEmptyString(expr.then, env) && neverEmptyString(expr.else, env);
    default:
      return exprType(expr, env) === "bool" || exprType(expr, env) === "int" ? false : false;
  }
}
