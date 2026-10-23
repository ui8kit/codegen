# Web Components (vanilla, light DOM)

## Install

```bash
npx ui8kit@3 init --yes --framework webcomponent --dir src && npx ui8kit@3 add button
```

Files: `{dir}/ui/<brick>/<brick>.wc.ts`; barrel `index.wc.ts` (`defineAll()`).

## Two APIs

- `render<Part>(props, children)` returns the rendered element (`children`: string, Node or array).
- `define<Part>(tag = "ui8-…")` / `defineAll()` registers custom elements (`<ui8-button>`) that
  **replace themselves** with the rendered primitive — no shadow DOM, so the DOM is identical to
  the other runtimes and consumer classes apply.

## Props and children

- HTML-native naming: `class`, `for`, `aria-label`. For custom elements, JSON-valued props
  (Select `options`) are JSON attribute strings.
- Children: the host's child nodes (moved into the rendered element).

## Deviations from React

- Attributes are read **once**, at the swap (after children exist: DOMContentLoaded while parsing,
  or the next microtask). Afterwards the host is gone: update the rendered element or call
  `render<Part>()` again.
- Select `value` is synced as the DOM property.

## Helpers

`<name>Classes()` from `<brick>.shared.ts`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
