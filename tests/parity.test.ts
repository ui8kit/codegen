/**
 * Runtime parity — the core guarantee of the engine.
 *
 * For every brick, every part, and every showcase fixture, the generated
 * React, Svelte 5, and Vue 3 components are server-rendered and their
 * normalized DOM must equal the canonical renderer's output (the executable
 * specification derived from the same IR the Templ emitter prints).
 */

import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render as svelteRender } from "svelte/server";
import { createRawSnippet, type Component } from "svelte";
import { createSSRApp, h, type Component as VueComponent } from "vue";
import { renderToString as vueRenderToString } from "@vue/server-renderer";

import { bricks } from "../bricks/index";
import { fileStem, type BrickDef, type PartDef } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { ensureGenerated } from "./support/ensure-generated";
import { loadGeneratedUiModules } from "./support/generated-ui";
import { showcaseCases } from "./support/fixtures";
import { normalizeHtml } from "./support/normalize";
import {
  hasChildren,
  htmlRuntimeProps,
  knownCanonicalProps,
  reactProps,
  vueProps,
  type CanonicalProps,
} from "./support/props";

await ensureGenerated();
const { reactModules, svelteModules, vueModules } = await loadGeneratedUiModules();

const CHILD_TEXT = "Content";

type ReactModule = Record<string, ComponentType<Record<string, unknown>>>;

function reactComponent(brick: BrickDef, part: PartDef) {
  const mod = reactModules[`../generated/ui/${brick.dir}/${fileStem(brick)}.tsx`] as ReactModule;
  const comp = mod?.[part.name];
  if (!comp) throw new Error(`React component ${part.name} not found for ${brick.id}`);
  return comp;
}

function svelteComponent(brick: BrickDef, part: PartDef): Component {
  const mod = svelteModules[`../generated/ui/${brick.dir}/${part.name}.svelte`] as {
    default: Component;
  };
  if (!mod?.default) throw new Error(`Svelte component ${part.name} not found for ${brick.id}`);
  return mod.default;
}

function vueComponent(brick: BrickDef, part: PartDef): VueComponent {
  const mod = vueModules[`../generated/ui/${brick.dir}/${part.name}.vue`] as {
    default: VueComponent;
  };
  if (!mod?.default) throw new Error(`Vue component ${part.name} not found for ${brick.id}`);
  return mod.default;
}

async function renderAllRuntimes(
  brick: BrickDef,
  part: PartDef,
  canonical: CanonicalProps
): Promise<{ canonical: string; react: string; svelte: string; vue: string }> {
  const withChildren = hasChildren(part);

  const canonicalHtml = renderPart(brick, part.name, canonical, {
    children: withChildren ? CHILD_TEXT : undefined,
  });

  const reactHtml = renderToStaticMarkup(
    createElement(
      reactComponent(brick, part),
      reactProps(part, canonical),
      withChildren ? CHILD_TEXT : undefined
    )
  );

  const svelteProps = htmlRuntimeProps(part, canonical);
  if (withChildren) {
    svelteProps["children"] = createRawSnippet(() => ({ render: () => CHILD_TEXT }));
  }
  const svelteHtml = svelteRender(svelteComponent(brick, part), {
    props: svelteProps as Record<string, unknown>,
  }).body;

  const app = createSSRApp({
    render: () =>
      h(
        vueComponent(brick, part),
        vueProps(part, canonical),
        withChildren ? { default: () => CHILD_TEXT } : undefined
      ),
  });
  const vueHtml = await vueRenderToString(app);

  return { canonical: canonicalHtml, react: reactHtml, svelte: svelteHtml, vue: vueHtml };
}

for (const brick of bricks) {
  describe(brick.id.replace(/\./g, "/"), () => {
    const cases = showcaseCases(brick);

    for (const part of brick.parts) {
      const partCases: Array<{ id: string; props: CanonicalProps }> = [
        { id: "defaults", props: {} },
        ...cases
          .map((c) => ({ id: c.id, props: knownCanonicalProps(brick, part, c.props) }))
          .filter((c): c is { id: string; props: CanonicalProps } =>
            c.props !== undefined && Object.keys(c.props).length > 0
          ),
      ];

      for (const testCase of partCases) {
        it(`${part.name} · ${testCase.id}`, async () => {
          const out = await renderAllRuntimes(brick, part, testCase.props);
          const expected = normalizeHtml(out.canonical);
          expect(normalizeHtml(out.react), "react ≠ canonical").toEqual(expected);
          expect(normalizeHtml(out.svelte), "svelte ≠ canonical").toEqual(expected);
          expect(normalizeHtml(out.vue), "vue ≠ canonical").toEqual(expected);
        });
      }
    }
  });
}
