# Testing and CI

## Philosophy

The **canonical renderer** (`src/domain/render.ts`) is the executable DOM specification. Parity tests server-render every generated component and assert normalized HTML equals the canonical output for:

- Every brick
- Every part (or every PHP-supported part)
- Default props + every showcase fixture from `*.data.json`

No per-runtime test authoring is needed when adding bricks — fixtures drive cases automatically.

## Test suites

| File | What it tests |
|------|---------------|
| `tests/domain.test.ts` | Recipe composition, tag resolution, expression evaluation, naming, validation |
| `tests/emitters.test.ts` | Structural conventions in generated code (syntax idioms, embeds, escape hatches) |
| `tests/parity.test.ts` | React 19 + Svelte 5 + Vue 3 DOM parity (always runs) |
| `tests/parity.templ.test.ts` | Go Templ DOM parity via `cmd/parity` harness |
| `tests/parity.latte.test.ts` | Latte DOM parity via `cmd/parity-latte` |
| `tests/parity.twig.test.ts` | Twig DOM parity via `cmd/parity-twig` |

### Running tests

```bash
bun test                  # all suites
bun run test:watch        # watch mode
bun run verify            # check + typecheck + tests (CI)
```

### Test infrastructure

| Module | Role |
|--------|------|
| `tests/global-setup.ts` | Vitest: regenerate `generated/` before run |
| `tests/preload-bun.ts` | Bun: Svelte SSR + Vue SFC compile plugins |
| `tests/support/ensure-generated.ts` | Write `generated/` once per process |
| `tests/support/fixtures.ts` | Load `*.data.json` showcase cases |
| `tests/support/normalize.ts` | HTML normalization for fair comparison |
| `tests/support/props.ts` | Map canonical props → runtime-specific props |
| `tests/support/generated-ui.ts` | Dynamic import of generated React/Svelte/Vue modules |
| `tests/support/php.ts` | PHP toolchain detection, Composer install, parity runner |

## Parity harnesses

### TypeScript runtimes (`parity.test.ts`)

For each brick × part × fixture:

1. Build canonical HTML via `renderPart()`.
2. Server-render generated component:
   - React: `react-dom/server` `renderToStaticMarkup`
   - Svelte: `svelte/server` `render`
   - Vue: `@vue/server-renderer` `renderToString`
3. Compare `normalizeHtml(actual)` vs `normalizeHtml(expected)`.

Children fixture text: `"Content"` when the part has a children prop.

### Go Templ (`parity.templ.test.ts`)

1. `templ generate` + `go mod tidy` in `generated/`.
2. Pipe JSON cases to `go run ./cmd/parity`.
3. Compare results to canonical renderer.

**Skipped when:** `go version` fails.

Timeout: 300 seconds (Templ compile + Go build).

### PHP Latte / Twig (`parity.latte.test.ts`, `parity.twig.test.ts`)

1. Build cases for PHP-supported parts only (`phpSupported(part).ok`).
2. `composer install` in `generated/` if vendor missing.
3. Pipe JSON to `php cmd/parity-latte/main.php` or `cmd/parity-twig/main.php`.
4. Compare results to canonical renderer.

**Skipped when:** PHP unavailable, or Composer unavailable and `php/vendor` not installed.

Timeout: 120 seconds per suite.

### Harness JSON protocol

**Input** (stdin): array of cases

```json
[
  {
    "template": "button/Button.latte",
    "props": { "variant": "default", "size": "sm" },
    "attrs": {},
    "children": "Content"
  }
]
```

**Output** (stdout): array of HTML strings in the same order.

Go Templ harness uses `name` instead of `template`: `"button/button/Button"`.

## Emitter convention tests

`tests/emitters.test.ts` checks properties DOM parity cannot see:

- Templ: boolean attr syntax, `Attrs` spread, `//go:embed`, `ButtonClasses` export
- React: `forwardRef`, `Slot`, `cn` import
- Svelte: runes, snippet children
- Vue: `inheritAttrs: false`
- Latte/Twig: `n:attr` / `ui8kit_attr_str`, parameter blocks

Runs `generateFiles(bricks)` in-memory — no disk write required.

## Domain unit tests

Cover:

- `composeRecipe` / `validateRecipe`
- Expression evaluators (`cond`, `mapOr`, `oneOfOr`, …)
- `resolveTag`, `titleTag`
- `validateBrick` error cases
- `renderPart` smoke cases

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-go@v5
        with:
          go-version: "1.25"
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.3"
          tools: composer
      - run: bun install --frozen-lockfile
      - run: bun run verify
```

### What `bun run verify` exercises in CI

1. **Definition validation** — all 33 bricks, 63 parts
2. **Engine TypeScript** — strict mode, no emit
3. **Generated TypeScript** — full regenerate + typecheck React outputs
4. **All test suites** including:
   - Domain units
   - Emitter conventions
   - React/Svelte/Vue parity (all 63 parts)
   - Go Templ parity (all 63 parts)
   - Latte parity (60 PHP-supported parts)
   - Twig parity (60 PHP-supported parts)

CI installs Go 1.25, PHP 8.3, and Composer so optional local skips do not apply.

## Local toolchain gaps

| Missing tool | Effect |
|--------------|--------|
| Go | `parity.templ.test.ts` skipped |
| PHP | Latte/Twig parity skipped |
| Composer (no vendor) | Latte/Twig parity skipped |

React/Svelte/Vue parity always runs — core guarantee.

## Adding test coverage for a new brick

1. Add `bricks/<name>/<name>.data.json` with showcase fixtures (optional but recommended).
2. `bun run check` + `bun test` — parity cases appear automatically.

No changes to test files required unless the new brick introduces a novel runtime concern.

## Debugging parity failures

1. Identify failing label: `{brick.id} {part.name} · {fixture.id}`.
2. Reproduce canonical output:

   ```ts
   import { renderPart } from "./src/domain/render";
   // renderPart(brick, "Button", { Variant: "ghost" }, { children: "Content" })
   ```

3. Inspect generated file in `generated/ui/<brick>/`.
4. For PHP: run harness manually:

   ```bash
   cd generated
   echo '[{"template":"button/Button.latte","props":{},"attrs":{},"children":""}]' \
     | php cmd/parity-latte/main.php
   ```

5. Compare raw HTML before normalization if class order differs cosmetically.
