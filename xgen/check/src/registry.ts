// The `registry` group of `xgen check`: the 92 layouts of the reference catalog are all mapped, every reference exists, the document is the one the registry writes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blockKey, CONTRACT_PATTERNS, coverageMarkdown, coverageProblems, themeApps, themeTexts } from "@ui8kit/xgen-screens";
import type { Plan } from "@ui8kit/xgen-generator";
import type { CheckResult } from "./result";

export const COVERAGE_DOC = "docs/vibeui-coverage.md";

export function checkRegistry(plan: Plan): CheckResult {
  const blocks = plan.inputs.blocks.map((b) => b.value);
  const patterns = new Set(plan.inputs.organisms.filter((o) => o.value.id.startsWith("pattern.")).map((o) => o.value.id.slice("pattern.".length)));
  const problems = coverageProblems(blocks, patterns, new Set(CONTRACT_PATTERNS));
  const file = join(plan.xgenRoot, COVERAGE_DOC);
  if (!existsSync(file)) problems.push(`${COVERAGE_DOC}: missing; run bun xgen/screens/tools/author-coverage.ts`);
  else if (readFileSync(file, "utf8") !== coverageMarkdown(blocks)) problems.push(`${COVERAGE_DOC}: differs from the registry in screens/src/authoring/gallery/coverage.ts; run bun xgen/screens/tools/author-coverage.ts`);
  return { name: "registry", what: "the 92 layouts of the reference catalog map to existing blocks, variants and contracts; the coverage document is the one the registry writes", problems };
}

/** the theme screens: each is a screen spec the hosts serve, every block of the catalog appears in at least one, the page texts in the dictionary are the ones the pages declare */
export function checkThemes(plan: Plan): CheckResult {
  const problems: string[] = [];
  const ids = new Set(plan.inputs.screens.map((s) => s.value.id));
  const used = new Set<string>(["navbar"]);
  for (const app of themeApps) {
    if (!ids.has(`screen.theme-${app.name}`)) problems.push(`theme ${app.name}: no screen spec screen.theme-${app.name}`);
    used.add(app.footer.split(".")[0]!);
    for (const p of app.pages) for (const r of [p.lead, ...p.rest]) used.add(r.split(".")[0]!);
  }
  for (const b of plan.inputs.blocks) { const k = blockKey(b.value); if (!used.has(k)) problems.push(`block ${k}: not used by any theme screen; add it to a page in screens/src/authoring/screens/themes.ts`); }
  const dict = (plan.inputs.dictionary.value as { pages?: unknown }).pages;
  const want = { ...themeTexts() };
  if (JSON.stringify(dict) !== JSON.stringify(want)) problems.push("content/ui/en.json: `pages` differs from themeTexts(); run author-theme-texts.ts");
  const ports = plan.apps.map((a) => a.app.port);
  for (const p of ports) if (ports.filter((x) => x === p).length > 1) problems.push(`port ${p} is used by more than one host app`);
  return { name: "themes", what: "every theme is a screen spec, every block is used by a theme, page texts match the dictionary, host ports are unique", problems: [...new Set(problems)] };
}
