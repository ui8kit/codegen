# Examples

Seven local welcome previews demonstrate **generated** `ui/` primitives with shared shadcn design tokens and identical layout across runtimes.

## Preview matrix

| Path | Runtime | Dev command | URL |
|------|---------|-------------|-----|
| [`examples/html/`](../examples/html/) | Static HTML export | `bun run build:html` | Open `html/index.html` |
| [`examples/templ/`](../examples/templ/) | Go Templ + HTTP | `bun run dev:templ` | http://127.0.0.1:8080 |
| [`examples/react/`](../examples/react/) | React 19 + Vite | `bun run dev:react` | http://127.0.0.1:5173 |
| [`examples/svelte/`](../examples/svelte/) | Svelte 5 + Vite | `bun run dev:svelte` | http://127.0.0.1:5174 |
| [`examples/vue/`](../examples/vue/) | Vue 3 + Vite | `bun run dev:vue` | http://127.0.0.1:5175 |
| [`examples/latte/`](../examples/latte/) | Latte + PHP server | `bun run dev:latte` | http://127.0.0.1:5176 |
| [`examples/twig/`](../examples/twig/) | Twig + PHP server | `bun run dev:twig` | http://127.0.0.1:5177 |

## Quick start

From repo root:

```bash
bun run generate
cd examples && bun install
bun run build:css
bun run dev:react    # or any dev:* command
```

Or from root (after `examples` deps installed):

```bash
bun run dev:react
```

**Prerequisite:** `bun run generate` must have run first — all previews import from `../generated/ui/`.

**PHP previews** (`dev:latte`, `dev:twig`) additionally need PHP 8.1+ and Composer. Dependencies install into `../generated/php/vendor` via `examples/scripts/composer-install.mjs`.

## Shared assets

| Path | Role |
|------|------|
| `examples/data/welcome.json` | Runtime-neutral copy and port map |
| `examples/web/static/css/tokens.css` | shadcn-compatible CSS variables |
| `examples/web/static/css/input.css` | Tailwind v4 `@source` for generated + example files |
| `examples/web/static/css/app.css` | Built Tailwind output (`bun run build:css`) |

## Per-runtime welcome sources

| Runtime | Source file |
|---------|-------------|
| Templ | `examples/templ/welcome.templ` |
| React | `examples/react/src/Welcome.tsx` |
| Svelte | `examples/svelte/src/Welcome.svelte` |
| Vue | `examples/vue/src/Welcome.vue` |
| Latte | `examples/latte/templates/welcome.latte` |
| Twig | `examples/twig/templates/welcome.html.twig` |
| Static HTML | Generated from React via `examples/react/script/generate-static.tsx` |

## Welcome page content

Each preview renders:

1. **Hero** — runtime badge, title, subtitle
2. **Primitives card** — button variants, badge variants (generated components)
3. **Feature grid** — three cards describing spec-driven codegen, seven runtimes, DOM parity
4. **Links box** — documentation links
5. **Footer** — attribution line

### Primitives showcased

The welcome page demonstrates a **subset** of the full inventory:

- `Badge`, `Title`, `Text`, `Stack`
- `Button` (5 variants), `Badge` (3 variants), `Group`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`

It does not render every brick — full coverage is in parity tests. Parts skipped by PHP (Icon, Select, Breadcrumb) are not in the welcome demo.

## Latte composition example

From `examples/latte/templates/welcome.latte`:

```latte
{capture $buttons}
  {include '../../../generated/ui/button/Button.latte', variant: 'default', size: 'sm', children: 'Default'}
  {* … more buttons … *}
{/capture}
{capture $primitivesCard}
  {include '../../../generated/ui/card/Card.latte', variant: 'default', children: (string) $primitivesCardInner}
{/capture}
```

Nested includes require `(string)` casts when concatenating captures.

## Twig composition example

From `examples/twig/templates/welcome.html.twig`:

```twig
{% set buttons %}
  {% include 'button/Button.html.twig' with {variant: 'default', size: 'sm', children: 'Default'} only %}
{% endset %}
{% include 'card/Card.html.twig' with {variant: 'default', children: primitivesInner} only %}
```

Twig loader root: `generated/ui/` (configured in `server.php`).

## Static HTML export

```bash
bun run build:html
```

`generate-static.tsx`:

1. Renders React `Welcome` with `renderToStaticMarkup`
2. Wraps in plain HTML shell with CSS links
3. Writes routes:
   - `examples/html/index.html`
   - `examples/html/about/index.html`
4. Uses relative links to `static/css/`

## PHP dev servers

`examples/latte/server.php` and `examples/twig/server.php`:

- Bootstrap Latte/Twig with `generated/ui/` as template root
- Serve `welcome` and `page` routes
- Link shared CSS from `examples/web/static/`

Started by `examples/scripts/php-server.mjs`.

## Templ dev server

`examples/templ/cmd/server` — Go HTTP server after `gen:templ`:

1. `templ generate` on `generated/` and `examples/templ/`
2. `go run ./cmd/server` on port 8080

## Vite dev servers

React, Svelte, Vue each have `vite.config.ts` pointing at generated `ui/` imports and shared CSS.

## Tailwind v4 setup

`examples/web/static/css/input.css` uses `@source` directives to scan:

- Generated component files
- Example source files

Ensures utility classes used in generated primitives are included in `app.css`.
