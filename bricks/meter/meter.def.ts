import { attrClass, attrRest, brick, el, fwd, pAttrs, pChildren, pClass, pPass, slot } from "../_dsl";

export default brick({
  id: "ui.meter",
  dir: "meter",
  docs: "Meter is a native gauge for a known range (value/min/max).",
  parts: [
    {
      name: "Meter",
      docs: "Meter renders a native meter; children are the fallback text.",
      classes: {},
      props: [
        pClass(),
        pPass("Value"),
        pPass("Min"),
        pPass("Max"),
        pPass("Low"),
        pPass("High"),
        pPass("Optimum"),
        pPass("AriaLabel"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "meter",
        [
          attrClass(),
          fwd("value", "Value"),
          fwd("min", "Min"),
          fwd("max", "Max"),
          fwd("low", "Low"),
          fwd("high", "High"),
          fwd("optimum", "Optimum"),
          fwd("aria-label", "AriaLabel"),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
