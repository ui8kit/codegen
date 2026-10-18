import { expect, test } from "bun:test";
import { at, pageWindow, tpl } from "../assets/ts/format";

test("pageWindow keeps the first, the last and the neighbours of the current page", () => {
  expect(pageWindow(1, 1)).toEqual([1]);
  expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  expect(pageWindow(5, 21)).toEqual([1, null, 4, 5, 6, null, 21]);
  expect(pageWindow(2, 21)).toEqual([1, 2, 3, null, 21]);
  expect(pageWindow(21, 21)).toEqual([1, null, 20, 21]);
});

test("tpl and at", () => {
  expect(tpl("Page {0} of {1}", 2, 9)).toBe("Page 2 of 9");
  expect(at({ a: "A" }, "b")).toBe("b");
});
