// The patterns of canary (packages/ui/src/patterns). The presentational ones are generated: markup, recipes, ARIA roles.
// What canary did with context, attachments, `$state`, timers or the DOM stays a contract: the programmer writes the behaviour behind the props and events
// (the portable helpers it needs are in the utils of the package: roving, dismissable, trapFocus, lockScroll).
import { cn, call, cond, eq, forward, has, op, organism, ref, slot, text, undef, use, when, not, and } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { contract, defaultOf, fields, prop, recipeExamples, req, spec, ts, union } from "../kit";

const P = "pattern.";
const recipe = (name: string, ...pairs: Array<string | ReturnType<typeof ref>>) => op("recipe", name, ...pairs);
const state2 = (flag: string, on: string, off = "default") => cond(ref(flag), on, off);

const iconTab = spec(`${P}icon-tab`, "IconTab", "One icon-only tab (28 by 28, a 16 px glyph in the children). `label` is its accessible name. Arrow-key movement between tabs is the job of IconTabs (see roving).", {
  props: [prop("active", "boolean", "the selected tab", { default: false }), req("label", "string", "accessible name")],
  className: true,
  children: true,
  recipes: { iconTab: "icon-tab" },
  examples: recipeExamples("icon-tab", { state: "active" }).map((e) => ({ ...e, props: { label: "Files", active: e.id.endsWith("active") } })),
  events: [{ name: "click", args: [], docs: "the tab was pressed" }],
  view: [
    use("ButtonPlain", { props: { Type: "button", Role: "tab", AriaLabel: ref("label"), Class: cn(recipe("iconTab", "state", state2("active", "active")), ref("className")) }, attrs: { "aria-selected": ref("active"), tabindex: cond(ref("active"), 0, -1), "data-slot": "icon-tab", "data-state": state2("active", "active") }, on: { click: call("emit.click") } }, slot("children")),
  ],
});

const iconTabs = spec(`${P}icon-tabs`, "IconTabs", "A row of icon-only tabs (a file tree pane: Files, Search, Apps). Put IconTab in it. Arrow keys: attach `moveFocus` from the utils to the keydown of the row (orientation horizontal, activate).", {
  props: [prop("label", "string", "accessible name of the tab list")],
  className: true,
  children: true,
  view: [use("Box", { props: { Class: cn("flex items-center gap-2", ref("className")) }, attrs: { role: "tablist", "aria-label": ref("label"), "data-slot": "icon-tabs" } }, slot("children"))],
});

const switcher = spec(`${P}switcher`, "Switcher", "A segmented switcher: a tab list whose items (SwitcherItem) share size and layout. Canary handed these down through context; here each item takes the same two props. Arrow keys: attach `moveFocus` to the keydown (horizontal, activate).", {
  props: [
    prop("size", union("switcher", "size"), "height", { default: defaultOf("switcher", "size") }),
    prop("layout", union("switcher", "layout"), "text or icon items", { default: defaultOf("switcher", "layout") }),
    prop("label", "string", "accessible name"),
  ],
  className: true,
  children: true,
  recipes: { switcher: "switcher" },
  examples: recipeExamples("switcher", { size: "size", layout: "layout" }),
  view: [use("Box", { props: { Class: cn(recipe("switcher", "size", ref("size"), "layout", ref("layout")), ref("className")) }, attrs: { role: "tablist", "aria-label": ref("label"), "data-slot": "switcher" } }, slot("children"))],
});

