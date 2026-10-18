# @ui8kit/xgen-runtime-latte

[Latte 3](https://latte.nette.org) runtime. It has no emitter of its own: the Twig emitters print the same trees through the
`latte` dialect (`xgen/runtimes/twig/src/dialect.ts`). Output: `packages/latte/ui` (composer package `ui8kit/latte-ui`, requires
`latte/latte` `^3.0`).

Part of xgen (see `../README.md` and the author guide `../../../docs/specs-guide.md`). Tests: `bun test`.

## The dialect

Templates end in `.latte`. Variables carry `$`; output is `{=expr}` (`|noescape` for markup); control flow is `{if}` /
`{elseif}` / `{else}` / `{/if}` and `{foreach $list as $item}` (index `$iterator->counter0`); captures are
`{capture $x}...{/capture}`; values are PHP (`['k' => v]`, `??`, `&&`, `str_contains`). Three Latte specifics:

- an element whose name is a variable is written `<div n:tag="$tag1" ...>`: Latte cannot read a printed name followed by a line
  break, and `n:tag` keeps void elements right;
- URL attributes (`URL_ATTRS`: `href`, `src`, ...) print with `|nocheck`, or Latte would blank the `data:` URIs React keeps;
- the markup helpers (`MARKUP_HELPERS`: `ui_attr_html`, `ui_lucide`, `ui_include`) print with `|noescape`, since Latte escapes
  inside a tag even an `Html` value.

## Helpers

The PHP helpers are the Twig runtime's (`phpHelpers("Latte")` from `@ui8kit/xgen-runtime-twig`: `Runtime.php`, `CnMerge.php` in the
namespace `UI8Kit\Latte`). `assets/php/Extension.php` is the Latte extension that registers them as functions and adds
`ui_include` (renders another template with only the given variables); `Extension::engine($root)` builds the `Engine`.
`assets/parity.php` is the parity harness; `assets/lucide-icon.latte` the icon asset. Generator: `xgen/generator/src/latte.ts`.

## Check group `latte`

The same gate as Twig (`phpTemplateCheck`): `composer install`, `php -l`, every brick case (118) and block case (474) rendered with
real Latte against React, html-validate of every block case (`xgen/check/src/latte`). The rules group reads `.latte` files by
rewriting them to the Twig form (`latteAsTwig` in `xgen/check/src/rules/twig.ts`), including `n:if`, `n:foreach`,
`n:inner-foreach`, `n:tag` and `n:syntax="off"`.

## Prerequisites

PHP 8.2 or newer and composer. Without PHP the group prints `skipped: no PHP`; with `UI8KIT_REQUIRE_ALL_RUNTIMES=1` a skip is a
failure.
