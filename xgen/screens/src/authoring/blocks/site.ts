// The organisms of a small marketing site: header with skip link, footer, hero, feature grid, plan tiers, FAQ, call-to-action band.
// Each one is drawn by SectionFrame / MediaFrame / ActionGroup and varies on axes (layout, columns, media side, density, tone, emphasis)
// that are plain props: a block (authoring/gallery/blocks.ts) names the combinations. Every text comes in through props or labels.
import { and, call, cn, cond, eq, op, ref, text, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { cols, density, empty, id, orEmpty, title, tone, tsOf } from "../props";
import { frame, wide } from "../components/frames";
import { layoutOf } from "../presets";
import { featureRecord, featureItem, featureCards, featureRows } from "../components/features";
import { navBlockOf } from "../components/landmarks";
import { menuEntry } from "../components/nav";

const O = "organism.";

const siteHeader = spec(`${O}site-header`, "SiteHeader", "The page header: a skip link to the main content, the brand, the two navigation links (the current one carries aria-current) and the theme button. `current` is the route area. Axes: layout (inline, stacked), position (static, sticky), actions (none, cta).", {
  records: {
    SiteHeaderLabels: fields(["skip", "string"], ["brand", "string"], ["nav", "string"], ["home", "string"], ["pricing", "string"], ["theme", "string"]),
    SiteRoutes: fields(["home", "string", true], ["pricing", "string", true]),
  },
  props: [
    { name: "labels", type: { record: "SiteHeaderLabels" }, required: true },
    { name: "routes", type: { record: "SiteRoutes" }, docs: "the addresses of the two pages, from the app; none: the brand and the menu are text, not links" },
    { name: "current", type: "string", required: true, docs: "the area of the current route: home or pricing" },
    { name: "layout", type: tsOf("inline", "stacked"), default: "inline", docs: "inline: brand left, links and button right; stacked: all centered in rows" },
    { name: "position", type: tsOf("static", "sticky"), default: "static", docs: "sticky: stays at the top while the page scrolls" },
    { name: "actions", type: tsOf("none", "cta"), default: "none", docs: "cta: a call-to-action button after the navigation" },
    { name: "cta", type: "string", docs: "text of the call to action" },
    { name: "ctaHref", type: "string" },
  ],
  events: [{ name: "theme", args: [], docs: "the theme button was pressed" }],
  view: [
    use("Block", { props: { Tag: "header", Class: cn("border-b border-border bg-background", cond(eq(ref("position"), "sticky"), "sticky top-0 z-40", "")) }, attrs: { "data-testid": "site-header", "data-layout": ref("layout") } },
      use("LinkPlain", { props: { Href: "#main-content", Class: "sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:inset-ring focus:inset-ring-border" }, attrs: { "data-testid": "skip-link" } }, text(ref("labels.skip"))),
      use("Container", { attrs: { "data-slot": "container" }, props: { Class: cn(wide, "flex flex-wrap gap-4 py-4", cond(eq(ref("layout"), "stacked"), "flex-col items-center", "items-center justify-between")) } },
        menuEntry(ref("routes.home"), { cls: "text-lg font-medium", testid: "brand" }, text(ref("labels.brand"))),
        navBlockOf(ref("labels.nav"), undefined, "site-nav",
          use("Group", { props: { Gap: "4", Align: "center" } },
            menuEntry(ref("routes.home"), { cls: "font-semibold", current: eq(ref("current"), "home"), testid: "nav-link" }, text(ref("labels.home"))),
            menuEntry(ref("routes.pricing"), { cls: "font-semibold", current: eq(ref("current"), "pricing"), testid: "nav-link" }, text(ref("labels.pricing"))))),
        use("Group", { props: { Gap: "4", Align: "center" } },
          use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("emit.theme") }, attrs: { "data-testid": "theme-toggle" } }, text(ref("labels.theme"))),
          when(and(eq(ref("actions"), "cta"), ref("cta")), [use("Button", { props: { Variant: "default", Size: "sm", Href: ref("ctaHref") }, attrs: { "data-testid": "header-cta" } }, text(ref("cta")))])))),
  ],
});

