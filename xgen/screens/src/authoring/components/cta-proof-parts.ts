// The proof of CtaProof: a row of logos, six small features, three figures, icon rows, or delivery zones with price and time.
import { and, cond, each, eachAt, eq, gt, len, lt, money, ref, text, use, when } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong, surface } from "../ux";

const iconSquare = (icon: string): ViewNode =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));

export const ctaProofItems = spec("pattern.cta-proof-items", "CtaProofItems", "The proof of CtaProof. Shapes: logos (six names with a glyph), features (small features in two columns), stats (three figures), rows (four icon rows), zones (delivery zones: name and areas, price and time).", {
  typeImports: [{ from: "CtaProof", names: ["CtaContent"] }],
  props: [
    { name: "content", type: ts("CtaContent"), required: true },
    { name: "proof", type: tsOf("logos", "features", "stats", "rows", "zones"), default: "stats" },
    { name: "center", type: "boolean", default: false, docs: "the centered layout: items centred in their cells" },
  ],
  view: [
    when(and(eq(ref("proof"), "logos"), gt(len(ref("content.logos")), 0)), [use("Box", { props: { Class: "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6" }, attrs: { "data-testid": "cta-proof" } },
      each(ref("content.logos"), "l", ref("l.id"), use("Group", { props: { Gap: "2", Align: "center", Justify: "center", Class: "text-muted-foreground" }, attrs: { "data-testid": "cta-item" } },
        use("LucideIcon", { props: { Name: ref("l.icon"), Size: 20 } }), use("Text", { props: { Size: "sm", Weight: "semibold" } }, text(ref("l.name"))))))]),
    when(and(eq(ref("proof"), "features"), gt(len(ref("content.features")), 0)), [use("Box", { props: { Class: "grid grid-cols-1 gap-4 text-left sm:grid-cols-2" }, attrs: { "data-testid": "cta-proof" } },
      each(ref("content.features"), "f", ref("f.id"), use("Group", { props: { Gap: "4", Align: "start", Class: surface("p-4") }, attrs: { "data-testid": "cta-item" } },
        iconSquare("f.icon"), use("Stack", { props: { Gap: "0" } }, strong(ref("f.title"), "sm"), muted(ref("f.text"), "xs")))))]),
    when(and(eq(ref("proof"), "stats"), gt(len(ref("content.stats")), 0)), [use("Box", { props: { Class: "grid grid-cols-3 gap-4" }, attrs: { "data-testid": "cta-proof" } },
      eachAt(ref("content.stats"), "s", "i", ref("s.id"), when(lt(ref("i"), 3), [use("Stack", { props: { Gap: "0", Class: cond(ref("center"), "items-center text-center", "") }, attrs: { "data-testid": "cta-item" } },
        use("Text", { props: { Size: "3xl", Weight: "bold" } }, text(ref("s.value"))), muted(ref("s.label"), "xs"))])))]),
    when(and(eq(ref("proof"), "rows"), gt(len(ref("content.features")), 0)), [use("List", { props: { Class: "m-0 flex list-none flex-col gap-4 p-0" }, attrs: { "data-testid": "cta-proof" } },
      each(ref("content.features"), "f", ref("f.id"), use("ListItem", { props: { Class: "flex items-start gap-4" }, attrs: { "data-testid": "cta-item" } },
        iconSquare("f.icon"), use("Stack", { props: { Gap: "0" } }, strong(ref("f.title"), "sm"), muted(ref("f.text"), "xs")))))]),
    when(and(eq(ref("proof"), "zones"), gt(len(ref("content.zones")), 0)), [use("List", { props: { Class: "m-0 flex list-none flex-col p-0" }, attrs: { "data-testid": "cta-proof" } },
      each(ref("content.zones"), "z", ref("z.id"), use("ListItem", { props: { Class: "flex items-start justify-between gap-4 border-b border-border py-4" }, attrs: { "data-testid": "cta-item" } },
        use("Stack", { props: { Gap: "0", Class: "min-w-0" } }, strong(ref("z.name"), "sm"), muted(ref("z.area"), "xs")),
        use("Stack", { props: { Gap: "0", Class: "shrink-0 text-right" } }, strong(money(ref("z.price"), ref("z.currency")), "sm"), muted(ref("z.time"), "xs")))))]),
  ],
});

export const ctaProofParts: OrganismSpec[] = [ctaProofItems];
