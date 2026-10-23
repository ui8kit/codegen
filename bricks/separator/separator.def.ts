import {
  and,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  el,
  eq,
  lit,
  mapOr,
  not,
  pAttrs,
  pBool,
  pClass,
  pEnum,
  prop,
} from "../_dsl";

export default brick({
  id: "ui.separator",
  dir: "separator",
  docs:
    "Separator is the native <hr> (implicit role=separator). Vertical adds\n" +
    "aria-orientation; Decorative removes the semantics with role=none.",
  parts: [
    {
      name: "Separator",
      docs: "Separator renders a void hr; no children.",
      classes: {},
      props: [
        pClass(),
        pEnum("Orientation", ["horizontal", "vertical"], "horizontal (default) | vertical"),
        pBool("Decorative", "purely visual: role=none, no separator semantics"),
        pAttrs(),
      ],
      render: el(
        "hr",
        [
          attrClass(),
          attrExpr("role", lit("none"), { when: prop("Decorative") }),
          attrExpr("aria-orientation", lit("vertical"), {
            when: and(
              not(prop("Decorative")),
              eq(mapOr(prop("Orientation"), { vertical: "vertical" }, "horizontal", { lower: true }), lit("vertical"))
            ),
          }),
          attrRest(),
        ],
        [],
        { void: true }
      ),
    },
  ],
});
