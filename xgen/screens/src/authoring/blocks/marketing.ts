// More marketing organisms: logo cloud, stats band, testimonials, steps. Each is a SectionFrame with a collection laid out by axes.
// logos.row strip geometry from the default preset.
import { cn, cond, eachAt, each, eq, ne, or, add, op, ref, text, str, undef, use, when, organism, len } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { fields, groupFields, rec, requireFields, spec, ts } from "../kit";
import { behind, frame } from "../components/frames";
import { density, empty, id, orEmpty, title, tone, tsOf } from "../props";
import { fluidCols } from "../ux";
import { layoutOf } from "../presets";
import { logoSlot, statFigure, testimonialLayout, quoteCard, quoteCardOf } from "../components/marketing";

const O = "organism.";
const common = { id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") };

const logoItem = (): ViewNode => use("Group", { props: { Gap: "2", Align: "center", Justify: "center", Class: cn("text-muted-foreground", cond(eq(ref("item"), "tile"), "flex-col rounded p-4 inset-ring inset-ring-border", "")) }, attrs: { "data-testid": "item" } },
  use("LucideIcon", { props: { Name: ref("logo.icon"), Size: 24 } }),
  use("Text", { props: { Size: "sm", Weight: "semibold", Class: cond(eq(ref("item"), "icon"), "sr-only", "") } }, text(ref("logo.name"))));

/** logo ribbon: a heading over one row of fixed slots, sizes from the preset */
const logoRibbon = spec(`${O}logo-ribbon`, "LogoRibbon", "A heading over one centered row of logo slots (LogoSlot); the row and slot sizes come from the default preset.", {
  typeImports: [{ from: "LogoCloud", names: ["Logo"] }],
  props: [id, title, { name: "logos", type: ts("Logo[]"), required: true }, { name: "tone", type: tone, default: "default" }, { name: "density", type: density, default: "default" }],
  view: [frame({ id: ref("id"), title: "", tone: ref("tone"), density: ref("density"), measure: "fill", align: "center", className: "py-0" }, [
    use("Stack", { props: { Gap: "6", Align: "center" }, attrs: { "data-testid": "logos-block" } },
      use("Title", { props: { As: 2, Size: "xl", Weight: "semibold", Class: "leading-7" }, attrs: { id: op("add", ref("id"), "-title") } }, text(ref("title"))),
      use("Group", { props: { Gap: "0", Justify: "center", Align: "start", Class: cn("flex w-full flex-wrap", layoutOf("logos.row")) }, attrs: { "data-testid": "items" } },
        each(ref("logos"), "logo", ref("logo.id"), organism("LogoSlot", { name: ref("logo.name"), icon: ref("logo.icon") }))))])],
});

const logoCloud = spec(`${O}logo-cloud`, "LogoCloud", "A heading and the names of customers or partners as Lucide glyphs with a name. Axes: layout (grid, row), columns (2, 3, 4), item (name, icon only, tile), density, tone.", {
  records: { Logo: fields(["id", "string"], ["name", "string"], ["icon", "string"]) },
  props: [
    id, title,
    { name: "logos", type: ts("Logo[]"), required: true },
    empty,
    { name: "layout", type: tsOf("grid", "row"), default: "grid" },
    { name: "cols", type: tsOf("2", "3", "4"), default: "4" },
    { name: "item", type: tsOf("name", "icon", "tile"), default: "name" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  view: [orEmpty("logos", "building-2", [when(eq(ref("layout"), "row"),
    [organism("LogoRibbon", { id: ref("id"), title: ref("title"), logos: ref("logos"), tone: ref("tone"), density: ref("density") })],
    [frame({ ...common, align: "center" }, [
      use("Grid", { props: { Cols: fluidCols(ref("cols")), Class: "gap-4" }, attrs: { "data-testid": "items" } }, each(ref("logos"), "logo", ref("logo.id"), logoItem()))])])],
    (n) => [frame({ ...common, align: "center" }, n)])],
});

const statsBand = spec(`${O}stats-band`, "StatsBand", "Key numbers in a row or grid: plain figures, cards (StatTile) or figures with an icon. Axes: columns (2, 3, 4), item (plain, card, icon), surface (none, image, panel: one rounded card), align, density, tone. Title may be empty.", {
  records: { Stat: fields(["id", "string"], ["label", "string"], ["value", "string"], ["icon", "string"], ["hint", "string"]) },
  props: [
    id,
    { name: "title", type: "string", default: "" },
    { name: "stats", type: ts("Stat[]"), required: true },
    { name: "empty", type: "string", default: "", docs: "the text of the empty state (no figures), from the dictionary" },
    { name: "cols", type: tsOf("2", "3", "4"), default: "4" },
    { name: "layout", type: tsOf("row", "stack"), default: "row", docs: "stack: one narrow column of figures, for a sidebar" },
    { name: "surface", type: tsOf("none", "image", "panel"), default: "none", docs: "image: picture behind; panel: one rounded card" },
    { name: "item", type: tsOf("plain", "card", "icon"), default: "plain" },
    { name: "align", type: tsOf("start", "center"), default: "center" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  view: (() => {
    const item = organism("StatFigure", { stat: ref("stat"), item: ref("item"), align: ref("align") });
    // panel: one rounded card, figures in the columns of `cols`
    const panel = use("Grid", {
      props: { Cols: fluidCols(ref("cols")), Class: cn("w-full items-center bg-muted px-6", layoutOf("stats.panel")) },
      attrs: { "data-testid": "items" },
    }, each(ref("stats"), "stat", ref("stat.id"), item));
    const grid = use("Grid", {
      props: { Cols: cond(eq(ref("layout"), "stack"), "1", fluidCols(ref("cols"))), Class: "gap-6" },
      attrs: { "data-testid": "items" },
    }, each(ref("stats"), "stat", ref("stat.id"), item));
    const main = frame({
      ...common, align: ref("align"), measure: cond(eq(ref("surface"), "panel"), "fill", cond(eq(ref("layout"), "stack"), "xs", "default")),
      density: ref("density"),
      className: cn(cond(eq(ref("surface"), "image"), "bg-transparent", ""), cond(eq(ref("surface"), "panel"), "py-0", "")),
    }, [when(eq(len(ref("stats")), 0), [organism("EmptyState", { icon: "chart-column", title: ref("empty") })], [when(eq(ref("surface"), "panel"), [panel], [grid])])]);
    return [behind(cond(eq(ref("surface"), "image"), "image", "none"), ref("title"), main)];
  })(),
});

const testimonials = spec(`${O}testimonial-grid`, "TestimonialGrid", "Customer quotes as cards, plain figures or social posts, in a grid, a masonry, a scroll strip, one featured quote or one narrow column. Axes: layout (grid, single, stack, masonry, strip), columns, item kind (card, plain, social), item avatar, item rating, item mark (a company glyph), density, tone. A carousel is the Carousel port contract around the single layout.", {
  records: {
    Quote: fields(["id", "string"], ["author", "string"], ["role", "string"], ["company", "string"], ["quote", "string"], ["rating", "number"], ["handle", "string"], ["time", "string"], ["mark", "string"]),
    QuoteLabels: requireFields(groupFields(
      ["rating", "string", "template of the rating's accessible name, e.g. `{0} out of 5`"],
      ["byLine", "string", "template of the line under the author, e.g. `{0}, {1}` (role, company)"],
      ["handleLine", "string", "template of the line under a social author, e.g. `{0} / {1}` (handle, time)"]), "rating", "byLine", "handleLine"),
    QuoteItem: groupFields(["kind", tsOf("card", "plain", "social"), "card: boxed; plain: a bare figure; social: a post of a social wall", "card"],
      ["avatar", tsOf("none", "image"), "a round picture of the author", "image"], ["rating", tsOf("show", "hide"), "the stars (not on social posts)", "show"],
      ["mark", tsOf("none", "icon"), "a company glyph above the quote", "none"]),
  },
  props: [
    id, title,
    { name: "quotes", type: ts("Quote[]"), required: true },
    empty,
    { name: "labels", type: rec("QuoteLabels"), required: true, docs: "the templates of the lines around a quote" },
    { name: "layout", type: testimonialLayout, default: "grid", docs: "single: the first quote only, wide; stack: one narrow column; masonry: columns of cards of any height; strip: one row that scrolls sideways" },
    { name: "cols", type: tsOf("1-2", "1-3"), default: "1-3" },
    { name: "item", type: rec("QuoteItem"), docs: "how one quote is drawn" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  view: [frame({ ...common, align: cond(eq(ref("layout"), "single"), "center", "start"), measure: cond(eq(ref("layout"), "grid"), "default", "2xl") }, [orEmpty("quotes", "message-square-quote", [
    when(or(eq(ref("layout"), "masonry"), eq(ref("layout"), "strip")),
      [use("Block", { props: { Tag: "div", Class: cond(eq(ref("layout"), "masonry"), "columns-1 gap-4 md:columns-2 xl:columns-3", "flex snap-x gap-4 overflow-x-auto pb-2") }, attrs: { "data-testid": "items" } },
        each(ref("quotes"), "q", ref("q.id"), quoteCardOf()))],
      [use("Grid", { props: { Cols: cond(eq(ref("layout"), "grid"), ref("cols"), "1"), Class: "gap-4" }, attrs: { "data-testid": "items" } },
        eachAt(ref("quotes"), "q", "i", ref("q.id"), when(or(ne(ref("layout"), "single"), eq(ref("i"), 0)), [quoteCardOf()])))])]),
  ])],
});

const stepsList = spec(`${O}steps-list`, "StepsList", "How it works: numbered or icon steps in a row or a column. Axes: layout (row, column), marker (number, icon), align, density, tone.", {
  records: { Step: fields(["id", "string"], ["title", "string"], ["text", "string"], ["icon", "string"]) },
  props: [
    id, title,
    { name: "steps", type: ts("Step[]"), required: true },
    empty,
    { name: "layout", type: tsOf("row", "column"), default: "row" },
    { name: "marker", type: tsOf("number", "icon"), default: "number" },
    { name: "align", type: tsOf("start", "center"), default: "start" },
    { name: "tone", type: tone, default: "default" },
    { name: "density", type: density, default: "default" },
  ],
  view: [frame({ ...common, align: ref("align"), measure: cond(eq(ref("layout"), "row"), "default", "2xl") }, [orEmpty("steps", "list-ordered", [
    use("List", { props: { Tag: "ol", Class: cn("grid gap-6", cond(eq(ref("layout"), "row"), "sm:grid-cols-2 md:grid-cols-4", "")) }, attrs: { "data-testid": "items" } },
      eachAt(ref("steps"), "step", "i", ref("step.id"),
        use("ListItem", { props: { Class: cn("flex gap-4", cond(eq(ref("layout"), "row"), "flex-col", ""), cond(eq(ref("align"), "center"), "items-center text-center", "")) }, attrs: { "data-testid": "item" } },
          use("IconBadge", { props: { Variant: "primary" }, attrs: { "data-slot": "marker" } },
            when(eq(ref("marker"), "icon"),
              [use("LucideIcon", { props: { Name: ref("step.icon"), Size: 20 } })],
              [use("Inline", { props: { Class: "text-base font-bold" } }, text(str(add(ref("i"), 1))))])),
          use("Stack", { props: { Gap: "2", Align: cond(eq(ref("align"), "center"), "center", "start") } },
            use("Title", { props: { As: 3, Size: "xl", Weight: "bold" } }, text(ref("step.title"))),
            use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("step.text")))))))]),
  ])],
});

export const marketingOrganisms: OrganismSpec[] = [logoCloud, logoRibbon, logoSlot, statFigure, statsBand, quoteCard, testimonials, stepsList];
