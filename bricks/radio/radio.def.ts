import {
  attrBool,
  attrClass,
  attrRest,
  attrStatic,
  brick,
  el,
  fwd,
  pAttrs,
  pBool,
  pClass,
  pPass,
  prop,
} from "../_dsl";

export default brick({
  id: "ui.radio",
  dir: "radio",
  docs: "Radio is a native input[type=radio]; pair it with Label.",
  parts: [
    {
      name: "Radio",
      docs: "Radio renders input[type=radio].",
      classes: {},
      props: [
        pClass(),
        pPass("ID"),
        pPass("Name"),
        pPass("Value"),
        pBool("Checked"),
        pBool("Required"),
        pBool("Disabled"),
        pPass("AriaInvalid"),
        pPass("AriaDescribedBy"),
        pAttrs(),
      ],
      render: el(
        "input",
        [
          attrStatic("type", "radio"),
          attrClass(),
          fwd("id", "ID"),
          fwd("name", "Name"),
          fwd("value", "Value"),
          attrBool("checked", prop("Checked")),
          attrBool("required", prop("Required")),
          attrBool("disabled", prop("Disabled")),
          fwd("aria-invalid", "AriaInvalid"),
          fwd("aria-describedby", "AriaDescribedBy"),
          attrRest(),
        ],
        [],
        { void: true }
      ),
    },
  ],
});
