import { expect, test } from "bun:test";
import { schemaFiles, validate } from "../src/index";

test("every kind has its schema file", () => {
  expect(schemaFiles()).toEqual(["app", "block", "collection", "composed", "dictionary", "organism", "preset", "screen", "spec", "variants"].map((k) => `${k}.schema.json`));
});

test("an app is accepted when whole and rejected with a path when a field is wrong", () => {
  const app = { specVersion: 1, name: "x-svelte", runtime: "svelte", screens: ["screen.x"], title: "X", port: 5300, locale: "en", theme: "light" };
  expect(validate("app", app)).toEqual([]);
  const bad = validate("app", { ...app, runtime: "angular" });
  expect(bad.length).toBeGreaterThan(0);
  expect(bad.join("\n")).toContain("runtime");
});

test("an unknown field is rejected (schemas are closed)", () => {
  expect(validate("app", { specVersion: 1, name: "x", runtime: "react", screens: [], title: "X", port: 1, locale: "en", theme: "light", extra: true }).length).toBeGreaterThan(0);
});

test("versions: the current one passes, an old or a newer one is named, a migration needs a step", async () => {
  const { SPEC_VERSION, versionProblem, migrate } = await import("../src/versions");
  expect(versionProblem({ specVersion: SPEC_VERSION })).toBeUndefined();
  expect(versionProblem({})).toContain("no specVersion");
  expect(versionProblem({ specVersion: SPEC_VERSION + 1 })).toContain("newer");
  expect(versionProblem({ specVersion: 0 })).toContain("old");
  expect(() => migrate({ specVersion: 0 })).toThrow("no migration from specVersion 0");
  expect(migrate({ specVersion: SPEC_VERSION, a: 1 })).toEqual({ specVersion: SPEC_VERSION, a: 1 });
});
