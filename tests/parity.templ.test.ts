/**
 * Templ runtime parity — real engine, no mocks: `templ generate` compiles the
 * generated `.templ` files, `go run ./cmd/parity` renders every part, and the
 * normalized DOM must equal both the React SSR output (react-dom/server over
 * the generated React components) and the canonical renderer.
 *
 * Without a Go toolchain the suite is skipped locally with a clear message;
 * with UI8KIT_REQUIRE_ALL_RUNTIMES=1 (CI) a missing toolchain is a failure.
 */

import { describe, expect, it } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { bricks } from "../bricks/index";
import { fileStem, type BrickDef, type PartDef, type PropDef } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { VOID_TAGS } from "../src/domain/tags";
import { TEMPL_VERSION } from "../src/emitters/templ";
import { ensureGenerated } from "./support/ensure-generated";
import { loadGeneratedUiModules } from "./support/generated-ui";
import { showcaseCases } from "./support/fixtures";
import { normalizeHtml } from "./support/normalize";
import { hasChildren, knownCanonicalProps, reactProps, type CanonicalProps } from "./support/props";

const MODULE_DIR = join(import.meta.dir, "..", "generated", "templ");
const CHILD_TEXT = "Content";
const REQUIRED = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";

const ok = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "ignore" }).status === 0;
const goAvailable = ok("go", ["version"]);

/** templ CLI: PATH, ~/go/bin, else `go run` at the pinned version. */
function templCommand(): [string, string[]] {
  if (ok("templ", ["version"])) return ["templ", []];
  const local = join(homedir(), "go", "bin", "templ");
  if (existsSync(local)) return [local, []];
  return ["go", ["run", `github.com/a-h/templ/cmd/templ@${TEMPL_VERSION}`]];
}

interface Case {
  brick: BrickDef;
  part: PartDef;
  id: string;
  props: CanonicalProps;
  /** void tag selected (Box tag=col): React forbids children there. */
  noChildren?: boolean;
  /** canonical props for the React side when the Go call differs (Attrs escape hatch). */
  reactProps?: CanonicalProps;
  /** compare to the canonical renderer only (documented React divergence). */
  canonicalOnly?: string;
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

/** Edge cases named in the templ contract: empty input value, attribute escaping. */
const EDGE: Record<string, Record<string, Omit<Case, "brick" | "part" | "id">>> = {
  Input: {
    // Go strings cannot tell "unset" from "": Value "" omits the attribute
    // (the canonical contract); React forwards an explicit "" verbatim.
    "empty value": { props: { Value: "" }, canonicalOnly: "React prints value=\"\" for an explicit empty passthrough" },
    // Explicit empty value through the Attrs escape hatch matches React's value="".
    "empty value via Attrs": { props: { Attrs: { value: "" } }, reactProps: { Value: "" } },
  },
  Button: {
    escaping: { props: { AriaLabel: 'a"b<c>&', Class: 'x"y' } },
    "href escaping": { props: { Href: '/a?b=1&c="2"' } },
  },
  Text: { "tag fallback": { props: { Tag: "script" } } },
};

const allCases = bricks.flatMap((b) => b.parts.flatMap((p) => casesFor(b, p)));

if (!goAvailable) {
  const msg =
    "templ parity: Go toolchain not found — install Go (see go.mod in generated/templ) to run real templ parity.";
  if (REQUIRED) {
    describe("templ runtime parity", () => {
      it("requires Go + templ (UI8KIT_REQUIRE_ALL_RUNTIMES=1)", () => {
        throw new Error(msg);
      });
    });
  } else {
    console.warn(`[skip] ${msg} Set UI8KIT_REQUIRE_ALL_RUNTIMES=1 to make this a failure.`);
    describe.skip("templ runtime parity (skipped: no Go toolchain)", () => {
      it("skipped", () => {});
    });
  }
} else {
  await ensureGenerated();
  const [templBin, templArgs] = templCommand();
  const run = (cmd: string, args: string[], input?: string) =>
    execFileSync(cmd, args, {
      cwd: MODULE_DIR,
      input,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "inherit"],
    });
  run(templBin, [...templArgs, "generate"]);
  run("go", ["vet", "./..."]);
  const stdout = run(
    "go",
    ["run", "./cmd/parity"],
    JSON.stringify(
      allCases.map((c) => ({
        name: `${c.brick.dir}/${c.part.name}`,
        props: c.props,
        children: hasChildren(c.part) && !c.noChildren ? CHILD_TEXT : "",
      }))
    )
  );
  const templHtml = JSON.parse(stdout) as string[];
  if (templHtml.length !== allCases.length) throw new Error("templ parity: harness returned a wrong count");

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
    describe(`templ ${brick.id.replace(/\./g, "/")}`, () => {
      allCases.forEach((c, i) => {
        if (c.brick !== brick) return;
        it(`[templ] ${c.part.name} · ${c.id}`, () => {
          const children = hasChildren(c.part) && !c.noChildren ? CHILD_TEXT : undefined;
          const templ = normalizeHtml(templHtml[i]!);
          const reactSide = c.reactProps ?? c.props;
          if (!c.canonicalOnly) {
            const react = renderToStaticMarkup(
              createElement(reactComponent(brick, c.part), reactProps(c.part, reactSide), children)
            ).replace(/<link rel="preload"[^>]*\/?>/g, "");
            expect(templ, "templ ≠ react").toEqual(normalizeHtml(react));
          }
          const { Attrs: rest, ...canonicalProps } = c.props as CanonicalProps & { Attrs?: Record<string, string> };
          const canonical = renderPart(brick, c.part.name, canonicalProps, { children, rest });
          expect(templ, "templ ≠ canonical").toEqual(normalizeHtml(canonical));
        });
      });
    });
  }
}
