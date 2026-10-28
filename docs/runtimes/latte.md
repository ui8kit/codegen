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

- None for attributes — empty values, `attrs` precedence and URL checks are identical in every target (see [contract](../contract.md#attributes-precedence-empty-values-urls)).
- No `asChild`.

## Helpers

`{\UI8Kit\Latte\Classes::buttonClasses(['class' => 'px-4'])}`; `Rt`, `CnMerge`, `Tags` in the runtime.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).

## Includes inherit variables

Latte has no `only`: an included primitive receives the caller's variables for every `{parameters}` name it declares.
Pass every such parameter explicitly when the caller has a variable of the same name
(`{include 'ui/icon/Icon.latte', size: '', class: '...'}`), or render from a template that has no colliding variables.

## Safe URLs

URL attributes (`href`, `src`, `action`, `formaction`, `poster`, `cite`, `background`, `xlink:href`), named or in `attrs`,
go through `Rt::safeUrl` / `Rt::urlOrNull` / `Rt::restAttrs`: `javascript:`, `vbscript:` and `data:` (case and control
characters ignored) omit the attribute, as in every target. Only `<img src>` (Image) allows
`data:image/(png|jpeg|gif|webp|avif|svg+xml)` placeholders (`Rt::imgUrlOrNull`).
