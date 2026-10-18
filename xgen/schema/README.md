# @ui8kit/xgen-schema

JSON Schemas of xgen (spec, variants, organism, screen, app, collection) and a validator over them.

Part of xgen (see `../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## Codex v0.4 manifest of the fixtures

`codex/manifest.json` describes every entry kind of `xgen/fixtures` (one resource per kind; money fields carry the rule `fastygo.codex/money` = integer minor units next to `currency`; dates are `datetime`, RFC 3339). Regenerate with `bun run codex:manifest`; `test/codex.test.ts` fails when it is stale. `bun run codex:validate` runs the `@ui8kit/contract` v0.4 validator (npm package `@ui8kit/contract` ^0.2.0, a devDependency of this package) over all fixtures with this manifest, and checks the manifest against the `manifest.schema.json` the package ships. The UI formats the raw values: money through `fmtMoney(minor, currency)`, dates through field-path pipes (`metadata.date.value|date`, `|ago`, `|ago-days`, `|ago-short`) in `fromCodex`.

## Block data manifest

`codex/blocks.json` (schema `codex/blocks.schema.json`) lists every kit block, screen spec, magazine template and taste screen with the
entry kinds it reads; a block with status `done` also names its central field map (`CODEX_FIELDS` in
`xgen/runtimes/core/assets/app/fields.ts`), the required and optional entry fields, settings props and dictionary labels.
`test/blocks.test.ts` checks the fields against `codex/manifest.json`, the fixtures against the contract validator and the mapping.
The file is generated: `bun run codex:blocks` (`src/codex-blocks.ts`) derives ids, sources, bindings, settings, labels, empty state and
uses from the specs, templates and screens and keeps the hand fields (`status`, `required` / `optional`, `note`, `emptyMode`);
`xgen check` group `codex` fails when it is behind the sources.
Inventory and mismatches: `xgen/docs/block-data.md`.
