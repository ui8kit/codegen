/**
 * Naming conventions per runtime family — decided once, applied to every
 * brick. Canonical prop names are PascalCase (`Class`, `AriaLabel`, `For`).
 *
 * - React:  camelCase DOM-ish (`variant`, `className`, `htmlFor`); literal
 *           `aria-*` keys stay hyphenated.
 * - Svelte/Vue/Web Components: HTML-native attribute names (`class`, `for`,
 *           `aria-label`).
 */

import type { PropDef } from "./model";

const REACT_SPECIAL: Record<string, string> = {
  Class: "className",
  HTMLFor: "htmlFor",
  For: "htmlFor",
  ID: "id",
  TabIndex: "tabIndex",
  NoValidate: "noValidate",
  ColSpan: "colSpan",
  RowSpan: "rowSpan",
  SrcSet: "srcSet",
  FetchPriority: "fetchPriority",
  Autocomplete: "autoComplete",
  Enctype: "encType",
  DataUI8Kit: "dataUi8kit",
  AsChild: "asChild",
};

const HTML_SPECIAL: Record<string, string> = {
  Class: "class",
  HTMLFor: "for",
  For: "for",
  ID: "id",
  TabIndex: "tabindex",
  NoValidate: "novalidate",
  ColSpan: "colspan",
  RowSpan: "rowspan",
  SrcSet: "srcset",
  FetchPriority: "fetchpriority",
  Autocomplete: "autocomplete",
  Enctype: "enctype",
  DataUI8Kit: "data-ui8kit",
};

function hyphenateAria(name: string): string | undefined {
  if (name.startsWith("Aria")) {
    return "aria-" + name.slice(4).toLowerCase();
  }
  return undefined;
}

export function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** React prop name for a canonical prop. */
export function reactPropName(p: PropDef): string {
  const special = REACT_SPECIAL[p.name];
  if (special) return special;
  const aria = hyphenateAria(p.name);
  if (aria) return aria;
  return camelCase(p.name);
}

/** Svelte/Vue prop name (HTML-native attribute casing). */
export function htmlPropName(p: PropDef): string {
  const special = HTML_SPECIAL[p.name];
  if (special) return special;
  const aria = hyphenateAria(p.name);
  if (aria) return aria;
  return camelCase(p.name);
}

/**
 * Safe local identifier for a prop inside generated TS/Svelte/Vue code
 * (hyphenated and reserved names need a destructure rename).
 */
export function localIdent(name: string): string {
  const aria = hyphenateAria(name);
  if (aria) return camelCase(name); // AriaLabel -> ariaLabel
  const special: Record<string, string> = {
    Class: "className",
    HTMLFor: "htmlFor",
    For: "htmlFor",
    DataUI8Kit: "dataUi8kit",
  };
  if (special[name]) return special[name];
  return camelCase(name);
}

const RESERVED_JS = new Set(["for", "class", "var", "new", "return", "default", "switch", "case"]);

export function needsRename(runtimeName: string, local: string): boolean {
  return runtimeName !== local || RESERVED_JS.has(runtimeName) || runtimeName.includes("-");
}
