import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  el,
  fwd,
  mapOr,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pEnum,
  pPass,
  prop,
  slot,
} from "../_dsl";

export const FORM_METHODS = ["get", "post", "dialog"] as const;

export default brick({
  id: "ui.form",
  dir: "form",
  docs:
    "Form is the native <form>. Submission, validation and state are the consumer's;\n" +
    "the primitive only types the native form attributes.",
  parts: [
    {
      name: "Form",
      docs: "Form renders a native form element; method is whitelisted (get|post|dialog).",
      classes: {},
      props: [
        pClass(),
        pPass("ID"),
        pPass("Name"),
        pPass("Action", "submission URL"),
        pEnum("Method", FORM_METHODS, "HTTP method: get | post | dialog (omitted when empty)"),
        pPass("Enctype", "encoding for post (e.g. multipart/form-data)"),
        pBool("NoValidate", "skip native constraint validation"),
        pPass("Autocomplete", "on | off"),
        pPass("Target", "browsing context for the response"),
        pPass("AriaLabel"),
        pPass("AriaLabelledBy"),
        pPass("AriaDescribedBy"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "form",
        [
          attrClass(),
          fwd("id", "ID"),
          fwd("name", "Name"),
          fwd("action", "Action"),
          attrExpr("method", mapOr(prop("Method"), { get: "get", post: "post", dialog: "dialog" }, "", { lower: true })),
          fwd("enctype", "Enctype"),
          attrBool("novalidate", prop("NoValidate")),
          fwd("autocomplete", "Autocomplete"),
          fwd("target", "Target"),
          fwd("aria-label", "AriaLabel"),
          fwd("aria-labelledby", "AriaLabelledBy"),
          fwd("aria-describedby", "AriaDescribedBy"),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
