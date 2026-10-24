import type { Expr } from "./expr";
import type { PartDef } from "./model";

/**
 * True when an attr is a plain forward of a passthrough prop (`fwd("value", "Value")`).
 * Empty-value rule (3.3.0, as in v0.1.0): a blank optional attribute is omitted in every runtime; only `value`
 * (see `isNullableValue`) is nullable — unset omits it, an explicit "" renders value="".
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

/**
 * `value` is the one nullable passthrough attribute: "" is a real value there (React controlled input,
 * checkbox/radio submit "" instead of "on", `<option value="">` placeholder). Every other optional attribute
 * treats a blank string (empty or whitespace only) as unset and omits it.
 */
export const isNullableValue = (part: PartDef, name: string): boolean =>
  name === "Value" && isPassthroughProp(part, name);

/**
 * HTML names of the optional (passthrough) attributes of an element whose blank value is omitted —
 * from a named prop or from Attrs/rest alike (JS runtimes cannot tell them apart). `value` is excluded.
 */
export function blankOmittedAttrs(attrs: ReadonlyArray<{ kind: string; name?: string; expr?: Expr; when?: Expr }>, part: PartDef): string[] {
  const out: string[] = [];
  for (const a of attrs) {
    if (!isPassthroughForward(a, part)) continue;
    const prop = (a.expr as { name: string }).name;
    if (isNullableValue(part, prop)) continue;
    out.push(a.name!.toLowerCase());
  }
  return out;
}
