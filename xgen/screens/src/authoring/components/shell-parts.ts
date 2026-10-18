// Parts of DashboardShell: the top bar, the sidebar in four shapes, the placeholder content and the footer.
// Collapsing and expanding the sidebar is a port contract (the toggle event); the parts draw one static state.
import { and, call, cn, cond, each, eq, gt, len, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted } from "../ux";
import { navBlockOf } from "./landmarks";
import { currentOf, menuEntry } from "./nav";

const P = "pattern.";
const types = [{ from: "DashboardShell", names: ["ShellNav"] }];
const nav = { name: "nav", type: ts("ShellNav"), required: true, docs: "the brand, the links and the texts of the shell" };
/** the brand mark; the name is hidden (still read) when `named` is false */
const brand = (named: Value): ViewNode => use("Group", { props: { Gap: "2", Align: "center", Class: "shrink-0" }, attrs: { "data-testid": "brand" } },
  use("LucideIcon", { props: { Name: "layers", Size: 24 } }), use("Text", { props: { Size: "base", Weight: "bold", Class: cond(named, "", "sr-only") } }, text(ref("nav.brand"))));
/** one link of a list: the icon and the name (hidden when `named` is false), the current one marked */
const item = (l: string, current: Value, named: Value): ViewNode => use("ListItem", {},
  menuEntry(ref(`${l}.href`), { size: "sm", cls: cn("flex items-center gap-4 rounded py-2 text-sm", cond(named, "px-4", "justify-center px-2"), cond(eq(ref(`${l}.id`), current), "bg-muted font-medium", "")), current: currentOf(l, current), testid: "item" },
    use("LucideIcon", { props: { Name: ref(`${l}.icon`), Size: 16 } }), use("Inline", { props: { Class: cond(named, "", "sr-only") } }, text(ref(`${l}.name`)))));
/** a grey bar of a placeholder */
const bar = (cls: string): ViewNode => use("Box", { props: { Class: cn("rounded bg-muted", cls) } });
/** an empty card of the placeholder content */
const panel = (cls: string, inner: ViewNode[] = [bar("h-4 w-1/3"), bar("flex-1")]): ViewNode =>
  use("Box", { props: { Class: cn("flex flex-col gap-4 rounded bg-card p-4 inset-ring inset-ring-border", cls) }, attrs: { "data-testid": "panel" } }, ...inner);

/** the search field of the top bar */
const palette = organism("SearchPalette", { label: ref("nav.search"), shortcut: ref("nav.shortcut") });

export const shellTopbar = spec(`${P}shell-topbar`, "ShellTopbar", "The top bar of DashboardShell: the brand (when no sidebar carries it), the links (when there is no sidebar), an optional search field, and the signed-in person.", {
  frame: true,
  typeImports: types,
  props: [
    nav,
    { name: "brand", type: tsOf("show", "hide"), default: "show" },
    { name: "links", type: tsOf("show", "hide"), default: "hide" },
    { name: "search", type: tsOf("show", "hide"), default: "show" },
  ],
  view: [use("Block", { props: { Tag: "header", Class: "flex h-16 shrink-0 items-center gap-6 border-b border-border bg-background px-6" }, attrs: { "data-testid": "topbar" } },
    when(eq(ref("brand"), "show"), [brand(true)]),
    when(and(eq(ref("links"), "show"), gt(len(ref("nav.links")), 0)), [navBlockOf(ref("nav.label"), "hidden lg:block", undefined,
      use("List", { props: { Class: "m-0 flex list-none items-center gap-2 p-0" } }, each(ref("nav.links"), "l", ref("l.id"), item("l", ref("nav.current"), true))))]),
    // beside the links the field keeps a fixed width at the end (from xl); alone it takes the free space up to max-w-sm
    when(eq(ref("search"), "show"), [when(eq(ref("links"), "show"), [use("Box", { props: { Class: "ml-auto hidden w-64 shrink-0 xl:block" } }, palette)], [palette])]),
    use("Group", { props: { Gap: "4", Align: "center", Class: cond(and(eq(ref("links"), "show"), eq(ref("search"), "show")), "shrink-0", "ml-auto shrink-0") }, attrs: { "data-testid": "user" } },
      use("LucideIcon", { props: { Name: "bell", Size: 20, Class: "text-muted-foreground" } }),
      organism("MediaFrame", { alt: ref("nav.userName"), ratio: "1/1", className: "size-8 shrink-0 rounded-full" }))),
  ],
});

