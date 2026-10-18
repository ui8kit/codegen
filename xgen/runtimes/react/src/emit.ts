/**
 * React emitter — one `<stem>.tsx` per one-part brick, one `<part>.tsx` per part otherwise: the variant table at the top (shadcn style), forwardRef components,
 * Radix-style `asChild` via Slot where the contract allows.
 */

import type { Expr } from "@ui8kit/xgen-spec";
import {
  fileStem,
  type BrickDef,
  type PartDef,
} from "@ui8kit/xgen-spec";
import { localIdent } from "@ui8kit/xgen-spec";
import {
  BANNER,
  importLine,
  indent,
  wrapText,
  wrapUnion,
  makeEnv,
  usesItem,
  type Emitter,
  type GeneratedFile,
  type TypeEnv,
} from "@ui8kit/xgen-runtime-core";
import { printTsExpr, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";
import { classesExpr, declaredProps, partHead } from "@ui8kit/xgen-runtime-core";

import { REACT_ATTR_TYPES, NUMERIC_DOM_ATTRS, asNumberExpr, reactAttrName, rootElements, staticTagOf } from "./dom";
import { printNode } from "./jsx";
import type { PartEmit } from "./dom";
import { fileName } from "@ui8kit/xgen-screens";

export class ReactEmitter implements Emitter {
  readonly runtime = "react" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    const parts = brick.parts.map((part) => this.emitPart(brick, part));
    // one part: one file named after the brick; several parts: one file per part (like the Svelte package),
    // the parts import what they share (variant tables, record types) from the sibling that owns it
    if (parts.length === 1) return this.fit(`primitives/${brick.dir}/${fileStem(brick)}`, brick.docs, parts[0]!);
    return brick.parts.flatMap((part, i) =>
      this.fit(`primitives/${brick.dir}/${fileName(part.name)}`, i === 0 ? brick.docs : `${part.name}: one part of ${brick.parts[0]!.name} (one file per part, as in the Svelte package).`, parts[i]!));
  }

  /** the file of one part; when it would pass the readability limit (150 by the check's count, which includes the line after the final newline), its variant tables and value types move to `<stem>-variants.ts` */
  private fit(stem: string, docs: string, part: PartEmit): GeneratedFile[] {
    const whole = this.file(docs, [part]);
    if (whole.split("\n").length <= 150 || part.headCode.length === 0) return [{ path: `${stem}.tsx`, contents: whole }];
    const head = part.headCode.join("\n");
    const names = [...head.matchAll(/^export (const|type) (\w+)/gm)].map((m) => (m[1] === "type" ? `type ${m[2]}` : m[2]!));
    const base = stem.split("/").pop()!;
    const table = [`// ${BANNER}`, `/** The variant tables of ${docs.split(/[ .:]/)[0]} and the value types of its props, kept out of ${base}.tsx. */`,
      `import { ${part.headUtils.join(", ")} } from "${this.utilsPath}";`, ``, head.trimEnd(), ``].join("\n");
    const slim: PartEmit = { ...part, code: part.code.slice(head.length).replace(/^\n+/, ""), headCode: [], utilImports: new Set([...part.utilImports].filter((u) => !part.headUtils.includes(u))) };
    const contents = this.file(docs, [slim], [importLine(names, `./${base}-variants`)]);
    return [{ path: `${stem}.tsx`, contents }, { path: `${stem}-variants.ts`, contents: table }];
  }

  /** a file of parts: banner, docs, the imports its parts need, then the parts */
  private file(docs: string, parts: PartEmit[], extraImports: string[] = []): string {
    const helperImports = new Set<string>(parts.flatMap((p) => [...p.helperImports]));
    const utilImports = new Set<string>(parts.flatMap((p) => [...p.utilImports]));
    const reactTypeImports = new Set<string>(parts.flatMap((p) => [...p.reactTypeImports]));
    const usesResolveTag = parts.some((p) => p.usesResolveTag);
    const usesTitleTag = parts.some((p) => p.usesTitleTag);
    const usesCn = parts.some((p) => p.usesCn);
    const usesSlot = parts.some((p) => p.usesSlot);
    const usesElementType = parts.some((p) => p.usesElementType);
    const usesRefCast = parts.some((p) => p.usesRefCast);
    const usesSvgProps = parts.some((p) => p.usesSvgProps);
    if (usesTitleTag) helperImports.add("titleTag");

    const lines: string[] = [];
    lines.push(`// ${BANNER}`);
    lines.push(`/**`);
    for (const line of wrapText(docs)) lines.push(` * ${line}`.trimEnd());
    lines.push(` */`);
    lines.push(``);

    const reactValueImports = ["forwardRef"];
    const reactTypes = ["type ReactNode", ...[...reactTypeImports].sort().map((t) => `type ${t}`)];
    if (usesElementType) reactTypes.push("type ElementType");
    if (usesRefCast) reactTypes.push("type Ref");
    if (usesSvgProps) reactTypes.push("type SVGProps");
    lines.push(importLine([...reactValueImports, ...reactTypes], "react"));
    if (usesCn) utilImports.add("cn");
    const utils = ["cn", "variants", "type VariantKey"].filter((u) => utilImports.has(u));
    if (utils.length > 0) lines.push(`import { ${utils.join(", ")} } from "${this.utilsPath}";`);
    if (helperImports.size > 0) {
      lines.push(`import { ${[...helperImports].sort().join(", ")} } from "${this.utilsPath}/expr";`);
    }
    if (usesResolveTag) lines.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);
    if (usesSlot) lines.push(`import { Slot } from "../slot/slot";`);
    lines.push(...extraImports);
    if (parts.length === 1) {
      for (const [owner, names] of parts[0]!.fromSibling) {
        const list = [...[...names.values].sort(), ...[...names.types].sort().map((t) => `type ${t}`)];
        lines.push(importLine(list, `./${fileName(owner)}`));
      }
    }
    lines.push(``);

    for (const p of parts) {
      lines.push(p.code);
      lines.push(``);
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  private emitPart(brick: BrickDef, part: PartDef): PartEmit {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const helperImports = new Set<string>();
    const head = partHead(brick, part);
    const utilImports = new Set<string>();
    const reactTypeImports = new Set<string>();
    const state = {
      usesResolveTag: false,
      usesTitleTag: false,
      usesCn: false,
      usesSlot: false,
      usesElementType: false,
      usesRefCast: false,
      usesSvgProps: false,
    };

    const hasChildren = part.props.some((p) => p.type === "children");

    // Root typing.
    const roots = rootElements(part.render);
    const rootTags = roots.map((r) => staticTagOf(r.tag));
    const multiRoot = roots.length > 1;
    const hasSvgRoot = rootTags.includes("svg");
    const singleStaticTag =
      !multiRoot && rootTags.length === 1 && rootTags[0] !== undefined ? rootTags[0] : undefined;
    const isSvgRoot = singleStaticTag === "svg";
    const [attrType, elemType] =
      singleStaticTag && !isSvgRoot
        ? REACT_ATTR_TYPES[singleStaticTag] ?? ["HTMLAttributes", "HTMLElement"]
        : ["HTMLAttributes", "HTMLElement"];
    reactTypeImports.add(attrType);
    const refType = isSvgRoot
      ? "SVGSVGElement"
      : multiRoot && hasSvgRoot
        ? "HTMLElement | SVGSVGElement"
        : singleStaticTag
          ? elemType
          : "HTMLElement";
    // Casts are needed when the forwardRef generic is wider than one element.
    const needsRefCast = multiRoot || singleStaticTag === undefined || isSvgRoot;
    if (needsRefCast) state.usesRefCast = true;

    // Props type.
    const omitKeys = new Set<string>(["className", "children"]);
    for (const d of decls) omitKeys.add(d.reactName);
    const propsFields: string[] = decls.map((d) => {
      const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(d.reactName) ? d.reactName : JSON.stringify(d.reactName);
      return `  ${key}?: ${d.tsType};`;
    });
    propsFields.push(`  className?: string;`);
    if (hasChildren) propsFields.push(`  children?: ReactNode;`);
    if (part.asChild) propsFields.push(`  asChild?: boolean;`);

    const genericAttr = attrType === "HTMLAttributes" ? `HTMLAttributes<${elemType}>` : `${attrType}<${elemType}>`;
    const omit = [...omitKeys].map((k) => JSON.stringify(k)).join(" | ");
    const propsTypeName = `${part.name}Props`;
    const typeLine = `export type ${propsTypeName} = Omit<${genericAttr}, ${omit}> & {`;
    const typeHead = typeLine.length <= 100
      ? typeLine
      : `export type ${propsTypeName} = Omit<\n  ${genericAttr},\n${wrapUnion([...omitKeys].map((k) => JSON.stringify(k)), "  ").join("\n")}\n> & {`;
    const propsType = `${typeHead}\n${propsFields.join("\n")}\n};`;

    // Destructure list.
    const destructure: string[] = decls.map((d) =>
      d.reactName === d.local || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(d.reactName)
        ? /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(d.reactName)
          ? d.reactName
          : `${JSON.stringify(d.reactName)}: ${d.local}`
        : `${d.reactName}: ${d.local}`
    );
    destructure.push("className");
    if (hasChildren) destructure.push("children");
    if (part.asChild) destructure.push("asChild");
    destructure.push("...rest");

    // Print context.
    const ctx: TsPrintCtx = {
      env,
      propCode: (name) => {
        if (name === "Class") return "className";
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared for React`);
        return d.local;
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value`,
      resolvedTagCode: () => "resolvedTagValue",
      helpers: helperImports,
    };

    // Body statements.
    const body: string[] = [];
    if (part.classes) {
      const classes = classesExpr(brick, part, ctx);
      if (classes.usesVariantKey) head.usesVariantKey = true;
      state.usesCn = true;
      body.push(`const cls = ${classes.expr};`);
    }
    for (const [name, expr] of Object.entries(part.derived ?? {})) {
      if (usesItem(expr, env)) throw new Error(`${brick.id}/${part.name}: derived ${name} uses loop item`);
      body.push(`const ${name}Value = ${printTsExpr(expr, ctx)};`);
    }

    // Tag resolution for dynamic roots.
    const root = part.render;
    if (root.kind === "element" && root.tag.kind !== "static") {
      state.usesElementType = true;
      if (root.tag.kind === "resolved") {
        state.usesResolveTag = true;
        const t = root.tag;
        body.push(
          `const resolvedTagValue = resolveTag(${ctx.propCode(t.fromProp)}, ${JSON.stringify(t.fallback)}, TagGroup.${t.group});`
        );
      } else if (root.tag.kind === "heading") {
        state.usesTitleTag = true;
        body.push(`const resolvedTagValue = titleTag(${ctx.propCode(root.tag.fromProp)});`);
      } else {
        body.push(`const resolvedTagValue = ${printTsExpr(root.tag.expr, ctx)};`);
      }
      body.push(`const Tag = resolvedTagValue as ElementType;`);
    }

    // asChild branch.
    const asChildBranch = part.asChild
      ? `if (asChild) {\n` +
        `  return (\n` +
        `    <Slot ref={ref} className={${part.classes ? "cls" : "className"}} {...rest}>\n` +
        `      {children}\n` +
        `    </Slot>\n` +
        `  );\n` +
        `}\n`
      : "";
    if (part.asChild) state.usesSlot = true;

    // JSX.
    const jsx = printNode(root, ctx, part, state, { isRoot: true, needsRefCast });

    const fn =
      `export const ${part.name} = forwardRef<${refType}, ${propsTypeName}>(function ${part.name}(\n` +
      `  { ${destructure.join(", ")} },\n` +
      `  ref\n` +
      `) {\n` +
      indent([...body, ""].join("\n"), 1) +
      (asChildBranch ? indent(asChildBranch, 1) : "") +
      indent(`return (\n${indent(jsx, 1)}\n);`, 1) +
      `\n});\n${part.name}.displayName = ${JSON.stringify(part.name)};`;

    const docs = `/**\n${wrapText(part.docs)
      .map((l) => ` * ${l}`.trimEnd())
      .join("\n")}\n */`;

    if (head.usesVariants) utilImports.add("variants");
    if (head.usesVariantKey) utilImports.add("type VariantKey");
    return {
      code: [...head.code, docs, propsType, "", fn].join("\n"),
      headCode: head.code,
      headUtils: [...(head.usesVariants ? ["variants"] : []), ...(head.usesVariantKey ? ["type VariantKey"] : [])],
      helperImports,
      utilImports,
      reactTypeImports,
      usesResolveTag: state.usesResolveTag,
      usesTitleTag: state.usesTitleTag,
      usesCn: state.usesCn,
      usesSlot: state.usesSlot,
      usesElementType: state.usesElementType,
      usesRefCast: state.usesRefCast,
      usesSvgProps: state.usesSvgProps,
      fromSibling: head.fromSibling,
    };
  }

}
