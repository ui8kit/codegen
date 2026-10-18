// Turns a view tree (organism or screen) into markup. The walk is shared; what differs between Svelte, React, Vue and Solid is a `Syntax`:
// blocks (`{#if}`, a ternary, `v-if`), loops, render-prop slots, event and prop names. Everything else is the same text.
import type { Handler, OrganismSpec, PropType, Value, ViewNode } from "@ui8kit/xgen-screens";
import { handlerUsesEvent, printCall, printValue, typesPath, type PrintCtx } from "@ui8kit/xgen-screens";
import type { BrickDef, PartDef } from "@ui8kit/xgen-spec";
import { printClassString } from "./variant-table";

export interface PartRef { brick: BrickDef; part: PartDef }

export interface Syntax {
  runtime: "svelte" | "react" | "vue" | "solid";
  /** name of a prop of a part in this runtime, from its canonical name */
  propName(part: PartRef, canonical: string): string;
  eventProp(event: string): string;
  /** name of a free DOM attribute in this runtime (tabindex -> tabIndex in React) */
  attrName(name: string): string;
  /** callback prop of an organism / emit call: onselect | onSelect */
  callbackName(event: string): string;
  eventType: string;
  /** the name of the class prop of an organism: class | className */
  classProp: string;
  /** a block `if` / `else if` chain; `branches` are [condition, lines]; `rest` is the final else (may be empty) */
  ifChain(branches: Array<[string, string[]]>, rest: string[]): string[];
  each(items: string, as: string, key: string, body: string[], index?: string): string[];
  /** a slot the component receives; `fn` is true for a render prop with arguments, false for plain content (Snippet / ReactNode) */
  slot(name: string, args: string[], fn: boolean, argNames?: string[]): string[];
  /** organism children / props for render-prop slots; `fn` as in `slot`; `argNames` are the declared names of the arguments, `locals` the names the fill reads */
  slotProp(name: string, params: string, body: string[], fn: boolean, argNames?: string[], locals?: string[]): { attr?: string[]; child?: string[] };
  /** a slot of the organism passed on to an organism it renders (default: the same prop, `name={from}`) */
  forward?(name: string, from: string): { attr?: string[]; child?: string[] };
  /** an attribute in the text of this runtime, from the brace form (`name={expr}`, `name="text"`, `{...rest}`); default: unchanged */
  attr?(text: string): string;
  /** a text node from its expression; default `{expr}` */
  text?(expr: string): string;
  /** wrap several top-level nodes */
  fragment(lines: string[]): string[];
}

export interface WalkEnv {
  syntax: Syntax;
  parts: Record<string, PartRef>;
  organisms: Record<string, OrganismSpec>;
  print: PrintCtx;
  /** parts and organisms used (for the imports) */
  usedParts: Set<string>;
  usedOrganisms: Set<string>;
  usesEach: { value: boolean };
  /** arguments each slot of the organism being emitted takes (`children` is 0) */
  slotArity?: Record<string, number>;
  /** the declared names of the arguments of each slot (Vue scoped slots pass them by name) */
  slotArgs?: Record<string, string[]>;
  /** lines for the screen outlet */
  outlet?: () => string[];
  /** lines for a part of the screen layout (its component tag) */
  part?: (name: string) => string[];
}

const pad = (lines: string[], n = 1): string[] => lines.map((l) => (l ? "  ".repeat(n) + l : l));
export const typeName = (t: PropType): string => (typeof t === "string" ? t : "record" in t ? t.record : t.ts);

