// Feature showcases beyond the plain grid: a bento grid, tabs, an accordion, a sticky picture beside a scrolling list, an icon wall,
// a before/after comparison, logos beside stats, and a grid of video thumbnails. The motion of any of them (reveal on scroll, a player) is a port contract.
import { and, at, call, cn, coalesce, cond, each, eachAt, eq, or, ref, text, tpl, undef, use, when, organism, len } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, title, tone, tsOf, toneLite, denseLite } from "../props";
import { kids } from "../forms";
import { fluidCols, heading, muted, strong, strongSpan, surface, fitCols } from "../ux";
import { figureBlockOf } from "../components/landmarks";

const O = "organism.";
const base = (extra: Record<string, unknown> = {}) => ({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density"), ...extra });

const bentoGrid = spec(`${O}bento-grid`, "BentoGrid", "Tiles of different sizes in one grid: the large and wide tiles hold the important features. Sizes come from the data (large, wide, small). Axes: layout (bento, even: all tiles alike), media (none, image: a picture in the large tiles), tone, density.", {
  records: { Tile: fields(["id", "string"], ["title", "string"], ["text", "string"], ["icon", "string"], ["size", "string"]) },
  consts: { SPAN: { large: "md:col-span-2 md:row-span-2", wide: "md:col-span-2", small: "" } },
  props: [
    id, title,
    { name: "tiles", type: ts("Tile[]"), required: true },
    empty,
    { name: "layout", type: tsOf("bento", "even"), default: "bento" },
    { name: "media", type: tsOf("none", "image"), default: "none" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(base(), [orEmpty("tiles", "layout-dashboard", [
    use("Grid", { props: { Cols: "1-4", Class: "auto-rows-fr gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("tiles"), "tile", ref("tile.id"),
        use("Card", { props: { Variant: "default", Class: cn("h-full overflow-hidden", cond(eq(ref("density"), "compact"), "gap-4 p-4", ""), cond(eq(ref("layout"), "bento"), at(ref("SPAN"), ref("tile.size")), "")) }, attrs: { "data-testid": "item", "data-size": cond(eq(ref("layout"), "bento"), ref("tile.size"), "even") } },
          use("CardContent", { props: { Class: "flex h-full flex-col gap-4" } },
            use("LucideIcon", { props: { Name: ref("tile.icon"), Size: 24 } }),
            heading(ref("tile.title"), "xl"),
            muted(ref("tile.text")),
            when(and(eq(ref("media"), "image"), or(eq(ref("tile.size"), "large"), eq(ref("layout"), "even"))), [organism("MediaFrame", { alt: ref("tile.title"), ratio: "4/3", className: "mt-auto" })]))))),])
  ])],
});

const featureTabs = spec(`${O}feature-tabs`, "FeatureTabs", "Features behind a tab list: the chosen tab shows its text and a picture. The page keeps the chosen tab (`active`, empty for the first) and updates it on the `select` event. Axes: panel (split: text beside the picture, stack: picture below), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "tabsLabel", type: "string", required: true },
    { name: "active", type: "string", default: "", docs: "id of the chosen feature; empty: the first" },
    { name: "panel", type: tsOf("split", "stack"), default: "split" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  events: [{ name: "select", args: [{ name: "id", type: "string" }], docs: "a tab was chosen" }],
  view: [frame(base(), [orEmpty("features", "layout-grid", [
    use("Stack", { props: { Gap: "6", Align: "stretch" } },
      organism("Switcher", { label: ref("tabsLabel"), className: "w-fit max-w-full flex-wrap" }, kids(
        eachAt(ref("features"), "f", "i", ref("f.id"), organism("SwitcherItem", { active: or(eq(ref("f.id"), ref("active")), and(eq(ref("active"), ""), eq(ref("i"), 0))) }, { on: { click: call("emit.select", ref("f.id")) }, ...kids(text(ref("f.title"))) })))),
      eachAt(ref("features"), "f", "i", ref("f.id"),
        when(or(eq(ref("f.id"), ref("active")), and(eq(ref("active"), ""), eq(ref("i"), 0))), [
          use("Grid", { props: { Cols: cond(eq(ref("panel"), "split"), "1-2", "1"), Class: "items-center gap-8" }, attrs: { "data-testid": "tab-panel", role: "tabpanel" } },
            use("Stack", { props: { Gap: "4" } }, use("LucideIcon", { props: { Name: ref("f.icon"), Size: 24 } }), heading(ref("f.title"), "2xl"), muted(ref("f.text"), "base")),
            organism("MediaFrame", { alt: ref("f.title"), ratio: "4/3" }))]))),])
  ])],
});

const featureAccordion = spec(`${O}feature-accordion`, "FeatureAccordion", "Features as a list of disclosures: icon and title in the summary, the text when open. Axes: expand (first: the first one is open, none: all closed), media (none, image: a picture beside the list), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "expand", type: tsOf("first", "none"), default: "first" },
    { name: "media", type: tsOf("none", "image"), default: "none" },
    { name: "multiple", type: "boolean", default: false, docs: "true: several can be open at once; false: opening one closes the others (native details name)" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(base({ layout: cond(eq(ref("media"), "image"), "split", "stack"), hasMedia: eq(ref("media"), "image") }), [orEmpty("features", "layout-grid", [
    use("Stack", { props: { Gap: "0", Align: "stretch" }, attrs: { "data-testid": "items" } },
      eachAt(ref("features"), "f", "i", ref("f.id"),
        use("Disclosure", { props: { Variant: "item", Name: cond(ref("multiple"), undef(), tpl("{0}-accordion", coalesce(ref("id"), "accordion"))), Open: and(eq(ref("expand"), "first"), eq(ref("i"), 0)) }, attrs: { "data-testid": "item" } },
          use("Summary", { props: { Variant: "item" } }, use("Inline", { props: { Class: "flex min-w-0 items-center justify-start gap-4" } }, use("LucideIcon", { props: { Name: ref("f.icon"), Size: 20 } }), strongSpan(ref("f.title")))),
          use("Text", { props: { Size: "sm", Class: "pb-4 text-muted-foreground" } }, text(ref("f.text")))))),])
  ], [organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })])],
});

const featureSticky = spec(`${O}feature-sticky`, "FeatureSticky", "A picture that stays in view while the feature descriptions scroll beside it. `active` marks the description that is current (the page follows the scroll; that is a port contract). Axes: mediaSide (end, start), item (plain, card), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "active", type: "string", default: "", docs: "id of the current feature" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "item", type: tsOf("plain", "card"), default: "plain" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(base(), [orEmpty("features", "layout-grid", [
    use("Grid", { props: { Cols: "1-2", Class: "items-start gap-8" }, attrs: { "data-testid": "sticky" } },
      use("Box", { props: { Class: cn("md:sticky md:top-8", cond(eq(ref("mediaSide"), "start"), "md:order-first", "md:order-last")) }, attrs: { "data-testid": "sticky-media" } }, organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })),
      use("Stack", { props: { Gap: cond(eq(ref("density"), "compact"), "4", "8"), Align: "stretch" }, attrs: { "data-testid": "items" } },
        each(ref("features"), "f", ref("f.id"),
          use("Stack", { props: { Gap: "2", Class: cn(cond(eq(ref("item"), "card"), surface("p-6"), "py-4"), cond(eq(ref("f.id"), ref("active")), "inset-ring inset-ring-foreground", "")) }, attrs: { "data-testid": "item", "aria-current": cond(eq(ref("f.id"), ref("active")), "true", undef()) } },
            use("LucideIcon", { props: { Name: ref("f.icon"), Size: 24 } }), heading(ref("f.title"), "2xl"), muted(ref("f.text"), "base"))))),])
  ])],
});

