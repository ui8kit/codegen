# Plan: Rails / ERB runtime

**Status:** later backlog (after Jinja2 J0–J4)  
**Goal:** ninth emit target — idiomatic **ERB** templates from the same brick
defs as Twig/Latte/Jinja, with DOM parity.

**Primary consumer:** full **Rails** apps (sqlite-first SSR).  
**Secondary consumers:** light Ruby stacks (**Sinatra or Roda + ERB**) — same
templates, thinner host.

BuildY owns runners/images; this repo owns the emitter + Ruby helpers +
parity. Product track: BuildY `.project/plan/ruby-runners.md` (R0–R4; ERB
emitter is **R4**, optional, after light template R1).

## Why Rails / ERB (and when)

| | |
|--|--|
| **Why ERB** | Default Rails view language; also used by Sinatra/Roda light templates. One emitter serves both levels. |
| **Why not first** | BuildY ships PHP/Python runners (T0–T3) and Jinja codegen (**J0–J4**) first. Ruby is the **last** template-runner track. |
| **Gate** | Start Er0 only after Jinja is first-class *and* BuildY has at least a light Ruby preview path (R1) **or** explicit product demand for ui8kit bricks in ERB (BuildY R4). |

Mirror Jinja/Twig lessons: HTML-string children, structural skip predicate,
class helpers for unsupported parts. No brick-def changes solely for ERB.

## Composition model (expected)

Same SSR class as Twig / Latte / Jinja:

| Concern | Approach |
|---------|----------|
| Children | Pre-rendered HTML string, printed unescaped (`<%= children.html_safe %>` / `raw`) |
| Nesting | Capture (`<% capture do %>…<% end %>`) or partials with a `children:` local |
| Attrs | Caller hash merged last (Ruby helper, Twig-style) |
| Class merge | Ruby `cn()` (plain concat, same as PHP `Rt::cn` / Python) |
| Variants | Colocated `*.variants.json` or shared recipe helper |

Likely output: `ui/<brick>/_part.html.erb` or `ui/<brick>/part.html.erb` —
pick one partial naming convention in **Er0** and stick to it (Rails partial
prefix `_` vs Sinatra flat views).

## Coverage

Start with the **same structural predicate** as Latte/Twig/Jinja
(`phpSupported()` → rename toward `ssrTemplateSupported` when Jinja lands):

- Target **60 / 63** parts initially.
- Skip `breadcrumb/Breadcrumb`, `select/Select`, `icon/Icon` for the same
  reasons (forEach / branched root / branched slots).
- Emit Ruby class helpers for **all** parts with a classes contract
  (mirror `Classes.php` / Python helpers).

## Work items

### Er0 — Spike + naming

- [ ] Confirm ERB partial layout, Rails `render` locals, and Sinatra/Roda
      include path (one layout, both hosts).
- [ ] Decide Ruby package layout under `generated/` (e.g. `ruby/lib/ui8kit/`
      with `cn`, attr helpers; optional Rails engine vs plain gem).
- [ ] Document composition snippet (welcome-card nest) for ERB.
- [ ] Asset story for examples: **importmap / Propshaft** preferred (align
      BuildY R2); no mandatory Node pipeline in the reference.

### Er1 — Emitter

- [ ] `RuntimeName` += `"erb"` (or `"rails"` only if CLI must be product-named —
      prefer **`erb`**: language is the emit target).
- [ ] Register in `ALL_RUNTIMES` / CLI `--runtimes`.
- [ ] `src/emitters/erb.ts` (+ expr printer; reuse `php-common` / Twig / Jinja
      analysis where safe).
- [ ] Wire `generate.ts`: copy `runtime/ruby/*`, emit helpers, no duplicate paths.
- [ ] Prop naming: HTML-native (same as Svelte/Vue/PHP/Jinja).

### Er2 — Parity + deps

- [ ] Gemspec / Bundler pin for parity harness (MRI 3.3+).
- [ ] `cmd/parity-erb/` (or `parity-rails/`) harness: JSON in → HTML out;
      skip cleanly if `ruby` / `bundle` missing.
- [ ] `tests/parity.erb.test.ts` (Bun-driven like PHP suites).
- [ ] Extend `emitters.test.ts` structural checks.

### Er3 — Examples

- [ ] `examples/erb-rails/` — minimal **Rails** welcome twin (sqlite optional /
      no external DB on default route); shared `data/welcome.json` + static CSS.
- [ ] Optional light twin: `examples/erb-sinatra/` **or** document that the
      same `ui/` partials render under Sinatra/Roda (one welcome is enough for
      Er3 if partials are host-agnostic).
- [ ] `bun run dev:rails` (or `dev:erb`) + docs in `examples/README.md` /
      `docs/runtimes.md`.

### Er4 — Docs + optional bundle

- [ ] Update overview, architecture, runtimes, contract, testing,
      getting-started (“eight” → “nine” where accurate, after Jinja ships).
- [ ] Optional: `generate:erb-bundle` (ERB/Ruby-only package, latte-bundle
      analogue) for Rails engines / gems.

## Explicit non-goals (this plan)

- Shipping ERB **before** Jinja2 (J0–J4 remains nearest backlog).
- BuildY runner images / registry (`buildy-runner-ruby`, templates) — product
  repo owns those (BuildY `plan/ruby-runners.md`).
- Haml / Slim-ruby emitters (BuildY R4 mentions Slim only as a later option).
- Full 63/63 complex parts before ERB ships.
- Mandatory Postgres / Redis / Node asset pipeline for the welcome example.
- Changing brick defs solely for Rails.

## Exit criteria

- `bun run generate --runtimes erb` writes ERB partials + Ruby helpers.
- Parity suite green when Ruby/Bundler is on PATH (skip cleanly when absent).
- Rails welcome example renders the same layout tokens as other runtimes.
- Docs list ERB as a first-class runtime; BuildY can consume partials in
  `ruby-rails` and light Sinatra/Roda templates without a second emitter.

## Mapping to BuildY

```text
BuildY R0–R1  runner + light Sinatra/Roda+ERB   (no codegen required)
BuildY R2     full Rails template               (manual/LLM ERB OK)
BuildY R4     optional ui8kit ERB emitter  ←→  this plan Er0–Er4
```

Codegen does **not** block BuildY R1/R2. Er* starts when Jinja is done and
R4 demand (or an explicit “emit for Rails bricks” decision) is open.

## References

- BuildY Ruby track: `@buildy-ui/.project/plan/ruby-runners.md`
- Jinja plan (prior SSR template runtime): [jinja2-runtime.md](./jinja2-runtime.md)
- Latte/Twig composition: [docs/runtimes.md](../../docs/runtimes.md)
- PHP skips: [docs/php-complex-parts.md](../../docs/php-complex-parts.md)
- Add-runtime checklist: [docs/architecture.md](../../docs/architecture.md)
