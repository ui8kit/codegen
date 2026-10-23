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

## Jinja2 specifics

- Output `generated/jinja2/` (one `ui/<brick>/<part>.html.j2` per part); Python helpers come
  from `runtime/python/` (`ui8kit_jinja`, ported from xgen tag `xgen-archive-2026-10-23`),
  `ui8kit_jinja/classes.py` is generated. Local check: `pip install jinja2` then
  `bun test tests/parity.jinja2.test.ts` (`PYTHON=` overrides the interpreter).
- No asChild/Slot: each part with a class contract gets a `<name>_classes(p)` Jinja global.
- **Children are trusted HTML** (`{{ children|safe }}`, repeated per branch); never route user
  input into children (XSS). Props/text are autoescaped.

## Twig / Latte specifics

- Output `generated/twig/` and `generated/latte/` (Composer packages, `twig/twig ^3`,
  `latte/latte ^3`); emitters `src/emitters/{twig,latte,php-common}.ts`, PHP helpers copied from
  `runtime/php/*.php` (`__NAMESPACE__` → `UI8Kit\Twig` / `UI8Kit\Latte`); `Tags.php` and
  `Classes.php` are generated.
- No asChild: `Classes::<part>Classes(array $props)` (Twig: `ui8kit_classes('<part>Classes', {…})`).
- Dynamic tags: `if` chain, one static element per allowed tag; slot repeated per branch; Select
  options loop over `options`.
- **Children are trusted HTML** (`|raw` / `|noescape`); never route user input into them (XSS).
- Parity: `tests/parity.{twig,latte}.test.ts` (shared `tests/support/php-parity.ts`); CI uses
  `shivammathur/setup-php` (PHP 8.3 + Composer).
