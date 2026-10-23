# Changelog

## 3.2.0 (2026-10-24, unpublished)

- **BREAKING (templ):** `Value` of Input, Checkbox, Radio, Switch, Meter, Progress and SelectOption is `*string` (nil = unset, `new("")` = `value=""`).
  Migration: `Value: "x"` -> `Value: new("x")` (Go 1.26+).
- Passthrough attributes are nullable in every runtime: an explicit `""` renders `attr=""` like React; Twig `?? null`,
  Latte `?string $x = null`, Jinja2 `is not none`. Parity edge cases `empty value` for Input/Checkbox/Radio in all runtimes.
- Solid: an empty class attribute is omitted (Solid SSR printed `class=""`); Textarea SSR prints its value as content, never `value=""` (invalid on `<textarea>`), client sync via a ref effect; parity normalization no longer hides either.
- TS utils / web components: `isDevEnv` without `import.meta` (IIFE/CJS bundles work); dev warnings via `globalThis.__UI8KIT_DEV__`
  or `process.env.NODE_ENV === "development"`.
- Tests: every brick/part/showcase case through html-validate and axe-core (jsdom).
- Docs: Button `href` + `disabled` keeps `href` (+ `aria-disabled`, `tabindex="-1"`), as in v0.1.0.
