// The pieces every composed screen is built from: block keys and variants, the props of a use, the node a use draws, the shared values of a
// block page and the labelled section of one variant. compose.ts (pages, the gallery) and compose-catalog.ts (the catalog) use them.
import { call, organism, ref, text, tpl, uniq, use } from "./build";
import { isGroup, type BlockSpec, type BlockUse, type OrganismSpec, type RecordField, type Value, type ViewNode } from "./ir";

export const blockKey = (b: BlockSpec): string => b.id.slice("block.".length);
/** the topics of the catalog, in the order the gallery shows them */
export const THEMES = ["marketing", "commerce", "promo", "content", "account", "dashboard", "onboarding", "support"] as const;
/** blocks by topic, then by name */
export const galleryOf = (blocks: BlockSpec[]): BlockSpec[] => [...blocks].sort((a, b) => THEMES.indexOf(a.theme as (typeof THEMES)[number]) - THEMES.indexOf(b.theme as (typeof THEMES)[number]) || a.id.localeCompare(b.id));

/** the variant of a use: the named one, or the first */
export function variantOf(b: BlockSpec, id?: string): BlockSpec["variants"][number] | undefined {
  return id === undefined ? b.variants[0] : b.variants.find((v) => v.id === id);
}

/** props in layers, later wins; a grouped prop merges field by field (`actions: { cta }` over `actions: { cta, href }` keeps href) */
export function mergeProps(...layers: Array<Record<string, Value> | undefined>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const layer of layers) for (const [k, v] of Object.entries(layer ?? {})) {
    const have = out[k];
    out[k] = isGroup(have) && isGroup(v) ? mergeProps(have, v) : v;
  }
  return out;
}

/** axis values as props: `media.kind: "code"` is the field kind of the grouped prop media */
export function axisProps(set: Record<string, string>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [k, v] of Object.entries(set)) {
    const [group, field] = k.split(".");
    if (field === undefined) out[k] = v;
    else out[group!] = { ...((out[group!] as Record<string, Value> | undefined) ?? {}), [field]: v };
  }
  return out;
}

/** the type and default of an axis: a union prop of the organism, or a union field of a grouped prop (`media.kind`) */
export function axisField(org: OrganismSpec, axis: string, organisms: Record<string, OrganismSpec>): { ts: string; default?: string | number | boolean } | null {
  const [name, field] = axis.split(".");
  const prop = org.props.find((p) => p.name === name);
  if (!prop || typeof prop.type !== "object") return null;
  if (field === undefined) return "ts" in prop.type ? { ts: prop.type.ts, ...(prop.default !== undefined ? { default: prop.default } : {}) } : null;
  const record = "record" in prop.type ? prop.type.record : prop.type.ts;
  const f = recordOf(record, org, organisms)?.find((x) => x.name === field);
  return f ? { ts: f.type, ...(f.default !== undefined ? { default: f.default } : {}) } : null;
}

/** the fields of a record an organism declares or imports */
export function recordOf(name: string, org: OrganismSpec, organisms: Record<string, OrganismSpec>): RecordField[] | undefined {
  if (org.records[name]) return org.records[name];
  const from = org.typeImports?.find((t) => t.names.includes(name))?.from;
  return from && organisms[from] ? recordOf(name, organisms[from]!, organisms) : undefined;
}

/** the organism a variant draws: the block's, or `alt.organism` when the variant sets the alt axis to its second value */
export function drawnBy(b: BlockSpec, variant: BlockSpec["variants"][number]): string {
  return b.alt && (variant.set[b.alt.axis] ?? b.defaults[b.alt.axis]) === b.alt.values[1] ? b.alt.organism : b.organism;
}

/** the props of a block use: sample < axis defaults < variant axes < variant props < the use; axes are string literals */
export function blockProps(b: BlockSpec, variant: BlockSpec["variants"][number], extra: Record<string, Value> = {}, org?: OrganismSpec): Record<string, Value> {
  const all = mergeProps(b.sample.props, axisProps({ ...b.defaults, ...variant.set }), variant.props, extra);
  if (!b.alt) return all;
  // a block that draws two organisms hands each one only the props it has
  delete all[b.alt.axis];
  return org ? Object.fromEntries(Object.entries(all).filter(([k]) => org.props.some((p) => p.name === k))) : all;
}

