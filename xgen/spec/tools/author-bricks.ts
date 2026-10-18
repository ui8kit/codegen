#!/usr/bin/env bun
// One-time authoring tool: writes the specs of the bricks that canary has and ui8kit/codegen does not
// (range, skeleton; canary's Progress is already the Progress of ui.form.controls). Their base classes are written below.
// After the run the JSON in xgen/specs/ui is the source of truth.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deriveA11y, deriveData, deriveSlots, deriveTokens, type SpecExample, type SpecFile, type SpecPart, type PartDef, type PropDef, type VariantRecipe } from "../src/index";

const ROOT = resolve(process.argv[2] ?? join(import.meta.dir, "../.."));
const THEME = readFileSync(join(ROOT, "runtimes/core/assets/styles/theme.css"), "utf8");
const TOKENS = [...THEME.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]!);
const out = join(ROOT, "specs/ui");
mkdirSync(out, { recursive: true });

const str = (name: string, docs: string, extra: Partial<PropDef> = {}): PropDef => ({ name, type: "string", cva: false, docs, ...extra });
const cva = (name: string, docs: string): PropDef => ({ name, type: "string", cva: true, docs });
const klass = str("Class", "adds Tailwind utilities");
const attrs: PropDef = { name: "Attrs", type: "attrs", cva: false };
const prop = (name: string) => ({ kind: "prop", name }) as const;
const lit = (value: string) => ({ kind: "lit", value }) as const;
const staticAttr = (name: string, value: string) => ({ kind: "static", name, value }) as const;
const orDefault = (name: string, fallback: string) => ({ kind: "cond", test: { kind: "isSet", expr: prop(name) }, then: { kind: "intToString", expr: prop(name) }, else: lit(fallback) }) as const;

interface Def { id: string; dir: string; docs: string; recipe: string; part: PartDef; notes?: SpecFile["runtimeNotes"] }

const defs: Def[] = [
  {
    id: "ui.range", dir: "range", recipe: "range.variants.json",
    docs: "Range renders a styled input[type=range] (single thumb slider). The value is controlled from outside: Value in, an input event out (canary used a bindable prop).",
    part: {
      name: "Range", docs: "Range renders input type=range.", recipeId: "range", classes: { recipe: {} },
      props: [str("Value", "current value as a string, controlled by the caller", { passthrough: true }), { name: "Min", type: "int", cva: false, docs: "lowest value, 0 by default" }, { name: "Max", type: "int", cva: false, docs: "highest value, 100 by default" }, { name: "Step", type: "int", cva: false, docs: "step, 1 by default" }, { name: "Disabled", type: "bool", cva: false, docs: "disables the slider" }, str("AriaLabel", "accessible name"), klass, attrs],
      render: { kind: "element", tag: { kind: "static", tag: "input" }, attrs: [staticAttr("type", "range"), { kind: "class" }, { kind: "expr", name: "min", expr: orDefault("Min", "0") }, { kind: "expr", name: "max", expr: orDefault("Max", "100") }, { kind: "expr", name: "step", expr: orDefault("Step", "1") }, { kind: "expr", name: "value", expr: prop("Value") }, { kind: "bool", name: "disabled", expr: prop("Disabled") }, { kind: "expr", name: "aria-label", expr: prop("AriaLabel") }, { kind: "rest" }], children: [], void: true },
    } as PartDef,
    notes: [{ runtime: "svelte", part: "Range", note: "canary binds the value with $bindable; the contract here is Value + the input event (the caller owns the state)" }],
  },
  {
    id: "ui.skeleton", dir: "skeleton", recipe: "skeleton.variants.json",
    docs: "Skeleton renders a pulsing placeholder box (loading state). It is decorative: aria-hidden; the loading state is announced by the container (aria-busy).",
    part: {
      name: "Skeleton", docs: "Skeleton renders a decorative placeholder.", recipeId: "skeleton", classes: { recipe: { shape: "Shape" } },
      props: [cva("Shape", "line, block or circle"), klass, attrs],
      render: { kind: "element", tag: { kind: "static", tag: "div" }, attrs: [{ kind: "class" }, staticAttr("aria-hidden", "true"), staticAttr("data-slot", "skeleton"), { kind: "rest" }], children: [] },
    } as PartDef,
  },
  {
    id: "ui.lucide-icon", dir: "lucide-icon", recipe: "lucide-icon.variants.json",
    docs: "LucideIcon renders a Lucide glyph (ISC license) by kebab-case name from the generated registry specs/assets/lucide-icons.json. Decorative (aria-hidden) unless a Label is given.",
    part: {
      name: "LucideIcon", docs: "LucideIcon renders an svg glyph by name.", recipeId: "lucide-icon", classes: { recipe: {} },
      props: [str("Name", "kebab-case Lucide name; an unknown name draws a circle"), { name: "Size", type: "int", cva: false, docs: "width and height in px, 16 by default" }, { name: "StrokeWidth", type: "int", cva: false, docs: "stroke width, 2 by default" }, str("Label", "accessible name; without it the icon is decorative"), klass, attrs],
      render: { kind: "element", tag: { kind: "static", tag: "svg" }, attrs: [{ kind: "class" }, staticAttr("data-slot", "icon"), { kind: "rest" }], children: [] },
    } as PartDef,
    notes: [{ runtime: "svelte", part: "LucideIcon", note: "the svg children are the nodes of the registry (an asset component of the runtime); the markup above is the frame" }, { runtime: "react", part: "LucideIcon", note: "the svg children are the nodes of the registry (an asset component of the runtime); the markup above is the frame" }],
  },
];

