import { expect, test } from "bun:test";
import { join } from "node:path";
import { loadSpecs } from "@ui8kit/xgen-spec";
import type { ScreenSpec } from "@ui8kit/xgen-screens";
import { galleryOf, THEMES, blockKey, blockProps, expandComposed, sourcesOf, validateScreen, authored, authoredDirs, indexParts, loadInputs, op, ref, stringify, text, use, validateOrganism, printValue } from "../src";
import { readFileSync } from "node:fs";

const root = join(import.meta.dir, "..", "..");
const parts = indexParts(loadSpecs(root).bricks);
const orgs = Object.fromEntries(authored.organisms.map((o) => [o.name, o]));
const base = authored.organisms[0]!;
const plans = authored.screens[0] as ScreenSpec;
const inputs = loadInputs(root);

test("stored organism and screen JSON equal the builder output", () => {
  for (const [dir, list] of authoredDirs()) for (const o of list) expect(readFileSync(join(root, "specs", dir, `${o.id.split(".")[1]}.json`), "utf8")).toBe(stringify(o));
});

test("inputs match their schemas", () => {
  expect(loadInputs(root).problems).toEqual([]);
});

test("the authored views are valid", () => {
  expect(validateOrganism(base, parts, orgs)).toEqual([]);
});

const withView = (view: typeof base.view) => ({ ...base, view });

test("literal text is rejected", () => {
  const errs = validateOrganism(withView([use("Text", {}, text("Hello"))]), parts, orgs);
  expect(errs.join("\n")).toContain("literal text");
});

test("an unknown variant is rejected", () => {
  const errs = validateOrganism(withView([use("Button", { props: { Variant: "plain" } })]), parts, orgs);
  expect(errs.join("\n")).toContain('"plain" is not a variant');
});

test("text-bearing props must be references", () => {
  const errs = validateOrganism(withView([use("Input", { props: { Placeholder: "Search" } })]), parts, orgs);
  expect(errs.join("\n")).toContain("must come from content");
});

test("ARIA state must be static, and unknown attributes are rejected", () => {
  const a = validateOrganism(withView([use("Text", { attrs: { "aria-expanded": op("not", ref("current")) } })]), parts, orgs);
  expect(a.join("\n")).toContain("must be static");
  const b = validateOrganism(withView([use("Text", { attrs: { onclick: "x" } })]), parts, orgs);
  expect(b.join("\n")).toContain("not allowed");
});

test("references must be in scope and ops must have the right arity", () => {
  const errs = validateOrganism(withView([use("Text", {}, text(op("eq", ref("nothing"))))]), parts, orgs);
  expect(errs.join("\n")).toContain("not in scope");
  expect(errs.join("\n")).toContain("takes 2 arguments");
});

test("values print as TypeScript", () => {
  const ctx = { emit: (e: string) => `on${e}?.`, helpers: new Set<string>(), optional: new Set(["record"]) };
  expect(printValue(op("cond", ref("plan.highlighted"), "a", "b"), ctx)).toBe('(plan.highlighted ? "a" : "b")');
  expect(printValue(ref("record.id"), ctx)).toBe("record?.id");
  expect(printValue(op("money", ref("plan.price"), ref("plan.currency")), ctx)).toBe("fmtMoney(plan.price, plan.currency)");
  expect([...ctx.helpers]).toEqual(["fmtMoney"]);
});

test("the parts and patterns: 23 parts, 36 patterns, the generated ones and the contracts", () => {
  expect(authored.parts.length).toBe(23);
  expect(authored.patterns.length).toBe(36);
  const all = [...authored.parts, ...authored.patterns];
  expect(all.filter((o) => o.portable.svelte === true).length).toBe(40);
  for (const o of all.filter((x) => x.portable.svelte !== true)) {
    expect(o.view).toEqual([]);
    const f = o.portable.svelte as { reason: string };
    expect(f.reason.length).toBeGreaterThan(20);
  }
});

test("a recipe op names a declared recipe, a key of it and a value of the key", () => {
  const inputs = loadInputs(root);
  const recipes = Object.fromEntries(inputs.recipes.map((r) => [r.name, r.value]));
  const avatar = authored.parts.find((p) => p.name === "Avatar")!;
  expect(validateOrganism(avatar, parts, {}, recipes)).toEqual([]);
  const broken = JSON.parse(JSON.stringify(avatar));
  broken.view[0].props.Class.args[0] = { op: "recipe", args: ["avatar", "size", "999", "nope", "x"] };
  const errs = validateOrganism(broken, parts, {}, recipes).join("\n");
  expect(errs).toContain('has no value "999"');
  expect(errs).toContain('has no key "nope"');
});

