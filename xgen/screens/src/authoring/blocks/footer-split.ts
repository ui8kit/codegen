// Footers with more than links: the brand with figures over link-group cards, or a split beside a picture with points, small link
// columns, a newsletter card, the contacts, or the community channels with figures.
import { cn, cond, eq, ne, or, ref, use, when, organism } from "../../build";
import type { OrganismSpec, ViewNode } from "../../ir";
import { fields, spec, ts } from "../kit";
import { wide } from "../components/frames";
import { tsOf, toneLite } from "../props";
import { muted, strong } from "../ux";

const footerSplit = spec("organism.footer-split", "FooterSplit", "A footer with more than links. Axes: layout (stats: the brand with three figures and a sitemap link over the link groups as cards; points, links, newsletter, contacts, channels: a split beside a picture with the brand and four points, the brand and small link columns, a newsletter card and link columns, the contacts and two actions, or the community channels and figures), mediaSide, tone.", {
  typeImports: [{ from: "MegaMenu", names: ["MegaGroup"] }, { from: "StatsBand", names: ["Stat"] }, { from: "FeatureGrid", names: ["Feature"] }],
  records: {
    FooterExtras: fields(["stats", "Stat[]"], ["points", "Feature[]"], ["contacts", "Feature[]"], ["channels", "Feature[]"], ["sitemapHref", "string", true], ["ctaHref", "string", true], ["secondaryHref", "string", true]),
    FooterSplitLabels: fields(["title", "string"], ["text", "string"], ["loopTitle", "string"], ["loopText", "string"], ["joinTitle", "string"], ["joinText", "string"], ["sitemap", "string"], ["points", "string"], ["signup", "string"], ["email", "string"], ["subscribe", "string"], ["note", "string"], ["cta", "string"], ["secondary", "string"]),
  },
  props: [
    { name: "id", type: "string", default: "footer" },
    { name: "label", type: "string", required: true, docs: "accessible name of the link groups" },
    { name: "brand", type: "string", required: true },
    { name: "tagline", type: "string", required: true },
    { name: "copyright", type: "string", required: true },
    { name: "groups", type: ts("MegaGroup[]"), required: true },
    { name: "extras", type: { record: "FooterExtras" }, required: true },
    { name: "labels", type: { record: "FooterSplitLabels" }, required: true, docs: "the heading and text of the contacts, newsletter (loop) and channels (join) layouts, the sitemap link, the points title, the sign-up words and the two actions" },
    { name: "layout", type: tsOf("stats", "points", "links", "newsletter", "contacts", "channels"), default: "stats" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const is = (l: string) => eq(ref("layout"), l);
    const ex = { extras: ref("extras") };
    const nav = { label: ref("label"), groups: ref("groups") };
    const brand = organism("FooterBrand", { brand: ref("brand"), tagline: ref("tagline") });
    const pick = (key: string) => cond(is("newsletter"), ref(`labels.loop${key}`), cond(is("channels"), ref(`labels.join${key}`), ref(`labels.${key.toLowerCase()}`)));
    const head = use("Stack", { props: { Gap: "2", Align: "start" } }, strong(pick("Title"), "xl", "bold"), muted(pick("Text")));
    const copyright = use("Box", { props: { Class: "border-t border-border pt-6" } }, muted(ref("copyright")));
    const picture = (start: boolean): ViewNode => when(start ? eq(ref("mediaSide"), "start") : ne(ref("mediaSide"), "start"), [organism("MediaFrame", { alt: ref("brand"), ratio: "4/3" })]);
    const stats = use("Stack", { props: { Gap: "8", Align: "stretch" } },
      use("Group", { props: { Gap: "6", Align: "start", Justify: "between", Class: "flex-wrap" } },
        use("Stack", { props: { Gap: "6", Align: "start" } }, brand, organism("FooterFigures", ex)),
        organism("FooterSitemap", { href: ref("extras.sitemapHref"), label: ref("labels.sitemap") })),
      organism("FooterGroupCards", nav), copyright);
    const split = use("Box", { props: { Class: "grid grid-cols-1 items-center gap-8 lg:grid-cols-2" } },
      picture(true),
      use("Stack", { props: { Gap: "8", Align: "stretch" } },
        when(or(is("points"), is("links")), [brand], [head]),
        when(is("points"), [organism("FooterPoints", { ...ex, title: ref("labels.points") })]),
        when(is("newsletter"), [organism("FooterSignupCard", { id: ref("id"), labels: ref("labels") })]),
        when(or(is("links"), is("newsletter")), [organism("FooterLinkColumns", nav)]),
        when(is("contacts"), [organism("FooterContacts", ex),
          organism("ActionGroup", { primary: ref("labels.cta"), primaryHref: ref("extras.ctaHref"), secondary: ref("labels.secondary"), secondaryHref: ref("extras.secondaryHref"), align: "start" })]),
        when(is("channels"), [organism("FooterChannels", ex), organism("FooterFigures", ex)]),
        copyright),
      picture(false));
    return [use("Block", { props: { Tag: "footer", Class: cn("border-t border-border", cond(eq(ref("tone"), "muted"), "bg-muted", "")) }, attrs: { "data-testid": "footer-split", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, "py-12") }, attrs: { "data-slot": "container" } }, when(is("stats"), [stats], [split])))];
  })(),
});

export const footerSplitOrganisms: OrganismSpec[] = [footerSplit];
