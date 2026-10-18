// Guidance organisms: a product-tour callout, a video dialog, an error page, a loading skeleton, a long article with a table of contents.
// Positioning a callout on its target and playing the video are port contracts; these show the resting state.
import { and, cn, cond, each, eq, gt, len, ref, text, tpl, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, rec, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, linkActions, orEmpty, title, tone, tsOf, toneLite, denseLite } from "../props";
import { kids } from "../forms";
import { muted, strong, heading, surface } from "../ux";
import { navBlockOf } from "../components/landmarks";

const O = "organism.";

const tour = spec(`${O}tour-callout`, "TourCallout", "One stop of a product tour: the element being explained and a callout beside it with a title, a sentence, the position in the tour and the buttons. Axes: placement (below, above, end: the callout sits beside the target), tone, density.", {
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "target", type: "string", required: true, docs: "the name of the explained element, drawn as a button" },
    { name: "position", type: "string", required: true, docs: "e.g. `Step 2 of 4`" },
    { name: "skip", type: "string", required: true },
    { name: "next", type: "string", required: true },
    { name: "placement", type: tsOf("below", "above", "end"), default: "below" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [
    use("Block", { props: { Tag: "div", Class: cn("flex gap-4", cond(eq(ref("placement"), "end"), "flex-col items-start md:flex-row md:items-center", cond(eq(ref("placement"), "above"), "flex-col-reverse items-start", "flex-col items-start"))) }, attrs: { "data-testid": "tour", "data-placement": ref("placement") } },
      use("Button", { props: { Variant: "outline", Size: "default", Type: "button", Class: "inset-ring-foreground" }, attrs: { "data-testid": "tour-target" } }, text(ref("target"))),
      use("Stack", { props: { Gap: "4", Align: "stretch", Class: cn("w-full max-w-sm", surface(), "p-4", "shadow-md") }, attrs: { role: "group", "aria-label": ref("title"), "data-testid": "tour-callout" } },
        muted(ref("position"), "xs"), strong(ref("title")), muted(ref("text")),
        use("Group", { props: { Gap: "2", Justify: "end" } },
          use("Button", { props: { Variant: "ghost", Size: "sm", Type: "button" } }, text(ref("skip"))),
          use("Button", { props: { Variant: "default", Size: "sm", Type: "button" } }, text(ref("next")))))),
  ])],
});

const Chapter = fields(["id", "string"], ["title", "string"], ["text", "string"]);
const videoModal = spec(`${O}video-modal`, "VideoModal", "A dialog with a walkthrough video: a title and a close button, the player area with a play button and, optionally, a list of chapters. Opening the dialog and playing the video are port contracts. Axes: size (default, wide), outline (none, chapters: a list under the player), tone.", {
  records: { Chapter },
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "close", type: "string", required: true, docs: "accessible name of the close button" },
    { name: "play", type: "string", required: true, docs: "accessible name of the play button" },
    { name: "chaptersTitle", type: "string", required: true },
    { name: "chapters", type: ts("Chapter[]"), required: true },
    { name: "size", type: tsOf("default", "wide"), default: "default" },
    { name: "outline", type: tsOf("none", "chapters"), default: "none" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [
    use("Stack", { props: { Gap: "4", Align: "stretch", Class: cn("mx-auto w-full", cond(eq(ref("size"), "wide"), "max-w-4xl", "max-w-2xl"), surface("p-4 shadow-lg")) }, attrs: { role: "dialog", "aria-label": ref("title"), "data-testid": "video-modal" } },
      use("Group", { props: { Gap: "2", Align: "center", Justify: "between" } },
        muted(ref("text")),
        use("Button", { props: { Variant: "ghost", Size: "sm", Type: "button", Class: "shrink-0" }, attrs: { "aria-label": ref("close"), "data-testid": "modal-close" } }, use("LucideIcon", { props: { Name: "x", Size: 16 } }))),
      use("Box", { props: { Class: "relative" }, attrs: { "data-testid": "player" } },
        organism("MediaFrame", { alt: ref("title"), ratio: "16/9" }),
        use("Button", { props: { Variant: "default", Size: "default", Type: "button", Class: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded" }, attrs: { "aria-label": ref("play"), "data-testid": "play" } }, use("LucideIcon", { props: { Name: "play", Size: 24 } }))),
      when(and(eq(ref("outline"), "chapters"), gt(len(ref("chapters")), 0)), [use("Stack", { props: { Gap: "2" }, attrs: { "data-testid": "chapters" } },
        heading(ref("chaptersTitle"), "base"),
        use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } }, each(ref("chapters"), "c", ref("c.id"), use("ListItem", { props: { Class: "flex items-baseline gap-4" }, attrs: { "data-testid": "item" } }, strong(ref("c.title"), "sm"), muted(ref("c.text"), "xs")))))])),
  ])],
});

const errorPage = spec(`${O}error-page`, "ErrorPage", "A page that tells the visitor something went wrong: an icon or a big code, a heading, a sentence and the way back. Axes: layout (centered, split: the picture beside the text), code (show, hide), actions mode (one, two), tone.", {
  records: { LinkActions: linkActions },
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "status", type: "string", required: true, docs: "the status code, e.g. 404" },
    { name: "actions", type: rec("LinkActions"), required: true, docs: "the way back: one link, or two (mode two)" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "layout", type: tsOf("centered", "split"), default: "centered" },
    { name: "code", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("text"), level: ref("level"), layout: cond(eq(ref("layout"), "split"), "split", "stack"), hasMedia: eq(ref("layout"), "split"), align: cond(eq(ref("layout"), "split"), "start", "center"), tone: ref("tone"), density: "roomy" }, [
    when(eq(ref("code"), "show"), [use("Text", { props: { Size: "4xl", Weight: "bold", Class: cn("text-8xl text-muted-foreground", cond(eq(ref("layout"), "split"), "", "text-center")) }, attrs: { "data-testid": "error-code" } }, text(ref("status")))]),
    organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: cond(eq(ref("layout"), "split"), "start", "center") }),
  ], [organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })])],
});

