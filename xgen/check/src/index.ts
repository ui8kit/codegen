// `xgen check`: every check returns a list of problems; the check passes when the lists are empty.
import { xgenPaths } from "@ui8kit/xgen-schema";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { validateRegistry, deriveA11y, deriveData, deriveSlots, portableTo, UI_RUNTIMES, type LoadedBrick, type SpecFile, type UiRuntime } from "@ui8kit/xgen-spec";
import { authored, authoredDirs, screenContentRefs, indexParts, sourcesOf, stringify, fileName, tierDir, validateOrganism, validateScreen, type OrganismSpec } from "@ui8kit/xgen-screens";
import { drift, planBuild, type Plan } from "@ui8kit/xgen-generator";
import { checkBlocks } from "./blocks";
import { blockSources, blocksDrift } from "@ui8kit/xgen-schema/codex-blocks";
import { checkRegistry, checkThemes } from "./registry";
import { checkDictionary } from "./dictionary";
import { checkRoutes } from "./routes";
import { checkDead, checkDuplicates, checkHardcode, checkStructure, checkTests, checkVersions } from "./audit";
import { checkCorners } from "./corners";
import { checkShadows } from "./shadows";
import { checkSpacing } from "./spacing";
import { checkReadability } from "./readability";
import { checkRules } from "./rules";

import { result, type CheckResult } from "./result";
import { KNOWN_ARIA } from "./aria";
export type { CheckResult } from "./result";
export { checkDictionary, dictionaryUse, leavesOf } from "./dictionary";
export { checkRoutes } from "./routes";
export { runVisual } from "./visual";
export { measure as measureReadability } from "./readability";

const CYRILLIC = /[\u0400-\u04FF]/;

/** every file under dir except tool output */
function files(dir: string, skip = new Set(["node_modules", "dist", "shots", ".git"])): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    if (skip.has(n)) return [];
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p, skip) : [p];
  });
}

export function checkSchema(plan: Plan): CheckResult {
  const problems = [...plan.problems];
  try { validateRegistry(plan.bricks.map((b) => b.brick)); } catch (e) { problems.push(`registry: ${(e as Error).message}`); }
  for (const b of plan.bricks) {
    const derivedOk = (a: unknown, b2: unknown): boolean => JSON.stringify(a) === JSON.stringify(b2);
    for (const p of b.spec.parts) {
      if (!derivedOk(p.slots, deriveSlots(p))) problems.push(`${b.brick.id}/${p.name}: slots differ from the render tree`);
      if (!derivedOk(p.a11y, deriveA11y(p))) problems.push(`${b.brick.id}/${p.name}: a11y differs from the render tree`);
      if (!derivedOk(p.data, deriveData(p))) problems.push(`${b.brick.id}/${p.name}: data attributes differ from the render tree`);
    }
  }
  return result("schema", "specs, variants, organisms, screens, apps, fixtures and content match their JSON Schemas; contract metadata equals the render tree", problems);
}

/** props and variants: examples of every brick and every view use only props and variant values the specs have */
export function checkProps(plan: Plan): CheckResult {
  const problems: string[] = [];
  const parts = indexParts(plan.bricks);
  const theme = readFileSync(join(plan.xgenRoot, "runtimes", "core", "assets", "styles", "theme.css"), "utf8");
  for (const b of plan.bricks) {
    for (const ex of b.spec.examples) {
      for (const [k, v] of Object.entries(ex.props)) {
        const owner = b.spec.parts.find((p) => p.props.some((x) => x.name === k));
        if (!owner) {
          if (k === "AsChild" && b.spec.parts.some((p) => p.asChild)) continue;
          problems.push(`${b.brick.id} example ${ex.id}: unknown prop ${k}`);
          continue;
        }
        const def = owner.props.find((x) => x.name === k)!;
        if (def.cva) {
          const recipe = owner.recipeId ? b.brick.recipes[owner.recipeId] : undefined;
          const allowed = Object.keys(recipe?.byKey[def.cvaKey ?? def.name.toLowerCase()] ?? {});
          if (!allowed.includes(String(v))) problems.push(`${b.brick.id} example ${ex.id}: ${k}="${v}" is not a variant (${allowed.join(", ")})`);
        }
      }
    }
    for (const p of b.spec.parts) for (const t of p.tokens) if (!theme.includes(`${t}:`)) problems.push(`${b.brick.id}/${p.name}: token ${t} is not in theme.css`);
  }
  const orgs = Object.fromEntries(plan.inputs.organisms.map((o) => [o.value.name, o.value]));
  const recipes = Object.fromEntries(plan.inputs.recipes.map((r) => [r.name, r.value]));
  const at = (file: string): string => relative(join(plan.xgenRoot, ".."), file);
  for (const o of plan.inputs.organisms) problems.push(...validateOrganism(o.value, parts, orgs, recipes, plan.inputs.presets.map((x) => x.value)).map((m) => `${at(o.file)}: ${m}`));
  for (const s of plan.inputs.screens) problems.push(...validateScreen(s.value, parts, orgs).map((m) => `${at(s.file)}: ${m}`));
  return result("props", "props, variant values and tokens exist; views use only parts, props and variants of the specs; no literal text, static ARIA state", problems);
}

