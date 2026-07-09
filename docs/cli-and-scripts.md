# CLI and scripts

## `ui8kit-codegen` CLI

Entry: `src/infrastructure/cli.ts` (also exposed as `ui8kit-codegen` bin when published).

### Commands

| Command | Description |
|---------|-------------|
| `check` | Validate all brick definitions; no file output |
| `list` | Print every brick ID and part name |
| `generate` | Emit runtime files into output directory |

### `generate` flags

| Flag | Default | Description |
|------|---------|-------------|
| `--out <dir>` | `generated` | Output directory |
| `--go-module <module>` | `github.com/ui8kit/ui` | Go module path in `go.mod` |
| `--runtimes <list>` | all six | Comma-separated: `templ,react,svelte,vue,latte,twig` |

### Examples

```bash
# Validate only
bun src/infrastructure/cli.ts check

# List inventory
bun src/infrastructure/cli.ts list

# Generate everything
bun src/infrastructure/cli.ts generate --out generated

# React + Vue only
bun src/infrastructure/cli.ts generate --runtimes react,vue

# Custom Go module
bun src/infrastructure/cli.ts generate --go-module example.com/myui
```

On generate with `latte` or `twig`, the CLI prints PHP part coverage and skip reasons.

---

## Root package scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `generate` | `bun src/infrastructure/cli.ts generate --out generated` | Emit all runtimes |
| `check` | `bun src/infrastructure/cli.ts check` | Validate definitions |
| `test` | `bun test` | Run all test suites |
| `test:watch` | `bun test --watch` | Watch mode |
| `typecheck` | `tsc --noEmit` | Typecheck engine (`src/`, `bricks/`, `tests/`) |
| `typecheck:generated` | `bun run generate && bun x tsc -p tsconfig.generated.json` | Typecheck generated React/TS |
| `verify` | `check` + `typecheck` + `typecheck:generated` + `test` | Full CI gate |
| `dev:templ` | `cd examples && bun run dev:templ` | Go Templ preview :8080 |
| `dev:react` | `cd examples && bun run dev:react` | React preview :5173 |
| `dev:svelte` | `cd examples && bun run dev:svelte` | Svelte preview :5174 |
| `dev:vue` | `cd examples && bun run dev:vue` | Vue preview :5175 |
| `dev:latte` | `cd examples && bun run dev:latte` | Latte preview :5176 |
| `dev:twig` | `cd examples && bun run dev:twig` | Twig preview :5177 |
| `build:html` | `cd examples && bun run build:html` | Static HTML export |
| `build:css` | `cd examples && bun run build:css` | Tailwind CSS for examples |

---

## Examples package scripts (`examples/package.json`)

| Script | Purpose |
|--------|---------|
| `build:css` | `tailwindcss` compile `web/static/css/input.css` → `app.css` |
| `gen:templ` | Run `templ generate` on `generated/` and `examples/templ/` |
| `composer:install` | `composer install` in `generated/` (with phar fallback) |
| `dev:templ` | `gen:templ` + `build:css` + Go HTTP server on :8080 |
| `dev:react` | `build:css` + Vite (React) on :5173 |
| `dev:svelte` | `build:css` + Vite (Svelte) on :5174 |
| `dev:vue` | `build:css` + Vite (Vue) on :5175 |
| `dev:latte` | `composer:install` + `build:css` + PHP server on :5176 |
| `dev:twig` | `composer:install` + `build:css` + PHP server on :5177 |
| `build:html` | `build:css` + `react/script/generate-static.tsx` |

---

## Example helper scripts (`examples/scripts/`)

### `composer-install.mjs`

Installs PHP dependencies into `generated/`:

1. Tries `composer install` in `generated/`.
2. Falls back to downloading `composer.phar` if global Composer is unavailable.
3. Requires PHP 8.1+ (`resolve-php.mjs`).

### `resolve-php.mjs`

Resolves PHP binary:

- Honors `PHP` environment variable.
- Searches common install paths on Windows/macOS/Linux.

### `php-server.mjs`

Starts PHP built-in server for Latte or Twig previews:

```bash
bun scripts/php-server.mjs latte [port]   # default 5176
bun scripts/php-server.mjs twig [port]    # default 5177
```

Document root: `examples/latte/` or `examples/twig/` (each has `server.php`).

### `generate-static.tsx` (`examples/react/script/`)

Renders React welcome view with `renderToStaticMarkup`, wraps in HTML shell, writes multi-route static export to `examples/html/`.

---

## TypeScript configs

| File | Scope |
|------|-------|
| `tsconfig.json` | Engine: `src/`, `bricks/`, `tests/` |
| `tsconfig.generated.json` | Generated: `generated/ui/**/*.ts(x)`, `generated/utils/` |

---

## Bun configuration (`bunfig.toml`)

```toml
[test]
preload = ["./tests/preload-bun.ts"]
```

Preload registers Bun plugins to compile Svelte SSR and Vue SFCs before parity tests import them.

---

## Vitest configuration (`vitest.config.ts`)

Used when running tests via Vitest directly (project primarily uses `bun test`):

- `globalSetup`: `tests/global-setup.ts` — regenerates `generated/` before run
- `include`: `tests/**/*.test.ts(x)`
- Plugins: Svelte (runes), Vue
- `resolve.conditions`: `["node"]` for SSR builds

---

## Generated artifacts (not in git)

`generated/` is gitignored. Created by:

- `bun run generate`
- Test global setup / `ensureGenerated()`
- `bun run typecheck:generated`

Never commit `generated/` — CI and tests regenerate it on every run.
