// The building units every block shares: SectionFrame (the section with its heading, optional media and a box), MediaFrame (an image or a
// placeholder in a fixed ratio) and ActionGroup (one or two calls to action). They replace the local `section()` helper of the site organisms.
import { at, cn, coalesce, cond, eq, ne, and, not, op, ref, slot, text, use, when, organism, undef } from "../../build";
import { placeholders } from "../placeholders";
import { visualPatterns } from "./visuals";
import { contractPatterns } from "./contracts";
import type { OrganismSpec, Value, ValueGroup, ViewNode } from "../../ir";
import { defaultOf, groupFields, prop, rec, recipeExamples, req, spec, ts, union } from "../kit";
import { layoutOf } from "../presets";

const P = "pattern.";
export const wide = "mx-auto w-full max-w-6xl px-4";
/** the root of a block whose content is a Panel: a section named by the panel title (`{id}-t`), then the container (rule 01) */
export const panelSection = (...children: ViewNode[]): ViewNode =>
  use("Block", { props: { Tag: "section" }, attrs: { "aria-labelledby": cond(and(ref("title"), ref("id")), op("tpl", "{0}-t", ref("id")), undef()), "data-testid": "panel-section" } }, ...children);
/** the landing content column (default preset) */
export const landingWide = cn("mx-auto w-full px-4", layoutOf("section.landing"));

const sectionFrame = spec(`${P}section-frame`, "SectionFrame", "A page section: the landmark named by its heading, the heading (h1 or h2), an optional lead, the body (`children`) and optional media. `layout` stacks everything or puts the media beside the text; `boxed` puts the body in a card. Axes: layout, media side, tone, density, align.", {
  frame: true,
  records: {
    SectionHeading: groupFields(["level", "1 | 2", "heading level", 2], ["scale", '"default" | "display"', "display: an oversized heading", "default"], ["badge", "string", "a short pill above the heading (e.g. New)"]),
    HeadLink: groupFields(["label", "string", "text of the link (View all, Browse all); none: no link"], ["href", "string", "href of the link; none: no link"]),
    SectionMedia: groupFields(["show", "boolean", "the `aside` slot is shown", false], ["side", '"end" | "start"', "side of the media in the split layout", "end"], ["align", '"center" | "start"', "split layout: the body and the media centred on each other, or both from the top", "center"]),
  },
  props: [
    req("id", "string", "ties the heading to the section: the heading id is `<id>-title`"),
    prop("title", "string", "section heading; empty string: no heading", { default: "" }),
    prop("lead", "string", "text under the heading"),
    prop("heading", rec("SectionHeading"), "how the heading is drawn: its level, its scale, a badge above it"),
    prop("action", rec("HeadLink"), "optional link opposite the heading"),
    prop("layout", ts('"stack" | "split"'), "stack: media below the body; split: media beside it", { default: "stack" }),
    prop("media", rec("SectionMedia"), "the `aside` slot: shown or not, and its side"),
    prop("boxed", "boolean", "the body sits in a card", { default: false }),
    prop("tone", union("section-frame", "tone"), "background", { default: defaultOf("section-frame", "tone") }),
    prop("density", union("section-frame", "density"), "vertical padding", { default: defaultOf("section-frame", "density") }),
    prop("align", union("section-frame", "align"), "text alignment", { default: defaultOf("section-frame", "align") }),
    prop("measure", union("section-column", "measure"), "default: max-w-6xl; landing: the landing column of the preset; fill: full width of parent; xs to 3xl: a narrow body, the heading and the body one column of that width centred in the default container", { default: defaultOf("section-column", "measure") }),
  ],
  className: true,
  children: true,
  slots: [{ name: "aside", args: [], docs: "the media (a MediaFrame)" }],
  recipes: { sectionFrame: "section-frame" },
  derived: [
    { name: "titleId", value: op("add", ref("id"), "-title") },
    { name: "sectionTone", value: cond(ref("boxed"), "default", ref("tone")) },
    { name: "center", value: eq(ref("align"), "center") },
  ],
  examples: [...recipeExamples("section-frame", { tone: "tone", density: "density", align: "align" }, { id: "frame", title: "Title" }),
    ...["xs", "md", "2xl"].map((m) => ({ id: `measure.${m}`, props: { id: "frame", title: "Title", measure: m } }))],
  view: (() => {
    const header = () => organism("SectionHeader", { titleId: ref("titleId"), title: ref("title"), heading: ref("heading"), action: ref("action"), lead: ref("lead"), center: ref("center") });
    const body = () => [header(), slot("children")];
    const mediaBox = () => use("Box", { props: { Class: "w-full" }, attrs: { "data-slot": "media" } }, slot("aside"));
    const stack = (): import("../../ir").ViewNode => organism("SectionColumn", { measure: ref("measure") }, { slots: { children: { args: [], do: [...body(), when(ref("media.show"), [mediaBox()])] } } });
    const split = (): import("../../ir").ViewNode => use("Grid", { props: { Cols: "1-2", Class: cn("gap-8", cond(eq(ref("media.align"), "start"), "items-start", "items-center")) } },
      when(and(ref("media.show"), eq(ref("media.side"), "start")), [mediaBox()]),
      use("Stack", { props: { Gap: "6", Align: "stretch" } }, ...body()),
      when(and(ref("media.show"), ne(ref("media.side"), "start")), [mediaBox()]));
    const inner = (): import("../../ir").ViewNode[] => [when(eq(ref("layout"), "split"), [split()], [stack()])];
    return [use("Block", { props: { Tag: "section", Class: cn(op("recipe", "sectionFrame", "tone", ref("sectionTone"), "density", ref("density"), "align", ref("align")), ref("className")) }, attrs: { "aria-labelledby": cond(ne(ref("title"), ""), ref("titleId"), undef()), "aria-label": cond(eq(ref("title"), ""), ref("id"), undef()), "data-testid": "section", "data-tone": ref("tone"), "data-density": ref("density") } },
      use("Container", { props: { Class: cond(eq(ref("measure"), "landing"), landingWide, cond(eq(ref("measure"), "fill"), "w-full", wide)) }, attrs: { "data-slot": "container" } },
        organism("SectionBox", { boxed: ref("boxed") }, { slots: { children: { args: [], do: inner() } } })))];
  })(),
});

