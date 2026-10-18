// Checks a view tree against the brick specs: the part exists, its props exist, enum values are recipe keys,
// text is never a literal, ARIA state is static, every reference is in scope, every handler exists.
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import { OPS, isGroup, isOp, isRef, presetAt, sourcesOf, type Handler, type OrganismSpec, type PresetSpec, type RecipeFile, type ScreenSpec, type Value, type ViewNode } from "./ir";

export interface Parts { [name: string]: { brick: LoadedBrick["brick"]; part: LoadedBrick["brick"]["parts"][number] } }
export const indexParts = (bricks: LoadedBrick[]): Parts => {
  const out: Parts = {};
  for (const b of bricks) for (const part of b.brick.parts) out[part.name] = { brick: b.brick, part };
  return out;
};

/** props that carry text for the reader: they take a reference into content, never a literal */
export const TEXT_PROPS = new Set(["AriaLabel", "Placeholder", "Alt", "Title", "Label", "Caption"]);
/** plain attributes a view may set besides data-* and aria-*: structure (role, id) and text for the reader (title) */
const FREE_ATTRS = new Set(["role", "id", "tabindex", "draggable"]);
const TEXT_ATTRS = new Set(["title"]);
/** ARIA state a boolean prop maps to: a reference, a boolean literal, `undefined`, or a cond of those. Never computed from content. */
const ARIA_STATE = new Set(["aria-selected", "aria-expanded", "aria-pressed", "aria-checked", "aria-current", "aria-controls"]);
const isBoolLike = (v: Value): boolean => v === true || v === false || typeof v === "string" || isRef(v) || (isOp(v) && ((v.op === "undef") || (v.op === "cond" && isBoolLike(v.args[1]!) && isBoolLike(v.args[2]!))));
const ARIA_DYNAMIC_OK = new Set(["aria-label", "aria-labelledby", "aria-describedby"]);

interface Scope { names: Set<string>; handlers: (h: Handler) => string | null; organisms: Record<string, OrganismSpec>; allowOutlet: boolean; slots: Record<string, number>; where: string; parts: Parts }


function checkValue(v: Value, names: Set<string>, where: string, out: string[]): void {
  if (isRef(v)) {
    const root = v.$.split(".")[0]!;
    if (!names.has(root)) out.push(`${where}: reference "${v.$}" is not in scope (${[...names].join(", ")})`);
  } else if (isOp(v)) {
    const want = OPS[v.op];
    if (want === undefined) out.push(`${where}: unknown op "${v.op}"`);
    else if (want !== "n" && want !== v.args.length) out.push(`${where}: op ${v.op} takes ${want} arguments, got ${v.args.length}`);
    for (const a of v.args) checkValue(a, names, where, out);
  } else if (isGroup(v)) for (const [k, x] of Object.entries(v)) checkValue(x, names, `${where}.${k}`, out);
}

/** every literal a value can take: through cond branches */
function literals(v: Value): Array<string | number | boolean | null> {
  if (isOp(v) && v.op === "cond") return [...literals(v.args[1]!), ...literals(v.args[2]!)];
  if (isRef(v) || isOp(v) || isGroup(v)) return [];
  return [v];
}

