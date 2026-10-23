import { attrBool, attrClass, attrRest, brick, el, fwd, pAttrs, pBool, pChildren, pClass, pPass, prop, slot } from "../_dsl";

export default brick({
  id: "ui.disclosure",
  dir: "disclosure",
  docs:
    "Disclosure is native details/summary. `name` groups exclusive accordions.",
  parts: [
    {
      name: "Disclosure",
      docs: "Disclosure renders a native details element.",
      classes: {},
      props: [pClass(), pBool("Open", "initial open state"), pPass("Name"), pAttrs(), pChildren()],
      render: el(
        "details",
        [attrClass(), attrBool("open", prop("Open")), fwd("name", "Name"), attrRest()],
        [slot()]
      ),
    },
    {
      name: "Summary",
      docs: "Summary renders the native summary (the disclosure trigger).",
      classes: {},
      props: [pClass(), pAttrs(), pChildren()],
      render: el("summary", [attrClass(), attrRest()], [slot()]),
    },
  ],
});
