// The `rules` group outside `xgen check`:
//   bun xgen/check/tools/rules.ts                 count the findings per package (baselines ignored); --list prints every finding
//   bun xgen/check/tools/rules.ts --gate [dir]    the gate of `xgen check` for every package, or for one (apps/discovery); exit 1 on a new finding
//   bun xgen/check/tools/rules.ts --write         write rules/zones.json and rules/baselines/<package>.json (root script: bun run rules:baseline)
import { join } from "node:path";
import { writeStyleBaselines } from "../src/style-zones";
import { countsOf, DETECTORS, gate, scanRepo, selfTest, writeBaselines } from "../src/rules";

const repo = join(import.meta.dir, "..", "..", "..");
const args = process.argv.slice(2);
if (args.includes("--write")) for (const l of [...writeBaselines(repo), ...writeStyleBaselines(repo)]) console.log(l);
else if (args.includes("--gate")) {
  const only = args.find((a) => !a.startsWith("--"));
  const g = gate(repo, only);
  const problems = [...selfTest(repo), ...g.problems];
  for (const p of problems) console.log(`  ${p}`);
  console.log(`rules: ${only ?? "all packages"}, ${g.files} files, ${g.recorded} recorded, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
} else for (const rep of scanRepo(repo)) {
  const c = countsOf(rep);
  console.log(`${rep.zone.dir} (${rep.zone.runtime}, ${rep.files} files): ${DETECTORS.map((d) => `${d} ${Object.values(c[d]!).reduce((a, b) => a + b, 0)}`).join(", ")}`);
  if (args.includes("--list")) for (const [f, list] of rep.findings) for (const x of list) console.log(`  ${f}:${x.line}  ${x.detector}  ${x.message}`);
  for (const e of rep.errors) console.log(`  ${e}`);
}
