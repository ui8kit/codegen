// A list or figures beside a picture: four figures, figures with a featured review, numbered steps, the latest posts, topic rows, or
// contact buttons with support figures; with one or two actions under it.
import { cond, eq, ne, or, ref, undef, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, ifAny, tsOf, toneLite } from "../props";

const mediaList = spec("organism.media-list", "MediaList", "A list or figures beside a picture. Axes: layout (figures: four figures in two columns, proof: three figures and a featured review, steps: numbered steps, posts: the latest posts, topics: topic rows with counts, contact: contact buttons and support figures), mediaSide, tone. The actions follow every layout but contact.", {
  typeImports: [{ from: "StatsBand", names: ["Stat"] }, { from: "StepsList", names: ["Step"] }, { from: "PostCard", names: ["Post"] }, { from: "CategoryNav", names: ["Category"] },
    { from: "FeatureGrid", names: ["Feature"] }, { from: "ReviewList", names: ["Review"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: {
    MediaExtras: fields(["stats", "Stat[]"], ["steps", "Step[]"], ["posts", "Post[]"], ["topics", "Category[]"], ["channels", "Feature[]"], ["reviews", "Review[]"]),
    MediaListLabels: fields(["list", "string"], ["count", "string"], ["minutes", "string"], ["featured", "string"], ["rating", "string"], ["figures", "string"]),
  },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "lead", type: "string", default: "" },
    { name: "badge", type: "string", default: "", docs: "a short pill above the heading" },
    { name: "extras", type: { record: "MediaExtras" }, required: true, docs: "the figures, steps, posts, topics, channels and reviews" },
    { name: "labels", type: { record: "MediaListLabels" }, required: true, docs: "the heading of the list; templates: count `{0} articles`, minutes `{0} min read`, rating `{0} out of 5`; the featured-review and figures headings" },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "layout", type: tsOf("figures", "proof", "steps", "posts", "topics", "contact"), default: "figures" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const is = (l: string) => eq(ref("layout"), l);
    const both = { extras: ref("extras"), labels: ref("labels") };
    const actions = organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" });
    // emptyMode omit: an empty list leaves its part out
    return [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), tone: ref("tone"), layout: "split", hasMedia: true, mediaSide: ref("mediaSide") }, [
      when(or(is("figures"), is("proof")), [ifAny("extras.stats", [organism("MediaFigures", { extras: ref("extras"), mode: cond(is("proof"), "row", "grid") })])]),
      when(is("proof"), [ifAny("extras.reviews", [organism("MediaReview", both)])]),
      when(is("steps"), [ifAny("extras.steps", [organism("MediaSteps", both)])]),
      when(is("posts"), [ifAny("extras.posts", [organism("MediaPosts", both)])]),
      when(is("topics"), [ifAny("extras.topics", [organism("MediaTopics", both)])]),
      when(is("contact"), [ifAny("extras.channels", [organism("MediaContacts", both)])]),
      when(ne(ref("layout"), "contact"), [actions]),
    ], [organism("MediaFrame", { alt: ref("title"), ratio: cond(or(is("steps"), is("topics")), "1/1", "4/3") })])];
  })(),
});

export const mediaListOrganisms: OrganismSpec[] = [mediaList];
