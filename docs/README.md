# UI8Kit Codegen — Documentation

Spec-driven codegen engine for UI8Kit `ui/` primitives. One typed render contract per brick, six generated runtimes (plus a static HTML export), and DOM parity verified by tests.

## Contents

| Document | Description |
|----------|-------------|
| [Overview](./overview.md) | Goals, runtimes, scope, repository layout |
| [Getting started](./getting-started.md) | Install, generate, verify, consume outputs |
| [Architecture](./architecture.md) | Domain model, expression IR, render tree, emitters, pipeline |
| [Brick definitions](./bricks.md) | Authoring bricks, DSL, fixtures, validation, adding a brick |
| [Runtimes](./runtimes.md) | Go Templ, React, Svelte, Vue, Latte, Twig, static HTML |
| [Cross-runtime contract](./contract.md) | Prop naming, variants, classes, attrs, children, tags |
| [CLI and scripts](./cli-and-scripts.md) | `ui8kit-codegen` CLI, npm/bun scripts, example tooling |
| [Testing and CI](./testing-and-ci.md) | Test suites, parity harnesses, toolchains, GitHub Actions |
| [Examples](./examples.md) | Seven welcome previews, static export, local dev servers |
| [PHP complex parts](./php-complex-parts.md) | The three structurally complex parts skipped by Latte/Twig |

## Quick reference

```bash
bun install
bun run check          # validate all brick definitions
bun run generate       # emit all runtimes into generated/
bun test               # domain + parity (Go/PHP optional)
bun run verify         # check + typecheck + tests (CI command)
```

**Inventory:** 33 bricks · 63 exported parts · 60 PHP template parts · 6 codegen runtimes

For the high-level project README, see [../README.md](../README.md).
