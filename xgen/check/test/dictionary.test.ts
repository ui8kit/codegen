import { expect, test } from "bun:test";
import { join } from "node:path";
import { checkDictionary, checkRoutes, dictionaryUse, runChecks } from "../src";

const repo = join(import.meta.dir, "..", "..", "..");

test("the dictionary check is exact: a leaf under a subtree handed to an organism is unused when the organism does not read it", () => {
  const { plan } = runChecks(repo);
  const dict = plan.inputs.dictionary.value as Record<string, Record<string, Record<string, string>>>;
  expect(checkDictionary(plan).problems).toEqual([]);
  // content.labels is handed to PostGrid and others as `labels`; they read some leaves, not a new one
  dict["content"]!["labels"]!["neverRead"] = "x";
  expect(checkDictionary(plan).problems).toEqual(["xgen/content/ui/en.json: content.labels.neverRead is read by no view and no screen menu"]);
  delete dict["content"]!["labels"]!["neverRead"];
  // a leaf a view reads, taken out of the dictionary, is reported where it is read
  const saved = dict["site"]!["header"]!["skip"]!;
  delete dict["site"]!["header"]!["skip"];
  const problems = checkDictionary(plan).problems;
  expect(problems.length).toBeGreaterThan(0);
  expect(problems.every((p) => /^xgen\/specs\/(screens|organisms)\/[a-z0-9-]+\.json: reads ui\.site\.header\.skip, /.test(p))).toBe(true);
  dict["site"]!["header"]!["skip"] = saved;
  // the subtrees read by a dynamic index are named
  expect([...dictionaryUse(plan).dynamic]).toContain("status");
}, 30_000);

test("the routes check finds a broken menu", () => {
  const { plan } = runChecks(repo);
  const s = plan.inputs.screens.find((x) => x.value.id === "screen.theme-content-blog")!.value;
  const saved = JSON.stringify(s.menu);
  expect(checkRoutes(plan).problems).toEqual([]);
  s.menu![1] = { id: "articles", path: "nowhere", titleKey: "pages.contentBlog.none.nav" };
  const p = checkRoutes(plan).problems;
  expect(p).toContain('xgen/specs/screens/theme-content-blog.json: menu[1] (articles): the screen has no route "nowhere"');
  expect(p).toContain("xgen/specs/screens/theme-content-blog.json: menu[1] (articles): titleKey pages.contentBlog.none.nav is not a text of xgen/content/ui/en.json");
  s.menu = JSON.parse(saved);
  expect(checkRoutes(plan).problems).toEqual([]);
}, 30_000);
