# AGENTS.md — @ui8kit/codegen

Spec-driven generator: `bricks/<name>/<name>.def.ts` is the single source of truth; emitters in
`src/emitters/` print it into React, Svelte 5, Vue 3, SolidJS, Web Components and Go templ.
`generated/` is build output (git-ignored) — never edit it, change the brick or the emitter.

## Commands

- `bun run verify` — must stay green (check, generate, tsc, generated typecheck, all tests).
- `bun run generate [-- --runtimes …,templ]` — writes `generated/`.
- templ: `cd generated/templ && templ generate && go vet ./... && go build ./...`.

## Runtime contract

- Every runtime renders the same DOM, classes (tokens) and ARIA as React / the canonical
  renderer (`src/domain/render.ts`). Parity tests prove it: `tests/parity*.test.ts`.
- New runtime ⇒ add an emitter, a real-engine parity test (no mocks), CI setup, rules entry in
  `templates/rules/runtimes.json`, README section.
- `UI8KIT_REQUIRE_ALL_RUNTIMES=1` (set in CI) turns a missing toolchain (Go/templ) into a
  failure; locally the suite skips with a message.

## Go templ specifics

- Output `generated/templ/` (own Go module, templ `v0.3.1070`, Go 1.26); helpers come from
  `runtime/go/*.go` (+ `go.sum`), tag groups are generated from `src/domain/tags.ts`.
- No asChild/Slot: each part with a class contract exports `<Name>Classes(p <Name>Props) string`
  — the escape hatch for custom roots.
- Dynamic tags (Box/Text `Tag`) become a `switch` with one static element per allowed tag;
  `when` branches (Button/Link `Href`) repeat `{ children... }`; items (Select `Options`) loop
  with `for _, item := range`.
- Go zero values mean "unset": empty strings omit attributes; prop `default`s are unsupported
  (the emitter throws). Explicit empty attributes go through `Attrs`.
- **Children are trusted HTML** (`{ children... }`, `templ.Raw` in the harness). Props and text
  are escaped by templ; never route user input into raw children (XSS).
