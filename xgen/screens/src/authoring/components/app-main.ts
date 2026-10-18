// The main column of AppShell (AppMain) and the panels it shares with DashboardOverview: metric tiles,
// the chart and the recent activity.
import { cond, each, eq, ref, text, tpl, use, when, organism } from "../../build";
import type { Value } from "../../ir";
import { groupFields, requireFields, spec, ts } from "../kit";
import { id, ifAny, title, tsOf, denseLite } from "../props";
import { kids } from "../forms";

export const sharedTypes = [{ from: "MetricRow", names: ["Metric"] }, { from: "ChartPanel", names: ["Point"] }, { from: "ActivityFeed", names: ["Event"] }];
export const required = (...f: Parameters<typeof groupFields>) => requireFields(groupFields(...f), ...f.map(([name]) => name));
/** the chart panel of the first screen */
export const OverviewChart = required(["title", "string"], ["text", "string"], ["summary", "string", "the chart's accessible summary"], ["series", "Point[]", "the bars"]);
/** the recent-activity panel of the first screen */
export const OverviewActivity = required(["title", "string"], ["text", "string"], ["events", "Event[]"]);

// emptyMode omit (AppShell, DashboardOverview): no metrics, no tiles; no series or events, no panel
export const tiles = (cols: Value) => ifAny("metrics", [use("Grid", { props: { Cols: cols, Class: "gap-4" }, attrs: { "data-testid": "items" } },
  each(ref("metrics"), "m", ref("m.id"), use("Box", { props: {}, attrs: { "data-testid": "item" } }, organism("StatTile", { label: ref("m.label"), value: ref("m.value"), icon: ref("m.icon"), hint: ref("m.hint") }))))]);
export const chart = () => ifAny("chart.series", [organism("Panel", { title: ref("chart.title"), description: ref("chart.text"), id: tpl("{0}-chart", ref("id")), className: "h-full" }, kids(
  organism("BarChart", { bars: ref("chart.series"), label: ref("chart.summary"), height: 144 })))]);
export const feed = () => ifAny("activity.events", [organism("Panel", { title: ref("activity.title"), description: ref("activity.text"), id: tpl("{0}-feed", ref("id")), className: "h-full" }, kids(organism("Timeline", { items: ref("activity.events") })))]);

/** the main column of AppShell: the heading, the metric tiles and the chart, with the activity beside it when there is one */
export const appMain = spec("pattern.app-main", "AppMain", "The main column of AppShell: the heading, the metric tiles, and the chart panel (beside the activity panel when `activity` is given).", {
  typeImports: [...sharedTypes, { from: "DashboardOverview", names: ["OverviewChart", "OverviewActivity"] }],
  props: [
    id, title,
    { name: "metrics", type: ts("Metric[]"), required: true },
    { name: "chart", type: ts("OverviewChart"), required: true },
    { name: "activity", type: ts("OverviewActivity"), docs: "the activity panel beside the chart; none: the chart alone" },
    { name: "cols", type: tsOf("1-2", "1-4"), default: "1-2", docs: "columns of the metric tiles" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [use("Stack", { props: { Gap: cond(eq(ref("density"), "compact"), "4", "6"), Align: "stretch", Class: "min-w-0" }, attrs: { "data-testid": "app-main" } },
    use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: tpl("{0}-title", ref("id")) } }, text(ref("title"))),
    tiles(ref("cols")),
    when(ref("activity"), [use("Grid", { props: { Cols: "1-2", Class: "items-stretch gap-4" } }, chart(), feed())], [chart()]))],
});
