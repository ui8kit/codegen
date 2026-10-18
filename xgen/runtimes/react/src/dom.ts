// DOM helpers of the React emitter: the attribute types of each tag, numeric attributes, React names of attributes, root elements.
import type { Expr } from "@ui8kit/xgen-spec";
import {
  type ElementNode,
  type Node,
  type TagSpec,
} from "@ui8kit/xgen-spec";
import { localIdent } from "@ui8kit/xgen-spec";
import { printTsExpr, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";

export const REACT_ATTR_TYPES: Record<string, [string, string]> = {
  a: ["AnchorHTMLAttributes", "HTMLAnchorElement"],
  button: ["ButtonHTMLAttributes", "HTMLButtonElement"],
  input: ["InputHTMLAttributes", "HTMLInputElement"],
  textarea: ["TextareaHTMLAttributes", "HTMLTextAreaElement"],
  select: ["SelectHTMLAttributes", "HTMLSelectElement"],
  option: ["OptionHTMLAttributes", "HTMLOptionElement"],
  optgroup: ["OptgroupHTMLAttributes", "HTMLOptGroupElement"],
  label: ["LabelHTMLAttributes", "HTMLLabelElement"],
  form: ["FormHTMLAttributes", "HTMLFormElement"],
  fieldset: ["FieldsetHTMLAttributes", "HTMLFieldSetElement"],
  legend: ["HTMLAttributes", "HTMLLegendElement"],
  img: ["ImgHTMLAttributes", "HTMLImageElement"],
  source: ["SourceHTMLAttributes", "HTMLSourceElement"],
  picture: ["HTMLAttributes", "HTMLElement"],
  dialog: ["DialogHTMLAttributes", "HTMLDialogElement"],
  details: ["DetailsHTMLAttributes", "HTMLDetailsElement"],
  summary: ["HTMLAttributes", "HTMLElement"],
  table: ["TableHTMLAttributes", "HTMLTableElement"],
  caption: ["HTMLAttributes", "HTMLTableCaptionElement"],
  thead: ["HTMLAttributes", "HTMLTableSectionElement"],
  tbody: ["HTMLAttributes", "HTMLTableSectionElement"],
  tfoot: ["HTMLAttributes", "HTMLTableSectionElement"],
  tr: ["HTMLAttributes", "HTMLTableRowElement"],
  th: ["ThHTMLAttributes", "HTMLTableCellElement"],
  td: ["TdHTMLAttributes", "HTMLTableCellElement"],
  colgroup: ["ColgroupHTMLAttributes", "HTMLTableColElement"],
  col: ["ColHTMLAttributes", "HTMLTableColElement"],
  meter: ["MeterHTMLAttributes", "HTMLMeterElement"],
  progress: ["ProgressHTMLAttributes", "HTMLProgressElement"],
  output: ["OutputHTMLAttributes", "HTMLOutputElement"],
  datalist: ["HTMLAttributes", "HTMLDataListElement"],
  hr: ["HTMLAttributes", "HTMLHRElement"],
  br: ["HTMLAttributes", "HTMLBRElement"],
  wbr: ["HTMLAttributes", "HTMLElement"],
  p: ["HTMLAttributes", "HTMLParagraphElement"],
  span: ["HTMLAttributes", "HTMLSpanElement"],
  div: ["HTMLAttributes", "HTMLDivElement"],
  li: ["LiHTMLAttributes", "HTMLLIElement"],
  ul: ["HTMLAttributes", "HTMLUListElement"],
  ol: ["OlHTMLAttributes", "HTMLOListElement"],
  nav: ["HTMLAttributes", "HTMLElement"],
  header: ["HTMLAttributes", "HTMLElement"],
  footer: ["HTMLAttributes", "HTMLElement"],
  article: ["HTMLAttributes", "HTMLElement"],
  figure: ["HTMLAttributes", "HTMLElement"],
  figcaption: ["HTMLAttributes", "HTMLElement"],
  blockquote: ["BlockquoteHTMLAttributes", "HTMLQuoteElement"],
  h1: ["HTMLAttributes", "HTMLHeadingElement"],
  h2: ["HTMLAttributes", "HTMLHeadingElement"],
  h3: ["HTMLAttributes", "HTMLHeadingElement"],
  h4: ["HTMLAttributes", "HTMLHeadingElement"],
  h5: ["HTMLAttributes", "HTMLHeadingElement"],
  h6: ["HTMLAttributes", "HTMLHeadingElement"],
};

/** DOM attributes that React types as numbers; printed as number expressions. */
export const NUMERIC_DOM_ATTRS = new Set(["colspan", "rowspan", "span", "rows", "cols"]);

/**
 * Rewrite a string-typed expression into its numeric counterpart when it is a
 * stringified integer (React numeric DOM props render identically).
 */
export function asNumberExpr(expr: Expr): Expr | undefined {
  switch (expr.kind) {
    case "intToString":
      return expr.expr;
    case "lit":
      if (typeof expr.value === "string" && /^\d+$/.test(expr.value)) {
        return { kind: "lit", value: Number(expr.value) };
      }
      return typeof expr.value === "number" ? expr : undefined;
    case "cond": {
      const thenExpr = asNumberExpr(expr.then);
      const elseExpr = asNumberExpr(expr.else);
      if (!thenExpr || !elseExpr) return undefined;
      return { ...expr, then: thenExpr, else: elseExpr };
    }
    default:
      return undefined;
  }
}

/** DOM attribute → React JSX prop name. */
export function reactAttrName(name: string): string {
  const special: Record<string, string> = {
    class: "className",
    for: "htmlFor",
    tabindex: "tabIndex",
    srcset: "srcSet",
    colspan: "colSpan",
    rowspan: "rowSpan",
    fetchpriority: "fetchPriority",
    autocomplete: "autoComplete",
    enctype: "encType",
    novalidate: "noValidate",
    datetime: "dateTime",
  };
  return special[name] ?? name;
}

export interface PartEmit {
  code: string;
  /** the top of the part (variant tables, record and variant value types), also inside code */
  headCode: string[];
  /** utils the head needs (variants, type VariantKey) */
  headUtils: string[];
  helperImports: Set<string>;
  usesResolveTag: boolean;
  usesTitleTag: boolean;
  usesCn: boolean;
  utilImports: Set<string>;
  reactTypeImports: Set<string>;
  usesSlot: boolean;
  usesElementType: boolean;
  usesRefCast: boolean;
  usesSvgProps: boolean;
  /** names this part imports from a sibling part of its brick: part name -> values and types */
  fromSibling: Map<string, { values: Set<string>; types: Set<string> }>;
}

export function rootElements(node: Node): ElementNode[] {
  switch (node.kind) {
    case "element":
      return [node];
    case "when":
      return [...node.then.flatMap(rootElements), ...(node.else ?? []).flatMap(rootElements)];
    default:
      return [];
  }
}

export function staticTagOf(tag: TagSpec): string | undefined {
  return tag.kind === "static" ? tag.tag : undefined;
}

