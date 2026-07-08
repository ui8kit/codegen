# Codegen examples — four welcome screens

Local preview for **generated** `ui/` primitives. Same shadcn tokens and
welcome layout on all four runtimes.

| Path | Runtime | Dev command | URL |
|------|---------|-------------|-----|
| [`templ/`](templ/) | Go Templ + HTTP | `bun run dev:templ` | http://127.0.0.1:8080 |
| [`react/`](react/) | React 19 + Vite | `bun run dev:react` | http://127.0.0.1:5173 |
| [`svelte/`](svelte/) | Svelte 5 + Vite | `bun run dev:svelte` | http://127.0.0.1:5174 |
| [`vue/`](vue/) | Vue 3 + Vite | `bun run dev:vue` | http://127.0.0.1:5175 |

Shared assets live under [`web/static/`](web/static/) (CSS tokens, Tailwind
output). Copy and feature text in [`data/welcome.json`](data/welcome.json).

All previews import from [`../generated/ui/`](../generated/ui/) — run
`bun run generate` in the parent package first.

## Quick start

From `ui8kit-codegen/`:

```bash
bun run generate          # emit generated/ui (if missing)
cd examples && bun install
bun run build:css         # Tailwind → web/static/css/app.css
bun run dev:templ         # or dev:react / dev:svelte / dev:vue
```

Or from `ui8kit-codegen/` root (after `examples` deps are installed):

```bash
bun run dev:templ
bun run dev:react
bun run dev:svelte
bun run dev:vue
```

## Layout

| Path | Role |
|------|------|
| `data/welcome.json` | Runtime-neutral copy and port map |
| `web/static/css/tokens.css` | shadcn-compatible CSS variables |
| `web/static/css/input.css` | Tailwind `@source` for generated + example files |
| `templ/welcome.templ` | Go Templ welcome block |
| `react/src/Welcome.tsx` | React twin |
| `svelte/src/Welcome.svelte` | Svelte twin |
| `vue/src/Welcome.vue` | Vue twin |
