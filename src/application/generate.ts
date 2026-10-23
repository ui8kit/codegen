/**
 * Generation pipeline: validate the brick registry, run every requested
 * emitter, add barrels and the runtime support layer, and return (or write)
 * the full generated tree.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fileStem, type BrickDef } from "../domain/model";
import { validateRegistry } from "../domain/validate";
import { BANNER, pruneUnusedImports, type Emitter, type GeneratedFile } from "../emitters/common";
import { ReactEmitter } from "../emitters/react";
import { SolidEmitter } from "../emitters/solid";
import { SvelteEmitter } from "../emitters/svelte";
import { VueEmitter } from "../emitters/vue";
import { WebComponentEmitter } from "../emitters/webcomponent";
import { emitGoMod, emitGoParityHarness, emitGoTags, TemplEmitter } from "../emitters/templ";
import { emitJinjaClasses, Jinja2Emitter, JINJA2_REQUIREMENT } from "../emitters/jinja2";
import { TwigEmitter } from "../emitters/twig";
import { LatteEmitter } from "../emitters/latte";
import {
  emitClassesPhp,
  emitComposerJson,
  emitPhpParityHarness,
  emitTagsPhp,
  PHP_NAMESPACE,
  runtimePhpFile,
  type PhpRuntime,
} from "../emitters/php-common";

export type RuntimeName = "react" | "svelte" | "vue" | "solid" | "webcomponent" | "templ" | "jinja2" | "twig" | "latte";

/** Runtimes that consume the shared TypeScript layer (`ui/*.shared.ts`, `utils/*.ts`). */
export const TS_RUNTIMES: RuntimeName[] = ["react", "svelte", "vue", "solid", "webcomponent"];

export interface GenerateOptions {
  runtimes?: RuntimeName[];
}

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ALL_RUNTIMES: RuntimeName[] = ["react", "svelte", "vue", "solid", "webcomponent", "templ", "jinja2", "twig", "latte"];

export async function generateFiles(
  bricks: BrickDef[],
  options: GenerateOptions = {}
): Promise<GeneratedFile[]> {
  validateRegistry(bricks);
  const runtimes = options.runtimes ?? ALL_RUNTIMES;

  const emitters: Emitter[] = [];
  if (runtimes.includes("react")) emitters.push(new ReactEmitter());
  if (runtimes.includes("svelte")) emitters.push(new SvelteEmitter());
  if (runtimes.includes("vue")) emitters.push(new VueEmitter());
  if (runtimes.includes("solid")) emitters.push(new SolidEmitter());
  if (runtimes.includes("webcomponent")) emitters.push(new WebComponentEmitter());
  if (runtimes.includes("templ")) emitters.push(new TemplEmitter());
  if (runtimes.includes("jinja2")) emitters.push(new Jinja2Emitter());
  if (runtimes.includes("twig")) emitters.push(new TwigEmitter());
  if (runtimes.includes("latte")) emitters.push(new LatteEmitter());

  const files: GeneratedFile[] = [];
  const emitTs = runtimes.some((r) => TS_RUNTIMES.includes(r));

  for (const brick of bricks) {
    // Colocate the shared recipes next to every runtime file.
    for (const [id, file] of Object.entries(brick.recipeFiles)) {
      const recipe = brick.recipes[id]!;
      files.push({
        path: `ui/${brick.dir}/${file}`,
        contents: JSON.stringify(recipe, null, 2) + "\n",
      });
    }
    if (emitTs) {
      const { emitSharedModule } = await import("../emitters/ts-common");
      files.push(emitSharedModule(brick, "../../utils"));
    }
    for (const emitter of emitters) {
      files.push(
        ...emitter.emit(brick).map((f) => ({ ...f, contents: pruneUnusedImports(f.contents) }))
      );
    }
  }

  files.push(...(await runtimeSupportFiles(runtimes)));
  if (runtimes.includes("templ")) files.push(...(await templSupportFiles(bricks)));
  if (runtimes.includes("jinja2")) files.push(...(await jinja2SupportFiles(bricks)));
  for (const php of ["twig", "latte"] as const) {
    if (runtimes.includes(php)) files.push(...(await phpSupportFiles(bricks, php)));
  }
  files.push(...barrels(bricks, runtimes));

  const { rulesFiles } = await import("./rules");
  files.push(...(await rulesFiles(bricks, runtimes)));

  const { buildSpecs } = await import("./specs");
  files.push({ path: "specs.json", contents: JSON.stringify(buildSpecs(bricks), null, 2) + "\n" });

  // Fail loudly on path collisions — one brick must never overwrite another.
  const seen = new Set<string>();
  for (const f of files) {
    if (seen.has(f.path)) throw new Error(`duplicate generated path: ${f.path}`);
    seen.add(f.path);
  }
  return files;
}