export const shellSidebar = spec(`${P}shell-sidebar`, "ShellSidebar", "The sidebar of DashboardShell. Shapes: wide (icon and name), rail (icons only, the names still read), collapsed (the static collapsed state of a wide sidebar, with its expand button), twolevel (a rail beside a panel of the current section's links). side puts it at the start or the end.", {
  frame: true,
  typeImports: types,
  props: [
    nav,
    { name: "mode", type: tsOf("wide", "rail", "collapsed", "twolevel", "none"), default: "wide", docs: "the DashboardShell sidebar; the shell draws no sidebar for none" },
    { name: "side", type: tsOf("start", "end"), default: "start" },
    { name: "brand", type: tsOf("show", "hide"), default: "show" },
  ],
  events: [{ name: "toggle", args: [], docs: "the expand button of the collapsed sidebar was pressed" }],
  derived: [{ name: "named", value: eq(ref("mode"), "wide") }],
  view: [use("Block", { props: { Tag: "aside", Class: cn("flex shrink-0 bg-card", cond(eq(ref("side"), "end"), "flex-row-reverse border-l border-border", "border-r border-border")) }, attrs: { "aria-label": ref("nav.label"), "data-testid": "sidebar", "data-mode": ref("mode") } },
    use("Box", { props: { Class: cn("flex flex-col gap-6 py-4", cond(ref("named"), "w-64 px-4", "w-16 items-center px-2")) } },
      when(eq(ref("brand"), "show"), [brand(ref("named"))]),
      when(gt(len(ref("nav.links")), 0), [navBlockOf(ref("nav.label"), "flex-1", undefined,
        use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" }, attrs: { "data-testid": "items" } }, each(ref("nav.links"), "l", ref("l.id"), item("l", ref("nav.current"), ref("named")))))]),
      when(eq(ref("mode"), "collapsed"), [use("ButtonPlain", { props: { Type: "button", Class: "inline-flex size-10 items-center justify-center rounded text-muted-foreground" }, on: { click: call("emit.toggle") }, attrs: { "aria-label": ref("nav.expand"), "aria-expanded": cond(eq(ref("mode"), "wide"), "true", "false"), "data-testid": "toggle" } },
        use("LucideIcon", { props: { Name: "panel-left", Size: 20 } }))])),
    when(and(eq(ref("mode"), "twolevel"), gt(len(ref("nav.sub")), 0)), [use("Box", { props: { Class: cn("flex w-56 flex-col gap-4 px-4 py-6", cond(eq(ref("side"), "end"), "border-r border-border", "border-l border-border")) }, attrs: { "data-testid": "subnav" } },
      use("Text", { props: { Size: "sm", Weight: "semibold", Class: "px-4" } }, text(ref("nav.subTitle"))),
      navBlockOf(ref("nav.subTitle"), undefined, undefined,
        use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } }, each(ref("nav.sub"), "s", ref("s.id"), item("s", ref("nav.subCurrent"), true)))))]),
  )],
});

export const shellContent = spec(`${P}shell-content`, "ShellContent", "The placeholder content of DashboardShell: the page heading beside a grey action, then empty cards on the 8px grid. Shapes: grid (four small cards over a big one), split (a wide card beside a narrow one over a low one), list (a toolbar over a card of rows). The cards are hidden from assistive technology.", {
  props: [
    { name: "title", type: "string", required: true },
    { name: "titleId", type: "string", required: true },
    { name: "level", type: ts("1 | 2"), default: 2 },
    { name: "content", type: tsOf("grid", "split", "list"), default: "grid" },
  ],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch", Class: "flex-1 p-6" }, attrs: { "data-testid": "content" } },
    use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } },
      use("Title", { props: { As: ref("level"), Size: "2xl", Weight: "semibold" }, attrs: { id: ref("titleId") } }, text(ref("title"))),
      use("Box", { props: { Class: "h-10 w-32 rounded bg-muted" }, attrs: { "aria-hidden": "true" } })),
    use("Box", { props: { Class: "flex flex-1 flex-col gap-4" }, attrs: { "aria-hidden": "true", "data-testid": "panels" } },
      when(eq(ref("content"), "grid"), [
        use("Box", { props: { Class: "grid grid-cols-2 gap-4 lg:grid-cols-4" } }, panel("h-24"), panel("h-24"), panel("h-24"), panel("h-24")),
        panel("min-h-64 flex-1")]),
      when(eq(ref("content"), "split"), [
        use("Box", { props: { Class: "grid grid-cols-1 gap-4 lg:grid-cols-3" } }, panel("h-64 lg:col-span-2"), panel("h-64")),
        panel("min-h-40 flex-1")]),
      when(eq(ref("content"), "list"), [
        use("Group", { props: { Gap: "4", Align: "center" } }, bar("h-10 w-64"), bar("h-10 w-24"), bar("ml-auto h-10 w-32")),
        panel("flex-1", [bar("h-8"), bar("h-8"), bar("h-8"), bar("h-8"), bar("h-8"), bar("h-8")])])),
  )],
});

export const shellFooter = spec(`${P}shell-footer`, "ShellFooter", "The footer of DashboardShell: the copyright and a row of links, under the content column (inset) or across the whole shell (full).", {
  frame: true,
  typeImports: types,
  props: [nav, { name: "place", type: tsOf("full", "inset"), default: "full" }],
  view: [use("Block", { props: { Tag: "footer", Class: cn("flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4", cond(eq(ref("place"), "full"), "bg-card", "")) }, attrs: { "data-testid": "footer", "data-place": ref("place") } },
    muted(ref("nav.copyright"), "xs"),
    when(gt(len(ref("nav.footer")), 0), [navBlockOf(ref("nav.footerLabel"), undefined, undefined,
      use("List", { props: { Class: "m-0 flex list-none items-center gap-4 p-0" } }, each(ref("nav.footer"), "f", ref("f.id"),
        use("ListItem", {}, menuEntry(ref("f.href"), { variant: "muted", size: "sm", cls: "text-xs text-muted-foreground" }, text(ref("f.name")))))))]),
  )],
});

export const shellParts: OrganismSpec[] = [shellTopbar, shellSidebar, shellContent, shellFooter];
