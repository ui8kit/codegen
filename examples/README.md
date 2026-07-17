# Codegen examples — eight welcome screens

Local preview for **generated** `ui/` primitives. Same shadcn tokens and
welcome layout on all eight surfaces (seven codegen runtimes + static HTML).

| Path | Runtime | Dev command | URL |
|------|---------|-------------|-----|
| [`html/`](html/) | Static HTML export | `bun run build:html` | open `html/index.html` |
| [`templ/`](templ/) | Go Templ + HTTP | `bun run dev:templ` | http://127.0.0.1:8080 |
| [`react/`](react/) | React 19 + Vite | `bun run dev:react` | http://127.0.0.1:5173 |
| [`svelte/`](svelte/) | Svelte 5 + Vite | `bun run dev:svelte` | http://127.0.0.1:5174 |
| [`vue/`](vue/) | Vue 3 + Vite | `bun run dev:vue` | http://127.0.0.1:5175 |
| [`latte/`](latte/) | Latte + PHP server | `bun run dev:latte` | http://127.0.0.1:5176 |
| [`twig/`](twig/) | Twig + PHP server | `bun run dev:twig` | http://127.0.0.1:5177 |
| [`solid/`](solid/) | SolidJS + Vite | `bun run dev:solid` | http://127.0.0.1:5178 |

Shared assets live under [`web/static/`](web/static/) (CSS tokens, Tailwind
output). Copy and feature text in [`data/welcome.json`](data/welcome.json).

All previews import from [`../generated/ui/`](../generated/ui/) — run
`bun run generate` in the parent package first. The PHP previews
(`dev:latte`, `dev:twig`) need `php` ≥ 8.1 and `composer` (deps install into
`../generated/php/vendor` automatically).

The static export ([`react/script/generate-static.tsx`](react/script/generate-static.tsx))
renders the React welcome view with `renderToStaticMarkup`, wraps it in a
plain HTML shell, and writes one directory per route — `html/index.html`,
`html/about/index.html` — with relative links to `html/static/`.

## Quick start

From `ui8kit-codegen/`:

```bash
bun run generate          # emit generated/ui (if missing)
cd examples && bun install
bun run build:css         # Tailwind → web/static/css/app.css
bun run dev:templ         # or dev:react / dev:svelte / dev:vue / dev:solid
```

Or from `ui8kit-codegen/` root (after `examples` deps are installed):

```bash
bun run dev:templ
bun run dev:react
bun run dev:svelte
bun run dev:vue
bun run dev:solid
```

## Layout

| Path | Role |
|------|------|
| `data/welcome.json` | Runtime-neutral copy and port map |
| `web/static/css/tokens.css` | shadcn-compatible CSS variables |
| `web/static/css/input.css` | Tailwind `@source` for generated + example files |
| `templ/welcome.templ` | Go Templ welcome block |
| `react/src/Welcome.tsx` | React twin |
| `react/script/generate-static.tsx` | Static HTML export (routes + relative links) |
| `svelte/src/Welcome.svelte` | Svelte twin |
| `vue/src/Welcome.vue` | Vue twin |
| `solid/src/Welcome.tsx` | Solid twin |
| `latte/templates/welcome.latte` | Latte twin (generated `.latte` includes) |
| `twig/templates/welcome.html.twig` | Twig twin (generated `.html.twig` includes) |
