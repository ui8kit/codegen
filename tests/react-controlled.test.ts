/**
 * React boolean props are forwarded as-is: `checked={false}` stays controlled
 * (React warns/treats `checked={undefined}` as uncontrolled), and SSR still
 * omits false boolean attributes so DOM parity is unchanged.
 */
import { describe, expect, it } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Checkbox } from "../generated/ui/checkbox/checkbox";
import { Radio } from "../generated/ui/radio/radio";

/** Unwrap forwardRef and call the render fn to inspect the host element props. */
function hostProps(comp: unknown, props: Record<string, unknown>): Record<string, unknown> {
  const render = (comp as { render: (p: unknown, r: unknown) => ReactElement }).render;
  return render(props, null).props as Record<string, unknown>;
}

describe("React controlled booleans", () => {
  for (const [name, comp] of [["Checkbox", Checkbox], ["Radio", Radio]] as const) {
    it(`${name}: checked={false} is forwarded as false (controlled)`, () => {
      const p = hostProps(comp, { checked: false, onChange: () => {} });
      expect("checked" in p).toBe(true);
      expect(p["checked"]).toBe(false);
    });
    it(`${name}: omitted checked stays undefined (uncontrolled)`, () => {
      expect(hostProps(comp, {})["checked"]).toBeUndefined();
    });
    it(`${name}: SSR omits false and prints true`, () => {
      const off = renderToStaticMarkup(createElement(comp as never, { checked: false, onChange: () => {} }));
      const on = renderToStaticMarkup(createElement(comp as never, { checked: true, onChange: () => {} }));
      expect(off).not.toContain("checked");
      expect(on).toContain('checked=""');
    });
  }
});
