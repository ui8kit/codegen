/**
 * Go templ emitter — one `ui/<brick>/<stem>.templ` per brick (props structs,
 * exported `<Part>Classes` helpers, templ components) plus `<stem>_gen.go`
 * embedding the shared `*.variants.json` recipes. Output lives under
 * `generated/templ/` as its own Go module (see `templSupportFiles`).
 *
 * Design (ported from the 7-runtime line, commit 972b492, and the xgen
 * archive): attributes are omitted exactly where the canonical renderer
 * omits them (`if … { attr={ … } }`), dynamic tags become a `switch` with one
 * static element per allowed tag, children are `{ children... }` (repeated in
 * every branch), items props loop with `for _, item := range`. There is no
 * asChild/Slot in templ: `<Part>Classes(p)` is the escape hatch.
 */

import type { Expr } from "../domain/expr";
import {
  fileStem,
  type AttrSpec,
  type BrickDef,
  type ClassSpec,
  type ElementNode,
  type Node,
  type PartDef,
} from "../domain/model";
import { allowedTags, TAG_GROUPS } from "../domain/tags";
import {
  BANNER,
  exprType,
  foldResolvedTag,
  indent,
  lowerFirst,
  makeEnv,
  pascalCase,
  type Emitter,
  type GeneratedFile,
  type TypeEnv,
} from "./common";
import { printGoExpr, stringGo, truthyGo, type GoPrintCtx } from "./go-expr";
import { neverEmptyString } from "./ts-common";

export const TEMPL_MODULE = "github.com/ui8kit/codegen/generated/templ";
export const TEMPL_VERSION = "v0.3.1070";
export const TEMPL_GO_VERSION = "1.26.0";

const GO_KEYWORDS: Record<string, string> = { select: "selectfield", switch: "formswitch", range: "rangefield" };

/** Go package of a brick: its folder without dashes, Go keywords renamed (select → selectfield). */
export function goPackageOf(brick: BrickDef): string {
  const name = brick.dir.replace(/-/g, "");
  return GO_KEYWORDS[name] ?? name;
}

const TAB = "\t";
const ind = (s: string) => indent(s, 1, TAB);

export class TemplEmitter implements Emitter {
  readonly runtime = "templ" as const;

  emit(brick: BrickDef): GeneratedFile[] {
    const stem = fileStem(brick);
    const pkg = goPackageOf(brick);
    const body: string[] = [];

    for (const record of brick.recordTypes ?? []) {
      const fields = record.fields.map((f) => {
        const doc = f.docs ? `\t// ${f.docs}\n` : "";
        return `${doc}\t${f.name} ${f.type === "string" ? "string" : "bool"}`;
      });
      body.push(`// ${record.name} is one ${record.name} entry.\ntype ${record.name} struct {\n${fields.join("\n")}\n}`);
    }

    for (const part of brick.parts) {
      for (const p of part.props) {
        if (p.default !== undefined) {
          throw new Error(`templ: ${part.name}.${p.name} has a default; Go zero values cannot express it`);
        }
      }
      const env = makeEnv(brick, part);
      const ctx = goCtx(part, env);
      body.push(emitPropsStruct(part));
      if (part.classes) body.push(emitClassesFunc(part, ctx));
      for (const [name, expr] of Object.entries(part.derived ?? {})) {
        const t = exprType(expr, env);
        const goT = t === "string" ? "string" : t === "bool" ? "bool" : "int";
        body.push(
          `func ${derivedFn(part, name)}(p ${part.name}Props) ${goT} {\n\treturn ${printGoExpr(expr, ctx)}\n}`
        );
      }
      const render = printNode(part.render, part, ctx, undefined);
      body.push(
        `// ${part.name} renders the ${part.name} contract.\n` +
          `templ ${part.name}(p ${part.name}Props) {\n${ind(render)}\n}`
      );
    }

    const code = body.join("\n\n");
    const imports: string[] = [];
    if (/\bstrconv\./.test(code)) imports.push(`\t"strconv"`);
    if (/\bstrings\./.test(code)) imports.push(`\t"strings"`);
    const local = /\buiutils\./.test(code) ? [`\tuiutils "${TEMPL_MODULE}/utils"`] : [];
    const importBlock =
      imports.length + local.length === 0
        ? ""
        : `import (\n${[...imports, ...(imports.length && local.length ? [""] : []), ...local].join("\n")}\n)\n\n`;

    const header =
      `// ${BANNER}\n\n/*\n${brick.docs}\n*/\n\npackage ${pkg}\n\n` + importBlock;
    const files: GeneratedFile[] = [
      { path: `templ/ui/${brick.dir}/${stem}.templ`, contents: header + code + "\n" },
    ];
    if (Object.keys(brick.recipeFiles).length > 0) {
      files.push(emitGenFile(brick, pkg, stem));
      for (const [id, file] of Object.entries(brick.recipeFiles)) {
        // go:embed reads only files of its own package folder.
        files.push({
          path: `templ/ui/${brick.dir}/${file}`,
          contents: JSON.stringify(brick.recipes[id], null, 2) + "\n",
        });
      }
    }
    return files;
  }
}

