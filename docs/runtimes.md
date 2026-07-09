# Runtimes

Each runtime is generated from the same brick definition. This page describes output shape, composition model, and consumption notes.

## Go Templ

**Output:** `ui/<brick>/<brick>.templ` + `ui/<brick>/<brick>_gen.go`

| Feature | Implementation |
|---------|----------------|
| Children | `{ children... }` |
| Attrs escape hatch | `templ.Attributes` spread `{ p.Attrs... }` (last) |
| Variants | `//go:embed <brick>.variants.json` → `ButtonVariants` |
| Class helper | `func ButtonClasses(p ButtonProps) string` |
| Dynamic tags | Local `switch` over `TagGroup` allow-list |
| Boolean attrs | `disabled?={ p.Disabled }` (present-or-absent) |

**Build:**

```bash
cd generated
templ generate && go build
```

**Module path:** set with `--go-module` at generate time (default `github.com/ui8kit/ui`).

## React 19

**Output:** `ui/<brick>/<brick>.tsx` (all parts in one file)

| Feature | Implementation |
|---------|----------------|
| Children | `children` prop |
| `asChild` | `Slot` from `ui/slot/slot.tsx` (parts with `asChild: true`) |
| Rest props | `...rest` spread last |
| Prop naming | camelCase (`variant`, `className`, `htmlFor`, `aria-label`) |
| Class merge | `cn()` — Tailwind conflict-aware |
| Shared types | `<brick>.shared.ts` — literal unions + `buttonClasses()` |

**Peer deps:** `react`, `react-dom`, `clsx`, `tailwind-merge`.

**Note:** `<textarea>` uses `defaultValue` instead of children (React constraint); SSR DOM matches other runtimes.

## Svelte 5

**Output:** `ui/<brick>/<Part>.svelte` (one SFC per part)

| Feature | Implementation |
|---------|----------------|
| Children | Snippets — `{@render children?.()}` |
| Prop naming | HTML-native (`class`, `for`, `aria-label`) |
| Dynamic tags | `<svelte:element this={resolvedTag}>` |
| Class merge | `cn()` |

**Peer deps:** `svelte`, `clsx`, `tailwind-merge`.

Bun test preload compiles `.svelte` with `generate: "server"` for parity tests (`tests/preload-bun.ts`).

## Vue 3

**Output:** `ui/<brick>/<Part>.vue` (one SFC per part)

| Feature | Implementation |
|---------|----------------|
| Children | `<slot />` |
| Prop naming | HTML-native (`class`, `for`, …) |
| Dynamic tags | `<component :is="resolvedTag">` |
| Attrs | `inheritAttrs: false`; class consumed into `cn` merge |
| Class merge | `cn()` |

**Peer deps:** `vue`, `clsx`, `tailwind-merge`.

## Latte (PHP)

**Output:** `ui/<brick>/<Part>.latte`

| Feature | Implementation |
|---------|----------------|
| Parameters | Typed `{parameters}` block |
| Attrs | Single `n:attr` map; caller `$attrs` spread last |
| Children | `$children` HTML string, printed with `\|noescape` |
| Expressions | `UI8Kit\Rt` helpers + generated preamble for derived values |
| Class merge | `Rt::cn()` — plain concatenation (like Go) |

**Coverage:** 60/63 parts (see [PHP complex parts](./php-complex-parts.md)).

**Composition pattern:**

```latte
{capture $inner}
  {include 'button/Button.latte', variant: 'default', children: 'Click'}
{/capture}
{include 'stack/Stack.latte', class: 'gap-4', children: (string) $inner}
```

**Peer dep:** `latte/latte ^3`

## Twig (PHP)

**Output:** `ui/<brick>/<Part>.html.twig`

| Feature | Implementation |
|---------|----------------|
| Attrs | `{{ ui8kit_attr_str(computed, attrs) }}` via `TwigExtension` |
| Children | `children` param, printed `\|raw` |
| Dynamic tags | `{% set uiTag = … %}` interpolation |
| Class merge | `Rt::cn()` via extension |

**Coverage:** 60/63 parts (same predicate as Latte).

**Composition pattern:**

```twig
{% set inner %}
  {% include 'button/Button.html.twig' with {variant: 'default', children: 'Click'} only %}
{% endset %}
{% include 'stack/Stack.html.twig' with {class: 'gap-4', children: inner} only %}
```

**Peer deps:** `twig/twig ^3`; register `UI8Kit\TwigExtension`.

## PHP class helpers (all 63 parts)

`php/UI8Kit/Classes.php` exposes static methods for every part with a classes contract:

```php
UI8Kit\Classes::buttonClasses(['variant' => 'ghost', 'size' => 'sm', 'class' => 'mt-2']);
UI8Kit\Classes::iconClasses([...]);      // even though Icon.latte is not generated
UI8Kit\Classes::selectClasses([...]);    // even though Select.html.twig is not generated
```

Use these when building markup manually for parts the template emitters skip.

## Static HTML export

Not a generated runtime — built from the React welcome view:

```bash
bun run build:html   # examples/react/script/generate-static.tsx
```

Writes `examples/html/index.html`, `examples/html/about/index.html` with relative asset links.

## Runtime selection at generate time

```bash
bun src/infrastructure/cli.ts generate --runtimes react,svelte
```

Valid values: `templ`, `react`, `svelte`, `vue`, `latte`, `twig` (comma-separated). Default: all six.

## Parity policy per runtime

| Runtime | Parity test | Skipped when |
|---------|-------------|--------------|
| React, Svelte, Vue | `tests/parity.test.ts` | never (always run) |
| Go Templ | `tests/parity.templ.test.ts` | `go` not on PATH |
| Latte | `tests/parity.latte.test.ts` | PHP or Composer unavailable |
| Twig | `tests/parity.twig.test.ts` | PHP or Composer unavailable |

PHP parity excludes the three structurally complex parts symmetrically with the emitters.
