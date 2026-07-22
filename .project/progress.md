# Progress

Statuses: pending · in progress · done · backlog

## Near-term

| Track | Status | Exit |
|-------|--------|------|
| Jinja2 runtime (J0–J4) | backlog | Eighth runtime + parity + Flask welcome example |
| Rails / ERB runtime (Er0–Er4) | backlog (later) | Ninth runtime + parity + Rails welcome; after Jinja |

## Journal

### 2026-07-22 — Plan Rails / ERB runtime

- Later codegen track after Jinja: emit target **`erb`**, primary consumer
  full Rails, secondary Sinatra/Roda (same partials).
- Mirrors BuildY `ruby-runners.md`: light Ruby first on product side (R1);
  ui8kit ERB emitter is optional **R4** — does not block BuildY R1/R2.
- Plan: [plan/rails-erb-runtime.md](./plan/rails-erb-runtime.md).

### 2026-07-21 — Plan Jinja2 runtime

- Accepted as nearest codegen backlog after current seven runtimes.
- Stack pairing: Flask + Jinja2 (+ uv) on the product side; emitter here.
- Plan: [plan/jinja2-runtime.md](./plan/jinja2-runtime.md).
