import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  el,
  eq,
  forEach,
  fwd,
  item,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pPass,
  prop,
  pStr,
  slot,
  text,
} from "../_dsl";

export default brick({
  id: "ui.select",
  dir: "select",
  docs:
    "Select is a native dropdown. Flat options come from the Options list;\n" +
    "SelectOption / SelectOptGroup children cover grouped or custom markup.",
  recordTypes: [
    {
      name: "SelectOptionItem",
      fields: [
        { name: "Value", type: "string" },
        { name: "Label", type: "string" },
        { name: "Disabled", type: "bool" },
      ],
    },
  ],
  parts: [
    {
      name: "Select",
      docs: "Select renders option children from Options, then manual children.",
      classes: {},
      props: [
        pClass(),
        pPass("ID"),
        pPass("Name"),
        pStr("Value", "selected option value"),
        pBool("Multiple"),
        pBool("Required"),
        pBool("Disabled"),
        { name: "Options", type: "items", cva: false, itemsOf: "SelectOptionItem" },
        pPass("AriaInvalid"),
        pPass("AriaDescribedBy"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "select",
        [
          attrClass(),
          fwd("id", "ID"),
          fwd("name", "Name"),
          attrBool("multiple", prop("Multiple")),
          attrBool("required", prop("Required")),
          attrBool("disabled", prop("Disabled")),
          fwd("aria-invalid", "AriaInvalid"),
          fwd("aria-describedby", "AriaDescribedBy"),
          attrRest(),
        ],
        [
          forEach("Options", [
            el(
              "option",
              [
                attrExpr("value", item("Value"), { keepEmpty: true }),
                attrBool("selected", eq(item("Value"), prop("Value"))),
                attrBool("disabled", item("Disabled")),
              ],
              [text(item("Label"))]
            ),
          ]),
          slot(),
        ]
      ),
    },
    {
      name: "SelectOption",
      docs: "SelectOption renders a native option.",
      props: [pPass("Value"), pBool("Selected"), pBool("Disabled"), pAttrs(), pChildren()],
      render: el(
        "option",
        [
          fwd("value", "Value"),
          attrBool("selected", prop("Selected")),
          attrBool("disabled", prop("Disabled")),
          attrRest(),
        ],
        [slot()]
      ),
    },
    {
      name: "SelectOptGroup",
      docs: "SelectOptGroup renders a native optgroup around option children.",
      props: [pPass("Label"), pBool("Disabled"), pAttrs(), pChildren()],
      render: el(
        "optgroup",
        [fwd("label", "Label"), attrBool("disabled", prop("Disabled")), attrRest()],
        [slot()]
      ),
    },
  ],
});
