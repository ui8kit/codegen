// Commerce organisms: category navigation, product card and grid, product page, reviews, cart, order summary, order history.
import { and, at, call, cn, coalesce, cond, each, eq, gt, len, mul, not, money, or, ref, str, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { cardBase, fields, groupFields, spec, ts } from "../kit";
import { frame, wide } from "../components/frames";
import { empty, id, ifAny, orEmpty, title, tone, tsOf, toneLite, denseLite, roomyLite } from "../props";
import { cartTable } from "../components/cart-table";
import { numberField } from "../components/number-field";
import { orderRows, statusTone } from "../components/orders";
import { articleBlockOf } from "../components/landmarks";
import { productGallery, productPrice } from "../components/product-parts";
import { currentOf, menuEntry } from "../components/nav";

const O = "organism.";
const common = { id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") };
/** children of an organism that takes `children` */
const kids = (...n: ViewNode[]) => ({ slots: { children: { args: [] as string[], do: n } } });

const Product = fields(["id", "string"], ["name", "string"], ["summary", "string"], ["price", "number"], ["currency", "string"], ["rating", "number"], ["reviews", "number"], ["badge", "string", true], ["category", "string"], ["inStock", "boolean"], ["compareAt", "number", true], ["href", "string", true], ["image", "string", true]);

const categoryNav = spec(`${O}category-nav`, "CategoryNav", "Navigation between product categories as chips, a bar with an underline, a side list, tiles with a big icon, or chips under a toolbar (search, sort and the number shown). The current one carries aria-current. Axes: layout (chips, bar, sidebar, tiles, toolbar), count (show, hide), icon (show, hide), density.", {
  records: {
    Category: fields(["id", "string"], ["name", "string"], ["icon", "string"], ["count", "number"], ["href", "string", true]),
    CategoryTools: groupFields(["search", "string", "label of the search field"], ["sort", "string", "label of the sort select"], ["sortValue", "string", "the chosen sort"], ["shown", "string", "how many products are shown"], ["query", "string", "the text in the search field", ""]),
  },
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the navigation" },
    { name: "categories", type: ts("Category[]"), required: true },
    { name: "current", type: "string", default: "all", docs: "id of the current category" },
    { name: "layout", type: tsOf("chips", "bar", "sidebar", "tiles", "toolbar"), default: "chips" },
    { name: "count", type: tsOf("show", "hide"), default: "show" },
    { name: "icon", type: tsOf("show", "hide"), default: "show" },
    { name: "density", type: denseLite, default: "default" },
    { name: "tools", type: { record: "CategoryTools" }, docs: "the toolbar layout: labels of the search, the sort and the number shown" },
  ],
  // the classes of a link per layout: its shape, and its look when it is the current category or another one
  derived: [
    { name: "chipLike", value: or(eq(ref("layout"), "chips"), eq(ref("layout"), "toolbar")) },
    { name: "tiles", value: eq(ref("layout"), "tiles") },
    { name: "linkShape", value: cond(ref("chipLike"), "inline-flex h-8 items-center gap-2 rounded px-3 inset-ring inset-ring-border", cond(eq(ref("layout"), "bar"), "inline-flex items-center gap-2 -mb-px border-b px-1 py-2", cond(ref("tiles"), "flex h-full flex-col items-start gap-4 rounded p-4 inset-ring inset-ring-border", "inline-flex w-full items-center gap-2 rounded px-3 py-2"))) },
    { name: "currentLook", value: cond(ref("chipLike"), "bg-primary text-primary-foreground", cond(eq(ref("layout"), "bar"), "border-foreground font-semibold", cond(ref("tiles"), "inset-ring-foreground font-semibold", "bg-muted font-semibold"))) },
    { name: "otherLook", value: cond(eq(ref("layout"), "bar"), "border-transparent", "") },
    { name: "listShape", value: cond(eq(ref("layout"), "sidebar"), "flex flex-col gap-2", cond(eq(ref("layout"), "bar"), "flex flex-wrap gap-2 gap-x-4 border-b border-border", cond(ref("tiles"), "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6", "flex flex-wrap gap-2"))) },
  ],
  view: [
    use("Block", { props: { Tag: "nav" }, attrs: { "aria-label": ref("label"), "data-testid": "category-nav", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, cond(eq(ref("density"), "compact"), "py-2", "py-4")) }, attrs: { "data-slot": "container" } },
        when(eq(ref("layout"), "toolbar"), [use("Group", { props: { Gap: "4", Align: "center", Class: "mb-4 flex-wrap" }, attrs: { "data-testid": "toolbar" } },
          organism("SearchField", { value: coalesce(ref("tools.query"), ""), label: coalesce(ref("tools.search"), ""), placeholder: ref("tools.search") }),
          use("Select", { props: { Name: "sort", Size: "sm", AriaLabel: ref("tools.sort"), Class: "w-48" } }, use("SelectOption", { props: { Value: "sort", Label: ref("tools.sortValue"), Selected: true } })),
          use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("tools.shown"))))]),
        ifAny("categories", [use("List", { props: { Tag: "ul", Class: ref("listShape") }, attrs: { "data-testid": "items" } },
          each(ref("categories"), "c", ref("c.id"),
            use("ListItem", {},
              // a category is a menu entry: a link only where the app routes menu items
              menuEntry(ref("c.href"), { cls: cn("text-sm", ref("linkShape"), cond(eq(ref("c.id"), ref("current")), ref("currentLook"), ref("otherLook"))), current: currentOf("c", ref("current")), testid: "item", block: true },
                when(eq(ref("icon"), "show"), [when(ref("tiles"),
                  [use("Inline", { props: { Class: "flex size-10 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref("c.icon"), Size: 20 } }))],
                  [use("LucideIcon", { props: { Name: ref("c.icon"), Size: 16 } })])]),
                use("Inline", {}, text(ref("c.name"))),
                when(eq(ref("count"), "show"), [use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(str(ref("c.count"))))])))))]))),
  ],
});

