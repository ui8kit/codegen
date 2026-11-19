/**
 * Join class values without Tailwind conflict resolution (`generate --cn join`).
 * Strings, numbers, arrays and `{ class: condition }` objects, like clsx; falsy
 * values are skipped and whitespace is collapsed. No dependency: for builds whose
 * class lists never conflict (a wireframe catalog), where tailwind-merge only
 * adds weight. The default build (`--cn merge`, the registry) keeps clsx +
 * tailwind-merge: there a caller class must win over a recipe class.
 */
export type ClassValue = string | number | bigint | boolean | null | undefined | ClassValue[] | { [key: string]: unknown };

function push(out: string[], v: ClassValue): void {
  if (!v && v !== 0) return;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") {
    for (const t of String(v).split(/\s+/)) if (t) out.push(t);
  } else if (Array.isArray(v)) {
    for (const x of v) push(out, x);
  } else if (typeof v === "object") {
    for (const k in v) if ((v as Record<string, unknown>)[k]) push(out, k);
  }
}

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  push(out, inputs);
  return out.join(" ");
}
