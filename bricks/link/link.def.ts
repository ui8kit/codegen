import {
  attrClass,
  attrExpr,
  attrRest,
  brick,
  cond,
  derived,
  el,
  eq,
  fwd,
  isSet,
  lit,
  or,
  pAttrs,
  pBool,
  pChildren,
  pClass,
  pPass,
  prop,
  pStr,
  slot,
} from "../_dsl";

export default brick({
  id: "ui.link",
  dir: "link",
  docs: "Link renders a semantic anchor for navigation. Use Button for actions.",
  parts: [
    {
      name: "Link",
      docs: "Link renders an anchor; External opens a new tab with rel=noopener noreferrer.",
      classes: {},
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
        pClass(),
        pPass("Href"),
        pStr("Target", "explicit target; External implies _blank"),
        pStr("Rel", "explicit rel; External defaults to noopener noreferrer"),
        pBool("External", "opens in a new tab with safe rel defaults"),
        pPass("Download"),
        pPass("AriaCurrent"),
        pPass("AriaLabel"),
        pAttrs(),
        pChildren(),
      ],
      render: el(
        "a",
        [
          fwd("href", "Href"),
          attrClass(),
          attrExpr("target", derived("target")),
          attrExpr("rel", derived("rel")),
          fwd("download", "Download"),
          fwd("aria-current", "AriaCurrent"),
          fwd("aria-label", "AriaLabel"),
          attrRest(),
        ],
        [slot()]
      ),
    },
  ],
});
