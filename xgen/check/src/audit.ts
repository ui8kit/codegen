// The `structure`, `hardcode` and `dead` groups of `xgen check`: classes of problems the audit found, kept out by a rule so they do not come back.
import { styleProblems } from "./style-zones";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { organismsIn } from "@ui8kit/xgen-screens";
import { DECK_COLLECTIONS } from "@ui8kit/xgen-runtime-core";
import { versionProblem, xgenPaths } from "@ui8kit/xgen-schema";
import { leavesOf } from "./dictionary";
import type { Plan } from "@ui8kit/xgen-generator";
import type { CheckResult } from "./result";
import { APP_SPECIFIC, CORE_DIRS, HARDCODE, HARDCODE_ALLOW, LAYERS, MAX_FILE_LINES, MAX_LINE_CHARS, SIBLINGS } from "./audit-rules";

const SKIP = new Set(["node_modules", "dist", "assets"]);
const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (SKIP.has(n) ? [] : statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)])) : []);

/** the source files of the generation layer: src and tools of every package, no tests */
export function sourceFiles(xgenRoot: string): string[] {
  return LAYERS.flatMap((l) => ["src", "tools"].flatMap((d) => walk(join(xgenRoot, l.dir, d)))).filter((f) => f.endsWith(".ts")).sort();
}

const IMPORT = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+"(\.{1,2}\/[^"]+)"/g;
/** the files a file imports, as absolute paths of existing files */
function importsOf(file: string, text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(IMPORT)) {
    const base = resolve(dirname(file), m[1]!);
    const hit = [`${base}.ts`, join(base, "index.ts"), base].find((p) => existsSync(p) && statSync(p).isFile());
    if (hit) out.push(hit);
  }
  return out;
}

/** strongly connected groups of more than one file (Tarjan) */
export function cycles(graph: Map<string, string[]>): string[][] {
  let index = 0;
  const idx = new Map<string, number>(), low = new Map<string, number>(), stack: string[] = [], on = new Set<string>(), out: string[][] = [];
  const visit = (v: string): void => {
    idx.set(v, index); low.set(v, index); index++; stack.push(v); on.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const group: string[] = [];
      let w: string;
      do { w = stack.pop()!; on.delete(w); group.push(w); } while (w !== v);
      if (group.length > 1) out.push(group.sort());
    }
  };
  for (const v of [...graph.keys()].sort()) if (!idx.has(v)) visit(v);
  return out;
}

