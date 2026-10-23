/**
 * Prints IR expressions as Go. Non-trivial combinators delegate to the small
 * helpers shipped in the generated `utils` package (`runtime/go/expr.go`).
 */

import type { Expr } from "../domain/expr";
import { exprType, type TypeEnv } from "./common";

export interface GoPrintCtx {
  env: TypeEnv;
  propCode: (name: string) => string; // p.Variant
  itemCode: (field: string) => string; // item.Label
  derivedCode: (name: string) => string; // linkTarget(p)
}

const goString = (value: string): string => JSON.stringify(value);

const isIdentityMapping = (mapping: Record<string, string>): boolean =>
  Object.entries(mapping).every(([k, v]) => k === v);

export function printGoExpr(expr: Expr, ctx: GoPrintCtx): string {
  const p = (e: Expr) => printGoExpr(e, ctx);
  switch (expr.kind) {
    case "lit":
      return typeof expr.value === "string" ? goString(expr.value) : String(expr.value);
    case "prop":
      return ctx.propCode(expr.name);
    case "item":
      return ctx.itemCode(expr.field);
    case "derivedRef":
      return ctx.derivedCode(expr.name);
    case "resolvedTag":
      throw new Error(`${ctx.env.part.name}: resolvedTag must be folded before Go printing`);
    case "defaultIfEmpty":
      return `uiutils.DefaultIfEmpty(${p(expr.expr)}, ${goString(expr.fallback)})`;
    case "mapOr": {
      if (isIdentityMapping(expr.mapping)) {
        const fn = expr.lower ? "OneOfOrLower" : "OneOfOr";
        const allowed = Object.keys(expr.mapping).map(goString).join(", ");
        return `uiutils.${fn}(${p(expr.expr)}, ${goString(expr.fallback)}, ${allowed})`;
      }
      const fn = expr.lower ? "MapOrLower" : "MapOr";
      const entries = Object.entries(expr.mapping)
        .map(([k, v]) => `${goString(k)}: ${goString(v)}`)
        .join(", ");
      return `uiutils.${fn}(${p(expr.expr)}, map[string]string{${entries}}, ${goString(expr.fallback)})`;
    }
    case "intMapOr": {
      const entries = Object.entries(expr.mapping)
        .map(([k, v]) => `${k}: ${goString(v)}`)
        .join(", ");
      return `uiutils.IntMapOr(int(${p(expr.expr)}), map[int]string{${entries}}, ${goString(expr.fallback)})`;
    }
    case "cond":
      return `uiutils.If(${truthyGo(expr.test, ctx)}, ${p(expr.then)}, ${p(expr.else)})`;
    case "eq":
      return `(${p(expr.left)} == ${p(expr.right)})`;
    case "and":
      return `(${expr.exprs.map((e) => truthyGo(e, ctx)).join(" && ")})`;
    case "or":
      return `(${expr.exprs.map((e) => truthyGo(e, ctx)).join(" || ")})`;
    case "not":
      return `!${truthyGo(expr.expr, ctx)}`;
    case "isSet":
      return truthyGo(expr.expr, ctx);
    case "contains":
      return `strings.Contains(${p(expr.expr)}, ${goString(expr.substring)})`;
    case "concat":
      return `uiutils.ConcatTrim(${expr.parts.map(p).join(", ")})`;
    case "boolToString":
      return `uiutils.BoolStr(${truthyGo(expr.expr, ctx)})`;
    case "intToString":
      return `strconv.Itoa(int(${p(expr.expr)}))`;
  }
}

/**
 * Canonical truthiness as a Go bool (string: non-blank, int: > 0, bool: itself),
 * the same rule `truthy()` applies in the canonical renderer.
 */
export function truthyGo(expr: Expr, ctx: GoPrintCtx): string {
  const t = exprType(expr, ctx.env);
  const code = printGoExpr(expr, ctx);
  if (t === "string") return `uiutils.IsSetStr(${code})`;
  if (t === "int") return `(int(${code}) > 0)`;
  return code;
}

/** Go value of an expression printed as an attribute/text string. */
export function stringGo(expr: Expr, ctx: GoPrintCtx): string {
  const t = exprType(expr, ctx.env);
  const code = printGoExpr(expr, ctx);
  if (t === "int") return `strconv.Itoa(int(${code}))`;
  if (t === "bool") return `uiutils.BoolStr(${code})`;
  return code;
}
