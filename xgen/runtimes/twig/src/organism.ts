// Twig output of the organisms (blocks, components, parts, patterns): blocks/<name>.html.twig, called with `p` (the
// props by their JSON names plus className and the slots) and `children` (markup). Values are the JSON shapes of the
// TypeScript props, read with the ui_* helpers (JS truthiness, ===, String(), cn), like the Go templ output. A slot
// without arguments is passed rendered (markup); a slot with arguments is a template of its own, passed as a
// descriptor {t: template, v: captured values} and called with the arguments as a0, a1... Events are left out.
import type { OrganismSpec, SlotFill, Value, ViewNode } from "@ui8kit/xgen-screens";
import { fileName, isGroup, isOp, isRef } from "@ui8kit/xgen-screens";
import type { PartDef } from "@ui8kit/xgen-spec";
import type { GeneratedFile, PartRef } from "@ui8kit/xgen-runtime-core";
import { header, partTemplate } from "./brick";
import { twig, type Dialect } from "./dialect";

export interface TwigOrgDeps {
  parts: Record<string, PartRef>;
  organisms: Record<string, OrganismSpec>;
  /** the recipe and preset files, relative to the package root */
  recipePath: (file: string) => string;
  presetPath: (name: string) => string;
}

const ident = (name: string): string => name.replace(/[^A-Za-z0-9_]/g, "_");
const local = (name: string): string => `v_${ident(name)}`;
const constVar = (name: string): string => `k_${ident(name)}`;
export const organismTemplate = (name: string, d: Dialect = twig): string => `blocks/${fileName(name)}${d.ext}`;
const pad = (lines: string[]): string[] => lines.map((l) => (l ? `  ${l}` : l));

/** the heads of the references in a subtree (event handlers left out) */
function refHeads(x: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(x)) x.forEach((y) => refHeads(y, out));
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.$ === "string") out.add(o.$.split(".")[0]!);
    for (const [k, v] of Object.entries(o)) if (k !== "on") refHeads(v, out);
  }
  return out;
}

interface Ctx {
  org: OrganismSpec;
  deps: TwigOrgDeps;
  d: Dialect;
  source: string;
  scope: Map<string, string>;
  /** fill templates of this organism */
  fills: GeneratedFile[];
  n: number;
  recipes: Set<string>;
  presets: Set<string>;
  inFill: boolean;
}

const VARIADIC: Record<string, string> = { and: "and", or: "or", max: "max", min: "min", coalesce: "coalesce", cn: "cnv", list: "list", css: "css" };
const BINARY: Record<string, string> = {
  eq: "eq", gt: "gt", lt: "lt", ge: "ge", le: "le", add: "add", sub: "sub", mul: "mul", div: "div", round: "round", str: "str", has: "has",
  range: "range", len: "len", words: "words", nbsp: "nbsp", nth: "nth", money: "money", num: "num", at: "at", pageWindow: "page_window",
  fitCols: "fit_cols", uniq: "uniq", count: "count", where: "where", match: "match", pick: "pick",
};

