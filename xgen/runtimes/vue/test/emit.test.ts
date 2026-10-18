import { expect, test } from "bun:test";
import { join } from "node:path";
import { planBuild } from "@ui8kit/xgen-generator";
import { VueEmitter } from "../src/index";
import { attrExpr, each, ifChain, vueAttr } from "../src/template";

const plan = planBuild(join(import.meta.dir, "..", "..", "..", ".."));

test("every brick makes Vue files with a plain script, a script setup and a template, the same twice", () => {
  const emitter = new VueEmitter();
  for (const { brick } of plan.bricks) {
    const a = emitter.emit(brick), b = emitter.emit(brick);
    expect(a.map((f) => f.path)).toEqual(b.map((f) => f.path));
    expect(a.map((f) => f.contents)).toEqual(b.map((f) => f.contents));
    for (const f of a) {
      expect(f.path).toMatch(/\/[a-z0-9-]+\.vue$/);
      expect(f.contents).toContain(`<script setup lang="ts">`);
      expect(f.contents).toContain("defineProps<");
      expect(f.contents).toContain("<template>");
    }
  }
});

test("attributes of the brace form become bound, event and spread attributes; strings move to single quotes", () => {
  expect(vueAttr(`title={ui.home.title}`)).toBe(`:title="ui.home.title"`);
  expect(vueAttr(`gap="12"`)).toBe(`gap="12"`);
  expect(vueAttr(`@select={(id: string) => emit("select", id)}`)).toBe(`@select="(id: string) => emit('select', id)"`);
  expect(vueAttr(`{...rest}`)).toBe(`v-bind="rest"`);
  expect(attrExpr("`w:${a ? \"x\" : 'y'}%`")).toBe("`w:${a ? 'x' : 'y'}%`");
  expect(attrExpr(`"it's"`)).toBe(`'it\\'s'`);
});

test("a branch or a loop body of one element takes the directive; several nodes keep a template", () => {
  expect(ifChain([["a", ["<Card />"]]], ["<Empty />"])).toEqual([`<Card v-if="a" />`, `<Empty v-else />`]);
  expect(ifChain([["a", ["<A />", "<B />"]]], [])).toEqual([`<template v-if="a">`, "  <A />", "  <B />", "</template>"]);
  expect(each("rows", "row", "row.id", ["<Row :row=\"row\" />"])).toEqual([`<Row v-for="row in rows" :key="row.id" :row="row" />`]);
  // v-if has priority over v-for on one element: a filtered body keeps its template
  expect(each("rows", "row", "row.id", ["<Row v-if=\"row.on\" />"])[0]).toBe(`<template v-for="row in rows" :key="row.id">`);
});
