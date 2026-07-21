# Plan: Jinja2 runtime

**Status:** nearest backlog  
**Goal:** eighth emit target — idiomatic Jinja2 templates from the same brick
defs as Twig/Latte, with DOM parity.

**Consumers:** Flask (+ uv) SSR apps; BuildY `python-flask-jinja` template
(see BuildY `plan/php-python-runners.md`).

## Why Jinja2 next

- Same SSR class as Twig/Latte (Twig was inspired by Jinja).
- Python Flask stack is the light SSR counterpart to Slim/Flight + PHP.
- Domain IR should not need changes; work is mostly a new `Emitter` + Python
  runtime helpers + parity harness (same path as [docs/architecture.md](../../docs/architecture.md)
  “Adding a new runtime”).

## Composition model (expected)

Mirror PHP template engines:

| Concern | Approach |
|---------|----------|
| Children | Pre-rendered HTML string, printed unescaped (`|safe`) |
| Nesting | `{% set inner %}…{% endset %}` then `include` / `macro` with `children=inner` |
| Attrs | Caller map merged last (Twig-style helper or Jinja filter) |
| Class merge | Python `cn()` equivalent (plain concat like Go/PHP `Rt::cn`) |
| Variants | Embed/load colocated `*.variants.json` or shared recipe helper |

Likely output: `ui/<brick>/<Part>.html.j2` (or `.jinja2`) — pick one extension
in J0 and stick to it.

## Coverage

Start with the **same structural predicate** as Latte/Twig
(`phpSupported()` / docs/php-complex-parts.md):

- Target **60 / 63** parts initially.
- Skip `breadcrumb/Breadcrumb`, `select/Select`, `icon/Icon` for the same
  reasons (forEach / branched root / branched slots).
- Emit Python class helpers for **all** parts with a classes contract
  (mirror `Classes.php`).

Prefer renaming the predicate to something engine-neutral
(`templateSupported` / `ssrTemplateSupported`) when Jinja lands, without
changing skip semantics.

## Work items

### J0 — Spike + naming

- [ ] Confirm output extension, include path layout, and Flask loader roots.
- [ ] Decide Python package layout under `generated/` (e.g. `python/ui8kit/`
      with `cn`, expr helpers, optional Jinja extension/filters).
- [ ] Document composition snippet in the plan spike notes (welcome-card nest).

### J1 — Emitter

- [ ] `RuntimeName` += `"jinja"`; register in `ALL_RUNTIMES` / CLI `--runtimes`.
- [ ] `src/emitters/jinja.ts` (+ expr printer; reuse analysis patterns from
      `php-common` / `twig` where safe).
- [ ] Wire `generate.ts`: copy `runtime/python/*`, emit helpers, no duplicate paths.
- [ ] Prop naming: HTML-native (same as Svelte/Vue/PHP).

### J2 — Parity + deps

- [ ] `pyproject.toml` / uv-friendly deps: Jinja2 (pin range).
- [ ] `cmd/parity-jinja/` harness (JSON in → HTML out), skip if Python/uv missing.
- [ ] `tests/parity.jinja.test.ts` (or `.py` driven from Bun like PHP suites).
- [ ] Extend `emitters.test.ts` structural checks.

### J3 — Example

- [ ] `examples/jinja/` — Flask (or minimal Jinja-only server) welcome twin of
      latte/twig; shared `data/welcome.json` + `web/static` CSS.
- [ ] `bun run dev:jinja` script + docs in `examples/README.md` / `docs/runtimes.md`.

### J4 — Docs + optional bundle

- [ ] Update overview, architecture, runtimes, contract, testing, getting-started
      (“seven” → “eight” where accurate).
- [ ] Optional: `generate:jinja-bundle` (Jinja-only package, latte-bundle analogue).

## Explicit non-goals (this plan)

- Django templates / Mako emitters.
- Full 63/63 PHP-complex parts before Jinja ships.
- BuildY runner images (product repo owns `buildy-runner-python`).
- Changing brick defs solely for Jinja.

## Exit criteria

- `bun run generate --runtimes jinja` (or all-eight default) writes templates +
  Python helpers.
- Parity suite green when Python is on PATH (skip cleanly when absent).
- Welcome example renders the same layout tokens as other runtimes.
- Docs list Jinja2 as a first-class runtime.

## References

- Latte/Twig composition: [docs/runtimes.md](../../docs/runtimes.md)
- PHP skips: [docs/php-complex-parts.md](../../docs/php-complex-parts.md)
- Add-runtime checklist: [docs/architecture.md](../../docs/architecture.md)
