/**
 * Regenerates `generated/` before the test run so parity tests always
 * exercise the current emitters.
 */

import { ensureGenerated } from "./support/ensure-generated";

export default async function setup(): Promise<void> {
  await ensureGenerated();
}
