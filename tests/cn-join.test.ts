/**
 * `generate --cn join`: only utils/cn.ts changes (a dependency-free clsx-style join, no tailwind-merge); the default
 * (`merge`, what the registry packs) is unchanged. On class lists without conflicts both joins agree.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bricks } from "../bricks/index";
import { generateFiles } from "../src/application/generate";
import { cn as merge } from "../runtime/ts/cn";
import { cn as lean } from "../runtime/ts-join/cn";

const ROOT = join(import.meta.dir, "..");

describe("generate --cn", () => {
  it("merge is the default; join differs only in utils/cn.ts", async () => {
    const byPath = (fs: Array<{ path: string; contents: string }>) => new Map(fs.map((f) => [f.path, f.contents]));
    const def = byPath(await generateFiles(bricks));
    const mrg = byPath(await generateFiles(bricks, { cn: "merge" }));
    const jn = byPath(await generateFiles(bricks, { cn: "join" }));
    expect([...mrg]).toEqual([...def]);
    expect([...jn.keys()]).toEqual([...def.keys()]);
    const changed = [...def.keys()].filter((p) => def.get(p) !== jn.get(p));
    expect(changed).toEqual(["utils/cn.ts"]);
    expect(def.get("utils/cn.ts")).toBe(readFileSync(join(ROOT, "runtime/ts/cn.ts"), "utf8"));
    expect(jn.get("utils/cn.ts")).toBe(readFileSync(join(ROOT, "runtime/ts-join/cn.ts"), "utf8"));
    expect(jn.get("utils/cn.ts")).not.toMatch(/^\s*import\b|\bfrom\s+["']|require\(/m);
  });

  it("rejects an unknown mode", async () => {
    await expect(generateFiles(bricks, { cn: "nope" as never })).rejects.toThrow(/unknown cn mode/);
  });
});

describe("join cn", () => {
  it("joins strings, numbers, arrays and objects like clsx, skipping falsy values", () => {
    expect(lean("a", undefined, null, false, "", 0, "b  c")).toBe("a 0 b c");
    expect(lean(["a", ["b", { c: true, d: false }]], { e: 1 })).toBe("a b c e");
    expect(lean()).toBe("");
  });

  it("agrees with merge on class lists without conflicts", () => {
    const cases: unknown[][] = [
      ["flex flex-col", "gap-12", "items-stretch"],
      ["bg-secondary rounded h-6", "w-3/4"],
      ["bg-muted rounded w-full", "aspect-4/3"],
      ["m-0 grid w-full grid-cols-1 gap-8 p-0 sm:grid-cols-2", "md:grid-cols-3"],
      ["py-16 lg:py-32"],
      [undefined, "mx-auto w-full max-w-6xl px-4"],
    ];
    for (const c of cases) expect(lean(...(c as never[]))).toBe(merge(...(c as never[])));
  });

  it("does not resolve conflicts (that is merge's job)", () => {
    expect(merge("p-2 p-4")).toBe("p-4");
    expect(lean("p-2 p-4")).toBe("p-2 p-4");
  });
});
