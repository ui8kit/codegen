// Navigation organisms: the top bar in five shapes, a mega menu, a sidebar, a bottom tab bar, and the sitemap footer.
// Scroll behavior (a bar that turns solid) and the opening of the mega menu are port contracts; the organisms show the states.
import { call, cn, coalesce, cond, each, eq, ne, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { groupFields, rec, requireFields, spec, ts } from "../kit";
import { wide } from "../components/frames";
import { ifAny, tsOf, toneLite } from "../props";
import { kids } from "../forms";
import { emailRow } from "../forms";
import { heading, muted, strong, surface } from "../ux";
import { NavLink, Group, link, brandLink, currentOf, groupLinks, menuEntry, menuEntrySpec, navLinks, navBarMenu, navActions, searchPalette, overMedia } from "../components/nav";
import { footerColumns, footerCard } from "../components/footer";
import { navBlockOf } from "../components/landmarks";

const O = "organism.";
const skipLink = (): ViewNode => when(ref("skip"), [use("LinkPlain", { props: { Href: "#main-content", Class: "sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:inset-ring focus:inset-ring-border" }, attrs: { "data-testid": "skip-link" } }, text(ref("skip")))]);

const navBar = spec(`${O}nav-bar`, "NavBar", "A top bar in four shapes. Axes: layout (inline: brand left, links, button right; split: the brand in the middle with the links on both sides; search: a search field with its shortcut in the middle), over (none, media: the bar sits over a picture, transparent), actions mode (none, cta), tone (default, inverse: on a dark hero band). Turning solid on scroll is a port contract.", {
  records: {
    NavLink,
    NavBarActions: groupFields(
      ["mode", tsOf("none", "cta"), "cta: show the call to action", "cta"], ["cta", "string", "text of the call to action"], ["href", "string", "href of the call to action"],
      ["login", "string", "text of the login link; none: no login"], ["loginHref", "string", "href of the login link; none: a button with no address"], ["themeLabel", "string", "text of the theme button; none: no button"]),
    NavSearch: requireFields(groupFields(["label", "string", "name and placeholder of the search field (layout search)"], ["shortcut", "string", "the keys that open the search, shown in the field"]), "label", "shortcut"),
  },
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the navigation" },
    { name: "brand", type: "string", required: true },
    { name: "brandHref", type: "string", docs: "the address of the home page; none: the brand is text, not a link" },
    { name: "links", type: ts("NavLink[]"), required: true },
    { name: "current", type: "string", default: "", docs: "id of the current link" },
    { name: "actions", type: rec("NavBarActions"), docs: "the buttons at the end of the bar" },
    { name: "search", type: rec("NavSearch"), required: true, docs: "the search field of layout search" },
    { name: "tone", type: tsOf("default", "inverse"), default: "default", docs: "inverse: sits on a dark hero band" },
    { name: "layout", type: tsOf("inline", "split", "search"), default: "inline" },
    { name: "over", type: tsOf("none", "media"), default: "none" },
    { name: "skip", type: "string", docs: "text of the skip link to the main content; none: no link" },
  ],
  events: [{ name: "theme", args: [], docs: "the theme button was pressed" }],
  view: (() => {
    const links = (side: "all" | "left" | "right") => organism("NavLinks", { links: ref("links"), current: ref("current"), side });
    const buttons = () => organism("NavActions", { login: ref("actions.login"), loginHref: ref("actions.loginHref"), cta: ref("actions.cta"), ctaHref: ref("actions.href"), actions: ref("actions.mode"), tone: ref("tone"), themeLabel: ref("actions.themeLabel") }, { on: { theme: call("emit.theme") } });
    const inner = [when(eq(ref("layout"), "split"),
      // one navigation split around the brand: one NavBlock (one landmark), the halves are plain boxes
      [navBlockOf(ref("label"), "w-full", "site-nav", use("Grid", { props: { Cols: "1-3", Class: "w-full items-center gap-4" } },
        use("Box", { props: { Class: "md:justify-self-start" } }, links("left")),
        use("Box", { props: { Class: "text-center" } }, brandLink()),
        use("Group", { props: { Gap: "4", Align: "center", Justify: "end", Class: "flex-wrap md:justify-self-end" } }, use("Box", {}, links("right")), buttons())))],
      [brandLink(),
       when(eq(ref("layout"), "search"), [organism("SearchPalette", { label: ref("search.label"), shortcut: ref("search.shortcut") })]),
       // below md the links take a row of their own under the brand and the buttons, one line that scrolls sideways
       // instead of wrapping into a block of rows
       organism("NavBarMenu", { label: ref("label"), links: ref("links"), current: ref("current") }),
       buttons()])];
    // over a picture: the header itself carries the picture layer (OverMedia) and turns transparent; it stays the root Block
    const bar = use("Block", { props: { Tag: "header", Class: cn("relative", cond(eq(ref("tone"), "inverse"), "border-b border-transparent bg-foreground text-background [&_a]:text-background [&_button]:text-background", "border-b border-border bg-background"), cond(eq(ref("over"), "media"), "isolate overflow-hidden border-0 bg-transparent", "")) }, attrs: { "data-testid": "nav-bar", "data-layout": ref("layout"), "data-tone": ref("tone") } },
      organism("OverMedia", { on: eq(ref("over"), "media"), alt: ref("brand") }),
      skipLink(),
      use("Container", { props: { Class: wide }, attrs: { "data-slot": "container" } },
        use("Box", { props: { Class: cn("flex flex-wrap items-center justify-between gap-4", "py-4") } }, ...inner)));
    return [bar];
  })(),
});

