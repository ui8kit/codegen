// The block catalog: each block is an organism of the site plus the axes it varies on, named variants (a variant is a row of data: axis -> value,
// and for case copy a few props), the collections it reads and the props a page gets for free. No markup: the organism draws it.
// Stored as JSON in xgen/specs/blocks. The composed screens (the site, the gallery) use blocks by name and variant.
// The names, the notes and the variant labels are written to the dictionary by screens/tools/author-block-texts.ts.
import { list, nth, ref, undef } from "../../build";
import type { BlockSpec, ComposedSpec } from "../../ir";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import type { BlockTexts } from "./block-kit";
import * as d from "./blocks-data";
import { commerceBlocks } from "./blocks-commerce";
import { shopBlocks } from "./blocks-shop";
import { companyBlocks } from "./blocks-company";
import { shellBlocks } from "./blocks-shells";
import { heroBlocks } from "./blocks-heroes";
import { faqBlocks } from "./blocks-faqs";
import { ctaBlocks } from "./blocks-ctas";
import { quoteBlocks } from "./blocks-quotes";
import { postBlocks } from "./blocks-posts";
import { footerBlocks } from "./blocks-footers";
import { featureSplitBlocks } from "./blocks-feature-splits";
import { pageTrailBlocks } from "./blocks-page-trails";
import { postShowcaseBlocks } from "./blocks-post-showcase";
import { mediaListBlocks } from "./blocks-media-lists";
import { featureShowcaseBlocks } from "./blocks-feature-showcase";
import { storyTabsBlocks } from "./blocks-story-tabs";
import { moreBlocks } from "./blocks-more";
import { vibeBlocks } from "./blocks-vibe";

const header = define({
  key: "header", theme: "marketing", group: "navigation", name: "Header", docs: "Skip link, brand, navigation, theme button and an optional call to action.",
  organism: "SiteHeader", axes: ["layout", "position", "actions"],
  variants: [["inline", "Inline"], ["stacked", "Stacked", { layout: "stacked" }], ["sticky", "Sticky", { position: "sticky" }], ["withCta", "Inline with a call to action", { actions: "cta" }]],
  events: { theme: "toggleTheme" },
  sample: { labels: t("site.header"), current: "home", cta: t("site.header.cta") },
});

const footer = define({
  key: "footer", theme: "marketing", group: "navigation", name: "Footer", docs: "Copyright and links.",
  organism: "SiteFooter", axes: ["layout", "density"],
  variants: [["minimal", "Minimal"], ["centered", "Centered", { layout: "centered" }], ["compact", "Compact", { density: "compact" }]],
  sample: { labels: t("site.footer") },
});