const switcherItem = spec(`${P}switcher-item`, "SwitcherItem", "One item of a Switcher (default or active). Pass the same size and layout as the Switcher.", {
  props: [
    prop("active", "boolean", "the selected item", { default: false }),
    prop("size", union("switcher-item", "size"), "height", { default: defaultOf("switcher-item", "size") }),
    prop("layout", union("switcher-item", "layout"), "text or icon", { default: defaultOf("switcher-item", "layout") }),
  ],
  className: true,
  children: true,
  recipes: { switcherItem: "switcher-item" },
  examples: [...recipeExamples("switcher-item", { size: "size", layout: "layout" }), { id: "state.active", props: { active: true } }],
  events: [{ name: "click", args: [], docs: "the item was pressed" }],
  view: [
    use("ButtonPlain", { props: { Type: "button", Role: "tab", Class: cn(recipe("switcherItem", "size", ref("size"), "layout", ref("layout"), "state", state2("active", "active")), ref("className")) }, attrs: { "aria-selected": ref("active"), tabindex: cond(ref("active"), 0, -1), "data-slot": "switcher-item", "data-state": state2("active", "active") }, on: { click: call("emit.click") } }, slot("children")),
  ],
});

const editorTab = spec(`${P}editor-tab`, "EditorTab", "An editor file tab (40 px high): a file icon, the label and a close button. `preview` marks a tab that is not pinned yet. Keyboard (Enter and Space activate, Delete closes) is the programmer's behind the click and close events.", {
  props: [req("label", "string"), req("closeLabel", "string", "accessible name of the close button, e.g. \"Close index.tsx\""), prop("active", "boolean", "the selected tab", { default: false }), prop("preview", "boolean", "not pinned yet (italic)", { default: false })],
  className: true,
  slots: [{ name: "icon", args: [], docs: "the file icon" }],
  events: [{ name: "click", args: [], docs: "the tab was pressed" }, { name: "close", args: [], docs: "the close button was pressed" }],
  view: [
    use("Box", { props: { Class: cn("flex h-10 shrink-0 cursor-pointer flex-col justify-center data-[state=active]:bg-card [&_svg]:text-muted-foreground", "border-r border-border", ref("className")) }, attrs: { role: "tab", "aria-selected": ref("active"), tabindex: cond(ref("active"), 0, -1), "data-slot": "editor-tab", "data-state": state2("active", "active") }, on: { click: call("emit.click") } },
      use("Inline", { props: { Class: "flex h-10 items-center gap-2 px-3" }, attrs: { "data-slot": "editor-tab-content" } },
        slot("icon"),
        use("Inline", { props: { Class: cn("text-xs text-foreground", cond(ref("preview"), "font-semibold italic", "font-bold")) }, attrs: { "data-slot": "editor-tab-label" } }, text(ref("label"))),
        use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", Class: "p-0 [&>svg]:size-4", AriaLabel: ref("closeLabel") }, attrs: { tabindex: -1, "data-slot": "editor-tab-close" }, on: { click: call("emit.close") } },
          use("LucideIcon", { props: { Name: "x", Size: 16 } })))),
  ],
});

const fileTree = spec(`${P}file-tree`, "FileTree", "The list of a file tree. Put FileTreeItem in it. Arrow keys and type-ahead: attach `moveFocus` and `typeahead` from the utils to the keydown (vertical, no loop).", {
  props: [prop("label", "string", "accessible name of the tree")],
  className: true,
  children: true,
  view: [use("Box", { props: { Class: cn("flex flex-col gap-2 p-2", ref("className")) }, attrs: { role: "tree", "aria-label": ref("label"), "data-slot": "file-tree" } }, slot("children"))],
});

const fileTreeItem = spec(`${P}file-tree-item`, "FileTreeItem", "A row of a file tree: a folder with a disclosure chevron, or a file. The glyphs are Lucide.", {
  props: [
    prop("kind", union("file-tree-item", "kind"), "folder or file", { default: defaultOf("file-tree-item", "kind") }),
    req("label", "string"),
    prop("selected", "boolean", "the chosen row", { default: false }),
    prop("expanded", "boolean", "an open folder", { default: false }),
  ],
  className: true,
  recipes: { fileTreeItem: "file-tree-item" },
  examples: [...recipeExamples("file-tree-item", { kind: "kind" }, { label: "src" }), { id: "state.selected", props: { label: "index.ts", selected: true } }, { id: "state.expanded", props: { label: "src", kind: "folder", expanded: true } }],
  events: [{ name: "click", args: [], docs: "the row was pressed" }],
  view: [
    use("ButtonPlain", { props: { Type: "button", Role: "treeitem", Class: cn(recipe("fileTreeItem", "kind", ref("kind")), ref("className")) }, attrs: { "aria-selected": ref("selected"), tabindex: cond(ref("selected"), 0, -1), "aria-expanded": cond(eq(ref("kind"), "folder"), ref("expanded"), undef()), "data-slot": "file-tree-item", "data-kind": ref("kind"), "data-state": state2("selected", "selected") }, on: { click: call("emit.click") } },
      when(eq(ref("kind"), "folder"),
        [use("LucideIcon", { props: { Name: cond(ref("expanded"), "chevron-down", "chevron-right"), Size: 16 } }), use("LucideIcon", { props: { Name: "folder-open", Size: 16 } })],
        [use("LucideIcon", { props: { Name: "file", Size: 16 } })]),
      use("Inline", { props: { Class: "whitespace-nowrap" }, attrs: { "data-slot": "file-tree-label" } }, text(ref("label")))),
  ],
});

