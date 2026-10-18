// JSX printing of the Solid emitter: the nodes and attributes of one part as JSX text (`<Show>` for a branch, `<For>` for a list).
import type { AttrSpec, ElementNode, Expr, Node, PartDef } from "@ui8kit/xgen-spec";
import { exprType, indent, formatAttr, printTsExpr, tagHead, type TsPrintCtx, neverEmptyString, printInlineClassSpec, isPassthroughForward } from "@ui8kit/xgen-runtime-core";
import { KEYWORD_ATTRS, NUMERIC_DOM_ATTRS, asNumberExpr, solidAttrName } from "./dom";

export interface JsxState {
  usesResolveTag: boolean;
  usesTitleTag: boolean;
  usesCn: boolean;
  usesDynamic: boolean;
  /** solid-js control-flow components used */
  solid: Set<string>;
  /** the props type of the part is not the attribute type of every root (several roots, an svg root): spread the rest untyped */
  restCast?: boolean;
}

export function printAttrs(node: ElementNode, ctx: TsPrintCtx, part: PartDef, state: JsxState, opts: { withRest: boolean; dynamic: boolean; inLoop: boolean }): string[] {
  const out: string[] = [];
  if (opts.dynamic) out.push(`component={resolvedTagValue()}`);
  for (const attr of node.attrs) out.push(printAttr(attr, ctx, part, state, opts));
  return out.filter(Boolean);
}

export function printAttr(attr: AttrSpec, ctx: TsPrintCtx, part: PartDef, state: JsxState, opts: { withRest: boolean; inLoop: boolean }): string {
  switch (attr.kind) {
    case "static":
      return `${solidAttrName(attr.name)}=${JSON.stringify(attr.value)}`;
    case "expr": {
      if (isPassthroughForward(attr, part)) return "";
      const name = solidAttrName(attr.name);
      const expr = NUMERIC_DOM_ATTRS.has(attr.name) ? asNumberExpr(attr.expr) ?? attr.expr : attr.expr;
      const value = printTsExpr(expr, ctx);
      const t = exprType(expr, ctx.env);
      if (attr.when) return `${name}={${printTsExpr(attr.when, ctx)} ? ${value} : undefined}`;
      if (attr.keepEmpty && t === "string") return `${name}={(${value}) ?? ""}`;
      if (t !== "string" || neverEmptyString(attr.expr, ctx.env)) return `${name}={${value}}`;
      ctx.helpers.add("orUndef");
      const cast = KEYWORD_ATTRS[attr.name];
      return cast ? `${name}={orUndef(${value}) as ${cast}}` : `${name}={orUndef(${value})}`;
    }
    case "bool":
      return `${solidAttrName(attr.name)}={${printTsExpr(attr.expr, ctx)} || undefined}`;
    case "class": {
      if (!attr.spec) return `class={cls() || undefined}`;
      state.usesCn = true;
      const inline = printInlineClassSpec(attr.spec, ctx, () => (part.props.some((p) => p.name === "Class") && !opts.inLoop ? "local.class" : undefined));
      if (/^cn\("[^"]+"/.test(inline)) return formatAttr(`class={${inline}}`);
      return `class={${inline} || undefined}`;
    }
    case "rest":
      return opts.withRest ? (state.restCast ? `{...(rest as object)}` : `{...rest}`) : "";
  }
}

export function printNode(node: Node, ctx: TsPrintCtx, part: PartDef, state: JsxState, opts: { isRoot?: boolean; inLoop?: boolean } = {}): string {
  switch (node.kind) {
    case "element": {
      const dynamic = node.tag.kind !== "static";
      if (dynamic && !opts.isRoot) throw new Error(`${part.name}: dynamic tags only supported at part root`);
      const tag = node.tag.kind === "static" ? node.tag.tag : "Dynamic";
      const attrs = printAttrs(node, ctx, part, state, { withRest: opts.isRoot === true, dynamic, inLoop: opts.inLoop === true });
      if (node.void || node.children.length === 0) return tagHead(tag, attrs, "/>");
      const children = node.children.map((c) => printNode(c, ctx, part, state, { inLoop: opts.inLoop })).join("\n");
      return `${tagHead(tag, attrs, ">")}\n${indent(children, 1)}\n</${tag}>`;
    }
    case "slot":
      return `{local.children}`;
    case "text":
      return `{${printTsExpr(node.expr, ctx)}}`;
    case "when": {
      state.solid.add("Show");
      const test = printTsExpr(node.test, ctx);
      const thenCode = fragment(node.then.map((c) => printNode(c, ctx, part, state, opts)));
      const elseCode = node.else?.length ? fragment(node.else.map((c) => printNode(c, ctx, part, state, opts))) : undefined;
      const fallback = elseCode ? ` fallback={\n${indent(elseCode, 1)}\n}` : "";
      const show = `<Show when={${test}}${fallback}>\n${indent(thenCode, 1)}\n</Show>`;
      return show;
    }
    case "forEach": {
      state.solid.add("For");
      const items = ctx.propCode(node.itemsProp);
      const body = fragment(node.body.map((c) => printNode(c, ctx, part, state, { inLoop: true })));
      // the index is an accessor in Solid: read it once per row when the row uses it
      const usesIndex = /\bindex\b/.test(body);
      const head = usesIndex ? `{(item, i) => {\n  const index = i();\n  return (\n${indent(body, 2)}\n  );\n}}` : `{(item) => (\n${indent(body, 1)}\n)}`;
      return `<For each={${items} ?? []}>\n${indent(head, 1)}\n</For>`;
    }
  }
}

function fragment(parts: string[]): string {
  if (parts.length === 1) return parts[0]!;
  return `<>\n${indent(parts.join("\n"), 1)}\n</>`;
}

export type { Expr };
