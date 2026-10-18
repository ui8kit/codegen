// The table layout of OrderTable (OrderRows): number, date, items, total and a status pill per order.
import { at, cn, cond, each, eq, money, ref, text, tpl, use, organism } from "../../build";
import { spec, ts } from "../kit";
import { denseLite } from "../props";
import { kids } from "../forms";

const P = "pattern.";
/** the pill color of an order status */
export const statusTone = cond(eq(ref("o.status"), "paid"), "green", cond(eq(ref("o.status"), "shipped"), "blue", cond(eq(ref("o.status"), "pending"), "amber", "gray")));

export const orderRows = spec(`${P}order-rows`, "OrderRows", "The orders as a table (the table layout of OrderTable): number, date, items, total and a status pill.", {
  typeImports: [{ from: "OrderTable", names: ["Order", "OrderLabels"] }],
  props: [
    { name: "orders", type: ts("Order[]"), required: true },
    { name: "statuses", type: ts("Record<string, string>"), required: true, docs: "word by order status" },
    { name: "labels", type: ts("OrderLabels"), required: true },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [
    use("Box", { props: { Class: "w-full overflow-x-auto" } },
      use("Table", { props: { Class: "w-full text-left text-sm" }, attrs: { "data-testid": "order-table" } },
        use("TableCaption", { props: { Class: "sr-only" } }, text(ref("labels.caption"))),
        use("TableHead", {}, use("TableRow", {},
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.number"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.date"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.items"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.total"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2" } }, text(ref("labels.status"))))),
        use("TableBody", {}, each(ref("orders"), "o", ref("o.id"),
          use("TableRow", { props: { Class: "border-t border-border" }, attrs: { "data-testid": "item" } },
            use("TableCell", { props: { Class: cn("font-semibold", cond(eq(ref("density"), "compact"), "py-2", "py-4")) } }, text(ref("o.number"))),
            use("TableCell", { props: { Class: "" } }, text(ref("o.date"))),
            use("TableCell", { props: { Class: "" } }, text(tpl(ref("labels.itemsCount"), ref("o.items")))),
            use("TableCell", { props: { Class: "" } }, text(money(ref("o.total"), ref("o.currency")))),
            use("TableCell", {}, organism("Pill", { tone: statusTone }, kids(text(at(ref("statuses"), ref("o.status"))))))))))),
  ],
});
