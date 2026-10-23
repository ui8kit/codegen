"""Parity harness: stdin [{"template": "ui/button/button.html.j2", "p": {...}, "children": "<b>x</b>"}],
stdout a JSON list of rendered HTML. Test-only: children are trusted markup."""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from markupsafe import Markup  # noqa: E402

from ui8kit_jinja import environment  # noqa: E402

env = environment()
out = []
for r in json.load(sys.stdin):
    out.append(env.get_template(r["template"]).render(p=r.get("p") or {}, children=Markup(r.get("children") or "")))
sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
