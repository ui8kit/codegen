# Runtimes

All eight targets are generated from the same specs. React is the reference DOM; the other runtimes are compared with it.

| Runtime | Package dir | Name | Consume |
|---|---|---|---|
| Svelte 5 | `packages/svelte/ui` | `@ui8kit/svelte-ui` | import from the package (Vite + `@sveltejs/vite-plugin-svelte`); `@import "@ui8kit/svelte-ui/styles/index.css"` |
| React 19 | `packages/react/ui` | `@ui8kit/react-ui` | Vite or any bundler that compiles TSX |
| Vue 3 | `packages/vue/ui` | `@ui8kit/vue-ui` | `@vitejs/plugin-vue` |
| SolidJS 1.9 | `packages/solid/ui` | `@ui8kit/solid-ui` | `vite-plugin-solid` |
| Go templ | `packages/templ/ui` | `github.com/ui8kit/codegen/packages/templ/ui` | `templ generate && go build` (templ v0.3.1070 pinned in `go.mod`: use `go run github.com/a-h/templ/cmd/templ@v0.3.1070 generate`) |
| Twig | `packages/twig/ui` | `@ui8kit/twig-ui` | `composer install`, register the extension, a loader rooted at `ui/` |
| Latte | `packages/latte/ui` | `@ui8kit/latte-ui` | `composer install`, the Latte extension in `php/` |
| Jinja2 | `packages/jinja2/ui` | `@ui8kit/jinja2-ui` | `pip install -r requirements.txt`, the `ui8kit_jinja` helpers in `py/`, a loader rooted at `ui/` |

Layout of a TypeScript package: `src/primitives/<brick>/` (bricks), `src/components/` (parts and patterns),
`src/blocks/` (organisms), `src/presets/`, `src/utils/` (`cn`, `variants`, formatting helpers), `src/styles/`
(`theme.css` tokens, `kit.css`, `index.css`). File names are kebab-case (`sheet-trigger.svelte`, `theme-toggle.tsx`).

Layout of a template package: `ui/<brick>/` (bricks), `blocks/` (organisms), helpers (`utils/` in Go, `php/` in PHP,
`py/ui8kit_jinja/` in Python), and the variant tables as JSON next to the templates.

Styles: Tailwind v4 with shadcn tokens (`theme.css`), skins override variables only (`packages/shared/app/src/styles/skins.css`,
sources in `xgen/runtimes/core/assets/styles/skins`). Add `@source` for the package or template folder so Tailwind sees
every class.

What does not carry over between runtimes (context, `$bindable`, attachments, raw HTML, `v-model`) and the explicit
contract that replaces it: `xgen/specs/_nonportable.json`, checked by the `nonportable` group.
