// The parts of canary (packages/ui/src/parts) that are pure: markup bound to props, no state, no effects.
// What canary did with `$state`, `$props.id()`, DOM APIs or private kit data stays a contract (see `contract`).
import { and, call, coalesce, cn, cond, eq, eachAt, each, has, lt, le, op, ref, slot, str, sub, text, tpl, undef, use, when, at } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { contract, defaultOf, fields, prop, recipeExamples, req, spec, ts, union } from "../kit";

const P = "part.";
const m0 = "m-0 text-xs font-medium text-muted-foreground";

const barChart = spec(`${P}bar-chart`, "BarChart", "A row of vertical bars (sales by day, orders by week) with a caption under each bar. The chart is one image for assistive technology: `label` carries the summary, the bar values are in the captions and titles.", {
  records: { Bar: fields(["id", "string"], ["label", "string"], ["value", "number"], ["title", "string", true], ["muted", "boolean", true]) },
  props: [
    req("bars", ts("Bar[]"), "id, caption, value; `title` is the tooltip, `muted` dims a period without data"),
    req("label", "string", "the summary read to assistive technology"),
    prop("max", "number", "the value of a full-height bar; the largest value by default"),
    prop("height", "number", "height of the plot area in px", { default: 160 }),
  ],
  className: true,
  derived: [{ name: "top", value: op("max", 1, coalesce(ref("max"), op("maxBy", ref("bars"), "value"))) }],
  view: [
    use("Box", { props: { Class: cn("min-w-0", ref("className")) }, attrs: { "data-slot": "bar-chart" } },
      use("Box", { props: { Class: "flex min-w-0 items-end gap-2" }, attrs: { role: "img", "aria-label": ref("label"), style: op("css", "height", ref("height"), "px") } },
        each(ref("bars"), "b", ref("b.id"),
          use("Box", { props: { Class: "flex h-full min-w-0 flex-1 items-end" }, attrs: { title: coalesce(ref("b.title"), ref("b.label")) } },
            use("Box", { props: { Class: cn("w-full rounded", cond(ref("b.muted"), "bg-muted-foreground", "bg-primary")) }, attrs: { style: op("css", "height", op("max", 2, op("round", op("mul", op("div", ref("b.value"), ref("top")), 100))), "%"), "data-bar": ref("b.id") } })))),
      use("Box", { props: { Class: "mt-2 flex min-w-0 gap-2" }, attrs: { "aria-hidden": "true" } },
        each(ref("bars"), "b", ref("b.id"),
          use("Box", { props: { Class: "relative h-4 min-w-0 flex-1" } },
            use("Text", { props: { Class: "absolute left-1/2 top-0 m-0 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-muted-foreground" } }, text(ref("b.label"))))))),
  ],
});

const bulkBar = spec(`${P}bulk-bar`, "BulkBar", "The \"N selected\" bar of a list: a count, a clear button and the bulk actions (children). All text comes in through props.", {
  props: [req("label", "string", "the count, e.g. \"3 selected\""), req("clearLabel", "string", "accessible name of the clear button")],
  className: true,
  children: true,
  events: [{ name: "clear", args: [], docs: "the clear button was pressed" }],
  view: [
    use("Box", { props: { Class: cn("flex flex-wrap items-center gap-2 rounded bg-foreground px-4 py-2 text-xs font-bold text-background", ref("className")) }, attrs: { role: "region", "aria-label": ref("label"), "aria-live": "polite", "data-slot": "bulk-bar", "data-testid": "bulk-bar" } },
      use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", Type: "button", AriaLabel: ref("clearLabel"), Class: "text-background hover:bg-background/15 hover:text-background" }, on: { click: call("emit.clear") } },
        use("LucideIcon", { props: { Name: "x", Size: 16 } })),
      use("Inline", { attrs: { "data-testid": "bulk-count" } }, text(ref("label"))),
      use("Inline", { props: { Class: "ml-auto flex flex-wrap items-center gap-2" } }, slot("children"))),
  ],
});

