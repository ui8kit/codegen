// Parts of ProductDetail: the price line (price, old price, badge) and the gallery (the featured picture and thumbnails).
import { and, eq, gt, money, ref, text, use, when, organism } from "../../build";
import { spec } from "../kit";
import { tsOf } from "../props";

/** the price line of ProductDetail: the price, the old price struck through, the badge */
export const productPrice = spec("pattern.product-price", "ProductPrice", "The price line of a product page: the price (integer minor units in the currency), the old price (compare_at) struck through when higher, and the badge.", {
  props: [
    { name: "price", type: "number", required: true, docs: "integer minor units" },
    { name: "compareAt", type: "number", docs: "the old price, same currency; shown only when higher than the price" },
    { name: "currency", type: "string", required: true },
    { name: "badge", type: "string", default: "", docs: "the label of the badge; empty: none" },
    { name: "was", type: "string", required: true, docs: "the screen reader word before the old price" },
  ],
  view: [use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" } },
    use("Text", { props: { Size: "4xl", Weight: "bold" } }, text(money(ref("price"), ref("currency")))),
    // relative: the sr-only "Was" stays inside the old price
    when(and(ref("compareAt"), gt(ref("compareAt"), ref("price"))), [use("Text", { props: { Tag: "del", Size: "lg", Class: "relative text-muted-foreground" }, attrs: { "data-testid": "compare-at" } },
      use("Inline", { props: { Class: "sr-only" } }, text(ref("was"))), text(money(ref("compareAt"), ref("currency"))))]),
    when(ref("badge"), [use("Badge", { props: { Variant: "default", Size: "default" } }, text(ref("badge")))]))],
});

/** the gallery of ProductDetail: the featured picture and the thumbnails */
export const productGallery = spec("pattern.product-gallery", "ProductGallery", "The gallery of a product page: the picture (the file of the product's featured media, a placeholder without one) and optional thumbnails below.", {
  props: [
    { name: "name", type: "string", required: true, docs: "the product name: the alternative text" },
    { name: "image", type: "string", docs: "the file of the featured media; none: the placeholder" },
    { name: "thumbs", type: tsOf("none", "below"), default: "below" },
  ],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "gallery" } },
    organism("MediaFrame", { alt: ref("name"), src: ref("image"), ratio: "1/1" }),
    // thumbnails: the featured picture first; the entry has no further media (no gallery field in the kind), so the others stay placeholders
    when(eq(ref("thumbs"), "below"), [use("Grid", { props: { Cols: "3", Class: "gap-4" }, attrs: { "data-testid": "thumbs" } },
      organism("MediaFrame", { alt: ref("name"), src: ref("image"), ratio: "1/1", className: "ring-2 ring-foreground" }),
      organism("MediaFrame", { alt: ref("name"), ratio: "1/1" }),
      organism("MediaFrame", { alt: ref("name"), ratio: "1/1" }))]))],
});
