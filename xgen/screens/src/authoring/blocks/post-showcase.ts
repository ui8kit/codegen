// Posts shown off: four small cards beside an intro with a view-all link, one featured post beside its picture, or cards
// with the text on a panel over the picture in two or three columns.
import { cond, eachAt, eq, lt, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec, ts } from "../kit";
import { frame } from "../components/frames";
import { empty, id, orEmpty, tsOf, toneLite } from "../props";

const postShowcase = spec("organism.post-showcase", "PostShowcase", "Posts shown off. Axes: layout (intro: four small post cards beside the intro with a view-all link, featured: the first post in detail beside its picture, overlay: cards with the text over the picture), cols (2, 3: overlay columns), mediaSide, tone.", {
  typeImports: [{ from: "PostCard", names: ["Post", "PostLabels"] }, { from: "SectionFrame", names: ["HeadLink"] }],
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "posts", type: ts("Post[]"), required: true },
    { name: "labels", type: ts("PostLabels"), required: true },
    { name: "action", type: ts("HeadLink"), required: true, docs: "the view-all link of the intro layout" },
    { name: "layout", type: tsOf("intro", "featured", "overlay"), default: "intro" },
    { name: "cols", type: tsOf("2", "3"), default: "3" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "start" },
    { name: "tone", type: toneLite, default: "default" },
    empty,
  ],
  view: (() => {
    const is = (l: string) => eq(ref("layout"), l);
    const head = { id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone") };
    const firstPosts = (n: Value, node: ViewNode): ViewNode => eachAt(ref("posts"), "p", "i", ref("p.id"), when(lt(ref("i"), n), [node]));
    const intro = frame({ ...head, layout: "split", hasMedia: true, mediaSide: ref("mediaSide") }, [
      use("Link", { props: { Href: ref("action.href"), Size: "sm" }, attrs: { "data-testid": "section-action" } }, text(ref("action.label")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } })),
    ], [use("Box", { props: { Class: "grid grid-cols-1 gap-4 sm:grid-cols-2" } }, firstPosts(4, organism("PostMiniCard", { p: ref("p"), labels: ref("labels") })))]);
    const featured = frame({ ...head, layout: "split", hasMedia: true, mediaSide: ref("mediaSide") },
      [firstPosts(1, organism("PostFeature", { p: ref("p"), labels: ref("labels") }))],
      [organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })]);
    const overlay = frame(head, [use("Box", { props: { Class: cond(eq(ref("cols"), "2"), "grid grid-cols-1 gap-6 md:grid-cols-2", "grid grid-cols-1 gap-6 md:grid-cols-3") } },
      eachAt(ref("posts"), "p", "i", ref("p.id"), when(lt(ref("i"), cond(eq(ref("cols"), "2"), 2, 3)), [organism("PostOverlayCard", { p: ref("p"), labels: ref("labels"), ratio: cond(eq(ref("cols"), "2"), "16/9", "4/3") })])))]);
    return [orEmpty("posts", "newspaper", [when(is("intro"), [intro], [when(is("featured"), [featured], [overlay])])], (n) => [frame(head, n)])];
  })(),
});

export const postShowcaseOrganisms: OrganismSpec[] = [postShowcase];
