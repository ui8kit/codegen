import { expect, test } from "bun:test";
import { printVariantTable, variantsName } from "../src/variant-table";
import { variants } from "../assets/ts/variants";

const recipe = {
  base: "inline-flex",
  keys: ["size", "shape"],
  defaults: { size: "sm", shape: "pill" },
  byKey: { size: { sm: "h-5 px-2", lg: "h-8 px-3" }, shape: { pill: "rounded-full", box: "" } },
  compound: [{ size: "lg|xl", shape: "box", class: "rounded-lg px-4" }],
};

test("a variant table prints like a shadcn component and composes like the recipe", () => {
  expect(variantsName("ui.badge")).toBe("badgeVariants");
  expect(variantsName("section-frame")).toBe("sectionFrameVariants");
  const code = printVariantTable("badgeVariants", recipe);
  expect(code.split("\n")[0]).toBe("export const badgeVariants = variants({");
  expect(code).toContain(`defaultVariants: { size: "sm", shape: "pill" },`);
  const badge = variants({ base: recipe.base, variants: recipe.byKey, defaultVariants: recipe.defaults, compoundVariants: recipe.compound });
  expect(badge()).toBe("inline-flex h-5 px-2 rounded-full");
  // base, then each variant in table order, then the matching compounds; tailwind-merge keeps the later class
  expect(badge({ size: "lg", shape: "box" })).toBe("inline-flex h-8 rounded-lg px-4");
});

test("long class strings wrap under the readability width", () => {
  const long = Array.from({ length: 40 }, (_, i) => `class-${i}`).join(" ");
  const code = printVariantTable("x", { base: long, keys: [], defaults: {}, byKey: {} });
  for (const line of code.split("\n")) expect(line.length).toBeLessThanOrEqual(120);
});
