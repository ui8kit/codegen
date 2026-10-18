// The project tiles of ProjectGrid: cards with tags and links, a compact grid, captions over the pictures, or a bento with one big project.
import { and, cn, cond, each, eachAt, eq, ne, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, surface } from "../ux";
import { articleBlockOf } from "./landmarks";
import { menuEntry } from "./nav";

const tags = (list: string) => use("Group", { props: { Gap: "2", Class: "flex-wrap" } }, each(ref(list), "k", ref("k"), use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("k")))));

export const projectTiles = spec("pattern.project-tiles", "ProjectTiles", "The projects of ProjectGrid as tiles: cards (picture, featured badge, category and year, title, summary, tags, two links), compact cards in four columns, captions over the pictures, or a bento where the first project takes a big tile.", {
  typeImports: [{ from: "ProjectGrid", names: ["Project", "ProjectLabels"] }],
  props: [
    { name: "projects", type: ts("Project[]"), required: true },
    { name: "labels", type: ts("ProjectLabels"), required: true },
    { name: "layout", type: tsOf("cards", "compact", "overlay", "bento", "list"), default: "cards" },
  ],
  derived: [
    { name: "over", value: cond(eq(ref("layout"), "overlay"), true, eq(ref("layout"), "bento")) },
  ],
  view: [use("Box", { props: { Class: cond(eq(ref("layout"), "compact"), "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3") }, attrs: { "data-testid": "items" } },
    eachAt(ref("projects"), "p", "i", ref("p.id"),
      articleBlockOf(cn("flex flex-col gap-4", cond(ref("over"), "relative", surface("p-4")), cond(and(eq(ref("layout"), "bento"), eq(ref("i"), 0)), "sm:col-span-2 lg:row-span-2", "")), "item",
        use("Box", { props: { Class: cond(ref("over"), "h-full", "relative") } },
          organism("MediaFrame", { alt: ref("p.title"), ratio: cond(eq(ref("layout"), "compact"), "1/1", cond(ref("over"), "3/4", "4/3")), className: cond(ref("over"), "h-full", "") }),
          when(and(ref("p.featured"), ne(ref("layout"), "compact")), [use("Badge", { props: { Variant: "default", Size: "default", Class: "absolute left-4 top-4" }, attrs: { "data-testid": "featured" } }, text(ref("labels.featured")))])),
        use("Stack", { props: { Gap: "2", Align: "stretch", Class: cond(ref("over"), "absolute right-4 bottom-4 left-4 rounded bg-background p-4", "") } },
          muted(tpl("{0}, {1}", ref("p.category"), ref("p.year")), "xs"),
          use("Title", { props: { As: 3, Size: cond(eq(ref("layout"), "compact"), "sm", "lg"), Weight: "semibold" } }, text(ref("p.title"))),
          when(ne(ref("layout"), "compact"), [muted(ref("p.summary"))]),
          when(eq(ref("layout"), "cards"), [tags("p.tags"),
            use("Group", { props: { Gap: "4", Class: "pt-2" } },
              menuEntry(ref("p.href"), { cls: "inline-flex items-center gap-2 text-sm font-medium" }, text(ref("labels.case")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } })),
              menuEntry(ref("p.href"), { cls: "inline-flex items-center gap-2 text-sm font-medium" }, text(ref("labels.view")), use("LucideIcon", { props: { Name: "external-link", Size: 16 } })))]))))),
  ],
});

export const workParts: OrganismSpec[] = [projectTiles];
