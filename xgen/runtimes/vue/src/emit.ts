import { fileName } from "@ui8kit/xgen-screens";

/**
 * Vue 3 emitter: one kebab-case `.vue` file per part. The variant tables and the props type sit in a plain `<script>`
 * (exported like the Svelte module script), the component in `<script setup lang="ts">`: typed `defineProps` with
 * reactive destructure, `class` as a prop (shadcn-vue style), the free attributes through `useAttrs()`, the default slot
 * for children and `<component :is>` for resolved tags.
 */

import { type AttrSpec, type BrickDef, type ElementNode, type Node, type PartDef } from "@ui8kit/xgen-spec";
import { localIdent } from "@ui8kit/xgen-spec";
import { BANNER, exprType, indent, wrapText, makeEnv, usesItem, type Emitter, type GeneratedFile, type TypeEnv } from "@ui8kit/xgen-runtime-core";
import { formatAttr, printTsExpr, tagHead, wrapList, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";
import { classesExpr, declaredProps, neverEmptyString, partHead, printInlineClassSpec, isPassthroughForward } from "@ui8kit/xgen-runtime-core";
import { attrExpr, each, ifChain, vueAttr } from "./template";

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
/** Vue matches a prop by its camelCase name: `aria-label` is declared `ariaLabel` (the template may write either) */
export const camelProp = (name: string): string => name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

interface State { usesResolveTag: boolean; usesCn: boolean; usesRest: boolean }

export class VueEmitter implements Emitter {
  readonly runtime = "vue" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    return brick.parts.map((part) => this.emitPart(brick, part));
  }

  private emitPart(brick: BrickDef, part: PartDef): GeneratedFile {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const helperImports = new Set<string>();
    const head = partHead(brick, part);
    const state: State = { usesResolveTag: false, usesCn: false, usesRest: false };
    const hasChildren = part.props.some((p) => p.type === "children");

    const typeFields = decls.map((d) => `  ${camelProp(d.htmlName)}?: ${d.tsType};`);
    typeFields.push(`  class?: string;`);
    const destructure = decls.map((d) => (camelProp(d.htmlName) === d.local ? d.local : `${camelProp(d.htmlName)}: ${d.local}`));
    destructure.push(`class: className`);

    // the template reads a computed by its name, the script by `.value`
    const ctxFor = (script: boolean): TsPrintCtx => ({
      env,
      propCode: (name) => {
        if (name === "Class") return "className";
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared for Vue`);
        return d.local;
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value${script ? ".value" : ""}`,
      resolvedTagCode: () => `resolvedTagValue${script ? ".value" : ""}`,
      helpers: helperImports,
    });
    const ctx = ctxFor(false);
    const sctx = ctxFor(true);

    const body: string[] = [];
    if (part.classes) {
      const classes = classesExpr(brick, part, sctx);
      if (classes.usesVariantKey) head.usesVariantKey = true;
      state.usesCn = true;
      body.push(`const cls = computed(() => ${classes.expr});`);
    }
    for (const [name, expr] of Object.entries(part.derived ?? {})) {
      if (usesItem(expr, env)) throw new Error(`${brick.id}/${part.name}: derived ${name} uses loop item`);
      body.push(`const ${name}Value = computed(() => ${printTsExpr(expr, sctx)});`);
    }
    const root = part.render;
    if (root.kind === "element" && root.tag.kind !== "static") {
      const prop = root.tag.kind === "resolved" || root.tag.kind === "heading" ? sctx.propCode(root.tag.fromProp) : "";
      if (root.tag.kind === "resolved") {
        state.usesResolveTag = true;
        body.push(`const resolvedTagValue = computed(() => resolveTag(${prop}, ${JSON.stringify(root.tag.fallback)}, TagGroup.${root.tag.group}));`);
      } else if (root.tag.kind === "heading") {
        helperImports.add("titleTag");
        body.push(`const resolvedTagValue = computed(() => titleTag(${prop}));`);
      } else body.push(`const resolvedTagValue = computed(() => ${printTsExpr(root.tag.expr, sctx)});`);
    }

    const markup = this.printNode(root, ctx, part, state, { isRoot: true });

    const moduleImports: string[] = [];
    const utils = [...(head.usesVariants ? ["variants"] : []), ...(head.usesVariantKey ? ["type VariantKey"] : [])];
    if (utils.length > 0) moduleImports.push(`import { ${utils.join(", ")} } from "${this.utilsPath}";`);
    for (const [owner, names] of head.fromSibling) {
      const list = [...[...names.values].sort(), ...[...names.types].sort().map((t) => `type ${t}`)];
      moduleImports.push(`import { ${list.join(", ")} } from "./${fileName(owner)}.vue";`);
    }
    const vue = [...(body.length ? ["computed"] : []), ...(state.usesRest ? ["useAttrs"] : [])];
    const scriptImports = vue.length ? [`import { ${vue.join(", ")} } from "vue";`] : [];
    if (state.usesCn) scriptImports.push(`import { cn } from "${this.utilsPath}";`);
    if (helperImports.size > 0) scriptImports.push(`import { ${[...helperImports].sort().join(", ")} } from "${this.utilsPath}/expr";`);
    if (state.usesResolveTag) scriptImports.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);

    const docs = wrapText(part.docs).map((l) => `  ${l}`.trimEnd()).join("\n");
    const lines: string[] = [
      `<!-- ${BANNER} -->`,
      `<!--\n${docs}\n-->`,
      `<script lang="ts">`,
      ...moduleImports,
      ...(moduleImports.length ? [``] : []),
      ...head.code,
      `export type ${part.name}Props = {\n${typeFields.join("\n")}\n};`,
      `</script>`,
      ``,
      `<script setup lang="ts">`,
      ...scriptImports,
      ``,
      `defineOptions({ inheritAttrs: false });`,
      ...(hasChildren ? [`defineSlots<{ default?(): unknown }>();`] : []),
      wrapList("const {", destructure, `} = defineProps<${part.name}Props>();`, 110),
      ...(state.usesRest ? [`const attrs = useAttrs();`] : []),
      ...body,
      `</script>`,
      ``,
      `<template>`,
      indent(markup, 1),
      `</template>`,
    ];
    return {
      path: `primitives/${brick.dir}/${fileName(part.name)}.vue`,
      contents: lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
    };
  }

  private printAttr(attr: AttrSpec, ctx: TsPrintCtx, part: PartDef, state: State, inLoop: boolean): string {
    switch (attr.kind) {
      case "static":
        return `${attr.name}="${attr.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
      case "expr": {
        if (isPassthroughForward(attr, part)) return "";
        const value = printTsExpr(attr.expr, ctx);
        const t = exprType(attr.expr, ctx.env);
        if (attr.when) return `:${attr.name}="${attrExpr(`${printTsExpr(attr.when, ctx)} ? ${value} : undefined`)}"`;
        if (attr.keepEmpty && t === "string") return `:${attr.name}="${attrExpr(`(${value}) ?? ""`)}"`;
        if (t !== "string" || neverEmptyString(attr.expr, ctx.env)) return `:${attr.name}="${attrExpr(value)}"`;
        ctx.helpers.add("orUndef");
        return `:${attr.name}="orUndef(${attrExpr(value)})"`;
      }
      case "bool":
        return `:${attr.name}="${attrExpr(printTsExpr(attr.expr, ctx))} || undefined"`;
      case "class": {
        // undefined drops the attribute, like the conditional spread of the Svelte output
        if (!attr.spec) return `:class="cls || undefined"`;
        state.usesCn = true;
        const inline = printInlineClassSpec(attr.spec, ctx, () => (part.props.some((p) => p.name === "Class") && !inLoop ? "className" : undefined));
        if (/^cn\("[^"]+"/.test(inline)) return vueAttr(formatAttr(`class={${inline}}`));
        return `:class="${attrExpr(inline)} || undefined"`;
      }
      case "rest":
        state.usesRest = true;
        return `v-bind="attrs"`;
    }
  }

  private printNode(node: Node, ctx: TsPrintCtx, part: PartDef, state: State, opts: { isRoot?: boolean; inLoop?: boolean } = {}): string {
    switch (node.kind) {
      case "element": {
        const dynamic = node.tag.kind !== "static";
        if (dynamic && !opts.isRoot) throw new Error(`${part.name}: dynamic tags only supported at part root`);
        const tagCode = dynamic ? "component" : node.tag.kind === "static" ? node.tag.tag : "";
        const attrs = node.attrs.map((a) => this.printAttr(a, ctx, part, state, opts.inLoop === true)).filter(Boolean);
        const head = [...(dynamic ? [`:is="resolvedTagValue"`] : []), ...attrs];
        if (node.void || node.children.length === 0) return node.void ? tagHead(tagCode, head, "/>") : `${tagHead(tagCode, head, ">")}</${tagCode}>`;
        const open = tagHead(tagCode, head, ">");
        const rendered = node.children.map((c) => this.printNode(c, ctx, part, state, { inLoop: opts.inLoop }));
        // mixed inline content (text + slot) on one line: no whitespace text nodes between them
        if (node.children.some((c) => c.kind === "text")) return `${open}${rendered.join("")}</${tagCode}>`;
        return `${open}\n${indent(rendered.join("\n"), 1)}\n</${tagCode}>`;
      }
      case "slot":
        return `<slot />`;
      case "text":
        return `{{ ${printTsExpr(node.expr, ctx)} }}`;
      case "when": {
        const lines = (nodes: Node[]): string[] => nodes.flatMap((c) => this.printNode(c, ctx, part, state, opts).split("\n"));
        const branches: Array<[string, string[]]> = [[printTsExpr(node.test, ctx), lines(node.then)]];
        let rest = node.else ?? [];
        while (rest.length === 1 && rest[0]!.kind === "when") {
          const w = rest[0]!;
          branches.push([printTsExpr(w.test, ctx), lines(w.then)]);
          rest = w.else ?? [];
        }
        return ifChain(branches, lines(rest)).join("\n");
      }
      case "forEach": {
        const body = node.body.flatMap((c) => this.printNode(c, ctx, part, state, { inLoop: true }).split("\n"));
        return each(`${ctx.propCode(node.itemsProp)} ?? []`, "item", "i", body, "i").join("\n");
      }
    }
  }
}
