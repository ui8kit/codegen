// Commerce blocks of the catalog: the store front, delivery and pickup, the product details, the cart page and drawer, and the checkout.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const c = (k: string) => t(`commerce.${k}`);
const pick = (from: string, id: string) => ({ op: "pick", args: [ref(from), id] });
const shown = (sel: string, axis: string, on: string | string[], off: string | string[]) => [{ sel, n: 1, when: { [axis]: on } }, { sel, n: 0, when: { [axis]: off } }];

const storehero = define({
  key: "storehero", theme: "commerce", group: "storefront", name: "Store hero", docs: "The hero of a store with promises under the actions, beside a picture with an offer card or over a faint picture.",
  organism: "StoreHero", axes: ["layout", "mediaSide", "tone"], data: [d.perks],
  variants: [
    ["overlay", "Picture with an offer card"],
    ["overlayStart", "Picture at the start", { mediaSide: "start" }],
    ["backdrop", "Text over a faint picture", { layout: "backdrop" }],
    ["muted", "Muted, one action", { tone: "muted" }, { actions: { mode: "one", cta: c("storeHero.cta"), href: "#/catalog" } }],
  ],
  facts: [{ sel: '[data-testid="perk"]', n: 3 }, ...shown('[data-testid="offer-card"]', "layout", "overlay", "backdrop"), ...shown('[data-testid="backdrop"]', "layout", "backdrop", "overlay")],
  sample: {
    id: "storehero", title: c("storeHero.title"), lead: c("storeHero.lead"), badge: c("storeHero.badge"), perks: ref("perks"), card: c("storeHero.card"),
    actions: { mode: "two", cta: c("storeHero.cta"), href: "#/catalog", secondary: c("storeHero.secondary"), secondaryHref: "#/delivery" },
  },
});

const usp = define({
  key: "usp", theme: "commerce", group: "storefront", name: "Store promises", docs: "Free delivery, returns, warranty and help in one band.",
  organism: "UspStrip", axes: ["layout", "tone", "density"], data: [d.perks],
  variants: [
    ["strip", "Muted strip"],
    ["cards", "Cards under a heading", { layout: "cards" }, { title: c("usp.title") }],
    ["stripCompact", "Muted strip, compact", { density: "compact" }],
    ["bar", "Thin bar of icons", { layout: "bar", density: "compact" }],
    ["barMuted", "Thin bar, muted", { layout: "bar", tone: "muted", density: "compact" }],
  ],
  facts: [{ sel: '[data-testid="item"]', n: "@perks" }],
  sample: { id: "usp", perks: ref("perks"), empty: t("empty.perks") },
});

