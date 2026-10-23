/**
 * Docs snippets are real: every usage snippet in docs/primitives/*.md is
 * executed verbatim (imports rewritten to generated/) in its runtime and must
 * render the HTML documented next to it (normalized DOM). Also asserts the
 * generated docs are fresh (same check as `bun run docs:check`).
 *
 * JS runtimes always run; templ/Twig/Latte/Jinja2 need their toolchains
 * (skipped locally without them, failures under UI8KIT_REQUIRE_ALL_RUNTIMES=1).
 */

import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render as svelteRender } from "svelte/server";
import type { Component } from "svelte";
import { createSSRApp, h, type Component as VueComponent } from "vue";
import { renderToString as vueRenderToString } from "@vue/server-renderer";
import { createComponent, type Component as SolidComponent } from "solid-js";
import { renderToString as solidRenderToString } from "solid-js/web";
import { Window } from "happy-dom";

import { TEMPL_VERSION } from "../src/emitters/templ";
import { ensureGenerated } from "./support/ensure-generated";
import { normalizeHtml } from "./support/normalize";

await ensureGenerated();

const ROOT = join(import.meta.dir, "..");
const GEN = join(ROOT, "generated");
const REQUIRED = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";
const PYTHON = process.env["PYTHON"] ?? "python3";
const ok = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

interface Snip {
  page: string;
  idx: number;
  expected: string;
  code: Record<string, string>;
}

/** Parse "every snippet renders:" blocks and the runtime snippets that follow. */
function parseDocs(): Snip[] {
  const out: Snip[] = [];
  const dir = join(ROOT, "docs", "primitives");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md") && x !== "slot.md")) {
    const md = readFileSync(join(dir, f), "utf8");
    const sections = md.split(/every snippet renders:\n\n/).slice(1);
    sections.forEach((sec, idx) => {
      const expected = /^```html\n([\s\S]*?)\n```/.exec(sec)![1]!;
      const code: Record<string, string> = {};
      const re = /\[runtime notes\]\(\.\.\/runtimes\/(\w+)\.md\)\)\n\n```\w+\n([\s\S]*?)\n```/g;
      const body = sec.split(/\n#{2,3} /)[0]!;
      for (const m of body.matchAll(re)) code[m[1]!] = m[2]!;
      out.push({ page: f, idx, expected, code });
    });
  }
  return out;
}

