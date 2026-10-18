// Prints a view Value as a TypeScript expression. Both runtimes use the same text: scope names are plain identifiers
// (props, `ui`, `view`, `row`...), the helpers come from the ui package (`tpl`, `fmtMoney`, `fmtNumber`, `at`).
import { isGroup, isOp, isRef, type Handler, type Value } from "./ir";

export interface PrintCtx {
  /** `emit.select(x)` -> the callback prop of the runtime: onselect?.(x) in Svelte, onSelect?.(x) in React */
  emit: (event: string) => string;
  /** names of helpers the printed code used */
  helpers: Set<string>;
  /** roots that may be undefined (`record`): their fields are read with `?.` */
  optional: Set<string>;
  /** presets the printed code read (`preset` op): their constant names, for the imports */
  presets?: Set<string>;
  /** the style attribute is a string in Svelte and Vue and an object in React; Vue emits events with `emit("name", ...)` */
  runtime?: "svelte" | "react" | "vue" | "solid";
  /** another text for a scope name (Vue: a slot is `$slots.icon`, a computed read in the script is `total.value`) */
  rename?: (name: string) => string | undefined;
}

const HELPER: Record<string, string> = { tpl: "tpl", money: "fmtMoney", num: "fmtNumber", at: "at", pageWindow: "pageWindow", fitCols: "fitCols", uniq: "uniqLabel" };
const camel = (s: string): string => s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

/** a bare prop compared to a literal is read as a plain string: a test in a branch of another test of the same prop must not be flagged as impossible */
const widen = ([l, r]: Value[], printed: string): string => (typeof r === "string" && isRef(l) && /^[a-z]\w*$/.test(l.$) && l.$ !== "event" ? `(${printed} as string)` : printed);

/** one field of a printed group: `level` when the value is the variable of that name, else `key: value` */
const groupField = (key: string, value: string): string =>
  key === "..." ? `...${value}` : value === key ? key : `${/^[A-Za-z_]\w*$/.test(key) ? key : JSON.stringify(key)}: ${value}`;

export function printValue(v: Value, ctx: PrintCtx): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  // a grouped prop: { cta: ui.home.cta, href: "#/" }
  if (isGroup(v)) return `{ ${Object.entries(v).map(([k, x]) => groupField(k, printValue(x, ctx))).join(", ")} }`;
  if (isRef(v)) {
    const [head, ...rest] = v.$.split(".");
    if (head === "event") return `event.currentTarget.${rest.join(".") || "value"}`;
    const root = ctx.rename?.(head!) ?? head;
    return rest.length ? `${root}${ctx.optional.has(head) ? "?" : ""}.${rest.join(".")}` : root;
  }
  if (v.op === "css") return printCss(v.args, ctx);
  if (v.op === "preset") {
    // preset("defaults", "hero.band") -> defaults.hero.band, imported from the presets folder of the package
    ctx.presets?.add(String(v.args[0]));
    return `${String(v.args[0])}.${String(v.args[1])}`;
  }
  if (v.op === "recipe") {
    // recipe("iconTab", "state", value) -> iconTabVariants({ state: value }), the variant table printed at the top of the component
    const [name, ...rest] = v.args;
    const pairs: string[] = [];
    for (let i = 0; i + 1 < rest.length; i += 2) pairs.push(`${String(rest[i])}: ${printValue(rest[i + 1]!, ctx)}`);
    return `${String(name)}Variants({ ${pairs.join(", ")} })`;
  }
  if (v.op === "count") return `${printValue(v.args[0]!, ctx)}.filter((i) => i[${printValue(v.args[1]!, ctx)}]).length`;
  if (v.op === "where") return `${printValue(v.args[0]!, ctx)}.filter((i) => !${printValue(v.args[2]!, ctx)} || i[${printValue(v.args[1]!, ctx)}] === ${printValue(v.args[2]!, ctx)})`;
  if (v.op === "match") return `${printValue(v.args[0]!, ctx)}.filter((i) => !${printValue(v.args[2]!, ctx)} || String(i[${printValue(v.args[1]!, ctx)}]).toLowerCase().includes(String(${printValue(v.args[2]!, ctx)}).toLowerCase()))`;
  if (v.op === "pick") return `${printValue(v.args[0]!, ctx)}.find((i) => i.id === ${printValue(v.args[1]!, ctx)})!`;
  if (v.op === "sumBy") return `${printValue(v.args[0]!, ctx)}.reduce((s, i) => s + i.${String(v.args[1])} * i.${String(v.args[2])}, 0)`;
  if (v.op === "firstOf") return `${printValue(v.args[0]!, ctx)}[0]?.${String(v.args[1])} ?? ""`;
  if (v.op === "maxBy") return `${printValue(v.args[0]!, ctx)}.reduce((m, i) => Math.max(m, i.${String(v.args[1])}), 0)`;
  const a = v.args.map((x) => printValue(x, ctx));
  switch (v.op) {
    case "eq": return `(${widen(v.args, a[0]!)} === ${a[1]})`;
    case "ne": return `(${widen(v.args, a[0]!)} !== ${a[1]})`;
    case "not": return `!${a[0]}`;
    case "and": return `(${a.join(" && ")})`;
    case "or": return `(${a.join(" || ")})`;
    case "gt": return `(${a[0]} > ${a[1]})`;
    case "lt": return `(${a[0]} < ${a[1]})`;
    case "ge": return `(${a[0]} >= ${a[1]})`;
    case "le": return `(${a[0]} <= ${a[1]})`;
    case "add": return `(${a[0]} + ${a[1]})`;
    case "sub": return `(${a[0]} - ${a[1]})`;
    case "mul": return `(${a[0]} * ${a[1]})`;
    case "div": return `(${a[0]} / ${a[1]})`;
    case "max": return `Math.max(${a.join(", ")})`;
    case "min": return `Math.min(${a.join(", ")})`;
    case "round": return `Math.round(${a[0]})`;
    case "coalesce": return `(${a.join(" ?? ")})`;
    case "cn": ctx.helpers.add("cn"); return `cn(${a.join(", ")})`;
    case "str": return `(${a[0]} == null ? undefined : String(${a[0]}))`;
    case "has": return `(${a[0]} != null)`;
    case "undef": return "undefined";
    case "range": return `Array.from({ length: ${a[0]} }, (_, i) => i)`;
    case "cond": return `(${a[0]} ? ${a[1]} : ${a[2]})`;
    case "len": return `(${a[0]}?.length ?? 0)`;
    case "words": return `(${a[0]} ?? "").split(" ")`;
    case "nbsp": return `(${a[0]} ?? "").replaceAll(" ", "\\u00a0")`;
    case "nth": return `${a[0]}?.[${a[1]}]`;
    case "list": return `[${a.join(", ")}]`;
    default: {
      const h = HELPER[v.op];
      if (!h) throw new Error(`unknown op ${v.op}`);
      ctx.helpers.add(h);
      return `${h}(${a.join(", ")})`;
    }
  }
}

