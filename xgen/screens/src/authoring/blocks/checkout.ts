// The checkout and the cart beyond the plain list: the long checkout form beside a sticky order summary, the cart page with a promo code
// and a free-delivery bar, the cart drawer in its open state, and the product details (an accordion of texts beside a spec list).
import { and, cond, each, eachAt, eq, len, or, money, mul, ref, str, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, ifAny, title, tsOf, toneLite } from "../props";
import { inputField, kids, textField, checkRow } from "../forms";
import { heading, muted, strong, strongSpan, surface } from "../ux";

const O = "organism.";
const step = (n: string, t: string, s: string, ...body: ViewNode[]) =>
  organism("CheckoutStep", { number: n, title: ref(`labels.${t}`), text: ref(`labels.${s}`), layout: ref("layout") }, kids(...body));
const summaryCard = (items: string) => organism("CartSummaryCard", { field: tpl("{0}-promo", ref("id")), lines: ref("lines"), rows: ref("rows"), promos: ref("promos"), labels: ref("totals"), items });

const checkoutForm = spec(`${O}checkout-form`, "CheckoutForm", "A checkout on one page: contacts, address, a delivery window, the payment and the consent as stacked steps, beside a sticky order summary with the lines, a promo code and the totals. Static markup. Axes: layout (cards: each step in a card, numbered: numbered steps divided by a line), summary (aside, none), tone.", {
  typeImports: [{ from: "SlotGrid", names: ["Day"] }, { from: "PaymentOptions", names: ["Payment"] }, { from: "CartList", names: ["CartLine"] }, { from: "OrderSummary", names: ["SummaryRow"] }, { from: "CartSummaryCard", names: ["Promo", "CartSummaryLabels"] }],
  records: { CheckoutLabels: fields(["contacts", "string"], ["contactsText", "string"], ["name", "string"], ["phone", "string"], ["email", "string"], ["address", "string"], ["addressText", "string"], ["street", "string"], ["house", "string"], ["flat", "string"], ["entrance", "string"], ["floor", "string"], ["comment", "string"], ["slot", "string"], ["slotText", "string"], ["payment", "string"], ["paymentText", "string"], ["consent", "string"], ["submit", "string"], ["legal", "string"]) },
  props: [
    id,
    { name: "title", type: "string", default: "", docs: "section heading; empty: no heading (the page heading names the checkout)" },
    { name: "days", type: ts("Day[]"), required: true },
    { name: "payments", type: ts("Payment[]"), required: true },
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    { name: "promos", type: ts("Promo[]"), required: true },
    { name: "labels", type: { record: "CheckoutLabels" }, required: true },
    { name: "totals", type: ts("CartSummaryLabels"), required: true, docs: "labels of the order summary" },
    { name: "layout", type: tsOf("cards", "numbered"), default: "cards" },
    { name: "summary", type: tsOf("aside", "none"), default: "aside" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [
    use("Box", { props: { Class: "grid grid-cols-1 items-start gap-8 lg:grid-cols-3" } },
      use("Form", { props: { Method: "dialog", Class: cond(eq(ref("summary"), "aside"), "flex flex-col gap-6 lg:col-span-2", "flex flex-col gap-6 lg:col-span-3") }, attrs: { "data-testid": "checkout-form" } },
        step("1", "contacts", "contactsText", use("Grid", { props: { Cols: "1-2", Class: "gap-4" } },
          inputField("name", "text", ref("labels.name"), "name"), inputField("phone", "tel", ref("labels.phone"), "tel"), inputField("email", "email", ref("labels.email"), "email"))),
        step("2", "address", "addressText",
          inputField("street", "text", ref("labels.street"), "address-line1"),
          use("Grid", { props: { Cols: "2-4", Class: "gap-4" } },
            inputField("house", "text", ref("labels.house")), inputField("flat", "text", ref("labels.flat")), inputField("entrance", "text", ref("labels.entrance")), inputField("floor", "text", ref("labels.floor"))),
          textField("comment", ref("labels.comment"))),
        step("3", "slot", "slotText", ifAny("days", [organism("SlotGrid", { days: ref("days"), name: tpl("{0}-slot", ref("id")), item: "plain" })])),
        step("4", "payment", "paymentText", ifAny("payments", [organism("PaymentOptions", { payments: ref("payments"), name: tpl("{0}-payment", ref("id")), checked: "payment-card" })])),
        organism("CheckoutSubmit", { id: ref("id"), consent: ref("labels.consent"), submit: ref("labels.submit"), legal: ref("labels.legal") })),
      when(eq(ref("summary"), "aside"), [use("Box", { props: { Class: "lg:sticky lg:top-8" }, attrs: { "data-testid": "aside" } }, summaryCard("show"))])),
  ])],
});

