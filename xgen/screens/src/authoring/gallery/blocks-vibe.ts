// The blocks of the second catalog round: navigation and footers, feature showcases, pricing tools, sign-in pages, app shells, guidance and states.
// Each is an organism plus axes and named variants; `facts` tell the e2e what every variant must show (a selector and how many).
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const v = (k: string) => t(`vibe.${k}`);
const sec = (k: string) => ({ id: k, title: v(`${k}.title`) });
const MUTED_COMPACT = { tone: "muted", density: "compact" };

const navbar = define({
  key: "navbar", theme: "marketing", group: "navigation", name: "Navigation bar", docs: "A top bar in four shapes: inline, split around the brand, with a search field, and transparent over a picture.",
  organism: "NavBar", axes: ["layout", "over", "actions.mode", "tone"], data: [d.navlinks], events: { theme: "toggleTheme" },
  variants: [["inline", "Brand, links and a button"], ["split", "Brand in the middle", { layout: "split" }], ["search", "With a search field", { layout: "search" }], ["media", "Transparent over a picture", { over: "media" }], ["plain", "Without a button", { "actions.mode": "none" }], ["inverse", "On a dark hero band with Log In", { tone: "inverse" }, { actions: { login: t("site.header.login"), loginHref: "#/login" } }]],
  facts: [
    { sel: '[data-testid="nav-link"]', n: "@navlinks" },
    { sel: '[data-testid="header-cta"]', n: 1, when: { "actions.mode": "cta" } },
    { sel: '[data-testid="header-cta"]', n: 0, when: { "actions.mode": "none" } },
    { sel: '[data-testid="palette"]', n: 1, when: { layout: "search" } },
    { sel: '[data-testid="palette"]', n: 0, when: { layout: ["inline", "split"] } },
    { sel: '[data-testid="over"]', n: 1, when: { over: "media" } },
    { sel: '[data-testid="over"]', n: 0, when: { over: "none" } },
  ],
  sample: {
    label: v("nav.label"), brand: t("site.header.brand"), links: ref("navlinks"), current: "link-product",
    actions: { cta: t("site.header.cta"), href: "#/", login: t("site.header.login"), loginHref: "#/login" },
    search: { label: v("nav.search"), shortcut: v("nav.shortcut") },
  },
});

const megamenu = define({
  key: "megamenu", theme: "marketing", group: "navigation", name: "Mega menu", docs: "A top bar whose first item opens a wide panel of link groups, with an optional promo card.",
  organism: "MegaMenu", axes: ["panel", "cols", "promo"], data: [d.navlinks, d.megagroups],
  variants: [["open", "Panel open, three columns"], ["closed", "Panel closed", { panel: "closed" }], ["twoCols", "Two columns", { cols: "2" }], ["promo", "With a promo card", { promo: "card" }]],
  facts: [
    { sel: '[data-testid="mega-trigger"]', n: 1 },
    { sel: '[data-testid="mega-panel"]', n: 1, when: { panel: "open" } },
    { sel: '[data-testid="mega-panel"]', n: 0, when: { panel: "closed" } },
    { sel: '[data-testid="mega-panel"] [data-testid="item"]', n: "@megagroups", when: { panel: "open" } },
    { sel: '[data-testid="mega-panel"] [data-testid="item"]', cols: 3, when: { panel: "open", cols: "3" } },
    { sel: '[data-testid="mega-panel"] [data-testid="item"]', cols: 2, when: { panel: "open", cols: "2" } },
    { sel: '[data-testid="promo"]', n: 1, when: { panel: "open", promo: "card" } },
  ],
  sample: { label: v("nav.label"), brand: t("site.header.brand"), trigger: v("mega.trigger"), links: ref("navlinks"), groups: ref("megagroups"), promoTitle: v("mega.promoTitle"), promoText: v("mega.promoText") },
});

