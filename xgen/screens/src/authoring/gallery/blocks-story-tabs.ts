// A story in steps: year tabs over a panel, or a picture with arrows and dots beside the heading.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const s = (k: string) => t(`company.storyTabs.${k}`);

const storytabs = define({
  key: "storytabs", theme: "content", group: "story", name: "Story in steps", docs: "Year tabs over the panel of the chosen year, or the heading beside a picture with arrows and one dot per step. Choosing a step is an event.",
  organism: "StoryTabs", axes: ["layout", "tone"], data: [d.milestones],
  variants: [
    ["yearTabs", "Year tabs over the panel of the chosen year"],
    ["carouselSplit", "The heading beside a picture with arrows and dots", { layout: "carousel" }],
    ["yearTabsMuted", "Year tabs, muted", { tone: "muted" }],
  ],
  facts: [
    { sel: '[data-testid="story-tab"]', n: "@milestones", when: { layout: "years" } },
    { sel: '[data-testid="story-panel"]', n: 1, when: { layout: "years" } },
    { sel: '[data-testid="story-dot"]', n: "@milestones", when: { layout: "carousel" } },
    { sel: '[data-testid="story-arrow"]', n: 2, when: { layout: "carousel" } },
    { sel: '[data-testid="story-tab"]', n: 0, when: { layout: "carousel" } },
  ],
  sample: { id: "storytabs", title: s("title"), lead: s("lead"), badge: s("badge"), steps: ref("milestones"), empty: t("empty.milestones"), active: "milestone-runtimes", labels: s("labels") },
});

export const storyTabsBlocks = [storytabs];
