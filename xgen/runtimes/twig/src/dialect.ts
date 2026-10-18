// The Jinja-family syntax the emitters print through. Twig is the only dialect today; Jinja2 differs in a handful of
// forms (ternary order, `safe` for `raw`, `is not none`, include with a context dict), so a Jinja2 target is a second
// Dialect object over the same brick and organism emitters, with a Python port of the ui_* helpers.

export interface Dialect {
  name: "twig" | "jinja" | "latte";
  /** template file suffix: `.html.twig`, `.html.j2` */
  ext: string;
  str(s: string): string;
  /** the null literal */
  nul: string;
  /** a key of a map: `p.Title` (Twig), `p['Title']` (Jinja: a dot would find dict methods such as items) */
  field(base: string, key: string): string;
  isNotNull(e: string): string;
  /** a variable read: `x` (Twig, Jinja), `$x` (Latte); declarations take the bare name */
  v(name: string): string;
  emptyHash: string;
  /** a map with integer keys */
  intHash(entries: Array<[string, string]>): string;
  and: string;
  or: string;
  contains(hay: string, needle: string): string;
  /** an element whose name is a variable, opened as a static name rewritten at render (Latte n:tag: a printed name cannot be followed by a line break, and a void name would need no close) */
  dynamicTag?(name: string, tagVar: string): string;
  /** an attribute value, when the dialect treats some attributes apart (Latte checks URLs in href and src) */
  attrOut?(name: string, e: string): string;
  hash(entries: Array<[string, string]>): string;
  list(items: string[]): string;
  /** `a ?? b` (b when a is null or missing) */
  orNull(a: string, b: string): string;
  ternary(c: string, a: string, b: string): string;
  not(a: string): string;
  /** a value printed without escaping (markup the template built) */
  raw(e: string): string;
  /** an escaped value */
  out(e: string): string;
  comment(text: string): string;
  set(name: string, value: string): string;
  /** a captured block: open, close */
  capture(name: string): [string, string];
  if(test: string): string;
  elseif(test: string): string;
  else: string;
  endif: string;
  forIn(item: string, list: string): string;
  /** the zero-based index of the innermost loop */
  loopIndex: string;
  endfor: string;
  /** another template rendered with only the given variables */
  include(template: string, vars: string): string;
  /** a template named by an expression (a slot fill descriptor) */
  includeExpr(template: string, vars: string): string;
  /** a hash with another merged over it */
  merge(a: string, b: string): string;
}

/** the ui_* helpers that return markup (an attribute string, an SVG, a rendered template): printed unescaped wherever a
 * dialect cannot mark them safe at registration (Latte escapes inside a tag even an Html value). The PHP extensions and the
 * Python environment register the same names as safe. */
export const MARKUP_HELPERS = ["ui_attr_html", "ui_lucide", "ui_include"] as const;
/** attributes whose value is a URL: Latte checks those at render and would blank the data: URIs the specs pass on, which React prints as given */
export const URL_ATTRS = ["href", "src", "action", "formaction", "poster", "cite", "data", "srcset"] as const;
const isMarkup = (e: string): boolean => MARKUP_HELPERS.some((h) => e.startsWith(`${h}(`));
const isUrlAttr = (name: string): boolean => (URL_ATTRS as readonly string[]).includes(name);

const q = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

export const twig: Dialect = {
  name: "twig",
  ext: ".html.twig",
  str: q,
  nul: "null",
  field: (base, key) => `${base}.${key}`,
  isNotNull: (e) => `${e} is not null`,
  v: (name) => name,
  emptyHash: "{}",
  intHash: (entries) => `{${entries.map(([k, v]) => `${k}: ${v}`).join(", ")}}`,
  and: "and",
  or: "or",
  contains: (hay, needle) => `(${needle} in ${hay})`,
  hash: (entries) => `{${entries.map(([k, v]) => `${q(k)}: ${v}`).join(", ")}}`,
  list: (items) => `[${items.join(", ")}]`,
  orNull: (a, b) => `(${a} ?? ${b})`,
  ternary: (c, a, b) => `(${c} ? ${a} : ${b})`,
  not: (a) => `not (${a})`,
  raw: (e) => `{{ ${e}|raw }}`,
  out: (e) => `{{ ${e} }}`,
  comment: (text) => `{#- ${text.replace(/#}/g, "# }")} -#}`,
  set: (name, value) => `{%- set ${name} = ${value} -%}`,
  capture: (name) => [`{%- set ${name} -%}`, `{%- endset -%}`],
  if: (test) => `{%- if ${test} %}`,
  elseif: (test) => `{%- elseif ${test} %}`,
  else: `{%- else %}`,
  endif: `{%- endif %}`,
  forIn: (item, list) => `{%- for ${item} in ${list} %}`,
  loopIndex: "loop.index0",
  endfor: `{%- endfor %}`,
  include: (template, vars) => `{{ include(${q(template)}, ${vars}, with_context = false) }}`,
  includeExpr: (template, vars) => `{{ include(${template}, ${vars}, with_context = false) }}`,
  merge: (a, b) => `${a}|merge(${b})`,
};

