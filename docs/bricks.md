# Brick definitions

Brick definitions are the single source of truth for every runtime. They live in `bricks/<name>/` and are registered in `bricks/index.ts`.

## Inventory

**33 bricks · 63 parts**

| Brick | Parts |
|-------|-------|
| `alert` | Alert |
| `badge` | Badge |
| `block` | Block |
| `box` | Box |
| `breadcrumb` | Breadcrumb |
| `button` | Button |
| `card` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `checkbox` | Checkbox |
| `container` | Container |
| `dialog` | Dialog |
| `disclosure` | Disclosure, Summary |
| `form` | Form, FormItem, FormDescription, FormMessage |
| `form/controls` | Fieldset, Legend, DataList, DataOption, Output, Meter, Progress |
| `grid` | Grid, GridCol |
| `group` | Group |
| `icon` | Icon |
| `iconbadge` | IconBadge |
| `image` | Image, Picture, Source |
| `inline` | Inline |
| `input` | Input |
| `label` | Label |
| `linebreak` | Break |
| `link` | Link |
| `list` | List, ListItem |
| `radio` | Radio |
| `select` | Select, SelectOption, OptGroup |
| `separator` | Separator |
| `stack` | Stack |
| `switch` | Switch |
| `table` | Table, TableCaption, TableHead, TableBody, TableFoot, TableRow, TableHeadCell, TableCell, TableColGroup, TableCol |
| `text` | Text |
| `textarea` | Textarea |
| `title` | Title |

List at any time:

```bash
bun src/infrastructure/cli.ts list
```

## File layout per brick

```
bricks/button/
  button.def.ts           # definition (required)
  button.variants.json    # CVA-style class recipe (if brick uses variants)
  button.data.json        # showcase fixtures for parity tests (optional)
```

## Authoring DSL (`bricks/_dsl.ts`)

Definitions import from `../_dsl`, which re-exports IR constructors and prop factories:

| Factory | Prop |
|---------|------|
| `pVariant()`, `pSize()` | CVA-bound string props |
| `pClass()` | Caller Tailwind utilities |
| `pStr(name)`, `pBool(name)`, `pInt(name)` | Scalar props |
| `pAttrs()` | Rest/attrs escape hatch |
| `pChildren()` | Children slot |
| `pPass(name)` | Passthrough attribute forward |
| `controlPassthroughProps()` | Common form control forwards |

Render tree builders: `el`, `text`, `slot`, `when`, `forEach`, `fwd`, `attrClass`, `attrExpr`, `attrBool`, `attrStatic`, `attrRest`.

## Example (abridged)

```ts
// bricks/button/button.def.ts
export default brick({
  id: "ui.button",
  dir: "button",
  recipes: { button: { file: "button.variants.json", recipe: buttonVariants } },
  parts: [{
    name: "Button",
    recipeId: "button",
    asChild: true,  // React-only; other runtimes use ButtonClasses()
    classes: {
      recipe: { variant: "Variant", size: "Size" },
      state: [{ test: prop("Disabled"), classes: "pointer-events-none opacity-50" }],
    },
    props: [
      pVariant(), pSize(), pClass(), pStr("Type"), pBool("Disabled"),
      ...controlPassthroughProps(), pAttrs(), pChildren(),
    ],
    render: el("button", [
      attrExpr("type", oneOfOr(prop("Type"), ["submit", "reset"], "button")),
      attrClass(),
      attrBool("disabled", prop("Disabled")),
      fwd("id", "ID"),
      fwd("aria-label", "AriaLabel"),
      attrRest(),
    ], [slot()]),
  }],
});
```

## Variant recipes (`*.variants.json`)

CVA-style JSON consumed by all runtimes:

```json
{
  "id": "ui.button",
  "base": "inline-flex …",
  "keys": ["variant", "size"],
  "defaults": { "variant": "default", "size": "default" },
  "byKey": {
    "variant": { "default": "…", "ghost": "…" },
    "size": { "default": "…", "sm": "…" }
  }
}
```

- Go embeds via `//go:embed` in `<brick>_gen.go`.
- TS runtimes import JSON and derive literal-union types in `<brick>.shared.ts`.
- PHP compiles recipes into constants in `Classes.php`.

## Showcase fixtures (`*.data.json`)

Optional colocated fixtures become parity test cases automatically:

```json
{
  "id": "ui.button",
  "showcase": {
    "variant.ghost": {
      "props": { "Variant": "ghost", "Size": "sm" }
    }
  }
}
```

`tests/support/fixtures.ts` loads `bricks/<dir>/<stem>.data.json` and expands each showcase entry into a test case (defaults + each fixture).

## Validation (`bun run check`)

`validateRegistry` enforces before emission:

- Recipe integrity and key alignment
- All expression `prop()` references exist on the part
- Passthrough props are not used in logic (only forwarded)
- Slot/children symmetry
- Tag group membership for dynamic tags
- No duplicate brick IDs or part names

Failures throw `DefinitionError` with a descriptive message.

## Adding a brick

1. Create `bricks/<name>/<name>.def.ts` and colocate `<name>.variants.json` (and optional `<name>.data.json`).
2. Register the import in `bricks/index.ts`.
3. Run `bun run check`.
4. Run `bun test` — parity across all runtimes is asserted automatically; no per-runtime test authoring needed.

## Multi-part bricks

Svelte and Vue require one file per part (SFC constraint):

- `Card.svelte`, `CardHeader.svelte`, …

Go Templ and React colocate all parts in one file per brick:

- `card.templ`, `card.tsx`

Latte and Twig always emit one template per part:

- `Card.latte`, `CardHeader.latte`, …

## Record types and `items` props

Some bricks declare typed records for list-driven rendering:

```ts
recordTypes: [{
  name: "SelectOptionItem",
  fields: [
    { name: "Value", type: "string" },
    { name: "Label", type: "string" },
  ],
}],
props: [
  { name: "Options", type: "items", cva: false, itemsOf: "SelectOptionItem" },
],
render: el("select", [...], [
  forEach("Options", [ el("option", [...], [text(item("Label"))]) ]),
  slot(),
]),
```

`forEach` and branched roots affect PHP template eligibility — see [PHP complex parts](./php-complex-parts.md).

## Deliberate deviations from upstream

Uniform contract improvements verified across all runtimes:

- Empty string attributes are omitted (`name=""`, `class=""` never emitted).
- `IconBadge` deprecated legacy props dropped from generated API.
- React `<textarea>` maps content to `defaultValue` (SSR output identical).
- Rest/`Attrs` spread is always last — caller wins deterministically.
- `Title`/`CardTitle` React-only `H1`–`H6` wrappers not generated; use `as={1..6}`.
