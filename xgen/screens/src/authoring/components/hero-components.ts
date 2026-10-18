// The components the prompt hero is made of. Each one is small, takes plain props and reads
// block sizes from the default preset only. HeroPrompt (landing-hero.ts) arranges them; screens pass the texts.
import { and, cn, gt, len, nth, coalesce, cond, each, eachAt, eq, ref, text, undef, use, when, words } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { layoutOf } from "../presets";
import { tsOf } from "../props";
import { navBlockOf } from "./landmarks";
import { menuEntry } from "./nav";

const P = "pattern.";
const onBand = "text-background";

/** the head row inside the band: skip link, brand, menu, login and the call to action */
export const heroHead = spec(`${P}hero-head`, "HeroHead", "The head row of a hero band: skip link, brand, menu links (the current one carries aria-current), login and a call to action.", {
  frame: true,
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [
    { name: "brand", type: "string", docs: "brand word" },
    { name: "brandHref", type: "string", docs: "the address of the home page; none: the brand is text" },
    { name: "links", type: ts("NavLink[]"), docs: "menu links" },
    { name: "current", type: "string", default: "" },
    { name: "login", type: "string" },
    { name: "loginHref", type: "string", docs: "the address of the login page; none: a button" },
    { name: "cta", type: "string", docs: "call to action label" },
    { name: "href", type: "string" },
    { name: "skip", type: "string", docs: "skip link text" },
    { name: "navLabel", type: "string", docs: "accessible name of the menu" },
  ],
  view: (() => {
    const skipClass = "sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:inset-ring focus:inset-ring-border";
    // a menu entry: a link where it has an address, else its name (no "#/" stand-in)
    const link: ViewNode = when(ref("l.href"), [use("Link", {
      props: { Href: ref("l.href"), Variant: "default", AriaCurrent: cond(eq(ref("l.id"), ref("current")), "page", undef()), Class: `text-xs font-medium leading-5 ${onBand}` },
      attrs: { "data-testid": "nav-link" },
    }, text(ref("l.name")))], [use("Inline", { props: { Class: `text-xs font-medium leading-5 ${onBand}` }, attrs: { "data-testid": "nav-link" } }, text(ref("l.name")))]);
    return [use("Block", { props: { Tag: "header", Class: cn("flex w-full flex-wrap items-center justify-between pr-4", layoutOf("hero.head")) }, attrs: { "data-testid": "hero-head" } },
      when(ref("skip"), [use("LinkPlain", { props: { Href: "#main-content", Class: skipClass }, attrs: { "data-testid": "skip-link" } }, text(ref("skip")))]),
      menuEntry(ref("brandHref"), { cls: cn(layoutOf("text.small"), `font-medium leading-6 ${onBand}`), testid: "brand" }, text(ref("brand"))),
      when(and(ref("links"), gt(len(ref("links")), 0)), [navBlockOf(ref("navLabel"), undefined, "site-nav",
        use("Group", { props: { Gap: "8", Align: "center", Class: "flex-wrap" } }, each(ref("links"), "l", ref("l.id"), link)))]),
      use("Group", { props: { Gap: "2", Align: "center" } },
        when(ref("login"), [use("Button", { props: { Href: ref("loginHref"), Variant: "ghost", Size: "sm", Class: `${onBand} hover:bg-background/10` }, attrs: { "data-testid": "nav-login" } }, text(ref("login")))]),
        when(ref("cta"), [use("Button", { props: { Href: ref("href"), Variant: "secondary", Size: "sm" }, attrs: { "data-testid": "header-cta" } }, text(ref("cta")))])))];
  })(),
});

/** a composite badge: a small inner mark (NEW) beside a label (Meet Model V4.1) */
export const heroBadge = spec(`${P}hero-badge`, "HeroBadge", "A composite badge on a dark band: an optional small mark beside a label.", {
  props: [
    { name: "label", type: "string", required: true },
    { name: "mark", type: "string", docs: "small inner pill text (NEW)" },
  ],
  view: [use("Group", {
    props: { Gap: "2", Align: "center", Class: cn("h-8 justify-center rounded-full px-2 inset-ring inset-ring-background/30", layoutOf("hero.badge")) },
    attrs: { "data-testid": "section-badge" },
  },
    when(ref("mark"), [use("Badge", { props: { Variant: "secondary", Size: "sm" }, attrs: { "data-testid": "badge-mark" } }, text(ref("mark")))]),
    use("Text", { props: { Size: "xs", Weight: "bold", Class: `leading-5 ${onBand}` } }, text(ref("label"))))],
});

/** a display title whose words carry their own weights: the words come from the text, the weights from the preset */
export const weightedTitle = spec(`${P}weighted-title`, "WeightedTitle", "A display title, one span per word; word i takes weights[i] (from the preset). The words wrap like text.", {
  props: [
    { name: "id", type: "string", required: true, docs: "id of the heading (the band is labelled by it)" },
    { name: "title", type: "string", required: true, docs: "the words, separated by spaces" },
    { name: "weights", type: ts("readonly string[]"), docs: "a font-weight class per word" },
    { name: "level", type: ts("1 | 2"), default: 1 },
  ],
  view: [use("Title", {
    props: { As: ref("level"), Size: "5xl", Weight: "semibold", Class: cn("text-center tracking-tight text-background", layoutOf("hero.title")) },
    attrs: { id: ref("id") },
  }, // words are inline with a space after each, so the heading reads (and copies) as one sentence
  eachAt(words(ref("title")), "word", "i", ref("i"), use("Inline", { props: { Class: nth(ref("weights"), ref("i")) } }, text(ref("word"))), text(" ")))],
});

