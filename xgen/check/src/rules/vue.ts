// Vue 3 SFC adapter of the `rules` group: @vue/compiler-sfc (the untransformed template AST) -> the common tree.
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";
import { choice, exprAttr, exprStrings, lineOf, staticAttr, type IrAttr, type IrFile, type IrNode } from "./ir";

// NodeTypes and ElementTypes of @vue/compiler-core
const ELEMENT = 1, TEXT = 2, INTERPOLATION = 5, ATTRIBUTE = 6, DIRECTIVE = 7;
const TAG_ELEMENT = 0, TAG_SLOT = 2, TAG_TEMPLATE = 3;
/** built-in components that render their children in place */
const BUILTIN = new Set(["Transition", "TransitionGroup", "KeepAlive", "Teleport", "Suspense", "transition", "transition-group", "keep-alive", "teleport", "suspense"]);

type VNode = { type: number; tag?: string; tagType?: number; content?: string | { content: string }; props?: VProp[]; children?: VNode[]; loc: { start: { line: number } } };
type VProp = { type: number; name: string; rawName?: string; arg?: { content: string }; exp?: { content: string }; value?: { content: string }; loc: { start: { line: number } } };

export function vueToIr(src: string): IrFile {
  const imports = new Map<string, string>();
  const { descriptor, errors } = parse(src, { filename: "x.vue", sourceMap: false });
  const script = [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join("\n");
  const sf = ts.createSourceFile("x.ts", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nodes: IrNode[] = [];
  for (const st of sf.statements) if (ts.isImportDeclaration(st) && st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
    const c = st.importClause;
    if (c.name) imports.set(c.name.text, st.moduleSpecifier.text);
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) for (const e of c.namedBindings.elements) imports.set(e.name.text, st.moduleSpecifier.text);
  }
  // h(tag, ...) in a render function: a variable tag is a dynamic tag
  const scriptLine = (descriptor.scriptSetup ?? descriptor.script)?.loc.start.line ?? 1;
  (function h(n: ts.Node): void {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "h" && n.arguments[0] && !ts.isStringLiteral(n.arguments[0]) && !(ts.isIdentifier(n.arguments[0]) && imports.has(n.arguments[0].text))) {
      nodes.push({ kind: "detached", line: 0, children: [{ kind: "dynamic", name: `h(${n.arguments[0].getText(sf)})`, line: scriptLine + lineOf(script, n.getStart(sf)) - 1, attrs: [], children: [] }] });
    }
    ts.forEachChild(n, h);
  })(sf);
  if (errors.length) return { runtime: "vue", nodes, imports, error: String((errors[0] as Error).message ?? errors[0]) };
  const tpl = descriptor.template?.ast as unknown as { children: VNode[] } | undefined;
  const attrs = (n: VNode): IrAttr[] => (n.props ?? []).flatMap((p): IrAttr[] => {
    const line = p.loc.start.line;
    if (p.type === ATTRIBUTE) return [staticAttr(p.name, line, p.value?.content)];
    if (p.type === DIRECTIVE && p.name === "bind" && p.arg) return [p.exp ? exprAttr(p.arg.content, line, p.exp.content) : { name: p.arg.content, line, static: false, strings: [] }];
    return [];
  });
  const dir = (n: VNode, name: string): VProp | undefined => (n.props ?? []).find((p) => p.type === DIRECTIVE && p.name === name);
  /** a list of siblings: a v-if / v-else-if / v-else chain becomes one choice, v-for a loop */
  function list(nodes: VNode[]): IrNode[] {
    const out: IrNode[] = [];
    let chain: IrNode[][] | undefined, at = 0;
    const close = (): void => { if (chain) { out.push(choice(at, chain.length === 1 ? [...chain, []] : chain)); chain = undefined; } };
    for (const n of nodes) {
      if (n.type === 3 || (n.type === TEXT && !String(n.content).trim())) continue; // comments and blank text do not break a chain
      const one = (): IrNode[] => (n.type === ELEMENT && dir(n, "for") ? [{ kind: "loop", line: n.loc.start.line, children: conv(n) }] : conv(n));
      if (n.type === ELEMENT && dir(n, "if")) { close(); chain = [one()]; at = n.loc.start.line; continue; }
      if (n.type === ELEMENT && chain && (dir(n, "else-if") || dir(n, "else"))) { chain.push(one()); if (dir(n, "else")) close(); continue; }
      close();
      out.push(...one());
    }
    close();
    return out;
  }
  function conv(n: VNode): IrNode[] {
    const line = n.loc.start.line;
    if (n.type === TEXT) return String(n.content).trim() ? [{ kind: "text", text: String(n.content), line }] : [];
    if (n.type === INTERPOLATION) return [{ kind: "expr", strings: exprStrings((n.content as { content: string }).content), line }];
    if (n.type !== ELEMENT) return [];
    const kids = list(n.children ?? []);
    const raw: IrNode[] = dir(n, "html") ? [{ kind: "raw-html", name: "v-html", line }] : [];
    if (n.tagType === TAG_TEMPLATE || n.tagType === TAG_SLOT || BUILTIN.has(n.tag!)) {
      const slotted = n.tagType === TAG_SLOT ? [{ kind: "render" as const, line }] : [];
      return [{ kind: "group", line, children: [...slotted, ...kids] }];
    }
    if (n.tag === "component" && (n.props ?? []).some((p) => p.name === "is" || p.arg?.content === "is")) return [{ kind: "dynamic", name: "component :is", line, attrs: attrs(n), children: [...raw, ...kids] }];
    if (n.tagType === TAG_ELEMENT) return [{ kind: "element", name: n.tag!, line, attrs: attrs(n), children: [...raw, ...kids] }];
    return [{ kind: "component", name: n.tag!, line, attrs: attrs(n), children: [...raw, ...kids] }];
  }
  return { runtime: "vue", nodes: [...list(tpl?.children ?? []), ...nodes], imports };
}
