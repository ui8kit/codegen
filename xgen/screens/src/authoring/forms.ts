// Helpers for the organisms that hold a form: ids that tie a label to its control, a field with an input, the buttons.
import { cn, cond, ref, text, tpl, use, organism } from "../build";
import type { Value, ViewNode } from "../ir";

/** children of an organism that takes `children` */
export const kids = (...n: ViewNode[]) => ({ slots: { children: { args: [] as string[], do: n } } });
/** the id of a control: `<id>-<name>` */
export const fid = (name: string): Value => tpl(`{0}-${name}`, ref("id"));
/** a labelled single-line field */
export const inputField = (name: string, type: string, label: Value, auto?: Value, scoped = false): ViewNode =>
  organism("Field", { label, htmlFor: fid(name) }, kids(use("Input", { props: { Type: type, Name: scoped ? fid(name) : name, ...(auto === undefined ? {} : { Autocomplete: auto }) }, attrs: { id: fid(name), "data-testid": "field" } })));
/** (a field outside a form takes its id as its name, `scoped`, so the name stays unique on the page) */
/** a labelled multi-line field */
export const textField = (name: string, label: Value): ViewNode =>
  organism("Field", { label, htmlFor: fid(name) }, kids(use("Textarea", { props: { Rows: 4, Name: name }, attrs: { id: fid(name), "data-testid": "field" } })));
/** a checkbox with its label on the right */
export const checkRow = (name: string, label: Value, extra: Value = ""): ViewNode =>
  use("Group", { props: { Gap: "2", Align: "center", Class: cn("w-fit", extra) } },
    use("Checkbox", { props: { Name: name }, attrs: { id: fid(name) } }),
    use("Label", { props: { HTMLFor: fid(name), Class: "text-sm" } }, text(label)));
/** a switch with its label */
export const switchRow = (name: string, label: Value): ViewNode =>
  use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } },
    use("Label", { props: { HTMLFor: fid(name), Class: "text-sm" } }, text(label)),
    use("Switch", { props: { Name: name }, attrs: { id: fid(name) } }));

/** an email field and a button on one row (or a column): the sign-up used by the hero, the call to action and the footer */
export const emailRow = (label: Value, submit: Value, center: Value) =>
  use("Form", { props: { Method: "dialog", Class: cn("w-full max-w-md", cond(center, "mx-auto", "")) }, attrs: { "data-testid": "email-form" } },
    use("Label", { props: { HTMLFor: fid("email"), Class: "sr-only" } }, text(label)),
    use("Group", { props: { Gap: "2", Align: "start", Class: "w-full flex-wrap" } },
      use("Input", { props: { Type: "email", Name: "email", Class: "min-w-0 flex-1" }, attrs: { id: fid("email"), "data-testid": "field" } }),
      use("Button", { props: { Variant: "default", Size: "default", Type: "submit" }, attrs: { "data-testid": "submit" } }, text(submit))));
