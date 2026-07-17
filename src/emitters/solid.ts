/**
 * SolidJS emitter — one `<stem>.solid.tsx` per brick (avoids colliding with
 * React's `<stem>.tsx`). Presentation-only components using `splitProps`,
 * `Dynamic` for polymorphic roots, and the shared classes helpers.
 *
 * Composition: no Radix-style `asChild` (React-only). Callers style another
 * element via `buttonClasses()` / `*Classes()` — same substitute as Svelte/Vue.
 */

import type { Expr } from "../domain/expr";
import {
  fileStem,
  type AttrSpec,
  type BrickDef,
  type ElementNode,
  type Node,
  type PartDef,
  type TagSpec,
} from "../domain/model";
import { localIdent } from "../domain/naming";
import {
  BANNER,
  exprType,
  indent,
  makeEnv,
  usesItem,
  type Emitter,
  type GeneratedFile,
  type TypeEnv,
} from "./common";
import { printTsExpr, type TsPrintCtx } from "./ts-expr";
import {
  classesHelperName,
  classSpecProps,
  declaredProps,
  neverEmptyString,
  printInlineClassSpec,
  isPassthroughForward,
  variantTypeName,
} from "./ts-common";

/** Solid JSX attribute types for common roots (from solid-js JSX namespace). */
const SOLID_ATTR_TYPES: Record<string, [string, string]> = {
  a: ["AnchorHTMLAttributes", "HTMLAnchorElement"],
  button: ["ButtonHTMLAttributes", "HTMLButtonElement"],
  input: ["InputHTMLAttributes", "HTMLInputElement"],
  textarea: ["TextareaHTMLAttributes", "HTMLTextAreaElement"],
  select: ["SelectHTMLAttributes", "HTMLSelectElement"],
  option: ["OptionHTMLAttributes", "HTMLOptionElement"],
  optgroup: ["OptgroupHTMLAttributes", "HTMLOptGroupElement"],
  label: ["LabelHTMLAttributes", "HTMLLabelElement"],
  form: ["FormHTMLAttributes", "HTMLFormElement"],
  fieldset: ["FieldsetHTMLAttributes", "HTMLFieldSetElement"],
  legend: ["HTMLAttributes", "HTMLLegendElement"],
  img: ["ImgHTMLAttributes", "HTMLImageElement"],
  source: ["SourceHTMLAttributes", "HTMLSourceElement"],
  picture: ["HTMLAttributes", "HTMLElement"],
  dialog: ["DialogHTMLAttributes", "HTMLDialogElement"],
  details: ["DetailsHTMLAttributes", "HTMLDetailsElement"],
  summary: ["HTMLAttributes", "HTMLElement"],
  table: ["TableHTMLAttributes", "HTMLTableElement"],
  caption: ["HTMLAttributes", "HTMLTableCaptionElement"],
  thead: ["HTMLAttributes", "HTMLTableSectionElement"],
  tbody: ["HTMLAttributes", "HTMLTableSectionElement"],
  tfoot: ["HTMLAttributes", "HTMLTableSectionElement"],
  tr: ["HTMLAttributes", "HTMLTableRowElement"],
  th: ["ThHTMLAttributes", "HTMLTableCellElement"],
  td: ["TdHTMLAttributes", "HTMLTableCellElement"],
  colgroup: ["ColgroupHTMLAttributes", "HTMLTableColElement"],
  col: ["ColHTMLAttributes", "HTMLTableColElement"],
  meter: ["MeterHTMLAttributes", "HTMLMeterElement"],
  progress: ["ProgressHTMLAttributes", "HTMLProgressElement"],
  output: ["OutputHTMLAttributes", "HTMLOutputElement"],
  datalist: ["HTMLAttributes", "HTMLDataListElement"],
  hr: ["HTMLAttributes", "HTMLHRElement"],
  br: ["HTMLAttributes", "HTMLBRElement"],
  wbr: ["HTMLAttributes", "HTMLElement"],
  p: ["HTMLAttributes", "HTMLParagraphElement"],
  span: ["HTMLAttributes", "HTMLSpanElement"],
  div: ["HTMLAttributes", "HTMLDivElement"],
  li: ["LiHTMLAttributes", "HTMLLIElement"],
  ul: ["HTMLAttributes", "HTMLUListElement"],
  ol: ["OlHTMLAttributes", "HTMLOListElement"],
  nav: ["HTMLAttributes", "HTMLElement"],
  h1: ["HTMLAttributes", "HTMLHeadingElement"],
  h2: ["HTMLAttributes", "HTMLHeadingElement"],
  h3: ["HTMLAttributes", "HTMLHeadingElement"],
  h4: ["HTMLAttributes", "HTMLHeadingElement"],
  h5: ["HTMLAttributes", "HTMLHeadingElement"],
  h6: ["HTMLAttributes", "HTMLHeadingElement"],
};

