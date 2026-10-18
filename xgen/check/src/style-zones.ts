// The style rules of the corners, shadows, hardcode and spacing groups, applied to hand-written app code outside the specs:
// apps/magazine/src. Only style text is read: the markup and <style> of .svelte files, .css files, and the string literals of
// .ts files (class strings). Three.js / canvas engine code (packages/panorama) is outside every rule zone (rule 00) and never scanned.
// Existing violations are recorded per file in rules/style-baselines/<package>.json: more fails, fewer asks for
// `bun run rules:baseline`, so the list only shrinks.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { cornerClasses, HARDCODE, shadowClasses } from "./audit-rules";

export const STYLE_GROUPS = ["corners", "shadows", "hardcode", "spacing"] as const;
export type StyleGroup = (typeof STYLE_GROUPS)[number];
/** the hand-written packages under the style rules: name (the baseline file), package dir, scanned dir */
export const STYLE_PACKAGES = [
  { name: "magazine", dir: "apps/magazine", src: "src" },
] as const;
const BASELINE_DIR = join("rules", "style-baselines");
/** the style packages present in this workspace: a standalone checkout (ui8kit/codegen) carries none of the hand-written apps */
const present = (repo: string) => STYLE_PACKAGES.filter((p) => existsSync(join(repo, p.dir)));

const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)])) : []);
const scanned = (f: string): boolean => /\.(svelte|css|ts)$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith(".d.ts");

/** spacing steps of the 8px grid are even (step 2 = 8px); an odd or fractional step is 4px-grained, allowed only inside controls */
const STEP = /(?<![\w-])-?(?:gap(?:-[xy])?|p[xytrbl]?|m[xytrbl]?|space-[xy]|inset(?:-[xy])?)-(\d+(?:\.\d+)?)(?![\w.-])/g;
const GRADIENT_CLASS = /(?<![\w-])bg-(?:gradient|linear|radial|conic)-[\w-[\]]+/g;
const GRADIENT_CSS = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/** what each group finds in class text (markup, class strings) */
function classFindings(t: string): Record<StyleGroup, string[]> {
  const all = (re: RegExp): string[] => [...t.matchAll(re)].map((m) => m[0]);
  return {
    corners: cornerClasses(t),
    shadows: shadowClasses(t),
    hardcode: [...all(HARDCODE.arbitrary), ...all(HARDCODE.palette), ...all(GRADIENT_CLASS)],
    spacing: [...t.matchAll(STEP)].filter((m) => Number(m[1]) % 2 !== 0).map((m) => m[0]),
  };
}

/** what each group finds in CSS (declarations only) */
function cssFindings(t: string): Record<StyleGroup, string[]> {
  const decl = (prop: RegExp): Array<[string, string]> => [...t.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].filter((m) => prop.test(m[1]!)).map((m) => [m[1]!, m[2]!.trim()]);
  const px = (v: string): number[] => [...v.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Math.abs(Number(m[1])));
  return {
    corners: decl(/^border(-[a-z]+)*-radius$/).filter(([, v]) => !v.includes("var(--radius") && !/^(0|inherit)$/.test(v)).map(([p, v]) => `${p}: ${v}`),
    shadows: decl(/^(box-shadow|filter)$/).filter(([p, v]) => (p === "filter" ? v.includes("drop-shadow") : v !== "none" && !/^(inset\s+)?0 0 0 /.test(v))).map(([p, v]) => `${p}: ${v}`),
    hardcode: [...[...t.matchAll(GRADIENT_CSS)].map((m) => m[0]), ...decl(/./).flatMap(([p, v]) => [...v.matchAll(HEX)].map((m) => `${p}: ${m[0]}`))],
    spacing: decl(/^(margin|padding|gap|row-gap|column-gap|inset)(-[a-z]+)*$/).filter(([, v]) => px(v).some((n) => n % 8 !== 0)).map(([p, v]) => `${p}: ${v}`),
  };
}

const merge = (a: Record<StyleGroup, string[]>, b: Record<StyleGroup, string[]>): Record<StyleGroup, string[]> =>
  Object.fromEntries(STYLE_GROUPS.map((g) => [g, [...a[g], ...b[g]]])) as Record<StyleGroup, string[]>;
const none = (): Record<StyleGroup, string[]> => ({ corners: [], shadows: [], hardcode: [], spacing: [] });