/** the body of a section in a card, or as it is */
const sectionBox = spec(`${P}section-box`, "SectionBox", "The body of a SectionFrame: inside a card when `boxed`, else the children as they are (no wrapper).", {
  props: [
    prop("boxed", "boolean", "the children sit in a card", { default: false }),
  ],
  children: true,
  view: [when(ref("boxed"), [use("Card", { props: { Variant: "muted" } }, slot("children"))], [slot("children")])],
});

const sectionColumn = spec(`${P}section-column`, "SectionColumn", "The stacked body of a SectionFrame: the heading, the children and the media in one column; a narrow measure (xs to 3xl) holds the column at that width, centred.", {
  props: [
    prop("measure", union("section-column", "measure"), "the measure of the SectionFrame; xs to 3xl: a centred column of that width", { default: defaultOf("section-column", "measure") }),
  ],
  children: true,
  recipes: { sectionColumn: "section-column" },
  examples: recipeExamples("section-column", { measure: "measure" }),
  view: [use("Stack", { props: { Gap: "6", Align: "stretch", Class: op("recipe", "sectionColumn", "measure", ref("measure")) } }, slot("children"))],
});

/** a faint picture behind the content of the Block that holds it (that Block is `relative isolate overflow-hidden`), or nothing */
const backdrop = spec(`${P}backdrop`, "Backdrop", "A faint full-size picture behind the content of its section (image), or nothing (none). It sits inside the Block of the block, which `behind` makes `relative isolate overflow-hidden`, so the section stays the root of the block (rule 01).", {
  props: [
    prop("kind", ts('"none" | "image"'), "what is drawn behind", { default: "none" }),
    prop("alt", "string", "accessible name of the picture (image)", { default: "" }),
  ],
  view: [when(eq(ref("kind"), "image"),
    [use("Box", { props: { Class: "pointer-events-none absolute inset-0 -z-10" }, attrs: { "data-testid": "backdrop" } },
      organism("MediaFrame", { alt: ref("alt"), ratio: "21/9", className: "size-full rounded-none opacity-30" }))])],
});
/** a picture of the given kind (none, image) behind a section: the SectionFrame (or Block) `node` stays the root, gets
 *  `relative isolate overflow-hidden` for an image and holds the Backdrop as its first child */
