// The pieces of a top bar: the links (NavLinks), the buttons at its end (NavActions), the search field
// (SearchPalette) and the faded picture a transparent bar sits on (OverMedia). NavBar, MegaMenu and SidebarNav use them.
import { and, call, coalesce, cond, each, eachAt, eq, lt, mul, or, ref, slot, text, undef, use, when, organism, len } from "../../build";
import type { Value, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { ifAny, tsOf } from "../props";
import { kids } from "../forms";
import { navBlockOf } from "./landmarks";

const P = "pattern.";
export const NavLink = fields(["id", "string"], ["name", "string"], ["icon", "string"], ["href", "string", true]);
/** a group of a menu (kind menu_item) and the items under it (parent_id): MegaMenu, SitemapFooter, FooterColumns, FooterSplit */
export const Group = fields(["id", "string"], ["title", "string"], ["icon", "string"], ["links", "NavLink[]"], ["href", "string", true]);

export interface EntryLook { cls: Value; current?: Value; variant?: string; size?: string; testid?: string; block?: boolean }
/**
 * a menu entry (a NavLink of a Codex menu_item, or any record with an optional href): MenuEntry draws a link where it has an
 * address (the app routes it), else its name as text in the same box. No "#/" stand-in: no address, no link.
 */
export const menuEntry = (href: Value, o: EntryLook, ...children: ViewNode[]): ViewNode => organism("MenuEntry", {
  href, className: o.cls,
  ...(o.current !== undefined ? { current: o.current } : {}), ...(o.variant ? { variant: o.variant } : {}), ...(o.size ? { size: o.size } : {}), ...(o.testid ? { testid: o.testid } : {}), ...(o.block ? { block: true } : {}),
}, kids(...children));
/** the item `l` is the current one */
export const currentOf = (l: string, current: Value): Value => eq(ref(`${l}.id`), current);
export const menuEntrySpec = spec(`${P}menu-entry`, "MenuEntry", "One entry of a menu: a link to its address, or, without one, its content as text in the same box (the magazine routes nothing, so it shows text). current marks the page the entry stands for (aria-current) either way.", {
  props: [
    { name: "href", type: "string", docs: "the address; none: text, not a link" },
    { name: "current", type: "boolean", default: false, docs: "the entry of the current page" },
    { name: "variant", type: tsOf("default", "muted", "block"), default: "default", docs: "the look of the link" },
    { name: "size", type: tsOf("default", "sm"), default: "default" },
    { name: "testid", type: "string", docs: "the test id of the entry" },
    { name: "block", type: "boolean", default: false, docs: "the content holds block elements: without an address it sits in a div, not a span" },
  ],
  className: true,
  children: true,
  view: [when(ref("href"),
    [use("Link", { props: { Href: ref("href"), Variant: ref("variant"), Size: ref("size"), AriaCurrent: cond(ref("current"), "page", undef()), Class: ref("className") }, attrs: { "data-testid": ref("testid") } }, slot("children"))],
    [when(ref("block"),
      [use("Box", { props: { Class: ref("className") }, attrs: { "aria-current": cond(ref("current"), "page", undef()), "data-testid": ref("testid") } }, slot("children"))],
      [use("Inline", { props: { Class: ref("className") }, attrs: { "aria-current": cond(ref("current"), "page", undef()), "data-testid": ref("testid") } }, slot("children"))])])],
});
/** a menu entry of a top bar */
export const link = (l: string, current: Value): ViewNode => menuEntry(ref(`${l}.href`), { cls: "text-sm", current: currentOf(l, current), testid: "nav-link" }, text(ref(`${l}.name`)));
/** the brand of a bar: a link home only where the app gives the address (`brandHref`), else the name */
export const brandLink = (): ViewNode => menuEntry(ref("brandHref"), { cls: "text-lg font-medium", testid: "brand" }, text(ref("brand")));
/** the items under a menu group (g.links): links where they have an address, else names */
export const groupLinks = (g: string, cls: string, look: Omit<EntryLook, "cls"> = {}): ViewNode =>
  each(ref(`${g}.links`), "item", ref("item.id"), use("ListItem", {}, menuEntry(ref("item.href"), { cls, ...look }, text(ref("item.name")))));
/** the menu links of a bar: all of them, or the left or right half (the split layout puts the brand between) */
export const navLinks = spec(`${P}nav-links`, "NavLinks", "The links of a top bar in a row; the current one carries aria-current. side: all, or the first or second half of the list.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [
    { name: "links", type: ts("NavLink[]"), required: true },
    { name: "current", type: "string", default: "", docs: "id of the current link" },
    { name: "side", type: tsOf("all", "left", "right"), default: "all" },
  ],
  derived: [{ name: "count", value: len(ref("links")) }],
  view: (() => {
    // a link shows on every side "all", else when its half of the list is the side asked for
    const shown = or(eq(ref("side"), "all"), eq(lt(mul(ref("i"), 2), ref("count")), eq(ref("side"), "left")));
    return [ifAny("links", [use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" } },
      eachAt(ref("links"), "l", "i", ref("l.id"), when(shown, [link("l", ref("current"))])))])];
  })(),
});

