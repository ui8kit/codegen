// The Latte adapter of the rules group: a .latte file is rewritten to the Twig form (outputs, control flow, captures,
// comments, includes; braces that do not open a tag, {l}/{r} and syntax off stay text), then read by the Twig adapter,
// which also knows the Latte n: attributes (n:tag, n:if, n:foreach, n:inner-foreach). Lines are kept.
import type { IrFile } from "./ir";
import { templateToIr } from "./twig";

/** Latte reads as Twig once its tags are rewritten ({=e} and {$x} outputs, {if}/{/if}, {foreach}, {capture $x}, {var}, {* *}); lines are kept */
export const latteToIr = (src: string, file = ""): IrFile => templateToIr(latteAsTwig(src), file, "latte");

const LATTE_END: Record<string, string> = { if: "endif", foreach: "endfor", for: "endfor", capture: "endset", embed: "endembed", define: "endmacro", block: "endblock" };

export function latteAsTwig(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    const off = c === "<" ? /^<([\w-]+)\b[^>]*\sn:syntax="off"[^>]*>/.exec(s.slice(i, i + 2000)) : null;
    if (off) {
      const close = s.indexOf(`</${off[1]}>`, i + off[0].length);
      const end = close < 0 ? s.length : close;
      out += off[0].replace(/\sn:syntax="off"/, "") + s.slice(i + off[0].length, end);
      i = end; continue;
    }
    // Latte opens a tag only on a brace followed by a name, a variable, `=`, `/` or `*` (JSON and `{ x }` are text)
    if (c !== "{" || !/[A-Za-z_$=/*]/.test(s[i + 1] ?? " ")) { out += c; i++; continue; }
    if (s.startsWith("{l}", i) || s.startsWith("{r}", i)) { out += s[i + 1] === "l" ? "{" : "}"; i += 3; continue; }
    // syntax off: the content is text up to {/syntax}; n:syntax="off": up to the close of that element
    if (/^\{syntax\s+off\}/.test(s.slice(i, i + 20))) {
      const open = s.indexOf("}", i) + 1, e = s.indexOf("{/syntax}", open);
      out += s.slice(open, e < 0 ? s.length : e); i = e < 0 ? s.length : e + 9; continue;
    }
    if (s[i + 1] === "*") { const e = s.indexOf("*}", i + 2); const end = e < 0 ? s.length : e + 2; out += `{#${s.slice(i + 2, end - 2)}#}`; i = end; continue; }
    // the matching } outside strings and brackets
    let k = i + 1, depth = 0, q = "";
    for (; k < s.length; k++) {
      const ch = s[k]!;
      if (q) { if (ch === "\\") { k++; continue; } if (ch === q) q = ""; continue; }
      if (ch === "'" || ch === '"') { q = ch; continue; }
      if (depth === 0 && ch === "}") break;
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
    }
    const body = s.slice(i + 1, k);
    i = k + 1;
    if (body.startsWith("=")) { out += `{{ ${body.slice(1)} }}`; continue; }
    if (body.startsWith("$")) { out += `{{ ${body} }}`; continue; }
    if (body.startsWith("/")) { const kw = body.slice(1).trim().split(/\s+/)[0]!; out += `{% ${LATTE_END[kw] ?? `end${kw}`} %}`; continue; }
    const [kw = "", ...rest] = body.split(/\s+/);
    const arg = body.slice(kw.length).trim();
    void rest;
    switch (kw) {
      case "foreach": out += `{% for ${arg} %}`; break;
      case "capture": out += `{% set ${arg.replace(/^\$/, "")} %}`; break;
      case "var": case "default": out += `{% set ${arg.replace(/^\$/, "")} %}`; break;
      case "include": case "embed": {
        const m = /^('[^']*'|"[^"]*")\s*(?:,\s*([\s\S]*))?$/.exec(arg);
        const vars = m?.[2]?.trim();
        out += m ? `{% ${kw} ${m[1]}${vars ? ` with ${vars.startsWith("[") ? vars : `[${vars}]`}` : ""} %}` : `{% ${kw} %}`;
        break;
      }
      case "define": out += `{% macro ${arg} %}`; break;
      default: out += `{% ${body} %}`;
    }
  }
  return out;
}