function checkUse(n: Extract<ViewNode, { use: string }>, sc: Scope, names: Set<string>, out: string[]): void {
  const where = `${sc.where} <${n.use}>`;
  const entry = sc.parts[n.use];
  if (!entry) { out.push(`${where}: no such part`); return; }
  const { brick, part } = entry;
  const byName = new Map(part.props.map((p) => [p.name, p]));
  for (const [k, v] of Object.entries(n.props ?? {})) {
    const def = byName.get(k);
    if (!def || def.type === "attrs" || def.type === "children") { out.push(`${where}: unknown prop ${k}`); continue; }
    checkValue(v, names, `${where}.${k}`, out);
    if (TEXT_PROPS.has(k) && typeof v === "string") out.push(`${where}.${k}: text must come from content, not a literal ("${v}")`);
    if (def.cva) {
      const recipe = part.recipeId ? brick.recipes[part.recipeId] : undefined;
      const key = def.cvaKey ?? def.name.toLowerCase();
      const allowed = recipe ? Object.keys(recipe.byKey[key] ?? {}) : [];
      for (const lit of literals(v)) if (!allowed.includes(String(lit))) out.push(`${where}.${k}: "${lit}" is not a variant (${allowed.join(", ")})`);
    } else if (def.type === "int") {
      for (const lit of literals(v)) if (typeof lit !== "number") out.push(`${where}.${k}: expected a number`);
    } else if (def.type === "bool") {
      if (typeof v === "string" || typeof v === "number") out.push(`${where}.${k}: expected a boolean`);
    }
  }
  for (const [k, v] of Object.entries(n.attrs ?? {})) {
    checkValue(v, names, `${where}.${k}`, out);
    if (k.startsWith("aria-")) {
      if (ARIA_STATE.has(k) && isBoolLike(v)) { /* mapped from a prop */ }
      else if (!ARIA_DYNAMIC_OK.has(k) && typeof v === "object" && v !== null) out.push(`${where}: ${k} must be static (ARIA state is never computed)`);
      const idRef = (k === "aria-labelledby" || k === "aria-describedby") && typeof v === "string" && /^[\w:.-]+$/.test(v);
      if (ARIA_DYNAMIC_OK.has(k) && typeof v === "string" && !idRef) out.push(`${where}: ${k} is text, it must come from content`);
    } else if (k === "style") {
      if (!(isOp(v) && v.op === "css")) out.push(`${where}: style takes css(property, value, unit, ...)`);
    } else if (TEXT_ATTRS.has(k)) {
      if (typeof v === "string") out.push(`${where}: ${k} is text, it must come from content`);
    } else if (!k.startsWith("data-") && !FREE_ATTRS.has(k)) out.push(`${where}: attribute ${k} is not allowed (data-*, aria-*, ${[...FREE_ATTRS, ...TEXT_ATTRS, "style"].join(", ")})`);
  }
  for (const [ev, h] of Object.entries(n.on ?? {})) {
    if (!["click", "input", "change"].includes(ev)) out.push(`${where}: event ${ev} is not mapped`);
    const bad = sc.handlers(h);
    if (bad) out.push(`${where}.on.${ev}: ${bad}`);
    for (const a of h.args ?? []) checkValue(a, new Set([...names, "event", "arg"]), `${where}.on.${ev}`, out);
  }
  if (n.children?.length && !part.props.some((p) => p.type === "children")) out.push(`${where}: has no children slot`);
  for (const c of n.children ?? []) walk(c, sc, names, out);
}

