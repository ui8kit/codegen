import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  defaultIfEmpty,
  el,
  fwd,
  pAttrs,
  pBool,
  pClass,
  pEnum,
  pPass,
  prop,
} from "../_dsl";

export const INPUT_TYPES = [
  "text", "email", "password", "search", "tel", "url", "number", "range", "date",
  "datetime-local", "month", "week", "time", "color", "file", "hidden",
] as const;

export default brick({
  id: "ui.input",
  dir: "input",
  docs: "Input is a single-line native form control (checkbox/radio have their own primitives).",
  parts: [
    {
      name: "Input",
      docs: "Input renders a native input element (default type text).",
      classes: {},
      props: [
        pClass(),
        pEnum("Type", INPUT_TYPES, "input type (default text)"),
        pPass("ID"),
        pPass("Name"),
        pPass("Value"),
        pPass("Placeholder"),
        pPass("Min"),
        pPass("Max"),
        pPass("Step"),
        pBool("Required"),
        pBool("Disabled"),
        pBool("ReadOnly"),
        pPass("AriaInvalid"),
        pPass("AriaDescribedBy"),
        pAttrs(),
      ],
      render: el(
        "input",
        [
          attrExpr("type", defaultIfEmpty(prop("Type"), "text")),
          attrClass(),
          fwd("id", "ID"),
          fwd("name", "Name"),
          fwd("value", "Value"),
          fwd("placeholder", "Placeholder"),
          fwd("min", "Min"),
          fwd("max", "Max"),
          fwd("step", "Step"),
          attrBool("required", prop("Required")),
          attrBool("disabled", prop("Disabled")),
          attrBool("readonly", prop("ReadOnly")),
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
