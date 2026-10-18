// Features beside a picture: plain pairs, cards, figures over checked rows, metric cards.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const f = (k: string) => t(`marketing.featureSplit.${k}`);

const featuresplit = define({
  key: "featuresplit", theme: "marketing", group: "features", name: "Features, split", docs: "Features beside a picture: plain in two columns, as cards with actions, two figures over checked rows, or four metric cards with actions.",
  organism: "FeatureSplit", axes: ["layout", "mediaSide", "tone"], data: [d.features, d.stats],
  variants: [
    ["gridStart", "Picture first, four plain features in two columns", { mediaSide: "start" }],
    ["statsStart", "A square picture first, two figures over checked rows", { layout: "stats", mediaSide: "start" }],
    ["gridMuted", "Four plain features beside a picture, muted", { tone: "muted" }],
    ["metricCards", "Four metric cards and actions beside a picture", { layout: "metrics" }],
    ["featureCards", "Four feature cards and actions beside a picture", { layout: "cards" }],
  ],
  facts: [
    { sel: '[data-testid="feature-item"]', n: 4, when: { layout: "grid" } },
    { sel: '[data-testid="feature-item"]', n: 3, when: { layout: "stats" } },
    { sel: '[data-testid="feature-card"]', n: "@features", when: { layout: "cards" } },
    { sel: '[data-testid="feature-stat"]', n: 2, when: { layout: "stats" } },
    { sel: '[data-testid="feature-stat"]', n: 4, when: { layout: "metrics" } },
    { sel: '[data-testid="action-primary"]', n: 1, when: { layout: ["cards", "metrics"] } },
    { sel: '[data-testid="action-primary"]', n: 0, when: { layout: ["grid", "stats"] } },
    { sel: '[data-slot="media-frame"]', n: 1 },
  ],
  sample: {
    id: "featuresplit", title: f("title"), lead: f("lead"), badge: f("badge"), features: ref("features"), stats: ref("stats"),
    actions: { mode: "two", cta: f("cta"), href: "#/start", secondary: f("secondary"), secondaryHref: "#/work" },
  },
});

export const featureSplitBlocks = [featuresplit];