test("css prints a string for Svelte and an object for React; the other new ops print", () => {
  const mk = (runtime: "svelte" | "react") => ({ emit: (e: string) => e, helpers: new Set<string>(), optional: new Set<string>(), runtime });
  const css = op("css", "height", ref("h"), "px", "max-width", 5, "%");
  expect(printValue(css, mk("svelte"))).toBe("`height:${h}px;max-width:${5}%`");
  expect(printValue(css, mk("react"))).toBe("{ height: `${h}px`, maxWidth: `${5}%` }");
  const c = mk("svelte");
  expect(printValue(op("range", 3), c)).toBe("Array.from({ length: 3 }, (_, i) => i)");
  expect(printValue(op("str", ref("n")), c)).toBe("(n == null ? undefined : String(n))");
  expect(printValue(op("recipe", "avatar", "size", ref("s")), c)).toBe("avatarVariants({ size: s })");
});

test("a page screen reads several sources and calls only toggleTheme; a collection screen still needs its list", () => {
  const siteScreen = inputs.screens.find((s) => s.value.id === "screen.site")!.value;
  expect(validateScreen(siteScreen, parts, orgs)).toEqual([]);
  expect(sourcesOf(siteScreen).map((x) => x.as).sort()).toEqual(["faq", "faqtabs", "features", "terminal", "tiers"]);
  expect(sourcesOf(plans).map((x) => x.as)).toEqual(["rows"]);
  const bad = validateScreen({ ...siteScreen, list: plans.list, areas: { ...siteScreen.areas, home: [use("Button", { on: { click: { call: "actions.search", args: [ref("ui.app.title")] } } }, text(ref("ui.app.title")))] } }, parts, orgs);
  expect(bad.some((m) => m.includes("a page has only toggleTheme"))).toBe(true);
  expect(bad.some((m) => m.includes("not source, list or state"))).toBe(true);
  expect(validateScreen({ ...plans, list: undefined }, parts, orgs).some((m) => m.includes("needs source, list and state"))).toBe(true);
});

test("a composed screen expands to a page of organisms: sample < variant < use, axes are literals", () => {
  const site = inputs.screens.find((s) => s.value.id === "screen.site")!;
  expect(site.composed?.kind).toBe("composed");
  expect(site.value.kind).toBe("page");
  expect(site.value.organisms).toEqual(["CtaBand", "FaqList", "FeatureGrid", "HeroClassic", "PricingTiers", "SiteFooter", "SiteHeader"]);
  expect(site.value.sources?.map((x) => x.as).sort()).toEqual(["faq", "faqtabs", "features", "terminal", "tiers"]);
  const blocks = inputs.blocks.map((b) => b.value);
  const hero = blocks.find((b) => b.id === "block.hero")!;
  expect(blockKey(hero)).toBe("hero");
  const split = hero.variants.find((v) => v.id === "split")!;
  const props = blockProps(hero, split, { id: "x" });
  expect(props["layout"]).toBe("split");
  // a grouped axis lands in its group, merged with the sample's fields
  expect((props["media"] as Record<string, unknown>)["kind"]).toBe("image");
  expect((props["media"] as Record<string, unknown>)["lines"]).toEqual({ $: "terminal" });
  expect(Object.keys(props)).not.toContain("chrome");
  const prompt = blockProps(hero, hero.variants.find((v) => v.id === "prompt")!, {}, orgs["HeroPrompt"]);
  expect(Object.keys(prompt)).not.toContain("media");
  expect((prompt["actions"] as Record<string, unknown>)["href"]).toBe("#/pricing");
  expect(props["tone"]).toBe("default");
  expect(props["id"]).toBe("x");
  const bad = expandComposed({ ...site.composed!, areas: { ...site.composed!.areas, home: [{ block: "hero", variant: "nope" }, { block: "ghost" }, { block: "cta", props: { tone: "accent" } }] } }, blocks, orgs);
  expect(bad.problems.length).toBe(3);
});

