// Builder of view structures from primitives. The organisms and screens of xgen/specs are written with these functions
// (src/authoring) and stored as JSON; `xgen check` fails when the stored JSON differs from what the builder returns.
import type { Handler, SlotFill, Value, ViewNode } from "./ir";

export const ref = (path: string): Value => ({ $: path });
export const op = (name: string, ...args: Value[]): Value => ({ op: name, args });
export const eq = (a: Value, b: Value) => op("eq", a, b);
export const not = (a: Value) => op("not", a);
export const and = (...a: Value[]) => op("and", ...a);
export const or = (...a: Value[]) => op("or", ...a);
export const cond = (t: Value, a: Value, b: Value) => op("cond", t, a, b);
export const add = (a: Value, b: Value) => op("add", a, b);
export const mul = (a: Value, b: Value) => op("mul", a, b);
export const div = (a: Value, b: Value) => op("div", a, b);
export const money = (a: Value, b: Value) => op("money", a, b);
export const sumBy = (items: Value, a: string, b: string) => op("sumBy", items, a, b);
export const firstOf = (items: Value, field: string) => op("firstOf", items, field);
export const count = (items: Value, field: string) => op("count", items, field);
export const where = (items: Value, field: string, value: Value) => op("where", items, field, value);
export const match = (items: Value, field: string, value: Value) => op("match", items, field, value);
export const len = (a: Value) => op("len", a);
export const pick = (items: Value, id: Value) => op("pick", items, id);
export const round = (a: Value) => op("round", a);
export const num = (n: number): Value => n;
export const lt = (a: Value, b: Value) => op("lt", a, b);
export const sub = (a: Value, b: Value) => op("sub", a, b);
export const le = (a: Value, b: Value) => op("le", a, b);
export const ge = (a: Value, b: Value) => op("ge", a, b);
export const gt = (a: Value, b: Value) => op("gt", a, b);
export const ne = (a: Value, b: Value) => op("ne", a, b);
export const cn = (...a: Value[]) => op("cn", ...a);
/** a value of a kit preset (specs/presets): preset("defaults", "hero.band") */
export const preset = (name: string, path: string): Value => op("preset", name, path);
export const coalesce = (...a: Value[]) => op("coalesce", ...a);
export const str = (a: Value) => op("str", a);
export const words = (a: Value) => op("words", a);
export const nbsp = (a: Value) => op("nbsp", a);
/** drop a ", " segment equal (case-insensitive) to the one before it */
export const uniq = (a: Value) => op("uniq", a);
export const nth = (a: Value, i: Value) => op("nth", a, i);
export const has = (a: Value) => op("has", a);
export const undef = (): Value => op("undef");
export const at = (a: Value, b: Value) => op("at", a, b);
export const list = (...items: Value[]): Value => op("list", ...items);
export const tpl = (template: Value, ...values: Value[]) => op("tpl", template, ...values);

export const call = (name: string, ...args: Value[]): Handler => ({ call: name, args });

type Opts = { props?: Record<string, Value>; attrs?: Record<string, Value>; on?: Record<string, Handler> };
export const use = (name: string, opts: Opts = {}, ...children: ViewNode[]): ViewNode => ({
  use: name,
  ...(opts.props ? { props: opts.props } : {}),
  ...(opts.attrs ? { attrs: opts.attrs } : {}),
  ...(opts.on ? { on: opts.on } : {}),
  ...(children.length ? { children } : {}),
});
export const text = (v: Value): ViewNode => ({ text: v });
export const when = (test: Value, then: ViewNode[], otherwise?: ViewNode[]): ViewNode => ({ when: test, then, ...(otherwise ? { else: otherwise } : {}) });
export const each = (items: Value, as: string, key: Value, ...body: ViewNode[]): ViewNode => ({ each: items, as, key, do: body });
/** a loop that also names its index */
export const eachAt = (items: Value, as: string, index: string, key: Value, ...body: ViewNode[]): ViewNode => ({ each: items, as, key, do: body, index });
export const slot = (name: string, ...args: Value[]): ViewNode => ({ slot: name, ...(args.length ? { args } : {}) });
export const organism = (name: string, props: Record<string, Value>, extra: { on?: Record<string, Handler>; slots?: Record<string, SlotFill> } = {}): ViewNode => ({ organism: name, props, ...(extra.on ? { on: extra.on } : {}), ...(extra.slots ? { slots: extra.slots } : {}) });
export const outlet = (): ViewNode => ({ outlet: true });
/** a part of the screen layout (ScreenSpec.parts): its own file next to the screen */
export const part = (name: string): ViewNode => ({ part: name });

/** a sortable column header: three static aria-sort branches (ascending, descending, none), because ARIA state is never computed */
export function sortHeader(field: string, label: Value, align: "start" | "end" = "start"): ViewNode {
  const cls = align === "end" ? "text-right" : "";
  const button = (): ViewNode => use("Button", { props: { Variant: "ghost", Size: "sm", Class: align === "end" ? "-mx-2 ml-auto px-2" : "-mx-2 px-2" }, on: { click: call("actions.sort", field) } }, text(label));
  const cell = (aria: string): ViewNode => use("TableHeadCell", { props: { Scope: "col", Class: cls }, attrs: { "aria-sort": aria } }, button());
  return when(and(eq(ref("view.sort.field"), field), eq(ref("view.sort.dir"), "asc")), [cell("ascending")],
    [when(and(eq(ref("view.sort.field"), field), eq(ref("view.sort.dir"), "desc")), [cell("descending")], [cell("none")])]);
}

/** a slot fill that passes on a slot of the enclosing organism (`icon={icon}`), so its content is not repeated */
export const forward = (slotName: string): SlotFill => ({ args: [], do: [], forward: slotName });
