// The head of an inner page with its trail: breadcrumbs over the badge, the heading and the lead, with an optional aside at the end
// (one large figure, a note card, or four key facts).
import { cn, cond, eq, gt, len, ne, op, ref, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { wide } from "../components/frames";
import { id, tsOf, toneLite } from "../props";

const pageTrail = spec("organism.page-trail", "PageTrail", "The head of an inner page with breadcrumbs. Axes: aside (none, figure: one large figure such as a count or a total, note: a small card with a glyph such as a delivery promise or a document version, facts: four key facts in two columns), tone.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }, { from: "StatsBand", names: ["Stat"] }],
  records: { PageExtras: fields(["value", "string"], ["caption", "string"], ["note", "string"], ["icon", "string"], ["facts", "Stat[]"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "label", type: "string", required: true, docs: "accessible name of the breadcrumbs" },
    { name: "crumbs", type: ts("NavLink[]"), required: true, docs: "the trail of pages (a parent_id chain): the parent pages, then the current page; empty: no breadcrumbs" },
    { name: "extras", type: { record: "PageExtras" }, required: true, docs: "the figure or note (value, caption, note, icon) and the facts" },
    { name: "aside", type: tsOf("none", "figure", "note", "facts"), default: "none" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "tone", type: toneLite, default: "default" },
  ],
  derived: [{ name: "titleId", value: op("add", ref("id"), "-title") }],
  view: [use("Block", { props: { Tag: "section", Class: cn("py-8", cond(eq(ref("tone"), "muted"), "bg-muted", "")) }, attrs: { "aria-labelledby": ref("titleId"), "data-testid": "section", "data-tone": ref("tone"), "data-aside": ref("aside") } },
    use("Container", { props: { Class: cn(wide, "flex flex-col gap-6") }, attrs: { "data-slot": "container" } },
      // no crumbs (a top page): no breadcrumb nav
      when(gt(len(ref("crumbs")), 0), [organism("PageCrumbs", { label: ref("label"), crumbs: ref("crumbs") })]),
      use("Box", { props: { Class: cond(eq(ref("aside"), "facts"), "grid grid-cols-1 items-center gap-8 lg:grid-cols-2", "flex flex-col gap-6 md:flex-row md:items-end md:justify-between") } },
        use("Stack", { props: { Gap: "4", Align: "start", Class: "min-w-0" } },
          organism("SectionHeader", { titleId: ref("titleId"), title: ref("title"), heading: { level: ref("level"), badge: ref("badge") }, lead: ref("lead") })),
        when(ne(ref("aside"), "none"), [organism("PageAside", { extras: ref("extras"), mode: ref("aside") })]))))],
});

export const pageTrailOrganisms: OrganismSpec[] = [pageTrail];
