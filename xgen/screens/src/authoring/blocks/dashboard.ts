// Dashboard and onboarding organisms: metric tiles, a chart panel, an activity feed, an empty state, a checklist and a stepper.
import { add, cn, cond, div, count, each, eachAt, eq, len, lt, mul, ref, round, str, text, tpl, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame, panelSection, wide } from "../components/frames";
import { empty, id, ifAny, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { fid, kids } from "../forms";

const O = "organism.";

const metricRow = spec(`${O}metric-row`, "MetricRow", "Dashboard counters in a row or a grid: tiles with an icon, a number and a caption, or compact figures. Axes: columns (2, 4), item (tile, compact), tone (default, muted), density (default, compact).", {
  records: { Metric: fields(["id", "string"], ["label", "string"], ["value", "string"], ["icon", "string"], ["hint", "string"]) },
  props: [
    id, title,
    { name: "metrics", type: ts("Metric[]"), required: true },
    empty,
    { name: "cols", type: tsOf("2", "4"), default: "4" },
    { name: "item", type: tsOf("tile", "compact"), default: "tile" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [orEmpty("metrics", "gauge", [
    use("Grid", { props: { Cols: cond(eq(ref("cols"), "2"), "1-2", "1-4"), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("metrics"), "m", ref("m.id"),
        when(eq(ref("item"), "tile"),
          [use("Box", { props: {}, attrs: { "data-testid": "item" } }, organism("StatTile", { label: ref("m.label"), value: ref("m.value"), icon: ref("m.icon"), hint: ref("m.hint") }))],
          [use("Stack", { props: { Gap: "0", Class: "rounded bg-card p-4 inset-ring inset-ring-border" }, attrs: { "data-testid": "item" } },
            use("Group", { props: { Gap: "2", Align: "center", Class: "text-muted-foreground" } }, use("LucideIcon", { props: { Name: ref("m.icon"), Size: 16 } }), use("Text", { props: { Size: "xs" } }, text(ref("m.label")))),
            use("Text", { props: { Size: "2xl", Weight: "bold" } }, text(ref("m.value"))),
            use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("m.hint"))))]))),])
  ])],
});

const chartPanel = spec(`${O}chart-panel`, "ChartPanel", "A panel with a chart of one series: vertical bars with captions, or meter rows with a percent. Axes: chart (bars, meters), size (default, compact), tone (default, muted).", {
  records: { Point: fields(["id", "string"], ["label", "string"], ["value", "number"]) },
  props: [
    id, title,
    { name: "text", type: "string", required: true, docs: "the sentence under the title" },
    { name: "series", type: ts("Point[]"), required: true },
    empty,
    { name: "summary", type: "string", required: true, docs: "the chart's accessible summary" },
    { name: "percent", type: "string", required: true, docs: "template of a meter caption, e.g. `{0}%`" },
    { name: "chart", type: tsOf("bars", "meters"), default: "bars" },
    { name: "size", type: denseLite, default: "default" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [
    panelSection(use("Container", { props: { Class: `${wide} py-8` }, attrs: { "data-slot": "container" } },
      organism("Panel", { title: ref("title"), description: ref("text"), id: ref("id"), className: cond(eq(ref("tone"), "muted"), "bg-muted", "") }, kids(
        orEmpty("series", "chart-column", [when(eq(ref("chart"), "bars"),
          [organism("BarChart", { bars: ref("series"), label: ref("summary"), height: cond(eq(ref("size"), "compact"), 96, 176) })],
          [use("Stack", { props: { Gap: cond(eq(ref("size"), "compact"), "0", "2"), Align: "stretch" }, attrs: { "data-testid": "items" } },
            each(ref("series"), "s", ref("s.id"), organism("MeterRow", { label: ref("s.label"), value: ref("s.value"), caption: tpl(ref("percent"), ref("s.value")) })))])]))))),
  ],
});

const activityFeed = spec(`${O}activity-feed`, "ActivityFeed", "A panel with recent events: a timeline with dots on a line, or a list of rows with an icon. Axes: layout (timeline, list), density (default, compact), tone (default, muted).", {
  records: { Event: fields(["id", "string"], ["title", "string"], ["text", "string"], ["time", "string"], ["tone", "string"]) },
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "events", type: ts("Event[]"), required: true },
    empty,
    { name: "layout", type: tsOf("timeline", "list"), default: "timeline" },
    { name: "density", type: denseLite, default: "default" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [
    panelSection(use("Container", { props: { Class: `${wide} py-8` }, attrs: { "data-slot": "container" } },
      organism("Panel", { title: ref("title"), description: ref("text"), id: ref("id"), className: cond(eq(ref("tone"), "muted"), "bg-muted", "") }, kids(
        orEmpty("events", "activity", [when(eq(ref("layout"), "timeline"),
          [organism("Timeline", { items: ref("events") })],
          [use("List", { props: { Class: "m-0 flex list-none flex-col p-0" }, attrs: { "data-testid": "items" } },
            each(ref("events"), "e", ref("e.id"),
              use("ListItem", { props: { Class: cn("flex items-start justify-between gap-4 border-b border-border last:border-0", cond(eq(ref("density"), "compact"), "py-2", "py-4")) }, attrs: { "data-testid": "item" } },
                use("Stack", { props: { Gap: "0" } },
                  use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("e.title"))),
                  when(eq(ref("density"), "default"), [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("e.text")))])),
                use("Text", { props: { Size: "xs", Class: "shrink-0 text-muted-foreground" } }, text(ref("e.time"))))))])]))))),
  ],
});

