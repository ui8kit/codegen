// Parts of PostShowcase: a small post card, a card with the text on a panel over the picture, and one featured post.
import { cond, eq, ref, text, tpl, use, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, surface } from "../ux";
import { menuEntry } from "./nav";

const types = [{ from: "PostCard", names: ["Post", "PostLabels"] }];
const post = { name: "p", type: ts("Post"), required: true };
const labels = { name: "labels", type: ts("PostLabels"), required: true, docs: "templates: minutes `{0} min read`, by `By {0}`; and the word of the read link" };
const byline = use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(tpl("{0} · {1}", ref("p.author"), tpl(ref("labels.minutes"), ref("p.minutes")))));

export const postMiniCard = spec("pattern.post-mini-card", "PostMiniCard", "A small post card of PostShowcase: the picture, the category, the title and the author with the reading time.", {
  typeImports: types,
  props: [post, labels],
  view: [use("Stack", { props: { Gap: "2", Align: "stretch", Class: surface("p-2") }, attrs: { "data-testid": "post-mini" } },
    organism("MediaFrame", { alt: ref("p.title"), ratio: "16/9" }),
    use("Stack", { props: { Gap: "2", Align: "start", Class: "p-2" } },
      use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("p.category"))),
      use("Title", { props: { As: 3, Size: "sm", Weight: "semibold" } }, text(ref("p.title"))), byline))],
});

export const postOverlayCard = spec("pattern.post-overlay-card", "PostOverlayCard", "A post card of PostShowcase with the text on a panel over the lower part of the picture: the category and date, the title, the excerpt and a read link.", {
  typeImports: types,
  props: [post, labels, { name: "ratio", type: tsOf("4/3", "16/9"), default: "4/3" }],
  view: [use("Box", { props: { Class: "relative overflow-hidden rounded" }, attrs: { "data-testid": "post-overlay" } },
    organism("MediaFrame", { alt: ref("p.title"), ratio: ref("ratio"), className: cond(eq(ref("ratio"), "4/3"), "min-h-80", "min-h-64") }),
    use("Stack", { props: { Gap: "2", Align: "start", Class: "absolute bottom-4 left-4 right-4 rounded bg-background p-4" } },
      use("Group", { props: { Gap: "2", Align: "center" } }, use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("p.category"))), muted(ref("p.date"), "xs")),
      use("Title", { props: { As: 3, Size: "base", Weight: "semibold" } }, text(ref("p.title"))),
      muted(ref("p.excerpt"), "sm", "line-clamp-2"),
      menuEntry(ref("p.href"), { size: "sm", cls: "gap-2 text-sm font-medium", testid: "read" }, text(ref("labels.read")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }))))],
});

export const postFeature = spec("pattern.post-feature", "PostFeature", "The featured post of PostShowcase: the category, the title, the excerpt, the author with the date and reading time, and a wide read button.", {
  typeImports: types,
  props: [post, labels],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch", Class: "border-t border-border pt-6" }, attrs: { "data-testid": "post-feature" } },
    use("Badge", { props: { Variant: "secondary", Size: "sm", Class: "w-fit" } }, text(ref("p.category"))),
    use("Title", { props: { As: 3, Size: "xl", Weight: "semibold" } }, text(ref("p.title"))),
    muted(ref("p.excerpt")),
    use("Group", { props: { Gap: "4", Align: "center" } },
      organism("MediaFrame", { alt: ref("p.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }),
      use("Stack", { props: { Gap: "0" } }, use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("p.author"))),
        muted(tpl("{0} · {1}", ref("p.date"), tpl(ref("labels.minutes"), ref("p.minutes"))), "xs"))),
    use("Button", { props: { Variant: "default", Size: "default", Href: ref("p.href"), Class: "w-full gap-2" }, attrs: { "data-testid": "action-primary" } }, text(ref("labels.read")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } })))],
});

export const postShowcaseParts: OrganismSpec[] = [postMiniCard, postOverlayCard, postFeature];
