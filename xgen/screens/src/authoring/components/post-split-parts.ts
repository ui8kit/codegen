// Parts of PostSplit: the reading figures, the author line or card, the tags, the outline beside a cover, and the actions.
import { cn, cond, each, eq, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, surface } from "../ux";
import { menuEntry } from "./nav";

const types = [{ from: "PostCard", names: ["Post"] }, { from: "PostSplit", names: ["PostExtras", "PostSplitLabels"] }];
const post = { name: "post", type: ts("Post"), required: true };
const extras = { name: "extras", type: ts("PostExtras"), required: true, docs: "the author's role and bio, the reading figures, the tags and the outline" };
const labels = { name: "labels", type: ts("PostSplitLabels"), required: true };
const align = { name: "align", type: tsOf("start", "center"), default: "start" };
/** a glyph and a short text */
const fact = (icon: string, v: Value): ViewNode => use("Group", { props: { Gap: "2", Align: "center" } },
  use("LucideIcon", { props: { Name: icon, Size: 16 } }), use("Text", { props: { Size: "sm" } }, text(v)));
const iconButton = (icon: string, label: string, testid: string): ViewNode =>
  use("Button", { props: { Variant: "outline", Size: "default", Layout: "icon", AriaLabel: ref(label) }, attrs: { "data-testid": testid } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }));
const button = (variant: string, icon: string, label: string, testid: string, cls = ""): ViewNode =>
  use("Button", { props: { Variant: variant, Size: "default", Class: `gap-2 ${cls}`.trim() }, attrs: { "data-testid": testid } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }), text(ref(label)));

export const postStats = spec("pattern.post-stats", "PostStats", "The reading figures of a post: minutes to read, views and likes, each with its glyph.", {
  typeImports: types,
  props: [post, extras, labels, align],
  view: [use("Group", { props: { Gap: "4", Align: "center", Justify: ref("align"), Class: "flex-wrap text-muted-foreground" }, attrs: { "data-testid": "post-stats" } },
    fact("clock", tpl(ref("labels.minutes"), ref("post.minutes"))), fact("eye", tpl(ref("labels.views"), ref("extras.views"))), fact("heart", tpl(ref("labels.likes"), ref("extras.likes"))))],
});

export const postAuthor = spec("pattern.post-author", "PostAuthor", "The author of a post: the portrait, the name and role, and the date or the share and save buttons; as a line, a card, or a card with the bio.", {
  typeImports: types,
  props: [post, extras, labels,
    { name: "mode", type: tsOf("line", "card", "bio"), default: "line" },
    { name: "share", type: "boolean", default: false, docs: "share and save buttons instead of the date" }],
  className: true,
  view: [use("Stack", { props: { Gap: "4", Align: "stretch", Class: cn(cond(eq(ref("mode"), "line"), "", surface("p-4")), ref("className")) }, attrs: { "data-testid": "post-author" } },
    use("Group", { props: { Gap: "4", Align: "center" } },
      organism("MediaFrame", { alt: ref("post.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }),
      use("Stack", { props: { Gap: "0", Align: "start", Class: "min-w-0 flex-1 text-start" } },
        use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("post.author"))), muted(ref("extras.role"), "xs")),
      when(ref("share"), [use("Group", { props: { Gap: "2" } }, button("ghost", "share-2", "labels.share", "post-share"), button("ghost", "bookmark", "labels.save", "post-save"))],
        [use("Box", { props: { Class: "text-muted-foreground" } }, fact("calendar", ref("post.date")))])),
    when(eq(ref("mode"), "bio"), [muted(ref("extras.bio"))]))],
});

export const postTags = spec("pattern.post-tags", "PostTags", "The tags of a post as small badges in a wrapping row.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [{ name: "tags", type: ts("NavLink[]"), required: true }, align],
  view: [use("Group", { props: { Gap: "2", Justify: ref("align"), Class: "flex-wrap" } },
    each(ref("tags"), "tag", ref("tag.id"), use("Badge", { props: { Variant: "secondary", Size: "sm" }, attrs: { "data-testid": "post-tag" } }, text(ref("tag.name")))))],
});

export const postOutline = spec("pattern.post-outline", "PostOutline", "The facts of a post in a column (author, date, minutes, views), then the related reading as links.", {
  typeImports: types,
  props: [post, extras, labels],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch" }, attrs: { "data-testid": "post-outline" } },
    use("Stack", { props: { Gap: "2", Align: "start", Class: "text-muted-foreground" } },
      fact("user", ref("post.author")), fact("calendar", ref("post.date")), fact("clock", tpl(ref("labels.minutes"), ref("post.minutes"))), fact("eye", tpl(ref("labels.views"), ref("extras.views")))),
    use("Stack", { props: { Gap: "2", Align: "stretch", Class: "border-t border-border pt-4" } },
      use("Text", { props: { Size: "xs", Weight: "medium", Class: "uppercase tracking-wide text-muted-foreground" } }, text(ref("labels.related"))),
      each(ref("extras.outline"), "l", ref("l.id"), menuEntry(ref("l.href"), { size: "sm", cls: "text-sm font-medium", testid: "post-link" },
        use("LucideIcon", { props: { Name: "chevron-right", Size: 16 } }), text(ref("l.name"))))))],
});

export const postActions = spec("pattern.post-actions", "PostActions", "The calls to action of a post header: share and save side by side, one wide read button, or a wide read button with share and save as icons.", {
  typeImports: types,
  props: [labels, { name: "mode", type: tsOf("pair", "wide", "icons"), default: "pair" }],
  view: [when(eq(ref("mode"), "pair"), [use("Group", { props: { Gap: "2", Class: "flex-wrap" } }, button("default", "share-2", "labels.share", "action-primary"), button("outline", "bookmark", "labels.save", "post-save"))],
    [use("Group", { props: { Gap: "2" } }, button("default", "book-open", "labels.read", "action-primary", "flex-1"),
      when(eq(ref("mode"), "icons"), [iconButton("share-2", "labels.share", "post-share"), iconButton("bookmark", "labels.save", "post-save")]))])],
});

export const postSplitParts: OrganismSpec[] = [postStats, postAuthor, postTags, postOutline, postActions];
