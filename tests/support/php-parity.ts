/**
 * Shared PHP runtime parity suite (Twig, Latte) — real engines, no mocks:
 * Composer installs twig/twig or latte/latte into the generated package,
 * `bin/parity.php` renders every part, and the normalized DOM must equal both
 * the React SSR output (react-dom/server over the generated React components)
 * and the canonical renderer.
 *
 * Without PHP + Composer the suite is skipped locally with a clear message;
 * with UI8KIT_REQUIRE_ALL_RUNTIMES=1 (CI) a missing toolchain is a failure.
 */

import { describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { bricks } from "../../bricks/index";
import { fileStem, type BrickDef, type PartDef, type PropDef } from "../../src/domain/model";
import { renderPart } from "../../src/domain/render";
import { VOID_TAGS } from "../../src/domain/tags";
import { phpItemKey, phpParamName, type PhpRuntime } from "../../src/emitters/php-common";
import { ensureGenerated } from "./ensure-generated";
import { showcaseCases } from "./fixtures";
import { loadGeneratedUiModules } from "./generated-ui";
import { normalizeHtml } from "./normalize";
import { hasChildren, knownCanonicalProps, reactProps, type CanonicalProps } from "./props";

const CHILD_TEXT = "Content";
const REQUIRED = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";
const ok = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;

interface Case {
  brick: BrickDef;
  part: PartDef;
  id: string;
  props: CanonicalProps;
  noChildren?: boolean;
  reactProps?: CanonicalProps;
  canonicalOnly?: string;
}

/** Same matrix as the templ suite: defaults, showcase fixtures, every enum value, every boolean. */
function casesFor(brick: BrickDef, part: PartDef): Case[] {
  const out: Case[] = [{ brick, part, id: "defaults", props: {} }];
  for (const c of showcaseCases(brick)) {
    const props = knownCanonicalProps(brick, part, c.props);
    if (props && Object.keys(props).length > 0) out.push({ brick, part, id: c.id, props });
  }
  const settable = (p: PropDef) => !p.passthrough && ["string", "bool"].includes(p.type) && p.name !== "Class";
  for (const p of part.props.filter(settable)) {
    if (p.enumValues?.length)
      for (const v of p.enumValues) out.push({ brick, part, id: `${p.name}=${v}`, props: { [p.name]: v }, noChildren: VOID_TAGS.has(v) });
    else if (p.type === "bool") out.push({ brick, part, id: p.name, props: { [p.name]: true } });
  }
  for (const [id, c] of Object.entries(EDGE[part.name] ?? {})) out.push({ brick, part, id, ...c });
  return out;
}

const EDGE: Record<string, Record<string, Omit<Case, "brick" | "part" | "id">>> = {
  Input: {
    // Template params default to '': an explicit '' is "unset" (canonical contract);
    // React forwards an explicit "" verbatim.
    // passthrough attrs are nullable: an explicit "" renders value="" (as React), unset omits it
    "empty value": { props: { Value: "" } },
    "empty value via attrs": { props: { Attrs: { value: "" } }, reactProps: { Value: "" } },
  },
  Checkbox: { "empty value": { props: { Value: "" } } },
  Radio: { "empty value": { props: { Value: "" } } },
  Button: {
    escaping: { props: { AriaLabel: 'a"b<c>&', Class: 'x"y' } },
    "href escaping": { props: { Href: '/a?b=1&c="2"' } },
  },
  Text: { "tag fallback": { props: { Tag: "script" } } },
  Select: {
    "options + value": {
      props: {
        Value: "b",
        Options: [
          { Value: "a", Label: "A<&>", Disabled: false },
          { Value: "b", Label: "B", Disabled: true },
        ],
      },
    },
  },
};

/** Canonical (PascalCase) props → template parameters. */
function templateParams(part: PartDef, canonical: CanonicalProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(canonical)) {
    const def = part.props.find((p) => p.name === name);
    if (!def) continue;
    if (def.type === "attrs") out["attrs"] = value;
    else if (def.type === "items")
      out[phpParamName(def)] = (value as Record<string, unknown>[]).map((e) =>
        Object.fromEntries(Object.entries(e).map(([k, v]) => [phpItemKey(k), v]))
      );
    else out[phpParamName(def)] = value;
  }
  return out;
}

