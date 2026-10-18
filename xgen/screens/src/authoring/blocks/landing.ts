// The landing-page organisms: hero, closing call to action, pricing tiers, FAQ. Each is a SectionFrame with axes; the blocks name the variants.
import { call, cn, coalesce, cond, each, eq, ne, or, ref, text, tpl, undef, use, when, organism, match, where, len } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, groupFields, rec, spec, ts } from "../kit";
import { frame, wide } from "../components/frames";
import { density, id, mediaOf, title, tone, tsOf, cols } from "../props";
import { fid, kids } from "../forms";
import { muted, fitCols } from "../ux";
import { heroClassic, heroPrompt } from "./landing-hero";
import { heroComponents } from "../components/hero-components";
import { layoutOf } from "../presets";
import { ctaActions, quoteProof } from "../components/cta";

const O = "organism.";


const ctaBand = spec(`${O}cta-band`, "CtaBand", "A closing call to action: a heading, one sentence and one or two links. Axes: layout (card, band, split picture, row: heading beside the button in a card), tone, actions (one, two, form: an email field), proof (none, quote), density.", {
  records: { CtaQuote: groupFields(["text", "string", "a customer quote, shown when `proof` is quote"], ["by", "string", "who said it"]) },
  typeImports: [{ from: "CtaActions", names: ["ActionSet"] }],
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "actions", type: ts("ActionSet"), required: true, docs: "the links (mode one or two) or the email field (mode form)" },
    { name: "quote", type: rec("CtaQuote") },
    { name: "layout", type: tsOf("card", "band", "split", "row", "banner"), default: "card", docs: "card: boxed; band: full-width; split: text beside picture; row: heading beside button; banner: centered muted card with one button" },
    { name: "tone", type: tone, default: "muted" },
    { name: "proof", type: tsOf("none", "quote"), default: "none" },
    { name: "density", type: density, default: "default" },
  ],
  derived: [{ name: "center", value: or(eq(ref("layout"), "band"), eq(ref("layout"), "banner")) }],
  view: (() => {
    const center = ref("center");
    const act = organism("CtaActions", { id: ref("id"), actions: ref("actions"), center });
    const proof = when(eq(ref("proof"), "quote"), [organism("QuoteProof", { quote: ref("quote.text"), quoteBy: ref("quote.by"), center })]);
    const main = frame(
      { id: ref("id"), title: ref("title"), lead: ref("text"), layout: cond(eq(ref("layout"), "split"), "split", "stack"), align: cond(center, "center", "start"),
        boxed: eq(ref("layout"), "card"), hasMedia: eq(ref("layout"), "split"), tone: ref("tone"), density: ref("density") },
      [proof, act], mediaOf(ref("title")));
    const row = use("Block", { props: { Tag: "section", Class: "py-8" }, attrs: { "aria-labelledby": fid("title"), "data-testid": "section", "data-tone": ref("tone"), "data-density": ref("density") } },
      use("Container", { props: { Class: wide }, attrs: { "data-slot": "container" } },
        use("Card", { props: { Variant: "muted" } },
          use("CardContent", { props: { Class: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between" } },
            use("Stack", { props: { Gap: "2", Class: "min-w-0" } },
              use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: fid("title") } }, text(ref("title"))),
              muted(ref("text"), "base")),
            proof, act))));
    const banner = organism("CtaBanner", { id: ref("id"), title: ref("title"), text: ref("text"), cta: ref("actions.cta"), href: ref("actions.href"), tone: ref("tone") });
    return [when(eq(ref("layout"), "banner"), [banner], [when(eq(ref("layout"), "row"), [row], [main])])];
  })(),
});

