// The items of the marketing blocks: one logo slot (LogoSlot), one key number (StatFigure) and one quote
// (QuoteCard). LogoRibbon, StatsBand and TestimonialGrid draw one per entry.
import { cn, cond, eq, ne, ref, text, tpl, use, when, organism } from "../../build";
import type { ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { layoutOf } from "../presets";
import { figureBlockOf } from "./landmarks";

const P = "pattern.";
/** one logo of the ribbon: a fixed slot (size from the preset) with a Lucide glyph; the name is for screen readers */
export const logoSlot = spec(`${P}logo-slot`, "LogoSlot", "One logo of a logo ribbon: a fixed-size slot with a Lucide glyph; the name is read by screen readers only.", {
  props: [{ name: "name", type: "string", required: true }, { name: "icon", type: "string", required: true }],
  view: [use("Box", { props: { Class: cn("flex shrink-0 items-center justify-center text-muted-foreground", layoutOf("logos.slot")) }, attrs: { "data-testid": "item", "data-slot": "logo-slot" } },
    use("LucideIcon", { props: { Name: ref("icon"), Size: layoutOf("logos.glyph") } }),
    use("Text", { props: { Size: "sm", Weight: "semibold", Class: "sr-only" } }, text(ref("name"))))],
});
/** one figure of StatsBand: a StatTile card, or the value over its label (with an icon) */
export const statFigure = spec(`${P}stat-figure`, "StatFigure", "One key number of StatsBand: a card (StatTile), or the value over its label, optionally under a Lucide icon.", {
  typeImports: [{ from: "StatsBand", names: ["Stat"] }],
  props: [
    { name: "stat", type: ts("Stat"), required: true },
    { name: "item", type: tsOf("plain", "card", "icon"), default: "plain" },
    { name: "align", type: tsOf("start", "center"), default: "center" },
  ],
  view: [when(eq(ref("item"), "card"),
    [organism("StatTile", { label: ref("stat.label"), value: ref("stat.value"), icon: ref("stat.icon"), hint: ref("stat.hint") })],
    // Column gap 24; figure row height 72; caption 12
    [use("Stack", {
      props: { Gap: "6", Align: cond(eq(ref("align"), "center"), "center", "start"), Class: cn(cond(eq(ref("align"), "center"), "text-center", ""), layoutOf("stats.column")) },
      attrs: { "data-testid": "item" },
    },
      when(eq(ref("item"), "icon"), [use("LucideIcon", { props: { Name: ref("stat.icon"), Size: 24 } })]),
      // the figure and its label read as one: 8px apart, the label at body size under the figure
      use("Stack", { props: { Gap: "2", Align: cond(eq(ref("align"), "center"), "center", "start") } },
        use("Text", { props: { Size: "5xl", Weight: "medium", Class: cn("flex items-center", layoutOf("stats.figure")) } }, text(ref("stat.value"))),
        use("Text", { props: { Size: "sm", Weight: "semibold", Class: "leading-5 text-muted-foreground" } }, text(ref("stat.label")))))])],
});

export const quoteCardView = (): ViewNode => {
  const social = eq(ref("item.kind"), "social");
  const cardLike = cond(eq(ref("item.kind"), "plain"), "", "rounded p-6 inset-ring inset-ring-border bg-card");
  const sizeFor = cond(eq(ref("layout"), "masonry"), "mb-4 break-inside-avoid", cond(eq(ref("layout"), "strip"), "w-80 shrink-0 snap-start", "h-full"));
  const avatar = when(ne(ref("item.avatar"), "none"), [organism("MediaFrame", { alt: ref("q.author"), ratio: "1/1", className: "size-12 shrink-0 rounded-full" })]);
  const rating = when(ne(ref("item.rating"), "hide"), [organism("Rating", { value: ref("q.rating"), label: tpl(ref("labels.rating"), ref("q.rating")), size: 16 })]);
  return figureBlockOf(cn("m-0 flex flex-col gap-4", cardLike, sizeFor), "item",
    when(social,
      [use("Group", { props: { Gap: "4", Align: "center" } }, avatar,
        use("Stack", { props: { Gap: "0" } },
          use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("q.author"))),
          use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(tpl(ref("labels.handleLine"), ref("q.handle"), ref("q.time"))))),
        use("LucideIcon", { props: { Name: "message-circle", Size: 16, Class: "ml-auto text-muted-foreground" } })),
       use("Text", { props: { Size: "base" } }, text(ref("q.quote")))],
      [rating,
       when(eq(ref("item.mark"), "icon"), [use("Inline", { props: { Class: "text-muted-foreground" }, attrs: { "data-testid": "mark" } }, use("LucideIcon", { props: { Name: ref("q.mark"), Size: 24 } }))]),
       use("Text", { props: { Size: cond(eq(ref("layout"), "single"), "xl", "base") } }, text(ref("q.quote"))),
       use("Group", { props: { Gap: "4", Align: "center" } }, avatar,
         use("Stack", { props: { Gap: "0" } },
           use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("q.author"))),
           use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(tpl(ref("labels.byLine"), ref("q.role"), ref("q.company"))))))]));
};

export const testimonialLayout = tsOf("grid", "single", "stack", "masonry", "strip");

/** one quote of TestimonialGrid: a card, a plain figure or a social post */
export const quoteCard = spec(`${P}quote-card`, "QuoteCard", "One customer quote of TestimonialGrid: a card, a plain figure or a social post, with the author's picture, the stars and a company glyph as `item` says.", {
  typeImports: [{ from: "TestimonialGrid", names: ["Quote", "QuoteLabels", "QuoteItem"] }],
  props: [
    { name: "q", type: ts("Quote"), required: true },
    { name: "labels", type: ts("QuoteLabels"), required: true, docs: "the templates of the lines around the quote" },
    { name: "item", type: ts("QuoteItem"), docs: "how the quote is drawn" },
    { name: "layout", type: testimonialLayout, default: "grid", docs: "the layout of the grid around it: the size of the card" },
  ],
  view: [quoteCardView()],
});
export const quoteCardOf = (): ViewNode => organism("QuoteCard", { q: ref("q"), labels: ref("labels"), item: ref("item"), layout: ref("layout") });