const Line = fields(["id", "string"]);
const skeletonLayout = spec(`${O}skeleton-layout`, "SkeletonLayout", "The loading state of a page: grey blocks in the shape of the content that is coming (cards, a list of rows or an article). Axes: shape (cards, list, article), tone. The label tells assistive technology that the content is loading. The shimmer itself belongs to the Skeleton part.", {
  records: { Line },
  props: [
    id, title,
    { name: "label", type: "string", required: true, docs: "e.g. `Loading`" },
    { name: "lines", type: ts("Line[]"), required: true, docs: "how many placeholders to draw" },
    { name: "shape", type: tsOf("cards", "list", "article"), default: "cards" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [
    use("Block", { props: { Tag: "div", Class: "w-full" }, attrs: { role: "status", "aria-label": ref("label"), "data-testid": "skeleton", "data-shape": ref("shape") } },
      when(eq(ref("shape"), "cards"),
        [use("Grid", { props: { Cols: "1-3", Class: "gap-4" } }, each(ref("lines"), "l", ref("l.id"), use("Stack", { props: { Gap: "4", Class: surface("p-4") }, attrs: { "data-testid": "item" } },
          use("Skeleton", { props: { Class: "aspect-video w-full" } }), use("Skeleton", { props: { Class: "h-4 w-2/3" } }), use("Skeleton", { props: { Class: "h-4 w-full" } }))))],
        [when(eq(ref("shape"), "list"),
          [use("Stack", { props: { Gap: "4", Align: "stretch" } }, each(ref("lines"), "l", ref("l.id"), use("Group", { props: { Gap: "4", Align: "center" }, attrs: { "data-testid": "item" } },
            use("Skeleton", { props: { Class: "size-10 shrink-0 rounded-full" } }), use("Stack", { props: { Gap: "2", Class: "flex-1" } }, use("Skeleton", { props: { Class: "h-4 w-1/3" } }), use("Skeleton", { props: { Class: "h-4 w-full" } })))))],
          [use("Stack", { props: { Gap: "4", Align: "stretch", Class: "mx-auto max-w-2xl" } }, use("Skeleton", { props: { Class: "h-8 w-3/4" } }), each(ref("lines"), "l", ref("l.id"), use("Stack", { props: { Gap: "2" }, attrs: { "data-testid": "item" } }, use("Skeleton", { props: { Class: "h-4 w-full" } }), use("Skeleton", { props: { Class: "h-4 w-5/6" } }))))])])),
  ])],
});

const articleBody = spec(`${O}article-body`, "ArticleBody", "A long read: sections with headings, text and an optional pull quote, in one reading column or beside a table of contents that links to each section. Axes: layout (column, toc), quotes (show, hide), tone. Highlighting the section being read is a port contract.", {
  records: { Section: fields(["id", "string"], ["title", "string"], ["text", "string"], ["quote", "string"]) },
  props: [
    id, title,
    { name: "sections", type: ts("Section[]"), required: true },
    empty,
    { name: "tocTitle", type: "string", required: true },
    { name: "layout", type: tsOf("column", "toc"), default: "column" },
    { name: "quotes", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [orEmpty("sections", "file-text", [
    use("Grid", { props: { Cols: "1", Class: cn("items-start gap-8", cond(eq(ref("layout"), "toc"), "md:grid-cols-[14rem_minmax(0,1fr)]", "")) } },
      when(eq(ref("layout"), "toc"), [navBlockOf(ref("tocTitle"), "md:sticky md:top-4", "toc",
        use("Stack", { props: { Gap: "2" } }, strong(ref("tocTitle"), "sm"),
          use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } }, each(ref("sections"), "s", ref("s.id"), use("ListItem", {}, use("Link", { props: { Href: tpl("#{0}-{1}", ref("id"), ref("s.id")), Variant: "default", Class: "text-sm text-muted-foreground" }, attrs: { "data-testid": "toc-link" } }, text(ref("s.title"))))))))]),
      use("Stack", { props: { Gap: "8", Align: "stretch", Class: "mx-auto w-full max-w-2xl min-w-0" }, attrs: { "data-testid": "article" } },
        each(ref("sections"), "s", ref("s.id"), use("Box", { props: { Class: "flex flex-col gap-4" }, attrs: { id: tpl("{0}-{1}", ref("id"), ref("s.id")), "data-testid": "item" } },
          heading(ref("s.title"), "2xl"),
          use("Text", { props: { Size: "base" } }, text(ref("s.text"))),
          when(eq(ref("quotes"), "show"), [when(ref("s.quote"), [use("Text", { props: { Tag: "blockquote", Class: "m-0 border-l border-border pl-4 text-lg" }, attrs: { "data-testid": "quote" } }, text(ref("s.quote")))])]))))),])
  ])],
});

const pageIntro = spec(`${O}page-intro`, "PageIntro", "The head of an inner page: the heading (h1 on a page of its own), one sentence and, optionally, an action. Axes: align (start, center), tone, density.", {
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "cta", type: "string" },
    { name: "href", type: "string" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "align", type: tsOf("start", "center"), default: "start" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("text"), level: ref("level"), align: ref("align"), tone: ref("tone"), density: ref("density") }, [
    when(ref("cta"), [organism("ActionGroup", { primary: ref("cta"), primaryHref: ref("href"), align: ref("align") })]),
  ])],
});

export const guideOrganisms: OrganismSpec[] = [pageIntro, tour, videoModal, errorPage, skeletonLayout, articleBody];
