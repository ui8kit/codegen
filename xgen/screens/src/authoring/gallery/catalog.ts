// The catalog screen (/catalog/): every block of the kit sorted into sections and categories, one page per category with the blocks
// and their variants, and full pages composed of blocks. A block can sit in two categories (a shop hero is also a storefront hero);
// every variant sits in at least one, so the catalog is the whole kit. The names and notes go to the dictionary under `catalog`
// (screens/tools/author-block-texts.ts writes them).

import type { BlockUse, CatalogTree, ComposedSpec } from "../../ir";
import { dictKey } from "../../compose-kit";
import { t } from "./block-kit";

const c = (k: string) => t(`commerce.${k}`);
const co = (k: string) => t(`company.${k}`);


type Entry = { block: string; variants?: string[] };
const all = (...keys: string[]): Entry[] => keys.map((block) => ({ block }));
const only = (block: string, ...variants: string[]): Entry => ({ block, variants });
const cat = (id: string, title: string, ...entries: Entry[]) => ({ id, title, entries });

/** the tree: section id, its title and note, its categories */
const SECTIONS = [
  { id: "marketing", title: "Marketing", text: "Landing page sections: navigation, hero, features, proof, pricing, FAQ, calls to action, footers, team and company pages.", categories: [
    cat("marketing-navigation", "Navigation", ...all("header", "navbar", "megamenu")),
    cat("marketing-hero", "Hero", ...all("hero")),
    cat("marketing-hero-split", "Split heroes", ...all("herosplit")),
    cat("marketing-page-head", "Page head", ...all("pagehead")),
    cat("marketing-page-trail", "Page headings with breadcrumbs", ...all("pagetrail")),
    cat("marketing-features", "Feature grids", ...all("features", "iconwall", "beforeafter")),
    cat("marketing-features-split", "Features beside a picture", ...all("featuresplit")),
    cat("marketing-feature-cards", "Feature cards with a picture", ...all("featureshowcase")),
    cat("marketing-media-list", "Lists beside a picture", ...all("medialist")),
    cat("marketing-showcases", "Feature showcases", ...all("bento", "featuretabs", "accordion", "sticky")),
    cat("marketing-how-it-works", "How it works", ...all("steps")),
    cat("marketing-proof", "Logos and proof", ...all("logos", "proof", "videos")),
    cat("marketing-stats", "Stats", ...all("stats")),
    cat("marketing-testimonials", "Testimonials", ...all("testimonials")),
    cat("marketing-testimonials-split", "Split testimonials", ...all("quotesplit")),
    cat("marketing-pricing", "Pricing plans", ...all("pricing", "plan")),
    cat("marketing-pricing-tools", "Pricing tools", ...all("compare", "credits", "usage")),
    cat("marketing-faq", "FAQ", ...all("faq", "faqsplit")),
    cat("marketing-cta", "Call to action", ...all("cta")),
    cat("marketing-cta-proof", "Calls to action with proof", ...all("ctaproof")),
    cat("marketing-team", "Team", ...all("team")),
    cat("marketing-about", "About", ...all("about", "aboutme")),
    cat("marketing-portfolio", "Portfolio", ...all("projects")),
    cat("marketing-careers", "Careers", ...all("jobs")),
    cat("marketing-gallery", "Galleries", ...all("photos", "templates")),
    cat("marketing-footer", "Footer", ...all("footer", "sitemap")),
    cat("marketing-footer-split", "Footers with more", ...all("footersplit")),
  ] },
  { id: "content", title: "Content", text: "A blog and documents: post lists, post headers and long reading pages.", categories: [
    cat("content-blog", "Blog", ...all("posts")),
    cat("content-post-showcase", "Post showcase", ...all("postshowcase")),
    cat("content-post-header", "Post header", ...all("postheader")),
    cat("content-post-header-split", "Post headers with more", ...all("postsplit")),
    cat("content-article", "Article and legal", ...all("article")),
    cat("content-timeline", "Timeline", ...all("timeline")),
    cat("content-story-tabs", "Story in steps", ...all("storytabs")),
  ] },
  { id: "promo", title: "Promo", text: "Announcements, the cookie notice and newsletter sign-ups.", categories: [
    cat("promo-banners", "Banners", ...all("announcement", "cookie")),
    cat("promo-newsletter", "Newsletter", ...all("newsletter")),
  ] },
  { id: "support", title: "Support", text: "Contact forms, the ways to reach a person and error pages.", categories: [
    cat("support-contact", "Contact", ...all("contact", "channels")),
    cat("support-states", "Error pages", ...all("errorpage")),
  ] },
  { id: "commerce", title: "Commerce", text: "A whole store: storefront, categories, products, product page, cart, checkout and order history.", categories: [
    cat("commerce-storefront", "Storefront", only("hero", "shop"), ...all("storehero", "usp")),
    cat("commerce-categories", "Categories and filters", ...all("categories")),
    cat("commerce-products", "Product grids and rails", ...all("products")),
    cat("commerce-product", "Product page", ...all("product", "productinfo", "reviews")),
    cat("commerce-cart", "Cart", ...all("cart", "cartpage", "cartdrawer")),
    cat("commerce-checkout", "Checkout", ...all("checkout", "summary"), only("stepper", "horizontal")),
    cat("commerce-delivery", "Delivery and pickup", ...all("delivery", "zones", "slots", "locations")),
    cat("commerce-orders", "Orders", ...all("orders")),
  ] },
  { id: "app", title: "App and dashboard", text: "The inside of a product: shells and navigation, dashboard widgets, states, sign-in, settings and onboarding.", categories: [
    cat("app-shell", "Shells and navigation", ...all("shell", "sidenav", "bottomnav")),
    cat("app-dashboard-shells", "Dashboard shells", ...all("dashshell")),
    cat("app-widgets", "Dashboard widgets", ...all("metrics", "chart", "activity")),
    cat("app-boards", "Dashboard boards", ...all("overview", "kanban")),
    cat("app-states", "Empty and loading states", ...all("empty", "skeleton")),
    cat("app-auth", "Sign in and sign up", ...all("auth", "wizard")),
    cat("app-auth-pages", "Sign-in pages", ...all("authpage")),
    cat("app-settings", "Settings", ...all("profile")),
    cat("app-onboarding", "Onboarding", ...all("checklist", "stepper")),
    cat("app-guidance", "Guidance", ...all("tour", "videomodal")),
  ] },
];

