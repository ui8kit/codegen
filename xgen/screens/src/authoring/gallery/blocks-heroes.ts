// Split heroes of the catalog: figures, faces, small cards or a quote under the lead, beside a picture, a floating card, a picture grid or plan cards.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const h = (k: string) => t(`marketing.heroSplit.${k}`);
const when2 = (sel: string, n: number | string, axis: string, on: string | string[], off: string | string[]) => [{ sel, n, when: { [axis]: on } }, { sel, n: 0, when: { [axis]: off } }];

const herosplit = define({
  key: "herosplit", theme: "marketing", group: "hero", name: "Hero, split", docs: "A split hero with figures, faces, small cards or a quote under the lead, beside a picture, a floating card, a picture grid or plan cards.",
  organism: "HeroSplit", axes: ["extra", "media", "mediaSide", "tone"], data: [d.stats, d.features, d.testimonials, d.tiers],
  variants: [
    ["statsCards", "Figures in cards beside a picture"],
    ["avatars", "Faces and a proof line", { extra: "avatars" }],
    ["miniCards", "Two small cards, floating card, muted", { extra: "minis", media: "card", tone: "muted" }],
    ["quoteStats", "Quote and figures beside a floating card", { extra: "quote", media: "card" }],
    ["planCards", "Plan cards on the picture, picture first", { extra: "none", media: "plans", mediaSide: "start" }],
    ["pictureGrid", "Figures beside a grid of four pictures", { media: "grid" }],
    ["pictureGridStart", "Grid of four pictures first, faces", { extra: "avatars", media: "grid", mediaSide: "start" }],
  ],
  facts: [
    ...when2('[data-testid="hero-stat"]', 3, "extra", ["stats", "quote"], ["avatars", "minis", "none"]),
    ...when2('[data-testid="hero-proof"]', 1, "extra", "avatars", ["stats", "minis", "quote", "none"]),
    ...when2('[data-testid="hero-mini"]', 2, "extra", "minis", ["stats", "avatars", "quote", "none"]),
    ...when2('[data-testid="hero-quote"]', 1, "extra", "quote", ["stats", "avatars", "minis", "none"]),
    ...when2('[data-testid="offer-card"]', 1, "media", "card", ["picture", "grid", "plans"]),
    ...when2('[data-testid="hero-tile"]', 4, "media", "grid", ["picture", "card", "plans"]),
    ...when2('[data-testid="hero-plan"]', 2, "media", "plans", ["picture", "card", "grid"]),
  ],
  sample: {
    id: "herosplit", title: h("title"), lead: h("lead"), badge: h("badge"),
    actions: { mode: "two", cta: h("cta"), href: "#/pricing", secondary: h("secondary"), secondaryHref: "#/features" },
    content: { stats: ref("stats"), features: ref("features"), people: ref("testimonials"), plans: ref("tiers"), proof: h("proof"), card: { title: h("cardTitle"), text: h("cardText"), icon: "zap" } },
  },
});

export const heroBlocks = [herosplit];
