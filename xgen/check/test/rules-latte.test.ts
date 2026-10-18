import { expect, test } from "bun:test";
import { latteAsTwig, latteToIr } from "../src/rules/latte";
import { detect } from "../src/rules/detectors";
import type { IrNode } from "../src/rules/ir";

const ctx = { blockRoot: true, rootsOnBlock: () => undefined };
const block = (tag: string, children = "$c"): string => `{=ui_include('ui/block/block.latte', ['p' => ['Tag' => '${tag}'], 'children' => ${children}])|noescape}`;
const kinds = (ns: IrNode[]): string[] => ns.map((n) => n.kind);
const found = (src: string): string[] => detect(latteToIr(src), { ...ctx, blockRoot: false }).map((f) => f.detector).sort();

test("latte: a brace that does not open a tag stays text: JSON and spaced braces in attributes, {l} and {r}", () => {
  const ir = latteToIr(`<div data-x='{"a":1}' data-y="{ a }">{l}x{r}</div>`);
  expect(ir.error).toBeUndefined();
  const div = ir.nodes[0] as IrNode & { kind: "element" };
  expect(div.kind).toBe("element");
  expect(div.attrs.map((a) => [a.name, a.value])).toEqual([["data-x", '{"a":1}'], ["data-y", "{ a }"]]);
  expect(div.children.map((c) => (c.kind === "text" ? c.text : c.kind)).join("")).toBe("{x}");
});

test("latte: comments are skipped, even when they hold tags", () => {
  const ir = latteToIr(`{* {if $a} <div> {/if} *}${block("section")}`);
  expect(ir.error).toBeUndefined();
  expect(kinds(ir.nodes)).toEqual(["component"]);
});

test("latte: if / elseif / else is one choice of three branches; foreach is a loop; {iterator} reads", () => {
  const ir = latteToIr(`{if $a}${block("section")}{elseif $b}${block("aside")}{else}x{/if}{foreach $items as $i}{=$iterator->counter0}{/foreach}`);
  expect(ir.error).toBeUndefined();
  expect(kinds(ir.nodes)).toEqual(["choice", "loop"]);
  expect((ir.nodes[0] as { branches: unknown[] }).branches.length).toBe(3);
  expect(found(`{if $a}${block("section")}{elseif $b}${block("aside")}{else}${block("section")}{/if}`)).toEqual([]);
});

test("latte: nested captures: a Block passed into a Block is nested, a Block in a foreach is in a loop", () => {
  const nested = `{capture $c_1}{=ui_text($v)}{/capture}{capture $c_2}${block("aside", "$c_1")}{/capture}${block("section", "$c_2")}`;
  expect(detect(latteToIr(nested), ctx).map((f) => f.message)).toEqual(["Block nested inside Block"]);
  const loop = `{foreach $xs as $x}{capture $c_1}{=ui_text($x)}{/capture}${block("section", "$c_1")}{/foreach}`;
  expect(detect(latteToIr(loop), ctx).some((f) => f.message.includes("Block inside a loop"))).toBe(true);
});

test("latte: n:tag makes a dynamic element; n:if wraps it in a choice; n:foreach and n:inner-foreach are loops", () => {
  const dyn = latteToIr(`<div n:tag="$t" class="a">x</div>`);
  expect(dyn.nodes[0]!.kind).toBe("dynamic");
  expect((dyn.nodes[0] as { attrs: Array<{ name: string }> }).attrs.map((a) => a.name)).toEqual(["class"]);
  const cond = latteToIr(`<p n:if="$a > 1">x</p>`);
  expect(cond.error).toBeUndefined();
  expect(kinds(cond.nodes)).toEqual(["choice"]);
  const each = latteToIr(`<li n:foreach="$xs as $x">{$x}</li>`);
  expect(kinds(each.nodes)).toEqual(["loop"]);
  const inner = latteToIr(`<ul n:inner-foreach="$xs as $x"><li>{$x}</li></ul>`);
  const ul = inner.nodes[0] as IrNode & { kind: "element" };
  expect(ul.kind).toBe("element");
  expect(kinds(ul.children)).toEqual(["loop"]);
  expect(ul.attrs).toEqual([]);
});

test("latte: n:syntax=off and {syntax off} keep their braces as text", () => {
  const a = latteToIr(`<p n:syntax="off">{a} {if}</p>`);
  expect(a.error).toBeUndefined();
  const p = a.nodes[0] as IrNode & { kind: "element" };
  expect(p.children.map((c) => (c.kind === "text" ? c.text : c.kind)).join("")).toBe("{a} {if}");
  const b = latteToIr(`{syntax off}<b>{x}</b>{/syntax}`);
  expect(b.error).toBeUndefined();
});

test("latte: raw output: |noescape of children or a prop renders, of anything else is raw HTML; ui_attrs pairs are attributes", () => {
  expect(found(`{=$children|noescape}{=$p['body']|noescape}`)).toEqual([]);
  expect(found(`{=$html|noescape}`)).toEqual(["raw-html"]);
  expect(found(`{=ui_include('ui/button/button.latte', ['p' => ['Attrs' => ui_attrs(['aria-expanded', $v_open])]])|noescape}`)).toEqual(["reactive-aria"]);
});

test("latte: include and embed with named arguments are components", () => {
  const ir = latteToIr(`{include 'ui/text/text.latte', p: ['Size' => 'sm']}{embed 'ui/block/block.latte', p: ['Tag' => 'section']}x{/embed}`);
  expect(ir.error).toBeUndefined();
  expect(ir.nodes.map((n) => (n.kind === "component" ? n.name : n.kind))).toEqual(["Text", "Block"]);
});

test("latte: the rewrite keeps line numbers", () => {
  const src = `{* a\nb *}\n{if $a}\n<p>{=$x}</p>\n{/if}`;
  expect(latteAsTwig(src).split("\n").length).toBe(src.split("\n").length);
  const ir = latteToIr(src);
  expect(ir.nodes[0]!.line).toBe(3);
});
