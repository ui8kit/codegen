import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { drift, planBuild } from "../src/index";
import { packageReadme } from "../src/readme";

const repo = join(import.meta.dir, "..", "..", "..");

test("the plan has the four UI packages, the Go templ package, the Twig package, the Jinja2 package, the shared app package, the taste copy decks (only in the codegen-x monorepo) and one host per runtime, and no problem", () => {
  const plan = planBuild(repo);
  expect(plan.problems).toEqual([]);
  expect(plan.targets.filter((t) => t.kind === "package").map((t) => t.dir)).toEqual(["packages/svelte/ui", "packages/react/ui", "packages/vue/ui", "packages/solid/ui", "packages/templ/ui", "packages/twig/ui", "packages/jinja2/ui", "packages/latte/ui", "packages/shared/app", ...(existsSync(join(repo, "packages/taste-data/package.json")) ? ["packages/taste-data/content"] : [])]);
  expect(plan.targets.filter((t) => t.kind === "app").length).toBe(plan.apps.length);
  expect(plan.apps.map((a) => a.app.runtime).sort()).toEqual(["react", "solid", "svelte", "vue"]);
});

test("the files of a target are listed in the order of their paths, none twice", () => {
  for (const t of planBuild(repo).targets) {
    const paths = t.files.map((f) => f.path);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
  }
});

test("what is on disk is what the plan generates", () => {
  expect(drift(planBuild(repo))).toEqual([]);
});

test("the README names the package, the runtime and the counts", () => {
  const text = packageReadme("@ui8kit/svelte-ui", "svelte", 39, 69, 3);
  expect(text).toContain("Svelte 5");
  expect(text).toContain("39 bricks, 69 parts, 3 organism(s)");
  expect(text).toContain("DO NOT EDIT");
});
