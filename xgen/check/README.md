# @ui8kit/xgen-check

Checks: schema, props, variants, a11y, drift (packages and apps), coverage, portability contract, text and Cyrillic, the rules group, and real-engine parity of the template runtimes.

Part of xgen (see `../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## API

`runChecks(workspace)` runs: `schema`, `props`, `a11y`, `authored`, `coverage`, `recipes`, `nonportable`, `text`, `blocks`, `registry` (the 92 layouts of the reference catalog), `themes`, `structure` (file and line limits, import cycles, package order, the core names no app), `hardcode` (no arbitrary size, hex or palette color in organisms), `dead` (fixtures, organisms, dictionary keys, untested blocks), `duplicates`, `versions`, `tests`, `rules`, `drift` (and the CLI adds `templ`, `solid`, `twig`, `jinja2`, `latte`: `templCheck`, `solidCheck`, `twigCheck`, `jinja2Check`, `latteCheck`, each rendering every brick and block case and comparing the DOM with React); each returns `{ name, what, problems }`. The limits are in `src/audit-rules.ts`.
`runE2e(workspace)` serves the built host apps, runs one scenario in Chrome (playwright-core, `CHROME` env or `/usr/bin/google-chrome`), writes screenshots to `shots/` and compares the DOM. `XGEN_E2E_ONLY=<prefix>,<prefix>` limits it to the apps whose names start with one.

## Group `rules`

Rules 01, 02, 03 and 06 of `.cursor/rules` on the composition zone (`src/rules`). Zones come from the `ui8kit` field of every
workspace `package.json` (`kit`, `composition`, `blockRoot`, `runtime`); the committed catalog is `rules/zones.json`, and the
kit zone is never scanned. An adapter per runtime (`svelte.ts`: svelte/compiler, `react.ts`: the TypeScript parser, also for Solid, `vue.ts`:
@vue/compiler-sfc, `templ.ts`, and `twig.ts` for Twig, Jinja2 and Latte) turns a file into one small tree (`ir.ts`); the shared detectors (`detectors.ts`) report `block-root`,
`raw-html`, `dynamic-tag`, `raw-native-tag`, `reactive-aria` and `literal-text`.

- Baselines: `rules/baselines/<package>.json`, counts per detector and file. More fails; fewer asks for a new baseline.
- Style baselines: the `corners`, `shadows`, `hardcode` and `spacing` groups also scan the style text of `apps/magazine/src`
  (`src/style-zones.ts`; `packages/panorama`, Three.js and canvas code, is outside every rule zone) against `rules/style-baselines/<package>.json`, written by the same
  `bun run rules:baseline`.
- Self-test: `rules/fixtures/<runtime>/<detector>.{bad,ok}.<ext>`, run inside the group and in `test/rules.test.ts`.
- `bun run rules` counts the findings (`--list` prints them), `bun run rules:baseline` writes the catalog and the baselines,
  `xgen-rules` (packages/tooling) gates one workspace.
- Pre-push: `.githooks/pre-push` runs `bun run check` and `packages/tooling/bin/audit.sh`; enable it with
  `git config core.hooksPath .githooks` (`bun run hooks:install`).
