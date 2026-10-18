# Architecture

## Flow

```
xgen/specs/ui/*.json (+ *.variants.json) ─┐
xgen/specs/_nonportable.json              │  @ui8kit/xgen-spec     (load, validate, normalize bricks; canonical renderer)
xgen/screens/src/authoring/*.ts ──────────┼─ @ui8kit/xgen-screens  (view IR builder -> specs/{parts,patterns,organisms,blocks,presets,screens})
xgen/fixtures/*.json (Codex v0.4) ────────┤  @ui8kit/xgen-schema   (JSON Schemas, Codex manifest, @ui8kit/contract validation)
xgen/content/ui/en.json ──────────────────┤
apps/host-*/xgen.app.json ────────────────┘
                 │
                 ▼
       @ui8kit/xgen-generator  ── runtimes/{svelte,react,vue,solid,templ,twig,jinja2,latte} (+ runtimes/core)
                 │
                 ├─► packages/{svelte,react,vue,solid}/ui      TypeScript UI packages (source only)
                 ├─► packages/{templ,twig,jinja2,latte}/ui     server templates + Go / PHP / Python helpers
                 ├─► packages/shared/app                       dictionary, data, menus, URL/runtime core, skins (emitted once)
                 └─► apps/host-{svelte,react,vue,solid}        one host per TS runtime; every screen is a lazy chunk at /<screen>/
```

`xgen build` writes every target with a `.xgen-manifest.json` (sha-256 of every file). `xgen check` plans the same build in
memory and compares it with the disk (`drift`).

## Tiers

- **Bricks** (`xgen/specs/ui`): the only place that names HTML tags. Props, recipes (CVA-style variant tables with
  compound variants), slots, events, ARIA, `data-*` hooks, tokens, examples, portability.
- **Parts and patterns** (`specs/parts`, `specs/patterns`): components composed from bricks (`src/components`).
- **Organisms** (`specs/organisms`): page sections (`src/blocks`), typed props, render-prop slots, events.
- **Blocks** (`specs/blocks`): an organism plus its axes and named variants, the unit of the gallery and the registry.
- **Screens** (`specs/screens`): routes, URL state, menus, the blocks of a page; served by the host apps.

Organisms, blocks, presets and screens are written with the TypeScript builder (`xgen/screens/src/authoring`) and stored
as JSON; the `authored` group fails when the JSON differs from the builder.

## Packages

| package | folder | job |
|---|---|---|
| `@ui8kit/xgen-schema` | `xgen/schema` | JSON Schemas (spec, variants, organism, block, screen, app, collection, dictionary, preset), Codex manifest and block data |
| `@ui8kit/xgen-spec` | `xgen/spec` | brick loader, typed render model, recipes, canonical renderer; `tools/import-codegen.ts` imports 0.1 bricks |
| `@ui8kit/xgen-screens` | `xgen/screens` | view IR (`use`, `text`, `when`, `each`, `slot`, `organism`, `outlet`), builder, validation, loaders, route/URL planning |
| `@ui8kit/xgen-runtime-core` | `xgen/runtimes/core` | shared emitter helpers and the runtime assets (utils, styles, skins, app runtime) |
| `@ui8kit/xgen-runtime-*` | `xgen/runtimes/<rt>` | one emitter per runtime; Twig is the dialect base of Jinja2 and Latte |
| `@ui8kit/xgen-generator` | `xgen/generator` | the build plan of every target, writer, drift |
| `@ui8kit/xgen-check` | `xgen/check` | the check groups, parity gates, e2e, screenshots, visual gate |
| `@ui8kit/xgen` | `xgen/cli` | the `xgen` command |
| `@ui8kit/xgen-tooling` | `packages/tooling` | rules, zones, ui8px gate and pre-push audit as bins |

The xgen packages depend only on each other (never on `packages/` or `apps/`); the folder can be synced with the
codegen-x/ui8kit monorepo, where the same layer also feeds hand-written apps.

## Checks (`bun run check`)

`schema`, `props`, `a11y`, `authored`, `coverage`, `recipes`, `nonportable`, `text`, `dictionary`, `blocks`, `registry`,
`themes`, `routes`, `structure`, `hardcode`, `corners`, `shadows`, `spacing` (8 + 4 grid, no half steps), `readability`,
`dead`, `duplicates`, `versions`, `tests`, `rules` (composition rules 01/02/03/06 on every runtime), `codex`, `drift`, and
the real-engine parity groups `templ`, `solid`, `twig`, `jinja2`, `latte` (every brick case and every block case renders
the same normalized DOM as React; every block document passes html-validate).
