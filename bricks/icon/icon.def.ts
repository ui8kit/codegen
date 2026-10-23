import {
  attrClass,
  attrExpr,
  attrRest,
  attrStatic,
  brick,
  el,
  isSet,
  lit,
  not,
  pAttrs,
  pChildren,
  pClass,
  pCva,
  prop,
  pStr,
  slot,
} from "../_dsl";
import iconVariants from "./icon.variants.json";

export default brick({
  id: "ui.icon",
  dir: "icon",
  docs:
    "Icon is a sized frame for a consumer-supplied glyph (svg, sprite, font).\n" +
    "No registry: the glyph is the children/slot. Decorative unless Label is set.",
  recipes: { icon: { file: "icon.variants.json", recipe: iconVariants } },
  parts: [
    {
      name: "Icon",
      docs: "Icon renders span[data-slot=icon]; Label switches to role=img + aria-label.",
      recipeId: "icon",
      classes: { recipe: { size: "Size" } },
      props: [
        pCva("Size", "size", "size token: xs, sm, md, lg, xl (default sm)"),
        pClass(),
        pStr("Label", "accessible name; omitted = decorative (aria-hidden)"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "span",
        [
          attrStatic("data-slot", "icon"),
          attrClass(),
          attrExpr("aria-hidden", lit("true"), { when: not(isSet(prop("Label"))) }),
          attrExpr("role", lit("img"), { when: isSet(prop("Label")) }),
          attrExpr("aria-label", prop("Label"), { when: isSet(prop("Label")) }),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
