// The facts of a block (`facts` in its spec): a selector inside the variant, how many elements it must match and how many columns they form,
// for the variants whose row matches `when`. The numbers can name data: `@collection` (or a block data alias such as `@templateFilters`), `@collection*2`, `@collection-1`, or an axis: `$cols`.
import type { BlockFact } from "@ui8kit/xgen-screens";
import type { Expect } from "./common";

type Count = number | string;

/** a number, or the size of a collection, or the number an axis value names */
export function resolveCount(c: Count, row: Record<string, string>, counts: Record<string, number>): number {
  if (typeof c === "number") return c;
  if (c.startsWith("$")) return Number(String(row[c.slice(1)]).replace("1-", ""));
  const m = c.match(/^@([a-zA-Z]+)(?:([*-])(\d+))?$/);
  if (!m) throw new Error(`fact count "${c}" is not a number, @collection or $axis`);
  const size = counts[m[1]!];
  if (size === undefined) throw new Error(`fact count "${c}": no collection ${m[1]}`);
  return m[2] === "*" ? size * Number(m[3]) : m[2] === "-" ? size - Number(m[3]) : size;
}

const holds = (f: BlockFact, row: Record<string, string>): boolean =>
  Object.entries(f.when ?? {}).every(([axis, want]) => (Array.isArray(want) ? want : [want]).includes(row[axis] ?? ""));

export async function factsChecks(facts: BlockFact[], row: Record<string, string>, where: string, n: (sel: string) => Promise<number>, xsOf: (sel: string) => Promise<number[]>, counts: Record<string, number>, expect: Expect): Promise<void> {
  for (const f of facts) {
    if (!holds(f, row)) continue;
    const count = await n(f.sel);
    if (f.n !== undefined) {
      const want = resolveCount(f.n, row, counts);
      expect(`${where}: ${want} x ${f.sel}`, count === want, count);
    }
    if (f.cols !== undefined) {
      const want = Math.min(resolveCount(f.cols, row, counts), count);
      const xs = await xsOf(f.sel);
      expect(`${where}: ${f.sel} in ${want} column(s)`, xs.length === want, xs);
    }
  }
}
