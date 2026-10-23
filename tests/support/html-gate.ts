/**
 * Rendered-HTML gate (shared with codegen-x packages/ui-gates): html-validate (HTML5 + content model)
 * and axe-core in jsdom (ARIA, landmarks, form labels). Fragments are wrapped into a minimal valid document.
 */
import { HtmlValidate } from "html-validate";
import { JSDOM, VirtualConsole } from "jsdom";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

export const wrapDocument = (html: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>case</title></head><body><main>${html}</main></body></html>`;

const hv = new HtmlValidate({
  extends: ["html-validate:recommended"],
  rules: {
    "no-inline-style": "off", "attribute-boolean-style": "off", "attribute-empty-style": "off", "no-trailing-whitespace": "off",
    "void-style": "off", "no-redundant-role": "off", "prefer-native-element": "off", "no-implicit-button-type": "off", "tel-non-breaking": "off",
  },
});

export async function htmlProblems(html: string): Promise<string[]> {
  const doc = wrapDocument(html);
  const out: string[] = [];
  const report = await hv.validateString(doc);
  for (const r of report.results) for (const m of r.messages) out.push(`html-validate/${m.ruleId}: ${m.message}`);
  const dom = new JSDOM(doc, { runScripts: "outside-only", virtualConsole: new VirtualConsole() });
  dom.window.eval(axeSource);
  const axe = (dom.window as unknown as { axe: { run: (d: unknown, o: unknown) => Promise<{ violations: { id: string; help: string }[] }> } }).axe;
  const res = await axe.run(dom.window.document, { rules: { "color-contrast": { enabled: false } }, resultTypes: ["violations"] });
  for (const v of res.violations) out.push(`axe/${v.id}: ${v.help}`);
  dom.window.close();
  return out;
}
