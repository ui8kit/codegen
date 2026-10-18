// The other blocks: promo, content, account, dashboard, onboarding and support.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const annCase = (c: string) => ({ text: t(`cases.${c}.announcement.text`), cta: t(`cases.${c}.announcement.cta`) });
const announcement = define({
  key: "announcement", theme: "promo", group: "banner", name: "Announcement bar", docs: "A thin strip above the page with one sentence and a link.",
  organism: "AnnouncementBar", axes: ["tone", "layout", "dismiss", "badge", "position"],
  variants: [
    ["bar", "Primary strip"],
    ["badge", "With a tag: New", { badge: "show", tone: "muted" }],
    ["bottom", "Stays at the bottom edge", { position: "bottom", dismiss: "show", layout: "split" }],
    ["muted", "Muted strip", { tone: "muted" }],
    ["split", "Split, text left and link right", { layout: "split", tone: "muted" }],
    ["dismissible", "With a close button", { dismiss: "show" }],
    ["shop", "Shop: free shipping, muted", { tone: "muted", dismiss: "show" }, annCase("shop")],
    ["agency", "Agency: open slots, split", { layout: "split" }, annCase("agency")],
  ],
  sample: { label: t("promo.announcement.label"), text: t("promo.announcement.text"), cta: t("promo.announcement.cta"), ctaHref: "#/pricing", dismissLabel: t("promo.announcement.dismiss"), badgeLabel: t("promo.announcement.badge") },
});

const cookie = define({
  key: "cookie", theme: "promo", group: "banner", name: "Cookie notice", docs: "A consent notice with accept and decline buttons.",
  organism: "CookieBanner", axes: ["layout", "actions", "tone"],
  variants: [
    ["bar", "Bar"],
    ["card", "Card", { layout: "card" }],
    ["settings", "Bar with a settings button", { actions: "three" }],
    ["muted", "Muted card with settings", { layout: "card", actions: "three", tone: "muted" }],
  ],
  sample: { id: "cookie", title: t("promo.cookie.title"), text: t("promo.cookie.text"), accept: t("promo.cookie.accept"), decline: t("promo.cookie.decline"), settings: t("promo.cookie.settings") },
});

const newsletter = define({
  key: "newsletter", theme: "promo", group: "forms", name: "Newsletter sign-up", docs: "An email field and a button, inline, stacked or beside a picture.",
  organism: "NewsletterForm", axes: ["layout", "terms", "tone", "align"],
  variants: [
    ["inline", "Inline, centered"],
    ["stacked", "Stacked", { layout: "stacked" }],
    ["split", "Split with a picture", { layout: "split", align: "start" }],
    ["consent", "With a consent line", { terms: "show" }],
    ["muted", "Muted, consent", { tone: "muted", terms: "show", align: "start" }],
  ],
  sample: { id: "newsletter", title: t("promo.newsletter.title"), text: t("promo.newsletter.text"), label: t("promo.newsletter.label"), submit: t("promo.newsletter.submit"), consent: t("promo.newsletter.consent") },
});

const posts = define({
  key: "posts", theme: "content", group: "blog", name: "Blog posts", docs: "Posts as a grid, a list or a magazine.",
  organism: "PostGrid", axes: ["layout", "cols", "media", "meta", "filter.mode", "tone", "density"], data: [d.posts, d.topics],
  variants: [
    ["grid", "Grid, three columns"],
    ["filters", "Grid with topic filters", { "filter.mode": "topics" }, { filter: { topic: "Design" } }],
    ["twoUp", "Grid, two columns", { cols: "1-2" }],
    ["row4", "Grid, four columns in one row", { cols: "1-4" }],
    ["news4", "Four news cards, title on image, date strip", { cols: "1-4", meta: "news" }, { action: { label: t("content.posts.action"), href: "#/" } }],
    ["list", "List of horizontal cards", { layout: "list" }],
    ["magazine", "Magazine: first post wide", { layout: "magazine" }],
    ["textOnly", "Text only", { media: "none" }],
    ["digest", "Digest: short meta, compact, muted", { meta: "short", density: "compact", tone: "muted", media: "none" }],
  ],
  sample: {
    id: "posts", title: t("content.posts.title"), posts: ref("posts"), labels: t("content.labels"),
    filter: { topics: ref("topics"), label: t("vibe.posts.topics"), topic: "" },
    action: { label: t("content.posts.action"), href: "#/" },
  },
});

const postheader = define({
  key: "postheader", theme: "content", group: "blog", name: "Post header", docs: "Category, title, excerpt, author line and a wide cover.",
  organism: "PostHeader", axes: ["layout", "cover", "meta", "tone"], data: [d.posts],
  variants: [
    ["start", "Left aligned with a cover"],
    ["center", "Centered", { layout: "center" }],
    ["noCover", "Without a cover", { cover: "hide" }],
    ["minimal", "Minimal: short meta, muted", { cover: "hide", meta: "short", tone: "muted", layout: "center" }],
  ],
  sample: { id: "postheader", post: { op: "pick", args: [ref("posts"), "post-static-first"] }, labels: t("content.labels") },
});