const ctaBanner = spec(`${O}cta-banner`, "CtaBanner", "A centered closing card: heading, one sentence and a pill button. Sizes from the default preset.", {
  props: [id, title, { name: "text", type: "string", required: true }, { name: "cta", type: "string", required: true }, { name: "href", type: "string", docs: "the address; none: a button, not a link" }, { name: "tone", type: tone, default: "muted" }],
  view: [use("Block", { props: { Tag: "section", Class: "w-full py-0" }, attrs: { "aria-labelledby": fid("title"), "data-testid": "section", "data-tone": ref("tone"), "data-density": "compact" } },
    use("Box", { props: { Class: cn("flex w-full flex-col items-center gap-10 bg-muted px-6 text-center", layoutOf("cta.panel")) }, attrs: { "data-testid": "cta-banner" } },
      use("Title", { props: { As: 2, Size: "3xl", Weight: "semibold", Class: cn(layoutOf("cta.title"), "leading-9") }, attrs: { id: fid("title") } }, text(ref("title"))),
      use("Text", { props: { Size: "xs", Weight: "semibold", Class: cn("leading-5 text-muted-foreground", layoutOf("cta.text")) } }, text(ref("text"))),
      use("Button", { props: { Variant: "default", Size: "lg", Href: ref("href"), Class: layoutOf("cta.button") }, attrs: { "data-testid": "action-primary" } }, text(ref("cta")))))],
});

