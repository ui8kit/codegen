// The Jinja2 runtime has no emitter of its own: the Twig emitters print the same trees through the jinja dialect.
export { jinja, emitTwigBrick as emitJinjaBrick, emitTwigOrganism as emitJinjaOrganism } from "@ui8kit/xgen-runtime-twig";
/** the generated Python package and the Jinja2 version it requires */
export const JINJA2_PACKAGE = "ui8kit-jinja2-ui";
export const JINJA2_REQUIREMENT = "Jinja2>=3.1,<4";
