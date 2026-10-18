// Dashboard shells: the frame of a signed-in app with placeholder content, combining a top bar, a sidebar and a footer.
// The content is empty cards on purpose: what goes into a dashboard is a separate set of blocks.
import { cn, cond, eq, ne, ref, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, Value } from "../../ir";
import { fields, spec, ts } from "../kit";
import { wide } from "../components/frames";
import { id, title, tsOf } from "../props";

const O = "organism.";
const dashboardShell = spec(`${O}dashboard-shell`, "DashboardShell", "The frame of a signed-in app around placeholder content. Axes: topbar (full: across the whole shell, inset: over the content column only, none), search (show, hide: the search field of the top bar), sidebar (wide, rail, collapsed: the static collapsed state, twolevel: a rail and a section panel, none: the top bar carries the links), side (start, end), footer (full, inset, none), content (grid, split, list), frame (window: a framed window in a section, page: the whole page). Collapsing the sidebar is a port contract.", {
  typeImports: [{ from: "NavBar", names: ["NavLink"] }],
  records: {
    ShellNav: fields(["label", "string"], ["brand", "string"], ["links", "NavLink[]"], ["current", "string"], ["subTitle", "string"], ["sub", "NavLink[]"], ["subCurrent", "string"],
      ["search", "string"], ["shortcut", "string"], ["expand", "string"], ["userName", "string"], ["copyright", "string"], ["footerLabel", "string"], ["footer", "NavLink[]"]),
  },
  props: [
    id, title,
    { name: "level", type: ts("1 | 2"), default: 2 },
    { name: "nav", type: ts("ShellNav"), required: true, docs: "the brand, the links of both levels and the texts of the shell" },
    { name: "topbar", type: tsOf("full", "inset", "none"), default: "full" },
    { name: "search", type: tsOf("show", "hide"), default: "show" },
    { name: "sidebar", type: tsOf("wide", "rail", "collapsed", "twolevel", "none"), default: "wide" },
    { name: "side", type: tsOf("start", "end"), default: "start" },
    { name: "footer", type: tsOf("full", "inset", "none"), default: "none" },
    { name: "content", type: tsOf("grid", "split", "list"), default: "grid" },
    { name: "frame", type: tsOf("window", "page"), default: "window" },
  ],
  derived: [{ name: "titleId", value: tpl("{0}-title", ref("id")) }],
  view: (() => {
    const bar = (brand: Value) => organism("ShellTopbar", { nav: ref("nav"), brand, links: cond(eq(ref("sidebar"), "none"), "show", "hide"), search: ref("search") });
    const footer = (place: string) => when(eq(ref("footer"), place), [organism("ShellFooter", { nav: ref("nav"), place })]);
    return [use("Block", { props: { Tag: "section", Class: cond(eq(ref("frame"), "window"), "bg-background py-12", "bg-background") }, attrs: { id: ref("id"), "aria-labelledby": ref("titleId"), "data-testid": "dashboard-shell", "data-topbar": ref("topbar"), "data-sidebar": ref("sidebar"), "data-footer": ref("footer") } },
      use("Box", { props: { Class: cond(eq(ref("frame"), "window"), wide, "") } },
        use("Box", { props: { Class: cn("flex flex-col overflow-hidden bg-background", cond(eq(ref("frame"), "window"), "min-h-160 rounded border border-border", "min-h-screen")) }, attrs: { "data-testid": "window" } },
          when(eq(ref("topbar"), "full"), [bar("show")]),
          use("Box", { props: { Class: cn("flex min-h-0 flex-1", cond(eq(ref("side"), "end"), "flex-row-reverse", "")) } },
            when(ne(ref("sidebar"), "none"), [organism("ShellSidebar", { nav: ref("nav"), mode: ref("sidebar"), side: ref("side"), brand: cond(eq(ref("topbar"), "full"), "hide", "show") })]),
            use("Box", { props: { Class: "flex min-w-0 flex-1 flex-col" } },
              when(eq(ref("topbar"), "inset"), [bar(cond(eq(ref("sidebar"), "none"), "show", "hide"))]),
              organism("ShellContent", { title: ref("title"), titleId: ref("titleId"), level: ref("level"), content: ref("content") }),
              footer("inset"))),
          footer("full")))),
    ];
  })(),
});

export const shellOrganisms: OrganismSpec[] = [dashboardShell];
