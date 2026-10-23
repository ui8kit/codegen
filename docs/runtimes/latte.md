# Latte (PHP)

## Install

```bash
npx ui8kit@3 init --yes --framework latte --dir templates && npx ui8kit@3 add button
composer require latte/latte   # use the printed version + PSR-4 entry (UI8Kit\\Latte\\), then composer dump-autoload
```

Point the Latte loader at `{dir}/ui`. One template per part: `<brick>/<Part>.latte` with a typed
`{parameters}` block. PHP ≥ 8.1.

## Props and children

- Props are parameters: `{include 'button/Button.latte', ariaLabel: 'Save', class: 'px-4'}`.
- Extra attributes: `attrs` (merged last, caller wins).
- Children: `$children` is trusted HTML printed with `{$children|noescape}`. Capture Latte
  markup with `{capture $html}…{/capture}`; never pass user input (XSS).

## Deviations from React

- Blank strings mean "unset"; force `value=""` via `attrs`.
- URL attributes are not sanitized (same as React).
- No `asChild`.

## Helpers

`{\UI8Kit\Latte\Classes::buttonClasses(['class' => 'px-4'])}`; `Rt`, `CnMerge`, `Tags` in the runtime.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
