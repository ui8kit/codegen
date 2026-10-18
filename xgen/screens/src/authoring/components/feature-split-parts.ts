// Parts of FeatureSplit: plain features in two columns, two figure cards over checked rows, and four metric cards.
import { eachAt, lt, ref, text, use, when } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { muted, strong, surface } from "../ux";

const features = { name: "features", type: ts("Feature[]"), required: true };
const stats = { name: "stats", type: ts("Stat[]"), required: true };
/** the first `n` entries of a list */
const first = (list: string, as: string, n: number, node: ViewNode): ViewNode => eachAt(ref(list), as, "i", ref(`${as}.id`), when(lt(ref("i"), n), [node]));
const tile = (icon: Value): ViewNode => use("Inline", { props: { Class: "flex size-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground" } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }));
const titled = (title: string, body: string): ViewNode => use("Stack", { props: { Gap: "2", Class: "min-w-0" } },
  use("Title", { props: { As: 3, Size: "sm", Weight: "semibold" } }, text(ref(title))), muted(ref(body)));

export const featurePairs = spec("pattern.feature-pairs", "FeaturePairs", "Four features of FeatureSplit in two columns: a glyph tile beside the title and text, without cards.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [features],
  view: [use("Box", { props: { Class: "grid grid-cols-1 gap-6 sm:grid-cols-2" } },
    first("features", "f", 4, use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "feature-item" } }, tile(ref("f.icon")), titled("f.title", "f.text"))))],
});

export const featureStatRows = spec("pattern.feature-stat-rows", "FeatureStatRows", "Two figures of FeatureSplit as cards, then three features as checked rows.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }, { from: "StatsBand", names: ["Stat"] }],
  props: [features, stats],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch" } },
    use("Box", { props: { Class: "grid grid-cols-2 gap-4" } },
      first("stats", "s", 2, use("Stack", { props: { Gap: "0", Class: surface("p-4") }, attrs: { "data-testid": "feature-stat" } }, strong(ref("s.value"), "2xl", "bold"), muted(ref("s.label"), "xs")))),
    use("Stack", { props: { Gap: "4", Align: "stretch" } },
      first("features", "f", 3, use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "feature-item" } },
        use("Inline", { props: { Class: "flex size-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground" } }, use("LucideIcon", { props: { Name: "check", Size: 16 } })),
        titled("f.title", "f.text")))))],
});

export const featureMetricCards = spec("pattern.feature-metric-cards", "FeatureMetricCards", "Four figures of FeatureSplit as small cards in two columns: a glyph tile, the value with its hint and the label.", {
  typeImports: [{ from: "StatsBand", names: ["Stat"] }],
  props: [stats],
  view: [use("Box", { props: { Class: "grid grid-cols-1 gap-4 sm:grid-cols-2" } },
    first("stats", "s", 4, use("Group", { props: { Gap: "4", Align: "center", Class: surface("p-4") }, attrs: { "data-testid": "feature-stat" } },
      use("Inline", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted text-foreground" } }, use("LucideIcon", { props: { Name: ref("s.icon"), Size: 20 } })),
      use("Stack", { props: { Gap: "0", Class: "min-w-0" } }, strong(ref("s.value"), "lg", "bold"), muted(ref("s.label"), "xs"), muted(ref("s.hint"), "xs")))))],
});

export const featureSplitParts: OrganismSpec[] = [featurePairs, featureStatRows, featureMetricCards];
