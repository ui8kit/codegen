# Primitives contract

Rules every primitive and every runtime follows. They are **kit-neutral**: they describe the
primitives layer only. Brand kits built on top may add their own rules (or drop optional ones,
see the spacing note).

## DOM parity

- One spec (`bricks/<name>/<name>.def.ts`) → one canonical renderer (`src/domain/render.ts`) →
  9 targets. For every part and every fixture state (defaults, showcase fixtures, every enum value,
  every boolean) each runtime's **normalized DOM** must equal the canonical output (`bun test`:
  `parity*.test.ts`; templ/Twig/Latte/Jinja2 run their real engines, required in CI via
  `UI8KIT_REQUIRE_ALL_RUNTIMES=1`).
- Normalization ignores incidental differences only: attribute order, self-closing syntax,
  framework comment markers, class order after a tailwind-merge pass.
- Doc snippets in `primitives/*.md` are executed verbatim in all 9 targets (`tests/docs.test.ts`).
- Class merge order is fixed: recipe base → variant classes → static base → extra expressions →
  state classes → caller `class` (Tailwind-conflict aware).
- Extra attributes (rest / `Attrs` / `attrs`) win over the primitive's own attribute of the same name in every
  runtime — see [Attributes](#attributes-precedence-empty-values-urls).
- `tag` (Box, Text) accepts only real HTML5 tags from its allow-list; anything else falls back
  (`div` / `p`). Void tags render no children.

### Button with `href` + `disabled`

As in the v0.1.0 contract: the anchor keeps `href` and gets `aria-disabled="true"` + `tabindex="-1"`
(anchors have no native `disabled`). The primitive does not drop `href`; block the click in the caller if needed.

## Attributes: precedence, empty values, URLs

One rule set, identical DOM in all 9 targets (`tests/parity.attrs.test.ts` renders every case in every real engine
against explicit expected HTML). Since 3.3.0.

1. **Precedence.** A key in the caller's extra attributes (JS rest props / `Attrs` / `attrs`) replaces the primitive's
   own attribute of that name (static, computed or from a named prop) — as in v0.1.0 (React rest spread last,
   PHP `array_merge`, canonical renderer). `class` is the exception: it merges (use `class` / `Class`). The winning
   value is then checked by rules 2–3; if it is dropped, the attribute is **omitted** — the named prop never comes back
   as a fallback. Example: `Href: "/ok"` + `Attrs: {href: "javascript:x"}` renders `<a>` without `href` everywhere.
2. **Empty values.** Optional attributes (passthrough props: `id`, `name`, `href`, `src`, `srcset`, `sizes`,
   `placeholder`, `aria-*`, …) treat a blank string (`""` or whitespace only) as unset and omit the attribute — from the
   named prop or from extra attributes alike (JS runtimes cannot tell them apart). This is the v0.1.0 contract
   (canonical renderer and server templates omitted blanks). **`value` is the one exception**: it is nullable —
   unset (`undefined` / `null` / `None` / `nil`) omits it, an explicit `""` renders `value=""`, because `""` is a real
   value there (React controlled `<input value="">`, checkbox/radio submit `""` instead of `on`,
   `<option value="">` placeholder). Undeclared extra attributes (`data-*`, …) keep an explicit `""`.
   `href=""` is not an exception: an empty link target would point at the current page; the anchor renders without
   `href` (Button with a blank `Href` renders a `<button>`).
   Server signatures: Twig `x ?? null`, Latte `?string $x = null`, Jinja2 `p['X']`, templ `Value *string` (other
   templ strings: `""` = unset).
3. **URLs.** `href`, `src`, `action`, `formaction`, `poster`, `cite`, `background`, `xlink:href` with a `javascript:`,
   `vbscript:` or `data:` scheme (case and ASCII control/whitespace ignored) are omitted. **Only `<img src>`** (Image)
   allows `data:image/(png|jpeg|gif|webp|avif|svg+xml)` followed by `;` or `,` (placeholders); `data:` stays forbidden in
   `href`, `action`, … and on every other element. `srcset` is not URL-checked (image candidates are never executed),
   so `data:image/…` in `srcset` is forwarded as given.

### Empty values (history)

3.2.0–3.2.x printed an explicit `""` for every passthrough attribute (`id=""`, `href=""`, `srcset=""`) in all runtimes —
an unflagged breaking change for Twig, Latte and Jinja2, reverted in 3.3.0 except for `value`.

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