export function behind(kind: Value, alt: Value, node: ViewNode): ViewNode {
  const layer = organism("Backdrop", { kind, alt });
  const shell = cond(eq(kind, "image"), "relative isolate overflow-hidden", "");
  if ("organism" in node && node.slots?.["children"]) {
    const props = { ...(node.props ?? {}), className: node.props?.["className"] !== undefined ? cn(node.props["className"]!, shell) : shell };
    return { ...node, props, slots: { ...node.slots, children: { ...node.slots["children"], do: [layer, ...node.slots["children"].do] } } };
  }
  throw new Error("behind: the node is not a section with children");
}

/** the head of a section: an optional badge, the heading with an optional link opposite it, and the lead */
const sectionHeader = spec(`${P}section-header`, "SectionHeader", "The head of a section: an optional badge, the heading (h1 or h2) with an optional link opposite it, and an optional lead. No wrapper: its parts are children of the section stack.", {
  props: [
    req("titleId", "string", "id of the heading (the section is labelled by it)"),
    prop("title", "string", "heading; empty string: no heading", { default: "" }),
    prop("heading", ts("SectionHeading"), "how the heading is drawn: its level (2), its scale, a badge above it"),
    prop("action", ts("HeadLink"), "optional link opposite the heading (View all)"),
    prop("lead", "string", "text under the heading"),
    prop("center", "boolean", "centered text", { default: false }),
  ],
  typeImports: [{ from: "SectionFrame", names: ["SectionHeading", "HeadLink"] }],
  derived: [
    { name: "level", value: coalesce(ref("heading.level"), 2) },
    { name: "scale", value: coalesce(ref("heading.scale"), "default") },
    // the link opposite the heading only with a label and an address (no "#/" stand-in)
    { name: "hasAction", value: and(ref("action.label"), ref("action.href")) },
  ],
  view: (() => {
    const heading = () => use("Title", { props: { As: ref("level"), Size: cond(eq(ref("level"), 1), "5xl", "xl"), Weight: "semibold", Class: cond(eq(ref("scale"), "display"), "text-6xl tracking-tight md:text-8xl", cond(eq(ref("level"), 1), "leading-tight", "leading-7")) }, attrs: { id: ref("titleId") } }, text(ref("title")));
    const actionLink = () => use("Link", { props: { Href: ref("action.href"), Variant: "default", Class: cn(layoutOf("text.tiny"), "shrink-0 font-medium leading-5") }, attrs: { "data-testid": "section-action" } }, text(ref("action.label")));
    return [
      when(ref("heading.badge"), [use("Badge", { props: { Variant: "outline", Size: "lg", Class: cond(ref("center"), "mx-auto w-fit", "w-fit") }, attrs: { "data-testid": "section-badge" } }, text(ref("heading.badge")))]),
      when(and(ne(ref("title"), ""), ref("hasAction")), [use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "w-full flex-wrap" } }, heading(), actionLink())]),
      when(and(ne(ref("title"), ""), not(ref("hasAction"))), [heading()]),
      when(and(eq(ref("title"), ""), ref("hasAction")), [use("Group", { props: { Gap: "4", Align: "center", Justify: "end", Class: "w-full" } }, actionLink())]),
      when(ref("lead"), [use("Text", { props: { Size: "base", Class: cn("max-w-2xl text-muted-foreground", cond(ref("center"), "mx-auto", "")) } }, text(ref("lead")))]),
    ];
  })(),
});

