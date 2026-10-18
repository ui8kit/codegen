// Parts of MediaList: figures, a featured review, numbered steps, latest posts, topic rows and contact buttons with support figures.
import { add, cond, eachAt, eq, lt, ref, str, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong, surface } from "../ux";
import { menuEntry } from "./nav";

const types = [{ from: "MediaList", names: ["MediaExtras", "MediaListLabels"] }];
const extras = { name: "extras", type: ts("MediaExtras"), required: true };
const labels = { name: "labels", type: ts("MediaListLabels"), required: true };
/** the first `n` entries of a list */
const first = (list: string, as: string, n: Value, node: ViewNode): ViewNode => eachAt(ref(list), as, "i", ref(`${as}.id`), when(lt(ref("i"), n), [node]));
const glyph = (icon: Value, cls: string): ViewNode => use("Inline", { props: { Class: cls } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }));
const tileCls = "flex size-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground";
const listHead = strong(ref("labels.list"), "sm");

export const mediaFigures = spec("pattern.media-figures", "MediaFigures", "The figures of MediaList: four in two columns, centered, or three in a row.", {
  typeImports: types,
  props: [extras, { name: "mode", type: tsOf("grid", "row"), default: "grid" }],
  view: [use("Box", { props: { Class: cond(eq(ref("mode"), "grid"), "grid grid-cols-2 gap-6 text-center", "grid grid-cols-3 gap-6") } },
    first("extras.stats", "s", cond(eq(ref("mode"), "grid"), 4, 3), use("Stack", { props: { Gap: "0", Align: cond(eq(ref("mode"), "grid"), "center", "start") }, attrs: { "data-testid": "media-stat" } },
      strong(ref("s.value"), "3xl", "bold"), muted(ref("s.label")))))],
});

export const mediaReview = spec("pattern.media-review", "MediaReview", "The featured review of MediaList in a muted card: a label with the stars, the text in quotes and the author.", {
  typeImports: types,
  props: [extras, labels],
  view: [first("extras.reviews", "r", 1, use("Stack", { props: { Gap: "4", Align: "stretch", Class: "rounded bg-muted p-6" }, attrs: { "data-testid": "media-review" } },
    use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "flex-wrap" } },
      use("Text", { props: { Size: "sm", Weight: "medium" } }, text(ref("labels.featured"))),
      organism("Rating", { value: ref("r.rating"), label: tpl(ref("labels.rating"), ref("r.rating")), size: 16 })),
    use("Text", { props: { Size: "base" } }, text(tpl("“{0}”", ref("r.text")))),
    muted(tpl("{0} · {1}", ref("r.author"), ref("r.date")))))],
});

export const mediaSteps = spec("pattern.media-steps", "MediaSteps", "The steps of MediaList as numbered rows: the number, a glyph, the title and the text.", {
  typeImports: types,
  props: [extras, labels],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch" } }, listHead,
    eachAt(ref("extras.steps"), "s", "i", ref("s.id"), use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "media-step" } },
      use("Text", { props: { Size: "sm", Weight: "semibold", Class: "w-6 shrink-0 text-primary" } }, text(tpl("0{0}", str(add(ref("i"), 1))))),
      glyph(ref("s.icon"), "flex size-6 shrink-0 items-center justify-center text-primary"),
      use("Stack", { props: { Gap: "0" } }, strong(ref("s.title"), "sm"), muted(ref("s.text"))))))],
});

export const mediaPosts = spec("pattern.media-posts", "MediaPosts", "The latest posts of MediaList as rows: a dot, the title, the date and reading time.", {
  typeImports: types,
  props: [extras, labels],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch" } }, listHead,
    first("extras.posts", "p", 3, use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "media-post" } },
      use("Inline", { props: { Class: "mt-2 size-2 shrink-0 rounded-full bg-primary" } }),
      use("Stack", { props: { Gap: "0" } }, menuEntry(ref("p.href"), { size: "sm", cls: "text-sm font-medium" }, text(ref("p.title"))),
        muted(tpl("{0} · {1}", ref("p.date"), tpl(ref("labels.minutes"), ref("p.minutes"))), "xs")))))],
});

export const mediaTopics = spec("pattern.media-topics", "MediaTopics", "The topics of MediaList as card rows: a glyph tile, the name, the count and an arrow.", {
  typeImports: types,
  props: [extras, labels],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch" } }, listHead,
    first("extras.topics", "c", 5, menuEntry(ref("c.href"), { variant: "block", cls: surface("flex w-full items-center gap-4 p-4"), testid: "media-topic", block: true },
      glyph(ref("c.icon"), tileCls),
      use("Stack", { props: { Gap: "0", Class: "min-w-0 flex-1" } }, strong(ref("c.name"), "sm"), muted(tpl(ref("labels.count"), ref("c.count")), "xs")),
      use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }))))],
});

export const mediaContacts = spec("pattern.media-contacts", "MediaContacts", "The ways to get help of MediaList as wide outline buttons, then three support figures as rows in a card.", {
  typeImports: types,
  props: [extras, labels],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch" } },
    use("Stack", { props: { Gap: "2", Align: "stretch" } }, listHead,
      eachAt(ref("extras.channels"), "c", "i", ref("c.id"), use("Button", { props: { Variant: "outline", Size: "default", Href: ref("c.href"), Class: "w-full gap-2" }, attrs: { "data-testid": "media-channel" } },
        use("LucideIcon", { props: { Name: ref("c.icon"), Size: 16 } }), text(ref("c.title"))))),
    use("Stack", { props: { Gap: "2", Align: "stretch", Class: surface("p-4") } }, strong(ref("labels.figures"), "sm"),
      first("extras.stats", "s", 3, use("Group", { props: { Gap: "4", Align: "center", Justify: "between" }, attrs: { "data-testid": "media-stat" } },
        muted(ref("s.label")), use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("s.value")))))))],
});

export const mediaListParts: OrganismSpec[] = [mediaFigures, mediaReview, mediaSteps, mediaPosts, mediaTopics, mediaContacts];
