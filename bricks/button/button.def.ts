import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  el,
  fwd,
  isSet,
  lit,
  oneOfOr,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pEnum,
  pPass,
  prop,
  pStr,
  slot,
  when,
} from "../_dsl";

const aria = [
  fwd("aria-label", "AriaLabel"),
  fwd("aria-pressed", "AriaPressed"),
  fwd("aria-expanded", "AriaExpanded"),
  fwd("aria-controls", "AriaControls"),
];

export default brick({
  id: "ui.button",
  dir: "button",
  docs:
    "Button triggers an action. With `href` it renders an anchor (navigation that\n" +
    "looks like an action). Event handlers (onClick) flow through attrs/rest.",
  parts: [
    {
      name: "Button",
      docs:
        "Button renders a button element, or an anchor when Href is set.\n" +
        "Type/Form apply only in button mode; Disabled on anchors uses aria-disabled.",
      asChild: true,
      classes: {},
      props: [
        pClass(),
        pEnum("Type", ["button", "submit", "reset"], "button type (default button)"),
        pPass("Form", "associated form id (button mode)"),
        pStr("Href", "renders an anchor when set"),
        pBool("Disabled", "blocks interaction"),
        pPass("AriaLabel"),
        pPass("AriaPressed"),
        pPass("AriaExpanded"),
        pPass("AriaControls"),
        pAttrs(),
        pChildren(),
      ],
      render: when(
        isSet(prop("Href")),
        [
          el(
            "a",
            [
              attrExpr("href", prop("Href")),
              attrClass(),
              ...aria,
              attrExpr("aria-disabled", lit("true"), { when: prop("Disabled") }),
              attrExpr("tabindex", lit(-1), { when: prop("Disabled") }),
              attrRest(),
            ],
            [slot()]
          ),
        ],
        [
          el(
            "button",
            [
              attrExpr("type", oneOfOr(prop("Type"), ["submit", "reset"], "button")),
              attrClass(),
              attrBool("disabled", prop("Disabled")),
              fwd("form", "Form"),
              ...aria,
              attrRest(),
            ],
            [slot()]
          ),
        ]
      ),
    },
  ],
});