export function checkStructure(plan: Plan): CheckResult {
  const problems: string[] = [];
  const root = plan.xgenRoot;
  const rel = (f: string): string => `xgen/${relative(root, f)}`;
  const files = sourceFiles(root);
  const graph = new Map<string, string[]>();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const lines = text.split("\n");
    if (lines.length > MAX_FILE_LINES) problems.push(`${rel(f)}: ${lines.length} lines, the limit is ${MAX_FILE_LINES}; split it by concern`);
    lines.forEach((l, i) => { if (l.length > MAX_LINE_CHARS) problems.push(`${rel(f)}:${i + 1}: a line of ${l.length} characters, the limit is ${MAX_LINE_CHARS}; break the table`); });
    graph.set(f, importsOf(f, text));
    // the layout of the xgen folder is spelled once, in schema/src/paths.ts; no path of this machine is written in a source
    if (!f.endsWith("schema/src/paths.ts") && /join\([^)]*"(specs|fixtures|content)"/.test(text)) problems.push(`${rel(f)}: spells a folder of the xgen layout; take it from xgenPaths`);
    if (/["'`]\/(workspace|home|tmp|usr)\//.test(text.replace(/process\.env\.CHROME \?\? "[^"]*"/g, ""))) problems.push(`${rel(f)}: an absolute path of this machine; take it from the environment`);
  }
  for (const g of cycles(graph)) problems.push(`import cycle: ${g.map(rel).join(" <-> ")}`);
  // packages: what a package imports must be declared, lower in the order, and not a sibling
  const order = LAYERS.map((l) => l.name);
  for (const l of LAYERS) {
    const pkg = JSON.parse(readFileSync(join(root, l.dir, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    const declared = Object.keys(pkg.dependencies ?? {});
    const used = new Set<string>();
    for (const f of files.filter((x) => x.startsWith(join(root, l.dir) + "/"))) for (const m of readFileSync(f, "utf8").matchAll(/from\s+"(@ui8kit\/xgen[a-z-]*)"/g)) used.add(m[1]!);
    for (const u of used) {
      if (order.indexOf(u) < 0) continue;
      if (order.indexOf(u) >= order.indexOf(l.name)) problems.push(`xgen/${l.dir}: imports ${u}, which is not below it; the order is ${order.map((n) => n.replace("@ui8kit/", "")).join(" < ")}`);
      else if (!declared.includes(u)) problems.push(`xgen/${l.dir}/package.json: imports ${u} but does not declare it`);
      if (SIBLINGS.some(([a, b]) => (a === l.name && b === u) || (b === l.name && a === u))) problems.push(`xgen/${l.dir}: imports its sibling runtime ${u}`);
    }
    for (const d of declared) if (order.includes(d) && !used.has(d)) problems.push(`xgen/${l.dir}/package.json: declares ${d} but no source imports it`);
  }
  // the core does not know the apps
  for (const f of files.filter((x) => CORE_DIRS.some((d) => x.startsWith(join(root, d, "src") + "/")))) {
    readFileSync(f, "utf8").split("\n").forEach((l, i) => { const m = l.match(APP_SPECIFIC); if (m) problems.push(`${rel(f)}:${i + 1}: names "${m[0]}", a detail of an app, in the core; pass it in as data`); });
  }
  return { name: "structure", what: `source files up to ${MAX_FILE_LINES} lines and ${MAX_LINE_CHARS} characters per line, no import cycles, packages import only lower declared packages, the core names no app`, problems };
}

export function checkHardcode(plan: Plan): CheckResult {
  const problems: string[] = [];
  const root = plan.xgenRoot;
  const label = (what: string): string => (what === "arbitrary" ? "a size or color outside the scale" : what === "palette" ? "a palette color, use a token" : what === "hex" ? "a hex color" : "a value printed as [object]");
  for (const dir of ["organisms", "patterns", "parts", "ui", "recipes"]) {
    for (const f of walk(xgenPaths(root).specs(dir)).filter((x) => x.endsWith(".json")).sort()) {
      const key = `specs/${dir}/${f.split("/").pop()}`;
      const found: string[] = [];
      readFileSync(f, "utf8").split("\n").forEach((l, i) => {
        for (const [what, re] of Object.entries(HARDCODE)) for (const m of l.matchAll(re)) found.push(`xgen/${key}:${i + 1}: ${label(what)}: ${m[0]}`);
      });
      const allowed = HARDCODE_ALLOW[key]?.n ?? 0;
      if (found.length > allowed) problems.push(...(allowed ? [`xgen/${key}: ${found.length} hardcoded values, ${allowed} allowed; move the new ones to a preset (specs/presets) or a token`] : []), ...found);
      else if (found.length < allowed) problems.push(`xgen/check/src/audit-rules.ts: ${key} now holds ${found.length} hardcoded values; lower its allowance from ${allowed} to ${found.length}`);
    }
  }
  problems.push(...styleProblems(plan.workspace, "hardcode"));
  return { name: "hardcode", what: "components and primitives hold no arbitrary size or color, no palette color and no stringified value beyond the counted allowlist", problems };
}

export function checkDead(plan: Plan): CheckResult {
  const problems: string[] = [];
  const root = plan.xgenRoot;
  // fixtures: a collection that no screen reads
  const read = new Set(plan.inputs.screens.flatMap((s) => (s.value.sources ?? []).map((x) => x.collection)).concat(plan.inputs.screens.map((s) => s.value.source?.collection ?? "")));
  // the copy decks of the taste screens: read by the generated packages/taste-data/content/copy.json
  for (const c of Object.values(DECK_COLLECTIONS)) read.add(c);
  // a collection of media or users is reached through the featured_media_id / author_id of the entries of a collection a screen reads
  const referenced = new Set(plan.inputs.collections.filter((c) => read.has(c.value.collection)).flatMap((c) => c.value.entries.flatMap((e) => {
    const r = e as { featured_media_id?: string; author_id?: string };
    return [r.featured_media_id ?? "", r.author_id ?? ""];
  })));
  for (const c of plan.inputs.collections) if (c.value.entries.length && c.value.entries.every((e) => (e.kind === "media" || e.kind === "user") && referenced.has(e.id))) read.add(c.value.collection);
  // the items under a menu item (kind menu_item with a parent_id) are reached through `id|menu` of the menu a screen reads
  const readIds = new Set(plan.inputs.collections.filter((c) => read.has(c.value.collection)).flatMap((c) => c.value.entries.map((e) => e.id)));
  for (const c of plan.inputs.collections) if (c.value.entries.length && c.value.entries.every((e) => e.kind === "menu_item" && readIds.has((e as { parent_id?: string }).parent_id ?? ""))) read.add(c.value.collection);
  for (const c of plan.inputs.collections) if (!read.has(c.value.collection)) problems.push(`xgen/fixtures/${c.value.collection}.json: no screen reads the collection ${c.value.collection}`);
  // organisms: one that no screen draws, directly or inside another
  const byName = new Map(plan.inputs.organisms.map((o) => [o.value.name, o.value]));
  const used = new Set<string>();
  const add = (n: string): void => { if (used.has(n)) return; used.add(n); const o = byName.get(n); if (o) for (const m of organismsIn(o.view)) add(m); };
  for (const s of plan.inputs.screens) for (const n of s.value.organisms) add(n);
  for (const o of plan.inputs.organisms) if (o.value.id.startsWith("organism.") && !used.has(o.value.name)) problems.push(`${relative(join(root, ".."), o.file)}: organism ${o.value.name} is drawn by no screen and no other organism`);
  // dictionary: a block text without its block, a status word no fixture uses (whether a key is read at all is the `dictionary` group)
  const dict = plan.inputs.dictionary.value as Record<string, unknown>;
  const leaves = leavesOf(dict);
  const statuses = new Set(plan.inputs.collections.flatMap((c) => c.value.entries.flatMap((e) => Object.values((e as { metadata?: Record<string, { value?: unknown }> }).metadata ?? {}).map((m) => String(m.value)))));
  for (const k of leaves) if (k.startsWith("status.") && !statuses.has(k.slice("status.".length))) problems.push(`xgen/content/ui/en.json: ${k} is a status word no fixture uses`);
  const blocks = plan.inputs.blocks.map((b) => b.value);
  const bd = (dict["blocks"] ?? {}) as Record<string, Record<string, unknown>>;
  for (const part of ["names", "docs", "variants"]) for (const k of Object.keys(bd[part] ?? {})) if (!blocks.some((b) => b.id === `block.${k}`)) problems.push(`xgen/content/ui/en.json: blocks.${part}.${k} belongs to no block`);
  for (const b of blocks) {
    const k = b.id.slice("block.".length);
    for (const key of Object.keys((bd["variants"]?.[k] ?? {}) as object)) if (!b.variants.some((v) => v.id === key)) problems.push(`xgen/content/ui/en.json: blocks.variants.${k}.${key} belongs to no variant`);
  }
  // e2e: a block without facts is checked by its own branch of the legacy checks; a block with neither is not tested
  const legacy = ["generic.ts", "blocks.ts"].map((f) => readFileSync(join(root, "check", "src", "e2e", f), "utf8")).join("\n");
  for (const b of blocks) {
    const k = b.id.slice("block.".length);
    if (!(b.facts?.length) && !legacy.includes(`case "${k}"`) && !legacy.includes(`key === "${k}"`)) problems.push(`xgen/specs/blocks/${k}.json: no facts and no branch in xgen/check/src/e2e/generic.ts or blocks.ts; the e2e does not test its variants`);
  }
  return { name: "dead", what: "no fixture or organism that nothing reaches, no block text without its block, no status word without a fixture; every block is tested by facts or by a branch of the e2e", problems };
}

/** a value with the identity of an entry taken out, so two entries with the same content compare equal */
const withoutIdentity = (v: unknown): unknown => (Array.isArray(v) ? v.map(withoutIdentity) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !["id", "collection", "slug", "created_at", "updated_at", "published_at"].includes(k)).map(([k, x]) => [k, withoutIdentity(x)])) : v);
/** a view shorter than this many characters of JSON may coincide by chance */
const MIN_VIEW_CHARS = 200;

