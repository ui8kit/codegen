import { expect, test } from "bun:test";
import { join } from "node:path";

const cli = join(import.meta.dir, "..", "src", "cli.ts");
const run = (...args: string[]) => Bun.spawnSync(["bun", cli, ...args], { cwd: join(import.meta.dir, "..", "..", "..") });

test("check passes on the workspace and prints one line per group", () => {
  const p = run("check");
  const out = p.stdout.toString();
  expect(p.exitCode).toBe(0);
  expect(out).toContain("xgen check: ok");
  expect(out.split("\n").filter((l) => l.startsWith("ok ")).length).toBeGreaterThanOrEqual(15);
}, 120_000); // every group: the rules group parses about 2600 component files, the templ, twig and jinja2 groups render every case

test("an unknown command prints the usage and fails", () => {
  const p = run("nothing");
  expect(p.exitCode).not.toBe(0);
});