const megaMenu = spec(`${O}mega-menu`, "MegaMenu", "A top bar whose first item opens a wide panel of link groups, each with an icon and a list, and an optional promo card. The page keeps `open`; opening on hover or click is a port contract. Axes: panel (open, closed), cols (2, 3), promo (none, card).", {
  records: { MegaGroup: Group },
  props: [
    { name: "label", type: "string", required: true },
    { name: "brand", type: "string", required: true },
    { name: "brandHref", type: "string", docs: "the address of the home page; none: the brand is text" },
    { name: "trigger", type: "string", required: true, docs: "text of the item that opens the panel" },
    { name: "links", type: ts("NavLink[]"), required: true, docs: "the other items of the bar" },
    { name: "groups", type: ts("MegaGroup[]"), required: true },
    { name: "promoTitle", type: "string" },
    { name: "promoText", type: "string" },
    { name: "panel", type: tsOf("open", "closed"), default: "open" },
    { name: "cols", type: tsOf("2", "3"), default: "3" },
    { name: "promo", type: tsOf("none", "card"), default: "none" },
  ],
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  view: [
    use("Block", { props: { Tag: "header", Class: "relative border-b border-border bg-background" }, attrs: { "data-testid": "mega-menu" } },
      use("Container", { props: { Class: cn(wide, "flex flex-wrap items-center gap-6 py-4") }, attrs: { "data-slot": "container" } },
        brandLink(),
        navBlockOf(ref("label"), "flex-1", undefined,
          use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" } },
            use("ButtonPlain", { props: { Type: "button", Class: "inline-flex items-center gap-2 text-sm font-semibold" }, attrs: { "aria-expanded": cond(eq(ref("panel"), "open"), "true", "false"), "data-testid": "mega-trigger" } },
              text(ref("trigger")), use("LucideIcon", { props: { Name: "chevron-down", Size: 16 } })),
            each(ref("links"), "l", ref("l.id"), link("l", "")))))),
      when(eq(ref("panel"), "open"), [use("Box", { props: { Class: "border-t border-border bg-card" }, attrs: { "data-testid": "mega-panel" } },
        use("Container", { props: { Class: cn(wide, "grid gap-8 py-6", cond(eq(ref("promo"), "card"), "md:grid-cols-[1fr_16rem]", "")) }, attrs: { "data-slot": "container" } },
          ifAny("groups", [use("Grid", { props: { Cols: cond(eq(ref("cols"), "2"), "1-2", "1-3"), Class: "gap-6" }, attrs: { "data-testid": "items" } },
            each(ref("groups"), "g", ref("g.id"), use("Stack", { props: { Gap: "2" }, attrs: { "data-testid": "item" } },
              use("Group", { props: { Gap: "2", Align: "center" } }, use("LucideIcon", { props: { Name: ref("g.icon"), Size: 16 } }), strong(ref("g.title"), "sm")),
              use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } }, groupLinks("g", "text-sm text-muted-foreground")))))]),
          when(eq(ref("promo"), "card"), [use("Stack", { props: { Gap: "2", Class: surface("p-4") }, attrs: { "data-testid": "promo" } },
            organism("MediaFrame", { alt: coalesce(ref("promoTitle"), ""), ratio: "4/3" }), strong(ref("promoTitle")), muted(ref("promoText"), "xs"))])))]),
  ],
});

