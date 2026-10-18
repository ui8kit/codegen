// Page heads with breadcrumbs: alone, with one figure, a note card or four key facts.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const p = (k: string) => t(`marketing.pageTrail.${k}`);

const pagetrail = define({
  key: "pagetrail", theme: "marketing", group: "page", name: "Page heading with breadcrumbs", docs: "Breadcrumbs over the badge, the heading and the lead; with one large figure, a note card or four key facts at the end.",
  organism: "PageTrail", axes: ["aside", "tone"], data: [d.crumbs, d.stats],
  variants: [
    ["crumbs", "Breadcrumbs, badge, heading and lead"],
    ["crumbsFigure", "With one large figure at the end", { aside: "figure" }],
    ["crumbsNote", "With a note card at the end", { aside: "note" }],
    ["keyFacts", "With four key facts beside it, muted", { aside: "facts", tone: "muted" }],
  ],
  facts: [
    { sel: '[data-testid="crumb"]', n: 2 },
    { sel: '[data-testid="page-figure"]', n: 1, when: { aside: "figure" } },
    { sel: '[data-testid="page-note"]', n: 1, when: { aside: "note" } },
    { sel: '[data-testid="page-fact"]', n: 4, when: { aside: "facts" } },
    { sel: '[data-testid="page-fact"]', n: 0, when: { aside: ["none", "figure", "note"] } },
  ],
  sample: {
    id: "pagetrail", title: p("title"), lead: p("lead"), badge: p("badge"), label: p("label"), crumbs: ref("crumbs"),
    extras: { value: p("value"), caption: p("caption"), note: p("note"), icon: "package", facts: ref("stats") },
  },
});

export const pageTrailBlocks = [pagetrail];
