/**
 * Strict text parity guards. The parity suites compare text nodes verbatim
 * (tests/support/normalize.ts); these tests pin that strictness and the exact
 * textarea value contract every runtime is parity-tested against.
 */
import { describe, expect, it } from "bun:test";
import { parseFragment } from "parse5";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { bricks } from "../bricks/index";
import { renderPart } from "../src/domain/render";
import { normalizeHtml } from "./support/normalize";
import { Textarea } from "../generated/ui/textarea/textarea";

const textareaValue = (html: string): string => {
  const frag = parseFragment(html) as unknown as { childNodes: Array<{ childNodes?: Array<{ value?: string }> }> };
  return (frag.childNodes[0]?.childNodes ?? []).map((n) => n.value ?? "").join("");
};

const VALUE = "1 <Main> St\nApt 2";

describe("strict text parity", () => {
  it("whitespace around inline children is a mismatch", () => {
    expect(normalizeHtml("<a>\n  admin\n</a>")).not.toEqual(normalizeHtml("<a>admin</a>"));
    expect(normalizeHtml("<span> x</span>")).not.toEqual(normalizeHtml("<span>x</span>"));
  });

  it("formatting whitespace between sibling elements is ignored", () => {
    expect(normalizeHtml("<ul>\n  <li>a</li>\n</ul>")).toEqual(normalizeHtml("<ul><li>a</li></ul>"));
  });

  it("textarea value is exact in the canonical renderer and React", () => {
    const brick = bricks.find((b) => b.id === "ui.textarea")!;
    expect(textareaValue(renderPart(brick, "Textarea", { Value: VALUE }))).toBe(VALUE);
    expect(textareaValue(renderToStaticMarkup(createElement(Textarea, { value: VALUE } as never)))).toBe(VALUE);
  });

  it("textarea whitespace differences are parity failures", () => {
    expect(normalizeHtml(`<textarea>  ${VALUE}\n</textarea>`)).not.toEqual(normalizeHtml(`<textarea>${VALUE}</textarea>`));
  });
});