const iconWall = spec(`${O}icon-wall`, "IconWall", "A dense grid of small tiles: an icon and a short label. Axes: columns (3, 4, 6), item (tile: icon above the label, chip: icon beside it), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "cols", type: tsOf("3", "4", "6"), default: "4" },
    { name: "item", type: tsOf("tile", "chip"), default: "tile" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  // a chip puts its label beside the icon, so six chips start from two columns on a phone (three would push a long word out)
  derived: [{ name: "askedCols", value: cond(and(eq(ref("item"), "chip"), eq(ref("cols"), "6")), "2-6", fluidCols(ref("cols"))) }, { name: "wallCols", value: fitCols(ref("askedCols"), len(ref("features"))) }],
  view: [frame(base(), [orEmpty("features", "layout-grid", [
    use("Grid", { props: { Cols: ref("wallCols"), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("features"), "f", ref("f.id"),
        use("Box", { props: { Class: cn("flex items-center gap-2", surface(), cond(eq(ref("item"), "tile"), cn("flex-col justify-center text-center", cond(eq(ref("density"), "compact"), "p-4", "p-6")), "px-4 py-2")) }, attrs: { "data-testid": "item" } },
          use("LucideIcon", { props: { Name: ref("f.icon"), Size: cond(eq(ref("item"), "tile"), 24, 16) } }),
          use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("f.title")))))),])
  ])],
});

