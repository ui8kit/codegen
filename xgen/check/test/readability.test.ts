import { expect, test } from "bun:test";
import { join } from "node:path";
import { planBuild } from "@ui8kit/xgen-generator";
import { checkHardcode } from "../src/audit";
import { checkReadability, kebab } from "../src/readability";

const repo = join(import.meta.dir, "..", "..", "..");

test("one key per component for both runtimes and both naming styles", () => {
  expect(kebab("HeroSection")).toBe("hero-section");
  expect(kebab("hero-section")).toBe("hero-section");
  expect(kebab("BlocksScreen")).toBe("blocks-screen");
  expect(kebab("CTABand")).toBe("cta-band");
});

test("the readability and hardcode ratchets hold on the workspace", () => {
  const plan = planBuild(repo);
  expect(checkReadability(plan).problems).toEqual([]);
  expect(checkHardcode(plan).problems).toEqual([]);
});
