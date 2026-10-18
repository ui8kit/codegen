# Versions of the specs and migrations

Every JSON file under `xgen/specs` and every `xgen.app.json` carries `specVersion`. The schemas in `xgen/schema/schemas` describe the current version, `SPEC_VERSION` in `xgen/schema/src/versions.ts` (now 1).

## When a shape changes

1. Raise `SPEC_VERSION`.
2. Add the step to `MIGRATIONS` in `xgen/schema/src/versions.ts`: a function that turns a spec of version *n* into version *n + 1*.
3. Describe the change here, with the date, the old shape and the new one.
4. Run `bun run build`; the authored specs are written on the new version, and `xgen check` (group `versions`) names every other file that is still on the old one.

Files the authoring code writes (`organisms`, `parts`, `patterns`, `blocks`, composed `screens`) are rewritten by `bun run build`. Files written by hand (`xgen.app.json`, fixtures) are changed with `migrate()` and committed.

## Log

| Version | Date | Change |
| --- | --- | --- |
| 1 | 2026-10-05 | The first version. Blocks carry `facts`, composed screens carry `requireH1`; both are optional fields of version 1. |
| 1 | 2026-10-06 | Screens as data: screen and composed specs carry an optional `menu` (`[{path, label, screen}]`); `xgen.app.json` describes a host (`screens: ["*"]` allowed) and loses `routes` and `layout`. Kept on version 1 because the 28 per-composition apps were removed in the same change, so no file on the old app shape remains. |
