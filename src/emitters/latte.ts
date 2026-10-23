/**
 * Latte emitter — one `ui/<brick>/<Part>.latte` per part under
 * `generated/latte/` (a Composer package, namespace `UI8Kit\Latte`). Typed
 * `{parameters}` signature (`$variant`, `$class`, `$ariaLabel`, …, `array
 * $attrs`, `string $children`), `{var}` preamble for derived values and the
 * resolved tag, one `n:attr` map per element (computed attrs first, caller
 * `...$attrs` spread last so the caller wins). `$children` is trusted HTML
 * printed with `|noescape`. `\UI8Kit\Latte\Classes::<part>Classes([...])`
 * is the asChild replacement.
 */

import type { BrickDef, PartDef } from "../domain/model";
import { BANNER, makeEnv, pascalCase, type Emitter, type GeneratedFile } from "./common";
import {
  classesInput,
  phpDefault,
  phpDialect,
  phpItemKey,
  phpParamName,
  phpString,
  printExpr,
  printNode,
  templateParams,
  PHP_NAMESPACE,
  type PhpCtx,
  type Syntax,
  paramDefault,
} from "./php-common";

const NS = "\\" + PHP_NAMESPACE.latte;
export const LATTE_DIALECT = phpDialect(`${NS}\\Rt`);

const ind = (s: string) => s.split("\n").map((l) => (l ? "  " + l : l)).join("\n");

export class LatteEmitter implements Emitter {
  readonly runtime = "latte" as const;

  emit(brick: BrickDef): GeneratedFile[] {
    return brick.parts.map((part) => ({
      path: `latte/ui/${brick.dir}/${part.name}.latte`,
      contents: emitPart(brick, part),
    }));
  }
}

const latteType = (t: string) => (t === "items" || t === "attrs" ? "array" : t === "children" ? "string" : t);

function emitPart(brick: BrickDef, part: PartDef): string {
  const env = makeEnv(brick, part);
  const derivedVar = (name: string) => "$ui" + pascalCase(name);
  const ctx: PhpCtx = {
    env,
    d: LATTE_DIALECT,
    prop: (name) => "$" + phpParamName(part.props.find((p) => p.name === name)!),
    item: (field) => {
      const f = env.itemRecord?.fields.find((x) => x.name === field);
      return `($item[${phpString(phpItemKey(field))}] ?? ${phpDefault(f?.type ?? "string")})`;
    },
    derived: derivedVar,
  };
  const sx: Syntax = {
    ctx,
    tagVar: "$uiTag",
    ifChain: (branches, elseBody) => {
      const out: string[] = [];
      // Inline (no newlines/indent): children sit flush against their tags (React SSR parity).
      branches.forEach(([t, b], i) => out.push(`{${i === 0 ? "if" : "elseif"} ${t}}`, b));
      if (elseBody !== undefined) out.push(`{else}`, elseBody);
      out.push(`{/if}`);
      return out.join("");
    },
    forEach: (items, body) => `{foreach ${items} as $item}${body}{/foreach}`,
    text: (code) => `{=${code}}`,
    // Trusted HTML by contract (like React children / templ.Raw): never pass user input here.
    slot: `{$children|noescape}`,
    element: (tag, attrs, rest, isVoid, children) => {
      const entries = attrs.map(([k, v]) => `${phpString(k)} => ${v},`);
      if (rest) entries.push("...\\UI8Kit\\Latte\\Rt::safeAttrs($attrs),"); // unsafe URL attrs dropped (javascript:, ...)
      const nAttr = entries.length === 0 ? "" : ` n:attr="[\n${ind(entries.join("\n"))}\n]"`;
      const open = `<${tag}${nAttr}>`;
      if (isVoid) return open;
      return `${open}${children}</${tag}>`;
    },
    partClasses: () =>
      `${NS}\\Classes::${part.name.charAt(0).toLowerCase() + part.name.slice(1)}Classes(${classesInput(part, LATTE_DIALECT, (p) => "$" + phpParamName(p))})`,
  };

  const lines = [`{* ${BANNER} *}`, `{* ${part.name} — ${part.docs.split("\n")[0]} *}`];
  const params = templateParams(part).map(
    (p) => `${p.def.passthrough ? "?" : ""}${latteType(p.type)} $${p.name} = ${paramDefault(p)},`
  );
  lines.push(params.length ? `{parameters\n${ind(params.join("\n"))}\n}` : `{parameters}`);
  const root = part.render;
  if (root.kind === "element" && root.tag.kind === "resolved") {
    const t = root.tag;
    lines.push(`{var $uiTag = ${LATTE_DIALECT.call("resolveTag", [ctx.prop(t.fromProp), phpString(t.fallback), phpString(t.group)])}}`);
  } else if (root.kind === "element" && root.tag.kind === "mapped") {
    lines.push(`{var $uiTag = ${printExpr(root.tag.expr, ctx)}}`);
  }
  for (const [name, expr] of Object.entries(part.derived ?? {})) {
    lines.push(`{var ${derivedVar(name)} = ${printExpr(expr, ctx)}}`);
  }
  lines.push(printNode(part.render, part, sx));
  // No trailing newline: Latte would print it after the root element (stray whitespace in inline contexts).
  return lines.join("\n");
}