const authCase = (m: string) => ({ title: t(`auth.${m}.title`), text: t(`auth.${m}.text`), submit: t(`auth.${m}.submit`), switchText: t(`auth.${m}.switchText`), switchLink: t(`auth.${m}.switchLink`) });
const auth = define({
  key: "auth", theme: "account", group: "auth", name: "Auth card", docs: "Sign in, sign up and reset password.",
  organism: "AuthCard", axes: ["mode", "layout", "social"], fit: "card",
  variants: [
    ["signin", "Sign in"],
    ["magic", "Magic link only", { mode: "magic" }, authCase("magic")],
    ["socialFirst", "Other sign-in options first", { social: "first" }],
    ["signup", "Sign up", { mode: "signup" }, authCase("signup")],
    ["reset", "Reset password", { mode: "reset" }, authCase("reset")],
    ["plain", "Sign in without a card", { layout: "plain" }],
    ["social", "Sign in with other options", { social: "show" }],
    ["signupSocial", "Sign up with other options, plain", { mode: "signup", social: "show", layout: "plain" }, authCase("signup")],
  ],
  sample: { id: "auth", ...authCase("signin"), switchHref: "#/", labels: t("auth.labels") },
});

const profile = define({
  key: "profile", theme: "account", group: "settings", name: "Profile form", docs: "Account settings: picture, name, email, bio and notifications.",
  organism: "ProfileForm", axes: ["layout", "avatar", "prefs", "tone"],
  variants: [
    ["stacked", "Stacked"],
    ["split", "Fields beside notifications", { layout: "split" }],
    ["minimal", "Fields only", { avatar: "hide", prefs: "hide" }],
    ["muted", "Muted split", { layout: "split", tone: "muted" }],
  ],
  sample: { id: "profile", title: t("account.profile.title"), text: t("account.profile.text"), labels: t("account.profile.labels") },
});

const metrics = define({
  key: "metrics", theme: "dashboard", group: "widgets", name: "Metric tiles", docs: "Key counters of a dashboard.",
  organism: "MetricRow", axes: ["cols", "item", "tone", "density"], data: [d.metrics],
  variants: [
    ["tiles", "Four tiles"],
    ["twoUp", "Two by two", { cols: "2" }],
    ["compact", "Compact figures", { item: "compact" }],
    ["muted", "Muted, compact", { tone: "muted", density: "compact", item: "compact", cols: "2" }],
  ],
  sample: { id: "metrics", title: t("dashboard.metrics.title"), metrics: ref("metrics"), empty: t("empty.metrics") },
});

const chart = define({
  key: "chart", theme: "dashboard", group: "widgets", name: "Chart panel", docs: "Orders per day as bars or meters.",
  organism: "ChartPanel", axes: ["chart", "size", "tone"], data: [d.series],
  variants: [
    ["bars", "Bars"],
    ["short", "Short bars", { size: "compact" }],
    ["meters", "Meters", { chart: "meters" }],
    ["muted", "Muted compact meters", { chart: "meters", size: "compact", tone: "muted" }],
  ],
  sample: { id: "chart", title: t("dashboard.chart.title"), text: t("dashboard.chart.text"), series: ref("series"), empty: t("empty.series"), summary: t("dashboard.chart.summary"), percent: t("dashboard.chart.percent") },
});

const activity = define({
  key: "activity", theme: "dashboard", group: "widgets", name: "Activity feed", docs: "Recent events as a timeline or a list.",
  organism: "ActivityFeed", axes: ["layout", "density", "tone"], data: [d.activity],
  variants: [
    ["timeline", "Timeline"],
    ["list", "List", { layout: "list" }],
    ["compact", "Compact list", { layout: "list", density: "compact" }],
    ["muted", "Muted timeline", { tone: "muted" }],
  ],
  sample: { id: "activity", title: t("dashboard.activity.title"), text: t("dashboard.activity.text"), events: ref("activity"), empty: t("empty.activity") },
});

const emptyCase = (c: string) => ({ title: t(`dashboard.empty.${c}.title`), text: t(`dashboard.empty.${c}.text`), cta: t(`dashboard.empty.${c}.cta`) });
const empty = define({
  key: "empty", theme: "dashboard", group: "states", name: "Empty state", docs: "A list with nothing in it, with an optional action.",
  organism: "EmptyPanel", axes: ["layout", "actions", "visual", "size"],
  variants: [
    ["illustrated", "With a picture and an action", { visual: "image" }, { ...emptyCase("tour") }],
    ["orders", "No orders yet", {}, { icon: "shopping-bag", ...emptyCase("orders") }],
    ["results", "Nothing found, plain", { layout: "plain" }, { icon: "search", ...emptyCase("results") }],
    ["inbox", "Inbox is empty, no action", { actions: "none" }, { icon: "inbox", ...emptyCase("inbox") }],
    ["compact", "Compact", { size: "compact" }, { icon: "inbox", ...emptyCase("inbox") }],
    ["plainNoAction", "Plain, compact, no action", { layout: "plain", actions: "none", size: "compact" }, { icon: "search", ...emptyCase("results") }],
  ],
  sample: { id: "empty", ...emptyCase("orders"), ctaHref: "#/" },
});