const heroCase = (c: string) => ({ title: t(`cases.${c}.hero.title`), text: t(`cases.${c}.hero.text`), actions: { cta: t(`cases.${c}.hero.cta`), secondary: t(`cases.${c}.hero.secondary`) } });
const hero = define({
  key: "hero", theme: "marketing", group: "hero", name: "Hero", docs: "Heading, lead, one or two actions and optional media.",
  organism: "HeroClassic", alt: { axis: "chrome", values: ["none", "nav"], organism: "HeroPrompt" },
  axes: ["layout", "media.kind", "media.side", "scale", "tone", "density", "actions.mode", "chrome"],
  data: [d.terminal, d.prompts, d.navlinks],
  variants: [
    ["centered", "Centered"],
    ["screenshot", "Centered with a screenshot below", { "media.kind": "image" }],
    ["backdrop", "Centered over a picture", { "media.kind": "backdrop", tone: "muted" }],
    ["code", "Split with a terminal window", { layout: "split", "media.kind": "code", "actions.mode": "two" }],
    ["cluster", "Split with a cluster of cards", { layout: "split", "media.kind": "cluster" }],
    ["display", "Oversized heading", { scale: "display", density: "roomy" }],
    ["form", "Centered with an email field", { "actions.mode": "form" }],
    ["prompt", "Nav inside the hero, badge, display title, composer and topic pills", { "actions.mode": "form", scale: "display", density: "compact", tone: "inverse", chrome: "nav" }, {
      badge: t("vibe.hero.badgeLabel"), badgeMark: t("vibe.hero.badgeMark"),
      title: t("vibe.hero.title"),
      topics: ref("prompts"),
      actions: { emailLabel: t("vibe.hero.promptLabel") },
    }],
    ["twoActions", "Centered, two actions", { "actions.mode": "two" }],
    ["split", "Split, media at the end", { layout: "split", "media.kind": "image" }],
    ["splitStart", "Split, media at the start", { layout: "split", "media.kind": "image", "media.side": "start", "actions.mode": "two" }],
    ["muted", "Muted tone", { tone: "muted", density: "default" }],
    ["saas", "SaaS product: split with a picture", { layout: "split", "media.kind": "image", "actions.mode": "two" }, heroCase("saas")],
    ["shop", "Shop: picture first, muted", { layout: "split", "media.kind": "image", "media.side": "start", tone: "muted" }, heroCase("shop")],
    ["blog", "Blog: centered, compact", { density: "compact" }, heroCase("blog")],
  ],
  sample: {
    id: "hero", title: t("site.home.title"), text: t("site.home.text"),
    actions: { cta: t("site.home.cta"), href: "#/pricing", secondary: t("site.home.secondary"), secondaryHref: "#/pricing", emailLabel: t("promo.newsletter.label") },
    media: { codeTitle: t("vibe.code.title"), prompt: t("vibe.code.prompt"), lines: ref("terminal") },
    composer: { attachLabel: t("vibe.hero.attach"), modelLabel: t("vibe.hero.model") },
    nav: { brand: t("site.header.brand"), links: ref("navlinks"), current: "link-product", skip: t("site.header.skip"), label: t("site.header.nav"), login: t("site.header.login"), loginHref: "#/login" },
  },
});

const features = define({
  key: "features", theme: "marketing", group: "features", name: "Features", docs: "Features as cards, tiles or rows with a picture.",
  organism: "FeatureGrid", axes: ["layout", "cols", "item", "mediaSide", "tone", "density"], data: [d.features],
  variants: [
    ["grid", "Grid, three columns"],
    ["grid2", "Grid, two columns, roomy", { cols: "1-2", density: "roomy" }],
    ["tiles4", "Tiles, four columns", { cols: "1-4", item: "tile" }],
    ["cells4", "Hairline 4x2 cells with icon tiles", { cols: "1-4", item: "cell", density: "compact" }, { action: { label: t("site.home.featuresAction"), href: "#/" } }],
    ["rows", "Rows", { layout: "rows" }],
    ["rowsStart", "Rows, media at the start, compact", { layout: "rows", mediaSide: "start", density: "compact" }],
    ["rowsAlternate", "Rows, alternating media, muted", { layout: "rows", mediaSide: "alternate", tone: "muted" }],
    ["tilesMuted", "Tiles, three columns, muted", { item: "tile", tone: "muted", density: "compact" }],
  ],
  sample: { id: "features", title: t("site.home.featuresTitle"), features: ref("features"), empty: t("empty.features"), action: { label: t("site.home.featuresAction"), href: "#/" } },
});

const pricing = define({
  key: "pricing", theme: "marketing", group: "pricing", name: "Pricing", docs: "Plans as a grid or a stack of cards.",
  organism: "PricingTiers", axes: ["layout", "cols", "emphasis", "billing", "tone", "density"], data: [d.tiers, d.duo],
  variants: [
    ["grid", "Grid, three columns"],
    ["monthly", "With a billing toggle, monthly", { billing: "monthly" }],
    ["annual", "With a billing toggle, annual", { billing: "annual" }],
    ["duo", "Free and Pro side by side", { cols: "1-2", emphasis: "off" }, { plans: ref("duo") }],
    ["grid2", "Grid, two columns", { cols: "1-2" }],
    ["grid4", "Grid, four columns", { cols: "1-4" }],
    ["stack", "Stack", { layout: "stack" }],
    ["flat", "No emphasis", { emphasis: "off" }],
    ["compactMuted", "Muted, compact", { tone: "muted", density: "compact" }],
    ["roomy", "Roomy", { density: "roomy" }],
  ],
  sample: { id: "pricing", title: t("site.pricing.tiersTitle"), plans: ref("tiers"), labels: t("pricing"), billingLabels: t("vibe.billing") },
});

