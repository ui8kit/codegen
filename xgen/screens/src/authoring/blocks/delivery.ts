// Delivery: the zones and their prices, the delivery windows to pick from, the delivery facts, and the stores where an order can be picked up.
import { and, at, nbsp, cn, gt, len, cond, each, eq, ne, money, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, Value } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, ifAny, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { heading, muted, strong, surface } from "../ux";

const O = "organism.";
const common = { id: ref("id"), title: ref("title"), lead: ref("lead"), tone: ref("tone"), density: ref("density") };
const lead = { name: "lead", type: "string" as const, default: "" };
const Zone = fields(["id", "string"], ["name", "string"], ["area", "string"], ["price", "number"], ["freeFrom", "number"], ["minOrder", "number"], ["time", "string"], ["express", "string"], ["currency", "string"]);
const head = (label: string, cls = "py-2") => use("TableHeadCell", { props: { Scope: "col", Class: cls } }, text(ref(label)));
/** an icon in a small muted square */
const iconSquare = (icon: string) =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));
/** a line of a spec list: the label on the left, the value on the right */
const pair = (label: Value, value: Value) =>
  use("ListItem", { props: { Class: "flex items-center justify-between gap-4 text-sm" } }, use("Inline", { props: { Class: "text-muted-foreground" } }, text(label)), use("Inline", { props: { Class: "font-medium" } }, text(value)));

const zoneTable = spec(`${O}zone-table`, "ZoneTable", "Delivery zones and their prices as a table or as cards: the zone and its areas, the price, the order that ships free, the minimum order, the time and an express badge. Axes: layout (table, cards), tone, density.", {
  records: { Zone, ZoneLabels: fields(["caption", "string"], ["zone", "string"], ["price", "string"], ["freeFrom", "string"], ["minOrder", "string"], ["time", "string"], ["express", "string"]) },
  props: [
    id, title, lead,
    { name: "zones", type: ts("Zone[]"), required: true },
    empty,
    { name: "labels", type: { record: "ZoneLabels" }, required: true },
    { name: "layout", type: tsOf("table", "cards"), default: "table" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(common, [orEmpty("zones", "map", [
    when(eq(ref("layout"), "table"),
      [organism("ZoneRows", { zones: ref("zones"), labels: ref("labels") })],
      [use("Grid", { props: { Cols: "1-3", Class: "gap-4" }, attrs: { "data-testid": "items" } },
        each(ref("zones"), "z", ref("z.id"),
          use("Stack", { props: { Gap: "4", Class: surface("p-6") }, attrs: { "data-testid": "item" } },
            use("Stack", { props: { Gap: "2" } }, heading(ref("z.name"), "lg"), muted(ref("z.area"))),
            use("Text", { props: { Size: "3xl", Weight: "bold" } }, text(money(ref("z.price"), ref("z.currency")))),
            use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2 border-t border-border pt-4" } },
              pair(ref("labels.freeFrom"), money(ref("z.freeFrom"), ref("z.currency"))),
              pair(ref("labels.minOrder"), money(ref("z.minOrder"), ref("z.currency"))),
              pair(ref("labels.time"), ref("z.time"))),
            when(ref("z.express"), [use("Badge", { props: { Variant: "secondary", Size: "default", Class: "w-fit" } }, text(ref("z.express")))]))))]),])
  ])],
});

