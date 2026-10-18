# @ui8kit/xgen-runtime-core

Shared emitter helpers (types, shared module, expression printer) and the TypeScript runtime support files copied into generated packages.

Part of xgen (see `../README.md` and `../../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## Assets

`assets/ts` (the `utils` of every generated package: `cn`, variants/compound, expressions, tags, `format`), `assets/styles` (`theme.css`, `kit.css`),
`assets/app` (`core.ts`: Codex mapping, search/sort/page, routes, the URL as a port, screen actions; `fields.ts`: the central Codex field maps by kind (product, post, plan), listed per block in `xgen/schema/codex/blocks.json`; `theme.ts`). All pure TypeScript, shared by every TypeScript runtime.
