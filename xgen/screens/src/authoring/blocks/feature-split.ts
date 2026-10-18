// Features beside a picture: plain features in two columns, features as cards, two figures over checked rows, or four metric cards.
import { cond, eq, or, ref, undef, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, ifAny, tsOf, toneLite } from "../props";

const featureSplit = spec("organism.feature-split", "FeatureSplit", "Features beside a picture. Axes: layout (grid: four plain features in two columns, cards: four features as cards and the actions, stats: two figure cards over three checked rows beside a square picture, metrics: four metric cards and the actions), mediaSide, tone.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }, { from: "StatsBand", names: ["Stat"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "level", type: ts("1 | 2"), default: 2 },
    { name: "features", type: ts("Feature[]"), required: true },
    { name: "stats", type: ts("Stat[]"), required: true },
    { name: "actions", type: ts("LinkActions"), required: true, docs: "shown in the cards and metrics layouts" },
    { name: "layout", type: tsOf("grid", "cards", "stats", "metrics"), default: "grid" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const is = (l: string) => eq(ref("layout"), l);
    const head = { id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), level: ref("level"), tone: ref("tone"), layout: "split", hasMedia: true, mediaSide: ref("mediaSide") };
    const actions = organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" });
    return [frame(head, [
      // emptyMode omit: an empty list leaves its part out
      when(is("grid"), [ifAny("features", [organism("FeaturePairs", { features: ref("features") })])]),
      when(is("cards"), [ifAny("features", [organism("FeatureCards", { features: ref("features"), cols: "1-2", item: "tile" })])]),
      when(is("stats"), [ifAny("features", [organism("FeatureStatRows", { features: ref("features"), stats: ref("stats") })])]),
      when(is("metrics"), [ifAny("stats", [organism("FeatureMetricCards", { stats: ref("stats") })])]),
      when(or(is("cards"), is("metrics")), [actions]),
    ], [organism("MediaFrame", { alt: ref("title"), ratio: cond(is("stats"), "1/1", "4/3") })])];
  })(),
});

export const featureSplitOrganisms: OrganismSpec[] = [featureSplit];
