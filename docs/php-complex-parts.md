# PHP complex parts

Latte and Twig emitters cover **60 of 63** parts. Three parts are **structurally complex** — their render trees exceed what the PHP template composition model can express mechanically.

This is not a hand-maintained exclusion list. Eligibility is decided by `phpSupported()` in `src/domain/php-support.ts` and reported on every `generate` run.

## Summary

| Part | Brick | Skip reason | Workaround |
|------|-------|-------------|------------|
| `Breadcrumb` | `breadcrumb` | `forEach` over typed items | Manual loop in app template + `Classes::breadcrumbClasses()` |
| `Select` | `select` | `forEach` over typed items | Use `SelectOption` / `OptGroup` includes + `Classes::selectClasses()` |
| `Icon` | `icon` | Branched root (`when` at top level) | Branch in app template + `Classes::iconClasses()` |

Sibling parts in the same brick **are** generated:

| Brick | Generated | Skipped |
|-------|-----------|---------|
| `select` | `SelectOption`, `OptGroup` | `Select` |
| `breadcrumb` | — | `Breadcrumb` (only part) |
| `icon` | — | `Icon` (only part) |

Class helpers in `php/UI8Kit/Classes.php` are emitted for **all three** skipped parts.

---

## The PHP support predicate

A part is supported if and only if:

1. **Single element root** — `part.render.kind === "element"`. Branched roots (`when` at the top) fail.
2. **No `forEach`** — loops over typed `items` props are not emitted into Latte/Twig.
3. **No branched slots** — a `slot` (children insertion) inside `when` branches fails, because Latte/Twig cannot declare the same children parameter twice across exclusive branches.

```ts
// src/domain/php-support.ts (simplified)
export function phpSupported(part: PartDef): PhpSupport {
  if (part.render.kind !== "element")
    return { ok: false, reason: "root is not a single element (branched roots need per-branch slots)" };
  if (hasForEach(part.render))
    return { ok: false, reason: "forEach over typed items" };
  if (hasBranchedSlot(part.render))
    return { ok: false, reason: "slot inside when branches" };
  return { ok: true };
}
```

### Why children are HTML strings in PHP

Latte and Twig compose nested components by passing **pre-rendered HTML strings** as the `children` parameter. There is no nested component slot protocol like React `children` or Vue `<slot>`.

This works for linear trees: capture inner HTML, pass to outer include. It breaks for:

- **Loops** — the emitter would need to generate `{% for %}` / `{foreach}` over typed records with per-item class logic.
- **Branched roots** — different element types (`svg` vs `span`) at the root require different parameter signatures per branch.

---

## 1. `breadcrumb/Breadcrumb`

### Definition

`bricks/breadcrumb/breadcrumb.def.ts` — single part, list-driven navigation.

**Props:**

| Prop | Type | Role |
|------|------|------|
| `Items` | `items` of `BreadcrumbItem` | Trail entries |
| `Class` | string | Caller utilities |
| `AriaLabel` | passthrough | `aria-label` on `<nav>` |
| `DataUI8Kit` | passthrough | Optional behavior hook |
| `Attrs` | attrs | Rest escape hatch |

**`BreadcrumbItem` record:**

| Field | Type |
|-------|------|
| `Label` | string |
| `Href` | string |
| `Current` | bool — active page (`aria-current="page"`) |
| `Disabled` | bool |

### Render structure

```
nav
  ol
    forEach Items →
      li
        when (Href set AND NOT Disabled) →
          a [href, item classes, aria-current?]
            text Label
        else →
          span [item classes, aria-current?]
            text Label
```

### Why it is skipped

`forEach("Items", …)` iterates typed records. The emitter would need to generate a template loop with per-item conditional link vs span rendering and dynamic `aria-current`.

### Canonical DOM (reference)

Other runtimes (React, Templ, etc.) render this fully. Parity fixtures would use props like:

```json
{
  "Items": [
    { "Label": "Home", "Href": "/" },
    { "Label": "Settings", "Href": "/settings" },
    { "Label": "Profile", "Current": true }
  ],
  "AriaLabel": "Breadcrumb"
}
```

### App-level workaround (Twig)

Twig class helpers are invoked via `ui8kit_classes('methodName', {…})` (see `TwigExtension`):