const productCard = spec(`${O}product-card`, "ProductCard", "A product as a card: picture, optional badge, category, name, rating, summary, price (and the old price struck through when `compareAt` is higher) and an add button. Axes: layout (vertical, horizontal), media (image, none), ratio, rating (show, hide), action (button, none), density.", {
  records: { Product, ProductLabels: fields(["add", "string"], ["soldOut", "string"], ["reviews", "string"], ["ratingLabel", "string"], ["was", "string"], ["empty", "string"]) },
  props: [
    { name: "product", type: { record: "Product" }, required: true },
    { name: "labels", type: { record: "ProductLabels" }, required: true },
    { name: "badges", type: ts("Record<string, string>"), required: true, docs: "badge word by product badge (new, sale)" },
    { name: "layout", type: tsOf("vertical", "horizontal"), default: "vertical" },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "ratio", type: tsOf("4/3", "1/1", "3/4"), default: "4/3" },
    { name: "rating", type: tsOf("show", "hide"), default: "show" },
    { name: "action", type: tsOf("button", "none"), default: "button" },
    { name: "density", type: tsOf("default", "compact"), default: "default" },
  ],
  events: [{ name: "add", args: [{ name: "id", type: "string" }], docs: "the add button was pressed" }],
  view: [
    use("Block", { props: { Tag: "article", Class: cn(cardBase(), "h-full gap-4 overflow-hidden", cond(eq(ref("layout"), "horizontal"), "flex flex-col sm:flex-row", "flex flex-col")) }, attrs: { "data-slot": "card", "data-testid": "item", "data-layout": ref("layout") } },
      when(eq(ref("media"), "image"), [
        use("Box", { props: { Class: cn("relative shrink-0", cond(eq(ref("layout"), "horizontal"), "sm:w-48", "")) } },
          organism("MediaFrame", { alt: ref("product.name"), src: ref("product.image"), ratio: ref("ratio"), className: "h-full" }),
          when(ref("product.badge"), [use("Badge", { props: { Variant: "default", Size: "default", Class: "absolute left-4 top-4" }, attrs: { "data-testid": "badge" } }, text(at(ref("badges"), ref("product.badge"))))])),
      ]),
      use("CardContent", { props: { Class: "flex flex-1 flex-col gap-2" } },
        use("Text", { props: { Size: "xs", Class: "uppercase tracking-wide text-muted-foreground" } }, text(ref("product.category"))),
        use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, when(ref("product.href"), [use("Link", { props: { Href: ref("product.href"), Variant: "default" }, attrs: { "data-testid": "open" } }, text(ref("product.name")))], [text(ref("product.name"))])),
        when(eq(ref("rating"), "show"), [use("Group", { props: { Gap: "2" } },
          organism("Rating", { value: ref("product.rating"), label: tpl(ref("labels.ratingLabel"), ref("product.rating")), size: 16 }),
          use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(tpl(ref("labels.reviews"), ref("product.reviews")))))]),
        when(eq(ref("density"), "default"), [use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("product.summary")))]),
        use("Group", { props: { Gap: "4", Justify: "between", Class: "mt-auto pt-2" } },
          use("Group", { props: { Gap: "2", Align: "baseline", Class: "flex-wrap" } },
            use("Text", { props: { Size: "xl", Weight: "bold" } }, text(money(ref("product.price"), ref("product.currency")))),
            // relative: the sr-only "Was" (absolute) stays inside the price, not at the far end of a scrolling row of cards
            when(and(ref("product.compareAt"), gt(ref("product.compareAt"), ref("product.price"))), [use("Text", { props: { Tag: "del", Size: "sm", Class: "relative text-muted-foreground" }, attrs: { "data-testid": "compare-at" } },
              use("Inline", { props: { Class: "sr-only" } }, text(ref("labels.was"))), text(money(ref("product.compareAt"), ref("product.currency"))))])),
          when(eq(ref("action"), "button"), [use("Button", { props: { Variant: cond(ref("product.inStock"), "default", "outline"), Size: "sm", Disabled: not(ref("product.inStock")) }, on: { click: call("emit.add", ref("product.id")) }, attrs: { "data-testid": "add" } },
            text(cond(ref("product.inStock"), ref("labels.add"), ref("labels.soldOut"))))])))),
  ],
});

