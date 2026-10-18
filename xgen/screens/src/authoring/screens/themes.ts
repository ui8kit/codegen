// The theme apps: each one is a composed screen (routes and areas made of blocks) that becomes a generated app in every host runtime.
// A page is a lead block (the one with the h1), a list of blocks `block.variant`, and the words of its head. The head texts
// are written to the dictionary under `pages.<app>.<page>` by screens/tools/author-theme-texts.ts; nothing else is written by hand.
import { ref } from "../../build";
import type { BlockUse, ComposedSpec } from "../../ir";
import { t } from "../gallery/block-kit";

/** [title, text, call to action] */
type Head = [string, string, string];
interface Page { path: string; lead: string; head: Head; rest: string[] }
export interface ThemeApp { name: string; title: string; docs: string; footer: string; pages: Page[] }

/** the lead blocks that take the title and the text of the page; the others (post, product) read them from their data */
const TAKES_TEXT = new Set(["pagehead", "hero", "errorpage", "authpage"]);
/** the key of an app in the dictionary: no hyphen, a hyphen would read as a minus in a path */
export const keyOf = (name: string): string => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
export const areaOf = (path: string): string => (path === "" ? "home" : path);
/** the label of a page in the menu: the area with a capital, unless it reads better in other words */
const NAV_WORDS: Record<string, string> = { signup: "Sign up", magic: "Magic link", faq: "FAQ" };
const navLabel = (area: string): string => NAV_WORDS[area] ?? area[0]!.toUpperCase() + area.slice(1);
/** the dictionary key of the menu label of a page */
export const navKey = (app: string, path: string): string => `pages.${keyOf(app)}.${areaOf(path)}.nav`;
/** the menu of a theme screen: one entry per page, in the order of the pages; written to its screen spec */
export const themeRoutes = (app: ThemeApp): Array<{ id: string; path: string; titleKey: string }> => app.pages.map((p) => ({ id: areaOf(p.path), path: p.path, titleKey: navKey(app.name, p.path) }));