export function printValue(v: Value, c: Ctx): string {
  const d = c.d;
  if (v === null || v === undefined) return d.nul;
  if (typeof v === "string") return d.str(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (isRef(v)) {
    const [head, ...rest] = v.$.split(".");
    let base: string;
    if (c.scope.has(head!)) base = c.scope.get(head!)!;
    else if (head === "className") base = d.orNull(d.field(d.v("p"), "className"), "''");
    else if (c.org.consts?.[head!]) base = d.v(constVar(head!));
    else throw new Error(`${c.org.name}: unknown name ${head}`);
    return rest.length ? `ui_get(${base}, ${d.list(rest.map(d.str))})` : base;
  }
  if (isGroup(v)) {
    const hash = d.hash(Object.entries(v).filter(([k]) => k !== "...").map(([k, x]) => [k, printValue(x, c)]));
    return "..." in v ? `ui_spread(${printValue(v["..."]!, c)}, ${hash})` : hash;
  }
  if (!isOp(v)) throw new Error(`${c.org.name}: unknown value ${JSON.stringify(v)}`);
  const a = (i: number): string => printValue(v.args[i]!, c);
  const all = (): string => v.args.map((x) => printValue(x, c)).join(", ");
  if (v.op === "list") return d.list(v.args.map((x) => printValue(x, c)));
  if (VARIADIC[v.op]) return `ui_${VARIADIC[v.op]}(${d.list(v.args.map((x) => printValue(x, c)))})`;
  if (BINARY[v.op]) return `ui_${BINARY[v.op]}(${all()})`;
  switch (v.op) {
    case "ne": return d.not(`ui_eq(${a(0)}, ${a(1)})`);
    case "not": return d.not(`ui_t(${a(0)})`);
    case "undef": return d.nul;
    case "cond": return d.ternary(`ui_t(${a(0)})`, a(1), a(2));
    case "tpl": return `ui_tpl(${a(0)}, ${d.list(v.args.slice(1).map((x) => printValue(x, c)))})`;
    case "sumBy": return `ui_sum_by(${a(0)}, ${d.str(String(v.args[1]))}, ${d.str(String(v.args[2]))})`;
    case "firstOf": return `ui_first_of(${a(0)}, ${d.str(String(v.args[1]))})`;
    case "maxBy": return `ui_max_by(${a(0)}, ${d.str(String(v.args[1]))})`;
    case "preset": {
      c.presets.add(String(v.args[0]));
      return `ui_preset(${d.str(c.deps.presetPath(String(v.args[0])))}, ${d.list(String(v.args[1]).split(".").map(d.str))})`;
    }
    case "recipe": {
      const [name, ...rest] = v.args;
      const file = c.org.recipes?.[String(name)];
      if (!file) throw new Error(`${c.org.name}: recipe ${String(name)} not declared`);
      c.recipes.add(file);
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i + 1 < rest.length; i += 2) pairs.push([String(rest[i]), printValue(rest[i + 1]!, c)]);
      return `ui_recipe(${d.str(c.deps.recipePath(file))}, ${d.hash(pairs)})`;
    }
  }
  throw new Error(`${c.org.name}: op ${v.op} has no Twig form`);
}

const test = (v: Value, c: Ctx): string => `ui_t(${printValue(v, c)})`;

/** a value for a typed prop of a brick (the zero value rules of the Go structs) */
function brickProp(part: PartDef, name: string, v: Value, c: Ctx): string {
  const def = part.props.find((p) => p.name === name);
  if (!def) throw new Error(`${c.org.name}: ${part.name} has no prop ${name}`);
  const g = printValue(v, c);
  if (def.goType === "uiutils.HeadingLevel") return `ui_i(${g})`;
  switch (def.type) {
    case "string": return typeof v === "string" ? g : `ui_s(${g})`;
    case "bool": return typeof v === "boolean" ? g : `ui_t(${g})`;
    case "int": return typeof v === "number" ? String(Math.round(v)) : `ui_i(${g})`;
    case "items": return `ui_l(${g})`;
    default: throw new Error(`${c.org.name}: ${part.name}.${name} of type ${def.type} cannot take a value`);
  }
}

function withScope<T>(c: Ctx, names: Array<[string, string]>, f: () => T): T {
  const prev = new Map(c.scope);
  for (const [k, v] of names) c.scope.set(k, v);
  try { return f(); } finally { c.scope = prev; }
}

const walk = (nodes: ViewNode[], c: Ctx): string[] => nodes.flatMap((n) => node(n, c));

/** children rendered into a variable first, then the include */
function call(template: string, props: Array<[string, string]>, children: string[], c: Ctx, dynamic = false): string[] {
  const d = c.d;
  const vars: Array<[string, string]> = [["p", d.hash(props)]];
  const pre: string[] = [];
  if (children.length) {
    const name = `c_${++c.n}`;
    const [open, close] = d.capture(name);
    pre.push(open, ...pad(children), close);
    vars.push(["children", d.v(name)]);
  }
  return [...pre, dynamic ? d.includeExpr(template, d.hash(vars)) : d.include(template, d.hash(vars))];
}