const slotBoard = spec(`${O}slot-board`, "SlotBoard", "Pick a delivery window: the days with their windows as radio chips, beside a card with the zone, its price and the buttons. Static markup. Axes: layout (split: the card beside the days, stacked: the days only), item (card, plain), tone.", {
  typeImports: [{ from: "SlotGrid", names: ["Day"] }, { from: "ZoneTable", names: ["Zone"] }],
  records: { SlotLabels: fields(["zone", "string"], ["price", "string"], ["freeFrom", "string"], ["time", "string"], ["primary", "string"], ["secondary", "string"], ["note", "string"]) },
  props: [
    id, title, lead,
    { name: "days", type: ts("Day[]"), required: true },
    empty,
    { name: "zone", type: ts("Zone"), required: true, docs: "the zone of the address" },
    { name: "labels", type: { record: "SlotLabels" }, required: true },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "item", type: tsOf("card", "plain"), default: "card" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ ...common, density: "default" }, [orEmpty("days", "calendar", [
    use("Box", { props: { Class: "grid grid-cols-1 items-start gap-8 lg:grid-cols-3" } },
      use("Box", { props: { Class: cond(eq(ref("layout"), "split"), "lg:col-span-2", "lg:col-span-3") } },
        organism("SlotGrid", { days: ref("days"), name: tpl("{0}-slot", ref("id")), item: ref("item") })),
      when(eq(ref("layout"), "split"), [use("Stack", { props: { Gap: "4", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "aside" } },
        organism("Field", { label: ref("labels.zone"), htmlFor: tpl("{0}-zone", ref("id")) }, { slots: { children: { args: [], do: [
          use("Select", { props: { Name: tpl("{0}-zone", ref("id")) }, attrs: { id: tpl("{0}-zone", ref("id")) } }, use("SelectOption", { props: { Value: ref("zone.id"), Label: ref("zone.name"), Selected: true } }))] } } }),
        use("List", { props: { Tag: "ul", Class: "flex flex-col gap-2" } },
          pair(ref("labels.price"), money(ref("zone.price"), ref("zone.currency"))),
          pair(ref("labels.freeFrom"), money(ref("zone.freeFrom"), ref("zone.currency"))),
          pair(ref("labels.time"), ref("zone.time"))),
        use("Button", { props: { Variant: "default", Size: "default", Class: "w-full" } }, text(ref("labels.primary"))),
        use("Button", { props: { Variant: "outline", Size: "default", Class: "w-full" } }, text(ref("labels.secondary"))),
        muted(ref("labels.note"), "xs"))])),])
  ])],
});

const deliveryInfo = spec(`${O}delivery-info`, "DeliveryInfo", "How delivery works: the facts as icon cards, then the zones with their time and the order that ships free. Axes: layout (full: facts over zone cards, facts: the facts only, split: the facts beside a list of zones), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }, { from: "ZoneTable", names: ["Zone"] }],
  records: { DeliveryLabels: fields(["zones", "string"], ["freeFrom", "string"]) },
  props: [
    id, title, lead,
    { name: "facts", type: ts("Feature[]"), required: true },
    { name: "zones", type: ts("Zone[]"), required: true },
    { name: "labels", type: { record: "DeliveryLabels" }, required: true },
    { name: "layout", type: tsOf("full", "facts", "split"), default: "full" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame(common, [
    use("Box", { props: { Class: cn("grid grid-cols-1 gap-8", cond(eq(ref("layout"), "split"), "items-start md:grid-cols-2", "")) } },
      ifAny("facts", [use("Grid", { props: { Cols: cond(eq(ref("layout"), "split"), "1-2", "1-4"), Class: "gap-4" }, attrs: { "data-testid": "facts" } },
        each(ref("facts"), "f", ref("f.id"),
          use("Stack", { props: { Gap: "4", Class: surface("p-6") }, attrs: { "data-testid": "fact" } },
            iconSquare("f.icon"), use("Stack", { props: { Gap: "2" } }, strong(ref("f.title"), "sm"), muted(ref("f.text"))))))]),
      when(and(ne(ref("layout"), "facts"), gt(len(ref("zones")), 0)), [use("Stack", { props: { Gap: "4", Align: "stretch" } },
        heading(ref("labels.zones"), "lg"),
        use("Box", { props: { Class: cond(eq(ref("layout"), "split"), "flex flex-col gap-4", "grid grid-cols-1 gap-4 md:grid-cols-3") } },
          each(ref("zones"), "z", ref("z.id"),
            use("Stack", { props: { Gap: "2", Class: cond(eq(ref("layout"), "split"), "border-b border-border pb-4", surface("p-6")) }, attrs: { "data-testid": "zone" } },
              use("Group", { props: { Gap: "4", Align: "baseline", Justify: "between" } }, strong(ref("z.name"), "sm"), use("Badge", { props: { Variant: "secondary", Size: "default" } }, text(ref("z.time")))),
              muted(ref("z.area")),
              use("Text", { props: { Size: "sm", Weight: "medium" } }, text(tpl(ref("labels.freeFrom"), money(ref("z.freeFrom"), ref("z.currency")))))))))])),
  ])],
});

