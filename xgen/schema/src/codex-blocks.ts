// The block data manifest (xgen/schema/codex/blocks.json), generated from the sources: every kit block (xgen/specs/blocks,
// its data bindings, settings, dictionary labels and empty state read from the spec, its organism and the dictionary),
// every screen spec (the blocks it composes), every magazine template and part (the kit blocks it imports, the data it
// reads) and every taste screen. By hand, kept from the existing file: `status` (todo/done), `required` / `optional` of a
// binding, `note` and `emptyMode`. A new block starts as todo; a moved source is followed.
//   bun run codex:blocks            writes the file
//   xgen check (group codex)        fails when the file is behind the sources (drift)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { CODEX_FIELDS } from "../../runtimes/core/assets/app/fields";
import { xgenPaths } from "./paths";

export const BLOCKS_PATH = join(import.meta.dir, "..", "codex", "blocks.json");
const XGEN = join(import.meta.dir, "..", "..");

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
export interface Binding { prop: string; collection?: string; kind: string; record?: string; map?: string; list?: boolean; required?: string[]; optional?: string[] }
export interface Labels { prop: string; dictionary: string; keys: string[] }
export interface BlockEntry {
  id: string; surface: string; spec?: string; source: string; status: "todo" | "done";
  data?: Binding[]; settings?: string[]; labels?: Labels[]; emptyState?: boolean; emptyMode?: "label" | "omit";
  uses?: string[]; collections?: string[]; note?: string;
}
export interface BlocksDoc { $schema: string; version: string; contract: string; fieldMaps: string; blocks: BlockEntry[] }

/** where the sources are: the xgen folder, the magazine templates and the taste screens */
export interface BlockSources { xgen: string; workspace: string; magazine: string; taste: string }
export const blockSources = (xgen = XGEN): BlockSources => {
  const workspace = join(xgen, "..");
  return { xgen, workspace, magazine: join(workspace, "apps", "magazine", "src", "templates"), taste: join(workspace, "packages", "taste-screens", "src", "screens") };
};

const readJson = (f: string): Obj => JSON.parse(readFileSync(f, "utf8")) as Obj;
const jsonFiles = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => join(dir, f)) : []);
const isObj = (v: Json | undefined): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const at = (o: Json | undefined, path: string): Json | undefined => path.split(".").reduce<Json | undefined>((c, k) => (isObj(c) ? c[k] : undefined), o);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** every reference `{ "$": ref }` under a prop value: the dotted prop path (op nodes skipped) and whether it is one record (pick, nth) */
function refsOf(v: Json | undefined, path: string, one = false, acc: { path: string; ref: string; one: boolean }[] = []) {
  if (Array.isArray(v)) v.forEach((x) => refsOf(x, path, one, acc));
  else if (isObj(v)) {
    if (typeof v.$ === "string") acc.push({ path, ref: v.$, one });
    else if (typeof v.op === "string") refsOf(v.args, path, one || v.op === "pick" || v.op === "nth", acc);
    else for (const [k, x] of Object.entries(v)) refsOf(x, path ? `${path}.${k}` : k, one, acc);
  }
  return acc;
}

/** the organism specs by name and every record type they declare */
function organisms(src: BlockSources) {
  const byName = new Map<string, Obj>();
  const records = new Map<string, string[]>();
  for (const dir of ["organisms", "parts", "patterns"]) for (const f of jsonFiles(xgenPaths(src.xgen).specs(dir))) {
    const o = readJson(f);
    byName.set(o.name as string, o);
    for (const [k, fs] of Object.entries((o.records ?? {}) as Record<string, { name: string }[]>)) records.set(k, fs.map((x) => x.name));
  }
  return { byName, records };
}

// equal maps (page and menuItem): the one named after the binding's kind first ("menu_item" -> menuItem)
const mapOf = (fields: Json | undefined, kind = ""): string | undefined => {
  const hits = Object.entries(CODEX_FIELDS).filter(([, m]) => same({ ...m }, fields)).map(([k]) => k);
  const norm = kind.replace(/_/g, "").toLowerCase();
  return hits.find((k) => k.toLowerCase() === norm) ?? hits[0];
};

