// Post headers with more around the title: centered with figures and a share card, split beside the cover, or an outline beside it.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const p = (k: string) => t(`content.postSplit.${k}`);

const postsplit = define({
  key: "postsplit", theme: "content", group: "blog", name: "Post header, split", docs: "Tags, reading figures and an author card with share and save over a wide cover; the author, figures, tags and actions beside the cover; or the facts and related reading beside it.",
  organism: "PostSplit", axes: ["layout", "mediaSide", "author", "cover", "actions", "tone"], data: [d.posts, d.posttags, d.outline],
  variants: [
    ["centerShare", "Centered: tags, figures and a share card over a wide cover", { layout: "center" }],
    ["splitTags", "Author line, tags, share and save beside the cover"],
    ["splitBioStart", "Cover first, an author card with the bio and one wide action", { mediaSide: "start", author: "bio", actions: "wide" }],
    ["splitSquare", "A square cover, a wide action with share and save as icons", { cover: "square", actions: "icons" }],
    ["outlineStart", "Cover first, the facts and related reading", { layout: "outline", mediaSide: "start" }],
    ["splitStats", "An author card and figures beside the cover, muted", { author: "card", tone: "muted" }],
  ],
  facts: [
    { sel: '[data-testid="post-author"]', n: 1, when: { layout: ["center", "split"] } },
    { sel: '[data-testid="post-author"]', n: 0, when: { layout: "outline" } },
    { sel: '[data-testid="post-tag"]', n: "@posttags", when: { layout: ["center", "split"] } },
    { sel: '[data-testid="post-link"]', n: "@outline", when: { layout: "outline" } },
    { sel: '[data-testid="post-link"]', n: 0, when: { layout: ["center", "split"] } },
    { sel: '[data-testid="post-stats"]', n: 1, when: { layout: "center" } },
    { sel: '[data-testid="post-save"]', n: 1, when: { actions: ["pair", "icons"] } },
    { sel: '[data-testid="post-save"]', n: 0, when: { actions: "wide", layout: ["split", "outline"] } },
    { sel: '[data-testid="action-primary"]', n: 1, when: { layout: ["split", "outline"] } },
  ],
  sample: {
    id: "postsplit", post: { op: "pick", args: [ref("posts"), "post-static-first"] }, labels: p("labels"),
    extras: { role: p("role"), bio: p("bio"), views: p("views"), likes: p("likes"), tags: ref("posttags"), outline: ref("outline") },
  },
});

export const postBlocks = [postsplit];
