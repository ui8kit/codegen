// Footers with more than links: the brand with figures over link-group cards, or a split beside a picture.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const f = (k: string) => t(`marketing.footerSplit.${k}`);
const SPLITS = ["points", "links", "newsletter", "contacts", "channels"];

const footersplit = define({
  key: "footersplit", theme: "marketing", group: "navigation", name: "Footer, split", docs: "The brand with figures and a sitemap link over link-group cards; or a split beside a picture with points, link columns, a newsletter card, the contacts or the community channels.",
  organism: "FooterSplit", axes: ["layout", "mediaSide", "tone"], data: [d.sitemap, d.stats, d.features, d.contacts, d.community],
  variants: [
    ["statsCards", "The brand with figures over link-group cards"],
    ["splitPoints", "The brand and four points beside a picture", { layout: "points" }],
    ["splitLinks", "The brand and small link columns beside a picture, muted", { layout: "links", tone: "muted" }],
    ["newsletterStart", "Picture first, a newsletter card and link columns", { layout: "newsletter", mediaSide: "start" }],
    ["splitContacts", "The contacts and two actions beside a picture", { layout: "contacts" }],
    ["channelsStart", "Picture first, the community channels and figures", { layout: "channels", mediaSide: "start" }],
  ],
  facts: [
    { sel: '[data-testid="group"]', n: "@sitemap", when: { layout: "stats" } },
    { sel: '[data-testid="group"]', n: 3, when: { layout: ["links", "newsletter"] } },
    { sel: '[data-testid="group"]', n: 0, when: { layout: ["points", "contacts", "channels"] } },
    { sel: '[data-testid="footer-stat"]', n: 3, when: { layout: ["stats", "channels"] } },
    { sel: '[data-testid="footer-point"]', n: 4, when: { layout: "points" } },
    { sel: '[data-testid="signup"]', n: 1, when: { layout: "newsletter" } },
    { sel: '[data-testid="footer-contact"]', n: "@contacts", when: { layout: "contacts" } },
    { sel: '[data-testid="footer-channel"]', n: 3, when: { layout: "channels" } },
    { sel: '[data-slot="media-frame"]', n: 1, when: { layout: SPLITS } },
    { sel: '[data-slot="media-frame"]', n: 0, when: { layout: "stats" } },
  ],
  sample: {
    id: "footersplit", label: t("vibe.sitemap.label"), brand: t("site.header.brand"), tagline: f("tagline"), copyright: f("copyright"), groups: ref("sitemap"),
    extras: { stats: ref("stats"), points: ref("features"), contacts: ref("contacts"), channels: ref("community") }, labels: f("labels"),
  },
});

export const footerBlocks = [footersplit];
