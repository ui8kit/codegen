/**
 * Write `generated/` before parity tests. Vitest runs this via global-setup;
 * `bun test` has no global hook, so importers call it at module load.
 */

import { bricks } from "../../bricks/index";
import { generateFiles, writeFiles } from "../../src/application/generate";

let done = false;

export async function ensureGenerated(): Promise<void> {
  if (done) return;
  await writeFiles(await generateFiles(bricks), "generated");
  done = true;
}