const mediaFrame = spec(`${P}media-frame`, "MediaFrame", "A picture in a fixed ratio that follows the theme. `src` is the picture of the light theme, `darkSrc` the one of the dark theme (without it the dark theme shows `src`). Without both it shows the built-in neutral placeholders (base64 data URIs, one light and one dark), so a page can be laid out before it has pictures; the placeholder stands in for a real `src` and is switched by the theme token. `ratio` comes from the recipe; the corners are the plain theme radius.", {
  props: [
    req("alt", "string", "accessible name of the picture"),
    prop("src", "string", "address of the picture (light theme); none: the built-in light placeholder"),
    prop("darkSrc", "string", "address of the picture for the dark theme; none: `src`, or the built-in dark placeholder when there is no `src`"),
    prop("ratio", union("media-frame", "ratio"), "width to height", { default: defaultOf("media-frame", "ratio") }),
  ],
  className: true,
  consts: { PLACEHOLDER: placeholders },
  recipes: { mediaFrame: "media-frame" },
  derived: [
    { name: "lightSrc", value: coalesce(ref("src"), at(ref("PLACEHOLDER"), "light")) },
    { name: "nightSrc", value: coalesce(ref("darkSrc"), ref("src"), at(ref("PLACEHOLDER"), "dark")) },
  ],
  examples: recipeExamples("media-frame", { ratio: "ratio" }, { alt: "Picture" }),
  view: [use("Box", { props: { Class: cn(op("recipe", "mediaFrame", "ratio", ref("ratio")), ref("className")) }, attrs: { "data-slot": "media-frame", "data-placeholder": cond(ref("src"), "false", "true") } },
    use("Image", { props: { Src: ref("lightSrc"), Alt: ref("alt"), Class: "absolute inset-0 size-full object-cover dark:hidden" }, attrs: { "data-theme-src": "light" } }),
    use("Image", { props: { Src: ref("nightSrc"), Alt: ref("alt"), Class: "absolute inset-0 hidden size-full object-cover dark:block" }, attrs: { "data-theme-src": "dark" } }))],
});

const actionGroup = spec(`${P}action-group`, "ActionGroup", "One or two calls to action side by side: a filled primary button and an outline secondary one. Links, not handlers: the page decides what they open.", {
  props: [
    req("primary", "string", "text of the primary action"),
    prop("primaryHref", "string"),
    prop("secondary", "string", "text of the secondary action; none: one action"),
    prop("secondaryHref", "string"),
    prop("align", ts('"start" | "center"'), "where the group sits", { default: "start" }),
  ],
  view: [use("Group", { props: { Gap: "4", Align: "center", Justify: cond(eq(ref("align"), "center"), "center", "start"), Class: "flex-wrap" }, attrs: { "data-slot": "action-group" } },
    use("Button", { props: { Variant: "default", Size: "default", Href: ref("primaryHref") }, attrs: { "data-testid": "action-primary" } }, text(ref("primary"))),
    when(ref("secondary"), [use("Button", { props: { Variant: "outline", Size: "default", Href: ref("secondaryHref") }, attrs: { "data-testid": "action-secondary" } }, text(ref("secondary")))]))],
});


export const framePatterns: OrganismSpec[] = [sectionBox, sectionColumn, sectionFrame, sectionHeader, backdrop, mediaFrame, actionGroup, ...visualPatterns, ...contractPatterns];
/** the flat names `frame()` accepts, and the SectionFrame group and field each one goes to */
const frameGroups: Record<string, [group: string, field: string]> = {
  level: ["heading", "level"], scale: ["heading", "scale"], badge: ["heading", "badge"],
  hasMedia: ["media", "show"], mediaSide: ["media", "side"], mediaAlign: ["media", "align"],
};
/** a frame node for the organisms: `frame({...props}, children, media?)`. The flat names of `frameGroups` are put in their groups. */
export const frame = (props: Record<string, Value>, children: ViewNode[], media?: ViewNode[]): ViewNode => {
  const grouped: Record<string, Value> = {};
  for (const [name, value] of Object.entries(props)) {
    const to = frameGroups[name];
    if (!to) grouped[name] = value;
    else grouped[to[0]] = { ...(grouped[to[0]] as ValueGroup | undefined), [to[1]]: value };
  }
  return organism("SectionFrame", grouped, { slots: { children: { args: [], do: children }, ...(media ? { aside: { args: [], do: media } } : {}) } });
};

