/**
 * SolidJS emitter (after ui8kit/codegen's Solid emitter) — one `<stem>.tsx` per one-part brick, one `<part>.tsx` per part otherwise:
 * the variant table at the top (shadcn style), components over `splitProps` so every prop stays reactive, `Dynamic` for a polymorphic
 * root, `<Show>` for a branch and `<For>` for a list. No Radix-style `asChild` (React-only): style another element with the
 * exported variant table, as in Svelte and Vue.
 */

import { fileStem, localIdent, type BrickDef, type PartDef } from "@ui8kit/xgen-spec";
import { BANNER, importLine, indent, wrapText, makeEnv, usesItem, type Emitter, type GeneratedFile, type TypeEnv } from "@ui8kit/xgen-runtime-core";
import { printTsExpr, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";
import { classesExpr, declaredProps, partHead } from "@ui8kit/xgen-runtime-core";
import { fileName } from "@ui8kit/xgen-screens";
import { SOLID_ATTR_TYPES, rootElements, staticTagOf, type PartEmit } from "./dom";
import { printNode, type JsxState } from "./jsx";

export class SolidEmitter implements Emitter {
  readonly runtime = "solid" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    const parts = brick.parts.map((part) => this.emitPart(brick, part));
    if (parts.length === 1) return this.fit(`primitives/${brick.dir}/${fileStem(brick)}`, brick.docs, parts[0]!);
    return brick.parts.flatMap((part, i) =>
      this.fit(`primitives/${brick.dir}/${fileName(part.name)}`, i === 0 ? brick.docs : `${part.name}: one part of ${brick.parts[0]!.name} (one file per part, as in the Svelte package).`, parts[i]!));
  }

  /** the file of one part; a long one moves its variant tables and value types to `<stem>-variants.ts` (the readability limit) */
  private fit(stem: string, docs: string, part: PartEmit): GeneratedFile[] {
    const whole = this.file(docs, [part]);
    if (whole.split("\n").length <= 150 || part.headCode.length === 0) return [{ path: `${stem}.tsx`, contents: whole }];
    const head = part.headCode.join("\n");
    const names = [...head.matchAll(/^export (const|type) (\w+)/gm)].map((m) => (m[1] === "type" ? `type ${m[2]}` : m[2]!));
    const base = stem.split("/").pop()!;
    const table = [`// ${BANNER}`, `/** The variant tables of ${docs.split(/[ .:]/)[0]} and the value types of its props, kept out of ${base}.tsx. */`,
      `import { ${part.headUtils.join(", ")} } from "${this.utilsPath}";`, ``, head.trimEnd(), ``].join("\n");
    const slim: PartEmit = { ...part, code: part.code.slice(head.length).replace(/^\n+/, ""), headCode: [], utilImports: new Set([...part.utilImports].filter((u) => !part.headUtils.includes(u))) };
    return [{ path: `${stem}.tsx`, contents: this.file(docs, [slim], [importLine(names, `./${base}-variants`)]) }, { path: `${stem}-variants.ts`, contents: table }];
  }

  private file(docs: string, parts: PartEmit[], extraImports: string[] = []): string {
    const helperImports = new Set<string>(parts.flatMap((p) => [...p.helperImports]));
    const utilImports = new Set<string>(parts.flatMap((p) => [...p.utilImports]));
    const solidNames = new Set<string>(parts.flatMap((p) => [...p.solidImports]));
    const usesResolveTag = parts.some((p) => p.usesResolveTag);
    if (parts.some((p) => p.usesTitleTag)) helperImports.add("titleTag");
    if (parts.some((p) => p.usesCn)) utilImports.add("cn");
    const lines: string[] = [`// ${BANNER}`, `/**`, ...wrapText(docs).map((l) => ` * ${l}`.trimEnd()), ` */`, ``];
    lines.push(importLine(["splitProps", ...[...solidNames].sort(), "type Component", "type JSX"], "solid-js"));
    if (parts.some((p) => p.usesDynamic)) lines.push(`import { Dynamic } from "solid-js/web";`);
    const utils = ["cn", "variants", "type VariantKey"].filter((u) => utilImports.has(u));
    if (utils.length) lines.push(`import { ${utils.join(", ")} } from "${this.utilsPath}";`);
    if (helperImports.size) lines.push(`import { ${[...helperImports].sort().join(", ")} } from "${this.utilsPath}/expr";`);
    if (usesResolveTag) lines.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);
    lines.push(...extraImports);
    if (parts.length === 1) for (const [owner, names] of parts[0]!.fromSibling) {
      lines.push(importLine([...[...names.values].sort(), ...[...names.types].sort().map((t) => `type ${t}`)], `./${fileName(owner)}`));
    }
    lines.push(``);
    for (const p of parts) lines.push(p.code, ``);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  private emitPart(brick: BrickDef, part: PartDef): PartEmit {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const helperImports = new Set<string>();
    const head = partHead(brick, part);
    const utilImports = new Set<string>();
    const state: JsxState = { usesResolveTag: false, usesTitleTag: false, usesCn: false, usesDynamic: false, solid: new Set() };
    const hasChildren = part.props.some((p) => p.type === "children");

    // the attribute type of the root: one static tag gives its element type, anything else HTMLElement
    const roots = rootElements(part.render);
    const tags = roots.map((r) => staticTagOf(r.tag));
    const single = roots.length === 1 && tags[0] !== undefined ? tags[0] : undefined;
    const svg = single === "svg";
    const [attrType, elemType] = single && !svg ? SOLID_ATTR_TYPES[single] ?? ["HTMLAttributes", "HTMLElement"] : ["HTMLAttributes", "HTMLElement"];
    state.restCast = svg || !single;
    const attrGeneric = svg ? "JSX.SvgSVGAttributes<SVGSVGElement>" : `JSX.${attrType}<${elemType}>`;

    const omitKeys = new Set<string>(["class", "children"]);
    for (const d of decls) omitKeys.add(d.reactName);
    const ident = (s: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
    const fields = decls.map((d) => `  ${ident(d.reactName) ? d.reactName : JSON.stringify(d.reactName)}?: ${d.tsType};`);
    fields.push(`  class?: string;`);
    if (hasChildren) fields.push(`  children?: JSX.Element;`);
    const omit = [...omitKeys].map((k) => JSON.stringify(k));
    const typeLine = `export type ${part.name}Props = Omit<${attrGeneric}, ${omit.join(" | ")}> & {`;
    const typeHead = typeLine.length <= 100 ? typeLine : `export type ${part.name}Props = Omit<\n  ${attrGeneric},\n  ${omit.join(" | ")}\n> & {`;
    const propsType = `${typeHead}\n${fields.join("\n")}\n};`;
    const splitKeys = [...decls.map((d) => JSON.stringify(d.reactName)), `"class"`, ...(hasChildren ? [`"children"`] : [])];

    const ctx: TsPrintCtx = {
      env,
      propCode: (name) => {
        if (name === "Class") return "local.class";
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared for Solid`);
        return ident(d.reactName) ? `local.${d.reactName}` : `local[${JSON.stringify(d.reactName)}]`;
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value()`,
      resolvedTagCode: () => "resolvedTagValue()",
      helpers: helperImports,
    };

    // every value is an accessor, so it follows its props
    const body: string[] = [];
    if (part.classes) {
      const classes = classesExpr(brick, part, ctx);
      if (classes.usesVariantKey) head.usesVariantKey = true;
      state.usesCn = true;
      body.push(`const cls = () => ${classes.expr};`);
    }
    for (const [name, expr] of Object.entries(part.derived ?? {})) {
      if (usesItem(expr, env)) throw new Error(`${brick.id}/${part.name}: derived ${name} uses loop item`);
      body.push(`const ${name}Value = () => ${printTsExpr(expr, ctx)};`);
    }
    const root = part.render;
    if (root.kind === "element" && root.tag.kind !== "static") {
      state.usesDynamic = true;
      if (root.tag.kind === "resolved") {
        state.usesResolveTag = true;
        body.push(`const resolvedTagValue = () => resolveTag(${ctx.propCode(root.tag.fromProp)}, ${JSON.stringify(root.tag.fallback)}, TagGroup.${root.tag.group});`);
      } else if (root.tag.kind === "heading") {
        state.usesTitleTag = true;
        body.push(`const resolvedTagValue = () => titleTag(${ctx.propCode(root.tag.fromProp)});`);
      } else body.push(`const resolvedTagValue = () => ${printTsExpr(root.tag.expr, ctx)};`);
    }
    const jsx = printNode(root, ctx, part, state, { isRoot: true });
    const fn =
      `export const ${part.name}: Component<${part.name}Props> = (props) => {\n` +
      indent(`const [local, rest] = splitProps(props, [${splitKeys.join(", ")}]);`, 1) + "\n" +
      indent([...body, ""].join("\n"), 1) +
      indent(`return (\n${indent(jsx, 1)}\n);`, 1) +
      `\n};`;
    const docs = `/**\n${wrapText(part.docs).map((l) => ` * ${l}`.trimEnd()).join("\n")}\n */`;
    if (head.usesVariants) utilImports.add("variants");
    if (head.usesVariantKey) utilImports.add("type VariantKey");
    return {
      code: [...head.code, docs, propsType, "", fn].join("\n"),
      headCode: head.code,
      headUtils: [...(head.usesVariants ? ["variants"] : []), ...(head.usesVariantKey ? ["type VariantKey"] : [])],
      helperImports, utilImports, solidImports: state.solid,
      usesResolveTag: state.usesResolveTag, usesTitleTag: state.usesTitleTag, usesCn: state.usesCn, usesDynamic: state.usesDynamic,
      fromSibling: head.fromSibling,
    };
  }
}
