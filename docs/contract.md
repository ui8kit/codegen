# Primitives contract

Rules every primitive and every runtime follows. They are **kit-neutral**: they describe the
primitives layer only. Brand kits built on top may add their own rules (or drop optional ones,
see the spacing note).

## DOM parity

- One spec (`bricks/<name>/<name>.def.ts`) → one canonical renderer (`src/domain/render.ts`) →
  9 runtimes. For every part and every fixture state (defaults, showcase fixtures, every enum value,
  every boolean) each runtime's **normalized DOM** must equal the canonical output (`bun test`:
  `parity*.test.ts`; templ/Twig/Latte/Jinja2 run their real engines, required in CI via
  `UI8KIT_REQUIRE_ALL_RUNTIMES=1`).
- Normalization ignores incidental differences only: attribute order, self-closing syntax,
  framework comment markers, class order after a tailwind-merge pass.
- Doc snippets in `primitives/*.md` are executed verbatim in all 9 runtimes (`tests/docs.test.ts`).
- Class merge order is fixed: recipe base → variant classes → static base → extra expressions →
  state classes → caller `class` (Tailwind-conflict aware).
- Extra attributes (rest / `Attrs` / `attrs`) are rendered last; in JS runtimes and PHP they win.
- `tag` (Box, Text) accepts only real HTML5 tags from its allow-list; anything else falls back
  (`div` / `p`). Void tags render no children.

### Empty values

Passthrough attributes (`id`, `name`, `value`, `aria-*`, `placeholder`, … — props marked passthrough) are **nullable**:
unset (`undefined` / `null` / `None` / `nil`) omits the attribute, an explicit `""` renders `attr=""` — in every runtime,
as React does. Server signatures: Twig `x ?? null` (no `|default`), Latte `?string $x = null`, Jinja2 `p['X'] is not none`,
templ `Value *string` (Go strings cannot be unset; other passthrough strings in templ still treat `""` as unset —
use `Attrs` for an explicit empty one). Non-passthrough strings keep the rule: a blank string means "unset".

### Button with `href` + `disabled`

As in the v0.1.0 contract: the anchor keeps `href` and gets `aria-disabled="true"` + `tabindex="-1"`
(anchors have no native `disabled`). The primitive does not drop `href`; block the click in the caller if needed.

## ARIA

- Primitives render the ARIA they own (Icon: `aria-hidden` or `role="img"` + `aria-label` from
  `label`; Switch: `role="switch"` + `aria-checked`; Button-as-link: `aria-disabled`). Do not
  hand-write those.
- Everything else is a typed, static ARIA prop (`aria-label`, `aria-pressed`, …) or goes through attrs.

## Tokens only

Primitives ship **no CSS**; style with design-token utility classes via `class`
(`bg-primary`, `text-muted-foreground`, `border-input`, `ring-ring`, …). No palette colors
(`bg-blue-500`), no hex/rgb/hsl, no arbitrary color classes, no inline color styles.

## Spacing (8 + 4)

Default guidance for code using the primitives: spacing on the 8px step (`p-2`, `gap-4`, …);
the 4px step (`1`) only inside controls; no half or odd steps, no arbitrary px values.
This is guidance for the layer above the primitives, not something primitives enforce — primitives
themselves carry no spacing. Brand kits may define their own scale (and may drop helpers such as
`.ui8px`).

## Icons

Use Lucide icons as children of `Icon` (`lucide-react`, `lucide-vue-next`, `@lucide/svelte`,
`lucide-solid`, `lucide` for WC; inline Lucide SVG markup for templ/Twig/Latte/Jinja2). Size via
`Icon` `size`; give `label` when the icon carries meaning.

## Children are trusted

Template runtimes print children raw (templ `{ children... }`, Twig `|raw`, Latte `|noescape`,
Jinja2 `|safe`). Never route user input into children (XSS).

## No asChild outside React

Only React has `asChild` ([Slot](primitives/slot.md)). Everywhere else, use the part's classes
helper (`<Name>Classes` / `<name>_classes`) on your own element.

---

[Docs index](README.md)