export const themeApps: ThemeApp[] = [
  {
    name: "marketing-landing", title: "Landing pages", footer: "sitemap.columns",
    docs: "Landing pages of a product: five heroes (screenshot, form, code, display type, backdrop) each followed by proof, features and a call to action, then a company page, a portfolio and a page for teams built from the split blocks.",
    pages: [
      { path: "", lead: "hero.screenshot", head: ["Ship pages that stay simple", "One toolkit for the page, the proof and the call to action.", "See the launch page"], rest: ["logos.row", "features.rowsAlternate", "steps.rowIcons", "stats.icons", "testimonials.single", "faq.list", "cta.band"] },
      { path: "launch", lead: "hero.form", head: ["Be first in line", "Leave an address and get the first invitation.", "Read the developer page"], rest: ["iconwall.tiles4", "proof.above", "testimonials.grid3", "cta.form"] },
      { path: "developers", lead: "hero.code", head: ["Built for developers", "Install, run and read the output in one terminal.", "Meet the studio"], rest: ["bento.bento", "templates.grid4", "features.tiles4", "faq.tabs", "cta.split"] },
      { path: "studio", lead: "hero.display", head: ["Big words, small page", "Type first, picture second, one button.", "See the events page"], rest: ["logos.grid4", "features.tiles4", "testimonials.masonry", "cta.band"] },
      { path: "events", lead: "hero.backdrop", head: ["Join us on stage", "Talks, workshops and a room full of builders.", "Back to the start"], rest: ["stats.cards", "testimonials.strip", "videos.overlay", "cta.agency"] },
      { path: "company", lead: "pagehead.center", head: ["About us", "How we work, where we came from and who we are.", "See the work"], rest: ["about.split", "storytabs.yearTabs", "timeline.split", "team.cards4", "jobs.grouped"] },
      { path: "work", lead: "aboutme.facts", head: ["", "", ""], rest: ["projects.cards", "photos.masonry"] },
      { path: "teams", lead: "herosplit.quoteStats", head: ["", "", ""], rest: ["logos.row", "faqsplit.helpCard", "quotesplit.ratingPanel", "ctaproof.splitStats"] },
    ],
  },
  {
    name: "marketing-product", title: "Product pages", footer: "sitemap.columns",
    docs: "Product pages: features as grids, bento, tabs, an accordion and a sticky list, before and after pictures, and the navigation patterns.",
    pages: [
      { path: "", lead: "hero.split", head: ["One product, many jobs", "See what it does and how the parts fit together.", "Take the tour"], rest: ["features.grid", "featuresplit.metricCards", "featureshowcase.panelCards4", "bento.images", "featuretabs.split", "accordion.media"] },
      { path: "tour", lead: "pagehead.center", head: ["Take the tour", "Four stops: the list, the steps, the film and the menu.", "See the capabilities"], rest: ["sticky.end", "beforeafter.cards", "steps.column", "videos.grid3", "megamenu.open"] },
      { path: "capabilities", lead: "pagehead.start", head: ["Capabilities", "Every feature in a shape that suits it.", "See the navigation"], rest: ["features.grid2", "iconwall.chips6", "accordion.first", "beforeafter.rows", "sticky.card", "cta.compact"] },
      { path: "navigation", lead: "pagehead.muted", head: ["Navigation patterns", "Bars, menus and footers in each shape.", "Back to the start"], rest: ["header.stacked", "navbar.split", "navbar.search", "navbar.media", "megamenu.twoCols", "footer.centered"] },
    ],
  },
  {
    name: "marketing-pricing", title: "Pricing pages", footer: "sitemap.newsletter",
    docs: "Pricing pages: tiers with a billing switch, a comparison table, one plan, a usage slider, credit packs, free against pro, and us against the rest.",
    pages: [
      { path: "", lead: "pagehead.center", head: ["Plans for every team", "Pick a plan, change it when the team grows.", "Compare the plans"], rest: ["pricing.monthly", "logos.grid3", "compare.plans", "faq.twoColumns", "cta.saas"] },
      { path: "plans", lead: "pagehead.start", head: ["Free or pro", "Start free; the pro plan adds the rest.", "See the usage page"], rest: ["pricing.duo", "plan.standard", "pricing.stack", "compare.highlight"] },
      { path: "usage", lead: "pagehead.muted", head: ["Pay for what you use", "Slide to your volume or buy a pack of credits.", "See how we compare"], rest: ["usage.card", "credits.tiles4", "credits.rows", "pricing.annual", "cta.row"] },
      { path: "compare", lead: "hero.muted", head: ["Why teams switch", "Us against the others, line by line.", "Back to the plans"], rest: ["compare.rivals", "testimonials.featured", "faq.search", "cta.quote"] },
    ],
  },
  {
    name: "commerce-shop", title: "Online shop", footer: "sitemap.columns",
    docs: "A shop: home with categories and products, the catalog, offers, a product page with details and reviews, the cart, the checkout, delivery and pickup, and the orders.",
    pages: [
      { path: "", lead: "hero.shop", head: ["Good things for your desk", "New arrivals, picked by hand and shipped in two days.", "Browse the catalog"], rest: ["categories.chips", "products.grid4", "reviews.grid", "newsletter.stacked", "cta.shop"] },
      { path: "catalog", lead: "pagetrail.crumbsFigure", head: ["", "", ""], rest: ["categories.sidebar", "products.catalog"] },
      { path: "browse", lead: "pagehead.center", head: ["Browse by mood", "Three ways to look at the same shelf.", "Open a product"], rest: ["categories.bar", "products.browse", "products.showcase", "products.list"] },
      { path: "offers", lead: "storehero.overlay", head: ["", "", ""], rest: ["usp.strip", "products.railCompact", "cartdrawer.filled"] },
      { path: "product", lead: "product.split", head: ["", "", ""], rest: ["productinfo.split", "reviews.list", "products.grid3"] },
      { path: "cart", lead: "pagehead.start", head: ["Your cart", "Check the lines and the total, then pay.", "Go to checkout"], rest: ["cartpage.split", "cart.table", "summary.card"] },
      { path: "checkout", lead: "pagehead.start", head: ["Place your order", "Four short steps and the order is on its way.", "See the delivery options"], rest: ["checkout.numbered"] },
      { path: "delivery", lead: "pagehead.center", head: ["Delivery and pickup", "Zones, windows and the stores near you.", "See your orders"], rest: ["delivery.full", "zones.table", "slots.split", "locations.cards"] },
      { path: "orders", lead: "pagehead.start", head: ["Your orders", "Every order, with its status.", "Back to the shop"], rest: ["orders.table", "orders.cards"] },
    ],
  },
  {
    name: "promo-campaign", title: "Campaigns", footer: "footersplit.newsletterStart",
    docs: "Campaign pages: announcement bars in every position and tone, sign-up forms, calls to action with a pattern, and the cookie notice.",
    pages: [
      { path: "", lead: "hero.cluster", head: ["Spring campaign", "A week of offers with a sign-up for early access.", "See the launch"], rest: ["announcement.badge", "newsletter.split", "cta.form", "cookie.card"] },
      { path: "launch", lead: "hero.saas", head: ["The launch is live", "Everything new in one place.", "See the offer"], rest: ["announcement.bar", "newsletter.inline", "logos.tiles4", "cta.saas"] },
      { path: "offer", lead: "pagehead.center", head: ["Limited offer", "Three banners, one deadline.", "See the notices"], rest: ["announcement.badge", "announcement.split", "announcement.shop", "cta.shop", "newsletter.consent"] },
      { path: "notices", lead: "pagehead.start", head: ["Notices", "The bottom bar, the dismissible bar and the cookie choices.", "Back to the start"], rest: ["announcement.dismissible", "announcement.bottom", "cookie.settings", "cookie.bar", "newsletter.muted"] },
    ],
  },
  {
    name: "content-blog", title: "Blog", footer: "sitemap.compact",
    docs: "A blog: a magazine front page, filtered and plain lists, and articles with a table of contents, a single column or no cover.",
    pages: [
      { path: "", lead: "pagehead.start", head: ["The journal", "Notes on design, engineering and the work in between.", "Read the articles"], rest: ["posts.magazine", "postshowcase.introCards", "newsletter.stacked"] },
      { path: "articles", lead: "pagehead.center", head: ["All articles", "Filter by topic.", "Open the archive"], rest: ["posts.filters", "posts.twoUp"] },
      { path: "archive", lead: "pagehead.start", head: ["Archive", "Older posts as a list, a digest and plain titles.", "Read a post"], rest: ["posts.list", "posts.digest", "posts.textOnly"] },
      { path: "post", lead: "postheader.start", head: ["", "", ""], rest: ["article.toc"] },
      { path: "story", lead: "postsplit.splitStats", head: ["", "", ""], rest: ["article.column"] },
      { path: "essay", lead: "postheader.center", head: ["", "", ""], rest: ["article.column", "newsletter.inline"] },
      { path: "plain", lead: "postheader.noCover", head: ["", "", ""], rest: ["article.plain", "posts.grid"] },
    ],
  },
  {
    name: "account-portal", title: "Account", footer: "sitemap.row",
    docs: "Sign-in and account pages: split, centered and minimal sign-in, sign-up, reset, magic link, social first, the sign-up wizard, cards and the profile.",
    pages: [
      { path: "", lead: "authpage.split", head: ["Welcome back", "Sign in to pick up where you left off.", "Sign in"], rest: [] },
      { path: "start", lead: "authpage.splitStart", head: ["Good to see you", "Your workspace is one step away.", "Sign in"], rest: [] },
      { path: "signup", lead: "authpage.signup", head: ["Create your account", "Two minutes and you are in.", "Create account"], rest: [] },
      { path: "welcome", lead: "authpage.socialFirst", head: ["Choose how to sign in", "Use an account you already have.", "Continue"], rest: [] },
      { path: "reset", lead: "authpage.reset", head: ["Reset your password", "We send a link to your address.", "Send the link"], rest: [] },
      { path: "magic", lead: "authpage.magic", head: ["Sign in with a link", "No password, only your inbox.", "Send the link"], rest: [] },
      { path: "minimal", lead: "authpage.minimal", head: ["Sign in", "Enter your address and password.", "Sign in"], rest: [] },
      { path: "options", lead: "authpage.social", head: ["More ways to sign in", "Use a provider or your address.", "Sign in"], rest: [] },
      { path: "join", lead: "pagehead.center", head: ["Join in three steps", "Tell us about you, your team and your plan.", "Back to sign in"], rest: ["wizard.bar", "wizard.list"] },
      { path: "cards", lead: "pagehead.start", head: ["Sign-in cards", "The card on its own, in three modes.", "Back to sign in"], rest: ["auth.signin", "auth.social", "auth.signupSocial"] },
      { path: "profile", lead: "pagehead.start", head: ["Your profile", "Name, address and the way we reach you.", "Back to sign in"], rest: ["profile.split", "profile.stacked"] },
    ],
  },
  {
    name: "dashboard-console", title: "Console", footer: "sitemap.compact",
    docs: "A console: overview with counters, chart and activity, a kanban board, app shells with sidebar, top bar and panes, dashboard shells, navigation, and empty and loading states.",
    pages: [
      { path: "", lead: "pagehead.start", head: ["Overview", "Counters, a chart and what happened last.", "Open the board"], rest: ["overview.split", "metrics.tiles", "chart.bars", "activity.timeline"] },
      { path: "board", lead: "pagehead.start", head: ["Work board", "Cards in lanes; the port adds moving.", "Open the workspace"], rest: ["kanban.detail", "kanban.twoCols"] },
      { path: "workspace", lead: "pagehead.muted", head: ["Workspace shells", "The frame of a signed-in app in three shapes.", "See the layouts"], rest: ["shell.sidebar", "shell.top", "shell.panes"] },
      { path: "shells", lead: "pagehead.muted", head: ["Dashboard shells", "Top bars, sidebars and footers around empty cards.", "See the layout parts"], rest: ["dashshell.classic", "dashshell.twoLevel", "dashshell.end"] },
      { path: "layouts", lead: "pagehead.start", head: ["Layout parts", "The sidebar, the bottom bar and the small widgets.", "See the states"], rest: ["sidenav.full", "sidenav.compact", "bottomnav.labels", "metrics.compact", "chart.meters", "overview.stacked"] },
      { path: "states", lead: "pagehead.start", head: ["Empty and loading", "What the app shows before there is anything to show.", "Back to the overview"], rest: ["empty.illustrated", "empty.orders", "skeleton.cards", "skeleton.list"] },
    ],
  },
  {
    name: "onboarding-flow", title: "Onboarding", footer: "sitemap.row",
    docs: "Onboarding: steps, a checklist that expands, a product tour with callouts, a welcome video and the first empty screen.",
    pages: [
      { path: "", lead: "pagehead.start", head: ["Get started", "Three steps to a working account.", "Watch the welcome"], rest: ["stepper.horizontal", "checklist.expand", "tour.below"] },
      { path: "welcome", lead: "pagehead.center", head: ["Welcome aboard", "A short film, then the checklist.", "Set up"], rest: ["videomodal.default", "checklist.numbered"] },
      { path: "setup", lead: "pagehead.start", head: ["Set up your workspace", "Tick the tasks as you go.", "Take the tour"], rest: ["stepper.vertical", "checklist.card", "empty.compact"] },
      { path: "tour", lead: "pagehead.start", head: ["Product tour", "Callouts that point at the thing they explain.", "Back to the start"], rest: ["tour.above", "tour.end", "checklist.text", "videomodal.chapters"] },
    ],
  },
  {
    name: "support-center", title: "Support", footer: "sitemap.status",
    docs: "A help center: channels, FAQ as tabs, chat and search, contact forms, and the pages for a missing or moved address.",
    pages: [
      { path: "", lead: "pagehead.center", head: ["How can we help?", "Pick a channel, read the answers or write to us.", "Open the FAQ"], rest: ["channels.grid", "medialist.topicRows", "faq.tabs", "contact.split"] },
      { path: "faq", lead: "pagehead.start", head: ["Questions and answers", "Search, or ask the chat.", "Contact us"], rest: ["faq.chat", "faq.search"] },
      { path: "contact", lead: "pagehead.start", head: ["Contact us", "We answer within one working day.", "Back to the help center"], rest: ["contact.single", "channels.list", "contact.consent"] },
      { path: "missing", lead: "errorpage.centered", head: ["This page is gone", "The address is wrong or the page moved.", "Back to the help center"], rest: [] },
      { path: "moved", lead: "errorpage.split", head: ["This page moved", "Try the search, or go back.", "Back to the help center"], rest: ["channels.twoUp"] },
    ],
  },
];

