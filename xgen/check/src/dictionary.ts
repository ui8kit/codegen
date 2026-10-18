// The `dictionary` group of `xgen check`: the keys the apps read equal the keys of xgen/content/ui/en.json, exactly.
// A key is read when a view shows it (`ui.a.b` in a screen, a block use or an organism), when an app menu names it (routes[].titleKey),
// or when a subtree is handed to an organism prop and the organism reads that leaf (`labels` = ui.content.labels, the view reads `labels.home`).
// Only a dynamic index (`at(labels, status)`) reads a whole subtree; such subtrees are listed so that the rule stays visible.
import { relative, join } from "node:path";
import type { Plan } from "@ui8kit/xgen-generator";
import { isGroup, isOp, type OrganismSpec, type Value, type ViewNode } from "@ui8kit/xgen-screens";
import type { CheckResult } from "./result";

type Tree = Record<string, unknown>;
const isTree = (v: unknown): v is Tree => !!v && typeof v === "object" && !Array.isArray(v);
const getAt = (d: Tree, key: string): unknown => key.split(".").reduce<unknown>((o, k) => (isTree(o) ? o[k] : undefined), d);
export function leavesOf(d: unknown, prefix = ""): string[] {
  if (!isTree(d)) return [prefix];
  return Object.entries(d).flatMap(([k, v]) => leavesOf(v, prefix ? `${prefix}.${k}` : k));
}

export interface DictionaryUse {
  /** leaf keys that something reads */
  used: Set<string>;
  /** keys that are read but are not in the dictionary, with where */
  missing: Array<{ key: string; where: string }>;
  /** subtrees read through a dynamic index */
  dynamic: Set<string>;
}

/** what the screens (expanded), the organisms they draw and the app menus read from the dictionary */
export function dictionaryUse(plan: Plan): DictionaryUse {
  const dict = plan.inputs.dictionary.value as Tree;
  const orgs = new Map(plan.inputs.organisms.map((o) => [o.value.name, o]));
  const out: DictionaryUse = { used: new Set(), missing: [], dynamic: new Set() };
  const seen = new Set<string>();
  const rel = (f: string): string => relative(join(plan.xgenRoot, ".."), f);

  /** the dictionary key a ref names in this scope, or null when it is not a dictionary ref */
  const keyOf = (v: Value, env: Map<string, string>): string | null => {
    if (!isTree(v) || typeof (v as { $?: unknown }).$ !== "string") return null;
    const path = (v as { $: string }).$;
    if (path.startsWith("ui.")) return path.slice(3);
    const [head, ...rest] = path.split(".");
    const base = env.get(head!);
    return base === undefined ? null : [base, ...rest].join(".");
  };
  const whole = (key: string): void => { for (const l of leavesOf(getAt(dict, key), key)) out.used.add(l); };
  /** read a key: a leaf counts; a subtree in a place other than an organism prop counts as a whole */
  const read = (key: string, where: string): void => {
    const v = getAt(dict, key);
    if (v === undefined) out.missing.push({ key, where });
    else if (isTree(v)) whole(key);
    else out.used.add(key);
  };
  const value = (v: Value | undefined, env: Map<string, string>, where: string): void => {
    if (v === undefined || v === null || typeof v !== "object") return;
    const k = keyOf(v, env);
    if (k !== null) { read(k, where); return; }
    if (isOp(v)) {
      const [a, ...rest] = v.args;
      const sub = v.op === "at" && a !== undefined ? keyOf(a, env) : null;
      if (sub !== null && isTree(getAt(dict, sub))) { out.dynamic.add(sub); whole(sub); rest.forEach((x) => value(x, env, where)); return; }
      v.args.forEach((x) => value(x, env, where));
    } else if (isGroup(v)) Object.values(v).forEach((x) => value(x, env, where));
  };
  const organismUse = (name: string, props: Record<string, Value>, env: Map<string, string>, where: string): void => {
    const o = orgs.get(name);
    const inner = new Map<string, string>();
    for (const [p, v] of Object.entries(props)) {
      const k = keyOf(v, env);
      if (k !== null && isTree(getAt(dict, k)) && o) inner.set(p, k);
      else value(v, env, where);
    }
    if (!o || inner.size === 0) return;
    const memo = `${name}|${[...inner].map(([a, b]) => `${a}=${b}`).sort().join(",")}`;
    if (seen.has(memo)) return;
    seen.add(memo);
    nodes((o.value as OrganismSpec).view, inner, rel(o.file));
  };
  const nodes = (list: ViewNode[] | undefined, env: Map<string, string>, where: string): void => {
    for (const n of list ?? []) {
      if ("use" in n) { Object.values(n.props ?? {}).forEach((x) => value(x, env, where)); Object.values(n.attrs ?? {}).forEach((x) => value(x, env, where)); Object.values(n.on ?? {}).forEach((h) => (h.args ?? []).forEach((x) => value(x, env, where))); nodes(n.children, env, where); }
      else if ("text" in n) value(n.text, env, where);
      else if ("when" in n) { value(n.when, env, where); nodes(n.then, env, where); nodes(n.else, env, where); }
      else if ("each" in n) { value(n.each, env, where); const e = new Map(env); e.delete(n.as); if (n.index) e.delete(n.index); value(n.key, e, where); nodes(n.do, e, where); }
      else if ("slot" in n) (n.args ?? []).forEach((x) => value(x, env, where));
      else if ("organism" in n) {
        organismUse(n.organism, n.props ?? {}, env, where);
        Object.values(n.on ?? {}).forEach((h) => (h.args ?? []).forEach((x) => value(x, env, where)));
        for (const s of Object.values(n.slots ?? {})) { const e = new Map(env); s.args.forEach((a) => e.delete(a)); nodes(s.do, e, where); }
      }
    }
  };
  for (const s of plan.inputs.screens) {
    nodes(s.value.layout, new Map(), rel(s.file));
    for (const p of Object.values(s.value.parts ?? {})) nodes(p, new Map(), rel(s.file));
    for (const a of Object.values(s.value.areas)) nodes(a, new Map(), rel(s.file));
    for (const v of Object.values(s.value.consts ?? {})) value(v, new Map(), rel(s.file));
  }
  for (const s of plan.inputs.screens) for (const r of s.value.menu ?? []) read(r.titleKey, rel(s.file));
  return out;
}

export function checkDictionary(plan: Plan): CheckResult {
  const problems: string[] = [];
  const use = dictionaryUse(plan);
  for (const m of use.missing) problems.push(`${m.where}: reads ui.${m.key}, which is not in xgen/content/ui/en.json`);
  for (const k of leavesOf(plan.inputs.dictionary.value)) if (!use.used.has(k)) problems.push(`xgen/content/ui/en.json: ${k} is read by no view and no screen menu`);
  return { name: "dictionary", what: `the keys the views and the screen menus read equal the keys of the dictionary, leaf by leaf (subtrees read by a dynamic index: ${[...use.dynamic].sort().join(", ") || "none"})`, problems };
}
