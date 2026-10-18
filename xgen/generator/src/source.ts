// Source pointers: the second line of a generated file names the file a person changes instead of it.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BANNER, type GeneratedFile } from "@ui8kit/xgen-runtime-core";

/** kebab name of an organism, part or pattern -> the authoring file that defines it (`spec(\`${O}hero-section\`, ...)` or `spec("pattern.feature-cards", ...)`) */
export function authoringIndex(xgenRoot: string): Map<string, string> {
  const dir = join(xgenRoot, "screens", "src", "authoring");
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".ts")) {
        const text = readFileSync(p, "utf8");
        const named = /(?:(?:spec|contract)\(\s*|\bid:\s*)(?:`\$\{\w+\}|["`](?:part|pattern|organism)\.)([a-z0-9-]+)["`]/g;
        for (const m of text.matchAll(named)) if (!out.has(m[1]!)) out.set(m[1]!, relative(join(xgenRoot, ".."), p));
      }
    }
  };
  walk(dir);
  return out;
}

/** the file with `Source: <path>` as its second line, in the comment style of its first line */
export function withSource(file: GeneratedFile, source: string | undefined): GeneratedFile {
  if (!source) return file;
  const [first, ...rest] = file.contents.split("\n");
  if (!first?.includes(BANNER) || rest[0]?.includes("Source:")) return file;
  const line = first.startsWith("<!--") ? `<!-- Source: ${source} -->` : first.startsWith("/*") ? `/* Source: ${source} */` : `// Source: ${source}`;
  return { ...file, contents: [first, line, ...rest].join("\n") };
}