// ---------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------

function goType(part: PartDef, name: string): string {
  const p = part.props.find((x) => x.name === name)!;
  switch (p.type) {
    case "string":
      return "string";
    case "bool":
      return "bool";
    case "int":
      return "int";
    case "items":
      return `[]${p.itemsOf}`;
    case "attrs":
      return "templ.Attributes";
    default:
      throw new Error(`${part.name}.${name}: no Go type`);
  }
}

function emitPropsStruct(part: PartDef): string {
  const fields: string[] = [];
  for (const p of part.props) {
    if (p.type === "children") continue;
    const doc = p.docs ? `\t// ${p.name} — ${p.docs}\n` : "";
    fields.push(`${doc}\t${p.name} ${goType(part, p.name)}`);
  }
  return `// ${part.name}Props configures ${part.name}.\ntype ${part.name}Props struct {\n${fields.join("\n")}\n}`;
}

function derivedFn(part: PartDef, name: string): string {
  return `${lowerFirst(part.name)}${pascalCase(name)}`;
}

function goCtx(part: PartDef, env: TypeEnv): GoPrintCtx {
  return {
    env,
    propCode: (name) => `p.${name}`,
    itemCode: (field) => `item.${field}`,
    derivedCode: (name) => `${derivedFn(part, name)}(p)`,
  };
}

/** Class merge in the fixed contract order (recipe → static → extra → state → Class). */
function classCall(part: PartDef, spec: ClassSpec, ctx: GoPrintCtx): string {
  const tail: string[] = [];
  if (spec.staticBase) tail.push(JSON.stringify(spec.staticBase));
  for (const e of spec.extra ?? []) tail.push(stringGo(e, ctx));
  for (const st of spec.state ?? []) {
    tail.push(`uiutils.If(${truthyGo(st.test, ctx)}, ${JSON.stringify(st.classes)}, "")`);
  }
  if (spec.includeClassProp !== false && part.props.some((p) => p.name === "Class")) tail.push("p.Class");

  if (spec.recipe) {
    const recipeId = spec.recipeId ?? part.recipeId!;
    const recipeVar = pascalCase(recipeId) + "Variants";
    const sel = Object.entries(spec.recipe)
      .map(([key, source]) => {
        const value = typeof source === "string" ? `p.${source}` : stringGo(source, ctx);
        return `\t\t${JSON.stringify(key)}: ${value},`;
      })
      .join("\n");
    const selection = sel ? `map[string]string{\n${sel}\n\t}` : `map[string]string{}`;
    return `uiutils.Compose(${recipeVar}, ${selection}${tail.length ? ", " + tail.join(", ") : ""})`;
  }
  return `uiutils.Cn(${tail.join(", ")})`;
}

function emitClassesFunc(part: PartDef, ctx: GoPrintCtx): string {
  return (
    `// ${part.name}Classes composes ${part.name} classes without rendering —\n` +
    `// the server-composition escape hatch for custom root elements (no asChild in templ).\n` +
    `func ${part.name}Classes(p ${part.name}Props) string {\n\treturn ${classCall(part, part.classes!, ctx)}\n}`
  );
}

function emitGenFile(brick: BrickDef, pkg: string, stem: string): GeneratedFile {
  const lines = [`// ${BANNER}`, ``, `package ${pkg}`, ``, `import (`, `\t_ "embed"`, ``, `\tuiutils "${TEMPL_MODULE}/utils"`, `)`];
  for (const [id, file] of Object.entries(brick.recipeFiles)) {
    const varName = pascalCase(id) + "Variants";
    const jsonVar = lowerFirst(pascalCase(id)) + "VariantsJSON";
    lines.push(``, `//go:embed ${file}`, `var ${jsonVar} []byte`, ``);
    lines.push(`// ${varName} is the variant recipe shared verbatim by all runtimes.`);
    lines.push(`var ${varName} = uiutils.MustParseVariantRecipe(${jsonVar}).ToVariants()`);
  }
  return { path: `templ/ui/${brick.dir}/${stem}_gen.go`, contents: lines.join("\n") + "\n" };
}

// ---------------------------------------------------------------------------
// templ markup
// ---------------------------------------------------------------------------

