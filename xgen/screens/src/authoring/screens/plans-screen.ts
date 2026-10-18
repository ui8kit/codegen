// The plans screen: a collection of plans (list with search, sortable columns and a pager) and a record card (the PricingCard organism).
// Built from primitives; the table is assembled from the column list so the markup and the sorting config cannot disagree.
import { call, coalesce, cond, each, eq, op, outlet, ref, sortHeader, text, tpl, use, when, not } from "../../build";
import { CODEX_FIELDS } from "../../../../runtimes/core/assets/app/fields";
import type { ColumnSpec, ScreenSpec, ViewNode } from "../../ir";
import { wide } from "../components/frames";

const columns: ColumnSpec[] = [
  { id: "name", label: "plans.col.name", type: "text", sortable: true },
  { id: "price", label: "plans.col.price", type: "money", sortable: true, align: "end" },
  { id: "seats", label: "plans.col.seats", type: "number", sortable: true, align: "end" },
  { id: "storage", label: "plans.col.storage", type: "number", sortable: true, align: "end" },
  { id: "status", label: "plans.col.status", type: "badge" },
];

const headCell = (c: ColumnSpec): ViewNode =>
  c.sortable
    ? sortHeader(c.id, ref(`ui.${c.label}`), c.align ?? "start")
    : use("TableHeadCell", { props: { Scope: "col", Class: c.align === "end" ? "text-right" : "" } }, text(ref(`ui.${c.label}`)));

const cell = (c: ColumnSpec): ViewNode => {
  const align = c.align === "end" ? "text-right" : "";
  const value = ref(`row.${c.id}`);
  const inner: ViewNode =
    c.type === "text" ? use("Link", { props: { Href: op("add", op("add", "#/plans/", ref("row.id")), ref("view.qs")), Variant: "default" }, attrs: { "data-testid": "open-record" } }, text(value))
    : c.type === "money" ? text(op("money", value, ref("row.currency")))
    : c.type === "badge" ? use("Badge", { props: { Variant: cond(eq(value, "active"), "default", "secondary"), Size: "default" } }, text(op("at", ref("ui.status"), coalesce(value, ""))))
    : text(value);
  return use("TableCell", { props: { Class: align } }, inner);
};

const list: ViewNode[] = [
  use("Stack", { props: { Gap: "4" } },
    use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "flex-wrap" } },
      use("Input", { props: { Type: "search", Size: "default", Value: ref("view.q"), Placeholder: ref("ui.plans.search"), AriaLabel: ref("ui.plans.search"), Class: "max-w-xs" }, on: { input: call("actions.search", ref("event.value")) }, attrs: { "data-testid": "search" } }),
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "count" } }, text(tpl(ref("ui.plans.count"), ref("view.total"))))),
    use("Table", { props: { Class: "w-full text-sm" }, attrs: { "data-testid": "plans-table" } },
      use("TableCaption", { props: { Class: "sr-only" } }, text(ref("ui.plans.caption"))),
      use("TableHead", {}, use("TableRow", {}, ...columns.map(headCell))),
      use("TableBody", {}, each(ref("view.rows"), "row", ref("row.id"), use("TableRow", { attrs: { "data-testid": "plan-row" } }, ...columns.map(cell))))),
    when(eq(ref("view.total"), 0), [use("Text", { props: { Class: "text-muted-foreground" }, attrs: { "data-testid": "empty" } }, text(ref("ui.plans.empty")))]),
    use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "flex-wrap" } },
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("ui.pager.showing"), ref("view.from"), ref("view.to"), ref("view.total")))),
      use("Group", { props: { Gap: "2" } },
        use("Button", { props: { Variant: "outline", Size: "sm", Disabled: not(op("gt", ref("view.page"), 1)) }, on: { click: call("actions.page", op("add", ref("view.page"), -1)) }, attrs: { "data-testid": "prev" } }, text(ref("ui.pager.previous"))),
        use("Button", { props: { Variant: "outline", Size: "sm", Disabled: not(op("lt", ref("view.page"), ref("view.pages"))) }, on: { click: call("actions.page", op("add", ref("view.page"), 1)) }, attrs: { "data-testid": "next" } }, text(ref("ui.pager.next")))))),
];

const record: ViewNode[] = [
  use("Stack", { props: { Gap: "4" } },
    use("Group", {}, use("Button", { props: { Variant: "ghost", Size: "sm" }, on: { click: call("actions.back") }, attrs: { "data-testid": "back" } }, text(ref("ui.record.back")))),
    when(ref("record"),
      [{ organism: "PricingCard", props: { plan: ref("record"), labels: ref("ui.pricing"), current: true }, on: { select: call("actions.back") },
        slots: { footer: { args: ["plan"], do: [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "record-id" } }, text(tpl(ref("ui.record.id"), ref("plan.id"))))] } } }],
      [use("Text", { props: { Class: "text-muted-foreground" }, attrs: { "data-testid": "missing" } }, text(ref("ui.record.missing")))])),
];

export const plansScreen: ScreenSpec = {
  $schema: "../../schema/schemas/screen.schema.json",
  specVersion: 1,
  id: "screen.plans",
  name: "PlansScreen",
  docs: "Collection -> record: a list of plans (search, sort, pager; all state in the URL) and the card of one plan. Data: the Codex fixture `plans`.",
  source: {
    collection: "plans", kind: "plan", record: "Plan",
    // the central plan map, plus the status the list shows in a column
    fields: { ...CODEX_FIELDS.plan, status: "metadata.plan_status.value" },
  },
  list: { columns, searchFields: ["name", "tagline"], pageSize: 5, defaultSort: "price:asc" },
  state: { q: "q", sort: "sort", page: "page" },
  routes: [{ path: "plans", area: "list" }, { path: "plans/:id", area: "record" }],
  organisms: ["PricingCard"],
  // the screen opens on its one Block: the main of the page (the host frame adds no main of its own around a screen)
  layout: [
    use("Block", { props: { Tag: "main", ID: "main-content" }, attrs: { tabindex: -1, "data-testid": "main" } }, use("Container", { props: { Class: `${wide} py-8` } },
      use("Stack", { props: { Gap: "6" } },
        use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } },
          use("Title", { props: { As: 1, Size: "2xl", Weight: "bold" } }, text(ref("ui.app.title"))),
          use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("actions.toggleTheme") }, attrs: { "data-testid": "theme-toggle" } }, text(ref("ui.theme.toggle")))),
        outlet()))),
  ],
  areas: { list, record },
  portable: { svelte: true, react: true },
};