function kitBlock(file: string, src: BlockSources, orgs: ReturnType<typeof organisms>, dict: Obj): BlockEntry {
  const s = readJson(file);
  const sample = (at(s, "sample.props") ?? {}) as Obj;
  const variantProps = ((s.variants ?? []) as Obj[]).map((v) => (v.props ?? {}) as Obj);
  const refs = [sample, ...variantProps].flatMap((p) => Object.entries(p).flatMap(([k, v]) => refsOf(v, k)));
  const specData = (s.data ?? []) as Obj[];
  const aliases = new Set(specData.map((d) => d.as as string));
  const data: Binding[] = specData.map((d) => {
    const r = refs.find((x) => x.ref === d.as);
    const map = mapOf(d.fields, typeof d.kind === "string" ? d.kind : "");
    return {
      prop: r?.path ?? (d.as as string),
      ...(d.collection ? { collection: d.collection as string } : {}),
      kind: d.kind as string,
      ...(d.record ? { record: d.record as string } : {}),
      ...(map ? { map } : {}),
      list: !r?.one,
    };
  });
  const org = orgs.byName.get(s.organism as string);
  const props = ((org?.props ?? []) as { name: string; type: Json }[]);
  const labels: Labels[] = [];
  for (const r of refs) {
    if (!r.ref.startsWith("ui.") || labels.some((l) => l.prop === r.path)) continue;
    const dictionary = r.ref.slice(3);
    const value = at(dict, dictionary);
    const type = props.find((p) => p.name === r.path)?.type;
    const recordName = isObj(type) ? String(type.record ?? type.ts ?? "") : "";
    const fields = orgs.records.get(recordName);
    const strings = isObj(value) ? Object.keys(value).filter((k) => typeof value[k] === "string") : [];
    labels.push({ prop: r.path, dictionary, keys: fields ? fields.filter((k) => strings.includes(k)) : strings });
  }
  const touched = new Set(refs.filter((r) => r.ref.startsWith("ui.") || aliases.has(r.ref)).map((r) => r.path.split(".")[0]!));
  const settings = props.map((p) => p.name).filter((n) => !touched.has(n));
  return {
    id: s.organism as string, surface: "kit-block", spec: s.id as string, source: rel(src, file), status: "todo",
    data, settings, labels, emptyState: ((s.slots ?? []) as string[]).includes("EmptyState"),
  };
}

const rel = (src: BlockSources, f: string): string => relative(src.workspace, f).split("\\").join("/");

function screen(file: string, src: BlockSources, dict: Obj, kitBySpec: Map<string, BlockEntry>): BlockEntry {
  const s = readJson(file);
  const uses = new Set<string>();
  const labels: Labels[] = [];
  const label = (prop: string, dictionary: string) => {
    const value = at(dict, dictionary);
    if (value === undefined || labels.some((l) => l.dictionary === dictionary)) return;
    labels.push({ prop, dictionary, keys: isObj(value) ? Object.keys(value).filter((k) => typeof value[k] === "string").sort() : [] });
  };
  // blocks composed (`block`), dictionary refs (`{ "$": "ui.x" }`) and dictionary keys of menus and columns (`titleKey`, `label`)
  const walk = (v: Json | undefined, key: string): void => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (isObj(v)) {
      if (typeof v.block === "string") uses.add(`block.${v.block}`);
      if (typeof v.$ === "string" && v.$.startsWith("ui.")) label(key, v.$.slice(3));
      for (const [k, x] of Object.entries(v)) {
        if ((k === "titleKey" || k === "label") && typeof x === "string" && typeof at(dict, x) === "string") label(k, x);
        else walk(x, k);
      }
    }
  };
  walk(s, "");
  const collections = [isObj(s.source) ? s.source.collection : undefined, ...((s.sources ?? []) as Obj[]).map((x) => x.collection)].filter((c): c is string => typeof c === "string");
  // the data: a list screen's own source, and the bindings of the blocks it composes (one per collection)
  const data: Binding[] = [];
  if (isObj(s.source)) {
    const map = mapOf(s.source.fields, String(s.source.kind ?? ""));
    data.push({ prop: "source", collection: String(s.source.collection), kind: String(s.source.kind), record: String(s.source.record ?? ""), ...(map ? { map } : {}), list: true });
  }
  for (const u of [...uses].sort()) for (const d of kitBySpec.get(u)?.data ?? [])
    if (!data.some((x) => x.collection === d.collection && x.map === d.map)) data.push({ ...d, prop: `${kitBySpec.get(u)!.id}.${d.prop}` });
  // the route table, the URL state and the frame switches are settings of the app, not Codex data
  const settings = ["routes", "state", "nav", "menu", "frame", "chunks", "requireH1", "nameLandmarks"].filter((k) => s[k] !== undefined);
  return { id: s.id as string, surface: "xgen-screen", source: rel(src, file), status: "todo", data, settings, labels, emptyState: false, uses: [...uses].sort(),
    ...(collections.length ? { collections: [...new Set(collections)].sort() } : {}) };
}

