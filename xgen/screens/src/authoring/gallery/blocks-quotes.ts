// Split testimonials of the catalog: one quote beside a picture, a rating panel or over logos; stacked quotes; compact quotes; figures over a bento.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const q = (k: string) => t(`marketing.quoteSplit.${k}`);
const LAYOUTS = ["media", "logos", "rating", "stack", "compact", "bento"];
const only = (sel: string, n: number | string, on: string[]) => [{ sel, n, when: { layout: on } }, { sel, n: 0, when: { layout: LAYOUTS.filter((l) => !on.includes(l)) } }];

const quotesplit = define({
  key: "quotesplit", theme: "marketing", group: "proof", name: "Testimonials, split", docs: "One quote beside a picture, a rating panel or over logo tiles; stacked quotes beside a picture; four compact quotes; figures over a featured quote and a stack.",
  organism: "QuoteSplit", axes: ["layout", "mediaSide", "tone"], data: [d.testimonials, d.stats, d.logos],
  variants: [
    ["quoteCard", "One quote card beside a picture"],
    ["logoTiles", "Picture first, a quote over logo tiles", { layout: "logos", mediaSide: "start" }],
    ["ratingPanel", "A quote beside a rating panel, muted", { layout: "rating", tone: "muted" }],
    ["stackedCards", "Picture first, three stacked quotes", { layout: "stack", mediaSide: "start" }],
    ["compact4", "Four compact quotes in a row", { layout: "compact" }],
    ["bentoFigures", "Figures over a featured quote and a stack", { layout: "bento" }],
  ],
  facts: [
    { sel: '[data-testid="quote"]', n: 1, when: { layout: ["media", "logos", "rating"] } },
    { sel: '[data-testid="quote"]', n: 3, when: { layout: "stack" } },
    { sel: '[data-testid="quote"]', n: "@testimonials", when: { layout: ["compact", "bento"] } },
    ...only('[data-testid="quote-logo"]', 4, ["logos"]),
    ...only('[data-testid="quote-rating"]', 1, ["rating"]),
    ...only('[data-testid="quote-figures"]', 1, ["bento"]),
    { sel: '[data-testid="action-primary"]', n: 1, when: { layout: ["media", "logos", "rating"] } },
  ],
  sample: {
    id: "quotesplit", title: q("title"), lead: q("lead"), badge: q("badge"), quotes: ref("testimonials"), empty: t("empty.quotes"),
    labels: { rating: t("testimonials.rating"), byLine: t("testimonials.byLine"), handleLine: t("testimonials.handleLine") },
    extras: { stats: ref("stats"), logos: ref("logos"), rating: 5, score: q("score"), reviews: q("reviews") },
    actions: { mode: "two", cta: q("cta"), href: "#/customers", secondary: q("secondary"), secondaryHref: "#/contact" },
  },
});

export const quoteBlocks = [quotesplit];
