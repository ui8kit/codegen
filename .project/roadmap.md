# Roadmap

## Active

Keep seven-runtime parity green (templ, react, svelte, vue, solid, latte, twig).
No breaking IR or brick-contract changes without parity coverage.

## Nearest backlog

| ID | Item | Plan |
|----|------|------|
| **J0–J4** | **Jinja2 runtime** (eighth emit target) | [plan/jinja2-runtime.md](./plan/jinja2-runtime.md) |

Primary consumer path: Flask + Jinja2 (BuildY `buildy-runner-python` track).
Reuse Twig/Latte lessons: HTML-string children, structural skip predicate,
class helpers for unsupported parts.

## Later (not scheduled)

| ID | Item | Plan |
|----|------|------|
| **Er0–Er4** | **Rails / ERB runtime** (ninth emit target) | [plan/rails-erb-runtime.md](./plan/rails-erb-runtime.md) |

Primary consumer: full Rails; same partials for Sinatra/Roda light stacks.
Aligns with BuildY `plan/ruby-runners.md` **R4** (optional ERB emitter after
light Ruby R1). Start only after Jinja and product demand / BuildY R4 gate.

Other later items:

- Jinja-only bundle profile (mirror `generate:latte-bundle`)
- PHP complex-part loops/branches if Jinja gains them first
- Behavior-driven `components/` (needs `@ui8kit/aria` contract)