const navBody = (): ViewNode[] => [
  use("Inline", { props: { Class: ref("inner") }, attrs: { "data-slot": "nav-item-content" } },
    use("Inline", { props: { Class: "flex min-w-0 flex-1 items-center gap-4 in-data-[nav=collapsed]:flex-none in-data-[nav=collapsed]:justify-center" }, attrs: { "data-slot": "nav-item-left" } },
      slot("icon"),
      use("Inline", { props: { Class: "min-w-0 flex-1 truncate in-data-[nav=collapsed]:hidden" }, attrs: { "data-slot": "nav-item-label" } }, slot("children"))),
    when(ref("right"),
      [use("Inline", { props: { Class: "flex items-center gap-2 in-data-[nav=collapsed]:hidden" }, attrs: { "data-slot": "nav-item-right" } }, slot("right"))],
      [when(ref("reserveRight"), [use("Inline", { props: { Class: "size-5 shrink-0 in-data-[nav=collapsed]:hidden" }, attrs: { "data-slot": "nav-item-right" } })])])),
]
/** the row inside a NavItem: written once, the link, button and box roots pass their slots on to it */
const navItemRow = spec(`${P}nav-item-row`, "NavItemRow", "The row inside NavItem: the icon and the label on the left, the right slot (or an empty 20 by 20 frame) on the right.", {
  props: [
    prop("inner", "string", "classes of the row (the nav-item-content recipe, worked out by NavItem)"),
    prop("reserveRight", "boolean", "keep the empty 20 by 20 frame on the right when there is no right content", { default: false }),
  ],
  children: true,
  slots: [{ name: "icon", args: [], docs: "leading icon" }, { name: "right", args: [], docs: "trailing content" }],
  view: navBody(),
});
const navRow = (): ViewNode => organism("NavItemRow", { inner: ref("inner"), reserveRight: ref("reserveRight") },
  { slots: { icon: forward("icon"), right: forward("right"), children: forward("children") } });
