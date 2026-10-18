// Prints the readability allowlist as it stands (to paste into src/readability-allow.ts after a file got better).
import { join } from "node:path";
import { planBuild } from "@ui8kit/xgen-generator";
import { measure } from "../src/readability";
import { HTML_ATTRS, READABILITY_ALLOW } from "../src/readability-allow";

const plan = planBuild(join(import.meta.dir, "..", "..", ".."));
const rows = Object.entries(measure(plan)).sort(([a], [b]) => a.localeCompare(b));
// the reason of an entry is kept; a new entry gets a placeholder that a person must replace
const why = (k: string): string => { const w = READABILITY_ALLOW[k]?.why; return w === HTML_ATTRS ? "HTML_ATTRS" : JSON.stringify(w ?? "TODO: why"); };
console.log(rows.map(([k, m]) => `  ${JSON.stringify(k)}: { ${Object.entries(m).map(([a, b]) => `${a}: ${b}`).join(", ")}, why: ${why(k)} },`).join("\n"));
console.log(`// ${rows.length} entries`);
