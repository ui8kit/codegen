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

  it("maps the textarea content contract to text content + a client value effect (no value attribute)", () => {
    const ta = file("ui/textarea/textarea.solid.tsx");
    expect(ta).toContain("createEffect(() => { el.value = (");
    expect(ta).not.toMatch(/\svalue=\{/);
  });

  it("keeps root branches reactive and types multi-root refs as callbacks", () => {
    // A bare root ternary runs once; inside a fragment Solid memoizes it.
    expect(button).toMatch(/return \(\n\s*<>\n\s*\{isSetStr\(local\.href\) \?/);
    expect(button).toContain('"ref">');
    expect(button).toContain("ref?: (el: HTMLElement) => void;");
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

describe("spec version + agent rules", () => {
  it("specVersion tracks the package version", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const committed = JSON.parse(readFileSync(new URL("../specs/primitives.json", import.meta.url), "utf8"));
    expect(committed.specVersion).toBe(pkg.version);
  });

  it("emits one primitives rule per runtime with installer placeholders only", () => {
    for (const rt of ["react", "vue", "svelte", "solid", "webcomponent"]) {
      const rule = file(`rules/${rt}/ui8kit-primitives.mdc`);
      expect(rule).toContain("globs: {globs}");
      expect(rule).toContain("{kit}");
      expect(rule).not.toMatch(/\{\{\w+\}\}/);
      expect(rule).not.toContain("bun run check");
      expect(rule).not.toMatch(/\b(Stack|Card|Block)\b/);
      expect(rule).toContain("`Dialog`");
    }
  });
});

describe("templ emitter", () => {
  const button = file("templ/ui/button/button.templ");
  const select = file("templ/ui/select/select.templ");
  const text = file("templ/ui/text/text.templ");

  it("exports <Name>Classes instead of asChild/Slot", () => {
    expect(button).toContain("func ButtonClasses(p ButtonProps) string");
    expect(button).not.toMatch(/AsChild|Slot\(|slot\./);
    expect(files.some((f) => f.path.startsWith("templ/") && f.path.includes("slot"))).toBe(false);
  });

  it("repeats the children slot in every branch (Button href | button)", () => {
    expect(button.match(/\{ children\.\.\. \}/g)?.length).toBe(2);
    expect(button).toContain("if uiutils.IsSetStr(p.Href) {");
  });

  it("loops Select options and keeps manual children", () => {
    expect(select).toContain("for _, item := range p.Options {");
    expect(select).toContain("selected?={ (item.Value == p.Value) }");
    expect(select).toContain("package selectfield");
  });

  it("switches over allowed tags for dynamic roots", () => {
    expect(text).toContain("switch uiutils.ResolveTag(p.Tag, \"p\", uiutils.TagGroupText) {");
    expect(text).toContain('case "h1":');
  });

  it("ships a self-contained Go module", () => {
    expect(file("templ/go.mod")).toContain("require github.com/a-h/templ v0.3.1070");
    expect(file("templ/utils/tags.go")).toContain("TagGroupBox TagGroup = iota");
    expect(file("templ/cmd/parity/main.go")).toContain('case "select/Select":');
    expect(file("rules/templ/rules.json")).toContain("**/*.templ");
  });
});

describe("jinja2 emitter", () => {
  const button = file("jinja2/ui/button/button.html.j2");
  const select = file("jinja2/ui/select/select.html.j2");
  const box = file("jinja2/ui/box/box.html.j2");

  it("exposes <name>_classes globals instead of asChild/Slot", () => {
    expect(button).toContain("button_classes(p)");
    expect(button).not.toMatch(/p\['AsChild'\]|Slot\(/);
    expect(file("jinja2/ui8kit_jinja/classes.py")).toContain('"button_classes": ');
  });

  it("prints children as trusted HTML in every branch (Button a | button)", () => {
    expect(button.match(/\{\{ children\|default\('', true\)\|safe \}\}/g)?.length).toBe(2);
    expect(button).toContain("TRUSTED HTML");
  });

  it("loops Select options and keeps manual children", () => {
    expect(select).toContain("{%- for item in ui_def(p['Options'], []) %}");
    expect(select).toContain("{%- if ui_eq(ui_field(item, 'Value', ''), ui_def(p['Value'], '')) %} selected{%- endif %}");
  });

  it("resolves dynamic tags against the allow-list, void-aware", () => {
    expect(box).toContain("{%- set tag1 = ui_resolve_tag(ui_def(p['Tag'], ''), 'div', [");
    expect(box).toContain("{%- if not ui_is_void(tag1) %}");
  });

  it("ships the Python helpers, requirements and rules", () => {
    expect(file("jinja2/requirements.txt")).toContain("Jinja2>=3.1,<4");
    expect(file("jinja2/ui8kit_jinja/__init__.py")).toContain("def environment(");
    expect(file("rules/jinja2/rules.json")).toContain("**/*.html.j2");
  });
});
