// App-level organisms: the dashboard overview, the app shell in three layouts, a kanban board.
// Dragging a card between lanes is a port contract; the board shows the cards where the data puts them.
import { cn, cond, each, eq, len, ref, text, tpl, use, when, where, organism } from "../../build";
import type { OrganismSpec, Value } from "../../ir";
import { fields, groupFields, rec, requireFields, spec, ts } from "../kit";
import { frame, wide } from "../components/frames";
import { empty, id, ifAny, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { kids } from "../forms";
import { muted, strong } from "../ux";
import { sharedTypes, required, OverviewChart, OverviewActivity, tiles, chart, feed, appMain } from "../components/app-main";

const O = "organism.";
const overview = spec(`${O}dashboard-overview`, "DashboardOverview", "The first screen of an app: counters, a chart and recent activity. Axes: layout (split: the chart and the activity side by side, stacked: one below the other), cols (2, 4), tone, density.", {
  records: { OverviewChart, OverviewActivity },
  typeImports: sharedTypes,
  props: [
    id, title,
    { name: "metrics", type: ts("Metric[]"), required: true },
    { name: "chart", type: rec("OverviewChart"), required: true },
    { name: "activity", type: rec("OverviewActivity"), required: true },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "cols", type: tsOf("2", "4"), default: "4" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [
    use("Stack", { props: { Gap: "6", Align: "stretch" } },
      tiles(cond(eq(ref("cols"), "2"), "1-2", "1-4")),
      use("Grid", { props: { Cols: cond(eq(ref("layout"), "split"), "1-2", "1"), Class: "items-stretch gap-4" }, attrs: { "data-testid": "panels" } }, chart(), feed())),
  ])],
});