const safeAttr = /^[^"{}<>&\\\n]*$/;
function attrText(name: string, v: Value, env: WalkEnv): string {
  if (typeof v === "string") return safeAttr.test(v) ? `${name}="${v}"` : `${name}={${JSON.stringify(v)}}`;
  return `${name}={${printValue(v, env.print)}}`;
}

/** the TypeScript text of a prop type */
const typeText = (t: PropType): string => (typeof t === "string" ? t : "ts" in t ? t.ts : t.record);

/** the parameter list of a handler on an organism event: `arg` is the first argument the event carries (typed by the event), `event` the DOM event of a native element */
function paramsOf(ev: string, h: Handler, org: Pick<OrganismSpec, "events">, eventType: string): string {
  if (JSON.stringify(h.args ?? []).includes('"$":"arg"')) {
    const a = org.events.find((e) => e.name === ev)?.args[0];
    return `(arg: ${a ? typeText(a.type) : "unknown"})`;
  }
  return handlerUsesEvent(h) ? `(event: ${eventType})` : "()";
}

function handlerText(ev: string, h: Handler, env: WalkEnv): string {
  const s = env.syntax;
  const call = printCall(h, env.print);
  return `${s.eventProp(ev)}={${handlerUsesEvent(h) ? `(event: ${s.eventType}) => ${call}` : `() => ${call}`}}`;
}

/** the top-level arguments of a call text: `"a, b", f(x, y), c` -> three parts (quotes and brackets respected) */
export function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) { if (c === quote && text[i - 1] !== "\\") quote = ""; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === "," && depth === 0) { out.push(text.slice(from, i).trim()); from = i + 1; }
  }
  out.push(text.slice(from).trim());
  return out.filter(Boolean);
}

/** `(test ? then : else)` split at its top-level `?` and `:`; undefined when the text is not one parenthesized conditional */
export function splitTernary(text: string): { test: string; then: string; else: string } | undefined {
  if (!text.startsWith("(") || !text.endsWith(")")) return undefined;
  const inner = text.slice(1, -1);
  let depth = 0, quote = "", q = -1;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (quote) { if (c === quote && inner[i - 1] !== "\\") quote = ""; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) { depth--; if (depth < 0) return undefined; }
    else if (depth === 0 && inner.startsWith(" ? ", i) && q < 0) q = i;
    else if (depth === 0 && inner.startsWith(" : ", i) && q >= 0) return { test: inner.slice(0, q), then: inner.slice(q + 3, i), else: inner.slice(i + 3) };
  }
  return undefined;
}

/** one pair of parentheses around the whole text dropped: `(a === b)` -> `a === b` */
const unwrap = (text: string): string => (text.startsWith("(") && text.endsWith(")") && splitArgs(text.slice(1, -1)).length === 1 && balanced(text.slice(1, -1)) ? text.slice(1, -1) : text);
const balanced = (text: string): boolean => {
  let depth = 0;
  for (const c of text.replace(/"[^"]*"/g, "")) { if (c === "(") depth++; else if (c === ")" && --depth < 0) return false; }
  return depth === 0;
};

/** a chain of conditionals as one choice per line (`a ? x` / `: b ? y` / `: z`); undefined when the text is not a conditional */
export function chainLines(text: string): string[] | undefined {
  const lines: string[] = [];
  let rest = text;
  for (let t = splitTernary(rest); t; t = splitTernary(rest)) {
    lines.push(`${lines.length ? ": " : ""}${unwrap(t.test)} ? ${t.then}`);
    rest = t.else;
  }
  return lines.length ? [...lines, `: ${rest}`] : undefined;
}

/** a `cn(...)` call as one argument per line (`cn(` / `  a,` / `)`); undefined when the text is not one cn call */
export function cnLines(text: string): string[] | undefined {
  const m = /^cn\((.*)\)$/.exec(text);
  if (!m || !balanced(m[1]!)) return undefined;
  return ["cn(", ...splitArgs(m[1]!).map((a) => `  ${a},`), ")"];
}

/** a long attribute on its own lines: class strings cut at spaces, `cn(...)` with one argument per line */
export function formatAttr(attr: string, width = 100): string {
  if (attr.length <= width || attr.includes("\n")) return attr;
  const str = /^([\w:-]+)="([^"]*)"$/.exec(attr);
  if (str) return `${str[1]}={${printClassString(str[2]!, "  ")}}`;
  // a grouped prop: one field per line
  const group = /^([\w:-]+)=\{\{ (.*) \}\}$/.exec(attr);
  if (group) return `${group[1]}={{\n${splitArgs(group[2]!).map((f) => `  ${f},`).join("\n")}\n}}`;
  // a chain of conditionals: one choice per line
  const expr = /^([\w:-]+)=\{(\(.*\))\}$/.exec(attr);
  const chain = expr ? chainLines(expr[2]!) : undefined;
  if (expr && chain) return `${expr[1]}={\n${chain.map((l) => `  ${l}`).join("\n")}\n}`;
  const call = /^([\w:-]+)=\{cn\((.*)\)\}$/.exec(attr);
  if (call) {
    const args = splitArgs(call[2]!).map((a) => {
      if (/^"[^"]*"$/.test(a)) return printClassString(JSON.parse(a) as string, "    ");
      const chain = a.length > width - 4 ? chainLines(a) : undefined;
      return chain ? `(\n${chain.map((l) => `    ${l}`).join("\n")}\n  )` : a;
    });
    return `${call[1]}={cn(\n${args.map((a) => `  ${a}`).join(",\n")}\n)}`;
  }
  return attr;
}