// ButtonPlain and LinkPlain: canary's `plain` prop of Button and Link (no styling, only the element and its class) as parts of their own
const specOf = (n: string): { parts: any[] } => JSON.parse(readFileSync(join(out, `${n}.json`), "utf8"));
{
  const btn = specOf("button").parts[0];
  const lnk = specOf("link").parts[0];
  const pick = (p: any, names: string[]) => p.props.filter((x: PropDef) => names.includes(x.name));
  const plainButton = { name: "ButtonPlain", docs: "ButtonPlain is a bare button element: no styling beyond Class. Patterns (tabs, tree rows, menu items) style it themselves.", recipeId: "button-plain", classes: { recipe: {}, state: btn.classes.state }, props: pick(btn, ["Type", "Disabled", "ID", "Role", "TabIndex", "AriaLabel", "Class", "Children", "Attrs"]), render: { ...btn.render.else[0], attrs: btn.render.else[0].attrs.filter((a: any) => a.name !== "form") } };
  const plainLink = { ...lnk, name: "LinkPlain", docs: "LinkPlain is a bare anchor: no styling beyond Class.", recipeId: "link-plain", classes: { recipe: {}, state: lnk.classes.state }, props: pick(lnk, ["Href", "Target", "Rel", "External", "Download", "Disabled", "AriaCurrent", "AriaLabel", "ID", "Role", "Class", "Children", "Attrs"]) };
  defs.push(
    { id: "ui.button-plain", dir: "button-plain", recipe: "button-plain.variants.json", docs: plainButton.docs, part: plainButton as PartDef },
    { id: "ui.link-plain", dir: "link-plain", recipe: "link-plain.variants.json", docs: plainLink.docs, part: plainLink as PartDef },
  );
}

const skeleton: VariantRecipe = { id: "ui.skeleton", base: "animate-pulse bg-muted motion-reduce:animate-none", keys: ["shape"], defaults: { shape: "line" }, byKey: { shape: { line: "h-3 w-full rounded-md", block: "h-20 w-full rounded-xl", circle: "size-8 rounded-full" } } };
// recipes of canary: copied from its files where it has one, else written here from its component (the class lists are the ones of the canary components)
const CANARY_BASE: Record<string, string> = {
  "button-plain": "",
  "link-plain": "",
  "lucide-icon": "inline-block shrink-0",
  progress: "h-2 w-full overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width] [&::-moz-progress-bar]:bg-primary appearance-none",
  range: [
    "h-5 w-full cursor-pointer appearance-none bg-transparent",
    "accent-primary disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
    "[&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
    "[&::-webkit-slider-thumb]:bg-primary [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-thumb]:size-3.5",
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary",
  ].join(" "),
};

const exampleOf = (part: PartDef, recipe: VariantRecipe): SpecExample[] => {
  const ex: SpecExample[] = [];
  for (const key of recipe.keys) for (const value of Object.keys(recipe.byKey[key] ?? {})) {
    const p = part.props.find((x) => x.cva && (x.cvaKey ?? x.name.toLowerCase()) === key);
    if (p) ex.push({ id: `${key}.${value}`, props: { [p.name]: value } });
  }
  return ex;
};

for (const d of defs) {
  let recipe: VariantRecipe;
  if (d.dir === "skeleton") recipe = skeleton;
  else recipe = { id: d.id, base: CANARY_BASE[d.dir]!, keys: [], defaults: {}, byKey: {} };
  if (JSON.stringify(recipe).includes("gradient")) throw new Error("gradient");
  writeFileSync(join(out, d.recipe), JSON.stringify(recipe, null, 2) + "\n");
  const part = d.part;
  const sp: SpecPart = { ...part, slots: deriveSlots(part), events: [], a11y: deriveA11y(part), data: deriveData(part), tokens: deriveTokens([recipe], TOKENS) };
  const examples: SpecExample[] = exampleOf(part, recipe);
  if (d.dir === "progress") examples.push({ id: "value.half", props: { Value: 50, Label: "Progress" } });
  if (d.dir.endsWith("-plain")) examples.push({ id: "default", props: {} });
  if (d.dir === "range") examples.push({ id: "value.default", props: { Value: "30", AriaLabel: "Volume" } }, { id: "state.disabled", props: { Disabled: true, AriaLabel: "Volume" } });
  const spec: SpecFile = {
    $schema: "../../schema/schemas/spec.schema.json", specVersion: 1, id: d.id, tier: "brick", dir: d.dir, docs: d.docs,
    variants: { [d.dir]: d.recipe }, parts: [sp], examples, portable: { svelte: true, react: true }, ...(d.notes ? { runtimeNotes: d.notes } : {}),
  };
  writeFileSync(join(out, `${d.dir}.json`), JSON.stringify(spec, null, 2) + "\n");
}
console.log(`authored ${defs.length} bricks`);
