# Svelte 5

## Install

```bash
npx ui8kit@3 init --yes --framework svelte --dir src && npx ui8kit@3 add button
```

One component per part: `{dir}/ui/<brick>/<Part>.svelte` (runes, `$props()`); barrel `index.svelte.ts`.

## Props and children

- HTML-native naming: `class`, `for`, `aria-label`; non-string values as `{expr}`.
- Children: the `children` snippet (content between the tags). Rest props are spread last and win.
- No `asChild`: use `<name>Classes()` for a custom root.

## Deviations from React

- Select `value` is synced to the DOM property, never printed as an attribute.

## Helpers

`<name>Classes()` from `<brick>.shared.ts`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
