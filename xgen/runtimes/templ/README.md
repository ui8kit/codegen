# @ui8kit/xgen-runtime-templ

Go [templ](https://templ.guide) emitter: the bricks as `.templ` components with typed props structs, the organisms as templ
components over dynamic values, and the Go helpers. Output: `packages/templ/ui` (Go module
`github.com/ui8kit/codegen/packages/templ/ui`, templ `v0.3.1070`).

Part of xgen (see `../README.md` and the author guide `../../../docs/specs-guide.md`). Tests: `bun test`.

## How it emits

- `src/templ.ts` (`TemplEmitter`): one `ui/<brick>/<stem>.templ` per brick with a `<Part>Props` struct per part, exported
  `<Part>Classes` helpers, and a `<stem>_gen.go` that embeds the brick's `*.variants.json` recipes.
- `src/organism.ts`: one `blocks/<name>.templ` per portable organism (blocks, parts, patterns) in the Go package `blocks`. Values are
  dynamic (`any`, the JSON shapes) and read with `utils/dyn.go`, which follows the TypeScript rules (truthiness, `===`, `String()`,
  `cn`). Events are left out: templ output is static HTML. The recipes and presets an organism reads are embedded next to it.
- `src/go-expr.ts`: the expression printer for Go. `src/go-harness.ts`: the parity programs `cmd/parity` and `cmd/parity-blocks`.
- `assets/go/*.go`: the helpers copied into `utils/` (`cn_merge.go` is a tailwind-merge port, `variants_json.go` the recipe reader,
  `tags.go`/`heading.go` the allowed dynamic tags). `assets/LucideIcon.templ` is the icon asset with its glyph registry.

The generator side is `xgen/generator/src/templ.ts` (package files, README, go.mod) and `organisms.ts` (the shared organism pass).

## Check group `templ`

`templ generate`, `go mod tidy`, `go vet ./...`, `go build ./...`, then `go run ./cmd/parity` and `./cmd/parity-blocks` render every
brick case (118) and block case (474) and the DOM is compared with React; html-validate runs over every block case
(`xgen/check/src/templ`). The rules group reads `blocks/*.templ` with `xgen/check/src/rules/templ.ts`.

## Prerequisites

Go (the version in `packages/templ/ui/go.mod`). The templ CLI is found on the PATH, in `~/go/bin`, or run through `go run` at the
pinned version. Without Go the group prints `skipped: no Go toolchain`; with `UI8KIT_REQUIRE_ALL_RUNTIMES=1` a skip is a failure.