const fold = (expr: Expr, tag: string | undefined): Expr => (tag === undefined ? expr : foldResolvedTag(expr, tag));

function printNodes(nodes: Node[], part: PartDef, ctx: GoPrintCtx, tag: string | undefined): string {
  return nodes.map((c) => printNode(c, part, ctx, tag)).join("\n");
}

function printNode(node: Node, part: PartDef, ctx: GoPrintCtx, tag: string | undefined): string {
  switch (node.kind) {
    case "element":
      return printElement(node, part, ctx);
    case "slot":
      return `{ children... }`;
    case "text":
      return `{ ${stringGo(fold(node.expr, tag), ctx)} }`;
    case "when": {
      const test = truthyGo(fold(node.test, tag), ctx);
      const thenCode = printNodes(node.then, part, ctx, tag);
      if (!node.else || node.else.length === 0) return `if ${test} {\n${ind(thenCode)}\n}`;
      if (node.else.length === 1 && node.else[0]!.kind === "when") {
        return `if ${test} {\n${ind(thenCode)}\n} else ${printNode(node.else[0]!, part, ctx, tag)}`;
      }
      return `if ${test} {\n${ind(thenCode)}\n} else {\n${ind(printNodes(node.else, part, ctx, tag))}\n}`;
    }
    case "forEach":
      return `for _, item := range p.${node.itemsProp} {\n${ind(printNodes(node.body, part, ctx, tag))}\n}`;
  }
}

function printElement(node: ElementNode, part: PartDef, ctx: GoPrintCtx): string {
  const tag = node.tag;
  if (tag.kind === "static") return printStaticElement(node, tag.tag, part, ctx);

  // templ has no dynamic tag names: one static element per allowed tag.
  let switchExpr: string;
  let cases: string[];
  let fallback: string;
  if (tag.kind === "resolved") {
    switchExpr = `uiutils.ResolveTag(p.${tag.fromProp}, ${JSON.stringify(tag.fallback)}, uiutils.TagGroup${tag.group})`;
    cases = allowedTags(tag.group).filter((t) => t !== tag.fallback);
    fallback = tag.fallback;
  } else {
    switchExpr = printGoExpr(tag.expr, ctx);
    cases = tag.tags.slice(0, -1);
    fallback = tag.tags[tag.tags.length - 1]!;
  }
  const blocks = cases.map((t) => `case ${JSON.stringify(t)}:\n${ind(printStaticElement(node, t, part, ctx))}`);
  blocks.push(`default:\n${ind(printStaticElement(node, fallback, part, ctx))}`);
  return `switch ${switchExpr} {\n${blocks.join("\n")}\n}`;
}

function printStaticElement(node: ElementNode, tag: string, part: PartDef, ctx: GoPrintCtx): string {
  const attrs = node.attrs.map((a) => printAttr(a, tag, part, ctx)).filter(Boolean);
  const isVoid = node.void === true;
  const open = attrs.length === 0 ? `<${tag}` : `<${tag}\n${ind(attrs.join("\n"))}\n`;
  if (isVoid) return `${open}/>`;
  if (node.children.length === 0) return `${open}></${tag}>`;
  return `${open}>\n${ind(printNodes(node.children, part, ctx, tag))}\n</${tag}>`;
}

function printAttr(attr: AttrSpec, tag: string, part: PartDef, ctx: GoPrintCtx): string {
  switch (attr.kind) {
    case "static":
      return `${attr.name}=${JSON.stringify(attr.value)}`;
    case "expr": {
      const expr = fold(attr.expr, tag);
      const value = stringGo(expr, ctx);
      if (attr.when) {
        const when = fold(attr.when, tag);
        if (when.kind === "lit") return when.value ? `${attr.name}={ ${value} }` : "";
        return `if ${truthyGo(when, ctx)} {\n\t${attr.name}={ ${value} }\n}`;
      }
      if (attr.keepEmpty || exprType(expr, ctx.env) !== "string" || neverEmptyString(expr, ctx.env)) {
        return `${attr.name}={ ${value} }`;
      }
      return `if uiutils.IsSetStr(${value}) {\n\t${attr.name}={ ${value} }\n}`;
    }
    case "bool": {
      const expr = fold(attr.expr, tag);
      if (expr.kind === "lit") return expr.value ? attr.name : "";
      return `${attr.name}?={ ${truthyGo(expr, ctx)} }`;
    }
    case "liveValue":
      return ""; // DOM property only; initial state is carried by `parentValue` attrs
    case "class": {
      const call = attr.spec ? classCall(part, attr.spec, ctx) : `${part.name}Classes(p)`;
      return `if ${call} != "" {\n\tclass={ ${call} }\n}`;
    }
    case "rest":
      return `{ p.Attrs... }`;
  }
}

