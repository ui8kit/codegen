/**
 * Load generated React/Svelte/Vue/Solid modules without Vite's import.meta.glob so
 * parity tests run under `bun test` as well as Vitest.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GENERATED_UI = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "generated", "ui");

export interface GeneratedUiModules {
  reactModules: Record<string, Record<string, unknown>>;
  svelteModules: Record<string, { default: unknown }>;
  vueModules: Record<string, { default: unknown }>;
  solidModules: Record<string, Record<string, unknown>>;
}

function partitionTsx(
  all: Record<string, unknown>
): {
  reactModules: Record<string, Record<string, unknown>>;
  solidModules: Record<string, Record<string, unknown>>;
} {
  const reactModules: Record<string, Record<string, unknown>> = {};
  const solidModules: Record<string, Record<string, unknown>> = {};
  for (const [key, mod] of Object.entries(all)) {
    if (key.endsWith(".solid.tsx")) solidModules[key] = mod as Record<string, unknown>;
    else reactModules[key] = mod as Record<string, unknown>;
  }
  return { reactModules, solidModules };
}

/** Eager-load every generated ui component module (tsx, solid.tsx, svelte, vue). */
export async function loadGeneratedUiModules(): Promise<GeneratedUiModules> {
  const globFn = (
    import.meta as ImportMeta & {
      glob?: (pattern: string, options: { eager: true }) => Record<string, unknown>;
    }
  ).glob;

  if (typeof globFn === "function") {
    const { reactModules, solidModules } = partitionTsx(
      globFn("../generated/ui/*/*.tsx", { eager: true })
    );
    return {
      reactModules,
      solidModules,
      svelteModules: globFn("../generated/ui/*/*.svelte", { eager: true }) as GeneratedUiModules["svelteModules"],
      vueModules: globFn("../generated/ui/*/*.vue", { eager: true }) as GeneratedUiModules["vueModules"],
    };
  }

  const reactModules: Record<string, Record<string, unknown>> = {};
  const svelteModules: Record<string, { default: unknown }> = {};
  const vueModules: Record<string, { default: unknown }> = {};
  const solidModules: Record<string, Record<string, unknown>> = {};

  if (!existsSync(GENERATED_UI)) {
    return { reactModules, svelteModules, vueModules, solidModules };
  }

  for (const dir of readdirSync(GENERATED_UI)) {
    const dirPath = join(GENERATED_UI, dir);
    if (!statSync(dirPath).isDirectory()) continue;

    for (const file of readdirSync(dirPath)) {
      const relKey = `../generated/ui/${dir}/${file}`;
      const url = pathToFileURL(join(dirPath, file)).href;

      if (file.endsWith(".solid.tsx")) {
        solidModules[relKey] = (await import(url)) as Record<string, unknown>;
      } else if (file.endsWith(".tsx")) {
        reactModules[relKey] = (await import(url)) as Record<string, unknown>;
      } else if (file.endsWith(".svelte")) {
        svelteModules[relKey] = (await import(url)) as { default: unknown };
      } else if (file.endsWith(".vue")) {
        vueModules[relKey] = (await import(url)) as { default: unknown };
      }
    }
  }

  return { reactModules, svelteModules, vueModules, solidModules };
}
