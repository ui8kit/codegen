// The parts the checkout, the cart page and the slot picker share: a grid of delivery windows (radios), payment options (radio cards),
// a numbered step of a form, and the order summary card with a promo code and a free-delivery progress bar.
import { and, cn, cond, each, eq, gt, len, money, mul, ref, slot, str, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { ifAny, tsOf } from "../props";
import { muted, strong, surface } from "../ux";
import { checkRow } from "../forms";

const P = "pattern.";
/** a radio inside its label, drawn as a chip; `has-checked` marks the chosen one */
const chip = "flex items-center gap-2 rounded px-4 py-2 text-sm inset-ring inset-ring-border has-checked:bg-muted has-checked:inset-ring-foreground";

export const slotGrid = spec(`${P}slot-grid`, "SlotGrid", "Delivery windows by day: each day lists its windows as radio chips; closed windows are disabled and struck through. One radio group (`name`) across all days. Static markup.", {
  records: { Day: fields(["id", "string"], ["title", "string"], ["note", "string"], ["slots", "string[]"], ["closed", "string[]"]) },
  props: [
    { name: "days", type: ts("Day[]"), required: true },
    { name: "name", type: "string", required: true, docs: "name of the radio group" },
    { name: "item", type: tsOf("card", "plain"), default: "card", docs: "card: each day in a card; plain: days divided by a line" },
  ],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "days" } },
    each(ref("days"), "d", ref("d.id"),
      use("Stack", { props: { Gap: "4", Class: cond(eq(ref("item"), "card"), surface("p-4"), "border-b border-border pb-4") }, attrs: { "data-testid": "day" } },
        use("Group", { props: { Gap: "4", Align: "baseline", Justify: "between", Class: "flex-wrap" } }, strong(ref("d.title"), "sm"), muted(ref("d.note"), "xs")),
        use("Box", { props: { Class: "grid grid-cols-2 gap-2 sm:grid-cols-3" } },
          each(ref("d.slots"), "s", ref("s"),
            use("Label", { props: { Class: chip } }, use("Radio", { props: { Name: ref("name"), Value: tpl("{0} {1}", ref("d.id"), ref("s")) } }), use("Inline", {}, text(ref("s"))))),
          each(ref("d.closed"), "s", ref("s"),
            use("Label", { props: { Class: cn(chip, "text-muted-foreground line-through") } }, use("Radio", { props: { Name: ref("name"), Value: tpl("{0} {1}", ref("d.id"), ref("s")), Disabled: true } }), use("Inline", {}, text(ref("s"))))))))),
  ],
});

export const paymentOptions = spec(`${P}payment-options`, "PaymentOptions", "Ways to pay as radio cards: icon, name and a line of text; `checked` is the chosen one. Static markup.", {
  records: { Payment: fields(["id", "string"], ["title", "string"], ["text", "string"], ["icon", "string"]) },
  props: [
    { name: "payments", type: ts("Payment[]"), required: true },
    { name: "name", type: "string", required: true, docs: "name of the radio group" },
    { name: "checked", type: "string", default: "", docs: "id of the chosen payment" },
  ],
  view: [use("Grid", { props: { Cols: "1-2", Class: "gap-4" }, attrs: { "data-testid": "payments" } },
    each(ref("payments"), "p", ref("p.id"),
      use("Label", { props: { Class: "flex items-center gap-4 rounded p-4 inset-ring inset-ring-border has-checked:inset-ring-foreground" }, attrs: { "data-testid": "payment" } },
        use("Radio", { props: { Name: ref("name"), Value: ref("p.id"), Checked: eq(ref("p.id"), ref("checked")) } }),
        use("LucideIcon", { props: { Name: ref("p.icon"), Size: 20, Class: "shrink-0" } }),
        use("Inline", { props: { Class: "flex flex-col items-start justify-start gap-0" } }, use("Inline", { props: { Class: "text-sm font-semibold" } }, text(ref("p.title"))), use("Inline", { props: { Class: "text-xs text-muted-foreground" } }, text(ref("p.text"))))))),
  ],
});

export const checkoutStep = spec(`${P}checkout-step`, "CheckoutStep", "One step of a long form: an optional number, a heading (h2) and a line of text over the fields (`children`). Axes: layout (cards: the step in a card, numbered: a number beside the heading and a line between steps).", {
  props: [
    { name: "number", type: "string", required: true, docs: "the number of the step (shown in the numbered layout)" },
    { name: "title", type: "string", required: true },
    { name: "text", type: "string", default: "" },
    { name: "layout", type: tsOf("cards", "numbered"), default: "cards" },
  ],
  children: true,
  view: [use("Stack", { props: { Gap: "6", Align: "stretch", Class: cond(eq(ref("layout"), "cards"), surface("p-6"), "border-t border-border pt-6") }, attrs: { "data-testid": "step" } },
    use("Group", { props: { Gap: "4", Align: "start" } },
      when(eq(ref("layout"), "numbered"), [use("Box", { props: { Class: "flex size-8 shrink-0 items-center justify-center rounded bg-primary text-sm font-medium text-primary-foreground" } }, text(ref("number")))]),
      use("Stack", { props: { Gap: "0" } },
        use("Title", { props: { As: 2, Size: "lg", Weight: "semibold" } }, text(ref("title"))),
        when(ref("text"), [muted(ref("text"))]))),
    slot("children")),
  ],
});

