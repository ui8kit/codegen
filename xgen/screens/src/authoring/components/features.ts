// The features of FeatureGrid as components: cards, tiles or cells (FeatureCards) and rows beside a picture (FeatureRows).
import { cn, cond, each, eq, ref, text, use, when } from "../../build";
import { fields, spec, ts } from "../kit";
import { cols, mediaOf, tsOf } from "../props";
import { layoutOf } from "../presets";

export const featureRecord = fields(["id", "string"], ["title", "string"], ["text", "string"], ["icon", "string"], ["href", "string", true]);
export const featureItem = { name: "item", type: tsOf("card", "tile", "cell"), default: "card", docs: "card: icon, title and text stacked; tile: compact icon beside title and text; cell: bordered cell with a round icon" };

export const featureCards = spec("pattern.feature-cards", "FeatureCards", "The features as a grid of cards, tiles or bordered cells (the body of FeatureGrid). Icons are Lucide names.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    { name: "features", type: ts("Feature[]"), required: true },
    { name: "cols", type: cols, default: "1-3", docs: "columns of the grid (responsive)" },
    featureItem,
  ],
  view: (() => {
    const tile = use("Card", { props: { Variant: "compact" }, attrs: { "data-testid": "feature-card" } },
      use("Group", { props: { Gap: "4", Align: "start" } },
        use("LucideIcon", { props: { Name: ref("feature.icon"), Size: 20 } }),
        use("Stack", { props: { Gap: "2" } },
          use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, text(ref("feature.title"))),
          use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("feature.text"))))));
    // cell: centered stack
    // Cell pad [48,24] gap 32; disk 80×80 r40 glyph 24 (bg-primary token)
    const cell = use("Stack", { props: { Gap: "2", Align: "center", Class: "h-full gap-8 bg-background px-6 py-12 text-center" }, attrs: { "data-testid": "feature-card" } },
      use("IconBadge", { props: { Variant: "primary", Size: "xl" }, attrs: { "data-testid": "feature-icon" } },
        use("LucideIcon", { props: { Name: ref("feature.icon"), Size: 24 } })),
      use("Title", { props: { As: 3, Size: "xl", Weight: "semibold", Class: "leading-6" } }, text(ref("feature.title"))),
      use("Text", { props: { Size: "sm", Weight: "semibold", Class: "leading-5 text-muted-foreground" } }, text(ref("feature.text"))));
    const card = use("Card", { props: { Variant: "default" }, attrs: { "data-testid": "feature-card" } },
      use("CardHeader", { props: { Class: "flex flex-col gap-4" } },
        use("LucideIcon", { props: { Name: ref("feature.icon"), Size: 24 } }),
        use("CardTitle", { props: { As: 3 } }, text(ref("feature.title")))),
      use("CardContent", {}, use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("feature.text")))));
    const item = when(eq(ref("item"), "tile"), [tile], [when(eq(ref("item"), "cell"), [cell], [card])]);
    // hairline grid: 1 px gaps on the border color, rounded outside
    return [use("Grid", { props: { Cols: ref("cols"), Class: cond(eq(ref("item"), "cell"), cn("w-full gap-px overflow-hidden bg-border p-px", layoutOf("features.cells")), "gap-6") }, attrs: { "data-testid": "feature-grid" } },
      each(ref("features"), "feature", ref("feature.id"), item))];
  })(),
});

export const featureRows = spec("pattern.feature-rows", "FeatureRows", "The features as rows: text beside a picture (the rows layout of FeatureGrid). Icons are Lucide names.", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    { name: "features", type: ts("Feature[]"), required: true },
    { name: "mediaSide", type: tsOf("end", "start", "alternate"), default: "end", docs: "side of the picture; alternate swaps it every row" },
  ],
  view: [
    use("Stack", { props: { Gap: "8", Align: "stretch" }, attrs: { "data-testid": "feature-rows" } },
      each(ref("features"), "feature", ref("feature.id"),
        use("Grid", { props: { Cols: "1-2", Class: "group items-center gap-8" }, attrs: { "data-testid": "feature-card" } },
          use("Stack", { props: { Gap: "2", Class: "min-w-0" } },
            use("LucideIcon", { props: { Name: ref("feature.icon"), Size: 24 } }),
            use("Title", { props: { As: 3, Size: "xl", Weight: "bold" } }, text(ref("feature.title"))),
            use("Text", { props: { Size: "base", Class: "text-muted-foreground" } }, text(ref("feature.text")))),
          use("Box", { props: { Class: cn("w-full min-w-0", cond(eq(ref("mediaSide"), "start"), "md:order-first", cond(eq(ref("mediaSide"), "alternate"), "md:group-even:order-first", ""))) } },
            ...mediaOf(ref("feature.title")))))),
  ],
});
