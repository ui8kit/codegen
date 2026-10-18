"""Renders generated templates from JSON: stdin [{"template": "ui/button/button.html.j2", "vars": {"p": {...}, "children": "x"}}],
stdout the HTML of each (a failure is "ERROR: <message>"). Used by the parity check of xgen."""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "py"))

from ui8kit_jinja import environment  # noqa: E402

env = environment(ROOT)
out = []
for r in json.load(sys.stdin):
    try:
        out.append(env.get_template(r["template"]).render(r.get("vars") or {}))
    except Exception as e:  # noqa: BLE001
        out.append(f"ERROR: {type(e).__name__}: {e}")
sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