export function checkA11y(plan: Plan): CheckResult {
  const problems: string[] = [];
  for (const b of plan.bricks) for (const p of b.spec.parts) {
    if (!p.a11y || !Array.isArray(p.a11y.roots) || !p.a11y.roots.length) problems.push(`${b.brick.id}/${p.name}: a11y.roots is empty`);
    const roots = p.a11y.roots;
    if (roots.includes("img") && !p.props.some((x) => x.name === "Alt")) problems.push(`${b.brick.id}/${p.name}: an img part without an Alt prop`);
    if (roots.length === 1 && roots[0] === "input" && !p.props.some((x) => x.name === "AriaLabel") && !p.props.some((x) => x.name === "ID")) problems.push(`${b.brick.id}/${p.name}: an input part with no AriaLabel and no ID to bind a label`);
    if (p.a11y.aria.some((a) => a.name.startsWith("aria-") && a.kind === "expr" && !KNOWN_ARIA.has(a.name))) problems.push(`${b.brick.id}/${p.name}: unknown ARIA attribute`);
  }
  // the screens: a table has a caption and column headers with a scope; an input has an accessible name
  for (const s of plan.inputs.screens) {
    const text = JSON.stringify(s.value.areas);
    if (text.includes('"use":"Table"') && !text.includes('"use":"TableCaption"')) problems.push(`${s.value.name}: a Table without a TableCaption`);
    if (text.includes('"use":"TableHeadCell"') && !text.includes('"Scope":"col"')) problems.push(`${s.value.name}: header cells without scope`);
    if (text.includes('"use":"Input"') && !text.includes('"AriaLabel"')) problems.push(`${s.value.name}: an Input without AriaLabel`);
    if (text.includes('aria-sort') && !(text.includes('"ascending"') && text.includes('"descending"') && text.includes('"none"'))) problems.push(`${s.value.name}: aria-sort needs all three static states`);
  }
  return result("a11y", "roots and ARIA of every part; tables, inputs and sortable headers of the screens", problems);
}

export function checkAuthored(plan: Plan): CheckResult {
  const problems: string[] = [];
  for (const [dir, list] of authoredDirs()) {
    for (const spec of list) {
      const file = join(xgenPaths(plan.xgenRoot).specs(dir), `${spec.id.split(".")[1]}.json`);
      if (!existsSync(file)) problems.push(`specs/${dir}/${spec.id.split(".")[1]}.json: missing (run: bun run build)`);
      else if (readFileSync(file, "utf8") !== stringify(spec)) problems.push(`specs/${dir}/${spec.id.split(".")[1]}.json: differs from the builder (xgen/screens/src/authoring); run: bun run build`);
    }
  }
  const known = new Set<string>(authoredDirs().flatMap(([, list]) => list.map((o) => o.id)));
  for (const o of plan.inputs.organisms) if (!known.has(o.value.id)) problems.push(`${o.file}: not produced by the builder`);
  for (const s of plan.inputs.screens) if (!known.has(s.value.id)) problems.push(`${s.file}: not produced by the builder`);
  for (const b of plan.inputs.blocks) if (!known.has(b.value.id)) problems.push(`${b.file}: not produced by the builder`);
  return result("authored", "organism, block and screen JSON equals what the builder in xgen/screens produces", problems);
}

