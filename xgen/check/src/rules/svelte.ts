// Svelte 5 adapter of the `rules` group: svelte/compiler (modern AST) -> the common tree.
import { parse } from "svelte/compiler";
import { choice, exprAttr, lineOf, staticAttr, type IrAttr, type IrFile, type IrNode } from "./ir";

type AnyNode = { type: string; start: number; end: number; name?: string; data?: string; [k: string]: unknown };
type Frag = { nodes: AnyNode[] } | null | undefined;

/** special elements that do not choose a host tag and render nothing in place */
const SKIP = new Set(["SvelteWindow", "SvelteDocument", "SvelteBody", "SvelteHead", "SvelteOptions", "Comment", "ConstTag", "DebugTag", "AttachTag"]);

export function svelteToIr(src: string): IrFile {
  const imports = new Map<string, string>();
  for (const m of src.matchAll(/import\s+([A-Z]\w*)\s+from\s+["']([^"']+)["']/g)) imports.set(m[1]!, m[2]!);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) for (const n of m[1]!.split(",")) {
    const name = n.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop()!.trim();
    if (/^[A-Z]/.test(name)) imports.set(name, m[2]!);
  }
  let ast: { fragment: { nodes: AnyNode[] } };
  try { ast = parse(src, { modern: true }) as unknown as typeof ast; } catch (e) { return { runtime: "svelte", nodes: [], imports, error: (e as Error).message.split("\n")[0] }; }
  const line = (n: { start: number }): number => lineOf(src, n.start);
  const code = (n: AnyNode): string => src.slice(n.start, n.end);

  const attrs = (n: AnyNode): IrAttr[] => ((n.attributes as AnyNode[] | undefined) ?? []).flatMap((a): IrAttr[] => {
    if (a.type !== "Attribute") return [];
    const v = a.value as true | AnyNode | AnyNode[];
    if (v === true) return [staticAttr(a.name!, line(a))];
    const parts = Array.isArray(v) ? v : [v];
    if (parts.every((p) => p.type === "Text")) return [staticAttr(a.name!, line(a), parts.map((p) => p.data).join(""))];
    if (parts.length === 1) return [exprAttr(a.name!, line(a), code(parts[0]!.expression as AnyNode))];
    const strings = parts.flatMap((p) => (p.type === "Text" ? [String(p.data)] : exprAttr("", 0, code(p.expression as AnyNode)).strings));
    return [{ name: a.name!, line: line(a), static: false, strings }];
  });
  const frag = (f: Frag): IrNode[] => (f?.nodes ?? []).flatMap(conv);
  function conv(n: AnyNode): IrNode[] {
    if (SKIP.has(n.type)) return [];
    switch (n.type) {
      case "Text": return n.data!.trim() ? [{ kind: "text", text: n.data!, line: line(n) }] : [];
      case "ExpressionTag": return [{ kind: "expr", strings: exprAttr("", 0, code(n.expression as AnyNode)).strings, line: line(n) }];
      case "HtmlTag": return [{ kind: "raw-html", name: "{@html}", line: line(n) }];
      case "RenderTag": return [{ kind: "render", line: line(n) }];
      case "RegularElement": return [{ kind: "element", name: n.name!, line: line(n), attrs: attrs(n), children: frag(n.fragment as Frag) }];
      case "Component": case "SvelteSelf": return [{ kind: "component", name: n.name!, line: line(n), attrs: attrs(n), children: frag(n.fragment as Frag) }];
      case "SvelteElement": case "SvelteComponent": return [{ kind: "dynamic", name: n.name!, line: line(n), attrs: attrs(n), children: frag(n.fragment as Frag) }];
      case "SnippetBlock": return [{ kind: "detached", line: line(n), children: frag(n.body as Frag) }];
      case "IfBlock": return [choice(line(n), [frag(n.consequent as Frag), frag(n.alternate as Frag)])];
      case "EachBlock": return [choice(line(n), [[{ kind: "loop", line: line(n), children: frag(n.body as Frag) }], frag(n.fallback as Frag)])];
      case "AwaitBlock": return [choice(line(n), [frag(n.pending as Frag), frag(n.then as Frag), frag(n.catch as Frag)])];
      default: return [{ kind: "group", line: line(n), children: frag(n.fragment as Frag) }];
    }
  }
  return { runtime: "svelte", nodes: frag(ast.fragment), imports };
}