const cartPage = spec(`${O}shopping-cart`, "ShoppingCart", "The cart as a page: the lines as cards (picture, name, variant, price, quantity, line total, remove) with the way back, beside the order summary with a promo code and the free-delivery bar. Static markup. Axes: layout (split: the summary beside the lines, stacked: below them), promo (show, hide), progress (show, hide), tone.", {
  typeImports: [{ from: "CartList", names: ["CartLine", "CartLabels"] }, { from: "OrderSummary", names: ["SummaryRow"] }, { from: "CartSummaryCard", names: ["Promo", "CartSummaryLabels"] }],
  records: { ShoppingCartLabels: fields(["back", "string"], ["clear", "string"], ["empty", "string"]) },
  props: [
    id, title,
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    { name: "promos", type: ts("Promo[]"), required: true },
    { name: "labels", type: ts("CartLabels"), required: true },
    { name: "totals", type: ts("CartSummaryLabels"), required: true, docs: "labels of the order summary" },
    { name: "actions", type: { record: "ShoppingCartLabels" }, required: true, docs: "labels of the buttons under the lines, and the empty-cart title" },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "promo", type: tsOf("show", "hide"), default: "show" },
    { name: "progress", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [
    use("Box", { props: { Class: cond(eq(ref("layout"), "split"), "grid grid-cols-1 items-start gap-8 lg:grid-cols-3", "grid grid-cols-1 gap-8") } },
      use("Stack", { props: { Gap: "4", Align: "stretch", Class: cond(eq(ref("layout"), "split"), "lg:col-span-2", "") }, attrs: { "data-testid": "lines" } },
        // no lines: EmptyState (title from the labels record, the 12-prop limit leaves no room for an `empty` prop)
        when(eq(len(ref("lines")), 0), [organism("EmptyState", { icon: "shopping-cart", title: ref("actions.empty") })]),
        each(ref("lines"), "line", ref("line.id"),
          use("Group", { props: { Gap: "4", Align: "center", Class: surface("flex-wrap p-4") }, attrs: { "data-testid": "item" } },
            organism("MediaFrame", { alt: ref("line.name"), ratio: "1/1", className: "size-20 shrink-0" }),
            use("Stack", { props: { Gap: "0", Class: "min-w-40 flex-1" } }, strong(ref("line.name"), "sm"), muted(ref("line.variant"), "xs"), use("Text", { props: { Size: "sm" } }, text(money(ref("line.price"), ref("line.currency"))))),
            organism("NumberField", { value: str(ref("line.qty")), name: tpl("{0}-qty-{1}", ref("id"), ref("line.id")), min: "1", label: ref("labels.qty"), decrease: ref("labels.decrease"), increase: ref("labels.increase") }),
            use("Text", { props: { Size: "base", Weight: "bold", Class: "w-24 text-right" } }, text(money(mul(ref("line.price"), ref("line.qty")), ref("line.currency")))),
            use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", AriaLabel: ref("labels.remove") }, attrs: { "data-testid": "remove" } }, use("LucideIcon", { props: { Name: "trash", Size: 16 } })))),
        use("Group", { props: { Gap: "4", Justify: "between", Class: "flex-wrap" } },
          use("Button", { props: { Variant: "outline", Size: "default" } }, use("LucideIcon", { props: { Name: "arrow-left", Size: 16 } }), text(ref("actions.back"))),
          use("Button", { props: { Variant: "ghost", Size: "default" } }, text(ref("actions.clear"))))),
      use("Box", { props: { Class: cond(eq(ref("layout"), "split"), "lg:sticky lg:top-8", "") }, attrs: { "data-testid": "aside" } },
        organism("CartSummaryCard", { field: tpl("{0}-promo", ref("id")), lines: ref("lines"), rows: ref("rows"), promos: ref("promos"), labels: ref("totals"), promo: ref("promo"), progress: ref("progress") }))),
  ])],
});

const cartDrawer = spec(`${O}cart-drawer`, "CartDrawer", "The cart drawer in its open state, over a faded page: the head with a close button, the lines with a quantity field, the free-delivery bar, the totals and the button. The empty state shows an icon, a line and the way back. Static markup: opening and closing are the page's. Axes: state (filled, empty), media (image, none).", {
  typeImports: [{ from: "CartList", names: ["CartLine", "CartLabels"] }, { from: "OrderSummary", names: ["SummaryRow"] }],
  records: { DrawerLabels: fields(["title", "string"], ["close", "string"], ["progress", "string"], ["empty", "string"], ["emptyText", "string"], ["browse", "string"]) },
  props: [
    id,
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    { name: "labels", type: ts("CartLabels"), required: true },
    { name: "drawer", type: { record: "DrawerLabels" }, required: true, docs: "labels of the drawer" },
    { name: "state", type: tsOf("filled", "empty"), default: "filled" },
    { name: "media", type: tsOf("image", "none"), default: "image" },
  ],
  view: [use("Block", { props: { Tag: "section", Class: "py-8" }, attrs: { "aria-label": ref("drawer.title"), "data-testid": "section" } },
    use("Container", { props: { Class: "mx-auto w-full max-w-6xl px-4" }, attrs: { "data-slot": "container" } },
      use("Box", { props: { Class: "flex min-h-160 overflow-hidden rounded bg-muted inset-ring inset-ring-border" } },
        use("Box", { props: { Class: "hidden flex-1 flex-col gap-4 p-8 sm:flex" }, attrs: { "aria-hidden": "true" } },
          use("Box", { props: { Class: "h-8 w-48 rounded bg-background" } }), use("Box", { props: { Class: "h-40 rounded bg-background" } }), use("Box", { props: { Class: "h-40 rounded bg-background" } })),
        use("Box", { props: { Class: "flex w-full flex-col bg-background shadow-lg sm:max-w-sm" }, attrs: { role: "group", "aria-label": ref("drawer.title"), "data-testid": "drawer" } },
          use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "border-b border-border p-4" } },
            use("Title", { props: { As: 2, Size: "lg", Weight: "semibold" } }, text(ref("drawer.title"))),
            use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", AriaLabel: ref("drawer.close") } }, use("LucideIcon", { props: { Name: "x", Size: 16 } }))),
          // the empty state: the axis shows it, and so does a cart with no lines (EmptyState with the browse action)
          when(or(eq(ref("state"), "empty"), eq(len(ref("lines")), 0)),
            [use("Box", { props: { Class: "flex flex-1 flex-col justify-center p-4" }, attrs: { "data-testid": "empty" } },
              organism("EmptyState", { icon: "shopping-bag", title: ref("drawer.empty"), text: ref("drawer.emptyText") }, { slots: { action: { args: [], do: [
                use("Button", { props: { Variant: "outline", Size: "default" } }, text(ref("drawer.browse")))] } } }))],
            [organism("DrawerLines", { field: tpl("{0}-qty", ref("id")), lines: ref("lines"), rows: ref("rows"), labels: ref("labels"), drawer: ref("drawer"), media: ref("media") })]))))),
  ],
});