const emptyState = spec(`${P}empty-state`, "EmptyState", "Empty list or nothing found: a round icon, a title, a hint and an optional action.", {
  props: [prop("icon", "string", "Lucide name of the icon", { default: "inbox" }), req("title", "string"), prop("text", "string", "the hint")],
  className: true,
  slots: [{ name: "action", args: [], docs: "an optional call to action" }],
  view: [
    use("Box", { props: { Class: cn("flex min-w-0 flex-col items-center gap-4 rounded bg-card px-6 py-14 text-center inset-ring inset-ring-border", ref("className")) }, attrs: { role: "status" } },
      use("IconBadge", { props: { Size: "lg" } }, use("LucideIcon", { props: { Name: ref("icon"), Size: 20 } })),
      use("Text", { props: { Class: "m-0 text-sm font-bold text-foreground" } }, text(ref("title"))),
      when(ref("text"), [use("Text", { props: { Class: "m-0 max-w-80 text-xs font-medium text-muted-foreground" } }, text(ref("text")))]),
      slot("action")),
  ],
});

const field = spec(`${P}field`, "Field", "A form field: label, control (children), hint and error text. `htmlFor` ties the label to the id of the control.", {
  props: [req("label", "string"), req("htmlFor", "string", "id of the control"), prop("hint", "string"), prop("error", "string", "when set it replaces the hint and is announced (role alert)")],
  className: true,
  children: true,
  view: [
    use("Box", { props: { Class: cn("flex min-w-0 flex-col gap-2", ref("className")) } },
      use("Label", { props: { Class: "text-xs font-bold text-foreground", HTMLFor: ref("htmlFor") } }, text(ref("label"))),
      slot("children"),
      when(ref("error"),
        [use("Text", { props: { Class: "m-0 text-xs font-semibold text-destructive" }, attrs: { role: "alert" } }, text(ref("error")))],
        [when(ref("hint"), [use("Text", { props: { Class: m0 } }, text(ref("hint")))])])),
  ],
});

const logoSidebar = spec(`${P}logo-sidebar`, "LogoSidebar", "The brand row of a sidebar: a mark and the product name on the left, trailing actions on the right. The variant picks the padding (recipe).", {
  props: [prop("variant", union("logo-sidebar", "variant"), "padding of the row", { default: defaultOf("logo-sidebar", "variant") }), req("name", "string", "product name")],
  className: true,
  recipes: { logoSidebar: "logo-sidebar" },
  examples: recipeExamples("logo-sidebar", { variant: "variant" }, { name: "App" }),
  slots: [{ name: "mark", args: [], docs: "the logo mark" }, { name: "actions", args: [], docs: "trailing actions" }],
  view: [
    use("Box", { props: { Class: cn(op("recipe", "logoSidebar", "variant", ref("variant")), "in-data-[nav=collapsed]:w-full in-data-[nav=collapsed]:justify-center in-data-[nav=collapsed]:p-0", ref("className")) }, attrs: { "data-slot": "logo-sidebar" } },
      use("Inline", { props: { Class: "flex items-center gap-4" }, attrs: { "data-slot": "logo-sidebar-brand" } },
        slot("mark"),
        use("Inline", { props: { Class: "text-sm font-bold text-foreground in-data-[nav=collapsed]:hidden" }, attrs: { "data-slot": "logo-sidebar-name" } }, text(ref("name")))),
      when(ref("actions"), [use("Inline", { props: { Class: "flex items-center gap-2 in-data-[nav=collapsed]:hidden" }, attrs: { "data-slot": "logo-sidebar-actions" } }, slot("actions"))])),
  ],
});

const avatar = spec(`${P}avatar`, "Avatar", "An image in a round frame (recipe: size xs to xl, 24 to 64 px). Avatars are always round.", {
  props: [req("src", "string"), prop("alt", "string", "empty for a decorative picture", { default: "" }), prop("size", union("avatar", "size"), "frame size in px", { default: defaultOf("avatar", "size") })],
  className: true,
  recipes: { avatar: "avatar" },
  examples: recipeExamples("avatar", { size: "size" }, { src: "avatar.png" }),
  view: [
    use("Inline", { props: { Class: cn(op("recipe", "avatar", "size", ref("size")), ref("className")) }, attrs: { "data-slot": "avatar" } },
      use("Image", { props: { Src: ref("src"), Alt: ref("alt"), Class: "size-full object-cover", Fit: "cover", Size: "auto", Loading: "eager", Decoding: "auto" }, attrs: { draggable: "false" } })),
  ],
});

