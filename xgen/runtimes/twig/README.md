# @ui8kit/xgen-runtime-twig

[Twig](https://twig.symfony.com) emitter, and the shared emitter of the Jinja-family and Latte runtimes: bricks and organisms are
printed through a `Dialect`, so `@ui8kit/xgen-runtime-jinja2` and `@ui8kit/xgen-runtime-latte` reuse this package. Output:
`packages/twig/ui` (composer package `ui8kit/twig-ui`, requires `twig/twig` `^3.21`).

Part of xgen (see `../README.md` and the author guide `../../../docs/specs-guide.md`). Tests: `bun test`.

## How it emits

- `src/brick.ts` (`emitTwigBrick(brick, source, dialect)`): one include template per part, `ui/<brick>/<part><ext>`, with the
  recipe next to it. Templates take `p` (props by their canonical names: `Variant`, `Class`, `Attrs`) and `children` (markup).
- `src/organism.ts` (`emitTwigOrganism(org, deps, source, dialect)`): one `blocks/<name><ext>` per portable organism; props by
  their JSON names plus `className`. A slot fill without arguments is a captured block; a fill with arguments is a template of its
  own, passed as a descriptor `{t, v}` and called with `a0`, `a1`, ...
- `src/dialect.ts`: the `Dialect` interface and the `twig`, `jinja` and `latte` objects: literals, field access, operators,
  output (`out`, `raw`), control flow, captures, includes, plus the optional hooks `dynamicTag` (Latte `n:tag`) and `attrOut`
  (Latte `|nocheck` on URL attributes). `MARKUP_HELPERS` (the `ui_*` helpers that return markup) and `URL_ATTRS` are the one place
  those lists live.
- `src/php.ts` (`phpHelpers(runtime)`): the PHP helpers shared by Twig and Latte, `assets/php-shared/Runtime.php` (the `ui_*`
  functions, a port of the Go helpers) and `CnMerge.php` (tailwind-merge), with the namespace written `UI8Kit\{{RUNTIME}}` and
  filled per package (`UI8Kit\Twig`, `UI8Kit\Latte`).
- `assets/php/Extension.php`: the Twig extension that registers the functions (`Extension::environment($root)`).
  `assets/parity.php`: the parity harness (JSON in, HTML out). `assets/lucide-icon.html.twig`: the icon asset.

The generator side is `xgen/generator/src/twig.ts` and `organisms.ts` (`dialectOrganismFiles`, shared with Jinja2 and Latte).

## Check group `twig`

`composer install`, `php -l` of the helpers, then `bin/parity.php` renders every brick case (118) and block case (474) with real Twig;
the DOM is compared with React and html-validate runs over every block case (`xgen/check/src/twig`, `phpTemplateCheck`). The rules
group reads the templates with `xgen/check/src/rules/twig.ts`.

## Prerequisites

PHP 8.2 or newer with `mbstring`, and composer. Without PHP the group prints `skipped: no PHP` (without composer and no `vendor/`:
`skipped: no composer`); with `UI8KIT_REQUIRE_ALL_RUNTIMES=1` a skip is a failure.
