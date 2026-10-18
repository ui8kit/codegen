# @ui8kit/xgen-runtime-jinja2

[Jinja2](https://jinja.palletsprojects.com) runtime. It has no emitter of its own: the Twig emitters print the same trees through
the `jinja` dialect (`xgen/runtimes/twig/src/dialect.ts`). Output: `packages/jinja2/ui` (Python package `ui8kit-jinja2-ui`,
requires `Jinja2>=3.1,<4`).

Part of xgen (see `../README.md` and the author guide `../../../docs/specs-guide.md`). Tests: `bun test`.

## The dialect

Templates end in `.html.j2`. Differences from Twig: `x if c else y` for the ternary, `|safe` for `|raw`, `is not none`,
`p['Key']` for field access (a dot would find dict methods such as `items`), `elif`, and includes through
`ui_include(name, vars)` (a template rendered with only the given variables).

## Helpers

`assets/py/ui8kit_jinja/`: `runtime.py` (the `ui_*` functions, a port of the Go and PHP helpers), `cn_merge.py`
(tailwind-merge) and `__init__.py` (`environment(root)`, a Jinja2 `Environment` over the package folder with the functions). Copied into `packages/jinja2/ui/py/ui8kit_jinja`.
`assets/parity.py` is the parity harness; `assets/lucide-icon.html.j2` the icon asset. Generator: `xgen/generator/src/jinja2.ts`.

## Check group `jinja2`

Creates `packages/jinja2/ui/.venv`, installs `requirements.txt`, then `bin/parity.py` renders every brick case (118) and block
case (474) with real Jinja2; DOM parity with React and html-validate of every block case (`xgen/check/src/jinja2`).

## Prerequisites

Python 3.10 or newer with `venv` (and network access for the first `pip install`). Without Python the group prints
`skipped: no Python`; with `UI8KIT_REQUIRE_ALL_RUNTIMES=1` a skip is a failure.
