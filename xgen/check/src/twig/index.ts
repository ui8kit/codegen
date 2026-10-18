// The Twig gate: composer install of the generated package, then every brick case and every block case rendered with
// real Twig (PHP + twig/twig) through bin/parity.php, DOM parity with the React package (the reference of the
// TypeScript runtimes) and html-validate of every block case. Skips when PHP or composer is missing, like templ without Go.
import { validateStates, type HtmlStates } from "../e2e/html";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import type { Inputs } from "@ui8kit/xgen-screens";
import { organismTemplate, partTemplate, twig, type Dialect } from "@ui8kit/xgen-runtime-twig";
import { blockCases } from "../templ/blocks";
import { brickCases, reactProps } from "../templ/bricks";
import { normalizeHtml } from "../templ/normalize";
import { firstDiff } from "../templ";

export const TWIG_DIR = "packages/twig/ui";

export interface TwigResult { ok: boolean; problems: string[]; cases: number; blocks: number; organisms: number; skipped?: string; php?: string; documents?: number }

export function run(cmd: string, args: string[], cwd: string, input?: string): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { cwd, input, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? "", err: (r.stderr ?? "") + (r.error ? String(r.error) : "") };
}

function quiet<T>(f: () => T): T {
  const err = console.error;
  console.error = () => {};
  try { return f(); } finally { console.error = err; }
}

const differs = (label: string, a: string, b: string, rt: string): string => `${label}: DOM differs\n${firstDiff(a, b).replace("    templ:", `    ${rt}: `)}`;

export async function twigCheck(workspace: string, bricks: LoadedBrick[], inputs: Inputs): Promise<TwigResult> {
  return phpTemplateCheck(workspace, TWIG_DIR, bricks, inputs, twig);
}

/** a PHP template package (Twig, Latte): composer install, php -l of its helpers, then parity through its bin/parity.php */
export async function phpTemplateCheck(workspace: string, pkgDir: string, bricks: LoadedBrick[], inputs: Inputs, d: Dialect): Promise<TwigResult> {
  const dir = join(workspace, pkgDir);
  const none = { cases: 0, blocks: 0, organisms: 0 };
  const php = run("php", ["-r", "echo PHP_VERSION;"], ".");
  if (!php.ok) return { ok: true, problems: [], ...none, skipped: "no PHP" };
  const composer = run("composer", ["--version"], ".");
  if (!composer.ok && !existsSync(join(dir, "vendor", "autoload.php"))) return { ok: true, problems: [], ...none, skipped: "no composer" };
  if (composer.ok) {
    const r = run("composer", ["install", "--no-interaction", "--quiet", "--no-progress"], dir);
    if (!r.ok) return { ok: false, problems: [`composer install: ${r.err.trim().split("\n").slice(-12).join("\n")}`], ...none };
  }
  const lint = readdirSync(join(dir, "php")).filter((f) => f.endsWith(".php")).map((f) => run("php", ["-l", join("php", f)], dir)).filter((r) => !r.ok);
  if (lint.length) return { ok: false, problems: lint.map((r) => `php -l: ${r.out.trim()}`), ...none };
  const render = (reqs: Array<{ template: string; vars: Record<string, unknown> }>): string[] | string => {
    const r = run("php", ["bin/parity.php"], dir, JSON.stringify(reqs));
    if (!r.ok) return `php bin/parity.php: ${r.err.trim().split("\n").slice(-12).join("\n")}`;
    return JSON.parse(r.out) as string[];
  };
  return { ...(await templateParity(workspace, dir, bricks, inputs, d, render)), php: php.out.trim() };
}

/** every brick and block case rendered by a template runtime (render: requests -> HTML, or an error text), DOM parity with React, html-validate of the block cases */
export async function templateParity(workspace: string, dir: string, bricks: LoadedBrick[], inputs: Inputs, d: Dialect, render: (reqs: Array<{ template: string; vars: Record<string, unknown> }>) => string[] | string): Promise<TwigResult> {
  const none = { cases: 0, blocks: 0, organisms: 0 };
  const rt = d.name;
  const problems: string[] = [];
  const ui = (await import(join(workspace, "packages/react/ui/src/index.ts"))) as Record<string, ComponentType<Record<string, unknown>>>;
  const parts = new Map(bricks.flatMap((b) => b.brick.parts.map((p) => [p.name, { brick: b.brick, part: p }] as const)));
  // the bricks: every part with its defaults, each enum value and each boolean prop
  const cases = brickCases(bricks);
  const got = render(cases.map((c) => ({ template: partTemplate(parts.get(c.part)!.brick, parts.get(c.part)!.part, d), vars: { p: c.props, children: c.children } })));
  if (typeof got === "string") return { ok: false, problems: [got], ...none, cases: cases.length };
  cases.forEach((c, i) => {
    const Comp = ui[c.part];
    if (!Comp) { problems.push(`${c.label}: no React component ${c.part}`); return; }
    if (got[i]!.startsWith("ERROR: ")) { problems.push(`${c.label}: ${got[i]!.slice(0, 400)}`); return; }
    let want: string;
    try { want = quiet(() => renderToStaticMarkup(createElement(Comp, reactProps(parts.get(c.part)!.part, c.props), c.children || undefined))); }
    catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); return; }
    const a = normalizeHtml(want), b = normalizeHtml(got[i]!);
    if (a !== b) problems.push(differs(c.label, a, b, rt));
  });
  // the organisms: every variant of every gallery block
  const files = new Set(readdirSync(join(dir, "blocks")).map((f) => `blocks/${f}`));
  const names = new Set(inputs.organisms.map((o) => o.value.name).filter((n) => files.has(organismTemplate(n, d))));
  const { cases: orgCases } = blockCases(inputs, names);
  const gotB = render(orgCases.map((c) => ({ template: organismTemplate(c.organism, d), vars: { p: c.props } })));
  if (typeof gotB === "string") return { ok: false, problems: [...problems, gotB], cases: cases.length, blocks: orgCases.length, organisms: names.size };
  orgCases.forEach((c, i) => {
    const Comp = ui[c.organism];
    if (!Comp) { problems.push(`${c.label}: no React component`); return; }
    if (gotB[i]!.startsWith("ERROR: ")) { problems.push(`${c.label}: ${gotB[i]!.slice(0, 400)}`); return; }
    let want: string;
    try { want = quiet(() => renderToStaticMarkup(createElement(Comp, c.props))); }
    catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); return; }
    const a = normalizeHtml(want), b = normalizeHtml(gotB[i]!);
    if (a !== b) problems.push(differs(c.label, a, b, rt));
  });
  // html-validate over the template output of every block case, each in a document of its own (identical documents once)
  const states: HtmlStates = new Map();
  orgCases.forEach((c, i) => {
    const body = gotB[i] ?? "";
    const main = /<main[\s>]/.test(body) ? body : /^\s*<(header|footer|nav)[\s>]/.test(body) ? body : `<main>${body}</main>`;
    const doc = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${c.label}</title></head><body>${main}</body></html>`;
    states.set(doc, [...(states.get(doc) ?? []), `${rt} ${c.label}`]);
  });
  const html = await validateStates(workspace, states);
  problems.push(...html.problems.map((p) => `html: ${p}`));
  return { ok: problems.length === 0, problems, cases: cases.length, blocks: orgCases.length, organisms: names.size, documents: html.documents };
}
