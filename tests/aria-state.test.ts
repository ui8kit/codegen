/**
 * Semantic ARIA state props (tri-state bools): Button `Pressed` / `Expanded` → aria-pressed / aria-expanded,
 * "true"/"false" when set, omitted when unset, raw `AriaPressed` / `AriaExpanded` / Attrs still win.
 * Parity of the same cases in all 9 targets: the Button showcase fixtures (parity*.test.ts).
 * Separator: <hr> keeps its implicit role, never a redundant role="separator".
 */

import { describe, expect, it } from "bun:test";

import { bricks } from "../bricks/index";
import { optBoolToString, prop } from "../src/domain/expr";
import { attrExpr, el, type BrickDef } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { DefinitionError, validateBrick } from "../src/domain/validate";

const brick = (id: string) => bricks.find((b) => b.id === id)!;
const button = brick("ui.button");
const render = (props: Record<string, unknown>) => renderPart(button, "Button", props as never, { children: "x" });

describe("Button semantic state props", () => {
  it("Pressed: true / false print aria-pressed, unset omits it", () => {
    expect(render({ Pressed: true })).toBe('<button type="button" aria-pressed="true">x</button>');
    expect(render({ Pressed: false })).toBe('<button type="button" aria-pressed="false">x</button>');
    expect(render({})).toBe('<button type="button">x</button>');
  });

  it("Expanded: true / false print aria-expanded on button and anchor", () => {
    expect(render({ Expanded: true })).toBe('<button type="button" aria-expanded="true">x</button>');
    expect(render({ Expanded: false })).toBe('<button type="button" aria-expanded="false">x</button>');
    expect(render({ Href: "/m", Expanded: false })).toBe('<a href="/m" aria-expanded="false">x</a>');
  });

  it("Pressed applies only in button mode (no toggle role on links)", () => {
    expect(render({ Href: "/m", Pressed: true })).toBe('<a href="/m">x</a>');
  });

  it("raw AriaPressed / Attrs win over Pressed; a blank one falls back to Pressed", () => {
    expect(render({ Pressed: true, AriaPressed: "mixed" })).toBe('<button type="button" aria-pressed="mixed">x</button>');
    expect(render({ Pressed: true, AriaPressed: "  " })).toBe('<button type="button" aria-pressed="true">x</button>');
    expect(renderPart(button, "Button", { Pressed: true } as never, { children: "x", rest: { "aria-pressed": "false" } })).toBe(
      '<button type="button" aria-pressed="false">x</button>'
    );
  });

  it("the spec exports Pressed / Expanded as nullable bools", () => {
    const part = button.parts[0]!;
    for (const name of ["Pressed", "Expanded"]) {
      const p = part.props.find((x) => x.name === name);
      expect(p?.type).toBe("bool");
      expect(p?.nullable).toBe(true);
    }
  });
});

describe("nullable bool validation", () => {
  const withRender = (render: BrickDef["parts"][number]["render"], nullable = true): BrickDef => ({
    id: "test.tri",
    dir: "tri",
    docs: "t",
    recipes: {},
    recipeFiles: {},
    parts: [
      {
        name: "Tri",
        docs: "t",
        props: [{ name: "On", type: "bool", cva: false, nullable }],
        render,
      },
    ],
  });

  it("accepts optBoolToString over a nullable bool", () => {
    expect(() => validateBrick(withRender(el("button", [attrExpr("aria-pressed", optBoolToString(prop("On")))], [])))).not.toThrow();
  });

  it("rejects a nullable bool referenced outside optBoolToString", () => {
    expect(() => validateBrick(withRender(el("button", [attrExpr("data-on", prop("On"))], [])))).toThrow(DefinitionError);
  });

  it("rejects optBoolToString over a plain bool", () => {
    expect(() => validateBrick(withRender(el("button", [attrExpr("aria-pressed", optBoolToString(prop("On")))], []), false))).toThrow(
      /nullable bool/
    );
  });
});

describe("Separator ARIA", () => {
  const separator = brick("ui.separator");
  const hr = (props: Record<string, unknown>) => renderPart(separator, "Separator", props as never);

  it("never prints a redundant role=separator on <hr> (implicit role)", () => {
    for (const props of [{}, { Orientation: "horizontal" }, { Orientation: "vertical" }, { Decorative: true }]) {
      expect(hr(props)).not.toContain('role="separator"');
    }
  });

  it("vertical adds aria-orientation; decorative is role=none without orientation", () => {
    expect(hr({ Orientation: "vertical" })).toBe('<hr aria-orientation="vertical">');
    expect(hr({ Decorative: true, Orientation: "vertical" })).toBe('<hr role="none">');
  });
});
