/**
 * Showcase fixtures: canonical prop payloads per brick, sourced from the
 * colocated `*.data.json` files (same fixtures the upstream registry uses).
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { BrickDef } from "../../src/domain/model";
import { fileStem } from "../../src/domain/model";

const BRICKS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "bricks");

export interface ShowcaseCase {
  id: string;
  props: Record<string, unknown>;
}

export function showcaseCases(brick: BrickDef): ShowcaseCase[] {
  const file = join(BRICKS_ROOT, brick.dir, `${fileStem(brick)}.data.json`);
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    showcase?: Record<string, { props?: Record<string, unknown> }>;
  };
  return Object.entries(data.showcase ?? {}).map(([id, entry]) => ({
    id,
    props: entry.props ?? {},
  }));
}

export function allDataFiles(): string[] {
  return readdirSync(BRICKS_ROOT, { recursive: true, encoding: "utf8" }).filter((f) =>
    f.endsWith(".data.json")
  );
}
