// The top of a post page with more around the title: centered with figures and a share card over a wide cover, or a split beside the
// cover with the author, the figures, the tags and the actions, or an outline of facts and related reading beside the cover.
import { cond, eq, ne, ref, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { id, ifAny, tsOf, toneLite } from "../props";

const postSplit = spec("organism.post-split", "PostSplit", "A post header with the author, the reading figures, the tags and the actions. Axes: layout (center: tags, figures and an author card with share and save over a wide cover; split: beside the cover; outline: facts and related reading beside the cover), mediaSide, author (line, card, bio), cover (wide, square), actions (pair, wide, icons), tone.", {
  typeImports: [{ from: "PostCard", names: ["Post"] }, { from: "NavBar", names: ["NavLink"] }],
  records: {
    PostExtras: fields(["role", "string"], ["bio", "string"], ["views", "string"], ["likes", "string"], ["tags", "NavLink[]"], ["outline", "NavLink[]"]),
    PostSplitLabels: fields(["minutes", "string"], ["views", "string"], ["likes", "string"], ["share", "string"], ["save", "string"], ["read", "string"], ["related", "string"]),
  },
  props: [
    id,
    { name: "post", type: ts("Post"), required: true },
    { name: "labels", type: { record: "PostSplitLabels" }, required: true, docs: "templates: minutes `{0} min read`, views `{0} views`, likes `{0} likes`; the words of the buttons and of the related heading" },
    { name: "extras", type: { record: "PostExtras" }, required: true },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "layout", type: tsOf("center", "split", "outline"), default: "split" },
    { name: "mediaSide", type: tsOf("end", "start"), default: "end" },
    { name: "author", type: tsOf("line", "card", "bio"), default: "line" },
    { name: "cover", type: tsOf("wide", "square"), default: "wide" },
    { name: "actions", type: tsOf("pair", "wide", "icons"), default: "pair" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: (() => {
    const is = (l: string) => eq(ref("layout"), l);
    const base = { post: ref("post"), extras: ref("extras"), labels: ref("labels") };
    const head = { id: ref("id"), title: ref("post.title"), lead: ref("post.excerpt"), badge: ref("post.category"), level: ref("level"), tone: ref("tone"), hasMedia: true };
    // emptyMode omit: no tags, no tag row; no outline facts, no outline column
    const tags = (align: string) => ifAny("extras.tags", [organism("PostTags", { tags: ref("extras.tags"), align })]);
    const cover = organism("MediaFrame", { alt: ref("post.title"), ratio: cond(is("center"), "21/9", cond(eq(ref("cover"), "square"), "1/1", "4/3")) });
    return [when(is("center"), [frame({ ...head, align: "center" }, [
      tags("center"),
      organism("PostStats", { ...base, align: "center" }),
      organism("PostAuthor", { ...base, mode: "card", share: true, className: "mx-auto w-full max-w-md" }),
    ], [cover])], [frame({ ...head, layout: "split", mediaSide: ref("mediaSide") }, [
      when(is("outline"), [ifAny("extras.outline", [organism("PostOutline", base)])], [
        organism("PostAuthor", { ...base, mode: ref("author") }),
        when(ne(ref("author"), "line"), [organism("PostStats", base)]),
        tags("start"),
      ]),
      organism("PostActions", { labels: ref("labels"), mode: ref("actions") }),
    ], [cover])])];
  })(),
});

export const postSplitOrganisms: OrganismSpec[] = [postSplit];
