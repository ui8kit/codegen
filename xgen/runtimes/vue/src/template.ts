// Vue template text from the brace form the shared walker prints: `name={expr}` -> `:name="expr"`, `{...rest}` -> `v-bind="rest"`,
// `{expr}` -> `{{ expr }}`. An attribute value is double quoted, so string literals of the expression move to single quotes.

/** a TypeScript expression as the value of a double-quoted attribute: `"a"` -> `'a'` (template literals and their `${}` kept) */
export function attrExpr(code: string): string {
  let out = "";
  let i = 0;
  const literal = (quote: string): void => {
    let j = i + 1;
    while (j < code.length && code[j] !== quote) j += code[j] === "\\" ? 2 : 1;
    const raw = code.slice(i, j + 1);
    out += quote === '"' ? `'${(JSON.parse(raw) as string).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'` : raw;
    i = j + 1;
  };
  const template = (): void => {
    out += "`";
    i++;
    while (i < code.length && code[i] !== "`") {
      if (code[i] === "\\") { out += code.slice(i, i + 2); i += 2; continue; }
      if (code.startsWith("${", i)) { out += "${"; i += 2; expr("}"); out += "}"; i++; continue; }
      out += code[i] === '"' ? "\\x22" : code[i];
      i++;
    }
    out += "`";
    i++;
  };
  // code up to the closing `end` at depth 0 (or the end of the text)
  const expr = (end: string): void => {
    let depth = 0;
    while (i < code.length) {
      const c = code[i]!;
      if (c === end && depth === 0) return;
      if (c === '"' || c === "'") { literal(c); continue; }
      if (c === "`") { template(); continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      out += c;
      i++;
    }
  };
  expr("");
  return out;
}

/** one attribute of the brace form in Vue: bound (`:x`), an event (`@x`), a spread (`v-bind`), or kept as it is (static text) */
export function vueAttr(text: string): string {
  const spread = /^\{\.\.\.([\s\S]+)\}$/.exec(text);
  if (spread) return `v-bind="${attrExpr(spread[1]!)}"`;
  const bound = /^([@\w:.-]+)=\{([\s\S]*)\}$/.exec(text);
  if (bound) return `${bound[1]!.startsWith("@") ? bound[1] : `:${bound[1]}`}="${attrExpr(bound[2]!)}"`;
  return text;
}

/** the name of a slot in Vue: `children` is the default slot */
export const slotName = (name: string): string => (name === "children" ? "default" : name);

const pad = (lines: string[], n = 1): string[] => lines.map((l) => (l ? "  ".repeat(n) + l : l));

/**
 * The lines of one element node with a directive in its opening tag (`<Card v-if="x" ...>`), or undefined when the lines are
 * not exactly one element: text, several nodes, a `<template>` block, or an element with a directive of the other kind
 * (Vue gives `v-if` priority over `v-for` on one element, so the two never share a tag).
 */
function onElement(lines: string[], directive: string, clash: RegExp): string[] | undefined {
  const top = lines.filter((l) => !l.startsWith(" "));
  const tag = /^<([A-Za-z][\w-]*)(?=[\s>/]|$)/.exec(lines[0] ?? "")?.[1];
  // the opening tag: its first line, and the attribute lines under it when the first line does not close it
  const end = /\/?>$/.test(lines[0] ?? "") ? 1 : lines.findIndex((l, i) => i > 0 && !l.startsWith(" "));
  if (!tag || tag === "template" || lines.slice(0, end < 0 ? 1 : end).some((l) => clash.test(` ${l.trim()}`))) return undefined;
  const last = top[top.length - 1]!;
  const single = top.length === 1 ? last.endsWith("/>") || last.endsWith(`</${tag}>`) : top.length <= 3 && (last === `</${tag}>` || last === "/>") && top.slice(1, -1).every((l) => l === ">");
  if (!single) return undefined;
  const head = lines[0]!.replace(`<${tag}`, `<${tag} ${directive}`);
  const parts = head.length > 110 ? splitHead(head) : undefined;
  return [...(parts ? [`<${tag}`, ...parts.attrs.map((x) => `  ${x}`), parts.close] : [head]), ...lines.slice(1)];
}

/** the attributes of a one-line opening tag that ends the line (`<a x="1" y>` / `<a x />`); undefined for a line with content after the tag */
function splitHead(line: string): { attrs: string[]; close: ">" | "/>" } | undefined {
  const close = line.endsWith("/>") ? "/>" : line.endsWith(">") ? ">" : undefined;
  if (!close) return undefined;
  const body = line.slice(line.indexOf(" ") + 1, line.length - close.length).trim();
  const attrs: string[] = [];
  let from = 0, quoted = false;
  for (let i = 0; i <= body.length; i++) {
    if (body[i] === '"') quoted = !quoted;
    if ((i === body.length || body[i] === " ") && !quoted) { if (i > from) attrs.push(body.slice(from, i)); from = i + 1; }
  }
  return quoted ? undefined : { attrs, close };
}

/** `v-if` / `v-else-if` / `v-else` on the element of each branch, or on a `<template>` around a branch of several nodes */
export function ifChain(branches: Array<[string, string[]]>, rest: string[]): string[] {
  const branch = (directive: string, lines: string[]): string[] => onElement(lines, directive, /\sv-(for|if|else)/) ?? [`<template ${directive}>`, ...pad(lines), "</template>"];
  const out = branches.flatMap(([c, lines], i) => branch(`${i === 0 ? "v-if" : "v-else-if"}="${attrExpr(c)}"`, lines));
  return rest.length ? [...out, ...branch("v-else", rest)] : out;
}

/** `v-for` with its key on the element of the body, or on a `<template>` around a body of several nodes */
export const each = (items: string, as: string, key: string, body: string[], index?: string): string[] => {
  const directive = `v-for="${index ? `(${as}, ${index})` : as} in ${attrExpr(items)}" :key="${attrExpr(key)}"`;
  return onElement(body, directive, /\sv-(for|if|else)/) ?? [`<template ${directive}>`, ...pad(body), "</template>"];
};
