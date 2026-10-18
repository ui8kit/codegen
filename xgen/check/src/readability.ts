// The `readability` group of `xgen check`: generated components stay short enough for a junior to read in one sitting.
// Limits live in audit-rules.ts; the files that still exceed them are listed, with their current numbers, in readability-allow.ts.
// The allowlist is a ratchet: a file may not get worse, and once it gets better its entry must be lowered (or removed).
import type { Plan } from "@ui8kit/xgen-generator";
import type { CheckResult } from "./result";
import { READABILITY } from "./audit-rules";
import { READABILITY_ALLOW, type Measure } from "./readability-allow";

/** HeroSection.svelte, hero-section.tsx, hero-section.vue -> hero-section: one key for every runtime and naming style */
export const kebab = (stem: string): string => stem.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();

const SKIP = [/\/utils\//, /\/styles\//, /lucide-icons\.ts$/, /\/index\.ts$/, /\.types\.ts$/, /\.assets\.ts$/, /\.json$/, /\.md$/, /\.css$/];

/** what the check measures, per component key (the worst of the runtimes) */
export function measure(plan: Plan): Record<string, Measure> {
  const out: Record<string, Measure> = {};
  const put = (key: string, m: Measure): void => {
    const o = (out[key] ??= {});
    for (const [k, v] of Object.entries(m) as Array<[keyof Measure, number]>) o[k] = Math.max(o[k] ?? 0, v);
  };
  for (const t of plan.targets) {
    const screens = t.kind === "app";
    for (const f of t.files) {
      const inPkg = t.kind === "package" && t.runtime !== "core" && f.path.startsWith("src/");
      // a screen, or one page of a chunked screen (screens/BlocksScreen/HeroPage.svelte -> screen:blocks-screen/hero-page)
      const inHost = screens && /\/screens\/(?:[^/]+\/)?[^/]+\.(svelte|vue|tsx)$/.test(f.path);
      if (!(inPkg || inHost) || SKIP.some((r) => r.test(f.path))) continue;
      const lines = f.contents.split("\n");
      const stem = f.path.split("/").pop()!.replace(/\.(svelte|vue|tsx|ts)$/, "");
      const limit = inHost ? READABILITY.screenLines : READABILITY.fileLines;
      const key = inHost ? `screen:${f.path.split("/screens/")[1]!.replace(/\.(svelte|vue|tsx)$/, "").split("/").map(kebab).join("/")}` : kebab(stem);
      const m: Measure = {};
      if (lines.length > limit) m.lines = lines.length;
      const long = lines.filter((l) => l.length > READABILITY.lineChars).length;
      if (long) m.long = long;
      if (f.contents.length > READABILITY.fileBytes && !inHost) m.bytes = f.contents.length;
      put(key, m);
    }
  }
  for (const o of plan.inputs.organisms) { const n = o.value.props.filter((p) => p.name !== "landmarkLabel").length; if (n > READABILITY.props) put(kebab(o.value.name), { props: n }); }
  for (const { brick } of plan.bricks) for (const p of brick.parts) {
    const n = p.props.filter((x) => !["Class", "Attrs", "Children"].includes(x.name)).length;
    if (n > READABILITY.props) put(kebab(p.name), { props: n });
  }
  for (const k of Object.keys(out)) if (!Object.keys(out[k]!).length) delete out[k];
  return out;
}

const WHAT: Record<keyof Measure, string> = { lines: "lines", long: `lines over ${READABILITY.lineChars} characters`, bytes: "bytes", props: "props" };

export function checkReadability(plan: Plan): CheckResult {
  const problems: string[] = [];
  const now = measure(plan);
  for (const key of new Set([...Object.keys(now), ...Object.keys(READABILITY_ALLOW)])) {
    const m = now[key] ?? {}, a = READABILITY_ALLOW[key] ?? {};
    for (const k of Object.keys(WHAT) as Array<keyof Measure>) {
      const got = m[k] ?? 0, allowed = a[k] ?? 0;
      if (got > allowed) problems.push(`${key}: ${got} ${WHAT[k]}${allowed ? ` (allowed ${allowed} while migrating)` : ""}; the limit is ${k === "long" ? 0 : k === "lines" ? (key.startsWith("screen:") ? READABILITY.screenLines : READABILITY.fileLines) : k === "bytes" ? READABILITY.fileBytes : READABILITY.props}: split it into smaller components`);
      else if (got < allowed) problems.push(`xgen/check/src/readability-allow.ts: ${key} ${k} is now ${got || "within the limit"}; lower the allowance from ${allowed}`);
    }
  }
  const l = READABILITY;
  return { name: "readability", what: `generated files up to ${l.fileLines} lines (screens ${l.screenLines}), ${l.fileBytes} bytes, lines up to ${l.lineChars} characters, components up to ${l.props} props (ratchet: readability-allow.ts)`, problems };
}
