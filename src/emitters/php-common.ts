/**
 * Shared core of the two PHP template runtimes (Twig, Latte): parameter
 * naming, one IR expression printer with a per-dialect surface, a
 * structure-only template printer (elements, `when`, `forEach`, dynamic
 * tags), and the PHP support files (Rt/CnMerge copies, generated Tags and
 * Classes helpers, composer.json, parity harness).
 *
 * Ported from the 7-runtime line (commit 972b492: twig.ts, latte.ts,
 * php-*.ts) and the xgen archive (tag xgen-archive-2026-10-23): dynamic tags
 * become one static element per allowed tag with the slot repeated in every
 * branch, items props loop (Select options). There is no asChild: the
 * generated `Classes::<part>Classes(array $props)` helper is the escape hatch.
 */

import type { Expr } from "../domain/expr";
import type { AttrSpec, BrickDef, ClassSpec, ElementNode, Node, PartDef, PropDef } from "../domain/model";
import { camelCase, reactPropName } from "../domain/naming";
import { allowedTags, TAG_GROUPS, VOID_TAGS } from "../domain/tags";
import { BANNER, exprType, foldResolvedTag, lowerFirst, makeEnv, type TypeEnv } from "./common";
import { neverEmptyString } from "./ts-common";

export type PhpRuntime = "twig" | "latte";

/** PHP namespace of each runtime package (distinct, so both can be installed side by side). */
export const PHP_NAMESPACE: Record<PhpRuntime, string> = { twig: "UI8Kit\\Twig", latte: "UI8Kit\\Latte" };
export const PHP_PACKAGES: Record<PhpRuntime, Record<string, string>> = {
  twig: { "twig/twig": "^3.0" },
  latte: { "latte/latte": "^3.0" },
};

/** Template parameter name of a canonical prop (`variant`, `class`, `ariaLabel`, `htmlFor`, `id`). */
export function phpParamName(p: PropDef): string {
  if (p.name === "Class") return "class";
  if (p.name.startsWith("Aria")) return camelCase(p.name);
  return reactPropName(p);
}

/** Record field key inside an items entry (`value`, `label`, `disabled`). */
export const phpItemKey = (field: string): string => camelCase(field);

