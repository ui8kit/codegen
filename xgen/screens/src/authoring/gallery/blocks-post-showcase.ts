// Posts shown off: small cards beside an intro, one featured post beside its picture, cards with the text over the picture.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const p = (k: string) => t(`content.postShowcase.${k}`);

const postshowcase = define({
  key: "postshowcase", theme: "content", group: "blog", name: "Post showcase", docs: "Four small post cards beside an intro with a view-all link; the first post in detail beside its picture; or cards with the text on a panel over the picture, in two or three columns.",
  organism: "PostShowcase", axes: ["layout", "cols", "mediaSide", "tone"], data: [d.posts],
  variants: [
    ["introCards", "Four small post cards first, the intro and a view-all link"],
    ["featuredEnd", "The featured post beside its picture, muted", { layout: "featured", mediaSide: "end", tone: "muted" }],
    ["overlay3", "Three cards with the text over the picture", { layout: "overlay" }],
    ["overlay2", "Two wide cards with the text over the picture", { layout: "overlay", cols: "2" }],
  ],
  facts: [
    { sel: '[data-testid="post-mini"]', n: 4, when: { layout: "intro" } },
    { sel: '[data-testid="post-feature"]', n: 1, when: { layout: "featured" } },
    { sel: '[data-testid="post-overlay"]', n: 3, when: { layout: "overlay", cols: "3" } },
    { sel: '[data-testid="post-overlay"]', n: 2, when: { layout: "overlay", cols: "2" } },
    { sel: '[data-testid="section-action"]', n: 1, when: { layout: "intro" } },
  ],
  sample: {
    id: "postshowcase", title: p("title"), lead: p("lead"), badge: p("badge"), posts: ref("posts"), empty: t("empty.posts"), labels: t("content.labels"),
    action: { label: p("action"), href: "#/articles" },
  },
});

export const postShowcaseBlocks = [postshowcase];