/** an opening tag on one line when it fits, else one attribute per line: `<a x y>` / `<a\n  x\n  y\n>`; `end` is ">" or "/>" */
export function tagHead(tag: string, attrs: string[], end: ">" | "/>", width = 100): string {
  const close = end === "/>" ? " />" : ">";
  const one = `<${[tag, ...attrs].join(" ")}${close}`;
  if (one.length <= width || !attrs.length) return one;
  return `<${tag}\n${attrs.map((a) => a.split("\n").map((l) => `  ${l}`).join("\n")).join("\n")}\n${end}`;
}

/** a list in one line when it fits, else one item per line: `let { a, b }` / `let {\n  a,\n  b\n}` */
export function wrapList(open: string, items: string[], close: string, width = 110, indent = ""): string {
  const one = `${indent}${open} ${items.join(", ")} ${close}`;
  if (one.length <= width) return one;
  return `${indent}${open}\n${items.map((x) => `${indent}  ${x},`).join("\n")}\n${indent}${close}`;
}

/** a comment cut into lines under the width (its own line breaks are kept) */
export function wrapText(text: string, width = 110): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (line && line.length + word.length + 1 > width) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
    }
    if (line || !para) lines.push(line);
  }
  return lines;
}

function openTag(tag: string, rawAttrs: string[], children: string[], fix: (attr: string) => string = (a) => a): string[] {
  const attrs = rawAttrs.map((a) => fix(formatAttr(a)));
  const head = [tag, ...attrs].join(" ");
  const multi = attrs.some((a) => a.includes("\n"));
  if (!children.length && !multi && (head.length <= 110 || attrs.length < 2)) return [`<${head} />`];
  if (multi || (head.length > 110 && attrs.length > 1)) {
    const a = pad(attrs.flatMap((x) => x.split("\n")));
    return children.length ? [`<${tag}`, ...a, ">", ...pad(children), `</${tag}>`] : [`<${tag}`, ...a, "/>"];
  }
  return [`<${head}>`, ...pad(children), `</${tag}>`];
}

export function walkNodes(nodes: ViewNode[], env: WalkEnv): string[] {
  return nodes.flatMap((n) => walkNode(n, env));
}

