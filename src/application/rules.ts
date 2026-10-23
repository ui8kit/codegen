/**
 * Agent rules export — one Cursor rule file per runtime
 * (`rules/<runtime>/ui8kit-primitives.mdc`), filled from the JSON spec and the
 * templates in `templates/rules/`. `{kit}` and `{globs}` are left in place for
 * the installer (ui8kit CLI `init`) to substitute with the app's paths;
 * `rules/<runtime>/rules.json` carries the default globs.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { BrickDef } from "../domain/model";
import type { GeneratedFile } from "../emitters/common";
import type { RuntimeName } from "./generate";
import { buildSpecs } from "./specs";

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates", "rules");
export const RULES_FILE = "ui8kit-primitives.mdc";

interface RuntimeRules {
  title: string;
  ext: string;
  importHint: string;
  lucidePackage: string;
  example: string;
}

export async function rulesFiles(bricks: BrickDef[], runtimes: RuntimeName[]): Promise<GeneratedFile[]> {
  if (runtimes.length === 0) return [];
  const template = await readFile(join(TEMPLATES, "primitives.mdc"), "utf8");
  const data = JSON.parse(await readFile(join(TEMPLATES, "runtimes.json"), "utf8")) as Record<string, RuntimeRules>;
  const specs = buildSpecs(bricks);

  const table = specs.primitives
    .flatMap((p) =>
      p.parts.map((part) => {
        const tags = part.elements.length > 6 ? `${part.elements.slice(0, 6).join(", ")}, … (via \`tag\`)` : part.elements.join(", ");
        return `| \`${part.name}\` | ${tags.replace(/(\w+)(?=,|$| …)/g, "`<$1>`")} |`;
      })
    )
    .join("\n");
  const tagGroups = Object.entries(specs.tagGroups)
    .map(([group, tags]) => `- \`${group}\`: ${(tags as readonly string[]).map((t) => `\`${t}\``).join(", ")}`)
    .join("\n");
  const aria = [
    ...new Set(
      specs.primitives.flatMap((p) => p.parts.flatMap((part) => part.props.map((pr) => pr.html))).filter((n) => n.startsWith("aria-"))
    ),
  ]
    .slice(0, 4)
    .map((n) => `\`${n}\``)
    .join(", ");

  return runtimes.map((runtime) => {
    const rt = data[runtime];
    if (!rt) throw new Error(`templates/rules/runtimes.json: missing runtime ${runtime}`);
    const values: Record<string, string> = {
      runtimeTitle: rt.title,
      importHint: rt.importHint,
      primitiveTable: table,
      tagGroups,
      ariaExamples: aria,
      lucidePackage: rt.lucidePackage,
      example: rt.example,
    };
    const contents = template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`templates/rules/primitives.mdc: unknown placeholder {{${key}}}`);
      return v;
    });
    // Installer metadata: globs relative to the app's install root (`dir`).
    const meta = { file: RULES_FILE, globs: [`**/*.${rt.ext}`] };
    return [
      { path: `rules/${runtime}/${RULES_FILE}`, contents },
      { path: `rules/${runtime}/rules.json`, contents: JSON.stringify(meta, null, 2) + "\n" },
    ];
  }).flat();
}
