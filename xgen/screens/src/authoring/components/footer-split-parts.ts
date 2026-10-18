// Parts of FooterSplit: the figures under the brand, the link groups as cards, small link columns, the points, the contacts, the
// channel cards and the sign-up card.
import { each, eachAt, lt, ref, text, use, when } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { emailRow } from "../forms";
import { muted, strong, surface } from "../ux";
import { menuEntry } from "./nav";
import { ifAny } from "../props";

const extras = { name: "extras", type: ts("FooterExtras"), required: true, docs: "the figures, points, contacts and channels" };
const typesOf = (...more: { from: string; names: string[] }[]) => [{ from: "FooterSplit", names: ["FooterExtras", "FooterSplitLabels"] }, ...more];
const groupsProp = [{ name: "label", type: "string" as const, required: true, docs: "accessible name of the link groups" }, { name: "groups", type: ts("MegaGroup[]"), required: true }];
/** the first `n` entries of a list */
const first = (list: string, as: string, n: number, node: ViewNode): ViewNode => eachAt(ref(list), as, "i", ref(`${as}.id`), when(lt(ref("i"), n), [node]));
const tile = (icon: string): ViewNode => use("Inline", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted text-foreground" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));
/** the items of a menu group: links where they have an address, else names */
const links = (list: string, cls: string): ViewNode => use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } },
  each(ref(list), "item", ref("item.id"), use("ListItem", {}, menuEntry(ref("item.href"), { variant: "muted", size: "sm", cls: `text-sm text-muted-foreground ${cls}`.trim() }, text(ref("item.name"))))));

// emptyMode omit (FooterSplit): each part draws only when its list has records
export const footerFigures = spec("pattern.footer-figures", "FooterFigures", "Three figures in a row under the brand of FooterSplit.", {
  typeImports: typesOf(),
  props: [extras],
  view: [ifAny("extras.stats", [use("Group", { props: { Gap: "8", Class: "flex-wrap" } },
    first("extras.stats", "s", 3, use("Stack", { props: { Gap: "0" }, attrs: { "data-testid": "footer-stat" } }, strong(ref("s.value"), "xl", "bold"), muted(ref("s.label"), "xs"))))])],
});

export const footerGroupCards = spec("pattern.footer-group-cards", "FooterGroupCards", "The link groups of FooterSplit as cards: a glyph and the group title over its links, four across on wide screens.", {
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }],
  props: groupsProp,
  view: [ifAny("groups", [use("Block", { props: { Tag: "nav" }, attrs: { "aria-label": ref("label") } },
    use("Box", { props: { Class: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" } },
      each(ref("groups"), "g", ref("g.id"), use("Stack", { props: { Gap: "4", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "group" } },
        use("Group", { props: { Gap: "2", Align: "center" } }, tile("g.icon"), strong(ref("g.title"), "sm")), links("g.links", "")))))])],
});

export const footerLinkColumns = spec("pattern.footer-link-columns", "FooterLinkColumns", "The first three link groups of FooterSplit as small columns beside each other.", {
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }],
  props: groupsProp,
  view: [ifAny("groups", [use("Block", { props: { Tag: "nav" }, attrs: { "aria-label": ref("label") } },
    use("Box", { props: { Class: "grid grid-cols-2 gap-8 sm:grid-cols-3" } },
      first("groups", "g", 3, use("Stack", { props: { Gap: "2" }, attrs: { "data-testid": "group" } }, strong(ref("g.title"), "sm"), links("g.links", "")))))])],
});

export const footerPoints = spec("pattern.footer-points", "FooterPoints", "Four points with their glyphs in a column, under the tagline of FooterSplit.", {
  typeImports: typesOf(),
  props: [extras, { name: "title", type: "string", required: true }],
  view: [ifAny("extras.points", [use("Stack", { props: { Gap: "4", Align: "start" } }, strong(ref("title"), "sm"),
    first("extras.points", "p", 4, use("Group", { props: { Gap: "2", Align: "center" }, attrs: { "data-testid": "footer-point" } },
      use("LucideIcon", { props: { Name: ref("p.icon"), Size: 16 } }), use("Text", { props: { Size: "sm" } }, text(ref("p.title"))))))])],
});

export const footerContacts = spec("pattern.footer-contacts", "FooterContacts", "The ways to reach the team in a column: a glyph tile, the kind (Email, Phone) and the value.", {
  typeImports: typesOf(),
  props: [extras],
  view: [ifAny("extras.contacts", [use("Stack", { props: { Gap: "4", Align: "stretch" } },
    each(ref("extras.contacts"), "c", ref("c.id"), use("Group", { props: { Gap: "4", Align: "center" }, attrs: { "data-testid": "footer-contact" } },
      tile("c.icon"), use("Stack", { props: { Gap: "0" } }, strong(ref("c.title"), "sm"), muted(ref("c.text"))))))])],
});

export const footerChannels = spec("pattern.footer-channels", "FooterChannels", "The channels of the community as three cards: a glyph over the name and one line.", {
  typeImports: typesOf(),
  props: [extras],
  view: [ifAny("extras.channels", [use("Box", { props: { Class: "grid grid-cols-1 gap-4 sm:grid-cols-3" } },
    first("extras.channels", "c", 3, use("Stack", { props: { Gap: "2", Align: "start", Class: surface("p-4") }, attrs: { "data-testid": "footer-channel" } },
      tile("c.icon"), strong(ref("c.title"), "sm"), muted(ref("c.text"), "xs"))))])],
});

export const footerSignupCard = spec("pattern.footer-signup-card", "FooterSignupCard", "The newsletter sign-up of FooterSplit in a card: a title with a glyph, the email field and button, and a note.", {
  typeImports: typesOf(),
  props: [{ name: "id", type: "string", required: true, docs: "ties the email label to its field" }, { name: "labels", type: ts("FooterSplitLabels"), required: true }],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "signup" } },
    use("Group", { props: { Gap: "2", Align: "center" } }, use("LucideIcon", { props: { Name: "mail", Size: 16 } }), strong(ref("labels.signup"), "sm")),
    emailRow(ref("labels.email"), ref("labels.subscribe"), false), muted(ref("labels.note"), "xs"))],
});

export const footerBrand = spec("pattern.footer-brand", "FooterBrand", "The brand of FooterSplit: a mark and the brand word over the tagline.", {
  props: [{ name: "brand", type: "string", required: true }, { name: "tagline", type: "string", required: true }],
  view: [use("Stack", { props: { Gap: "2", Align: "start" }, attrs: { "data-testid": "footer-brand" } },
    use("Group", { props: { Gap: "2", Align: "center" } },
      use("Inline", { props: { Class: "flex size-8 items-center justify-center rounded bg-foreground text-background" } }, use("LucideIcon", { props: { Name: "layers", Size: 16 } })),
      strong(ref("brand"), "xl", "bold")),
    muted(ref("tagline")))],
});

export const footerSitemap = spec("pattern.footer-sitemap", "FooterSitemap", "The sitemap link of FooterSplit: an arrow and the word, only where the app gives the address (no address, no link).", {
  props: [{ name: "href", type: "string", docs: "the address of the sitemap; none: nothing" }, { name: "label", type: "string", required: true }],
  view: [when(ref("href"), [use("Link", { props: { Href: ref("href"), Size: "sm" }, attrs: { "data-testid": "footer-sitemap" } }, use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }), text(ref("label")))])],
});

export const footerSplitParts: OrganismSpec[] = [footerSitemap, footerBrand, footerFigures, footerGroupCards, footerLinkColumns, footerPoints, footerContacts, footerChannels, footerSignupCard];
