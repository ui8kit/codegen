// The registry of the 92 layouts of the reference catalog (15 categories): each is mapped to a block and variant of ours, or to a motion contract
// (a pattern with a port contract and a static variant). Only the composition and the layout are recorded, never their words or markup.
// xgen/docs/vibeui-coverage.md is written from this table (screens/tools/author-coverage.ts) and `xgen check` compares the two.

/** a reference: `block.variant`, or `pattern.<name>` for a contract */
export interface CoverageRow { category: string; layout: string; refs: string[] }

const row = (category: string, layout: string, ...refs: string[]): CoverageRow => ({ category, layout, refs });

export const CATEGORIES = ["Auth", "Pricing", "Features", "Hero", "CTA", "Stats", "Navigation", "Testimonials", "Footer", "FAQ", "Dashboards", "Onboarding", "Blog", "Contact", "Bonus"] as const;
/** how many layouts the catalog holds per category, in the order above */
export const CATEGORY_SIZES = [6, 8, 8, 8, 7, 7, 8, 8, 5, 5, 6, 4, 4, 3, 5] as const;

export const vibeCoverage: CoverageRow[] = [
  row("Auth", "Form beside a picture panel", "authpage.split"),
  row("Auth", "Card centered on a tinted page", "authpage.centered"),
  row("Auth", "Bare form, no chrome", "authpage.minimal"),
  row("Auth", "Social providers first, address second", "authpage.socialFirst", "auth.socialFirst"),
  row("Auth", "Passwordless link by address", "authpage.magic", "auth.magic"),
  row("Auth", "Sign-up in steps with progress", "wizard.bar", "wizard.list", "wizard.second"),
  row("Pricing", "Three tiers side by side, one highlighted", "pricing.grid"),
  row("Pricing", "Tiers with a monthly or yearly switch", "pricing.monthly", "pricing.annual"),
  row("Pricing", "Feature comparison table across plans", "compare.plans", "compare.highlight"),
  row("Pricing", "One plan, one price, one list", "plan.standard"),
  row("Pricing", "Price follows a usage slider", "usage.card"),
  row("Pricing", "Packs of credits to buy", "credits.tiles4"),
  row("Pricing", "Free plan against the paid plan", "pricing.duo"),
  row("Pricing", "Plans stacked in one column", "pricing.stack"),
  row("Features", "Icon, title and text in a grid", "features.grid"),
  row("Features", "Bento: tiles of different sizes", "bento.bento"),
  row("Features", "Rows of text and picture, sides alternate", "features.rowsAlternate"),
  row("Features", "Features behind tabs", "featuretabs.split"),
  row("Features", "Features as an accordion beside a picture", "accordion.media"),
  row("Features", "List that follows the scroll beside a sticky picture", "sticky.end", "pattern.scroll-spy"),
  row("Features", "Wall of icons with short labels", "iconwall.tiles4"),
  row("Features", "Before and after, side by side", "beforeafter.cards"),
  row("Hero", "Centered text above a product screenshot", "hero.screenshot"),
  row("Hero", "Text on one side, picture on the other", "hero.split"),
  row("Hero", "Text over a full-width background clip", "hero.backdrop", "pattern.video-embed"),
  row("Hero", "Text over a moving mesh background", "hero.muted", "pattern.animated-backdrop"),
  row("Hero", "Terminal window with typed lines", "hero.code", "pattern.typing-text"),
  row("Hero", "Cluster of floating interface cards", "hero.cluster"),
  row("Hero", "Oversized type, almost no picture", "hero.display"),
  row("Hero", "Headline with an inline address form", "hero.form"),
  row("CTA", "Full-width band with one button", "cta.band"),
  row("CTA", "Card split into text and action", "cta.split", "cta.row"),
  row("CTA", "Bar fixed to the bottom of the screen", "announcement.bottom"),
  row("CTA", "Band over a quiet pattern", "cta.band"),
  row("CTA", "Two actions for two audiences", "cta.saas", "cta.agency"),
  row("CTA", "Address field and a button inline", "cta.form"),
  row("CTA", "Customer quote above the action", "cta.quote"),
  row("Stats", "Four figures in a row", "stats.plain4"),
  row("Stats", "Figures that count up on view", "stats.plain4", "pattern.count-up"),
  row("Stats", "Icon beside each figure", "stats.icons"),
  row("Stats", "Customer logos above the figures", "proof.above"),
  row("Stats", "Figures stacked in one column", "stats.stack"),
  row("Stats", "Figures over a picture", "stats.image"),
  row("Stats", "Each figure in its own card", "stats.cards"),
  row("Navigation", "Brand, links and one button", "navbar.inline"),
  row("Navigation", "Brand in the middle, links on both sides", "navbar.split"),
  row("Navigation", "Wide panel of grouped links under a menu", "megamenu.open"),
  row("Navigation", "Vertical sidebar with icons and the user", "sidenav.full"),
  row("Navigation", "Floating rounded bar", "navbar.inline"),
  row("Navigation", "Transparent bar over a picture", "navbar.media"),
  row("Navigation", "Bar with a search field and its shortcut", "navbar.search"),
  row("Navigation", "Tab bar at the bottom for phones", "bottomnav.labels"),
  row("Testimonials", "Three quote cards in a row", "testimonials.grid3"),
  row("Testimonials", "Endless strip of quotes", "testimonials.strip", "pattern.marquee"),
  row("Testimonials", "Masonry of quotes of different height", "testimonials.masonry"),
  row("Testimonials", "One large featured quote", "testimonials.featured"),
  row("Testimonials", "Grid of customer videos", "videos.grid3"),
  row("Testimonials", "Wall of short social posts", "testimonials.social"),
  row("Testimonials", "Cloud of customer logos", "logos.grid4"),
  row("Testimonials", "Quotes one at a time with arrows", "testimonials.single", "pattern.carousel"),
  row("Footer", "Brand and several columns of links", "sitemap.columns"),
  row("Footer", "Single line: brand, links, copyright", "footer.minimal", "sitemap.row"),
  row("Footer", "Giant brand word across the bottom", "sitemap.columns"),
  row("Footer", "Sign-up form first, links after", "sitemap.newsletter"),
  row("Footer", "Links with a service status pill", "sitemap.status"),
  row("FAQ", "Questions as an accordion", "faq.list"),
  row("FAQ", "Questions in two columns", "faq.twoColumns"),
  row("FAQ", "Questions as a chat", "faq.chat"),
  row("FAQ", "Questions with a search field", "faq.search"),
  row("FAQ", "Questions grouped under tabs", "faq.tabs"),
  row("Dashboards", "Sidebar and a main area", "shell.sidebar"),
  row("Dashboards", "Top bar and a main area", "shell.top"),
  row("Dashboards", "Three panes: list, detail, side", "shell.panes"),
  row("Dashboards", "Kanban lanes with cards", "kanban.detail", "pattern.sortable-list"),
  row("Dashboards", "Counters, a chart and the activity", "overview.split"),
  row("Dashboards", "Empty state with one action", "empty.orders"),
  row("Onboarding", "Checklist whose tasks expand", "checklist.expand"),
  row("Onboarding", "Tour: callouts that point at the interface", "tour.below"),
  row("Onboarding", "Welcome video in a dialog", "videomodal.default", "pattern.video-embed"),
  row("Onboarding", "Empty state with an illustration", "empty.illustrated"),
  row("Blog", "Magazine front: one lead post and a grid", "posts.magazine"),
  row("Blog", "Single reading column", "article.column"),
  row("Blog", "Article with a table of contents beside it", "article.toc"),
  row("Blog", "Card grid with topic filters", "posts.filters"),
  row("Contact", "Form beside the contact details", "contact.split"),
  row("Contact", "Channels: chat, mail, phone as cards", "channels.grid"),
  row("Contact", "Whole page for the form, nothing else", "contact.page"),
  row("Bonus", "Us against the competitors", "compare.rivals"),
  row("Bonus", "Announcement of a new feature", "announcement.badge"),
  row("Bonus", "Cookie notice as a card", "cookie.card"),
  row("Bonus", "Page not found", "errorpage.centered"),
  row("Bonus", "Loading skeleton of a page", "skeleton.cards"),
];