const plan = define({
  key: "plan", theme: "marketing", group: "pricing", name: "Plan", docs: "One plan as a card.", fit: "card",
  organism: "PricingCard", axes: ["emphasis", "density"], data: [d.tiers],
  variants: [["standard", "Standard"], ["flat", "No emphasis", { emphasis: "off" }], ["compact", "Compact", { density: "compact" }]],
  sample: { plan: { op: "pick", args: [ref("tiers"), "tier-team"] }, labels: t("pricing") },
});

const faq = define({
  key: "faq", theme: "marketing", group: "faq", name: "FAQ", docs: "Questions as native disclosures.",
  organism: "FaqList", axes: ["layout", "cols", "search.mode", "filter.mode", "tone", "density"], data: [d.faq, d.faqtabs],
  variants: [["list", "List"], ["chat", "Chat bubbles", { layout: "chat" }], ["search", "With a search field", { "search.mode": "field" }], ["tabs", "Category tabs", { "filter.mode": "categories" }, { filter: { category: "billing" } }], ["twoColumns", "Two columns", { cols: "2" }], ["muted", "Muted, compact", { tone: "muted", density: "compact" }], ["roomy", "Roomy", { density: "roomy" }]],
  sample: {
    id: "faq", title: t("site.pricing.faqTitle"), items: ref("faq"), empty: t("vibe.faq.empty"),
    search: { label: t("vibe.faq.search"), query: "" },
    filter: { tabs: ref("faqtabs"), label: t("vibe.faq.tabs"), category: "" },
  },
});

const ctaCase = (c: string) => ({ title: t(`cases.${c}.cta.title`), text: t(`cases.${c}.cta.text`), actions: { cta: t(`cases.${c}.cta.cta`), secondary: t(`cases.${c}.cta.secondary`) } });
const cta = define({
  key: "cta", theme: "marketing", group: "cta", name: "Call to action", docs: "A closing call to action.",
  organism: "CtaBand", axes: ["layout", "tone", "actions.mode", "proof", "density"],
  variants: [
    ["card", "Card"],
    ["banner", "Centered muted card", { layout: "banner", tone: "muted", density: "compact" }],
    ["row", "Heading and button in one row", { layout: "row" }],
    ["form", "With an email field", { layout: "band", "actions.mode": "form" }],
    ["quote", "With a customer quote", { layout: "band", proof: "quote", tone: "muted" }],
    ["band", "Band, roomy", { layout: "band", density: "roomy" }],
    ["split", "Split, two actions", { layout: "split", tone: "default", "actions.mode": "two" }],
    ["compact", "Compact card", { density: "compact" }],
    ["saas", "SaaS: band, two actions", { layout: "band", "actions.mode": "two", density: "roomy" }, ctaCase("saas")],
    ["shop", "Shop: split with a picture", { layout: "split", tone: "default" }, ctaCase("shop")],
    ["agency", "Agency: card, two actions", { "actions.mode": "two", tone: "muted" }, ctaCase("agency")],
  ],
  sample: {
    id: "cta", title: t("site.home.ctaTitle"), text: t("site.home.ctaText"),
    actions: { cta: t("site.home.ctaButton"), href: "#/pricing", secondary: t("site.home.ctaSecondary"), secondaryHref: "#/", emailLabel: t("promo.newsletter.label") },
    quote: { text: t("vibe.cta.quote"), by: t("vibe.cta.quoteBy") },
  },
});

