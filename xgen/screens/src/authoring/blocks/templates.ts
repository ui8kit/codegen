// Template gallery: a heading, filter pills, a grid of template cards and a browse-all button.
// Card and image sizes come from the default preset.
import { each, op, ref, text, use, when, organism, cn } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { empty, id, ifAny, orEmpty, title, tone, density, tsOf } from "../props";
import { frame } from "../components/frames";
import { layoutOf } from "../presets";

const O = "organism.";
const Template = fields(
  ["id", "string"],
  ["title", "string"],
  ["views", "string"],
  ["likes", "string"],
  ["topic", "string"],
);
const Filter = fields(["id", "string"], ["title", "string"], ["value", "string"], ["icon", "string", true]);

const templateGrid = spec(`${O}template-grid`, "TemplateGrid", "Template gallery: a heading, outline filter pills, a grid of template cards and a full-width browse-all button.", {
  records: { Template, Filter, TemplateLabels: fields(["filters", "string"], ["browse", "string"], ["views", "string"], ["likes", "string"]) },
  props: [
    id, title,
    { name: "templates", type: ts("Template[]"), required: true },
    { name: "filters", type: ts("Filter[]"), required: true },
    { name: "browseHref", type: "string", docs: "the address of the full list; none: a button" },
    { name: "labels", type: { record: "TemplateLabels" }, required: true, docs: "the name of the filter row, the browse-all text, the hidden names of the counts" },
    { name: "cols", type: tsOf("1-3", "1-4"), default: "1-4" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "compact" },
    empty,
  ],
  view: (() => {
    // Outline Button 28×r32 pad [3,8], text 10 Bold, icon 16; Tab gap 16
    const filterPill = use("Button", {
      props: { Variant: "outline", Size: "sm", Type: "button", Class: "gap-2" },
      attrs: { "data-testid": "template-filter" },
    },
      when(ref("f.icon"), [use("LucideIcon", { props: { Name: ref("f.icon"), Size: 16 } })]),
      text(ref("f.title")));
    // Card 267×238 r16 pad 12 gap 8; image 243×160 r12; title 15 SemiBold; meta 10 Bold
    const card = use("Box", {
      props: { Class: cn("flex flex-col gap-2 overflow-hidden rounded p-4 inset-ring inset-ring-border", layoutOf("templates.card")) },
      attrs: { "data-testid": "template-card" },
    },
      use("Box", { props: { Class: cn("shrink-0 overflow-hidden", layoutOf("templates.image")) } },
        organism("MediaFrame", { alt: ref("t.title"), ratio: "16/9", className: cn("size-full", layoutOf("media.rounded")) })),
      // Footer 243×46: avatar circle 32 + title 15/24 + meta row h16
      use("Group", { props: { Gap: "4", Align: "center", Class: cn("w-full", layoutOf("templates.footer")) }, attrs: { "data-testid": "template-footer" } },
        use("IconBadge", { props: { Size: "sm", Class: "overflow-hidden" }, attrs: { "data-testid": "template-avatar" } },
          use("LucideIcon", { props: { Name: "layout-template", Size: 16 } })),
        use("Stack", { props: { Gap: "0", Class: "min-w-0 flex-1" } },
          use("Title", { props: { As: 3, Size: "base", Weight: "semibold", Class: "truncate leading-6" } }, text(ref("t.title"))),
          use("Group", { props: { Gap: "4", Align: "center", Class: "h-4 text-muted-foreground" } },
            use("Group", { props: { Gap: "2", Align: "center" } },
              use("LucideIcon", { props: { Name: "eye", Size: 16 } }),
              use("Inline", { props: { Class: "sr-only" } }, text(ref("labels.views"))),
              use("Text", { props: { Size: "xs", Weight: "bold", Class: "leading-4" } }, text(ref("t.views")))),
            use("Group", { props: { Gap: "2", Align: "center" } },
              use("LucideIcon", { props: { Name: "heart", Size: 16 } }),
              use("Inline", { props: { Class: "sr-only" } }, text(ref("labels.likes"))),
              use("Text", { props: { Size: "xs", Weight: "bold", Class: "leading-4" } }, text(ref("t.likes"))))))));
    return [frame({ id: ref("id"), title: "", tone: ref("tone"), density: ref("density"), measure: "fill", className: "py-0" }, [
      use("Stack", { props: { Gap: "8", Align: "stretch" } },
        use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "h-8 w-full flex-wrap" } },
          use("Title", { props: { As: 2, Size: "2xl", Weight: "semibold", Class: "leading-9" }, attrs: { id: op("add", ref("id"), "-title") } }, text(ref("title"))),
          ifAny("filters", [use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" }, attrs: { role: "group", "aria-label": ref("labels.filters"), "data-testid": "template-filters" } },
            each(ref("filters"), "f", ref("f.id"), filterPill))])),
        // no templates: EmptyState; no filters: no filter row (emptyMode label for the list, omit for the filters)
        orEmpty("templates", "layout-template", [use("Grid", { props: { Cols: ref("cols"), Class: "w-full gap-6" }, attrs: { "data-testid": "template-grid" } },
          each(ref("templates"), "t", ref("t.id"), card))]),
        // Full-width Outline Button 1128×32 r32, text 10 Bold
        use("Button", {
          props: { Variant: "outline", Size: "sm", Href: ref("browseHref"), Class: "w-full" },
          attrs: { "data-testid": "template-browse" },
        }, text(ref("labels.browse")))),
    ])];
  })(),
});

export const templateOrganisms: OrganismSpec[] = [templateGrid];
