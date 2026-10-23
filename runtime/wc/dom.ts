// Vanilla light-DOM runtime for the generated custom elements.
// No shadow DOM: rendered nodes live in the document so consumer token
// classes apply. Mirrors the canonical attribute semantics.

export type Child = Node | string | number | null | undefined | false;
export type Children = Child | Child[];

export type PropKind = "string" | "bool" | "int" | "items";

/** Declared (non-rest) prop metadata: html name → kind. */
export type PropMeta = Record<string, PropKind>;

export function append(parent: Node, children: Children): void {
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
}

export function setAttr(el: Element, name: string, value: string): void {
  el.setAttribute(name, value);
}

/** Rest props (everything undeclared): attributes, or listeners for on* functions. */
export function applyRest(el: Element, rest: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(rest)) {
    if (typeof v === "function" && k.startsWith("on")) {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      continue;
    }
    if (v === false || v === null || v === undefined) continue;
    el.setAttribute(k, v === true ? "" : String(v));
  }
}

/** Read declared props + rest attributes from a custom element host. */
export function readHost(host: Element, meta: PropMeta): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of Array.from(host.attributes)) {
    const kind = meta[attr.name];
    if (kind === "bool") props[attr.name] = attr.value !== "false";
    else if (kind === "int") props[attr.name] = Number(attr.value);
    else if (kind === "items") props[attr.name] = JSON.parse(attr.value || "[]");
    else props[attr.name] = attr.value;
  }
  return props;
}

export type Renderer = (props: Record<string, unknown>, children?: Children) => Element;

/**
 * Define a light-DOM custom element that replaces itself with the rendered
 * primitive, moving its child nodes into the default slot. The resulting DOM
 * is identical to `render(props, children)`.
 *
 * Upgrade timing: children must exist before the swap. While the document is
 * still parsing, the swap waits for DOMContentLoaded; an element connected
 * without children (parent connected before its subtree, e.g. incremental
 * insertion) is retried on the next microtask. Attributes are read once, at
 * the swap — afterwards the host element is gone, so later attribute changes
 * have nothing to observe; update the rendered element directly instead.
 */
export function defineLight(tagName: string, render: Renderer, meta: PropMeta): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  customElements.define(
    tagName,
    class extends HTMLElement {
      connectedCallback(): void {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => this.swap(), { once: true });
        } else if (!this.hasChildNodes()) {
          queueMicrotask(() => this.swap());
        } else {
          this.swap();
        }
      }

      private swap(): void {
        if (!this.isConnected) return; // moved/removed meanwhile; a later connect retries
        const children = Array.from(this.childNodes);
        this.replaceWith(render(readHost(this, meta), children));
      }
    }
  );
}

/** Stringify an attribute value (null/undefined → ""). */
export const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
