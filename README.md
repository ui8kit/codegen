# UI8Kit Codegen

**One brick definition → six identical runtimes.**

Spec-driven codegen for UI8Kit `ui/` primitives. Define props, variants, and a render tree once; emit idiomatic Templ, React, Svelte, Vue, Latte, and Twig with the same DOM, design tokens, and ARIA contract — verified by parity tests, not by review.

| Fact | Value |
|------|-------|
| **Inventory** | 33 bricks · 63 parts · 6 runtimes |
| **PHP templates** | 60 / 63 parts (3 skipped by structural predicate) |
| **License** | MIT |

---

## Runtimes

| Runtime | Output | Composition |
|---------|--------|-------------|
| **Go Templ** | `ui/<brick>/<brick>.templ` + `_gen.go` | SSR, `{ children... }`, `Attrs` |
| **React 19** | `ui/<brick>/<brick>.tsx` | `forwardRef`, `asChild` / `Slot` |
| **Svelte 5** | `ui/<brick>/<Part>.svelte` | runes, snippets, `<svelte:element>` |
| **Vue 3** | `ui/<brick>/<Part>.vue` | `<script setup>`, slots, `<component :is>` |
| **Latte** | `ui/<brick>/<Part>.latte` | typed `{parameters}`, `n:attr` |
| **Twig** | `ui/<brick>/<Part>.html.twig` | `ui8kit_attr_str`, `include with` |

Plus a **static HTML** export via `bun run build:html` → `examples/html/`.

All runtimes share the same colocated `*.variants.json` (CVA-style recipes). Attribute logic lives in a small typed expression IR and is printed idiomatically per target.

> **PHP note:** Latte/Twig skip `breadcrumb/Breadcrumb`, `select/Select`, and `icon/Icon` (loops over typed items or branched roots). Class helpers in `php/UI8Kit/Classes.php` are still emitted for every part. Details: [docs/php-complex-parts.md](docs/php-complex-parts.md).

---

## Why codegen?

Hand-writing `.templ` + `.tsx` (and then Svelte, Vue, Latte, Twig) multiplies drift. This engine inverts the workflow:

1. **Brick definitions** (`bricks/<name>/<name>.def.ts`) — single source of truth
2. **Canonical renderer** (`src/domain/render.ts`) — executable DOM spec
3. **Emitters** — one printer per runtime
4. **Parity tests** — SSR every generated component and assert normalized DOM equals the canonical output

Identity across runtimes is a property of the test suite, not a convention.

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh). Go 1.25+ and PHP 8.1+ / Composer are optional (parity suites skip when missing).

```bash
bun install
bun run check       # validate all brick definitions
bun run generate    # emit all six runtimes → generated/
bun test            # domain units + DOM parity
bun run verify      # check + typecheck + tests (CI equivalent)
```

### Local previews

Seven welcome screens (generated primitives + shadcn tokens) live in [`examples/`](examples/):

```bash
bun run generate && cd examples && bun install && bun run build:css

bun run dev:templ   # :8080
bun run dev:react   # :5173
bun run dev:svelte  # :5174
bun run dev:vue     # :5175
bun run dev:latte   # :5176
bun run dev:twig    # :5177
bun run build:html  # → examples/html/
```

### CLI

```bash
bun src/infrastructure/cli.ts generate \
  --out generated \
  --go-module github.com/ui8kit/ui \
  --runtimes templ,react,svelte,vue,latte,twig
```

Also available: `bun run generate:latte-bundle` for a Latte-only package — see [docs/latte-bundle.md](docs/latte-bundle.md).

---

## Generated layout

```
generated/
  go.mod  composer.json
  cmd/parity/          # Go + PHP render harnesses
  php/UI8Kit/          # Rt.php, Classes.php, TwigExtension.php
  utils/               # shared runtime support (Go + TS)
  ui/
    index.ts | index.svelte.ts | index.vue.ts
    button/
      button.variants.json   # shared CVA recipe
      button.shared.ts       # TS types + classes helpers
      button.templ | button.tsx | Button.svelte | Button.vue
      Button.latte | Button.html.twig
```

**Consume:** Templ → `templ generate && go build` · TS → Vite (`@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte`) · PHP → `composer install` in `generated/` with a loader rooted at `generated/ui`.

Peer deps: `react` / `svelte` / `vue` + `clsx` + `tailwind-merge`; PHP: `latte/latte ^3` or `twig/twig ^3`.

