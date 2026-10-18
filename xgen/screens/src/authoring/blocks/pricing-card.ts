// The PricingCard organism, built from primitives: Card, Title, Badge, Text, List, Button.
import { and, call, cn, cond, eq, each, ref, slot, text, tpl, use, when, op } from "../../build";
import type { OrganismSpec } from "../../ir";
import { cardBase } from "../kit";

export const pricingCard: OrganismSpec = {
  $schema: "../../schema/schemas/organism.schema.json",
  specVersion: 1,
  id: "organism.pricing-card",
  name: "PricingCard",
  docs: "A plan as a card: name, tagline, price per month, the features, a call to action and an optional slot for more actions. Text comes in through `labels`; the plan is data.",
  records: {
    Plan: [
      { name: "id", type: "string" }, { name: "name", type: "string" }, { name: "tagline", type: "string" },
      { name: "price", type: "number" }, { name: "currency", type: "string" }, { name: "seats", type: "number" },
      { name: "storage", type: "number" }, { name: "highlighted", type: "boolean" }, { name: "status", type: "string", optional: true },
      { name: "features", type: "string[]" }, { name: "yearly", type: "number" },
    ],
    PricingCardLabels: [
      { name: "popular", type: "string" }, { name: "perMonth", type: "string" }, { name: "seats", type: "string" },
      { name: "storage", type: "string" }, { name: "cta", type: "string" }, { name: "free", type: "string" }, { name: "perYear", type: "string" },
      { name: "empty", type: "string" },
    ],
  },
  props: [
    { name: "plan", type: { record: "Plan" }, required: true },
    { name: "labels", type: { record: "PricingCardLabels" }, required: true },
    { name: "current", type: "boolean", docs: "marks the plan as the chosen one" },
    { name: "emphasis", type: { ts: '"auto" | "off"' }, default: "auto", docs: "auto: the highlighted plan stands out; off: all plans alike" },
    { name: "density", type: { ts: '"default" | "compact"' }, default: "default", docs: "compact: tighter content" },
    { name: "billing", type: { ts: '"monthly" | "annual"' }, default: "monthly", docs: "annual: the yearly price of the plan, when it has one" },
  ],
  derived: [
    { name: "stand", value: and(ref("plan.highlighted"), eq(ref("emphasis"), "auto")) },
    { name: "yearlyOn", value: and(eq(ref("billing"), "annual"), op("gt", ref("plan.yearly"), 0)) },
    { name: "amount", value: cond(ref("yearlyOn"), ref("plan.yearly"), ref("plan.price")) },
  ],
  slots: [{ name: "footer", args: [{ name: "plan", type: { record: "Plan" } }], docs: "more content in the footer; receives the plan" }],
  events: [{ name: "select", args: [{ name: "id", type: "string" }], docs: "the call to action was pressed" }],
  view: [
    use("Block", { props: { Tag: "article", Class: cn(cardBase(), "flex h-full flex-col") }, attrs: { "data-slot": "card", "data-highlighted": cond(ref("stand"), "true", "false"), "data-current": cond(ref("current"), "true", "false") } },
      use("CardHeader", { props: { Class: "flex flex-col gap-2" } },
        use("Box", { props: { Class: "flex min-h-6 items-center" }, attrs: { "data-slot": "badge-slot" } },
          when(ref("stand"), [use("Badge", { props: { Variant: "default", Size: "default" } }, text(ref("labels.popular")))])),
        use("CardTitle", { props: { As: 3 } }, text(ref("plan.name"))),
        use("CardDescription", {}, text(ref("plan.tagline")))),
      use("CardContent", { props: { Class: cn("flex flex-1 flex-col", cond(eq(ref("density"), "compact"), "gap-2", "gap-4")) } },
        use("Group", { props: { Gap: "2", Align: "baseline" } },
          use("Title", { props: { As: 2, Size: "4xl", Weight: "bold" } },
            when(eq(ref("amount"), 0), [text(ref("labels.free"))], [text(op("money", ref("amount"), ref("plan.currency")))])),
          when(op("gt", ref("amount"), 0), [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(cond(ref("yearlyOn"), ref("labels.perYear"), ref("labels.perMonth"))))])),
        use("Text", { props: { Size: "sm", Weight: "medium" } }, text(tpl(ref("labels.seats"), ref("plan.seats")))),
        use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("labels.storage"), ref("plan.storage")))),
        use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2 text-sm" } },
          each(ref("plan.features"), "feature", ref("feature"), use("ListItem", { props: { Class: "flex gap-2" } }, text(ref("feature")))))),
      use("CardFooter", { props: { Class: "flex flex-wrap items-center gap-2" } },
        use("Button", { props: { Variant: cond(ref("stand"), "default", "outline"), Size: "default" }, on: { click: call("emit.select", ref("plan.id")) }, attrs: { "data-testid": "plan-select" } }, text(ref("labels.cta"))),
        slot("footer", ref("plan")))),
  ],
  portable: { svelte: true, react: true },
};
