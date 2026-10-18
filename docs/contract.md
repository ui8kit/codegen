# Data contract: Codex v0.4 and `@ui8kit/contract`

xgen never hard-codes sample data in a view. Blocks and screens read **Codex v0.4 collections**, the content contract of
[`@ui8kit/contract`](https://github.com/ui8kit/contract) (types, JSON Schemas and a strict validator).

| File | What | Gate |
|---|---|---|
| `xgen/fixtures/<collection>.json` | Codex entries (77 collections, 733 entries, 62 kinds) | `bun run codex:validate` (`validateCollectionV04`), schema group |
| `xgen/fixtures/taxonomies/*.json` | taxonomy bundles (definition + terms) | same |
| `xgen/schema/codex/manifest.json` | every kind, its record type and fields, menus, taxonomies | written by `codex:manifest`, validated against `@ui8kit/contract/schemas/manifest.schema.json` |
| `xgen/schema/codex/blocks.json` | for every kit block and screen: the collections, kinds, record types and required / optional fields it reads, labels, settings, empty state | written by `codex:blocks`; `codex` group fails on drift; `xgen/schema/test/blocks.test.ts` checks every binding against the manifest |
| `xgen/runtimes/core/assets/app/fields.ts` | the central field maps (`CODEX_FIELDS`) from Codex entries to the record types of the organisms | copied into `packages/shared/app` |

At run time the hosts and any consumer turn entries into records with `fromCodex(collection, CODEX_FIELDS.<map>)`
(`packages/shared/app/src/runtime/core.ts`). A CMS or API that serves Codex v0.4 can feed the blocks directly.

`@ui8kit/contract` is a dependency of `@ui8kit/xgen-schema` (`^0.2.0`, Codex schema line v0.4).
