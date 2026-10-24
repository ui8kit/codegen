/**
 * Render one fixed list of cases through all 9 real runtimes (React, Svelte, Vue, Solid, web components,
 * templ, Twig, Latte, Jinja2) plus the canonical renderer, with one canonical props shape per case
 * (`Attrs` = the server escape hatch; JS runtimes receive its entries as rest props, so they come last there).
 * Used by `tests/parity.attrs.test.ts` (attribute-rule parity with explicit expected HTML).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render as svelteRender } from "svelte/server";
import { createRawSnippet, type Component } from "svelte";
import { createSSRApp, h, type Component as VueComponent } from "vue";
import { renderToString as vueRenderToString } from "@vue/server-renderer";
import { createComponent, type Component as SolidComponent } from "solid-js";
import { renderToString as solidRenderToString } from "solid-js/web";
import { Window } from "happy-dom";

import { bricks } from "../../bricks/index";
import { fileStem, type BrickDef, type PartDef } from "../../src/domain/model";
import { renderPart } from "../../src/domain/render";
import { phpItemKey, phpParamName } from "../../src/emitters/php-common";
import { jinjaTemplateOf } from "../../src/emitters/jinja2";
import { TEMPL_VERSION } from "../../src/emitters/templ";
import { ensureGenerated } from "./ensure-generated";
import { loadGeneratedUiModules } from "./generated-ui";
import { hasChildren, htmlRuntimeProps, reactProps, solidProps, vueProps, type CanonicalProps } from "./props";

export const RUNTIMES = ["react", "svelte", "vue", "solid", "webcomponent", "templ", "twig", "latte", "jinja2"] as const;
export type Runtime = (typeof RUNTIMES)[number];
export interface AttrCase { part: string; props: CanonicalProps }
export type Rendered = Record<Runtime | "canonical", string>;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GEN = join(ROOT, "generated");
const CHILD = "Content";
const ok = (cmd: string, args: string[], cwd?: string) => spawnSync(cmd, args, { stdio: "ignore", cwd }).status === 0;

export const toolchains = {
  templ: ok("go", ["version"]),
  php: ok("php", ["--version"]) && ok("composer", ["--version"]),
  jinja2: ok(process.env["PYTHON"] ?? "python3", ["-c", "import jinja2"]),
};

const brickOf = (part: string): [BrickDef, PartDef] => {
  const b = bricks.find((x) => x.parts.some((p) => p.name === part));
  if (!b) throw new Error(`unknown part ${part}`);
  return [b, b.parts.find((p) => p.name === part)!];
};
/** JS runtimes: Attrs entries become rest props (after the named props: the caller's attrs win). */
const jsProps = (props: CanonicalProps): CanonicalProps => {
  const { Attrs, ...rest } = props as { Attrs?: Record<string, unknown> };
  return { ...rest, ...(Attrs ?? {}) };
};
const run = (cmd: string, args: string[], cwd: string, input?: string) =>
  execFileSync(cmd, args, { cwd, input, encoding: "utf8", maxBuffer: 64 << 20, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "inherit"] });

function templBin(): [string, string[]] {
  if (ok("templ", ["version"])) return ["templ", []];
  const local = join(homedir(), "go", "bin", "templ");
  if (existsSync(local)) return [local, []];
  return ["go", ["run", `github.com/a-h/templ/cmd/templ@${TEMPL_VERSION}`]];
}

function phpParams(part: PartDef, canonical: CanonicalProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(canonical)) {
    const def = part.props.find((p) => p.name === name);
    if (!def) continue;
    if (def.type === "attrs") out["attrs"] = value;
    else if (def.type === "items")
      out[phpParamName(def)] = (value as Record<string, unknown>[]).map((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [phpItemKey(k), v])));
    else out[phpParamName(def)] = value;
  }
  return out;
}