function walk(n: ViewNode, sc: Scope, names: Set<string>, out: string[]): void {
  if ("use" in n) return checkUse(n, sc, names, out);
  if ("text" in n) {
    checkValue(n.text, names, `${sc.where} text`, out);
    if (typeof n.text === "string" && /\p{L}/u.test(n.text)) out.push(`${sc.where}: literal text "${n.text}" (text comes from content or labels)`);
    return;
  }
  if ("when" in n) {
    checkValue(n.when, names, `${sc.where} when`, out);
    for (const c of n.then) walk(c, sc, names, out);
    for (const c of n.else ?? []) walk(c, sc, names, out);
    return;
  }
  if ("each" in n) {
    checkValue(n.each, names, `${sc.where} each`, out);
    const inner = new Set([...names, n.as, ...(n.index ? [n.index] : [])]);
    checkValue(n.key, inner, `${sc.where} each.key`, out);
    for (const c of n.do) walk(c, sc, inner, out);
    return;
  }
  if ("slot" in n) {
    if (!(n.slot in sc.slots)) out.push(`${sc.where}: slot "${n.slot}" is not declared`);
    else if (sc.slots[n.slot] !== (n.args?.length ?? 0)) out.push(`${sc.where}: slot ${n.slot} takes ${sc.slots[n.slot]} arguments`);
    for (const a of n.args ?? []) checkValue(a, names, `${sc.where} slot`, out);
    return;
  }
  if ("organism" in n) {
    const org = sc.organisms[n.organism];
    const where = `${sc.where} <${n.organism}>`;
    if (!org) { out.push(`${where}: no such organism`); return; }
    const props = new Map(org.props.map((p) => [p.name, p]));
    for (const [k, v] of Object.entries(n.props ?? {})) { if (!props.has(k) && !(k === "className" && org.className)) out.push(`${where}: unknown prop ${k}`); checkValue(v, names, `${where}.${k}`, out); }
    for (const p of org.props) if (p.required && !(n.props ?? {})[p.name]) out.push(`${where}: missing required prop ${p.name}`);
    for (const [ev, h] of Object.entries(n.on ?? {})) {
      if (!org.events.some((e) => e.name === ev)) out.push(`${where}: no event ${ev}`);
      const bad = sc.handlers(h);
      if (bad) out.push(`${where}.on.${ev}: ${bad}`);
      for (const a of h.args ?? []) checkValue(a, new Set([...names, "event", "arg"]), where, out);
    }
    for (const [sname, s] of Object.entries(n.slots ?? {})) {
      if (s.forward !== undefined) {
        const arity = sname === "children" ? (org.children ? 0 : undefined) : org.slots.find((x) => x.name === sname)?.args.length;
        if (arity === undefined) out.push(`${where}: no slot ${sname}`);
        else if (!(s.forward in sc.slots)) out.push(`${where}: forwards slot ${s.forward}, which ${sc.where} does not declare`);
        else if (sc.slots[s.forward] !== arity) out.push(`${where}: slot ${s.forward} takes ${sc.slots[s.forward]} arguments, ${sname} takes ${arity}`);
        if (s.args.length || s.do.length) out.push(`${where}: a forwarded slot has no args and no nodes`);
        continue;
      }
      if (sname === "children") {
        if (!org.children) out.push(`${where}: has no children`);
        for (const c of s.do) walk(c, sc, new Set([...names, ...s.args]), out);
        continue;
      }
      const decl = org.slots.find((x) => x.name === sname);
      if (!decl) { out.push(`${where}: no slot ${sname}`); continue; }
      if (decl.args.length !== s.args.length) out.push(`${where}: slot ${sname} takes ${decl.args.length} arguments`);
      const inner = new Set([...names, ...s.args]);
      for (const c of s.do) walk(c, sc, inner, out);
    }
    return;
  }
  if ("outlet" in n && !sc.allowOutlet) out.push(`${sc.where}: outlet is only for screen layouts`);
  if ("part" in n && !sc.allowOutlet) out.push(`${sc.where}: a part is placed only by a screen layout`);
}

const ORGANISM_NAMES = (o: OrganismSpec): Set<string> => new Set([...o.props.map((p) => p.name), ...o.slots.map((s) => s.name), ...(o.children ? ["children"] : []), ...(o.className ? ["className"] : []), ...Object.keys(o.consts ?? {}), ...(o.derived ?? []).map((d) => d.name)]);

/** the `recipe` ops of a tree: [name, [key, value]...] (or the ops of another name) */
function recipeOps(node: unknown, into: Array<Value[]> = [], name = "recipe"): Array<Value[]> {
  if (Array.isArray(node)) node.forEach((n) => recipeOps(n, into, name));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o.op === name && Array.isArray(o.args)) into.push(o.args as Value[]);
    Object.values(o).forEach((n) => recipeOps(n, into, name));
  }
  return into;
}

