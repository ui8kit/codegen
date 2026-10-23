# Twig (PHP)

## Install

```bash
npx ui8kit@3 init --yes --framework twig --dir templates && npx ui8kit@3 add button
composer require "twig/twig:^3.0"   # + the printed PSR-4 entry, then composer dump-autoload
```

```json
{ "autoload": { "psr-4": { "UI8Kit\\Twig\\": "templates/runtime/" } } }
```

Register `$twig->addExtension(new \UI8Kit\Twig\TwigExtension())` and point the loader at
`{dir}/ui`. One template per part: `<brick>/<Part>.html.twig`. PHP ≥ 8.1.

## Props and children

- Props are variables (`tag`, `class`, `ariaLabel`, `htmlFor`, `id`); call with
  `{% include 'button/Button.html.twig' with { … } only %}` — always `only`: without it the caller's variables
  (`children`, `class`, `href`, ...) leak into the primitive (a test guards docs/ and the generated templates). Select options:
  `options: [{ value, label, disabled }]`.
- Extra attributes: `attrs` (merged last, caller wins).
- Children: `children` is trusted HTML printed with `{{ children|raw }}`. Render markup with
  Twig first (`{% set html %}…{% endset %}`); never pass user input (XSS).

## Deviations from React

- Blank strings mean "unset" (attribute omitted); force `value=""` via `attrs`.
- URL attributes are not sanitized (same as React).
- No `asChild`.

## Helpers

`ui8kit_classes('buttonClasses', { class: 'px-4' })` composes a part's classes (`Classes.php`);
`Rt` helpers and `CnMerge` (tailwind-merge port) live in the runtime `src/`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
