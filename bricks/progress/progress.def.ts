import { attrClass, attrRest, brick, el, fwd, pAttrs, pChildren, pClass, pPass, slot } from "../_dsl";

export default brick({
  id: "ui.progress",
  dir: "progress",
  docs: "Progress is native task progress (value/max); omit value for indeterminate.",
  parts: [
    {
      name: "Progress",
      docs: "Progress renders a native progress element; children are the fallback text.",
      classes: {},
      props: [pClass(), pPass("Value"), pPass("Max"), pPass("AriaLabel"), pAttrs(), pChildren()],
      render: el(
        "progress",
        [attrClass(), fwd("value", "Value"), fwd("max", "Max"), fwd("aria-label", "AriaLabel"), attrRest()],
        [slot()]
      ),
    },
  ],
});
