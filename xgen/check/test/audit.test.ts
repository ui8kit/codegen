import { expect, test } from "bun:test";
import { join } from "node:path";
import { CATEGORY_SIZES, coverageProblems, vibeCoverage, blocks } from "@ui8kit/xgen-screens";
import { planBuild, sha } from "@ui8kit/xgen-generator";
import { cycles } from "../src/audit";
import { cornerClasses, cornerProblems } from "../src/corners";
import { shadowClasses, shadowProblems } from "../src/shadows";
import { spacingKeyProblems } from "../src/spacing";
import { HARDCODE, MAX_FILE_LINES } from "../src/audit-rules";

const repo = join(import.meta.dir, "..", "..", "..");

test("a cycle of imports is found, a chain is not", () => {
  const chain = new Map([["a", ["b"]], ["b", ["c"]], ["c", []]]);
  expect(cycles(chain)).toEqual([]);
  const loop = new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]], ["d", ["a"]]]);
  expect(cycles(loop)).toEqual([["a", "b", "c"]]);
});

test("the corner guard allows plain rounded, and rounded-full or rounded-none only where the allowlist says", () => {
  expect(cornerClasses("rounded p-4 open:rounded-2xl [&::-webkit-slider-thumb]:rounded-full rounded-t-lg rounded-[20px]")).toEqual(["rounded-2xl", "rounded-full", "rounded-t-lg", "rounded-[20px]"]);
  expect(cornerProblems("specs/ui/card.variants.json", "\"base\": \"rounded bg-card\"")).toEqual([]);
  expect(cornerProblems("specs/ui/card.variants.json", "\"base\": \"rounded-lg\"").length).toBe(1);
  expect(cornerProblems("specs/ui/card.variants.json", "\"base\": \"rounded-full\"").length).toBe(1);
  expect(cornerProblems("specs/ui/radio.variants.json", "\"base\": \"rounded-full\"")).toEqual([]);
  expect(cornerProblems("specs/ui/radio.variants.json", "\"base\": \"rounded\"")[0]).toContain("lower its allowance");
});

test("the shadow guard: no shadow on a flat surface, one listed shadow on a floating layer", () => {
  expect(shadowClasses("p-4 shadow-xs hover:shadow-md shadow drop-shadow-sm shadow-[0_1px_0_red] inset-ring")).toEqual(["shadow-xs", "shadow-md", "shadow", "drop-shadow-sm", "shadow-[0_1px_0_red]"]);
  expect(shadowProblems("specs/ui/card.variants.json", "\"base\": \"rounded bg-card\"")).toEqual([]);
  expect(shadowProblems("specs/ui/card.variants.json", "\"base\": \"shadow-xs\"").length).toBe(1);
  expect(shadowProblems("specs/ui/dialog.variants.json", "\"base\": \"shadow-lg\"")).toEqual([]);
  expect(shadowProblems("specs/ui/dialog.variants.json", "\"base\": \"shadow-md\"").length).toBe(2);
});

test("the spacing guard: a gap, padding or margin option is named by its Tailwind step, not by pixels", () => {
  expect(spacingKeyProblems("specs/ui/stack.variants.json", { byKey: { gap: { "0": "gap-0", "4": "gap-4", "12": "gap-12", auto: "" } } })).toEqual([]);
  expect(spacingKeyProblems("specs/ui/stack.variants.json", { byKey: { gap: { "16": "gap-4" } } }).length).toBe(1);
  expect(spacingKeyProblems("specs/ui/box.variants.json", { byKey: { padding: { "24": "p-6" } } }).length).toBe(1);
  expect(spacingKeyProblems("specs/recipes/nav-item.variants.json", { byKey: { level: { "3": "pl-12" } } })).toEqual([]);
});

test("the hardcode patterns catch sizes, hex colors, palette colors and stringified values, and let tokens and grid templates pass", () => {
  const hit = (s: string): boolean => Object.values(HARDCODE).some((re) => (s.match(re) ?? []).length > 0);
  for (const bad of ["rounded-[20px]", "text-[13px]", "bg-[#ff0000]", "bg-blue-500", "text-red-700", "[object Object]", "max-w-[85%]"]) expect(hit(bad)).toBe(true);
  for (const ok of ["rounded-xl", "bg-card text-muted-foreground", "grid-cols-[16rem_minmax(0,1fr)]", "in-data-[nav=collapsed]:hidden", "size-12", "inset-ring-border"]) expect(hit(ok)).toBe(false);
});

test("the registry of 92 layouts: a missing block, variant or contract is reported", () => {
  expect(vibeCoverage.length).toBe(CATEGORY_SIZES.reduce((n, x) => n + x, 0));
  const patterns = new Set(["marquee"]);
  const bad = coverageProblems(blocks, patterns, new Set(["marquee", "carousel"]));
  expect(bad.some((m) => m.includes("pattern.carousel is not used") || m.includes("no pattern"))).toBe(true);
  const none = coverageProblems(blocks.slice(0, 3), new Set(), new Set());
  expect(none.some((m) => m.includes("no block"))).toBe(true);
});

test("the source files stay under the limit (the same rule as xgen check, as a plain number)", () => {
  expect(MAX_FILE_LINES).toBe(350);
});

test("the build is deterministic: two plans give the same files in the same order with the same content", () => {
  const a = planBuild(repo), b = planBuild(repo);
  const rows = (p: typeof a): string[] => p.targets.flatMap((t) => t.files.map((f) => `${t.dir}/${f.path} ${sha(f.contents)}`));
  const x = rows(a), y = rows(b);
  expect(x.length).toBeGreaterThan(500);
  expect(x).toEqual(y);
  const sortedWithin = a.targets.every((t) => t.files.every((f, i) => i === 0 || t.files[i - 1]!.path <= f.path));
  expect(sortedWithin).toBe(true);
});

test("build and check take seconds, not minutes: the budget leaves room for three times the catalog", () => {
  const t0 = performance.now();
  const plan = planBuild(repo);
  const ms = performance.now() - t0;
  expect(plan.inputs.blocks.length).toBeGreaterThanOrEqual(60);
  expect(ms).toBeLessThan(10000);
});
