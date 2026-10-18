// Dashboard shells of the catalog: twelve frames of a signed-in app that combine a top bar, a sidebar and a footer around placeholder cards.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const s = (k: string) => t(`dashboard.shells.${k}`);
const when2 = (sel: string, n: number | string, axis: string, on: string | string[], off: string | string[]) => [{ sel, n, when: { [axis]: on } }, { sel, n: 0, when: { [axis]: off } }];

/** the texts and links of a shell, shared by the gallery and the catalog pages */
export const shellNav = {
  label: s("label"), brand: t("site.header.brand"), links: ref("sidenav"), current: "item-orders",
  subTitle: s("subTitle"), sub: ref("subnav"), subCurrent: "subitem-all",
  search: s("search"), shortcut: s("shortcut"), expand: s("expand"), userName: s("userName"),
  copyright: s("copyright"), footerLabel: s("footerLabel"), footer: ref("helplinks"),
};

const dashshell = define({
  key: "dashshell", theme: "dashboard", group: "layout", name: "Dashboard shell", docs: "Twelve frames of a signed-in app around empty cards: a top bar across the shell or over the content, with or without search; a wide, rail, collapsed, two-level or no sidebar, at the start or the end; a footer across the shell, under the content or none.",
  organism: "DashboardShell", axes: ["topbar", "search", "sidebar", "side", "footer", "content"], data: [d.sidenav, d.subnav, d.helplinks],
  variants: [
    ["classic", "Top bar across, wide sidebar"],
    ["inset", "Top bar over the content, footer under it", { topbar: "inset", footer: "inset", content: "split" }],
    ["rail", "Top bar across, icon rail, no search", { sidebar: "rail", search: "hide", content: "list" }],
    ["railFooter", "Icon rail, top bar over the content, footer across", { topbar: "inset", sidebar: "rail", footer: "full" }],
    ["collapsed", "Collapsed sidebar, top bar over the content", { topbar: "inset", sidebar: "collapsed", content: "split" }],
    ["twoLevel", "Two-level sidebar, footer under the content", { topbar: "inset", search: "hide", sidebar: "twolevel", footer: "inset", content: "list" }],
    ["twoLevelFull", "Two-level sidebar under a top bar, footer across", { sidebar: "twolevel", footer: "full", content: "split" }],
    ["end", "Wide sidebar at the end, footer across", { side: "end", footer: "full", content: "split" }],
    ["railEnd", "Icon rail at the end, top bar over the content", { topbar: "inset", search: "hide", sidebar: "rail", side: "end", footer: "inset" }],
    ["topOnly", "Top bar with the links, no sidebar", { sidebar: "none", footer: "full" }],
    ["sideOnly", "Wide sidebar, no top bar", { topbar: "none", footer: "inset", content: "list" }],
    ["collapsedEnd", "Collapsed sidebar at the end, no top bar", { topbar: "none", sidebar: "collapsed", side: "end", footer: "full", content: "split" }],
  ],
  facts: [
    { sel: '[data-testid="dashboard-shell"]', n: 1 },
    ...when2('[data-testid="topbar"]', 1, "topbar", ["full", "inset"], "none"),
    ...when2('[data-testid="sidebar"]', 1, "sidebar", ["wide", "rail", "collapsed", "twolevel"], "none"),
    ...when2('[data-testid="subnav"]', 1, "sidebar", "twolevel", ["wide", "rail", "collapsed", "none"]),
    ...when2('[data-testid="toggle"]', 1, "sidebar", "collapsed", ["wide", "rail", "twolevel", "none"]),
    ...when2('[data-testid="footer"]', 1, "footer", ["full", "inset"], "none"),
    { sel: '[data-testid="sidebar"] [data-testid="items"] [data-testid="item"]', n: "@sidenav", when: { sidebar: ["wide", "rail", "collapsed", "twolevel"] } },
    { sel: '[data-testid="subnav"] [data-testid="item"]', n: "@subnav", when: { sidebar: "twolevel" } },
    { sel: '[data-testid="footer"] li', n: "@helplinks", when: { footer: ["full", "inset"] } },
    { sel: '[data-testid="panel"]', n: 5, when: { content: "grid" } },
    { sel: '[data-testid="panel"]', n: 3, when: { content: "split" } },
    { sel: '[data-testid="panel"]', n: 1, when: { content: "list" } },
  ],
  sample: { id: "dashshell", title: s("title"), nav: shellNav },
});

export const shellBlocks = [dashshell];