/** recipes of the parts and patterns: valid, used, and shown in an example for every value */
export function checkRecipes(plan: Plan): CheckResult {
  const problems: string[] = [];
  const used = new Map<string, string[]>();
  for (const o of plan.inputs.organisms) for (const file of Object.values(o.value.recipes ?? {})) used.set(file, [...(used.get(file) ?? []), o.value.name]);
  for (const r of plan.inputs.recipes) {
    if (JSON.stringify(r.value).includes("gradient")) problems.push(`recipes/${r.name}: has a gradient`);
    for (const [key, table] of Object.entries(r.value.byKey)) if ("plain" in table) problems.push(`recipes/${r.name}: key ${key} has a plain variant`);
    for (const key of r.value.keys) if (!(key in r.value.byKey)) problems.push(`recipes/${r.name}: key ${key} has no table`);
    if (!used.has(r.name)) problems.push(`recipes/${r.name}: no part or pattern uses it`);
  }
  for (const o of plan.inputs.organisms) {
    const spec = o.value;
    const propNames = new Set(spec.props.map((p) => p.name));
    for (const ex of spec.examples ?? []) for (const k of Object.keys(ex.props)) if (!propNames.has(k)) problems.push(`${spec.name} example ${ex.id}: unknown prop ${k}`);
    for (const file of Object.values(spec.recipes ?? {})) {
      const recipe = plan.inputs.recipes.find((r) => r.name === file)?.value;
      if (!recipe) continue;
      for (const key of recipe.keys) {
        if (!propNames.has(key)) continue;
        for (const value of Object.keys(recipe.byKey[key] ?? {})) if (!(spec.examples ?? []).some((e) => String(e.props[key]) === value)) problems.push(`${spec.name}: no example for ${key}="${value}" of recipe ${file}`);
      }
    }
    for (const ex of spec.examples ?? []) for (const [k, v] of Object.entries(ex.props)) {
      const file = Object.values(spec.recipes ?? {}).find((f) => plan.inputs.recipes.find((r) => r.name === f)?.value.keys.includes(k));
      const recipe = file ? plan.inputs.recipes.find((r) => r.name === file)?.value : undefined;
      if (recipe && !(String(v) in (recipe.byKey[k] ?? {}))) problems.push(`${spec.name} example ${ex.id}: ${k}="${v}" is not a value of recipe ${file}`);
    }
  }
  return result("recipes", `${plan.inputs.recipes.length} recipes of parts and patterns (parts, patterns and block frames): valid, used, every value of every key shown in an example`, problems);
}

/** the block data manifest (xgen/schema/codex/blocks.json) equals what `bun run codex:blocks` generates from the specs, templates and screens */
export function checkCodex(plan: Plan): CheckResult {
  return result("codex", "the block data manifest (xgen/schema/codex/blocks.json) is generated from the block and screen specs, the magazine templates and the taste screens: no block missing, no stale binding or source", blocksDrift(blockSources(plan.xgenRoot)));
}

export function checkDrift(plan: Plan): CheckResult {
  return result("drift", "packages and apps equal what the specs generate: no hand edits, no extra files, every file has the DO NOT EDIT header", drift(plan));
}

