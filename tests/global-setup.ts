/**
 * Regenerates `generated/` before the test run so parity tests always
 * exercise the current emitters.
 */

import { bricks } from "../bricks/index";
import { generateFiles, writeFiles } from "../src/application/generate";

export default async function setup(): Promise<void> {
  const files = await generateFiles(bricks);
  await writeFiles(files, "generated");
}
