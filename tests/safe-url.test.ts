/** Safe URLs: every URL attribute of every brick omits javascript:/vbscript:/data: values (canonical + TS helper). */
import { describe, expect, it } from "bun:test";
import { bricks } from "../bricks/index";
import { renderPart } from "../src/domain/render";
import { isUnsafeUrl } from "../src/domain/expr";
import { safeUrl } from "../runtime/ts/expr";
import { UNSAFE_URL_EDGES } from "./support/unsafe-urls";

describe("safe URLs", () => {
  it("isUnsafeUrl / TS safeUrl agree", () => {
    for (const [v, bad] of [["javascript:x", true], [" JaVa\tscript:x", true], ["vbscript:x", true], ["data:text/html,x", true], ["/a", false], ["https://x", false], ["mailto:a@b", false], ["#top", false], ["", false]] as const) {
      expect(isUnsafeUrl(v), v).toBe(bad);
      expect(safeUrl(v), v).toBe(bad ? "" : v);
    }
  });
  it("canonical renderer: no unsafe URL attribute in any edge case", () => {
    for (const [part, cases] of Object.entries(UNSAFE_URL_EDGES)) {
      const brick = bricks.find((b) => b.parts.some((p) => p.name === part))!;
      for (const [id, { props }] of Object.entries(cases)) {
        const { Attrs: rest, ...canonical } = props as Record<string, unknown> & { Attrs?: Record<string, string> };
        const html = renderPart(brick, part, canonical, { rest });
        expect(html, `${part} ${id}`).not.toMatch(/(href|src|action|formaction)="\s*(javascript|vbscript|data):/i);
        if (id === "unsafe url keys in Attrs") expect(html).toContain('data-x="javascript:kept"');
      }
    }
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("twig includes are isolated", () => {
  it("every Twig include in docs/ and generated/twig uses `only` (the parent context must not leak into a primitive)", () => {
    const files = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "vendor" ? [] : files(join(d, e.name))) : [join(d, e.name)]));
    const root = join(import.meta.dir, "..");
    const bad = [...files(join(root, "docs")), ...files(join(root, "generated/twig"))]
      .filter((f) => /\.(md|twig)$/.test(f))
      .flatMap((f) => (readFileSync(f, "utf8").match(/\{%-?\s*include\s[^%]*\.twig'[^%]*%\}/g) ?? []).filter((s) => !/\bonly\s*-?%\}$/.test(s)).map((s) => `${f}: ${s}`));
    expect(bad).toEqual([]);
  });
});