const siteFooter = spec(`${O}site-footer`, "SiteFooter", "The page footer: the copyright line and the same two links. Axes: layout (minimal, centered), density (default, compact).", {
  records: { SiteFooterLabels: fields(["copyright", "string"], ["nav", "string"], ["home", "string"], ["pricing", "string"]) },
  typeImports: [{ from: "SiteHeader", names: ["SiteRoutes"] }],
  props: [
    { name: "labels", type: { record: "SiteFooterLabels" }, required: true },
    { name: "routes", type: ts("SiteRoutes"), docs: "the addresses of the two pages, from the app; none: text, not links" },
    { name: "layout", type: tsOf("minimal", "centered"), default: "minimal", docs: "minimal: one row; centered: stacked and centered" },
    { name: "density", type: tsOf("default", "compact"), default: "default" },
  ],
  view: [
    use("Block", { props: { Tag: "footer", Class: "mt-12 border-t border-border" }, attrs: { "data-testid": "site-footer", "data-layout": ref("layout") } },
      use("Container", { attrs: { "data-slot": "container" }, props: { Class: cn(wide, "flex flex-wrap items-center gap-4", cond(eq(ref("density"), "compact"), "py-4", "py-6"), cond(eq(ref("layout"), "centered"), "flex-col text-center", "justify-between")) } },
        use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "copyright" } }, text(ref("labels.copyright"))),
        navBlockOf(ref("labels.nav"), undefined, undefined,
          use("Group", { props: { Gap: "4" } },
            menuEntry(ref("routes.home"), { cls: "font-semibold" }, text(ref("labels.home"))),
            menuEntry(ref("routes.pricing"), { cls: "font-semibold" }, text(ref("labels.pricing"))))))),
  ],
});

const featureGrid = spec(`${O}feature-grid`, "FeatureGrid", "A section with a heading and the features as a grid of cards or tiles, or as rows with a picture. Icons are Lucide names. Axes: layout (grid, rows), columns, item (card, tile, cell: bordered tile with a round icon), media side (rows), density, tone.", {
  records: { Feature: featureRecord },
  typeImports: [{ from: "SectionFrame", names: ["HeadLink"] }],
  props: [
    id, title,
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "action", type: ts("HeadLink"), docs: "optional link opposite the heading" },
    { name: "layout", type: tsOf("grid", "rows"), default: "grid" },
    { name: "cols", type: cols, default: "1-3", docs: "columns of the grid layout (responsive)" },
    featureItem,
    { name: "mediaSide", type: tsOf("end", "start", "alternate"), default: "end", docs: "rows layout: side of the picture; alternate swaps it every row" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  view: (() => {
    const grid = organism("FeatureCards", { features: ref("features"), cols: ref("cols"), item: ref("item") });
    const rows = organism("FeatureRows", { features: ref("features"), mediaSide: ref("mediaSide") });
    // cell head: a small title and a view-all link
    const cellHead = use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "w-full" } },
      use("Title", { props: { As: 2, Size: "sm", Weight: "semibold", Class: "leading-7" }, attrs: { id: op("add", ref("id"), "-title") } }, text(ref("title"))),
      // the view-all link only with an address (no "#/" stand-in): no href, no link
      when(and(ref("action.label"), ref("action.href")), [use("Link", { props: { Href: ref("action.href"), Variant: "default", Class: cn(layoutOf("text.tiny"), "shrink-0 font-medium leading-5") }, attrs: { "data-testid": "section-action" } }, text(ref("action.label")))]));
    return [when(eq(ref("item"), "cell"),
      [frame({ id: ref("id"), title: "", tone: ref("tone"), density: ref("density"), measure: "fill", className: "py-0" }, [cellHead, orEmpty("features", "layout-grid", [grid])])],
      [frame({ id: ref("id"), title: ref("title"), action: ref("action"), tone: ref("tone"), density: ref("density") }, [
        orEmpty("features", "layout-grid", [when(eq(ref("layout"), "rows"), [rows], [grid])])])])];
  })(),
});

export const siteOrganisms: OrganismSpec[] = [siteHeader, siteFooter, featureCards, featureRows, featureGrid];

