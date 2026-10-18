// A list or figures beside a picture: figures, figures with a review, steps, latest posts, topics, contact buttons.
import { ref } from "../../build";
import type { Value } from "../../ir";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const m = (k: string) => t(`marketing.mediaList.${k}`);
/** the texts of one layout: heading, lead, badge, list heading and actions */
const texts = (k: string, two = true): Record<string, Value> => ({
  title: m(`${k}.title`), lead: m(`${k}.lead`), badge: m(`${k}.badge`),
  labels: { list: m(`${k}.list`), count: m("count"), minutes: t("content.labels.minutes"), featured: m("featured"), rating: t("testimonials.rating"), figures: m("supportFigures") },
  actions: two ? { mode: "two", cta: m(`${k}.cta`), href: "#/start", secondary: m(`${k}.secondary`), secondaryHref: "#/more" } : { mode: "one", cta: m(`${k}.cta`), href: "#/start" },
});

const medialist = define({
  key: "medialist", theme: "marketing", group: "proof", name: "List beside a picture", docs: "Four figures, figures with a featured review, numbered steps, the latest posts, topic rows, or contact buttons with support figures, beside a picture.",
  organism: "MediaList", axes: ["layout", "mediaSide", "tone"], data: [d.stats, d.steps, d.posts, d.categories, d.channels, d.reviews],
  variants: [
    ["figuresStart", "Picture first, four figures and an action", { mediaSide: "start" }, texts("figures", false)],
    ["proofReview", "Three figures and a featured review", { layout: "proof" }, texts("proof")],
    ["stepsRows", "Numbered steps beside a square picture", { layout: "steps" }, texts("steps", false)],
    ["latestPosts", "The latest posts and a subscribe action, muted", { layout: "posts", tone: "muted" }, texts("posts", false)],
    ["topicRows", "Topic rows with counts beside a square picture", { layout: "topics" }, texts("topics", false)],
    ["contactStart", "Picture first, contact buttons and support figures", { layout: "contact", mediaSide: "start" }, texts("contact", false)],
  ],
  facts: [
    { sel: '[data-testid="media-stat"]', n: 4, when: { layout: "figures" } },
    { sel: '[data-testid="media-stat"]', n: 3, when: { layout: ["proof", "contact"] } },
    { sel: '[data-testid="media-review"]', n: 1, when: { layout: "proof" } },
    { sel: '[data-testid="media-step"]', n: "@steps", when: { layout: "steps" } },
    { sel: '[data-testid="media-post"]', n: 3, when: { layout: "posts" } },
    { sel: '[data-testid="media-topic"]', n: 5, when: { layout: "topics" } },
    { sel: '[data-testid="media-channel"]', n: "@channels", when: { layout: "contact" } },
    { sel: '[data-testid="action-primary"]', n: 1, when: { layout: ["figures", "proof", "steps", "posts", "topics"] } },
    { sel: '[data-testid="action-primary"]', n: 0, when: { layout: "contact" } },
  ],
  sample: {
    id: "medialist", ...texts("figures", false),
    extras: { stats: ref("stats"), steps: ref("steps"), posts: ref("posts"), topics: ref("categories"), channels: ref("channels"), reviews: ref("reviews") },
  },
});

export const mediaListBlocks = [medialist];
