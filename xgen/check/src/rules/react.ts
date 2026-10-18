// React (TSX) adapter of the `rules` group: the TypeScript parser -> the common tree.
// The rendered top level is the returned JSX of the first exported PascalCase function; every other JSX of the file is scanned as detached markup.
import ts from "typescript";
import { choice, lineOf, resultStringsOf, type IrAttr, type IrFile, type IrNode } from "./ir";

export function reactToIr(src: string): IrFile {
  return jsxToIr(src, "react");
}

/** the TSX adapter of React and Solid; Solid adds its control flow (Show, Switch/Match: choices; For, Index: loops; Dynamic: a dynamic tag) */
export function jsxToIr(src: string, runtime: "react" | "solid"): IrFile {
  const sf = ts.createSourceFile("x.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = (n: ts.Node): number => lineOf(src, n.getStart(sf));
  const imports = new Map<string, string>();
  /** names bound to a value that is not a component (const Tag = cond ? "a" : "span"): a JSX tag of that name is a dynamic tag */
  const valueVars = new Set<string>();
  for (const st of sf.statements) if (ts.isImportDeclaration(st) && st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
    const from = st.moduleSpecifier.text; const c = st.importClause;
    if (c.name) imports.set(c.name.text, from);
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) for (const e of c.namedBindings.elements) imports.set(e.name.text, from);
  }
  (function vars(n: ts.Node): void {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !ts.isArrowFunction(n.initializer) && !ts.isFunctionExpression(n.initializer)) {
      const i = n.initializer;
      const call = ts.isCallExpression(i) ? i.expression.getText(sf) : "";
      if (!/^(memo|forwardRef|lazy|React\.)/.test(call)) valueVars.add(n.name.text);
    }
    ts.forEachChild(n, vars);
  })(sf);
  const seen = new Set<ts.Node>();

  const attrs = (els: ts.JsxAttributes): IrAttr[] => els.properties.flatMap((p): IrAttr[] => {
    if (!ts.isJsxAttribute(p)) return [];
    const name = p.name.getText(sf);
    const i = p.initializer;
    if (!i) return [{ name, line: line(p), static: true, strings: [] }];
    if (ts.isStringLiteral(i)) return [{ name, line: line(p), static: true, value: i.text, strings: [i.text] }];
    if (ts.isJsxExpression(i) && i.expression) {
      const e = i.expression;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isNumericLiteral(e) || e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return [{ name, line: line(p), static: true, value: e.getText(sf), strings: resultStringsOf(e) }];
      return [{ name, line: line(p), static: false, strings: resultStringsOf(e) }];
    }
    return [{ name, line: line(p), static: false, strings: [] }];
  });
  const tagNode = (tag: ts.JsxTagNameExpression, at: ts.Node, a: ts.JsxAttributes, children: IrNode[]): IrNode => {
    const name = tag.getText(sf);
    const list = attrs(a);
    const raw: IrNode[] = list.some((x) => x.name === "dangerouslySetInnerHTML") ? [{ kind: "raw-html", name: "dangerouslySetInnerHTML", line: line(at) }] : [];
    const kids = [...raw, ...children];
    if (/^[a-z]/.test(name) && !name.includes(".")) return { kind: "element", name, line: line(at), attrs: list, children: kids };
    if (ts.isIdentifier(tag) && valueVars.has(name) && !imports.has(name)) return { kind: "dynamic", name, line: line(at), attrs: list, children: kids };
    return { kind: "component", name, line: line(at), attrs: list, children: kids };
  };
  /** JSX reachable from an expression without crossing into another JSX element; callbacks (map) stay in place */
  function fromExpr(e: ts.Node): IrNode[] {
    if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) return jsx(e);
    if (ts.isCallExpression(e) && /(^|\.)createElement$/.test(e.expression.getText(sf))) {
      seen.add(e);
      const a = e.arguments[0];
      const kids = e.arguments.slice(2).flatMap(fromExpr);
      if (a && ts.isStringLiteral(a)) return [{ kind: "element", name: a.text, line: line(e), attrs: [], children: kids }];
      if (a && ts.isIdentifier(a) && /^[A-Z]/.test(a.text) && !valueVars.has(a.text)) return [{ kind: "component", name: a.text, line: line(e), attrs: [], children: kids }];
      return [{ kind: "dynamic", name: a ? a.getText(sf) : "?", line: line(e), attrs: [], children: kids }];
    }
    // exclusive alternatives: a ? x : y, a && x, a || x, a ?? x
    const alt = (branches: IrNode[][]): IrNode[] => (branches.some((b) => b.length) ? [choice(line(e), branches)] : []);
    if (ts.isConditionalExpression(e)) return [...fromExpr(e.condition), ...alt([fromExpr(e.whenTrue), fromExpr(e.whenFalse)])];
    if (ts.isBinaryExpression(e)) {
      const k = e.operatorToken.kind;
      if (k === ts.SyntaxKind.AmpersandAmpersandToken) return [...fromExpr(e.left), ...alt([fromExpr(e.right), []])];
      if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) return alt([fromExpr(e.left), fromExpr(e.right)]);
    }
    // markup per item: xs.map(...), xs.flatMap(...), Array.from(xs, ...)
    if (ts.isCallExpression(e) && /(\.(map|flatMap)|^Array\.from)$/.test(e.expression.getText(sf))) {
      const inner = [...fromExpr(e.expression), ...e.arguments.flatMap(fromExpr)];
      return inner.length ? [{ kind: "loop", line: line(e), children: inner }] : [];
    }
    const out: IrNode[] = [];
    ts.forEachChild(e, (c) => { out.push(...fromExpr(c)); });
    return out;
  }
  function children(list: ts.NodeArray<ts.JsxChild>): IrNode[] {
    return list.flatMap((c): IrNode[] => {
      if (ts.isJsxText(c)) return c.text.trim() ? [{ kind: "text", text: c.text, line: line(c) }] : [];
      if (ts.isJsxExpression(c)) {
        if (!c.expression) return [];
        const strings = resultStringsOf(c.expression);
        const inner = fromExpr(c.expression);
        if ((ts.isIdentifier(c.expression) && c.expression.text === "children") || (runtime === "solid" && /^(local|props)\.children$/.test(c.expression.getText(sf)))) return [{ kind: "render", line: line(c) }];
        return [...(strings.length ? [{ kind: "expr" as const, strings, line: line(c) }] : []), ...(inner.length ? [{ kind: "group" as const, line: line(c), children: inner }] : [{ kind: "render" as const, line: line(c) }])];
      }
      return jsx(c);
    });
  }
  const fromSolid = (name: string): boolean => runtime === "solid" && imports.get(name)?.startsWith("solid-js") === true;
  /** the expression of a JSX attribute (`fallback={...}`, `when={...}`) */
  const attrExpr = (a: ts.JsxAttributes, name: string): ts.Expression | undefined => {
    for (const p of a.properties) if (ts.isJsxAttribute(p) && p.name.getText(sf) === name && p.initializer && ts.isJsxExpression(p.initializer)) return p.initializer.expression;
    return undefined;
  };
  /** a Solid control-flow element as the common tree, or undefined for any other tag */
  function solidFlow(n: ts.JsxElement | ts.JsxSelfClosingElement): IrNode[] | undefined {
    const open = ts.isJsxElement(n) ? n.openingElement : n;
    const name = open.tagName.getText(sf);
    if (!fromSolid(name)) return undefined;
    const kids = ts.isJsxElement(n) ? children(n.children) : [];
    const fb = attrExpr(open.attributes, "fallback");
    const fallback = fb ? fromExpr(fb) : [];
    if (name === "Show") return [...(attrExpr(open.attributes, "when") ? fromExpr(attrExpr(open.attributes, "when")!) : []), choice(line(n), [kids, fallback])];
    if (name === "Switch") {
      const matches = ts.isJsxElement(n) ? n.children.filter((c): c is ts.JsxElement | ts.JsxSelfClosingElement => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) : [];
      const branches = matches.map((m) => { seen.add(m); return ts.isJsxElement(m) ? children(m.children) : []; });
      return [choice(line(n), [...branches, fallback])];
    }
    if (name === "Match") return [choice(line(n), [kids, []])];
    if (name === "For" || name === "Index") return kids.length ? [{ kind: "loop", line: line(n), children: kids }] : [];
    if (name === "Dynamic") return [{ kind: "dynamic", name, line: line(n), attrs: attrs(open.attributes), children: kids }];
    return undefined;
  }
  function jsx(n: ts.Node): IrNode[] {
    seen.add(n);
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) { const flow = solidFlow(n); if (flow) return flow; }
    if (ts.isJsxFragment(n)) return [{ kind: "group", line: line(n), children: children(n.children) }];
    if (ts.isJsxSelfClosingElement(n)) return [tagNode(n.tagName, n, n.attributes, [])];
    if (ts.isJsxElement(n)) {
      const t = n.openingElement.tagName.getText(sf);
      if (t === "Fragment" || t === "React.Fragment") return [{ kind: "group", line: line(n), children: children(n.children) }];
      return [tagNode(n.openingElement.tagName, n, n.openingElement.attributes, children(n.children))];
    }
    return [];
  }
  // the root: the returned JSX of the first exported PascalCase function
  let rootNodes: IrNode[] = [];
  const isExported = (s: ts.Statement): boolean => !!ts.getModifiers(s as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  for (const st of sf.statements) {
    let body: ts.Node | undefined;
    if (ts.isFunctionDeclaration(st) && st.name && /^[A-Z]/.test(st.name.text) && isExported(st)) body = st.body;
    if (ts.isVariableStatement(st) && isExported(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) body = d.initializer.body;
    if (!body) continue;
    const ret: ts.Node[] = [];
    if (!ts.isBlock(body)) ret.push(body);
    else (function find(n: ts.Node): void { if (ts.isReturnStatement(n) && n.expression) ret.push(n.expression); if (ts.isFunctionLike(n)) return; ts.forEachChild(n, find); })(body);
    // several returns of the same component (early returns) are exclusive alternatives; the final return stays the root, as before
    if (ret.length === 1) { rootNodes = fromExpr(ret[0]!); break; }
    if (ret.length > 1) { const bs = [ret[ret.length - 1]!, ...ret.slice(0, -1)].map(fromExpr); rootNodes = bs.some((b) => b.length) ? [choice(line(ret[0]!), bs)] : []; break; }
  }
  // the rest of the JSX in the file
  const detached: IrNode[] = [];
  (function rest(n: ts.Node): void {
    if (seen.has(n)) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n) || (ts.isCallExpression(n) && /(^|\.)createElement$/.test(n.expression.getText(sf)))) { const x = fromExpr(n); if (x.length) detached.push({ kind: "detached", line: line(n), children: x }); return; }
    ts.forEachChild(n, rest);
  })(sf);
  return { runtime, nodes: [...rootNodes, ...detached], imports };
}