/** Render every case in every runtime whose toolchain is present (missing ones are reported as undefined). */
export async function renderEverywhere(cases: AttrCase[]): Promise<Array<Partial<Rendered>>> {
  await ensureGenerated();
  const { reactModules, svelteModules, vueModules, solidModules } = await loadGeneratedUiModules();
  const out: Array<Partial<Rendered>> = [];
  const win = new Window({ url: "http://localhost/" });
  const saved: Record<string, unknown> = {};
  for (const k of ["window", "document", "customElements", "HTMLElement", "Node", "Element"]) {
    saved[k] = (globalThis as Record<string, unknown>)[k];
    (globalThis as Record<string, unknown>)[k] = k === "window" ? win : (win as unknown as Record<string, unknown>)[k];
  }
  try {
    for (const c of cases) {
      const [brick, part] = brickOf(c.part);
      const kids = hasChildren(part);
      const js = jsProps(c.props);
      const { Attrs: rest, ...named } = c.props as CanonicalProps & { Attrs?: Record<string, string> };
      const r: Partial<Rendered> = {};
      r.canonical = renderPart(brick, part.name, named, { children: kids ? CHILD : undefined, rest });
      const React = reactModules[`../generated/ui/${brick.dir}/${fileStem(brick)}.tsx`]![part.name] as ComponentType<Record<string, unknown>>;
      r.react = renderToStaticMarkup(createElement(React, reactProps(part, js), kids ? CHILD : undefined)).replace(/<link rel="preload"[^>]*\/?>/g, "");
      const sp = htmlRuntimeProps(part, js);
      if (kids) sp["children"] = createRawSnippet(() => ({ render: () => CHILD }));
      r.svelte = svelteRender((svelteModules[`../generated/ui/${brick.dir}/${part.name}.svelte`] as { default: Component }).default, { props: sp }).body;
      const Vue = (vueModules[`../generated/ui/${brick.dir}/${part.name}.vue`] as { default: VueComponent }).default;
      r.vue = await vueRenderToString(createSSRApp({ render: () => h(Vue, vueProps(part, js), kids ? { default: () => CHILD } : undefined) }));
      const Solid = solidModules[`../generated/ui/${brick.dir}/${fileStem(brick)}.solid.tsx`]![part.name] as SolidComponent<Record<string, unknown>>;
      r.solid = solidRenderToString(() => createComponent(Solid, { ...solidProps(part, js), ...(kids ? { children: CHILD } : {}) }));
      const wc = (await import(pathToFileURL(join(GEN, "ui", brick.dir, `${fileStem(brick)}.wc.ts`)).href)) as Record<string, (p: unknown, c?: unknown) => { outerHTML: string }>;
      r.webcomponent = wc[`render${part.name}`]!(htmlRuntimeProps(part, js), kids ? CHILD : []).outerHTML;
      out.push(r);
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) (globalThis as Record<string, unknown>)[k] = v;
    void win.happyDOM.close();
  }
  const kidsOf = (c: AttrCase) => hasChildren(brickOf(c.part)[1]) ? CHILD : "";
  if (toolchains.templ) {
    const dir = join(GEN, "templ");
    const [bin, args] = templBin();
    run(bin, [...args, "generate"], dir);
    const html = JSON.parse(run("go", ["run", "./cmd/parity"], dir, JSON.stringify(cases.map((c) => {
      const [b, p] = brickOf(c.part);
      return { name: `${b.dir}/${p.name}`, props: c.props, children: kidsOf(c) };
    })))) as string[];
    html.forEach((s, i) => (out[i]!.templ = s));
  }
  if (toolchains.php) {
    for (const rt of ["twig", "latte"] as const) {
      const dir = join(GEN, rt);
      run("composer", ["install", "--no-interaction", "--no-progress", "--quiet"], dir);
      const ext = rt === "twig" ? ".html.twig" : ".latte";
      const html = JSON.parse(run("php", ["bin/parity.php"], dir, JSON.stringify(cases.map((c) => {
        const [b, p] = brickOf(c.part);
        return { template: `${b.dir}/${p.name}${ext}`, params: phpParams(p, c.props), children: kidsOf(c) };
      })))) as string[];
      html.forEach((s, i) => (out[i]![rt] = s));
    }
  }
  if (toolchains.jinja2) {
    const html = JSON.parse(run(process.env["PYTHON"] ?? "python3", ["parity.py"], join(GEN, "jinja2"), JSON.stringify(cases.map((c) => {
      const [b, p] = brickOf(c.part);
      return { template: jinjaTemplateOf(b, p), p: c.props, children: kidsOf(c) };
    })))) as string[];
    html.forEach((s, i) => (out[i]!.jinja2 = s));
  }
  return out;
}
