# Authoring

The specs written with the builder (`../build.ts`), one folder per tier of the generated packages:

| Folder | What it writes | Generated into |
|---|---|---|
| `components/` | parts and patterns: small pieces a block is built from | `packages/*/ui/src/components/` |
| `blocks/` | organisms: the page sections (`organisms.ts` lists them all) | `packages/*/ui/src/blocks/` |
| `gallery/` | the block gallery: one sample per variant, the coverage registry | `apps/*/xgen/screens/BlocksScreen*` |
| `screens/` | composed screens: the theme apps, the plans page | `apps/*/xgen/screens/` |
| `presets/` | named class sets (block geometry of the default preset) | `packages/*/ui/src/presets/` |

Primitives are not written here: they are JSON specs in `xgen/specs/ui/`.
The files at the root are shared helpers: `kit.ts` (spec, fields, ts), `ux.ts` (class helpers),
`forms.ts` and `placeholders.ts`.

Every generated file names its source on line 2 (`Source: ...`). After an edit, run `bun run build`.
