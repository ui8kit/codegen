/**
 * Jinja2 emitter — one `jinja2/ui/<brick>/<part>.html.j2` per part, rendered
 * with `p` (canonical PascalCase props) and `children` (trusted markup), plus
 * `jinja2/ui8kit_jinja/classes.py` with one `<name>_classes(p)` global per
 * part. Output lives under `generated/jinja2/` (see `jinja2SupportFiles`).
 *
 * Design (ported from the xgen Jinja2 package, tag xgen-archive-2026-10-23):
 * attributes are omitted exactly where the canonical renderer omits them
 * (`{%- if … %} attr="…"{%- endif %}`), dynamic tags print `<{{ tag }}>` from
 * `ui_resolve_tag`, children are `{{ children|safe }}` (repeated in every
 * branch — trusted HTML, never user input), items props loop with
 * `{% for item in … %}`. There is no asChild/Slot in Jinja2: the
 * `<name>_classes(p)` global is the escape hatch.
 */

import { isPassthroughForward } from "../domain/passthrough";
import type { Expr } from "../domain/expr";
import {
  type AttrSpec,
  type BrickDef,
  type ClassSpec,
  type ElementNode,
  type Node,
  type PartDef,
} from "../domain/model";
import { allowedTags, VOID_TAGS } from "../domain/tags";
import { BANNER, exprType, indent, makeEnv, type Emitter, type GeneratedFile, type TypeEnv } from "./common";
import { neverEmptyString } from "./ts-common";

export const JINJA2_REQUIREMENT = "Jinja2>=3.1,<4";

const ind = (s: string) => indent(s, 1, "  ");
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const snake = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/** Template path of a part, relative to `generated/jinja2/`. */
export const jinjaTemplateOf = (brick: BrickDef, part: PartDef) => `ui/${brick.dir}/${kebab(part.name)}.html.j2`;
/** Name of the classes global of a part (`ButtonPlain` → `button_plain_classes`). */
export const jinjaClassesOf = (part: PartDef) => `${snake(part.name)}_classes`;

