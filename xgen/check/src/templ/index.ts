// The templ gate: templ generate, go vet and go build of the generated Go package, then DOM parity of every brick case
// with the React package (the reference of the TypeScript runtimes, which the e2e pair test already holds equal).
import { validateStates, type HtmlStates } from "../e2e/html";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import type { Inputs } from "@ui8kit/xgen-screens";
import { blockCases } from "./blocks";
import { TEMPL_VERSION } from "@ui8kit/xgen-runtime-templ";
import { brickCases, reactProps, type ParityCase } from "./bricks";
import { normalizeHtml } from "./normalize";

export const TEMPL_DIR = "packages/templ/ui";

export interface TemplResult { ok: boolean; problems: string[]; cases: number; blocks: number; organisms: number; skipped?: string; notCovered?: string[]; documents?: number }

function run(cmd: string, args: string[], cwd: string, input?: string): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { cwd, input, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? "", err: (r.stderr ?? "") + (r.error ? String(r.error) : "") };
}

/** the templ CLI: on the PATH, in ~/go/bin, or through go run at the pinned version */
function templCmd(): [string, string[]] {
  if (run("templ", ["version"], ".").ok) return ["templ", []];
  const local = join(homedir(), "go", "bin", "templ");
  if (existsSync(local)) return [local, []];
  return ["go", ["run", `github.com/a-h/templ/cmd/templ@${TEMPL_VERSION}`]];
}

export async function templCheck(workspace: string, bricks: LoadedBrick[], inputs: Inputs): Promise<TemplResult> {
  const dir = join(workspace, TEMPL_DIR);
  if (!run("go", ["version"], ".").ok) return { ok: true, problems: [], cases: 0, blocks: 0, organisms: 0, skipped: "no Go toolchain" };
  const problems: string[] = [];
  const [cmd, pre] = templCmd();
  const steps: Array<[string, string, string[]]> = [["templ generate", cmd, [...pre, "generate"]], ["go mod tidy", "go", ["mod", "tidy"]], ["go vet", "go", ["vet", "./..."]], ["go build", "go", ["build", "./..."]]];
  for (const [what, c, args] of steps) {
    const r = run(c, args, dir);
    if (!r.ok) return { ok: false, problems: [`${what}: ${r.err.trim().split("\n").slice(-12).join("\n")}`], cases: 0, blocks: 0, organisms: 0 };
  }
  const cases: ParityCase[] = brickCases(bricks);
  const go = run("go", ["run", "./cmd/parity"], dir, JSON.stringify(cases.map((c) => ({ name: c.name, props: c.props, children: c.children }))));
  if (!go.ok) return { ok: false, problems: [`go run ./cmd/parity: ${go.err.trim().split("\n").slice(-12).join("\n")}`], cases: cases.length, blocks: 0, organisms: 0 };
  const got = JSON.parse(go.out) as string[];
  const ui = (await import(join(workspace, "packages/react/ui/src/index.ts"))) as Record<string, ComponentType<Record<string, unknown>>>;
  const parts = new Map(bricks.flatMap((b) => b.brick.parts.map((p) => [p.name, p] as const)));
  cases.forEach((c, i) => {
    const Comp = ui[c.part];
    if (!Comp) { problems.push(`${c.label}: no React component ${c.part}`); return; }
    const props = reactProps(parts.get(c.part)!, c.props);
    let want: string;
    try { want = quiet(() => renderToStaticMarkup(createElement(Comp, props, c.children || undefined))); }
    catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); return; }
    const a = normalizeHtml(want), b = normalizeHtml(got[i] ?? "");
    if (a !== b) problems.push(`${c.label}: DOM differs\n    react: ${a.slice(0, 600)}\n    templ: ${b.slice(0, 600)}`);
  });
  // the organisms: every variant of every gallery block
  const emitted = new Set(readdirSync(join(dir, "blocks")).filter((f) => f.endsWith(".templ")).map((f) => /templ (\w+)\(p \w+Props\)/.exec(readFileSync(join(dir, "blocks", f), "utf8"))?.[1]).filter((x): x is string => !!x));
  const { cases: orgCases, skipped } = blockCases(inputs, emitted);
  const gob = run("go", ["run", "./cmd/parity-blocks"], dir, JSON.stringify(orgCases.map((c) => ({ name: c.organism, props: c.props }))));
  if (!gob.ok) return { ok: false, problems: [...problems, `go run ./cmd/parity-blocks: ${gob.err.trim().split("\n").slice(-12).join("\n")}`], cases: cases.length, blocks: 0, organisms: emitted.size };
  const gotB = JSON.parse(gob.out) as string[];
  orgCases.forEach((c, i) => {
    const Comp = ui[c.organism];
    if (!Comp) { problems.push(`${c.label}: no React component`); return; }
    let want: string;
    try { want = quiet(() => renderToStaticMarkup(createElement(Comp, c.props))); }
    catch (e) { problems.push(`${c.label}: React render failed: ${(e as Error).message}`); return; }
    const a = normalizeHtml(want), b = normalizeHtml(gotB[i] ?? "");
    if (a !== b) problems.push(`${c.label}: DOM differs\n${firstDiff(a, b)}`);
  });
  // html-validate over the templ output of every block case, each in a document of its own (identical documents once)
  const states: HtmlStates = new Map();
  orgCases.forEach((c, i) => {
    const body = gotB[i] ?? "";
    const main = /<main[\s>]/.test(body) ? body : /^\s*<(header|footer|nav)[\s>]/.test(body) ? body : `<main>${body}</main>`;
    const doc = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>${c.label}</title></head><body>${main}</body></html>`;
    states.set(doc, [...(states.get(doc) ?? []), `templ ${c.label}`]);
  });
  const html = await validateStates(workspace, states);
  problems.push(...html.problems.map((p) => `html: ${p}`));
  return { ok: problems.length === 0, problems, cases: cases.length, blocks: orgCases.length, organisms: emitted.size, notCovered: skipped, documents: html.documents };
}

/** React's development warnings (a controlled field without onChange) are not findings here */
function quiet<T>(f: () => T): T {
  const err = console.error;
  console.error = () => {};
  try { return f(); } finally { console.error = err; }
}

/** the two texts around their first difference */
export function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 160);
  return `    react: ...${a.slice(from, i + 240)}\n    templ: ...${b.slice(from, i + 240)}`;
}