export const cartSummaryCard = spec(`${P}cart-summary-card`, "CartSummaryCard", "The order summary card of the cart page and the checkout: the lines in short (optional), a promo code field with ready codes, the free-delivery progress, the totals, the button and a note. Static markup.", {
  typeImports: [{ from: "CartList", names: ["CartLine"] }, { from: "OrderSummary", names: ["SummaryRow"] }],
  records: {
    Promo: fields(["id", "string"], ["code", "string"]),
    CartSummaryLabels: fields(["title", "string"], ["items", "string"], ["promo", "string"], ["apply", "string"], ["codes", "string"], ["progress", "string"], ["checkout", "string"], ["note", "string"]),
  },
  props: [
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    { name: "promos", type: ts("Promo[]"), required: true },
    { name: "labels", type: ts("CartSummaryLabels"), required: true },
    { name: "items", type: tsOf("show", "hide"), default: "hide", docs: "show: the lines in short at the top" },
    { name: "promo", type: tsOf("show", "hide"), default: "show" },
    { name: "field", type: "string", default: "promo", docs: "name of the promo code field (unique on the page)" },
    { name: "progress", type: tsOf("show", "hide"), default: "show" },
    { name: "value", type: "number", default: 70, docs: "how far the order is towards free delivery, 0 to 100" },
  ],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "summary" } },
    use("Group", { props: { Gap: "4", Align: "baseline", Justify: "between" } },
      use("Title", { props: { As: 2, Size: "lg", Weight: "semibold" } }, text(ref("labels.title"))),
      muted(tpl(ref("labels.items"), str(len(ref("lines")))), "xs")),
    // emptyMode omit (CheckoutForm, ShoppingCart): an empty list leaves its part out
    when(and(eq(ref("items"), "show"), gt(len(ref("lines")), 0)), [use("List", { props: { Tag: "ul", Class: "flex flex-col gap-4" }, attrs: { "data-testid": "summary-lines" } },
      each(ref("lines"), "line", ref("line.id"),
        use("ListItem", { props: { Class: "flex items-center gap-4 text-sm" } },
          organism("MediaFrame", { alt: ref("line.name"), ratio: "1/1", className: "size-12 shrink-0" }),
          use("Stack", { props: { Gap: "0", Class: "flex-1" } }, strong(ref("line.name"), "sm"), muted(tpl("{0} x {1}", ref("line.qty"), money(ref("line.price"), ref("line.currency"))), "xs")),
          use("Inline", { props: { Class: "font-medium" } }, text(money(mul(ref("line.price"), ref("line.qty")), ref("line.currency")))))))]),
    when(eq(ref("promo"), "show"), [use("Stack", { props: { Gap: "2", Align: "stretch" }, attrs: { "data-testid": "promo" } },
      use("Group", { props: { Gap: "2", Align: "center" } },
        use("Input", { props: { Type: "text", Name: ref("field"), AriaLabel: ref("labels.promo"), Placeholder: ref("labels.promo"), Class: "min-w-0 flex-1" } }),
        use("Button", { props: { Variant: "outline", Size: "default", Type: "button" } }, text(ref("labels.apply")))),
      ifAny("promos", [use("Group", { props: { Gap: "2", Align: "center", Class: "flex-wrap" } },
        muted(ref("labels.codes"), "xs"),
        each(ref("promos"), "c", ref("c.id"), use("Badge", { props: { Variant: "outline", Size: "sm" }, attrs: { "data-testid": "code" } }, text(ref("c.code")))))]))]),
    when(eq(ref("progress"), "show"), [use("Stack", { props: { Gap: "2", Align: "stretch", Class: "rounded bg-muted p-4" }, attrs: { "data-testid": "progress" } },
      use("Text", { props: { Size: "sm" } }, text(ref("labels.progress"))),
      use("Progress", { props: { Value: str(ref("value")), Max: "100" }, attrs: { "aria-label": ref("labels.progress") } }))]),
    ifAny("rows", [use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2" } },
      each(ref("rows"), "row", ref("row.id"),
        use("ListItem", { props: { Class: cn("flex items-center justify-between gap-4", cond(ref("row.strong"), "border-t border-border pt-4 text-base font-bold", "text-sm text-muted-foreground")) }, attrs: { "data-testid": "row" } },
          use("Inline", {}, text(ref("row.label"))), use("Inline", {}, text(money(ref("row.amount"), ref("row.currency")))))))]),
    use("Button", { props: { Variant: "default", Size: "lg", Class: "w-full" }, attrs: { "data-testid": "checkout" } }, text(ref("labels.checkout"))),
    muted(ref("labels.note"), "xs")),
  ],
});

/** the end of the checkout form: the consent checkbox, the submit button and the legal line */
const checkoutSubmit = spec("pattern.checkout-submit", "CheckoutSubmit", "The end of the checkout form: the consent checkbox, the submit button and the legal line.", {
  props: [
    { name: "id", type: "string", required: true, docs: "id of the form block (the checkbox id is <id>-consent)" },
    { name: "consent", type: "string", required: true },
    { name: "submit", type: "string", required: true },
    { name: "legal", type: "string", required: true },
  ],
  view: [use("Stack", { props: { Gap: "4", Align: "start" } },
    checkRow("consent", ref("consent")),
    use("Button", { props: { Variant: "default", Size: "lg", Type: "submit" }, attrs: { "data-testid": "submit" } }, text(ref("submit"))),
    muted(ref("legal"), "xs"))],
});

export const checkoutParts: OrganismSpec[] = [checkoutSubmit, slotGrid, paymentOptions, checkoutStep, cartSummaryCard];
