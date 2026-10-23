import {
  attrBool,
  attrClass,
  attrRest,
  brick,
  el,
  fwd,
  pAttrs,
  pBool,
  pClass,
  pPass,
  prop,
  pStr,
  text,
} from "../_dsl";

export default brick({
  id: "ui.textarea",
  dir: "textarea",
  docs: "Textarea is a multi-line native text field.",
  parts: [
    {
      name: "Textarea",
      docs: "Textarea renders a native textarea; Value is the initial content.",
      classes: {},
      props: [
        pClass(),
        pPass("ID"),
        pPass("Name"),
        pStr("Value", "initial content"),
        pPass("Placeholder"),
        pPass("Rows"),
        pBool("Required"),
        pBool("Disabled"),
        pBool("ReadOnly"),
        pPass("AriaInvalid"),
        pPass("AriaDescribedBy"),
        pAttrs(),
      ],
      render: el(
        "textarea",
        [
          attrClass(),
          fwd("id", "ID"),
          fwd("name", "Name"),
          fwd("placeholder", "Placeholder"),
          fwd("rows", "Rows"),
          attrBool("required", prop("Required")),
          attrBool("disabled", prop("Disabled")),
          attrBool("readonly", prop("ReadOnly")),
          fwd("aria-invalid", "AriaInvalid"),
          fwd("aria-describedby", "AriaDescribedBy"),
          attrRest(),
        ],
        [text(prop("Value"))]
      ),
    },
  ],
});
