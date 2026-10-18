// The 8 + 4 grid: no fractional Tailwind step (gap-1.5, px-2.5, size-3.5) in the specs, the builder or the kit assets.
import { expect, test } from "bun:test";
import { join } from "node:path";
import { halfStepProblems, halfSteps } from "../src/spacing";

test("half steps are found in class text, whole steps and other numbers are not", () => {
  expect(halfSteps(`"h-8 gap-1.5 rounded px-3" md:px-2.5 -mt-0.5 size-3.5 opacity-50 leading-1.5 w-1/2`)).toEqual(["gap-1.5", "md:px-2.5", "-mt-0.5", "size-3.5"]);
  expect(halfSteps("gap-2 px-3 size-4 top-1 hover:p-6")).toEqual([]);
});

test("the specs, the builder and the kit assets hold no half step", () => {
  expect(halfStepProblems(join(import.meta.dir, "..", ".."))).toEqual([]);
});