const productInfo = spec(`${O}product-info`, "ProductInfo", "The details of a product under its buy box: texts in an accordion (native details) beside a card with the specs. Axes: layout (split: the specs beside the texts, stacked: below them), expand (first: the first text open, none), tone.", {
  records: { Detail: fields(["id", "string"], ["title", "string"], ["text", "string"]), Spec: fields(["id", "string"], ["label", "string"], ["value", "string"]), ProductInfoLabels: fields(["specs", "string"]) },
  props: [
    id, title,
    { name: "details", type: ts("Detail[]"), required: true },
    { name: "specs", type: ts("Spec[]"), required: true },
    { name: "labels", type: { record: "ProductInfoLabels" }, required: true },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "expand", type: tsOf("first", "none"), default: "first" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: "default" }, [
    use("Box", { props: { Class: cond(eq(ref("layout"), "split"), "grid grid-cols-1 items-start gap-8 lg:grid-cols-3", "grid grid-cols-1 gap-8") } },
      ifAny("details", [use("Stack", { props: { Gap: "0", Align: "stretch", Class: cond(eq(ref("layout"), "split"), "lg:col-span-2", "") }, attrs: { "data-testid": "items" } },
        eachAt(ref("details"), "d", "i", ref("d.id"),
          use("Disclosure", { props: { Variant: "item", Open: and(eq(ref("expand"), "first"), eq(ref("i"), 0)) }, attrs: { "data-testid": "item" } },
            use("Summary", { props: { Variant: "item" } }, strongSpan(ref("d.title"))),
            use("Text", { props: { Size: "sm", Class: "pb-4 text-muted-foreground" } }, text(ref("d.text"))))))]),
      ifAny("specs", [use("Stack", { props: { Gap: "4", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "specs" } },
        heading(ref("labels.specs"), "lg"),
        use("List", { props: { Tag: "ul", Class: "flex flex-col" } },
          each(ref("specs"), "s", ref("s.id"),
            use("ListItem", { props: { Class: "flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0" }, attrs: { "data-testid": "spec" } },
              use("Inline", { props: { Class: "text-muted-foreground" } }, text(ref("s.label"))), use("Inline", { props: { Class: "font-medium" } }, text(ref("s.value")))))))])),
  ])],
});

export const checkoutOrganisms: OrganismSpec[] = [checkoutForm, cartPage, cartDrawer, productInfo];
