/**
 * Templ runtime parity — renders every generated .templ part through a Go
 * harness (`cmd/parity`) and asserts the normalized DOM equals the canonical
 * renderer's output. Requires a Go toolchain; the suite is skipped when
 * `go` is not installed.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { bricks } from "../bricks/index";
import { fileStem } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { showcaseCases } from "./support/fixtures";
import { normalizeHtml } from "./support/normalize";
import { hasChildren, knownCanonicalProps, type CanonicalProps } from "./support/props";

const GENERATED = join(dirname(fileURLToPath(import.meta.url)), "..", "generated");
const CHILD_TEXT = "Content";

function goAvailable(): boolean {
  return spawnSync("go", ["version"], { stdio: "ignore" }).status === 0;
}

interface Case {
  name: string;
  props: CanonicalProps;
  children: string;
  expected: string;
  label: string;
}

const available = goAvailable();

describe.skipIf(!available)("templ runtime parity", () => {
  const casesList: Case[] = [];
  for (const brick of bricks) {
    const showcases = showcaseCases(brick);
    for (const part of brick.parts) {
      const partCases: Array<{ id: string; props: CanonicalProps }> = [
        { id: "defaults", props: {} },
        ...showcases
          .map((c) => ({ id: c.id, props: knownCanonicalProps(brick, part, c.props) }))
          .filter((c): c is { id: string; props: CanonicalProps } =>
            c.props !== undefined && Object.keys(c.props).length > 0
          ),
      ];
      for (const testCase of partCases) {
        const children = hasChildren(part) ? CHILD_TEXT : "";
        casesList.push({
          name: `${brick.dir}/${fileStem(brick)}/${part.name}`,
          props: testCase.props,
          children,
          expected: renderPart(brick, part.name, testCase.props, {
            children: children || undefined,
          }),
          label: `${brick.id} ${part.name} · ${testCase.id}`,
        });
      }
    }
  }

  it("renders all parts identically to the canonical renderer", { timeout: 300_000 }, () => {
    execFileSync("go", ["run", "github.com/a-h/templ/cmd/templ@v0.3.1001", "generate"], {
      cwd: GENERATED,
      stdio: ["ignore", "ignore", "inherit"],
    });
    const stdout = execFileSync("go", ["run", "./cmd/parity"], {
      cwd: GENERATED,
      input: JSON.stringify(
        casesList.map((c) => ({ name: c.name, props: c.props, children: c.children }))
      ),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const results = JSON.parse(stdout) as string[];
    expect(results).toHaveLength(casesList.length);
    for (let i = 0; i < casesList.length; i++) {
      const c = casesList[i]!;
      expect(normalizeHtml(results[i]!), `templ ≠ canonical: ${c.label}`).toEqual(
        normalizeHtml(c.expected)
      );
    }
  });
});