export async function writeFiles(files: GeneratedFile[], outDir: string): Promise<void> {
  for (const file of files) {
    const full = join(outDir, file.path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, file.contents, "utf8");
  }
}

async function runtimeSupportFiles(runtimes: RuntimeName[]): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const emitTs = runtimes.some((r) => TS_RUNTIMES.includes(r));
  if (emitTs) {
    const tsDir = join(PACKAGE_ROOT, "runtime", "ts");
    for (const name of await readdir(tsDir)) {
      files.push({ path: `utils/${name}`, contents: await readFile(join(tsDir, name), "utf8") });
    }
  }
  if (runtimes.includes("webcomponent")) {
    const wc = await readFile(join(PACKAGE_ROOT, "runtime", "wc", "dom.ts"), "utf8");
    files.push({ path: "utils/wc.ts", contents: wc });
  }
  if (runtimes.includes("react")) {
    const slot = await readFile(join(PACKAGE_ROOT, "runtime", "react", "slot.tsx"), "utf8");
    files.push({ path: "ui/slot/slot.tsx", contents: slot });
  }
  return files;
}

/** The Go module under `templ/`: helpers, tag groups, go.mod/go.sum, parity harness. */
async function templSupportFiles(bricks: BrickDef[]): Promise<GeneratedFile[]> {
  const goDir = join(PACKAGE_ROOT, "runtime", "go");
  const files: GeneratedFile[] = [];
  for (const name of (await readdir(goDir)).sort()) {
    const contents = await readFile(join(goDir, name), "utf8");
    if (name === "go.sum") files.push({ path: "templ/go.sum", contents });
    else if (name.endsWith(".go")) files.push({ path: `templ/utils/${name}`, contents: `// ${BANNER}\n\n${contents}` });
  }
  files.push(emitGoTags(), emitGoMod(), emitGoParityHarness(bricks));
  return files;
}

/** The Python side under `jinja2/`: ui8kit_jinja helpers, classes globals, parity harness. */
async function jinja2SupportFiles(bricks: BrickDef[]): Promise<GeneratedFile[]> {
  const pyDir = join(PACKAGE_ROOT, "runtime", "python");
  const files: GeneratedFile[] = [];
  for (const rel of ["parity.py", ...(await readdir(join(pyDir, "ui8kit_jinja"))).sort().map((n) => `ui8kit_jinja/${n}`)]) {
    if (!rel.endsWith(".py")) continue;
    files.push({ path: `jinja2/${rel}`, contents: `# ${BANNER}\n${await readFile(join(pyDir, rel), "utf8")}` });
  }
  files.push(emitJinjaClasses(bricks));
  files.push({ path: "jinja2/requirements.txt", contents: `# ${BANNER}\n${JINJA2_REQUIREMENT}\n` });
  return files;
}

