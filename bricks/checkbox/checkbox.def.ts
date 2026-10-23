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
  id: "ui.checkbox",
  dir: "checkbox",
  docs: "Checkbox is a native input[type=checkbox]; pair it with Label.",
  parts: [
    {
      name: "Checkbox",
      docs: "Checkbox renders input[type=checkbox].",
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
          attrStatic("type", "checkbox"),
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
