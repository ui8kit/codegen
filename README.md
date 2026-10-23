# @ui8kit/codegen

Spec-driven code generator for **style-agnostic HTML primitives**. Each primitive is defined once
as a typed render contract (`bricks/<name>/<name>.def.ts`); emitters print it into five
runtimes, and parity tests prove every runtime renders the same DOM/ARIA as the canonical renderer.

Runtimes: **React 19 · Svelte 5 · Vue 3 · SolidJS · Web Components** (vanilla, light DOM).

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
bun run verify            # check + tsc + typecheck:generated + all tests (parity ×5 runtimes)
```

`generate --runtimes react,svelte,vue,solid,webcomponent` limits the output.

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

## Layout

```
bricks/            primitive definitions (+ showcase fixtures *.data.json)
src/domain/        IR, expressions, tags, canonical renderer, validation
src/emitters/      react, svelte, vue, solid, webcomponent
src/application/   generate pipeline, JSON spec export
runtime/           support code copied into generated/utils
tests/             domain, emitter conventions, parity, type tests
```

## License

MIT © UI8Kit
