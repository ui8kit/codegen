# Cross-runtime contract

Decisions made once in the domain layer and applied uniformly across every brick and runtime. See `src/domain/naming.ts` and the emitters for implementation.

## 1. Prop naming

Canonical names in brick definitions use **Go PascalCase**:

| Canonical | React | Svelte / Vue / HTML | Go | PHP templates |
|-----------|-------|---------------------|-----|---------------|
| `Variant` | `variant` | `variant` | `Variant` | `$variant` |
| `Class` | `className` | `class` | `Class` | `$class` |
| `AriaLabel` | `aria-label` | `aria-label` | `AriaLabel` | `$ariaLabel` |
| `HTMLFor` | `htmlFor` | `for` | `HTMLFor` | `$for` |

## 2. Variants

Every `cva: true` prop resolves through the shared `*.variants.json`:

- TS runtimes: literal-union types derived from recipe keys (`RecipeKey`).
- Go: embedded `Variants` struct from JSON.
- PHP: constants in `Classes.php`.

## 3. Class merge order

Applied identically in logic; merge *mechanism* differs:

1. Recipe base
2. Variant/size classes from recipe
3. Static base from `classes.staticBase`
4. Computed `classes.extra` fragments
5. State classes (`classes.state` tests)
6. Caller `Class` / `class` / `className`

| Runtime | Merge function | Conflict resolution |
|---------|----------------|---------------------|
| React, Svelte, Vue, canonical | `cn()` | Tailwind-aware (`tailwind-merge`) |
| Go, PHP | `Cn()` / `Rt::cn()` | Plain concatenation |

Parity tests compare the **effective** utility set after conflict resolution — identical across all runtimes.

## 4. Children

| Runtime | API |
|---------|-----|
| Templ | `{ children... }` |
| React | `children` prop |
| Svelte 5 | `{@render children?.()}` snippet |
| Vue | `<slot />` |
| Latte / Twig | `children` as pre-rendered HTML string |

Childless bricks render no slot anywhere.

## 5. Root tag resolution

Tier-B bricks resolve their root tag against `TagGroup` allow-lists (`src/domain/tags.ts`):

| Runtime | Mechanism |
|---------|-----------|
| Go | Local `switch` |
| React | `resolveTag(...) as ElementType` |
| Svelte | `<svelte:element this={…}>` |
| Vue | `<component :is="…">` |
| Latte / Twig | `$uiTag` / `uiTag` from `Rt::resolveTag()` or `ui8kit_resolve_tag()` |

`Title` uses `ui8kit_title_tag(as)` / `titleTag(level)` for heading levels 1–6.

## 6. Boolean vs ARIA-state attributes

| Kind | Examples | Behavior |
|------|----------|----------|
| Native boolean | `disabled`, `checked`, `open`, `required` | Present-or-absent in all runtimes |
| ARIA state | `aria-checked`, `aria-expanded`, … | Always stringified `"true"` / `"false"`, never omitted |

## 7. Attrs / rest escape hatch

Caller-supplied extra attributes always win — spread comes **last**:

| Runtime | Mechanism |
|---------|-----------|
| Go | `templ.Attributes` `{ p.Attrs... }` |
| React / Svelte | `...rest` |
| Vue | `v-bind` of non-class attrs (`inheritAttrs: false`) |
| Latte | `...$attrs` in `n:attr` |
| Twig | second arg to `ui8kit_attr_str(computed, attrs)` |

## 8. Passthrough props

Props like `ID`, `Name`, `AriaLabel`, `data-ui8kit` that only forward to attributes:

- Explicit struct fields in Go
- Flow through rest props in TS runtimes
- Validator enforces they are never referenced by render logic

## 9. Behavior hooks

`DataUI8Kit` emits `data-ui8kit="…"` only when explicitly set. No client JS ships in generated primitives — behavior belongs to `@ui8kit/aria` at the app level.

## 10. Reusability / escape hatches

Every part exports class composition helpers for manual re-rooting:

| Runtime | Helper |
|---------|--------|
| Go | `ButtonClasses(p ButtonProps) string` |
| TS | `buttonClasses()` in `<brick>.shared.ts` |
| PHP | `Classes::buttonClasses(array $in): string` |

React additionally ships `asChild` / `Slot` for composition without duplicating class logic.

Svelte and Vue follow the Go pattern: use the classes helper on a manual root.

## Empty attribute omission

Attributes with empty string values are never emitted. This applies uniformly — upstream hand-written Templ occasionally rendered `class=""`.

## Parity normalization

`tests/support/normalize.ts` normalizes HTML before comparison:

- Whitespace collapse
- Attribute ordering
- Equivalent class set comparison (Tailwind conflict resolution applied to both sides)

This allows Go/PHP concatenation and TS `cn()` to compare fairly.
