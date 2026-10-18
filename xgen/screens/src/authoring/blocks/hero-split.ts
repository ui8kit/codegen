// A split hero: the heading, a lead, something under it (figures, faces, small cards or a quote) and the actions, beside a picture,
// a picture with a floating card, a grid of four pictures, or a picture with two plan cards.
import { cond, eq, ref, undef, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, tsOf, toneLite } from "../props";

const heroSplit = spec("organism.hero-split", "HeroSplit", "A split hero: a badge, the heading, a lead, an extra under it and one or two actions, beside the media. Axes: extra (stats: three figures, avatars: faces and a proof line, minis: two small feature cards, quote: a quote over three figures, none), media (picture, card: a floating card on the picture, grid: four pictures with captions, plans: two plan cards on the picture), mediaSide, tone.", {
  typeImports: [{ from: "StatsBand", names: ["Stat"] }, { from: "FeatureGrid", names: ["Feature"] }, { from: "TestimonialGrid", names: ["Quote"] }, { from: "StoreHero", names: ["OfferCard"] }, { from: "PricingCard", names: ["Plan"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: { HeroContent: fields(["stats", "Stat[]"], ["features", "Feature[]"], ["people", "Quote[]"], ["plans", "Plan[]"], ["proof", "string"], ["card", "OfferCard"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "content", type: { record: "HeroContent" }, required: true },
    { name: "extra", type: tsOf("stats", "avatars", "minis", "quote", "none"), default: "stats" },
    { name: "media", type: tsOf("picture", "card", "grid", "plans"), default: "picture" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), level: ref("level"), layout: "split", hasMedia: true, mediaSide: ref("mediaSide"), tone: ref("tone"), density: "default" }, [
    organism("HeroSplitExtras", { content: ref("content"), extra: ref("extra") }),
    organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" }),
  ], [organism("HeroSplitMedia", { content: ref("content"), alt: ref("title"), media: ref("media") })])],
});

export const heroSplitOrganisms: OrganismSpec[] = [heroSplit];
