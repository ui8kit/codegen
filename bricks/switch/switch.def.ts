import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  attrStatic,
  boolToString,
  brick,
  el,
  fwd,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pPass,
  prop,
  slot,
} from "../_dsl";

export default brick({
  id: "ui.switch",
  dir: "switch",
  docs:
    "Switch is an on/off toggle: button[role=switch] with aria-checked.\n" +
    "State changes are the consumer's (onClick via attrs/rest).",
  parts: [
    {
      name: "Switch",
      docs: "Switch renders button[type=button][role=switch]; children render the thumb.",
      classes: {},
      props: [
        pClass(),
        pBool("Checked"),
        pBool("Disabled"),
        pPass("ID"),
        pPass("Name"),
        pPass("Value"),
        pPass("AriaLabel"),
        pPass("AriaLabelledBy"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "button",
        [
          attrStatic("type", "button"),
          attrStatic("role", "switch"),
          attrExpr("aria-checked", boolToString(prop("Checked"))),
          attrExpr("data-state", boolToString(prop("Checked"))),
          attrClass(),
          attrBool("disabled", prop("Disabled")),
          fwd("id", "ID"),
          fwd("name", "Name"),
          fwd("value", "Value"),
          fwd("aria-label", "AriaLabel"),
          fwd("aria-labelledby", "AriaLabelledBy"),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