const logos = define({
  key: "logos", theme: "marketing", group: "proof", name: "Logo cloud", docs: "Customers and partners as glyphs with names.",
  organism: "LogoCloud", axes: ["layout", "cols", "item", "tone", "density"], data: [d.logos],
  variants: [
    ["grid4", "Grid, four columns"],
    ["grid3", "Grid, three columns, tiles", { cols: "3", item: "tile" }],
    ["row", "Logo ribbon: one row of large marks", { layout: "row", item: "icon", density: "compact" }],
    ["icons", "Icons only, muted", { item: "icon", tone: "muted", density: "compact" }],
    ["grid2", "Grid, two columns, roomy", { cols: "2", density: "roomy" }],
    ["tiles4", "Tiles, four columns", { item: "tile" }],
  ],
  sample: { id: "logos", title: t("marketing.logos.title"), logos: ref("logos"), empty: t("empty.logos") },
});

const stats = define({
  key: "stats", theme: "marketing", group: "proof", name: "Stats", docs: "Key numbers as figures, cards or figures with icons.",
  organism: "StatsBand", axes: ["cols", "layout", "surface", "item", "align", "tone", "density"], data: [d.stats],
  variants: [
    ["plain4", "Plain figures, four columns"],
    ["panel", "One panel card, four figures, no heading", { surface: "panel", density: "compact" }, { title: "" }],
    ["stack", "Figures stacked in one column", { layout: "stack", align: "start" }],
    ["image", "Figures over a picture", { surface: "image", density: "roomy" }],
    // three cards in three columns: the fixture has four figures, which would leave one card alone on a second row
    ["cards", "Cards, three columns, three figures", { cols: "3", item: "card" }, { stats: list(nth(ref("stats"), 0), nth(ref("stats"), 1), nth(ref("stats"), 2)) }],
    ["icons", "Figures with icons, left aligned", { item: "icon", align: "start" }],
    ["muted2", "Plain, two columns, muted", { cols: "2", tone: "muted", density: "roomy" }],
    ["cardsCompact", "Cards, four columns, compact", { item: "card", density: "compact" }],
  ],
  sample: { id: "stats", title: t("marketing.stats.title"), stats: ref("stats"), empty: t("marketing.stats.empty") },
});

const testimonials = define({
  key: "testimonials", theme: "marketing", group: "proof", name: "Testimonials", docs: "Customer quotes as cards or plain figures.",
  organism: "TestimonialGrid", axes: ["layout", "cols", "item.kind", "item.avatar", "item.rating", "item.mark", "tone", "density"], data: [d.testimonials],
  variants: [
    ["grid3", "Cards, three columns"],
    ["masonry", "Masonry of cards", { layout: "masonry", "item.rating": "hide" }],
    ["strip", "Strip that scrolls sideways", { layout: "strip", "item.avatar": "none" }],
    ["social", "Posts of a social wall", { "item.kind": "social", layout: "masonry", "item.rating": "hide" }],
    ["featured", "One featured quote with a mark", { layout: "single", "item.kind": "plain", "item.rating": "hide", "item.mark": "icon" }],
    ["grid2", "Cards, two columns", { cols: "1-2" }],
    ["single", "Single quote, wide", { layout: "single", "item.kind": "plain", "item.rating": "hide" }],
    ["stack", "Narrow stack", { layout: "stack", "item.avatar": "none" }],
    ["plain", "Plain quotes, no avatars", { "item.kind": "plain", "item.avatar": "none", tone: "muted", density: "compact" }],
    ["noRating", "Cards, no rating, roomy", { "item.rating": "hide", density: "roomy" }],
  ],
  sample: { id: "testimonials", title: t("marketing.testimonials.title"), quotes: ref("testimonials"), empty: t("empty.quotes"), labels: { rating: t("testimonials.rating"), byLine: t("testimonials.byLine"), handleLine: t("testimonials.handleLine") } },
});