const sitemap = define({
  key: "sitemap", theme: "marketing", group: "navigation", name: "Sitemap footer", docs: "A footer with the brand, groups of links and the copyright; a single row, a sign-up first or a status pill.",
  organism: "SitemapFooter", axes: ["layout", "signup.mode", "status.mode", "density"], data: [d.sitemap],
  variants: [["columns", "One column per group"], ["card", "Groups in one rounded card", { layout: "card" }], ["row", "Single row", { layout: "row" }], ["newsletter", "Sign-up first", { "signup.mode": "first" }], ["status", "With a status pill", { "status.mode": "show" }], ["compact", "Compact", { density: "compact" }]],
  facts: [
    { sel: '[data-testid="group"]', n: "@sitemap" },
    { sel: '[data-testid="group"]', cols: "@sitemap", when: { layout: "columns" } },
    { sel: '[data-testid="signup"]', n: 1, when: { "signup.mode": "first" } },
    { sel: '[data-testid="signup"]', n: 0, when: { "signup.mode": "none" } },
    { sel: '[data-slot="pill"]', n: 1, when: { "status.mode": "show" } },
  ],
  sample: { id: "sitemap", label: v("sitemap.label"), brand: t("site.header.brand"), tagline: v("sitemap.tagline"), copyright: v("sitemap.copyright"), groups: ref("sitemap"),
    signup: { title: v("sitemap.signupTitle"), label: v("sitemap.signupLabel"), submit: v("sitemap.signupSubmit") }, status: { label: v("sitemap.status") } },
});

