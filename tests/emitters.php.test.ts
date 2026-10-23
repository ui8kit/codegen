/** Twig / Latte emitter conventions (DOM parity: tests/parity.{twig,latte}.test.ts). */

import { describe, expect, it } from "bun:test";

import { bricks } from "../bricks/index";
import { generateFiles } from "../src/application/generate";

const files = await generateFiles(bricks);
const file = (path: string): string => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing generated file: ${path}`);
  return f.contents;
};
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("twig emitter", () => {
  const button = file("twig/ui/button/Button.html.twig");
  const select = file("twig/ui/select/Select.html.twig");
  const text = file("twig/ui/text/Text.html.twig");

  it("prints children raw (trusted HTML) and repeats the slot per branch", () => {
    expect(count(button, "{{ children|raw }}")).toBe(2);
    expect(button).not.toMatch(/asChild|Slot/);
  });

  it("exposes classes helpers instead of asChild", () => {
    expect(button).toContain("ui8kit_classes('buttonClasses', {");
    expect(file("twig/src/Classes.php")).toContain("public static function buttonClasses(array $p = []): string");
    expect(file("twig/src/TwigExtension.php")).toContain("new TwigFunction('ui8kit_classes'");
  });

  it("loops Select options and branches dynamic tags", () => {
    expect(select).toContain("{% for item in options %}");
    expect(select).toContain("((item.value ?? '') is same as(value))");
    expect(text).toContain("{% set uiTag = ui8kit_resolve_tag(tag, 'p', 'Text') %}");
    expect(text).toContain("{% elseif (uiTag is same as('h1')) %}");
  });

  it("ships a Composer package with the parity harness and rules", () => {
    expect(file("twig/composer.json")).toContain('"twig/twig"');
    expect(file("twig/bin/parity.php")).toContain("'autoescape' => 'html'");
    expect(file("rules/twig/rules.json")).toContain("**/*.twig");
  });
});

describe("latte emitter", () => {
  const button = file("latte/ui/button/Button.latte");
  const select = file("latte/ui/select/Select.latte");

  it("declares typed parameters and prints children with |noescape", () => {
    expect(button).toContain("string $ariaLabel = '',");
    expect(button).toContain("array $attrs = [],");
    expect(count(button, "{$children|noescape}")).toBe(2);
  });

  it("spreads caller attrs last and uses the Classes helper", () => {
    expect(button).toContain("...$attrs,");
    expect(button).toContain("\\UI8Kit\\Latte\\Classes::buttonClasses([");
    expect(select).toContain("{foreach $options as $item}");
  });

  it("ships a Composer package with the parity harness and rules", () => {
    expect(file("latte/composer.json")).toContain('"latte/latte"');
    expect(file("latte/src/Rt.php")).toContain("namespace UI8Kit\\Latte;");
    expect(files.some((f) => f.path === "latte/src/TwigExtension.php")).toBe(false);
    expect(file("rules/latte/rules.json")).toContain("**/*.latte");
  });
});
