// Parts of FaqSplit: the questions as disclosures, as cards, the help card beside them and the finder (search, topics, popular questions).
import { coalesce, cond, each, eachAt, eq, lt, ref, text, tpl, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong, surface } from "../ux";
import { articleBlockOf } from "./landmarks";
import { menuEntry } from "./nav";

const types = [{ from: "FaqSplit", names: ["Question", "FaqSplitLabels"] }];
const items = { name: "items", type: ts("Question[]"), required: true };
const labels = { name: "labels", type: ts("FaqSplitLabels"), required: true };
const iconSquare = (icon: string): ViewNode =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));
/** a call to action with no address of its own: a link-styled button (an app wires it); no "#/" stand-in */
const arrowLink = (label: string): ViewNode =>
  use("Button", { props: { Variant: "link", Size: "sm", Class: "gap-2 px-0 font-medium" } }, text(ref(label)), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }));

export const faqDisclosures = spec("pattern.faq-disclosures", "FaqDisclosures", "The questions of FaqSplit as native disclosures, one open at a time.", {
  typeImports: types,
  props: [items, { name: "name", type: "string", required: true, docs: "the group name of the disclosures (one open at a time)" }],
  view: [use("Stack", { props: { Gap: "0", Align: "stretch" }, attrs: { "data-testid": "faq" } },
    each(ref("items"), "q", ref("q.id"),
      use("Disclosure", { props: { Variant: "item", Name: ref("name") }, attrs: { "data-testid": "faq-item" } },
        use("Summary", { props: { Variant: "item" } }, text(ref("q.question"))),
        use("Text", { props: { Size: "sm", Class: "pb-4 text-muted-foreground" } }, text(ref("q.answer"))))))],
});

export const faqCards = spec("pattern.faq-cards", "FaqCards", "The questions of FaqSplit as cards: the topic, the question, the answer and a read-more link; with an icon square on top in the icons shape. Shapes: grid3, grid4, icons (three columns).", {
  typeImports: types,
  props: [items, labels, { name: "cards", type: tsOf("grid3", "grid4", "icons"), default: "grid3" }],
  view: [use("Box", { props: { Class: cond(eq(ref("cards"), "grid4"), "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3") }, attrs: { "data-testid": "faq" } },
    each(ref("items"), "q", ref("q.id"),
      articleBlockOf(surface("flex flex-col gap-4 p-6"), "faq-card",
        when(eq(ref("cards"), "icons"), [iconSquare("q.icon")]),
        use("Stack", { props: { Gap: "2" } },
          use("Badge", { props: { Variant: "secondary", Size: "sm", Class: "w-fit" } }, text(ref("q.category"))),
          use("Title", { props: { As: 3, Size: "base", Weight: "semibold" } }, text(ref("q.question"))),
          muted(ref("q.answer"))),
        use("Box", { props: { Class: "mt-auto" } }, arrowLink("labels.more")))))],
});

export const faqHelp = spec("pattern.faq-help", "FaqHelp", "The help card beside the questions of FaqSplit: a title, a line of text, the ways to reach the team (icon, name, one line) and a link.", {
  frame: true,
  typeImports: [...types, { from: "FeatureGrid", names: ["Feature"] }],
  props: [labels, { name: "channels", type: ts("Feature[]"), required: true }],
  view: [use("Block", { props: { Tag: "aside", Class: surface("flex flex-col gap-6 p-6") }, attrs: { "aria-label": ref("labels.asideTitle"), "data-testid": "faq-help" } },
    use("Stack", { props: { Gap: "2" } }, strong(ref("labels.asideTitle"), "lg"), muted(ref("labels.asideText"))),
    use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" } },
      each(ref("channels"), "c", ref("c.id"), use("ListItem", { props: { Class: "flex items-start gap-4" }, attrs: { "data-testid": "faq-channel" } },
        iconSquare("c.icon"), use("Stack", { props: { Gap: "0" } }, strong(ref("c.title"), "sm"), muted(ref("c.text"), "xs"))))),
    arrowLink("labels.asideCta"))],
});

export const faqFinder = spec("pattern.faq-finder", "FaqFinder", "The finder of FaqSplit: a search field, the topics as a row of buttons, and the first three questions as popular links.", {
  typeImports: [...types, { from: "FaqList", names: ["FaqTab"] }],
  props: [items, labels, { name: "topics", type: ts("FaqTab[]"), required: true }],
  view: [use("Stack", { props: { Gap: "6", Align: "stretch" }, attrs: { "data-testid": "faq-finder" } },
    organism("SearchField", { label: ref("labels.search"), placeholder: ref("labels.search"), value: coalesce(ref("labels.query"), "") }),
    use("Group", { props: { Gap: "2", Class: "flex-wrap" } },
      each(ref("topics"), "t", ref("t.id"), use("Button", { props: { Variant: "outline", Size: "sm" }, attrs: { "data-testid": "faq-topic", "data-value": ref("t.value") } }, text(ref("t.title"))))),
    use("Stack", { props: { Gap: "2" } },
      strong(ref("labels.popular"), "sm"),
      use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" } },
        eachAt(ref("items"), "q", "i", ref("q.id"), when(lt(ref("i"), 3), [use("ListItem", { attrs: { "data-testid": "faq-popular" } },
          menuEntry(ref("q.href"), { size: "sm", cls: "text-sm font-medium" }, text(ref("q.question"))))])))))],
});

export const faqParts: OrganismSpec[] = [faqDisclosures, faqCards, faqHelp, faqFinder];
