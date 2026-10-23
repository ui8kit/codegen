# SolidJS

## Install

```bash
npx ui8kit@3 init --yes --framework solid --dir src && npx ui8kit@3 add button
```

Files: `{dir}/ui/<brick>/<brick>.solid.tsx`; barrel `index.solid.ts`.

## Props and children

- Declared props camelCase like React; `class` is primary (`className` accepted as alias);
  passthrough ARIA/attrs use HTML names (`aria-label`).
- Children: `props.children` (JSX). Rest props are spread last and win.
- No `asChild`: use `<name>Classes()`.

## Deviations from React

- Select `value` / `checked` are synced as DOM properties; SSR markup equals React.

## Helpers

`<name>Classes()` from `<brick>.shared.ts`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