```twig
{% set navClass = ui8kit_classes('breadcrumbClasses', {class: 'my-nav'}) %}
<nav class="{{ navClass }}" aria-label="Breadcrumb">
  <ol class="flex flex-wrap items-center gap-2">
    {% for item in items %}
      <li class="inline-flex items-center">
        {# Item-level classes: inline the recipe from breadcrumb.def.ts or use Rt::cn() #}
        {% set itemClass = item.current ? 'text-sm font-medium' : (item.disabled ? 'text-sm text-muted-foreground' : 'text-sm text-primary underline-offset-4 hover:underline') %}
        {% if item.href and not item.disabled %}
          <a href="{{ item.href }}" class="{{ itemClass }}"{{ item.current ? ' aria-current="page"' }}>{{ item.label }}</a>
        {% else %}
          <span class="{{ itemClass }}"{{ item.current ? ' aria-current="page"' }}>{{ item.label }}</span>
        {% endif %}
      </li>
    {% endfor %}
  </ol>
</nav>
```

Use `UI8Kit\Classes::breadcrumbClasses($in)` for the nav wrapper classes. Item-level classes follow the recipe in the brick definition (`text-sm`, conditional `font-medium` / `text-primary` / `text-muted-foreground`).

### App-level workaround (Latte)

Same structure with `{foreach $items as $item}` and `{include}` or inline markup, calling `Classes::breadcrumbClasses()` for class strings.

---

## 2. `select/Select`

### Definition

`bricks/select/select.def.ts` — three parts; only `Select` is skipped.

### `Select` props

| Prop | Type | Role |
|------|------|------|
| `Variant`, `Size` | CVA | Appearance |
| `Options` | `items` of `SelectOptionItem` | Generated `<option>` elements |
| `Value` | string | Selected value |
| `Name`, `Disabled`, `Required` | scalars | Native select attrs |
| `Children` | children | Manual options after generated ones |
| Control passthroughs | | `ID`, `AriaLabel`, `Role`, `TabIndex`, … |
| `Attrs` | attrs | Rest |

**`SelectOptionItem`:**

| Field | Type |
|-------|------|
| `Value` | string |
| `Label` | string |

### Render structure

```
select [attrs, classes]
  forEach Options →
    option [value, selected?]
      text Label
  slot (manual children)
```

### Why it is skipped

`forEach("Options", …)` generates options from typed data. Combined with a children slot for manual `SelectOption` / `OptGroup` content, the emitter would need loop + slot composition.

### Generated siblings

| Part | Template | Use |
|------|----------|-----|
| `SelectOption` | ✅ | Single `<option>` |
| `OptGroup` | ✅ | `<optgroup>` wrapper |

### Showcase fixtures

From `bricks/select/select.data.json`:

```json
{
  "variant.default": {
    "props": {
      "Name": "country",
      "Options": [
        { "Label": "United States", "Value": "us" },
        { "Label": "Canada", "Value": "ca" }
      ],
      "Value": "us"
    }
  }
}
```

### App-level workaround (Twig)

**Option A — manual options only:**

```twig
{% set optionHtml %}
  {% include 'select/SelectOption.html.twig' with {value: 'us', label: 'United States', selected: true} only %}
  {% include 'select/SelectOption.html.twig' with {value: 'ca', label: 'Canada'} only %}
{% endset %}

{# Build <select> attrs/classes via Classes::selectClasses() #}
<select class="{{ selectClass }}" name="country"{{ disabled ? ' disabled' }}>
  {{ optionHtml|raw }}
</select>
```

**Option B — loop in app template:**

```twig
<select class="{{ ui8kit_classes('selectClasses', {variant: 'default'}) }}" name="country">
  {% for opt in options %}
  <option value="{{ opt.value }}"{{ opt.value == selected ? ' selected' }}>{{ opt.label }}</option>
  {% endfor %}
</select>
```

Use `UI8Kit\Classes::selectClasses(['variant' => 'default', 'size' => 'default', 'class' => '…'])` for the select element classes.

### App-level workaround (Latte)

```latte
{var $class = UI8Kit\Classes::selectClasses(['variant' => 'default', 'name' => 'country'])}
<select class="{$class}" name="country">
  {foreach $options as $opt}
    {include '../../../generated/ui/select/SelectOption.latte',
      value: $opt->value, label: $opt->label, selected: $opt->value === $selected}
  {/foreach}
</select>
```

---

## 3. `icon/Icon`

### Definition

`bricks/icon/icon.def.ts` — single part with **three rendering modes** based on `Type`.

### Props

| Prop | Role |
|------|------|
| `Type` | `svg`, `text`, or `class` (default) |
| `Name`, `Prefix`, `BaseClass` | Icon font class mode |
| `Href`, `Title` | SVG `<use>` mode |
| `Size` | CVA size |
| `Decorative`, `AriaLabel` | Accessibility |
| `Children` | Slot (SVG/text modes) |
| `Class`, `Attrs` | Styling escape hatches |

### Derived values

| Name | Logic |
|------|-------|
| `iconKind` | Resolved from `Type` prop |
| `isDecorative` | `Decorative` OR (no `Title` AND no `AriaLabel`) |

