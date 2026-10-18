// The work of a studio or a person: a photo gallery in five shapes, projects in five shapes, and milestones on a timeline.
import { and, cn, cond, each, eachAt, eq, firstOf, len, or, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, Value } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { heading, muted, strong, surface } from "../ux";
import { figureBlockOf } from "../components/landmarks";

const O = "organism.";
const lead = { name: "lead", type: "string" as const, default: "" };
const common = { id: ref("id"), title: ref("title"), lead: ref("lead"), tone: ref("tone"), density: ref("density") };
/** the ratio of a photo by its size in the masonry: tall pictures stand, wide ones lie */
const ratioOf = (size: Value): Value => cond(eq(size, "tall"), "3/4", cond(eq(size, "wide"), "16/9", cond(eq(size, "large"), "4/3", "1/1")));

const photoGallery = spec(`${O}photo-gallery`, "PhotoGallery", "Photos in a grid, a masonry of mixed heights, a mosaic with one big tile, a featured picture over a strip of thumbnails, or cards with a title and a tag. Static markup: the featured layout's arrows are the page's. Axes: layout (grid, masonry, mosaic, featured, cards), captions (show, hide), tone, density.", {
  records: { Photo: fields(["id", "string"], ["title", "string"], ["tag", "string"], ["size", "string"]), PhotoLabels: fields(["previous", "string"], ["next", "string"], ["counter", "string"]) },
  props: [
    id, title, lead,
    { name: "photos", type: ts("Photo[]"), required: true },
    empty,
    { name: "labels", type: { record: "PhotoLabels" }, required: true },
    { name: "layout", type: tsOf("grid", "masonry", "mosaic", "featured", "cards"), default: "grid" },
    { name: "captions", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(common, [orEmpty("photos", "image", [
    when(eq(ref("layout"), "featured"),
      [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "featured" } },
        organism("MediaFrame", { alt: ref("title"), ratio: "16/9" }),
        use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } },
          use("Stack", { props: { Gap: "0" } }, strong(firstOf(ref("photos"), "title")), muted(tpl(ref("labels.counter"), 1, len(ref("photos"))), "xs")),
          use("Group", { props: { Gap: "2" } },
            use("Button", { props: { Variant: "outline", Size: "sm", Layout: "icon", AriaLabel: ref("labels.previous") } }, use("LucideIcon", { props: { Name: "chevron-left", Size: 16 } })),
            use("Button", { props: { Variant: "outline", Size: "sm", Layout: "icon", AriaLabel: ref("labels.next") } }, use("LucideIcon", { props: { Name: "chevron-right", Size: 16 } })))),
        use("Box", { props: { Class: "grid grid-cols-3 gap-2 sm:grid-cols-9" }, attrs: { "data-testid": "thumbs" } },
          eachAt(ref("photos"), "p", "i", ref("p.id"),
            organism("MediaFrame", { alt: ref("p.title"), ratio: "1/1", className: cond(eq(ref("i"), 0), "ring-2 ring-foreground", "") }))))],
      [use("Box", { props: { Class: cond(eq(ref("layout"), "masonry"), "columns-1 gap-4 sm:columns-2 lg:columns-3", cond(eq(ref("layout"), "mosaic"), "grid grid-cols-2 gap-4 md:grid-cols-4", "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3")) }, attrs: { "data-testid": "items" } },
        eachAt(ref("photos"), "p", "i", ref("p.id"),
          figureBlockOf(cn("flex flex-col gap-2", cond(eq(ref("layout"), "masonry"), "mb-4 break-inside-avoid", ""), cond(and(eq(ref("layout"), "mosaic"), eq(ref("i"), 0)), "col-span-2 row-span-2", ""), cond(eq(ref("layout"), "cards"), surface("p-4"), "")), "item",
            organism("MediaFrame", { alt: ref("p.title"), ratio: cond(eq(ref("layout"), "masonry"), ratioOf(ref("p.size")), cond(eq(ref("layout"), "grid"), "4/3", "1/1")), className: cond(eq(ref("layout"), "mosaic"), "h-full", "") }),
            when(and(eq(ref("captions"), "show"), eq(ref("layout"), "cards")), [use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } }, strong(ref("p.title"), "sm"), use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("p.tag"))))]),
            when(and(eq(ref("captions"), "show"), or(eq(ref("layout"), "grid"), eq(ref("layout"), "masonry"))), [use("Box", { props: { Class: "text-sm text-muted-foreground" }, attrs: { "data-testid": "caption" } }, text(ref("p.title")))]))))]),])
  ])],
});