const snips = parseDocs();
const TMP = join(GEN, "ui", "__docs__");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const relImports = (s: string) =>
  s.replace(/(["'])\.\/ui\//g, "$1../");
const name = (s: Snip) => `${s.page.replace(/\.md$/, "")}_${s.idx}`;
const eq = (actual: string, s: Snip) => expect(normalizeHtml(actual)).toEqual(normalizeHtml(s.expected));

it("docs are fresh (bun run docs:check)", () => {
  const r = spawnSync("bun", ["scripts/docs.ts", "--check"], { cwd: ROOT, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
});

it("every primitive page documents all 9 runtimes", () => {
  expect(snips.length).toBeGreaterThan(17);
  for (const s of snips) expect(Object.keys(s.code).sort(), s.page).toEqual(
    ["jinja2", "latte", "react", "solid", "svelte", "templ", "twig", "vue", "webcomponent"]
  );
});

describe("docs snippets · JS runtimes", () => {
  for (const s of snips) {
    it(`[react] ${name(s)}`, async () => {
      const [imp, jsx] = s.code["react"]!.split("\n\n");
      const file = join(TMP, `${name(s)}.react.tsx`);
      writeFileSync(file, `${relImports(imp!)}\nexport const node = (${jsx});\n`);
      const mod = await import(pathToFileURL(file).href);
      eq(renderToStaticMarkup(mod.node), s);
    });
    it(`[solid] ${name(s)}`, async () => {
      const [imp, jsx] = s.code["solid"]!.split("\n\n");
      const file = join(TMP, `${name(s)}.solid.tsx`);
      writeFileSync(file, `${relImports(imp!)}\nexport const Doc = () => (${jsx});\n`);
      const mod = await import(pathToFileURL(file).href);
      eq(solidRenderToString(() => createComponent(mod.Doc as SolidComponent<Record<string, unknown>>, {})), s);
    });
    it(`[svelte] ${name(s)}`, async () => {
      const file = join(TMP, `${name(s)}.svelte`);
      writeFileSync(file, relImports(s.code["svelte"]!));
      const mod = (await import(pathToFileURL(file).href)) as { default: Component };
      eq(svelteRender(mod.default, { props: {} }).body, s);
    });
    it(`[vue] ${name(s)}`, async () => {
      const file = join(TMP, `${name(s)}.vue`);
      writeFileSync(file, relImports(s.code["vue"]!));
      const mod = (await import(pathToFileURL(file).href)) as { default: VueComponent };
      eq(await vueRenderToString(createSSRApp({ render: () => h(mod.default) })), s);
    });
    it(`[webcomponent] ${name(s)}`, async () => {
      const win = new Window({ url: "http://localhost/" });
      const keys = ["window", "document", "customElements", "HTMLElement", "Node", "Element"] as const;
      const g = globalThis as Record<string, unknown>;
      const saved = keys.map((k) => g[k]);
      keys.forEach((k) => (g[k] = k === "window" ? win : (win as unknown as Record<string, unknown>)[k]));
      try {
        const src = relImports(s.code["webcomponent"]!).replace(/document\.body\.append\(([\s\S]*)\);\s*$/, "export const el = $1;");
        const file = join(TMP, `${name(s)}.wc.ts`);
        writeFileSync(file, src);
        const mod = (await import(pathToFileURL(file).href)) as { el: { outerHTML: string } };
        eq(mod.el.outerHTML, s);
      } finally {
        keys.forEach((k, i) => (g[k] = saved[i]));
        void win.happyDOM.close();
      }
    });
  }
});

function toolchainSuite(rt: string, available: boolean, run: () => string[]): void {
  if (!available) {
    const msg = `docs ${rt} snippets: toolchain not found`;
    if (REQUIRED) it(`[${rt}] requires toolchain (UI8KIT_REQUIRE_ALL_RUNTIMES=1)`, () => { throw new Error(msg); });
    else describe.skip(`docs snippets · ${rt} (skipped: ${msg})`, () => it("skipped", () => {}));
    return;
  }
  describe(`docs snippets · ${rt}`, () => {
    let html: string[] | undefined;
    const get = () => (html ??= run());
    snips.forEach((s, i) => it(`[${rt}] ${name(s)}`, () => eq(get()[i]!, s)));
  });
}

toolchainSuite("jinja2", ok(PYTHON, ["-c", "import jinja2"]), () => {
  const py = `import json,sys,os\nsys.path.insert(0, os.getcwd())\nfrom ui8kit_jinja import environment\nenv = environment()\nprint(json.dumps([env.from_string(t).render() for t in json.load(sys.stdin)]))`;
  return JSON.parse(execFileSync(PYTHON, ["-c", py], { cwd: join(GEN, "jinja2"), input: JSON.stringify(snips.map((s) => s.code["jinja2"])), encoding: "utf8" }));
});

const php = ok("php", ["--version"]) && ok("composer", ["--version"]);
const phpRun = (rt: "twig" | "latte", script: string) => {
  const dir = join(GEN, rt);
  execFileSync("composer", ["install", "--no-interaction", "--no-progress", "--quiet"], { cwd: dir, stdio: "ignore" });
  return JSON.parse(execFileSync("php", ["-r", script], { cwd: dir, input: JSON.stringify(snips.map((s) => s.code[rt])), encoding: "utf8" })) as string[];
};
toolchainSuite("twig", php, () =>
  phpRun("twig", `require 'vendor/autoload.php';
$t = json_decode(stream_get_contents(STDIN), true); $arr = [];
foreach ($t as $i => $s) $arr["__doc$i"] = $s;
$twig = new \\Twig\\Environment(new \\Twig\\Loader\\ChainLoader([new \\Twig\\Loader\\ArrayLoader($arr), new \\Twig\\Loader\\FilesystemLoader('ui')]), ['autoescape' => 'html', 'cache' => false]);
$twig->addExtension(new \\UI8Kit\\Twig\\TwigExtension());
echo json_encode(array_map(fn($k) => $twig->render($k), array_keys($arr)), JSON_UNESCAPED_SLASHES);`)
);
toolchainSuite("latte", php, () =>
  phpRun("latte", `require 'vendor/autoload.php';
$t = json_decode(stream_get_contents(STDIN), true); $out = [];
$latte = new \\Latte\\Engine(); $latte->setTempDirectory(sys_get_temp_dir() . '/ui8kit-latte-docs-' . md5(getcwd()));
$latte->setLoader(new \\Latte\\Loaders\\FileLoader(getcwd() . '/ui'));
foreach ($t as $i => $s) { $f = "ui/__docs__$i.latte"; file_put_contents($f, $s); try { $out[] = $latte->renderToString("__docs__$i.latte"); } finally { unlink($f); } }
echo json_encode($out, JSON_UNESCAPED_SLASHES);`)
);

toolchainSuite("templ", ok("go", ["version"]), () => {
  const mod = join(GEN, "templ");
  const dir = join(mod, "cmd", "docsnippets");
  mkdirSync(dir, { recursive: true });
  try {
    const imports = new Set<string>();
    const comps = snips.map((s, i) => {
      const [imp, body] = s.code["templ"]!.split("\n\n");
      imports.add(imp!.replace(/\s*\/\/.*$/, ""));
      return `templ doc${i}() {\n\t${body}\n}`;
    });
    writeFileSync(join(dir, "docs.templ"), `package main\n\nimport (\n\t"context"\n\t"encoding/json"\n\t"os"\n\t"strings"\n${[...imports].map((x) => "\t" + x.replace(/^import /, "")).join("\n")}\n)\n\n${comps.join("\n\n")}\n\nfunc main() {\n\tcs := []templ.Component{${snips.map((_, i) => `doc${i}()`).join(", ")}}\n\tout := []string{}\n\tfor _, c := range cs {\n\t\tvar b strings.Builder\n\t\t_ = c.Render(context.Background(), &b)\n\t\tout = append(out, b.String())\n\t}\n\t_ = json.NewEncoder(os.Stdout).Encode(out)\n}\n`);
    const local = join(homedir(), "go", "bin", "templ");
    const [bin, args] = existsSync(local) ? [local, [] as string[]] : ["go", ["run", `github.com/a-h/templ/cmd/templ@${TEMPL_VERSION}`]];
    execFileSync(bin, [...args, "generate", "-path", "cmd/docsnippets"], { cwd: mod, stdio: "ignore" });
    return JSON.parse(execFileSync("go", ["run", "./cmd/docsnippets"], { cwd: mod, encoding: "utf8" }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
