// The layouts of SitemapFooter: link groups as columns (FooterColumns) and the card (FooterCard).
import { cn, each, ref, text, use } from "../../build";
import { spec, ts } from "../kit";
import { landingWide } from "./frames";
import { strong } from "../ux";
import { ifAny } from "../props";
import { layoutOf } from "../presets";
import { navBlockOf } from "./landmarks";
import { groupLinks } from "./nav";

/** the columns layout of SitemapFooter: one column of links per group */
export const footerColumns = spec("pattern.footer-columns", "FooterColumns", "The link groups of SitemapFooter as columns: a group title over its links, up to five columns.", {
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }],
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the link groups" },
    { name: "groups", type: ts("MegaGroup[]"), required: true },
  ],
  view: [ifAny("groups", [
    use("Block", { props: { Tag: "nav" }, attrs: { "aria-label": ref("label") } },
      use("Grid", { props: { Cols: "1", Class: "grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5" }, attrs: { "data-testid": "footer-groups" } },
        each(ref("groups"), "g", ref("g.id"), use("Stack", { props: { Gap: "2" }, attrs: { "data-testid": "group" } },
          strong(ref("g.title"), "sm"),
          use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } }, groupLinks("g", "text-sm text-muted-foreground"))))))]),
  ],
});

/** footer card: the brand mark and the link groups in one rounded card (the card layout of SitemapFooter) */
export const footerCard = spec("pattern.footer-card", "FooterCard", "The card layout of SitemapFooter: the brand mark and word, then the link groups in one row, in a rounded card.", {
  frame: true,
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }],
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the link groups" },
    { name: "brand", type: "string", required: true },
    { name: "groups", type: ts("MegaGroup[]"), required: true },
  ],
  view: (() => {
    // Frame footer columns: title + links gap 12, link line ~20px (Item gap 12).
    const groupCol = use("Stack", { props: { Gap: "4" }, attrs: { "data-testid": "group" } },
      use("Text", { props: { Size: "xs", Weight: "semibold", Class: "leading-5" } }, text(ref("g.title"))),
      use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" } }, groupLinks("g", "text-xs leading-5 text-muted-foreground")));
    // the brand mark and word, then the link groups in one row (no tagline in the card)
    // The 1128 container centers itself (236 each side on the 1600 frame), so the footer needs no side padding of its own.
    return [use("Block", { props: { Tag: "footer", Class: "py-8" }, attrs: { "data-testid": "site-footer", "data-layout": "card" } },
      use("Container", { props: { Class: cn(landingWide, "px-0") }, attrs: { "data-slot": "container" } },
        use("Box", { props: { Class: cn("flex w-full flex-row items-start overflow-hidden bg-muted p-10", layoutOf("footer.card")) }, attrs: { "data-testid": "footer-card" } },
          use("Group", { props: { Gap: "4", Align: "center", Class: cn("h-8 shrink-0", layoutOf("footer.brand")) }, attrs: { "data-testid": "footer-brand" } },
            use("Inline", { props: { Class: "flex size-8 items-center justify-center rounded bg-foreground text-background" } },
              use("LucideIcon", { props: { Name: "hexagon", Size: 16 } })),
            strong(ref("brand"), "base", "bold")),
          ifAny("groups", [navBlockOf(ref("label"), "min-w-0 flex-1", undefined,
            use("Group", { props: { Gap: "0", Align: "start", Class: cn("flex w-full flex-nowrap justify-between", layoutOf("footer.groups")) }, attrs: { "data-testid": "footer-groups" } },
              each(ref("groups"), "g", ref("g.id"), groupCol)))]))))];
  })(),
});
