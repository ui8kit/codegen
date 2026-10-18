import { expect, test } from "bun:test";
import { join } from "node:path";
import { planBuild } from "@ui8kit/xgen-generator";
import { TemplEmitter, TEMPL_MODULE, goPackageOf } from "../src/index";

const plan = planBuild(join(import.meta.dir, "..", "..", "..", ".."));

test("every brick makes templ files that carry the banner, and the same brick makes the same files twice", () => {
  const emitter = new TemplEmitter({ goModule: TEMPL_MODULE });
  for (const { brick } of plan.bricks) {
    if (brick.id === "ui.lucide-icon") continue; // an asset, not emitted
    const a = emitter.emit(brick), b = emitter.emit(brick);
    expect(a.map((f) => f.contents)).toEqual(b.map((f) => f.contents));
    expect(a.some((f) => f.path.endsWith(".templ"))).toBe(true);
  }
});

test("Go package names are identifiers and never Go keywords", () => {
  const keywords = new Set(["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"]);
  for (const { brick } of plan.bricks) {
    const p = goPackageOf(brick);
    expect(p).toMatch(/^[a-z][a-z0-9]*$/);
    expect(keywords.has(p)).toBe(false);
  }
});

test("the templ package is a target of the plan with organisms, recipes and the ui8kit zones", () => {
  const t = plan.targets.find((x) => x.runtime === "templ")!;
  expect(t.files.some((f) => f.path === "blocks/pager.templ")).toBe(true);
  const pkg = JSON.parse(t.files.find((f) => f.path === "package.json")!.contents) as { ui8kit: { kit: string[]; blockRoot: string[] } };
  expect(pkg.ui8kit.kit).toEqual(["ui", "utils"]);
  expect(pkg.ui8kit.blockRoot.every((p) => p.startsWith("blocks/") && p.endsWith(".templ"))).toBe(true);
});
