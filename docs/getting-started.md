# Getting started

## Prerequisites

| Tool | Version | Required for |
|------|---------|--------------|
| [Bun](https://bun.sh) | latest | package manager, test runner, CLI execution |
| [Go](https://go.dev) | 1.25+ | Templ parity tests, Templ examples |
| [PHP](https://www.php.net) | 8.1+ | Latte/Twig parity tests and examples |
| [Composer](https://getcomposer.org) | latest | PHP dependencies in `generated/` |

Go and PHP toolchains are **optional locally** — their parity suites are skipped when the binary is not on `PATH`. CI installs all three.

## Install

```bash
git clone <repo-url>
cd Codegen
bun install
```

## Validate and generate

```bash
bun run check       # validate all brick definitions (no I/O)
bun run generate    # emit all six runtimes into generated/
```

Generate with custom options:

```bash
bun src/infrastructure/cli.ts generate \
  --out generated \
  --go-module github.com/ui8kit/ui \
  --runtimes templ,react,svelte,vue,latte,twig
```

On generate, when Latte or Twig is requested, the CLI prints PHP coverage:

```
PHP runtimes (latte/twig): 60/63 parts.
  skipped breadcrumb/Breadcrumb: forEach over typed items
  skipped icon/Icon: root is not a single element (branched roots need per-branch slots)
  skipped select/Select: forEach over typed items
```

## Verify (full CI-equivalent check)

```bash
bun run verify
```

This runs, in order:

1. `bun run check` — definition validation
2. `tsc --noEmit` — engine typecheck
3. `bun run typecheck:generated` — regenerate + typecheck generated React/TS outputs
4. `bun test` — domain units + parity suites

## Run tests only

```bash
bun test
bun test --watch    # via npm script: bun run test:watch
```

Tests auto-regenerate `generated/` before parity runs (see [Testing and CI](./testing-and-ci.md)).

## Local welcome previews

After generating:

```bash
cd examples && bun install && bun run build:css
```

From the repo root:

```bash
bun run dev:templ   # http://127.0.0.1:8080
bun run dev:react   # http://127.0.0.1:5173
bun run dev:svelte  # http://127.0.0.1:5174
bun run dev:vue     # http://127.0.0.1:5175
bun run dev:latte   # http://127.0.0.1:5176
bun run dev:twig    # http://127.0.0.1:5177
bun run build:html  # static export → examples/html/
```

See [Examples](./examples.md) for layout and PHP setup.

## Consuming generated output

### Go Templ

```bash
cd generated
templ generate && go build
```

Set `--go-module` at generate time to control `go.mod` module path (default: `github.com/ui8kit/ui`).

### React / Svelte / Vue

Import from `generated/ui/`. Peer dependencies: `react`, `svelte`, or `vue`, plus `clsx` and `tailwind-merge` for the shared `cn()` helper.

Typecheck generated TS:

```bash
bun run typecheck:generated
```

### Latte / Twig

```bash
cd generated
composer install    # vendor-dir: php/vendor
```

Point a `Latte\Engine` `FileLoader` or Twig `FilesystemLoader` at `generated/ui/`. Register `UI8Kit\TwigExtension` for Twig.

Children are pre-rendered HTML strings — compose nested bricks with `{capture}` (Latte) or `{% set %}` (Twig). See `examples/latte/` and `examples/twig/`.

### PHP system packages (Ubuntu)

```bash
sudo apt-get install -y php-cli php-xml php-mbstring composer
```

## CLI entry points

| Command | Entry |
|---------|-------|
| `bun run generate` | `bun src/infrastructure/cli.ts generate --out generated` |
| `bun run check` | `bun src/infrastructure/cli.ts check` |
| `ui8kit-codegen` | `./bin/ui8kit-codegen.js` (if published) |

List all bricks and parts:

```bash
bun src/infrastructure/cli.ts list
```