/** the dialect a Jinja2 target would use (not emitted yet; kept here so the emitters stay dialect-neutral) */
export const jinja: Dialect = {
  ...twig,
  name: "jinja",
  ext: ".html.j2",
  nul: "none",
  field: (base, key) => `${base}[${q(key)}]`,
  isNotNull: (e) => `${e} is not none`,
  hash: (entries) => `{${entries.map(([k, v]) => `${q(k)}: ${v}`).join(", ")}}`,
  orNull: (a, b) => `ui_def(${a}, ${b})`,
  ternary: (c, a, b) => `(${a} if ${c} else ${b})`,
  raw: (e) => `{{ ${e}|safe }}`,
  comment: (text) => `{#- ${text.replace(/#}/g, "# }")} -#}`,
  elseif: (test) => `{%- elif ${test} %}`,
  include: (template, vars) => `{{ ui_include(${q(template)}, ${vars}) }}`,
  includeExpr: (template, vars) => `{{ ui_include(${template}, ${vars}) }}`,
  merge: (a, b) => `ui_merge(${a}, ${b})`,
};

/** Latte 3 (PHP expressions, `$` variables, `{tag}` syntax); includes go through ui_include, which renders a template to Html */
export const latte: Dialect = {
  name: "latte",
  ext: ".latte",
  str: q,
  nul: "null",
  field: (base, key) => `${base}[${q(key)}]`,
  isNotNull: (e) => `(${e} !== null)`,
  v: (name) => `$${name}`,
  emptyHash: "[]",
  intHash: (entries) => `[${entries.map(([k, v]) => `${k} => ${v}`).join(", ")}]`,
  and: "&&",
  or: "||",
  contains: (hay, needle) => `str_contains(${hay}, ${needle})`,
  attrOut: (name, e) => (isUrlAttr(name) ? `{=${e}|nocheck}` : `{=${e}}`),
  dynamicTag: (name, tagVar) => `${name} n:tag="${tagVar}"`,
  hash: (entries) => `[${entries.map(([k, v]) => `${q(k)} => ${v}`).join(", ")}]`,
  list: (items) => `[${items.join(", ")}]`,
  orNull: (a, b) => `(${a} ?? ${b})`,
  ternary: (c, a, b) => `(${c} ? ${a} : ${b})`,
  not: (a) => `!(${a})`,
  raw: (e) => `{=${e}|noescape}`,
  out: (e) => (isMarkup(e) ? `{=${e}|noescape}` : `{=${e}}`),
  comment: (text) => `{* ${text.replace(/\*\}/g, "* }")} *}`,
  set: (name, value) => `{var $${name} = ${value}}`,
  capture: (name) => [`{capture $${name}}`, `{/capture}`],
  if: (test) => `{if ${test}}`,
  elseif: (test) => `{elseif ${test}}`,
  else: `{else}`,
  endif: `{/if}`,
  forIn: (item, list) => `{foreach ${list} as $${item}}`,
  loopIndex: "$iterator->counter0",
  endfor: `{/foreach}`,
  include: (template, vars) => `{=ui_include(${q(template)}, ${vars})|noescape}`,
  includeExpr: (template, vars) => `{=ui_include(${template}, ${vars})|noescape}`,
  merge: (a, b) => `array_merge(${a}, ${b})`,
};
