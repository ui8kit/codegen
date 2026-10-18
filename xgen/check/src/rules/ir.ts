// The common tree of the `rules` group: every runtime adapter (svelte.ts, react.ts, vue.ts, templ.ts, solid.ts, twig.ts: twig, jinja2 and latte) turns one composition file into it,
// and the detectors (detectors.ts) read only this tree, never a runtime AST.
import ts from "typescript";

export type Runtime = "svelte" | "react" | "vue" | "templ" | "solid" | "twig" | "jinja2" | "latte";

/** an attribute or a prop: static (a literal string or a bare flag) or an expression with the string literals it can evaluate to */
export interface IrAttr { name: string; line: number; static: boolean; value?: string; strings: string[] }

export type IrNode =
  /** a lowercase host element: <div>, <svg> */
  | { kind: "element"; name: string; line: number; attrs: IrAttr[]; children: IrNode[] }
  /** a component: <Block>, <Text> */
  | { kind: "component"; name: string; line: number; attrs: IrAttr[]; children: IrNode[] }
  /** a host tag chosen from a value: svelte:element, <component :is>, <Tag/> of a variable, createElement(tag) */
  | { kind: "dynamic"; name: string; line: number; attrs: IrAttr[]; children: IrNode[] }
  /** raw HTML injection: {@html}, v-html, dangerouslySetInnerHTML */
  | { kind: "raw-html"; name: string; line: number }
  /** a text node */
  | { kind: "text"; text: string; line: number }
  /** a template expression with the string literals it can render */
  | { kind: "expr"; strings: string[]; line: number }
  /** control flow, fragments, slots: transparent for the root, its children are rendered in place */
  | { kind: "group"; line: number; children: IrNode[] }
  /** mutually exclusive branches ({#if}/{:else}, a ternary or `&&`, early returns, v-if/v-else): `branches` holds each branch,
   *  `children` all of them in source order (so a walk still sees every node); an absent branch is an empty list */
  | { kind: "choice"; line: number; children: IrNode[]; branches: IrNode[][] }
  /** markup repeated per item ({#each}, .map, v-for) */
  | { kind: "loop"; line: number; children: IrNode[] }
  /** content rendered from a slot or a snippet: unknown markup, ends the search for a root */
  | { kind: "render"; line: number }
  /** markup that is declared but not rendered at its place (a snippet body, a render function): scanned, never a root */
  | { kind: "detached"; line: number; children: IrNode[] };

export interface IrFile {
  runtime: Runtime;
  /** the rendered top level of the file, in order */
  nodes: IrNode[];
  /** local component name -> import specifier */
  imports: Map<string, string>;
  /** parse error, when the adapter could not read the file */
  error?: string;
}

/** line of an offset in a source (line starts are computed once per source) */
let lastSrc = "", starts: number[] = [];
export function lineOf(src: string, pos: number): number {
  if (src !== lastSrc) { lastSrc = src; starts = [0]; for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1); }
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= pos) lo = mid; else hi = mid - 1; }
  return lo + 1;
}

/** the string literals an expression can evaluate to (results only: not call arguments, not comparison operands, not keys) */
export function resultStringsOf(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [[node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ")];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) return resultStringsOf(node.expression);
  if (ts.isConditionalExpression(node)) return [...resultStringsOf(node.whenTrue), ...resultStringsOf(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const k = node.operatorToken.kind;
    if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) return [...resultStringsOf(node.left), ...resultStringsOf(node.right)];
    if (k === ts.SyntaxKind.AmpersandAmpersandToken) return resultStringsOf(node.right);
    if (k === ts.SyntaxKind.PlusToken) return [...resultStringsOf(node.left), ...resultStringsOf(node.right)];
  }
  return [];
}

/** parse one expression of a template (Svelte or Vue) and return its result strings */
export function exprStrings(code: string): string[] {
  if (!/["'`]/.test(code)) return [];
  const sf = ts.createSourceFile("x.ts", `(${code});`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const st = sf.statements[0];
  return st && ts.isExpressionStatement(st) ? resultStringsOf(st.expression) : [];
}

/** a static attribute value */
export const staticAttr = (name: string, line: number, value?: string): IrAttr => ({ name, line, static: true, value, strings: value === undefined ? [] : [value] });
/** an expression attribute value */
export const exprAttr = (name: string, line: number, code: string): IrAttr => ({ name, line, static: LITERAL.test(code.trim()), strings: exprStrings(code) });
/** an expression that is a constant: {false}, {"true"}, {2} */
const LITERAL = /^(true|false|null|-?\d+(\.\d+)?|"[^"]*"|'[^']*'|`[^`$]*`)$/;

/** exclusive branches as one node */
export const choice = (line: number, branches: IrNode[][]): IrNode => ({ kind: "choice", line, branches, children: branches.flat() });