test("the gallery has a section for every variant of every block, with the organism inside", () => {
  const gallery = inputs.screens.find((s) => s.value.id === "screen.blocks")!;
  const dump = JSON.stringify(gallery.value.areas);
  for (const b of inputs.blocks) for (const v of b.value.variants) expect(dump).toContain(`"data-variant":"${v.id}"`);
  expect(gallery.value.routes.length).toBe(inputs.blocks.length + 1);
  expect(Object.keys(gallery.value.areas)).toContain("index");
});

test("pick prints a lookup by id", () => {
  const ctx = { emit: (e: string) => e, helpers: new Set<string>(), optional: new Set<string>(), runtime: "svelte" as const };
  expect(printValue(op("pick", ref("tiers"), "plan-team"), ctx)).toBe('tiers.find((i) => i.id === "plan-team")!');
});

test("count prints the number of items with a flag", () => {
  const ctx = { emit: (e: string) => e, helpers: new Set<string>(), optional: new Set<string>(), runtime: "svelte" as const };
  expect(printValue(op("count", ref("tasks"), "done"), ctx)).toContain("filter");
});

test("the catalog: 25 to 120 blocks, over 100 variants, every block in a known theme, the gallery in theme order", () => {
  const blocks = inputs.blocks.map((b) => b.value);
  expect(blocks.length).toBeGreaterThanOrEqual(25);
  expect(blocks.length).toBeLessThanOrEqual(120);
  expect(blocks.reduce((n, b) => n + b.variants.length, 0)).toBeGreaterThan(100);
  for (const b of blocks) expect(THEMES as readonly string[]).toContain(b.theme);
  const order = galleryOf(blocks).map((b) => THEMES.indexOf(b.theme as (typeof THEMES)[number]));
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("variant props (case copy) win over the sample, and an axis stays out of them", () => {
  const hero = inputs.blocks.map((b) => b.value).find((b) => b.id === "block.hero")!;
  const saas = hero.variants.find((v) => v.id === "saas")!;
  expect(saas.props?.["title"]).toEqual(ref("ui.cases.saas.hero.title"));
  expect(blockProps(hero, saas)["title"]).toEqual(ref("ui.cases.saas.hero.title"));
  expect(blockProps(hero, hero.variants[0]!)["title"]).toEqual(hero.sample.props["title"]);
});

test("a preset op must name an existing preset and path", () => {
  const p = { specVersion: 1 as const, id: "preset.kit", name: "kit", docs: "d", values: { hero: { band: "min-h-[1px]" } } };
  const ok = withView([use("Text", { props: { Class: op("preset", "kit", "hero.band") } })]);
  expect(validateOrganism(ok, parts, orgs, {}, [p])).toEqual([]);
  const bad = validateOrganism(withView([use("Text", { props: { Class: op("preset", "kit", "hero.nope") } })]), parts, orgs, {}, [p]);
  expect(bad.join("\n")).toContain('no value at "hero.nope"');
  expect(validateOrganism(ok, parts, orgs, {}, []).join("\n")).toContain('preset "kit" does not exist');
});

test("a badge never sits inline with a title: it goes on its own line above it (or in its own slot)", () => {
  const TITLES = new Set(["Title", "CardTitle", "Heading"]);
  type N = Record<string, unknown>;
  // the elements a node renders directly, looking through when/each wrappers
  const direct = (kids: unknown[]): N[] => kids.flatMap((k) => {
    if (!k || typeof k !== "object") return [];
    const n = k as N;
    if (typeof n.use === "string") return [n];
    return Object.values(n).flatMap((v) => (Array.isArray(v) ? direct(v) : v && typeof v === "object" && !("op" in (v as N)) ? direct([v]) : []));
  });
  const bad: string[] = [];
  const walk = (node: unknown, where: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((x) => walk(x, where)); return; }
    const n = node as N;
    if (typeof n.use === "string" && Array.isArray(n.children)) {
      const cls = JSON.stringify((n.props as N | undefined)?.Class ?? "");
      const row = n.use === "Group" ? !cls.includes("flex-col") : /\bflex\b/.test(cls) && !cls.includes("flex-col");
      const names = direct(n.children).map((c) => c.use as string);
      if (row && names.includes("Badge") && names.some((x) => TITLES.has(x))) bad.push(`${where}: ${n.use} has a Badge beside a title`);
    }
    Object.values(n).forEach((v) => walk(v, where));
  };
  for (const o of authored.organisms) walk(o.view, o.name);
  expect(bad).toEqual([]);
});
