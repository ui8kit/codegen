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

- Jinja-only bundle profile (mirror `generate:latte-bundle`)
- PHP complex-part loops/branches if Jinja gains them first
- Behavior-driven `components/` (needs `@ui8kit/aria` contract)
