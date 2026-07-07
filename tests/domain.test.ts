/**
 * Domain unit tests: recipe composition, tag resolution, expression
 * evaluation, naming conventions, and definition validation.
 */

import { describe, expect, it } from "vitest";

import {
  and,
  boolToString,
  concat,
  cond,
  defaultIfEmpty,
  eq,
  intMapOr,
  isSet,
  lit,
  mapOr,
  not,
  oneOfOr,
  or,
  prop,
} from "../src/domain/expr";
import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  el,
  fwd,
  slot,
  type BrickDef,
} from "../src/domain/model";
import { htmlPropName, reactPropName } from "../src/domain/naming";
import { composeRecipe, RecipeError, validateRecipe, type VariantRecipe } from "../src/domain/recipe";
import { renderPart } from "../src/domain/render";
import { resolveTag, titleTag } from "../src/domain/tags";
import { DefinitionError, validateBrick } from "../src/domain/validate";

const recipe: VariantRecipe = {
  id: "test.button",
  base: "inline-flex px-2",
  keys: ["variant", "size"],
  defaults: { variant: "default", size: "default" },
  byKey: {
    variant: { default: "bg-primary", ghost: "bg-transparent" },
    size: { default: "h-10", sm: "h-8" },
  },
};

describe("recipe", () => {
  it("composes base, defaults, and extras in order", () => {
    expect(composeRecipe(recipe, {})).toBe("inline-flex px-2 bg-primary h-10");
    expect(composeRecipe(recipe, { variant: "ghost", size: "sm" }, "extra")).toBe(
      "inline-flex px-2 bg-transparent h-8 extra"
    );
  });

  it("caller classes win via tailwind-merge", () => {
    expect(composeRecipe(recipe, {}, "px-8")).toContain("px-8");
    expect(composeRecipe(recipe, {}, "px-8")).not.toContain("px-2");
  });

  it("throws on unknown variants (dev-strict, mirrors TS runtime)", () => {
    expect(() => composeRecipe(recipe, { variant: "nope" })).toThrow(RecipeError);
  });

  it("rejects empty-string keys and dangling defaults", () => {
    expect(() =>
      validateRecipe({ ...recipe, byKey: { ...recipe.byKey, variant: { "": "x" } } })
    ).toThrow(RecipeError);
    expect(() => validateRecipe({ ...recipe, defaults: { variant: "missing" } })).toThrow(
      RecipeError
    );
  });
});

describe("tags", () => {
  it("resolves allowed tags and falls back otherwise", () => {
    expect(resolveTag("ul", "div", "Stack")).toBe("ul");
    expect(resolveTag("nav", "div", "Stack")).toBe("div");
    expect(resolveTag("", "div", "Stack")).toBe("div");
    expect(resolveTag("SECTION", "div", "Layout")).toBe("section");
  });

  it("titleTag defaults to h2", () => {
    expect(titleTag(1)).toBe("h1");
    expect(titleTag(0)).toBe("h2");
    expect(titleTag(undefined)).toBe("h2");
    expect(titleTag(6)).toBe("h6");
  });
});

function testBrick(): BrickDef {
  return {
    id: "ui.test",
    dir: "test",
    docs: "Test brick.",
    recipes: { test: recipe },
    recipeFiles: { test: "test.variants.json" },
    parts: [
      {
        name: "Test",
        docs: "Test part.",
        recipeId: "test",
        classes: {
          recipe: { variant: "Variant", size: "Size" },
          state: [{ test: prop("Disabled"), classes: "opacity-50" }],
        },
        props: [
          { name: "Variant", type: "string", cva: true },
          { name: "Size", type: "string", cva: true },
          { name: "Class", type: "string" },
          { name: "Type", type: "string" },
          { name: "Disabled", type: "bool" },
          { name: "ID", type: "string", passthrough: true },
          { name: "Attrs", type: "attrs" },
          { name: "Children", type: "children" },
        ],
        render: el(
          "button",
          [
            attrExpr("type", oneOfOr(prop("Type"), ["submit", "reset"], "button")),
            attrClass(),
            attrBool("disabled", prop("Disabled")),
            fwd("id", "ID"),
            attrExpr("aria-checked", boolToString(prop("Disabled"))),
            attrRest(),
          ],
          [slot()]
        ),
      },
    ],
  };
}