const bento = define({
  key: "bento", theme: "marketing", group: "features", name: "Bento grid", docs: "Tiles of different sizes in one grid; the large tiles hold the main features.",
  organism: "BentoGrid", axes: ["layout", "media", "tone", "density"], data: [d.bento],
  variants: [["bento", "Mixed sizes"], ["even", "Even tiles", { layout: "even" }], ["images", "With pictures", { media: "image" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: "@bento" }, { sel: '[data-slot="media-frame"]', n: 1, when: { media: "image" } }, { sel: '[data-slot="media-frame"]', n: 0, when: { media: "none" } }],
  sample: { ...sec("bento"), tiles: ref("bento"), empty: t("empty.tiles") },
});

const featuretabs = define({
  key: "featuretabs", theme: "marketing", group: "features", name: "Feature tabs", docs: "Features as tabs; the chosen one fills the panel beside or below the tab list.",
  organism: "FeatureTabs", axes: ["panel", "tone", "density"], data: [d.features],
  variants: [["split", "Panel beside the tabs"], ["stack", "Panel below the tabs", { panel: "stack" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[role="tab"]', n: "@features" }, { sel: '[role="tabpanel"]', n: 1 }],
  sample: { ...sec("tabs"), features: ref("features"), empty: t("empty.features"), tabsLabel: v("tabs.label"), active: "feature-clear" },
});

const accordion = define({
  key: "accordion", theme: "marketing", group: "features", name: "Feature accordion", docs: "Features as a list of disclosures, the first one open, with an optional picture.",
  organism: "FeatureAccordion", axes: ["expand", "media", "tone", "density"], data: [d.features],
  variants: [["first", "First open"], ["closed", "All closed", { expand: "none" }], ["media", "With a picture", { media: "image" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: "details", n: "@features" }, { sel: "details[open]", n: 1, when: { expand: "first" } }, { sel: "details[open]", n: 0, when: { expand: "none" } }, { sel: '[data-slot="media-frame"]', n: 1, when: { media: "image" } }, { sel: '[data-slot="media-frame"]', n: 0, when: { media: "none" } }],
  sample: { ...sec("accordion"), features: ref("features"), empty: t("empty.features") },
});

const sticky = define({
  key: "sticky", theme: "marketing", group: "features", name: "Sticky feature list", docs: "A picture that stays in view beside a list of features. Following the section being read is a port contract (ScrollSpy).",
  organism: "FeatureSticky", axes: ["mediaSide", "item", "tone", "density"], data: [d.features],
  variants: [["end", "Picture at the end"], ["start", "Picture at the start", { mediaSide: "start" }], ["card", "Features as cards", { item: "card" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: "@features" }, { sel: '[data-slot="media-frame"]', n: 1 }],
  sample: { ...sec("sticky"), features: ref("features"), empty: t("empty.features"), active: "feature-clear" },
});

const iconwall = define({
  key: "iconwall", theme: "marketing", group: "features", name: "Icon wall", docs: "Many small features as icons with a name: tiles or chips in three to six columns.",
  organism: "IconWall", axes: ["cols", "item", "tone", "density"], data: [d.features],
  variants: [["tiles4", "Tiles, four columns"], ["tiles3", "Tiles, three columns", { cols: "3" }], ["chips6", "Chips, six columns", { cols: "6", item: "chip" }], ["chips4", "Chips, four columns", { item: "chip" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: "@features" }, { sel: '[data-testid="item"]', cols: "$cols", when: { item: "tile" } }],
  sample: { ...sec("wall"), features: ref("features"), empty: t("empty.features") },
});

const beforeafter = define({
  key: "beforeafter", theme: "marketing", group: "features", name: "Before and after", docs: "Two sides of the same points: how it was and how it is, as two cards or as rows.",
  organism: "BeforeAfter", axes: ["layout", "icons", "tone", "density"], data: [d.beforeafter],
  variants: [["cards", "Two cards"], ["rows", "One row per point", { layout: "rows" }], ["plain", "Without icons", { icons: "hide" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="side"]', n: 2, when: { layout: "cards" } }, { sel: '[data-testid="item"]', n: "@beforeafter*2", when: { layout: "cards" } }, { sel: '[data-testid="item"]', n: "@beforeafter", when: { layout: "rows" } }, { sel: "svg", n: 0, when: { icons: "hide" } }],
  sample: { ...sec("beforeafter"), points: ref("beforeafter"), empty: t("empty.points"), labels: v("beforeafter.labels") },
});

const proof = define({
  key: "proof", theme: "marketing", group: "proof", name: "Logos and stats", docs: "A bar of customer logos and a row of key figures together.",
  organism: "ProofBand", axes: ["layout", "logoStyle", "tone", "density"], data: [d.logos, d.stats],
  variants: [["above", "Logos above the figures"], ["beside", "Logos beside the figures", { layout: "beside" }], ["icons", "Icons only", { logoStyle: "icon" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="logo"]', n: "@logos" }, { sel: '[data-testid="stat"]', n: "@stats" }],
  sample: { ...sec("proof"), logos: ref("logos"), empty: t("empty.logos"), stats: ref("stats") },
});

const videos = define({
  key: "videos", theme: "marketing", group: "proof", name: "Video testimonials", docs: "Customer videos as thumbnails with a play button. Playing is a port contract (VideoEmbed).",
  organism: "VideoGrid", axes: ["cols", "caption", "tone", "density"], data: [d.testimonials],
  variants: [["grid3", "Three columns"], ["grid2", "Two columns", { cols: "1-2" }], ["overlay", "Caption over the picture", { caption: "overlay" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: "@testimonials" }, { sel: '[data-testid="item"]', cols: "$cols" }, { sel: '[data-testid="play"]', n: "@testimonials" }],
  sample: { ...sec("videos"), quotes: ref("testimonials"), empty: t("empty.quotes"), playLabel: v("videos.play"), byLine: t("testimonials.byLine") },
});

const compare = define({
  key: "compare", theme: "marketing", group: "pricing", name: "Comparison table", docs: "Plans, or a product and its rivals, in columns, and the features in rows; yes and no as marks.",
  organism: "ComparisonTable", axes: ["highlight", "tone", "density"], data: [d.compare, d.rivals],
  variants: [["plans", "Plans"], ["highlight", "Middle column stands out", { highlight: "middle" }], ["rivals", "Us and the rivals", { highlight: "middle", tone: "muted" }, { rows: ref("rivals"), title: v("rivals.title"), labels: v("rivals.labels") }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: 5 }, { sel: "th[scope=col]", n: 4 }, { sel: '[data-highlight="true"]', n: 1, when: { highlight: "middle" } }, { sel: '[data-highlight="true"]', n: 0, when: { highlight: "none" } }],
  sample: { ...sec("compare"), rows: ref("compare"), empty: t("empty.rows"), labels: v("compare.labels") },
});

const usage = define({
  key: "usage", theme: "marketing", group: "pricing", name: "Usage calculator", docs: "A slider for how much is used and the price it gives. The estimate follows the slider; the page keeps the value.",
  organism: "UsageCalculator", axes: ["layout", "ends", "tone"],
  variants: [["card", "Card"], ["plain", "Plain", { layout: "plain" }], ["noEnds", "Without the end labels", { ends: "hide" }], ["muted", "Muted", { tone: "muted" }]],
  facts: [{ sel: 'input[type="range"]', n: 1 }, { sel: '[data-testid="estimate"]', n: 1 }],
  sample: {
    ...sec("usage"), text: v("usage.text"), usage: 5000,
    slider: { min: 100, max: 10000, label: v("usage.slider"), unit: v("usage.unit") },
    price: { rate: 1, currency: v("usage.currency"), label: v("usage.estimate") },
    cta: v("usage.cta"), href: "#/",
  },
});

const credits = define({
  key: "credits", theme: "marketing", group: "pricing", name: "Credit packs", docs: "One-off packs of credits with a price: tiles in two or four columns, or rows.",
  organism: "CreditPacks", axes: ["cols", "item", "tone", "density"], data: [d.credits],
  variants: [["tiles4", "Tiles, four columns"], ["tiles2", "Tiles, two columns", { cols: "2" }], ["rows", "Rows", { item: "row" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="item"]', n: "@credits" }, { sel: '[data-testid="buy"]', n: "@credits" }],
  sample: { ...sec("credits"), packs: ref("credits"), empty: t("empty.packs"), badges: v("credits.badges"), buy: v("credits.buy") },
});

const pagehead = define({
  key: "pagehead", theme: "marketing", group: "page", name: "Page heading", docs: "The head of an inner page: the heading, one sentence and an optional action.",
  organism: "PageIntro", axes: ["align", "tone", "density"],
  variants: [["start", "Left aligned"], ["center", "Centered", { align: "center" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="section"]', n: 1 }],
  sample: { id: "pagehead", title: v("pagehead.title"), text: v("pagehead.text"), cta: v("pagehead.cta"), href: "#/" },
});

const authCase = (m: string) => ({ title: t(`auth.${m}.title`), text: t(`auth.${m}.text`), submit: t(`auth.${m}.submit`), switchTo: { text: t(`auth.${m}.switchText`), link: t(`auth.${m}.switchLink`) } });
const authpage = define({
  key: "authpage", theme: "account", group: "auth", name: "Sign-in page", docs: "A whole sign-in page: the card beside a picture panel, on a tinted page, or alone; with any mode of the card.",
  organism: "AuthLayout", axes: ["layout", "side", "mode", "social"],
  variants: [
    ["split", "Card beside a picture"], ["splitStart", "Picture at the start", { side: "start" }], ["centered", "Card on a tinted page", { layout: "centered" }], ["minimal", "Card alone", { layout: "minimal" }],
    ["signup", "Sign up", { mode: "signup" }, authCase("signup")], ["reset", "Reset password", { mode: "reset", layout: "centered" }, authCase("reset")],
    ["magic", "Magic link only", { mode: "magic", layout: "minimal" }, authCase("magic")], ["social", "With other sign-in options", { social: "show" }], ["socialFirst", "Other options first", { social: "first", layout: "centered" }],
  ],
  facts: [
    { sel: '[data-testid="auth-layout"]', n: 1 }, { sel: '[data-testid="auth-card"]', n: 1 }, { sel: '[data-testid="visual"]', n: 1, when: { layout: "split" } }, { sel: '[data-testid="visual"]', n: 0, when: { layout: ["centered", "minimal"] } },
    { sel: '[data-testid="social"]', n: 1, when: { social: ["show", "first"], mode: ["signin", "signup"] } }, { sel: '[data-testid="social"]', n: 0, when: { social: "none" } },
    { sel: '[data-testid="field"]', n: 2, when: { mode: "signin" } }, { sel: '[data-testid="field"]', n: 3, when: { mode: "signup" } }, { sel: '[data-testid="field"]', n: 1, when: { mode: ["reset", "magic"] } },
  ],
  sample: {
    id: "authpage", ...authCase("signin"), labels: t("auth.labels"),
    switchTo: { text: t("auth.signin.switchText"), link: t("auth.signin.switchLink"), href: "#/" },
    visual: { title: v("authpage.visualTitle"), text: v("authpage.visualText") },
  },
});

const wizard = define({
  key: "wizard", theme: "account", group: "auth", name: "Sign-up wizard", docs: "A sign-up in steps with a progress bar or a list of steps; back and next move between them.",
  organism: "SignupWizard", axes: ["progress", "layout"], data: [d.wizard],
  variants: [["bar", "Progress bar"], ["list", "List of steps", { progress: "list" }], ["plain", "Without a card", { layout: "plain" }], ["second", "Second step, list of steps, no card", { progress: "list", layout: "plain" }, { current: 2 }]],
  facts: [{ sel: '[data-testid="wizard"]', n: 1 }, { sel: '[data-testid="step"]', n: 1 }, { sel: '[data-testid="step-item"]', n: "@wizard", when: { progress: "list" } }, { sel: "progress, [role=progressbar]", n: 1, when: { progress: "bar" } }, { sel: '[data-testid="field"]', n: 2 }],
  sample: { id: "wizard", title: v("wizard.title"), steps: ref("wizard"), labels: v("wizard.labels"), current: 1 },
});

/** the chart and activity panels shared by the app shell and the dashboard overview */
const overviewChart = { title: t("dashboard.chart.title"), text: t("dashboard.chart.text"), summary: t("dashboard.chart.summary"), series: ref("series") };
const overviewActivity = { title: t("dashboard.activity.title"), text: t("dashboard.activity.text"), events: ref("activity") };

const shell = define({
  key: "shell", theme: "dashboard", group: "layout", name: "App shell", docs: "The frame of a signed-in app with a first screen: a sidebar, a top bar, or three panes.",
  organism: "AppShell", axes: ["layout", "density"], data: [d.sidenav, d.metrics, d.series, d.activity],
  variants: [["sidebar", "Sidebar and content"], ["top", "Top bar and content", { layout: "top" }], ["panes", "Three panes", { layout: "panes" }], ["dense", "Sidebar, compact", { density: "compact" }]],
  facts: [{ sel: '[data-testid="app-shell"]', n: 1 }, { sel: '[data-testid="sidebar"]', n: 1, when: { layout: ["sidebar", "panes"] } }, { sel: '[data-testid="sidebar"]', n: 0, when: { layout: "top" } }, { sel: '[data-testid="nav-bar"]', n: 1, when: { layout: "top" } }, { sel: '[data-testid="app-main"] [data-testid="item"]', n: "@metrics" }, { sel: '[data-slot="bar-chart"]', n: 1 }],
  sample: {
    ...sec("shell"),
    nav: { label: v("sidebar.label"), brand: t("site.header.brand"), links: ref("sidenav"), current: "item-overview" },
    user: { name: v("sidebar.userName"), email: v("sidebar.userEmail") },
    search: { label: v("nav.search"), shortcut: v("nav.shortcut") },
    metrics: ref("metrics"), chart: overviewChart, activity: overviewActivity,
  },
});

const overview = define({
  key: "overview", theme: "dashboard", group: "widgets", name: "Dashboard overview", docs: "Counters, a chart and recent activity in one section.",
  organism: "DashboardOverview", axes: ["layout", "cols", "tone", "density"], data: [d.metrics, d.series, d.activity],
  variants: [["split", "Chart beside the activity"], ["stacked", "Chart above the activity", { layout: "stacked" }], ["twoCols", "Two counters per row", { cols: "2" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="items"] > [data-testid="item"]', n: "@metrics" }, { sel: '[data-slot="bar-chart"]', n: 1 }, { sel: '[data-slot="timeline"]', n: 1 }, { sel: '[data-testid="panels"] > section', cols: 2, when: { layout: "split" } }, { sel: '[data-testid="panels"] > section', cols: 1, when: { layout: "stacked" } }],
  sample: { ...sec("overview"), metrics: ref("metrics"), chart: overviewChart, activity: overviewActivity },
});

const kanban = define({
  key: "kanban", theme: "dashboard", group: "widgets", name: "Kanban board", docs: "Work items in lanes with a count; cards with a tag and a person. Moving cards is a port contract (SortableList).",
  organism: "KanbanBoard", axes: ["card", "cols", "tone", "density"], data: [d.lanes, d.cards],
  variants: [["detail", "Cards with a tag and a person"], ["simple", "Titles only", { card: "simple" }], ["twoCols", "Two lanes per row", { cols: "2" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="lane"]', n: "@lanes" }, { sel: '[data-testid="lane"] [data-testid="item"]', n: "@cards" }, { sel: '[data-slot="pill"]', n: "@cards", when: { card: "detail" } }, { sel: '[data-slot="pill"]', n: 0, when: { card: "simple" } }],
  sample: { ...sec("kanban"), lanes: ref("lanes"), empty: t("empty.lanes"), cards: ref("cards"), countLabel: v("kanban.count") },
});

const sidenav = define({
  key: "sidenav", theme: "dashboard", group: "navigation", name: "Sidebar navigation", docs: "A vertical navigation with the brand on top and the user at the bottom: full, or icons only.",
  organism: "SidebarNav", axes: ["width", "user", "density"], data: [d.sidenav],
  variants: [["full", "Icons and names"], ["compact", "Icons only", { width: "compact" }], ["noUser", "Without the user", { user: "hide" }], ["dense", "Dense rows", { density: "compact" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@sidenav" }, { sel: '[data-testid="user"]', n: 1, when: { user: "show" } }, { sel: '[data-testid="user"]', n: 0, when: { user: "hide" } }, { sel: '[aria-current="page"]', n: 1 }],
  sample: { label: v("sidebar.label"), brand: t("site.header.brand"), links: ref("sidenav"), current: "item-orders", userName: v("sidebar.userName"), userEmail: v("sidebar.userEmail") },
});

const bottomnav = define({
  key: "bottomnav", theme: "dashboard", group: "navigation", name: "Bottom tab bar", docs: "An app-style tab bar for a phone: an icon over a name, the current tab marked.",
  organism: "BottomNav", axes: ["labels", "position", "tone"], data: [d.tabs],
  variants: [["labels", "Icons with names"], ["icons", "Icons only", { labels: "hide" }], ["sticky", "Stays at the bottom", { position: "sticky" }], ["muted", "Muted", { tone: "muted" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@tabs" }, { sel: '[aria-current="page"]', n: 1 }],
  sample: { label: v("bottom.label"), tabs: ref("tabs"), current: "tab-explore" },
});

const skeleton = define({
  key: "skeleton", theme: "dashboard", group: "states", name: "Loading state", docs: "Grey blocks in the shape of what is coming: cards, a list or an article.",
  organism: "SkeletonLayout", axes: ["shape", "tone"], data: [d.placeholders],
  variants: [["cards", "Cards"], ["list", "List", { shape: "list" }], ["article", "Article", { shape: "article" }], ["muted", "Muted cards", { tone: "muted" }]],
  facts: [{ sel: '[role="status"]', n: 1 }, { sel: '[data-testid="item"]', n: "@placeholders", when: { shape: ["cards", "list"] } }, { sel: '[data-testid="item"]', n: "@placeholders", when: { shape: "article" } }],
  sample: { ...sec("skeleton"), label: v("skeleton.label"), lines: ref("placeholders") },
});

const tour = define({
  key: "tour", theme: "onboarding", group: "guidance", name: "Tour callout", docs: "One stop of a product tour: the explained element and a callout with the step, a sentence and buttons. Placing it on the real element is a port contract.",
  organism: "TourCallout", axes: ["placement", "tone", "density"],
  variants: [["below", "Callout below"], ["above", "Callout above", { placement: "above" }], ["end", "Callout beside", { placement: "end" }], ["muted", "Muted, compact", MUTED_COMPACT]],
  facts: [{ sel: '[data-testid="tour-target"]', n: 1 }, { sel: '[data-testid="tour-callout"]', n: 1 }, { sel: '[data-testid="tour"]', n: 1 }],
  sample: { ...sec("tour"), text: v("tour.text"), target: v("tour.target"), position: v("tour.position"), skip: v("tour.skip"), next: v("tour.next") },
});

const videomodal = define({
  key: "videomodal", theme: "onboarding", group: "guidance", name: "Video walkthrough", docs: "A dialog with a walkthrough video and an optional list of chapters. Opening and playing are port contracts.",
  organism: "VideoModal", axes: ["size", "outline", "tone"], data: [d.chapters],
  variants: [["default", "Standard size"], ["wide", "Wide", { size: "wide" }], ["chapters", "With chapters", { outline: "chapters" }], ["muted", "Muted", { tone: "muted" }]],
  facts: [{ sel: '[role="dialog"]', n: 1 }, { sel: '[data-testid="play"]', n: 1 }, { sel: '[data-testid="modal-close"]', n: 1 }, { sel: '[data-testid="chapters"] [data-testid="item"]', n: "@chapters", when: { outline: "chapters" } }, { sel: '[data-testid="chapters"]', n: 0, when: { outline: "none" } }],
  sample: { ...sec("modal"), text: v("modal.text"), close: v("modal.close"), play: v("modal.play"), chaptersTitle: v("modal.chapters"), chapters: ref("chapters") },
});

const errorpage = define({
  key: "errorpage", theme: "support", group: "states", name: "Error page", docs: "A page for something that went wrong, such as a missing page: a code, a heading, a sentence and the way back.",
  organism: "ErrorPage", axes: ["layout", "code", "actions.mode", "tone"],
  variants: [["centered", "Centered"], ["split", "Split with a picture", { layout: "split" }], ["noCode", "Without the code", { code: "hide" }], ["two", "Two actions", { "actions.mode": "two" }], ["muted", "Muted", { tone: "muted" }]],
  facts: [{ sel: '[data-testid="error-code"]', n: 1, when: { code: "show" } }, { sel: '[data-testid="error-code"]', n: 0, when: { code: "hide" } }, { sel: '[data-testid="action-primary"]', n: 1 }, { sel: '[data-testid="action-secondary"]', n: 1, when: { "actions.mode": "two" } }, { sel: '[data-testid="action-secondary"]', n: 0, when: { "actions.mode": "one" } }, { sel: '[data-slot="media-frame"]', n: 1, when: { layout: "split" } }, { sel: '[data-slot="media-frame"]', n: 0, when: { layout: "centered" } }],
  sample: { id: "errorpage", title: v("error.title"), text: v("error.text"), status: v("error.status"),
    actions: { cta: v("error.cta"), href: "#/", secondary: v("error.secondary"), secondaryHref: "#/" } },
});

const article = define({
  key: "article", theme: "content", group: "blog", name: "Article", docs: "A long read in one reading column, or beside a table of contents that links to the sections.",
  organism: "ArticleBody", axes: ["layout", "quotes", "tone"], data: [d.article],
  variants: [["column", "Reading column"], ["toc", "With a table of contents", { layout: "toc" }], ["plain", "Without pull quotes", { quotes: "hide" }], ["muted", "Muted", { tone: "muted" }]],
  facts: [{ sel: '[data-testid="article"] > [data-testid="item"]', n: "@article" }, { sel: '[data-testid="toc-link"]', n: "@article", when: { layout: "toc" } }, { sel: '[data-testid="toc"]', n: 0, when: { layout: "column" } }, { sel: '[data-testid="quote"]', n: 0, when: { quotes: "hide" } }, { sel: '[data-testid="quote"]', n: 1, when: { quotes: "show" } }],
  sample: { ...sec("article"), sections: ref("article"), empty: t("empty.sections"), tocTitle: v("article.toc") },
});

export const vibeBlocks = [navbar, megamenu, sitemap, bento, featuretabs, accordion, sticky, iconwall, beforeafter, proof, videos, compare, usage, credits, pagehead, authpage, wizard, shell, overview, kanban, sidenav, bottomnav, skeleton, tour, videomodal, errorpage, article];