const NUMERIC_DOM_ATTRS = new Set(["colspan", "rowspan", "span", "rows", "cols"]);

function asNumberExpr(expr: Expr): Expr | undefined {
  switch (expr.kind) {
    case "intToString":
      return expr.expr;
    case "lit":
      if (typeof expr.value === "string" && /^\d+$/.test(expr.value)) {
        return { kind: "lit", value: Number(expr.value) };
      }
      return typeof expr.value === "number" ? expr : undefined;
    case "cond": {
      const thenExpr = asNumberExpr(expr.then);
      const elseExpr = asNumberExpr(expr.else);
      if (!thenExpr || !elseExpr) return undefined;
      return { ...expr, then: thenExpr, else: elseExpr };
    }
    default:
      return undefined;
  }
}

/**
 * DOM attribute → Solid JSX prop. Prefer HTML-native `class` / `for`; keep
 * React-style camelCase for the rest (Solid's JSX namespace accepts both).
 */
function solidAttrName(name: string): string {
  const special: Record<string, string> = {
    class: "class",
    for: "for",
    tabindex: "tabIndex",
    srcset: "srcSet",
    colspan: "colSpan",
    rowspan: "rowSpan",
    fetchpriority: "fetchPriority",
    autocomplete: "autoComplete",
    enctype: "encType",
    novalidate: "noValidate",
    datetime: "dateTime",
  };
  return special[name] ?? name;
}

interface PartEmit {
  code: string;
  helperImports: Set<string>;
  sharedImports: Set<string>;
  jsxAttrImports: Set<string>;
  usesResolveTag: boolean;
  usesTitleTag: boolean;
  usesCn: boolean;
  usesDynamic: boolean;
}

function rootElements(node: Node): ElementNode[] {
  switch (node.kind) {
    case "element":
      return [node];
    case "when":
      return [...node.then.flatMap(rootElements), ...(node.else ?? []).flatMap(rootElements)];
    default:
      return [];
  }
}

function staticTagOf(tag: TagSpec): string | undefined {
  return tag.kind === "static" ? tag.tag : undefined;
}

export class SolidEmitter implements Emitter {
  readonly runtime = "solid" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    const parts = brick.parts.map((part) => this.emitPart(brick, part));

    const helperImports = new Set<string>(parts.flatMap((p) => [...p.helperImports]));
    const sharedImports = new Set<string>(parts.flatMap((p) => [...p.sharedImports]));
    const jsxAttrImports = new Set<string>(parts.flatMap((p) => [...p.jsxAttrImports]));
    const usesResolveTag = parts.some((p) => p.usesResolveTag);
    const usesTitleTag = parts.some((p) => p.usesTitleTag);
    const usesCn = parts.some((p) => p.usesCn);
    const usesDynamic = parts.some((p) => p.usesDynamic);
    if (usesTitleTag) helperImports.add("titleTag");

    const lines: string[] = [];
    lines.push(`// ${BANNER}`);
    lines.push(`/**`);
    for (const line of brick.docs.split("\n")) lines.push(` * ${line}`.trimEnd());
    lines.push(` */`);
    lines.push(``);