const appShell = spec(`${O}app-shell`, "AppShell", "The frame of a signed-in app with a first screen in it. Axes: layout (sidebar: navigation on the left, top: a bar above the content, panes: a narrow navigation, a list and a detail), density. The collapse of the sidebar is a port contract.", {
  records: {
    AppNav: requireFields(groupFields(["label", "string", "accessible name of the navigation"], ["brand", "string"], ["links", "NavLink[]"], ["current", "string", "id of the current link"]), "label", "brand", "links"),
    AppUser: required(["name", "string"], ["email", "string"]),
  },
  typeImports: [{ from: "NavBar", names: ["NavLink", "NavSearch"] }, ...sharedTypes, { from: "DashboardOverview", names: ["OverviewChart", "OverviewActivity"] }],
  props: [
    id, title,
    { name: "nav", type: rec("AppNav"), required: true, docs: "the navigation (sidebar or top bar)" },
    { name: "user", type: rec("AppUser"), required: true, docs: "the signed-in person, under the sidebar" },
    { name: "search", type: ts("NavSearch"), required: true, docs: "the search field of the top bar" },
    { name: "metrics", type: ts("Metric[]"), required: true },
    { name: "chart", type: ts("OverviewChart"), required: true },
    { name: "activity", type: ts("OverviewActivity"), required: true },
    { name: "layout", type: tsOf("sidebar", "top", "panes"), default: "sidebar" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: (() => {
    const main = (cols: string, more: Record<string, Value> = { activity: ref("activity"), density: ref("density") }) =>
      organism("AppMain", { id: ref("id"), title: ref("title"), metrics: ref("metrics"), chart: ref("chart"), cols, ...more });
    const side = (width: string) => organism("SidebarNav", { label: ref("nav.label"), brand: ref("nav.brand"), links: ref("nav.links"), current: ref("nav.current"), userName: ref("user.name"), userEmail: ref("user.email"), width, user: "show", density: ref("density") });
    const panes = use("Grid", { props: { Cols: "1-3", Class: "items-start gap-4" } },
      side("compact"),
      ifAny("activity.events", [organism("Panel", { title: ref("activity.title"), description: ref("activity.text"), id: tpl("{0}-list", ref("id")) }, kids(use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" }, attrs: { "data-testid": "items" } },
        each(ref("activity.events"), "e", ref("e.id"), use("ListItem", { props: { Class: "flex flex-col gap-2" }, attrs: { "data-testid": "item" } }, strong(ref("e.title"), "sm"), muted(ref("e.time"), "xs"))))))]),
      // the panes have the activity list of their own, so the main column shows the chart alone (compact: Gap "4" = gap-4)
      main("1-2", { density: "compact" }));
    return [use("Block", { props: { Tag: "section", Class: "bg-background" }, attrs: { "aria-labelledby": tpl("{0}-title", ref("id")), "data-testid": "app-shell", "data-layout": ref("layout") } },
      when(eq(ref("layout"), "top"),
        [use("Stack", { props: { Gap: "6", Align: "stretch" } },
          organism("NavBar", { label: ref("nav.label"), brand: ref("nav.brand"), links: ref("nav.links"), current: ref("nav.current"), search: ref("search"), actions: { mode: "none" }, layout: "search", over: "none" }),
          use("Container", { props: { Class: cn(wide, "pb-8") }, attrs: { "data-slot": "container" } }, main("1-4")))],
        [use("Container", { props: { Class: cn(wide, "py-8") }, attrs: { "data-slot": "container" } },
          when(eq(ref("layout"), "sidebar"),
            [use("Grid", { props: { Cols: "1", Class: "items-start gap-6 md:grid-cols-[16rem_minmax(0,1fr)]" } }, side("full"), main("1-2"))],
            [panes])) ])),
    ];
  })(),
});

const kanban = spec(`${O}kanban-board`, "KanbanBoard", "Work items in lanes. Each lane has a title, a count and its cards; a card has a title, an optional tag and the person it belongs to. Axes: card (simple, detail: tag and person), cols (2, 3), tone, density. Moving a card between lanes is a port contract.", {
  records: {
    Lane: fields(["id", "string"], ["key", "string"], ["title", "string"]),
    BoardCard: fields(["id", "string"], ["lane", "string"], ["title", "string"], ["tag", "string"], ["who", "string"]),
  },
  props: [
    id, title,
    { name: "lanes", type: ts("Lane[]"), required: true },
    empty,
    { name: "cards", type: ts("BoardCard[]"), required: true },
    { name: "countLabel", type: "string", required: true, docs: "template of the card count of a lane, e.g. `{0} cards`" },
    { name: "card", type: tsOf("simple", "detail"), default: "detail" },
    { name: "cols", type: tsOf("2", "3"), default: "3" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [orEmpty("lanes", "kanban", [
    use("Grid", { props: { Cols: cond(eq(ref("cols"), "2"), "1-2", "1-3"), Class: "items-start gap-4" }, attrs: { "data-testid": "lanes" } },
      each(ref("lanes"), "lane", ref("lane.id"), use("Stack", { props: { Gap: "4", Align: "stretch", Class: "rounded bg-muted p-4" }, attrs: { "data-testid": "lane" } },
        use("Group", { props: { Gap: "2", Align: "center", Justify: "between" } },
          use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, text(ref("lane.title"))),
          use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(tpl(ref("countLabel"), len(where(ref("cards"), "lane", ref("lane.key"))))))),
        use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } },
          each(where(ref("cards"), "lane", ref("lane.key")), "c", ref("c.id"), use("ListItem", { props: { Class: cn("flex flex-col rounded bg-card inset-ring inset-ring-border", cond(eq(ref("density"), "compact"), "gap-2 p-2", "gap-2 p-4")) }, attrs: { "data-testid": "item" } },
            strong(ref("c.title"), "sm"),
            when(eq(ref("card"), "detail"), [use("Group", { props: { Gap: "2", Align: "center", Justify: "between", Class: "flex-wrap" } },
              organism("Pill", { tone: "blue", icon: "tag" }, kids(text(ref("c.tag")))),
              muted(ref("c.who"), "xs"))]))))))),])
  ])],
});

export const workspaceOrganisms: OrganismSpec[] = [overview, appMain, appShell, kanban];
