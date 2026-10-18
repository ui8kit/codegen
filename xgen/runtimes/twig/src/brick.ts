// Twig output of the bricks: one include template per part (ui/<dir>/<part>.html.twig) taking `p` (the props by their
// canonical PascalCase names, as the Go structs have them) and `children` (markup). The class contract is the shared
// *.variants.json recipe read by ui_compose, so all static runtimes compose the same classes.
import { allowedTags, type AttrSpec, type BrickDef, type ClassSpec, type ElementNode, type Expr, type Node, type PartDef } from "@ui8kit/xgen-spec";
import { BANNER, exprType, makeEnv, neverEmptyString, type GeneratedFile, type TypeEnv } from "@ui8kit/xgen-runtime-core";
import { twig, type Dialect } from "./dialect";

/** CardHeader -> card-header */
export const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
/** the template of a part, relative to the package root */
export const partTemplate = (brick: BrickDef, part: PartDef, d: Dialect = twig): string => `ui/${brick.dir}/${kebab(part.name)}${d.ext}`;

const pad = (lines: string[], n = 1): string[] => lines.map((l) => (l ? `${"  ".repeat(n)}${l}` : l));

interface Ctx { brick: BrickDef; part: PartDef; env: TypeEnv; d: Dialect; tag?: string; tags: number }

const ZERO: Record<string, string> = { string: "''", bool: "false", int: "0", items: "[]" };

/** an IR expression in the dialect */
export function printExpr(e: Expr, c: Ctx): string {
  const d = c.d;
  const p = (x: Expr): string => printExpr(x, c);
  switch (e.kind) {
    case "lit": return typeof e.value === "string" ? d.str(e.value) : String(e.value);
    case "prop": {
      const def = c.part.props.find((x) => x.name === e.name)!;
      return d.orNull(d.field(d.v("p"), e.name), def.type === "attrs" ? d.emptyHash : ZERO[def.type] ?? d.nul);
    }
    case "item": {
      const f = c.env.itemRecord?.fields.find((x) => x.name === e.field);
      return `ui_field(${d.v("item")}, ${d.str(e.field)}, ${f?.type === "bool" ? "false" : "''"})`;
    }
    case "derivedRef": return d.v(`d_${e.name}`);
    case "resolvedTag": {
      if (!c.tag) throw new Error(`${c.part.name}: resolvedTag outside a dynamic tag`);
      return d.v(c.tag);
    }
    case "defaultIfEmpty": return `ui_default_if_empty(${p(e.expr)}, ${d.str(e.fallback)})`;
    case "mapOr": return `ui_map_or(${p(e.expr)}, ${d.hash(Object.entries(e.mapping).map(([k, v]) => [k, d.str(v)]))}, ${d.str(e.fallback)}${e.lower ? ", true" : ""})`;
    case "intMapOr": return `ui_int_map_or(${p(e.expr)}, ${d.intHash(Object.entries(e.mapping).map(([k, v]): [string, string] => [k, d.str(v)]))}, ${d.str(e.fallback)})`;
    case "cond": return d.ternary(p(e.test), p(e.then), p(e.else));
    case "eq": return `ui_eq(${p(e.left)}, ${p(e.right)})`;
    case "and": return `(${e.exprs.map(p).join(` ${d.and} `)})`;
    case "or": return `(${e.exprs.map(p).join(` ${d.or} `)})`;
    case "not": return d.not(p(e.expr));
    case "isSet": {
      const t = exprType(e.expr, c.env);
      if (t === "string") return `ui_is_set_str(${p(e.expr)})`;
      if (t === "int") return `(${p(e.expr)} > 0)`;
      return p(e.expr);
    }
    case "contains": return d.contains(p(e.expr), d.str(e.substring));
    case "concat": return `ui_concat_trim(${d.list(e.parts.map(p))})`;
    case "boolToString": return `ui_bool_str(${p(e.expr)})`;
    case "intToString": return `ui_s(${p(e.expr)})`;
  }
}

