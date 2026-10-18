// The parts of the shop blocks that are too long to sit inside them: the offer picture of the store hero, the table of delivery
// zones, and the filled body of the cart drawer.
import { cond, tpl, each, eachAt, eq, money, mul, ref, str, text, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong } from "../ux";

/** an icon in a small muted square */
const iconSquare = (icon: string) =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));
const head = (label: string, cls = "py-2") => use("TableHeadCell", { props: { Scope: "col", Class: cls } }, text(ref(label)));

/** the picture of the overlay hero with the offer card floating on it */
const offerMedia = spec("pattern.offer-media", "OfferMedia", "The picture of the StoreHero overlay layout with an offer card floating on its lower corner (the card floats over the picture).", {
  typeImports: [{ from: "StoreHero", names: ["OfferCard"] }],
  props: [
    { name: "alt", type: "string", required: true, docs: "accessible name of the picture" },
    { name: "card", type: ts("OfferCard"), required: true },
  ],
  view: [use("Box", { props: { Class: "relative" }, attrs: { "data-testid": "hero-media" } },
    organism("MediaFrame", { alt: ref("alt"), ratio: "4/3" }),
    use("Group", { props: { Gap: "4", Align: "start", Class: "absolute bottom-4 left-4 mr-4 max-w-xs rounded bg-card p-4 shadow-lg" }, attrs: { "data-testid": "offer-card" } },
      iconSquare("card.icon"),
      use("Stack", { props: { Gap: "0" } }, strong(ref("card.title"), "sm"), muted(ref("card.text"), "xs"))))],
});

/** the table layout of ZoneTable: one row per zone */
const zoneRows = spec("pattern.zone-rows", "ZoneRows", "The zones as a table (the table layout of ZoneTable): the zone and its areas, the price, free from, the minimum order, the time and an express badge.", {
  typeImports: [{ from: "ZoneTable", names: ["Zone", "ZoneLabels"] }],
  props: [
    { name: "zones", type: ts("Zone[]"), required: true },
    { name: "labels", type: ts("ZoneLabels"), required: true },
  ],
  view: [use("Box", { props: { Class: "w-full overflow-x-auto rounded inset-ring inset-ring-border" } },
    use("Table", { props: { Class: "w-full text-left text-sm" }, attrs: { "data-testid": "zone-table" } },
      use("TableCaption", { props: { Class: "sr-only" } }, text(ref("labels.caption"))),
      use("TableHead", { props: { Class: "bg-muted" } }, use("TableRow", {},
        head("labels.zone", "px-4 py-2"), head("labels.price"), head("labels.freeFrom"), head("labels.minOrder", "hidden py-2 md:table-cell"), head("labels.time"), head("labels.express", "hidden py-2 pr-4 sm:table-cell"))),
      use("TableBody", {}, each(ref("zones"), "z", ref("z.id"),
        use("TableRow", { props: { Class: "border-t border-border" }, attrs: { "data-testid": "item" } },
          use("TableCell", { props: { Class: "px-4 py-4" } }, use("Stack", { props: { Gap: "0" } }, strong(ref("z.name"), "sm"), muted(ref("z.area"), "xs"))),
          use("TableCell", { props: { Class: "font-medium" } }, text(money(ref("z.price"), ref("z.currency")))),
          use("TableCell", {}, text(money(ref("z.freeFrom"), ref("z.currency")))),
          use("TableCell", { props: { Class: "hidden md:table-cell" } }, text(money(ref("z.minOrder"), ref("z.currency")))),
          use("TableCell", {}, text(ref("z.time"))),
          use("TableCell", { props: { Class: "hidden pr-4 sm:table-cell" } }, when(ref("z.express"), [use("Badge", { props: { Variant: "secondary", Size: "default" } }, text(ref("z.express")))])))))))],
});

const drawerLines = spec("pattern.drawer-lines", "DrawerLines", "The filled body of the CartDrawer: the lines with a quantity field, then the free-delivery bar, the subtotal and total and the button.", {
  typeImports: [{ from: "CartList", names: ["CartLine", "CartLabels"] }, { from: "OrderSummary", names: ["SummaryRow"] }, { from: "CartDrawer", names: ["DrawerLabels"] }],
  props: [
    { name: "lines", type: ts("CartLine[]"), required: true },
    { name: "rows", type: ts("SummaryRow[]"), required: true },
    { name: "labels", type: ts("CartLabels"), required: true },
    { name: "drawer", type: ts("DrawerLabels"), required: true },
    { name: "media", type: tsOf("image", "none"), default: "image" },
    { name: "field", type: "string", default: "qty", docs: "prefix of the quantity field names (one name per line: <field>-<line id>)" },
  ],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch", Class: "flex-1 p-4" }, attrs: { "data-testid": "lines" } },
    each(ref("lines"), "line", ref("line.id"),
      use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "item" } },
        when(eq(ref("media"), "image"), [organism("MediaFrame", { alt: ref("line.name"), ratio: "1/1", className: "size-16 shrink-0" })]),
        use("Stack", { props: { Gap: "2", Align: "stretch", Class: "flex-1" } },
          use("Group", { props: { Gap: "2", Justify: "between", Align: "start" } }, strong(ref("line.name"), "sm"), use("Inline", { props: { Class: "text-sm font-medium" } }, text(money(mul(ref("line.price"), ref("line.qty")), ref("line.currency"))))),
          muted(ref("line.variant"), "xs"),
          organism("NumberField", { value: str(ref("line.qty")), name: tpl("{0}-{1}", ref("field"), ref("line.id")), min: "1", label: ref("labels.qty"), decrease: ref("labels.decrease"), increase: ref("labels.increase") }))))),
            use("Stack", { props: { Gap: "4", Align: "stretch", Class: "border-t border-border p-4" } },
    use("Stack", { props: { Gap: "2", Align: "stretch", Class: "rounded bg-muted p-4" }, attrs: { "data-testid": "progress" } },
      use("Text", { props: { Size: "sm" } }, text(ref("drawer.progress"))), use("Progress", { props: { Value: "96", Max: "100" }, attrs: { "aria-label": ref("drawer.progress") } })),
    use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2" } },
      eachAt(ref("rows"), "row", "i", ref("row.id"),
        when(cond(ref("row.strong"), true, eq(ref("i"), 0)), [use("ListItem", { props: { Class: cond(ref("row.strong"), "flex justify-between text-base font-bold", "flex justify-between text-sm text-muted-foreground") } },
          use("Inline", {}, text(ref("row.label"))), use("Inline", {}, text(money(ref("row.amount"), ref("row.currency")))))]))),
    use("Button", { props: { Variant: "default", Size: "lg", Class: "w-full" }, attrs: { "data-testid": "checkout" } }, text(ref("labels.checkout"))))],
});

export const shopParts: OrganismSpec[] = [offerMedia, zoneRows, drawerLines];
