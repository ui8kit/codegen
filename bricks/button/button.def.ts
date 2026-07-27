import {
  attrBool,
  attrClass,
  attrExpr,
  attrRest,
  brick,
  cond,
  controlPassthroughProps,
  derived,
  el,
  eq,
  fwd,
  isSet,
  lit,
  oneOfOr,
  or,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pPass,
  prop,
  pSize,
  pStr,
  pVariant,
  slot,
  when,
} from "../_dsl";
import buttonVariants from "./button.variants.json";

export default brick({
  id: "ui.button",
  dir: "button",
  docs:
    "Button triggers an action on click.\n" +
    "Optional Href renders an anchor with button appearance (CTA navigation).\n" +
    "For exotic roots, use ButtonClasses (Templ/Svelte/Vue/Solid) or asChild (React).\n" +
    "Prefer Link for prose/semantic navigation.",
  recipes: { button: { file: "button.variants.json", recipe: buttonVariants } },
  parts: [
    {
      name: "Button",
      docs:
        "Button renders a button element, or an anchor when Href is set.\n" +
        "Type/Form apply only in button mode; Disabled on anchors uses aria-disabled.",
      recipeId: "button",
      asChild: true,
      classes: {
        recipe: { variant: "Variant", size: "Size" },
        state: [{ test: prop("Disabled"), classes: "pointer-events-none opacity-50" }],
      },
      derived: {
        target: cond(isSet(prop("Target")), prop("Target"), cond(prop("External"), lit("_blank"), lit(""))),
        rel: cond(
          isSet(prop("Rel")),
          prop("Rel"),
          cond(
            or(prop("External"), eq(derived("target"), lit("_blank"))),
            lit("noopener noreferrer"),
            lit("")
          )
        ),
      },
      props: [
        pVariant("appearance preset: default, secondary, destructive, outline, ghost, link"),
        pSize("density preset: default, sm, lg, icon"),
        pClass(),
        pStr("Type", "button type: button, submit, reset (ignored when Href is set)"),
        pPass("Form", "links button to a form id (ignored when Href is set)"),
        pStr("Href", "when set, renders an anchor with button appearance"),
        pStr("Target", "explicit target; External implies _blank (anchor mode)"),
        pStr("Rel", "explicit rel; external links default to noopener noreferrer (anchor mode)"),
        pBool("External", "opens in a new tab with safe rel defaults (anchor mode)"),
        pBool("Disabled", "blocks interaction"),
        ...controlPassthroughProps(),
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
              fwd("id", "ID"),
              attrExpr("target", derived("target")),
              attrExpr("rel", derived("rel")),
              fwd("role", "Role"),
              fwd("aria-label", "AriaLabel"),
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
              fwd("id", "ID"),
              fwd("form", "Form"),
              fwd("role", "Role"),
              fwd("tabindex", "TabIndex"),
              fwd("aria-label", "AriaLabel"),
              attrRest(),
            ],
            [slot()]
          ),
        ]
      ),
    },
  ],
});
