// Parity cases of the bricks: every part with its defaults, each enum value of each prop and each boolean prop set,
// rendered by the generated React package (react-dom/server) as the reference of the TypeScript runtimes.
import type { LoadedBrick, PartDef, PropDef } from "@ui8kit/xgen-spec";
import { reactPropName } from "@ui8kit/xgen-spec";
import { goPackageOf } from "@ui8kit/xgen-runtime-templ";

export interface ParityCase { name: string; label: string; part: string; props: Record<string, unknown>; children: string }
export const CHILD_TEXT = "Content";

const settable = (p: PropDef): boolean => !p.passthrough && p.type !== "children" && p.type !== "items" && p.type !== "attrs" && p.name !== "Class";

export function brickCases(bricks: LoadedBrick[]): ParityCase[] {
  const out: ParityCase[] = [];
  for (const { brick } of bricks) for (const part of brick.parts) {
    const children = part.props.some((p) => p.type === "children") ? CHILD_TEXT : "";
    const name = `${brick.dir}/${brick.file ?? brick.dir}/${part.name}`;
    const add = (id: string, props: Record<string, unknown>) => out.push({ name, label: `${goPackageOf(brick)}.${part.name} ${id}`, part: part.name, props, children });
    add("defaults", {});
    for (const p of part.props.filter(settable)) {
      if (p.enumValues?.length) for (const v of p.enumValues) add(`${p.name}=${v}`, { [p.name]: p.type === "int" ? Number(v) : v });
      else if (p.type === "bool") add(`${p.name}`, { [p.name]: true });
    }
  }
  return out;
}

/** canonical props (Go field names) -> the props of the React component */
export function reactProps(part: PartDef, props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    const d = part.props.find((p) => p.name === k);
    if (d) out[k === "Class" ? "className" : reactPropName(d)] = v;
  }
  return out;
}
