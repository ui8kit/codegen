// Twig adapter of the `rules` group: a .html.twig file -> the common tree. It reads the tag grammar of Twig over the HTML:
// `{% if %}/{% elseif %}/{% else %}` are exclusive branches (choice), `{% for %}` is a loop, `{{ include('ui/x/part.html.twig',
// {p: {...}, children: c}) }}`, `{% include 'x' with {...} %}` and `{% embed 'x' with {...} %}...{% endembed %}` are components
// named after the template file (card-header -> CardHeader); a captured `{% set c %}...{% endset %}` is the children of the include
// that passes it as `children`, else detached markup (a slot fill handed to another component). `|raw` of children or of a slot
// prop renders unknown markup; `|raw` of anything else is raw HTML; `<{{ tag }}` is a dynamic tag. Props are the keys of `p`, and
// the pairs of `Attrs: ui_attrs([...])` are attributes.
import { basename } from "node:path";
import { choice, type IrAttr, type IrFile, type IrNode } from "./ir";

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const STR = /^'(?:[^'\\]|\\.)*'$|^"(?:[^"\\]|\\.)*"$/;
const LIT = /^('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|true|false|null|none|None|True|False|-?\d+(\.\d+)?)$/;
const unq = (s: string): string => s.slice(1, -1).replace(/\\(.)/g, "$1");
const pascal = (path: string): string => basename(path).replace(/\..*$/, "").split(/[-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

/** split at top-level separators (outside (), {}, [], strings) */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "", q = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) { cur += c; if (c === "\\") { cur += s[++i] ?? ""; continue; } if (c === q) q = ""; continue; }
    if (c === "'" || c === '"') { q = c; cur += c; continue; }
    if ("({[".includes(c)) depth++;
    if (")}]".includes(c)) depth--;
    if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ""; i += sep.length - 1; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
const strip = (e: string): string => { e = e.trim(); while (e.startsWith("(") && balanced(e, 0) === e.length - 1) e = e.slice(1, -1).trim(); return e; };
function balanced(s: string, i: number): number {
  const open = s[i]!, close = open === "(" ? ")" : open === "{" ? "}" : "]";
  let depth = 0, q = "";
  for (let k = i; k < s.length; k++) {
    const c = s[k]!;
    if (q) { if (c === "\\") { k++; continue; } if (c === q) q = ""; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return k;
  }
  return -1;
}

/** the string literals a Twig value can evaluate to: a literal, the branches of `?:` and `??`, the arguments of the text helpers */
function twigStrings(v: string): string[] {
  v = strip(v);
  if (STR.test(v)) return [unq(v)];
  const tern = splitTop(v, "?");
  if (tern.length === 2) { const ab = splitTop(tern[1]!, ":"); return ab.flatMap(twigStrings); }
  const ifElse = /^(.*?)\s+if\s+(.*?)\s+else\s+(.*)$/s.exec(v);
  if (ifElse && splitTop(v, " if ").length === 2) return [...twigStrings(ifElse[1]!), ...twigStrings(ifElse[3]!)];
  const co = splitTop(v, "??");
  if (co.length > 1) return co.flatMap(twigStrings);
  const m = /^ui_(text|s|str|def|coalesce|or)\((.*)\)$/s.exec(v);
  if (!m) return [];
  return splitTop(m[2]!.replace(/^\[(.*)\]$/s, "$1"), ",").flatMap(twigStrings);
}

/** the entries of a hash literal {'k': v, k: v} */
function hashEntries(code: string): Array<[string, string]> {
  const s = strip(code);
  // Latte (PHP) arrays: ['k' => v], named arguments k: v
  if (!s.startsWith("{") && !s.startsWith("[")) return [];
  return splitTop(s.slice(1, -1), ",").flatMap((e): Array<[string, string]> => {
    const arrow = splitTop(e, "=>");
    const kv = arrow.length > 1 ? arrow : splitTop(e, ":");
    if (kv.length < 2) return [];
    const k = kv[0]!.trim();
    return [[STR.test(k) ? unq(k) : k, e.slice(e.indexOf(kv[1]!))]];
  });
}

const attr = (name: string, line: number, value: string): IrAttr => ({ name, line, static: LIT.test(strip(value)), value: STR.test(strip(value)) ? unq(strip(value)) : undefined, strings: twigStrings(value) });

/** the props of an include: the keys of `p` (or of the vars when there is no `p`), plus the pairs of ui_attrs */
function propsOf(vars: string, line: number): { attrs: IrAttr[]; children?: string } {
  const top = hashEntries(vars);
  const p = top.find(([k]) => k === "p");
  const children = top.find(([k]) => k === "children")?.[1].trim();
  const fields = p ? hashEntries(p[1]) : top.filter(([k]) => k !== "children");
  const attrs = fields.flatMap(([name, value]): IrAttr[] => {
    const m = /^ui_attrs\(\[(.*)\]\)$/s.exec(strip(value));
    if (!m) return [attr(name, line, value)];
    const a = splitTop(m[1]!, ",");
    const out: IrAttr[] = [];
    for (let k = 0; k + 1 < a.length; k += 2) if (STR.test(a[k]!)) out.push(attr(unq(a[k]!), line, a[k + 1]!));
    return out;
  });
  return { attrs, children };
}

/** the position of the close (`}}`, `%}`) of a Twig tag opened at i, outside strings and brackets */
function closeOf(s: string, i: number, close: string): number {
  let depth = 0, q = "";
  for (let k = i + 2; k < s.length; k++) {
    const c = s[k]!;
    if (q) { if (c === "\\") { k++; continue; } if (c === q) q = ""; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (depth === 0 && s.startsWith(close, k)) return k;
    if ("({[".includes(c)) depth++;
    else if (")}]".includes(c)) depth--;
  }
  return s.length;
}

type Frame = { kind: "root" | "element" | "loop" | "branch" | "capture" | "embed" | "block" | "detached"; list: IrNode[]; node?: IrNode; tag?: string; choice?: IrNode & { kind: "choice" }; name?: string };

export const twigToIr = (src: string, file = ""): IrFile => templateToIr(src, file, "twig");
/** Jinja2 reads the same: `elif`, `|safe`, `ui_include(...)`, `p['x']`, `x if c else y`; `{% call m(...) %}` and a macro imported with `{% from %}` are components */
export const jinjaToIr = (src: string, file = ""): IrFile => templateToIr(src, file, "jinja2");

export function templateToIr(src: string, _file: string, runtime: "twig" | "jinja2" | "latte"): IrFile {
  const macros = new Map<string, string>();
  const imports = new Map<string, string>();
  let error: string | undefined;
  const lineAt = (pos: number): number => src.slice(0, pos).split("\n").length;
  const captures = new Map<string, IrNode[]>();
  const used = new Set<string>();
  const root: Frame = { kind: "root", list: [] };
  const stack: Frame[] = [root];
  const top = (): Frame => stack[stack.length - 1]!;
  const push = (n: IrNode): void => { top().list.push(n); };
  const component = (path: string, vars: string, line: number): IrNode => {
    const name = pascal(path);
    imports.set(name, path);
    const { attrs, children } = propsOf(vars, line);
    const node: IrNode = { kind: "component", name, line, attrs, children: [] };
    const cap = children?.replace(/^\$/, "");
    if (cap && /^\w+$/.test(cap) && cap !== "children") { used.add(cap); node.children.push(...(captures.get(cap) ?? [{ kind: "render", line }])); }
    else if (children) node.children.push({ kind: "render", line });
    return node;
  };
  /** an output tag {{ ... }} at a position */
  const output = (code: string, line: number): void => {
    const e0 = code.trim().replace(/\|\s*nocheck$/, "");
    // Latte prints an included template's markup with |noescape
    const e = /^(?:ui_)?include\(/.test(e0) ? e0.replace(/\|\s*noescape$/, "") : e0;
    const inc = /^(?:ui_)?include\(\s*('[^']*'|"[^"]*")\s*(?:,\s*([\s\S]*?))?(?:,\s*with_context\s*=\s*\w+)?\s*\)$/.exec(e);
    if (inc) { push(component(unq(inc[1]!), inc[2] ?? "{}", line)); return; }
    if (/^(ui_)?include\(/.test(e)) { push({ kind: "render", line }); return; }
    const mac = /^(\w+)\(([\s\S]*)\)$/.exec(e);
    if (mac && macros.has(mac[1]!)) { push(component(macros.get(mac[1]!)!, splitTop(mac[2]!, ",")[0] ?? "{}", line)); return; }
    const raw = /^([\s\S]*)\|\s*(raw|safe|noescape)$/.exec(e);
    if (raw) {
      const x = strip(raw[1]!);
      const def = /^ui_def\(([\s\S]*)\)$/.exec(x);
      const operand = strip(def ? splitTop(def[1]!, ",")[0]! : splitTop(x, "??")[0] ?? x).replace(/^\$/, "");
      if (/^(children|p\.\w+|p\['\w+'\])$/.test(operand)) push({ kind: "render", line });
      else if (/^\w+$/.test(operand) && captures.has(operand)) { used.add(operand); push(...[{ kind: "group" as const, line, children: captures.get(operand)! }]); }
      else push({ kind: "raw-html", name: "|raw", line });
      return;
    }
    if (/^ui_lucide\(/.test(e)) { push({ kind: "raw-html", name: "ui_lucide", line }); return; }
    push({ kind: "expr", strings: twigStrings(e), line });
  };
  const statement = (code: string, line: number, at: number): void => {
    const [kw = "", ...rest] = code.trim().split(/\s+/);
    const arg = code.trim().slice(kw.length).trim();
    switch (kw) {
      case "if": { const c = choice(line, [[]]) as IrNode & { kind: "choice" }; push(c); stack.push({ kind: "branch", list: c.branches[0]!, choice: c }); return; }
      case "elseif": case "elif": case "else": {
        const f = stack.pop();
        if (f?.kind !== "branch") throw new Error(`{% ${kw} %} outside if at line ${line}`);
        const list: IrNode[] = [];
        f.choice!.branches.push(list);
        stack.push({ kind: "branch", list, choice: f.choice });
        return;
      }
      case "endif": {
        const f = stack.pop();
        if (f?.kind !== "branch") throw new Error(`{% endif %} without if at line ${line}`);
        const c = f.choice!;
        if (c.branches.length === 1) c.branches.push([]);
        c.children.splice(0, c.children.length, ...c.branches.flat());
        return;
      }
      case "for": { const n: IrNode = { kind: "loop", line, children: [] }; push(n); stack.push({ kind: "loop", list: n.children, node: n }); return; }
      case "endfor": if (stack.pop()?.kind !== "loop") throw new Error(`{% endfor %} without for at line ${line}`); return;
      case "set": {
        if (arg.includes("=")) return; // a value
        const list: IrNode[] = [];
        captures.set(arg, list);
        stack.push({ kind: "capture", list, name: arg });
        return;
      }
      case "endset": if (stack.pop()?.kind !== "capture") throw new Error(`{% endset %} without set at line ${line}`); return;
      case "include": {
        const m = /^('[^']*'|"[^"]*")(?:\s+with\s+([\s\S]*?))?(?:\s+only)?$/.exec(arg);
        if (!m) { push({ kind: "render", line }); return; }
        push(component(unq(m[1]!), m[2] ?? "{}", line));
        return;
      }
      case "embed": {
        const m = /^('[^']*'|"[^"]*")(?:\s+with\s+([\s\S]*?))?(?:\s+only)?$/.exec(arg);
        const n = m ? component(unq(m[1]!), m[2] ?? "{}", line) : ({ kind: "dynamic", name: "embed", line, attrs: [], children: [] } as IrNode);
        push(n);
        stack.push({ kind: "embed", list: (n as { children: IrNode[] }).children, node: n });
        return;
      }
      case "call": {
        const m = /^(?:\([^)]*\)\s*)?(\w+)\(([\s\S]*)\)$/.exec(arg);
        const n: IrNode = m ? component(macros.get(m[1]!) ?? m[1]!, splitTop(m[2]!, ",")[0] ?? "{}", line) : { kind: "render", line };
        push(n);
        stack.push({ kind: "embed", list: "children" in n ? n.children : [], node: n });
        return;
      }
      case "endcall": if (stack.pop()?.kind !== "embed") throw new Error(`{% endcall %} without call at line ${line}`); return;
      case "from": {
        const m = /^('[^']*'|"[^"]*")\s+import\s+(.*)$/.exec(arg);
        if (m) for (const name of m[2]!.split(",").map((x) => x.trim().split(/\s+as\s+/).pop()!)) macros.set(name, unq(m[1]!));
        return;
      }
      case "endembed": if (stack.pop()?.kind !== "embed") throw new Error(`{% endembed %} without embed at line ${line}`); return;
      case "block": stack.push({ kind: "block", list: top().list }); return;
      case "endblock": stack.pop(); return;
      case "macro": { const n: IrNode = { kind: "detached", line, children: [] }; push(n); stack.push({ kind: "detached", list: n.children }); return; }
      case "endmacro": stack.pop(); return;
      case "apply": case "endapply": case "do": case "extends": case "import": case "use": case "with": case "endwith": return;
    }
    void at;
  };

  try {
    const s = src;
    let i = 0;
    while (i < s.length) {
      const line = lineAt(i);
      if (s.startsWith("{#", i)) { const e = s.indexOf("#}", i); i = e < 0 ? s.length : e + 2; continue; }
      if (s.startsWith("{%", i)) { const e = closeOf(s, i, "%}"); statement(s.slice(i + 2, e).replace(/^-|-$/g, ""), line, i); i = e + 2; continue; }
      if (s.startsWith("{{", i)) { const e = closeOf(s, i, "}}"); output(s.slice(i + 2, e).replace(/^-|-$/g, ""), line); i = e + 2; continue; }
      if (s.startsWith("<!", i)) { i = s.indexOf(">", i) + 1; continue; }
      if (s.startsWith("</", i)) {
        const e = s.indexOf(">", i);
        const f = stack.pop();
        if (f?.kind !== "element") throw new Error(`${s.slice(i, e + 1)} does not close an open element at line ${line}`);
        i = e + 1; continue;
      }
      if (s[i] === "<" && /[a-zA-Z{]/.test(s[i + 1] ?? "")) {
        // the open tag up to its `>` outside Twig tags and quotes
        let k = i + 1, q = "";
        for (; k < s.length; k++) {
          if (s.startsWith("{{", k)) { k = closeOf(s, k, "}}") + 1; continue; }
          if (s.startsWith("{%", k)) { k = closeOf(s, k, "%}") + 1; continue; }
          const c = s[k]!;
          if (q) { if (c === q) q = ""; continue; }
          if (c === '"' || c === "'") { q = c; continue; }
          if (c === ">") break;
        }
        const open = s.slice(i + 1, k).replace(/\{%-?[\s\S]*?-?%\}/g, " ");
        const dyn = /^\{\{([\s\S]*?)\}\}/.exec(open);
        const tag = dyn ? dyn[1]!.trim() : /^[\w-]+/.exec(open)![0];
        const body = open.slice(dyn ? dyn[0].length : tag.length);
        const attrs: IrAttr[] = [];
        for (const m of body.matchAll(/([\w:@.-]+)(?:="([^"]*)"|='([^']*)')?|\{\{[\s\S]*?\}\}/g)) {
          if (!m[1]) continue;
          const v = m[2] ?? m[3];
          if (v === undefined) attrs.push({ name: m[1], line, static: true, strings: [] });
          else if (!v.includes("{{")) attrs.push({ name: m[1], line, static: true, value: v, strings: [v] });
          else { const x = /^\{\{([\s\S]*)\}\}$/.exec(v.trim()); attrs.push(x ? attr(m[1], line, x[1]!) : { name: m[1], line, static: false, strings: [] }); }
        }
        const self = s[k - 1] === "/";
        // Latte n: attributes: n:tag renames the element at render (a dynamic tag); n:if and n:foreach wrap the element in a
        // choice or a loop, n:inner-foreach repeats its content; the others (n:class, n:attr, ...) are not host attributes
        const n = Object.fromEntries(attrs.filter((a) => a.name.startsWith("n:")).map((a) => [a.name, a.value ?? ""]));
        const host = attrs.filter((a) => !a.name.startsWith("n:"));
        const node = { kind: (dyn || "n:tag" in n ? "dynamic" : "element") as "element", name: "n:tag" in n ? n["n:tag"]! : tag, line, attrs: host, children: [] as IrNode[] };
        let outer: IrNode = node;
        if ("n:foreach" in n) outer = { kind: "loop", line, children: [outer] };
        if ("n:if" in n || "n:ifcontent" in n) outer = choice(line, [[outer], []]);
        push(outer);
        let inner = node.children;
        if ("n:inner-foreach" in n) { const l: IrNode = { kind: "loop", line, children: [] }; node.children.push(l); inner = l.children; }
        if (!self && !VOID.has(tag)) stack.push({ kind: "element", list: inner, node, tag });
        i = k + 1; continue;
      }
      let e = i;
      while (e < s.length && s[e] !== "<" && !s.startsWith("{{", e) && !s.startsWith("{%", e) && !s.startsWith("{#", e)) e++;
      if (e === i) e++;
      const text = s.slice(i, e);
      if (text.trim()) push({ kind: "text", text, line });
      i = e;
    }
    if (stack.length !== 1) throw new Error(`${stack.length - 1} unclosed block(s) at the end`);
  } catch (e) { error = (e as Error).message; }
  // captured markup is rendered where it is passed as children; a capture passed anywhere else (a slot fill) is detached
  const nodes = root.list;
  for (const [name, list] of captures) if (!used.has(name) && list.length) nodes.push({ kind: "detached", line: list[0]!.line, children: list });
  return { runtime, nodes, imports, ...(error ? { error } : {}) };
}
