/**
 * cn / CnMerge conflict groups across every runtime family: TS (tailwind-merge),
 * Go (templ uiutils.Cn), PHP (Twig/Latte CnMerge) and Python (Jinja2 cn_merge).
 * ring-offset-N, ring-N (width) and ring-<color> are distinct groups.
 */
import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

import { cn } from "../src/domain/cn";

const ROOT = join(import.meta.dir, "..");
const REQUIRE_ALL = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";
const ok = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

const CASES: Array<[string, string]> = [
  ["ring-offset-2 ring-ring", "ring-offset-2 ring-ring"],
  ["ring-2 ring-offset-2 ring-ring", "ring-2 ring-offset-2 ring-ring"],
  ["ring-offset-2 ring-offset-4", "ring-offset-4"],
  ["ring-offset-background ring-offset-card", "ring-offset-card"],
  ["ring-ring ring-offset-background ring-2", "ring-ring ring-offset-background ring-2"],
  ["ring-1 ring-2", "ring-2"],
  ["ring-ring ring-primary", "ring-primary"],
];

function guard(name: string, available: boolean, body: () => void) {
  if (available) it(name, body);
  else if (REQUIRE_ALL) it(name, () => { throw new Error(`${name}: toolchain missing`); });
  else it.skip(name, body);
}

describe("cn ring conflict groups", () => {
  it("TS cn (tailwind-merge)", () => {
    for (const [input, want] of CASES) expect(cn(input)).toBe(want);
  });

  guard("Go uiutils.Cn", ok("go", ["version"]), () => {
    const r = spawnSync("go", ["test", "-run", "TestMergeRingOffsetKeepsRingColor", "./utils/"], {
      cwd: join(ROOT, "generated", "templ"),
      encoding: "utf8",
    });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  guard("PHP CnMerge (Twig/Latte)", ok("php", ["-v"]), () => {
    const dir = mkdtempSync(join(tmpdir(), "ui8kit-cn-"));
    const src = readFileSync(join(ROOT, "runtime", "php", "CnMerge.php"), "utf8").replace("__NAMESPACE__", "T");
    writeFileSync(join(dir, "CnMerge.php"), src);
    const script = `require '${join(dir, "CnMerge.php")}'; foreach (json_decode($argv[1]) as $c) echo \\T\\CnMerge::merge([$c]), "\\n";`;
    const r = spawnSync("php", ["-r", script, JSON.stringify(CASES.map((c) => c[0]))], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trimEnd().split("\n")).toEqual(CASES.map((c) => c[1]));
  });

  guard("Python cn_merge (Jinja2)", ok("python3", ["--version"]), () => {
    const script =
      "import sys,json\nsys.path.insert(0, sys.argv[1])\nfrom ui8kit_jinja import cn_merge as m\n" +
      "print('\\n'.join(m.merge([c]) for c in json.loads(sys.argv[2])))";
    const r = spawnSync("python3", ["-c", script, join(ROOT, "generated", "jinja2"), JSON.stringify(CASES.map((c) => c[0]))], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trimEnd().split("\n")).toEqual(CASES.map((c) => c[1]));
  });
});
