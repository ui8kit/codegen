// The helper every block file uses. A block names an organism and the axes (props of the organism with a union type); the allowed values, the
// defaults and the patterns it is made of are read from the organism, so a block cannot disagree with it. Variants are rows of data.
import { ref } from "../../build";
import { axisField } from "../../compose";
import type { BlockFact, BlockSpec, OrganismSpec, SourceSpec, Value } from "../../ir";

export type Source = SourceSpec & { as: string };
/** a reference into the content dictionary */
export const t = (key: string): Value => ref(`ui.${key}`);

/** the string literals of a TS union type: `"a" | "b"` (numbers count too); null for any other type */
export function literalsOf(tsType: string): string[] | null {
  const out: string[] = [];
  for (const p of tsType.split("|").map((x) => x.trim())) {
    const m = p.match(/^"([^"]*)"$/);
    if (m) out.push(m[1]!);
    else if (/^-?\d+$/.test(p)) out.push(p);
    else return null;
  }
  return out;
}

/** names of the organisms a list of view nodes draws, through every nested slot and branch */
export function organismsIn(node: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => organismsIn(n, acc));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o["organism"] === "string") acc.add(o["organism"]);
    Object.values(o).forEach((v) => organismsIn(v, acc));
  }
  return acc;
}

/** a variant: id, label, the axes it sets, optional case copy (props) */
export type VariantDef = [id: string, label: string, set?: Record<string, string>, props?: Record<string, Value>];

export interface BlockDef {
  key: string;
  theme: BlockSpec["theme"];
  group: string;
  name: string;
  docs: string;
  organism: string;
  /** a second organism for the variants that set `axis` to values[1] (HeroPrompt for chrome "nav") */
  alt?: BlockSpec["alt"];
  fit?: "section" | "card";
  /** the props of the organism that are axes (or fields of a grouped prop: `media.kind`), in the order they are shown */
  axes: string[];
  variants: VariantDef[];
  events?: Record<string, string>;
  facts?: BlockFact[];
  data?: Source[];
  sample: Record<string, Value>;
}

export interface BlockTexts { name: string; docs: string; variants: Record<string, string> }

export function makeDefine(organisms: OrganismSpec[], patterns: Set<string>) {
  const byName = new Map(organisms.map((o) => [o.name, o]));
  return (d: BlockDef): { block: BlockSpec; texts: BlockTexts } => {
    const org = byName.get(d.organism);
    if (!org) throw new Error(`block ${d.key}: no organism ${d.organism}`);
    const axes: Record<string, string[]> = {};
    const defaults: Record<string, string> = {};
    for (const a of d.axes) {
      if (d.alt?.axis === a) { axes[a] = [...d.alt.values]; defaults[a] = d.alt.values[0]; continue; }
      const field = axisField(org, a, Object.fromEntries(byName));
      const lits = field ? literalsOf(field.ts) : null;
      if (!lits) throw new Error(`block ${d.key}: axis ${a} is not a union prop (or union field of a grouped prop) of ${d.organism}`);
      axes[a] = lits;
      defaults[a] = String(field!.default ?? lits[0]);
    }
    // the slots: the components (parts and patterns, by the tier of their id) the organism draws
    const tierOf = (n: string): string => organisms.find((o) => o.name === n)?.id.split(".")[0] ?? "";
    const views = [org.view, ...(d.alt ? [byName.get(d.alt.organism)?.view ?? []] : [])];
    const used = [...organismsIn(views)].filter((n) => patterns.has(n) || tierOf(n) === "part" || tierOf(n) === "pattern").sort();
    const block: BlockSpec = {
      $schema: "../../schema/schemas/block.schema.json",
      specVersion: 1,
      id: `block.${d.key}`,
      name: d.name,
      docs: d.docs,
      theme: d.theme,
      group: d.group,
      ...(d.fit ? { fit: d.fit } : {}),
      organism: d.organism,
      ...(d.alt ? { alt: d.alt } : {}),
      axes,
      defaults,
      variants: d.variants.map(([id, , set, props]) => ({ id, set: set ?? {}, ...(props ? { props } : {}) })),
      slots: used,
      ...(d.events ? { events: d.events } : {}),
      ...(d.facts ? { facts: d.facts } : {}),
      data: d.data ?? [],
      sample: { props: d.sample },
    };
    return { block, texts: { name: d.name, docs: d.docs, variants: Object.fromEntries(d.variants.map(([id, label]) => [id, label])) } };
  };
}