const use = (block: string, variant: string, props?: BlockUse["props"]): BlockUse => ({ block, variant, ...(props ? { props } : {}) });

/** the dashboard shells as whole pages: one shell each, filling the page, with placeholder cards */
const SHELL_PAGES: Array<[string, string, string]> = [
  ["classic", "Shell: top bar and sidebar", "A top bar with search across the app over a wide sidebar."],
  ["inset", "Shell: top bar over the content", "A wide sidebar beside a column with its own top bar and footer."],
  ["rail", "Shell: icon rail", "A top bar without search over a rail of icons and a list."],
  ["railFooter", "Shell: rail with a footer", "An icon rail, a top bar over the content and a footer across."],
  ["collapsed", "Shell: collapsed sidebar", "The static collapsed state of a sidebar with its expand button."],
  ["twoLevel", "Shell: two-level sidebar", "A rail beside the links of the current section."],
  ["twoLevelFull", "Shell: two levels under a top bar", "A top bar across, a two-level sidebar and a footer across."],
  ["end", "Shell: sidebar at the end", "A wide sidebar on the end side and a footer across."],
  ["railEnd", "Shell: rail at the end", "An icon rail on the end side with a footer under the content."],
  ["topOnly", "Shell: top bar only", "The links in the top bar and no sidebar."],
  ["sideOnly", "Shell: sidebar only", "A wide sidebar with the brand and no top bar."],
  ["collapsedEnd", "Shell: collapsed at the end", "A collapsed sidebar on the end side, no top bar, a footer across."],
];