export function checkDuplicates(plan: Plan): CheckResult {
  const problems: string[] = [];
  const root = join(plan.xgenRoot, "..");
  const group = (items: Array<{ key: string; file: string }>, what: string): void => {
    const by = new Map<string, string[]>();
    for (const i of items) by.set(i.key, [...(by.get(i.key) ?? []), relative(root, i.file)]);
    for (const files of by.values()) if (files.length > 1) problems.push(`${what}: ${files.join(" and ")} are the same; keep one`);
  };
  group(plan.inputs.organisms.map((o) => ({ key: JSON.stringify(o.value.view), file: o.file })).filter((x) => x.key.length > MIN_VIEW_CHARS), "views");
  group(plan.inputs.collections.map((c) => ({ key: JSON.stringify(withoutIdentity(c.value.entries)), file: c.file })), "fixtures");
  // a record type of one name has one shape
  const shapes = new Map<string, Map<string, string[]>>();
  for (const o of plan.inputs.organisms) for (const [name, fields] of Object.entries((o.value as { records?: Record<string, unknown> }).records ?? {})) {
    const m = shapes.get(name) ?? new Map<string, string[]>();
    m.set(JSON.stringify(fields), [...(m.get(JSON.stringify(fields)) ?? []), relative(root, o.file)]);
    shapes.set(name, m);
  }
  for (const [name, m] of shapes) {
    const all = [...m.values()].flat();
    if (m.size > 1) problems.push(`record ${name}: ${m.size} different shapes in ${all.join(", ")}`);
    else if (all.length > 1) problems.push(`record ${name}: declared in ${all.join(", ")}; declare it once and import the type`);
  }
  return { name: "duplicates", what: "no two organisms with the same view, no two fixtures with the same entries, every record type declared once", problems };
}