const productGrid = spec(`${O}product-grid`, "ProductGrid", "A section with a heading and the products as cards in a grid, as a list of horizontal cards, or as a rail that scrolls sideways; an empty state when there are none. Axes: layout (grid, list, rail), columns, ratio, rating, action, tone, density.", {
  typeImports: [{ from: "ProductCard", names: ["Product", "ProductLabels"] }],
  props: [
    id, title,
    { name: "products", type: ts("Product[]"), required: true },
    { name: "labels", type: ts("ProductLabels"), required: true },
    { name: "badges", type: ts("Record<string, string>"), required: true },
    { name: "layout", type: tsOf("grid", "list", "rail"), default: "grid" },
    { name: "cols", type: tsOf("1-2", "1-3", "1-4"), default: "1-3" },
    { name: "ratio", type: tsOf("4/3", "1/1", "3/4"), default: "4/3" },
    { name: "rating", type: tsOf("show", "hide"), default: "show" },
    { name: "action", type: tsOf("button", "none"), default: "button" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: tsOf("roomy", "default", "compact"), default: "default" },
  ],
  events: [{ name: "add", args: [{ name: "id", type: "string" }], docs: "the add button of a product was pressed" }],
  view: (() => {
    const card = () => organism("ProductCard", { product: ref("p"), labels: ref("labels"), badges: ref("badges"), layout: cond(eq(ref("layout"), "list"), "horizontal", "vertical"), ratio: ref("ratio"), rating: ref("rating"), action: ref("action"), density: cond(eq(ref("density"), "compact"), "compact", "default") }, { on: { add: call("emit.add", ref("p.id")) } });
    // no products: the empty state (its text is the dictionary's labels.empty)
    return [frame(common, [when(eq(len(ref("products")), 0), [organism("EmptyState", { icon: "package", title: ref("labels.empty") })], [when(eq(ref("layout"), "rail"),
      [use("Box", { props: { Class: "flex snap-x gap-4 overflow-x-auto pb-4" }, attrs: { "data-testid": "items" } },
        each(ref("products"), "p", ref("p.id"), use("Box", { props: { Class: "w-64 shrink-0 snap-start" } }, card())))],
      [use("Grid", { props: { Cols: cond(eq(ref("layout"), "list"), "1", ref("cols")), Class: "gap-4" }, attrs: { "data-testid": "items" } },
        each(ref("products"), "p", ref("p.id"), card()))])])])];
  })(),
});

