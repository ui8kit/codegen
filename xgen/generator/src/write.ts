// Writes a plan to disk with a manifest of hashes per target, and compares a plan with the disk (drift).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { BANNER } from "@ui8kit/xgen-runtime-core";
import { MANIFEST, sha, type Plan, type Target } from "./plan";

/** directories that belong to tools, not to the source of a target */
const IGNORED = new Set(["node_modules", "dist", "shots", ".svelte-kit", ".vite", ".turbo"]);

export function manifestOf(t: Target): string {
  const files = Object.fromEntries(t.files.map((f) => [f.path, sha(f.contents)]).sort(([a], [b]) => String(a).localeCompare(String(b))));
  return JSON.stringify({ "//": BANNER, target: t.dir, files }, null, 2) + "\n";
}

function walk(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (IGNORED.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p)];
  });
}

export function write(plan: Plan): { files: number; removed: number } {
  let files = 0, removed = 0;
  for (const t of plan.targets) {
    const dir = join(plan.workspace, t.dir);
    const keep = new Set([...t.files.map((f) => f.path), t.manifest, ...t.handwritten]);
    // everything a previous build wrote and this one does not: removed. Anything else in the dir is not ours to delete.
    const manifestPath = join(dir, t.manifest);
    if (existsSync(manifestPath)) {
      const prev = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: Record<string, string> };
      for (const f of Object.keys(prev.files)) if (!keep.has(f)) { rmSync(join(dir, f), { force: true }); removed++; }
    }
    for (const f of t.files) {
      const p = join(dir, f.path);
      mkdirSync(dirname(p), { recursive: true });
      if (!existsSync(p) || readFileSync(p, "utf8") !== f.contents) writeFileSync(p, f.contents);
      files++;
    }
    writeFileSync(manifestPath, manifestOf(t));
  }
  return { files, removed };
}

/** problems when the disk is not what the specs produce: a hand edit, a missing file, a stale file, a file nobody generated */
export function drift(plan: Plan): string[] {
  const out: string[] = [];
  for (const t of plan.targets) {
    const dir = join(plan.workspace, t.dir);
    const expected = new Map(t.files.map((f) => [f.path, f.contents]));
    for (const [path, contents] of expected) {
      const p = join(dir, path);
      if (!existsSync(p)) { out.push(`${t.dir}/${path}: missing (run: bun run build)`); continue; }
      if (readFileSync(p, "utf8") !== contents) out.push(`${t.dir}/${path}: differs from the generated file (hand edit or stale; run: bun run build)`);
      if (!contents.includes("DO NOT EDIT")) out.push(`${t.dir}/${path}: generated file without the DO NOT EDIT header`);
    }
    const mp = join(dir, t.manifest);
    if (!existsSync(mp)) out.push(`${t.dir}/${t.manifest}: missing`);
    else if (readFileSync(mp, "utf8") !== manifestOf(t)) out.push(`${t.dir}/${t.manifest}: differs from the plan`);
    const allowed = new Set([...expected.keys(), t.manifest, ...t.handwritten]);
    for (const f of walk(dir)) if (!allowed.has(f) && !t.ignore?.test(f)) out.push(`${t.dir}/${f}: not generated and not an input (hand-written file in a generated ${t.kind}; delete it or move the logic into a spec)`);
    for (const h of t.handwritten) if (!existsSync(join(dir, h))) out.push(`${t.dir}/${h}: missing input`);
  }
  return out;
}
