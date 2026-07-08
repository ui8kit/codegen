/**
 * PHP parity support: toolchain detection and the shared batch runner for
 * the generated Latte/Twig harnesses (`cmd/parity-latte`, `cmd/parity-twig`).
 * Suites are skipped when php is not installed — same policy as Go Templ.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

import { bricks } from "../../bricks/index";
import { phpSupported } from "../../src/domain/php-support";
import { renderPart } from "../../src/domain/render";
import { showcaseCases } from "./fixtures";
import { normalizeHtml } from "./normalize";
import { hasChildren, knownCanonicalProps, phpProps, type CanonicalProps } from "./props";

export const GENERATED = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "generated");

export function phpAvailable(): boolean {
  return spawnSync("php", ["-v"], { stdio: "ignore" }).status === 0;
}

/** PHP parity needs vendor deps; skip when composer is missing and vendor is not installed. */
export function phpParityAvailable(): boolean {
  if (!phpAvailable()) return false;
  if (existsSync(join(GENERATED, "php", "vendor", "autoload.php"))) return true;
  return spawnSync("composer", ["--version"], { stdio: "ignore" }).status === 0;
}

/** Install Latte/Twig into generated/php/vendor once per checkout. */
export function ensureComposerInstall(): void {
  if (existsSync(join(GENERATED, "php", "vendor", "autoload.php"))) return;
  execFileSync("composer", ["install", "--no-interaction", "--quiet"], {
    cwd: GENERATED,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

export interface PhpCase {
  template: string;
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  children: string;
}

export function runPhpHarness(harness: "parity-latte" | "parity-twig", cases: PhpCase[]): string[] {
  const stdout = execFileSync("php", [join("cmd", harness, "main.php")], {
    cwd: GENERATED,
    input: JSON.stringify(cases),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(stdout) as string[];
}

const CHILD_TEXT = "Content";

interface ParityCase extends PhpCase {
  expected: string;
  label: string;
}

function buildCases(ext: string): ParityCase[] {
  const out: ParityCase[] = [];
  for (const brick of bricks) {
    const showcases = showcaseCases(brick);
    for (const part of brick.parts) {
      if (!phpSupported(part).ok) continue;
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
        out.push({
          template: `${brick.dir}/${part.name}.${ext}`,
          props: phpProps(part, testCase.props),
          attrs: {},
          children,
          expected: renderPart(brick, part.name, testCase.props, {
            children: children || undefined,
          }),
          label: `${brick.id} ${part.name} · ${testCase.id}`,
        });
      }
    }
  }
  return out;
}

/** Render every supported part × fixture and assert DOM parity. */
export function runPhpParity(harness: "parity-latte" | "parity-twig", ext: string): void {
  const cases = buildCases(ext);
  ensureComposerInstall();
  const results = runPhpHarness(
    harness,
    cases.map(({ template, props, attrs, children }) => ({ template, props, attrs, children }))
  );
  expect(results).toHaveLength(cases.length);
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    expect(normalizeHtml(results[i]!), `${harness} ≠ canonical: ${c.label}`).toEqual(
      normalizeHtml(c.expected)
    );
  }
}
