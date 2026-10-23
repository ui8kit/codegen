# Changelog

## 3.2.0 (2026-10-24, unpublished)

- **BREAKING (templ):** `Value` of Input, Checkbox, Radio, Switch, Meter, Progress and SelectOption is `*string` (nil = unset, `new("")` = `value=""`).
  Migration: `Value: "x"` -> `Value: new("x")` (Go 1.26+).
- Passthrough attributes are nullable in every runtime: an explicit `""` renders `attr=""` like React; Twig `?? null`,
  Latte `?string $x = null`, Jinja2 `is not none`. Parity edge cases `empty value` for Input/Checkbox/Radio in all runtimes.
- Solid: an empty class attribute is omitted (Solid SSR printed `class=""`); Textarea SSR prints its value as content, never `value=""` (invalid on `<textarea>`), client sync via a ref effect; parity normalization no longer hides either.
- **Security (servers):** URL attributes (`href`, `src`, `action`, `formaction`, `poster`, `cite`, `background`, `xlink:href`),
  named props and URL keys of `Attrs`/`attrs`, omit `javascript:`, `vbscript:` and `data:` values (case / control chars ignored)
  in Latte, Twig, Jinja2 and templ (templ: no more `about:invalid#TemplFailedSanitizationURL`) and in the canonical renderer;
  non-passthrough URL expressions go through `safeUrl` in the TS runtimes too. Parity edge cases in every server suite.
  **JS runtimes:** passthrough URL props and rest spread in React, Svelte, Vue, Solid and web components go through
  `safeRest` / `applyRest` and omit the same values, so the DOM is identical everywhere (no React placeholder URL).
  Unsafe-URL edge cases compared against React in all 8 runtimes.
- Emitters: import pruning treats a spread (`...name`) as a use (a member access `x.name` still is not).
- Twig: docs and a test require `only` on every include (no context leak). Latte: include variable inheritance documented.
- Server cn merge (Go, PHP, Python): `object-fit`, `object-position` and `aspect-*` are conflict groups, as in tailwind-merge
  (`object-cover … object-contain` kept both on the server).
- TS utils / web components: `isDevEnv` without `import.meta` (IIFE/CJS bundles work); dev warnings via `globalThis.__UI8KIT_DEV__`
  or `process.env.NODE_ENV === "development"`.
- Tests: every brick/part/showcase case through html-validate and axe-core (jsdom).
- Docs: Button `href` + `disabled` keeps `href` (+ `aria-disabled`, `tabindex="-1"`), as in v0.1.0.
