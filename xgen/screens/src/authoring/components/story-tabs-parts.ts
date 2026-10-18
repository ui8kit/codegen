// Parts of StoryTabs: the panel of the active step and the row of dots under the carousel picture.
import { add, cn, cond, each, eq, len, ref, str, text, tpl, use } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { muted, strong, surface } from "../ux";

const types = [{ from: "MilestoneTimeline", names: ["Milestone"] }, { from: "StoryTabs", names: ["StoryLabels"] }];

export const storyPanel = spec("pattern.story-panel", "StoryPanel", "The panel of the active step of StoryTabs: the year badge and the step count, the title, the text and the tag in a muted box.", {
  typeImports: types,
  props: [{ name: "s", type: ts("Milestone"), required: true }, { name: "index", type: "number", required: true, docs: "position of the step, from 0" },
    { name: "total", type: "number", required: true }, { name: "labels", type: ts("StoryLabels"), required: true }],
  view: [use("Stack", { props: { Gap: "4", Align: "stretch", Class: surface("p-6") }, attrs: { "data-testid": "story-panel" } },
    use("Group", { props: { Gap: "2", Align: "center" } }, use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("s.date"))),
      muted(tpl(ref("labels.step"), str(add(ref("index"), 1)), str(ref("total"))), "xs")),
    use("Title", { props: { As: 3, Size: "xl", Weight: "semibold" } }, text(ref("s.title"))),
    muted(ref("s.text")),
    use("Box", { props: { Class: "rounded bg-muted p-4" } }, strong(ref("s.tag"), "sm")))],
});

export const storyDots = spec("pattern.story-dots", "StoryDots", "One dot per step of StoryTabs; the dot of the active step is filled.", {
  typeImports: types,
  props: [{ name: "steps", type: ts("Milestone[]"), required: true }, { name: "active", type: "string", required: true }],
  view: [use("Group", { props: { Gap: "2", Align: "center" } },
    each(ref("steps"), "s", ref("s.id"), use("Inline", { props: { Class: cn("size-2 rounded-full", cond(eq(ref("s.id"), ref("active")), "bg-primary", "bg-border")) }, attrs: { "data-testid": "story-dot" } })))],
});

export const storyTabsParts: OrganismSpec[] = [storyPanel, storyDots];
