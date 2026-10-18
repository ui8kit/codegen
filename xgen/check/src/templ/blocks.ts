// Parity cases of the organisms: every variant of every gallery block, with the props the gallery gives it
// (blockNode: sample, variant axes, case copy, id, level 2, landmark label), evaluated to JSON over the dictionary
// and the fixtures. Both runtimes get the same JSON; event handlers are left out (the templ output is static).
import { blockKey, blockNode, galleryOf, isGroup, isOp, isRef, type Inputs, type OrganismSpec, type Value } from "@ui8kit/xgen-screens";
import { readPath, type ReadOptions } from "../../../runtimes/core/assets/app/core";
import { tpl, fmtMoney, fmtNumber, at, pageWindow, fitCols, uniqLabel } from "../../../runtimes/core/assets/ts/format";

export interface OrgCase { label: string; organism: string; props: Record<string, unknown> }

type Scope = Record<string, unknown>;
const get = (v: unknown, path: string[]): unknown => path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), v);

/** a Value read the way the TypeScript output reads it */
export function evaluate(v: Value, scope: Scope, presets: Scope): unknown {
  if (v === null || typeof v !== "object") return v;
  if (isRef(v)) { const [h, ...rest] = v.$.split("."); return get(scope[h!], rest); }
  if (isGroup(v)) {
    const out: Record<string, unknown> = { ...((v["..."] !== undefined ? evaluate(v["..."]!, scope, presets) : {}) as object) };
    for (const [k, x] of Object.entries(v)) if (k !== "...") out[k] = evaluate(x, scope, presets);
    return out;
  }
  if (!isOp(v)) return undefined;
  const a = v.args.map((x) => evaluate(x, scope, presets)) as any[];
  switch (v.op) {
    case "list": return a;
    case "tpl": return tpl(a[0], ...a.slice(1));
    case "uniq": return uniqLabel(a[0]);
    case "money": return fmtMoney(a[0], a[1]);
    case "num": return fmtNumber(a[0]);
    case "at": return at(a[0], a[1]);
    case "pageWindow": return pageWindow(a[0], a[1]);
    case "fitCols": return fitCols(a[0], a[1]);
    case "preset": return get(presets[String(v.args[0])], String(v.args[1]).split("."));
    case "undef": return undefined;
    case "cond": return a[0] ? a[1] : a[2];
    case "eq": return a[0] === a[1];
    case "str": return a[0] == null ? undefined : String(a[0]);
    case "coalesce": return a.find((x) => x != null);
    case "len": return a[0]?.length ?? 0;
    case "range": return Array.from({ length: a[0] }, (_, i) => i);
    case "pick": return (a[0] ?? []).find((i: any) => i.id === a[1]);
    case "where": return (a[0] ?? []).filter((i: any) => !a[2] || i[a[1]] === a[2]);
    case "count": return (a[0] ?? []).filter((i: any) => i[a[1]]).length;
    case "firstOf": return a[0]?.[0]?.[String(v.args[1])] ?? "";
    case "nth": return a[0]?.[a[1]];
    case "words": return String(a[0] ?? "").split(" ");
    case "and": return a.reduce((x, y) => x && y);
    case "or": return a.reduce((x, y) => x || y);
    case "not": return !a[0];
    case "ne": return a[0] !== a[1];
    case "add": return a[0] + a[1];
    case "sub": return a[0] - a[1];
    case "mul": return a[0] * a[1];
    case "has": return a[0] != null;
    case "nbsp": return String(a[0] ?? "").replaceAll(" ", "\u00a0");
  }
  throw new Error(`templ parity: op ${v.op} in block props`);
}

export function blockCases(inputs: Inputs, emitted: Set<string>): { cases: OrgCase[]; skipped: string[] } {
  const organisms = Object.fromEntries(inputs.organisms.map((o) => [o.value.name, o.value as OrganismSpec]));
  const presets = Object.fromEntries(inputs.presets.map((p) => [p.value.name, (p.value as unknown as { values: unknown }).values]));
  const collections = new Map(inputs.collections.map((c) => [c.value.collection, c.value.entries as unknown[]]));
  // the lookups the hosts pass as CODEX (runtime/codex): media, users and the taxonomy terms
  const all = inputs.collections.flatMap((c) => c.value.entries as { kind: string }[]);
  const codex: ReadOptions = { media: all.filter((e) => e.kind === "media"), users: all.filter((e) => e.kind === "user"), terms: inputs.taxonomies.flatMap((t) => t.value.terms) };
  const cases: OrgCase[] = [], skipped: string[] = [];
  for (const b of galleryOf(inputs.blocks.map((x) => x.value))) {
    const scope: Scope = { ui: inputs.dictionary.value };
    for (const d of b.data) scope[d.as] = (collections.get(d.collection) ?? []).map((e) => Object.fromEntries(Object.entries(d.fields).map(([n, p]) => [n, readPath(e, p, codex)])));
    for (const v of b.variants) {
      const key = blockKey(b);
      const extra: Record<string, Value> = { id: `${key}-${v.id}`, level: 2, landmarkLabel: `${key} ${v.id}` };
      const node = blockNode(b, v, extra, organisms) as { organism: string; props?: Record<string, Value> };
      const o = organisms[node.organism]!;
      if (!emitted.has(node.organism)) { skipped.push(`${key}.${v.id}: ${node.organism} has no templ output`); continue; }
      const props: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(node.props ?? {})) {
        if (!o.props.some((p) => p.name === k) && k !== "className") continue;
        const val = evaluate(x, scope, presets);
        if (val !== undefined) props[k] = val;
      }
      cases.push({ label: `${key}.${v.id} (${node.organism})`, organism: node.organism, props });
    }
  }
  return { cases, skipped };
}