const PARTS = new Set(["header", "footer"]);
/** the template data (apps/magazine/src/templates/data.ts): `key: fromCodex<Record>(collection, F.map, ...)` per collection */
function templateData(src: BlockSources): Map<string, { record: string; collection: string; map: string }> {
  const file = join(src.magazine, "data.ts");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const out = new Map<string, { record: string; collection: string; map: string }>();
  for (const m of text.matchAll(/^\s*(\w+): (?:rb\()?fromCodex<(\w+)[^>]*>\((?:trail\()?(\w+)\)?, F\.(\w+)/gm)) out.set(m[1]!, { record: m[2]!, collection: m[3]!, map: m[4]! });
  return out;
}
/** a binding of a template: the kind from the fixtures, required = the map's fields every entry has */
function templateBinding(key: string, d: { record: string; collection: string; map: string }, src: BlockSources): Binding {
  const file = join(xgenPaths(src.xgen).fixtures, `${d.collection}.json`);
  const entries = (existsSync(file) ? ((readJson(file).entries ?? []) as Obj[]) : []);
  const map = (CODEX_FIELDS as Record<string, Record<string, string>>)[d.map] ?? {};
  const paths = [...new Set(Object.values(map).map((v) => v.split("|")[0]!))];
  const has = (e: Obj, path: string) => { const v = at(e, path); return v !== undefined && v !== null && v !== ""; };
  const required = paths.filter((p) => entries.length > 0 && entries.every((e) => has(e, p)));
  return { prop: `d.${key}`, collection: d.collection, kind: String(entries[0]?.kind ?? ""), record: d.record, map: d.map, list: true,
    required, optional: paths.filter((p) => !required.includes(p)) };
}
function template(file: string, src: BlockSources, kit: Set<string>, dict: Obj, tdata: ReturnType<typeof templateData>): BlockEntry {
  const text = readFileSync(file, "utf8");
  const name = file.split("/").pop()!.replace(/\.svelte$/, "");
  const imported = [...text.matchAll(/import \{([^}]*)\} from "@ui8kit\/svelte-ui"/g)].flatMap((m) => m[1]!.split(",").map((x) => x.trim())).filter(Boolean);
  // `d.x` (and `dataFor(..).x` in a part) reads a collection of the template data; `d.ui.*` the dictionary
  const keys = [...new Set([...text.matchAll(/(?:\bd|dataFor\([^)]*\))\.([A-Za-z]+)/g)].map((m) => m[1]!).filter((c) => c !== "ui"))].sort();
  const collections = [...new Set(keys.map((k) => tdata.get(k)?.collection ?? k))].sort();
  const data = keys.filter((k) => tdata.has(k)).map((k) => templateBinding(k, tdata.get(k)!, src));
  const labels: Labels[] = [];
  for (const m of text.matchAll(/(?:(\w+)=\{)?\bd\.ui\.([A-Za-z0-9_.]+)/g)) {
    const dictionary = m[2]!;
    if (labels.some((l) => l.dictionary === dictionary)) continue;
    const value = at(dict, dictionary);
    labels.push({ prop: m[1] ?? "ui", dictionary, keys: isObj(value) ? Object.keys(value).filter((k) => typeof value[k] === "string").sort() : [] });
  }
  // the deck copy (`c`: brand, title, lead, cta of the taste deck) and the layout props of a part are settings, not Codex data
  const settings = ["c", ...[...text.matchAll(/let \{ ([^}]*) \}/g)].flatMap((m) => m[1]!.split(",").map((x) => x.trim().split(/[ =]/)[0]!)).filter((x) => x && x !== "c")];
  const uses = imported.filter((n) => kit.has(n)).sort();
  return { id: `template.${name}`, surface: PARTS.has(name) ? "magazine-part" : "magazine-template", source: rel(src, file), status: "todo",
    data, settings: [...new Set(settings)], labels, emptyState: false, uses, collections };
}