export function checkVersions(plan: Plan): CheckResult {
  const problems: string[] = [];
  const root = join(plan.xgenRoot, "..");
  const specs: Array<{ file: string; value: { specVersion?: unknown } }> = [
    ...plan.inputs.organisms, ...plan.inputs.screens, ...plan.inputs.blocks,
    ...plan.apps.map((a) => ({ file: join(a.dir, "xgen.app.json"), value: a.app as { specVersion?: unknown } })),
  ];
  for (const s of specs) { const why = versionProblem(s.value); if (why) problems.push(`${relative(root, s.file)}: ${why}`); }
  if (!existsSync(join(xgenPaths(plan.xgenRoot).docs, "migrations.md"))) problems.push("xgen/docs/migrations.md: missing; it holds the log of the versions");
  return { name: "versions", what: "every spec is on the current specVersion, and the migrations are documented", problems };
}

/** every package keeps tests of its own */
export function checkTests(plan: Plan): CheckResult {
  const problems: string[] = [];
  for (const l of LAYERS) if (!walk(join(plan.xgenRoot, l.dir, "test")).some((f) => f.endsWith(".test.ts"))) problems.push(`xgen/${l.dir}: no tests; add xgen/${l.dir}/test/*.test.ts`);
  return { name: "tests", what: "every package of the generation layer has tests", problems };
}