const navItem = spec(`${P}nav-item`, "NavItem", "A sidebar list item: icon, label and an optional right slot. With `href` it is a link, with `interactive` a button, otherwise a static box.", {
  props: [
    prop("selected", "boolean", "the current item", { default: false }),
    prop("level", union("nav-item", "level"), "indent level"),
    prop("href", "string"),
    prop("interactive", "boolean", "render a button (the click event is wired)", { default: false }),
    prop("reserveRight", "boolean", "keep the empty 20 by 20 frame on the right when there is no right content", { default: false }),
    prop("contentClass", "string", "classes of the inner row"),
  ],
  className: true,
  children: true,
  slots: [{ name: "icon", args: [], docs: "leading icon" }, { name: "right", args: [], docs: "trailing content" }],
  recipes: { navItem: "nav-item", navItemContent: "nav-item-content" },
  derived: [
    { name: "state", value: cond(ref("selected"), "selected", "default") },
    { name: "outer", value: cn(recipe("navItem", "level", ref("level"), "state", ref("state")), "group in-data-[nav=collapsed]:justify-center", ref("className")) },
    { name: "inner", value: cn(recipe("navItemContent", "level", ref("level"), "state", ref("state")), and(not(ref("selected")), "group-hover:bg-muted"), "in-data-[nav=collapsed]:w-10 in-data-[nav=collapsed]:flex-none in-data-[nav=collapsed]:justify-center in-data-[nav=collapsed]:px-0", ref("contentClass")) },
  ],
  examples: [...recipeExamples("nav-item", { level: "level" }), { id: "state.selected", props: { selected: true } }, { id: "link", props: { href: "#/home" } }, { id: "button", props: { interactive: true } }],
  events: [{ name: "click", args: [], docs: "the item was pressed (link and button)" }],
  view: [
    when(ref("href"),
      [use("LinkPlain", { props: { Href: ref("href"), Class: ref("outer"), AriaCurrent: cond(ref("selected"), "page", undef()) }, attrs: { "data-slot": "nav-item", "data-state": ref("state") }, on: { click: call("emit.click") } }, navRow())],
      [when(ref("interactive"),
        [use("ButtonPlain", { props: { Type: "button", Class: cn(ref("outer"), "text-left") }, attrs: { "aria-current": cond(ref("selected"), "page", undef()), "data-slot": "nav-item", "data-state": ref("state") }, on: { click: call("emit.click") } }, navRow())],
        [use("Box", { props: { Class: ref("outer") }, attrs: { "aria-current": cond(ref("selected"), "page", undef()), "data-slot": "nav-item", "data-state": ref("state") } }, navRow())])]),
  ],
});

const headBody = (): ViewNode[] => [
  use("Inline", { attrs: { "data-slot": "section-head-title" } }, slot("children")),
  when(ref("right"), [use("Inline", { props: { Class: "flex items-center gap-2" }, attrs: { "data-slot": "section-head-right" } }, slot("right"))]),
];
const sectionHead = spec(`${P}section-head`, "SectionHead", "A sidebar section heading with optional right actions. Set `expanded` and it becomes a disclosure button (aria-expanded, the toggle event).", {
  props: [
    prop("size", union("section-head", "size"), "row height", { default: defaultOf("section-head", "size") }),
    prop("expanded", "boolean", "set: the head is a disclosure button"),
    prop("controls", "string", "id of the region the button opens"),
  ],
  className: true,
  children: true,
  slots: [{ name: "right", args: [], docs: "right-hand actions" }],
  recipes: { sectionHead: "section-head" },
  derived: [{ name: "cls", value: cn(recipe("sectionHead", "size", ref("size")), "rounded text-foreground in-data-[nav=collapsed]:hidden", ref("className")) }],
  examples: [...recipeExamples("section-head", { size: "size" }), { id: "disclosure", props: { expanded: true, controls: "section-body" } }],
  events: [{ name: "toggle", args: [], docs: "the disclosure button was pressed" }],
  view: [
    when(has(ref("expanded")),
      [use("ButtonPlain", { props: { Type: "button", Class: cn(ref("cls"), "w-full text-left") }, attrs: { "aria-expanded": ref("expanded"), "aria-controls": ref("controls"), "data-slot": "section-head", "data-expanded": ref("expanded") }, on: { click: call("emit.toggle") } }, ...headBody())],
      [use("Box", { props: { Class: ref("cls") }, attrs: { "data-slot": "section-head" } }, ...headBody())]),
  ],
});

const sidebarPanel = spec(`${P}sidebar-panel`, "SidebarPanel", "The app sidebar panel: width, padding and gap per kit sidebar type. Colours come from the middle layer.", {
  frame: true,
  props: [prop("variant", union("sidebar-panel", "variant"), "sidebar type")],
  className: true,
  children: true,
  recipes: { sidebarPanel: "sidebar-panel" },
  examples: recipeExamples("sidebar-panel", { variant: "variant" }),
  view: [use("Block", { props: { Tag: "aside", Class: cn(recipe("sidebarPanel", "variant", ref("variant")), ref("className")) }, attrs: { "data-slot": "sidebar-panel", "data-variant": op("coalesce", ref("variant"), "chat") } }, slot("children"))],
});

