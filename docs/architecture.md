# Architecture

## Dependency direction

Clean architecture with the dependency arrow pointing inward:

```
bricks/          definitions (data)
    ↓
src/domain/      pure model, zero I/O — expr, model, render, validate
    ↓
src/emitters/    runtime printers (templ, react, svelte, vue, latte, twig)
    ↓
src/application/ generate pipeline (validate → emit → write)
    ↓
src/infrastructure/ CLI
```

`runtime/` is copied verbatim into `generated/utils` (Go/TS) or `generated/php/UI8Kit` (PHP) during generation.

## Domain model (`src/domain/`)

| Module | Role |
|--------|------|
| `model.ts` | `PropDef`, `PartDef`, `BrickDef`, render-tree nodes (`element`, `text`, `slot`, `when`, `forEach`) |
| `expr.ts` | Expression IR: `lit`, `prop`, `cond`, `mapOr`, `isSet`, `and`/`or`/`not`, `eq`, … |
| `recipe.ts` | `VariantRecipe` validation and class composition |
| `tags.ts` | `TagGroup` allow-lists for dynamic root tags |
| `naming.ts` | Per-runtime prop naming (Go PascalCase, React camelCase, HTML-native for Svelte/Vue/PHP) |
| `render.ts` | **Canonical renderer** — executes definitions, produces reference HTML |
| `validate.ts` | Definition invariants (recipe integrity, prop references, passthrough rules) |
| `php-support.ts` | Mechanical predicate for Latte/Twig template eligibility |

## Expression IR

Deliberately tiny and non-Turing-complete:

- **No** user-defined functions, loops-with-state, or embedded templating language.
- **Thirteen** expression kinds cover all 33 bricks.
- Every emitter implements exhaustive `switch` over the discriminated union.

Expressions drive: attribute values, class fragments, derived values, conditional tests, and dynamic tags.

## Render tree nodes

| Node | Purpose |
|------|---------|
| `element` | HTML element with attrs and children |
| `text` | Text content from an expression |
| `slot` | Children insertion point |
| `when` | Conditional branches (`then` / optional `else`) |
| `forEach` | Loop over typed `items` props |

## Emitters (`src/emitters/`)

Each runtime implements the `Emitter` interface from `common.ts`:

```ts
interface Emitter {
  readonly runtime: RuntimeName;
  emit(brick: BrickDef): GeneratedFile[];
}
```

| Emitter | Key files |
|---------|-----------|
| Templ | `templ.ts`, `go-expr.ts`, `go-harness.ts` |
| React | `react.ts`, `ts-expr.ts`, `ts-common.ts` |
| Svelte | `svelte.ts` |
| Vue | `vue.ts` |
| Latte | `latte.ts`, `php-expr.ts`, `php-common.ts` |
| Twig | `twig.ts`, `twig-expr.ts` |
| PHP classes | `php-classes.ts` — `Classes.php` for all parts |
| PHP harness | `php-harness.ts` — `composer.json`, parity scripts |

Shared analysis lives in `ts-common.ts` (TS runtimes) and `php-common.ts` (PHP runtimes).

## Generation pipeline (`src/application/generate.ts`)

```
validateRegistry(bricks)
    → for each brick:
        copy recipe JSON files
        emit <brick>.shared.ts (if TS runtimes requested)
        run each selected Emitter
    → copy runtime support files
    → emit barrels (index.ts, index.svelte.ts, index.vue.ts, shared.ts)
    → emit Go mod + parity harness (if templ)
    → emit composer.json + Classes.php + PHP parity harnesses (if latte/twig)
    → assert no duplicate output paths
    → writeFiles
```

### Generated tree (typical)

```
generated/
  go.mod
  composer.json
  cmd/
    parity/main.go           # Go Templ parity harness
    parity-latte/main.php
    parity-twig/main.php
  php/UI8Kit/
    Rt.php                   # expression + tag helpers
    Classes.php              # generated class helpers + embedded recipes
    TwigExtension.php
  utils/                     # Go + TS runtime (cn, expr, tags, variants, …)
  ui/
    index.ts                 # React barrel
    index.svelte.ts
    index.vue.ts
    shared.ts
    slot/slot.tsx            # React-only
    <brick>/
      <brick>.variants.json
      <brick>.shared.ts
      <brick>.templ + <brick>_gen.go
      <brick>.tsx
      <Part>.svelte / <Part>.vue
      <Part>.latte / <Part>.html.twig
```

## Runtime support layer (`runtime/`)

| Path | Consumed by |
|------|-------------|
| `runtime/go/*.go` | Generated Templ output (`utils/`) |
| `runtime/ts/*.ts` | Generated React/Svelte/Vue (`utils/`) |
| `runtime/react/slot.tsx` | React `asChild` composition |
| `runtime/php/Rt.php` | Latte/Twig templates |
| `runtime/php/TwigExtension.php` | Twig attribute merging, tag resolution |

PHP `Rt.php` mirrors `utils/expr.go` and `utils/expr.ts` so all runtimes resolve defaults identically.

## Canonical renderer as executable spec

`renderPart(brick, partName, props, options)` in `src/domain/render.ts` is the ground truth for DOM parity tests. It:

- Resolves variants through shared recipes
- Applies class merge order
- Omits empty attributes
- Distinguishes boolean attrs from ARIA state attrs
- Resolves dynamic tags against `TagGroup` allow-lists

Every parity test compares normalized output from a generated runtime against this function.

## Adding a new runtime

1. Implement `Emitter` in `src/emitters/<runtime>.ts`.
2. Add expression printer if not reusing an existing one.
3. Register in `ALL_RUNTIMES` and `generateFiles()` in `src/application/generate.ts`.
4. Add parity test suite under `tests/`.
5. Extend `emitters.test.ts` with structural convention checks.

The domain model and IR should not need changes if the new runtime can express the same vocabulary.