const checklist = define({
  key: "checklist", theme: "onboarding", group: "setup", name: "Setup checklist", docs: "Tasks to finish after sign-up, with progress.",
  organism: "Checklist", axes: ["layout", "progress", "marker", "detail", "tone"], data: [d.checklist],
  variants: [
    ["card", "Card with a progress bar"],
    ["expand", "Tasks that open", { detail: "expand" }],
    ["plain", "Plain", { layout: "plain" }],
    ["text", "Count as text", { progress: "text" }],
    ["none", "No progress", { progress: "none", layout: "plain" }],
    ["numbered", "Numbered", { marker: "number" }],
    ["muted", "Muted, numbered, count", { marker: "number", progress: "text", tone: "muted" }],
  ],
  sample: { id: "checklist", title: t("onboarding.checklist.title"), tasks: ref("checklist"), empty: t("empty.tasks"), progressLabel: t("onboarding.checklist.progress") },
});

const stepper = define({
  key: "stepper", theme: "onboarding", group: "setup", name: "Stepper", docs: "A multi-step form header with the current step.",
  organism: "Stepper", axes: ["layout", "marker", "summary"], data: [d.steps],
  variants: [
    ["horizontal", "Horizontal"],
    ["vertical", "Vertical", { layout: "vertical" }],
    ["icons", "Icon markers", { marker: "icon" }],
    ["bare", "Without the step text", { summary: "hide", layout: "vertical", marker: "icon" }],
  ],
  sample: { id: "stepper", title: t("onboarding.stepper.title"), steps: ref("steps"), current: 2, stepLabel: t("onboarding.stepper.stepLabel"), back: t("onboarding.stepper.back"), next: t("onboarding.stepper.next") },
});

const contact = define({
  key: "contact", theme: "support", group: "contact", name: "Contact form", docs: "A message form, alone or beside the ways to reach us.",
  organism: "ContactForm", axes: ["layout", "fields", "terms", "page", "tone"], data: [d.channels],
  variants: [
    ["single", "Single column, all fields"],
    ["page", "A page of its own: a short form", { page: "full", fields: "short" }],
    ["short", "Email and message only", { fields: "short" }],
    ["split", "Beside the ways to reach us", { layout: "split" }],
    ["consent", "With a consent line", { terms: "show" }],
    ["muted", "Muted split, short", { layout: "split", fields: "short", tone: "muted", terms: "show" }],
  ],
  sample: { id: "contact", title: t("support.contact.title"), text: t("support.contact.text"), labels: t("support.contact.labels"), details: ref("channels") },
});

const channels = define({
  key: "channels", theme: "support", group: "contact", name: "Support channels", docs: "Ways to get help: email, chat, docs.",
  organism: "SupportChannels", axes: ["layout", "cols", "action", "tone"], data: [d.channels],
  variants: [
    ["grid", "Cards in a row"],
    ["twoUp", "Two columns", { cols: "1-2" }],
    ["list", "List", { layout: "list" }],
    ["plain", "Muted, without links", { action: "none", tone: "muted" }],
  ],
  sample: { id: "channels", title: t("support.channels.title"), channels: ref("channels"), empty: t("empty.channels"), open: t("support.channels.open") },
});


const templates = define({
  key: "templates", theme: "marketing", group: "gallery", name: "Template gallery", docs: "Template gallery: filters, a browse-all button and an 8-card MediaFrame grid.",
  organism: "TemplateGrid", axes: ["cols", "tone", "density"], data: [d.templates, d.templateFilters],
  variants: [
    ["grid4", "Four columns, eight cards", { cols: "1-4", density: "default" }],
    ["grid3", "Three columns", { cols: "1-3" }],
    ["muted", "Muted, compact", { tone: "muted", density: "compact" }],
    ["roomy", "Roomy", { density: "roomy" }],
  ],
  facts: [
    { sel: '[data-testid="template-card"]', n: "@templates" },
    { sel: '[data-testid="template-filter"]', n: "@templateFilters" },
    { sel: '[data-testid="template-browse"]', n: 1 },
  ],
  sample: { id: "templates", title: t("vibe.templates.title"), templates: ref("templates"), filters: ref("templateFilters"), labels: t("vibe.templates"), browseHref: "#/", empty: t("empty.templates") },
});

export const moreBlocks = [announcement, cookie, newsletter, posts, postheader, auth, profile, metrics, chart, activity, empty, checklist, stepper, contact, channels, templates];
