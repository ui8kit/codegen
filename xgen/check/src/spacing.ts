// The `spacing` group of `xgen check`: a layout spacing option (an axis named gap, padding, margin, space or inset in a
// ui or recipe variant table) names its values by the Tailwind step they set (Gap "4" = gap-4), never by pixels (Gap "16").
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import type { Plan } from "@ui8kit/xgen-generator";
import { styleProblems } from "./style-zones";
import { result, type CheckResult } from "./result";

/** axes that hold spacing; their numeric keys must be the Tailwind step of the class */
export const SPACING_AXES = /^(gap|gap-x|gap-y|padding|pad|margin|space|spacing|inset)$/;
const STEP = /(?<![\w-])-?(?:gap(?:-[xy])?|p[xytrbl]?|m[xytrbl]?|space-[xy]|inset(?:-[xy])?)-(\d+(?:\.\d+)?)(?![\w.-])/g;

/** the problems of one variant table: a numeric key of a spacing axis whose classes set another step */
export function spacingKeyProblems(key: string, table: { byKey?: Record<string, Record<string, string>> }): string[] {
  const problems: string[] = [];
  for (const [axis, values] of Object.entries(table.byKey ?? {})) {
    if (!SPACING_AXES.test(axis)) continue;
    for (const [k, cls] of Object.entries(values)) {
      if (!/^\d+(\.\d+)?$/.test(k)) continue;
      const steps = [...cls.matchAll(STEP)].map((m) => m[1]!);
      if (steps.length === 0 || steps.some((s) => s !== k)) problems.push(`xgen/${key}: ${axis} "${k}" sets ${steps.length ? steps.map((s) => `step ${s}`).join(", ") : "no spacing step"}; name a spacing value by its Tailwind step, not by pixels`);
    }
  }
  return problems;
}

export function checkSpacing(plan: Plan): CheckResult {
  const problems: string[] = [];
  for (const dir of ["ui", "recipes"]) {
    const base = xgenPaths(plan.xgenRoot).specs(dir);
    if (!existsSync(base)) continue;
    for (const f of readdirSync(base).filter((n) => n.endsWith(".variants.json")).sort()) {
      problems.push(...spacingKeyProblems(`specs/${dir}/${f}`, JSON.parse(readFileSync(join(base, f), "utf8"))));
    }
  }
  problems.push(...styleProblems(plan.workspace, "spacing"));
  return result("spacing", "layout spacing options (gap, padding, margin, space, inset) are named by their Tailwind step, never by pixels", problems);
}
