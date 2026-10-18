// Content organisms: a post card, a grid or list of posts, the header of a post.
import { and, call, cn, coalesce, cond, each, eachAt, eq, gt, ne, ref, text, tpl, use, when, where, organism, len } from "../../build";
import { fitCols } from "../ux";
import type { OrganismSpec } from "../../ir";
import { cardBase, fields, groupFields, rec, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, title, tone, tsOf, toneLite, denseLite } from "../props";
import { kids } from "../forms";
import { layoutOf } from "../presets";

const O = "organism.";
const Post = fields(["id", "string"], ["title", "string"], ["excerpt", "string"], ["category", "string"], ["author", "string"], ["date", "string"], ["minutes", "number"], ["icon", "string"], ["href", "string", true], ["image", "string", true]);
const PostLabels = fields(["minutes", "string"], ["by", "string"], ["read", "string"], ["empty", "string"]);

const postCard = spec(`${O}post-card`, "PostCard", "A post as a card: cover picture, category, title, excerpt, author line and a read link. Axes: layout (vertical, horizontal), media (image, none), meta (full, short: the date only, news: date and title only), density.", {
  records: { Post, PostLabels },
  props: [
    { name: "post", type: { record: "Post" }, required: true },
    { name: "labels", type: { record: "PostLabels" }, required: true, docs: "templates: minutes `{0} min read`, by `By {0}`; and the word of the read link" },
    { name: "layout", type: tsOf("vertical", "horizontal"), default: "vertical" },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "meta", type: tsOf("full", "short", "news"), default: "full" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: (() => {
    const cover = when(eq(ref("media"), "image"), [
      use("Box", { props: { Class: cn("relative shrink-0", cond(eq(ref("layout"), "horizontal"), "sm:w-64", "")) } },
        organism("MediaFrame", { alt: ref("post.title"), src: ref("post.image"), ratio: "16/9", className: "h-full" })),
    ]);
    const category = when(ne(ref("meta"), "news"), [
      use("Group", { props: { Gap: "2", Align: "center" } },
        use("LucideIcon", { props: { Name: ref("post.icon"), Size: 16 } }),
        use("Text", { props: { Size: "xs", Class: "uppercase tracking-wide text-muted-foreground" } }, text(ref("post.category")))),
    ]);
    const excerpt = when(and(eq(ref("density"), "default"), ne(ref("meta"), "news")), [
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("post.excerpt"))),
    ]);
    const metaRow = when(ne(ref("meta"), "news"), [
      use("Group", { props: { Gap: "2", Class: "mt-auto flex-wrap pt-2 text-muted-foreground" } },
        when(eq(ref("meta"), "full"), [use("Text", { props: { Size: "xs" } }, text(tpl(ref("labels.by"), ref("post.author"))))]),
        use("Text", { props: { Size: "xs" } }, text(ref("post.date"))),
        when(eq(ref("meta"), "full"), [use("Text", { props: { Size: "xs" } }, text(tpl(ref("labels.minutes"), ref("post.minutes"))))])),
    ]);
    // the link to the post from its slug (slug|route); an app with no post page gives no route: no link rather than a dead one
    const read = when(and(ne(ref("meta"), "news"), ref("post.href")), [
      use("Link", { props: { Href: ref("post.href"), Variant: "default" }, attrs: { "data-testid": "read" } }, text(ref("labels.read"))),
    ]);
    // news card: image with the title on top, a date strip below; sizes from the default preset
    // Frame news card 267×218 r16 gap 8; image 267×160 r12; footer h50 gap16 pad: mark 32 + title only.
    // Card 267×218 r16 no pad; image 267×160 r12 with title 12 centered; strip h50 date+meta only
    const news = use("Block", {
      props: { Tag: "article", Class: cn("flex flex-col gap-2 overflow-hidden rounded p-0 inset-ring inset-ring-border", layoutOf("news.card")) },
      attrs: { "data-testid": "item", "data-layout": ref("layout"), "data-meta": "news" },
    },
      use("Box", { props: { Class: cn("relative shrink-0 overflow-hidden", layoutOf("news.cover")) }, attrs: { "data-testid": "news-cover" } },
        organism("MediaFrame", { alt: ref("post.title"), src: ref("post.image"), ratio: "16/9", className: cn("size-full", layoutOf("media.rounded")) }),
        use("Title", { props: { As: 3, Size: "xs", Weight: "semibold", Class: cn("pointer-events-none absolute inset-x-12 line-clamp-2 text-center leading-5 text-foreground", layoutOf("news.title")) }, attrs: { "data-testid": "news-title" } }, text(ref("post.title")))),
      use("Group", { props: { Gap: "2", Align: "center", Class: cn("w-full px-2 text-muted-foreground", layoutOf("news.strip")) }, attrs: { "data-testid": "news-date" } },
        use("LucideIcon", { props: { Name: "calendar", Size: 16 } }),
        use("Text", { props: { Size: "xs", Weight: "bold", Class: "leading-4" } }, text(ref("post.date"))),
        when(ref("post.category"), [use("Text", { props: { Size: "xs", Weight: "bold", Class: "leading-4" } }, text(ref("post.category")))])));
    const full = use("Block", { props: { Tag: "article", Class: cn(cardBase(), "h-full gap-4 overflow-hidden", cond(eq(ref("layout"), "horizontal"), "flex flex-col sm:flex-row", "flex flex-col")) }, attrs: { "data-slot": "card", "data-testid": "item", "data-layout": ref("layout"), "data-meta": ref("meta") } },
      cover,
      use("CardContent", { props: { Class: "flex flex-1 flex-col gap-2" } },
        category,
        use("Title", { props: { As: 3, Size: "xl", Weight: "bold" } }, text(ref("post.title"))),
        excerpt, metaRow, read));
    return [when(eq(ref("meta"), "news"), [news], [full])];
  })(),
});

