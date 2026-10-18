// Split questions of the catalog: beside the heading, a help card, a picture or a finder, or as cards.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const f = (k: string) => t(`marketing.faqSplit.${k}`);
const LAYOUTS = ["head", "aside", "media", "search", "cards"];
const only = (sel: string, n: number | string, on: string) => [{ sel, n, when: { layout: on } }, { sel, n: 0, when: { layout: LAYOUTS.filter((l) => l !== on) } }];

const faqsplit = define({
  key: "faqsplit", theme: "marketing", group: "faq", name: "FAQ, split", docs: "Questions beside the heading, a help card, a picture or a finder, or as cards in three or four columns.",
  organism: "FaqSplit", axes: ["layout", "cards", "mediaSide", "tone"], data: [d.questions, d.channels, d.faqtabs],
  variants: [
    ["headSplit", "Heading and action beside the questions"],
    ["helpCard", "Questions beside a help card", { layout: "aside" }],
    ["picture", "Questions and action beside a picture", { layout: "media" }],
    ["finder", "Picture first, search, topics and popular questions", { layout: "search", mediaSide: "start" }],
    ["cards3", "Cards in three columns", { layout: "cards" }],
    ["cards4", "Cards in four columns", { layout: "cards", cards: "grid4" }],
    ["cardsIcons", "Cards with icons, muted", { layout: "cards", cards: "icons", tone: "muted" }],
  ],
  facts: [
    { sel: '[data-testid="faq-item"]', n: "@questions", when: { layout: ["head", "aside", "media"] } },
    { sel: '[data-testid="faq-card"]', n: "@questions", when: { layout: "cards" } },
    ...only('[data-testid="faq-help"]', 1, "aside"),
    ...only('[data-testid="faq-finder"]', 1, "search"),
    { sel: '[data-testid="faq-topic"]', n: "@faqtabs", when: { layout: "search" } },
    { sel: '[data-testid="faq-popular"]', n: 3, when: { layout: "search" } },
    { sel: '[data-testid="faq-cta"]', n: 1, when: { layout: ["head", "media"] } },
  ],
  sample: {
    id: "faqsplit", title: f("title"), lead: f("lead"), badge: f("badge"), items: ref("questions"), channels: ref("channels"), topics: ref("faqtabs"),
    labels: { cta: f("cta"), more: f("more"), asideTitle: f("asideTitle"), asideText: f("asideText"), asideCta: f("asideCta"), search: f("search"), popular: f("popular") },
  },
});

export const faqBlocks = [faqsplit];
