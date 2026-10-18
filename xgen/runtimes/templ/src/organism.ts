// Go templ output of the organisms (blocks, components, parts, patterns): one .templ file each in the `blocks` package.
// Values are dynamic (`any`, the JSON shapes) and read with the helpers of utils/dyn.go, which follow the rules of the
// TypeScript output (truthiness, ===, String(), cn). Events are left out: the templ output is static HTML.
import type { OrganismSpec, Value, ViewNode, SlotFill } from "@ui8kit/xgen-screens";
import { fileName, isGroup, isOp, isRef } from "@ui8kit/xgen-screens";
import type { PartDef } from "@ui8kit/xgen-spec";
import { BANNER, pascalCase, type GeneratedFile, type PartRef } from "@ui8kit/xgen-runtime-core";
import { goPackageOf } from "./templ";

export interface OrgDeps {
  parts: Record<string, PartRef>;
  organisms: Record<string, OrganismSpec>;
  goModule: string;
}

const goIdent = (name: string): string => name.replace(/[^A-Za-z0-9_]/g, "_");
/** a local of the view: v + PascalCase (no clash with Go keywords or helpers) */
const local = (name: string): string => `v${goIdent(name.charAt(0).toUpperCase() + name.slice(1))}`;
/** an exported Go field of a prop: title -> Title */
export const field = (name: string): string => (name === "className" ? "Class" : goIdent(name.charAt(0).toUpperCase() + name.slice(1)));
const lit = (s: string): string => JSON.stringify(s);
const pad = (lines: string[]): string[] => lines.map((l) => (l ? `\t${l}` : l));

/** the heads of the references in a subtree (event handlers left out) */
export function refHeads(x: unknown, out = new Set<string>()): Set<string> {
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
  deps: OrgDeps;
  /** names in scope -> Go code (locals, loop variables, slot arguments) */
  scope: Map<string, string>;
  imports: Set<string>;
  fills: string[];
  recipes: Set<string>;
  presets: Set<string>;
  inFill: boolean;
}

const constVar = (org: OrganismSpec, name: string): string => `${org.name.charAt(0).toLowerCase()}${org.name.slice(1)}${pascalCase(name.toLowerCase().replace(/_/g, "-"))}`;
export const recipeVar = (file: string): string => `recipe${pascalCase(file)}`;
export const presetVar = (name: string): string => `preset${pascalCase(name)}`;

