# Changelog

## 3.3.0 (2026-10-24, unpublished)

One attribute rule set in all 9 runtimes (docs/contract.md#attributes-precedence-empty-values-urls),
proven by `tests/parity.attrs.test.ts` (32 cases × canonical + 9 real engines, explicit expected HTML).

- **BREAKING (output) — empty values back to the v0.1.0 contract:** a blank optional attribute (`""` or whitespace:
  `id`, `name`, `href`, `src`, `srcset`, `sizes`, `placeholder`, `aria-*`, …) is omitted again, from a named prop or from
  `Attrs`/rest alike, in every runtime. 3.2.x printed `attr=""` (React/Vue/Svelte/Solid/WC always did for rest props;
  Twig, Latte and Jinja2 since 3.2.0). Only `value` stays nullable (`""` renders `value=""`; templ `Value *string`
  unchanged). Undeclared extra attributes (`data-*`) keep an explicit `""`.
  Migration: if you relied on `href=""` (link to the current page) pass `"#"` or the URL; for other attributes `""` and
  absent are equivalent.
- **BREAKING (output) — Link/anchor `href=""`:** omitted in every runtime (templ already did); `<a>` without `href`.
- **Fix — `Attrs` precedence:** a key in `Attrs` (JS: rest props) replaces the primitive's attribute of that name
  everywhere (`class` merges). templ and Jinja2 printed both attributes (`href="/a" href="/b"`, the browser took the
  prop); with an unsafe `Attrs` URL, templ, Latte, Jinja2 (and the canonical renderer) fell back to the prop's `href`
  while React/Svelte/Vue/Solid/WC/Twig omitted it. Now the winning value is checked and an unsafe one omits the
  attribute in all runtimes (no fallback to the prop).
- **Feature — data:image placeholders in `<img src>`:** `data:image/(png|jpeg|gif|webp|avif|svg+xml)` (followed by `;`
  or `,`) is allowed for Image `src` (named or via `Attrs`) in all runtimes; `data:` stays omitted in `href`, `action`,
  `formaction`, … and on every other element; `javascript:` / `vbscript:` everywhere. `srcset` is not URL-checked
  (as before). 3.2.x dropped such `src` values, leaving `<img>` without `src`.
- Runtime helpers (backward compatible): TS `safeUrl(v, dataImage?)`, `safeRest(rest, rule?)`, `dropRestKey`,
  WC `applyRest(el, rest, rule?)`; Go `SafeImgURL`, `HasAttr`, `RestAttrs`; PHP `Rt::imgUrlOrNull`, `Rt::restAttrs`,
  `Rt::attrs($attrs, $rest, $img, $blank)` (Twig `ui8kit_img_url_or_null`); Python `safe_url(v, data_image)`,
  `has_attr`, `attr_html(a, img, blank)`. `SafeAttrs` / `Rt::safeAttrs` stay for existing callers.
- Docs: contract (attribute rules, empty-value history), runtime pages (no attribute deviations left).

Why 3.3.0 and not 3.2.1 / 4.0.0: props, types and template signatures are unchanged (no API break; new helper
parameters are optional) and the empty-value change restores the 3.1 / v0.1.0 contract that 3.2.0 changed without a
flag — but it does change rendered output and adds a feature (data:image), which is more than a patch.

## 3.2.0 (2026-10-24, unpublished)

- **BREAKING (templ):** `Value` of Input, Checkbox, Radio, Switch, Meter, Progress and SelectOption is `*string` (nil = unset, `new("")` = `value=""`).
  Migration: `Value: "x"` -> `Value: new("x")` (Go 1.26+).
- Passthrough attributes are nullable in every runtime: an explicit `""` renders `attr=""` like React; Twig `?? null`,
  Latte `?string $x = null`, Jinja2 `is not none`. **BREAKING for Twig, Latte and Jinja2 (not flagged at release):** they
  omitted `""` before (`id=""`, `href=""`, `srcset=""` now printed). Reverted in 3.3.0 except for `value`. Parity edge cases `empty value` for Input/Checkbox/Radio in all runtimes.
- Solid: an empty class attribute is omitted (Solid SSR printed `class=""`); Textarea SSR prints its value as content, never `value=""` (invalid on `<textarea>`), client sync via a ref effect; parity normalization no longer hides either.
- **Security (servers):** URL attributes (`href`, `src`, `action`, `formaction`, `poster`, `cite`, `background`, `xlink:href`),
  named props and URL keys of `Attrs`/`attrs`, omit `javascript:`, `vbscript:` and `data:` values (case / control chars ignored)
  in Latte, Twig, Jinja2 and templ (templ: no more `about:invalid#TemplFailedSanitizationURL`) and in the canonical renderer;
  non-passthrough URL expressions go through `safeUrl` in the TS runtimes too. Parity edge cases in every server suite.
  **JS runtimes:** passthrough URL props and rest spread in React, Svelte, Vue, Solid and web components go through
  `safeRest` / `applyRest` and omit the same values, so the DOM is identical everywhere (no React placeholder URL).
  Unsafe-URL edge cases compared against React in all 8 runtimes.
- Text: `del` and `ins` are allowed tags (edits, e.g. a compare-at price), in every runtime; parity cases Tag=del/ins.
- Emitters: import pruning treats a spread (`...name`) as a use (a member access `x.name` still is not).
- Twig: docs and a test require `only` on every include (no context leak). Latte: include variable inheritance documented.
- Server cn merge (Go, PHP, Python): `object-fit`, `object-position` and `aspect-*` are conflict groups, as in tailwind-merge
  (`object-cover … object-contain` kept both on the server).
- TS utils / web components: `isDevEnv` without `import.meta` (IIFE/CJS bundles work); dev warnings via `globalThis.__UI8KIT_DEV__`
  or `process.env.NODE_ENV === "development"`.
- Tests: every brick/part/showcase case through html-validate and axe-core (jsdom).
- Docs: Button `href` + `disabled` keeps `href` (+ `aria-disabled`, `tabindex="-1"`), as in v0.1.0.