export function blockNode(b: BlockSpec, variant: BlockSpec["variants"][number], extra: Record<string, Value> = {}, organisms: Record<string, OrganismSpec> = {}): ViewNode {
  const on = Object.fromEntries(Object.entries(b.events ?? {}).map(([ev, action]) => [ev, call(`actions.${action}`)]));
  const name = drawnBy(b, variant);
  return organism(name, blockProps(b, variant, extra, organisms[name]), Object.keys(on).length ? { on } : {});
}

/** the dictionary key of a catalog id: `marketing-hero` is `marketingHero` */
export const dictKey = (id: string): string => id.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
export const TEXT = (key: string): Value => ref(`ui.${key}`);

/** `repeated`: the page uses this block more than once, so its landmarks are named after the block and the variant */
export function expandUse(u: BlockUse, blocks: BlockSpec[], org: Record<string, OrganismSpec>, where: string, autoId: string, problems: string[], repeated = false): { nodes: ViewNode[]; h1: boolean } {
  const b = blocks.find((x) => blockKey(x) === u.block);
  if (!b) { problems.push(`${where}: no block ${u.block}`); return { nodes: [], h1: false }; }
  const variant = variantOf(b, u.variant);
  if (!variant) { problems.push(`${where}: block ${u.block} has no variant ${u.variant}`); return { nodes: [], h1: false }; }
  for (const axis of Object.keys(b.axes)) {
    const [k, field] = axis.split(".");
    const v = u.props?.[k!];
    if (v !== undefined && (field === undefined || (isGroup(v) && field in v))) problems.push(`${where}: ${u.block}.${axis} is an axis; choose a variant instead`);
  }
  const o = org[drawnBy(b, variant)];
  const extra: Record<string, Value> = { ...(u.props ?? {}) };
  if (o?.props.some((p) => p.name === "id") && extra["id"] === undefined) extra["id"] = autoId;
  if (repeated && o?.props.some((p) => p.name === "landmarkLabel") && extra["landmarkLabel"] === undefined) extra["landmarkLabel"] = landmarkName(blockKey(b), variant.id);
  const levelProp = o?.props.find((p) => p.name === "level");
  const level = extra["level"] ?? variant.props?.["level"] ?? levelProp?.default;
  return { nodes: [blockNode(b, variant, extra, org)], h1: levelProp !== undefined && level === 1 };
}


/** the name of the landmarks of one variant of a block: "Hero, Centered" (blocks.landmark, from the dictionary) */
const landmarkName = (key: string, variant: string): Value => uniq(tpl(TEXT("blocks.landmark"), TEXT(`blocks.names.${key}`), TEXT(`blocks.variants.${key}.${variant}`)));

export type OrganismNode = Extract<ViewNode, { organism: string }>;

/** the fields of a grouped prop that the variants on a block page share become one named value:
 * `actions={{ ...HERO_ACTIONS, mode: "two" }}`, so the page shows only what each variant changes.
 * A field is shared when every variant has it; the named value holds its most common value and a variant with another one sets it again.
 * Axis fields (`actions.mode`) stay on each variant: they are what the variant is. */