function node(n: ViewNode, c: Ctx): string[] {
  const d = c.d;
  if ("use" in n) {
    const ref = c.deps.parts[n.use];
    if (!ref) throw new Error(`${c.org.name}: unknown part ${n.use}`);
    const props: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(n.props ?? {})) {
      if (k === "Class" && v === "") continue;
      props.push([k, brickProp(ref.part, k, v, c)]);
    }
    const attrs = Object.entries(n.attrs ?? {});
    if (attrs.length) {
      const ap = ref.part.props.find((p) => p.type === "attrs");
      if (!ap) throw new Error(`${c.org.name}: ${n.use} takes no free attributes`);
      props.push([ap.name, `ui_attrs(${d.list(attrs.flatMap(([k, v]) => [d.str(k), printValue(v, c)]))})`]);
    }
    return call(partTemplate(ref.brick, ref.part, d), props, walk(n.children ?? [], c), c);
  }
  if ("text" in n) return [d.out(`ui_text(${printValue(n.text, c)})`)];
  if ("when" in n) {
    const out: string[] = [];
    let at: ViewNode | undefined = n;
    let first = true;
    while (at && "when" in at) {
      out.push(first ? d.if(test(at.when, c)) : d.elseif(test(at.when, c)), ...pad(walk(at.then, c)));
      first = false;
      const other: ViewNode[] = at.else ?? [];
      if (other.length === 1 && "when" in other[0]!) at = other[0];
      else { if (other.length) out.push(d.else, ...pad(walk(other, c))); at = undefined; }
    }
    return [...out, d.endif];
  }
  if ("each" in n) {
    const names: Array<[string, string]> = [[n.as, d.v(local(n.as))], ...(n.index ? [[n.index, d.v(local(n.index))] as [string, string]] : [])];
    const list = printValue(n.each, c);
    const body = withScope(c, names, () => walk(n.do, c));
    return [d.forIn(local(n.as), `ui_l(${list})`), ...(n.index ? [`  ${d.set(local(n.index), d.loopIndex)}`] : []), ...pad(body), d.endfor];
  }
  if ("slot" in n) {
    if (n.slot === "children") {
      if (c.inFill) throw new Error(`${c.org.name}: children rendered inside a slot fill`);
      return [d.raw(d.orNull(d.v("children"), "''"))];
    }
    const decl = c.org.slots.find((s) => s.name === n.slot);
    if (!decl) throw new Error(`${c.org.name}: unknown slot ${n.slot}`);
    const slot = d.field(d.v("p"), n.slot);
    if (!decl.args.length) return [d.raw(d.orNull(slot, "''"))];
    const args = (n.args ?? []).map((a, i): [string, string] => [`a${i}`, printValue(a, c)]);
    return [d.if(d.isNotNull(d.orNull(slot, d.nul))), `  ${d.includeExpr(d.field(slot, "t"), d.merge(d.field(slot, "v"), d.hash(args)))}`, d.endif];
  }
  if ("organism" in n) {
    const other = c.deps.organisms[n.organism];
    if (!other) throw new Error(`${c.org.name}: unknown organism ${n.organism}`);
    const props: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(n.props ?? {})) props.push([k, k === "className" ? `ui_cnv(${d.list([printValue(v, c)])})` : printValue(v, c)]);
    let children: string[] = [];
    const pre: string[] = [];
    for (const [name, sl] of Object.entries(n.slots ?? {})) {
      if (sl.forward !== undefined) {
        if (name === "children") children = [d.raw(d.orNull(sl.forward === "children" ? d.v("children") : d.field(d.v("p"), sl.forward), "''"))];
        else props.push([name, d.orNull(d.field(d.v("p"), sl.forward), d.nul)]);
        continue;
      }
      if (name === "children") { children = walk(sl.do, c); continue; }
      const decl = other.slots.find((s) => s.name === name);
      if (!decl) throw new Error(`${c.org.name}: ${n.organism} has no slot ${name}`);
      props.push([name, fill(sl, decl.args.length, c, pre)]);
    }
    return [...pre, ...call(organismTemplate(n.organism, d), props, children, c)];
  }
  return [];
}