/** the class attribute value of a spec: the recipe through ui_compose, else ui_cn over the fragments */
function classValue(spec: ClassSpec, c: Ctx): string {
  const d = c.d;
  const tail: string[] = [];
  if (spec.staticBase) tail.push(d.str(spec.staticBase));
  for (const e of spec.extra ?? []) tail.push(printExpr(e, c));
  for (const st of spec.state ?? []) tail.push(d.ternary(printExpr(st.test, c), d.str(st.classes), "''"));
  if (spec.includeClassProp !== false && c.part.props.some((p) => p.name === "Class")) tail.push(d.orNull(d.field(d.v("p"), "Class"), "''"));
  if (spec.recipe) {
    const id = spec.recipeId ?? c.part.recipeId!;
    const file = c.brick.recipeFiles[id];
    if (!file) throw new Error(`${c.part.name}: recipe ${id} has no file`);
    const sel = Object.entries(spec.recipe).map(([k, src]): [string, string] => [k, typeof src === "string" ? d.orNull(d.field(d.v("p"), src), "''") : printExpr(src, c)]);
    return `ui_compose(${d.str(`ui/${c.brick.dir}/${file}`)}, ${d.hash(sel)}, ${d.list(tail)})`;
  }
  return `ui_cn(${d.list(tail)})`;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function attr(a: AttrSpec, c: Ctx): string {
  const d = c.d;
  switch (a.kind) {
    case "static": return ` ${a.name}="${esc(a.value)}"`;
    case "expr": {
      const v = printExpr(a.expr, c);
      const t = exprType(a.expr, c.env);
      const set = a.expr.kind === "lit" ? ` ${a.name}="${esc(String(a.expr.value))}"` : ` ${a.name}="${d.attrOut ? d.attrOut(a.name, v) : d.out(v)}"`;
      if (a.when) return `${d.if(printExpr(a.when, c))}${set}${d.endif}`;
      if (a.keepEmpty || t !== "string" || neverEmptyString(a.expr, c.env)) return set;
      return `${d.if(`ui_is_set_str(${v})`)}${set}${d.endif}`;
    }
    case "bool": return `${d.if(printExpr(a.expr, c))} ${a.name}${d.endif}`;
    case "class": {
      const spec = a.spec ? { ...a.spec, includeClassProp: false } : c.part.classes;
      if (!spec) throw new Error(`${c.part.name}: class attribute without a contract`);
      return ` class="${d.out(classValue(spec, c))}"`;
    }
    case "rest": return d.out(`ui_attr_html(${d.orNull(d.field(d.v("p"), "Attrs"), d.emptyHash)})`);
  }
}

function element(n: ElementNode, c: Ctx): string[] {
  const d = c.d;
  const pre: string[] = [];
  let tag: string;
  let tagCode: string | undefined;
  let close: string | undefined;
  if (n.tag.kind === "static") tag = n.tag.tag;
  else {
    tagCode = `tag${++c.tags}`;
    const value = n.tag.kind === "resolved"
      ? `ui_resolve_tag(${d.orNull(d.field(d.v("p"), n.tag.fromProp), "''")}, ${d.str(n.tag.fallback)}, ${d.list(allowedTags(n.tag.group).map(d.str))})`
      : n.tag.kind === "heading"
        ? `ui_title_tag(${d.orNull(d.field(d.v("p"), n.tag.fromProp), "0")})`
        : `ui_map_or(${printExpr(n.tag.expr, c)}, ${d.hash(n.tag.tags.map((t) => [t, d.str(t)]))}, ${d.str(n.tag.tags[n.tag.tags.length - 1]!)})`;
    pre.push(d.set(tagCode, value));
    tag = d.out(d.v(tagCode));
    if (d.dynamicTag) {
      const name = n.tag.kind === "resolved" ? n.tag.fallback : n.tag.kind === "heading" ? "h2" : n.tag.tags[n.tag.tags.length - 1]!;
      [tag, close] = [d.dynamicTag(name, d.v(tagCode)), name];
    }
  }
  const outer = c.tag;
  if (tagCode) c.tag = tagCode;
  try {
    const attrs = n.attrs.map((a) => attr(a, c));
    const open = attrs.length <= 2 && attrs.join("").length < 100 ? [`<${tag}${attrs.join("")}>`] : [`<${tag}`, ...pad(attrs.map((a) => a.trimStart())), ">"];
    if (n.void) return [...pre, ...open];
    const inline = n.children.every((k) => k.kind === "text" || k.kind === "slot");
    if (inline) {
      const body = n.children.map((k) => nodes([k], c).join("")).join("");
      const last = open.pop()!;
      return [...pre, ...open, `${last}${body}</${close ?? tag}>`];
    }
    return [...pre, ...open, ...pad(nodes(n.children, c)), `</${close ?? tag}>`];
  } finally {
    c.tag = outer;
  }
}

function nodes(list: Node[], c: Ctx): string[] {
  const d = c.d;
  return list.flatMap((n): string[] => {
    switch (n.kind) {
      case "element": return element(n, c);
      case "slot": return [d.raw(d.orNull(d.v("children"), "''"))];
      case "text": return [d.out(printExpr(n.expr, c))];
      case "when": {
        const out = [d.if(printExpr(n.test, c)), ...pad(nodes(n.then, c))];
        let other = n.else;
        while (other && other.length === 1 && other[0]!.kind === "when") {
          const w = other[0]!;
          out.push(d.elseif(printExpr(w.test, c)), ...pad(nodes(w.then, c)));
          other = w.else;
        }
        if (other?.length) out.push(d.else, ...pad(nodes(other, c)));
        return [...out, d.endif];
      }
      case "forEach": return [d.forIn("item", d.orNull(d.field(d.v("p"), n.itemsProp), "[]")), ...pad(nodes(n.body, c)), d.endfor];
    }
  });
}

/** the header comment of a generated template: the banner, its source and the docs */
export function header(d: Dialect, source: string, docs: string): string {
  return d.comment([BANNER, `Source: ${source}`, "", ...docs.split("\n")].join("\n    ").replace(/\s+\n/g, "\n"));
}

export function emitTwigBrick(brick: BrickDef, source: string, d: Dialect = twig): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  for (const part of brick.parts) {
    const c: Ctx = { brick, part, env: makeEnv(brick, part), d, tags: 0 };
    const props = part.props.filter((p) => p.type !== "children").map((p) => `${p.name} (${p.type === "items" ? `${p.itemsOf}[]` : p.type})`).join(", ");
    const lines = [header(d, source, `${part.name}: ${part.docs}\nProps (p): ${props || "none"}${part.props.some((p) => p.type === "children") ? "; children: markup" : ""}.`)];
    for (const [name, e] of Object.entries(part.derived ?? {})) lines.push(d.set(`d_${name}`, printExpr(e, c)));
    lines.push(...nodes([part.render], c));
    files.push({ path: partTemplate(brick, part, d), contents: lines.join("\n") + "\n" });
  }
  for (const [id, file] of Object.entries(brick.recipeFiles)) {
    files.push({ path: `ui/${brick.dir}/${file}`, contents: JSON.stringify({ "//": BANNER, ...(brick.recipes[id] as object) }, null, 2) + "\n" });
  }
  return files;
}