const emptyPanel = spec(`${O}empty-panel`, "EmptyPanel", "An empty list or an empty search: a round icon, a title, a hint and an optional action, in a card or plain. Axes: layout (card, plain), actions (button, none), size (default, compact).", {
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "icon", type: "string", default: "inbox", docs: "Lucide name" },
    { name: "cta", type: "string", docs: "text of the action" },
    { name: "ctaHref", type: "string" },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
    { name: "actions", type: tsOf("button", "none"), default: "button" },
    { name: "visual", type: tsOf("icon", "image"), default: "icon", docs: "image: a picture instead of the round icon" },
    { name: "size", type: denseLite, default: "default" },
  ],
  view: [
    use("Block", { props: { Tag: "section" }, attrs: { "aria-label": ref("title"), "data-testid": "empty" } },
      use("Container", { props: { Class: cn(wide, cond(eq(ref("size"), "compact"), "py-4", "py-8")) }, attrs: { "data-slot": "container" } },
        when(eq(ref("visual"), "image"),
          [use("Stack", { props: { Gap: "4", Align: "center", Class: "mx-auto max-w-md text-center" }, attrs: { "data-testid": "empty-visual" } },
            organism("MediaFrame", { alt: ref("title"), ratio: "4/3", className: "w-full max-w-xs" }),
            use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" } }, text(ref("title"))),
            use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("text"))),
            when(eq(ref("actions"), "button"), [use("Button", { props: { Variant: "default", Size: "sm", Href: ref("ctaHref") }, attrs: { "data-testid": "empty-action" } }, text(ref("cta")))]))],
        [organism("EmptyState", { icon: ref("icon"), title: ref("title"), text: ref("text"), className: cn("mx-auto max-w-xl", cond(eq(ref("layout"), "plain"), "bg-transparent inset-ring-0", ""), cond(eq(ref("size"), "compact"), "py-6", "")) },
          { slots: { action: { args: [], do: [when(eq(ref("actions"), "button"), [use("Button", { props: { Variant: "default", Size: "sm", Href: ref("ctaHref") }, attrs: { "data-testid": "empty-action" } }, text(ref("cta")))])] } } })]))),
  ],
});

const checklist = spec(`${O}checklist`, "Checklist", "An onboarding checklist: the tasks with a done mark, a progress bar or a count. Axes: layout (card, plain), progress (bar, text, none), marker (check, number), tone (default, muted).", {
  records: { Task: fields(["id", "string"], ["title", "string"], ["text", "string"], ["done", "boolean"]) },
  props: [
    id, title,
    { name: "tasks", type: ts("Task[]"), required: true },
    empty,
    { name: "progressLabel", type: "string", required: true, docs: "template of the count, e.g. `{0} of {1} done`" },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
    { name: "progress", type: tsOf("bar", "text", "none"), default: "bar" },
    { name: "marker", type: tsOf("check", "number"), default: "check" },
    { name: "detail", type: tsOf("always", "expand"), default: "always", docs: "expand: the sentence of a task opens under its title" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), measure: "2xl" }, [orEmpty("tasks", "list-checks", [
    use("Stack", { props: { Gap: "4", Align: "stretch", Class: cond(eq(ref("layout"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "") }, attrs: { "data-testid": "checklist" } },
      when(eq(ref("progress"), "bar"), [use("Progress", { props: { Value: str(round(div(mul(count(ref("tasks"), "done"), 100), len(ref("tasks"))))), Max: "100" }, attrs: { "aria-label": tpl(ref("progressLabel"), count(ref("tasks"), "done"), len(ref("tasks"))) } })]),
      when(eq(ref("progress"), "text"), [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "progress-text" } }, text(tpl(ref("progressLabel"), count(ref("tasks"), "done"), len(ref("tasks")))))]),
      use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" }, attrs: { "data-testid": "items" } },
        eachAt(ref("tasks"), "task", "i", ref("task.id"),
          use("ListItem", { props: { Class: "flex items-start gap-4" }, attrs: { "data-testid": "item", "data-done": str(ref("task.done")) } },
            when(eq(ref("marker"), "number"),
              [use("IconBadge", { props: { Variant: cond(ref("task.done"), "primary", "outline"), Size: "xs" } }, text(str(add(ref("i"), 1))))],
              [use("LucideIcon", { props: { Name: cond(ref("task.done"), "circle-check", "circle"), Size: 24, Class: cond(ref("task.done"), "shrink-0 text-primary", "shrink-0 text-muted-foreground") } })]),
            when(eq(ref("detail"), "expand"),
              [use("Disclosure", { props: { Variant: "ghost", Class: "flex-1" }, attrs: { "data-testid": "task-detail" } },
                use("Summary", { props: { Variant: "ghost" } }, text(ref("task.title"))),
                use("Text", { props: { Size: "sm", Class: "pb-2 text-muted-foreground" } }, text(ref("task.text"))))],
              [use("Stack", { props: { Gap: "0" } },
                use("Text", { props: { Size: "base", Weight: "semibold" } }, text(ref("task.title"))),
                use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("task.text"))))]))))),])
  ])],
});