const projectGrid = spec(`${O}project-grid`, "ProjectGrid", "Projects of a studio or a person: cards with tags and links, a compact grid, tiles with the caption over the picture, a bento with one big project, or a list beside a collage. Axes: layout (cards, compact, overlay, bento, list), tone, density.", {
  records: { Project: fields(["id", "string"], ["title", "string"], ["category", "string"], ["year", "number"], ["summary", "string"], ["tags", "string[]"], ["featured", "boolean"], ["client", "string"], ["href", "string", true]), ProjectLabels: fields(["featured", "string"], ["view", "string"], ["case", "string"]) },
  props: [
    id, title, lead,
    { name: "projects", type: ts("Project[]"), required: true },
    empty,
    { name: "labels", type: { record: "ProjectLabels" }, required: true },
    { name: "layout", type: tsOf("cards", "compact", "overlay", "bento", "list"), default: "cards" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ ...common, layout: cond(eq(ref("layout"), "list"), "split", "stack"), hasMedia: eq(ref("layout"), "list"), mediaAlign: "start" }, [orEmpty("projects", "folder-open", [
    when(eq(ref("layout"), "list"),
      [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "items" } },
        each(ref("projects"), "p", ref("p.id"),
          use("Group", { props: { Gap: "4", Align: "start", Class: "border-b border-border pb-4" }, attrs: { "data-testid": "item" } },
            organism("MediaFrame", { alt: ref("p.title"), ratio: "1/1", className: "size-16 shrink-0" }),
            use("Stack", { props: { Gap: "2", Align: "stretch", Class: "flex-1" } },
              use("Group", { props: { Gap: "4", Justify: "between" } }, strong(ref("p.title"), "sm"), muted(ref("p.year"), "xs")),
              muted(ref("p.summary"))))))],
      [organism("ProjectTiles", { projects: ref("projects"), labels: ref("labels"), layout: ref("layout") })]),])
  ], [use("Box", { props: { Class: "grid grid-cols-2 gap-4" }, attrs: { "data-testid": "collage" } },
    organism("MediaFrame", { alt: ref("title"), ratio: "3/4" }), organism("MediaFrame", { alt: ref("title"), ratio: "3/4", className: "mt-8" }))])],
});

const milestoneTimeline = spec(`${O}milestone-timeline`, "MilestoneTimeline", "Milestones on a line: the year, a tag, a title and a sentence each. Axes: layout (split: a vertical line beside a picture, stacked: a vertical line in a narrow column, row: a horizontal line of columns), tone, density.", {
  records: { Milestone: fields(["id", "string"], ["date", "string"], ["title", "string"], ["text", "string"], ["tag", "string"]) },
  props: [
    id, title, lead,
    { name: "milestones", type: ts("Milestone[]"), required: true },
    empty,
    { name: "layout", type: tsOf("split", "stacked", "row"), default: "split" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ ...common, layout: cond(eq(ref("layout"), "split"), "split", "stack"), hasMedia: eq(ref("layout"), "split"), mediaSide: "start", mediaAlign: "start", measure: cond(eq(ref("layout"), "stacked"), "2xl", "default") }, [orEmpty("milestones", "milestone", [
    use("List", { props: { Tag: "ol", Class: cond(eq(ref("layout"), "row"), "grid grid-cols-1 gap-8 border-t border-border sm:grid-cols-2 lg:grid-cols-4", "flex flex-col gap-8 border-l border-border") }, attrs: { "data-testid": "items" } },
      each(ref("milestones"), "m", ref("m.id"),
        use("ListItem", { props: { Class: cond(eq(ref("layout"), "row"), "relative flex flex-col gap-2 pt-6", "relative flex flex-col gap-2 pl-6") }, attrs: { "data-testid": "item" } },
          use("Inline", { props: { Class: cond(eq(ref("layout"), "row"), "absolute top-0 left-0 size-2 -translate-y-1/2 rounded bg-primary", "absolute top-2 left-0 size-2 -translate-x-1/2 rounded bg-primary") }, attrs: { "aria-hidden": "true" } }),
          use("Group", { props: { Gap: "2", Align: "center" } }, use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("m.date"))), use("Badge", { props: { Variant: "outline", Size: "sm" } }, text(ref("m.tag")))),
          heading(ref("m.title"), "lg"),
          muted(ref("m.text"))))),])
  ], [organism("MediaFrame", { alt: ref("title"), ratio: "3/4" })])],
});

export const workOrganisms: OrganismSpec[] = [photoGallery, projectGrid, milestoneTimeline];