/** full pages: an id, a title, a note and the blocks top to bottom (one of them holds the h1) */
const PAGES: Array<{ id: string; title: string; text: string; uses: BlockUse[] }> = [
  { id: "saas-landing", title: "SaaS landing", text: "Split hero, logos, features, a sticky list, figures, quotes, plans, questions and a closing call to action.", uses: [
    use("navbar", "inline"), use("hero", "saas", { level: 1 }), use("logos", "row"), use("features", "grid"), use("sticky", "end"), use("stats", "icons"),
    use("testimonials", "grid3"), use("pricing", "grid"), use("faq", "list"), use("cta", "card"), use("sitemap", "columns"),
  ] },
  { id: "company", title: "Company", text: "The page head, the culture, the story, the team, a mosaic of photos, the open roles and a call to action.", uses: [
    use("navbar", "inline"), use("pagehead", "center", { title: co("pages.companyTitle"), text: co("pages.companyLead"), cta: "" }), use("about", "split"), use("timeline", "split"),
    use("team", "cards4"), use("photos", "mosaic"), use("jobs", "grouped"), use("cta", "card"), use("sitemap", "columns"),
  ] },
  { id: "portfolio", title: "Portfolio", text: "A personal about section, selected projects, a masonry of photos, quotes and a call to action.", uses: [
    use("navbar", "inline"), use("aboutme", "facts", { level: 1 }), use("projects", "cards"), use("photos", "masonry"), use("testimonials", "grid3"), use("cta", "card"), use("sitemap", "columns"),
  ] },
  { id: "store-home", title: "Store home", text: "An offer bar, a hero with an offer card, category tiles, bestsellers, a rail of deals, the store promises and a closing offer.", uses: [
    use("announcement", "shop"), use("navbar", "search"), use("storehero", "overlay", { level: 1 }), use("categories", "tiles"),
    use("products", "grid4", { title: c("pages.bestsellers") }), use("products", "rail", { id: "deals", title: c("rail.title") }), use("usp", "cards"), use("cta", "shop"), use("sitemap", "columns"),
  ] },
  { id: "store-home-2", title: "Store home, picture hero", text: "Text over a faint picture, a strip of promises, the products, the delivery facts and the stores.", uses: [
    use("navbar", "inline"), use("storehero", "backdrop", { level: 1 }), use("usp", "strip"), use("products", "grid3"), use("delivery", "full"), use("locations", "map"), use("sitemap", "columns"),
  ] },
  { id: "store-catalog", title: "Catalog", text: "The page head, chips under a toolbar and a compact grid of products.", uses: [
    use("navbar", "search"), use("pagehead", "start", { title: c("pages.catalogTitle"), text: c("pages.catalogLead"), cta: "" }), use("categories", "toolbar"), use("products", "catalog"), use("usp", "bar"), use("sitemap", "columns"),
  ] },
  { id: "product-detail", title: "Product page", text: "The gallery and the buy box, the details and specs, reviews and a rail of related products.", uses: [
    use("navbar", "search"), use("product", "split"), use("productinfo", "split"), use("reviews", "grid"), use("products", "railCompact", { title: c("pages.related") }), use("sitemap", "columns"),
  ] },
  { id: "cart", title: "Cart", text: "The cart lines beside the summary with a promo code, then a rail of products.", uses: [
    use("navbar", "search"), use("pagehead", "start", { title: c("cartPage.title"), text: c("pages.cartLead"), cta: "" }), use("cartpage", "split", { title: c("cart.caption") }), use("products", "railCompact", { title: c("pages.related") }), use("sitemap", "columns"),
  ] },
  { id: "checkout", title: "Checkout", text: "The page head and the checkout steps beside a sticky order summary.", uses: [
    use("navbar", "search"), use("pagehead", "start", { title: c("checkout.title"), text: c("pages.checkoutLead"), cta: "" }), use("checkout", "cards", { title: "" }), use("sitemap", "compact"),
  ] },
  ...SHELL_PAGES.map(([variant, title, text]) => ({ id: `shell-${variant.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, title, text, uses: [use("dashshell", variant, { frame: "page", level: 1 })] })),
];

export const catalogTree: CatalogTree = {
  sections: SECTIONS.map((s) => ({ id: s.id, categories: s.categories.map((c) => ({ id: c.id, entries: c.entries })) })),
  pages: PAGES.map((p) => ({ id: p.id, uses: p.uses })),
};

/** the dictionary part of the catalog (ui.catalog) */
export const catalogTexts = {
  title: "Catalog",
  intro: "The blocks of the kit by section and category, with all their variants, and whole pages built from them. Pick a category to see its blocks.",
  back: "Back to the catalog",
  backPages: "All pages",
  navLabel: "Catalog",
  categoriesTab: "Categories",
  count: "Blocks: {0}, variants: {1}",
  pagesTitle: "Pages",
  pagesText: "Whole pages composed of catalog blocks, top to bottom, on the same data.",
  pageCount: "Blocks: {0}",
  sections: Object.fromEntries(SECTIONS.map((s) => [s.id, { title: s.title, text: s.text }])),
  categories: Object.fromEntries(SECTIONS.flatMap((s) => s.categories.map((c) => [dictKey(c.id), c.title]))),
  pages: Object.fromEntries(PAGES.map((p) => [dictKey(p.id), { title: p.title, text: p.text }])),
};

const portable = { svelte: true, react: true } as const;

/** the catalog screen: built from the tree above and the blocks; nothing is written by hand */
export const catalogComposed: ComposedSpec = {
  $schema: "../../schema/schemas/composed.schema.json",
  specVersion: 1,
  id: "screen.catalog",
  name: "CatalogScreen",
  kind: "composed",
  docs: "The catalog: the blocks of the kit by section and category (Marketing, Content, Promo, Support, Commerce, App and dashboard), one page per category with every variant of its blocks, and whole pages composed of blocks. Built from the catalog tree and the blocks.",
  routes: [],
  frame: { before: [], after: [] },
  areas: {},
  catalog: catalogTree,
  portable,
};

