// The Latte runtime has no emitter of its own: the Twig emitters print the same trees through the latte dialect, and the
// PHP helpers are the Twig runtime's (assets/php holds only the Latte extension that registers them).
export { latte, emitTwigBrick as emitLatteBrick, emitTwigOrganism as emitLatteOrganism } from "@ui8kit/xgen-runtime-twig";
/** the generated composer package and the latte/latte version it requires */
export const LATTE_PACKAGE = "ui8kit/latte-ui";
export const LATTE_VERSION = "^3.0";
