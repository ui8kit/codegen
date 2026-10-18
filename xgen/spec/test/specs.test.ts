import { expect, test } from "bun:test";
import { join } from "node:path";
import { loadSpecs, validateRegistry } from "../src";

const root = join(import.meta.dir, "..", "..");
const { bricks, problems } = loadSpecs(root);

test("38 bricks and 68 parts load and match the schema", () => {
  expect(problems).toEqual([]);
  expect(bricks.length).toBe(38);
  expect(bricks.reduce((n, b) => n + b.brick.parts.length, 0)).toBe(68);
});

test("the registry is consistent", () => {
  expect(() => validateRegistry(bricks.map((b) => b.brick))).not.toThrow();
});

test("every brick is portable to both runtimes or says why not", () => {
  for (const b of bricks) for (const rt of ["svelte", "react"] as const) {
    const f = b.spec.portable[rt];
    expect(f === true || (f.portable === false && f.reason.length >= 8)).toBe(true);
  }
});

test("no recipe has a gradient and no plain variant", () => {
  for (const b of bricks) {
    const text = JSON.stringify(b.brick.recipes);
    expect(text.includes("gradient")).toBe(false);
    for (const r of Object.values(b.brick.recipes)) for (const m of Object.values(r.byKey)) expect(Object.keys(m).includes("plain")).toBe(false);
  }
});
