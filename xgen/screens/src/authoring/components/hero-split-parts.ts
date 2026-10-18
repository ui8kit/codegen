// Parts of HeroSplit: what sits under the lead (figures, faces, small cards or a quote) and what sits beside the text (a picture,
// a picture with a floating card, a grid of four pictures, or a picture with two plan cards over it).
import { and, cn, cond, eachAt, eq, gt, len, lt, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong, surface } from "../ux";
import { figureBlockOf } from "./landmarks";

const types = [{ from: "HeroSplit", names: ["HeroContent"] }];
const content = { name: "content", type: ts("HeroContent"), required: true, docs: "the figures, small cards, people, proof line and floating card of the hero" };
/** the first `n` entries of a list */
const first = (list: string, as: string, n: number, node: ViewNode): ViewNode => eachAt(ref(list), as, "i", ref(`${as}.id`), when(lt(ref("i"), n), [node]));
/** an icon in a small muted square */
const iconSquare = (icon: string): ViewNode =>
  use("Box", { props: { Class: "flex size-10 shrink-0 items-center justify-center rounded bg-muted" } }, use("LucideIcon", { props: { Name: ref(icon), Size: 20 } }));
/** three figures in small cards */
const stats = (): ViewNode => use("Box", { props: { Class: "grid grid-cols-3 gap-4" }, attrs: { "data-testid": "hero-stats" } },
  first("content.stats", "s", 3, use("Stack", { props: { Gap: "0", Class: surface("p-4") }, attrs: { "data-testid": "hero-stat" } },
    use("Text", { props: { Size: "2xl", Weight: "semibold" } }, text(ref("s.value"))), muted(ref("s.label"), "xs"))));

export const heroExtras = spec("pattern.hero-split-extras", "HeroSplitExtras", "What HeroSplit shows under the lead: three figures in cards, a row of faces with a proof line, two small feature cards, or a quote with its author over three figures.", {
  typeImports: types,
  props: [content, { name: "extra", type: tsOf("stats", "avatars", "minis", "quote", "none"), default: "none" }],
  view: [
    when(and(eq(ref("extra"), "stats"), gt(len(ref("content.stats")), 0)), [stats()]),
    when(and(eq(ref("extra"), "avatars"), gt(len(ref("content.people")), 0)), [use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" }, attrs: { "data-testid": "hero-proof" } },
      use("Group", { props: { Gap: "2", Align: "center" } },
        first("content.people", "p", 4, organism("MediaFrame", { alt: ref("p.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }))),
      muted(ref("content.proof")))]),
    when(and(eq(ref("extra"), "minis"), gt(len(ref("content.features")), 0)), [use("Box", { props: { Class: "grid grid-cols-1 gap-4 sm:grid-cols-2" }, attrs: { "data-testid": "hero-minis" } },
      first("content.features", "f", 2, use("Group", { props: { Gap: "4", Align: "start", Class: surface("p-4") }, attrs: { "data-testid": "hero-mini" } },
        iconSquare("f.icon"), use("Stack", { props: { Gap: "0" } }, strong(ref("f.title"), "sm"), muted(ref("f.text"), "xs")))))]),
    when(and(eq(ref("extra"), "quote"), gt(len(ref("content.people")), 0)), [use("Stack", { props: { Gap: "6", Align: "stretch" } },
      first("content.people", "p", 1, figureBlockOf("flex flex-col gap-4", "hero-quote",
        use("Text", { props: { Tag: "blockquote", Class: "text-lg font-medium" } }, text(ref("p.quote"))),
        use("Group", { props: { Gap: "4", Align: "center" } },
          organism("MediaFrame", { alt: ref("p.author"), ratio: "1/1", className: "size-10 shrink-0 rounded-full" }),
          use("Stack", { props: { Gap: "0" } }, strong(ref("p.author"), "sm"), muted(ref("p.role"), "xs"))))),
      stats())]),
  ],
});

export const heroMedia = spec("pattern.hero-split-media", "HeroSplitMedia", "What HeroSplit shows beside the text: a picture, a picture with a floating card, a grid of four pictures with captions, or a picture with two plan cards floating over it.", {
  typeImports: types,
  props: [
    content,
    { name: "alt", type: "string", required: true, docs: "accessible name of the pictures" },
    { name: "media", type: tsOf("picture", "card", "grid", "plans"), default: "picture" },
  ],
  view: [
    when(eq(ref("media"), "picture"), [organism("MediaFrame", { alt: ref("alt"), ratio: "4/3" })]),
    when(eq(ref("media"), "card"), [organism("OfferMedia", { alt: ref("alt"), card: ref("content.card") })]),
    when(and(eq(ref("media"), "grid"), gt(len(ref("content.features")), 0)), [use("Box", { props: { Class: "grid grid-cols-2 gap-4" }, attrs: { "data-testid": "hero-grid" } },
      first("content.features", "f", 4, figureBlockOf("flex flex-col gap-2", "hero-tile",
        organism("MediaFrame", { alt: ref("f.title"), ratio: "1/1" }), muted(ref("f.title"), "xs"))))]),
    when(and(eq(ref("media"), "plans"), gt(len(ref("content.plans")), 0)), [use("Box", { props: { Class: "relative" }, attrs: { "data-testid": "hero-media" } },
      organism("MediaFrame", { alt: ref("alt"), ratio: "4/3" }),
      first("content.plans", "p", 2, use("Stack", { props: { Gap: "2", Class: cn("absolute w-48 rounded bg-card p-4 shadow-lg", cond(eq(ref("i"), 0), "top-8 left-4", "right-4 bottom-8")) }, attrs: { "data-testid": "hero-plan" } },
        strong(ref("p.name"), "sm"),
        use("Group", { props: { Gap: "2", Align: "center" } }, use("LucideIcon", { props: { Name: "check", Size: 16 } }), muted(ref("p.tagline"), "xs")))))]),
  ],
});

export const heroSplitParts: OrganismSpec[] = [heroExtras, heroMedia];
