import { expect, test } from "bun:test";
import { join } from "node:path";
import { planBuild } from "@ui8kit/xgen-generator";
import { SvelteEmitter } from "../src/index";

const plan = planBuild(join(import.meta.dir, "..", "..", "..", ".."));

test("every brick makes Svelte files that carry the banner, and the same brick makes the same files twice", () => {
  const emitter = new SvelteEmitter();
  for (const { brick } of plan.bricks) {
    const a = emitter.emit(brick), b = emitter.emit(brick);
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((f) => f.path)).toEqual(b.map((f) => f.path));
    expect(a.map((f) => f.contents)).toEqual(b.map((f) => f.contents));
    expect(a.some((f) => f.path.endsWith(".svelte"))).toBe(true);
  }
});
