# @ui8kit/xgen-screens

Builder of organism and screen structures from primitives: the view IR, bindings, fixtures and content loaders, route and URL-state planning.

Part of xgen (see `../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## API

- `ir.ts`: the types (`ViewNode`, `Value`, `OrganismSpec`, `ScreenSpec`, `AppSpec`, `CollectionFile`).
- `build.ts`: `use`, `text`, `when`, `each`, `slot`, `organism`, `outlet`, `ref`, `op`, `cond`, `tpl`, `call`, `sortHeader`.
- `authoring/`: the PricingCard organism and the Plans screen, written with the builder. `bun run build` stores them as JSON in `xgen/specs`.
- `validate-view.ts`: `validateOrganism`, `validateScreen`, `contentRefs`.
- `print.ts`: a `Value` as a TypeScript expression (the same text for every TypeScript runtime).
- `load.ts`: `loadInputs`, `loadApp`, `findApps`.
