// The plan of a build: every file of every generated target, in memory. `write` puts it on disk, `xgen check` compares it with the disk.
import { xgenPaths } from "@ui8kit/xgen-schema";
import { basename, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { loadSpecs, portableTo, UI_RUNTIMES, type LoadedBrick, type UiRuntime } from "@ui8kit/xgen-spec";
import { BANNER, decksFile, emitPreset, isEmptyRecipe, readAsset, recipeOwner, variantsName, type GeneratedFile, type PartRef } from "@ui8kit/xgen-runtime-core";
import { SvelteEmitter, appScaffold as svelteApp, emitOrganism as svelteOrganism, emitScreen as svelteScreen, emitChunks as svelteChunks } from "@ui8kit/xgen-runtime-svelte";
import { ReactEmitter, appScaffold as reactApp, emitOrganism as reactOrganism, emitScreen as reactScreen, emitChunks as reactChunks } from "@ui8kit/xgen-runtime-react";
import { SolidEmitter, appScaffold as solidApp, emitOrganism as solidOrganism, emitScreen as solidScreen, emitChunks as solidChunks } from "@ui8kit/xgen-runtime-solid";
import { VueEmitter, appScaffold as vueApp, emitOrganism as vueOrganism, emitScreen as vueScreen, emitChunks as vueChunks } from "@ui8kit/xgen-runtime-vue";
import { fileName, findApps, indexParts, loadApp, loadInputs, sourcesOf, tierDir, type AppSpec, type Inputs, type OrganismSpec, type ScreenSpec } from "@ui8kit/xgen-screens";
import { HOST_GEN, SHARED, SHARED_DIR, jsonFile, sharedPackage } from "@ui8kit/xgen-runtime-core";
import { existsSync, readFileSync, readdirSync } from "node:fs";

export type Runtime = UiRuntime;

/** what each runtime contributes: its emitters and the extension of its component files */
const RUNTIME = {
  svelte: { emitter: () => new SvelteEmitter(), organism: svelteOrganism, screen: svelteScreen, chunks: svelteChunks, app: svelteApp, ext: "svelte" },
  react: { emitter: () => new ReactEmitter(), organism: reactOrganism, screen: reactScreen, chunks: reactChunks, app: reactApp, ext: "tsx" },
  vue: { emitter: () => new VueEmitter(), organism: vueOrganism, screen: vueScreen, chunks: vueChunks, app: vueApp, ext: "vue" },
  solid: { emitter: () => new SolidEmitter(), organism: solidOrganism, screen: solidScreen, chunks: solidChunks, app: solidApp, ext: "tsx" },
} as const;
export const MANIFEST = ".xgen-manifest.json";

export interface Target {
  /** directory relative to the workspace root */
  dir: string;
  kind: "package" | "app";
  /** "core": the shared package, runtime neutral */
  runtime: Runtime | "core" | "templ" | "twig" | "jinja2" | "latte";
  /** build outputs of the target's own tools that the drift check leaves alone (templ generate: *_templ.go) */
  ignore?: RegExp;
  files: GeneratedFile[];
  /** files in the directory that people write (xgen.app.json) */
  handwritten: string[];
  /** path of the manifest inside the target, relative to the target dir */
  manifest: string;
}

export interface Plan { workspace: string; xgenRoot: string; targets: Target[]; problems: string[]; inputs: Inputs; bricks: LoadedBrick[]; apps: Array<{ dir: string; app: AppSpec }> }

export const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
/** files in the order of their paths, so two builds list them the same way whatever the order of the work */
const byPath = (files: GeneratedFile[]): GeneratedFile[] => [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const withPrefix = (prefix: string, files: GeneratedFile[]): GeneratedFile[] => files.map((f) => ({ ...f, path: prefix + f.path }));

function banner(path: string, src: string): string {
  if (src.includes(BANNER)) return src;
  if (path.endsWith(".css")) return `/* ${BANNER} */\n${src}`;
  if (path.endsWith(".svelte") || path.endsWith(".vue")) return `<!-- ${BANNER} -->\n${src}`;
  return `// ${BANNER}\n${src}`;
}

import { packageReadme } from "./readme";
import { templFiles, TEMPL_DIR } from "./templ";
import { twigFiles, TWIG_DIR } from "./twig";
import { jinja2Files, JINJA2_DIR } from "./jinja2";
import { latteFiles, LATTE_DIR } from "./latte";
import { authoringIndex, withSource } from "./source";
const pkgName = (r: Runtime): string => `@ui8kit/${r}-ui`;

function lucideRegistry(xgenRoot: string): string {
  const { icons } = JSON.parse(readFileSync(xgenPaths(xgenRoot).lucide, "utf8")) as { icons: Record<string, Array<[string, Record<string, string>]>> };
  const rows = Object.entries(icons).map(([name, nodes]) => `  ${JSON.stringify(name)}: ${JSON.stringify(nodes)},`);
  return [`// ${BANNER}`, `// Lucide icons (ISC license, https://lucide.dev), harvested into xgen/specs/assets/lucide-icons.json.`, `export const LUCIDE: Record<string, Array<[string, Record<string, string>]>> = {`, ...rows, `};`, ``].join("\n");
}

function uiPackage(r: Runtime, bricks: LoadedBrick[], inputs: Inputs, parts: Record<string, PartRef>, xgenRoot: string): GeneratedFile[] {
  const authoring = authoringIndex(xgenRoot);
  const emitter = RUNTIME[r].emitter();
  const ext = RUNTIME[r].ext;
  /** React and Solid: TSX files exporting named components (`export *`); Svelte and Vue: one default export per file */
  const jsx = r === "react" || r === "solid";
  const files: GeneratedFile[] = [];
  const partFile: Record<string, string> = {};
  // the barrel: named re-exports grouped by tier, so the index reads like the folder tree
  const tier: Record<"primitives" | "components" | "blocks" | "presets" | "utils", string[]> = { primitives: [], components: [], blocks: [], presets: [], utils: [] };
  for (const { brick } of bricks) {
    const emitted = emitter.emit(brick);
    // asset parts: the frame comes from the spec, the glyph nodes from the registry of specs/assets
    if (brick.id === "ui.lucide-icon") {
      const asset = join(import.meta.dir, "..", "..", "runtimes", r, "assets", `LucideIcon.${ext}`);
      emitted[0] = { path: emitted[0]!.path, contents: banner(asset, readFileSync(asset, "utf8")) };
      emitted.push({ path: `primitives/${brick.dir}/lucide-icons.ts`, contents: lucideRegistry(xgenRoot) });
    }
    files.push(...withPrefix("src/", emitted));
    if (!jsx) {
      brick.parts.forEach((p, i) => {
        partFile[p.name] = `../${emitted[i]!.path}`;
        tier.primitives.push(`export { default as ${p.name} } from "./${emitted[i]!.path}";`, `export type { ${p.name}Props } from "./${emitted[i]!.path}";`);
        // the variant tables live in the module script (Svelte) or the plain script (Vue) of their part, exported like the React file exports them
        const owned = Object.keys(brick.recipes).filter((id) => recipeOwner(brick, id) === p && !isEmptyRecipe(brick.recipes[id]!)).map(variantsName);
        if (owned.length && brick.id !== "ui.lucide-icon") tier.primitives.push(`export { ${owned.join(", ")} } from "./${emitted[i]!.path}";`);
      });
    } else {
      // one file per brick, or one per part; a long variant table sits in <stem>-variants.ts next to its part
      const own = (p: { name: string }) => emitted.find((f) => f.path.endsWith(`/${fileName(p.name)}.tsx`)) ?? emitted[0]!;
      for (const p of brick.parts) partFile[p.name] = `../${(brick.parts.length > 1 ? own(p) : emitted[0]!).path.replace(/\.tsx$/, "")}`;
      for (const f of emitted.filter((f) => /(\.tsx|-variants\.ts)$/.test(f.path))) tier.primitives.push(`export * from "./${f.path.replace(/\.tsx?$/, "")}";`);
    }
  }
  if (r === "react") files.push({ path: "src/primitives/slot/slot.tsx", contents: banner("slot.tsx", readFileSync(join(import.meta.dir, "..", "..", "runtimes", "react", "assets", "slot.tsx"), "utf8")) });
  const org = inputs.organisms.map((o) => o.value);
  const recipes = Object.fromEntries(inputs.recipes.map((r2) => [r2.name, r2.value]));
  const deps = { parts, organisms: Object.fromEntries(org.map((o) => [o.name, o])), partPath: (n: string) => partFile[n]!, recipes };
  for (const o of org) {
    // a spec that is not portable to this runtime is a contract only: nothing is generated for it
    if (portableTo(o.portable, r) !== true) continue;
    const dir = tierDir(o.id);
    files.push(...withPrefix("src/", RUNTIME[r].organism(o, deps)));
    if (!jsx) tier[dir as "blocks" | "components"].push(`export { default as ${o.name} } from "./${dir}/${fileName(o.name)}.${ext}";`, `export type { ${o.name}Props } from "./${dir}/${fileName(o.name)}.${ext}";`);
    else tier[dir as "blocks" | "components"].push(`export * from "./${dir}/${fileName(o.name)}";`);
    if (Object.keys(o.records).length) tier[dir as "blocks" | "components"].push(`export type * from "./${dir}/${fileName(o.name)}.types";`);
  }
  // kit presets: the frame geometry of a kit, read by the components with the `preset` op
  for (const p of inputs.presets) {
    const f = emitPreset(p.value, `xgen/screens/src/authoring/presets/${basename(p.file, ".json")}.ts`);
    files.push({ path: `src/${f.path}`, contents: f.contents });
    tier.presets.push(`export { ${p.value.name} } from "./${f.path.replace(/\.ts$/, "")}";`);
  }
  tier.utils.push(`export { cn, variants, tpl, fmtNumber, fmtMoney, at, pageWindow, fitCols, uniqLabel } from "./utils";`);
  const barrel = [`// ${BANNER}`, ...Object.entries(tier).flatMap(([name, rows]) => ["", `// ${name}`, ...rows])];
  files.push({ path: "src/index.ts", contents: barrel.join("\n") + "\n" });

  const utilsDir = join(import.meta.dir, "..", "..", "runtimes", "core", "assets", "ts");
  const walk = (rel: string): string[] => readdirSync(join(utilsDir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => (e.isDirectory() ? walk(join(rel, e.name)) : [join(rel, e.name)]));
  for (const f of walk("")) files.push({ path: `src/utils/${f}`, contents: banner(f, readFileSync(join(utilsDir, f), "utf8")) });
  for (const f of ["theme.css", "kit.css"]) files.push({ path: `src/styles/${f}`, contents: banner(f, readAsset("styles", f)) });
  files.push({ path: "src/styles/index.css", contents: `/* ${BANNER} */\n/* Entry of the styles: theme tokens and the kit. @source makes Tailwind v4 scan this package for class names. */\n@import "./theme.css";\n@import "./kit.css";\n\n@source "../";\n` });

  const name = pkgName(r);
  files.push(jsonFile("package.json", {
    name, version: "0.0.0", private: true, type: "module",
    description: `${{ svelte: "Svelte 5", react: "React 19", vue: "Vue 3", solid: "SolidJS 1.9" }[r]} primitives (${bricks.length} bricks, ${bricks.reduce((n, b) => n + b.brick.parts.length, 0)} parts) and organisms, generated by xgen from xgen/specs. Source only, no build step: the consumer's Vite compiles it.`,
    sideEffects: ["*.css"],
    // a frame (a component whose whole job is the landmark of a region: the section frame, the shell header, sidebar and footer) is
    // checked as a block file: it opens on its one Block (rule 01)
    ui8kit: { runtime: r, generated: true, kit: ["src/primitives", "src/utils", "src/styles"], composition: ["src/blocks", "src/components"], blockRoot: ["src/blocks", ...inputs.organisms.map((o) => o.value).filter((o) => o.frame && tierDir(o.id) === "components").map((o) => `src/components/${fileName(o.name)}.${{ svelte: "svelte", react: "tsx", vue: "vue", solid: "tsx" }[r]}`).sort()] },
    exports: { ".": { ...(r === "svelte" ? { svelte: "./src/index.ts" } : {}), types: "./src/index.ts", default: "./src/index.ts" }, "./styles/*": "./src/styles/*", "./package.json": "./package.json" },
    scripts: { check: { svelte: "svelte-check --tsconfig ./tsconfig.json", react: "tsc --noEmit -p tsconfig.json", solid: "tsc --noEmit -p tsconfig.json", vue: "vue-tsc --noEmit -p tsconfig.json" }[r] },
    peerDependencies: { ...{ svelte: { svelte: "^5.57.0" }, react: { react: "^19.2.0" }, vue: { vue: "^3.5.43" }, solid: { "solid-js": "^1.9.0" } }[r], tailwindcss: "^4.3.3" },
    dependencies: { clsx: "^2.1.1", "tailwind-merge": "^3.7.0" },
    devDependencies: {
      svelte: { "@tsconfig/svelte": "^5.0.8", svelte: "^5.57.0", "svelte-check": "^4.7.6", typescript: "~6.0.2" },
      react: { "@types/react": "^19.2.0", "@types/react-dom": "^19.2.0", react: "^19.2.0", "react-dom": "^19.2.0", typescript: "~6.0.2" },
      vue: { typescript: "~6.0.2", vue: "^3.5.43", "vue-tsc": "^3.3.12" },
      solid: { "solid-js": "^1.9.0", typescript: "~6.0.2" },
    }[r],
  }));
  files.push({
    path: "tsconfig.json",
    contents: r === "svelte"
      ? `// ${BANNER}\n{\n  "extends": "@tsconfig/svelte/tsconfig.json",\n  "compilerOptions": { "target": "ES2023", "lib": ["ES2023", "DOM", "DOM.Iterable"], "types": ["svelte"], "allowArbitraryExtensions": true, "resolveJsonModule": true, "noEmit": true },\n  "include": ["src/**/*.ts", "src/**/*.svelte"]\n}\n`
      : r === "vue"
      ? `// ${BANNER}\n{\n  "compilerOptions": {\n    "target": "ES2023", "lib": ["ES2023", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler", "jsx": "preserve",\n    "strict": true, "noEmit": true, "skipLibCheck": true, "resolveJsonModule": true, "isolatedModules": true, "verbatimModuleSyntax": true\n  },\n  "include": ["src/**/*.ts", "src/**/*.vue"]\n}\n`
      : r === "solid"
      ? `// ${BANNER}\n{\n  "compilerOptions": {\n    "target": "ES2023", "lib": ["ES2023", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler", "jsx": "preserve", "jsxImportSource": "solid-js",\n    "strict": true, "noEmit": true, "skipLibCheck": true, "resolveJsonModule": true, "isolatedModules": true, "verbatimModuleSyntax": true\n  },\n  "include": ["src"]\n}\n`
      : `// ${BANNER}\n{\n  "compilerOptions": {\n    "target": "ES2023", "lib": ["ES2023", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx",\n    "strict": true, "noEmit": true, "skipLibCheck": true, "resolveJsonModule": true, "isolatedModules": true, "verbatimModuleSyntax": true\n  },\n  "include": ["src"]\n}\n`,
  });
  const nParts = bricks.reduce((n, b) => n + b.brick.parts.length, 0);
  files.push({
    path: "README.md",
    contents: packageReadme(name, r, bricks.length, nParts, org.length),
  });
  return files.map((f) => withSource(f, sourceOf(f.path)));

  /** the file a person changes instead of a generated one */
  function sourceOf(path: string): string | undefined {
    const rel = (p: string): string => relative(join(xgenRoot, ".."), p);
    const prim = /^src\/primitives\/([^/]+)\//.exec(path);
    if (prim) {
      if (path.endsWith("lucide-icons.ts")) return "xgen/specs/assets/lucide-icons.json";
      if (path === "src/primitives/slot/slot.tsx") return "xgen/runtimes/react/assets/slot.tsx";
      const b = bricks.find((x) => x.brick.dir === prim[1]);
      return b ? rel(b.specPath) : undefined;
    }
    const comp = /^src\/(?:components|blocks)\/([a-z0-9-]+)(?:\.types|\.assets)?\.(?:svelte|vue|tsx|ts)$/.exec(path);
    if (comp) { const f = inputs.organisms.map((o) => o.file).find((x) => x.endsWith(`/${comp[1]}.json`)); return authoring.get(comp[1]!) ?? (f ? rel(f) : undefined); }
    const asset = /^src\/(utils|styles)\/(.+)$/.exec(path);
    if (asset) return asset[1] === "utils" ? `xgen/runtimes/core/assets/ts/${asset[2]}` : path.endsWith("index.css") ? "xgen/generator/src/plan.ts (uiPackage)" : `xgen/runtimes/core/assets/styles/${asset[2]}`;
    if (path === "src/index.ts") return "xgen/generator/src/plan.ts (the barrel lists every spec)";
    if (path === "tsconfig.json") return "xgen/generator/src/plan.ts (uiPackage)";
    if (path === "README.md") return "xgen/generator/src/readme.ts";
    return undefined;
  }
}

/** the screens a host serves: its list, or every screen portable to its runtime for ["*"] */
export function hostedScreens(app: AppSpec, all: ScreenSpec[]): { screens: ScreenSpec[]; missing: string[] } {
  if (app.screens.includes("*")) return { screens: all.filter((s) => portableTo(s.portable, app.runtime) === true), missing: [] };
  const screens: ScreenSpec[] = [], missing: string[] = [];
  for (const id of app.screens) { const s = all.find((x) => x.id === id); if (s) screens.push(s); else missing.push(id); }
  return { screens, missing };
}

export function planBuild(workspace: string, xgenRoot = join(workspace, "xgen")): Plan {
  const problems: string[] = [];
  const specs = loadSpecs(xgenRoot);
  problems.push(...specs.problems);
  const inputs = loadInputs(xgenRoot);
  problems.push(...inputs.problems);
  const parts = indexParts(specs.bricks);
  const targets: Target[] = [];
  const orgs = Object.fromEntries(inputs.organisms.map((o) => [o.value.name, o.value as OrganismSpec]));
  for (const r of UI_RUNTIMES) {
    targets.push({ dir: `packages/${r}/ui`, kind: "package", runtime: r, files: byPath(uiPackage(r, specs.bricks, inputs, parts, xgenRoot)), handwritten: [], manifest: MANIFEST });
  }
  // the Go templ package; templ generate output (*_templ.go) and go.sum are build outputs the drift check leaves alone
  const templ = templFiles(specs.bricks, inputs, xgenRoot, problems).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  targets.push({ dir: TEMPL_DIR, kind: "package", runtime: "templ", files: templ, handwritten: [], manifest: ".xgen-manifest.json", ignore: /(_templ\.go|^go\.sum)$/ });
  // the Twig package; composer install output (vendor/, composer.lock) is a build output the drift check leaves alone
  targets.push({ dir: TWIG_DIR, kind: "package", runtime: "twig", files: twigFiles(specs.bricks, inputs, xgenRoot, problems), handwritten: [], manifest: ".xgen-manifest.json", ignore: /^(vendor\/|composer\.lock$)/ });
  // the Jinja2 package; the virtual environment of the check (.venv/) and Python caches are build outputs the drift check leaves alone
  targets.push({ dir: JINJA2_DIR, kind: "package", runtime: "jinja2", files: jinja2Files(specs.bricks, inputs, xgenRoot, problems), handwritten: [], manifest: ".xgen-manifest.json", ignore: /(^\.venv\/|__pycache__\/)/ });
  targets.push({ dir: LATTE_DIR, kind: "package", runtime: "latte", files: latteFiles(specs.bricks, inputs, xgenRoot, problems), handwritten: [], manifest: ".xgen-manifest.json", ignore: /^(vendor\/|composer\.lock$)/ });
  const all = inputs.screens.map((s) => s.value);
  const apps: Plan["apps"] = [];
  const hosted = new Map<string, ScreenSpec>();
  const hostTargets: Target[] = [];
  for (const dir of findApps(workspace)) {
    const loaded = loadApp(join(dir, "xgen.app.json"));
    problems.push(...loaded.problems);
    const app = loaded.app;
    const { screens, missing } = hostedScreens(app, all);
    for (const id of missing) problems.push(`${basename(dir)}: screen ${id} does not exist`);
    apps.push({ dir, app });
    if (app.name !== basename(dir)) problems.push(`${basename(dir)}: "name" in xgen.app.json is ${app.name}`);
    for (const s of screens) {
      hosted.set(s.id, s);
      if (s.nav && !s.menu?.length) problems.push(`${s.id}: the screen reads the menu (nav) but its spec has no "menu"`);
    }
    const rt = RUNTIME[app.runtime];
    const files = rt.app(app, screens).map((f) => withSource(f, appSourceOf(f.path, app.runtime, basename(dir))));
    for (const s of screens) {
      const deps = { parts, organisms: orgs, partPath: () => "", ui: pkgName(app.runtime), shared: SHARED, recordType: s.source?.record ?? "" };
      const f = rt.screen(s, deps);
      const specFile = inputs.screens.find((x) => x.value.id === s.id)?.file;
      const chunks = rt.chunks(s, deps);
      for (const c of [f, ...chunks]) files.push(withSource({ path: `${HOST_GEN}/${c.path}`, contents: c.contents }, specFile ? relative(join(xgenRoot, ".."), specFile) : undefined));
    }
    hostTargets.push({ dir: `apps/${basename(dir)}`, kind: "app", runtime: app.runtime, files: byPath(files), handwritten: ["xgen.app.json", ...(app.hand ?? [])], manifest: `${HOST_GEN}/${MANIFEST}` });
  }
  // what every host reads, emitted once: the dictionary, the fixtures of the hosted screens, their menus, the registry, the url core
  const shared = [...hosted.values()].sort((a, b) => a.id.localeCompare(b.id));
  const cols = new Set(shared.flatMap((s) => sourcesOf(s).map((x) => x.collection)));
  // and the lookups of the entries they read: media (featured_media_id), users (author_id) and the taxonomy terms (terms)
  const LOOKUP_KINDS = ["media", "user"];
  const picked = inputs.collections.map((c) => c.value).filter((c) => cols.has(c.collection) || c.entries.every((e) => LOOKUP_KINDS.includes(e.kind)) && c.entries.length > 0);
  // and the items under the menu items they read (kind menu_item, parent_id): the lookup of `id|menu`
  const pickedIds = new Set(picked.flatMap((c) => c.entries.map((e) => e.id)));
  const collections = inputs.collections.map((c) => c.value).filter((c) => picked.includes(c) || c.entries.length > 0 && c.entries.every((e) => e.kind === "menu_item" && pickedIds.has((e as { parent_id?: string }).parent_id ?? "")));
  const screenFile = (name: string): string | undefined => { const f = inputs.screens.find((x) => x.value.name === name)?.file; return f ? relative(join(xgenRoot, ".."), f) : undefined; };
  const sharedFiles = sharedPackage(inputs.dictionary.value, collections, shared, inputs.taxonomies.map((t) => t.value)).map((f) => withSource(f, sharedSourceOf(f.path, screenFile)));
  if (hostTargets.length) targets.push({ dir: SHARED_DIR, kind: "package", runtime: "core", files: byPath(sharedFiles), handwritten: [], manifest: MANIFEST });
  targets.push(...hostTargets);
  // the copy decks of the taste screens, from their Codex entries (xgen/fixtures/deck*.json); the rest of the folder is hand-kept.
  // Only where a workspace carries the taste-data package (the codegen-x monorepo); a standalone checkout has no such consumer.
  if (existsSync(join(workspace, "packages", "taste-data", "package.json"))) targets.push({ dir: "packages/taste-data/content", kind: "package", runtime: "core", files: [decksFile(inputs.collections.map((c) => c.value))], handwritten: [], manifest: MANIFEST, ignore: /^reference-/ });
  return { workspace, xgenRoot, targets, problems, inputs, bricks: specs.bricks, apps };
}

/** the file a person changes instead of a generated file of the shared package (dictionary, fixtures, menus, registry, url core) */
export function sharedSourceOf(path: string, screenFile: (name: string) => string | undefined): string | undefined {
  if (path === "src/content.ts") return "xgen/content/ui/en.json";
  if (path === "src/data/taxonomies.ts") return "xgen/fixtures/taxonomies/*.json";
  if (path === "src/runtime/codex.ts") return "xgen/runtimes/core/src/app-common.ts (codexFile: the lookups of the entries)";
  const data = /^src\/data\/([a-z0-9-]+)\.ts$/.exec(path);
  if (data) return `xgen/fixtures/${data[1]}.json`;
  const nav = /^src\/nav\/(\w+)\.ts$/.exec(path);
  if (nav) return screenFile(nav[1]!);
  const runtime = /^src\/runtime\/(\w+)\.ts$/.exec(path);
  if (runtime) return `xgen/runtimes/core/assets/app/${runtime[1]}.ts`;
  if (path === "src/styles/skins.css") return "xgen/runtimes/core/assets/styles/skins.css";
  if (path === "src/screens.ts") return "xgen/runtimes/core/src/app-common.ts (registryFile lists every hosted screen)";
  if (path === "tsconfig.json" || path === "README.md") return "xgen/runtimes/core/src/app-common.ts (sharedPackage)";
  return undefined;
}

/** the file a person changes instead of a generated scaffold file of a host app: its xgen.app.json for what it serves, the runtime template for the rest */
export function appSourceOf(path: string, runtime: Runtime, dir: string): string | undefined {
  if (path === `${HOST_GEN}/runtime/url.svelte.ts`) return "xgen/runtimes/svelte/assets/url.svelte.ts";
  if (path === `${HOST_GEN}/runtime/url.ts`) return `xgen/runtimes/${runtime}/assets/url.ts`;
  if (path.endsWith("package.json")) return undefined;
  return `xgen/runtimes/${runtime}/src/app.ts (settings: apps/${dir}/xgen.app.json)`;
}
