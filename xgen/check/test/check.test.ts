import { expect, test } from "bun:test";
import { join } from "node:path";
import { runChecks, checkBlocks } from "../src";

const repo = join(import.meta.dir, "..", "..", "..");

test("xgen check passes on the workspace", () => {
  const { results } = runChecks(repo);
  expect(results.map((r) => [r.name, r.problems])).toEqual(results.map((r) => [r.name, []]));
  expect(results.map((r) => r.name)).toEqual(["schema", "props", "a11y", "authored", "coverage", "recipes", "nonportable", "text", "dictionary", "blocks", "registry", "themes", "routes", "structure", "hardcode", "corners", "shadows", "spacing", "readability", "dead", "duplicates", "versions", "tests", "rules", "codex", "drift"]);
});

test("the blocks check finds a broken block", () => {
  const { plan } = runChecks(repo);
  const blocks = plan.inputs.blocks;
  const hero = blocks.find((b) => b.value.id === "block.hero")!.value;
  const saved = JSON.stringify(hero);
  const reset = (): void => { Object.assign(hero, JSON.parse(saved)); };
  const problems = (): string[] => checkBlocks(plan).problems;
  expect(problems()).toEqual([]);
  hero.variants.push({ id: "bad", set: { layout: "diagonal" } });
  expect(problems().some((m) => m.includes('layout="diagonal"'))).toBe(true);
  reset();
  hero.axes["layout"] = ["centered"];
  hero.axes["columns"] = ["1", "2"];
  expect(problems().some((m) => m.includes("axis columns is not a prop"))).toBe(true);
  reset();
  hero.variants = hero.variants.filter((v) => v.set?.["tone"] !== "muted");
  expect(problems().some((m) => m.includes('no variant shows tone="muted"'))).toBe(true);
  reset();
  hero.sample.props["title"] = { $: "ui.site.missing" };
  expect(problems().some((m) => m.includes("ui.site.missing"))).toBe(true);
  reset();
  const feat = blocks.find((b) => b.value.id === "block.features")!.value;
  feat.data[0]!.collection = "nothing";
  expect(problems().some((m) => m.includes("no fixture nothing"))).toBe(true);
});
