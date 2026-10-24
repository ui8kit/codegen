# React 19

## Install

```bash
npx ui8kit@3 init --yes --framework react --dir src && npx ui8kit@3 add button   # or: add --all
```

Files land in `{dir}/ui/<brick>/<brick>.tsx` (+ `<brick>.shared.ts`), helpers in `{dir}/utils`
(`cn` = clsx + tailwind-merge; peers `clsx`, `tailwind-merge` are added to package.json).

## Props and children

- Declared props are camelCase (`htmlFor`, `readOnly`, `srcSet`); `class` is `className`;
  ARIA stays hyphenated (`aria-label`). Undeclared props (`id`, `data-*`, `onClick`, …) flow
  through rest and win.
- Children: regular `children` (`ReactNode`).
- `asChild` (Box, Text, Button): merges the primitive's props/classes onto its single child via
  [Slot](../primitives/slot.md) — React only.

## Reference runtime

React is the reference the other runtimes are compared to (together with the canonical renderer).
Known React-specific behaviour:

- A blank optional attribute (`id=""`, `href=""`, `aria-describedby=" "`, …) is omitted — props and rest
  alike (`safeRest`); only `value=""` is printed, so a controlled `<Input value="">` stays controlled
  (see [contract](../contract.md#attributes-precedence-empty-values-urls)).
- Select: `value` becomes `value` when you pass `onChange`, otherwise `defaultValue`.
- Controlled `checked` without `onChange` triggers React's read-only warning — pass
  `onChange` or `readOnly` in apps.

## Helpers

`<name>Classes(input)` from `<brick>.shared.ts` composes the class contract without rendering
(e.g. `iconClasses({ size: "md", className })`).

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
