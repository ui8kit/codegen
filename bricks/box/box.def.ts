import { attrClass, attrRest, brick, el, pAttrs, pChildren, pClass, pEnum, slot } from "../_dsl";
import { BOX_TAGS } from "../../src/domain/tags";

export default brick({
  id: "ui.box",
  dir: "box",
  docs:
    "Box is the polymorphic structural primitive. `tag` accepts HTML5 structural\n" +
    "elements only (sections, lists, tables, fieldset); anything else falls back to div.\n" +
    "Forms use the Form primitive (Box no longer accepts `form`).",
  parts: [
    {
      name: "Box",
      docs: "Box renders the requested structural HTML element (default div).",
      asChild: true,
      classes: {},
      props: [
        pClass(),
        pEnum("Tag", BOX_TAGS, "HTML5 structural tag (default div)"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        { kind: "resolved", fromProp: "Tag", fallback: "div", group: "Box" },
        [attrClass(), attrRest()],
        [slot()]
      ),
    },
  ],
});
