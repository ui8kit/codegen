// The Solid gate: DOM parity of every brick case and every gallery block case with the React package (the reference of the
// TypeScript runtimes), rendered on the server (babel-preset-solid, generate: "ssr", then solid-js/web renderToString), and
// html-validate over the Solid output of every block case. The package itself is typechecked by `bun run typecheck`.
import { transformAsync } from "@babel/core";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import { reactPropName, htmlPropName } from "@ui8kit/xgen-spec";
import type { Inputs } from "@ui8kit/xgen-screens";
import { validateStates, type HtmlStates } from "../e2e/html";
import { blockCases } from "../templ/blocks";
import { brickCases, reactProps } from "../templ/bricks";
import { normalizeHtml } from "../templ/normalize";

export const SOLID_DIR = "packages/solid/ui";

export interface SolidResult { ok: boolean; problems: string[]; cases: number; blocks: number; organisms: number; documents?: number }

const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));

/** the package compiled for the server into node_modules/.cache (so it resolves the workspace dependencies), JSX files through babel-preset-solid */
async function compileForServer(workspace: string): Promise<string> {
  const src = join(workspace, SOLID_DIR, "src");
  const out = join(workspace, "node_modules", ".cache", "xgen-solid-ssr", String(process.pid));
  rmSync(out, { recursive: true, force: true });
  for (const f of files(src)) {
    const to = join(out, relative(src, f));
    mkdirSync(dirname(to), { recursive: true });
    const text = readFileSync(f, "utf8");
    if (!f.endsWith(".tsx")) { writeFileSync(to, text); continue; }
    const r = await transformAsync(text, {
      filename: f, babelrc: false, configFile: false,
      presets: [[require.resolve("babel-preset-solid"), { generate: "ssr", hydratable: false }], [require.resolve("@babel/preset-typescript"), { isTSX: true, allExtensions: true, onlyRemoveTypeImports: true }]],
    });
    writeFileSync(to, r!.code!);
  }
  return out;
}

/** canonical props -> the props of the Solid component (React names; `class`; passthrough attributes by their HTML name) */
function solidProps(part: Parameters<typeof reactProps>[0], props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    const d = part.props.find((p) => p.name === k);
    if (d) out[k === "Class" ? "class" : d.passthrough ? htmlPropName(d) : reactPropName(d)] = v;
  }
  return out;
}

export async function solidCheck(workspace: string, bricks: LoadedBrick[], inputs: Inputs): Promise<SolidResult> {
  const problems: string[] = [];
  const out = await compileForServer(workspace);
  try {
    const web = (await import(join(workspace, "node_modules", "solid-js", "web", "dist", "server.js"))) as { renderToString: (f: () => unknown) => string; createComponent: (c: unknown, p: unknown) => unknown };
    const solid = (await import(join(out, "index.ts"))) as Record<string, unknown>;
    const react = (await import(join(workspace, "packages/react/ui/src/index.ts"))) as Record<string, ComponentType<Record<string, unknown>>>;
    // `Dynamic` writes hydration keys (data-hk) even without hydration: SSR bookkeeping, not markup
    const render = (name: string, props: Record<string, unknown>): string => web.renderToString(() => web.createComponent(solid[name], props)).replace(/ data-hk="[^"]*"/g, "");
    const parts = new Map(bricks.flatMap((b) => b.brick.parts.map((p) => [p.name, p] as const)));
    const cases = brickCases(bricks);
    for (const c of cases) {
      if (!solid[c.part]) { problems.push(`${c.label}: no Solid component ${c.part}`); continue; }
      const part = parts.get(c.part)!;
      let want: string, got: string;
      try { want = quiet(() => renderToStaticMarkup(createElement(react[c.part]!, reactProps(part, c.props), c.children || undefined))); }
      catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); continue; }
      try { got = render(c.part, { ...solidProps(part, c.props), ...(c.children ? { children: c.children } : {}) }); }
      catch (e) { problems.push(`${c.label}: Solid render failed: ${(e as Error).message}`); continue; }
      const a = normalizeHtml(want), b = normalizeHtml(got);
      if (a !== b) problems.push(`${c.label}: DOM differs\n${firstDiff(a, b)}`);
    }
    // the organisms: every variant of every gallery block
    const emitted = new Set(Object.keys(solid).filter((k) => typeof solid[k] === "function" && inputs.organisms.some((o) => o.value.name === k)));
    const { cases: orgCases } = blockCases(inputs, emitted);
    const states: HtmlStates = new Map();
    for (const c of orgCases) {
      let want: string, got: string;
      try { want = quiet(() => renderToStaticMarkup(createElement(react[c.organism]!, c.props))); }
      catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); continue; }
      const { className, ...rest } = c.props as { className?: string };
      try { got = render(c.organism, className === undefined ? rest : { ...rest, class: className }); }
      catch (e) { problems.push(`${c.label}: Solid render failed: ${(e as Error).message}`); continue; }
      const a = normalizeHtml(want), b = normalizeHtml(got);
      if (a !== b) problems.push(`${c.label}: DOM differs\n${firstDiff(a, b)}`);
      const main = /<main[\s>]/.test(got) ? got : /^\s*<(header|footer|nav)[\s>]/.test(got) ? got : `<main>${got}</main>`;
      const doc = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${c.label}</title></head><body>${main}</body></html>`;
      states.set(doc, [...(states.get(doc) ?? []), `solid ${c.label}`]);
    }
    const html = await validateStates(workspace, states);
    problems.push(...html.problems.map((p) => `html: ${p}`));
    return { ok: problems.length === 0, problems, cases: cases.length, blocks: orgCases.length, organisms: emitted.size, documents: html.documents };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function quiet<T>(f: () => T): T {
  const err = console.error;
  console.error = () => {};
  try { return f(); } finally { console.error = err; }
}

function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 160);
  return `    react: ...${a.slice(from, i + 240)}\n    solid: ...${b.slice(from, i + 240)}`;
}
