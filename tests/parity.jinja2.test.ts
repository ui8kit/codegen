/**
 * Jinja2 runtime parity — real engine, no mocks: Python Jinja2 renders every
 * generated `.html.j2` part through `generated/jinja2/parity.py`, and the
 * normalized DOM must equal both the React SSR output (react-dom/server over
 * the generated React components) and the canonical renderer.
 *
 * Without python3 + Jinja2 the suite is skipped locally with a clear message;
 * with UI8KIT_REQUIRE_ALL_RUNTIMES=1 (CI) a missing toolchain is a failure.
 */

import { describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { bricks } from "../bricks/index";
import { fileStem, type BrickDef, type PartDef, type PropDef } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { VOID_TAGS } from "../src/domain/tags";
import { jinjaTemplateOf } from "../src/emitters/jinja2";
import { ensureGenerated } from "./support/ensure-generated";
import { loadGeneratedUiModules } from "./support/generated-ui";
import { showcaseCases } from "./support/fixtures";
import { normalizeHtml } from "./support/normalize";
import { hasChildren, knownCanonicalProps, reactProps, type CanonicalProps } from "./support/props";

const ROOT = join(import.meta.dir, "..", "generated", "jinja2");
const CHILD_HTML = "<b>Content</b>";
const REQUIRED = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";
const PYTHON = process.env["PYTHON"] ?? "python3";

const jinjaAvailable = spawnSync(PYTHON, ["-c", "import jinja2"], { stdio: "ignore" }).status === 0;

interface Case {
  brick: BrickDef;
  part: PartDef;
  id: string;
  props: CanonicalProps;
  /** void tag selected (Box tag=col): React forbids children there. */
  noChildren?: boolean;
  /** canonical props for the React side when the Jinja call differs (Attrs escape hatch). */
  reactProps?: CanonicalProps;
}

/** defaults, every showcase fixture, every enum value, every boolean set. */
function casesFor(brick: BrickDef, part: PartDef): Case[] {
  const out: Case[] = [{ brick, part, id: "defaults", props: {} }];
  for (const c of showcaseCases(brick)) {
    const props = knownCanonicalProps(brick, part, c.props);
    if (props && Object.keys(props).length > 0) out.push({ brick, part, id: c.id, props });
  }
  const settable = (p: PropDef) => !p.passthrough && ["string", "bool"].includes(p.type) && p.name !== "Class";
  for (const p of part.props.filter(settable)) {
    if (p.enumValues?.length) for (const v of p.enumValues) out.push({ brick, part, id: `${p.name}=${v}`, props: { [p.name]: v }, noChildren: VOID_TAGS.has(v) });
    else if (p.type === "bool") out.push({ brick, part, id: p.name, props: { [p.name]: true } });
  }
  for (const [id, c] of Object.entries(EDGE[part.name] ?? {})) out.push({ brick, part, id, ...c });
  return out;
}

/** Edge cases: empty input value, attribute escaping, tag fallback. */
const EDGE: Record<string, Record<string, Omit<Case, "brick" | "part" | "id">>> = {
  Input: {
    // Explicit empty value: the canonical contract omits value="" (blank string);
    // through the Attrs escape hatch it is forwarded like React's value="".
    "empty value via Attrs": { props: { Attrs: { value: "" } }, reactProps: { Value: "" } },
  },
  Button: {
    escaping: { props: { AriaLabel: 'a"b<c>&', Class: 'x"y' } },
    "href escaping": { props: { Href: '/a?b=1&c="2"' } },
  },
  Text: { "tag fallback": { props: { Tag: "script" } } },
};

const allCases = bricks.flatMap((b) => b.parts.flatMap((p) => casesFor(b, p)));

if (!jinjaAvailable) {
  const msg = `jinja2 parity: ${PYTHON} with Jinja2 not found — \`pip install -r generated/jinja2/requirements.txt\` to run real Jinja2 parity.`;
  if (REQUIRED) {
    describe("jinja2 runtime parity", () => {
      it("requires python3 + Jinja2 (UI8KIT_REQUIRE_ALL_RUNTIMES=1)", () => {
        throw new Error(msg);
      });
    });
  } else {
    console.warn(`[skip] ${msg} Set UI8KIT_REQUIRE_ALL_RUNTIMES=1 to make this a failure.`);
    describe.skip("jinja2 runtime parity (skipped: no python3/Jinja2)", () => {
      it("skipped", () => {});
    });
  }
} else {
  await ensureGenerated();
  const stdout = execFileSync(PYTHON, ["parity.py"], {
    cwd: ROOT,
    input: JSON.stringify(
      allCases.map((c) => ({
        template: jinjaTemplateOf(c.brick, c.part),
        p: c.props,
        children: hasChildren(c.part) && !c.noChildren ? CHILD_HTML : "",
      }))
    ),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "inherit"],
  });
  const jinjaHtml = JSON.parse(stdout) as string[];
  if (jinjaHtml.length !== allCases.length) throw new Error("jinja2 parity: harness returned a wrong count");

  const { reactModules } = await loadGeneratedUiModules();
  const reactComponent = (brick: BrickDef, part: PartDef) => {
    const mod = reactModules[`../generated/ui/${brick.dir}/${fileStem(brick)}.tsx`] as
      | Record<string, ComponentType<Record<string, unknown>>>
      | undefined;
    const comp = mod?.[part.name];
    if (!comp) throw new Error(`React component ${part.name} not found for ${brick.id}`);
    return comp;
  };
  const reactChild = () => createElement("b", null, "Content");

  for (const brick of bricks) {
    describe(`jinja2 ${brick.id.replace(/\./g, "/")}`, () => {
      allCases.forEach((c, i) => {
        if (c.brick !== brick) return;
        it(`[jinja2] ${c.part.name} · ${c.id}`, () => {
          const withChildren = hasChildren(c.part) && !c.noChildren;
          const jinja = normalizeHtml(jinjaHtml[i]!);
          const react = renderToStaticMarkup(
            createElement(reactComponent(brick, c.part), reactProps(c.part, c.reactProps ?? c.props), withChildren ? reactChild() : undefined)
          ).replace(/<link rel="preload"[^>]*\/?>/g, "");
          expect(jinja, "jinja2 ≠ react").toEqual(normalizeHtml(react));
          const { Attrs: rest, ...canonicalProps } = c.props as CanonicalProps & { Attrs?: Record<string, string> };
          const canonical = renderPart(brick, c.part.name, canonicalProps, { children: withChildren ? CHILD_HTML : undefined, rest });
          expect(jinja, "jinja2 ≠ canonical").toEqual(normalizeHtml(canonical));
        });
      });
    });
  }
}
