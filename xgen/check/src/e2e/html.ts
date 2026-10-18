// HTML5 validity of the rendered DOM: every state the scenarios read (the same states as the pair test, in every runtime) is validated with
// html-validate and the rules in rules/html-validate.json (landmarks, one main, heading order, permitted content, ARIA, forms). Target: 0.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { HtmlValidate, type ConfigData } from "html-validate";

export type HtmlStates = Map<string, string[]>;

/** the whole document of the page as it is now */
export async function documentHtml(page: Page): Promise<string> {
  return "<!DOCTYPE html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));
}

/** validate the collected states; identical documents are validated once. Each message: `rule: message (state, selector)` */
export async function validateStates(workspace: string, states: HtmlStates): Promise<{ documents: number; problems: string[]; warnings: Record<string, number> }> {
  const config = JSON.parse(readFileSync(join(workspace, "rules/html-validate.json"), "utf8")) as ConfigData & { $comment?: string };
  delete config.$comment;
  const hv = new HtmlValidate(config);
  const problems: string[] = [];
  const seen = new Set<string>();
  const warnings: Record<string, number> = {};
  for (const [html, names] of states) {
    const report = await hv.validateString(html, names[0]!);
    for (const r of report.results) for (const m of r.messages) {
      if (m.severity < 2) { warnings[m.ruleId] = (warnings[m.ruleId] ?? 0) + names.length; continue; }
      const line = `${m.ruleId}: ${m.message} (${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ""}, ${m.selector ?? `line ${m.line}`})`;
      const key = `${m.ruleId}|${m.message}|${m.selector}`;
      if (!seen.has(key)) { seen.add(key); problems.push(line); }
    }
  }
  return { documents: states.size, problems, warnings };
}
