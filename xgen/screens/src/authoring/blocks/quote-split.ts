// Testimonials beside something or with figures: one quote beside a picture, a rating panel or over logo tiles; stacked quotes beside a
// picture; four compact quotes; or figures over a featured quote and a stack.
import { and, cond, eachAt, eq, lt, or, ref, undef, use, when, organism } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, tsOf, toneLite } from "../props";

const quoteSplit = spec("organism.quote-split", "QuoteSplit", "Testimonials in a split or with figures. Axes: layout (media: one quote card and an action beside a picture, logos: one quote over four logo tiles beside a picture, rating: one quote beside a rating panel, stack: three stacked quote cards beside a picture, compact: four short quote cards in a row, bento: figures over a featured quote beside a stack), mediaSide, tone.", {
  typeImports: [{ from: "TestimonialGrid", names: ["Quote", "QuoteLabels"] }, { from: "StatsBand", names: ["Stat"] }, { from: "LogoCloud", names: ["Logo"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: { QuoteExtras: fields(["stats", "Stat[]"], ["logos", "Logo[]"], ["rating", "number"], ["score", "string"], ["reviews", "string"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "quotes", type: ts("Quote[]"), required: true },
    { name: "labels", type: ts("QuoteLabels"), required: true },
    { name: "extras", type: { record: "QuoteExtras" }, required: true },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "layout", type: tsOf("media", "logos", "rating", "stack", "compact", "bento"), default: "media" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
    empty,
  ],
  view: (() => {
    const card = (kind: Value, layout: Value, cls: Value = ""): ViewNode => organism("QuoteSlot", { q: ref("q"), labels: ref("labels"), kind, layout, className: cls });
    const firstQuotes = (n: number, node: ViewNode): ViewNode => eachAt(ref("quotes"), "q", "i", ref("q.id"), when(lt(ref("i"), n), [node]));
    const actions = organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" });
    const common = { id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone"), density: "default" };
    const split = { ...common, layout: "split", hasMedia: true, mediaSide: ref("mediaSide") };
    const picture = organism("MediaFrame", { alt: ref("title"), ratio: "4/3" });
    const is = (l: string) => eq(ref("layout"), l);
    const one = or(is("media"), is("logos"), is("rating"));
    return [orEmpty("quotes", "quote", [
      when(or(is("compact"), is("bento")), [frame(common, [
        when(is("bento"), [organism("QuoteFigures", { extras: ref("extras") })]),
        use("Box", { props: { Class: cond(is("bento"), "grid grid-cols-1 gap-4 lg:grid-cols-2", "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4") } },
          eachAt(ref("quotes"), "q", "i", ref("q.id"), card("card", cond(and(is("bento"), eq(ref("i"), 0)), "single", "grid"), cond(and(is("bento"), eq(ref("i"), 0)), "lg:row-span-3", "")))),
      ])], [frame(split, [
        when(one, [firstQuotes(1, card(cond(is("media"), "card", "plain"), "single"))]),
        when(is("logos"), [organism("QuoteLogoTiles", { extras: ref("extras") })]),
        when(is("stack"), [use("Stack", { props: { Gap: "4", Align: "stretch" } }, firstQuotes(3, card("card", "stack")))]),
        when(one, [actions]),
      ], [when(is("rating"), [organism("QuoteRatingPanel", { extras: ref("extras"), labels: ref("labels") })], [picture])])]),
    ], (n) => [frame(common, n)])];
  })(),
});

export const quoteSplitOrganisms: OrganismSpec[] = [quoteSplit];
