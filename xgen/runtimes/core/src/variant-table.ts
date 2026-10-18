// Prints a variant table (shadcn/cva style) at the top of a generated component, from a `*.variants.json` spec.
// The spec stays the source of truth; the generated file reads like a hand-written shadcn component.

import { lowerFirst, pascalCase } from "./common";

/** the shape of a `*.variants.json` spec (bricks and recipes) */
export type RecipeLike = {
  base: string;
  keys: string[];
  defaults: Record<string, string>;
  byKey: Record<string, Record<string, string>>;
  compound?: Array<Record<string, string>>;
};

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const key = (k: string) => (IDENT.test(k) ? k : JSON.stringify(k));

/** `ui.badge` / `section-frame` -> `badgeVariants` / `sectionFrameVariants` */
export function variantsName(recipeId: string): string {
  return lowerFirst(pascalCase(recipeId.replace(/^ui\./, ""))) + "Variants";
}

/** a table with no base, no variants and no compounds adds no class: the component skips it */
export function isEmptyRecipe(recipe: RecipeLike): boolean {
  return !recipe.base.trim() && recipe.keys.length === 0 && !recipe.compound?.length;
}

/** generated lines stay short enough to read without scrolling (the readability check allows 160 characters) */
const WIDTH = 120;

/**
 * A class string as code. A long one is cut at spaces into `"a b " +` lines, each under the width, so the reader
 * never scrolls sideways; `pad` is the indentation of the continuation lines.
 */
export function printClassString(value: string, pad: string): string {
  const whole = JSON.stringify(value);
  if (whole.length <= WIDTH - pad.length) return whole;
  const chunks: string[] = [];
  let line = "";
  for (const word of value.split(" ")) {
    if (line && line.length + word.length + 1 > WIDTH - pad.length - 6) {
      chunks.push(line + " ");
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  chunks.push(line);
  return chunks.map((c) => JSON.stringify(c)).join(` +\n${pad}`);
}

/** `key: value` at an indentation; a long value moves to its own lines */
function entry(pad: string, k: string, value: string): string {
  const one = `${pad}${key(k)}: ${JSON.stringify(value)},`;
  if (one.length <= WIDTH) return one;
  return `${pad}${key(k)}:\n${pad}  ${printClassString(value, pad + "  ")},`;
}

/** one object on one line: `{ size: "24", variant: "default" }`, or one entry per line when it is long */
function inline(obj: Record<string, string>, pad = ""): string {
  const pairs = Object.entries(obj).map(([k, v]) => `${key(k)}: ${JSON.stringify(v)}`);
  if (!pairs.length) return "{}";
  const one = `{ ${pairs.join(", ")} }`;
  if (pad.length + one.length <= WIDTH) return one;
  return `{\n${Object.entries(obj).map(([k, v]) => entry(pad + "  ", k, v)).join("\n")}\n${pad}}`;
}

/** `const <name> = variants({ base, variants, defaultVariants, compoundVariants })`, one value per line */
export function printVariantTable(name: string, recipe: RecipeLike, exported = true): string {
  const lines = [`${exported ? "export " : ""}const ${name} = variants({`];
  if (recipe.base.trim()) lines.push(entry("  ", "base", recipe.base));
  lines.push(recipe.keys.length ? `  variants: {` : `  variants: {},`);
  for (const k of recipe.keys) {
    lines.push(`    ${key(k)}: {`);
    for (const [value, cls] of Object.entries(recipe.byKey[k] ?? {})) lines.push(entry("      ", value, cls));
    lines.push(`    },`);
  }
  if (recipe.keys.length) lines.push(`  },`);
  const defaults = Object.fromEntries(recipe.keys.filter((k) => recipe.defaults[k] !== undefined).map((k) => [k, recipe.defaults[k]!]));
  lines.push(`  defaultVariants: ${inline(defaults)},`);
  if (recipe.compound?.length) {
    lines.push(`  compoundVariants: [`);
    for (const c of recipe.compound) {
      const { class: cls = "", ...when } = c;
      lines.push(`    ${inline({ ...when, class: cls }, "    ")},`);
    }
    lines.push(`  ],`);
  }
  lines.push(`});`);
  return lines.join("\n");
}