const sidebarNav = spec(`${O}sidebar-nav`, "SidebarNav", "A vertical navigation: the brand at the top, the links stacked, the user at the bottom. Axes: width (full: icon and name, compact: icons only with the name hidden), user (show, hide), density.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [
    { name: "label", type: "string", required: true },
    { name: "brand", type: "string", required: true },
    { name: "links", type: ts("NavLink[]"), required: true },
    { name: "current", type: "string", default: "" },
    { name: "userName", type: "string", required: true },
    { name: "userEmail", type: "string", required: true },
    { name: "width", type: tsOf("full", "compact"), default: "full" },
    { name: "user", type: tsOf("show", "hide"), default: "show" },
    { name: "density", type: tsOf("default", "compact"), default: "default" },
  ],
  view: [
    use("Block", { props: { Tag: "aside", Class: cn("flex min-h-96 flex-col gap-6 rounded bg-card p-4 inset-ring inset-ring-border", cond(eq(ref("width"), "compact"), "w-20 items-center", "w-64")) }, attrs: { "aria-label": ref("brand"), "data-testid": "sidebar", "data-width": ref("width") } },
      use("Group", { props: { Gap: "2", Align: "center" } }, use("LucideIcon", { props: { Name: "layers", Size: 24 } }), use("Text", { props: { Size: "base", Weight: "bold", Class: cond(eq(ref("width"), "compact"), "sr-only", "") } }, text(ref("brand")))),
      ifAny("links", [navBlockOf(ref("label"), "flex-1", undefined,
        use("List", { props: { Class: cn("m-0 flex list-none flex-col p-0", cond(eq(ref("density"), "compact"), "gap-0", "gap-2")) }, attrs: { "data-testid": "items" } },
          each(ref("links"), "l", ref("l.id"), use("ListItem", {},
            menuEntry(ref("l.href"), { cls: cn("flex items-center gap-4 rounded px-4 text-sm", "py-2", cond(eq(ref("l.id"), ref("current")), "bg-muted font-semibold", "")), current: currentOf("l", ref("current")), testid: "item" },
              use("LucideIcon", { props: { Name: ref("l.icon"), Size: 16 } }), use("Inline", { props: { Class: cond(eq(ref("width"), "compact"), "sr-only", "") } }, text(ref("l.name"))))))))]),
      when(eq(ref("user"), "show"), [use("Group", { props: { Gap: "4", Align: "center", Class: "border-t border-border pt-4" }, attrs: { "data-testid": "user" } },
        organism("MediaFrame", { alt: ref("userName"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }),
        use("Stack", { props: { Gap: "0", Class: cond(eq(ref("width"), "compact"), "sr-only", "min-w-0") } }, strong(ref("userName"), "sm"), muted(ref("userEmail"), "xs")))])),
  ],
});

const bottomNav = spec(`${O}bottom-nav`, "BottomNav", "An app-style tab bar for a phone: an icon over a label per tab, the current one marked. Axes: labels (show, hide: icons only with the name hidden), position (static, sticky: stays at the bottom of the page), tone.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  props: [
    { name: "label", type: "string", required: true },
    { name: "tabs", type: ts("NavLink[]"), required: true },
    { name: "current", type: "string", default: "" },
    { name: "labels", type: tsOf("show", "hide"), default: "show" },
    { name: "position", type: tsOf("static", "sticky"), default: "static" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [ifAny("tabs", [
    use("Block", { props: { Tag: "nav", Class: cn("mx-auto w-full max-w-md border-t border-border", cond(eq(ref("tone"), "muted"), "bg-muted", "bg-background"), cond(eq(ref("position"), "sticky"), "sticky bottom-0 z-40", "")) }, attrs: { "aria-label": ref("label"), "data-testid": "bottom-nav", "data-position": ref("position") } },
      use("List", { props: { Class: "m-0 grid list-none grid-flow-col auto-cols-fr p-0" }, attrs: { "data-testid": "items" } },
        each(ref("tabs"), "tab", ref("tab.id"), use("ListItem", {},
          menuEntry(ref("tab.href"), { cls: cn("flex flex-col items-center gap-2 py-2 text-xs", cond(eq(ref("tab.id"), ref("current")), "font-semibold text-primary", "text-muted-foreground")), current: currentOf("tab", ref("current")), testid: "item" },
            use("LucideIcon", { props: { Name: ref("tab.icon"), Size: 20 } }), use("Inline", { props: { Class: cond(eq(ref("labels"), "hide"), "sr-only", "") } }, text(ref("tab.name"))))))))]),
  ],
});