// ---------------------------------------------------------------------------
// Module support files
// ---------------------------------------------------------------------------

/** Go tag groups generated from the TS SSOT (`src/domain/tags.ts`). */
export function emitGoTags(): GeneratedFile {
  const groups = Object.keys(TAG_GROUPS) as (keyof typeof TAG_GROUPS)[];
  const consts = groups.map((g, i) => (i === 0 ? `\tTagGroup${g} TagGroup = iota` : `\tTagGroup${g}`)).join("\n");
  const cases = groups
    .map((g) => `\tcase TagGroup${g}:\n\t\treturn oneOf(t, ${TAG_GROUPS[g].map((t) => JSON.stringify(t)).join(", ")})`)
    .join("\n");
  const contents = `// ${BANNER}
// Source of truth: src/domain/tags.ts.

package uiutils

import "strings"

// TagGroup restricts which HTML tags a polymorphic primitive may render.
type TagGroup int

const (
${consts}
)

// ResolveTag returns tag when allowed for group, otherwise fallback.
func ResolveTag(tag, fallback string, group TagGroup) string {
	t := strings.TrimSpace(strings.ToLower(tag))
	if t == "" || !IsAllowedTag(t, group) {
		return fallback
	}
	return t
}

// IsAllowedTag reports whether tag is valid for the group.
func IsAllowedTag(tag string, group TagGroup) bool {
	t := strings.TrimSpace(strings.ToLower(tag))
	switch group {
${cases}
	}
	return false
}

func oneOf(value string, options ...string) bool {
	for _, o := range options {
		if value == o {
			return true
		}
	}
	return false
}
`;
  return { path: "templ/utils/tags.go", contents };
}

/** `cmd/parity`: JSON-in/JSON-out harness rendering any generated part from canonical props. */
export function emitGoParityHarness(bricks: BrickDef[]): GeneratedFile {
  const importLines = bricks
    .map((b) => {
      const alias = goPackageOf(b);
      const path = `${TEMPL_MODULE}/ui/${b.dir}`;
      return alias === b.dir ? `\t"${path}"` : `\t${alias} "${path}"`;
    })
    .sort();
  const cases: string[] = [];
  for (const brick of bricks) {
    const alias = goPackageOf(brick);
    for (const part of brick.parts) {
      const key = `${brick.dir}/${part.name}`;
      const hasChildren = part.props.some((p) => p.type === "children");
      const call = hasChildren
        ? `${alias}.${part.name}(p).Render(templ.WithChildren(ctx, children), buf)`
        : `${alias}.${part.name}(p).Render(ctx, buf)`;
      cases.push(
        `\tcase ${JSON.stringify(key)}:\n\t\tvar p ${alias}.${part.name}Props\n` +
          `\t\tif err := json.Unmarshal(propsJSON, &p); err != nil {\n\t\t\treturn err\n\t\t}\n\t\treturn ${call}`
      );
    }
  }
  const contents = `// ${BANNER}

// Command parity renders any generated part from canonical JSON props.
// stdin:  [{"name":"button/Button","props":{...},"children":"<b>x</b>"}]
// stdout: ["<button ...>...</button>", ...]
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/a-h/templ"

${importLines.join("\n")}
)

type renderRequest struct {
	Name     string          \`json:"name"\`
	Props    json.RawMessage \`json:"props"\`
	Children string          \`json:"children"\`
}

func renderCase(ctx context.Context, name string, propsJSON []byte, children templ.Component, buf *strings.Builder) error {
	switch name {
${cases.join("\n")}
	}
	return fmt.Errorf("unknown case %q", name)
}

func main() {
	var requests []renderRequest
	if err := json.NewDecoder(bufio.NewReader(os.Stdin)).Decode(&requests); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	results := make([]string, 0, len(requests))
	for _, req := range requests {
		var buf strings.Builder
		// Test-only: children are trusted pre-rendered HTML.
		children := templ.Raw(req.Children)
		if err := renderCase(context.Background(), req.Name, req.Props, children, &buf); err != nil {
			fmt.Fprintf(os.Stderr, "%s: %v\\n", req.Name, err)
			os.Exit(1)
		}
		results = append(results, buf.String())
	}
	if err := json.NewEncoder(os.Stdout).Encode(results); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
`;
  return { path: "templ/cmd/parity/main.go", contents };
}

export function emitGoMod(): GeneratedFile {
  return {
    path: "templ/go.mod",
    contents: `// ${BANNER}\nmodule ${TEMPL_MODULE}\n\ngo ${TEMPL_GO_VERSION}\n\nrequire github.com/a-h/templ ${TEMPL_VERSION}\n`,
  };
}
