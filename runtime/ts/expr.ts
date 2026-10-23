/**
 * Tiny attribute-logic helpers used by generated components. One
 * implementation per runtime family keeps every default-resolution decision
 * table byte-identical across React, Svelte, and Vue (mirrors `expr.go`).
 */

export const trimStr = (v: string | number | null | undefined): string =>
  v === null || v === undefined ? "" : String(v).trim();

export const isSetStr = (v: string | null | undefined): boolean => trimStr(v) !== "";

export const isSetNum = (v: number | null | undefined): boolean => (v ?? 0) > 0;

/**
 * `trim(v) === "" ? fallback : trim(v)` — DefaultInputType-style defaults.
 * Generic so enum-typed props keep their literal union through the default.
 */
export const defaultIfEmpty = <T extends string>(v: T | null | undefined, fallback: T): T => {
  const t = trimStr(v) as T;
  return t === "" ? fallback : t;
};

/** Whitelist: returns `trim(v)` when in `allowed`, otherwise `fallback`. */
export const oneOfOr = <T extends string>(
  v: string | null | undefined,
  fallback: T,
  ...allowed: T[]
): T => {
  const t = trimStr(v) as T;
  return allowed.includes(t) ? t : fallback;
};

export const oneOfOrLower = <T extends string>(
  v: string | null | undefined,
  fallback: T,
  ...allowed: T[]
): T => {
  const t = trimStr(v).toLowerCase() as T;
  return allowed.includes(t) ? t : fallback;
};

/** Decision table: `mapping[trim(v)] ?? fallback`. */
export const mapOr = <T extends string>(
  v: string | null | undefined,
  mapping: Record<string, T>,
  fallback: T
): T => mapping[trimStr(v)] ?? fallback;

export const mapOrLower = <T extends string>(
  v: string | null | undefined,
  mapping: Record<string, T>,
  fallback: T
): T => mapping[trimStr(v).toLowerCase()] ?? fallback;

/** Integer decision table: `mapping[v] ?? fallback`. */
export const intMapOr = <T extends string>(
  v: number | null | undefined,
  mapping: Record<number, T>,
  fallback: T
): T => mapping[v ?? 0] ?? fallback;

/** Null-safe string equality (both sides normalized to ""). */
export const eqStr = (a: string | null | undefined, b: string | null | undefined): boolean =>
  (a ?? "") === (b ?? "");

/** ARIA state stringification: always "true"/"false", never omitted. */
export const boolStr = (v: boolean | null | undefined): "true" | "false" =>
  v ? "true" : "false";

/** Concatenation of trimmed parts (icon `Prefix + Name`). */
export const concatTrim = (...parts: (string | null | undefined)[]): string =>
  parts.map(trimStr).join("");

/** Omit-if-empty attribute value: `""` → `undefined` so the attr is dropped. */
export const orUndef = <T extends string>(v: T | null | undefined): Exclude<T, ""> | undefined => {
  const t = trimStr(v);
  return t === "" ? undefined : (String(v) as Exclude<T, "">);
};

/**
 * Sync a form control's live `value` property (never an attribute, so SSR
 * markup is untouched). `undefined` leaves the current selection alone, so
 * the children's initial `selected` state stays in charge. Usable directly as
 * a Svelte action (`use:syncValue={value}`) and from Solid refs / WC renderers.
 */
export function syncValue(node: { value: string }, value?: string | null): { update(v?: string | null): void } {
  const apply = (v?: string | null): void => {
    if (v !== undefined && v !== null && node.value !== v) node.value = v;
  };
  apply(value);
  return { update: apply };
}
