# Latte theme bundle

Profile for WordPress / theme consumers that need **only** Latte primitives
and the PHP runtime — not the full six-runtime `generated/` tree.

## Command

```bash
bun run generate:latte-bundle -- --out /path/to/ui8kit-latte
```

Default `--out` is `generated/latte-bundle`.

## What is included

| Path | Role |
|------|------|
| `ui/<brick>/<Part>.latte` | 60 supported parts |
| `ui/<brick>/*.variants.json` | Shared recipes |
| `php/UI8Kit/Rt.php` | Expression helpers |
| `php/UI8Kit/Classes.php` | Class helpers (all 63 parts) |
| `composer.json` | Package `ui8kit/latte-primitives` (Latte only) |
| `manifest.json` | Coverage + skip summary |
| `README.md` | Consumer notes |

## What is excluded

- Twig templates / `TwigExtension`
- `cmd/parity-latte` harness
- React / Svelte / Vue / Templ / TS barrels

## wp-fasty integration

In the [wp-fasty](https://github.com/godudy/wpfasty) monorepo:

```bash
bun run ui:primitives   # → .workspaces/ui8kit-latte
```

Codegen is expected as `packages/ui8kit-codegen` (git submodule) or via
`UI8KIT_CODEGEN` / a sibling checkout.
