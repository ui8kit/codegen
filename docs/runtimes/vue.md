# Vue 3

## Install

```bash
npx ui8kit@3 init --yes --framework vue --dir src && npx ui8kit@3 add button
```

One SFC per part: `{dir}/ui/<brick>/<Part>.vue` (+ `<brick>.shared.ts`); barrel `index.vue.ts`.

## Props and children

- HTML-native naming: `class`, `for`, `aria-label`; declared props may be written camelCase
  or kebab-case in templates. Non-string values use `:prop` bindings.
- Children: the default slot. Extra attributes fall through (`$attrs`) and win.
- No `asChild`: use `<name>Classes()` for a custom root.

## Deviations from React

- Select/Switch/Checkbox: the live `value`/`checked` DOM property is synced; SSR markup equals React.
- Blank strings are passed through like React (JS runtimes share the TS contract).

## Helpers

`<name>Classes()` from `<brick>.shared.ts`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