const dropdownItem = spec(`${P}dropdown-item`, "DropdownItem", "A menu item: an optional icon, the label and an optional trailing mark (a check for selected items). tabindex -1: the menu moves focus with the arrow keys.", {
  props: [prop("selected", "boolean", "the chosen item", { default: false })],
  className: true,
  children: true,
  slots: [{ name: "icon", args: [], docs: "leading icon" }, { name: "right", args: [], docs: "trailing mark" }],
  events: [{ name: "click", args: [], docs: "the item was chosen" }],
  view: [
    use("ButtonPlain", { props: { Type: "button", Role: "menuitem", Class: cn("group flex h-9 w-full items-center px-2 text-left text-foreground", ref("className")) }, attrs: { tabindex: -1, "data-slot": "dropdown-item", "data-state": state2("selected", "selected") }, on: { click: call("emit.click") } },
      use("Inline", { props: { Class: "flex h-7 min-w-0 flex-1 items-center rounded p-1 group-hover:bg-muted group-focus-visible:bg-muted group-data-[state=selected]:bg-muted" }, attrs: { "data-slot": "dropdown-item-content" } },
        when(ref("icon"), [use("Inline", { props: { Class: "flex w-7 shrink-0 items-center pr-2" }, attrs: { "data-slot": "dropdown-item-icon" } }, slot("icon"))]),
        use("Inline", { props: { Class: cn("text-xs", "min-w-0 flex-1 truncate px-1 font-bold") }, attrs: { "data-slot": "dropdown-item-label" } }, slot("children")),
        when(ref("right"), [use("Inline", { props: { Class: "flex shrink-0 items-center pr-1" }, attrs: { "data-slot": "dropdown-item-right" } }, slot("right"))]))),
  ],
});