/** the links of NavBar in their nav landmark; no links: no landmark (emptyMode omit) */
export const navBarMenu = spec(`${P}nav-bar-menu`, "NavBarMenu", "The links of NavBar in a nav landmark; left out when there are no links.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the navigation" },
    { name: "links", type: ts("NavLink[]"), required: true },
    { name: "current", type: "string", default: "", docs: "id of the current link" },
  ],
  // below md the links take a row of their own under the brand and the buttons, one line that scrolls sideways
  view: [ifAny("links", [navBlockOf(ref("label"), "order-last w-full overflow-x-auto md:order-none md:w-auto [&>div]:flex-nowrap md:[&>div]:flex-wrap [&_a]:shrink-0", "site-nav", organism("NavLinks", { links: ref("links"), current: ref("current") }))])],
});

/** the buttons at the end of a bar: login, call to action, theme */
export const navActions = spec(`${P}nav-actions`, "NavActions", "The buttons at the end of a top bar: login, the call to action and the theme button (it only reports the press). No wrapper: they sit in the row of the bar.", {
  props: [
    { name: "login", type: "string", docs: "text of the login link; none: no login" },
    { name: "loginHref", type: "string", docs: "the address of the login page; none: the login is a button with no address" },
    { name: "cta", type: "string" },
    { name: "ctaHref", type: "string" },
    { name: "actions", type: tsOf("none", "cta"), default: "cta" },
    { name: "tone", type: tsOf("default", "inverse"), default: "default" },
    { name: "themeLabel", type: "string", docs: "text of the theme button; none: no button" },
  ],
  events: [{ name: "theme", args: [], docs: "the theme button was pressed" }],
  view: [
    when(ref("login"), [use("Button", { props: { Variant: "ghost", Size: "sm", Href: ref("loginHref"), Class: cond(eq(ref("tone"), "inverse"), "text-background hover:bg-background/10", "") }, attrs: { "data-testid": "nav-login" } }, text(ref("login")))]),
    when(and(eq(ref("actions"), "cta"), ref("cta")), [use("Button", { props: { Variant: cond(eq(ref("tone"), "inverse"), "secondary", "default"), Size: "sm", Href: ref("ctaHref") }, attrs: { "data-testid": "header-cta" } }, text(ref("cta")))]),
    when(ref("themeLabel"), [use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("emit.theme") }, attrs: { "data-testid": "theme-toggle" } }, text(ref("themeLabel")))]),
  ],
});

/** a search field with its keyboard shortcut, for the search layout of a bar */
export const searchPalette = spec(`${P}search-palette`, "SearchPalette", "A search field with a search glyph and the keys that open it.", {
  props: [
    { name: "label", type: "string", required: true, docs: "name and placeholder of the field" },
    { name: "shortcut", type: "string", required: true },
  ],
  view: [use("Box", { props: { Class: "relative w-full max-w-sm" }, attrs: { "data-testid": "palette" } },
    use("LucideIcon", { props: { Name: "search", Size: 16, Class: "pointer-events-none absolute top-2 left-3 text-muted-foreground" } }),
    use("Input", { props: { Type: "search", Size: "sm", Placeholder: ref("label"), AriaLabel: ref("label"), Class: "pr-12 pl-10" } }),
    use("Inline", { props: { Class: "pointer-events-none absolute top-2 right-2 rounded px-2 py-0 text-xs text-muted-foreground inset-ring inset-ring-border" } }, text(ref("shortcut"))))],
});

/** a picture behind its children (a transparent bar over a hero picture); off: the children alone */
export const overMedia = spec(`${P}over-media`, "OverMedia", "A faded picture behind the content of its header (a transparent top bar over a hero image); on false: nothing. It sits inside the header Block, which is `relative isolate overflow-hidden` and transparent when on, so the header stays the root of the block (rule 01).", {
  props: [
    { name: "on", type: "boolean", default: false },
    { name: "alt", type: "string", required: true, docs: "accessible name of the picture" },
  ],
  view: [when(ref("on"),
    [use("Box", { props: { Class: "pointer-events-none absolute inset-0 -z-10" }, attrs: { "data-testid": "over" } },
      organism("MediaFrame", { alt: ref("alt"), ratio: "21/9", className: "size-full rounded-none opacity-40" }))])],
});