const zones = define({
  key: "zones", theme: "commerce", group: "delivery", name: "Delivery zones", docs: "Delivery zones and their prices as a table or as cards.",
  organism: "ZoneTable", axes: ["layout", "tone", "density"], data: [d.zones],
  variants: [["table", "Table"], ["cards", "Cards", { layout: "cards" }], ["tableMuted", "Table, muted, compact", { tone: "muted", density: "compact" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@zones" }, ...shown('[data-testid="zone-table"]', "layout", "table", "cards")],
  sample: { id: "zones", title: c("zones.title"), lead: c("zones.lead"), zones: ref("zones"), empty: t("empty.zones"), labels: c("zones") },
});

const slots = define({
  key: "slots", theme: "commerce", group: "delivery", name: "Delivery window", docs: "Days with their delivery windows as radio chips, beside the zone card.",
  organism: "SlotBoard", axes: ["layout", "item", "tone"], data: [d.days, d.zones],
  variants: [["split", "Days beside the zone card"], ["plain", "Plain days", { item: "plain" }], ["stacked", "Days only, muted", { layout: "stacked", tone: "muted" }]],
  facts: [{ sel: '[data-testid="day"]', n: "@days" }, { sel: 'input[type="radio"]', n: 12 }, { sel: 'input[type="radio"]:disabled', n: 4 }, ...shown('[data-testid="aside"]', "layout", "split", "stacked")],
  sample: { id: "slots", title: c("slots.title"), lead: c("slots.lead"), days: ref("days"), empty: t("empty.days"), zone: pick("zones", "zone-central"), labels: c("slots") },
});

const delivery = define({
  key: "delivery", theme: "commerce", group: "delivery", name: "Delivery info", docs: "How delivery works: the facts, then the zones.",
  organism: "DeliveryInfo", axes: ["layout", "tone", "density"], data: [d.deliveryfacts, d.zones],
  variants: [["full", "Facts over zone cards"], ["split", "Facts beside a list of zones", { layout: "split" }], ["facts", "Facts only, muted, compact", { layout: "facts", tone: "muted", density: "compact" }]],
  facts: [{ sel: '[data-testid="fact"]', n: "@deliveryfacts" }, { sel: '[data-testid="zone"]', n: "@zones", when: { layout: ["full", "split"] } }, { sel: '[data-testid="zone"]', n: 0, when: { layout: "facts" } }],
  sample: { id: "delivery", title: c("delivery.title"), lead: c("delivery.lead"), facts: ref("deliveryfacts"), zones: ref("zones"), labels: c("delivery") },
});

const locations = define({
  key: "locations", theme: "commerce", group: "delivery", name: "Store locations", docs: "The stores with address, hours, phone and services.",
  organism: "StoreLocations", axes: ["layout", "tone"], data: [d.stores],
  variants: [["cards", "Cards"], ["list", "One row per store, muted", { layout: "list", tone: "muted" }], ["map", "Beside a map", { layout: "map" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@stores" }, ...shown('[data-slot="media-frame"]', "layout", "map", ["cards", "list"])],
  sample: { id: "locations", title: c("stores.title"), lead: c("stores.lead"), stores: ref("stores"), empty: t("empty.stores"), kinds: c("stores.kinds"), labels: c("stores") },
});

const productinfo = define({
  key: "productinfo", theme: "commerce", group: "product", name: "Product details", docs: "Texts in an accordion beside a card of specs.",
  organism: "ProductInfo", axes: ["layout", "expand", "tone"], data: [d.details, d.specs],
  variants: [["split", "Specs beside the texts"], ["stacked", "Specs below", { layout: "stacked" }], ["closed", "All closed, muted", { expand: "none", tone: "muted" }]],
  facts: [{ sel: "details", n: "@details" }, { sel: '[data-testid="spec"]', n: "@specs" }, ...shown("details[open]", "expand", "first", "none")],
  sample: { id: "productinfo", title: c("info.title"), details: ref("details"), specs: ref("specs"), labels: c("info") },
});

const cartpage = define({
  key: "cartpage", theme: "commerce", group: "checkout", name: "Cart page", docs: "The cart lines beside a summary with a promo code and a free-delivery bar.",
  organism: "ShoppingCart", axes: ["layout", "promo", "progress", "tone"], data: [d.cart, d.summary, d.promos],
  variants: [["split", "Summary beside the lines"], ["stacked", "Summary below", { layout: "stacked" }], ["plain", "No promo code, no bar, muted", { promo: "hide", progress: "hide", tone: "muted" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@cart" }, { sel: '[data-testid="code"]', n: "@promos", when: { promo: "show" } }, { sel: '[data-testid="code"]', n: 0, when: { promo: "hide" } }, ...shown('[data-testid="progress"]', "progress", "show", "hide")],
  sample: { id: "cartpage", title: c("cartPage.title"), lines: ref("cart"), rows: ref("summary"), promos: ref("promos"), labels: c("cart"), totals: c("totals"), actions: c("cartPage") },
});

const cartdrawer = define({
  key: "cartdrawer", theme: "commerce", group: "checkout", name: "Cart drawer", docs: "The cart drawer in its open state, filled or empty.",
  organism: "CartDrawer", axes: ["state", "media"], data: [d.cart, d.summary],
  variants: [["filled", "Open, with lines"], ["compact", "No pictures", { media: "none" }], ["empty", "Empty", { state: "empty" }]],
  facts: [{ sel: '[data-testid="drawer"]', n: 1 }, { sel: '[data-testid="item"]', n: "@cart", when: { state: "filled" } }, ...shown('[data-testid="empty"]', "state", "empty", "filled")],
  sample: { id: "cartdrawer", lines: ref("cart"), rows: ref("summary"), labels: c("cart"), drawer: c("drawer") },
});

const checkout = define({
  key: "checkout", theme: "commerce", group: "checkout", name: "Checkout", docs: "Contacts, address, a window and the payment beside a sticky order summary.",
  organism: "CheckoutForm", axes: ["layout", "summary", "tone"], data: [d.days, d.payments, d.cart, d.summary, d.promos],
  variants: [["cards", "Steps in cards"], ["numbered", "Numbered steps", { layout: "numbered" }], ["noSummary", "Without the summary, muted", { summary: "none", tone: "muted" }]],
  facts: [{ sel: '[data-testid="step"]', n: 4 }, { sel: '[data-testid="payment"]', n: "@payments" }, { sel: '[data-testid="day"]', n: "@days" }, ...shown('[data-testid="aside"]', "summary", "aside", "none")],
  sample: { id: "checkout", title: c("checkout.title"), days: ref("days"), payments: ref("payments"), lines: ref("cart"), rows: ref("summary"), promos: ref("promos"), labels: c("checkout"), totals: c("totals") },
});

export const shopBlocks = [storehero, usp, zones, slots, delivery, locations, productinfo, cartpage, cartdrawer, checkout];
