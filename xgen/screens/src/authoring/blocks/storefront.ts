// The front of a store: a hero with an offer card or a picture behind the text, and a strip of store promises (delivery, returns, warranty).
import { cn, cond, each, eachAt, eq, lt, ref, text, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { behind, frame } from "../components/frames";
import { empty, id, ifAny, orEmpty, tsOf, toneLite, denseLite } from "../props";
import { muted, strong, surface } from "../ux";

const O = "organism.";

/** an icon in a small muted square */
const iconSquare = (icon: string) =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));

/** the one or two links of the hero */
const heroActions = organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" });

/** the promises of the hero: icon, title and a line of text */
const heroPerks = use("Grid", { props: { Cols: "1-3", Class: "gap-4" }, attrs: { "data-testid": "perks" } },
  eachAt(ref("perks"), "p", "i", ref("p.id"),
    when(lt(ref("i"), 3), [use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "perk" } },
      iconSquare("p.icon"),
      use("Stack", { props: { Gap: "0" } }, strong(ref("p.title"), "sm"), muted(ref("p.text"), "xs")))])));

const storeHero = spec(`${O}store-hero`, "StoreHero", "The hero of a store: a badge, the heading, a lead, one or two actions and three store promises. The overlay layout puts a picture beside the text with an offer card floating on it; the backdrop layout puts the text over a faint picture. Axes: layout (overlay, backdrop), mediaSide, tone.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: { OfferCard: fields(["title", "string"], ["text", "string"], ["icon", "string"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "perks", type: ts("Feature[]"), required: true, docs: "store promises under the actions (the first three are shown)" },
    { name: "card", type: { record: "OfferCard" }, required: true, docs: "the offer card on the picture (overlay layout)" },
    { name: "layout", type: tsOf("overlay", "backdrop"), default: "overlay" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [when(eq(ref("layout"), "backdrop"),
    [behind("image", ref("title"),
      frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), level: ref("level"), tone: ref("tone"), density: "roomy", measure: "3xl" },
        [heroActions, ifAny("perks", [heroPerks])]))],
    [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), level: ref("level"), layout: "split", hasMedia: true, mediaSide: ref("mediaSide"), tone: ref("tone"), density: "default" },
      [heroActions, ifAny("perks", [heroPerks])],
      [organism("OfferMedia", { alt: ref("title"), card: ref("card") })])])],
});

const uspStrip = spec(`${O}usp-strip`, "UspStrip", "The promises of a store in one band: free delivery, returns, warranty, help. Axes: layout (strip: one muted panel, cards: a card each, bar: a thin line of icons and titles), tone, density.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id,
    { name: "title", type: "string", default: "", docs: "section heading; empty: no heading (the section is named by id)" },
    { name: "perks", type: ts("Feature[]"), required: true },
    empty,
    { name: "layout", type: tsOf("strip", "cards", "bar"), default: "strip" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone"), density: ref("density") }, [orEmpty("perks", "truck", [
    when(eq(ref("layout"), "bar"),
      [use("List", { props: { Tag: "ul", Class: "flex flex-wrap items-center justify-center gap-x-8 gap-y-4" }, attrs: { "data-testid": "items" } },
        each(ref("perks"), "p", ref("p.id"),
          use("ListItem", { props: { Class: "flex items-center gap-2 text-sm font-medium" }, attrs: { "data-testid": "item" } },
            use("LucideIcon", { props: { Name: ref("p.icon"), Size: 16 } }), use("Inline", {}, text(ref("p.title"))))))],
      [use("Grid", { props: { Cols: "1-4", Class: cn("gap-4", cond(eq(ref("layout"), "strip"), "rounded bg-muted p-6", "")) }, attrs: { "data-testid": "items" } },
        each(ref("perks"), "p", ref("p.id"),
          use("Stack", { props: { Gap: "4", Class: cond(eq(ref("layout"), "cards"), surface("p-6"), "") }, attrs: { "data-testid": "item" } },
            iconSquare("p.icon"),
            use("Stack", { props: { Gap: "2" } }, strong(ref("p.title"), "sm"), muted(ref("p.text"))))))]),])
  ])],
});

export const storefrontOrganisms: OrganismSpec[] = [storeHero, uspStrip];
