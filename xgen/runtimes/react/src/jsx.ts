// JSX printing of the React emitter: the nodes and attributes of one part as JSX text.
import type { Expr } from "@ui8kit/xgen-spec";
import {
  type AttrSpec,
  type ElementNode,
  type Node,
  type PartDef,
} from "@ui8kit/xgen-spec";
import { localIdent } from "@ui8kit/xgen-spec";
import {
  exprType,
  indent,
} from "@ui8kit/xgen-runtime-core";
import { formatAttr, printTsExpr, tagHead, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";
import {
  neverEmptyString,
  printInlineClassSpec,
  isPassthroughForward,
} from "@ui8kit/xgen-runtime-core";

import { NUMERIC_DOM_ATTRS, asNumberExpr, reactAttrName, rootElements, staticTagOf, REACT_ATTR_TYPES } from "./dom";

export function printAttrs(
  node: ElementNode,
  ctx: TsPrintCtx,
  part: PartDef,
  state: { usesCn: boolean; usesSvgProps: boolean },
  opts: { withRef: boolean; refCast?: string; svgCast?: boolean; inLoop: boolean }
): string[] {
  const out: string[] = [];
  if (opts.withRef) {
    out.push(opts.refCast ? `ref={ref as Ref<${opts.refCast}>}` : `ref={ref}`);
  }
  for (const attr of node.attrs) {
    out.push(printAttr(attr, ctx, part, state, opts));
  }
  return out.filter(Boolean);
}

export function printAttr(
  attr: AttrSpec,
  ctx: TsPrintCtx,
  part: PartDef,
  state: { usesCn: boolean; usesSvgProps: boolean },
  opts: { svgCast?: boolean; inLoop: boolean }
): string {
  switch (attr.kind) {
    case "static":
      return `${reactAttrName(attr.name)}=${JSON.stringify(attr.value)}`;
    case "expr": {
      if (isPassthroughForward(attr, part)) return "";
      const name = reactAttrName(attr.name);
      let exprToPrint = attr.expr;
      if (NUMERIC_DOM_ATTRS.has(attr.name)) {
        exprToPrint = asNumberExpr(attr.expr) ?? attr.expr;
      }
      const value = printTsExpr(exprToPrint, ctx);
      const t = exprType(exprToPrint, ctx.env);
      if (attr.when) {
        return `${name}={${printTsExpr(attr.when, ctx)} ? ${value} : undefined}`;
      }
      if (attr.keepEmpty && t === "string") {
        return `${name}={(${value}) ?? ""}`;
      }
      if (t !== "string" || neverEmptyString(attr.expr, ctx.env)) {
        return `${name}={${value}}`;
      }
      ctx.helpers.add("orUndef");
      return `${name}={orUndef(${value})}`;
    }
    case "bool":
      return `${reactAttrName(attr.name)}={${printTsExpr(attr.expr, ctx)} || undefined}`;
    case "class": {
      if (!attr.spec) return `className={cls || undefined}`;
      state.usesCn = true;
      const inline = printInlineClassSpec(attr.spec, ctx, () =>
        part.props.some((p) => p.name === "Class") && !opts.inLoop ? "className" : undefined
      );
      // cn("static ...", ...) is never empty: no fallback
      if (/^cn\("[^"]+"/.test(inline)) return formatAttr(`className={${inline}}`);
      return `className={${inline} || undefined}`;
    }
    case "rest":
      if (opts.svgCast) {
        state.usesSvgProps = true;
        return `{...(rest as SVGProps<SVGSVGElement>)}`;
      }
      return `{...rest}`;
  }
}

export function printNode(
  node: Node,
  ctx: TsPrintCtx,
  part: PartDef,
  state: {
    usesResolveTag: boolean;
    usesTitleTag: boolean;
    usesCn: boolean;
    usesSlot: boolean;
    usesElementType: boolean;
    usesRefCast: boolean;
    usesSvgProps: boolean;
  },
  opts: { isRoot?: boolean; needsRefCast?: boolean; inLoop?: boolean } = {}
): string {
  switch (node.kind) {
    case "element": {
      const tagCode =
        node.tag.kind === "static"
          ? node.tag.tag
          : opts.isRoot
            ? "Tag"
            : (() => {
                throw new Error(`${part.name}: dynamic tags only supported at part root`);
              })();
      const isSvg = node.tag.kind === "static" && node.tag.tag === "svg";
      const refCast = opts.needsRefCast
        ? isSvg
          ? "SVGSVGElement"
          : node.tag.kind === "static"
            ? `HTMLElementTagNameMap[${JSON.stringify(node.tag.tag)}]`
            : "HTMLElement"
        : undefined;
      const attrs = printAttrs(node, ctx, part, state, {
        withRef: opts.isRoot === true,
        refCast,
        svgCast: isSvg,
        inLoop: opts.inLoop === true,
      });
      // React forbids children on <textarea>; the content contract maps to
      // defaultValue (uncontrolled initial value, same SSR output).
      if (tagCode === "textarea" && node.children.length === 1 && node.children[0]!.kind === "text") {
        const value = printTsExpr((node.children[0] as { expr: Expr }).expr, ctx);
        return tagHead(tagCode, [...attrs, `defaultValue={(${value}) ?? ""}`], "/>");
      }
      if (node.void || node.children.length === 0) return tagHead(tagCode, attrs, "/>");
      const children = node.children
        .map((c) => printNode(c, ctx, part, state, { inLoop: opts.inLoop }))
        .join("\n");
      return `${tagHead(tagCode, attrs, ">")}\n${indent(children, 1)}\n</${tagCode}>`;
    }
    case "slot":
      return `{children}`;
    case "text":
      return `{${printTsExpr(node.expr, ctx)}}`;
    case "when": {
      const test = printTsExpr(node.test, ctx);
      const inner = { ...opts, isRoot: opts.isRoot };
      const thenCode = wrapFragment(
        node.then.map((c) => printNode(c, ctx, part, state, inner))
      );
      const elseCode =
        node.else && node.else.length > 0
          ? wrapFragment(node.else.map((c) => printNode(c, ctx, part, state, inner)))
          : "null";
      const ternary = `${test} ? (\n${indent(thenCode, 1)}\n) : ${
        elseCode === "null" ? "null" : `(\n${indent(elseCode, 1)}\n)`
      }`;
      // At part root the ternary is the returned expression itself; as a
      // child it must be wrapped in JSX braces.
      return opts.isRoot ? ternary : `{${ternary}}`;
    }
    case "forEach": {
      const itemsProp = part.props.find((p) => p.name === node.itemsProp)!;
      const itemsCode = ctx.propCode(itemsProp.name);
      const body = node.body.map((c) =>
        printNode(c, ctx, part, state, { inLoop: true })
      );
      // Attach key to the outermost element of the loop body.
      const bodyCode = wrapFragment(body).replace(/^<([a-zA-Z0-9]+)(\s|>)/, `<$1 key={index}$2`);
      return `{(${itemsCode} ?? []).map((item, index) => (\n${indent(bodyCode, 1)}\n))}`;
    }
  }
}


function wrapFragment(parts: string[]): string {
  if (parts.length === 1) return parts[0]!;
  return `<>\n${indent(parts.join("\n"), 1)}\n</>`;
}