/** PHP/Twig single-quoted string literal. */
export function phpString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function phpDefault(type: string): string {
  return type === "bool" ? "false" : type === "int" ? "0" : type === "items" || type === "attrs" ? "[]" : "''";
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

type RtFn =
  | "defaultIfEmpty"
  | "oneOfOr"
  | "oneOfOrLower"
  | "mapOr"
  | "mapOrLower"
  | "intMapOr"
  | "concatTrim"
  | "isSetStr"
  | "boolStr"
  | "orNull"
  | "cn"
  | "resolveTag";

export interface Dialect {
  call: (fn: RtFn, args: string[]) => string;
  map: (entries: Array<[string, string]>) => string;
  eq: (a: string, b: string) => string;
  and: (xs: string[]) => string;
  or: (xs: string[]) => string;
  not: (x: string) => string;
  contains: (haystack: string, needle: string) => string;
  intToString: (x: string) => string;
}

export interface PhpCtx {
  env: TypeEnv;
  d: Dialect;
  prop: (name: string) => string;
  item: (field: string) => string;
  derived: (name: string) => string;
}

const isIdentity = (m: Record<string, string>) => Object.entries(m).every(([k, v]) => k === v);
const list = (xs: string[]) => `[${xs.join(", ")}]`;

export function printExpr(expr: Expr, ctx: PhpCtx): string {
  const p = (e: Expr) => printExpr(e, ctx);
  const d = ctx.d;
  switch (expr.kind) {
    case "lit":
      return typeof expr.value === "string" ? phpString(expr.value) : String(expr.value);
    case "prop":
      return ctx.prop(expr.name);
    case "item":
      return ctx.item(expr.field);
    case "derivedRef":
      return ctx.derived(expr.name);
    case "resolvedTag":
      throw new Error(`${ctx.env.part.name}: resolvedTag must be folded before PHP printing`);
    case "defaultIfEmpty":
      return d.call("defaultIfEmpty", [p(expr.expr), phpString(expr.fallback)]);
    case "mapOr": {
      if (isIdentity(expr.mapping)) {
        const allowed = list(Object.keys(expr.mapping).map(phpString));
        return d.call(expr.lower ? "oneOfOrLower" : "oneOfOr", [p(expr.expr), phpString(expr.fallback), allowed]);
      }
      const m = d.map(Object.entries(expr.mapping).map(([k, v]) => [phpString(k), phpString(v)]));
      return d.call(expr.lower ? "mapOrLower" : "mapOr", [p(expr.expr), m, phpString(expr.fallback)]);
    }
    case "intMapOr": {
      const m = d.map(Object.entries(expr.mapping).map(([k, v]) => [k, phpString(v)]));
      return d.call("intMapOr", [p(expr.expr), m, phpString(expr.fallback)]);
    }
    case "cond":
      return `(${truthy(expr.test, ctx)} ? ${p(expr.then)} : ${p(expr.else)})`;
    case "eq":
      return d.eq(p(expr.left), p(expr.right));
    case "and":
      return d.and(expr.exprs.map((e) => truthy(e, ctx)));
    case "or":
      return d.or(expr.exprs.map((e) => truthy(e, ctx)));
    case "not":
      return d.not(truthy(expr.expr, ctx));
    case "isSet":
      return truthy(expr.expr, ctx);
    case "contains":
      return d.contains(p(expr.expr), phpString(expr.substring));
    case "concat":
      return d.call("concatTrim", [list(expr.parts.map(p))]);
    case "boolToString":
      return d.call("boolStr", [truthy(expr.expr, ctx)]);
    case "intToString":
      return d.intToString(p(expr.expr));
  }
}

/** Canonical truthiness (string: non-blank, int: > 0, bool: itself). */
export function truthy(expr: Expr, ctx: PhpCtx): string {
  const t = exprType(expr, ctx.env);
  const code = printExpr(expr, ctx);
  if (t === "string") return ctx.d.call("isSetStr", [code]);
  if (t === "int") return `(${code} > 0)`;
  return code;
}

/** Expression printed as an attribute/text string. */
export function stringOf(expr: Expr, ctx: PhpCtx): string {
  const t = exprType(expr, ctx.env);
  const code = printExpr(expr, ctx);
  if (t === "int") return ctx.d.intToString(code);
  if (t === "bool") return ctx.d.call("boolStr", [code]);
  return code;
}

/** Class merge in the fixed contract order (recipe → static → extra → state → Class). */
export function classTail(part: PartDef, spec: ClassSpec, ctx: PhpCtx): string[] {
  const tail: string[] = [];
  if (spec.staticBase) tail.push(phpString(spec.staticBase));
  for (const e of spec.extra ?? []) tail.push(stringOf(e, ctx));
  for (const st of spec.state ?? []) tail.push(`(${truthy(st.test, ctx)} ? ${phpString(st.classes)} : '')`);
  if (spec.includeClassProp !== false && part.props.some((p) => p.name === "Class")) tail.push(ctx.prop("Class"));
  return tail;
}

// ---------------------------------------------------------------------------
// Template structure
// ---------------------------------------------------------------------------

/** One attribute entry of an element: name + value code (null/false omit, true = bare). */
export type AttrEntry = [name: string, value: string];

export interface Syntax {
  ctx: PhpCtx;
  ifChain: (branches: Array<[test: string, body: string]>, elseBody?: string) => string;
  forEach: (itemsCode: string, body: string) => string;
  text: (code: string) => string;
  slot: string;
  element: (tag: string, attrs: AttrEntry[], rest: boolean, isVoid: boolean, children: string) => string;
  /** class attr value for the part's own classes contract. */
  partClasses: () => string;
  /** Variable holding the resolved dynamic tag. */
  tagVar: string;
}

const fold = (e: Expr, tag: string | undefined) => (tag === undefined ? e : foldResolvedTag(e, tag));

export function printNode(node: Node, part: PartDef, sx: Syntax, tag?: string): string {
  const nodes = (ns: Node[]) => ns.map((n) => printNode(n, part, sx, tag)).join("\n");
  switch (node.kind) {
    case "element":
      return printElement(node, part, sx);
    case "slot":
      return sx.slot;
    case "text":
      return sx.text(stringOf(fold(node.expr, tag), sx.ctx));
    case "when": {
      const branches: Array<[string, string]> = [];
      let cur: Node = node;
      let elseBody: string | undefined;
      for (;;) {
        const w = cur as Extract<Node, { kind: "when" }>;
        branches.push([truthy(fold(w.test, tag), sx.ctx), nodes(w.then)]);
        if (!w.else || w.else.length === 0) break;
        if (w.else.length === 1 && w.else[0]!.kind === "when") {
          cur = w.else[0]!;
          continue;
        }
        elseBody = nodes(w.else);
        break;
      }
      return sx.ifChain(branches, elseBody);
    }
    case "forEach":
      return sx.forEach(sx.ctx.prop(node.itemsProp), nodes(node.body));
  }
}

function printElement(node: ElementNode, part: PartDef, sx: Syntax): string {
  const tag = node.tag;
  if (tag.kind === "static") return printStatic(node, tag.tag, part, sx);
  // No dynamic void/non-void tag switching in either engine: one static
  // element per allowed tag, children repeated in every branch.
  let cases: string[];
  let fallback: string;
  if (tag.kind === "resolved") {
    cases = allowedTags(tag.group).filter((t) => t !== tag.fallback);
    fallback = tag.fallback;
  } else {
    cases = tag.tags.slice(0, -1);
    fallback = tag.tags[tag.tags.length - 1]!;
  }
  return sx.ifChain(
    cases.map((t) => [sx.ctx.d.eq(sx.tagVar, phpString(t)), printStatic(node, t, part, sx)]),
    printStatic(node, fallback, part, sx)
  );
}

function printStatic(node: ElementNode, tag: string, part: PartDef, sx: Syntax): string {
  const entries: AttrEntry[] = [];
  for (const a of node.attrs) {
    const e = attrEntry(a, tag, part, sx);
    if (e) entries.push(e);
  }
  const rest = node.attrs.some((a) => a.kind === "rest");
  const isVoid = node.void === true || VOID_TAGS.has(tag);
  const children = isVoid ? "" : node.children.map((c) => printNode(c, part, sx, tag)).join("\n");
  return sx.element(tag, entries, rest, isVoid, children);
}

function attrEntry(attr: AttrSpec, tag: string, part: PartDef, sx: Syntax): AttrEntry | undefined {
  const ctx = sx.ctx;
  switch (attr.kind) {
    case "static":
      return [attr.name, phpString(attr.value)];
    case "expr": {
      const expr = fold(attr.expr, tag);
      const value = stringOf(expr, ctx);
      if (attr.when) {
        const when = fold(attr.when, tag);
        if (when.kind === "lit") return when.value ? [attr.name, value] : undefined;
        return [attr.name, `(${truthy(when, ctx)} ? ${value} : null)`];
      }
      if (attr.keepEmpty || exprType(expr, ctx.env) !== "string" || neverEmptyString(expr, ctx.env)) {
        return [attr.name, value];
      }
      return [attr.name, ctx.d.call("orNull", [value])];
    }
    case "bool": {
      const expr = fold(attr.expr, tag);
      if (expr.kind === "lit") return expr.value ? [attr.name, "true"] : undefined;
      return [attr.name, truthy(expr, ctx)];
    }
    case "liveValue":
      return undefined; // DOM property only; initial state is carried by `parentValue` attrs
    case "class": {
      const call = attr.spec ? ctx.d.call("cn", [list(classTail(part, attr.spec, ctx))]) : sx.partClasses();
      return ["class", ctx.d.call("orNull", [call])];
    }
    case "rest":
      return undefined;
  }
}

/** Parameters a template accepts, in declaration order (attrs/children last). */
export function templateParams(part: PartDef): Array<{ name: string; type: string; def: PropDef }> {
  const out = part.props
    .filter((p) => p.type !== "attrs" && p.type !== "children")
    .map((p) => ({ name: phpParamName(p), type: p.type, def: p }));
  for (const p of part.props) if (p.type === "attrs" || p.type === "children") out.push({ name: p.type, type: p.type, def: p });
  return out;
}

/** The props array handed to `Classes::<part>Classes` (every scalar param). */
export function classesInput(part: PartDef, d: Dialect, code: (p: PropDef) => string): string {
  const entries: Array<[string, string]> = [];
  for (const p of part.props) {
    if (p.type === "attrs" || p.type === "children" || p.type === "items") continue;
    entries.push([phpString(phpParamName(p)), code(p)]);
  }
  return d.map(entries);
}

// ---------------------------------------------------------------------------
// PHP support files
// ---------------------------------------------------------------------------

const PHP_DIALECT: Dialect = {
  call: (fn, args) => `Rt::${fn}(${args.join(", ")})`,
  map: (entries) => `[${entries.map(([k, v]) => `${k} => ${v}`).join(", ")}]`,
  eq: (a, b) => `(${a} === ${b})`,
  and: (xs) => `(${xs.join(" && ")})`,
  or: (xs) => `(${xs.join(" || ")})`,
  not: (x) => `!${x}`,
  contains: (h, n) => `str_contains(${h}, ${n})`,
  intToString: (x) => `((string) ${x})`,
};

/** PHP dialect calling Rt through a fully-qualified prefix (Latte templates). */
export function phpDialect(rtClass: string): Dialect {
  return { ...PHP_DIALECT, call: (fn, args) => `${rtClass}::${fn}(${args.join(", ")})` };
}

/** PHP array literal of a JSON value. */
export function phpValue(v: unknown, level = 0): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return phpString(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const pad = "    ".repeat(level + 1);
  const end = "    ".repeat(level);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return `[\n${v.map((x) => pad + phpValue(x, level + 1) + ",").join("\n")}\n${end}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) return "[]";
  return `[\n${entries.map(([k, x]) => `${pad}${phpString(k)} => ${phpValue(x, level + 1)},`).join("\n")}\n${end}]`;
}

/** `Classes.php`: shared recipes + one `<part>Classes(array $props)` helper per class contract. */
export function emitClassesPhp(bricks: BrickDef[], ns: string): string {
  const recipes: string[] = [];
  const methods: string[] = [];
  for (const brick of bricks) {
    for (const [id, recipe] of Object.entries(brick.recipes)) {
      recipes.push(`        ${phpString(id)} => ${phpValue(recipe, 2)},`);
    }
    for (const part of brick.parts) {
      if (!part.classes) continue;
      const env = makeEnv(brick, part);
      const ctx: PhpCtx = {
        env,
        d: PHP_DIALECT,
        prop: (name) => {
          const p = part.props.find((x) => x.name === name)!;
          return `($p[${phpString(phpParamName(p))}] ?? ${phpDefault(p.type)})`;
        },
        item: () => {
          throw new Error(`${part.name}: item refs in a part classes contract`);
        },
        derived: (name) => `(${printExpr(part.derived![name]!, ctx)})`,
      };
      const spec = part.classes;
      const tail = classTail(part, spec, ctx);
      let body: string;
      if (spec.recipe) {
        const recipeId = spec.recipeId ?? part.recipeId!;
        const sel = Object.entries(spec.recipe).map(([key, source]) => {
          const value = typeof source === "string" ? ctx.prop(source) : stringOf(source, ctx);
          return [phpString(key), value] as [string, string];
        });
        body = `Rt::compose(self::RECIPES[${phpString(recipeId)}], ${PHP_DIALECT.map(sel)}, [${tail.join(", ")}])`;
      } else {
        body = `Rt::cn([${tail.join(", ")}])`;
      }
      const keys = part.props
        .filter((p) => !["attrs", "children", "items"].includes(p.type))
        .map((p) => `${phpParamName(p)}?: ${p.type === "bool" ? "bool" : p.type === "int" ? "int" : "string"}`);
      methods.push(
        `    /**\n     * ${part.name} classes without rendering — the asChild replacement for custom roots.\n` +
          `     *\n     * @param array{${keys.join(", ")}} $p\n     */\n` +
          `    public static function ${lowerFirst(part.name)}Classes(array $p = []): string\n    {\n        return ${body};\n    }`
      );
    }
  }
  return `<?php

// ${BANNER}

declare(strict_types=1);

namespace ${ns};

/**
 * Class contracts of every primitive. Recipes are the shared *.variants.json
 * files, inlined verbatim; merge order and tailwind-merge semantics match cn()
 * in the TS runtimes and Cn/Compose in Go.
 */
final class Classes
{
    public const RECIPES = [
${recipes.join("\n")}
    ];

${methods.join("\n\n")}
}
`;
}

export function emitTagsPhp(ns: string): string {
  const groups = Object.entries(TAG_GROUPS)
    .map(([g, tags]) => `        ${phpString(g)} => [${tags.map(phpString).join(", ")}],`)
    .join("\n");
  return `<?php

// ${BANNER}
// Source of truth: src/domain/tags.ts.

declare(strict_types=1);

namespace ${ns};

/** Allowed tags per semantic group (polymorphic Tag props). */
final class Tags
{
    public const GROUPS = [
${groups}
    ];
}
`;
}

export function emitComposerJson(runtime: PhpRuntime): string {
  const ns = PHP_NAMESPACE[runtime];
  return (
    JSON.stringify(
      {
        name: `ui8kit/codegen-${runtime}`,
        description: `${BANNER} Generated UI8Kit ${runtime === "twig" ? "Twig" : "Latte"} primitives.`,
        type: "library",
        license: "MIT",
        require: { php: ">=8.1", ...PHP_PACKAGES[runtime] },
        autoload: { "psr-4": { [ns + "\\"]: "src/" } },
      },
      null,
      2
    ) + "\n"
  );
}

/** The runtime files copied from runtime/php with the namespace substituted. */
export function runtimePhpFile(source: string, ns: string): string {
  return source.replace("<?php\n", `<?php\n\n// ${BANNER}\n`).replace("namespace __NAMESPACE__;", `namespace ${ns};`);
}


/** `bin/parity.php`: JSON-in/JSON-out harness rendering any generated part with the real engine. */
export function emitPhpParityHarness(runtime: PhpRuntime): string {
  const ns = PHP_NAMESPACE[runtime];
  const engine =
    runtime === "twig"
      ? `$twig = new \\Twig\\Environment(new \\Twig\\Loader\\FilesystemLoader(__DIR__ . '/../ui'), [
    'autoescape' => 'html',
    'strict_variables' => false,
    'cache' => false,
]);
$twig->addExtension(new \\${ns}\\TwigExtension());
$render = static fn (string $template, array $params): string => $twig->render($template, $params);`
      : `$latte = new \\Latte\\Engine();
$latte->setTempDirectory(sys_get_temp_dir() . '/ui8kit-latte-' . md5(__DIR__));
$latte->setLoader(new \\Latte\\Loaders\\FileLoader(__DIR__ . '/../ui'));
$render = static fn (string $template, array $params): string => $latte->renderToString($template, $params);`;
  return `<?php

// ${BANNER}
//
// Renders generated ${runtime} parts from JSON (parity tests).
// stdin:  [{"template":"button/Button${runtime === "twig" ? ".html.twig" : ".latte"}","params":{...},"children":"<b>x</b>"}]
// stdout: ["<button ...>...</button>", ...]

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

${engine}

$cases = json_decode((string) stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$out = [];
foreach ($cases as $case) {
    $params = (array) ($case['params'] ?? []);
    // Test-only: children are trusted pre-rendered HTML.
    $params['children'] = (string) ($case['children'] ?? '');
    $out[] = $render($case['template'], $params);
}
echo json_encode($out, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
`;
}