### Render structure (branched root)

```
when iconKind == "svg" →
  svg [classes, aria-*]
    when Title set → title
    when Href set → use
    slot

else when iconKind == "text" →
  span [classes, aria-*]
    slot

else →
  span [classes, aria-*]   (class mode — no children)
```

### Why it is skipped

The render tree root is `when`, not `element`. Each branch produces a different root element (`svg` vs `span`) with different child structure. PHP templates declare one parameter block and one root tag per file — they cannot switch root element types at the file level without duplicating the entire part across separate templates.

Additionally, `slot` appears inside `when` branches (branched slot pattern), which the predicate rejects even for non-root conditionals.

### Showcase fixtures

From `bricks/icon/icon.data.json`:

```json
{
  "type.class": {
    "props": { "Type": "class", "BaseClass": "icon", "Name": "home", "Prefix": "icon-", "Size": "sm" }
  },
  "type.svg": {
    "props": { "Type": "svg", "Href": "#check", "Title": "Done" }
  }
}
```

### App-level workaround (Twig)

Branch in the consuming template:

```twig
{% if type == 'svg' %}
  <svg class="{{ ui8kit_classes('iconClasses', {type: 'svg', size: size, class: class}) }}"
       {{ decorative ? 'aria-hidden="true"' : 'role="img"' }}
       {{ ariaLabel and not decorative ? 'aria-label="' ~ ariaLabel ~ '"' }}>
    {% if title %}<title>{{ title }}</title>{% endif %}
    {% if href %}<use href="{{ href }}"></use>{% endif %}
    {{ children|raw }}
  </svg>
{% elseif type == 'text' %}
  <span class="{{ ui8kit_classes('iconClasses', {type: 'text', class: class}) }}" …>{{ children|raw }}</span>
{% else %}
  <span class="{{ ui8kit_classes('iconClasses', {type: 'class', name: name, prefix: prefix, baseClass: baseClass, class: class}) }}" …></span>
{% endif %}
```

Use `UI8Kit\Classes::iconClasses($in)` — it handles all three modes' class composition including prefix/name concatenation in class mode.

### App-level workaround (Latte)

```latte
{if $type === 'svg'}
  {var $class = UI8Kit\Classes::iconClasses(['type' => 'svg', 'size' => $size, 'class' => $class])}
  <svg class="{$class}" …>…</svg>
{elseif $type === 'text'}
  …
{else}
  {var $class = UI8Kit\Classes::iconClasses(['type' => 'class', 'name' => $name, 'prefix' => $prefix, 'baseClass' => $baseClass])}
  <span class="{$class}" …></span>
{/if}
```

---

## Class helpers for skipped parts

`src/emitters/php-classes.ts` emits `Classes::<part>Classes()` for **every** part with a classes contract, including skipped template parts:

```php
// Generated into php/UI8Kit/Classes.php
public static function breadcrumbClasses(array $in): string { … }
public static function selectClasses(array $in): string { … }
public static function iconClasses(array $in): string { … }
```

These methods:

- Accept the same prop names as template parameters (PHP naming: `$variant` → `'variant'` key)
- Embed variant recipes as PHP constants
- Mirror `buttonClasses()` / Go `ButtonClasses()` logic

They are the **documented escape hatch** for app-level markup when templates are not generated.

---

## Parity test coverage

| Part | React/Svelte/Vue/Templ parity | Latte/Twig parity |
|------|--------------------------------|-------------------|
| `Breadcrumb` | ✅ | ❌ excluded |
| `Select` | ✅ | ❌ excluded |
| `SelectOption`, `OptGroup` | ✅ | ✅ |
| `Icon` | ✅ | ❌ excluded |

PHP parity tests in `tests/support/php.ts` skip unsupported parts with the same `phpSupported()` predicate used by emitters.

---

## Future: closing the gap

Possible approaches (not implemented):

1. **Split branched parts** into multiple generated templates (`IconSvg.latte`, `IconClass.latte`) with a thin app-level dispatcher.
2. **Emit loops** for `forEach` parts — generate `{% for item in options %}` with per-item class expressions inlined.
3. **Macro/block layer** — generate Latte `{define}` / Twig `{% macro %}` helpers for item rows, composed by a hand-written outer shell.

The current design favors mechanical correctness and identical DOM over partial codegen that could drift from the canonical renderer.

---

## Related reading

- [Runtimes](./runtimes.md) — Latte/Twig composition model
- [Cross-runtime contract](./contract.md) — class merge order, ARIA rules
- [Testing and CI](./testing-and-ci.md) — PHP parity scope
- [Brick definitions](./bricks.md) — `forEach`, `when`, record types
