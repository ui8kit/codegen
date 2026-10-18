// Calls to action with proof: centered over logos, features or figures, or split beside a picture.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const c = (k: string) => t(`marketing.ctaProof.${k}`);

const ctaproof = define({
  key: "ctaproof", theme: "marketing", group: "cta", name: "Call to action, with proof", docs: "A call to action with logos, features, figures, icon rows or delivery zones; centered or beside a picture.",
  organism: "CtaProof", axes: ["layout", "proof", "mediaSide", "tone"], data: [d.logos, d.features, d.stats, d.zones],
  variants: [
    ["centerLogos", "Centered over a row of logos", { proof: "logos" }],
    ["centerFeatures", "Centered with small features", { proof: "features" }],
    ["centerStats", "Centered with three figures, muted", { tone: "muted" }],
    ["splitStats", "Figures beside a picture", { layout: "split" }],
    ["splitStatsStart", "Picture first, figures and a note", { layout: "split", mediaSide: "start" }, { note: c("note") }],
    ["splitRows", "Icon rows beside a picture", { layout: "split", proof: "rows" }],
    ["splitZones", "Delivery zones beside a picture, muted", { layout: "split", proof: "zones", tone: "muted" }, { title: c("zonesTitle"), lead: c("zonesLead") }],
  ],
  facts: [
    { sel: '[data-testid="cta-proof"]', n: 1 },
    { sel: '[data-testid="cta-item"]', n: "@logos", when: { proof: "logos" } },
    { sel: '[data-testid="cta-item"]', n: "@features", when: { proof: ["features", "rows"] } },
    { sel: '[data-testid="cta-item"]', n: 3, when: { proof: "stats" } },
    { sel: '[data-testid="cta-item"]', n: "@zones", when: { proof: "zones" } },
    { sel: '[data-slot="media-frame"]', n: 1, when: { layout: "split" } },
    { sel: '[data-slot="media-frame"]', n: 0, when: { layout: "center" } },
  ],
  sample: {
    id: "ctaproof", title: c("title"), lead: c("lead"), badge: c("badge"),
    actions: { mode: "two", cta: c("cta"), href: "#/pricing", secondary: c("secondary"), secondaryHref: "#/contact" },
    content: { logos: ref("logos"), features: ref("features"), stats: ref("stats"), zones: ref("zones") },
  },
});

export const ctaBlocks = [ctaproof];