import type { BlockSpec } from "../../ir";
import { vibeBlocks } from "./blocks-vibe";

/** keys of the blocks that were added for the reference catalog (the others only got new variants) */
export const NEW_BLOCK_KEYS: ReadonlySet<string> = new Set(vibeBlocks.map((x) => x.block.id.slice("block.".length)));

export const isContract = (ref: string): boolean => ref.startsWith("pattern.");
export type CoverageKind = "variant" | "new block" | "variant + contract" | "new block + contract";

export function kindOf(r: CoverageRow): CoverageKind {
  const block = r.refs.find((x) => !isContract(x));
  const fresh = block !== undefined && NEW_BLOCK_KEYS.has(block.split(".")[0]!);
  const contract = r.refs.some(isContract);
  return `${fresh ? "new block" : "variant"}${contract ? " + contract" : ""}` as CoverageKind;
}

/** problems of the registry against the catalog: counts, every reference exists, every contract is used */
export function coverageProblems(blocks: BlockSpec[], patternNames: ReadonlySet<string>, contractNames: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const total = CATEGORY_SIZES.reduce((n, x) => n + x, 0);
  if (vibeCoverage.length !== total) out.push(`coverage: ${vibeCoverage.length} layouts in the registry, the catalog has ${total}`);
  CATEGORIES.forEach((c, i) => { const n = vibeCoverage.filter((r) => r.category === c).length; if (n !== CATEGORY_SIZES[i]) out.push(`coverage: category ${c} has ${n} layouts, expected ${CATEGORY_SIZES[i]}`); });
  const used = new Set<string>();
  vibeCoverage.forEach((r, i) => {
    const at = `coverage #${i + 1} (${r.category}: ${r.layout})`;
    if (!r.refs.some((x) => !isContract(x))) out.push(`${at}: no block and variant`);
    for (const ref of r.refs) {
      if (isContract(ref)) {
        const name = ref.slice("pattern.".length);
        used.add(name);
        if (!patternNames.has(name)) out.push(`${at}: no pattern ${name}`);
        continue;
      }
      const [block, variant] = ref.split(".");
      const b = blocks.find((x) => x.id === `block.${block}`);
      if (!b) out.push(`${at}: no block ${block}`);
      else if (!b.variants.some((v) => v.id === variant)) out.push(`${at}: block ${block} has no variant ${variant}`);
    }
  });
  for (const c of contractNames) if (!used.has(c)) out.push(`coverage: contract pattern.${c} is not used by any layout`);
  return out;
}

