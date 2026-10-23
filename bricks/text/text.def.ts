import { attrClass, attrRest, brick, el, pAttrs, pChildren, pClass, pEnum, slot } from "../_dsl";
import { TEXT_TAGS } from "../../src/domain/tags";

export default brick({
  id: "ui.text",
  dir: "text",
  docs:
    "Text is the polymorphic text primitive. `tag` accepts HTML5 text elements\n" +
    "only (p, span, h1–h6, blockquote, code, …); anything else falls back to p.",
  parts: [
    {
      name: "Text",
      docs: "Text renders the requested text element (default p).",
      asChild: true,
      classes: {},
      props: [
        pClass(),
        pEnum("Tag", TEXT_TAGS, "HTML5 text tag (default p)"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        { kind: "resolved", fromProp: "Tag", fallback: "p", group: "Text" },
        [attrClass(), attrRest()],
        [slot()]
      ),
    },
  ],
});
