// A layout preset as a TypeScript module, the same text for every runtime: `export const defaults = { hero: { band: "..." } } as const;`
import { presetFile, type PresetGroup, type PresetSpec, type PresetValue } from "@ui8kit/xgen-screens";
import { BANNER } from "./common";
import type { GeneratedFile } from "./common";

const KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function printGroup(g: PresetGroup, notes: Record<string, string>, path: string, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const out: string[] = [];
  for (const [k, v] of Object.entries(g)) {
    const at = path ? `${path}.${k}` : k;
    const note = notes[at];
    if (note) out.push(`${pad}/** ${note} */`);
    const key = KEY.test(k) ? k : JSON.stringify(k);
    out.push(...printValue(key, v, notes, at, depth, pad));
  }
  return out;
}

function printValue(key: string, v: PresetValue, notes: Record<string, string>, at: string, depth: number, pad: string): string[] {
  if (typeof v === "string" || typeof v === "number") return [`${pad}${key}: ${JSON.stringify(v)},`];
  if (Array.isArray(v)) return [`${pad}${key}: [${v.map((x) => JSON.stringify(x)).join(", ")}],`];
  return [`${pad}${key}: {`, ...printGroup(v, notes, at, depth + 1), `${pad}},`];
}

/** src/presets/<kit>.ts */
export function emitPreset(p: PresetSpec, source: string): GeneratedFile {
  const lines = [
    `// ${BANNER}`,
    `// Source: ${source}`,
    ``,
    `/**`,
    ...p.docs.split("\n").map((l) => ` * ${l}`.trimEnd()),
    ...(p.source ? [` *`, ` * Numbers: ${p.source}`] : []),
    ` */`,
    `export const ${p.name} = {`,
    ...printGroup(p.values, p.notes ?? {}, "", 1),
    `} as const;`,
    ``,
  ];
  return { path: `presets/${presetFile(p.name)}.ts`, contents: lines.join("\n") };
}
