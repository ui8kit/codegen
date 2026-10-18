# @ui8kit/xgen-runtime-solid

SolidJS 1.9 emitter: bricks, organisms, screens and the host app scaffold, written into `packages/solid/ui` and `apps/host-solid`.

Part of xgen (see `../README.md`, `../../README.md` and the author guide `../../../docs/specs-guide.md`). Tests: `bun test`.

## How it emits

- `src/emit.ts` (`SolidEmitter`): one `<stem>.tsx` per one-part brick, one `<part>.tsx` per part otherwise. The variant table sits at
  the top of the file (shadcn style); components read props through `splitProps` so every prop stays reactive; a polymorphic root
  is `<Dynamic>`; a branch is `<Show>`, a list `<For>`. There is no Radix-style `asChild` (React only): style another element with
  the exported variant table, as in Svelte and Vue.
- `src/jsx.ts`, `src/dom.ts`: the JSX printer of the render tree and the DOM attribute types of the roots.
- `src/view.ts`: organisms and screens from the view IR through the shared walker of `@ui8kit/xgen-runtime-core` (a `Syntax`).
- `src/app.ts`: the host scaffold (`apps/host-solid`, port 5183) that lazy-loads one screen per chunk.

## Check group `solid`

`bun run check` renders every brick case (118) and every gallery block case (474) on the server (babel-preset-solid with
`generate: "ssr"`, then `solid-js/web` `renderToString`), compares the DOM with the React package and runs html-validate over every
block case (`xgen/check/src/solid`). The package is typechecked by `bun run typecheck`; the host joins `bun run e2e` and the DOM pair test.

## Prerequisites

None beyond `bun install`: Solid, babel and the preset are dev dependencies of the workspace. The group never skips.