/** the prompt box: attachments, the prompt line, plus, model and send */
export const promptComposer = spec(`${P}prompt-composer`, "PromptComposer", "A prompt box on a dark band: attachment chips, the prompt line, a plus button, the model pill and a send button. Static links only; a host adds behavior.", {
  props: [
    { name: "label", type: "string", docs: "the prompt line (To Build Site)" },
    { name: "attachLabel", type: "string", docs: "attachment chip label" },
    { name: "modelLabel", type: "string", docs: "model pill label" },
    { name: "send", type: "string", docs: "accessible name of the send button" },
    { name: "href", type: "string" },
  ],
  view: (() => {
    // every control on the band is a Button: ghost on the band, secondary for the send button
    const band = `bg-background/10 ${onBand} hover:bg-background/20`;
    const chip = (icon: string): ViewNode => use("Button", {
      props: { Variant: "ghost", Size: "sm", Class: cn(`gap-2 overflow-hidden ${band}`, layoutOf("hero.attach")) },
      attrs: { "data-testid": "composer-attach" },
    }, use("LucideIcon", { props: { Name: icon, Size: 16 } }), text(ref("attachLabel")));
    return [use("Box", {
      props: { Class: cn("mx-auto flex w-full flex-col gap-4 bg-background/10 p-6 inset-ring inset-ring-background/30", layoutOf("hero.composer")) },
      attrs: { "data-testid": "email-form" },
    },
      when(ref("attachLabel"), [use("Group", { props: { Gap: "2", Align: "center" }, attrs: { "data-testid": "composer-attachments" } }, chip("file-text"), chip("paperclip"))]),
      use("Text", { props: { Size: "xs", Weight: "semibold", Class: cn("flex w-full items-center leading-5 text-background/80", layoutOf("hero.promptLine")) }, attrs: { "data-testid": "field" } }, text(ref("label"))),
      use("Group", { props: { Gap: "2", Align: "center", Justify: "between", Class: "h-8 w-full" }, attrs: { "data-testid": "composer-tools" } },
        use("Group", { props: { Gap: "2", Align: "center" } },
          use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", Class: band }, attrs: { "data-testid": "composer-plus", "aria-label": coalesce(ref("attachLabel"), "Attach") } },
            use("LucideIcon", { props: { Name: "plus", Size: 16 } })),
          when(ref("modelLabel"), [use("Button", { props: { Variant: "ghost", Size: "sm", Class: cn(`gap-2 ${band}`, layoutOf("hero.model")) }, attrs: { "data-testid": "composer-model" } },
            use("LucideIcon", { props: { Name: "sparkles", Size: 16 } }), text(ref("modelLabel")), use("LucideIcon", { props: { Name: "chevron-down", Size: 16 } }))])),
        use("Button", { props: { Href: ref("href"), Variant: "secondary", Size: "sm", Layout: "icon" }, attrs: { "data-testid": "submit", "aria-label": coalesce(ref("send"), "Send") } },
          use("LucideIcon", { props: { Name: "arrow-up", Size: 16 } }))))];
  })(),
});

const Topic = fields(["id", "string"], ["name", "string"], ["icon", "string"], ["href", "string", true]);
/** topic pills under a hero: on a dark band with icons, or plain outlined */
export const topicChips = spec(`${P}topic-chips`, "TopicChips", "A centered row of topic pills: links where a topic has an address, else buttons. tone inverse: on a dark band with an icon per topic; default: outlined.", {
  records: { Topic },
  props: [
    { name: "topics", type: ts("Topic[]"), required: true },
    { name: "tone", type: tsOf("default", "inverse"), default: "default" },
  ],
  view: (() => {
    const inverse = use("Button", { props: { Href: ref("topic.href"), Variant: "ghost", Size: "sm", Class: `gap-2 ${onBand} inset-ring-background/30 hover:bg-background/10` }, attrs: { "data-testid": "hero-topic" } },
      when(ref("topic.icon"), [use("LucideIcon", { props: { Name: ref("topic.icon"), Size: 16 } })]),
      text(ref("topic.name")));
    const plain = use("Button", { props: { Href: ref("topic.href"), Variant: "outline", Size: "sm" }, attrs: { "data-testid": "hero-topic" } }, text(ref("topic.name")));
    return [use("Group", { props: { Gap: "2", Align: "center", Justify: "center", Class: "flex-wrap" }, attrs: { "data-testid": "hero-topics" } },
      each(ref("topics"), "topic", ref("topic.id"), when(eq(ref("tone"), "inverse"), [inverse], [plain])))];
  })(),
});

export const heroComponents: OrganismSpec[] = [heroHead, heroBadge, weightedTitle, promptComposer, topicChips];
// the weights of the title words, read by HeroPrompt
export const titleWeights = layoutOf("hero.titleWeights");
