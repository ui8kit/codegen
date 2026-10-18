// The style rules on hand-written code (apps/magazine in the codegen-x monorepo; none in a standalone checkout): class text and CSS only, and the committed style baselines hold.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { styleFindings, styleProblems, STYLE_GROUPS } from "../src/style-zones";

const repo = join(import.meta.dir, "..", "..", "..");

describe("style rules on hand-written code", () => {
  test("svelte markup: class text only, script and prose ignored", () => {
    const r = styleFindings("a.svelte", `<script>const shadow = "rounded-lg";</script><div class="rounded-lg shadow-md p-3" class:rounded-full={x}><b class={x ? "bg-red-500 w-[3px]" : "p-2"}>shadow</b></div>`);
    expect(r.corners).toEqual(["rounded-lg", "rounded-full"]);
    expect(r.shadows).toEqual(["shadow-md"]);
    expect(r.hardcode).toEqual(["-[3px]", "bg-red-500"]);
    expect(r.spacing).toEqual(["p-3"]);
  });
  test("css: radius off the token, drop shadow, gradient and hex, off-grid spacing", () => {
    const r = styleFindings("a.css", `.a{border-radius:6px;box-shadow:0 0 0 1px red;padding:8px 16px} .b{border-radius:var(--radius);box-shadow:0 2px 4px #000;gap:12px;background:linear-gradient(red,blue)}`);
    expect(r.corners).toEqual(["border-radius: 6px"]);
    expect(r.shadows).toEqual(["box-shadow: 0 2px 4px #000"]);
    expect(r.hardcode).toEqual(["linear-gradient(", "box-shadow: #000"]);
    expect(r.spacing).toEqual(["gap: 12px"]);
  });
  test("ts: class strings only, never shader code or numbers", () => {
    const r = styleFindings("a.ts", "const k = 'shadow'; const n = 13; const glsl = `uniform float shadow;\\nfloat r = 3.0;`; el.className = 'rounded-md p-1';");
    expect(r.corners).toEqual(["rounded-md"]);
    expect(r.shadows).toEqual([]);
    expect(r.spacing).toEqual(["p-1"]);
  });
  test("the hand-written style packages present match their baselines", () => {
    for (const g of STYLE_GROUPS) expect(styleProblems(repo, g)).toEqual([]);
  });
});