export function hoistShared(b: BlockSpec, nodes: OrganismNode[], consts: Record<string, Value>, prefix = blockKey(b)): void {
  const props = new Set(nodes.flatMap((n) => Object.keys(n.props ?? {})));
  for (const prop of props) {
    const groups = nodes.map((n) => n.props?.[prop]).filter(isGroup);
    if (groups.length < 2) continue;
    const shared: Record<string, Value> = {};
    for (const f of Object.keys(groups[0]!)) {
      if (`${prop}.${f}` in b.axes || !groups.every((g) => f in g)) continue;
      const counts = new Map<string, number>();
      for (const g of groups) counts.set(JSON.stringify(g[f]), (counts.get(JSON.stringify(g[f])) ?? 0) + 1);
      const [top, n] = [...counts].sort((x, y) => y[1] - x[1])[0]!;
      if (n >= 2) shared[f] = JSON.parse(top) as Value;
    }
    if (Object.keys(shared).length < 3) continue;
    const name = `${prefix}_${prop}`.replace(/-/g, "_").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
    consts[name] = shared;
    for (const n of nodes) {
      const g = n.props?.[prop];
      if (!isGroup(g)) continue;
      const own = Object.fromEntries(Object.entries(g).filter(([f, v]) => !(f in shared) || JSON.stringify(v) !== JSON.stringify(shared[f])));
      n.props![prop] = Object.keys(own).length ? { "...": ref(name), ...own } : ref(name);
    }
  }
}

/** one variant of a block on a page of the gallery or the catalog: a labelled section with the block drawn on the fixtures */
export function variantSection(b: BlockSpec, v: BlockSpec["variants"][number], org: Record<string, OrganismSpec>, drawn: OrganismNode[], labelLevel: 2 | 3): ViewNode {
  const key = blockKey(b);
  const o = org[drawnBy(b, v)];
  const extra: Record<string, Value> = {};
  if (o?.props.some((p) => p.name === "id")) extra["id"] = `${key}-${v.id}`;
  if (o?.props.some((p) => p.name === "level")) extra["level"] = 2;
  // the same block in several variants on one page: its landmarks are named after the block and the variant ("Hero, Centered")
  if (o?.props.some((p) => p.name === "landmarkLabel")) extra["landmarkLabel"] = landmarkName(key, v.id);
  const node = blockNode(b, v, extra, org) as OrganismNode;
  drawn.push(node);
  // a labelled group inside the page section, not a landmark of its own: the page file holds one Block (rule 01)
  return use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { role: "group", "aria-labelledby": `${key}-${v.id}-label`, "data-testid": "variant", "data-block": key, "data-variant": v.id } },
    use("Title", { props: { As: labelLevel, Size: "base", Weight: "bold" }, attrs: { id: `${key}-${v.id}-label`, "data-testid": "variant-label" } }, text(TEXT(`blocks.variants.${key}.${v.id}`))),
    use("Box", { props: { Class: "overflow-clip rounded-xl inset-ring inset-ring-border" }, attrs: { "data-testid": "variant-body" } }, b.fit === "card" ? use("Box", { props: { Class: "mx-auto w-full max-w-sm px-4 py-6" }, attrs: { "data-slot": "container" } }, node) : node));
}

/** a page of a screen (an area): its one Block, a section named by the level 1 heading of the page (given the id `page-title`),
 *  then the container; the screen's main holds it */
export function pageSection(container: ViewNode): ViewNode {
  const h1 = (n: ViewNode): boolean => {
    if ("use" in n && n.use === "Title" && n.props?.["As"] === 1) { n.attrs = { id: PAGE_TITLE, ...(n.attrs ?? {}) }; return true; }
    return "children" in n && Array.isArray(n.children) ? n.children.some(h1) : false;
  };
  if (!h1(container)) throw new Error("pageSection: the page has no level 1 heading to name its section");
  return use("Block", { props: { Tag: "section" }, attrs: { "aria-labelledby": PAGE_TITLE, "data-testid": "page" } }, container);
}
const PAGE_TITLE = "page-title";

/** a labelled group of a page (a topic, a category, a row of tiles): a Stack with role group, never a nested Block (rule 01) */
export const labelledGroup = (gap: "4" | "6", labelledBy: Value, attrs: Record<string, Value>, ...children: ViewNode[]): ViewNode =>
  use("Stack", { props: { Gap: gap, Align: "stretch" }, attrs: { role: "group", "aria-labelledby": labelledBy, ...attrs } }, ...children);

/** the skip link, first in the header of a screen frame (the header part opens on its Block, rule 01) */
export const skipLink = (cls: string): ViewNode =>
  use("LinkPlain", { props: { Href: "#main-content", Class: cls }, attrs: { "data-testid": "skip-link" } }, text(TEXT("site.header.skip")));