export function checkCoverage(plan: Plan): CheckResult {
  const problems: string[] = [];
  const generated = (runtime: UiRuntime): Set<string> => new Set(plan.targets.find((t) => t.dir === `packages/${runtime}/ui`)!.files.map((f) => f.path));
  const have = { svelte: generated("svelte"), react: generated("react"), vue: generated("vue"), solid: generated("solid") };
  const EXT = { svelte: "svelte", react: "tsx", vue: "vue", solid: "tsx" } as const;
  const all = [
    ...plan.bricks.map((b) => ({ id: b.brick.id, portable: b.spec.portable, parts: b.brick.parts.map((p) => p.name), dir: b.brick.dir, file: b.brick.file ?? b.brick.dir })),
    ...plan.inputs.organisms.map((o) => ({ id: o.value.id, portable: o.value.portable, parts: [o.value.name], dir: "", file: o.value.name })),
    ...plan.inputs.screens.map((s) => ({ id: s.value.id, portable: s.value.portable, parts: [s.value.name], dir: "", file: s.value.name })),
  ];
  for (const e of all) {
    for (const rt of UI_RUNTIMES) {
      const flag = portableTo(e.portable, rt);
      if (flag === true) {
        const isScreen = e.id.startsWith("screen.");
        if (isScreen) {
          const apps = plan.targets.filter((t) => t.kind === "app" && t.runtime === rt);
          const ext = EXT[rt];
          if (apps.length && !apps.some((a) => a.files.some((f) => f.path === `xgen/screens/${e.parts[0]}.${ext}`))) problems.push(`${e.id}: marked portable for ${rt} but the host of that runtime has no ${e.parts[0]}`);
        } else if (/^(organism|part|pattern)\./.test(e.id)) {
          if (!have[rt].has(`src/${tierDir(e.id)}/${fileName(e.parts[0]!)}.${EXT[rt]}`)) problems.push(`${e.id}: marked portable for ${rt} but not generated`);
        } else {
          // one file per part (Svelte, Vue, and React for a brick of several parts), else one React file per brick
          const ok = (rt !== "react" && rt !== "solid") || e.parts.length > 1
            ? e.parts.every((p) => have[rt].has(`src/primitives/${e.dir}/${fileName(p)}.${EXT[rt]}`))
            : have[rt].has(`src/primitives/${e.dir}/${e.file}.tsx`);
          if (!ok) problems.push(`${e.id}: marked portable for ${rt} but not generated`);
        }
      } else if (!flag || flag.portable !== false || !flag.reason || flag.reason.length < 8) problems.push(`${e.id}: ${rt} is neither generated nor marked { "portable": false, "reason": "..." }`);
    }
  }
  return result("coverage", `every spec is generated for every runtime (${UI_RUNTIMES.join(", ")}), or says why not`, problems);
}

export function checkNonportable(plan: Plan): CheckResult {
  const problems: string[] = [];
  const doc = JSON.parse(readFileSync(xgenPaths(plan.xgenRoot).nonportable, "utf8")) as { features: Array<{ id: string; runtime: string; markers: string[]; replacement: string }> };
  for (const f of doc.features) if (!f.replacement || f.replacement.length < 20) problems.push(`_nonportable.json ${f.id}: no replacement contract`);
  for (const t of plan.targets) for (const f of t.files) {
    if (!/\.(svelte|vue|tsx?)$/.test(f.path)) continue;
    // a `//` comment before the markup of a .svelte file is rendered as text
    if (f.path.endsWith(".svelte") && /^\s*\/\//.test(f.contents)) problems.push(`${t.dir}/${f.path}: starts with a // comment, which a Svelte template shows as text`);
    for (const feature of doc.features) {
      if (feature.runtime !== "both" && feature.runtime !== t.runtime) continue;
      for (const m of feature.markers) if (f.contents.includes(m)) problems.push(`${t.dir}/${f.path}: uses ${m} (${feature.id}); the contract is: ${feature.replacement}`);
    }
  }
  return result("nonportable", "generated code uses none of the features that do not carry over (context, $bindable, attach, raw HTML, v-model); the replacements are documented", problems);
}

/** Genuine locale resources that may hold Cyrillic (repo-relative paths). Empty: the repository is English-only. */
export const CYRILLIC_ALLOW: readonly string[] = [];

/** every tracked file (git ls-files); outside a git checkout, the source roots on disk */
function trackedFiles(workspace: string): string[] {
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: workspace, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\0").filter(Boolean).map((f) => join(workspace, f)).filter((f) => existsSync(f));
  } catch {
    const skip = new Set(["node_modules", "dist", "shots", ".git", "bun.lock"]);
    return ["xgen", "packages", "apps", "plan", "docs", "README.md"].map((r) => join(workspace, r)).filter(existsSync).flatMap((r) => (statSync(r).isDirectory() ? files(r, skip) : [r]));
  }
}

