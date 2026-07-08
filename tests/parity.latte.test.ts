/**
 * Latte runtime parity — renders every generated .latte part through the PHP
 * harness (`cmd/parity-latte`) and asserts the normalized DOM equals the
 * canonical renderer's output. Requires a PHP toolchain; skipped otherwise.
 * Parts outside the PHP support predicate are not generated (see
 * src/domain/php-support.ts) and are excluded here symmetrically.
 */

import { describe, it } from "vitest";

import { phpAvailable, runPhpParity } from "./support/php";

describe.skipIf(!phpAvailable())("latte runtime parity", () => {
  it("renders all supported parts identically to the canonical renderer", { timeout: 120_000 }, () => {
    runPhpParity("parity-latte", "latte");
  });
});
