/**
 * Twig emitter — one `ui/<brick>/<Part>.html.twig` per part under
 * `generated/twig/` (a Composer package, namespace `UI8Kit\Twig`). Templates
 * take the part's props as variables (`variant`, `class`, `ariaLabel`, …),
 * `attrs` (caller attributes, merged last so the caller wins) and
 * `children` — trusted HTML printed with `|raw`. Attributes print through
 * `ui8kit_attrs(computed, attrs)` (registered by `UI8Kit\Twig\TwigExtension`);
 * `ui8kit_classes('<part>Classes', {...})` is the asChild replacement.
 */

import type { BrickDef, PartDef } from "../domain/model";
import { BANNER, makeEnv, pascalCase, type Emitter, type GeneratedFile } from "./common";
import {
  classesInput,
  phpDefault,
  phpItemKey,
  phpParamName,
  phpString,
  printExpr,
  printNode,
  templateParams,
  type Dialect,
  type PhpCtx,
  type Syntax,
  restRuleArgs,
} from "./php-common";

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

export const TWIG_DIALECT: Dialect = {
  call: (fn, args) => `ui8kit_${snake(fn)}(${args.join(", ")})`,
  map: (entries) => `{${entries.map(([k, v]) => `${k}: ${v}`).join(", ")}}`,
  eq: (a, b) => `(${a} is same as(${b}))`,
  and: (xs) => `(${xs.join(" and ")})`,
  or: (xs) => `(${xs.join(" or ")})`,
  not: (x) => `(not ${x})`,
  contains: (h, n) => `(${n} in ${h})`,
  intToString: (x) => `(${x} ~ '')`,
};

const ind = (s: string) => s.split("\n").map((l) => (l ? "  " + l : l)).join("\n");

export class TwigEmitter implements Emitter {
  readonly runtime = "twig" as const;

  emit(brick: BrickDef): GeneratedFile[] {
    return brick.parts.map((part) => ({
      path: `twig/ui/${brick.dir}/${part.name}.html.twig`,
      contents: emitPart(brick, part),
    }));
  }
}

function emitPart(brick: BrickDef, part: PartDef): string {
  const env = makeEnv(brick, part);
  const derivedVar = (name: string) => "ui" + pascalCase(name);
  const ctx: PhpCtx = {
    env,
    d: TWIG_DIALECT,
    prop: (name) => phpParamName(part.props.find((p) => p.name === name)!),
    item: (field) => {
      const f = env.itemRecord?.fields.find((x) => x.name === field);
      return `(item.${phpItemKey(field)} ?? ${phpDefault(f?.type ?? "string")})`;
    },
    derived: derivedVar,
  };
  const sx: Syntax = {
    ctx,
    tagVar: "uiTag",
    ifChain: (branches, elseBody) => {
      const out: string[] = [];
      // Inline (no newlines/indent): children sit flush against their tags (React SSR parity).
      branches.forEach(([t, b], i) => out.push(`{% ${i === 0 ? "if" : "elseif"} ${t} %}`, b));
      if (elseBody !== undefined) out.push(`{% else %}`, elseBody);
      out.push(`{% endif %}`);
      return out.join("");
    },
    forEach: (items, body) => `{% for item in ${items} %}${body}{% endfor %}`,
    text: (code) => `{{ ${code} }}`,
    // Trusted HTML by contract (like React children / templ.Raw): never pass user input here.
    slot: `{{ children|raw }}`,
    element: (tag, attrs, rest, isVoid, children) => {
      const map = TWIG_DIALECT.map(attrs.map(([k, v]) => [phpString(k), v]));
      const call = attrs.length === 0 && !rest ? "" : `{{ ui8kit_attrs(${map}${rest ? `, attrs${restRuleArgs(rest, (xs) => `[${xs.join(", ")}]`)}` : ""}) }}`;
      const open = `<${tag}${call}>`;
      if (isVoid) return open;
      return `${open}${children}</${tag}>`;
    },
    partClasses: () =>
      `ui8kit_classes(${phpString(part.name.charAt(0).toLowerCase() + part.name.slice(1) + "Classes")}, ${classesInput(part, TWIG_DIALECT, (p) => phpParamName(p))})`,
  };

  const lines = [`{# ${BANNER} #}`, `{# ${part.name} — ${part.docs.split("\n")[0]} #}`];
  const params = templateParams(part).map((p) => `{# @param ${p.name} (${p.type}) #}`);
  lines.push(...params);
  for (const p of templateParams(part)) {
    // passthrough: `??` keeps an explicit "" (|default would replace it), null = unset
    lines.push(p.def.passthrough ? `{% set ${p.name} = ${p.name} ?? null %}` : `{% set ${p.name} = ${p.name}|default(${p.type === "children" ? "''" : phpDefault(p.type)}) %}`);
  }
  const root = part.render;
  if (root.kind === "element" && root.tag.kind === "resolved") {
    const t = root.tag;
    lines.push(`{% set uiTag = ui8kit_resolve_tag(${ctx.prop(t.fromProp)}, ${phpString(t.fallback)}, ${phpString(t.group)}) %}`);
  } else if (root.kind === "element" && root.tag.kind === "mapped") {
    lines.push(`{% set uiTag = ${printExpr(root.tag.expr, ctx)} %}`);
  }
  for (const [name, expr] of Object.entries(part.derived ?? {})) {
    lines.push(`{% set ${derivedVar(name)} = ${printExpr(expr, ctx)} %}`);
  }
  lines.push(printNode(part.render, part, sx));
  return lines.join("\n") + "\n";
}
