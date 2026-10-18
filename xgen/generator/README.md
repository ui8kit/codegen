# @ui8kit/xgen-generator

Build orchestrator: plans every generated file of the packages and apps, writes them with a manifest of hashes.

Part of xgen (see `../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## API

`planBuild(workspace)` returns a `Plan`: for every target (`packages/{svelte,react,vue,solid,templ,twig,jinja2,latte}/ui`, `packages/shared/app`, `apps/host-*`) the list of `{ path, contents }`, in memory.
`write(plan)` writes the files and a `.xgen-manifest.json` (sha-256 per file) and removes files a previous build wrote and this one does not.
`drift(plan)` compares the plan with the disk and returns the problems.
