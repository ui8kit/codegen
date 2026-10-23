import { attrClass, attrRest, brick, el, fwd, pAttrs, pChildren, pClass, pPass, slot } from "../_dsl";

export default brick({
  id: "ui.label",
  dir: "label",
  docs: "Label names a form control.",
  parts: [
    {
      name: "Label",
      docs: "Label renders a native label element.",
      classes: {},
      props: [pClass(), pPass("For", "id of the labeled control"), pAttrs(), pChildren()],
      render: el("label", [attrClass(), fwd("for", "For"), attrRest()], [slot()]),
    },
  ],
});