const productDetail = spec(`${O}product-detail`, "ProductDetail", "A product page: a gallery (the main picture and optional thumbnails) beside the buy box (badge, rating, price, stock, quantity, add button, shipping and returns notes). Axes: layout (split, stacked), media side, thumbs (none, below), buy (full, compact), tone, density.", {
  typeImports: [{ from: "ProductCard", names: ["Product"] }],
  records: { ProductDetailLabels: fields(["add", "string"], ["soldOut", "string"], ["inStock", "string"], ["qty", "string"], ["decrease", "string"], ["increase", "string"], ["reviews", "string"], ["ratingLabel", "string"], ["shipping", "string"], ["returns", "string"], ["was", "string"], ["empty", "string"]) },
  props: [
    id,
    { name: "product", type: ts("Product"), docs: "the product; without one, the empty state (labels.empty)" },
    { name: "labels", type: { record: "ProductDetailLabels" }, required: true },
    { name: "badges", type: ts("Record<string, string>"), required: true },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "mediaSide", type: tsOf("start", "end"), default: "start" },
    { name: "thumbs", type: tsOf("none", "below"), default: "below" },
    { name: "buy", type: tsOf("full", "compact"), default: "full" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: roomyLite, default: "default" },
  ],
  events: [{ name: "add", args: [{ name: "id", type: "string" }], docs: "the add button was pressed" }],
  view: [when(not(ref("product")), [frame({ id: ref("id"), title: "", tone: ref("tone"), density: ref("density") }, [organism("EmptyState", { icon: "package", title: ref("labels.empty") })])], [frame(
    { id: ref("id"), title: ref("product.name"), lead: ref("product.summary"), level: ref("level"), layout: cond(eq(ref("layout"), "split"), "split", "stack"), hasMedia: true, mediaSide: ref("mediaSide"), mediaAlign: "start", tone: ref("tone"), density: ref("density") },
    [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "buy-box" } },
      // the category: the name of the product's term (taxonomy product_category)
      when(ref("product.category"), [use("Text", { props: { Size: "xs", Class: "uppercase tracking-wide text-muted-foreground" }, attrs: { "data-testid": "category" } }, text(ref("product.category")))]),
      organism("ProductPrice", { price: ref("product.price"), compareAt: ref("product.compareAt"), currency: ref("product.currency"), badge: cond(ref("product.badge"), at(ref("badges"), ref("product.badge")), ""), was: ref("labels.was") }),
      use("Group", { props: { Gap: "2" } },
        organism("Rating", { value: ref("product.rating"), label: tpl(ref("labels.ratingLabel"), ref("product.rating")), size: 16 }),
        use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("labels.reviews"), ref("product.reviews"))))),
      use("Text", { props: { Size: "sm", Weight: "medium", Class: cond(ref("product.inStock"), "text-foreground", "text-destructive") }, attrs: { "data-testid": "stock" } },
        text(cond(ref("product.inStock"), ref("labels.inStock"), ref("labels.soldOut")))),
      use("Group", { props: { Gap: "4", Class: "flex-wrap" } },
        when(eq(ref("buy"), "full"), [organism("NumberField", { value: "1", name: tpl("{0}-qty", ref("id")), min: "1", label: ref("labels.qty"), decrease: ref("labels.decrease"), increase: ref("labels.increase") })]),
        use("Button", { props: { Disabled: not(ref("product.inStock")) }, on: { click: call("emit.add", ref("product.id")) }, attrs: { "data-testid": "add" } }, text(ref("labels.add")))),
      when(eq(ref("buy"), "full"), [use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2 text-sm text-muted-foreground" } },
        use("ListItem", { props: { Class: "flex items-center gap-2" } }, use("LucideIcon", { props: { Name: "truck", Size: 16 } }), use("Inline", {}, text(ref("labels.shipping")))),
        use("ListItem", { props: { Class: "flex items-center gap-2" } }, use("LucideIcon", { props: { Name: "shield-check", Size: 16 } }), use("Inline", {}, text(ref("labels.returns")))))]))],
    [organism("ProductGallery", { name: ref("product.name"), image: ref("product.image"), thumbs: ref("thumbs") })])])],
});

