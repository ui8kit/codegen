// Parts of QuoteSplit: the rating panel beside a quote, the logo tiles under it, and the figures above a grid of quotes.
import { eachAt, lt, ref, text, tpl, use, when, organism } from "../../build";
import { tsOf } from "../props";
import type { OrganismSpec, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { muted, surface } from "../ux";

const types = [{ from: "QuoteSplit", names: ["QuoteExtras"] }, { from: "TestimonialGrid", names: ["QuoteLabels"] }];
const extras = { name: "extras", type: ts("QuoteExtras"), required: true, docs: "the figures, logos and rating summary" };
/** the first `n` entries of a list */
const first = (list: string, as: string, n: number, node: ViewNode): ViewNode => eachAt(ref(list), as, "i", ref(`${as}.id`), when(lt(ref("i"), n), [node]));

export const quoteRatingPanel = spec("pattern.quote-rating-panel", "QuoteRatingPanel", "The rating summary of QuoteSplit: the average in large type, the stars, the number of reviews and two figures.", {
  typeImports: types,
  props: [extras, { name: "labels", type: ts("QuoteLabels"), required: true }],
  view: [use("Stack", { props: { Gap: "6", Align: "center", Class: surface("p-8 text-center") }, attrs: { "data-testid": "quote-rating" } },
    use("Text", { props: { Size: "5xl", Weight: "bold" } }, text(ref("extras.score"))),
    organism("Rating", { value: ref("extras.rating"), label: tpl(ref("labels.rating"), ref("extras.rating")), size: 20 }),
    muted(ref("extras.reviews")),
    use("Box", { props: { Class: "grid w-full grid-cols-2 gap-4 border-t border-border pt-6" } },
      first("extras.stats", "s", 2, use("Stack", { props: { Gap: "0", Align: "center" }, attrs: { "data-testid": "quote-stat" } },
        use("Text", { props: { Size: "2xl", Weight: "semibold" } }, text(ref("s.value"))), muted(ref("s.label"), "xs")))))],
});

export const quoteLogoTiles = spec("pattern.quote-logo-tiles", "QuoteLogoTiles", "Four customer names with their glyphs in tiles of two columns, under the quote of QuoteSplit.", {
  typeImports: types,
  props: [extras],
  view: [use("Box", { props: { Class: "grid grid-cols-2 gap-4" }, attrs: { "data-testid": "quote-logos" } },
    first("extras.logos", "l", 4, use("Group", { props: { Gap: "2", Align: "center", Justify: "center", Class: surface("p-4 text-muted-foreground") }, attrs: { "data-testid": "quote-logo" } },
      use("LucideIcon", { props: { Name: ref("l.icon"), Size: 20 } }), use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("l.name"))))))],
});

export const quoteFigures = spec("pattern.quote-figures", "QuoteFigures", "Three figures in a row above the quotes of QuoteSplit.", {
  typeImports: types,
  props: [extras],
  view: [use("Box", { props: { Class: "grid grid-cols-3 gap-4 border-b border-border pb-8" }, attrs: { "data-testid": "quote-figures" } },
    first("extras.stats", "s", 3, use("Stack", { props: { Gap: "0" }, attrs: { "data-testid": "quote-stat" } },
      use("Text", { props: { Size: "3xl", Weight: "bold" } }, text(ref("s.value"))), muted(ref("s.label"), "xs"))))],
});

export const quoteSlot = spec("pattern.quote-slot", "QuoteSlot", "One quote of QuoteSplit: a QuoteCard with the author's picture and the stars, as a card or a plain figure, in a box that can span grid rows.", {
  typeImports: [{ from: "TestimonialGrid", names: ["Quote", "QuoteLabels"] }],
  props: [
    { name: "q", type: ts("Quote"), required: true },
    { name: "labels", type: ts("QuoteLabels"), required: true },
    { name: "kind", type: tsOf("card", "plain"), default: "card" },
    { name: "layout", type: tsOf("grid", "single", "stack"), default: "grid" },
  ],
  className: true,
  view: [use("Box", { props: { Class: ref("className") }, attrs: { "data-testid": "quote" } },
    organism("QuoteCard", { q: ref("q"), labels: ref("labels"), item: { kind: ref("kind"), avatar: "image", rating: "show", mark: "none" }, layout: ref("layout") }))],
});

export const quoteSplitParts: OrganismSpec[] = [quoteRatingPanel, quoteLogoTiles, quoteFigures, quoteSlot];