const sitemapFooter = spec(`${O}sitemap-footer`, "SitemapFooter", "A footer with the brand, a tagline, groups of links and the copyright. Axes: layout (columns: brand above, equal columns per group, row: the brand, the group names and the copyright in one row), signup mode (none, first: a sign-up above the links), status mode (none, show: a live status pill), density. The live status itself is a port contract.", {
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }],
  records: {
    FooterSignup: groupFields(["mode", tsOf("none", "first"), "first: the sign-up comes before the links", "none"], ["title", "string"], ["label", "string", "accessible name of the email field"], ["submit", "string"]),
    FooterStatus: groupFields(["mode", tsOf("none", "show"), "show: the status pill is drawn", "none"], ["label", "string", "text of the pill"]),
  },
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the link groups" },
    { name: "brand", type: "string", required: true },
    { name: "tagline", type: "string", required: true },
    { name: "copyright", type: "string", required: true },
    { name: "groups", type: ts("MegaGroup[]"), required: true },
    { name: "signup", type: rec("FooterSignup"), docs: "a newsletter sign-up above the links" },
    { name: "status", type: rec("FooterStatus"), docs: "a live status pill beside the copyright" },
    { name: "id", type: "string", default: "footer" },
    { name: "layout", type: tsOf("columns", "row", "card"), default: "columns", docs: "card: the groups in one rounded card (FooterCard)" },
    { name: "density", type: tsOf("default", "compact"), default: "default" },
  ],
  view: (() => {
    const card = organism("FooterCard", { label: ref("label"), brand: ref("brand"), groups: ref("groups") });
    const classic = use("Block", { props: { Tag: "footer", Class: "mt-12 border-t border-border" }, attrs: { "data-testid": "site-footer", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, "flex flex-col gap-8", cond(eq(ref("density"), "compact"), "py-6", "py-12")) }, attrs: { "data-slot": "container" } },
        when(eq(ref("signup.mode"), "first"), [use("Stack", { props: { Gap: "4", Class: "max-w-md" }, attrs: { "data-testid": "signup" } },
          heading(ref("signup.title"), "xl"), emailRow(ref("signup.label"), ref("signup.submit"), false))]),
        when(eq(ref("layout"), "columns"),
          [use("Box", { props: { Class: "flex flex-col gap-8 md:flex-row md:items-start md:gap-12" }, attrs: { "data-slot": "footer-top" } },
            use("Stack", { props: { Gap: "2", Class: "md:w-64 md:shrink-0" } }, strong(ref("brand"), "xl", "bold"), muted(ref("tagline"))),
            use("Box", { props: { Class: "min-w-0 flex-1" } }, organism("FooterColumns", { label: ref("label"), groups: ref("groups") })))],
          [use("Group", { props: { Gap: "6", Align: "center", Justify: "between", Class: "flex-wrap" } },
            strong(ref("brand"), "base", "bold"),
            ifAny("groups", [navBlockOf(ref("label"), undefined, undefined, use("Group", { props: { Gap: "4", Class: "flex-wrap" } }, each(ref("groups"), "g", ref("g.id"), menuEntry(ref("g.href"), { cls: "text-sm", testid: "group" }, text(ref("g.title"))))))]))]),
        use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "flex-wrap border-t border-border pt-6" } },
          muted(ref("copyright")),
          when(eq(ref("status.mode"), "show"), [organism("Pill", { tone: "green", icon: "circle-check" }, kids(text(ref("status.label"))))]))));
    return [when(eq(ref("layout"), "card"), [card], [classic])];
  })(),
});

export const navigationOrganisms: OrganismSpec[] = [navBar, menuEntrySpec, navLinks, navBarMenu, navActions, searchPalette, overMedia, megaMenu, sidebarNav, bottomNav, footerColumns, footerCard, sitemapFooter];