/** css("height", value, "px", "width", value, "%") -> a style string (Svelte) or object (React); property and unit are literals */
function printCss(args: Value[], ctx: PrintCtx): string {
  const decls: Array<[string, string, string]> = [];
  for (let i = 0; i + 2 < args.length; i += 3) {
    decls.push([String(args[i]), printValue(args[i + 1]!, ctx), String(args[i + 2])]);
  }
  if (ctx.runtime === "react") return `{ ${decls.map(([p, v, u]) => `${camel(p)}: \`\${${v}}${u}\``).join(", ")} }`;
  return `\`${decls.map(([p, v, u]) => `${p}:\${${v}}${u}`).join(";")}\``;
}

export function printCall(h: Handler, ctx: PrintCtx): string {
  const args = (h.args ?? []).map((x) => printValue(x, ctx)).join(", ");
  if (h.call.startsWith("emit.") && ctx.runtime === "vue") return `emit(${[JSON.stringify(h.call.slice(5)), ...(args ? [args] : [])].join(", ")})`;
  if (h.call.startsWith("emit.")) return `${ctx.emit(h.call.slice(5))}(${args})`;
  return `${h.call}(${args})`;
}

export const handlerUsesEvent = (h: Handler): boolean => JSON.stringify(h.args ?? []).includes('"$":"event');

/** The printed value without one pair of parentheses around the whole of it: `(a ?? b)` → `a ?? b`. */
export const printBare = (v: Value, ctx: PrintCtx): string => {
  const s = printValue(v, ctx);
  if (!s.startsWith("(") || !s.endsWith(")")) return s;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length - 1; i++) {
    const c = s[i]!;
    if (quote) quote = c === quote && s[i - 1] !== "\\" ? "" : quote;
    else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    if (!quote && depth === 0) return s;
  }
  return s.slice(1, -1);
};

/** a value spread over lines when it is wider than `width`: one list item or group field per line, nested values indented */
export function printPretty(v: Value, ctx: PrintCtx, indent = "", width = 120): string {
  const flat = printValue(v, ctx);
  if (indent.length + flat.length <= width) return flat;
  const inner = indent + "  ";
  if (isOp(v) && v.op === "list") return `[\n${v.args.map((x) => `${inner}${printPretty(x, ctx, inner, width)},\n`).join("")}${indent}]`;
  if (isGroup(v)) return `{\n${Object.entries(v).map(([k, x]) => `${inner}${groupField(k, printPretty(x, ctx, inner, width))},\n`).join("")}${indent}}`;
  return flat;
}