/** Jinja string literal (single quotes, escaped). */
const str = (v: string) => `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
const escAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Ctx {
  env: TypeEnv;
  brick: BrickDef;
  part: PartDef;
  /** Jinja variable holding the resolved tag of the closest dynamic element. */
  tagVar?: string;
  counter: { n: number };
}

function zeroOf(part: PartDef, name: string): string {
  const p = part.props.find((x) => x.name === name)!;
  if (p.default !== undefined) return typeof p.default === "string" ? str(p.default) : String(p.default);
  switch (p.type) {
    case "string":
      return "''";
    case "bool":
      return "false";
    case "int":
      return "0";
    case "items":
      return "[]";
    case "attrs":
      return "{}";
    default:
      return "''";
  }
}

function itemZero(ctx: Ctx, field: string): string {
  for (const r of ctx.brick.recordTypes ?? []) {
    const f = r.fields.find((x) => x.name === field);
    if (f) return f.type === "bool" ? "false" : "''";
  }
  return "''";
}

const propCode = (ctx: Ctx, name: string) => `ui_def(p[${str(name)}], ${zeroOf(ctx.part, name)})`;

export function printJinjaExpr(expr: Expr, ctx: Ctx): string {
  const p = (e: Expr) => printJinjaExpr(e, ctx);
  switch (expr.kind) {
    case "lit":
      return typeof expr.value === "string" ? str(expr.value) : typeof expr.value === "boolean" ? String(expr.value) : String(expr.value);
    case "prop":
      return propCode(ctx, expr.name);
    case "item":
      return `ui_field(item, ${str(expr.field)}, ${itemZero(ctx, expr.field)})`;
    case "derivedRef": {
      const d = ctx.part.derived?.[expr.name];
      if (!d) throw new Error(`${ctx.part.name}: unknown derived ${expr.name}`);
      return `(${p(d)})`;
    }
    case "resolvedTag":
      if (!ctx.tagVar) throw new Error(`${ctx.part.name}: resolvedTag outside a dynamic element`);
      return ctx.tagVar;
    case "defaultIfEmpty":
      return `ui_default_if_empty(${p(expr.expr)}, ${str(expr.fallback)})`;
    case "mapOr": {
      const entries = Object.entries(expr.mapping).map(([k, v]) => `${str(k)}: ${str(v)}`).join(", ");
      return `ui_map_or(${p(expr.expr)}, {${entries}}, ${str(expr.fallback)}${expr.lower ? ", true" : ""})`;
    }
    case "intMapOr": {
      const entries = Object.entries(expr.mapping).map(([k, v]) => `${k}: ${str(v)}`).join(", ");
      return `ui_int_map_or(${p(expr.expr)}, {${entries}}, ${str(expr.fallback)})`;
    }
    case "cond":
      return `(${p(expr.then)} if ${truthyJ(expr.test, ctx)} else ${p(expr.else)})`;
    case "eq":
      return `ui_eq(${p(expr.left)}, ${p(expr.right)})`;
    case "and":
      return `(${expr.exprs.map((e) => truthyJ(e, ctx)).join(" and ")})`;
    case "or":
      return `(${expr.exprs.map((e) => truthyJ(e, ctx)).join(" or ")})`;
    case "not":
      return `(not ${truthyJ(expr.expr, ctx)})`;
    case "isSet":
      return truthyJ(expr.expr, ctx);
    case "contains":
      return `(${str(expr.substring)} in ui_s(${p(expr.expr)}))`;
    case "concat":
      return `ui_concat_trim([${expr.parts.map(p).join(", ")}])`;
    case "boolToString":
      return `ui_bool_str(${truthyJ(expr.expr, ctx)})`;
    case "intToString":
      return `ui_s(${p(expr.expr)})`;
  }
}

/** Canonical truthiness (string: non-blank, int: > 0, bool: itself). */
function truthyJ(expr: Expr, ctx: Ctx): string {
  const t = exprType(expr, ctx.env);
  const code = printJinjaExpr(expr, ctx);
  const plainBool = ["prop", "lit", "eq", "and", "or", "not", "isSet", "contains"];
  if (t === "bool" && plainBool.includes(expr.kind)) return code;
  if (t === "string") return `ui_is_set_str(${code})`;
  return `ui_truthy(${code})`;
}

function stringJ(expr: Expr, ctx: Ctx): string {
  const t = exprType(expr, ctx.env);
  const code = printJinjaExpr(expr, ctx);
  if (t === "int") return `ui_s(${code})`;
  if (t === "bool") return `ui_bool_str(${code})`;
  return code;
}

/** Class merge in the fixed contract order (recipe → static → extra → state → Class). */
function classExpr(spec: ClassSpec, ctx: Ctx): string {
  const tail: string[] = [];
  if (spec.staticBase) tail.push(str(spec.staticBase));
  for (const e of spec.extra ?? []) tail.push(stringJ(e, ctx));
  for (const st of spec.state ?? []) tail.push(`(${str(st.classes)} if ${truthyJ(st.test, ctx)} else '')`);
  if (spec.includeClassProp !== false && ctx.part.props.some((p) => p.name === "Class")) tail.push(propCode(ctx, "Class"));
  if (spec.recipe) {
    const recipeId = spec.recipeId ?? ctx.part.recipeId!;
    const file = ctx.brick.recipeFiles[recipeId];
    if (!file) throw new Error(`${ctx.part.name}: recipe file for ${recipeId} not found`);
    const sel = Object.entries(spec.recipe)
      .map(([key, source]) => `${str(key)}: ${typeof source === "string" ? propCode(ctx, source) : stringJ(source, ctx)}`)
      .join(", ");
    return `ui_compose(${str(`ui/${ctx.brick.dir}/${file}`)}, {${sel}}, [${tail.join(", ")}])`;
  }
  return `ui_cn([${tail.join(", ")}])`;
}

export class Jinja2Emitter implements Emitter {
  readonly runtime = "jinja2" as const;

  emit(brick: BrickDef): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    for (const part of brick.parts) {
      const ctx: Ctx = { env: makeEnv(brick, part), brick, part, counter: { n: 0 } };
      const props = part.props
        .map((p) => `${p.name} (${p.type === "items" ? `${p.itemsOf}[]` : p.type})`)
        .join(", ");
      const header =
        `{#- ${BANNER}\n` +
        `    ${part.name}: ${part.docs.replace(/#}/g, "# }").split("\n").join("\n    ")}\n` +
        `    Props (p): ${props}.\n` +
        (part.props.some((p) => p.type === "children")
          ? `    children: TRUSTED HTML printed with |safe — never pass unescaped user input.\n`
          : "") +
        (part.classes ? `    Classes without rendering: ${jinjaClassesOf(part)}(p) (no asChild in Jinja2). -#}\n` : `-#}\n`);
      files.push({ path: `jinja2/${jinjaTemplateOf(brick, part)}`, contents: header + printNode(part.render, ctx) + "\n" });
    }
    for (const [id, file] of Object.entries(brick.recipeFiles)) {
      files.push({ path: `jinja2/ui/${brick.dir}/${file}`, contents: JSON.stringify(brick.recipes[id], null, 2) + "\n" });
    }
    return files;
  }
}

function printNodes(nodes: Node[], ctx: Ctx): string {
  // Inline: children sit flush against their tags (React SSR parity, exact textarea values).
  return nodes.map((n) => printNode(n, ctx)).join("");
}

function printNode(node: Node, ctx: Ctx): string {
  switch (node.kind) {
    case "element":
      return printElement(node, ctx);
    case "slot":
      return `{{ children|default('', true)|safe }}`;
    case "text":
      return `{{ ${stringJ(node.expr, ctx)} }}`;
    case "when": {
      const out = [`{%- if ${truthyJ(node.test, ctx)} %}`, printNodes(node.then, ctx)];
      let rest = node.else;
      while (rest && rest.length === 1 && rest[0]!.kind === "when") {
        const w = rest[0]!;
        out.push(`{%- elif ${truthyJ(w.test, ctx)} %}`, printNodes(w.then, ctx));
        rest = w.else;
      }
      if (rest && rest.length > 0) out.push(`{%- else %}`, printNodes(rest, ctx));
      out.push(`{%- endif %}`);
      return out.join("");
    }
    case "forEach":
      return `{%- for item in ${propCode(ctx, node.itemsProp)} %}${printNodes(node.body, ctx)}{%- endfor %}`;
  }
}

