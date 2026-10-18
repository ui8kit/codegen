import { expect, test } from "bun:test";
import { templToIr } from "../src/rules/templ";
import { detect } from "../src/rules/detectors";

const file = (body: string, extra = ""): string => `package blocks\n\nimport (\n\t"x/ui/block"\n\t"x/ui/text"\n)\n\ntempl Card(p CardProps) {\n${body}\n}\n${extra}`;
const ctx = { blockRoot: true, rootsOnBlock: () => undefined };

test("templ: if / else if / else is one choice of three branches, a for is a loop", () => {
  const ir = templToIr(file(`\tif p.A {\n\t\t@block.Block(block.BlockProps{}) {\n\t\t}\n\t} else if p.B {\n\t\t<p>{ p.X }</p>\n\t} else {\n\t}\n\tfor _, x := range p.Items {\n\t\t@text.Text(text.TextProps{}) {\n\t\t\t{ x }\n\t\t}\n\t}`));
  expect(ir.error).toBeUndefined();
  expect(ir.nodes[0]!.kind).toBe("choice");
  expect((ir.nodes[0] as { branches: unknown[] }).branches.length).toBe(3);
  expect(ir.nodes[1]!.kind).toBe("loop");
});

test("templ: switch cases are branches; slots render; templ.Raw is raw HTML; Attrs pairs are attributes", () => {
  const ir = templToIr(file(`\t@block.Block(block.BlockProps{Attrs: uiutils.Attrs("aria-expanded", p.Open)}) {\n\t\tswitch p.Tone {\n\t\tcase "a":\n\t\t\t@p.Actions\n\t\tdefault:\n\t\t\t@templ.Raw(p.Html)\n\t\t}\n\t}`));
  const found = detect(ir, ctx).map((f) => f.detector).sort();
  expect(found).toEqual(["raw-html", "reactive-aria"]);
});

test("templ: the templ named after the file is rendered, the other templs are detached", () => {
  const ir = templToIr(file(`\t@CardFill1(p)`, `\ntempl CardFill1(p CardProps) {\n\t<div></div>\n}\n`), "/x/card.templ");
  expect(ir.nodes[0]!.kind).toBe("component");
  expect(ir.nodes[1]!.kind).toBe("detached");
  expect(detect(ir, ctx).map((f) => f.message)).toEqual(["root is <CardFill1>, not Block", "raw <div>"]);
});

test("templ: literal text in markup and in a props literal is found", () => {
  const ir = templToIr(file(`\t@block.Block(block.BlockProps{AriaLabel: "Main card"}) {\n\t\tSave\n\t}`));
  expect(detect(ir, ctx).filter((f) => f.detector === "literal-text").length).toBe(2);
});

test("templ: a doctype and a lone < do not stop the reader", () => {
  const ir = templToIr("package x\n\ntempl Page() {\n\t<!doctype html>\n\t<html lang=\"en\"><body>a < b</body></html>\n}\n");
  expect(ir.error).toBeUndefined();
  expect(ir.nodes[0]!.kind).toBe("element");
});

test("templ: a single-line import names its package", () => {
  const ir = templToIr("package x\n\nimport \"m/ui/block\"\n\ntempl Page() {\n\t@block.Block(block.BlockProps{}) {\n\t}\n}\n");
  expect(ir.nodes[0]!.kind).toBe("component");
});
