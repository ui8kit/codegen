// Pricing organisms beyond the tiers: a comparison table (plans or competitors as columns), a usage calculator, a grid of credit packs.
import { at, call, cn, cond, each, eq, mul, money, ne, or, ref, text, tpl, use, when, organism, len, and, gt, count } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, groupFields, rec, requireFields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { muted, strong, fitCols } from "../ux";
import { compareMark } from "../components/compare";

const O = "organism.";
const markOf = (value: ReturnType<typeof ref>) => organism("CompareMark", { value, yes: ref("labels.yes"), no: ref("labels.no") });


const comparisonTable = spec(`${O}comparison-table`, "ComparisonTable", "Plans, or a product and its competitors, as three columns and the features as rows. A value of yes shows a check, no a dash (both with a hidden word), anything else is shown as text. Axes: highlight (none, middle column), tone, density.", {
  records: {
    CompareRow: fields(["id", "string"], ["label", "string"], ["a", "string"], ["b", "string"], ["c", "string"]),
    CompareLabels: fields(["caption", "string"], ["feature", "string"], ["a", "string"], ["b", "string"], ["c", "string"], ["yes", "string"], ["no", "string"]),
  },
  props: [
    id, title,
    { name: "rows", type: ts("CompareRow[]"), required: true },
    empty,
    { name: "labels", type: { record: "CompareLabels" }, required: true },
    { name: "highlight", type: tsOf("none", "middle"), default: "none", docs: "middle: the second column stands out" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [orEmpty("rows", "table", [
    use("Box", { props: { Class: "relative w-full overflow-x-auto" } },
      use("Table", { props: { Class: "w-full text-left text-sm" }, attrs: { "data-testid": "compare" } },
        use("TableCaption", { props: { Class: "sr-only" } }, text(ref("labels.caption"))),
        use("TableHead", {}, use("TableRow", {},
          use("TableHeadCell", { props: { Scope: "col", Class: "py-4" } }, text(ref("labels.feature"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-4" } }, text(ref("labels.a"))),
          use("TableHeadCell", { props: { Scope: "col", Class: cn("py-4", cond(eq(ref("highlight"), "middle"), "bg-muted", "")) }, attrs: { "data-highlight": cond(eq(ref("highlight"), "middle"), "true", "false") } }, text(ref("labels.b"))),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-4" } }, text(ref("labels.c"))))),
        use("TableBody", {}, each(ref("rows"), "row", ref("row.id"),
          use("TableRow", { props: { Class: "border-t border-border" }, attrs: { "data-testid": "item" } },
            use("TableHeadCell", { props: { Scope: "row", Class: cn("font-medium", cond(eq(ref("density"), "compact"), "py-2", "py-4")) } }, text(ref("row.label"))),
            use("TableCell", { props: { Class: cn(cond(eq(ref("density"), "compact"), "py-2", "py-4")) } }, markOf(ref("row.a"))),
            use("TableCell", { props: { Class: cn(cond(eq(ref("density"), "compact"), "py-2", "py-4"), cond(eq(ref("highlight"), "middle"), "bg-muted font-semibold", "")) } }, markOf(ref("row.b"))),
            use("TableCell", { props: { Class: cond(eq(ref("density"), "compact"), "py-2", "py-4") } }, markOf(ref("row.c")))))))),])
  ])],
});

const usageCalculator = spec(`${O}usage-calculator`, "UsageCalculator", "A price that follows a slider: the chosen amount of use, the price per unit and the estimate. The page keeps the amount and updates it on the `usage` event. Axes: layout (card, plain), ends (show: the smallest and the largest amount under the slider, hide), tone.", {
  records: {
    UsageSlider: requireFields(groupFields(["min", "number"], ["max", "number"], ["label", "string", "accessible name of the slider"], ["unit", "string", "template of an amount, e.g. `{0} credits`"]), "min", "max", "label", "unit"),
    UsagePrice: requireFields(groupFields(["rate", "number", "price of one unit in minor units (cents)"], ["currency", "string"], ["label", "string", "name of the estimate"]), "rate", "currency", "label"),
  },
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "usage", type: "number", required: true, docs: "the chosen amount" },
    { name: "slider", type: rec("UsageSlider"), required: true, docs: "the range of the slider and its labels" },
    { name: "price", type: rec("UsagePrice"), required: true, docs: "how the estimate is computed and named" },
    { name: "cta", type: "string", required: true },
    { name: "href", type: "string" },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
    { name: "ends", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  events: [{ name: "usage", args: [{ name: "value", type: "string" }], docs: "the slider moved" }],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("text"), tone: ref("tone"), align: "center" }, [
    use("Stack", { props: { Gap: "4", Align: "stretch", Class: cn("mx-auto w-full max-w-xl", cond(eq(ref("layout"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "")) }, attrs: { "data-testid": "usage" } },
      use("Group", { props: { Justify: "between", Align: "baseline" } }, strong(tpl(ref("slider.unit"), ref("usage")), "xl", "bold"), muted(ref("slider.label"))),
      use("Range", { props: { Min: ref("slider.min"), Max: ref("slider.max"), Value: ref("usage"), AriaLabel: ref("slider.label") }, on: { input: call("emit.usage", ref("event.value")) }, attrs: { "data-testid": "slider" } }),
      when(eq(ref("ends"), "show"), [use("Group", { props: { Justify: "between" }, attrs: { "data-testid": "ends" } }, muted(tpl(ref("slider.unit"), ref("slider.min")), "xs"), muted(tpl(ref("slider.unit"), ref("slider.max")), "xs"))]),
      use("Group", { props: { Justify: "between", Align: "center", Class: "flex-wrap" } },
        use("Stack", { props: { Gap: "0" } }, muted(ref("price.label"), "xs"), use("Text", { props: { Size: "4xl", Weight: "bold" }, attrs: { "data-testid": "estimate" } }, text(money(mul(ref("usage"), ref("price.rate")), ref("price.currency"))))),
        use("Button", { props: { Variant: "default", Size: "default", Href: ref("href") }, attrs: { "data-testid": "submit" } }, text(ref("cta"))))),
  ])],
});

const creditPacks = spec(`${O}credit-packs`, "CreditPacks", "Packs of credits as tiles: the amount, a badge, the price and a buy button. Axes: columns (2, 4), item (tile, row), tone, density.", {
  records: { Pack: fields(["id", "string"], ["name", "string"], ["credits", "number"], ["price", "number"], ["currency", "string"], ["badge", "string"]) },
  props: [
    id, title,
    { name: "packs", type: ts("Pack[]"), required: true },
    empty,
    { name: "badges", type: ts("Record<string, string>"), required: true, docs: "badge word by pack badge (popular, best)" },
    { name: "buy", type: "string", required: true },
    { name: "cols", type: tsOf("2", "4"), default: "4" },
    { name: "item", type: tsOf("tile", "row"), default: "tile" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density"), measure: cond(eq(ref("item"), "row"), "2xl", "default") }, [orEmpty("packs", "coins", [
    use("Grid", { props: { Cols: cond(eq(ref("item"), "row"), "1", fitCols(cond(eq(ref("cols"), "2"), "1-2", "1-4"), len(ref("packs")))), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("packs"), "pack", ref("pack.id"),
        use("Card", { props: { Variant: "default", Class: cn("h-full", cond(eq(ref("item"), "row"), "gap-4 p-4", cond(eq(ref("density"), "compact"), "gap-4 p-4", ""))) }, attrs: { "data-testid": "item", "data-badge": ref("pack.badge") } },
          use("CardContent", { props: { Class: cn("flex h-full gap-4", cond(eq(ref("item"), "row"), "flex-row flex-wrap items-center justify-between", "flex-col")) } },
            use("Stack", { props: { Gap: "2", Align: "start", Class: cn("min-w-0", cond(eq(ref("item"), "row"), "flex-1", "")) } },
              when(or(ref("pack.badge"), and(ne(ref("item"), "row"), gt(count(ref("packs"), "badge"), 0))), [use("Box", { props: { Class: "flex min-h-6 items-center" }, attrs: { "data-slot": "badge-slot" } },
                when(ref("pack.badge"), [use("Badge", { props: { Variant: "default", Size: "default", Class: "w-fit shrink-0" }, attrs: { "data-testid": "badge" } }, text(at(ref("badges"), ref("pack.badge"))))]))]),
              use("Stack", { props: { Gap: "0", Class: "min-w-0" } }, use("Title", { props: { As: 3, Size: "xl", Weight: "bold" } }, text(ref("pack.name"))),
                use("Text", { props: { Size: "2xl", Weight: "bold" } }, text(money(ref("pack.price"), ref("pack.currency")))))),
            use("Button", { props: { Variant: cond(eq(ref("pack.badge"), "popular"), "default", "outline"), Size: "sm", Type: "button", Class: cn("w-fit shrink-0", cond(eq(ref("item"), "row"), "", "mt-auto")) }, attrs: { "data-testid": "buy" } }, text(ref("buy"))))))),])
  ])],
});

export const pricingOrganisms: OrganismSpec[] = [compareMark, comparisonTable, usageCalculator, creditPacks];
