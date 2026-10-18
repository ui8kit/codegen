// The `shadows` group of `xgen check`: flat surfaces have no shadow, only their border edge; a floating layer has exactly one,
// shadow-md (menu, popover, tooltip) or shadow-lg (dialog, sheet, floating toast), and only where SHADOW_ALLOW names the file.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import type { Plan } from "@ui8kit/xgen-generator";
import { CORNER_DIRS, SHADOW_ALLOW, shadowClasses } from "./audit-rules";
export { shadowClasses };
import { styleProblems } from "./style-zones";
import { result, type CheckResult } from "./result";

const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)])) : []);


/** the problems of one spec file against the allowlist */
export function shadowProblems(key: string, text: string): string[] {
  const found = shadowClasses(text);
  const allow = SHADOW_ALLOW[key];
  const problems = found.filter((c) => c !== allow?.shadow).map((c) => `xgen/${key}: ${c}; a flat surface has no shadow (only a floating layer in SHADOW_ALLOW has shadow-md or shadow-lg)`);
  const n = found.filter((c) => c === allow?.shadow).length;
  if (allow && n > allow.n) problems.push(`xgen/${key}: ${n} ${allow.shadow}, ${allow.n} allowed; a floating layer has one shadow`);
  if (allow && n < allow.n) problems.push(`xgen/check/src/audit-rules.ts: ${key} now holds ${n} ${allow.shadow}; lower its allowance from ${allow.n} to ${n}`);
  return problems;
}

/** a box-shadow value of kit.css that draws a shadow (not a ring: a ring has no offset and no blur) */
const isDrop = (part: string): boolean => !/^(inset\s+)?0 0 0 /.test(part.trim()) && !/^var\(--tw-[\w-]+(, ?0 0 #0000)?\)$/.test(part.trim()) && part.trim() !== "none";

export function checkShadows(plan: Plan): CheckResult {
  const root = plan.xgenRoot;
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const dir of CORNER_DIRS) {
    const base = xgenPaths(root).specs(dir);
    for (const f of walk(base).filter((x) => x.endsWith(".json")).sort()) {
      const key = `specs/${dir}/${f.slice(base.length + 1)}`;
      seen.add(key);
      problems.push(...shadowProblems(key, readFileSync(f, "utf8")));
    }
  }
  for (const key of Object.keys(SHADOW_ALLOW)) if (!seen.has(key)) problems.push(`xgen/check/src/audit-rules.ts: SHADOW_ALLOW names ${key}, which does not exist`);
  const kit = join(root, "runtimes", "core", "assets", "styles", "kit.css");
  readFileSync(kit, "utf8").split("\n").forEach((l, i) => {
    for (const m of l.matchAll(/box-shadow:\s*([^;}]+)/g)) {
      const v = m[1]!.trim();
      // split on the commas between shadows, not inside var(...) or rgb(...)
      const parts: string[] = []; let depth = 0, cur = "";
      for (const ch of v) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch; }
      parts.push(cur);
      if (parts.some(isDrop)) problems.push(`xgen/runtimes/core/assets/styles/kit.css:${i + 1}: box-shadow ${v}; kit.css draws rings (0 0 0 ...), never a drop shadow`);
    }
  });
  problems.push(...styleProblems(plan.workspace, "shadows"));
  return result("shadows", "flat surfaces have no shadow; a floating layer has one (shadow-md or shadow-lg), only in the allowlist, each with its reason", problems);
}
