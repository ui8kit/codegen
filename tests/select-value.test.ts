/**
 * Controlled Select: the live `value` is a DOM property (never serialized),
 * so SSR stays identical to the canonical `selected` markup while clients can
 * drive the selection. React must not warn about `selected` on <option>.
 */

import { describe, expect, it, spyOn } from "bun:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ensureGenerated } from "./support/ensure-generated";
import { syncValue } from "../runtime/ts/expr";

await ensureGenerated();
const { Select } = (await import("../generated/ui/select/select.tsx")) as {
  Select: ComponentType<Record<string, unknown>>;
};

const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

describe("react Select value", () => {
  for (const [id, extra] of [
    ["uncontrolled (defaultValue)", {}],
    ["controlled (value + onChange)", { onChange: () => {} }],
  ] as const) {
    it(`${id}: marks the option selected without React warnings`, () => {
      const err = spyOn(console, "error").mockImplementation(() => {});
      try {
        const html = renderToStaticMarkup(createElement(Select, { value: "b", options: OPTIONS, ...extra }));
        expect(html).toBe('<select><option value="a">A</option><option value="b" selected="">B</option></select>');
        expect(err).not.toHaveBeenCalled();
      } finally {
        err.mockRestore();
      }
    });
  }

  it("uses the array form for multiple", () => {
    const html = renderToStaticMarkup(createElement(Select, { value: "a", multiple: true, options: OPTIONS }));
    expect(html).toContain('<option value="a" selected="">A</option>');
  });
});

describe("syncValue", () => {
  it("sets the live value and leaves it alone for undefined", () => {
    const node = { value: "a" };
    const action = syncValue(node, "b");
    expect(node.value).toBe("b");
    action.update(undefined);
    expect(node.value).toBe("b");
    action.update("a");
    expect(node.value).toBe("a");
  });
});
