#!/usr/bin/env node
// ui8px reads class="..." in .html files only (also .css @apply, .templ, .go); it does not see JSON specs, .svelte, .tsx or .vue.
// This bridge mirrors every class set of the specs (the single source of truth) into .ui8px/extract/specs/<dir>/<spec>.html,
// one <i data-src="$.json.path" class="..."> per class set, so a lint hit points at the spec location to change.
// Usage (from the workspace root): node packages/tooling/bin/ui8px-extract.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, ".ui8px/extract");
fs.rmSync(out, { recursive: true, force: true });

/** keys whose string value is a class list (variant tables: base/staticBase, view nodes: Class/className) */
const CLASS_KEYS = new Set(["base", "staticBase", "class", "Class", "className", "classes"]);
/** keys whose object holds class lists by variant value (variant tables) or by path (presets) */
const TABLE_KEYS = new Set(["byKey", "values"]);

/** the static class strings inside a class-valued expression (cn, coalesce, or, both branches of cond) */
function classLeaves(v, p, acc) {
  if (typeof v === "string") { if (v.trim()) acc.push([p, v.trim()]); return; }
  if (!v || typeof v !== "object" || Array.isArray(v) || "$" in v) return;
  const args = Array.isArray(v.args) ? v.args : [];
  if (v.op === "cn" || v.op === "coalesce" || v.op === "or") args.forEach((a, i) => classLeaves(a, `${p}.args[${i}]`, acc));
  else if (v.op === "cond") [1, 2].forEach((i) => classLeaves(args[i], `${p}.args[${i}]`, acc));
}

/** every string below a table key: a variant value or a preset path */
function tableLeaves(v, p, acc) {
  if (typeof v === "string") { if (v.trim()) acc.push([p, v.trim()]); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => tableLeaves(x, `${p}[${i}]`, acc));
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) tableLeaves(x, `${p}.${k}`, acc);
}

function collect(node, p, acc) {
  if (Array.isArray(node)) return node.forEach((v, i) => collect(v, `${p}[${i}]`, acc));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    const kp = `${p}.${k}`;
    if (TABLE_KEYS.has(k) && v && typeof v === "object") { tableLeaves(v, kp, acc); continue; }
    if (CLASS_KEYS.has(k)) {
      if (typeof v === "string") { if (v.trim()) acc.push([kp, v.trim()]); continue; }
      if (v && typeof v === "object" && "op" in v) { classLeaves(v, kp, acc); continue; }
    }
    collect(v, kp, acc);
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const specRoot = path.join(root, "xgen/specs");
let lists = 0;
let files = 0;
for (const dir of fs.readdirSync(specRoot, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of fs.readdirSync(path.join(specRoot, dir.name)).sort()) {
    if (!file.endsWith(".json")) continue;
    const acc = [];
    collect(JSON.parse(fs.readFileSync(path.join(specRoot, dir.name, file), "utf8")), "$", acc);
    if (!acc.length) continue;
    const target = path.join(out, "specs", dir.name, file.replace(/\.json$/, ".html"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const body = acc.map(([jp, cls]) => `<i data-src="${esc(jp)}" class="${esc(cls)}"></i>`).join("\n");
    fs.writeFileSync(target, `<!-- source: xgen/specs/${dir.name}/${file} -->\n${body}\n`);
    lists += acc.length;
    files++;
  }
}
// a nested .gitignore keeps the mirror out of git; ui8px reads only the root .gitignore, so it still scans the files
fs.writeFileSync(path.join(out, ".gitignore"), "*\n");
console.log(`ui8px-extract: ${lists} class sets from ${files} specs -> .ui8px/extract/specs`);