    lines.push(`import { splitProps, type JSX, type Component } from "solid-js";`);
    if (usesDynamic) {
      lines.push(`import { Dynamic } from "solid-js/web";`);
    }
    if (jsxAttrImports.size > 0) {
      // Types come from solid-js JSX namespace — reference via JSX.* below.
    }
    if (sharedImports.size > 0) {
      lines.push(
        `import { ${[...sharedImports].sort().join(", ")} } from "./${fileStem(brick)}.shared";`
      );
    }
    if (usesCn) lines.push(`import { cn } from "${this.utilsPath}";`);
    if (helperImports.size > 0) {
      lines.push(`import { ${[...helperImports].sort().join(", ")} } from "${this.utilsPath}/expr";`);
    }
    if (usesResolveTag) lines.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);
    lines.push(``);

    for (const p of parts) {
      lines.push(p.code);
      lines.push(``);
    }

    return [
      {
        path: `ui/${brick.dir}/${fileStem(brick)}.solid.tsx`,
        contents: lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
      },
    ];
  }

  private emitPart(brick: BrickDef, part: PartDef): PartEmit {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const helperImports = new Set<string>();
    const sharedImports = new Set<string>();
    const jsxAttrImports = new Set<string>();
    const state = {
      usesResolveTag: false,
      usesTitleTag: false,
      usesCn: false,
      usesDynamic: false,
    };

    const hasChildren = part.props.some((p) => p.type === "children");

    const roots = rootElements(part.render);
    const rootTags = roots.map((r) => staticTagOf(r.tag));
    const multiRoot = roots.length > 1;
    const singleStaticTag =
      !multiRoot && rootTags.length === 1 && rootTags[0] !== undefined ? rootTags[0] : undefined;
    const isSvgRoot = singleStaticTag === "svg";
    const [attrType] =
      singleStaticTag && !isSvgRoot
        ? SOLID_ATTR_TYPES[singleStaticTag] ?? ["HTMLAttributes", "HTMLElement"]
        : ["HTMLAttributes", "HTMLElement"];
    jsxAttrImports.add(attrType);

    for (const d of decls) {
      if (d.def.cva) {
        sharedImports.add(
          `type ${variantTypeName(part, d.def.cvaKey ?? d.def.name.toLowerCase())}`
        );
      }
      if (d.def.type === "items") sharedImports.add(`type ${d.def.itemsOf}`);
    }

    // Prop API: camelCase like React for variants; `class` (HTML-native) primary,
    // `className` accepted as alias for React migrants.
    const omitKeys = new Set<string>(["class", "className", "children"]);
    for (const d of decls) omitKeys.add(d.reactName);

    const propsFields: string[] = decls.map((d) => {
      const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(d.reactName)
        ? d.reactName
        : JSON.stringify(d.reactName);
      return `  ${key}?: ${d.tsType};`;
    });
    propsFields.push(`  class?: string;`);
    propsFields.push(`  className?: string;`);
    if (hasChildren) propsFields.push(`  children?: JSX.Element;`);

    const genericAttr =
      attrType === "HTMLAttributes"
        ? `JSX.HTMLAttributes<HTMLElement>`
        : isSvgRoot
          ? `JSX.SvgSVGAttributes<SVGSVGElement>`
          : `JSX.${attrType}<HTMLElement>`;
    // Narrower element generics are hard across polymorphic roots; HTMLElement is safe.
    const elemGeneric =
      singleStaticTag && SOLID_ATTR_TYPES[singleStaticTag] && !isSvgRoot
        ? SOLID_ATTR_TYPES[singleStaticTag]![1]
        : isSvgRoot
          ? "SVGSVGElement"
          : "HTMLElement";
    const attrGeneric =
      attrType === "HTMLAttributes"
        ? `JSX.HTMLAttributes<${elemGeneric}>`
        : isSvgRoot
          ? `JSX.SvgSVGAttributes<SVGSVGElement>`
          : `JSX.${attrType}<${elemGeneric}>`;

    void genericAttr; // kept for clarity; attrGeneric is the real one

    const omit = [...omitKeys].map((k) => JSON.stringify(k)).join(" | ");
    const propsTypeName = `${part.name}Props`;
    const propsType =
      `export type ${propsTypeName} = Omit<${attrGeneric}, ${omit}> & {\n` +
      propsFields.join("\n") +
      `\n};`;

    const splitKeys: string[] = decls.map((d) => JSON.stringify(d.reactName));
    splitKeys.push(`"class"`, `"className"`);
    if (hasChildren) splitKeys.push(`"children"`);

    const localAccess = (reactName: string, local: string): string => {
      // Hyphenated / reserved names need bracket access on the split local object.
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reactName) && reactName === local) {
        return `local.${local}`;
      }
      return `local[${JSON.stringify(reactName)}]`;
    };

    const ctx: TsPrintCtx = {
      env,
      propCode: (name) => {
        if (name === "Class") return `(local.class ?? local.className)`;
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared for Solid`);
        return localAccess(d.reactName, d.local);
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value()`,
      resolvedTagCode: () => "resolvedTagValue()",
      helpers: helperImports,
    };

    const body: string[] = [];
    // Derived values as accessors so they stay reactive under Solid.
    for (const [name, expr] of Object.entries(part.derived ?? {})) {
      if (usesItem(expr, env)) throw new Error(`${brick.id}/${part.name}: derived ${name} uses loop item`);
      body.push(`const ${name}Value = () => ${printTsExpr(expr, ctx)};`);
    }

    const root = part.render;
    if (root.kind === "element" && root.tag.kind !== "static") {
      state.usesDynamic = true;
      if (root.tag.kind === "resolved") {
        state.usesResolveTag = true;
        const t = root.tag;
        body.push(
          `const resolvedTagValue = () => resolveTag(${ctx.propCode(t.fromProp)}, ${JSON.stringify(t.fallback)}, TagGroup.${t.group});`
        );
      } else if (root.tag.kind === "heading") {
        state.usesTitleTag = true;
        body.push(`const resolvedTagValue = () => titleTag(${ctx.propCode(root.tag.fromProp)});`);
      } else {
        body.push(`const resolvedTagValue = () => ${printTsExpr(root.tag.expr, ctx)};`);
      }
    }

    if (part.classes) {
      sharedImports.add(classesHelperName(part));
      const inputs = classSpecProps(part.classes).map((n) => ctx.propCode(n));
      const argList = [
        ...inputs.map((a, i) => {
          const propName = classSpecProps(part.classes!)[i]!;
          const d = decls.find((x) => x.def.name === propName);
          const key = d?.local ?? localIdent(propName);
          return `${key}: ${a}`;
        }),
        `className: local.class ?? local.className`,
      ];
      body.push(`const cls = () => ${classesHelperName(part)}({ ${argList.join(", ")} });`);
    }

    const jsx = this.printNode(root, ctx, part, state, { isRoot: true });

    const fn =
      `export const ${part.name}: Component<${propsTypeName}> = (props) => {\n` +
      indent(`const [local, rest] = splitProps(props, [${splitKeys.join(", ")}]);`, 1) +
      "\n" +
      indent([...body, ""].join("\n"), 1) +
      indent(`return (\n${indent(jsx, 1)}\n);`, 1) +
      `\n};`;

    const docs = `/**\n${part.docs
      .split("\n")
      .map((l) => ` * ${l}`.trimEnd())
      .join("\n")}\n */`;

    return {
      code: [docs, propsType, "", fn].join("\n"),
      helperImports,
      sharedImports,
      jsxAttrImports,
      usesResolveTag: state.usesResolveTag,
      usesTitleTag: state.usesTitleTag,
      usesCn: state.usesCn,
      usesDynamic: state.usesDynamic,
    };
  }

  private printAttrs(
    node: ElementNode,
    ctx: TsPrintCtx,
    part: PartDef,
    state: { usesCn: boolean },
    opts: { withRest: boolean; dynamicComponent?: boolean; inLoop: boolean }
  ): string {
    const out: string[] = [];
    if (opts.dynamicComponent) {
      out.push(`component={resolvedTagValue()}`);
    }
    for (const attr of node.attrs) {
      out.push(this.printAttr(attr, ctx, part, state, opts));
    }
    return out.filter(Boolean).join(" ");
  }

  private printAttr(
    attr: AttrSpec,
    ctx: TsPrintCtx,
    part: PartDef,
    state: { usesCn: boolean },
    opts: { withRest: boolean; inLoop: boolean }
  ): string {
    switch (attr.kind) {
      case "static":
        return `${solidAttrName(attr.name)}=${JSON.stringify(attr.value)}`;
      case "expr": {
        if (isPassthroughForward(attr, part)) return "";
        const name = solidAttrName(attr.name);
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
        return `${solidAttrName(attr.name)}={${printTsExpr(attr.expr, ctx)} || undefined}`;
      case "class": {
        if (!attr.spec) return `class={cls() || undefined}`;
        state.usesCn = true;
        const inline = printInlineClassSpec(attr.spec, ctx, () =>
          part.props.some((p) => p.name === "Class") && !opts.inLoop
            ? `(local.class ?? local.className)`
            : undefined
        );
        return `class={${inline} || undefined}`;
      }
      case "rest":
        return opts.withRest ? `{...rest}` : "";
    }
  }

  private printNode(
    node: Node,
    ctx: TsPrintCtx,
    part: PartDef,
    state: {
      usesResolveTag: boolean;
      usesTitleTag: boolean;
      usesCn: boolean;
      usesDynamic: boolean;
    },
    opts: { isRoot?: boolean; inLoop?: boolean } = {}
  ): string {
    switch (node.kind) {
      case "element": {
        const isDynamic = node.tag.kind !== "static";
        if (isDynamic && !opts.isRoot) {
          throw new Error(`${part.name}: dynamic tags only supported at part root`);
        }
        const tagCode = node.tag.kind === "static" ? node.tag.tag : "Dynamic";
        if (isDynamic) state.usesDynamic = true;

        const attrs = this.printAttrs(node, ctx, part, state, {
          withRest: opts.isRoot === true,
          dynamicComponent: isDynamic,
          inLoop: opts.inLoop === true,
        });
        let open = attrs.length > 0 ? `<${tagCode} ${attrs}` : `<${tagCode}`;

        // Match other runtimes' SSR DOM: textarea text is children, not a
        // `value=""` attribute (Solid controlled `value` would add that attr).
        if (
          !isDynamic &&
          tagCode === "textarea" &&
          node.children.length === 1 &&
          node.children[0]!.kind === "text"
        ) {
          const value = printTsExpr((node.children[0] as { expr: Expr }).expr, ctx);
          return `${open}>{(${value}) ?? ""}\n</textarea>`;
        }
        if (node.void || node.children.length === 0) return `${open} />`;
        const children = node.children
          .map((c) => this.printNode(c, ctx, part, state, { inLoop: opts.inLoop }))
          .join("\n");
        const close = isDynamic ? "Dynamic" : tagCode;
        return `${open}>\n${indent(children, 1)}\n</${close}>`;
      }
      case "slot":
        return `{local.children}`;
      case "text":
        return `{${printTsExpr(node.expr, ctx)}}`;
      case "when": {
        const test = printTsExpr(node.test, ctx);
        const inner = { ...opts, isRoot: opts.isRoot };
        const thenCode = this.wrapFragment(
          node.then.map((c) => this.printNode(c, ctx, part, state, inner))
        );
        const elseCode =
          node.else && node.else.length > 0
            ? this.wrapFragment(node.else.map((c) => this.printNode(c, ctx, part, state, inner)))
            : "null";
        const ternary = `${test} ? (\n${indent(thenCode, 1)}\n) : ${
          elseCode === "null" ? "null" : `(\n${indent(elseCode, 1)}\n)`
        }`;
        return opts.isRoot ? ternary : `{${ternary}}`;
      }
      case "forEach": {
        const itemsProp = part.props.find((p) => p.name === node.itemsProp)!;
        const itemsCode = ctx.propCode(itemsProp.name);
        const body = node.body.map((c) =>
          this.printNode(c, ctx, part, state, { inLoop: true })
        );
        const bodyCode = this.wrapFragment(body);
        // Solid: .map is fine for SSR parity; keys help reconciliation on client.
        return `{(${itemsCode} ?? []).map((item, index) => (\n${indent(bodyCode, 1)}\n))}`;
      }
    }
  }

  private wrapFragment(parts: string[]): string {
    if (parts.length === 1) return parts[0]!;
    return `<>\n${indent(parts.join("\n"), 1)}\n</>`;
  }
}
