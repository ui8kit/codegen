"""Helpers of the generated Jinja2 templates (registered as `ui_*` globals).

Ported from the xgen Jinja2 runtime (tag xgen-archive-2026-10-23,
xgen/runtimes/jinja2/assets/py/ui8kit_jinja/runtime.py), trimmed to the brick
helpers the 17 primitives use. Semantics mirror the canonical renderer
(src/domain/render.ts) and runtime/go: trimmed strings, decision tables,
recipe composition, tailwind-merge-style class merging. Every helper is
None-safe.
"""

from __future__ import annotations

import html
import re
import json
import math
import os
from typing import Any

from .cn_merge import merge

_ROOT = ""
_JSON: dict[str, Any] = {}


def set_root(root: str) -> None:
    global _ROOT
    _ROOT = root


def load_json(path: str) -> Any:
    if path not in _JSON:
        with open(os.path.join(_ROOT, path), encoding="utf-8") as f:
            _JSON[path] = json.load(f)
    return _JSON[path]


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def def_(v: Any, d: Any) -> Any:
    """a prop with its default: the default when the prop is None or missing"""
    return d if v is None else v


def field(item: Any, name: str, zero: Any) -> Any:
    """a field of a record item; the key is matched without regard to case (as Go json does)"""
    if not isinstance(item, dict):
        return zero
    if name in item:
        return zero if item[name] is None else item[name]
    for k, v in item.items():
        if str(k).lower() == name.lower():
            return zero if v is None else v
    return zero


def fmt_num(f: Any) -> str:
    """String(n) of JavaScript"""
    if isinstance(f, int):
        return str(f)
    if math.isnan(f):
        return "NaN"
    if math.isinf(f):
        return "Infinity" if f > 0 else "-Infinity"
    if f == math.floor(f) and abs(f) < 1e21:
        return "%d" % int(f)
    return repr(f)


def s(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, bool):
        return "true" if v else "false"
    if _num(v):
        return fmt_num(v)
    return json.dumps(v, separators=(",", ":"), ensure_ascii=False)


def truthy(v: Any) -> bool:
    """canonical truthiness (render.ts): string non-blank, number > 0, bool itself"""
    if v is None:
        return False
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip() != ""
    if _num(v):
        return v > 0
    return bool(v)


def eq(a: Any, b: Any) -> bool:
    """strict equality (===)"""
    if _num(a) or _num(b):
        return _num(a) and _num(b) and float(a) == float(b)
    if a is None:
        return b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(a, str):
        return isinstance(b, str) and a == b
    return False


URL_ATTRS = frozenset(["href", "src", "action", "formaction", "poster", "cite", "background", "xlink:href"])


_DATA_IMAGE = re.compile(r"^data:image/(png|jpeg|gif|webp|avif|svg\+xml)[;,]")


def safe_url(v: Any, data_image: bool = False) -> str:
    """URL attribute value: "" for javascript:, vbscript: and data: (ASCII whitespace/control chars removed, case-insensitive);
    data_image (only <img src>) allows data:image/(png|jpeg|gif|webp|avif|svg+xml)."""
    t = s(v)
    k = "".join(c for c in t if ord(c) > 0x20).lower()
    if data_image and _DATA_IMAGE.match(k):
        return t
    return "" if k.startswith(("javascript:", "vbscript:", "data:")) else t


def has_attr(a: Any, name: str) -> bool:
    """the caller's Attrs set name (case-insensitive): Attrs win over the named attribute"""
    return isinstance(a, dict) and any(str(k).lower() == name for k in a)


def attr_html(a: Any, img: bool = False, blank: Any = ()) -> str:
    """the Attrs escape hatch as markup: ` name="value"`, a bare name for True, nothing for None and False;
    an unsafe URL (data:image allowed in <img src> when img) or a blank optional attribute (blank) is omitted"""
    if not isinstance(a, dict):
        return ""
    blank = list(blank or ())
    out = ""
    for k, v in a.items():
        if v is None or v is False:
            continue
        key = str(k).lower()
        if isinstance(v, str) and v.strip() == "" and key in blank:
            continue
        if isinstance(v, str) and v != "" and key in URL_ATTRS and safe_url(v, img and key == "src") == "":
            continue
        name = html.escape(str(k), quote=True)
        out += f" {name}" if v is True else f' {name}="{html.escape(s(v), quote=True)}"'
    return out


def is_set_str(v: Any) -> bool:
    return s(v).strip() != ""


def default_if_empty(v: Any, fallback: str) -> str:
    x = s(v).strip()
    return x or fallback


def map_or(v: Any, mapping: dict, fallback: str, lower: bool = False) -> str:
    x = s(v).strip()
    if lower:
        x = x.lower()
    return str(mapping[x]) if x in mapping else fallback


def int_map_or(v: Any, mapping: dict, fallback: str) -> str:
    try:
        k = int(v)
    except (TypeError, ValueError):
        k = 0
    return str(mapping[k]) if k in mapping else fallback


def bool_str(v: Any) -> str:
    return "true" if truthy(v) else "false"


def concat_trim(parts: list) -> str:
    return "".join(s(p).strip() for p in parts)


def cn(parts: list) -> str:
    return merge([s(p) for p in parts])


def _compound_hits(c: dict, pick_: Any) -> bool:
    return all(pick_(k) in str(w).split("|") for k, w in c.items() if k != "class")


def compose(path: str, selection: dict, extra: list) -> str:
    """the brick class contract: recipe base, the selected variants (defaults for empty), compounds, then the tail"""
    r = load_json(path)
    defaults = r.get("defaults") or {}

    def pick_(k: str) -> str:
        c = s(selection.get(k)).strip()
        return c or str(defaults.get(k, "")).strip()

    parts = [str(r["base"]).strip()] if str(r.get("base", "")).strip() else []
    for key in r.get("keys", []):
        choices = (r.get("byKey") or {}).get(key)
        if choices is None:
            continue
        choice = pick_(key)
        if not choice:
            if choices:
                raise ValueError(f"[compose] missing default for key {key}")
            continue
        if str(choices.get(choice, "")).strip():
            parts.append(str(choices[choice]))
    for c in r.get("compound", []) or []:
        if _compound_hits(c, pick_) and str(c.get("class", "")).strip():
            parts.append(str(c["class"]))
    return cn(parts + list(extra))


def resolve_tag(tag: Any, fallback: str, allowed: list) -> str:
    x = s(tag).strip().lower()
    return x if x and x in allowed else fallback