function printElement(node: ElementNode, ctx: Ctx): string {
  const tag = node.tag;
  if (tag.kind === "static") {
    return printTag(node, tag.tag, node.void === true || VOID_TAGS.has(tag.tag) ? "void" : "normal", ctx);
  }
  const v = `tag${++ctx.counter.n}`;
  let set: string;
  let maybeVoid: boolean;
  if (tag.kind === "resolved") {
    const allowed = allowedTags(tag.group);
    set = `ui_resolve_tag(${propCode(ctx, tag.fromProp)}, ${str(tag.fallback)}, [${allowed.map(str).join(", ")}])`;
    maybeVoid = allowed.some((t) => VOID_TAGS.has(t)) || VOID_TAGS.has(tag.fallback);
  } else {
    set = printJinjaExpr(tag.expr, ctx);
    maybeVoid = tag.tags.some((t) => VOID_TAGS.has(t));
  }
  const inner = { ...ctx, tagVar: v };
  const mode = node.void ? "void" : maybeVoid ? "maybe" : "normal";
  return `{%- set ${v} = ${set} %}${printTag(node, `{{ ${v} }}`, mode, inner)}`;
}

function printTag(node: ElementNode, tag: string, mode: "void" | "normal" | "maybe", ctx: Ctx): string {
  const attrs = node.attrs.map((a) => printAttr(a, ctx)).filter(Boolean);
  const open = attrs.length === 0 ? `<${tag}>` : `<${tag}\n${ind(attrs.join("\n"))}\n>`;
  if (mode === "void") return open;
  const body = printNodes(node.children, ctx);
  const close = `${body}</${tag}>`;
  if (mode === "maybe") return `${open}{%- if not ui_is_void(${ctx.tagVar}) %}${close}{%- endif %}`;
  return `${open}${close}`;
}

function printAttr(attr: AttrSpec, ctx: Ctx): string {
  switch (attr.kind) {
    case "static":
      return `${attr.name}="${escAttr(attr.value)}"`;
    case "expr": {
      if (isPassthroughForward(attr, ctx.part)) {
        // nullable passthrough: unset / None omits, an explicit "" renders attr=""
        const k = (attr.expr as { name: string }).name;
        return `{%- if p['${k}'] is defined and p['${k}'] is not none %} ${attr.name}="{{ p['${k}'] }}"{%- endif %}`;
      }
      const value = stringJ(attr.expr, ctx);
      if (attr.when) {
        if (attr.when.kind === "lit") return attr.when.value ? `${attr.name}="{{ ${value} }}"` : "";
        return `{%- if ${truthyJ(attr.when, ctx)} %} ${attr.name}="{{ ${value} }}"{%- endif %}`;
      }
      if (attr.keepEmpty || exprType(attr.expr, ctx.env) !== "string" || neverEmptyString(attr.expr, ctx.env)) {
        return `${attr.name}="{{ ${value} }}"`;
      }
      return `{%- if ui_is_set_str(${value}) %} ${attr.name}="{{ ${value} }}"{%- endif %}`;
    }
    case "bool":
      if (attr.expr.kind === "lit") return attr.expr.value ? attr.name : "";
      return `{%- if ${truthyJ(attr.expr, ctx)} %} ${attr.name}{%- endif %}`;
    case "liveValue":
      return ""; // DOM property only; initial state is carried by `parentValue` attrs
    case "class": {
      const call = attr.spec ? classExpr(attr.spec, ctx) : `${jinjaClassesOf(ctx.part)}(p)`;
      return `{%- with cls = ${call} %}{%- if cls %} class="{{ cls }}"{%- endif %}{%- endwith %}`;
    }
    case "rest":
      return `{{ ui_attr_html(${propCode(ctx, "Attrs")}) }}`;
  }
}

/** `ui8kit_jinja/classes.py`: the Jinja expression of every part's classes contract. */
export function emitJinjaClasses(bricks: BrickDef[]): GeneratedFile {
  const lines: string[] = [];
  for (const brick of bricks) {
    for (const part of brick.parts) {
      if (!part.classes) continue;
      const ctx: Ctx = { env: makeEnv(brick, part), brick, part, counter: { n: 0 } };
      lines.push(`    ${JSON.stringify(jinjaClassesOf(part))}: ${JSON.stringify(classExpr(part.classes, ctx))},`);
    }
  }
  const contents = `# ${BANNER}
"""Classes contract of every part as a Jinja expression over \`p\`.

\`environment()\` registers each entry as a global \`<name>_classes(p)\` — the
server-composition escape hatch for custom root elements (no asChild in
Jinja2): \`<a class="{{ button_classes({'Variant': 'outline'}) }}" href="/x">\`.
"""

CLASS_EXPRESSIONS = {
${lines.join("\n")}
}
`;
  return { path: "jinja2/ui8kit_jinja/classes.py", contents };
}
