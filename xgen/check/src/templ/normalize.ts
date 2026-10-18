// DOM normalisation for the templ parity: the node tree with attributes by name, class tokens sorted and merged, text trimmed.
// Runtimes differ in incidental ways (attribute order, self-closing syntax, `class=""`, SSR comments); the contract is the tree.
import { parseFragment } from "parse5";

type P5 = { nodeName: string; tagName?: string; value?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: P5[]; content?: P5 };

function node(n: P5): string | null {
  if (n.nodeName === "#text") { const t = (n.value ?? "").replace(/\s+/g, " ").trim(); return t || null; }
  if (!n.tagName) return null;
  const attrs = (n.attrs ?? [])
    .map((a) => (a.name === "class" ? { name: a.name, value: a.value.split(/\s+/).filter(Boolean).sort().join(" ") } : a))
    .filter((a) => !(a.name === "class" && a.value === ""))
    // an empty text-field value is the same as none (React writes value="" for a controlled empty field; Go strings cannot tell them apart)
    .filter((a) => !(a.name === "value" && a.value === "" && n.tagName === "input"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ` ${a.name}="${a.value}"`)
    .join("");
  const kids = (n.content ?? n).childNodes?.map(node).filter((x): x is string => x !== null) ?? [];
  return `<${n.tagName}${attrs}>${kids.join("")}</${n.tagName}>`;
}

export function normalizeHtml(html: string): string {
  return (parseFragment(html) as unknown as P5).childNodes!.map(node).filter(Boolean).join("");
}
