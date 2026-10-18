import { expect, test } from "bun:test";
import type { ScreenSpec } from "@ui8kit/xgen-screens";
import { chunksOf, printConst } from "../src/screen-model";

test("printConst keeps short tables on one line and wraps wide ones", () => {
  expect(printConst("A", { a: "b" })).toBe('const A = {"a":"b"} as const;');
  expect(printConst("R", [{ path: "" }, { path: "x" }], 20)).toBe('const R = [\n  {"path":""},\n  {"path":"x"},\n] as const;');
});

const src = { collection: "faq", kind: "faq", record: "Faq", fields: { id: "id" } };
const page = (areas: ScreenSpec["areas"], chunks = true): ScreenSpec => ({
  specVersion: 1, id: "screen.t", name: "TScreen", docs: "", kind: "page", sources: [{ ...src, as: "faq" }, { ...src, as: "other" }],
  routes: Object.keys(areas).map((a) => ({ path: a, area: a })), organisms: [], layout: [], areas, ...(chunks ? { chunks } : {}), portable: { svelte: true, react: true },
});

test("chunksOf: one file per area, reading only its own sources and actions", () => {
  const s = page({ index: [{ $: "ui.x" } as never], "before-after": [{ props: { a: { $: "faq" } }, on: { click: { call: "actions.toggleTheme", args: [] } } } as never] });
  const [index, ba] = chunksOf(s);
  expect(index).toMatchObject({ area: "index", name: "IndexPage", dir: "TScreen", sources: [], actions: false, constsTs: "" });
  expect(ba!.name).toBe("BeforeAfterPage");
  expect(ba!.sources.map((x) => x.as)).toEqual(["faq"]);
  expect(ba!.actions).toBe(true);
  expect(chunksOf(page({ a: [] }, false))).toEqual([]);
  expect(() => chunksOf(page({ a: [{ $: "route.area" } as never] }))).toThrow("reads route");
});