const stepper = spec(`${O}stepper`, "Stepper", "A multi-step form header: the steps with the current one marked (aria-current step), and the current step's text with back and next buttons. Axes: layout (horizontal, vertical), marker (number, icon), summary (show, hide).", {
  typeImports: [{ from: "StepsList", names: ["Step"] }],
  props: [
    id, title,
    { name: "steps", type: ts("Step[]"), required: true },
    { name: "current", type: "number", default: 2, docs: "the number of the current step, from 1" },
    { name: "stepLabel", type: "string", required: true, docs: "template of the progress line, e.g. `Step {0} of {1}`" },
    { name: "back", type: "string", required: true },
    { name: "next", type: "string", required: true },
    { name: "layout", type: tsOf("horizontal", "vertical"), default: "horizontal" },
    { name: "marker", type: tsOf("number", "icon"), default: "number" },
    { name: "summary", type: tsOf("show", "hide"), default: "show" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), measure: "3xl" }, [ifAny("steps", [
    use("Stack", { props: { Gap: "6", Align: "stretch" }, attrs: { "data-testid": "stepper" } },
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("stepLabel"), ref("current"), len(ref("steps"))))),
      use("List", { props: { Tag: "ol", Class: cn("m-0 flex list-none gap-4 p-0", cond(eq(ref("layout"), "vertical"), "flex-col", "flex-col sm:flex-row")) }, attrs: { "data-testid": "items" } },
        eachAt(ref("steps"), "s", "i", ref("s.id"),
          use("ListItem", { props: { Class: "flex flex-1 items-center gap-4" }, attrs: { "data-testid": "item", "aria-current": cond(eq(add(ref("i"), 1), ref("current")), "step", undef()) } },
            use("IconBadge", { props: { Variant: cond(lt(add(ref("i"), 1), add(ref("current"), 1)), "primary", "outline"), Size: "sm", Class: cond(lt(add(ref("i"), 1), add(ref("current"), 1)), "text-sm", "text-sm text-muted-foreground") } },
              when(eq(ref("marker"), "icon"), [use("LucideIcon", { props: { Name: ref("s.icon"), Size: 16 } })], [use("Inline", { props: { Class: "text-sm font-bold" } }, text(str(add(ref("i"), 1))))])),
            use("Text", { props: { Size: "sm", Weight: cond(eq(add(ref("i"), 1), ref("current")), "bold", "semibold") } }, text(ref("s.title")))))),
      when(eq(ref("summary"), "show"), [
        eachAt(ref("steps"), "s", "i", ref("s.id"), when(eq(add(ref("i"), 1), ref("current")), [
          use("Stack", { props: { Gap: "2", Class: "rounded bg-card p-6 inset-ring inset-ring-border" }, attrs: { "data-testid": "step-summary" } },
            use("Title", { props: { As: 3, Size: "xl", Weight: "bold" } }, text(ref("s.title"))),
            use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("s.text"))),
            use("Group", { props: { Gap: "2", Class: "pt-2" } },
              use("Button", { props: { Variant: "outline", Size: "sm", Type: "button" } }, text(ref("back"))),
              use("Button", { props: { Variant: "default", Size: "sm", Type: "button" } }, text(ref("next")))))])),
      ]))]),
  ])],
});

export const dashboardOrganisms: OrganismSpec[] = [metricRow, chartPanel, activityFeed, emptyPanel, checklist, stepper];
