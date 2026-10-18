// The `corners` group of `xgen check`: one corner token. Plain `rounded` reads --radius (theme.css), so a theme changes every corner at once.
// No other rounded-* class is allowed in the specs; `rounded-full` and `rounded-none` only where CORNER_ALLOW names the file, the count and why.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import type { Plan } from "@ui8kit/xgen-generator";
import { CORNER_ALLOW, CORNER_DIRS, KIT_RADIUS_ALLOW, cornerClasses } from "./audit-rules";
export { cornerClasses };
import { styleProblems } from "./style-zones";
import { result, type CheckResult } from "./result";

const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)])) : []);


/** the problems of one file: a class other than rounded, rounded-full and rounded-none, or a full/none count that is not the allowed one */
export function cornerProblems(key: string, text: string): string[] {
  const problems: string[] = [];
  const found = cornerClasses(text);
  for (const c of found) if (c !== "rounded-full" && c !== "rounded-none") problems.push(`xgen/${key}: ${c}; use plain \`rounded\` (the theme radius)`);
  const allow = CORNER_ALLOW[key];
  for (const kind of ["full", "none"] as const) {
    const n = found.filter((c) => c === `rounded-${kind}`).length;
    const allowed = allow?.[kind] ?? 0;
    if (n > allowed) problems.push(`xgen/${key}: ${n} rounded-${kind}, ${allowed} allowed; corners are plain \`rounded\` (exceptions: radio, avatar, switch, timeline dots, badges, functional resets)`);
    else if (n < allowed) problems.push(`xgen/check/src/audit-rules.ts: ${key} now holds ${n} rounded-${kind}; lower its allowance from ${allowed} to ${n}`);
  }
  return problems;
}

export function checkCorners(plan: Plan): CheckResult {
  const root = plan.xgenRoot;
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const dir of CORNER_DIRS) {
    for (const f of walk(xgenPaths(root).specs(dir)).filter((x) => x.endsWith(".json")).sort()) {
      const key = `specs/${dir}/${f.slice(xgenPaths(root).specs(dir).length + 1)}`;
      seen.add(key);
      problems.push(...cornerProblems(key, readFileSync(f, "utf8")));
    }
  }
  for (const key of Object.keys(CORNER_ALLOW)) if (!seen.has(key)) problems.push(`xgen/check/src/audit-rules.ts: CORNER_ALLOW names ${key}, which does not exist`);
  // kit.css: a border-radius is the token (var(--radius), scaled or not), a per-element token that falls back to it (var(--radius-card, var(--radius))) or an allowed exception
  const kit = join(root, "runtimes", "core", "assets", "styles", "kit.css");
  let utility = "";
  readFileSync(kit, "utf8").split("\n").forEach((l, i) => {
    utility = /@utility\s+([\w-]+)/.exec(l)?.[1] ?? (l.startsWith("}") ? "" : utility);
    for (const m of l.matchAll(/border-radius:\s*([^;}]+)/g)) {
      const v = m[1]!.trim();
      if (v.includes("var(--radius)") || /^var\(--radius-(badge|button|card|alert|media),/.test(v) || v === "inherit" || KIT_RADIUS_ALLOW[utility] === v) continue;
      problems.push(`xgen/runtimes/core/assets/styles/kit.css:${i + 1}: border-radius ${v}; derive it from var(--radius)`);
    }
  });
  problems.push(...styleProblems(plan.workspace, "corners"));
  return result("corners", "one corner token: plain `rounded` (var(--radius)) everywhere; rounded-full and rounded-none only in the allowlist, each with its reason", problems);
}
