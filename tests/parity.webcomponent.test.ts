/**
 * Web Components parity — the generated vanilla `render<Part>()` functions and
 * the light-DOM custom elements (`<ui8-*>`, which replace themselves with the
 * primitive) must produce the canonical DOM. Rendered in happy-dom.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { bricks } from "../bricks/index";
import { fileStem, type PartDef } from "../src/domain/model";
import { renderPart } from "../src/domain/render";
import { kebab } from "../src/emitters/webcomponent";
import { ensureGenerated } from "./support/ensure-generated";
import { showcaseCases } from "./support/fixtures";
import { normalizeHtml } from "./support/normalize";
import { hasChildren, htmlRuntimeProps, knownCanonicalProps, type CanonicalProps } from "./support/props";

await ensureGenerated();

const GENERATED_UI = join(dirname(fileURLToPath(import.meta.url)), "..", "generated", "ui");
const CHILD_TEXT = "Content";
const GLOBALS = ["window", "document", "customElements", "HTMLElement", "Node", "Element"] as const;

const win = new Window({ url: "http://localhost/" });
const saved: Record<string, unknown> = {};

beforeAll(() => {
  for (const k of GLOBALS) {
    saved[k] = (globalThis as Record<string, unknown>)[k];
    (globalThis as Record<string, unknown>)[k] =
      k === "window" ? win : (win as unknown as Record<string, unknown>)[k];
  }
});

afterAll(() => {
  for (const k of GLOBALS) (globalThis as Record<string, unknown>)[k] = saved[k];
  void win.happyDOM.close();
});

type WcModule = Record<string, unknown>;
const modules: Record<string, WcModule> = {};
for (const brick of bricks) {
  modules[brick.id] = (await import(
    pathToFileURL(join(GENERATED_UI, brick.dir, `${fileStem(brick)}.wc.ts`)).href
  )) as WcModule;
}

function hostAttrs(part: PartDef, props: Record<string, unknown>): string {
  return Object.entries(props)
    .map(([k, v]) => {
      if (v === false || v === undefined || v === null) return "";
      if (v === true) return ` ${k}`;
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return ` ${k}="${s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
    })
    .join("");
}

let seq = 0;

for (const brick of bricks) {
  describe(brick.id.replace(/\./g, "/"), () => {
    const showcases = showcaseCases(brick);
    for (const part of brick.parts) {
      const cases: Array<{ id: string; props: CanonicalProps }> = [
        { id: "defaults", props: {} },
        ...showcases
          .map((c) => ({ id: c.id, props: knownCanonicalProps(brick, part, c.props) }))
          .filter((c): c is { id: string; props: CanonicalProps } =>
            c.props !== undefined && Object.keys(c.props).length > 0
          ),
      ];
      for (const c of cases) {
        const withChildren = hasChildren(part);
        const expected = () =>
          normalizeHtml(
            renderPart(brick, part.name, c.props, { children: withChildren ? CHILD_TEXT : undefined })
          );
        const props = htmlRuntimeProps(part, c.props);

        it(`[webcomponent] ${part.name} · ${c.id} · render()`, () => {
          const render = modules[brick.id]![`render${part.name}`] as (
            p: Record<string, unknown>,
            children?: unknown
          ) => { outerHTML: string };
          const el = render(props, withChildren ? CHILD_TEXT : []);
          expect(normalizeHtml(el.outerHTML)).toEqual(expected());
        });

        it(`[webcomponent] ${part.name} · ${c.id} · <custom-element>`, () => {
          const tag = `t${seq++}-${kebab(part.name)}`;
          (modules[brick.id]![`define${part.name}`] as (t: string) => void)(tag);
          const host = win.document.createElement("div");
          host.innerHTML = `<${tag}${hostAttrs(part, props)}>${withChildren ? CHILD_TEXT : ""}</${tag}>`;
          win.document.body.appendChild(host);
          const html = host.innerHTML;
          host.remove();
          expect(normalizeHtml(html)).toEqual(expected());
        });
      }
    }
  });
}
