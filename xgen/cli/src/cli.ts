#!/usr/bin/env bun
// xgen: build | check | e2e | shot | visual | list
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import { planBuild, write } from "@ui8kit/xgen-generator";
import { runChecks, runE2e, runShot, runVisual, solidCheck, templCheck, twigCheck, jinja2Check, latteCheck } from "@ui8kit/xgen-check";
import { writeSpecs } from "@ui8kit/xgen-screens";

/** the workspace is the nearest parent that has an xgen/ folder with specs */
function findWorkspace(from: string): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(xgenPaths(join(dir, "xgen")).specs("ui"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("no xgen/specs/ui above " + from);
    dir = up;
  }
}

async function main(argv: string[]): Promise<number> {
  const [cmd = "help", ...rest] = argv;
  const wsFlag = rest.indexOf("--root");
  const workspace = wsFlag >= 0 ? resolve(rest[wsFlag + 1]!) : findWorkspace(process.cwd());
  if (cmd === "build") {
    const specs = writeSpecs(join(workspace, "xgen"));
    const plan = planBuild(workspace);
    if (plan.problems.length) { console.error(plan.problems.map((p) => `  ${p}`).join("\n")); console.error(`xgen build: ${plan.problems.length} problem(s) in the inputs, nothing written`); return 1; }
    const w = write(plan);
    console.log(`xgen build: ${specs.length} organism/screen specs, ${plan.targets.length} targets, ${w.files} files written, ${w.removed} stale removed`);
    for (const t of plan.targets) console.log(`  ${t.dir}  ${t.files.length} files`);
    return 0;
  }
  if (cmd === "check") {
    const { results, plan } = runChecks(workspace);
    // the Go runtime: templ generate, go vet, go build, DOM parity with React, html-validate of every block case
    const t = await templCheck(workspace, plan.bricks, plan.inputs);
    results.push({ name: "templ", what: t.skipped ? `skipped: ${t.skipped}` : `templ generate, go vet, go build; ${t.cases} brick cases and ${t.blocks} block cases (${t.organisms} organisms) render the same DOM as React; ${t.documents ?? 0} documents pass html-validate`, problems: t.problems });
    // the Solid runtime: server render of every brick and block case against React, html-validate of every block case
    const so = await solidCheck(workspace, plan.bricks, plan.inputs);
    results.push({ name: "solid", what: `${so.cases} brick cases and ${so.blocks} block cases (${so.organisms} organisms) render the same DOM as React on the server; ${so.documents ?? 0} documents pass html-validate`, problems: so.problems });
    // the Twig runtime: real Twig (PHP + twig/twig via composer) renders every brick and block case against React, html-validate of every block case
    const tw = await twigCheck(workspace, plan.bricks, plan.inputs);
    results.push({ name: "twig", what: tw.skipped ? `skipped: ${tw.skipped}` : `PHP ${tw.php} + twig/twig: ${tw.cases} brick cases and ${tw.blocks} block cases (${tw.organisms} organisms) render the same DOM as React; ${tw.documents ?? 0} documents pass html-validate`, problems: tw.problems });
    // the Jinja2 runtime: real Jinja2 (a Python venv) renders every brick and block case against React, html-validate of every block case
    const jj = await jinja2Check(workspace, plan.bricks, plan.inputs);
    results.push({ name: "jinja2", what: jj.skipped ? `skipped: ${jj.skipped}` : `Python ${jj.python} + Jinja2 ${jj.jinja2}: ${jj.cases} brick cases and ${jj.blocks} block cases (${jj.organisms} organisms) render the same DOM as React; ${jj.documents ?? 0} documents pass html-validate`, problems: jj.problems });
    // the Latte runtime: real Latte (PHP + latte/latte via composer), the same parity and html-validate gates as Twig
    const lt = await latteCheck(workspace, plan.bricks, plan.inputs);
    results.push({ name: "latte", what: lt.skipped ? `skipped: ${lt.skipped}` : `PHP ${lt.php} + latte/latte: ${lt.cases} brick cases and ${lt.blocks} block cases (${lt.organisms} organisms) render the same DOM as React; ${lt.documents ?? 0} documents pass html-validate`, problems: lt.problems });
    // CI sets UI8KIT_REQUIRE_ALL_RUNTIMES=1: a runtime group that skipped (no Go, PHP or Python there) is a failure, not a pass
    if (process.env.UI8KIT_REQUIRE_ALL_RUNTIMES === "1") {
      for (const r of results) if (r.what.startsWith("skipped:")) r.problems.push(`${r.name} skipped (${r.what.slice(9).trim()}) but UI8KIT_REQUIRE_ALL_RUNTIMES=1 requires it`);
    }
    let bad = 0;
    for (const r of results) {
      console.log(`${r.problems.length ? "FAIL" : "ok  "}  ${r.name.padEnd(12)} ${r.what}`);
      for (const p of r.problems.slice(0, 25)) console.log(`        ${p}`);
      if (r.problems.length > 25) console.log(`        ... and ${r.problems.length - 25} more`);
      bad += r.problems.length;
    }
    console.log(bad ? `xgen check: ${bad} problem(s)` : "xgen check: ok");
    return bad ? 1 : 0;
  }
  if (cmd === "list") {
    const plan = planBuild(workspace);
    const parts = plan.bricks.reduce((n, b) => n + b.brick.parts.length, 0);
    const portable = plan.bricks.filter((b) => b.spec.portable.svelte === true && b.spec.portable.react === true).length;
    console.log(`bricks ${plan.bricks.length}, parts ${parts}, portable to both runtimes ${portable}/${plan.bricks.length}`);
    console.log(`organisms ${plan.inputs.organisms.length}, screens ${plan.inputs.screens.length}, host apps ${plan.apps.length}`);
    for (const t of plan.targets) console.log(`  ${t.dir}  ${t.kind}  ${t.runtime}  ${t.files.length} generated files${t.handwritten.length ? `, by hand: ${t.handwritten.join(", ")}` : ", by hand: nothing"}`);
    return 0;
  }
  if (cmd === "shot") {
    const flag = (name: string, fallback: string): string => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1]! : fallback; };
    const screen = rest.find((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
    if (!screen) { console.error("usage: xgen shot <screen> [--runtime svelte|react|vue] [--width 1600] [--theme light|dark] [--route path] [--out file]"); return 2; }
    const r = await runShot(workspace, { screen, runtime: flag("runtime", "svelte") as "svelte" | "react" | "vue", width: Number(flag("width", "1600")), theme: flag("theme", "light") as "light" | "dark", route: flag("route", ""), out: rest.includes("--out") ? flag("out", "") : undefined });
    console.log(`shot ${r.file}`);
    for (const e of r.errors) console.log(`  browser console: ${e}`);
    return r.errors.length ? 1 : 0;
  }
  if (cmd === "visual") {
    const flag = (name: string): string | undefined => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
    const r = await runVisual(workspace, { out: flag("out") ?? "shots/visual", against: flag("against"), only: flag("only")?.split(",") });
    console.log(`xgen visual: ${r.states} states in ${r.dir}`);
    for (const e of r.errors) console.log(`  browser: ${e}`);
    for (const m of r.missing) console.log(`  missing ${m}`);
    for (const c of r.changed) console.log(`  CHANGED ${c}`);
    if (flag("against")) console.log(r.changed.length || r.missing.length ? `xgen visual: ${r.changed.length} changed, ${r.missing.length} missing` : "xgen visual: pixel-identical");
    return r.changed.length || r.missing.length || r.errors.length ? 1 : 0;
  }
  if (cmd === "e2e") {
    const report = await runE2e(workspace);
    let bad = 0;
    for (const r of report.results) {
      console.log(`${r.failures.length ? "FAIL" : "ok  "}  ${r.name.padEnd(12)} ${r.steps} steps`);
      for (const f of r.failures) console.log(`        ${f}`);
      bad += r.failures.length;
    }
    console.log(`${report.pair.differences.length ? "FAIL" : "ok  "}  pair         DOM of the svelte, react, vue and solid hosts compared in ${report.pair.states} states`);
    for (const d of report.pair.differences) console.log(`        ${d}`);
    bad += report.pair.differences.length;
    console.log(`${report.html.problems.length ? "FAIL" : "ok  "}  html         HTML5 validity (rules/html-validate.json) of ${report.html.states} states, ${report.html.documents} distinct documents`);
    for (const d of report.html.problems) console.log(`        ${d}`);
    for (const [rule, n] of Object.entries(report.html.warnings)) console.log(`  warn  html         ${rule}: ${n} (in states, rules/html-validate.json)`);
    bad += report.html.problems.length;
    for (const s of report.shots) console.log(`  shot ${s}`);
    console.log(bad ? `xgen e2e: ${bad} problem(s)` : "xgen e2e: ok");
    return bad ? 1 : 0;
  }
  console.log([
    "usage: xgen build | check | e2e | shot | list   [--root <workspace>]",
    "  build  regenerate the packages, the shared app package and the host apps from xgen/specs, fixtures and content",
    "  check  schema, props, variants, a11y, authored specs, coverage, portability, text, drift (fails on hand edits)",
    "  e2e    every screen in every host (/<screen>/): its scenario, screenshots, DOM compare of the hosts, HTML5 validity of every state",
    "  shot   one full-page screenshot of a screen: xgen shot site --runtime svelte --width 1600 --out shots/x.png",
    "  visual every route of every screen in both hosts, light 1600 (+390): xgen visual --out shots/visual-base, then --out shots/visual-now --against shots/visual-base",
    "  list   what there is",
  ].join("\n"));
  return cmd === "help" ? 0 : 2;
}

process.exit(await main(process.argv.slice(2)));
