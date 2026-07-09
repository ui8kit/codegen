# Overview

## What this project does

UI8Kit Codegen is a **spec-driven codegen engine** for UI8Kit `ui/` primitives. Each brick is defined once in TypeScript as data (props, derived values, class recipes, render tree). The engine:

1. **Validates** definitions before emitting anything.
2. **Renders** a canonical reference DOM via `src/domain/render.ts` — the executable specification.
3. **Emits** idiomatic code for six runtimes from the same definition.
4. **Tests** that every generated runtime produces identical normalized DOM for every part and showcase fixture.

Identity across runtimes is not a review convention — it is enforced by the test suite.

## Supported runtimes

| Runtime | Output | Composition model |
|---------|--------|-------------------|
| **Go Templ** | `ui/<brick>/<brick>.templ` + `<brick>_gen.go` | SSR, `{ children... }`, `Attrs` map |
| **React 19** | `ui/<brick>/<brick>.tsx` | `forwardRef`, `asChild` via `Slot`, rest props |
| **Svelte 5** | `ui/<brick>/<Part>.svelte` | runes, snippets, `<svelte:element>` |
| **Vue 3** | `ui/<brick>/<Part>.vue` | `<script setup>`, slots, `<component :is>` |
| **Latte** | `ui/<brick>/<Part>.latte` | typed `{parameters}`, `n:attr`, children as HTML string |
| **Twig** | `ui/<brick>/<Part>.html.twig` | `ui8kit_attr_str`, `include with`, children as HTML string |

A **static HTML export** (via React `renderToStaticMarkup`) lives in `examples/html/` and is built by `bun run build:html`.

All runtimes consume the **same** colocated `*.variants.json` (CVA-style class recipes). Attribute logic is written once as a small typed expression IR and printed per runtime.

## PHP template coverage

Latte and Twig cover **60 of 63** parts. Three structurally complex parts are skipped by a mechanical predicate (`src/domain/php-support.ts`). Class helpers in `php/UI8Kit/Classes.php` are still emitted for **all** parts as an app-level escape hatch.

See [PHP complex parts](./php-complex-parts.md) for details.

## Scope

**In scope:** `ui/` primitives only — 33 bricks, 63 exported parts (Tiers A–E of the upstream inventory), including multi-part composites (`card`, `table`, `form`, `form/controls`, `select`, `breadcrumb`).

**Out of scope (separate phase):** behavior-driven `components/` composites (Sheet, Tabs, Popover, Combobox, Menu, Toast) that need the `@ui8kit/aria` client contract. The engine IR and emitters are ready to host them once that contract is specified.

## Repository layout

```
Codegen/
├── bricks/                 # 33 brick definitions + variants.json + data.json fixtures
│   ├── _dsl.ts             # authoring prelude (prop factories, IR re-exports)
│   └── index.ts            # brick registry
├── src/
│   ├── domain/             # pure model: expr, model, render, validate, tags, recipe
│   ├── emitters/           # one printer per runtime + shared analysis
│   ├── application/        # generate pipeline
│   └── infrastructure/     # CLI
├── runtime/                # support files copied into generated/ (Go, TS, PHP)
├── generated/              # codegen output (gitignored; created by `bun run generate`)
├── tests/                  # domain units + cross-runtime parity suites
├── examples/               # seven welcome previews + static HTML export
├── docs/                   # this documentation
└── .github/workflows/      # CI
```

## Design principles

- **Single source of truth:** brick definitions in `bricks/<name>/<name>.def.ts`.
- **Non-Turing-complete IR:** thirteen expression kinds and five node kinds — enough for all 33 bricks, provably coverable by every emitter.
- **Fail fast:** `validateRegistry` runs before emission; duplicate generated paths throw.
- **Open/closed emitters:** adding a runtime is a new `Emitter` implementation, not a change to the domain model.
- **DRY:** one `*.variants.json` per recipe; one expression IR; TS runtimes share `<brick>.shared.ts`.

## Why an IR instead of hand-written runtimes

The upstream registry hand-writes `.templ` and `.tsx` pairs against a shared spec. Adding Svelte, Vue, Latte, and Twig by hand multiplies drift surface. This engine inverts the workflow: definitions are data, the canonical renderer is the spec, emitters are printers, parity tests are the gate.

## License

MIT © UI8Kit.
