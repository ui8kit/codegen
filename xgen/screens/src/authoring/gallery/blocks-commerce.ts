// Commerce blocks: the storefront, from categories to order history.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const categories = define({
  key: "categories", theme: "commerce", group: "catalog", name: "Category navigation", docs: "Categories as chips, a bar, a side list, tiles, or chips under a toolbar.",
  organism: "CategoryNav", axes: ["layout", "count", "icon", "density"], data: [d.categories],
  variants: [
    ["chips", "Chips"],
    ["bar", "Bar with an underline", { layout: "bar" }],
    ["sidebar", "Side list", { layout: "sidebar" }],
    ["chipsPlain", "Chips, names only", { count: "hide", icon: "hide" }],
    ["barCompact", "Bar, compact, no icons", { layout: "bar", icon: "hide", density: "compact" }],
    ["tiles", "Tiles with a big icon", { layout: "tiles" }],
    ["toolbar", "Chips under a toolbar", { layout: "toolbar", icon: "hide" }],
  ],
  sample: { label: t("commerce.nav.label"), categories: ref("categories"), current: "category-all", tools: t("commerce.tools") },
});

const products = define({
  key: "products", theme: "commerce", group: "catalog", name: "Product grid", docs: "Products as cards in a grid, a list or a rail that scrolls sideways.",
  organism: "ProductGrid", axes: ["layout", "cols", "ratio", "rating", "action", "tone", "density"], data: [d.products],
  variants: [
    ["grid3", "Grid, three columns"],
    ["grid4", "Grid, four columns, square pictures", { cols: "1-4", ratio: "1/1" }],
    ["grid2", "Grid, two columns, tall pictures", { cols: "1-2", ratio: "3/4" }],
    ["list", "List of horizontal cards", { layout: "list" }],
    ["catalog", "Compact catalog, no rating", { cols: "1-4", ratio: "1/1", rating: "hide", density: "compact" }],
    ["browse", "Browse only, muted", { action: "none", tone: "muted" }],
    ["showcase", "Showcase, tall pictures, roomy", { ratio: "3/4", density: "roomy" }],
    ["rail", "Rail that scrolls sideways", { layout: "rail" }],
    ["railCompact", "Rail, square pictures, compact", { layout: "rail", ratio: "1/1", rating: "hide", density: "compact" }],
  ],
  sample: { id: "products", title: t("commerce.products.title"), products: ref("products"), labels: t("commerce.productLabels"), badges: t("commerce.badges") },
});

const product = define({
  key: "product", theme: "commerce", group: "product", name: "Product page", docs: "The gallery and the buy box of one product.",
  organism: "ProductDetail", axes: ["layout", "mediaSide", "thumbs", "buy", "tone", "density"], data: [d.products],
  variants: [
    ["split", "Gallery at the start, thumbnails"],
    ["splitEnd", "Gallery at the end", { mediaSide: "end" }],
    ["stacked", "Stacked, no thumbnails", { layout: "stacked", thumbs: "none" }],
    ["compact", "Compact buy box", { buy: "compact", thumbs: "none" }],
    ["muted", "Muted, roomy", { tone: "muted", density: "roomy" }],
  ],
  sample: { id: "product", product: { op: "pick", args: [ref("products"), "product-lamp"] }, labels: t("commerce.detail"), badges: t("commerce.badges") },
});

const reviews = define({
  key: "reviews", theme: "commerce", group: "product", name: "Reviews", docs: "Customer reviews with ratings.",
  organism: "ReviewList", axes: ["layout", "item", "avatar", "tone", "density"], data: [d.reviews],
  variants: [
    ["list", "List of cards"],
    ["grid", "Grid of cards", { layout: "grid" }],
    ["plain", "Plain entries", { item: "plain" }],
    ["avatars", "With avatars", { avatar: "image" }],
    ["mutedGrid", "Muted grid with avatars", { layout: "grid", avatar: "image", tone: "muted", density: "roomy" }],
  ],
  sample: { id: "reviews", title: t("commerce.reviews.title"), reviews: ref("reviews"), labels: t("commerce.reviewLabels") },
});

const cart = define({
  key: "cart", theme: "commerce", group: "checkout", name: "Cart", docs: "The lines of a cart as a table or as cards.",
  organism: "CartList", axes: ["layout", "media", "tone", "density"], data: [d.cart],
  variants: [
    ["table", "Table"],
    ["cards", "Cards", { layout: "cards" }],
    ["tableCompact", "Compact table, no pictures", { media: "none", density: "compact" }],
    ["cardsPlain", "Cards, no pictures, muted", { layout: "cards", media: "none", tone: "muted" }],
  ],
  sample: { id: "cart", title: t("commerce.cart.title"), lines: ref("cart"), empty: t("empty.cart"), labels: t("commerce.cart") },
});

const summary = define({
  key: "summary", theme: "commerce", group: "checkout", name: "Order summary", docs: "Subtotal, shipping, tax and the total.",
  organism: "OrderSummary", axes: ["layout", "cta", "note", "tone", "density"], data: [d.summary],
  variants: [
    ["card", "Card with a checkout button"],
    ["plain", "Plain, without a note", { layout: "plain", note: "hide" }],
    ["noCta", "Card without a button", { cta: "hide" }],
    ["muted", "Muted", { tone: "muted", density: "compact" }],
  ],
  sample: { id: "summary", title: t("commerce.summary.title"), rows: ref("summary"), empty: t("empty.summary"), labels: t("commerce.summary") },
});

const orders = define({
  key: "orders", theme: "commerce", group: "account", name: "Order history", docs: "Past orders with status.",
  organism: "OrderTable", axes: ["layout", "pager", "tone", "density"], data: [d.orders],
  variants: [
    ["table", "Table with a pager"],
    ["cards", "Cards", { layout: "cards" }],
    ["noPager", "Table without a pager", { pager: "hide" }],
    ["compactMuted", "Compact, muted", { tone: "muted", density: "compact", pager: "hide" }],
  ],
  sample: { id: "orders", title: t("commerce.orders.title"), orders: ref("orders"), empty: t("empty.orders"), statuses: t("status"), labels: t("commerce.orders") },
});

export const commerceBlocks = [categories, products, product, reviews, cart, summary, orders];