const badgeSquare = spec(`${P}badge-square`, "BadgeSquare", "A keyboard hint or counter in a small pill. Colours come from the middle layer (.badge-kbd).", {
  props: [prop("size", union("badge-square", "size"), "height", { default: defaultOf("badge-square", "size") })],
  className: true,
  children: true,
  recipes: { badgeSquare: "badge-square" },
  examples: recipeExamples("badge-square", { size: "size" }),
  view: [use("Inline", { props: { Class: cn(op("recipe", "badgeSquare", "size", ref("size")), ref("className")) }, attrs: { "data-slot": "badge-square" } }, slot("children"))],
});

const meterBody = (): ViewNode[] => [
  use("Box", { props: { Class: "flex items-baseline justify-between gap-4" } },
    use("Text", { props: { Class: "m-0 min-w-0 truncate text-sm font-bold text-foreground" } }, text(ref("label"))),
    use("Text", { props: { Class: "m-0 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground" } }, text(ref("caption")))),
  use("Progress", { props: { Value: str(ref("value")), Max: "100" }, attrs: { "aria-label": ref("label") } }),
  when(ref("hint"), [use("Text", { props: { Class: m0 } }, text(ref("hint")))]),
];
const meterRow = spec(`${P}meter-row`, "MeterRow", "A name, a value caption and a progress bar (completeness by section, issues by rule, stock by warehouse). With `href` the whole row is a link.", {
  props: [req("label", "string"), req("value", "number", "0 to 100"), req("caption", "string", "the caption on the right, e.g. \"72%\""), prop("hint", "string"), prop("href", "string")],
  className: true,
  view: [
    use("Box", { props: { Class: cn("min-w-0", ref("className")) }, attrs: { "data-slot": "meter-row" } },
      when(ref("href"),
        [use("Link", { props: { Href: ref("href"), Variant: "block", Class: "flex min-w-0 flex-col gap-2 rounded p-2 text-foreground no-underline hover:bg-muted" } }, ...meterBody())],
        [use("Box", { props: { Class: "flex min-w-0 flex-col gap-2 p-2" } }, ...meterBody())])),
  ],
});

const notice = spec(`${P}notice`, "Notice", "A short confirmation toast: fixed bottom right, read out by screen readers through role status. Empty text renders nothing visible.", {
  props: [req("text", "string")],
  view: [
    use("Box", { props: { Class: "contents" }, attrs: { role: "status", "data-testid": "notice" } },
      when(ref("text"), [use("Text", { props: { Class: "fixed right-4 bottom-4 z-40 m-0 flex items-center gap-2 rounded bg-foreground p-4 text-xs font-bold text-background shadow-lg" } },
        use("LucideIcon", { props: { Name: "circle-check", Size: 16 } }), text(ref("text")))])),
  ],
});

const pageHeader = spec(`${P}page-header`, "PageHeader", "The page heading: a title, a one-line summary and the action buttons on the right (below on phones).", {
  props: [req("title", "string"), prop("summary", "string"), prop("id", "string", "id of the heading, for aria-labelledby")],
  slots: [{ name: "actions", args: [], docs: "action buttons" }],
  view: [
    use("Box", { props: { Class: "flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between" } },
      use("Box", { props: { Class: "flex min-w-0 flex-col gap-2" } },
        use("Title", { props: { As: 1, Size: "xl", Weight: "bold", Class: "m-0" }, attrs: { id: ref("id") } }, text(ref("title"))),
        when(ref("summary"), [use("Text", { props: { Class: m0 } }, text(ref("summary")))])),
      when(ref("actions"), [use("Box", { props: { Class: "flex flex-wrap items-center gap-2" } }, slot("actions"))])),
  ],
});