const beforeAfter = spec(`${O}before-after`, "BeforeAfter", "Two columns that set life without the product against life with it, point by point. Axes: layout (cards: two cards, rows: one row per point), icons (show, hide), tone, density.", {
  records: { Contrast: fields(["id", "string"], ["title", "string"], ["before", "string"], ["after", "string"]), BeforeAfterLabels: fields(["before", "string"], ["after", "string"]) },
  props: [
    id, title,
    { name: "points", type: ts("Contrast[]"), required: true },
    empty,
    { name: "labels", type: { record: "BeforeAfterLabels" }, required: true },
    { name: "layout", type: tsOf("cards", "rows"), default: "cards" },
    { name: "icons", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(base(), [orEmpty("points", "git-compare", [
    when(eq(ref("layout"), "cards"),
      [use("Grid", { props: { Cols: "1-2", Class: "items-stretch gap-4" }, attrs: { "data-testid": "sides" } },
        ...(["before", "after"] as const).map((side) => use("Card", { props: { Variant: side === "after" ? "default" : "muted", Class: cn("h-full", cond(eq(ref("density"), "compact"), "gap-4 p-4", "")) }, attrs: { "data-testid": "side", "data-side": side } },
          use("CardContent", { props: { Class: "flex flex-col gap-4" } },
            heading(ref(`labels.${side}`), "xl"),
            use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" } },
              each(ref("points"), "p", ref("p.id"), use("ListItem", { props: { Class: "flex items-start gap-4" }, attrs: { "data-testid": "item" } },
                when(eq(ref("icons"), "show"), [use("LucideIcon", { props: { Name: side === "after" ? "check" : "x", Size: 16, Class: "h-lh shrink-0 text-sm" } })]),
                use("Text", { props: { Size: "sm" } }, text(ref(`p.${side}`)))))))))) ],
      [use("Stack", { props: { Gap: "2", Align: "stretch" }, attrs: { "data-testid": "rows" } },
        each(ref("points"), "p", ref("p.id"), use("Grid", { props: { Cols: "1-3", Class: cn("items-center gap-4", surface("p-4")) }, attrs: { "data-testid": "item" } },
          strong(ref("p.title")),
          use("Group", { props: { Gap: "2", Align: "start" } }, when(eq(ref("icons"), "show"), [use("LucideIcon", { props: { Name: "x", Size: 16, Class: "h-lh shrink-0 text-sm text-muted-foreground" } })]), muted(ref("p.before"))),
          use("Group", { props: { Gap: "2", Align: "start" } }, when(eq(ref("icons"), "show"), [use("LucideIcon", { props: { Name: "check", Size: 16, Class: "h-lh shrink-0 text-sm text-primary" } })]), use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("p.after")))))))]),])
  ])],
});