export function printGo(v: Value, c: Ctx): string {
  if (v === null || v === undefined) return "nil";
  if (typeof v === "string") return lit(v);
  if (typeof v === "number") return Number.isInteger(v) ? `float64(${v})` : String(v);
  if (typeof v === "boolean") return String(v);
  if (isRef(v)) {
    const [head, ...rest] = v.$.split(".");
    let base: string;
    if (c.scope.has(head!)) base = c.scope.get(head!)!;
    else if (head === "className") base = "p.Class";
    else if (c.org.consts?.[head!]) base = constVar(c.org, head!);
    else throw new Error(`${c.org.name}: unknown name ${head}`);
    return rest.length ? `uiutils.Get(${base}, ${rest.map(lit).join(", ")})` : base;
  }
  if (isGroup(v)) {
    const entries = Object.entries(v).filter(([k]) => k !== "...");
    const map = `map[string]any{${entries.map(([k, x]) => `${lit(k)}: ${printGo(x, c)}`).join(", ")}}`;
    return "..." in v ? `uiutils.Spread(${printGo(v["..."]!, c)}, ${map})` : map;
  }
  if (!isOp(v)) throw new Error(`${c.org.name}: unknown value ${JSON.stringify(v)}`);
  const a = (i: number): string => printGo(v.args[i]!, c);
  const all = (): string => v.args.map((x) => printGo(x, c)).join(", ");
  const str = (i: number): string => lit(String(v.args[i]));
  switch (v.op) {
    case "eq": return `uiutils.Eq(${a(0)}, ${a(1)})`;
    case "ne": return `!uiutils.Eq(${a(0)}, ${a(1)})`;
    case "not": return `!uiutils.T(${a(0)})`;
    case "and": return `uiutils.And(${all()})`;
    case "or": return `uiutils.Or(${all()})`;
    case "gt": return `uiutils.Gt(${a(0)}, ${a(1)})`;
    case "lt": return `uiutils.Lt(${a(0)}, ${a(1)})`;
    case "ge": return `uiutils.Ge(${a(0)}, ${a(1)})`;
    case "le": return `uiutils.Le(${a(0)}, ${a(1)})`;
    case "add": return `uiutils.Add(${a(0)}, ${a(1)})`;
    case "sub": return `uiutils.Sub(${a(0)}, ${a(1)})`;
    case "mul": return `uiutils.Mul(${a(0)}, ${a(1)})`;
    case "div": return `uiutils.Div(${a(0)}, ${a(1)})`;
    case "max": return `uiutils.Max(${all()})`;
    case "min": return `uiutils.Min(${all()})`;
    case "round": return `uiutils.Round(${a(0)})`;
    case "coalesce": return `uiutils.Coalesce(${all()})`;
    case "cn": return `uiutils.Cnv(${all()})`;
    case "str": return `uiutils.Str(${a(0)})`;
    case "has": return `uiutils.Has(${a(0)})`;
    case "undef": return "nil";
    case "range": return `uiutils.Range(${a(0)})`;
    case "cond": return `uiutils.Cond(uiutils.T(${a(0)}), ${a(1)}, ${a(2)})`;
    case "len": return `uiutils.Len(${a(0)})`;
    case "words": return `uiutils.Words(${a(0)})`;
    case "nbsp": return `uiutils.Nbsp(${a(0)})`;
    case "nth": return `uiutils.Nth(${a(0)}, ${a(1)})`;
    case "list": return `uiutils.List(${all()})`;
    case "tpl": return `uiutils.Tpl(${all()})`;
    case "money": return `uiutils.Money(${a(0)}, ${a(1)})`;
    case "num": return `uiutils.Num(${a(0)})`;
    case "at": return `uiutils.At(${a(0)}, ${a(1)})`;
    case "pageWindow": return `uiutils.PageWindow(${a(0)}, ${a(1)})`;
    case "fitCols": return `uiutils.FitCols(${a(0)}, ${a(1)})`;
    case "uniq": return `uiutils.Uniq(${a(0)})`;
    case "count": return `uiutils.Count(${a(0)}, ${a(1)})`;
    case "where": return `uiutils.Where(${a(0)}, ${a(1)}, ${a(2)})`;
    case "match": return `uiutils.Match(${a(0)}, ${a(1)}, ${a(2)})`;
    case "pick": return `uiutils.Pick(${a(0)}, ${a(1)})`;
    case "sumBy": return `uiutils.SumBy(${a(0)}, ${str(1)}, ${str(2)})`;
    case "firstOf": return `uiutils.FirstOf(${a(0)}, ${str(1)})`;
    case "maxBy": return `uiutils.MaxBy(${a(0)}, ${str(1)})`;
    case "css": return `uiutils.Css(${all()})`;
    case "preset": {
      c.presets.add(String(v.args[0]));
      return `uiutils.Get(${presetVar(String(v.args[0]))}, ${String(v.args[1]).split(".").map(lit).join(", ")})`;
    }
    case "recipe": {
      const [name, ...rest] = v.args;
      const file = c.org.recipes?.[String(name)];
      if (!file) throw new Error(`${c.org.name}: recipe ${String(name)} not declared`);
      c.recipes.add(file);
      const pairs: string[] = [];
      for (let i = 0; i + 1 < rest.length; i += 2) pairs.push(`${lit(String(rest[i]))}: ${printGo(rest[i + 1]!, c)}`);
      return `${recipeVar(file)}.Of(map[string]any{${pairs.join(", ")}})`;
    }
  }
  throw new Error(`${c.org.name}: op ${v.op} has no Go form`);
}