const pager = spec(`${P}pager`, "Pager", "The list footer: a summary line and previous / next page buttons. With `numbered` it shows page numbers (1 … 4 5 6 … 21), with `moreLabel` a \"Load more\" button. The current page is a plain element marked aria-current=\"page\"; the others are buttons. All text comes in through props.", {
  props: [
    req("page", "number", "current page, from 1"), req("pages", "number", "number of pages"), req("summary", "string"),
    req("previousLabel", "string"), req("nextLabel", "string"),
    prop("numbered", "boolean", "show page numbers between the arrows", { default: false }),
    prop("pageLabel", "string", "template of the accessible name of a page button, {0} is the number"),
    prop("moreLabel", "string", "label of the \"Load more\" button; no button without it"),
  ],
  events: [{ name: "page", args: [{ name: "page", type: "number" }], docs: "a page was chosen" }, { name: "more", args: [], docs: "the load-more button was pressed" }],
  derived: [{ name: "numbers", value: op("pageWindow", ref("page"), ref("pages")) }],
  view: [
    use("Box", { props: { Class: "flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-muted-foreground" }, attrs: { "data-testid": "pager" } },
      use("Inline", { props: { Class: "flex flex-wrap items-center gap-4" } }, use("Inline", {}, text(ref("summary")))),
      use("Inline", { props: { Class: "flex flex-wrap items-center gap-2" } },
        when(and(ref("moreLabel"), lt(ref("page"), ref("pages"))), [
          use("Button", { props: { Variant: "outline", Size: "sm", Type: "button" }, on: { click: call("emit.more") }, attrs: { "data-testid": "pager-more" } },
            text(ref("moreLabel"))),
        ]),
        use("Button", { props: { Variant: "outline", Size: "sm", Layout: "icon", AriaLabel: ref("previousLabel"), Disabled: le(ref("page"), 1) }, on: { click: call("emit.page", sub(ref("page"), 1)) } },
          use("LucideIcon", { props: { Name: "chevron-left", Size: 16 } })),
        when(ref("numbered"),
          [eachAt(ref("numbers"), "n", "i", or2(ref("n"), tpl("gap{0}", ref("i"))),
            when(eq(ref("n"), null),
              [use("Inline", { props: { Class: "w-8 text-center" } }, text("…"))],
              [when(eq(ref("n"), ref("page")),
                [use("Inline", { props: { Class: "flex h-8 min-w-8 items-center justify-center rounded bg-foreground px-2 font-bold text-background" }, attrs: { "aria-current": "page", "data-testid": "pager-current" } }, text(ref("n")))],
                [use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", Type: "button", AriaLabel: tpl(ref("pageLabel"), ref("n")) }, on: { click: call("emit.page", ref("n")) } }, text(ref("n")))])]))],
          [use("Inline", { props: { Class: "min-w-12 text-center font-bold text-foreground" } }, text(ref("page")), text(" / "), text(ref("pages")))]),
        use("Button", { props: { Variant: "outline", Size: "sm", Layout: "icon", AriaLabel: ref("nextLabel"), Disabled: op("ge", ref("page"), ref("pages")) }, on: { click: call("emit.page", op("add", ref("page"), 1)) } },
          use("LucideIcon", { props: { Name: "chevron-right", Size: 16 } })))),
  ],
});
function or2(a: ReturnType<typeof ref>, b: ReturnType<typeof ref>) { return op("or", a, b); }

const panel = spec(`${P}panel`, "Panel", "A titled card (surface bg-card, hairline ring): the content panel of a page. An optional title, description and header actions. Pass `id` to name the panel by its title. Not a landmark: a labelled group inside the Block of its block (rule 01).", {
  props: [prop("title", "string"), prop("description", "string"), prop("id", "string", "base id: the title gets `{id}-t` and the panel points at it with aria-labelledby")],
  className: true,
  children: true,
  slots: [{ name: "actions", args: [], docs: "header actions" }],
  view: [
    use("Box", { props: { Class: cn("flex min-w-0 flex-col gap-4 rounded bg-card p-6 inset-ring inset-ring-border", ref("className")) }, attrs: { role: "group", "aria-labelledby": cond(and(ref("title"), ref("id")), tpl("{0}-t", ref("id")), undef()) } },
      when(op("or", ref("title"), ref("actions")), [
        use("Box", { props: { Class: "flex items-start justify-between gap-4" } },
          use("Box", { props: { Class: "flex min-w-0 flex-col gap-2" } },
            when(ref("title"), [use("Title", { props: { As: 2, Size: "base", Class: "m-0 text-foreground" }, attrs: { id: cond(ref("id"), tpl("{0}-t", ref("id")), undef()) } }, text(ref("title")))]),
            when(ref("description"), [use("Text", { props: { Class: m0 } }, text(ref("description")))])),
          slot("actions")),
      ]),
      slot("children")),
  ],
});

const tones = {
  gray: "bg-muted text-muted-foreground inset-ring-border",
  ...Object.fromEntries(["blue", "amber", "green", "red", "violet", "pink", "orange", "cyan"].map((c) => [c, `bg-${c}-50 text-${c}-700 inset-ring-${c}-200 dark:bg-${c}-950 dark:text-${c}-300 dark:inset-ring-${c}-900`])),
};
const pill = spec(`${P}pill`, "Pill", "A status pill: a tinted label with an icon (published, draft, role, comment state).", {
  props: [prop("tone", ts('"gray" | "blue" | "amber" | "green" | "red" | "violet" | "pink" | "orange" | "cyan"'), "tint", { default: "gray" }), prop("icon", "string", "Lucide name")],
  className: true,
  children: true,
  consts: { PILL: tones },
  view: [
    use("Box", { props: { Class: "contents" } },
      use("Inline", { attrs: { "data-slot": "pill" }, props: { Class: cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap inset-ring", at(ref("PILL"), ref("tone")), ref("className")) } },
        when(ref("icon"), [use("LucideIcon", { props: { Name: ref("icon"), Size: 12 } })]),
        slot("children"))),
  ],
});

const rating = spec(`${P}rating`, "Rating", "One to five stars (a review's grade, the average of a product). The value is read as the label; the stars themselves are decoration.", {
  props: [req("value", "number", "0 to max, halves are rounded"), req("label", "string", "read to assistive technology, e.g. \"4 of 5\""), prop("max", "number", "number of stars", { default: 5 }), prop("size", "number", "size of a star in px", { default: 16 })],
  className: true,
  derived: [{ name: "full", value: op("round", op("min", ref("max"), op("max", 0, ref("value")))) }],
  view: [
    use("Box", { props: { Class: cn("inline-flex items-center gap-0", ref("className")) }, attrs: { role: "img", "aria-label": ref("label"), "data-slot": "rating", "data-value": ref("full") } },
      each(op("range", ref("max")), "i", ref("i"), use("LucideIcon", { props: { Name: "star", Size: ref("size"), Class: cond(lt(ref("i"), ref("full")), "fill-foreground text-foreground", "text-border") } }))),
  ],
});

const region = spec(`${P}region`, "Region", "A landmark region (header, nav, section, aside, footer, article, figure) inside another file: one Block, never nested, so a nested landmark is its own component.", {
  frame: true,
  props: [req("tag", ts('"header" | "nav" | "section" | "aside" | "footer" | "article" | "figure" | "main" | "search" | "div"'), "the element")],
  className: true,
  children: true,
  view: [use("Block", { props: { Tag: ref("tag"), Class: ref("className") } }, slot("children"))],
});

const searchField = spec(`${P}search-field`, "SearchField", "A search input with a magnifier. `value` fires on every keystroke with the new text.", {
  props: [req("value", "string"), prop("placeholder", "string"), req("label", "string", "accessible name")],
  className: true,
  events: [{ name: "value", args: [{ name: "value", type: "string" }], docs: "the text changed" }],
  view: [
    use("Box", { props: { Class: cn("relative min-w-44 flex-1", ref("className")) }, attrs: { role: "search" } },
      use("LucideIcon", { props: { Name: "search", Size: 16, Class: "pointer-events-none absolute top-2 left-3 text-muted-foreground" } }),
      use("Input", { props: { Size: "sm", Type: "search", Placeholder: ref("placeholder"), AriaLabel: ref("label"), Class: "pr-3 pl-10", Value: ref("value") }, on: { input: call("emit.value", ref("event.value")) } })),
  ],
});

const tileBody = (): ViewNode[] => [
  use("Box", { props: { Class: "flex items-center justify-between gap-2" } },
    use("Text", { props: { Class: "m-0 text-xs font-bold text-muted-foreground" } }, text(ref("label"))),
    use("IconBadge", { props: { Size: "sm" } }, use("LucideIcon", { props: { Name: ref("icon"), Size: 16 } }))),
  use("Text", { props: { Size: "2xl", Weight: "bold", Class: "m-0 leading-8" } }, text(ref("value"))),
  when(ref("hint"), [use("Text", { props: { Class: m0 } }, text(ref("hint")))]),
];
const statTile = spec(`${P}stat-tile`, "StatTile", "A dashboard counter: an icon, a big number, a caption. With `href` the whole tile is a link, without it the tile is a plain figure.", {
  props: [req("label", "string"), req("value", ts("string | number")), req("icon", "string", "Lucide name"), prop("href", "string"), prop("hint", "string")],
  view: [
    use("Box", { props: { Class: "min-w-0" } },
      when(ref("href"),
        [use("Link", { props: { Href: ref("href"), Variant: "block", Class: "flex min-w-0 flex-col gap-4 rounded bg-card p-6 text-foreground no-underline inset-ring inset-ring-border hover:bg-muted" } }, ...tileBody())],
        [use("Box", { props: { Class: "flex min-w-0 flex-col gap-4 rounded bg-card p-6 text-foreground inset-ring inset-ring-border" } }, ...tileBody())])),
  ],
});

const tableToolbar = spec(`${P}table-toolbar`, "TableToolbar", "The toolbar above a table: search and filter controls on the left (children), the actions on the right (`actions`). One tab stop group (role toolbar).", {
  props: [req("label", "string", "accessible name of the toolbar")],
  className: true,
  children: true,
  slots: [{ name: "actions", args: [], docs: "actions on the right" }],
  view: [
    use("Box", { props: { Class: cn("flex flex-wrap items-center justify-between gap-2", ref("className")) }, attrs: { role: "toolbar", "aria-label": ref("label"), "data-slot": "table-toolbar" } },
      use("Inline", { props: { Class: "flex min-w-0 flex-wrap items-center gap-2" } }, slot("children")),
      use("Inline", { props: { Class: "flex flex-wrap items-center gap-2" } }, slot("actions"))),
  ],
});

const timeline = spec(`${P}timeline`, "Timeline", "A vertical list of events (an order's history): a dot on a line, the title, an optional text and the time. Newest first or oldest first is the caller's order.", {
  records: { TimelineItem: fields(["id", "string"], ["title", "string"], ["text", "string", true], ["time", "string"], ["tone", "string", true]) },
  props: [req("items", ts("TimelineItem[]"), "tone is gray, green, blue, amber or red")],
  className: true,
  consts: { TONE_DOT: { gray: "bg-muted-foreground", green: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500", red: "bg-red-500" } },
  view: [
    use("Box", { props: { Class: cn("min-w-0", ref("className")) }, attrs: { "data-slot": "timeline" } },
      use("List", { props: { Class: "m-0 flex list-none flex-col p-0" } },
        eachAt(ref("items"), "item", "i", ref("item.id"),
          use("ListItem", { props: { Class: "relative flex min-w-0 gap-4 pb-4 last:pb-0" }, attrs: { "data-event": ref("item.id") } },
            use("Box", { props: { Class: "relative flex w-2 shrink-0 justify-center" } },
              when(lt(ref("i"), sub(op("len", ref("items")), 1)), [use("Inline", { props: { Class: "absolute top-4 -bottom-0 w-px bg-border" } })]),
              use("Inline", { props: { Class: cn("mt-2 size-2 rounded-full", at(ref("TONE_DOT"), coalesce(ref("item.tone"), "gray"))) } })),
            use("Box", { props: { Class: "flex min-w-0 flex-1 flex-col gap-0" } },
              use("Box", { props: { Class: "flex flex-wrap items-baseline justify-between gap-x-4" } },
                use("Text", { props: { Class: "m-0 text-sm font-bold text-foreground" } }, text(ref("item.title"))),
                use("Text", { props: { Class: "m-0 shrink-0 text-xs font-medium text-muted-foreground" } }, text(ref("item.time")))),
              when(ref("item.text"), [use("Text", { props: { Class: m0 } }, text(ref("item.text")))])))))),
  ],
});

const rangeField = spec(`${P}range-field`, "RangeField", "A from–to pair for numbers or dates (price range, period). Empty means an open end. With numeric bounds two sliders sit above the inputs. Each control has its own accessible name; every change reports both ends.", {
  props: [
    req("type", ts('"number" | "date"')), req("from", "string"), req("to", "string"),
    req("fromLabel", "string"), req("toLabel", "string"),
    prop("min", "number"), prop("max", "number"),
  ],
  className: true,
  events: [{ name: "change", args: [{ name: "from", type: "string" }, { name: "to", type: "string" }], docs: "either end changed; both ends are passed" }],
  view: [
    use("Box", { props: { Class: cn("flex flex-col gap-2", ref("className")) }, attrs: { "data-slot": "range-field" } },
      when(and(eq(ref("type"), "number"), has(ref("min")), has(ref("max")), lt(ref("min"), ref("max"))), [
        use("Range", { props: { Min: ref("min"), Max: ref("max"), AriaLabel: ref("fromLabel"), Value: cond(eq(ref("from"), ""), str(ref("min")), ref("from")) }, on: { input: call("emit.change", ref("event.value"), ref("to")) }, attrs: { "data-testid": "range-from" } }),
        use("Range", { props: { Min: ref("min"), Max: ref("max"), AriaLabel: ref("toLabel"), Value: cond(eq(ref("to"), ""), str(ref("max")), ref("to")) }, on: { input: call("emit.change", ref("from"), ref("event.value")) }, attrs: { "data-testid": "range-to" } }),
      ]),
      use("Inline", { props: { Class: "flex items-center gap-2" } },
        use("Input", { props: { Type: ref("type"), Size: "sm", AriaLabel: ref("fromLabel"), Value: ref("from"), Min: str(ref("min")), Max: str(ref("max")) }, on: { input: call("emit.change", ref("event.value"), ref("to")) } }),
        use("Inline", { props: { Class: "text-muted-foreground" } }, text("–")),
        use("Input", { props: { Type: ref("type"), Size: "sm", AriaLabel: ref("toLabel"), Value: ref("to"), Min: str(ref("min")), Max: str(ref("max")) }, on: { input: call("emit.change", ref("from"), ref("event.value")) } }))),
  ],
});

// contracts: the markup could be generated, the behaviour is the programmer's (ports)
const dropZone = contract(`${P}drop-zone`, "DropZone", "A dashed area that takes files by drag and drop or by a file input. The words come from props; the files are handed to the `files` event, nothing is uploaded here.", "drag and drop and the programmatic click on the file input need DOM APIs (DataTransfer, element lookup by id): the behaviour is written by the programmer behind the `files` port", {
  props: [req("label", "string", "accessible name of the zone"), req("title", "string"), prop("text", "string"), req("chooseLabel", "string", "accessible name of the file input"), prop("accept", "string"), prop("multiple", "boolean")],
  className: true,
  events: [{ name: "files", args: [{ name: "files", type: ts("File[]") }], docs: "files were dropped or picked" }],
});
const logoMark = contract(`${P}logo-mark`, "LogoMark", "The app logo mark in a 32 px frame: a disc or a tile with the logo glyph.", "brand glyph data: the mark is the app's own brand; the app supplies the mark through a slot (see LogoSidebar)", {
  props: [prop("variant", ts('"disc" | "tile"'), "frame of the mark", { default: "disc" })],
  className: true,
});
const filterBuilder = contract(`${P}filter-builder`, "FilterBuilder", "Rows \"field, operator, value\" joined by AND. Operators depend on the field type, the value control too. Every change reports the whole list; the list lives in the URL of the caller.", "state and branching on the field type (operator tables, value controls per type) are logic: the markup of one row is generated from Field, Select and Input, the reducer is the programmer's behind the `change` port", {
  records: {
    FilterField: fields(["id", "string"], ["label", "string"], ["type", "string"]),
    FilterCond: fields(["field", "string"], ["op", "string"], ["value", "string"]),
  },
  props: [req("fields", ts("FilterField[]")), req("filters", ts("FilterCond[]")), req("labels", ts("Record<string, string>"), "every word: add, remove, field, operator, value, none, clear, and, yes, no and one per operator")],
  className: true,
  events: [{ name: "change", args: [{ name: "filters", type: ts("FilterCond[]") }], docs: "the whole list after any change" }],
});

export const parts: OrganismSpec[] = [avatar, badgeSquare, barChart, bulkBar, emptyState, field, logoSidebar, meterRow, notice, pageHeader, pager, panel, pill, rating, region, searchField, statTile, tableToolbar, timeline, rangeField, dropZone, logoMark, filterBuilder];