const split = (ref: string): [string, string] => { const [b, v] = ref.split("."); return [b!, v!]; };

type PageTexts = { nav: string; title?: string; text?: string; cta?: string };
/** the page texts as dictionary entries: pages.<appKey>.<page>.{nav,title,text,cta}; the menu label for every page, the head for the pages whose lead takes it */
export function themeTexts(): Record<string, Record<string, PageTexts>> {
  const out: Record<string, Record<string, PageTexts>> = {};
  for (const app of themeApps) {
    out[keyOf(app.name)] = {};
    for (const p of app.pages) {
      const area = areaOf(p.path);
      out[keyOf(app.name)]![area] = { nav: navLabel(area), ...(TAKES_TEXT.has(split(p.lead)[0]) ? { title: p.head[0], text: p.head[1], cta: p.head[2] } : {}) };
    }
  }
  return out;
}

const page = (app: ThemeApp, i: number): BlockUse[] => {
  const p = app.pages[i]!;
  const next = app.pages[(i + 1) % app.pages.length]!;
  const [lb, lv] = split(p.lead);
  const area = areaOf(p.path);
  const at = (k: string) => t(`pages.${keyOf(app.name)}.${area}.${k}`);
  const href = next.path === "" ? "#/" : `#/${next.path}`;
  const lead: Record<string, BlockUse["props"]> = {
    pagehead: { title: at("title"), text: at("text"), cta: at("cta"), href },
    hero: { title: at("title"), text: at("text"), actions: { cta: at("cta"), href } },
    errorpage: { title: at("title"), text: at("text"), actions: { cta: at("cta"), href } },
    authpage: { title: at("title"), text: at("text"), submit: at("cta") },
  };
  return [{ block: lb, variant: lv, ...(lead[lb] ? { props: lead[lb] } : {}) }, ...p.rest.map((r) => { const [b, v] = split(r); return { block: b, variant: v }; })];
};

export const themeComposed: ComposedSpec[] = themeApps.map((app) => ({
  $schema: "../../schema/schemas/composed.schema.json",
  specVersion: 1,
  id: `screen.theme-${app.name}`,
  name: `Theme${app.name.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join("")}Screen`,
  kind: "composed",
  docs: app.docs,
  routes: app.pages.map((p) => ({ path: p.path, area: areaOf(p.path) })),
  frame: {
    before: [{ block: "navbar", variant: "inline", props: { brandHref: "#/", links: ref("nav.links"), current: ref("nav.current"), skip: t("site.header.skip"), actions: { themeLabel: t("theme.toggle") } } }],
    after: [{ block: split(app.footer)[0], variant: split(app.footer)[1] }],
  },
  areas: Object.fromEntries(app.pages.map((p, i) => [areaOf(p.path), page(app, i)])),
  chunks: true,
  requireH1: true,
  nameLandmarks: true,
  nav: true,
  menu: themeRoutes(app),
  portable: { svelte: true, react: true },
}));
