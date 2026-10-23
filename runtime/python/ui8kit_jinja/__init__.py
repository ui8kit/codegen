"""UI8Kit primitives for Jinja2.

`environment()` returns a Jinja2 Environment over the generated folder with
the `ui_*` helpers and one `<name>_classes(p)` global per part (the
server-composition escape hatch: Jinja2 has no asChild).

Templates are `ui/<brick>/<part>.html.j2`, rendered with `p` (canonical
PascalCase props, e.g. {"Variant": "outline", "Class": "...", "Attrs": {...}})
and `children` (pre-rendered markup).

SECURITY: `children` is printed with `|safe` — it is trusted HTML. Never pass
unescaped user input as `children`; escape it first (markupsafe.escape) or
render it through another template. Props are always autoescaped.
"""

from __future__ import annotations

import functools
import os
from typing import Any

from jinja2 import ChainableUndefined, Environment, FileSystemLoader
from jinja2.runtime import Undefined
from markupsafe import Markup

from . import runtime as rt
from .classes import CLASS_EXPRESSIONS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _plain(v: Any) -> Any:
    if isinstance(v, Undefined):
        return None
    if isinstance(v, list):
        return [_plain(x) for x in v]
    return v


def _wrap(f: Any, safe: bool = False) -> Any:
    @functools.wraps(f)
    def call(*args: Any) -> Any:
        out = f(*[_plain(a) for a in args])
        return Markup(out) if safe else out

    return call


_NAMES = {"def": "def_"}
_PLAIN = [
    "def", "field", "s", "truthy", "eq", "is_set_str", "default_if_empty", "map_or", "int_map_or",
    "bool_str", "concat_trim", "cn", "compose", "resolve_tag", "safe_url",
]
VOID_TAGS = frozenset(
    ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]
)


def environment(root: str | None = None, **options: Any) -> Environment:
    """An Environment over the generated jinja2 folder (autoescape on, chainable undefined)."""
    root = root or ROOT
    rt.set_root(root)
    env = Environment(loader=FileSystemLoader(root), autoescape=True, undefined=ChainableUndefined, **options)
    for name in _PLAIN:
        env.globals["ui_" + name] = _wrap(getattr(rt, _NAMES.get(name, name)))
    env.globals["ui_attr_html"] = _wrap(rt.attr_html, safe=True)
    env.globals["ui_is_void"] = lambda t: str(t) in VOID_TAGS
    for name, source in CLASS_EXPRESSIONS.items():
        env.globals[name] = _classes_fn(env, source)
    return env


def _classes_fn(env: Environment, source: str) -> Any:
    expr = env.compile_expression(source)

    def classes(p: Any = None) -> str:
        """Composes the part's classes without rendering (recipe → static → extra → state → Class)."""
        return str(expr(p=_plain(p) or {}) or "")

    return classes