const pricingTiers = spec(`${O}pricing-tiers`, "PricingTiers", "A section with a heading and one PricingCard per plan; an empty state when there are none. Axes: layout (grid, stack), columns, emphasis, billing (off: no toggle; monthly or annual: a toggle with that choice selected, and the prices of that period), density, tone.", {
  typeImports: [{ from: "PricingCard", names: ["Plan", "PricingCardLabels"] }],
  records: { BillingLabels: fields(["label", "string"], ["monthly", "string"], ["annual", "string"], ["save", "string"]) },
  props: [
    id, title,
    { name: "plans", type: ts("Plan[]"), required: true },
    { name: "labels", type: ts("PricingCardLabels"), required: true },
    { name: "billingLabels", type: { record: "BillingLabels" }, required: true, docs: "the toggle's name and choices; unused while `billing` is off" },
    { name: "layout", type: tsOf("grid", "stack"), default: "grid", docs: "stack: one narrow column of cards" },
    { name: "cols", type: cols, default: "1-3" },
    { name: "emphasis", type: tsOf("auto", "off"), default: "auto" },
    { name: "billing", type: tsOf("off", "monthly", "annual"), default: "off" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  events: [
    { name: "select", args: [{ name: "id", type: "string" }], docs: "the call to action of a plan was pressed" },
    { name: "billing", args: [{ name: "period", type: "string" }], docs: "the other billing period was chosen" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density"), measure: cond(eq(ref("layout"), "stack"), "md", "default") }, [
    when(ne(ref("billing"), "off"), [use("Group", { props: { Gap: "4", Align: "center", Justify: "center", Class: "flex-wrap" }, attrs: { "data-testid": "billing" } },
      organism("Switcher", { label: ref("billingLabels.label") }, kids(
        organism("SwitcherItem", { active: eq(ref("billing"), "monthly") }, { on: { click: call("emit.billing", "monthly") }, ...kids(text(ref("billingLabels.monthly"))) }),
        organism("SwitcherItem", { active: eq(ref("billing"), "annual") }, { on: { click: call("emit.billing", "annual") }, ...kids(text(ref("billingLabels.annual"))) }))),
      use("Badge", { props: { Variant: "default", Size: "default" } }, text(ref("billingLabels.save"))))]),
    // no plans: the empty state (labels.empty)
    when(eq(len(ref("plans")), 0), [organism("EmptyState", { icon: "layers", title: ref("labels.empty") })], [
      use("Grid", { props: { Cols: cond(eq(ref("layout"), "stack"), "1", fitCols(ref("cols"), len(ref("plans")))), Class: "gap-4" }, attrs: { "data-testid": "tiers" } },
        each(ref("plans"), "plan", ref("plan.id"), organism("PricingCard", { plan: ref("plan"), labels: ref("labels"), emphasis: ref("emphasis"), billing: cond(eq(ref("billing"), "annual"), "annual", "monthly"), density: cond(eq(ref("density"), "compact"), "compact", "default") }, { on: { select: call("emit.select", ref("plan.id")) } })))]),
  ])],
});

const faqList = spec(`${O}faq-list`, "FaqList", "A section with a heading and the questions. Axes: layout (accordion: native disclosures that open without script; chat: question and answer as alternating bubbles), columns (1, 2), search mode (none, field: a search field above; the page filters by `search.query`), filter mode (none, categories: tabs above; the page filters by `filter.category`), density, tone.", {
  records: {
    Faq: fields(["id", "string"], ["question", "string"], ["answer", "string"], ["category", "string", true]),
    FaqTab: fields(["id", "string"], ["title", "string"], ["value", "string"]),
    FaqSearch: groupFields(["mode", tsOf("none", "field"), "field: a search field above the questions", "none"],
      ["label", "string", "accessible name and placeholder of the search field"], ["query", "string", "the text the questions are filtered by"]),
    FaqFilter: groupFields(["mode", tsOf("none", "categories"), "categories: tabs above the questions", "none"],
      ["tabs", "FaqTab[]", "the category tabs"], ["label", "string", "accessible name of the tabs"], ["category", "string", "the value of the chosen tab"]),
  },
  props: [
    id, title,
    { name: "items", type: ts("Faq[]"), required: true },
    { name: "search", type: rec("FaqSearch"), docs: "the search field and its text" },
    { name: "filter", type: rec("FaqFilter"), docs: "the category tabs and the chosen one" },
    { name: "layout", type: tsOf("accordion", "chat"), default: "accordion" },
    { name: "cols", type: tsOf("1", "2"), default: "1" },
    { name: "empty", type: "string", default: "", docs: "the text of the empty state (no question, or none matches the search or tab), from the dictionary" },
    { name: "multiple", type: "boolean", default: false, docs: "true: several can be open at once; false: opening one closes the others (native details name)" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  events: [
    { name: "query", args: [{ name: "text", type: "string" }], docs: "the search text changed" },
    { name: "category", args: [{ name: "value", type: "string" }], docs: "a category tab was chosen" },
  ],
  derived: [
    { name: "inCategory", value: where(ref("items"), "category", ref("filter.category")) },
    { name: "shown", value: match(ref("inCategory"), "question", ref("search.query")) },
  ],
  view: (() => {
    const shown = ref("shown");
    return [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density"), measure: cond(eq(ref("layout"), "chat"), "2xl", "default") }, [
      when(eq(ref("search.mode"), "field"), [organism("SearchField", { label: coalesce(ref("search.label"), ""), placeholder: ref("search.label"), value: coalesce(ref("search.query"), "") }, { on: { value: call("emit.query", ref("arg")) } })]),
      when(eq(ref("filter.mode"), "categories"), [organism("Switcher", { label: ref("filter.label") }, kids(
        each(ref("filter.tabs"), "tab", ref("tab.id"), organism("SwitcherItem", { active: eq(ref("tab.value"), ref("filter.category")) }, { on: { click: call("emit.category", ref("tab.value")) }, ...kids(text(ref("tab.title"))) }))))]),
      when(eq(len(shown), 0), [organism("EmptyState", { icon: "circle-question-mark", title: ref("empty") })]),
      when(eq(ref("layout"), "chat"),
        [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "faq" } },
          each(shown, "item", ref("item.id"),
            use("Stack", { props: { Gap: "2", Align: "stretch" }, attrs: { "data-testid": "faq-item" } },
              use("Box", { props: { Class: "ml-auto max-w-xs sm:max-w-md rounded bg-primary px-4 py-4 text-primary-foreground" } }, use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("item.question")))),
              use("Box", { props: { Class: "mr-auto max-w-xs sm:max-w-md rounded bg-muted px-4 py-4" } }, use("Text", { props: { Size: "sm" } }, text(ref("item.answer")))))))],
        [use("Grid", { props: { Cols: cond(eq(ref("cols"), "2"), "1-2", "1"), Class: "items-start gap-x-8" }, attrs: { "data-testid": "faq" } },
          each(shown, "item", ref("item.id"),
            use("Disclosure", { props: { Variant: "item", Name: cond(ref("multiple"), undef(), tpl("{0}-faq", coalesce(ref("id"), "faq"))) }, attrs: { "data-testid": "faq-item" } },
              use("Summary", { props: { Variant: "item" } }, text(ref("item.question"))),
              use("Text", { props: { Size: "sm", Class: "pb-4 text-muted-foreground" } }, text(ref("item.answer"))))))]),
    ])];
  })(),
});

export const landingOrganisms: OrganismSpec[] = [heroPrompt, heroClassic, ...heroComponents, ctaBand, ctaBanner, ctaActions, quoteProof, pricingTiers, faqList];
