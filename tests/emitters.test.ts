/**
 * Emitter convention tests — structural properties of the generated code
 * that DOM parity alone cannot see (idioms, imports, escape hatches).
 */

import { describe, expect, it } from "vitest";

import { bricks } from "../bricks/index";
import { generateFiles } from "../src/application/generate";
import type { GeneratedFile } from "../src/emitters/common";

const files: GeneratedFile[] = await generateFiles(bricks);

function file(path: string): string {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing generated file: ${path}`);
  return f.contents;
}

describe("templ emitter", () => {
  const button = file("ui/button/button.templ");

  it("uses boolean attribute syntax and the Attrs spread", () => {
    expect(button).toContain("disabled?={ p.Disabled }");
    expect(button).toContain("{ p.Attrs... }");
    expect(button).toContain("{ children... }");
  });

  it("exports the Classes escape hatch", () => {
    expect(button).toContain("func ButtonClasses(p ButtonProps) string");
  });

  it("embeds the shared recipe verbatim", () => {
    const gen = file("ui/button/button_gen.go");
    expect(gen).toContain("//go:embed button.variants.json");
    expect(gen).toContain("uiutils.MustParseVariantRecipe");
  });

  it("resolves Tier-B tags through a local switch over the allow-list", () => {
    const stack = file("ui/stack/stack.templ");
    expect(stack).toContain('switch uiutils.ResolveTag(p.Tag, "div", uiutils.TagGroupStack)');
    expect(stack).toContain('case "ul":');
    expect(stack).toContain("default:");
  });
});

describe("react emitter", () => {
  const button = file("ui/button/button.tsx");

  it("forwards refs and supports asChild via Slot", () => {
    expect(button).toContain("forwardRef<HTMLButtonElement, ButtonProps>");
    expect(button).toContain("if (asChild) {");
    expect(button).toContain('import { Slot } from "../slot/slot"');
  });

  it("derives variant types from the shared contract module", () => {
    expect(button).toContain('from "./button.shared"');
    expect(file("ui/button/button.shared.ts")).toContain(
      'export type ButtonVariant = RecipeKey<typeof buttonRecipe, "variant">'
    );
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
    expect(file("ui/stack/Stack.svelte")).toContain("<svelte:element this={resolvedTagValue}");
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
    expect(file("ui/stack/Stack.vue")).toContain('<component :is="resolvedTagValue"');
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
    expect(file("ui/stack/stack.solid.tsx")).toContain("<Dynamic component={resolvedTagValue()}");
  });

  it("maps the textarea content contract to a controlled value prop", () => {
    expect(file("ui/textarea/textarea.solid.tsx")).toContain("value={(");
  });
});

describe("behavior hooks", () => {
  it("data-ui8kit defaults off in every runtime", () => {
    for (const path of [
      "ui/dialog/dialog.templ",
      "ui/dialog/dialog.tsx",
      "ui/dialog/Dialog.svelte",
      "ui/dialog/Dialog.vue",
      "ui/dialog/dialog.solid.tsx",
    ]) {
      expect(file(path), path).not.toContain('data-ui8kit="');
    }
  });
});

describe("barrels", () => {
  it("cover every part per runtime", () => {
    const react = file("ui/index.ts");
    const svelte = file("ui/index.svelte.ts");
    const vue = file("ui/index.vue.ts");
    const solid = file("ui/index.solid.ts");
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