const reviewList = spec(`${O}review-list`, "ReviewList", "Customer reviews as cards or plain entries: rating, title, text, author and date. Axes: layout (list, grid), columns, item (card, plain), avatar (none, image), tone, density.", {
  records: { Review: fields(["id", "string"], ["title", "string"], ["author", "string"], ["rating", "number"], ["text", "string"], ["date", "string"]), ReviewLabels: fields(["ratingLabel", "string"], ["empty", "string"]) },
  props: [
    id, title,
    { name: "reviews", type: ts("Review[]"), required: true },
    { name: "labels", type: { record: "ReviewLabels" }, required: true },
    { name: "layout", type: tsOf("list", "grid"), default: "list" },
    { name: "item", type: tsOf("card", "plain"), default: "card" },
    { name: "avatar", type: tsOf("none", "image"), default: "none" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: roomyLite, default: "default" },
  ],
  view: [frame({ ...common, measure: cond(eq(ref("layout"), "list"), "2xl", "default") }, [
    // no reviews: the empty state (labels.empty)
    when(eq(len(ref("reviews")), 0), [organism("EmptyState", { icon: "message-square-quote", title: ref("labels.empty") })]),
    use("Grid", { props: { Cols: cond(eq(ref("layout"), "grid"), "1-3", "1"), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("reviews"), "r", ref("r.id"),
        articleBlockOf(cn("flex h-full flex-col gap-4", cond(eq(ref("item"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "border-b border-border pb-4")), "item",
          organism("Rating", { value: ref("r.rating"), label: tpl(ref("labels.ratingLabel"), ref("r.rating")), size: 16 }),
          use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, text(ref("r.title"))),
          use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("r.text"))),
          use("Group", { props: { Gap: "4", Align: "center", Class: "mt-auto" } },
            when(eq(ref("avatar"), "image"), [organism("MediaFrame", { alt: ref("r.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" })]),
            use("Stack", { props: { Gap: "0" } },
              use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("r.author"))),
              use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("r.date")))))))),
  ])],
});

