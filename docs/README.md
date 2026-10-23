# UI8Kit primitives — documentation

The single, exhaustive home for the 17 UI8Kit primitives (plus the React-only `Slot`).
Sites, the `ui8kit` CLI and the registry repos link here instead of copying it.
Part of the UI8Kit 3 ecosystem — see the ecosystem block in the [repo README](../README.md).

## How the docs are organized

| Path | What | Source |
| --- | --- | --- |
| [primitives/](primitives/) | one page per primitive: purpose, props, variants, children, ARIA, `<Name>Classes` escape hatch, rendered DOM per state, one snippet per runtime | **generated** by `bun run docs` (except the `Notes` prose block) |
| [runtimes/](runtimes/) | per runtime: install, children mechanism, deviations from React, helpers | hand-written |
| [contract.md](contract.md) | DOM / token / ARIA parity rules every primitive and runtime follows | hand-written |
| [primitives/slot.md](primitives/slot.md) | React `Slot` behind `asChild` | hand-written |

Runtimes: [React](runtimes/react.md) · [Vue 3](runtimes/vue.md) · [Svelte 5](runtimes/svelte.md) ·
[SolidJS](runtimes/solid.md) · [Web Components](runtimes/webcomponent.md) · [Go templ](runtimes/templ.md) ·
[Twig](runtimes/twig.md) · [Latte](runtimes/latte.md) · [Jinja2](runtimes/jinja2.md)

## Primitives

<!-- ui8kit-docs:index:start -->
| Primitive | Parts | Summary |
| --- | --- | --- |
| [Box](primitives/box.md) | `Box` | Box is the polymorphic structural primitive. `tag` accepts HTML5 structural |
| [Text](primitives/text.md) | `Text` | Text is the polymorphic text primitive. `tag` accepts HTML5 text elements |
| [Button](primitives/button.md) | `Button` | Button triggers an action. With `href` it renders an anchor (navigation that |
| [Link](primitives/link.md) | `Link` | Link renders a semantic anchor for navigation. Use Button for actions |
| [Label](primitives/label.md) | `Label` | Label names a form control |
| [Input](primitives/input.md) | `Input` | Input is a single-line native form control (checkbox/radio have their own primitives) |
| [Textarea](primitives/textarea.md) | `Textarea` | Textarea is a multi-line native text field |
| [Select](primitives/select.md) | `Select`, `SelectOption`, `SelectOptGroup` | Select is a native dropdown. Flat options come from the Options list; |
| [Checkbox](primitives/checkbox.md) | `Checkbox` | Checkbox is a native input[type=checkbox]; pair it with Label |
| [Radio](primitives/radio.md) | `Radio` | Radio is a native input[type=radio]; pair it with Label |
| [Switch](primitives/switch.md) | `Switch` | Switch is an on/off toggle: button[role=switch] with aria-checked |
| [Image](primitives/image.md) | `Image`, `Picture`, `Source` | Image renders img, picture, and source. Alt is required; pass an empty |
| [Icon](primitives/icon.md) | `Icon` | Icon is a sized frame for a consumer-supplied glyph (svg, sprite, font) |
| [Dialog](primitives/dialog.md) | `Dialog` | Dialog is the native <dialog>. Opening/closing (showModal) is the consumer's |
| [Disclosure](primitives/disclosure.md) | `Disclosure`, `Summary` | Disclosure is native details/summary. `name` groups exclusive accordions |
| [Meter](primitives/meter.md) | `Meter` | Meter is a native gauge for a known range (value/min/max) |
| [Progress](primitives/progress.md) | `Progress` | Progress is native task progress (value/max); omit value for indeterminate |
| [Slot](primitives/slot.md) | `Slot` | React-only composition helper behind `asChild` (hand-written page) |
<!-- ui8kit-docs:index:end -->

## Generated vs hand-written

- `bun run docs` rewrites `docs/primitives/<brick>.md` from `bricks/*/*.def.ts` (props, enums,
  defaults, recipes, render tree) and `bricks/*/*.data.json` (showcase fixtures), plus the index table
  above. Hand-written notes go **only** between `<!-- ui8kit-docs:prose:start -->` and
  `<!-- ui8kit-docs:prose:end -->` in a primitive page — they survive regeneration.
- Rendered HTML is the canonical renderer's output for the same fixture matrix the parity suites
  run (defaults, showcase fixtures, every enum value, every boolean); usage snippets are built
  with the parity suites' own per-runtime prop translators from the same fixtures, and
  `tests/docs.test.ts` renders every JS-runtime snippet's props and checks the documented HTML.
- `bun run docs:check` fails when the generated parts are stale; it is part of `bun run verify`.
- Everything else under `docs/` is hand-written.

Agents: read `docs/primitives/<name>.md` before using a primitive.
