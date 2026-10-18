// `xgen check`, group `rules`: rules 01, 02, 03 and 06 (.cursor/rules) on the composition zone of every package that declares zones.
// Zones come from the "ui8kit" field of each package.json (zones.ts); the kit zone is never scanned. An adapter per runtime turns a file
// into the common tree (ir.ts) and the shared detectors (detectors.ts) report on it. Existing violations are counted per file in
// rules/baselines/<package>.json: more fails, fewer asks for `bun run rules:baseline`. rules/fixtures/<runtime> proves every detector.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { result, type CheckResult } from "../result";
import { detect, DETECTORS, rootOf, type Detector, type Finding } from "./detectors";
import type { IrFile, Runtime } from "./ir";
import { reactToIr } from "./react";
import { svelteToIr } from "./svelte";
import { vueToIr } from "./vue";
import { templToIr } from "./templ";
import { solidToIr } from "./solid";
import { jinjaToIr, twigToIr } from "./twig";
import { latteToIr } from "./latte";
import { inBlockRoot, inKit, readZones, ZONES_FILE, zonesText, type Zone } from "./zones";

export { DETECTORS } from "./detectors";
export const EXT: Record<Runtime, string> = { svelte: ".svelte", react: ".tsx", vue: ".vue", templ: ".templ", solid: ".tsx", twig: ".html.twig", jinja2: ".html.j2", latte: ".latte" };
const ADAPTER: Record<Runtime, (src: string, file?: string) => IrFile> = { svelte: svelteToIr, react: reactToIr, vue: vueToIr, templ: templToIr, solid: solidToIr, twig: twigToIr, jinja2: jinjaToIr, latte: latteToIr };
export const toIr = (runtime: Runtime, src: string, file = ""): IrFile => ADAPTER[runtime](src, file);
const pascal = (file: string): string => basename(file).replace(/\.html\.(twig|j2)$/, "").replace(/\.[^.]*$/, "").split(/[-_.]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

type Counts = Record<string, Record<string, number>>;
export interface PackageReport { zone: Zone; files: number; findings: Map<string, Finding[]>; errors: string[] }

function filesUnder(abs: string, ext: string): string[] {
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return abs.endsWith(ext) ? [abs] : [];
  return readdirSync(abs).sort().flatMap((n) => (n === "node_modules" ? [] : filesUnder(join(abs, n), ext)));
}

/** resolves a component name used by a file to the file that defines it, and tells whether that file opens on Block */
function makeResolver(repo: string, zones: Zone[]) {
  const ir = new Map<string, IrFile>();
  const irOf = (abs: string, rt: Runtime): IrFile => { let x = ir.get(abs); if (!x) { x = toIr(rt, readFileSync(abs, "utf8"), abs); ir.set(abs, x); } return x; };
  const composite = new Set<string>();
  const byName = new Map<string, string>(); // `${runtime}:${Name}` -> file of a composite of a ui package
  for (const z of zones) for (const c of z.composition) for (const f of filesUnder(join(repo, z.dir, c), EXT[z.runtime])) {
    composite.add(f);
    if (!z.generated || !z.dir.startsWith("packages/")) continue;
    const names = z.runtime === "react" || z.runtime === "solid" ? [...readFileSync(f, "utf8").matchAll(/export function ([A-Z]\w*)/g)].map((m) => m[1]!) : z.runtime === "templ" ? [...readFileSync(f, "utf8").matchAll(/^templ ([A-Z]\w*)\(/gm)].map((m) => m[1]!) : [pascal(f)];
    for (const n of names) byName.set(`${z.runtime}:${n}`, f);
  }
  const memo = new Map<string, boolean>();
  const opensOnBlock = (abs: string, rt: Runtime, stack: Set<string>): boolean => {
    if (memo.has(abs)) return memo.get(abs)!;
    if (stack.has(abs) || !composite.has(abs)) return false;
    stack.add(abs);
    const file = irOf(abs, rt);
    const root = rootOfFile(file);
    const ok = !!root && root.kind === "component" && (root.name === "Block" || resolveIn(abs, rt, file, root.name, stack) === true);
    memo.set(abs, ok);
    return ok;
  };
  const resolveIn = (from: string, rt: Runtime, file: IrFile, name: string, stack: Set<string>): boolean | undefined => {
    const spec = file.imports.get(name);
    let target: string | undefined;
    if (spec?.startsWith(".")) {
      const base = resolve(dirname(from), spec);
      target = [base, base + EXT[rt]].find((p) => existsSync(p) && statSync(p).isFile());
    } else if (spec) target = byName.get(`${rt}:${name}`);
    else if (rt === "react" || rt === "solid" || rt === "templ") target = byName.get(`${rt}:${name}`);
    return target ? opensOnBlock(target, rt, stack) : undefined;
  };
  return { irOf, rootsOnBlock: (from: string, rt: Runtime, file: IrFile) => (name: string) => resolveIn(from, rt, file, name, new Set([from])) };
}

const rootOfFile = (f: IrFile) => rootOf(f.nodes);

export function scanRepo(repo: string): PackageReport[] {
  const zones = readZones(repo).packages;
  const r = makeResolver(repo, zones);
  return zones.map((zone) => {
    const findings = new Map<string, Finding[]>();
    const errors: string[] = [];
    let files = 0;
    for (const c of zone.composition) {
      if (!existsSync(join(repo, zone.dir, c))) { errors.push(`${zone.dir}: composition path ${c} does not exist`); continue; }
      for (const abs of filesUnder(join(repo, zone.dir, c), EXT[zone.runtime])) {
        const rel = relative(join(repo, zone.dir), abs);
        if (inKit(zone, rel)) continue;
        files++;
        const ir = r.irOf(abs, zone.runtime);
        if (ir.error) errors.push(`${zone.dir}/${rel}: parse error ${ir.error}`);
        const f = detect(ir, { blockRoot: inBlockRoot(zone, rel), rootsOnBlock: r.rootsOnBlock(abs, zone.runtime, ir) });
        if (f.length) findings.set(rel, f);
      }
    }
    return { zone, files, findings, errors };
  });
}

export const baselineFile = (zone: Zone): string => `rules/baselines/${zone.name.replace(/^@[^/]+\//, "")}.json`;
export function countsOf(rep: PackageReport): Counts {
  const c: Counts = Object.fromEntries(DETECTORS.map((d) => [d, {}]));
  for (const [file, list] of [...rep.findings].sort(([a], [b]) => a.localeCompare(b))) for (const f of list) c[f.detector]![file] = (c[f.detector]![file] ?? 0) + 1;
  return c;
}
const total = (c: Record<string, number>): number => Object.values(c).reduce((a, b) => a + b, 0);

export function writeBaselines(repo: string): string[] {
  mkdirSync(join(repo, "rules", "baselines"), { recursive: true });
  writeFileSync(join(repo, ZONES_FILE), zonesText(repo));
  return scanRepo(repo).map((rep) => {
    const counts = countsOf(rep);
    const doc = { $comment: "Recorded violations of the rules group (xgen check) in the composition zone, per detector and file. New ones fail; regenerate with: bun run rules:baseline", package: rep.zone.dir, totals: Object.fromEntries(DETECTORS.map((d) => [d, total(counts[d]!)])), counts };
    writeFileSync(join(repo, baselineFile(rep.zone)), JSON.stringify(doc, null, 2) + "\n");
    return `${baselineFile(rep.zone)}: ${DETECTORS.map((d) => `${d} ${doc.totals[d]}`).join(", ")}`;
  });
}

/** named cases of a detector: rules/fixtures/<runtime>/<detector>.<case>.<ok|bad>.<ext>; a violating case must report this message, and only it */
export const FIXTURE_CASES: Partial<Record<Detector, Record<string, string>>> = {
  "block-root": { branches: "", siblings: "Block in one render path", nested: "Block nested inside Block", loop: "Block inside a loop" },
};

/** every detector on one violating and one clean fixture per runtime, plus the named cases of FIXTURE_CASES */
export function selfTest(repo: string): string[] {
  const problems: string[] = [];
  for (const rt of ["svelte", "react", "vue", "templ", "solid", "twig", "jinja2", "latte"] as Runtime[]) for (const d of DETECTORS) {
    const named = Object.entries(FIXTURE_CASES[d] ?? {});
    const files: [string, "ok" | "bad", string | undefined][] = [[`${d}.bad`, "bad", undefined], [`${d}.ok`, "ok", undefined], ...named.map(([c, msg]): [string, "ok" | "bad", string] => [`${d}.${c}.${msg ? "bad" : "ok"}`, msg ? "bad" : "ok", msg])];
    for (const [name, kind, msg] of files) {
      const rel = `rules/fixtures/${rt}/${name}${EXT[rt]}`;
      const abs = join(repo, rel);
      if (!existsSync(abs)) { problems.push(`${rel}: missing self-test fixture`); continue; }
      const ir = toIr(rt, readFileSync(abs, "utf8"), abs);
      if (ir.error) { problems.push(`${rel}: parse error ${ir.error}`); continue; }
      const found = detect(ir, { blockRoot: true, rootsOnBlock: () => undefined }).filter((f) => f.detector === d);
      if (kind === "bad" && found.length === 0) problems.push(`${rel}: detector ${d} found nothing in its violating fixture`);
      if (kind === "bad" && msg && !found.every((f) => f.message.includes(msg))) problems.push(`${rel}: expected only "${msg}", got ${found.map((f) => JSON.stringify(f.message)).join(", ")}`);
      if (kind === "ok" && found.length > 0) problems.push(`${rel}: detector ${d} reports ${found.length} in its clean fixture: ${found.map((f) => f.message).join("; ")}`);
    }
  }
  return problems;
}

/** new findings and stale baseline entries of the scanned packages (all of them, or the one whose dir is `only`) */
export function gate(repo: string, only?: string): { problems: string[]; files: number; recorded: number } {
  const problems: string[] = [];
  let files = 0, recorded = 0;
  for (const rep of scanRepo(repo)) {
    if (only && rep.zone.dir !== only) continue;
    files += rep.files;
    problems.push(...rep.errors);
    const path = join(repo, baselineFile(rep.zone));
    const base: Counts = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { counts: Counts }).counts : {};
    const now = countsOf(rep);
    for (const d of DETECTORS as readonly Detector[]) {
      const b = base[d] ?? {}, c = now[d]!;
      recorded += total(b);
      for (const file of new Set([...Object.keys(b), ...Object.keys(c)])) {
        const have = c[file] ?? 0, allowed = b[file] ?? 0;
        if (have > allowed) for (const f of rep.findings.get(file)!.filter((x) => x.detector === d)) problems.push(`${rep.zone.dir}/${file}:${f.line}  ${d}  ${f.message}${allowed ? ` (${have} found, ${allowed} recorded)` : ""}`);
        if (have < allowed) problems.push(`${baselineFile(rep.zone)}: ${d} in ${file} went down from ${allowed} to ${have}; record it: bun run rules:baseline`);
      }
    }
  }
  return { problems, files, recorded };
}

export function checkRules(repo: string): CheckResult {
  const problems: string[] = [];
  const zonesPath = join(repo, ZONES_FILE);
  if (!existsSync(zonesPath) || readFileSync(zonesPath, "utf8") !== zonesText(repo)) problems.push(`${ZONES_FILE}: differs from the "ui8kit" fields of the package.json files; run: bun run rules:baseline`);
  problems.push(...selfTest(repo));
  const g = gate(repo);
  problems.push(...g.problems);
  return result("rules", `rules 01/02/03/06 on the composition zone (${g.files} files, kit never scanned): block-root, raw-html, dynamic-tag, raw-native-tag, reactive-aria, literal-text; ${g.recorded} recorded in rules/baselines, none new; self-test fixtures for svelte, react, vue, templ, solid, twig, jinja2, latte`, problems);
}