/** A Composer package under `<runtime>/`: runtime helpers, Tags, Classes, composer.json, parity harness. */
async function phpSupportFiles(bricks: BrickDef[], runtime: PhpRuntime): Promise<GeneratedFile[]> {
  const ns = PHP_NAMESPACE[runtime];
  const phpDir = join(PACKAGE_ROOT, "runtime", "php");
  const files: GeneratedFile[] = [];
  for (const name of (await readdir(phpDir)).sort()) {
    if (name === "TwigExtension.php" && runtime !== "twig") continue;
    files.push({ path: `${runtime}/src/${name}`, contents: runtimePhpFile(await readFile(join(phpDir, name), "utf8"), ns) });
  }
  files.push(
    { path: `${runtime}/src/Tags.php`, contents: emitTagsPhp(ns) },
    { path: `${runtime}/src/Classes.php`, contents: emitClassesPhp(bricks, ns) },
    { path: `${runtime}/composer.json`, contents: emitComposerJson(runtime) },
    { path: `${runtime}/bin/parity.php`, contents: emitPhpParityHarness(runtime) }
  );
  return files;
}

function barrels(bricks: BrickDef[], runtimes: RuntimeName[]): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  if (runtimes.some((r) => TS_RUNTIMES.includes(r))) {
    const lines = [`// ${BANNER}`, `// Shared per-brick contracts (types + classes helpers).`, ``];
    for (const brick of bricks) {
      lines.push(`export * from "./${brick.dir}/${fileStem(brick)}.shared";`);
    }
    files.push({ path: "ui/shared.ts", contents: lines.join("\n") + "\n" });
  }

  if (runtimes.includes("react")) {
    const lines = [`// ${BANNER}`, `// React barrel.`, ``];
    for (const brick of bricks) {
      lines.push(`export * from "./${brick.dir}/${fileStem(brick)}";`);
    }
    lines.push(`export * from "./slot/slot";`);
    lines.push(`export * from "./shared";`);
    files.push({ path: "ui/index.ts", contents: lines.join("\n") + "\n" });
  }

  if (runtimes.includes("svelte")) {
    const lines = [`// ${BANNER}`, `// Svelte 5 barrel.`, ``];
    for (const brick of bricks) {
      for (const part of brick.parts) {
        lines.push(`export { default as ${part.name} } from "./${brick.dir}/${part.name}.svelte";`);
        lines.push(`export type { ${part.name}Props } from "./${brick.dir}/${part.name}.svelte";`);
      }
    }
    lines.push(`export * from "./shared";`);
    files.push({ path: "ui/index.svelte.ts", contents: lines.join("\n") + "\n" });
  }

  if (runtimes.includes("vue")) {
    const lines = [`// ${BANNER}`, `// Vue 3 barrel.`, ``];
    for (const brick of bricks) {
      for (const part of brick.parts) {
        lines.push(`export { default as ${part.name} } from "./${brick.dir}/${part.name}.vue";`);
      }
    }
    lines.push(`export * from "./shared";`);
    files.push({ path: "ui/index.vue.ts", contents: lines.join("\n") + "\n" });
  }

  if (runtimes.includes("solid")) {
    const lines = [`// ${BANNER}`, `// SolidJS barrel.`, ``];
    for (const brick of bricks) {
      lines.push(`export * from "./${brick.dir}/${fileStem(brick)}.solid";`);
    }
    lines.push(`export * from "./shared";`);
    files.push({ path: "ui/index.solid.ts", contents: lines.join("\n") + "\n" });
  }

  if (runtimes.includes("webcomponent")) {
    const lines = [`// ${BANNER}`, `// Vanilla custom elements barrel.`, ``];
    const defs: string[] = [];
    for (const brick of bricks) {
      const names = brick.parts.map((p) => `define${p.name}`);
      lines.push(`export * from "./${brick.dir}/${fileStem(brick)}.wc";`);
      lines.push(`import { ${names.join(", ")} } from "./${brick.dir}/${fileStem(brick)}.wc";`);
      defs.push(...names);
    }
    lines.push(``);
    lines.push(`/** Register every primitive as <prefix-part> (default prefix "ui8"). */`);
    lines.push(`export function defineAll(prefix = "ui8"): void {`);
    for (const d of defs) {
      const tag = d.slice("define".length).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      lines.push(`  ${d}(prefix + ${JSON.stringify("-" + tag)});`);
    }
    lines.push(`}`);
    lines.push(`export * from "./shared";`);
    files.push({ path: "ui/index.wc.ts", contents: lines.join("\n") + "\n" });
  }

  return files;
}