export function validateOrganism(o: OrganismSpec, parts: Parts, organisms: Record<string, OrganismSpec> = {}, recipes: Record<string, RecipeFile> = {}, presets: PresetSpec[] = []): string[] {
  const out: string[] = [];
  for (const [name, path] of recipeOps([o.view, o.derived], [], "preset")) {
    const p = presets.find((x) => x.name === name);
    if (!p) out.push(`${o.name}: preset "${String(name)}" does not exist (specs/presets)`);
    else if (presetAt(p, String(path)) === undefined) out.push(`${o.name}: preset ${String(name)} has no value at "${String(path)}"`);
  }
  for (const [local, file] of Object.entries(o.recipes ?? {})) if (!recipes[file]) out.push(`${o.name}: recipe ${local} points to specs/recipes/${file}.variants.json, which does not exist`);
  for (const args of recipeOps([o.view, o.derived])) {
    const [name, ...rest] = args;
    const file = typeof name === "string" ? o.recipes?.[name] : undefined;
    const recipe = file ? recipes[file] : undefined;
    if (!recipe) { out.push(`${o.name}: recipe op names "${String(name)}", which is not in recipes`); continue; }
    for (let i = 0; i < rest.length; i += 2) {
      const key = String(rest[i]);
      if (!recipe.keys.includes(key)) { out.push(`${o.name}: recipe ${file} has no key "${key}" (${recipe.keys.join(", ")})`); continue; }
      for (const lit of literals(rest[i + 1] as Value)) if (lit !== undefined && !(String(lit) in (recipe.byKey[key] ?? {}))) out.push(`${o.name}: recipe ${file} key ${key} has no value "${lit}"`);
    }
  }
  const handlers = (h: Handler): string | null => {
    if (!h.call.startsWith("emit.")) return `handler ${h.call}: organisms only emit their events`;
    return o.events.some((e) => e.name === h.call.slice(5)) ? null : `handler ${h.call}: no such event`;
  };
  const sc: Scope = { names: ORGANISM_NAMES(o), handlers, organisms, allowOutlet: false, slots: { ...Object.fromEntries(o.slots.map((s) => [s.name, s.args.length])), ...(o.children ? { children: 0 } : {}) }, where: o.name, parts };
  if (o.portable.svelte === true || o.portable.react === true) {
    if (!o.view.length) out.push(`${o.name}: portable but has no view`);
  } else if (o.view.length) out.push(`${o.name}: not portable to either runtime, so it is a contract and has no view`);
  const seen = new Set([...o.props.map((p) => p.name), ...(o.className ? ["className"] : []), ...Object.keys(o.consts ?? {})]);
  for (const d of o.derived ?? []) { checkValue(d.value, seen, `${o.name}.derived.${d.name}`, out); seen.add(d.name); }
  for (const n of o.view) walk(n, sc, sc.names, out);
  const records = new Set(Object.keys(o.records));
  for (const p of [...o.props, ...o.slots.flatMap((s) => s.args), ...o.events.flatMap((e) => e.args)]) if (typeof p.type === "object" && "record" in p.type && !records.has(p.type.record)) out.push(`${o.name}: unknown record ${p.type.record}`);
  return out;
}

export const SCREEN_ACTIONS: Record<string, number> = { sort: 1, search: 1, page: 1, open: 1, back: 0, toggleTheme: 0 };
export const PAGE_ACTIONS = ["toggleTheme"];
export const SCREEN_SCOPE = ["ui", "view", "record", "route"];

