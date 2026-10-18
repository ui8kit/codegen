# Migrating from `@ui8kit/codegen` 0.1 to 2.0

2.0 replaces the 0.1 engine (TypeScript brick DSL + one emitter per runtime writing `generated/`) with **xgen**, the
generation layer of ui8kit 2.0 (ported from codegen-x/ui8kit). It is a breaking release: sources, outputs, file names,
recipes and the import paths of the engine all change. 0.1 stays available at commit
[`972b492`](https://github.com/ui8kit/codegen/tree/972b492) (the last 0.1 state of `main`); a git pin on that SHA keeps
working.

## What changed

| | 0.1 | 2.0 |
|---|---|---|
| Brick source | `bricks/<name>/<name>.def.ts` (DSL from `bricks/_dsl.ts`) + `*.variants.json` + `*.data.json` | `xgen/specs/ui/<name>.json` + `<name>.variants.json` (JSON Schema `xgen/schema/schemas/spec.schema.json`); showcase data are `examples` in the spec |
| Above bricks | none | parts, patterns, organisms, blocks, presets, screens (`xgen/specs/*`, written with the builder in `xgen/screens/src/authoring`) |
| Runtimes | templ, react, svelte, vue, solid, latte, twig (7) | svelte, react, vue, solid, templ, twig, latte, **jinja2** (8); every brick and block, PHP parts no longer skipped |
| Output | one tree `generated/ui/<brick>/` with every runtime side by side | one package per runtime: `packages/<runtime>/ui`, plus `packages/shared/app` and `apps/host-*` |
| File names | `Button.svelte`, `button.tsx`, `button.solid.tsx`, `Button.latte`, `Button.html.twig` | kebab-case per package: `src/primitives/button/button.svelte`, `.tsx`, `.vue`; `ui/button/button.templ`, `.html.twig`, `.latte`, `.html.j2` |
| Go module | `github.com/ui8kit/ui` (flag `--go-module`) | `github.com/ui8kit/codegen/packages/templ/ui`; templ `v0.3.1001` -> `v0.3.1070` |
| CLI | `bun src/infrastructure/cli.ts generate --out generated --runtimes ...` | `bun run build` (`xgen build`), `bun run check` (`xgen check`), `xgen list / e2e / shot / visual` |
| Verify | `bun run verify` = check + tsc + typecheck:generated + vitest/bun parity | `bun run verify` = `xgen check` (drift + 5 real-engine parity groups + style and rule gates) + `codex:validate` + `typecheck` (tsc, svelte-check, vue-tsc) + `bun test xgen` |
| Data | none | Codex v0.4 fixtures validated with `@ui8kit/contract` |
| Static HTML export, Latte bundle, `examples/` welcome screens | `build:html`, `generate:latte-bundle`, `examples/` | removed; the host apps serve every screen (`bun run build:hosts`), previews live in ui8kit/site |

### Engine API (deep imports)

0.1 consumers imported internals: `@ui8kit/codegen/bricks/index` (`bricks`), `bricks/_dsl`, `src/domain/validate`
(`validateRegistry`), `src/emitters/*`, `tests/support/{fixtures,normalize,...}`. None of these exist in 2.0. Equivalents:

| 0.1 | 2.0 |
|---|---|
| `bricks` (array of brick objects) | `loadSpecs(xgenRoot)` from `@ui8kit/xgen-spec` (`xgen/spec/src`): `{ bricks: LoadedBrick[], problems }`, `LoadedBrick.brick` is the typed model |
| `validateRegistry` | `loadSpecs` problems + `bun run check` (schema, props, a11y, coverage ...) |
| per-runtime emitters | `SvelteEmitter`, `ReactEmitter`, `VueEmitter`, `SolidEmitter` (`@ui8kit/xgen-runtime-*`), template runtimes via `@ui8kit/xgen-generator` (`templFiles`, `twigFiles`, ...) |
| `generateFiles(...)` to `generated/` | `planBuild(workspace)` + `write(plan)` from `@ui8kit/xgen-generator` |
| `tests/support/fixtures` `showcaseCases` | `examples` of each spec (`spec.examples`, `children` for the other parts) |
| `tests/support/normalize` | `xgen/check/src` parity helpers (internal; DOM normalisation per runtime group) |
| brick DSL for local bricks | write a JSON spec in `xgen/specs/ui`; to convert existing 0.1 bricks: `CODEGEN_DIR=<dir with bricks/index.ts> RECIPES_DIR=<dir> bun xgen/spec/tools/import-codegen.ts <xgenRoot>` |

### Recipes and DOM

The bricks were reworked for ui8kit 2.0 (see the recipes in `xgen/specs/ui/*.variants.json`):

- **Grid**: no half steps (`gap-1.5` of Button `sm` and CardHeader is gone; `spacing` gate fails on any `x.5` step).
  Controls `sm / default / lg` = `h-8 / h-10 / h-12` (0.1: `h-8 / h-9 / h-10`).
- **Corners**: one token, plain `rounded` (`--radius`) instead of `rounded-md` / `rounded-lg`.
- **Shadows**: none on flat surfaces (0.1 `shadow-xs` on buttons and inputs is gone); floating layers only.
- **Button**: `layout` axis (`default`, `icon`) replaces size `icon`; `inset-ring` borders instead of `border`.
- New bricks: `button-plain`, `link-plain`, `lucide-icon` (Lucide registry), `range`, `skeleton`, form parts
  (`fieldset`, `legend`, `form-item`, `form-description`, `form-message`), `meter`, `progress`, `summary`, table cells,
  and the two bricks upstreamed from saas-design: **`themetoggle`** (`ThemeToggle`) and **`sheet`**
  (`Sheet`, `SheetTrigger`, `SheetClose`).

## Adopting 2.0 in saas-design

saas-design pins `github:ui8kit/codegen#972b492` in `packages/ui/package.json` and wraps the 0.1 registry in
`packages/ui/scripts/registry.ts` (semantic `ui-*` classes, local bricks, `SNAP` of half steps). Steps:

1. **Local bricks.** Delete `packages/ui/bricks/{themetoggle,sheet,_lucide.ts,index.ts}`: `ThemeToggle`, `Sheet`,
   `SheetTrigger` and `SheetClose` are upstream (`xgen/specs/ui/themetoggle.json`, `sheet.json`) with the same DOM, ARIA
   and `data-ui8kit` hooks (`theme-toggle`, `sheet`, `sheet-overlay`, `sheet-trigger`, `sheet-close`; the inline SVGs drop the legacy `focusable="false"`), so
   `packages/ui/behaviors/ui8kit.js` keeps working. The classes that lived in `packages/adapter/src/base.css`
   (`ui-themetoggle-sun/moon`, `ui-sheet-overlay/panel/icon-*`) are now utilities in the spec (`dark:block`,
   `in-aria-expanded:hidden`, ...); the recipes use `rounded` (not `rounded-full`) and the panel `shadow-lg` (not `shadow-xl`).
   Keep a recipe override in `packages/ui/recipes` if the pill shape is wanted.
2. **Half steps.** Remove the `SNAP` map in `registry.ts`; upstream has no half step and `xgen check` keeps it so
   (backlog `codegen-half-steps.md` can be closed).
3. **Generator.** Two options:
   - *Consume the generated packages* (simplest): take `packages/svelte/ui` and `packages/templ/ui` from a pinned commit
     of ui8kit/codegen (git submodule, sparse checkout or a copy script), or install items with the ui8kit CLI from a
     registry built from this repository (see `docs/registry.md`). Utilities stay Tailwind classes; the adapter becomes
     optional.
   - *Keep semantic classes*: port `registry.ts` to the JSON model: `loadSpecs(<codegen>/xgen)` instead of
     `bricks/index`, rewrite the same class positions (`recipe` tables, `classes.staticBase`, `classes.state`, static
     `class` attributes, `lit` / `mapOr` / `cond` expressions) on the loaded bricks, then emit with `SvelteEmitter` and
     the templ emitter of `@ui8kit/xgen-runtime-templ`. Showcase cases come from `spec.examples`.
4. **templ.** Regenerate with `go run github.com/a-h/templ/cmd/templ@v0.3.1070 generate` (the 2.0 runtime pins
   v0.3.1070; backlog `templ-version-pin.md`). Go imports move to `github.com/ui8kit/codegen/packages/templ/ui/...`
   if the package is consumed as a module, or stay under saas-design's own module path if emitted locally.
5. **Parity tooling.** `@ui8kit/codegen/tests/support/*` is gone; the parity of every brick case across runtimes is part
   of `xgen check` upstream, so saas-design's `scripts/parity.ts` only has to cover its own class rewrite.
6. **Svelte Link warning.** Fixed upstream: the Svelte emitter marks the anchor of `Link` / `LinkPlain` with
   `svelte-ignore a11y_no_noninteractive_tabindex` (backlog `codegen-svelte-link-a11y-tabindex.md` can be closed).
7. **Still open upstream** (not changed by 2.0): not published to npm and no `classMode: "semantic"` option (backlog
   `codegen-not-on-npm-no-recipe-override.md`); Icon still emits `icon-<name>` classes; no portal slot for the Sheet
   (backlog `ui-behaviors-sheet-portal.md`).

## For other 0.1 consumers

- Pin `972b492` to stay on 0.1, or move to the generated package of your runtime under `packages/<runtime>/ui`.
- Regenerate nothing by hand: change a spec in `xgen/specs`, run `bun run build`, then `bun run check`.