describe("canonical renderer", () => {
  const brick = testBrick();

  it("renders the full attribute contract", () => {
    const html = renderPart(brick, "Test", { Variant: "ghost" }, { children: "Hi" });
    expect(html).toBe(
      '<button type="button" class="inline-flex px-2 bg-transparent h-10" aria-checked="false">Hi</button>'
    );
  });

  it("boolean attrs are present/absent; ARIA states always stringified", () => {
    const on = renderPart(brick, "Test", { Disabled: true });
    expect(on).toContain(" disabled");
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain("opacity-50");
    const off = renderPart(brick, "Test", {});
    expect(off).not.toContain("disabled");
    expect(off).toContain('aria-checked="false"');
  });

  it("omits empty string attrs, keeps rest-spread last (caller wins)", () => {
    const html = renderPart(brick, "Test", { ID: "x" }, { rest: { id: "y", "data-a": "1" } });
    expect(html).toContain('id="y"');
    expect(html).toContain('data-a="1"');
    expect(renderPart(brick, "Test", {})).not.toContain("id=");
  });

  it("escapes text children and attribute values", () => {
    const html = renderPart(brick, "Test", { ID: "a<b" }, { children: undefined });
    expect(html).toContain("a&lt;b");
  });
});

describe("expressions", () => {
  const brick = testBrick();
  const cases: Array<[string, unknown, string]> = [
    ["defaultIfEmpty", defaultIfEmpty(lit("  "), "text"), "text"],
    ["mapOr", mapOr(lit("q"), { a: "b" }, "z"), "z"],
    ["intMapOr fallback", intMapOr(lit(99), { 1: "one" }, "none"), "none"],
    ["concat trims", concat(lit(" a "), lit(" b ")), "ab"],
    ["cond", cond(lit(true), lit("x"), lit("y")), "x"],
    ["bool algebra", cond(and(lit(true), or(lit(false), not(lit(false)))), lit("t"), lit("f")), "t"],
    ["eq", cond(eq(lit("a"), lit("a")), lit("t"), lit("f")), "t"],
    ["isSet blank", cond(isSet(lit("  ")), lit("t"), lit("f")), "f"],
  ];
  for (const [name, expr, expected] of cases) {
    it(name, () => {
      const html = renderPart(
        {
          ...brick,
          parts: [
            {
              name: "E",
              docs: "expr",
              props: [],
              render: el("i", [attrExpr("data-x", expr as never, { keepEmpty: true })], []),
            },
          ],
        },
        "E"
      );
      expect(html).toBe(`<i data-x="${expected}"></i>`);
    });
  }
});

describe("naming", () => {
  it("maps canonical names per runtime family", () => {
    expect(reactPropName({ name: "Class", type: "string" })).toBe("className");
    expect(reactPropName({ name: "HTMLFor", type: "string" })).toBe("htmlFor");
    expect(reactPropName({ name: "AriaLabel", type: "string" })).toBe("aria-label");
    expect(htmlPropName({ name: "Class", type: "string" })).toBe("class");
    expect(htmlPropName({ name: "HTMLFor", type: "string" })).toBe("for");
    expect(htmlPropName({ name: "AriaLabel", type: "string" })).toBe("aria-label");
    expect(htmlPropName({ name: "DataUI8Kit", type: "string" })).toBe("data-ui8kit");
  });
});

describe("validation", () => {
  it("accepts the reference brick", () => {
    expect(() => validateBrick(testBrick())).not.toThrow();
  });

  it("rejects passthrough props referenced by expressions", () => {
    const brick = testBrick();
    brick.parts[0]!.props.find((p) => p.name === "Type")!.passthrough = true;
    expect(() => validateBrick(brick)).toThrow(DefinitionError);
  });

  it("rejects passthrough forwards with mismatched attribute names", () => {
    const brick = testBrick();
    const render = brick.parts[0]!.render;
    if (render.kind === "element") {
      render.attrs = render.attrs.map((a) =>
        a.kind === "expr" && a.name === "id" ? { ...a, name: "data-id" } : a
      );
    }
    expect(() => validateBrick(brick)).toThrow(/native attribute/);
  });

  it("rejects cva props without a recipe key", () => {
    const brick = testBrick();
    brick.parts[0]!.props.push({ name: "Tone", type: "string", cva: true });
    expect(() => validateBrick(brick)).toThrow(DefinitionError);
  });

  it("rejects slot usage without a children prop", () => {
    const brick = testBrick();
    brick.parts[0]!.props = brick.parts[0]!.props.filter((p) => p.type !== "children");
    expect(() => validateBrick(brick)).toThrow(/children/);
  });
});
