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
  optBoolToString,
  pAttrs,
  pBool,
  pBoolOpt,
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
    "looks like an action). Event handlers (onClick) flow through attrs/rest.\n" +
    "Pressed / Expanded are the semantic ARIA state props (toggle, disclosure).",
  parts: [
    {
      name: "Button",
      docs:
        "Button renders a button element, or an anchor when Href is set.\n" +
        "Type/Form apply only in button mode; Disabled on anchors uses aria-disabled.\n" +
        "Pressed (button mode) and Expanded print aria-pressed / aria-expanded as \"true\"/\"false\";\n" +
        "unset omits the attribute.",
      asChild: true,
      classes: {},
      props: [
        pClass(),
        pEnum("Type", ["button", "submit", "reset"], "button type (default button)"),
        pPass("Form", "associated form id (button mode)"),
        pStr("Href", "renders an anchor when set"),
        pBool("Disabled", "blocks interaction"),
        pBoolOpt("Pressed", "toggle state → aria-pressed (button mode); unset omits it"),
        pBoolOpt("Expanded", "disclosure state → aria-expanded; unset omits it"),
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
              attrExpr("aria-expanded", optBoolToString(prop("Expanded"))),
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
              attrExpr("aria-pressed", optBoolToString(prop("Pressed"))),
              attrExpr("aria-expanded", optBoolToString(prop("Expanded"))),
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
