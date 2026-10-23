import {
  attrClass,
  attrExpr,
  attrRest,
  brick,
  el,
  fwd,
  pAttrs,
  pChildren,
  pClass,
  pPass,
  pReq,
  prop,
  slot,
} from "../_dsl";

export default brick({
  id: "ui.image",
  dir: "image",
  docs:
    "Image renders img, picture, and source. Alt is required; pass an empty\n" +
    "string for decorative images.",
  parts: [
    {
      name: "Image",
      docs: "Image renders an img element; alt is always emitted.",
      classes: {},
      props: [
        pClass(),
        pPass("Src"),
        pReq("Alt", "alternative text; empty string for decorative images"),
        pPass("SrcSet"),
        pPass("Sizes"),
        pPass("Width"),
        pPass("Height"),
        pPass("Loading"),
        pPass("Decoding"),
        pAttrs(),
      ],
      render: el(
        "img",
        [
          fwd("src", "Src"),
          attrExpr("alt", prop("Alt"), { keepEmpty: true }),
          attrClass(),
          fwd("srcset", "SrcSet"),
          fwd("sizes", "Sizes"),
          fwd("width", "Width"),
          fwd("height", "Height"),
          fwd("loading", "Loading"),
          fwd("decoding", "Decoding"),
          attrRest(),
        ],
        [],
        { void: true }
      ),
    },
    {
      name: "Picture",
      docs: "Picture wraps Source candidates and a fallback Image.",
      classes: {},
      props: [pClass(), pAttrs(), pChildren()],
      render: el("picture", [attrClass(), attrRest()], [slot()]),
    },
    {
      name: "Source",
      docs: "Source renders a source candidate inside picture.",
      props: [pPass("SrcSet"), pPass("Media"), pPass("Type"), pPass("Sizes"), pAttrs()],
      render: el(
        "source",
        [
          fwd("srcset", "SrcSet"),
          fwd("media", "Media"),
          fwd("type", "Type"),
          fwd("sizes", "Sizes"),
          attrRest(),
        ],
        [],
        { void: true }
      ),
    },
  ],
});