---

## Architecture

```
bricks/            # 33 definitions + variants.json + fixtures
src/
  domain/          # pure model — expr IR, render, validate (zero I/O)
  emitters/        # one printer per runtime
  application/     # generate pipeline
  infrastructure/  # CLI
runtime/           # support files copied into generated/utils
tests/             # domain units + cross-runtime parity
examples/          # seven welcome previews
docs/              # full documentation
```

| Principle | How it shows up |
|-----------|-----------------|
| Single source of truth | Brick defs are data, not templates |
| Closed IR | 13 expression kinds · 5 node kinds — exhaustive per emitter |
| Open emitters | New runtime = new printer, model unchanged |
| Fail fast | Validation before any emit |
| Parity as gate | Canonical renderer is the spec; tests enforce it |

Deep dive: [docs/architecture.md](docs/architecture.md).

---

## Cross-runtime contract

Decided once, applied everywhere ([docs/contract.md](docs/contract.md)):

| Concern | Rule |
|---------|------|
| **Prop naming** | Canonical Go PascalCase → React / Svelte / Vue native names |
| **Variants** | Shared `*.variants.json`; TS literal unions; Go embedded `Variants` |
| **Class merge** | Recipe → variants → base → fragments → state → caller (`cn` / `Cn`) |
| **Children** | Templ / React / Svelte snippets / Vue slots — or none |
| **Root tags** | Same `TagGroup` allow-lists in every runtime |
| **Booleans vs ARIA** | Native bools present-or-absent; ARIA always `"true"` / `"false"` |
| **Rest / Attrs** | Spread last — caller wins |
| **Behavior** | Presentation-only; client hooks via `@ui8kit/aria` at app level |

---

## Brick definition

```ts
// bricks/button/button.def.ts (abridged)
export default brick({
  id: "ui.button",
  dir: "button",
  recipes: { button: { file: "button.variants.json", recipe: buttonVariants } },
  parts: [{
    name: "Button",
    recipeId: "button",
    asChild: true, // React-only; other runtimes use ButtonClasses
    classes: {
      recipe: { variant: "Variant", size: "Size" },
      state: [{ test: prop("Disabled"), classes: "pointer-events-none opacity-50" }],
    },
    props: [pVariant(), pSize(), pClass(), pStr("Type"), pBool("Disabled"),
            ...controlPassthroughProps(), pAttrs(), pChildren()],
    render: el("button", [
      attrExpr("type", oneOfOr(prop("Type"), ["submit", "reset"], "button")),
      attrClass(),
      attrBool("disabled", prop("Disabled")),
      fwd("id", "ID"), fwd("aria-label", "AriaLabel"),
      attrRest(),
    ], [slot()]),
  }],
});
```

### Adding a brick

1. Create `bricks/<name>/<name>.def.ts` + `<name>.variants.json` (+ optional `.data.json` fixtures)
2. Register in `bricks/index.ts`
3. `bun run check` → `bun test`

Authoring guide: [docs/bricks.md](docs/bricks.md).

---

## Scope

**In:** `ui/` primitives — 33 bricks, 63 parts (Tiers A–E), including multi-part composites (`card`, `table`, `form`, `select`, `breadcrumb`).

**Out (later phase):** behavior-driven `components/` (Sheet, Tabs, Popover, Combobox, Menu, Toast) that need `@ui8kit/aria`. The IR and emitters are ready once that contract is specified.

Deliberate deviations from upstream hand-written pairs (empty attrs omitted, rest spread last, etc.): [docs/contract.md](docs/contract.md).

---

## Documentation

| Doc | Topic |
|-----|-------|
| [Overview](docs/overview.md) | Goals, runtimes, scope |
| [Getting started](docs/getting-started.md) | Install, generate, consume |
| [Architecture](docs/architecture.md) | Domain, IR, emitters, pipeline |
| [Bricks](docs/bricks.md) | Authoring & validation |
| [Runtimes](docs/runtimes.md) | Per-runtime notes |
| [Contract](docs/contract.md) | Cross-runtime rules |
| [Testing & CI](docs/testing-and-ci.md) | Parity harnesses |
| [Examples](docs/examples.md) | Local previews |
| [Latte bundle](docs/latte-bundle.md) | Latte-only package |

---

MIT © UI8Kit
