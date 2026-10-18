#!/usr/bin/env node
// The ui8px gate: extract the class sets of the specs, lint them, write the JSON report to a file (stdout is cut at 64 KiB),
// print a summary by rule and by spec, and fail when the blocking rules exceed the ratchet in .ui8px/gate.json.
// Blocking: UI8PX001 (spacing off the grid of the scope), UI8PX003 (denied class), UI8PX005 (unknown ui-* class), GRID (below).
// Report only: UI8PX002 (class not in the allowed list) and UI8PX004 (conflict; inset-ring + inset-ring-<color> is a false positive).
// Usage (from the workspace root): bun run lint:px      UI8PX_MAX=<n> overrides the ratchet for one run.
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

execFileSync(process.execPath, ["packages/tooling/bin/ui8px-extract.mjs"], { stdio: "inherit" });
fs.mkdirSync(".ui8px/reports", { recursive: true });
const report = ".ui8px/reports/lint.json";
// stdout goes straight to the file: through a pipe ui8px exits before a long report is flushed
const fd = fs.openSync(report, "w");
const run = spawnSync("node_modules/.bin/ui8px", ["lint", ".ui8px/extract/specs", "--json"], { stdio: ["ignore", fd, "pipe"], encoding: "utf8" });
fs.closeSync(fd);
if (run.status === 2 || run.status === null) { console.error(run.stderr || "ui8px failed"); process.exit(2); }

const gate = JSON.parse(fs.readFileSync(".ui8px/gate.json", "utf8"));
const max = process.env.UI8PX_MAX !== undefined ? Number(process.env.UI8PX_MAX) : gate.max;
const blockingRules = new Set(gate.blocking);
// GRID: spacing-like tokens that ui8px files under UI8PX002 because its grammar does not know them (size-*, space-x/y-*,
// negative spacing, w/h/inset with a number), checked against the scale of the scope of the file
const allowed = JSON.parse(fs.readFileSync(".ui8px/policy/allowed.json", "utf8"));
const scopes = JSON.parse(fs.readFileSync(".ui8px/policy/scopes.json", "utf8"));
const scaleOf = (scope) => allowed.spacing[scopes.scopes.find((s) => s.name === scope)?.spacing ?? "layout"];
const GRID_RE = /^-?(size|space-[xy]|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|[wh]|min-[wh]|max-[wh]|top|right|bottom|left|inset(?:-[xy])?)-(\d+(?:\.\d+)?|\[[^\]]+\])$/;
const { diagnostics } = JSON.parse(fs.readFileSync(report, "utf8"));
const counts = {};
const blocking = [];
for (const d of diagnostics) {
  counts[d.rule] = (counts[d.rule] ?? 0) + 1;
  if (blockingRules.has(d.rule)) { blocking.push({ ...d, gate: d.rule }); continue; }
  if (d.rule !== "UI8PX002" || !blockingRules.has("GRID")) continue;
  const base = d.className.split(":").pop();
  const m = base.match(GRID_RE);
  if (!m || allowed.utilities.includes(base)) continue;
  if (!scaleOf(d.scope).includes(m[2])) blocking.push({ ...d, gate: "GRID" });
}
const byGate = {};
const bySpec = {};
for (const b of blocking) {
  byGate[b.gate] = (byGate[b.gate] ?? 0) + 1;
  (bySpec[b.file.replace(/^.*extract\/specs\//, "").replace(/\.html$/, "")] ??= []).push(b.className);
}
for (const [spec, cls] of Object.entries(bySpec).sort()) console.log(`  ${spec}: ${[...new Set(cls)].join(" ")}`);
console.log(`ui8px: ${JSON.stringify(counts)}; blocking ${JSON.stringify(byGate)} = ${blocking.length} (ratchet ${max}); report ${report}`);
if (blocking.length > max) { console.error(`ui8px: ${blocking.length} blocking hits, over the ratchet of ${max}`); process.exit(1); }
if (blocking.length < max) console.log(`ui8px: below the ratchet; lower "max" in .ui8px/gate.json to ${blocking.length}`);
