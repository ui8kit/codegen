/**
 * DOM normalization for cross-runtime parity assertions. Renders differ in
 * incidental ways (attribute order, self-closing syntax, framework SSR
 * comment markers); the *contract* is the normalized node tree.
 */

import { parseFragment } from "parse5";
import { twMerge } from "tailwind-merge";

type P5Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: P5Node[];
};

export interface NormalizedNode {
  tag: string;
  attrs: Record<string, string>;
  children: (NormalizedNode | string)[];
}

function normalizeClass(value: string): string {
  // Class parity is the *effective* utility set: Go's Cn concatenates while
  // cn() tailwind-merges, so conflicts are resolved (last wins — the same
  // outcome Tailwind's own CSS ordering produces) before the set comparison.
  return [...new Set(twMerge(value).trim().split(/\s+/).filter(Boolean))].sort().join(" ");
}

function normalizeNode(node: P5Node): NormalizedNode | string | null {
  if (node.nodeName === "#text") {
    const text = (node.value ?? "").trim();
    return text === "" ? null : text;
  }
  if (node.nodeName === "#comment") return null; // framework SSR markers
  if (!node.tagName) return null;

  const attrs: Record<string, string> = {};
  for (const attr of node.attrs ?? []) {
    // Svelte SSR adds event-replay shims on media elements; not part of the
    // DOM contract.
    if ((attr.name === "onload" || attr.name === "onerror") && attr.value === "this.__e=event") {
      continue;
    }
    if (attr.name === "class") {
      const cls = normalizeClass(attr.value);
      // `class=""` is inert; runtimes differ on emitting vs omitting it.
      if (cls !== "") attrs["class"] = cls;
      continue;
    }
    // Solid SSR (`Dynamic` / hydratable markers) — not part of the DOM contract.
    if (attr.name === "data-hk") continue;
    attrs[attr.name] = attr.value;
  }
  const children = mergeText(
    (node.childNodes ?? [])
      .map(normalizeNode)
      .filter((c): c is NormalizedNode | string => c !== null)
  );
  return { tag: node.tagName, attrs, children };
}

/** SSR comment markers split text nodes; adjacent text is one logical node. */
function mergeText(children: (NormalizedNode | string)[]): (NormalizedNode | string)[] {
  const out: (NormalizedNode | string)[] = [];
  for (const child of children) {
    const last = out[out.length - 1];
    if (typeof child === "string" && typeof last === "string") {
      out[out.length - 1] = last + child;
    } else {
      out.push(child);
    }
  }
  return out;
}

export function normalizeHtml(html: string): (NormalizedNode | string)[] {
  const fragment = parseFragment(html) as unknown as { childNodes: P5Node[] };
  return mergeText(
    fragment.childNodes
      .map(normalizeNode)
      .filter((c): c is NormalizedNode | string => c !== null)
  );
}
