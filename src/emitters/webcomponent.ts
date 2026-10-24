/**
 * Web Components emitter — vanilla, framework-free. One `<stem>.wc.ts` per
 * brick with, per part:
 *
 * - `render<Part>(props, children)` → a real DOM element built with
 *   `document.createElement` (light DOM, no shadow root), and
 * - `define<Part>(tagName = "ui8-<part>")` → a custom element that replaces
 *   itself with the rendered primitive, moving its children into the slot.
 *
 * Props use HTML-native names (`class`, `for`, `aria-label`) like Svelte/Vue;
 * undeclared keys are rest attributes (on* functions become listeners).
 */

import { fileStem, type AttrSpec, type BrickDef, type Node, type PartDef } from "../domain/model";
import { htmlPropName, localIdent } from "../domain/naming";
import { BANNER, makeEnv, type Emitter, type GeneratedFile, type TypeEnv } from "./common";
import { printTsExpr, type TsPrintCtx } from "./ts-expr";
import {
  basePropsTypeName,
  classesHelperName,
  classSpecProps,
  declaredProps,
  isPassthroughForward,
  printInlineClassSpec,
  quoteIfNeeded,
  variantTypeName,
  restRuleArg,
} from "./ts-common";

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export class WebComponentEmitter implements Emitter {
  readonly runtime = "webcomponent" as const;

  constructor(private readonly utilsPath = "../../utils") {}

  emit(brick: BrickDef): GeneratedFile[] {
    const helpers = new Set<string>();
    const shared = new Set<string>();
    const state = { resolveTag: false, cn: false };
    const bodies = brick.parts.map((part) => this.emitPart(brick, part, helpers, shared, state));
    const lines = [`// ${BANNER}`, `// ${brick.id} — vanilla light-DOM custom elements`, ``];
    lines.push(
      `import { append, applyRest, defineLight, setAttr, str, type Children, type PropMeta } from "${this.utilsPath}/wc";`
    );
    if (shared.size) lines.push(`import { ${[...shared].sort().join(", ")} } from "./${fileStem(brick)}.shared";`);
    if (helpers.size) lines.push(`import { ${[...helpers].sort().join(", ")} } from "${this.utilsPath}/expr";`);
    if (state.resolveTag) lines.push(`import { resolveTag, TagGroup } from "${this.utilsPath}/tags";`);
    if (state.cn) lines.push(`import { cn } from "${this.utilsPath}/cn";`);
    return [
      {
        path: `ui/${brick.dir}/${fileStem(brick)}.wc.ts`,
        contents: [...lines, ``, ...bodies].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
      },
    ];
  }

  private emitPart(
    brick: BrickDef,
    part: PartDef,
    helpers: Set<string>,
    shared: Set<string>,
    state: { resolveTag: boolean; cn: boolean }
  ): string {
    const env: TypeEnv = makeEnv(brick, part);
    const decls = declaredProps(brick, part);
    const hasClass = part.props.some((p) => p.name === "Class");
    const hasChildren = part.props.some((p) => p.type === "children");
    shared.add(`type ${basePropsTypeName(part)}`);
    for (const d of decls) {
      if (d.def.type === "items") shared.add(`type ${d.def.itemsOf}`);
      if (d.def.cva) shared.add(`type ${variantTypeName(part, d.def.cvaKey ?? d.def.name.toLowerCase())}`);
    }

    const ctx: TsPrintCtx = {
      env,
      propCode: (name) => {
        if (name === "Class") return "className";
        const d = decls.find((x) => x.def.name === name);
        if (!d) throw new Error(`${brick.id}/${part.name}: prop ${name} not declared`);
        return d.local;
      },
      itemCode: (field) => `item.${localIdent(field)}`,
      derivedCode: (name) => `${name}Value`,
      resolvedTagCode: () => "resolvedTagValue",
      helpers,
    };

    const name = part.name;
    const out: string[] = [];
    // Props type: base (camelCase locals) re-keyed to HTML-native names.
    const fields = decls.map((d) => `  ${quoteIfNeeded(d.htmlName)}${d.def.required ? "" : "?"}: ${d.tsType};`);
    for (const pp of part.props.filter((x) => x.passthrough)) {
      fields.push(`  ${quoteIfNeeded(htmlPropName(pp))}?: string | number;`);
    }
    if (hasClass) fields.push(`  class?: string;`);
    fields.push(`  [attr: string]: unknown;`);
    out.push(`/** ${part.docs.split("\n")[0]} */`);
    out.push(`export type ${name}ElementProps = {\n${fields.join("\n")}\n};`);
    out.push(`export type { ${basePropsTypeName(part)} as ${name}ContractProps };`);
    out.push(``);

    const destructure = decls.map((d) =>
      d.htmlName === d.local ? d.local : `${JSON.stringify(d.htmlName)}: ${d.local}`
    );
    if (hasClass) destructure.push(`class: className`);
    destructure.push(`...rest`);

    const body: string[] = [];
    body.push(`const { ${destructure.join(", ")} } = props;`);
    if (part.classes) {
      shared.add(classesHelperName(part));
      const inputs = classSpecProps(part.classes).map((n) => {
        const local = ctx.propCode(n);
        return `${local}: ${local} as never`;
      });
      if (hasClass) inputs.push(`className`);
      body.push(`const cls = ${classesHelperName(part)}({ ${inputs.join(", ")} });`);
    }
    for (const [dn, expr] of Object.entries(part.derived ?? {})) {
      body.push(`const ${dn}Value = ${printTsExpr(expr, ctx)};`);
    }
    const root = part.render;
    if (root.kind === "element" && root.tag.kind === "resolved") {
      state.resolveTag = true;
      body.push(
        `const resolvedTagValue = resolveTag(${ctx.propCode(root.tag.fromProp)}, ${JSON.stringify(root.tag.fallback)}, TagGroup.${root.tag.group});`
      );
    } else if (root.kind === "element" && root.tag.kind === "mapped") {
      body.push(`const resolvedTagValue = ${printTsExpr(root.tag.expr, ctx)};`);
    }
    body.push(`const out: Element[] = [];`);
    let counter = 0;
    const emitNode = (node: Node, parent: string | null, lines: string[], isRoot: boolean): void => {
      const add = (code: string) => lines.push(parent ? `append(${parent}, ${code});` : `out.push(${code});`);
      switch (node.kind) {
        case "slot":
          if (parent) lines.push(`append(${parent}, children);`);
          return;
        case "text":
          add(`str(${printTsExpr(node.expr, ctx)})`);
          return;
        case "when": {
          const t: string[] = [];
          const e: string[] = [];
          for (const c of node.then) emitNode(c, parent, t, isRoot);
          for (const c of node.else ?? []) emitNode(c, parent, e, isRoot);
          lines.push(`if (${printTsExpr(node.test, ctx)}) {`, ...t.map((l) => "  " + l));
          if (e.length) lines.push(`} else {`, ...e.map((l) => "  " + l));
          lines.push(`}`);
          return;
        }
        case "forEach": {
          const prop = decls.find((d) => d.def.name === node.itemsProp)!;
          const inner: string[] = [];
          for (const c of node.body) emitNode(c, parent, inner, false);
          lines.push(`for (const item of ${prop.local} ?? []) {`, ...inner.map((l) => "  " + l), `}`);
          return;
        }
        case "element": {
          const v = `el${counter++}`;
          const tagCode =
            node.tag.kind === "static" ? JSON.stringify(node.tag.tag) : "resolvedTagValue";
          lines.push(`const ${v} = document.createElement(${tagCode});`);
          for (const a of node.attrs) this.emitAttr(a, v, part, ctx, lines, isRoot, state);
          for (const c of node.children) emitNode(c, v, lines, false);
          for (const a of node.attrs) {
            if (a.kind !== "liveValue") continue;
            // After the options exist; the DOM property, not an attribute.
            helpers.add("syncValue");
            lines.push(`syncValue(${v} as HTMLSelectElement, ${printTsExpr(a.expr, ctx)});`);
          }
          add(v);
          return;
        }
      }
    };
    emitNode(root, null, body, true);
    body.push(`return out[0]!;`);

    const fn = `render${name}`;
    out.push(
      `export function ${fn}(props: ${name}ElementProps${decls.some((d) => d.def.required) ? "" : " = {}"}, children: Children = []): Element {\n` +
        body.map((l) => "  " + l).join("\n") +
        (hasChildren ? "" : "\n  void children;") +
        `\n}`
    );
    out.push(``);
    const meta = decls
      .map((d) => `${JSON.stringify(d.htmlName)}: ${JSON.stringify(d.def.type === "items" ? "items" : d.def.type)}`)
      .join(", ");
    out.push(`export const ${lowerFirstLocal(name)}Meta: PropMeta = { ${meta} };`);
    out.push(``);
    out.push(`/** Register \`<${"ui8-" + kebab(name)}>\` (light DOM; replaces itself with the primitive). */`);
    out.push(
      `export function define${name}(tagName = ${JSON.stringify("ui8-" + kebab(name))}): void {\n` +
        `  defineLight(tagName, (p, c) => ${fn}(p as ${name}ElementProps, c), ${lowerFirstLocal(name)}Meta);\n}`
    );
    out.push(``);
    return out.join("\n");
  }

  private emitAttr(
    a: AttrSpec,
    v: string,
    part: PartDef,
    ctx: TsPrintCtx,
    lines: string[],
    isRoot: boolean,
    state: { resolveTag: boolean; cn: boolean }
  ): void {
    const p = (e: Parameters<typeof printTsExpr>[0]) => printTsExpr(e, ctx);
    switch (a.kind) {
      case "static":
        lines.push(`setAttr(${v}, ${JSON.stringify(a.name)}, ${JSON.stringify(a.value)});`);
        return;
      case "expr": {
        if (isPassthroughForward(a, part)) return; // delivered by rest
        const val = `str(${p(a.expr)})`;
        if (a.when) {
          lines.push(`if (${p(a.when)}) setAttr(${v}, ${JSON.stringify(a.name)}, ${val});`);
        } else if (a.keepEmpty) {
          lines.push(`setAttr(${v}, ${JSON.stringify(a.name)}, ${val});`);
        } else {
          lines.push(`{ const s = ${val}; if (s.trim() !== "") setAttr(${v}, ${JSON.stringify(a.name)}, s); }`);
        }
        return;
      }
      case "bool":
        lines.push(`if (${p(a.expr)}) setAttr(${v}, ${JSON.stringify(a.name)}, "");`);
        return;
      case "class": {
        if (!a.spec) {
          lines.push(`if (cls !== "") setAttr(${v}, "class", cls);`);
          return;
        }
        state.cn = true;
        const code = printInlineClassSpec(a.spec, ctx, () =>
          part.props.some((x) => x.name === "Class") ? "className" : undefined
        );
        lines.push(`{ const c = ${code}; if (c !== "") setAttr(${v}, "class", c); }`);
        return;
      }
      case "rest":
        if (isRoot) lines.push(`applyRest(${v}, rest${restRuleArg(part)});`);
        return;
    }
  }
}

function lowerFirstLocal(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
