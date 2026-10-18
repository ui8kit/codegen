import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drift, planBuild, write } from "../src";

const repo = join(import.meta.dir, "..", "..", "..");
const tmp = mkdtempSync(join(tmpdir(), "xgen-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

// a scratch workspace: the real xgen folder is read, targets are written under tmp
for (const app of ["host-svelte", "host-react", "host-vue"]) {
  mkdirSync(join(tmp, "apps", app), { recursive: true });
  cpSync(join(repo, "apps", app, "xgen.app.json"), join(tmp, "apps", app, "xgen.app.json"));
}
const plan = () => planBuild(tmp, join(repo, "xgen"));

test("the plan is deterministic", () => {
  const a = plan(), b = plan();
  expect(a.problems).toEqual([]);
  expect(a.targets.map((t) => t.files.map((f) => f.path + f.contents))).toEqual(b.targets.map((t) => t.files.map((f) => f.path + f.contents)));
});

test("every generated text file carries DO NOT EDIT", () => {
  for (const t of plan().targets) for (const f of t.files) expect(f.contents.slice(0, 300)).toContain("DO NOT EDIT");
});

test("a fresh write has no drift; hand edits, extra and missing files are found", () => {
  const p = plan();
  write(p);
  expect(drift(p)).toEqual([]);
  const app = join(tmp, "apps", "host-svelte");
  const screen = join(app, "xgen/screens/PlansScreen.svelte");
  writeFileSync(screen, readFileSync(screen, "utf8") + "\n<!-- hand edit -->\n");
  writeFileSync(join(app, "src/Extra.svelte"), "<p>by hand</p>");
  rmSync(join(tmp, "apps", "host-react", "xgen/App.tsx"));
  const found = drift(p).join("\n");
  expect(found).toContain("host-svelte/xgen/screens/PlansScreen.svelte: differs");
  expect(found).toContain("host-svelte/src/Extra.svelte: not generated and not an input");
  expect(found).toContain("host-react/xgen/App.tsx: missing");
  write(p);
  expect(drift(p).join("\n")).toContain("Extra.svelte"); // build does not delete what it did not write
  rmSync(join(app, "src/Extra.svelte"));
  expect(drift(p)).toEqual([]);
});

test("one host per runtime serves every screen; content, data and menus live once in the shared package", () => {
  const p = plan();
  const hosts = p.targets.filter((x) => x.kind === "app");
  expect(hosts.map((h) => h.dir).sort()).toEqual(["apps/host-react", "apps/host-svelte", "apps/host-vue"]);
  for (const h of hosts) {
    // one file per screen, plus one per page of a chunked screen (the gallery: xgen/screens/BlocksScreen/<Area>Page)
    expect(h.files.filter((f) => /^xgen\/screens\/[^/]+$/.test(f.path)).length).toBe(p.inputs.screens.length);
    const pages = h.files.filter((f) => f.path.startsWith("xgen/screens/BlocksScreen/")).length;
    expect(pages).toBe(p.inputs.blocks.length + 3); // every block, the index, notfound and the ScreenHeader part
    expect(h.files.some((f) => /content\.ts$|\/data\/|\/nav\/|runtime\/core\.ts$/.test(f.path))).toBe(false);
  }
  const shared = p.targets.find((x) => x.dir === "packages/shared/app")!;
  expect(shared.files.filter((f) => f.path === "src/content.ts").length).toBe(1);
});

test("the apps hold nothing but generated files and xgen.app.json", () => {
  const p = plan();
  for (const t of p.targets.filter((x) => x.kind === "app")) expect(t.handwritten).toEqual(["xgen.app.json"]);
});
