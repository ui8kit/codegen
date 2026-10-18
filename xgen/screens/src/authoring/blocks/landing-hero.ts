// The hero blocks: HeroClassic (heading, lead, actions, optional media) and HeroPrompt (head row, badge,
// weighted title, prompt box and topics inside a dark band). The block `hero` draws HeroPrompt for chrome "nav".
// Related props come in groups (shadcn style): actions, media, composer, nav. Sizes come from the default preset.
import { and, cn, gt, len, coalesce, cond, eq, or, ref, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { groupFields, rec, spec, ts } from "../kit";
import { behind, frame } from "../components/frames";
import { actions, density, id, mediaOf, title, tsOf } from "../props";
import { fid } from "../forms";
import { layoutOf } from "../presets";
import { titleWeights } from "../components/hero-components";

const O = "organism.";
const p = (name: string, docs?: string, extra: Partial<OrganismSpec["props"][number]> = {}): OrganismSpec["props"][number] => ({ name, type: "string", ...(docs ? { docs } : {}), ...extra });

const level = { name: "level", type: ts("1 | 2"), default: 1 } as OrganismSpec["props"][number];
const topics = { name: "topics", type: ts("Topic[]") } as OrganismSpec["props"][number];
const look = [{ name: "scale", type: tsOf("default", "display"), default: "default" }, { name: "tone", type: tsOf("default", "muted", "inverse"), default: "default" }, { name: "density", type: density, default: "roomy" }] as OrganismSpec["props"][number][];

/** the media of a classic hero and what it shows */
const heroMedia = groupFields(
  ["kind", tsOf("none", "image", "backdrop", "code", "cluster"), "what the hero shows besides the text", "none"],
  ["side", tsOf("end", "start"), "side of the media in the split layout", "end"],
  ["codeTitle", "string", "title of the code window"], ["prompt", "string", "prompt line of the code window"], ["lines", "CodeLine[]", "lines of the code window"],
);

/** the prompt hero band: the head row inside the band, a large bottom radius, a centered column */
export const heroPrompt = spec(`${O}hero-prompt`, "HeroPrompt", "A dark hero band: the head row, a badge, a title with weighted words, the prompt box (or actions) and topic pills.", {
  records: {
    HeroComposer: groupFields(["attachLabel", "string", "attachment chip label"], ["modelLabel", "string", "model pill label"]),
    HeroNav: groupFields(["brand", "string", "brand word of the head row"], ["links", "NavLink[]", "menu links of the head row"], ["current", "string", "id of the current link"],
      ["login", "string"], ["loginHref", "string"], ["skip", "string", "skip link text"], ["label", "string", "accessible name of the menu"]),
  },
  typeImports: [{ from: "CtaActions", names: ["ActionSet"] }, { from: "NavBar", names: ["NavLink"] }, { from: "TopicChips", names: ["Topic"] }],
  props: [title, level, p("badge", "label of the badge (Meet Model V4.1)"), p("badgeMark", "small inner pill text (NEW)"),
    { name: "actions", type: ts("ActionSet") }, { name: "composer", type: rec("HeroComposer"), docs: "labels of the prompt box" },
    { name: "nav", type: rec("HeroNav"), docs: "the head row" }, topics,
    { name: "density", type: density, default: "roomy", docs: "named on the section (data-density) like every section; the band keeps the frame's padding" }],
  view: (() => {
    const column = use("Stack", { props: { Gap: "0", Align: "center", Class: cn("mx-auto w-full pt-24 pb-16", layoutOf("hero.column")) }, attrs: { "data-testid": "hero-column" } },
      when(ref("badge"), [organism("HeroBadge", { label: ref("badge"), mark: ref("badgeMark") })]),
      organism("WeightedTitle", { id: "home-hero-title", title: ref("title"), weights: titleWeights, level: ref("level") }),
      when(eq(ref("actions.mode"), "form"),
        [organism("PromptComposer", { label: ref("actions.emailLabel"), attachLabel: ref("composer.attachLabel"), modelLabel: ref("composer.modelLabel"), send: ref("actions.cta"), href: ref("actions.href") })],
        [when(ref("actions.cta"), [actions(true, "actions")])]),
      when(and(ref("topics"), gt(len(ref("topics")), 0)), [organism("TopicChips", { topics: ref("topics"), tone: "inverse" })]));
    // the band pads top and bottom; the container pads the sides, so it fills the band (1536 + 2 × 32 = the 1600 frame)
    const band = cn("flex w-full flex-col bg-foreground text-background py-8 [&_.text-muted-foreground]:text-background/70", layoutOf("hero.band"));
    const head = { brand: ref("nav.brand"), links: ref("nav.links"), current: ref("nav.current"), login: ref("nav.login"), loginHref: ref("nav.loginHref"),
      skip: ref("nav.skip"), navLabel: ref("nav.label"), cta: ref("actions.cta"), href: ref("actions.href") };
    return [use("Block", { props: { Tag: "section", Class: band }, attrs: { "aria-labelledby": "home-hero-title", "data-testid": "section", "data-tone": "inverse", "data-density": ref("density"), "data-chrome": "nav" } },
      use("Container", { props: { Class: cn("mx-auto w-full px-8", layoutOf("hero.container")) }, attrs: { "data-slot": "container" } },
        use("Stack", { props: { Gap: "0", Align: "stretch" } },
          organism("HeroHead", head),
          column)))];
  })(),
});

/** the classic hero: heading, lead and actions in a section frame, with optional media */
export const heroClassic = spec(`${O}hero-classic`, "HeroClassic", "The top of a page: heading, lead and actions, with optional media (image, backdrop, code window, cluster). Axes: layout, media kind and side, scale, tone, density, actions mode.", {
  records: { HeroMedia: heroMedia },
  typeImports: [{ from: "CtaActions", names: ["ActionSet"] }, { from: "CodeWindow", names: ["CodeLine"] }, { from: "TopicChips", names: ["Topic"] }],
  props: [id, title, p("text", undefined, { required: true }), level, p("badge"), topics,
    { name: "actions", type: ts("ActionSet") }, { name: "media", type: rec("HeroMedia") },
    { name: "layout", type: tsOf("centered", "split"), default: "centered" }, ...look],
  derived: [{ name: "mediaKind", value: coalesce(ref("media.kind"), "none") }, { name: "mediaSide", value: coalesce(ref("media.side"), "end") }],
  view: (() => {
    const kind = (k: string) => eq(ref("mediaKind"), k);
    const has = or(kind("image"), kind("code"), kind("cluster"));
    const split = eq(ref("layout"), "split");
    const props = { id: ref("id"), title: ref("title"), lead: ref("text"), level: ref("level"), scale: ref("scale"), badge: ref("badge"),
      layout: cond(split, "split", "stack"), align: cond(split, "start", "center"), hasMedia: has, mediaSide: ref("mediaSide"), tone: ref("tone"), density: ref("density") };
    const prompt = use("Box", { props: { Class: cn("w-full max-w-xl", cond(eq(ref("layout"), "centered"), "mx-auto", "")) }, attrs: { "data-testid": "email-form" } },
      use("Label", { props: { HTMLFor: fid("email"), Class: "sr-only" } }, { text: ref("actions.emailLabel") }),
      use("Group", { props: { Gap: "2", Align: "start", Class: "w-full flex-wrap" } },
        use("Input", { props: { Type: "text", Name: "prompt", Class: "min-w-0 flex-1", Placeholder: ref("actions.emailLabel") }, attrs: { id: fid("email"), "data-testid": "field" } }),
        use("Button", { props: { Variant: "default", Size: "default", Href: ref("actions.href") }, attrs: { "data-testid": "submit" } }, { text: ref("actions.cta") })));
    const body = [when(ref("actions.cta"), [when(eq(ref("actions.mode"), "form"), [prompt], [actions(eq(ref("layout"), "centered"), "actions")])]),
      when(and(ref("topics"), gt(len(ref("topics")), 0)), [organism("TopicChips", { topics: ref("topics") })])];
    const card = (ratio: string, lift = "") => use("Box", { props: { Class: cn("w-full", lift) } }, organism("MediaFrame", { alt: ref("title"), ratio }));
    const mediaNodes = [
      when(and(kind("code"), ref("media.lines"), gt(len(ref("media.lines")), 0), ref("media.codeTitle"), ref("media.prompt")), [organism("CodeWindow", { title: ref("media.codeTitle"), prompt: ref("media.prompt"), lines: ref("media.lines") })]),
      when(kind("cluster"), [use("Grid", { props: { Cols: "3", Class: "items-end gap-4" }, attrs: { "data-testid": "cluster" } }, card("3/4"), card("4/3", "-translate-y-4"), card("3/4"))]),
      when(or(kind("image")), mediaOf(ref("title"))),
    ];
    // with a backdrop the media box is not shown (has is false), so one frame serves both
    return [behind(cond(kind("backdrop"), "image", "none"), ref("title"), frame(props, body, mediaNodes))];
  })(),
});
