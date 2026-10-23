# @ui8kit/codegen

<!-- ui8kit-ecosystem:start -->
> **UI8Kit 3 ecosystem**
>
> - [github.com/ui8kit/codegen](https://github.com/ui8kit/codegen) — generator of primitives (spec → `generated/`)  ← **you are here**
> - [github.com/ui8kit/registry](https://github.com/ui8kit/registry) — packed per-runtime registry on npm/CDN — [npm `@ui8kit/registry`](https://www.npmjs.com/package/@ui8kit/registry)
> - [github.com/ui8kit/cli](https://github.com/ui8kit/cli) — installer `ui8kit` — [npm `ui8kit`](https://www.npmjs.com/package/ui8kit)
>
> Pipeline: codegen (spec → `generated/`) → registry (pack `r/<rt>/`) → CDN (unpkg / jsDelivr) → cli (`init` / `add`) → app
<!-- ui8kit-ecosystem:end -->

Spec-driven code generator for **style-agnostic HTML primitives**. Each primitive is defined once
as a typed render contract (`bricks/<name>/<name>.def.ts`); emitters print it into six
runtimes, and parity tests prove every runtime renders the same DOM/ARIA as the canonical renderer.

Runtimes: **React 19 · Svelte 5 · Vue 3 · SolidJS · Web Components** (vanilla, light DOM) ·
**Go [templ](https://templ.guide)** (server-rendered, first of the template runtimes).
PHP template runtimes: **[Twig](https://twig.symfony.com) · [Latte](https://latte.nette.org)**.

## Documentation

**[docs/](docs/README.md)** is the single home for primitives documentation: one page per primitive
(`docs/primitives/<name>.md` — props, variants, rendered DOM per state, ARIA, classes escape hatch,
a snippet per runtime), runtime notes (`docs/runtimes/<rt>.md`) and the [contract](docs/contract.md).
Reference parts are generated from the spec (`bun run docs`; `bun run docs:check` runs in `verify`),
and every snippet is executed in its runtime by `tests/docs.test.ts`.

## Primitives

Box · Text · Button · Link · Label · Input · Textarea · Select (+ SelectOption, SelectOptGroup) ·
Checkbox · Radio · Switch · Image (+ Picture, Source) · Icon · Dialog · Disclosure (+ Summary) ·
Meter · Progress — see [docs/](docs/README.md).

No CSS ships with the primitives: style them with token class names via `class`.

**Select value.** `value` marks the matching option `selected` in the markup and also drives
the live DOM `value` on the client (React: `value` when you pass `onChange`, otherwise
`defaultValue`; Svelte/Solid/Vue/WC: the `value` property is synced, never an attribute).
Composition (cards, badges, alerts, layouts, …) is out of scope for codegen.

## Usage

```sh
bun install
bun run generate          # writes generated/ (all runtimes + specs.json)
bun run build:specs       # writes specs/primitives.json (registry-facing JSON spec)
bun run docs              # regenerate docs/primitives/*.md from the spec
bun run verify            # check + docs:check + tsc + typecheck:generated + all tests (parity ×6 runtimes)
```

`generate --runtimes react,svelte,vue,solid,webcomponent,templ` limits the output.

### Web Components

```ts
import { defineAll, renderButton } from "./generated/ui/index.wc";
defineAll(); // <ui8-button>, <ui8-box>, … (prefix configurable)
document.body.append(renderButton({ class: "bg-primary text-primary-foreground" }, "Save"));
```

Custom elements replace themselves with the rendered primitive (no shadow DOM), so the
resulting DOM is identical to the other runtimes and consumer classes apply.

The swap waits until children exist (DOMContentLoaded while the document is parsing, or the
next microtask for a host connected before its subtree). Attributes are read **once**, at the
swap: the host element is gone afterwards, so there is nothing to observe — update the rendered
element directly, or call `render<Part>()` again.

### Go templ

`generated/templ/` is a self-contained Go module (`github.com/ui8kit/codegen/generated/templ`,
templ `v0.3.1070`, Go 1.26): one package per primitive under `ui/<name>/` (`select` → package
`selectfield`, `switch` → `formswitch`), helpers in `utils/`, the parity harness in `cmd/parity`.

```sh
cd generated/templ && templ generate && go vet ./... && go build ./...
```

```templ
@button.Button(button.ButtonProps{Href: "/docs", Class: "bg-primary text-primary-foreground"}) {
	Read the docs
}
```

- Props are typed structs (`<Name>Props`); a zero value means "unset", so empty strings omit the
  attribute (to force `value=""`, pass it through `Attrs: templ.Attributes{"value": ""}`).
- **No `asChild` / Slot in templ.** For a custom root element use the exported
  `<Name>Classes(props)` helper: `<a class={ button.ButtonClasses(button.ButtonProps{}) }>`.
- **Children are trusted HTML.** `{ children... }` renders whatever the caller passes; templ
  escapes props and text, but `templ.Raw(...)` / unescaped children are your responsibility —
  never pass user input as raw children (XSS).
- templ sanitizes URL attributes: `href="javascript:…"` renders as
  `about:invalid#TemplFailedSanitizationURL` (React would print it verbatim).
- `Attrs` are spread last; unlike the JS runtimes they do not replace an attribute the
  primitive already printed (avoid duplicating `class`, `id`, …; use `Class` / typed props).

Parity: `tests/parity.templ.test.ts` runs the real `templ generate` + `go run ./cmd/parity`
and compares the normalized DOM with React SSR and the canonical renderer. Without Go the
suite is skipped locally with a message; with `UI8KIT_REQUIRE_ALL_RUNTIMES=1` (CI) it fails.

### Jinja2

`generated/jinja2/` holds one template per part (`ui/<brick>/<part>.html.j2`, e.g.
`ui/card/card-header.html.j2`), the recipes, and the `ui8kit_jinja` Python package
(`pip install -r generated/jinja2/requirements.txt`, Jinja2 `>=3.1,<4`). Templates read `p`
(canonical PascalCase props, `Attrs` for extra attributes) and `children` (markup):

```python
import sys; sys.path.insert(0, "generated/jinja2")
from ui8kit_jinja import environment
env = environment()  # autoescape on; ui_* helpers + <name>_classes globals
env.get_template("ui/button/button.html.j2").render(p={"AriaLabel": "Save"}, children=icon_html)
```

- **Children are trusted HTML.** `{{ children|safe }}` prints whatever you pass (repeated in
  every branch, e.g. Button `<a>` | `<button>`). Props and text are autoescaped; never pass raw
  user input as `children` — escape it (`markupsafe.escape`) or render it via a template (XSS).
- **No `asChild` / Slot in Jinja2.** Each part with a class contract has a global
  `<name>_classes(p)` (`button_classes`, `icon_classes`, …):
  `<a class="{{ button_classes({'Class': 'px-4'}) }}" href="/x">`.
- Blank strings mean "unset" (the canonical contract): `Value: ""` omits the attribute; force
  `value=""` with `Attrs: {"value": ""}`. `Attrs` is printed last and is not de-duplicated
  against attributes the primitive already printed.

Parity: `tests/parity.jinja2.test.ts` renders every part with real Python Jinja2
(`generated/jinja2/parity.py`) and compares the normalized DOM with React SSR and the canonical
renderer. Without python3 + Jinja2 the suite is skipped locally; with
`UI8KIT_REQUIRE_ALL_RUNTIMES=1` (CI) it fails.

### Twig and Latte (PHP)

`generated/twig/` and `generated/latte/` are Composer packages (`twig/twig ^3`, `latte/latte ^3`,
PHP ≥ 8.1; namespaces `UI8Kit\Twig` / `UI8Kit\Latte`): one template per part under
`ui/<brick>/<Part>.html.twig` / `<Part>.latte`, plus `src/` (`Rt` helpers, tailwind-merge port
`CnMerge`, generated `Tags` and `Classes`; Twig also `TwigExtension`).

```twig
{# $twig->addExtension(new \UI8Kit\Twig\TwigExtension()); loader root: generated/twig/ui #}
{% include 'button/Button.html.twig' with { ariaLabel: 'Save', class: 'px-4', children: icon } only %}
```

```latte
{include 'button/Button.latte', ariaLabel: 'Save', class: 'px-4', children: $icon}
```

- Props are template parameters (`tag`, `class`, `ariaLabel`, `htmlFor`, `id`); Latte declares
  them in a typed `{parameters}` block. Extra attributes go in `attrs` and are merged last (the
  caller wins, like the JS rest props). Select options: `options: [{value, label, disabled}]`.
- **Children are trusted HTML**: `children` is printed raw (`{{ children|raw }}` /
  `{$children|noescape}`). Props and text are escaped by the engine; never route user input into
  `children` (XSS) — render it through a template first (`{% set %}…{% endset %}` / `{capture}`).
  URL attributes are not sanitized (`href="javascript:…"` prints verbatim, as in React).
- **No `asChild`**: compose a part's classes for a custom root with
  `ui8kit_classes('buttonClasses', {…})` (Twig) or `\UI8Kit\Latte\Classes::buttonClasses([...])`.
- Dynamic tags (Box/Text `tag`) become an `if` chain with one static element per allowed tag;
  `when` branches repeat the children slot. Empty strings mean "unset" (attribute omitted);
  force `value=""` through `attrs`.

Parity: `tests/parity.twig.test.ts` / `tests/parity.latte.test.ts` run `composer install` and the
real engines (`php bin/parity.php`) and compare with React SSR and the canonical renderer;
skipped locally without PHP/Composer, a failure with `UI8KIT_REQUIRE_ALL_RUNTIMES=1`.

## Layout

```
bricks/            primitive definitions (+ showcase fixtures *.data.json)
src/domain/        IR, expressions, tags, canonical renderer, validation
src/emitters/      react, svelte, vue, solid, webcomponent, templ (+ go-expr)
src/application/   generate pipeline, JSON spec export
runtime/           support code copied into generated/utils (runtime/go → generated/templ/utils)
tests/             domain, emitter conventions, parity, docs snippets, type tests
scripts/docs.ts    docs generator (bun run docs / docs:check)
docs/              primitives documentation (generated reference + hand-written prose)
```

## License

MIT © UI8Kit

## `generated/` is build output

`generated/` is not committed (it is in `.gitignore`). Produce it locally with `bun run generate`; `bun run verify` and CI always regenerate it. The source of truth is the spec and emitters in `src/`. Consumers get primitives through `@ui8kit/registry` and the `ui8kit` CLI, not from `generated/` paths on GitHub.

<!-- ui8kit-install:start -->
## Installing primitives with the ui8kit CLI

This repo **generates** the primitives (source of truth). You normally do not install from here — apps install the packed output via the CLI:

### Quick start per runtime

Always call the CLI with a pinned major: `npx ui8kit@3`. `add all` and `add --all` are equivalent.

```bash
# JS runtimes (writes package.json peers clsx + tailwind-merge for utils)
npx ui8kit@3 init --yes --framework react        --dir src && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework vue          --dir src && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework svelte       --dir src && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework solid        --dir src && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework webcomponent --dir src && npx ui8kit@3 add button
npx ui8kit@3 add --all            # everything in r/<runtime>/index.json

# Server runtimes (no package.json is written or required)
npx ui8kit@3 init --yes --framework templ  --dir internal  && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework twig   --dir templates && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework latte  --dir templates && npx ui8kit@3 add button
npx ui8kit@3 init --yes --framework jinja2 --dir templates && npx ui8kit@3 add button
```

Post-install for server runtimes (the CLI prints the exact commands from item `meta`; it never runs them and never edits `composer.json` / `go.mod`):

- **templ**: `go get github.com/a-h/templ@<printed version>` → `templ generate` (after every `add`, and in CI; `*_templ.go` is generated, not shipped) → `go build ./...`. With `go.mod` present the utils import is rewritten to `<module>/<dir>/utils`.
- **twig / latte**: `composer require "twig/twig:^3.0"` (or the printed latte package), add the printed PSR-4 entry to `composer.json`, then `composer dump-autoload`:
  ```json
  { "autoload": { "psr-4": { "UI8Kit\\Twig\\": "templates/runtime/" } } }
  ```
  (`UI8Kit\\Latte\\` for latte). Twig: `$twig->addExtension(new \UI8Kit\Twig\TwigExtension())`.
- **jinja2**: `pip install "Jinja2>=3.1,<4"`; `from ui8kit_jinja import environment` → `environment().get_template("ui/button/button.html.j2").render(p={...}, children=...)`.

### Commands and flags (ui8kit 3.2)

Global: `-c, --cwd <dir>`, `-v, --verbose`, `--no-cache`, `-V, --version`.

| Command | Flags |
|---------|-------|
| `init` | `-y, --yes`, `--framework <react\|vue\|svelte\|solid\|webcomponent\|templ\|latte\|twig\|jinja2\|none>`, `--runtime <name>` (defaults to framework), `--dir <path>`, `--skip-core`, `-r, --registry <type>` (default `ui`), `--registry-url <url>`, `--registry-version <v>`, `--strict-cdn`, `--import-style <alias\|package>` (`package` deprecated) |
| `add [components...]` | `-a, --all` (or `add all`), `-f, --force`, `--runtime <name>`, `--path <key=dir>` (repeatable, e.g. `ui=kit`), `--dry-run`, `--retry`, `-r, --registry <type>`, `--registry-url`, `--registry-version`, `--strict-cdn` |
| `check` | offline verify vs `ui8kit.lock.json`; `--json`, `--adopt` (fetches registry, adopts only matching files), `--runtime`, `--registry-url`, `--registry-version`, `--strict-cdn` (the last three only with `--adopt`) |
| `list` | `--json`, `-r, --registry`, `--registry-url`, `--registry-version`, `--strict-cdn` |
| `diff [component]` | `--json`, `-r, --registry`, `--registry-url`, `--registry-version`, `--strict-cdn` |
| `info` | `--json`, `--cdn` (resolved CDN order and overrides) |
| `scan` | `-r, --registry <type\|path>`, `-o, --output <file>`, `-s, --source <dir>` |
| `build [registry]` | default `./src/registry.json`; `-o, --output <path>` (default `./packages/registry/r`) |
| `cache clear` | — |
| `registry clean` | `--dry-run`, `--all`, `-f, --force` |
| `reset` | `--dry-run`, `--with-cache`, `-y, --yes`, `-f, --force` |

## Where registries live

- **Default**: `@ui8kit/registry@<CLI major>` from npm via CDN, tried in order **unpkg → jsDelivr**:
  - `https://unpkg.com/@ui8kit/registry@3/r/<runtime>/index.json`
  - `https://cdn.jsdelivr.net/npm/@ui8kit/registry@3/r/<runtime>/index.json`
- **Per runtime** (`react`, `vue`, `svelte`, `solid`, `webcomponent`, `templ`, `twig`, `latte`, `jinja2`) under `r/<runtime>/`:
  - `index.json` — catalogue
  - `components/ui/<name>.json` — primitives (e.g. `button.json`)
  - `utils/utils.json` — `registry:utils` (installed by `init`)
  - `rules/rules.json` — `registry:rules` → `.cursor/rules/ui8kit-primitives.mdc` (installed by `init`)
- **`$schema`**: `https://cdn.jsdelivr.net/npm/@ui8kit/registry@3/schema/{schema,registry,registry-item}.json` (config / index / item).
- **Version**: `--registry-version` or `"registryVersion"` in `ui8kit.config.json` accepts exact (`3.1.0`), range (`3.1`) or dist-tag (`canary`); default is the CLI major (`3` → newest 3.x.y).
- **Resolution order**: `--registry-url` / `registryUrl` → `cdnBaseUrls` (config) → built-in unpkg / jsDelivr. With `--strict-cdn` (or `strictCdn`) and an explicit URL, only that URL is used.
- **Brand registries**: `@ui8kit/registry` ships **primitives only**. Brand kits (blocks, composites) host their own registry, e.g. `--registry-url https://registry.buildy.tw/react`, and reference primitives by absolute URL in `registryDependencies` (pinned digest, recorded in `meta.primitives`). Brand items get their own lock entries.
- **Lock**: `init` / `add` write `ui8kit.lock.json` (source URL, exact version, sha256 per file). Commit it; verify with `npx ui8kit@3 check` (offline, exit 1 on `missing` / `modified` / `mixed-versions` / `rules-version`). No lock yet → `npx ui8kit@3 check --adopt` once.

### Where source lives

```
codegen  specs/ + bricks/ ─gen─▶ generated/<rt>/   (build output, NOT committed)
registry pack:runtimes  ──────────▶ r/<rt>/*.json     (published: @ui8kit/registry)
npm ──▶ unpkg / jsDelivr ──▶ cli: ui8kit init / add ──▶ app {dir}/ui, {dir}/utils + ui8kit.lock.json
```

Fix a primitive in **codegen**, repack in **registry**, publish, then `add <name> --force` in the app. Never fix it in the app or in `r/` by hand.
<!-- ui8kit-install:end -->