/** the deck parts of a taste screen: deck key -> collection, kind, record type and central map (xgen/runtimes/core/src/decks.ts) */
const DECK_PARTS: Record<string, [string, string, string, string]> = {
  stats: ["deckstats", "deck_stat", "DeckStat", "deckStat"], items: ["deckitems", "deck_item", "DeckItem", "deckItem"],
  plans: ["deckplans", "deck_plan", "DeckPlan", "deckPlan"], quotes: ["deckquotes", "deck_quote", "DeckQuote", "deckQuote"], faq: ["deckfaq", "deck_faq", "DeckFaq", "deckFaq"],
};
/** the kit-data adapters (packages/taste-screens/src/kit-data.ts) and the deck key each reads */
const ADAPTERS: Record<string, string> = { logos: "tags", topics: "tags", features: "items", stats: "stats" };
/** a taste screen reads one copy deck (`c`): the deck entry's fields and its parts, in the screen and in the parts it draws;
 *  the attributes it gives a part (TopBar layout, tone, ...) are settings. stats and items are on every deck (decks.ts); a
 *  screen reads the other parts as `c.x ?? []`, so a deck without them leaves the part out (empty state: omit). */
function tasteScreen(file: string, src: BlockSources, kit: Set<string>): BlockEntry {
  const text = readFileSync(file, "utf8");
  const imported = [...text.matchAll(/import \{([^}]*)\} from "@ui8kit\/svelte-ui"/g)].flatMap((m) => m[1]!.split(",").map((x) => x.trim()));
  const uses = imported.filter((n) => kit.has(n)).sort();
  const parts = [...text.matchAll(/import (\w+) from "\.\.\/parts\/([\w-]+)\.svelte"/g)].map((m) => ({ tag: m[1]!, text: readFileSync(join(file, "..", "..", "parts", `${m[2]}.svelte`), "utf8") }));
  const all = [text, ...parts.map((x) => x.text)].join("\n");
  const keys = new Set([...all.matchAll(/\bc\.([a-z]+)/g)].map((m) => m[1]!));
  for (const m of all.matchAll(/\b(\w+)\(c\b/g)) if (ADAPTERS[m[1]!]) keys.add(ADAPTERS[m[1]!]!);
  const deck = CODEX_FIELDS.deck as Record<string, string>;
  const head = Object.keys(deck).filter((k) => keys.has(k)).map((k) => deck[k]!.split("|")[0]!);
  const data: Binding[] = head.length ? [{ prop: "c", collection: "decks", kind: "deck", record: "Deck", map: "deck", list: false, required: [...new Set(head)], optional: [] }] : [];
  for (const [k, [collection, kind, record, map]] of Object.entries(DECK_PARTS)) if (keys.has(k)) {
    const paths = Object.values((CODEX_FIELDS as Record<string, Record<string, string>>)[map]!).map((v) => v.split("|")[0]!);
    data.push({ prop: `c.${k}`, collection, kind, record, map, list: true, required: [...new Set(paths)], optional: [] });
  }
  const settings = [...new Set(parts.flatMap((x) => [...text.matchAll(new RegExp(`<${x.tag}\\b([^>]*)>`, "g"))].flatMap((m) => [...m[1]!.matchAll(/(\w+)=/g)].map((a) => `${x.tag}.${a[1]}`))))].sort();
  return { id: `taste.${file.split("/").pop()!.replace(/\.svelte$/, "")}`, surface: "taste-screen", source: rel(src, file), status: "todo",
    data, settings, labels: [], emptyState: false, uses, collections: data.map((d) => d.collection!) };
}

const ORDER: (keyof BlockEntry)[] = ["id", "surface", "spec", "source", "status", "data", "settings", "labels", "emptyState", "emptyMode", "uses", "collections", "note"];
const ordered = (b: BlockEntry): BlockEntry => Object.fromEntries(ORDER.filter((k) => b[k] !== undefined).map((k) => [k, b[k]])) as unknown as BlockEntry;

