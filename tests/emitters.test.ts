/**
 * Emitter convention tests — structural properties of the generated code
 * that DOM parity alone cannot see (idioms, imports, escape hatches).
 */

import { describe, expect, it } from "bun:test";

import { bricks } from "../bricks/index";
import { generateFiles } from "../src/application/generate";
import type { GeneratedFile } from "../src/emitters/common";

const files: GeneratedFile[] = await generateFiles(bricks);

function file(path: string): string {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing generated file: ${path}`);
  return f.contents;
}

describe("react emitter", () => {
  const button = file("ui/button/button.tsx");

  it("forwards refs and supports asChild via Slot", () => {
    // Multi-root (a when href is set | button): ref is the exact element union.
    expect(button).toContain("forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>");
    expect(button).toContain("ref as Ref<HTMLAnchorElement>");
    expect(button).toContain("ref as Ref<HTMLButtonElement>");
    expect(button).not.toContain("Ref<HTMLElement>");
    expect(button).toContain("if (asChild) {");
    expect(button).toContain('import { Slot } from "../slot/slot"');
  });

  it("derives variant key types from the shared contract module", () => {
    expect(file("ui/icon/icon.tsx")).toContain('from "./icon.shared"');
    expect(file("ui/icon/icon.shared.ts")).toContain(
      'export type IconSize = RecipeKey<typeof iconRecipe, "size">'
    );
  });

  it("types polymorphic tags as HTML5 unions", () => {
    expect(file("ui/box/box.shared.ts")).toContain('tag?: "div" | "section"');
    expect(file("ui/text/text.shared.ts")).toContain('tag?: "p" | "span" | "h1"');
  });

  it("requires Image alt", () => {
    expect(file("ui/image/image.shared.ts")).toContain("alt: string;");
  });

  it("maps the textarea content contract to defaultValue", () => {
    expect(file("ui/textarea/textarea.tsx")).toContain("defaultValue={");
  });
});

describe("svelte emitter", () => {
  const button = file("ui/button/Button.svelte");

  it("uses runes mode with snippets, not deprecated slots", () => {
    expect(button).toContain("$props()");
    expect(button).toContain("{@render children?.()}");
    expect(button).not.toContain("<slot");
  });

  it("exports the props type from the module script", () => {
    expect(button).toContain('<script lang="ts" module>');
    expect(button).toContain("export type ButtonProps");
  });

  it("uses svelte:element for resolved tags", () => {
    expect(file("ui/box/Box.svelte")).toContain("<svelte:element this={resolvedTagValue}");
  });
});

describe("vue emitter", () => {
  const button = file("ui/button/Button.vue");

  it("disables inheritAttrs and merges caller class through cn", () => {
    expect(button).toContain("inheritAttrs: false");
    expect(button).toContain("callerClass");
    expect(button).toContain('v-bind="restAttrs"');
  });

  it("uses component :is for resolved tags", () => {
    expect(file("ui/box/Box.vue")).toContain('<component :is="resolvedTagValue"');
  });
});

describe("solid emitter", () => {
  const button = file("ui/button/button.solid.tsx");

  it("uses splitProps and accepts class + className", () => {
    expect(button).toContain("splitProps(props,");
    expect(button).toContain("class?: string;");
    expect(button).toContain("className?: string;");
    expect(button).toContain("local.class ?? local.className");
  });

  it("uses Dynamic for resolved tags", () => {
    expect(file("ui/box/box.solid.tsx")).toContain("<Dynamic component={resolvedTagValue()}");
  });

  it("maps the textarea content contract to a controlled value prop", () => {
    expect(file("ui/textarea/textarea.solid.tsx")).toContain("value={(");
  });
});

describe("webcomponent emitter", () => {
  const button = file("ui/button/button.wc.ts");

  it("renders light DOM via createElement, no shadow root, no framework", () => {
    expect(button).toContain("export function renderButton(");
    expect(button).toContain("document.createElement(");
    expect(button).toContain('export function defineButton(tagName = "ui8-button")');
    expect(button).not.toContain("attachShadow");
    expect(button).not.toMatch(/from "(react|vue|svelte|solid-js)/);
  });

  it("barrel registers every part", () => {
    const barrel = file("ui/index.wc.ts");
    expect(barrel).toContain("export function defineAll(");
    for (const brick of bricks) for (const part of brick.parts) expect(barrel).toContain(`define${part.name}(`);
  });
});

describe("style agnosticism", () => {
  const shipped = files.filter((f) => !f.path.endsWith(".md"));

  it("ships no CSS", () => {
    expect(shipped.filter((f) => /\.(css|scss|less)$/.test(f.path))).toEqual([]);
  });

  it("ships no half-step spacing, px values, or color literals in classes", () => {
    const classes: string[] = [];
    for (const brick of bricks) {
      for (const r of Object.values(brick.recipes)) {
        classes.push(r.base, ...Object.values(r.byKey).flatMap((m) => Object.values(m)));
      }
      for (const part of brick.parts) {
        if (part.classes?.staticBase) classes.push(part.classes.staticBase);
        for (const st of part.classes?.state ?? []) classes.push(st.classes);
      }
    }
    const tokens = classes.join(" ").split(/\s+/).filter(Boolean);
    const bad = tokens.filter(
      (t) =>
        /-\d+\.5\b/.test(t) ||
        /\d+px\b|-px\b/.test(t) ||
        /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i.test(t) ||
        /-(red|blue|green|gray|slate|zinc|neutral|stone|black|white|yellow|orange|purple|pink|indigo)(-\d+)?\b/.test(t)
    );
    expect(bad).toEqual([]);
  });

  it("never emits layout vocabulary as tags or components", () => {
    const parts = bricks.flatMap((b) => b.parts.map((p) => p.name.toLowerCase()));
    for (const n of ["block", "container", "stack", "group", "grid", "list", "inline", "title", "card", "badge"]) {
      expect(parts).not.toContain(n);
    }
  });
});

describe("barrels", () => {
  it("cover every part per runtime", () => {
    const react = file("ui/index.ts");
    const svelte = file("ui/index.svelte.ts");
    const vue = file("ui/index.vue.ts");
    const solid = file("ui/index.solid.ts");
    expect(file("ui/index.wc.ts")).toContain('export * from "./shared"');
    for (const brick of bricks) {
      for (const part of brick.parts) {
        expect(svelte).toContain(`export { default as ${part.name} }`);
        expect(vue).toContain(`export { default as ${part.name} }`);
      }
      expect(solid).toContain(`export * from "./${brick.dir}/`);
    }
    expect(react).toContain('export * from "./slot/slot"');
    expect(solid).toContain('export * from "./shared"');
    expect(solid).toContain(".solid");
  });
});

describe("specs export", () => {
  it("specs/primitives.json is up to date with the definitions (run `bun run build:specs`)", async () => {
    const { readFileSync } = await import("node:fs");
    const { buildSpecs } = await import("../src/application/specs");
    const committed = JSON.parse(readFileSync(new URL("../specs/primitives.json", import.meta.url), "utf8"));
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildSpecs(bricks))));
    expect(file("specs.json")).toContain('"ui.button"');
  });
});