export async function phpParitySuite(runtime: PhpRuntime): Promise<void> {
  const ext = runtime === "twig" ? ".html.twig" : ".latte";
  const dir = join(import.meta.dir, "..", "..", "generated", runtime);
  const toolchain = ok("php", ["--version"]) && ok("composer", ["--version"]);
  if (!toolchain) {
    const msg = `${runtime} parity: PHP and/or Composer not found — install PHP >= 8.1 + Composer to run real ${runtime} parity.`;
    if (REQUIRED) {
      describe(`${runtime} runtime parity`, () => {
        it("requires PHP + Composer (UI8KIT_REQUIRE_ALL_RUNTIMES=1)", () => {
          throw new Error(msg);
        });
      });
    } else {
      console.warn(`[skip] ${msg} Set UI8KIT_REQUIRE_ALL_RUNTIMES=1 to make this a failure.`);
      describe.skip(`${runtime} runtime parity (skipped: no PHP toolchain)`, () => {
        it("skipped", () => {});
      });
    }
    return;
  }

  await ensureGenerated();
  const run = (cmd: string, args: string[], input?: string) =>
    execFileSync(cmd, args, {
      cwd: dir,
      input,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "inherit"],
    });
  run("composer", ["install", "--no-interaction", "--no-progress", "--quiet"]);

  const allCases = bricks.flatMap((b) => b.parts.flatMap((p) => casesFor(b, p)));
  const stdout = run(
    "php",
    ["bin/parity.php"],
    JSON.stringify(
      allCases.map((c) => ({
        template: `${c.brick.dir}/${c.part.name}${ext}`,
        params: templateParams(c.part, c.props),
        children: hasChildren(c.part) && !c.noChildren ? CHILD_TEXT : "",
      }))
    )
  );
  const html = JSON.parse(stdout) as string[];
  if (html.length !== allCases.length) throw new Error(`${runtime} parity: harness returned a wrong count`);

  const { reactModules } = await loadGeneratedUiModules();
  const reactComponent = (brick: BrickDef, part: PartDef) => {
    const mod = reactModules[`../generated/ui/${brick.dir}/${fileStem(brick)}.tsx`] as
      | Record<string, ComponentType<Record<string, unknown>>>
      | undefined;
    const comp = mod?.[part.name];
    if (!comp) throw new Error(`React component ${part.name} not found for ${brick.id}`);
    return comp;
  };

  for (const brick of bricks) {
    describe(`${runtime} ${brick.id.replace(/\./g, "/")}`, () => {
      allCases.forEach((c, i) => {
        if (c.brick !== brick) return;
        it(`[${runtime}] ${c.part.name} · ${c.id}`, () => {
          const children = hasChildren(c.part) && !c.noChildren ? CHILD_TEXT : undefined;
          const got = normalizeHtml(html[i]!);
          if (!c.canonicalOnly) {
            const react = renderToStaticMarkup(
              createElement(reactComponent(brick, c.part), reactProps(c.part, c.reactProps ?? c.props), children)
            ).replace(/<link rel="preload"[^>]*\/?>/g, "");
            expect(got, `${runtime} ≠ react`).toEqual(normalizeHtml(react));
          }
          const { Attrs: rest, ...canonicalProps } = c.props as CanonicalProps & { Attrs?: Record<string, string> };
          const canonical = renderPart(brick, c.part.name, canonicalProps, { children, rest });
          expect(got, `${runtime} ≠ canonical`).toEqual(normalizeHtml(canonical));
        });
      });
    });
  }
}