function walkNode(n: ViewNode, env: WalkEnv): string[] {
  const s = env.syntax;
  if ("use" in n) {
    const ref = env.parts[n.use]!;
    env.usedParts.add(n.use);
    const attrs: string[] = [];
    for (const [k, v] of Object.entries(n.props ?? {})) if (!(k === "Class" && v === "")) attrs.push(attrText(s.propName(ref, k), v, env));
    for (const [k, v] of Object.entries(n.attrs ?? {})) attrs.push(attrText(s.attrName(k), v, env));
    for (const [ev, h] of Object.entries(n.on ?? {})) attrs.push(handlerText(ev, h, env));
    return openTag(n.use, attrs, walkNodes(n.children ?? [], env), s.attr);
  }
  if ("text" in n) return [s.text ? s.text(printValue(n.text, env.print)) : `{${printValue(n.text, env.print)}}`];
  if ("when" in n) {
    // an else that is one more test continues the chain: `a ? x : b ? y : z`, `{:else if b}`
    const branches: Array<[string, string[]]> = [];
    let at: ViewNode | undefined = n;
    let rest: ViewNode[] = [];
    while (at && "when" in at) {
      branches.push([printValue(at.when, env.print), walkNodes(at.then, env)]);
      const other: ViewNode[] = at.else ?? [];
      if (other.length === 1 && "when" in other[0]!) at = other[0];
      else { rest = other; at = undefined; }
    }
    return s.ifChain(branches, walkNodes(rest, env));
  }
  if ("each" in n) {
    env.usesEach.value = true;
    return s.each(printValue(n.each, env.print), n.as, printValue(n.key, env.print), walkNodes(n.do, env), n.index);
  }
  if ("slot" in n) return s.slot(n.slot, (n.args ?? []).map((a) => printValue(a, env.print)), (env.slotArity?.[n.slot] ?? (n.args ?? []).length) > 0, env.slotArgs?.[n.slot]);
  if ("organism" in n) {
    const org = env.organisms[n.organism]!;
    env.usedOrganisms.add(n.organism);
    const attrs: string[] = [];
    for (const [k, v] of Object.entries(n.props ?? {})) attrs.push(attrText(k === "className" ? s.classProp : k, v, env));
    for (const [ev, h] of Object.entries(n.on ?? {})) attrs.push(`${s.callbackName(ev)}={${paramsOf(ev, h, org, s.eventType)} => ${printCall(h, env.print)}}`);
    const children: string[] = [];
    for (const [name, sl] of Object.entries(n.slots ?? {})) {
      // a forwarded slot is the same prop in both runtimes: a snippet (Svelte) or a node / render function (React)
      if (sl.forward !== undefined) {
        const out = s.forward ? s.forward(name, sl.forward) : { attr: [`${name}={${sl.forward}}`] };
        if (out.attr) attrs.push(...out.attr);
        if (out.child) children.push(...out.child);
        continue;
      }
      if (name === "children") { children.push(...walkNodes(sl.do, env)); continue; }
      const decl = org.slots.find((x) => x.name === name)!;
      const params = sl.args.map((a, i) => `${a}: ${typeName(decl.args[i]!.type)}`).join(", ");
      const out = s.slotProp(name, params, walkNodes(sl.do, env), decl.args.length > 0, decl.args.map((a) => a.name), sl.args);
      if (out.attr) attrs.push(...out.attr);
      if (out.child) children.push(...out.child);
    }
    return openTag(n.organism, attrs, children, s.attr);
  }
  if ("outlet" in n) return env.outlet ? env.outlet() : [];
  if ("part" in n) return env.part ? env.part(n.part) : [];
  return [];
}

/** the records of an organism as TypeScript types (one file, shared by the Svelte and React packages) */
/** optional props that hold a group of fields (a record type): their fields are read with `?.` (`actions?.cta`) */
export function optionalGroups(org: OrganismSpec): string[] {
  return org.props.filter((p) => !p.required && typeof p.type === "object" && ("record" in p.type || /^[A-Z]\w*$/.test(p.type.ts))).map((p) => p.name);
}

export function recordTypes(org: OrganismSpec, organisms: Record<string, OrganismSpec> = {}): string {
  const types = Object.entries(org.records)
    .map(([name, fields]) => `export type ${name} = {\n${fields.map((f) => `${f.docs ? `  /** ${f.docs} */\n` : ""}  ${f.name}${f.optional ? "?" : ""}: ${f.type};`).join("\n")}\n};`)
    .join("\n\n");
  // the record types of other components a grouped prop reads (`links: NavLink[]`)
  const imports = (org.typeImports ?? []).flatMap((t) => {
    const used = t.names.filter((n) => new RegExp(`\\b${n}\\b`).test(types));
    const other = organisms[t.from];
    return used.length && other ? [`import type { ${used.join(", ")} } from "${typesPath(org.id, other)}";`] : [];
  });
  return imports.length ? `${imports.join("\n")}\n\n${types}` : types;
}


/** the const tables of an organism that hold pictures as data URIs: they go to a `<name>.assets.ts` file next to the component */
export const assetTables = (org: OrganismSpec): string[] =>
  Object.entries(org.consts ?? {}).filter(([, table]) => Object.values(table).some((v) => v.includes("data:image/"))).map(([name]) => name);

/** the `<name>.assets.ts` file of an organism: its long const tables, exported */
export function assetFile(org: OrganismSpec, header: string): string {
  const names = new Set(assetTables(org));
  const tables = Object.entries(org.consts ?? {}).filter(([name]) => names.has(name));
  const body = tables.flatMap(([name, table]) => [`export const ${name}: Record<string, string> = {`, ...Object.entries(table).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`), `};`]);
  return `${header}\n// Data of ${org.name}: long values (pictures as data URIs) kept out of the component file.\n\n${body.join("\n")}\n`;
}