const postGrid = spec(`${O}post-grid`, "PostGrid", "A section with a heading and the posts as cards: a grid, a list of horizontal cards, or a magazine (the first post wide, the rest in a grid). Axes: layout (grid, list, magazine), columns, media, meta (full, short, news), filter mode (none, topics), tone, density.", {
  typeImports: [{ from: "PostCard", names: ["Post", "PostLabels"] }, { from: "SectionFrame", names: ["HeadLink"] }],
  records: {
    PostTopic: fields(["id", "string"], ["title", "string"], ["value", "string"]),
    PostFilter: groupFields(["mode", tsOf("none", "topics"), "topics: tabs above the posts; the page filters by `topic`", "none"],
      ["topics", "PostTopic[]", "the topic tabs"], ["label", "string", "accessible name of the topic tabs"], ["topic", "string", "the value of the chosen topic; empty: all posts"]),
  },
  events: [{ name: "topic", args: [{ name: "value", type: "string" }], docs: "a topic tab was chosen" }],
  props: [
    id, title,
    { name: "posts", type: ts("Post[]"), required: true },
    { name: "labels", type: ts("PostLabels"), required: true },
    { name: "action", type: ts("HeadLink"), docs: "optional link opposite the heading (All posts)" },
    { name: "filter", type: rec("PostFilter"), docs: "the topic tabs and the chosen topic" },
    { name: "layout", type: tsOf("grid", "list", "magazine"), default: "grid" },
    { name: "cols", type: tsOf("1-2", "1-3", "1-4"), default: "1-3" },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "meta", type: tsOf("full", "short", "news"), default: "full" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: (() => {
    const shown = where(ref("posts"), "category", ref("filter.topic"));
    const card = (layout: "horizontal" | "vertical") => organism("PostCard", { post: ref("p"), labels: ref("labels"), layout, media: ref("media"), meta: ref("meta"), density: ref("density") });
    return [frame({ id: ref("id"), title: ref("title"), action: ref("action"), tone: ref("tone"), density: cond(eq(ref("density"), "compact"), "compact", "default"), measure: cond(eq(ref("meta"), "news"), "fill", "default"), className: cond(eq(ref("meta"), "news"), "py-0", "") }, [
      when(eq(ref("filter.mode"), "topics"), [organism("Switcher", { label: ref("filter.label") }, kids(
        each(ref("filter.topics"), "tab", ref("tab.id"), organism("SwitcherItem", { active: eq(ref("tab.value"), ref("filter.topic")) }, { on: { click: call("emit.topic", ref("tab.value")) }, ...kids(text(ref("tab.title"))) }))))]),
      // emptyMode omit (12-prop limit leaves no room for an `empty` text): no posts, no grid
      when(gt(len(shown), 0), [when(eq(ref("layout"), "magazine"),
        [use("Stack", { props: { Gap: "6", Align: "stretch" }, attrs: { "data-testid": "items" } },
          eachAt(shown, "p", "i", ref("p.id"), when(eq(ref("i"), 0), [card("horizontal")])),
          use("Grid", { props: { Cols: ref("cols"), Class: "gap-6" } },
            eachAt(shown, "p", "i", ref("p.id"), when(gt(ref("i"), 0), [card("vertical")]))))],
        [use("Grid", { props: { Cols: cond(eq(ref("layout"), "list"), "1", fitCols(ref("cols"), len(shown))), Class: "w-full gap-6" }, attrs: { "data-testid": "items" } },
          each(shown, "p", ref("p.id"), organism("PostCard", { post: ref("p"), labels: ref("labels"), layout: cond(eq(ref("layout"), "list"), "horizontal", "vertical"), media: ref("media"), meta: ref("meta"), density: ref("density") })))])]),
    ])];
  })(),
});

const postHeader = spec(`${O}post-header`, "PostHeader", "The top of a post page: category, title, excerpt, the author line and an optional wide cover. Axes: layout (start, center), cover (show, hide), meta (full, short), tone.", {
  typeImports: [{ from: "PostCard", names: ["Post", "PostLabels"] }],
  props: [
    id,
    { name: "post", type: ts("Post"), docs: "the post; without one: the empty state" },
    { name: "labels", type: ts("PostLabels"), required: true },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "layout", type: tsOf("start", "center"), default: "start" },
    { name: "cover", type: tsOf("show", "hide"), default: "show" },
    { name: "meta", type: tsOf("full", "short"), default: "full" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  // no post: the empty state (labels.empty); the cover is the post's image (featured_media_id), the placeholder without one
  view: [when(ref("post"), [frame(
    { id: ref("id"), title: ref("post.title"), lead: ref("post.excerpt"), level: ref("level"), align: ref("layout"), tone: ref("tone"), hasMedia: eq(ref("cover"), "show") },
    [use("Group", { props: { Gap: "4", Align: "center", Justify: cond(eq(ref("layout"), "center"), "center", "start"), Class: "flex-wrap" }, attrs: { "data-testid": "post-meta" } },
      organism("MediaFrame", { alt: ref("post.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }),
      use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("post.author"))),
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("post.date"))),
      when(eq(ref("meta"), "full"), [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("labels.minutes"), ref("post.minutes"))))]),
      organism("Pill", { tone: "blue" }, kids(text(ref("post.category"))))),
    ],
    [organism("MediaFrame", { alt: ref("post.title"), src: ref("post.image"), ratio: "21/9" })])],
    [frame({ id: ref("id"), level: ref("level"), align: ref("layout"), tone: ref("tone") }, [organism("EmptyState", { icon: "file-text", title: ref("labels.empty") })])])],
});

export const contentOrganisms: OrganismSpec[] = [postCard, postGrid, postHeader];
