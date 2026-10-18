import { fileName } from "@ui8kit/xgen-screens";

/**
 * Svelte 5 emitter — one kebab-case `.svelte` file per part (runes mode,
 * snippets for children, `<svelte:element>` for resolved tags, HTML-native
 * prop names: `class`, `for`, `aria-label`).
 */

import {
  type AttrSpec,
  type BrickDef,
  type ElementNode,
  type Node,
  type PartDef,
} from "@ui8kit/xgen-spec";
import { localIdent } from "@ui8kit/xgen-spec";
import {
  BANNER,
  exprType,
  indent,
  wrapText,
  makeEnv,
  usesItem,
  type Emitter,
  type GeneratedFile,
  type TypeEnv,
} from "@ui8kit/xgen-runtime-core";
import { formatAttr, printTsExpr, tagHead, type TsPrintCtx } from "@ui8kit/xgen-runtime-core";
import {
  classesExpr,
  declaredProps,
  neverEmptyString,
  partHead,
  printInlineClassSpec,
  isPassthroughForward,
} from "@ui8kit/xgen-runtime-core";

/** attributes whose Svelte DOM typings are narrower than the portable spec (numbers, literal unions): passed as untyped spread, the browser gets the same attribute */
const NARROW_ATTRS = new Set(["colspan", "rowspan", "span", "rows", "scope", "value", "min", "max", "step"]);

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export class SvelteEmitter implements Emitter {
  readonly runtime = "svelte" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    return brick.parts.map((part) => this.emitPart(brick, part));
  }

  private emitPart(brick: BrickDef, part: PartDef): GeneratedFile {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const helperImports = new Set<string>();
    const head = partHead(brick, part);
    const state = { usesResolveTag: false, usesTitleTag: false, usesCn: false };
    const hasChildren = part.props.some((p) => p.type === "children");

    // Props type (module script).
    const typeFields: string[] = decls.map((d) => {
      const key = IDENT_RE.test(d.htmlName) ? d.htmlName : JSON.stringify(d.htmlName);
      return `  ${key}?: ${d.tsType};`;
    });
    typeFields.push(`  class?: string;`);
    if (hasChildren) typeFields.push(`  children?: Snippet;`);
    typeFields.push(`  [key: string]: unknown;`);

    // Destructure.
    const destructure: string[] = decls.map((d) => {
      if (!IDENT_RE.test(d.htmlName)) return `${JSON.stringify(d.htmlName)}: ${d.local}`;
      return d.htmlName === d.local ? d.htmlName : `${d.htmlName}: ${d.local}`;
    });
    destructure.push(`class: className`);
    if (hasChildren) destructure.push("children");
    destructure.push("...rest");

    const ctx: TsPrintCtx = {
      env,
      propCode: (name) => {
        if (name === "Class") return "className";
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared for Svelte`);
        return d.local;
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value`,
      resolvedTagCode: () => "resolvedTagValue",
      helpers: helperImports,
    };

    const body: string[] = [];
    if (part.classes) {
      const classes = classesExpr(brick, part, ctx);
      if (classes.usesVariantKey) head.usesVariantKey = true;
      state.usesCn = true;
      body.push(`const cls = $derived(${classes.expr});`);
    }
    for (const [name, expr] of Object.entries(part.derived ?? {})) {
      if (usesItem(expr, env)) throw new Error(`${brick.id}/${part.name}: derived ${name} uses loop item`);
      body.push(`const ${name}Value = $derived(${printTsExpr(expr, ctx)});`);
    }

    const root = part.render;
    if (root.kind === "element" && root.tag.kind !== "static") {
      if (root.tag.kind === "resolved") {
        state.usesResolveTag = true;
        body.push(
          `const resolvedTagValue = $derived(resolveTag(${ctx.propCode(root.tag.fromProp)}, ${JSON.stringify(root.tag.fallback)}, TagGroup.${root.tag.group}));`
        );
      } else if (root.tag.kind === "heading") {
        state.usesTitleTag = true;
        helperImports.add("titleTag");
        body.push(`const resolvedTagValue = $derived(titleTag(${ctx.propCode(root.tag.fromProp)}));`);
      } else {
        body.push(`const resolvedTagValue = $derived(${printTsExpr(root.tag.expr, ctx)});`);
      }
    }

    const markup = this.printNode(root, ctx, part, state, { isRoot: true });

    // Assemble file.
    const moduleImports: string[] = [];
    if (hasChildren) moduleImports.push(`import type { Snippet } from "svelte";`);
    const utils = [...(head.usesVariants ? ["variants"] : []), ...(head.usesVariantKey ? ["type VariantKey"] : [])];
    if (utils.length > 0) moduleImports.push(`import { ${utils.join(", ")} } from "${this.utilsPath}";`);
    for (const [owner, names] of head.fromSibling) {
      const list = [...[...names.values].sort(), ...[...names.types].sort().map((t) => `type ${t}`)];
      moduleImports.push(`import { ${list.join(", ")} } from "./${fileName(owner)}.svelte";`);
    }

    const scriptImports: string[] = [];
    if (state.usesCn) scriptImports.push(`import { cn } from "${this.utilsPath}";`);
    if (helperImports.size > 0) {
      scriptImports.push(
        `import { ${[...helperImports].sort().join(", ")} } from "${this.utilsPath}/expr";`
      );
    }
    if (state.usesResolveTag) {
      scriptImports.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);
    }

    const docs = wrapText(part.docs)
      .map((l) => `  ${l}`.trimEnd())
      .join("\n");

    const lines: string[] = [];
    lines.push(`<!-- ${BANNER} -->`);
    lines.push(`<!--\n${docs}\n-->`);
    lines.push(`<script lang="ts" module>`);
    for (const imp of moduleImports) lines.push(indent(imp, 1));
    lines.push(``);
    for (const code of head.code) lines.push(code ? indent(code, 1) : ``);
    lines.push(indent(`export type ${part.name}Props = {\n${typeFields.join("\n")}\n};`, 1));
    lines.push(`</script>`);
    lines.push(``);
    lines.push(`<script lang="ts">`);
    for (const imp of scriptImports) lines.push(indent(imp, 1));
    if (scriptImports.length > 0) lines.push(``);
    lines.push(
      indent(
        `let {\n${destructure.map((d) => `  ${d}`).join(",\n")}\n}: ${part.name}Props = $props();`,
        1
      )
    );
    if (body.length > 0) {
      lines.push(``);
      for (const stmt of body) lines.push(indent(stmt, 1));
    }
    lines.push(`</script>`);
    lines.push(``);
    lines.push(markup);

    return {
      path: `primitives/${brick.dir}/${fileName(part.name)}.svelte`,
      contents: lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
    };
  }

  private printAttrs(
    node: ElementNode,
    ctx: TsPrintCtx,
    part: PartDef,
    state: { usesCn: boolean },
    opts: { inLoop: boolean }
  ): string[] {
    const out: string[] = [];
    for (const attr of node.attrs) {
      out.push(this.printAttr(attr, ctx, part, state, opts));
    }
    return out.filter(Boolean);
  }

  private printAttr(
    attr: AttrSpec,
    ctx: TsPrintCtx,
    part: PartDef,
    state: { usesCn: boolean },
    opts: { inLoop: boolean }
  ): string {
    switch (attr.kind) {
      case "static":
        return `${attr.name}=${JSON.stringify(attr.value)}`;
      case "expr": {
        if (isPassthroughForward(attr, part)) return "";
        const value = printTsExpr(attr.expr, ctx);
        const t = exprType(attr.expr, ctx.env);
        if (NARROW_ATTRS.has(attr.name)) {
          const inner = attr.when ? `${printTsExpr(attr.when, ctx)} ? ${value} : undefined` : t === "string" && !neverEmptyString(attr.expr, ctx.env) ? (ctx.helpers.add("orUndef"), `orUndef(${value})`) : value;
          return `{...({ ${JSON.stringify(attr.name)}: ${inner} } as Record<string, unknown>)}`;
        }
        if (attr.when) {
          return `${attr.name}={${printTsExpr(attr.when, ctx)} ? ${value} : undefined}`;
        }
        if (attr.keepEmpty && t === "string") {
          return `${attr.name}={(${value}) ?? ""}`;
        }
        if (t !== "string" || neverEmptyString(attr.expr, ctx.env)) {
          return `${attr.name}={${value}}`;
        }
        ctx.helpers.add("orUndef");
        return `${attr.name}={orUndef(${value})}`;
      }
      case "bool":
        return `${attr.name}={${printTsExpr(attr.expr, ctx)} || undefined}`;
      case "class": {
        // With spread attributes Svelte SSR prints `class=""` even for
        // undefined; a conditional spread omits the attr entirely.
        if (!attr.spec) return `{...(cls ? { class: cls } : {})}`;
        state.usesCn = true;
        const inline = printInlineClassSpec(attr.spec, ctx, () =>
          part.props.some((p) => p.name === "Class") && !opts.inLoop ? "className" : undefined
        );
        // cn("static ...", ...) is never empty: a plain attribute
        if (/^cn\("[^"]+"/.test(inline)) return formatAttr(`class={${inline}}`);
        return `{...((${inline}) ? { class: ${inline} } : {})}`;
      }
      case "rest":
        return `{...rest}`;
    }
  }

  private printNode(
    node: Node,
    ctx: TsPrintCtx,
    part: PartDef,
    state: { usesResolveTag: boolean; usesTitleTag: boolean; usesCn: boolean },
    opts: { isRoot?: boolean; inLoop?: boolean } = {}
  ): string {
    switch (node.kind) {
      case "element": {
        const dynamic = node.tag.kind !== "static";
        if (dynamic && !opts.isRoot) {
          throw new Error(`${part.name}: dynamic tags only supported at part root`);
        }
        const tagCode = dynamic ? "svelte:element" : node.tag.kind === "static" ? node.tag.tag : "";
        const attrs = this.printAttrs(node, ctx, part, state, { inLoop: opts.inLoop === true });
        const head = [...(dynamic ? [`this={resolvedTagValue}`] : []), ...attrs];
        if (node.void || node.children.length === 0) {
          return node.void ? tagHead(tagCode, head, "/>") : `${tagHead(tagCode, head, ">")}</${tagCode}>`;
        }
        const open = tagHead(tagCode, head, ">");
        const rendered = node.children.map((c) =>
          this.printNode(c, ctx, part, state, { inLoop: opts.inLoop })
        );
        // Mixed inline content (text + slot) must not gain whitespace text
        // nodes — join on one line to keep the DOM contract byte-equal.
        if (node.children.some((c) => c.kind === "text")) {
          return `${open}${rendered.join("")}</${tagCode}>`;
        }
        return `${open}\n${indent(rendered.join("\n"), 1)}\n</${tagCode}>`;
      }
      case "slot":
        return `{@render children?.()}`;
      case "text":
        return `{${printTsExpr(node.expr, ctx)}}`;
      case "when": {
        const test = printTsExpr(node.test, ctx);
        const thenCode = node.then
          .map((c) => this.printNode(c, ctx, part, state, opts))
          .join("\n");
        if (!node.else || node.else.length === 0) {
          return `{#if ${test}}\n${indent(thenCode, 1)}\n{/if}`;
        }
        // Collapse else-if chains for readability.
        if (node.else.length === 1 && node.else[0]!.kind === "when") {
          const elseWhen = this.printNode(node.else[0]!, ctx, part, state, opts);
          const chained = elseWhen.replace(/^\{#if /, "{:else if ").replace(/\n\{\/if\}$/, "\n{/if}");
          return `{#if ${test}}\n${indent(thenCode, 1)}\n${chained}`;
        }
        const elseCode = node.else
          .map((c) => this.printNode(c, ctx, part, state, opts))
          .join("\n");
        return `{#if ${test}}\n${indent(thenCode, 1)}\n{:else}\n${indent(elseCode, 1)}\n{/if}`;
      }
      case "forEach": {
        const itemsCode = ctx.propCode(node.itemsProp);
        const body = node.body
          .map((c) => this.printNode(c, ctx, part, state, { inLoop: true }))
          .join("\n");
        return `{#each ${itemsCode} ?? [] as item}\n${indent(body, 1)}\n{/each}`;
      }
    }
  }
}
