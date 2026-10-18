// Parts of PageTrail: the breadcrumbs, and the aside at the end of the head (one figure, a note card, or four key facts).
import { eachAt, eq, len, lt, ref, sub, text, use, when } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { muted, strong, surface } from "../ux";
import { tsOf } from "../props";

export const pageCrumbs = spec("pattern.page-crumbs", "PageCrumbs", "The breadcrumbs of an inner page: the parent pages (links where they have an href) separated by chevrons; the last entry is the current page and is not a link.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [{ name: "label", type: "string", required: true, docs: "accessible name of the breadcrumbs" }, { name: "crumbs", type: ts("NavLink[]"), required: true }],
  derived: [{ name: "last", value: sub(len(ref("crumbs")), 1) }],
  view: [use("Block", { props: { Tag: "nav" }, attrs: { "aria-label": ref("label"), "data-testid": "crumbs" } },
    use("List", { props: { Class: "m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-muted-foreground" } },
      eachAt(ref("crumbs"), "c", "i", ref("c.id"), use("ListItem", { props: { Class: "flex items-center gap-2" } },
        // a parent page: a link where the app routes pages (href from its slug), else its name; the chevron either way
        when(lt(ref("i"), ref("last")), [when(ref("c.href"), [use("Link", { props: { Href: ref("c.href"), Variant: "muted", Size: "sm" }, attrs: { "data-testid": "crumb" } }, text(ref("c.name")))],
          [use("Inline", { attrs: { "data-testid": "crumb" } }, text(ref("c.name")))]),
          use("LucideIcon", { props: { Name: "chevron-right", Size: 16 } })],
        [use("Inline", { props: { Class: "font-medium text-foreground" }, attrs: { "aria-current": "page" } }, text(ref("c.name")))])))))],
});

export const pageAside = spec("pattern.page-aside", "PageAside", "The aside at the end of a page head: one large figure with its caption, a note card with a glyph, or four key facts as cards in two columns.", {
  typeImports: [{ from: "PageTrail", names: ["PageExtras"] }],
  props: [{ name: "extras", type: ts("PageExtras"), required: true }, { name: "mode", type: tsOf("none", "figure", "note", "facts"), default: "figure" }],
  view: [when(eq(ref("mode"), "figure"), [use("Stack", { props: { Gap: "0", Align: "end", Class: "text-end" }, attrs: { "data-testid": "page-figure" } },
    strong(ref("extras.value"), "4xl", "bold"), muted(ref("extras.caption"), "xs"))]),
  when(eq(ref("mode"), "note"), [use("Group", { props: { Gap: "4", Align: "start", Class: surface("max-w-xs p-4") }, attrs: { "data-testid": "page-note" } },
    use("LucideIcon", { props: { Name: ref("extras.icon"), Size: 20 } }),
    use("Stack", { props: { Gap: "0" } }, strong(ref("extras.value"), "lg", "bold"), use("Text", { props: { Size: "sm", Weight: "medium" } }, text(ref("extras.caption"))), muted(ref("extras.note"), "xs")))]),
  when(eq(ref("mode"), "facts"), [use("Box", { props: { Class: "grid grid-cols-2 gap-4" } },
    eachAt(ref("extras.facts"), "s", "i", ref("s.id"), when(lt(ref("i"), 4), [use("Stack", { props: { Gap: "0", Class: surface("p-4") }, attrs: { "data-testid": "page-fact" } },
      strong(ref("s.value"), "lg", "bold"), use("Text", { props: { Size: "xs", Weight: "medium" } }, text(ref("s.label"))), muted(ref("s.hint"), "xs"))])))])],
});

export const pageTrailParts: OrganismSpec[] = [pageCrumbs, pageAside];