const proofBand = spec(`${O}proof-band`, "ProofBand", "Customer logos together with the key numbers: logos above the numbers, or beside them. Axes: layout (above, beside), logos (name, icon), tone, density.", {
  typeImports: [{ from: "LogoCloud", names: ["Logo"] }, { from: "StatsBand", names: ["Stat"] }],
  props: [
    id, title,
    { name: "logos", type: ts("Logo[]"), required: true },
    empty,
    { name: "stats", type: ts("Stat[]"), required: true },
    { name: "layout", type: tsOf("above", "beside"), default: "above" },
    { name: "logoStyle", type: tsOf("name", "icon"), default: "name" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(base({ align: "center" }), [orEmpty("logos", "building-2", [
    use("Grid", { props: { Cols: cond(eq(ref("layout"), "beside"), "1-2", "1"), Class: "items-center gap-8" } },
      use("Group", { props: { Gap: "6", Justify: "center", Class: "flex-wrap text-muted-foreground" }, attrs: { "data-testid": "logos" } },
        each(ref("logos"), "logo", ref("logo.id"), use("Group", { props: { Gap: "2", Align: "center" }, attrs: { "data-testid": "logo" } },
          use("LucideIcon", { props: { Name: ref("logo.icon"), Size: 24 } }),
          use("Text", { props: { Size: "sm", Weight: "semibold", Class: cond(eq(ref("logoStyle"), "icon"), "sr-only", "") } }, text(ref("logo.name")))))),
      use("Grid", { props: { Cols: cond(eq(ref("layout"), "beside"), "2", "1-4"), Class: "gap-6 text-center" }, attrs: { "data-testid": "stats" } },
        each(ref("stats"), "stat", ref("stat.id"), use("Stack", { props: { Gap: "0", Align: "center" }, attrs: { "data-testid": "stat" } },
          use("Text", { props: { Size: "4xl", Weight: "bold" } }, text(ref("stat.value"))), muted(ref("stat.label")))))),])
  ])],
});

const videoGrid = spec(`${O}video-grid`, "VideoGrid", "Video testimonials as thumbnails: a picture, a play button, the name and the company. The player is a port contract (VideoEmbed); here the button emits `play`. Axes: columns (2, 3), caption (below, overlay), tone, density.", {
  typeImports: [{ from: "TestimonialGrid", names: ["Quote"] }],
  props: [
    id, title,
    { name: "quotes", type: ts("Quote[]"), required: true },
    empty,
    { name: "playLabel", type: "string", required: true, docs: "template of the play button's name, e.g. `Play the video from {0}`" },
    { name: "byLine", type: "string", required: true, docs: "template of the line under the name: `{0}, {1}` (role, company)" },
    { name: "cols", type: tsOf("1-2", "1-3"), default: "1-3" },
    { name: "caption", type: tsOf("below", "overlay"), default: "below" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  events: [{ name: "play", args: [{ name: "id", type: "string" }], docs: "a play button was pressed" }],
  view: [frame(base(), [orEmpty("quotes", "video", [
    use("Grid", { props: { Cols: ref("cols"), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("quotes"), "q", ref("q.id"),
        figureBlockOf("m-0 flex flex-col gap-4", "item",
          use("Box", { props: { Class: "relative" } },
            organism("MediaFrame", { alt: ref("q.author"), ratio: "16/9" }),
            use("Button", { props: { Variant: "default", Size: "default", Type: "button", Class: "absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded p-0" }, on: { click: call("emit.play", ref("q.id")) }, attrs: { "aria-label": tpl(ref("playLabel"), ref("q.author")), "data-testid": "play" } },
              use("LucideIcon", { props: { Name: "play", Size: 20 } })),
            when(eq(ref("caption"), "overlay"), [use("Box", { props: { Class: "absolute inset-x-0 bottom-0 rounded bg-background p-4" }, attrs: { "data-testid": "caption" } }, strong(ref("q.author"), "sm"), muted(tpl(ref("byLine"), ref("q.role"), ref("q.company")), "xs"))])),
          when(eq(ref("caption"), "below"), [use("Text", { props: { Tag: "figcaption" }, attrs: { "data-testid": "caption" } }, strong(ref("q.author"), "sm"), muted(tpl(ref("byLine"), ref("q.role"), ref("q.company")), "xs"))])))),])
  ])],
});

export const showcaseOrganisms: OrganismSpec[] = [bentoGrid, featureTabs, featureAccordion, featureSticky, iconWall, beforeAfter, proofBand, videoGrid];