export function validateScreen(s: ScreenSpec, parts: Parts, organisms: Record<string, OrganismSpec>): string[] {
  const out: string[] = [];
  const page = s.kind === "page";
  const handlers = (h: Handler): string | null => {
    if (!h.call.startsWith("actions.")) return `handler ${h.call}: screens call actions.*`;
    const want = SCREEN_ACTIONS[h.call.slice(8)];
    if (page && !PAGE_ACTIONS.includes(h.call.slice(8))) return `handler ${h.call}: a page has only ${PAGE_ACTIONS.join(", ")}`;
    if (want === undefined) return `handler ${h.call}: no such action`;
    return want === (h.args?.length ?? 0) ? null : `handler ${h.call} takes ${want} arguments`;
  };
  const names = new Set(page ? ["ui", "route", ...(s.nav ? ["nav"] : []), ...sourcesOf(s).map((x) => x.as), ...Object.keys(s.consts ?? {})] : SCREEN_SCOPE);
  for (const [k, v] of Object.entries(s.consts ?? {})) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) out.push(`${s.name}: const ${k} is not UPPER_CASE`);
    checkValue(v, new Set(["ui", ...sourcesOf(s).map((x) => x.as)]), `${s.name}.consts.${k}`, out);
  }
  const sc: Scope = { names, handlers, organisms, allowOutlet: true, slots: {}, where: s.name, parts };
  for (const n of s.layout) walk(n, sc, names, out);
  const noOutlet = { ...sc, allowOutlet: false };
  const placed = new Set([...JSON.stringify(s.layout).matchAll(/"part":"([A-Za-z0-9]+)"/g)].map((m) => m[1]!));
  for (const p of placed) if (!s.parts?.[p]) out.push(`${s.name}: the layout places the missing part ${p}`);
  for (const [p, nodes] of Object.entries(s.parts ?? {})) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(p)) out.push(`${s.name}: part ${p} is not PascalCase`);
    if (!placed.has(p)) out.push(`${s.name}: part ${p} is not placed by the layout`);
    for (const n of nodes) walk(n, { ...noOutlet, where: `${s.name}.parts.${p}` }, new Set([...names].filter((x) => x !== "route" && x !== "nav")), out);
  }
  for (const [area, nodes] of Object.entries(s.areas)) for (const n of nodes) walk(n, { ...noOutlet, where: `${s.name}.${area}` }, names, out);
  for (const r of s.routes) if (!(r.area in s.areas)) out.push(`${s.name}: route ${r.path} points to the missing area ${r.area}`);
  for (const o of s.organisms) if (!organisms[o]) out.push(`${s.name}: no organism ${o}`);
  if (page) {
    // a page reads a fixture, or carries its own data in consts (the Skins screen: its tiles are a list of skins, fonts and radii)
    if (!s.sources?.length && !Object.keys(s.consts ?? {}).length) out.push(`${s.name}: a page reads at least one source or holds its data in consts`);
    if (s.list || s.state || s.source) out.push(`${s.name}: a page has \`sources\`, not source, list or state`);
    const as = (s.sources ?? []).map((x) => x.as);
    if (new Set(as).size !== as.length || as.some((a) => SCREEN_SCOPE.includes(a) || a === "ui")) out.push(`${s.name}: source names must be unique and not ui, view, record or route`);
    return out;
  }
  if (!s.source || !s.list || !s.state) { out.push(`${s.name}: a collection screen needs source, list and state`); return out; }
  const [field] = s.list.defaultSort.split(":");
  if (!s.list.columns.some((c) => c.id === field)) out.push(`${s.name}: defaultSort column ${field} is missing`);
  for (const c of s.list.columns) if (!(c.id in s.source.fields)) out.push(`${s.name}: column ${c.id} has no source field`);
  for (const f of s.list.searchFields) if (!(f in s.source.fields)) out.push(`${s.name}: search field ${f} has no source field`);
  return out;
}

/** every `ui.x.y` reference of a screen: its layout, its areas and its named values */
export const screenContentRefs = (s: ScreenSpec): Set<string> =>
  contentRefs([...s.layout, ...Object.values(s.parts ?? {}).flat(), ...Object.values(s.areas).flat(), ...Object.values(s.consts ?? {}).map((v) => ({ text: v }))]);

/** every `ui.x.y` reference of a view tree (content keys the dictionary must have) */
export function contentRefs(nodes: ViewNode[], into = new Set<string>()): Set<string> {
  const scan = (v: Value | undefined): void => {
    if (v === undefined || v === null || typeof v !== "object") return;
    if (isRef(v)) { if (v.$.startsWith("ui.")) into.add(v.$.slice(3)); } else if (isOp(v)) v.args.forEach(scan); else Object.values(v).forEach(scan);
  };
  const go = (n: ViewNode): void => {
    if ("use" in n) { Object.values(n.props ?? {}).forEach(scan); Object.values(n.attrs ?? {}).forEach(scan); Object.values(n.on ?? {}).forEach((h) => h.args?.forEach(scan)); n.children?.forEach(go); }
    else if ("text" in n) scan(n.text);
    else if ("when" in n) { scan(n.when); n.then.forEach(go); n.else?.forEach(go); }
    else if ("each" in n) { scan(n.each); scan(n.key); n.do.forEach(go); }
    else if ("slot" in n) n.args?.forEach(scan);
    else if ("organism" in n) { Object.values(n.props ?? {}).forEach(scan); Object.values(n.on ?? {}).forEach((h) => h.args?.forEach(scan)); Object.values(n.slots ?? {}).forEach((s) => s.do.forEach(go)); }
  };
  nodes.forEach(go);
  return into;
}
