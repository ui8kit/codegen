// A call to action with proof: centered over logos, features or figures, or split beside a picture with figures, icon rows or delivery zones.
import { cond, eq, ref, text, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, tsOf, toneLite } from "../props";

const ctaProof = spec("organism.cta-proof", "CtaProof", "A call to action with proof: a badge, the heading, a lead, the proof, one or two actions and an optional note. Axes: layout (center: everything centred, the proof above the actions; split: beside a picture), proof (logos, features, stats, rows, zones), mediaSide, tone.", {
  typeImports: [{ from: "LogoCloud", names: ["Logo"] }, { from: "FeatureGrid", names: ["Feature"] }, { from: "StatsBand", names: ["Stat"] }, { from: "ZoneTable", names: ["Zone"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: { CtaContent: fields(["logos", "Logo[]"], ["features", "Feature[]"], ["stats", "Stat[]"], ["zones", "Zone[]"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "content", type: { record: "CtaContent" }, required: true },
    { name: "note", type: "string", default: "", docs: "a small line under the actions" },
    { name: "layout", type: tsOf("center", "split"), default: "center" },
    { name: "proof", type: tsOf("logos", "features", "stats", "rows", "zones"), default: "stats" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const center = eq(ref("layout"), "center");
    const body = [
      organism("CtaProofItems", { content: ref("content"), proof: ref("proof"), center }),
      organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: cond(center, "center", "start") }),
      when(ref("note"), [use("Text", { props: { Size: "xs", Class: "text-muted-foreground" }, attrs: { "data-testid": "cta-note" } }, text(ref("note")))]),
    ];
    return [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone"), density: "default", align: cond(center, "center", "start"),
      layout: cond(center, "stack", "split"), hasMedia: eq(ref("layout"), "split"), mediaSide: ref("mediaSide") }, body, [organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })])];
  })(),
});

export const ctaProofOrganisms: OrganismSpec[] = [ctaProof];
