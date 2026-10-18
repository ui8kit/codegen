// A story told in steps: year tabs over the panel of the chosen year, or a split with a picture, arrows and dots under it.
// Choosing a year or a slide is an event; the page keeps the active id.
import { call, cond, each, eachAt, eq, len, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, tsOf, toneLite } from "../props";

const storyTabs = spec("organism.story-tabs", "StoryTabs", "A story in steps (years or slides). Axes: layout (years: a row of year tabs over the panel of the active year with its badge, step, title, text and tag; carousel: the heading beside a picture with previous and next arrows and one dot per step), tone. Choosing a step emits `select`.", {
  typeImports: [{ from: "MilestoneTimeline", names: ["Milestone"] }],
  records: { StoryLabels: fields(["step", "string"], ["previous", "string"], ["next", "string"]) },
  events: [{ name: "select", args: [{ name: "id", type: "string" }], docs: "a year tab, an arrow or a dot was chosen" }],
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "steps", type: ts("Milestone[]"), required: true },
    empty,
    { name: "active", type: "string", required: true, docs: "the id of the step shown" },
    { name: "labels", type: { record: "StoryLabels" }, required: true, docs: "template step `Step {0} of {1}`; the accessible names of the arrows" },
    { name: "layout", type: tsOf("years", "carousel"), default: "years" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const head = { id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone") };
    const on = eq(ref("s.id"), ref("active"));
    const pick = { on: { click: call("emit.select", ref("s.id")) } };
    const tab = use("Button", { props: { Variant: cond(on, "default", "outline"), Size: "lg", Type: "button", Class: "h-auto flex-col items-start gap-0 py-2 text-start" }, attrs: { "data-testid": "story-tab", "data-active": cond(on, "true", "false") }, ...pick },
      use("Inline", { props: { Class: "text-sm font-semibold" } }, text(ref("s.date"))), use("Inline", { props: { Class: "text-xs" } }, text(ref("s.tag"))));
    const panel = organism("StoryPanel", { s: ref("s"), index: ref("i"), total: len(ref("steps")), labels: ref("labels") });
    const arrow = (icon: string, label: string): ViewNode => use("Button", { props: { Variant: "outline", Size: "sm", Layout: "icon", Type: "button", AriaLabel: ref(label) }, attrs: { "data-testid": "story-arrow" } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }));
    const dots = organism("StoryDots", { steps: ref("steps"), active: ref("active") });
    const years = frame(head, [
      use("Box", { props: { Class: "grid grid-cols-2 gap-2 sm:grid-cols-4" }, attrs: { "data-testid": "story-tabs" } }, each(ref("steps"), "s", ref("s.id"), tab)),
      eachAt(ref("steps"), "s", "i", ref("s.id"), when(on, [panel])),
    ]);
    const carousel = frame({ ...head, layout: "split", hasMedia: true }, [], [use("Stack", { props: { Gap: "4", Align: "stretch" } },
      organism("MediaFrame", { alt: ref("title"), ratio: "4/3" }),
      use("Group", { props: { Gap: "4", Align: "center", Justify: "between" } }, arrow("chevron-left", "labels.previous"), dots, arrow("chevron-right", "labels.next")))]);
    return [orEmpty("steps", "milestone", [when(eq(ref("layout"), "years"), [years], [carousel])], (n) => [frame(head, n)])];
  })(),
});

export const storyTabsOrganisms: OrganismSpec[] = [storyTabs];