/** the text of xgen/docs/vibeui-coverage.md */
export function coverageMarkdown(blocks: BlockSpec[]): string {
  const org = (r: CoverageRow): string => { const k = r.refs.find((x) => !isContract(x))!.split(".")[0]; return blocks.find((b) => b.id === `block.${k}`)?.organism ?? "?"; };
  const kinds = vibeCoverage.map(kindOf);
  const n = (k: CoverageKind): number => kinds.filter((x) => x === k).length;
  const lines: string[] = [
    "# Coverage of the reference catalog",
    "",
    "<!-- Written by screens/tools/author-coverage.ts from xgen/screens/src/authoring/gallery/coverage.ts. `xgen check` compares this file with the registry; do not edit it by hand. -->",
    "",
    `The reference catalog holds ${vibeCoverage.length} layouts in ${CATEGORIES.length} categories. Each one is mapped to a block and a variant of ours (a variant is a row of data: axes and case copy), or to a block plus a contract for the motion that a port must supply. Only the composition and the layout are recorded here: no words and no markup of the source are copied. The source of truth is our own primitives, patterns and organisms with their specs.`,
    "",
    "| Kind | Layouts |",
    "| --- | --- |",
    `| A variant of a block that existed | ${n("variant")} |`,
    `| A new block | ${n("new block")} |`,
    `| A variant, plus a contract for motion | ${n("variant + contract")} |`,
    `| A new block, plus a contract for motion | ${n("new block + contract")} |`,
    `| **All** | **${vibeCoverage.length}** |`,
    "",
    `${n("variant + contract") + n("new block + contract")} layouts need a contract (${new Set(vibeCoverage.flatMap((r) => r.refs.filter(isContract))).size} patterns: marquee, carousel, count-up, typing text, video embed, animated backdrop, scroll spy, sortable list). A contract is a pattern with a props interface and slots, generated for every runtime as a typed port; it has no animation of its own, and the static variant named next to it is what the page shows without the port.`,
    "",
    "Rules every row obeys: no gradients, no animation variants, icons from Lucide, pictures as embedded placeholders, tokens of shadcn, text from the English dictionary.",
    "",
  ];
  let i = 0;
  for (const c of CATEGORIES) {
    lines.push(`## ${c}`, "", "| # | Layout | Ours | Organism | Kind |", "| --- | --- | --- | --- | --- |");
    for (const r of vibeCoverage.filter((x) => x.category === c)) {
      i++;
      lines.push(`| ${i} | ${r.layout} | ${r.refs.map((x) => `\`${x}\``).join(", ")} | ${org(r)} | ${kinds[i - 1]} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** the patterns that are only a port contract (a typed interface and slots; the motion is the port's own) */
export const CONTRACT_PATTERNS = ["marquee", "carousel", "count-up", "typing-text", "video-embed", "animated-backdrop", "scroll-spy", "sortable-list"] as const;
