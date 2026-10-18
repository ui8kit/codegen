// Features as cards with a picture on top, or with a muted glyph panel on top (an index of categories), in three or four columns.
import { cond, each, eq, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, tsOf, toneLite } from "../props";
import { muted } from "../ux";
import { menuEntry } from "../components/nav";

const featureShowcase = spec("organism.feature-showcase", "FeatureShowcase", "Features as cards under a centered heading. Axes: item (picture: a picture on top, then the title, the text and a read link; panel: a muted panel with a large glyph on top, then the title and the text), cols (3, 4), tone.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "features", type: ts("Feature[]"), required: true },
    empty,
    { name: "more", type: "string", required: true, docs: "the word of the read link of the picture cards" },
    { name: "item", type: tsOf("picture", "panel"), default: "picture" },
    { name: "cols", type: tsOf("3", "4"), default: "3" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), tone: ref("tone"), align: "center" }, [orEmpty("features", "layout-grid", [
    use("Box", { props: { Class: cond(eq(ref("cols"), "4"), "grid grid-cols-1 gap-6 text-start sm:grid-cols-2 lg:grid-cols-4", "grid grid-cols-1 gap-6 text-start sm:grid-cols-2 lg:grid-cols-3") } },
      each(ref("features"), "f", ref("f.id"), use("Card", { props: { Variant: "default", Class: "h-full gap-4 overflow-hidden" }, attrs: { "data-testid": "showcase-card" } },
        when(eq(ref("item"), "picture"), [organism("MediaFrame", { alt: ref("f.title"), ratio: "16/9" })],
          [use("Box", { props: { Class: "flex aspect-video items-center justify-center rounded bg-muted text-foreground" }, attrs: { "data-testid": "showcase-panel" } }, use("LucideIcon", { props: { Name: ref("f.icon"), Size: 32 } }))]),
        use("CardContent", { props: { Class: "flex flex-1 flex-col gap-2" } },
          use("Title", { props: { As: 3, Size: "base", Weight: "semibold" } }, text(ref("f.title"))),
          muted(ref("f.text")),
          when(eq(ref("item"), "picture"), [menuEntry(ref("f.href"), { size: "sm", cls: "mt-auto gap-2 pt-2 text-sm font-medium", testid: "read" }, text(ref("more")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }))])))))]),])
  ],
});

export const featureShowcaseOrganisms: OrganismSpec[] = [featureShowcase];