const steps = define({
  key: "steps", theme: "marketing", group: "how-it-works", name: "How it works", docs: "Numbered or icon steps in a row or a column.",
  organism: "StepsList", axes: ["layout", "marker", "align", "tone", "density"], data: [d.steps],
  variants: [
    ["row", "Row with numbers"],
    ["rowIcons", "Row with icons", { marker: "icon" }],
    ["column", "Column", { layout: "column" }],
    ["centered", "Row, centered, muted", { align: "center", tone: "muted" }],
    ["columnIcons", "Column with icons, roomy", { layout: "column", marker: "icon", density: "roomy" }],
    ["compact", "Row, compact", { density: "compact" }],
  ],
  sample: { id: "steps", title: t("marketing.steps.title"), steps: ref("steps"), empty: t("empty.steps") },
});

export const marketingBlocks = [header, hero, logos, features, stats, testimonials, steps, pricing, plan, faq, cta, footer];
const all = [...marketingBlocks, ...commerceBlocks, ...shopBlocks, ...moreBlocks, ...vibeBlocks, ...companyBlocks, ...shellBlocks, ...heroBlocks, ...faqBlocks, ...ctaBlocks, ...quoteBlocks, ...postBlocks, ...footerBlocks, ...featureSplitBlocks, ...pageTrailBlocks, ...postShowcaseBlocks, ...mediaListBlocks, ...featureShowcaseBlocks, ...storyTabsBlocks];

export const blocks: BlockSpec[] = all.map((x) => x.block);
export const blockTexts: Record<string, BlockTexts> = Object.fromEntries(all.map((x) => [x.block.id.slice("block.".length), x.texts]));

const portable = { svelte: true, react: true } as const;

/** the addresses of the routes of the site screen (its own: "" and "pricing") */
const SITE_ROUTES = { home: "#/", pricing: "#/pricing" };

/** the marketing site, now a list of blocks */
export const siteComposed: ComposedSpec = {
  $schema: "../../schema/schemas/composed.schema.json",
  specVersion: 1,
  id: "screen.site",
  name: "SiteScreen",
  kind: "composed",
  docs: "A marketing site of two routes, home and pricing, made of blocks: header, hero, features, pricing, FAQ, call to action, footer. Data: the Codex fixtures `features`, `tiers` and `faq`. The only action is the theme button.",
  routes: [{ path: "", area: "home" }, { path: "pricing", area: "pricing" }],
  // the app owns its addresses: the header and footer link to the two routes of this screen
  frame: { before: [{ block: "header", variant: "inline", props: { current: ref("route.area"), routes: SITE_ROUTES } }], after: [{ block: "footer", variant: "minimal", props: { routes: SITE_ROUTES } }] },
  areas: {
    home: [
      { block: "hero", variant: "centered", props: { id: "home-hero" } },
      { block: "features", variant: "grid", props: { id: "home-features" } },
      { block: "cta", variant: "card", props: { id: "home-cta" } },
    ],
    pricing: [
      { block: "hero", variant: "centered", props: { id: "pricing-hero", title: t("site.pricing.title"), text: t("site.pricing.text"), actions: undef() } },
      { block: "pricing", variant: "grid", props: { id: "pricing-tiers" } },
      { block: "faq", variant: "list", props: { id: "pricing-faq" } },
    ],
    notfound: [
      { block: "hero", variant: "centered", props: { id: "not-found", title: t("site.notFound.title"), text: t("site.notFound.text"), actions: { cta: t("site.notFound.back"), href: "#/" } } },
    ],
  },
  portable,
};

/** the catalog: an index of blocks by topic and a page per block with all its variants, built from the blocks above */
export const blocksComposed: ComposedSpec = {
  $schema: "../../schema/schemas/composed.schema.json",
  specVersion: 1,
  id: "screen.blocks",
  name: "BlocksScreen",
  kind: "composed",
  docs: "The block gallery: an index of blocks grouped by topic and one page per block with every variant, on the fixtures. Built from the block catalog; nothing is written by hand.",
  routes: [],
  frame: { before: [], after: [] },
  areas: {},
  gallery: true,
  portable,
};
