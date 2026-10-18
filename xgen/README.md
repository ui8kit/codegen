# xgen

A generation layer for the intersection of UI runtimes. It lives in the monorepo as a **set of packages that depend only on each other**
(never on `apps/` or `packages/`), so the folder can move to a repository of its own without changes.

## Flow

```
xgen/specs/ui/*.json ──────────┐                                  ┌─► packages/svelte/ui  (@ui8kit/svelte-ui)
xgen/specs/_nonportable.json   │   @ui8kit/xgen-spec    ┐                │
xgen/fixtures/*.json ──────────┼─► @ui8kit/xgen-screens ┼─► @ui8kit/xgen-generator ─► packages/react/ui   (@ui8kit/react-ui)
xgen/content/ui/en.json ───────┤   runtime-*     ┘                │
apps/host-*/xgen.app.json ─────┘                                  ├─► packages/shared/app (@ui8kit/app-shared: dictionary, data, menus, runtime core)
                                                                   └─► apps/host-svelte, apps/host-react (one host per runtime, a screen per lazy chunk)
xgen/screens/src/authoring ──► xgen/specs/organisms, xgen/specs/screens   (JSON, stored and checked)
```

The drawing shows the first two targets. Today the generator writes eight packages (`packages/{svelte,react,vue,solid}/ui`,
`packages/{templ,twig,jinja2,latte}/ui`), the shared app and four host apps (`apps/host-{svelte,react,vue,solid}`).
For authors: [../docs/specs-guide.md](../docs/specs-guide.md).

## What people write

| input | where | schema |
|---|---|---|
| brick spec: props, variants, slots, events, a11y, data attributes, tokens, examples, `portable` | `specs/ui/<brick>.json`, `<brick>.variants.json` | `schema/schemas/spec`, `variants` |
| organism, part, pattern, block, preset and screen: built from primitives with the builder | `screens/src/authoring/*.ts` -> `specs/{organisms,parts,patterns,blocks,presets,screens}` | `organism`, `block`, `screen` |
| data | `fixtures/<collection>.json` (Codex entries) | `collection` |
| text | `content/ui/en.json` | `dictionary` |
| a host app | `apps/host-<runtime>/xgen.app.json` (name, runtime, screens (`["*"]` = every portable screen), title, port, locale, theme, hand) | `app` |
| a menu | `menu` of a screen spec (`[{path, label, screen}]`), written by the builder | `screen` |

The one-time importer of the first 33 bricks from `ui8kit/codegen` is `spec/tools/import-codegen.ts`; after it the specs belong to xgen.

## The view IR (`@ui8kit/xgen-screens`)

An organism or a screen is a tree. Nodes: `use` (a primitive by its canonical name with `props`, `attrs`, `on` handlers, children),
`text`, `when`, `each`, `slot` (a render prop with arguments), `organism`, `outlet`. Values are a literal, a reference `{"$":"plan.name"}`
or an op (`eq ne not and or gt lt add cond len at tpl money num`). The validator rejects: an unknown part or prop, a value that is not a
variant of the recipe, a literal text, a text-bearing prop (`AriaLabel`, `Placeholder`, `Alt`, `Title`) that is not a reference,
a computed ARIA state, a reference out of scope, a wrong op arity, an unknown handler.

## Checks (`xgen check`)

`schema` (all JSON against the schemas, contract metadata equals the render tree) - `props` (examples, tokens, views) - `a11y` -
`authored` (stored JSON equals the builder) - `coverage` (every spec generated for every runtime or `portable:false` with a reason) -
`nonportable` (no `setContext`, `$bindable`, `{@attach` in Svelte, no `createContext` in React) - `text` (no Cyrillic, every content key exists) -
the catalog, style and rule groups (`dictionary`, `blocks`, `registry`, `themes`, `routes`, `structure`, `hardcode`, `corners`, `shadows`,
`spacing`, `readability`, `dead`, `duplicates`, `versions`, `tests`, `rules`) -
`drift` (the disk equals the regeneration; no hand-written file in a generated package or app; the header is on every file) -
real-engine parity of `templ`, `solid`, `twig`, `jinja2` and `latte` (every brick and block case renders the same DOM as React; html-validate).
The output of `bun run check` lists every group with its one-line summary.

`xgen e2e` serves the built hosts and runs the scenario of every screen at `/<screen>/` (plans: sort, search, pager, record, history, theme; site; themes; gallery),
takes light and dark screenshots into `shots/` and compares the DOM of the svelte, react, vue and solid hosts state by state. `xgen shot <screen>` takes one full-page screenshot.

## Moving out

Copy `xgen/` to a new repository. The only things it reads from outside are the workspace root (where `packages/` and `apps/` are written)
and `bun` workspaces. Nothing in xgen imports from `apps/` or `packages/`.

## Host apps

A landing, a theme, the gallery: each is a **screen spec** (`specs/screens/*.json`), never an app.
There is one host app per TypeScript runtime (`apps/host-svelte`, `apps/host-react`, `apps/host-vue`, `apps/host-solid`); the template runtimes have none. The host front controller (`src/`) reads the screen key
from the path (`/<screen>/#/<route>` or `?screen=<key>`), sets the skin and title, and lazy-loads the screen chunk from `xgen/screens/`.
The shared outputs (dictionary, data, menus, runtime core, skins) are emitted once into `packages/shared/app`. Every generated file says DO NOT EDIT.
To add a screen: write it in `screens/src/authoring`, run `bun run build`; every host serves it, no app directory appears.
