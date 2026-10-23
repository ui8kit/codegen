import type { Expr } from "./expr";
import type { PartDef } from "./model";

/**
 * True when an attr is a plain forward of a passthrough prop (`fwd("value", "Value")`).
 * Passthrough attrs are nullable in every runtime: unset omits the attribute, an explicit "" renders attr="".
 */
export function isPassthroughForward(attr: { kind: string; expr?: Expr; when?: Expr }, part: PartDef): boolean {
  if (attr.kind !== "expr" || !attr.expr || attr.when) return false;
  if (attr.expr.kind !== "prop") return false;
  const p = part.props.find((x) => x.name === (attr.expr as { name: string }).name);
  return p?.passthrough === true;
}

/** Passthrough props (nullable in the server runtimes: PHP/Jinja default null, templ *string). */
export const isPassthroughProp = (part: PartDef, name: string): boolean =>
  part.props.find((x) => x.name === name)?.passthrough === true;
