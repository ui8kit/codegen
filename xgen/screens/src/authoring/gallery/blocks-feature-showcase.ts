// Feature cards with a picture or a glyph panel on top, in three or four columns.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const f = (k: string) => t(`marketing.featureShowcase.${k}`);

const featureshowcase = define({
  key: "featureshowcase", theme: "marketing", group: "features", name: "Feature cards with a picture", docs: "Cards with a picture on top and a read link, or with a muted glyph panel on top like an index of categories, in three or four columns.",
  organism: "FeatureShowcase", axes: ["item", "cols", "tone"], data: [d.features, d.values],
  variants: [
    ["pictureCards3", "Three cards with a picture on top", {}, { features: ref("values") }],
    ["panelCards4", "Four cards with a glyph panel on top", { item: "panel", cols: "4" }],
    ["pictureCards4", "Four cards with a picture on top, muted", { cols: "4", tone: "muted" }],
    ["panelCards3", "Three cards with a glyph panel on top", { item: "panel" }, { features: ref("values") }],
  ],
  facts: [
    { sel: '[data-testid="showcase-card"]', n: "@values", when: { cols: "3" } },
    { sel: '[data-testid="showcase-card"]', n: "@features", when: { cols: "4" } },
    { sel: '[data-testid="showcase-panel"]', n: 0, when: { item: "picture" } },
    { sel: '[data-testid="read"]', n: 0, when: { item: "panel" } },
  ],
  sample: { id: "featureshowcase", title: f("title"), lead: f("lead"), features: ref("features"), empty: t("empty.features"), more: f("more") },
});

export const featureShowcaseBlocks = [featureshowcase];