// ---- contracts: behaviour (focus, overlays, timers, editors) is the programmer's, behind these props and events
const CODE = "an editing surface with syntax highlighting and a cursor: an editor engine, not markup";
const codeEditor = contract(`${P}code-editor`, "CodeEditor", "A code editing area with a highlighted line and a themed frame.", `${CODE}; the theme colours belong to the app`, {
  props: [req("doc", "string", "document text"), prop("activeLine", "number", "1-based line with the cursor"), prop("editable", "boolean"), req("label", "string", "accessible name of the editing area")],
  className: true,
});
const promptInput = contract(`${P}prompt-input`, "PromptInput", "A prompt box: a growing text area with attachments, a footer and an overlay.", "a text area that grows with its content and keeps its caret: DOM measurement and focus handling, written by the programmer", {
  props: [prop("placeholder", "string"), prop("value", "string"), prop("label", "string")],
  className: true,
  slots: [{ name: "attachments", args: [], docs: "attached items" }, { name: "footer", args: [], docs: "send button and tools" }, { name: "overlay", args: [], docs: "suggestions above the box" }],
  events: [{ name: "input", args: [{ name: "value", type: "string" }], docs: "the text changed" }],
});
const smartbox = contract(`${P}smartbox`, "Smartbox", "A browser-like address bar: back, forward, the address and reload.", "an address input with navigation history; the history and the key handling are application logic behind the navigate and reload events", {
  records: { SmartboxLabels: fields(["group", "string"], ["back", "string"], ["forward", "string"], ["address", "string"], ["reload", "string"]) },
  props: [req("url", "string"), req("labels", { record: "SmartboxLabels" }), prop("width", union("smartbox", "width"), "frame width", { default: defaultOf("smartbox", "width") })],
  className: true,
  recipes: { smartbox: "smartbox" },
  examples: recipeExamples("smartbox", { width: "width" }, { url: "https://example.com" }),
  slots: [{ name: "site", args: [], docs: "site icon or title" }],
  events: [{ name: "navigate", args: [{ name: "url", type: "string" }], docs: "an address was entered" }, { name: "reload", args: [], docs: "reload was pressed" }],
});
const drawer = contract(`${P}drawer`, "Drawer", "A side sheet with a title, a close button, content and a footer that can close it.", "an overlay: focus trap, scroll lock, Escape and outside-click dismissal, inert page (trapFocus, dismissable and lockScroll of the utils)", {
  props: [prop("open", "boolean"), req("title", "string"), req("closeLabel", "string"), prop("icon", "string", "Lucide name")],
  className: true,
  children: true,
  slots: [{ name: "footer", args: [{ name: "close", type: ts("() => void") }], docs: "footer; receives a function that closes the drawer" }],
  events: [{ name: "close", args: [], docs: "the drawer asks to be closed" }],
});
const dropdownMenu = contract(`${P}dropdown-menu`, "DropdownMenu", "A menu panel (role menu or listbox) for DropdownItem rows.", "an overlay positioned at its trigger: focus into the menu, arrow keys, Escape, outside click, Tab (moveFocus and dismissable of the utils)", {
  props: [prop("width", union("dropdown-menu", "width"), "panel width", { default: defaultOf("dropdown-menu", "width") }), prop("label", "string"), prop("role", ts('"menu" | "listbox"'), "ARIA role", { default: "menu" }), prop("anchor", ts("HTMLElement | null"), "the trigger: clicks on it are not outside clicks"), prop("focusOnOpen", "boolean", "move focus into the menu on open")],
  className: true,
  children: true,
  recipes: { dropdownMenu: "dropdown-menu" },
  examples: recipeExamples("dropdown-menu", { width: "width" }),
  events: [{ name: "close", args: [{ name: "reason", type: ts('"escape" | "outside" | "tab" | "select"') }], docs: "the menu asks to be closed, and why" }],
});
const popover = contract(`${P}popover`, "Popover", "A dialog panel anchored to a trigger.", "an overlay anchored to its trigger: open state, aria-haspopup wiring, Escape and outside dismissal (dismissable of the utils)", {
  props: [prop("open", "boolean"), req("label", "string", "accessible name of the panel"), prop("width", ts('"sm" | "md" | "lg"')), prop("end", "boolean", "align to the right edge of the trigger")],
  className: true,
  slots: [{ name: "trigger", args: [{ name: "props", type: ts('{ id: string; "aria-haspopup": "dialog"; "aria-controls": string; onclick: () => void }') }], docs: "the trigger; receives the props it must spread" }, { name: "children", args: [{ name: "close", type: ts("() => void") }], docs: "panel content; receives a close function" }],
});
const selectMenu = contract(`${P}select-menu`, "SelectMenu", "A custom select: a button that opens a listbox of options.", "a listbox with keyboard selection, type-ahead and a hidden form value: state and focus handling (moveFocus and dismissable of the utils)", {
  records: { SelectOption: fields(["value", "string"], ["label", "string"]) },
  props: [req("options", ts("SelectOption[]")), prop("value", "string"), req("label", "string"), prop("name", "string", "form field name"), prop("width", ts('"auto" | "full"'))],
  className: true,
  events: [{ name: "change", args: [{ name: "value", type: "string" }], docs: "an option was chosen" }],
});
const toaster = contract(`${P}toaster`, "Toaster", "The stack of toasts. Any code pushes a toast (tone, title, text); the list shows the last four and each closes itself.", "a queue with timers (auto-close after 5 or 8 seconds) is shared state: a store in the app, here only the shape of a toast and the close label are fixed", {
  records: { ToastItem: fields(["id", "number"], ["tone", "string"], ["title", "string"], ["text", "string", true]) },
  props: [req("closeLabel", "string"), req("toasts", ts("ToastItem[]"), "the queue; tone is success, error or info")],
  className: true,
  events: [{ name: "dismiss", args: [{ name: "id", type: "number" }], docs: "a toast was closed" }],
});

export const patterns: OrganismSpec[] = [iconTab, iconTabs, switcher, switcherItem, editorTab, fileTree, fileTreeItem, navItemRow, navItem, sectionHead, sidebarPanel, dropdownItem, codeEditor, promptInput, smartbox, drawer, dropdownMenu, popover, selectMenu, toaster];
