// The `blocks` group of `xgen check`: a block is data, so the check reads the data against the organism it names, the fixtures and the dictionary.
import { xgenPaths } from "@ui8kit/xgen-schema";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { basename } from "node:path";
import { validate } from "@ui8kit/xgen-schema";
import { axisField, blockKey, drawnBy, expandComposed, isGroup, literalsOf, organismsIn, THEMES, type BlockSpec, type OrganismSpec, type Value } from "@ui8kit/xgen-screens";
import type { Plan } from "@ui8kit/xgen-generator";
import type { CheckResult } from "./result";

const CYRILLIC = /[\u0400-\u04FF]/;
/** actions a page may call (the only one is the theme button) */
const ACTIONS = new Set(["toggleTheme"]);

function refsIn(v: unknown, acc: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => refsIn(x, acc));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["$"] === "string") acc.push(o["$"]);
    Object.values(o).forEach((x) => refsIn(x, acc));
  }
  return acc;
}

export function checkBlocks(plan: Plan): CheckResult {
  const problems: string[] = [];
  const dict = plan.inputs.dictionary.value as Record<string, unknown>;
  const has = (path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
  const byName = new Map(plan.inputs.organisms.map((o) => [o.value.name, o.value as OrganismSpec]));
  const patterns = new Set(plan.inputs.organisms.filter((o) => /^(pattern|part)\./.test(o.value.id)).map((o) => o.value.name));
  let variantCount = 0;
  const icons = new Set(Object.keys((JSON.parse(readFileSync(xgenPaths(plan.xgenRoot).lucide, "utf8")) as { icons: Record<string, unknown> }).icons));
  for (const t of THEMES) for (const k of ["title", "text"]) if (typeof has(`blocks.themes.${t}.${k}`) !== "string") problems.push(`theme ${t}: no text ui.blocks.themes.${t}.${k}`);

  for (const loaded of plan.inputs.blocks) {
    const b: BlockSpec = loaded.value;
    const key = blockKey(b);
    const at = `block ${key}`;
    const text = readFileSync(loaded.file, "utf8");
    // schema, name of the file, no markup, no gradient, no Cyrillic
    for (const e of validate("block", b)) problems.push(`${at}: ${e}`);
    if (basename(loaded.file) !== `${key}.json`) problems.push(`${at}: the file is ${basename(loaded.file)}, expected ${key}.json`);
    if (["view", "layout", "areas", "use", "children"].some((k) => k in b)) problems.push(`${at}: holds markup; a block is data`);
    if (/gradient/i.test(text)) problems.push(`${at}: has a gradient`);
    if (CYRILLIC.test(text)) problems.push(`${at}: Cyrillic text`);

    if (!(THEMES as readonly string[]).includes(b.theme)) problems.push(`${at}: theme ${b.theme} is not one of ${THEMES.join(", ")}`);
    // the organism and its axes
    const org = byName.get(b.organism);
    if (!org) { problems.push(`${at}: no organism ${b.organism}`); continue; }
    const orgsAll = Object.fromEntries(byName);
    const alt = b.alt ? byName.get(b.alt.organism) : undefined;
    if (b.alt && !alt) problems.push(`${at}: no organism ${b.alt.organism} (alt)`);
    /** the organisms the block draws: its own and the alt one */
    const drawn = [org, ...(alt ? [alt] : [])];
    for (const [axis, values] of Object.entries(b.axes)) {
      if (b.alt?.axis === axis) {
        if (JSON.stringify(values) !== JSON.stringify(b.alt.values)) problems.push(`${at}: the alt axis ${axis} takes ${b.alt.values.join(", ")}`);
        if (b.defaults[axis] !== b.alt.values[0]) problems.push(`${at}: the alt axis ${axis} starts from ${b.alt.values[0]}`);
        continue;
      }
      const field = axisField(org, axis, orgsAll);
      if (!field) { problems.push(`${at}: axis ${axis} is not a prop (or a field of a grouped prop) of ${org.name}`); continue; }
      const union = literalsOf(field.ts);
      if (!union) { problems.push(`${at}: axis ${axis}: ${org.name}.${axis} is not a union of literals`); continue; }
      const missing = union.filter((v) => !values.includes(v));
      const extra = values.filter((v) => !union.includes(v));
      if (extra.length) problems.push(`${at}: axis ${axis} has values the organism does not know: ${extra.join(", ")}`);
      if (missing.length) problems.push(`${at}: axis ${axis} leaves out ${missing.join(", ")} of ${org.name}.${axis}`);
      const d = b.defaults[axis];
      if (d === undefined || !values.includes(d)) problems.push(`${at}: axis ${axis} has no valid default`);
      else if (field.default !== undefined && String(field.default) !== d) problems.push(`${at}: default of ${axis} is ${d}, the organism says ${String(field.default)}`);
    }
    /** a grouped prop sets an axis when it carries the field of a dotted axis */
    const setsAxis = (props: Record<string, Value>): string[] => Object.keys(b.axes).filter((axis) => {
      const [k, f] = axis.split(".");
      const v = props[k!];
      return v !== undefined && (f === undefined || (isGroup(v) && f in v));
    });
    for (const k of Object.keys(b.defaults)) if (!(k in b.axes)) problems.push(`${at}: default for ${k}, which is not an axis`);

    // variants resolve: only declared axes and values, distinct rows, every axis value shown
    const seen = new Map<string, string>();
    const used = new Map<string, Set<string>>(Object.entries(b.axes).map(([a]) => [a, new Set([b.defaults[a] ?? ""])]));
    if (new Set(b.variants.map((v) => v.id)).size !== b.variants.length) problems.push(`${at}: variant ids are not unique`);
    for (const v of b.variants) {
      variantCount++;
      for (const [axis, value] of Object.entries(v.set)) {
        if (!(axis in b.axes)) { problems.push(`${at}.${v.id}: ${axis} is not an axis`); continue; }
        if (!b.axes[axis]!.includes(value)) problems.push(`${at}.${v.id}: ${axis}="${value}" is not one of ${b.axes[axis]!.join(", ")}`);
        used.get(axis)?.add(value);
      }
      const vorg = byName.get(drawnBy(b, v)) ?? org;
      for (const axis of setsAxis(v.props ?? {})) problems.push(`${at}.${v.id}: ${axis} is an axis; set it in "set"`);
      for (const [k, val] of Object.entries(v.props ?? {})) {
        if (!vorg.props.some((p) => p.name === k)) problems.push(`${at}.${v.id}: prop ${k} is not a prop of ${vorg.name}`);
        for (const r of refsIn(val)) if (r.startsWith("ui.") ? has(r.slice(3)) === undefined : !b.data.some((x) => x.as === r.split(".")[0])) problems.push(`${at}.${v.id}: ${r} is not in the content or the data`);
      }
      const row = JSON.stringify(Object.keys(b.axes).map((a) => v.set[a] ?? b.defaults[a]));
      const twin = seen.get(row);
      if (twin) problems.push(`${at}.${v.id}: same row as ${twin}`);
      seen.set(row, v.id);
      if (typeof has(`blocks.variants.${key}.${v.id}`) !== "string") problems.push(`${at}.${v.id}: no label ui.blocks.variants.${key}.${v.id}`);
    }
    for (const [axis, values] of Object.entries(b.axes)) for (const value of values) if (!used.get(axis)?.has(value)) problems.push(`${at}: no variant shows ${axis}="${value}"`);
    const labels = has(`blocks.variants.${key}`);
    if (labels && typeof labels === "object") for (const id of Object.keys(labels)) if (!b.variants.some((v) => v.id === id)) problems.push(`${at}: content has a label for the missing variant ${id}`);
    for (const k of ["names", "docs"]) if (typeof has(`blocks.${k}.${key}`) !== "string") problems.push(`${at}: no text ui.blocks.${k}.${key}`);

    // slots: the patterns the organism is made of
    const made = [...organismsIn(drawn.map((o) => o.view))].filter((n) => patterns.has(n)).sort();
    if (JSON.stringify(made) !== JSON.stringify([...b.slots].sort())) problems.push(`${at}: slots ${JSON.stringify(b.slots)} differ from the parts and patterns of ${org.name}: ${JSON.stringify(made)}`);
    for (const s of b.slots) if (!patterns.has(s)) problems.push(`${at}: ${s} is not a part or pattern`);

    // events
    for (const [ev, action] of Object.entries(b.events ?? {})) {
      if (!drawn.every((o) => o.events?.some((e) => e.name === ev))) problems.push(`${at}: ${org.name} has no event ${ev}`);
      if (!ACTIONS.has(action)) problems.push(`${at}: action ${action} is not one a page may call`);
    }

    // data: the fixtures exist and carry every field
    for (const d of b.data) {
      const col = plan.inputs.collections.find((c) => c.value.collection === d.collection);
      if (!col) { problems.push(`${at}: no fixture ${d.collection}`); continue; }
      if (col.value.kind !== d.kind) problems.push(`${at}: fixture ${d.collection} is of kind ${col.value.kind}, the block says ${d.kind}`);
      if (!col.value.entries.length) problems.push(`${at}: fixture ${d.collection} is empty`);
      if (!org.records[d.record]) { if (!(plan.inputs.organisms.some((o) => o.value.records[d.record]))) problems.push(`${at}: no record ${d.record}`); }
      // a field the record marks optional (an old price, an image) may be missing from an entry
      const rec = (org.records[d.record] ?? plan.inputs.organisms.find((o) => o.value.records[d.record])?.value.records[d.record]) as { name: string; optional?: boolean }[] | undefined;
      const optional = new Set((rec ?? []).filter((f) => f.optional).map((f) => f.name));
      for (const [field, path] of Object.entries(d.fields)) for (const e of col.value.entries) {
        const v = path.split("|")[0]!.split(".").reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], e);
        if (v === undefined && !optional.has(field)) problems.push(`${at}: ${d.collection}/${e.id} has no ${path} (field ${field})`);
        if (field === "icon" && typeof v === "string" && !icons.has(v)) problems.push(`${at}: ${d.collection}/${e.id}: icon ${v} is not a Lucide glyph of the registry`);
      }
    }

    // sample: props of the organism, required ones present, texts from the dictionary, data from the block
    const sample = b.sample.props;
    for (const k of Object.keys(sample)) if (!drawn.some((o) => o.props.some((p) => p.name === k))) problems.push(`${at}: sample prop ${k} is not a prop of ${drawn.map((o) => o.name).join(" or ")}`);
    for (const o of drawn) for (const p of o.props) if (p.required && !(p.name in sample)) problems.push(`${at}: sample lacks the required prop ${o.name}.${p.name}`);
    for (const axis of setsAxis(sample)) problems.push(`${at}: sample sets the axis ${axis}; a variant does that`);
    for (const r of refsIn(sample)) {
      if (r.startsWith("ui.")) { if (has(r.slice(3)) === undefined) problems.push(`${at}: ${r} is not in content/ui/en.json`); }
      else if (!b.data.some((d) => d.as === r.split(".")[0])) problems.push(`${at}: sample reads ${r}, which no data entry provides`);
    }
    // a record of labels handed over by a dictionary reference carries every field of the record
    for (const [name, val] of Object.entries(sample)) {
      const prop = org.props.find((p) => p.name === name);
      const r = prop && typeof prop.type === "object" && "record" in prop.type ? prop.type.record : null;
      const ref = (val as { $?: string }).$;
      if (r && ref?.startsWith("ui.")) {
        const sub = has(ref.slice(3)) as Record<string, unknown> | undefined;
        for (const f of org.records[r] ?? []) if (!f.optional && typeof sub?.[f.name] !== "string") problems.push(`${at}: ${ref}.${f.name} is missing (record ${r})`);
      }
    }
    // a Plan picked by id must exist in the fixture
    const pick = JSON.stringify(sample).match(/"op":"pick","args":\[\{"\$":"(\w+)"\},"([^"]+)"\]/);
    if (pick) {
      const d = b.data.find((x) => x.as === pick[1]);
      const col = d && plan.inputs.collections.find((c) => c.value.collection === d.collection);
      if (!col?.value.entries.some((e) => e.id === pick[2])) problems.push(`${at}: sample picks ${pick[2]}, which is not in the fixture`);
    }
  }

  // the composed screens: every use names a block and one of its variants; the gallery shows every variant
  const blocks = plan.inputs.blocks.map((b) => b.value);
  const orgs = Object.fromEntries([...byName.entries()]);
  for (const s of plan.inputs.screens) {
    if (!s.composed) continue;
    const r = expandComposed(s.composed, blocks, orgs);
    for (const m of r.problems) problems.push(`composed ${m}`);
    if (s.composed.gallery) {
      const dump = JSON.stringify(s.value.areas);
      for (const b of blocks) for (const v of b.variants) if (!dump.includes(`"data-variant":"${v.id}"`) || !dump.includes(`"data-block":"${blockKey(b)}"`)) problems.push(`gallery ${s.value.name}: no section for ${blockKey(b)}.${v.id}`);
    }
  }
  for (const f of plan.inputs.organisms.filter((o) => byName.get(o.value.name) && ["SectionFrame", "MediaFrame", "ActionGroup", ...plan.inputs.blocks.flatMap((b) => [b.value.organism, ...(b.value.alt ? [b.value.alt.organism] : [])])].includes(o.value.name))) {
    if (/gradient/i.test(JSON.stringify(f.value))) problems.push(`${f.value.name}: has a gradient`);
  }
  return { name: "blocks", what: `${plan.inputs.blocks.length} blocks, ${variantCount} variants: schema, organism and axes, variants resolve and show every axis value, fixtures, text from the dictionary, no Cyrillic, no gradients; composed screens use real blocks and variants`, problems };
}
