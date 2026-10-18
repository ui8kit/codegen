import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authored, type ComposedSpec } from "@ui8kit/xgen-screens";
import { hslOf, PICK, shadowsOf } from "../tools/tweakcn-skins";

const dir = join(import.meta.dir, "..", "assets", "styles");
const registry = JSON.parse(readFileSync(join(dir, "skins", "skins.json"), "utf8")) as Record<string, { label: string; fonts: string[] }>;
const imports = [...readFileSync(join(dir, "skins.css"), "utf8").matchAll(/@import "\.\/skins\/([a-z0-9-]+)\.css";/g)].map((m) => m[1]);

test("every skin of skins.json has its CSS file, imported by skins.css, with a light and a dark rule", () => {
  for (const slug of Object.keys(registry)) {
    const file = join(dir, "skins", `${slug}.css`);
    expect(existsSync(file)).toBe(true);
    expect(imports).toContain(slug);
    const css = readFileSync(file, "utf8");
    expect(css).toContain("--primary:");
    expect(css).toContain(`[data-skin="${slug}"]`);
    expect(css).toMatch(/\.dark, \[data-theme="dark"\]/);
  }
  // the tile reset and the scoped default come first, so a skin's own rule follows them
  expect(imports.slice(0, 2)).toEqual(["base", "default"]);
});

test("the tweakcn import lists 14 presets, all in skins.json", () => {
  expect(PICK.length).toBe(14);
  for (const slug of PICK) expect(registry[slug]).toBeDefined();
});

test("the Skins screen shows default first, then skins that exist", () => {
  const screen = authored.screens.find((s) => s.id === "screen.skins") as ComposedSpec | undefined;
  const board = screen?.skins;
  expect(board?.skins[0]).toBe("default");
  expect(board?.skins.length).toBe(15);
  for (const s of board?.skins.slice(1) ?? []) expect(registry[s]).toBeDefined();
  expect(board?.fonts.length).toBe(10);
  expect(board?.radii.map((r) => r.value)).toEqual(["0px", "4px", "8px", "12px", "16px"]);
});

test("shadow colours are printed the way tweakcn prints them", () => {
  expect(hslOf("#000000")).toBe("0 0% 0%");
  expect(hslOf("oklch(0 0 0)")).toBe("0 0% 0%");
  expect(hslOf("hsl(325.78 58.18% 56.86% / 0.5)")).toBe("325.7800 58.1800% 56.8600%");
  expect(hslOf("hsl(0 0% 0%)")).toBe("0 0% 0%");
  const shadows = Object.fromEntries(shadowsOf({ "shadow-color": "hsl(0 0% 0%)", "shadow-opacity": "1", "shadow-blur": "0px", "shadow-spread": "0px", "shadow-offset-x": "4px", "shadow-offset-y": "4px" }));
  expect(shadows["shadow-xs"]).toBe("4px 4px 0px 0px hsl(0 0% 0% / 0.50)");
  expect(shadows["shadow-md"]).toBe("4px 4px 0px 0px hsl(0 0% 0% / 1.00), 4px 2px 4px -1px hsl(0 0% 0% / 1.00)");
});

test("skin colours are hsl() (old browsers) and the contrast fixes hold", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { contrast, FIXES, parseColor, toHslCss } = await import("../tools/skin-colors");
  const dir = new URL("../assets/styles/skins/", import.meta.url).pathname;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".css"))) {
    const css = readFileSync(dir + f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css, f).not.toMatch(/oklch\(|rgba?\(|#[0-9a-fA-F]{3,8}\b/);
  }
  expect(toHslCss("#ffffff")).toBe("hsl(0 0% 100%)");
  expect(toHslCss("oklch(1 0 0 / 10%)")).toBe("hsl(0 0% 100% / 10%)");
  // a fixed surface token reaches 4.5:1 under its foreground, rounded hsl included
  const c = (hex: string) => parseColor(toHslCss(hex, 0.25))!.rgb;
  expect(contrast(c(FIXES["modern-minimal"]!.light.primary!), c("#ffffff"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(c(FIXES["kodama-grove"]!.light["muted-foreground"]!), c("#ffffff"))).toBeGreaterThan(3);
});