const cartList = spec(`${O}cart-list`, "CartList", "The lines of a cart as a table or as cards: product, variant, price, quantity, line total and a remove button. Axes: layout (table, cards), media (image, none), density, tone.", {
  records: { CartLine: fields(["id", "string"], ["name", "string"], ["variant", "string"], ["price", "number"], ["currency", "string"], ["qty", "number"]), CartLabels: fields(["caption", "string"], ["product", "string"], ["price", "string"], ["qty", "string"], ["total", "string"], ["remove", "string"], ["subtotal", "string"], ["checkout", "string"], ["decrease", "string"], ["increase", "string"]) },
  props: [
    id, title,
    { name: "lines", type: ts("CartLine[]"), required: true },
    empty,
    { name: "labels", type: { record: "CartLabels" }, required: true },
    { name: "layout", type: tsOf("table", "cards"), default: "table" },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  events: [{ name: "remove", args: [{ name: "id", type: "string" }], docs: "the remove button of a line was pressed" }],
  view: [frame(common, [orEmpty("lines", "shopping-cart", [
    when(eq(ref("layout"), "table"),
      [organism("CartTable", { field: tpl("{0}-qty", ref("id")), lines: ref("lines"), labels: ref("labels"), media: ref("media"), density: ref("density") }, { on: { remove: call("emit.remove", ref("arg")) } })],
      [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "cart-cards" } },
        each(ref("lines"), "line", ref("line.id"),
          use("Card", { props: { Variant: "default" }, attrs: { "data-testid": "item" } },
            use("CardContent", { props: { Class: "flex flex-wrap items-center gap-4" } },
              when(eq(ref("media"), "image"), [organism("MediaFrame", { alt: ref("line.name"), ratio: "1/1", className: "size-16 shrink-0" })]),
              use("Stack", { props: { Gap: "0", Class: "min-w-40 flex-1" } },
                use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("line.name"))),
                use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("line.variant"))),
                use("Text", { props: { Size: "sm" } }, text(money(ref("line.price"), ref("line.currency"))))),
              organism("NumberField", { value: str(ref("line.qty")), name: tpl("{0}-qty-{1}", ref("id"), ref("line.id")), min: "1", label: ref("labels.qty"), decrease: ref("labels.decrease"), increase: ref("labels.increase") }),
              use("Text", { props: { Size: "base", Weight: "bold" } }, text(money(mul(ref("line.price"), ref("line.qty")), ref("line.currency")))),
              use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", AriaLabel: ref("labels.remove") }, on: { click: call("emit.remove", ref("line.id")) }, attrs: { "data-testid": "remove" } }, use("LucideIcon", { props: { Name: "x", Size: 16 } }))))))]),])
  ])],
});

const orderSummary = spec(`${O}order-summary`, "OrderSummary", "The totals of an order: subtotal, shipping, tax and the total, with a checkout button and a note. Axes: layout (card, plain), cta (show, hide), note (show, hide), density, tone.", {
  records: { SummaryRow: fields(["id", "string"], ["label", "string"], ["amount", "number"], ["currency", "string"], ["strong", "boolean"]), SummaryLabels: fields(["checkout", "string"], ["note", "string"]) },
  props: [
    id, title,
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    empty,
    { name: "labels", type: { record: "SummaryLabels" }, required: true },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
    { name: "cta", type: tsOf("show", "hide"), default: "show" },
    { name: "note", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ ...common, measure: "md" }, [orEmpty("rows", "receipt", [
    use("Box", { props: { Class: cn(cond(eq(ref("layout"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "")) }, attrs: { "data-testid": "summary" } },
      use("Stack", { props: { Gap: "4", Align: "stretch" } },
        use("List", { props: { Tag: "ul", Class: "flex flex-col gap-4" } },
          each(ref("rows"), "row", ref("row.id"),
            use("ListItem", { props: { Class: cn("flex items-center justify-between gap-4", cond(ref("row.strong"), "border-t border-border pt-4 text-base font-bold", "text-sm text-muted-foreground")) }, attrs: { "data-testid": "item" } },
              use("Inline", {}, text(ref("row.label"))), use("Inline", {}, text(money(ref("row.amount"), ref("row.currency"))))))),
        when(eq(ref("cta"), "show"), [use("Button", { props: { Variant: "default", Size: "default", Class: "w-full" }, attrs: { "data-testid": "checkout" } }, text(ref("labels.checkout")))]),
        when(eq(ref("note"), "show"), [use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("labels.note")))]))),])
  ])],
});

const orderTable = spec(`${O}order-table`, "OrderTable", "The order history as a table or as cards: number, date, items, total and a status pill, with an optional pager. Axes: layout (table, cards), pager (show, hide), tone, density.", {
  records: { Order: fields(["id", "string"], ["number", "string"], ["date", "string"], ["total", "number"], ["currency", "string"], ["status", "string"], ["items", "number"]), OrderLabels: fields(["caption", "string"], ["number", "string"], ["date", "string"], ["items", "string"], ["total", "string"], ["status", "string"], ["itemsCount", "string"], ["summary", "string"], ["previous", "string"], ["next", "string"]) },
  props: [
    id, title,
    { name: "orders", type: ts("Order[]"), required: true },
    empty,
    { name: "statuses", type: ts("Record<string, string>"), required: true, docs: "word by order status" },
    { name: "labels", type: { record: "OrderLabels" }, required: true },
    { name: "layout", type: tsOf("table", "cards"), default: "table" },
    { name: "pager", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(common, [orEmpty("orders", "package", [
    use("Stack", { props: { Gap: "4", Align: "stretch" } },
      when(eq(ref("layout"), "table"),
        [organism("OrderRows", { orders: ref("orders"), statuses: ref("statuses"), labels: ref("labels"), density: ref("density") })],
        [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "order-cards" } },
          each(ref("orders"), "o", ref("o.id"),
            use("Card", { props: { Variant: "default" }, attrs: { "data-testid": "item" } },
              use("CardContent", { props: { Class: "flex flex-wrap items-center justify-between gap-4" } },
                use("Stack", { props: { Gap: "0" } },
                  use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("o.number"))),
                  use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("o.date")))),
                use("Text", { props: { Size: "sm" } }, text(tpl(ref("labels.itemsCount"), ref("o.items")))),
                use("Text", { props: { Size: "sm", Weight: "bold" } }, text(money(ref("o.total"), ref("o.currency")))),
                organism("Pill", { tone: statusTone }, kids(text(at(ref("statuses"), ref("o.status")))))))))]),
      when(eq(ref("pager"), "show"), [organism("Pager", { page: 1, pages: 3, summary: tpl(ref("labels.summary"), 1, 4, 12), previousLabel: ref("labels.previous"), nextLabel: ref("labels.next") })])),])
  ])],
});

export const commerceOrganisms: OrganismSpec[] = [orderRows, categoryNav, productCard, productGrid, productDetail, productPrice, productGallery, reviewList, numberField, cartTable, cartList, orderSummary, orderTable];
