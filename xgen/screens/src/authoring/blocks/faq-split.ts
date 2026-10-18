// Questions beside something: the heading column, a help card, a picture or a finder; or the questions as cards.
import { eq, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, ifAny, tsOf, toneLite } from "../props";

const faqSplit = spec("organism.faq-split", "FaqSplit", "Questions in a split or as cards. Axes: layout (head: the heading and an action beside the disclosures, aside: the disclosures beside a help card, media: the disclosures and an action beside a picture, search: a finder beside a picture, cards: the questions as cards), cards (grid3, grid4, icons), mediaSide, tone.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }, { from: "FaqList", names: ["FaqTab"] }],
  records: {
    Question: fields(["id", "string"], ["question", "string"], ["answer", "string"], ["category", "string"], ["icon", "string"], ["href", "string", true]),
    FaqSplitLabels: fields(["cta", "string"], ["more", "string"], ["asideTitle", "string"], ["asideText", "string"], ["asideCta", "string"], ["search", "string"], ["popular", "string"], ["query", "string", true]),
  },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "items", type: ts("Question[]"), required: true },
    { name: "channels", type: ts("Feature[]"), required: true, docs: "the ways to reach the team (aside layout)" },
    { name: "topics", type: ts("FaqTab[]"), required: true, docs: "the topic buttons of the finder (search layout)" },
    { name: "labels", type: { record: "FaqSplitLabels" }, required: true },
    { name: "layout", type: tsOf("head", "aside", "media", "search", "cards"), default: "head" },
    { name: "cards", type: tsOf("grid3", "grid4", "icons"), default: "grid3" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const list = organism("FaqDisclosures", { items: ref("items"), name: tpl("{0}-faq", ref("id")) });
    const cta = use("Box", {}, use("Button", { props: { Variant: "default", Size: "default" }, attrs: { "data-testid": "faq-cta" } }, text(ref("labels.cta"))));
    const common = { id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone"), density: "default" };
    const picture = organism("MediaFrame", { alt: ref("title"), ratio: "4/3" });
    // emptyMode omit: a FAQ section without questions is left out whole
    return [ifAny("items", [
      when(eq(ref("layout"), "cards"), [frame(common, [organism("FaqCards", { items: ref("items"), labels: ref("labels"), cards: ref("cards") })])]),
      when(eq(ref("layout"), "head"), [frame({ ...common, layout: "split", hasMedia: true, mediaSide: "end", mediaAlign: "start" }, [cta], [list])]),
      when(eq(ref("layout"), "aside"), [frame({ ...common, layout: "split", hasMedia: true, mediaSide: "end", mediaAlign: "start" }, [list], [organism("FaqHelp", { labels: ref("labels"), channels: ref("channels") })])]),
      when(eq(ref("layout"), "media"), [frame({ ...common, layout: "split", hasMedia: true, mediaSide: ref("mediaSide"), mediaAlign: "start" }, [list, cta], [picture])]),
      when(eq(ref("layout"), "search"), [frame({ ...common, layout: "split", hasMedia: true, mediaSide: ref("mediaSide") }, [organism("FaqFinder", { items: ref("items"), labels: ref("labels"), topics: ref("topics") })], [picture])]),
    ])];
  })(),
});

export const faqSplitOrganisms: OrganismSpec[] = [faqSplit];
