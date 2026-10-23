# @ui8kit/codegen

Spec-driven code generator for **style-agnostic HTML primitives**. Each primitive is defined once
as a typed render contract (`bricks/<name>/<name>.def.ts`); emitters print it into six
runtimes, and parity tests prove every runtime renders the same DOM/ARIA as the canonical renderer.

Runtimes: **React 19 · Svelte 5 · Vue 3 · SolidJS · Web Components** (vanilla, light DOM) ·
**Go [templ](https://templ.guide)** (server-rendered, first of the template runtimes).

## Primitives

Box · Text · Button · Link · Label · Input · Textarea · Select (+ SelectOption, SelectOptGroup) ·
Checkbox · Radio · Switch · Image (+ Picture, Source) · Icon · Dialog · Disclosure (+ Summary) ·
Meter · Progress — see [docs/primitives.md](docs/primitives.md).

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
bun run verify            # check + tsc + typecheck:generated + all tests (parity ×6 runtimes)
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

## Layout

```
bricks/            primitive definitions (+ showcase fixtures *.data.json)
src/domain/        IR, expressions, tags, canonical renderer, validation
src/emitters/      react, svelte, vue, solid, webcomponent, templ (+ go-expr)
src/application/   generate pipeline, JSON spec export
runtime/           support code copied into generated/utils (runtime/go → generated/templ/utils)
tests/             domain, emitter conventions, parity, type tests
```

## License

MIT © UI8Kit
