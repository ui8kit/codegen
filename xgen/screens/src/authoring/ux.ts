// Small builders every authoring file shares: muted and strong text, a titled stack, a tab list.
import { cn, cond, eq, op, ref, text, use, organism } from "../build";
import type { Value, ViewNode } from "../ir";
import { kids } from "./forms";

/** a muted paragraph */
export const muted = (v: Value, size = "sm", cls = ""): ViewNode => use("Text", { props: { Size: size, Class: cls ? cn("text-muted-foreground", cls) : "text-muted-foreground" } }, text(v));
/** a strong line */
export const strong = (v: Value, size = "base", weight = "semibold"): ViewNode => use("Text", { props: { Size: size, Weight: weight } }, text(v));
/** a strong line inside phrasing content (summary, button, label, span): a span, not a paragraph */
export const strongSpan = (v: Value, size = "base", weight = "semibold"): ViewNode => use("Inline", { props: { Class: `text-${size} font-${weight}` } }, text(v));
/** a heading below the section heading */
export const heading = (v: Value, size = "xl", as = 3): ViewNode => use("Title", { props: { As: as, Size: size, Weight: "bold" } }, text(v));
/** a card surface: the radius, ring and fill of every boxed block */
export const surface = (extra = ""): string => `rounded bg-card inset-ring inset-ring-border ${extra}`.trim();
/** a tab list of the Switcher pattern; `active` tells which item is selected */
export const tabList = (label: Value, items: Value, as: string, nameOf: string, active: (item: Value) => Value): ViewNode =>
  organism("Switcher", { label }, kids({ each: items, as, key: ref(`${as}.id`), do: [organism("SwitcherItem", { active: active(ref(as)) }, kids(text(ref(`${as}.${nameOf}`))))] } as ViewNode));
export const is = (axis: string, v: string): Value => eq(ref(axis), v);
/** a fixed column count that gives way on a phone: 2 stays 2, 3 and 4 start at two columns, 6 at three */
export const fluidCols = (cols: Value): Value => cond(eq(cols, "2"), "2", cond(eq(cols, "3"), "2-3", cond(eq(cols, "4"), "2-4", "3-6")));

/** a column variant capped by the number of items (the fitCols helper of the runtimes), so a grid never keeps an empty column */
export const fitCols = (cols: Value, n: Value): Value => op("fitCols", cols, n);
