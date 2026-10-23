/**
 * Every brick · part · showcase case (the canonical DOM that all 9 runtimes are parity-tested against) is valid HTML5
 * (html-validate) and passes axe-core, rendered in the minimal context the element needs (a label for a control,
 * <ul> for <li>, <picture> for <source>, a <summary> in <details>, a submit button in <form>).
 */
import { describe, expect, it } from "bun:test";
import { bricks } from "../bricks/index";
import { renderPart } from "../src/domain/render";
import { showcaseCases } from "./support/fixtures";
import { hasChildren, knownCanonicalProps, type CanonicalProps } from "./support/props";
import { htmlProblems } from "./support/html-gate";

const CONTROLS = new Set(["Input", "Textarea", "Select", "Checkbox", "Radio"]);
const CHILDREN: Record<string, string> = {
  Disclosure: "<summary>More</summary>Content",
  Form: '<label>Name <input type="text" name="n"></label><button type="submit">Send</button>',
  Select: '<option value="a">A</option>',
};

function inContext(part: string, props: CanonicalProps, html: (p: CanonicalProps, children?: string) => string, withChildren: boolean): string {
  const p = { ...props } as Record<string, unknown>;
  if (part === "Image" && !p.Src) p.Src = "/p.png";
  if (part === "Image" && !p.Alt) p.Alt = "Picture";
  const inner = html(p as CanonicalProps, withChildren ? (CHILDREN[part] ?? "Content") : undefined);
  if (CONTROLS.has(part)) return `<label>Field ${inner}</label>`;
  if (part === "Source") return `<picture>${inner}<img src="/p.png" alt="Picture"></picture>`;
  if (/<li\b/.test(inner.slice(0, 4))) return `<ul>${inner}</ul>`;
  return inner;
}

for (const brick of bricks) {
  describe(`html-a11y ${brick.id}`, () => {
    for (const part of brick.parts) {
      const cases = [{ id: "defaults", props: {} as CanonicalProps }, ...showcaseCases(brick)
        .map((c) => ({ id: c.id, props: knownCanonicalProps(brick, part, c.props) }))
        .filter((c): c is { id: string; props: CanonicalProps } => c.props !== undefined && Object.keys(c.props).length > 0)];
      for (const c of cases) {
        it(`${part.name} · ${c.id}`, async () => {
          const html = inContext(part.name, c.props, (p, children) => renderPart(brick, part.name, p, { children }), hasChildren(part));
          expect(await htmlProblems(html), html).toEqual([]);
        });
      }
    }
  });
}