const storeLocations = spec(`${O}store-locations`, "StoreLocations", "The stores of a shop: name, a badge of its kind (pickup or store only), address, hours, phone, a note and the services. Axes: layout (cards, list: one row per store, map: compact cards beside a map picture), tone.", {
  records: { Store: fields(["id", "string"], ["name", "string"], ["kind", "string"], ["address", "string"], ["hours", "string"], ["phone", "string"], ["note", "string"], ["services", "string[]"]), StoreLabels: fields(["map", "string"]) },
  props: [
    id, title, lead,
    { name: "stores", type: ts("Store[]"), required: true },
    empty,
    { name: "kinds", type: ts("Record<string, string>"), required: true, docs: "word by store kind (pickup, store only)" },
    { name: "labels", type: { record: "StoreLabels" }, required: true },
    { name: "layout", type: tsOf("cards", "list", "map"), default: "cards" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ ...common, density: "default" }, [orEmpty("stores", "store", [
    use("Box", { props: { Class: cn("grid grid-cols-1 gap-8", cond(eq(ref("layout"), "map"), "items-start md:grid-cols-2", "")) } },
      use("Box", { props: { Class: cond(eq(ref("layout"), "cards"), "grid grid-cols-1 gap-4 md:grid-cols-2", "flex flex-col gap-4") }, attrs: { "data-testid": "items" } },
        each(ref("stores"), "s", ref("s.id"),
          use("Stack", { props: { Gap: "4", Class: cond(eq(ref("layout"), "list"), "border-b border-border pb-4", surface("p-6")) }, attrs: { "data-testid": "item" } },
            use("Stack", { props: { Gap: "2" } }, use("Badge", { props: { Variant: "outline", Size: "default", Class: "w-fit" } }, text(at(ref("kinds"), ref("s.kind")))), heading(ref("s.name"), "lg")),
            use("List", { props: { Tag: "ul", Class: cond(eq(ref("layout"), "list"), "flex flex-wrap gap-x-8 gap-y-2 text-sm", "flex flex-col gap-2 text-sm") } },
              use("ListItem", { props: { Class: "flex items-center gap-2" } }, use("LucideIcon", { props: { Name: "map-pin", Size: 16 } }), use("Inline", {}, text(ref("s.address")))),
              use("ListItem", { props: { Class: "flex items-center gap-2" } }, use("LucideIcon", { props: { Name: "clock", Size: 16 } }), use("Inline", {}, text(ref("s.hours")))),
              use("ListItem", { props: { Class: "flex items-center gap-2" } }, use("LucideIcon", { props: { Name: "phone", Size: 16 } }), use("Link", { props: { Href: tpl("tel:{0}", ref("s.phone")), Variant: "default" } }, text(nbsp(ref("s.phone")))))),
            when(eq(ref("layout"), "cards"), [muted(ref("s.note")),
              use("Group", { props: { Gap: "2", Class: "flex-wrap" } }, each(ref("s.services"), "v", ref("v"), use("Badge", { props: { Variant: "secondary", Size: "default" } }, text(ref("v")))))])))),
      when(eq(ref("layout"), "map"), [use("Box", { props: { Class: "md:sticky md:top-8" } }, organism("MediaFrame", { alt: ref("labels.map"), ratio: "1/1" }))])),])
  ])],
});

export const deliveryOrganisms: OrganismSpec[] = [zoneTable, slotBoard, deliveryInfo, storeLocations];