/** the hand fields of the existing file carried over: status, note, emptyMode; required / optional by the binding's collection */
function keep(b: BlockEntry, old: BlockEntry | undefined): BlockEntry {
  if (!old) return ordered(b);
  const data = b.data?.map((d) => {
    const o = old.data?.find((x) => (x.collection ?? x.prop) === (d.collection ?? d.prop));
    return { ...d, ...(o?.required ? { required: o.required } : {}), ...(o?.optional ? { optional: o.optional } : {}) };
  });
  return ordered({ ...b, ...(data ? { data } : {}), status: old.status, ...(old.note ? { note: old.note } : {}),
    // emptyMode omit: the block leaves the empty part out (no EmptyState slot), which counts as its empty state
    ...(old.emptyMode ? { emptyMode: old.emptyMode, emptyState: b.emptyState || old.emptyMode === "omit" } : {}) });
}

export function buildBlocks(src = blockSources(), previous: BlocksDoc | undefined = existsSync(BLOCKS_PATH) ? (JSON.parse(readFileSync(BLOCKS_PATH, "utf8")) as BlocksDoc) : undefined): BlocksDoc {
  const paths = xgenPaths(src.xgen);
  const orgs = organisms(src);
  const dict = readJson(paths.dictionary);
  const kitFiles = jsonFiles(paths.specs("blocks"));
  const kitBlocks = kitFiles.map((f) => kitBlock(f, src, orgs, dict));
  const kit = new Set(kitBlocks.map((b) => b.id));
  const svelte = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svelte")).sort().map((f) => join(dir, f)) : []);
  const tdata = templateData(src);
  const templates = svelte(src.magazine).map((f) => template(f, src, kit, dict, tdata));
  // a template has its empty state when every block it composes that reads data has one
  const kitById = new Map(kitBlocks.map((b) => [b.id, b]));
  const prevById = new Map((previous?.blocks ?? []).map((b) => [b.id, b]));
  const emptyOk = (id: string) => { const b = kitById.get(id); const p = prevById.get(id); return !b?.data?.length || !!b.emptyState || p?.emptyMode === "omit"; };
  for (const t of templates) t.emptyState = (t.uses ?? []).every(emptyOk);
  const kitBySpec = new Map(kitBlocks.map((b) => [b.spec!, b]));
  const screens = jsonFiles(paths.specs("screens")).map((f) => screen(f, src, dict, kitBySpec));
  for (const t of screens) t.emptyState = (t.uses ?? []).every((u) => emptyOk(kitBySpec.get(u)?.id ?? ""));
  const tastes = svelte(src.taste).map((f) => tasteScreen(f, src, kit));
  for (const t of tastes) t.emptyState = (t.uses ?? []).every(emptyOk);
  const fresh = [
    ...kitBlocks,
    ...screens,
    ...templates.filter((t) => t.surface === "magazine-template"),
    ...templates.filter((t) => t.surface === "magazine-part"),
    ...tastes,
  ];
  // a block is the same block when its id is (a moved file keeps its id; its source follows)
  const old = new Map((previous?.blocks ?? []).map((b) => [b.id, b]));
  return {
    $schema: "./blocks.schema.json",
    version: previous?.version ?? "0.1.0",
    contract: "@ui8kit/contract v0.4 (codex manifest: ./manifest.json)",
    fieldMaps: "xgen/runtimes/core/assets/app/fields.ts",
    blocks: fresh.map((b) => keep(b, old.get(b.id))),
  };
}

export const blocksText = (d: BlocksDoc): string => JSON.stringify(d, null, 2) + "\n";

/** problems when the file on disk is not what the sources generate */
export function blocksDrift(src = blockSources()): string[] {
  const now = existsSync(BLOCKS_PATH) ? readFileSync(BLOCKS_PATH, "utf8") : "";
  if (!now) return ["xgen/schema/codex/blocks.json: missing (run: bun run codex:blocks)"];
  const want = blocksText(buildBlocks(src, JSON.parse(now) as BlocksDoc));
  if (now === want) return [];
  const a = (JSON.parse(now) as BlocksDoc).blocks, b = (JSON.parse(want) as BlocksDoc).blocks;
  const ids = [...new Set([...a, ...b].map((x) => x.id))].filter((id) => !same(a.find((x) => x.id === id), b.find((x) => x.id === id)));
  return [`xgen/schema/codex/blocks.json: behind the sources (${ids.slice(0, 8).join(", ")}${ids.length > 8 ? `, +${ids.length - 8}` : ""}); run: bun run codex:blocks`];
}

if (import.meta.main) {
  writeFileSync(BLOCKS_PATH, blocksText(buildBlocks()));
  console.log(`wrote ${BLOCKS_PATH}`);
}