const cond = (v: Value, c: Ctx): string => {
  const g = printGo(v, c);
  return /^(!?uiutils\.(Eq|Lt|Gt|Le|Ge|Has)\(|!uiutils\.T\()/.test(g) && !g.includes("), uiutils") ? g : `uiutils.T(${g})`;
};

/** a value for a typed field of a brick prop */
function brickField(part: PartDef, name: string, v: Value, c: Ctx): string {
  const d = part.props.find((p) => p.name === name);
  if (!d) throw new Error(`${c.org.name}: ${part.name} has no prop ${name}`);
  const g = printGo(v, c);
  if (d.goType === "uiutils.HeadingLevel") return `uiutils.HeadingLevel(uiutils.I(${g}))`;
  switch (d.type) {
    case "string": return typeof v === "string" ? g : `uiutils.S(${g})`;
    case "bool": return typeof v === "boolean" ? g : `uiutils.T(${g})`;
    case "int": return typeof v === "number" ? String(Math.round(v)) : `uiutils.I(${g})`;
    case "items": c.imports.add(goPackageOf(c.deps.parts[part.name]!.brick)); return `uiutils.As[[]${goPackageOf(c.deps.parts[part.name]!.brick)}.${d.itemsOf}](${g})`;
    default: throw new Error(`${c.org.name}: ${part.name}.${name} of type ${d.type} cannot take a value`);
  }
}

function block(head: string, body: string[]): string[] {
  return body.length ? [`${head} {`, ...pad(body), "}"] : [head];
}

function walk(nodes: ViewNode[], c: Ctx): string[] {
  return nodes.flatMap((n) => node(n, c));
}

function withScope<T>(c: Ctx, names: Array<[string, string]>, f: () => T): T {
  const prev = new Map(c.scope);
  for (const [k, v] of names) c.scope.set(k, v);
  try { return f(); } finally { c.scope = prev; }
}

function node(n: ViewNode, c: Ctx): string[] {
  if ("use" in n) {
    const ref = c.deps.parts[n.use];
    if (!ref) throw new Error(`${c.org.name}: unknown part ${n.use}`);
    const pkg = goPackageOf(ref.brick);
    c.imports.add(pkg);
    const fields: string[] = [];
    for (const [k, v] of Object.entries(n.props ?? {})) {
      if (k === "Class" && v === "") continue;
      fields.push(`${k}: ${brickField(ref.part, k, v, c)}`);
    }
    const attrs = Object.entries(n.attrs ?? {});
    if (attrs.length) {
      const ap = ref.part.props.find((p) => p.type === "attrs");
      if (!ap) throw new Error(`${c.org.name}: ${n.use} takes no free attributes`);
      fields.push(`${ap.name}: uiutils.Attrs(${attrs.map(([k, v]) => `${lit(k)}, ${printGo(v, c)}`).join(", ")})`);
    }
    const call = `@${pkg}.${ref.part.name}(${pkg}.${ref.part.name}Props{${fields.join(", ")}})`;
    return block(call, walk(n.children ?? [], c));
  }
  if ("text" in n) return [`{ uiutils.Text(${printGo(n.text, c)}) }`];
  if ("when" in n) {
    const out: string[] = [];
    let at: ViewNode | undefined = n;
    let first = true;
    while (at && "when" in at) {
      out.push(`${first ? "" : "} else "}if ${cond(at.when, c)} {`, ...pad(walk(at.then, c)));
      first = false;
      const other: ViewNode[] = at.else ?? [];
      if (other.length === 1 && "when" in other[0]!) at = other[0];
      else { if (other.length) out.push("} else {", ...pad(walk(other, c))); at = undefined; }
    }
    out.push("}");
    return out;
  }
  if ("each" in n) {
    const used = refHeads(n.do);
    const as = used.has(n.as) ? local(n.as) : "_";
    const idx = n.index && used.has(n.index) ? local(n.index) : "_";
    const names: Array<[string, string]> = [[n.as, local(n.as)], ...(n.index ? [[n.index, `float64(${local(n.index)})`] as [string, string]] : [])];
    const body = withScope(c, names, () => walk(n.do, c));
    const head = as === "_" && idx === "_" ? "for range" : as === "_" ? `for ${idx} := range` : `for ${idx}, ${as} := range`;
    return [`${head} uiutils.L(${printGo(n.each, c)}) {`, ...pad(body), "}"];
  }
  if ("slot" in n) {
    if (n.slot === "children") {
      if (c.inFill) throw new Error(`${c.org.name}: children rendered inside a slot fill`);
      return ["{ children... }"];
    }
    const decl = c.org.slots.find((s) => s.name === n.slot);
    if (!decl) throw new Error(`${c.org.name}: unknown slot ${n.slot}`);
    const args = (n.args ?? []).map((a) => printGo(a, c));
    return [`if p.${field(n.slot)} != nil {`, decl.args.length ? `\t@p.${field(n.slot)}(${args.join(", ")})` : `\t@p.${field(n.slot)}`, "}"];
  }
  if ("organism" in n) {
    const other = c.deps.organisms[n.organism];
    if (!other) throw new Error(`${c.org.name}: unknown organism ${n.organism}`);
    const fields: string[] = [];
    for (const [k, v] of Object.entries(n.props ?? {})) fields.push(`${field(k)}: ${k === "className" ? `uiutils.Cnv(${printGo(v, c)})` : printGo(v, c)}`);
    let children: string[] = [];
    for (const [name, sl] of Object.entries(n.slots ?? {})) {
      if (sl.forward !== undefined) {
        if (name === "children") children = sl.forward === "children" ? ["{ children... }"] : [`if p.${field(sl.forward)} != nil {`, `\t@p.${field(sl.forward)}`, "}"];
        else fields.push(`${field(name)}: p.${field(sl.forward)}`);
        continue;
      }
      if (name === "children") { children = walk(sl.do, c); continue; }
      const decl = other.slots.find((s) => s.name === name);
      if (!decl) throw new Error(`${c.org.name}: ${n.organism} has no slot ${name}`);
      fields.push(`${field(name)}: ${fill(sl, decl.args.length, c)}`);
    }
    return block(`@${n.organism}(${n.organism}Props{${fields.join(", ")}})`, children);
  }
  return [];
}

/** a slot fill as its own templ function: the names it reads from the scope and the slot arguments are its parameters */
function fill(sl: SlotFill, arity: number, c: Ctx): string {
  const used = refHeads(sl.do);
  const captured = [...c.scope.entries()].filter(([k]) => used.has(k) && !sl.args.includes(k));
  const name = `${c.org.name.charAt(0).toLowerCase()}${c.org.name.slice(1)}Fill${c.fills.length + 1}`;
  c.fills.push("");
  const at = c.fills.length - 1;
  const params = [`p ${c.org.name}Props`, ...captured.map(([k]) => `${local(k)} any`), ...sl.args.map((a) => `${local(a)} any`)];
  const prevFill = c.inFill;
  c.inFill = true;
  const body = withScope(c, [...captured.map(([k]) => [k, local(k)] as [string, string]), ...sl.args.map((a) => [a, local(a)] as [string, string])], () => walk(sl.do, c));
  c.inFill = prevFill;
  c.fills[at] = [`templ ${name}(${params.join(", ")}) {`, ...pad(body), "}"].join("\n");
  const pass = ["p", ...captured.map(([, code]) => code)];
  if (!arity) return `${name}(${pass.join(", ")})`;
  return `func(args ...any) templ.Component { return ${name}(${[...pass, ...sl.args.map((_, i) => `uiutils.Nth(args, ${i})`)].join(", ")}) }`;
}

export function emitTemplOrganism(org: OrganismSpec, deps: OrgDeps): { file: GeneratedFile; recipes: Set<string>; presets: Set<string> } {
  const c: Ctx = { org, deps, scope: new Map(), imports: new Set(), fills: [], recipes: new Set(), presets: new Set(), inFill: false };
  const used = refHeads([org.view, org.derived ?? []]);
  const top: string[] = [];
  for (const p of org.props) {
    if (!used.has(p.name)) continue;
    top.push(`{{ ${local(p.name)} := ${p.default !== undefined ? `uiutils.Def(p.${field(p.name)}, ${printGo(p.default as Value, c)})` : `p.${field(p.name)}`} }}`);
    c.scope.set(p.name, local(p.name));
  }
  // a slot read as a value is whether it was given (`when: actions`)
  for (const sl of org.slots) if (used.has(sl.name)) c.scope.set(sl.name, `(p.${field(sl.name)} != nil)`);
  for (const d of org.derived ?? []) {
    if (!used.has(d.name)) continue;
    top.push(`{{ ${local(d.name)} := any(${printGo(d.value, c)}) }}`);
    c.scope.set(d.name, local(d.name));
  }
  const body = walk(org.view, c);
  const structFields = [
    ...org.props.map((p) => `\t${field(p.name)} any \`json:"${p.name}"\``),
    ...(org.className ? ["\tClass string `json:\"className\"`"] : []),
    ...org.slots.map((s) => `\t${field(s.name)} ${s.args.length ? "func(args ...any) templ.Component" : "templ.Component"} \`json:"-"\``),
  ];
  const consts = Object.entries(org.consts ?? {}).map(([name, table]) =>
    `var ${constVar(org, name)} = map[string]any{\n${Object.entries(table).map(([k, v]) => `\t${lit(k)}: ${lit(v)},`).join("\n")}\n}`);
  const imports = [...c.imports].sort().map((pkg) => {
    const brick = Object.values(deps.parts).find((r) => goPackageOf(r.brick) === pkg)!.brick;
    const path = `${deps.goModule}/ui/${brick.dir}`;
    return path.endsWith(`/${pkg}`) ? `\t"${path}"` : `\t${pkg} "${path}"`;
  });
  const docs = org.docs.split("\n").map((l) => `// ${l}`.trimEnd());
  const contents = [
    `// ${BANNER}`,
    ``,
    `package blocks`,
    ``,
    `import (`,
    ...imports,
    `\tuiutils "${deps.goModule}/utils"`,
    `)`,
    ``,
    `// ${org.name}Props are the props of ${org.name}; the values are the JSON shapes of the TypeScript props.`,
    `type ${org.name}Props struct {`,
    ...structFields,
    `}`,
    ...(consts.length ? ["", ...consts] : []),
    ``,
    ...docs,
    `templ ${org.name}(p ${org.name}Props) {`,
    ...pad([...top, ...body]),
    `}`,
    ...c.fills.flatMap((f) => ["", f]),
    ``,
  ].join("\n");
  return { file: { path: `blocks/${fileName(org.name)}.templ`, contents }, recipes: c.recipes, presets: c.presets };
}