/** a slot fill: rendered in place when it takes no arguments, else a template of its own with the names it reads */
function fill(sl: SlotFill, arity: number, c: Ctx, pre: string[]): string {
  const d = c.d;
  const prevFill = c.inFill;
  c.inFill = true;
  try {
    if (!arity) {
      const name = `f_${++c.n}`;
      const [open, close] = d.capture(name);
      pre.push(open, ...pad(walk(sl.do, c)), close);
      return d.v(name);
    }
    const used = refHeads(sl.do);
    const captured = [...c.scope.entries()].filter(([k]) => used.has(k) && !sl.args.includes(k));
    const passed = captured.filter(([, code]) => /^\$?[A-Za-z_]\w*$/.test(code));
    const path = `blocks/${fileName(c.org.name)}.fill${c.fills.length + 1}${d.ext}`;
    c.fills.push({ path, contents: "" });
    const at = c.fills.length - 1;
    const body = withScope(c, sl.args.map((a): [string, string] => [a, d.v(local(a))]), () => walk(sl.do, c));
    const lines = [
      header(d, c.source, `${c.org.name}: the fill of a slot (${sl.args.join(", ")}); vars: p, the values it reads, the slot arguments as a0, a1...`),
      ...consts(c),
      ...sl.args.map((a, i) => d.set(local(a), d.v(`a${i}`))),
      ...body,
    ];
    c.fills[at] = { path, contents: lines.join("\n") + "\n" };
    return d.hash([["t", d.str(path)], ["v", d.hash([["p", d.v("p")], ...passed.map(([, code]): [string, string] => [code.replace(/^\$/, ""), code])])]]);
  } finally {
    c.inFill = prevFill;
  }
}

function consts(c: Ctx): string[] {
  return Object.entries(c.org.consts ?? {}).map(([name, table]) => c.d.set(constVar(name), c.d.hash(Object.entries(table).map(([k, v]) => [k, c.d.str(v)]))));
}

export function emitTwigOrganism(org: OrganismSpec, deps: TwigOrgDeps, source: string, d: Dialect = twig): { files: GeneratedFile[]; recipes: Set<string>; presets: Set<string> } {
  const c: Ctx = { org, deps, d, source, scope: new Map(), fills: [], n: 0, recipes: new Set(), presets: new Set(), inFill: false };
  const used = refHeads([org.view, org.derived ?? []]);
  const top: string[] = [...consts(c)];
  for (const p of org.props) {
    if (!used.has(p.name)) continue;
    top.push(d.set(local(p.name), p.default !== undefined ? d.orNull(d.field(d.v("p"), p.name), printValue(p.default as Value, c)) : d.orNull(d.field(d.v("p"), p.name), d.nul)));
    c.scope.set(p.name, d.v(local(p.name)));
  }
  // a slot read as a value is whether it was given (`when: actions`)
  for (const sl of org.slots) if (used.has(sl.name)) c.scope.set(sl.name, `(${d.isNotNull(d.orNull(d.field(d.v("p"), sl.name), d.nul))})`);
  for (const dv of org.derived ?? []) {
    if (!used.has(dv.name)) continue;
    top.push(d.set(local(dv.name), printValue(dv.value, c)));
    c.scope.set(dv.name, d.v(local(dv.name)));
  }
  const body = walk(org.view, c);
  const props = [...org.props.map((p) => p.name), ...(org.className ? ["className"] : []), ...org.slots.map((s) => `${s.name} (slot${s.args.length ? `: ${s.args.map((a) => a.name).join(", ")}` : ""})`)];
  const doc = `${org.docs}\nProps (p): ${props.join(", ") || "none"}${org.children ? "; children: markup" : ""}.`;
  const file = { path: organismTemplate(org.name, d), contents: [header(d, source, doc), ...top, ...body].join("\n") + "\n" };
  return { files: [file, ...c.fills], recipes: c.recipes, presets: c.presets };
}