/** text: no Cyrillic in any tracked file (sources, generated code, content, docs, plans) outside CYRILLIC_ALLOW; every content key a view reads exists */
export function checkText(plan: Plan): CheckResult {
  const problems: string[] = [];
  const allow = new Set(CYRILLIC_ALLOW);
  for (const f of trackedFiles(plan.workspace)) {
    const rel = relative(plan.workspace, f).split("\\").join("/");
    if (allow.has(rel)) continue;
    const buf = readFileSync(f);
    if (buf.includes(0)) continue; // binary
    const lines = buf.toString("utf8").split("\n");
    const i = lines.findIndex((l) => CYRILLIC.test(l));
    if (i >= 0) problems.push(`${rel}:${i + 1}: Cyrillic text (the repository is English-only; genuine locale files go in CYRILLIC_ALLOW)`);
  }
  const dict = plan.inputs.dictionary.value as Record<string, unknown>;
  const has = (path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
  const orgs = Object.fromEntries(plan.inputs.organisms.map((o) => [o.value.name, o.value as OrganismSpec]));
  for (const s of plan.inputs.screens) {
    const refs = screenContentRefs(s.value);
    for (const k of refs) if (has(k) === undefined) problems.push(`${s.value.name}: content key ui.${k} is not in content/ui/en.json`);
    for (const c of s.value.list?.columns ?? []) if (typeof has(c.label) !== "string") problems.push(`${s.value.name}: column ${c.id} label ui.${c.label} is not in content`);
    // labels handed to organisms must carry every field of the labels record
    const walk = (n: unknown): void => {
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (typeof o.organism === "string") {
        const org = orgs[o.organism];
        const labels = (o.props as Record<string, { $?: string }> | undefined)?.labels;
        const rec = org?.records["PricingCardLabels"] ?? [];
        if (labels?.$?.startsWith("ui.")) {
          const sub = has(labels.$.slice(3)) as Record<string, unknown> | undefined;
          for (const f of rec) if (typeof sub?.[f.name] !== "string") problems.push(`${s.value.name}: ${labels.$}.${f.name} is missing (labels of ${o.organism})`);
        }
      }
      for (const v of Object.values(o)) Array.isArray(v) ? v.forEach(walk) : walk(v);
    };
    walk(s.value.layout);
    walk(s.value.parts ?? {});
    walk(s.value.areas);
    // a badge column shows ui.status.<value>: every value in the fixture has a word
    for (const src of sourcesOf(s.value)) {
    const col = plan.inputs.collections.find((c) => c.value.collection === src.collection);
    const statusPath = src.fields["status"];
    if (col && statusPath) {
      for (const e of col.value.entries) {
        const v = statusPath.split(".").reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], e);
        if (typeof v === "string" && typeof has(`status.${v}`) !== "string") problems.push(`fixture ${col.value.collection}: status "${v}" has no word in ui.status`);
      }
    }
    }
  }
  return result("text", "no Cyrillic in tracked files; every text of a view is a key that exists in content/ui/en.json", problems);
}

export function runChecks(workspace: string): { results: CheckResult[]; plan: Plan } {
  const plan = planBuild(workspace);
  const results = [checkSchema(plan), checkProps(plan), checkA11y(plan), checkAuthored(plan), checkCoverage(plan), checkRecipes(plan), checkNonportable(plan), checkText(plan), checkDictionary(plan), checkBlocks(plan), checkRegistry(plan), checkThemes(plan), checkRoutes(plan), checkStructure(plan), checkHardcode(plan), checkCorners(plan), checkShadows(plan), checkSpacing(plan), checkReadability(plan), checkDead(plan), checkDuplicates(plan), checkVersions(plan), checkTests(plan), checkRules(plan.workspace), checkCodex(plan), checkDrift(plan)];
  return { results, plan };
}

export type { LoadedBrick, SpecFile };

export { checkBlocks } from "./blocks";
export { runE2e, type E2eReport } from "./e2e";
export { templCheck, type TemplResult } from "./templ";
export { solidCheck, type SolidResult } from "./solid";
export { runShot, type ShotOptions } from "./shots";
export { twigCheck, type TwigResult } from "./twig";
export { jinja2Check, type Jinja2Result } from "./jinja2";
export { latteCheck } from "./latte";