/** the string literals of a TS source (class strings); template literal chunks included */
function tsStrings(src: string): string {
  const sf = ts.createSourceFile("x.ts", src, ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  (function visit(n: ts.Node): void {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n);
    // a class string: not code (a shader, a CSS block), not a bare word (a key such as "shadow")
    if (lit && !/[\n;{]/.test(n.text) && !/^[a-z]+$/.test(n.text)) out.push(n.text);
    else if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    ts.forEachChild(n, visit);
  })(sf);
  return out.join("\n");
}

/** the findings of one file, by group */
export function styleFindings(file: string, text: string): Record<StyleGroup, string[]> {
  if (file.endsWith(".css")) return cssFindings(text);
  if (file.endsWith(".ts")) return classFindings(tsStrings(text));
  const styles = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
  const markup = text.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "").replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
  // class text of the markup: class="..." values, the string literals of class={...}, class:name directives
  const classes = [
    ...[...markup.matchAll(/\bclass="([^"]*)"/g)].map((m) => m[1]!),
    ...[...markup.matchAll(/\bclass=\{([^}]*)\}/g)].map((m) => tsStrings(m[1]!)),
    ...[...markup.matchAll(/\bclass:([\w-]+)/g)].map((m) => m[1]!),
  ].join("\n");
  return merge(classFindings(classes), styles ? cssFindings(styles) : none());
}

type Counts = Record<StyleGroup, Record<string, number>>;
function scanPackage(repo: string, p: (typeof STYLE_PACKAGES)[number]): { counts: Counts; found: Record<StyleGroup, Record<string, string[]>> } {
  const base = join(repo, p.dir);
  const counts = Object.fromEntries(STYLE_GROUPS.map((g) => [g, {}])) as Counts;
  const found = Object.fromEntries(STYLE_GROUPS.map((g) => [g, {}])) as Record<StyleGroup, Record<string, string[]>>;
  for (const f of walk(join(base, p.src)).filter(scanned).sort()) {
    const rel = relative(base, f);
    const r = styleFindings(f, readFileSync(f, "utf8"));
    for (const g of STYLE_GROUPS) if (r[g].length) { counts[g][rel] = r[g].length; found[g][rel] = r[g]; }
  }
  return { counts, found };
}

const baselinePath = (repo: string, name: string): string => join(repo, BASELINE_DIR, `${name}.json`);

/** the problems of one group over every style package against its baseline */
export function styleProblems(repo: string, group: StyleGroup): string[] {
  const problems: string[] = [];
  for (const p of present(repo)) {
    const { counts, found } = scanPackage(repo, p);
    const file = baselinePath(repo, p.name);
    const recorded: Record<string, number> = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")).counts?.[group] ?? {}) : {};
    for (const f of new Set([...Object.keys(counts[group]), ...Object.keys(recorded)])) {
      const n = counts[group][f] ?? 0, allowed = recorded[f] ?? 0;
      if (n > allowed) problems.push(`${p.dir}/${f}: ${n} ${group} finding(s), ${allowed} recorded: ${found[group][f]!.slice(0, 6).join(", ")}`);
      else if (n < allowed) problems.push(`${relative(repo, file)}: ${p.dir}/${f} now holds ${n} ${group} finding(s), ${allowed} recorded; run bun run rules:baseline`);
    }
  }
  return problems;
}

/** write rules/style-baselines/<package>.json (part of `bun run rules:baseline`) */
export function writeStyleBaselines(repo: string): string[] {
  mkdirSync(join(repo, BASELINE_DIR), { recursive: true });
  return present(repo).map((p) => {
    const { counts } = scanPackage(repo, p);
    const totals = Object.fromEntries(STYLE_GROUPS.map((g) => [g, Object.values(counts[g]).reduce((a, b) => a + b, 0)]));
    const doc = { $comment: "Recorded style violations (groups corners, shadows, hardcode, spacing of xgen check) of hand-written code, per group and file. New ones fail; regenerate with: bun run rules:baseline", package: p.dir, totals, counts };
    writeFileSync(baselinePath(repo, p.name), JSON.stringify(doc, null, 2) + "\n");
    return `${relative(repo, baselinePath(repo, p.name))}: ${STYLE_GROUPS.map((g) => `${g} ${totals[g]}`).join(", ")}`;
  });
}
