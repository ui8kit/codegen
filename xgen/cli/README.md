# xgen

The xgen command: build, check, e2e, shot, visual, list.

Part of xgen (see `../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

## Usage

```
xgen build   # regenerate packages and apps
xgen check   # fail on any problem, including drift
xgen e2e     # every host app (svelte, react, vue, solid), same scenario, screenshots, DOM pair test
xgen shot    # one full-page screenshot of a screen
xgen visual  # pixel gate: every state of every host, light and dark
xgen list    # counts, targets, hand-written files per app
```

`xgen check` also runs the real-engine parity groups `templ`, `solid`, `twig`, `jinja2` and `latte`; each skips without its
toolchain (Go, PHP + composer, Python). With `UI8KIT_REQUIRE_ALL_RUNTIMES=1` a skipped group fails (meant for CI).

```
```
