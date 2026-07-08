/**
 * Twig runtime parity — same contract as parity.latte.test.ts, rendered
 * through `cmd/parity-twig` with the UI8Kit Twig extension.
 */

import { describe, it } from "vitest";

import { phpAvailable, runPhpParity } from "./support/php";

describe.skipIf(!phpAvailable())("twig runtime parity", () => {
  it("renders all supported parts identically to the canonical renderer", { timeout: 120_000 }, () => {
    runPhpParity("parity-twig", "html.twig");
  });
});
