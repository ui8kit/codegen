# Primitives

Generated from `specs/primitives.json` (itself derived from `bricks/*/*.def.ts`).
Prop names are HTML-native (`class`, `for`, `aria-label`); React uses `className`/`htmlFor`
and camelCase for non-ARIA props. `*` = required. Undeclared attributes (`id`, `data-*`, `aria-*`,
event handlers such as `onClick`) flow through attrs/rest and always win.

| Part | Element(s) | Props | Also accepts |
| --- | --- | --- | --- |
| Box | `div`, `section`, `article`, `aside`… | `tag` (HTML5 union) | class, attrs/rest, children |
| Text | `p`, `span`, `h1`, `h2`… | `tag` (HTML5 union) | class, attrs/rest, children |
| Button | `a`, `button` | `type` (button|submit|reset), `form`, `href`, `disabled`, `aria-label`, `aria-pressed`, `aria-expanded`, `aria-controls` | class, attrs/rest, children |
| Link | `a` | `href`, `target`, `rel`, `external`, `download`, `aria-current`, `aria-label` | class, attrs/rest, children |
| Label | `label` | `for` | class, attrs/rest, children |
| Input | `input` | `type` (HTML5 union), `id`, `name`, `value`, `placeholder`, `min`, `max`, `step`, `required`, `disabled`, `readOnly`, `aria-invalid`, `aria-describedby` | class, attrs/rest |
| Textarea | `textarea` | `id`, `name`, `value`, `placeholder`, `rows`, `required`, `disabled`, `readOnly`, `aria-invalid`, `aria-describedby` | class, attrs/rest |
| Select | `select` | `id`, `name`, `value`, `multiple`, `required`, `disabled`, `options`, `aria-invalid`, `aria-describedby` | class, attrs/rest, children |
| SelectOption | `option` | `value`, `selected`, `disabled` | attrs/rest, children |
| SelectOptGroup | `optgroup` | `label`, `disabled` | attrs/rest, children |
| Checkbox | `input` | `id`, `name`, `value`, `checked`, `required`, `disabled`, `aria-invalid`, `aria-describedby` | class, attrs/rest |
| Radio | `input` | `id`, `name`, `value`, `checked`, `required`, `disabled`, `aria-invalid`, `aria-describedby` | class, attrs/rest |
| Switch | `button` | `checked`, `disabled`, `id`, `name`, `value`, `aria-label`, `aria-labelledby` | class, attrs/rest, children |
| Image | `img` | `src`, `alt`*, `srcset`, `sizes`, `width`, `height`, `loading`, `decoding` | class, attrs/rest |
| Picture | `picture` | — | class, attrs/rest, children |
| Source | `source` | `srcset`, `media`, `type`, `sizes` | attrs/rest |
| Icon | `span` | `size` (xs|sm|md|lg|xl), `label` | class, attrs/rest, children |
| Dialog | `dialog` | `id`, `open`, `aria-labelledby`, `aria-describedby`, `aria-label` | class, attrs/rest, children |
| Disclosure | `details` | `open`, `name` | class, attrs/rest, children |
| Summary | `summary` | — | class, attrs/rest, children |
| Meter | `meter` | `value`, `min`, `max`, `low`, `high`, `optimum`, `aria-label` | class, attrs/rest, children |
| Progress | `progress` | `value`, `max`, `aria-label` | class, attrs/rest, children |

## Rules

- Style-agnostic: no CSS is shipped. Styling = token class names (shadcn vocabulary such as
  `bg-primary text-primary-foreground`) passed via `class`. Theme belongs to the consumer.
- The only built-in classes are Icon's frame + size tokens (`size-3 … size-8`).
- `Box.tag` / `Text.tag` are typed as unions of HTML5 element names; layout vocabulary
  (`block`, `stack`, `grid`, `title`, …) is rejected by the type system and falls back at runtime.
- Icon has no glyph registry: the glyph (inline svg, sprite `<use>`, font ligature, or an icon
  component) is the children/slot.
