# Jinja2 (Python)

## Install

```bash
npx ui8kit@3 init --yes --framework jinja2 --dir templates && npx ui8kit@3 add button
pip install "Jinja2>=3.1,<4"
```

```python
from ui8kit_jinja import environment
env = environment()  # autoescape on; ui_* helpers + <name>_classes globals
env.get_template("ui/button/button.html.j2").render(p={"AriaLabel": "Save"}, children=icon_html)
```

One template per part: `ui/<brick>/<part-kebab>.html.j2` (`ui/select/select-option.html.j2`).

## Props and children

- Templates read `p` — canonical PascalCase props (`{'Tag': 'section', 'Class': '…'}`) — and
  `children`. Inside templates: `{% with p = {...}, children = html %}{% include '…' %}{% endwith %}`.
- Extra attributes: `p['Attrs']` (printed last; a key in `Attrs` replaces the attribute the primitive would print).
- Children: printed with `{{ children|safe }}` — trusted HTML only; escape user input
  (`markupsafe.escape`) or render it through a template (XSS).

## Deviations from React

- None — empty values, `Attrs` precedence and URL checks are identical in every runtime (see [contract](../contract.md#attributes-precedence-empty-values-urls)).
- No `asChild`.

## Helpers

Global `<name>_classes(p)` per part with a class contract: `{{ button_classes({'Class': 'px-4'}) }}`.

See also: [contract](../contract.md) · [docs index](../README.md) · primitive pages in [primitives/](../primitives/).
