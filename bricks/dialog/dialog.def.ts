import { attrBool, attrClass, attrRest, brick, el, fwd, pAttrs, pBool, pChildren, pClass, pPass, prop, slot } from "../_dsl";

export default brick({
  id: "ui.dialog",
  dir: "dialog",
  docs: "Dialog is the native <dialog>. Opening/closing (showModal) is the consumer's.",
  parts: [
    {
      name: "Dialog",
      docs: "Dialog renders a native dialog element.",
      classes: {},
      props: [
        pClass(),
        pPass("ID"),
        pBool("Open", "initial open state"),
        pPass("AriaLabelledBy"),
        pPass("AriaDescribedBy"),
        pPass("AriaLabel"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "dialog",
        [
          attrClass(),
          fwd("id", "ID"),
          attrBool("open", prop("Open")),
          fwd("aria-labelledby", "AriaLabelledBy"),
          fwd("aria-describedby", "AriaDescribedBy"),
          fwd("aria-label", "AriaLabel"),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
