// The table layout of CartList (CartTable): one row per line with its quantity field and a remove button.
import { call, tpl, cn, cond, each, eq, firstOf, gt, len, mul, money, ref, str, sumBy, text, use, when, organism } from "../../build";
import { spec, ts } from "../kit";
import { tsOf, denseLite } from "../props";

/** the table layout of CartList: one row per line with its quantity field and a remove button */
export const cartTable = spec("pattern.cart-table", "CartTable", "The lines of a cart as a table (the table layout of CartList): product, price, quantity, line total and a remove button.", {
  typeImports: [{ from: "CartList", names: ["CartLine", "CartLabels"] }],
  props: [
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "labels", type: ts("CartLabels"), required: true },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "density", type: denseLite, default: "default" },
    { name: "field", type: "string", default: "qty", docs: "prefix of the quantity field names (one name per line: <field>-<line id>)" },
  ],
  events: [{ name: "remove", args: [{ name: "id", type: "string" }], docs: "the remove button of a line was pressed" }],
  view: [
    use("Box", { props: { Class: "w-full overflow-x-auto" } },
  use("Table", { props: { Class: "w-full text-left text-sm" }, attrs: { "data-testid": "cart-table" } },
    use("TableCaption", { props: { Class: "sr-only" } }, text(ref("labels.caption"))),
    use("TableHead", {}, use("TableRow", {},
      use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.product"))),
      use("TableHeadCell", { props: { Scope: "col", Class: "hidden py-2 sm:table-cell" } }, text(ref("labels.price"))),
      use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.qty"))),
      use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.total"))),
      use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, use("Inline", { props: { Class: "sr-only" } }, text(ref("labels.remove")))))),
    use("TableBody", {}, each(ref("lines"), "line", ref("line.id"),
      use("TableRow", { props: { Class: "border-t border-border" }, attrs: { "data-testid": "item" } },
        use("TableCell", { props: { Class: cn(cond(eq(ref("density"), "compact"), "py-2", "py-4")) } },
          use("Group", { props: { Gap: "4", Align: "center" } },
            when(eq(ref("media"), "image"), [organism("MediaFrame", { alt: ref("line.name"), ratio: "1/1", className: "hidden size-14 shrink-0 sm:block" })]),
            use("Stack", { props: { Gap: "0" } },
              use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("line.name"))),
              use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("line.variant")))))),
        use("TableCell", { props: { Class: "hidden sm:table-cell" } }, text(money(ref("line.price"), ref("line.currency")))),
        use("TableCell", { props: { Class: "" } }, organism("NumberField", { value: str(ref("line.qty")), name: tpl("{0}-{1}", ref("field"), ref("line.id")), min: "1", label: ref("labels.qty"), decrease: ref("labels.decrease"), increase: ref("labels.increase") })),
        use("TableCell", { props: { Class: "font-semibold" } }, text(money(mul(ref("line.price"), ref("line.qty")), ref("line.currency")))),
        use("TableCell", { props: { Class: "text-right" } }, use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", AriaLabel: ref("labels.remove") }, on: { click: call("emit.remove", ref("line.id")) }, attrs: { "data-testid": "remove" } }, use("LucideIcon", { props: { Name: "x", Size: 16 } })))))))),
    when(gt(len(ref("lines")), 0), [use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "mt-4 flex-wrap border-t border-border pt-4" }, attrs: { "data-testid": "cart-footer" } },
      use("Text", { props: { Size: "base", Weight: "bold" }, attrs: { "data-testid": "subtotal" } }, text(ref("labels.subtotal")), text(" "), text(money(sumBy(ref("lines"), "price", "qty"), firstOf(ref("lines"), "currency")))),
      use("Button", { props: { Variant: "default", Size: "default" }, attrs: { "data-testid": "checkout" } }, text(ref("labels.checkout"))))]),
  ],
});
